"""
Auth flow integration tests.

Covers: login, /me, token refresh, logout, and unauthenticated access.
Uses the real JWT endpoints (TokenObtainPairView / TokenRefreshView / TokenBlacklistView).
"""
import pytest
from rest_framework.test import APIClient

from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus, EntityStatus


@pytest.fixture
def auth_user(db):
    """User with a real entity, suitable for JWT login tests."""
    company = Company.objects.create(
        name="Auth Test Co", company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE, slug="auth-test-co",
    )
    entity = CompanyEntity.objects.create(
        company=company, name="Auth Entity", status=EntityStatus.ACTIVE,
    )
    return User.objects.create_user(
        email="authtest@cixci.test",
        entity=entity,
        password="securepass123",
        first_name="Auth",
        last_name="User",
    )


@pytest.mark.django_db
class TestLogin:
    def test_login_returns_tokens(self, auth_user):
        client = APIClient()
        resp = client.post("/api/v1/auth/login/", {
            "email": "authtest@cixci.test",
            "password": "securepass123",
        })
        assert resp.status_code == 200
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_wrong_password_rejected(self, auth_user):
        client = APIClient()
        resp = client.post("/api/v1/auth/login/", {
            "email": "authtest@cixci.test",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_unknown_email_rejected(self, db):
        client = APIClient()
        resp = client.post("/api/v1/auth/login/", {
            "email": "nobody@cixci.test",
            "password": "anything",
        })
        assert resp.status_code == 401

    def test_login_missing_fields_rejected(self, db):
        client = APIClient()
        resp = client.post("/api/v1/auth/login/", {"email": "only-email@cixci.test"})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestMeEndpoint:
    def test_me_returns_user_profile(self, auth_user):
        client = APIClient()
        login = client.post("/api/v1/auth/login/", {
            "email": "authtest@cixci.test",
            "password": "securepass123",
        })
        access = login.data["access"]

        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.get("/api/v1/tenant/users/me/")
        assert resp.status_code == 200
        assert resp.data["email"] == "authtest@cixci.test"
        assert resp.data["full_name"] == "Auth User"

    def test_me_without_token_rejected(self, db):
        client = APIClient()
        resp = client.get("/api/v1/tenant/users/me/")
        assert resp.status_code == 401

    def test_me_with_invalid_token_rejected(self, db):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Bearer not.a.real.token")
        resp = client.get("/api/v1/tenant/users/me/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestTokenRefresh:
    def test_refresh_returns_new_access_token(self, auth_user):
        client = APIClient()
        login = client.post("/api/v1/auth/login/", {
            "email": "authtest@cixci.test",
            "password": "securepass123",
        })
        refresh_token = login.data["refresh"]

        resp = client.post("/api/v1/auth/refresh/", {"refresh": refresh_token})
        assert resp.status_code == 200
        assert "access" in resp.data

    def test_refresh_with_invalid_token_rejected(self, db):
        client = APIClient()
        resp = client.post("/api/v1/auth/refresh/", {"refresh": "fake.refresh.token"})
        assert resp.status_code == 401


@pytest.mark.django_db
class TestLogout:
    def test_logout_blacklists_token(self, auth_user):
        client = APIClient()
        login = client.post("/api/v1/auth/login/", {
            "email": "authtest@cixci.test",
            "password": "securepass123",
        })
        access = login.data["access"]
        refresh = login.data["refresh"]

        # Logout
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.post("/api/v1/auth/logout/", {"refresh": refresh})
        assert resp.status_code == 200

        # Refresh should now fail (token is blacklisted)
        resp2 = client.post("/api/v1/auth/refresh/", {"refresh": refresh})
        assert resp2.status_code == 401
