import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_openapi_schema_endpoint():
    client = APIClient()
    response = client.get("/api/schema/", HTTP_HOST="localhost")
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.content}"

@pytest.mark.django_db
def test_swagger_ui_endpoint():
    client = APIClient()
    response = client.get("/api/docs/", HTTP_HOST="localhost")
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.content}"
