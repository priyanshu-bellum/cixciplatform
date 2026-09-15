import pytest
from rest_framework.test import APIClient
from apps.tenant.models import User

@pytest.mark.django_db
def test_openapi_schema_endpoint():
    client = APIClient()
    admin_user = User.objects.create(
        email="schema_admin@test.com",
        is_cixci_admin=True,
        is_active=True,
    )
    client.force_authenticate(user=admin_user)
    response = client.get("/api/schema/", HTTP_HOST="localhost")
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.content}"

@pytest.mark.django_db
def test_buyer_and_vendor_schema_endpoints():
    client = APIClient()
    res_buyer = client.get("/api/buyer-schema/", HTTP_HOST="localhost")
    assert res_buyer.status_code == 200
    res_vendor = client.get("/api/vendor-schema/", HTTP_HOST="localhost")
    assert res_vendor.status_code == 200

@pytest.mark.django_db
def test_swagger_ui_endpoint():
    client = APIClient()
    response = client.get("/api/docs/", HTTP_HOST="localhost")
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.content}"

