"""
Tests for check_access() — the canonical CIXCI authority gate.

Architecture rule: check_access() is the ONLY place authorization decisions are made.
These tests verify all 4 evaluation steps and the buyer-scope triad.
"""
import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4


def _make_user(is_cixci_admin=False, is_active=True, entity_active=True,
               has_capability=False, entity=None):
    """Build a mock user for testing check_access without a database."""
    user = MagicMock()
    user.id = uuid4()
    user.is_cixci_admin = is_cixci_admin
    user.is_active = is_active
    user.entity_id = uuid4() if entity is None else entity

    if user.entity_id:
        user.entity = MagicMock()
        user.entity.status = "active" if entity_active else "suspended"
        user.entity.company_id = uuid4()
        user.entity.company = MagicMock()
        user.entity.company.id = user.entity.company_id
        user.entity.company.status = "active"
        mock_comp_qs = MagicMock()
        mock_comp_qs.filter.return_value.exists.return_value = True
        user.entity.company.capabilities = mock_comp_qs
    else:
        user.entity = None

    # Mock capabilities queryset
    mock_qs = MagicMock()
    mock_qs.filter.return_value.exists.return_value = has_capability
    user.capabilities = mock_qs

    return user


class TestCheckAccessCixciAdmin:
    def test_admin_always_granted(self):
        from apps.tenant.services import check_access
        user = _make_user(is_cixci_admin=True)
        result = check_access(user, "any.capability.whatsoever")
        assert result.granted is True
        assert result.reason == "cixci_admin"

    def test_inactive_admin_denied(self):
        from apps.tenant.services import check_access
        user = _make_user(is_cixci_admin=True, is_active=False)
        result = check_access(user, "any.capability")
        assert result.granted is False
        assert result.reason == "user_inactive"


class TestCheckAccessUserActive:
    def test_inactive_user_denied(self):
        from apps.tenant.services import check_access
        user = _make_user(is_active=False)
        result = check_access(user, "catalog.product.import")
        assert result.granted is False
        assert result.reason == "user_inactive"


class TestCheckAccessEntityActive:
    def test_inactive_entity_denied(self):
        from apps.tenant.services import check_access
        user = _make_user(entity_active=False, has_capability=True)
        result = check_access(user, "catalog.product.import")
        assert result.granted is False
        assert result.reason == "entity_inactive"


class TestCheckAccessCompanyScope:
    def test_wrong_company_denied(self):
        from apps.tenant.services import check_access
        user = _make_user(has_capability=True)
        result = check_access(user, "catalog.product.import", company_id=uuid4())
        assert result.granted is False
        assert result.reason == "company_scope_mismatch"

    def test_correct_company_with_capability_granted(self):
        from apps.tenant.services import check_access
        user = _make_user(has_capability=True)
        result = check_access(user, "catalog.product.import",
                              company_id=user.entity.company_id)
        assert result.granted is True


class TestCheckAccessCapability:
    def test_missing_capability_denied(self):
        from apps.tenant.services import check_access
        user = _make_user(has_capability=False)
        result = check_access(user, "catalog.product.import")
        assert result.granted is False
        assert result.reason == "capability_missing"

    def test_has_capability_granted(self):
        from apps.tenant.services import check_access
        user = _make_user(has_capability=True)
        result = check_access(user, "catalog.product.import")
        assert result.granted is True
        assert result.reason == "capability_matched"


class TestResolveBuyerScope:
    def test_no_entity_returns_none(self):
        from apps.tenant.services import resolve_buyer_scope
        user = MagicMock()
        user.entity = None
        assert resolve_buyer_scope(user) is None

    def test_returns_triad(self):
        from apps.tenant.services import resolve_buyer_scope
        user = _make_user()
        scope = resolve_buyer_scope(user)
        assert scope is not None
        assert "buyer_reference" in scope
        assert "company_scope_reference" in scope
        assert "buyer_entity_reference" in scope
        assert scope["buyer_reference"] == user.id
        assert scope["company_scope_reference"] == user.entity.company_id
        assert scope["buyer_entity_reference"] == user.entity_id


