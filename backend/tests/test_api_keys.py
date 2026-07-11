import pytest
from apps.integration.models import CompanyAPIKey

@pytest.mark.django_db
class TestCompanyAPIKeysApi:
    def test_list_and_create_api_keys(self, buyer_client, buyer_user):
        url = "/api/v1/integration/api-keys/"
        
        # 1. Initially empty
        res = buyer_client.get(url)
        assert res.status_code == 200
        assert len(res.data.get("results", res.data)) == 0

        # 2. Create API key
        payload = {"label": "Telco Cellular Storefront Key"}
        res = buyer_client.post(url, payload, format="json")
        assert res.status_code == 201, res.data
        assert res.data["label"] == "Telco Cellular Storefront Key"
        assert res.data["token"].startswith("cixci_key_")
        assert res.data["is_active"] is True
        
        key_id = res.data["id"]
        token = res.data["token"]

        # 3. List contains the created key
        res = buyer_client.get(url)
        assert res.status_code == 200
        results = res.data.get("results", res.data)
        assert len(results) == 1
        assert results[0]["id"] == key_id
        assert results[0]["token"] == token

        # 4. Revoke (delete) the API key
        res = buyer_client.delete(f"{url}{key_id}/")
        assert res.status_code == 204

        # 5. List is empty again
        res = buyer_client.get(url)
        assert res.status_code == 200
        results = res.data.get("results", res.data)
        assert len(results) == 0
