import pytest
from apps.integration.models import CompanyAPIKey

@pytest.mark.django_db
class TestCompanyAPIKeysApi:
    def test_admin_issues_keys_and_the_company_can_only_read_them(self, buyer_client, buyer_user, admin_client):
        """Key generation is restricted to CIXCI admins (c1bfbc4); the company sees its own keys."""
        url = "/api/v1/integration/api-keys/"
        assert len(buyer_client.get(url).data.get("results", buyer_client.get(url).data)) == 0

        payload = {"label": "Telco Cellular Storefront Key"}
        assert buyer_client.post(url, payload, format="json").status_code == 403
        assert admin_client.post(url, payload, format="json").status_code == 400  # company is required

        res = admin_client.post(url, {**payload, "company_scope_reference": str(buyer_user.entity.company_id)}, format="json")
        assert res.status_code == 201, res.data
        assert res.data["label"] == "Telco Cellular Storefront Key"
        assert res.data["token"].startswith("cixci_key_")
        assert res.data["is_active"] is True
        key_id = res.data["id"]

        results = buyer_client.get(url).data
        results = results.get("results", results)
        assert [row["id"] for row in results] == [key_id]

        assert buyer_client.delete(f"{url}{key_id}/").status_code == 403
        assert admin_client.delete(f"{url}{key_id}/").status_code == 204
        assert CompanyAPIKey.objects.get(pk=key_id).is_active is False

    def test_api_key_authentication_flow(self, buyer_user, client):
        # 1. Create an API Key for the buyer
        from apps.integration.models import CompanyAPIKey
        import secrets
        token = f"cixci_key_{secrets.token_hex(24)}"
        api_key = CompanyAPIKey.objects.create(
            company_scope_reference=buyer_user.entity.company_id,
            label="Storefront Key",
            token=token
        )

        # 2. Make an unauthenticated request to /api/v1/devices/portfolio/my_devices/
        res = client.get("/api/v1/devices/portfolio/my_devices/")
        assert res.status_code == 401

        # 3. Make request with valid API key via X-API-Key header
        res = client.get("/api/v1/devices/portfolio/my_devices/", HTTP_X_API_KEY=token)
        assert res.status_code == 200

        # Add a device to portfolio and verify it returns via API key
        from apps.devices.models import Device, DeviceType, Manufacturer
        from apps.devices.services import add_device_to_portfolio
        dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone", defaults={"status": "active"})
        if dt.status != "active":
            dt.status = "active"
            dt.save()
        mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
        device, _ = Device.objects.get_or_create(name="TestDeviceAPIKey", device_type=dt, manufacturer=mfr)
        add_device_to_portfolio(buyer_user, device.id)

        res = client.get("/api/v1/devices/portfolio/my_devices/", HTTP_X_API_KEY=token)
        assert res.status_code == 200
        data = res.data if isinstance(res.data, list) else res.data.get("results", res.data)
        assert len(data) == 1
        assert str(data[0]["device"]) == str(device.id)

        # 4. Make request with valid API key via Authorization header
        res = client.get("/api/v1/devices/portfolio/my_devices/", HTTP_AUTHORIZATION=f"Api-Key {token}")
        assert res.status_code == 200
        data = res.data if isinstance(res.data, list) else res.data.get("results", res.data)
        assert len(data) == 1

        # 5. Make request with invalid/inactive API key
        api_key.is_active = False
        api_key.save()
        res = client.get("/api/v1/devices/portfolio/my_devices/", HTTP_X_API_KEY=token)
        assert res.status_code == 401

    def test_storefront_only_shows_exported_products_via_api_key(self, buyer_client, buyer_user, client):
        import uuid
        from apps.catalog.models import Product, ProductCompatibilityAssertion
        from apps.devices.models import Device, DeviceType, Manufacturer
        from apps.devices.services import add_device_to_portfolio
        from apps.integration.models import CompanyAPIKey
        import secrets

        # 1. Setup portfolio device
        dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone", defaults={"status": "active"})
        if dt.status != "active":
            dt.status = "active"
            dt.save()
        mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
        device, _ = Device.objects.get_or_create(name="TestDevice", device_type=dt, manufacturer=mfr)
        add_device_to_portfolio(buyer_user, device.id)

        # 2. Create two compatible accessories
        p1 = Product.objects.create(
            name="Accessory One",
            sku="ACC-101",
            brand="TestBrand",
            product_type="accessory",
            status="active",
            selling_status="for_sale",
            launch_date="2026-06-18",
            compatibility_status="complete",
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=uuid.uuid4(),
        )
        ProductCompatibilityAssertion.objects.create(
            product=p1,
            device_reference=device.id,
            is_compatible=True,
            is_excluded=False
        )

        p2 = Product.objects.create(
            name="Accessory Two",
            sku="ACC-102",
            brand="TestBrand",
            product_type="accessory",
            status="active",
            selling_status="for_sale",
            launch_date="2026-06-18",
            compatibility_status="complete",
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=uuid.uuid4(),
        )
        ProductCompatibilityAssertion.objects.create(
            product=p2,
            device_reference=device.id,
            is_compatible=True,
            is_excluded=False
        )

        # An export only carries media-ready products (Rule 25), so both get a
        # ready, approved primary image.
        from tests.assortment import give_ready_image
        give_ready_image(p1); give_ready_image(p2)

        # 3. Requesting products as logged-in buyer admin returns BOTH accessories
        res = buyer_client.get("/api/v1/catalog/products/")
        assert res.status_code == 200
        results = res.data.get("results", res.data)
        assert len(results) == 2

        # 4. Create an API key
        token = f"cixci_key_{secrets.token_hex(24)}"
        api_key = CompanyAPIKey.objects.create(
            company_scope_reference=buyer_user.entity.company_id,
            label="Telco Store Key",
            token=token
        )

        # 5. Accessing products using the API Key (storefront) returns NOTHING because none are exported yet
        res = client.get("/api/v1/catalog/products/", HTTP_X_API_KEY=token)
        assert res.status_code == 200
        results = res.data.get("results", res.data)
        assert len(results) == 0

        # 6. Export Accessory One
        res = buyer_client.post("/api/v1/catalog/export-jobs/create_job/", {
            "product_ids": [str(p1.id)],
            "format": "csv"
        }, format="json")
        assert res.status_code == 201

        # 7. Accessing products using the API Key now returns ONLY Accessory One
        res = client.get("/api/v1/catalog/products/", HTTP_X_API_KEY=token)
        assert res.status_code == 200
        results = res.data.get("results", res.data)
        assert len(results) == 1
        assert results[0]["id"] == str(p1.id)