@pytest.mark.django_db
class TestUserOnboardingAndConfirmation:
    def test_signed_onboarding_token_flow(self):
        from apps.tenant.models import Company, CompanyEntity, User
        from apps.tenant.services import generate_onboarding_token, verify_onboarding_token, send_onboarding_invite
        from django.core import mail

        company = Company.objects.create(
            name="Test Company", company_type="buyer", status="active", slug="test-company"
        )
        entity = CompanyEntity.objects.create(
            name="Test Entity", company=company, status="active"
        )
        user = User.objects.create_user(
            email="invitee@test.com", password="some-temp-pwd", first_name="Invitee", last_name="User", entity=entity
        )
        user.is_active = False
        user.save()

        # 1. Token generation & verification
        token = generate_onboarding_token(user)
        assert token is not None
        
        user_id = verify_onboarding_token(token)
        assert str(user_id) == str(user.id)

        # 2. Email sending
        mail.outbox = []
        send_onboarding_invite(user)
        assert len(mail.outbox) == 1
        assert "Confirm your email address" in mail.outbox[0].subject
        assert token in mail.outbox[0].body
        assert len(mail.outbox[0].alternatives) == 1
        html_body, mime = mail.outbox[0].alternatives[0]
        assert mime == "text/html"
        assert "Confirm your email address" in html_body
        assert "Confirm My Email" in html_body
        assert token in html_body

    def test_confirm_email_endpoint(self):
        from apps.tenant.models import Company, CompanyEntity, User, UserInvitation, InvitationStatus
        from apps.tenant.services import generate_onboarding_token, create_user_invitation
        from rest_framework.test import APIClient

        company = Company.objects.create(
            name="Test Company 2", company_type="buyer", status="active", slug="test-company-2"
        )
        entity = CompanyEntity.objects.create(
            name="Test Entity 2", company=company, status="active"
        )
        user = User.objects.create_user(
            email="invitee2@test.com", password="some-temp-pwd2", first_name="Invitee2", last_name="User2", entity=entity
        )
        user.is_active = False
        user.save()

        token = generate_onboarding_token(user)

        client = APIClient()

        # 1. Test verify_token endpoint with valid token
        res_verify = client.get(f"/api/v1/tenant/users/verify_token/?token={token}")
        assert res_verify.status_code == 200
        assert res_verify.data["valid"] is True
        assert res_verify.data["email"] == "invitee2@test.com"
        assert res_verify.data["first_name"] == "Invitee2"

        # 2. Test verify_token endpoint with invalid token
        res_invalid = client.get("/api/v1/tenant/users/verify_token/?token=bogus-token")
        assert res_invalid.status_code == 400
        assert res_invalid.data["valid"] is False

        # 3. Verify invalid token returns 400 on confirm_email
        res = client.post("/api/v1/tenant/users/confirm_email/", {"token": "invalid", "password": "newpassword123"})
        assert res.status_code == 400

        # 4. Verify correct confirmation activates and updates password
        res = client.post("/api/v1/tenant/users/confirm_email/", {"token": token, "password": "newpassword123"})
        assert res.status_code == 200
        
        user.refresh_from_db()
        assert user.is_active is True
        assert user.check_password("newpassword123") is True

    def test_user_invitation_confirm_email_flow(self):
        from apps.tenant.models import Company, CompanyEntity, User, UserInvitation, InvitationStatus
        from rest_framework.test import APIClient
        from datetime import timedelta
        from django.utils import timezone
        import secrets

        company = Company.objects.create(
            name="Invite Corp", company_type="buyer", status="active", slug="invite-corp"
        )
        entity = CompanyEntity.objects.create(
            name="Invite Entity", company=company, status="active"
        )
        admin = User.objects.create_superuser(
            email="superadmin@cixci.com", password="adminpass123", first_name="Super", last_name="Admin"
        )

        inv_token = secrets.token_urlsafe(32)
        invitation = UserInvitation.objects.create(
            target_company=company,
            target_entity=entity,
            email="inviteduser@cixci.com",
            first_name="Invited",
            last_name="Member",
            token=inv_token,
            expires_at=timezone.now() + timedelta(days=7),
            invited_by=admin,
            status=InvitationStatus.PENDING
        )

        client = APIClient()

        # 1. Verify token endpoint identifies invitation
        res_verify = client.get(f"/api/v1/tenant/users/verify_token/?token={inv_token}")
        assert res_verify.status_code == 200
        assert res_verify.data["valid"] is True
        assert res_verify.data["email"] == "inviteduser@cixci.com"
        assert res_verify.data["first_name"] == "Invited"
        assert res_verify.data["type"] == "invitation"

        # 2. Confirm password activates user and marks invitation accepted
        res_confirm = client.post("/api/v1/tenant/users/confirm_email/", {
            "token": inv_token,
            "password": "securememberpass123"
        })
        assert res_confirm.status_code == 200
        assert res_confirm.data["success"] is True

        # Check user is created and activated
        user = User.objects.get(email="inviteduser@cixci.com")
        assert user.is_active is True
        assert user.check_password("securememberpass123") is True

        # Check invitation status updated
        invitation.refresh_from_db()
        assert invitation.status == InvitationStatus.ACCEPTED


