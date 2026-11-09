"""
Tests for user invitation and email sending fixes.

Bug 1: "target_company required" when inviting user from CompanyUsersPage
Bug 2: Email not sending when adding user from Settings → User Directory
"""
import pytest
from unittest.mock import patch, MagicMock

from apps.tenant.models import (
    Company, CompanyEntity, User, Capability, CompanyType,
    CompanyStatus, EntityStatus, UserInvitation, InvitationStatus,
)


@pytest.mark.django_db
class TestUserCreateSerializerEmailFix:
    """Bug 2: Onboarding email must be sent when no explicit password is provided."""

    def test_email_sent_when_inactive_no_password(self, admin_client, buyer_entity):
        """Default flow: is_active=False, no password → email sent."""
        with patch("apps.tenant.services.send_onboarding_invite") as mock_send:
            mock_send.return_value = "fake-token"
            resp = admin_client.post("/api/v1/tenant/users/", {
                "email": "newuser@test.com",
                "first_name": "New",
                "last_name": "User",
                "entity": str(buyer_entity.id),
                "is_active": False,
            })
            assert resp.status_code == 201
            mock_send.assert_called_once()
            user = User.objects.get(email="newuser@test.com")
            assert not user.is_active

    def test_email_sent_when_active_no_password(self, admin_client, buyer_entity):
        """Critical fix: is_active=True but no password → email must still be sent."""
        with patch("apps.tenant.services.send_onboarding_invite") as mock_send:
            mock_send.return_value = "fake-token"
            resp = admin_client.post("/api/v1/tenant/users/", {
                "email": "activeuser@test.com",
                "first_name": "Active",
                "last_name": "User",
                "entity": str(buyer_entity.id),
                "is_active": True,
            })
            assert resp.status_code == 201
            mock_send.assert_called_once()

    def test_no_email_when_active_with_password(self, admin_client, buyer_entity):
        """is_active=True with explicit password → no email needed."""
        with patch("apps.tenant.services.send_onboarding_invite") as mock_send:
            mock_send.return_value = "fake-token"
            resp = admin_client.post("/api/v1/tenant/users/", {
                "email": "withpass@test.com",
                "first_name": "With",
                "last_name": "Password",
                "entity": str(buyer_entity.id),
                "is_active": True,
                "password": "securepass123",
            })
            assert resp.status_code == 201
            mock_send.assert_not_called()

    def test_email_sent_when_inactive_with_password(self, admin_client, buyer_entity):
        """is_active=False with password → email sent (user needs to confirm)."""
        with patch("apps.tenant.services.send_onboarding_invite") as mock_send:
            mock_send.return_value = "fake-token"
            resp = admin_client.post("/api/v1/tenant/users/", {
                "email": "inactivepass@test.com",
                "first_name": "Inactive",
                "last_name": "Pass",
                "entity": str(buyer_entity.id),
                "is_active": False,
                "password": "securepass123",
            })
            assert resp.status_code == 201
            mock_send.assert_called_once()


@pytest.mark.django_db
class TestUserInvitationTargetCompany:
    """Bug 1: Invitation must work for both company users and CIXCI admins."""

    def test_company_user_invite_uses_fallback(self, buyer_client, buyer_entity, cap_factory):
        """Buyer admin can invite without explicit target_company (falls back to their company)."""
        cap = cap_factory("company_user_management.manage_invitations")
        buyer_client.handler._force_user.capabilities.add(cap)
        buyer_client.handler._force_user.company.capabilities.add(cap)

        resp = buyer_client.post("/api/v1/tenant/invitations/invite/", {
            "email": "invitee@buyer.test",
            "first_name": "Invite",
            "last_name": "Me",
            "role_bundle": "standard_user",
        })
        assert resp.status_code == 201
        inv = UserInvitation.objects.get(email="invitee@buyer.test")
        assert inv.target_company == buyer_client.handler._force_user.company

    def test_admin_invite_with_target_company(self, admin_client, buyer_company, buyer_entity):
        """CIXCI admin can invite by specifying target_company explicitly."""
        resp = admin_client.post("/api/v1/tenant/invitations/invite/", {
            "email": "newhire@company.test",
            "first_name": "New",
            "last_name": "Hire",
            "role_bundle": "standard_user",
            "target_company": str(buyer_company.id),
        })
        assert resp.status_code == 201
        inv = UserInvitation.objects.get(email="newhire@company.test")
        assert inv.target_company_id == buyer_company.id

    def test_admin_invite_without_target_company_fails(self, admin_client):
        """CIXCI admin without target_company gets clear error."""
        resp = admin_client.post("/api/v1/tenant/invitations/invite/", {
            "email": "orphan@test.com",
            "first_name": "Orphan",
            "last_name": "User",
        })
        assert resp.status_code == 400
        assert "target_company" in str(resp.data)

    def test_invitation_sends_email(self, admin_client, buyer_company, buyer_entity):
        """Invitation creation triggers onboarding email."""
        with patch("apps.tenant.services.dispatch_email") as mock_dispatch:
            mock_dispatch.return_value = True
            resp = admin_client.post("/api/v1/tenant/invitations/invite/", {
                "email": "emailtest@company.test",
                "first_name": "Email",
                "last_name": "Test",
                "target_company": str(buyer_company.id),
            })
            assert resp.status_code == 201
            mock_dispatch.assert_called()
            call_kwargs = mock_dispatch.call_args
            assert "emailtest@company.test" in str(call_kwargs)


@pytest.mark.django_db
class TestInvitationAcceptanceFlow:
    """Verify the full invitation → acceptance → user joins company flow."""

    def test_accept_invitation_creates_membership(self, admin_client, buyer_company, buyer_entity, api_client):
        """Accepted invitation creates user with membership in target company."""
        resp = admin_client.post("/api/v1/tenant/invitations/invite/", {
            "email": "joiner@buyer.test",
            "first_name": "Joiner",
            "last_name": "Person",
            "target_company": str(buyer_company.id),
        })
        assert resp.status_code == 201

        inv = UserInvitation.objects.get(email="joiner@buyer.test")
        assert inv.status == InvitationStatus.PENDING

        accept_resp = api_client.post("/api/v1/tenant/invitations/accept/", {
            "token": inv.token,
            "password": "securepass123",
        })
        assert accept_resp.status_code == 200

        user = User.objects.get(email="joiner@buyer.test")
        assert user.is_active
        assert user.company == buyer_company

        inv.refresh_from_db()
        assert inv.status == InvitationStatus.ACCEPTED
