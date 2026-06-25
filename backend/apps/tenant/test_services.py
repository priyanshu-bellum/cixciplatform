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
        assert "Activate your CIXCI Account" in mail.outbox[0].subject
        assert token in mail.outbox[0].body

    def test_confirm_email_endpoint(self):
        from apps.tenant.models import Company, CompanyEntity, User
        from apps.tenant.services import generate_onboarding_token
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
        # Verify invalid token returns 400
        res = client.post("/api/v1/tenant/users/confirm_email/", {"token": "invalid", "password": "newpassword123"})
        assert res.status_code == 400

        # Verify correct confirmation activates and updates password
        res = client.post("/api/v1/tenant/users/confirm_email/", {"token": token, "password": "newpassword123"})
        assert res.status_code == 200
        
        user.refresh_from_db()
        assert user.is_active is True
        assert user.check_password("newpassword123") is True