@pytest.mark.django_db
class TestPasswordResetAndUnsubscribedFlows:
    def test_password_reset_flow(self):
        from apps.tenant.models import Company, CompanyEntity, User
        from apps.tenant.services import (
            generate_password_reset_token,
            verify_password_reset_token,
            send_password_reset_email,
            reset_user_password,
        )
        from django.core import mail
        from rest_framework.test import APIClient

        company = Company.objects.create(name="Reset Co", company_type="buyer", status="active", slug="reset-co")
        entity = CompanyEntity.objects.create(name="Reset Entity", company=company, status="active")
        user = User.objects.create_user(
            email="resetme@cixci.com", password="oldpassword123", first_name="Alex", last_name="Mercer", entity=entity
        )

        # 1. Token generation & verification
        token = generate_password_reset_token(user)
        assert token is not None
        assert verify_password_reset_token(token, max_age=3600) == str(user.id)

        # 2. Email sending matching mockup
        mail.outbox = []
        send_password_reset_email(user)
        assert len(mail.outbox) == 1
        assert "Reset your password" in mail.outbox[0].subject
        assert "60 minutes" in mail.outbox[0].body
        assert "Reset My Password" in mail.outbox[0].body or "reset-password?token=" in mail.outbox[0].body
        html_body, mime = mail.outbox[0].alternatives[0]
        assert mime == "text/html"
        assert "Reset your password" in html_body
        assert "Reset My Password" in html_body
        assert "60 minutes" in html_body
        assert "The CIXCI Team" in html_body

        # 3. API endpoint: request_password_reset
        client = APIClient()
        res_req = client.post("/api/v1/tenant/users/request_password_reset/", {"email": "resetme@cixci.com"})
        assert res_req.status_code == 200

        # 4. API endpoint: verify_reset_token
        res_verify = client.get(f"/api/v1/tenant/users/verify_reset_token/?token={token}")
        assert res_verify.status_code == 200
        assert res_verify.data["valid"] is True
        assert res_verify.data["email"] == "resetme@cixci.com"
        assert res_verify.data["first_name"] == "Alex"

        # 5. API endpoint: reset_password
        res_reset = client.post("/api/v1/tenant/users/reset_password/", {
            "token": token,
            "password": "brandnewpassword999"
        })
        assert res_reset.status_code == 200
        assert res_reset.data["success"] is True

        user.refresh_from_db()
        assert user.check_password("brandnewpassword999") is True
        assert user.check_password("oldpassword123") is False

    def test_unsubscribed_email_flow(self):
        from apps.tenant.models import Company, CompanyEntity, User
        from apps.tenant.services import send_unsubscribed_email
        from django.core import mail
        from rest_framework.test import APIClient

        company = Company.objects.create(name="Unsub Co", company_type="buyer", status="active", slug="unsub-co")
        entity = CompanyEntity.objects.create(name="Unsub Entity", company=company, status="active")
        user = User.objects.create_user(
            email="unsubscriber@cixci.com", password="password123", first_name="Jordan", entity=entity
        )

        mail.outbox = []
        send_unsubscribed_email(email="unsubscriber@cixci.com", first_name="Jordan", user=user)
        assert len(mail.outbox) == 1
        assert "You’ve unsubscribed" in mail.outbox[0].subject
        assert "No more drops, updates, or inside looks" in mail.outbox[0].body
        assert "Share Feedback" in mail.outbox[0].body or "feedback?email=" in mail.outbox[0].body
        assert "resubscribe here" in mail.outbox[0].body or "resubscribe?email=" in mail.outbox[0].body

        html_body, mime = mail.outbox[0].alternatives[0]
        assert mime == "text/html"
        assert "You’ve unsubscribed" in html_body
        assert "Share Feedback" in html_body
        assert "resubscribe here" in html_body
        assert "The CIXCI Team" in html_body

        # API endpoint: unsubscribe
        client = APIClient()
        res_unsub = client.post("/api/v1/tenant/users/unsubscribe/", {"email": "unsubscriber@cixci.com"})
        assert res_unsub.status_code == 200
        assert res_unsub.data["success"] is True


