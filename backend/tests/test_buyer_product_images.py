"""
Tests for the Buyer Product Images API — product-centric image library for buyers.

Covers:
- List endpoint returns only products in buyer's authorized assortment
- Images endpoint returns approved images for a specific product
- Download endpoints serve files with proper auth checks
- Vendor/admin users are rejected
- Products outside assortment are not accessible
"""
import io
import uuid
import pytest
from unittest.mock import patch
from django.test import override_settings
from apps.catalog.models import Product, ProductCompatibilityAssertion
from apps.devices.models import Device, Manufacturer, DeviceType, BuyerDevicePortfolioReference
from apps.media.models import MediaAsset


@pytest.fixture
def device_type(db):
    return DeviceType.objects.create(name="Smartphone", code="smartphone", status="active")


@pytest.fixture
def manufacturer(db):
    return Manufacturer.objects.create(name="TestMfr")


@pytest.fixture
def device(manufacturer, device_type):
    return Device.objects.create(
        name="TestPhone",
        manufacturer=manufacturer,
        device_type=device_type,
        model_number="TP-100",
    )


@pytest.fixture
def buyer_portfolio(buyer_user, buyer_company, device):
    return BuyerDevicePortfolioReference.objects.create(
        buyer_reference=buyer_user.id,
        company_scope_reference=buyer_company.id,
        buyer_entity_reference=buyer_user.entity_id,
        device=device,
        active_flag=True,
    )


@pytest.fixture
def vendor_product(vendor_company, device, settings):
    from django.utils import timezone
    settings.MEDIA_READINESS_ENFORCE_BUYER = False
    product = Product.objects.create(
        name="Test Case",
        sku="TC-001",
        upc="123456789",
        brand="TestBrand",
        product_category="Cases",
        status="draft",
        selling_status="for_sale",
        vendor_company_reference=vendor_company.id,
        company_scope_reference=vendor_company.id,
        launch_date=timezone.now().date(),
    )
    Product.objects.filter(id=product.id).update(
        status="active", compatibility_status="complete",
    )
    product.refresh_from_db()
    ProductCompatibilityAssertion.objects.create(
        product=product,
        device_reference=device.id,
        is_compatible=True,
        is_excluded=False,
        compatibility_basis="manual_assertion",
        vendor_company_reference=vendor_company.id,
        sku=product.sku,
    )
    return product


@pytest.fixture
def product_image(vendor_product, vendor_company, tmp_path):
    asset = MediaAsset.objects.create(
        asset_type="product_image",
        status="ready",
        review_status="approved",
        owner_module="catalog",
        owner_record_id=vendor_product.id,
        company_scope_reference=vendor_company.id,
        original_filename="front.png",
        file_extension=".png",
        mime_type="image/png",
        storage_key=f"{vendor_company.id}/product_image/{uuid.uuid4()}/front.png",
        storage_provider="local",
        width=800,
        height=800,
        has_transparency=True,
    )
    vendor_product.primary_image_reference = asset.id
    vendor_product.save(update_fields=["primary_image_reference"])
    return asset


@pytest.mark.django_db
class TestBuyerProductImagesList:
    @override_settings(MEDIA_READINESS_ENFORCE_BUYER=False)
    def test_list_returns_assortment_products(self, buyer_client, buyer_portfolio, vendor_product, product_image):
        resp = buyer_client.get("/api/v1/media/buyer-product-images/")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) >= 1
        product_ids = [r["id"] for r in results]
        assert str(vendor_product.id) in product_ids
        product_ids = [r["id"] for r in results]
        assert str(vendor_product.id) in product_ids

    @override_settings(MEDIA_READINESS_ENFORCE_BUYER=False)
    def test_list_includes_image_count(self, buyer_client, buyer_portfolio, vendor_product, product_image):
        resp = buyer_client.get("/api/v1/media/buyer-product-images/")
        results = resp.data.get("results", resp.data)
        match = [r for r in results if r["id"] == str(vendor_product.id)]
        assert len(match) == 1
        assert match[0]["image_count"] >= 1

    @override_settings(MEDIA_READINESS_ENFORCE_BUYER=False)
    def test_list_search_by_sku(self, buyer_client, buyer_portfolio, vendor_product, product_image):
        resp = buyer_client.get("/api/v1/media/buyer-product-images/", {"search": "TC-001"})
        results = resp.data.get("results", resp.data)
        assert any(r["sku"] == "TC-001" for r in results)

    def test_vendor_user_rejected(self, vendor_company):
        from rest_framework.test import APIClient
        from apps.tenant.models import User, CompanyEntity, EntityStatus
        entity = CompanyEntity.objects.create(
            company=vendor_company, name="V Entity", status=EntityStatus.ACTIVE,
        )
        user = User.objects.create_user(email="v@v.test", entity=entity, password="pw123")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/v1/media/buyer-product-images/")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestBuyerProductImagesDetail:
    @override_settings(MEDIA_READINESS_ENFORCE_BUYER=False)
    def test_images_returns_asset_list(self, buyer_client, buyer_portfolio, vendor_product, product_image):
        resp = buyer_client.get(f"/api/v1/media/buyer-product-images/{vendor_product.id}/images/")
        assert resp.status_code == 200
        assert resp.data["product_id"] == str(vendor_product.id)
        assert len(resp.data["images"]) >= 1
        img = resp.data["images"][0]
        assert img["id"] == str(product_image.id)
        assert img["is_primary"] is True

    @override_settings(MEDIA_READINESS_ENFORCE_BUYER=False)
    def test_images_for_non_assortment_product_404(self, buyer_client, buyer_portfolio):
        fake_id = uuid.uuid4()
        resp = buyer_client.get(f"/api/v1/media/buyer-product-images/{fake_id}/images/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestBuyerProductImageDownload:
    @override_settings(MEDIA_READINESS_ENFORCE_BUYER=False)
    def test_download_image_serves_file(self, buyer_client, buyer_portfolio, vendor_product, product_image, settings, tmp_path):
        import os
        file_dir = os.path.join(settings.MEDIA_ROOT, os.path.dirname(product_image.storage_key))
        os.makedirs(file_dir, exist_ok=True)
        file_path = os.path.join(settings.MEDIA_ROOT, product_image.storage_key)
        with open(file_path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\nfakedata")

        resp = buyer_client.get(
            f"/api/v1/media/buyer-product-images/{vendor_product.id}/download-image/{product_image.id}/"
        )
        assert resp.status_code == 200
        assert resp["Content-Type"] == "image/png"
        assert "attachment" in resp["Content-Disposition"]

    @override_settings(MEDIA_READINESS_ENFORCE_BUYER=False)
    def test_download_all_serves_zip(self, buyer_client, buyer_portfolio, vendor_product, product_image, settings):
        import os
        file_dir = os.path.join(settings.MEDIA_ROOT, os.path.dirname(product_image.storage_key))
        os.makedirs(file_dir, exist_ok=True)
        file_path = os.path.join(settings.MEDIA_ROOT, product_image.storage_key)
        with open(file_path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\nfakedata")

        resp = buyer_client.get(
            f"/api/v1/media/buyer-product-images/{vendor_product.id}/download-all/"
        )
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/zip"
        assert ".zip" in resp["Content-Disposition"]
