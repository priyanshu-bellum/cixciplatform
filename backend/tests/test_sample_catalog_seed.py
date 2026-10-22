"""Tests for the staging sample catalog seed (media-complete demo products)."""
from datetime import date, timedelta

import pytest

from apps.catalog.models import Product, ProductCompatibilityAssertion
from apps.catalog.sample_data import (
    SAMPLE_SKU_PREFIX,
    remove_sample_catalog,
    seed_sample_catalog,
)
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.devices.services import add_device_to_portfolio
from apps.media.models import MediaAsset


@pytest.fixture
def phone_device(db):
    device_type, _ = DeviceType.objects.get_or_create(
        code="phone", defaults={"name": "Phone", "status": "active"}
    )
    device_type.status = "active"
    device_type.save(update_fields=["status"])
    manufacturer, _ = Manufacturer.objects.get_or_create(name="SampleMfr")
    return Device.objects.create(
        sku="SAMPLE-DEV-001",
        name="Sample Phone X",
        device_type=device_type,
        manufacturer=manufacturer,
        lifecycle_status="available",
        launch_date=date.today() - timedelta(days=400),
    )


@pytest.fixture
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    from django.core.files.storage import default_storage
    from django.utils.functional import empty

    default_storage._wrapped = empty
    return tmp_path


@pytest.mark.django_db
class TestSeedSampleCatalog:
    def test_creates_active_products_with_valid_primary_media(
        self, vendor_company, phone_device, media_root
    ):
        result = seed_sample_catalog(vendor_name=vendor_company.name)

        assert result["skipped"] is None
        assert len(result["created"]) == 4
        products = Product.objects.filter(sku__startswith=SAMPLE_SKU_PREFIX)
        assert products.count() == 4

        for product in products:
            assert product.status == "active"
            assert product.selling_status == "for_sale"
            assert product.vendor_company_reference == vendor_company.id
            assert product.compatibility_status == "complete"

            asset = MediaAsset.objects.get(id=product.primary_image_reference)
            assert asset.status == "ready"
            assert asset.review_status == "approved"
            assert asset.mime_type == "image/png"
            assert asset.has_transparency is True
            assert asset.owner_module == "catalog"
            assert asset.owner_record_id == product.id
            assert asset.width == 512 and asset.height == 512
            assert asset.storage_key

            assert ProductCompatibilityAssertion.objects.filter(
                product=product,
                device_reference=phone_device.id,
                is_compatible=True,
                is_excluded=False,
            ).exists()

    def test_seed_is_idempotent(self, vendor_company, phone_device, media_root):
        first = seed_sample_catalog(vendor_name=vendor_company.name)
        second = seed_sample_catalog(vendor_name=vendor_company.name)

        assert len(first["created"]) == 4
        assert second["created"] == []
        assert len(second["existing"]) == 4
        assert Product.objects.filter(sku__startswith=SAMPLE_SKU_PREFIX).count() == 4
        skus = Product.objects.filter(sku__startswith=SAMPLE_SKU_PREFIX)
        assert MediaAsset.objects.filter(
            owner_record_id__in=list(skus.values_list("id", flat=True))
        ).count() == 4

    def test_buyer_catalog_shows_seeded_products(
        self, vendor_company, buyer_user, buyer_client, phone_device, media_root
    ):
        seed_sample_catalog(vendor_name=vendor_company.name)
        add_device_to_portfolio(buyer_user, phone_device.id)

        resp = buyer_client.get("/api/v1/catalog/products/")

        assert resp.status_code == 200, resp.data
        payload = resp.data["results"] if isinstance(resp.data, dict) else resp.data
        skus = {row["sku"] for row in payload}
        assert {
            "SAMPLE-CASE-001",
            "SAMPLE-CHG-001",
            "SAMPLE-AUD-001",
            "SAMPLE-UNI-001",
        } <= skus

    def test_remove_deletes_sample_products_and_media(
        self, vendor_company, phone_device, media_root
    ):
        seed_sample_catalog(vendor_name=vendor_company.name)
        assert Product.objects.filter(sku__startswith=SAMPLE_SKU_PREFIX).exists()

        result = remove_sample_catalog(vendor_name=vendor_company.name)

        assert result["removed"] == 4
        assert not Product.objects.filter(sku__startswith=SAMPLE_SKU_PREFIX).exists()
        assert not MediaAsset.objects.filter(owner_module="catalog").exists()

    def test_unknown_vendor_is_a_no_op(self, db, media_root):
        result = seed_sample_catalog(vendor_name="does-not-exist")

        assert result["skipped"] == "vendor_not_found"
        assert result["created"] == []

    def test_dry_run_writes_nothing(self, vendor_company, phone_device, media_root):
        result = seed_sample_catalog(
            vendor_name=vendor_company.name, dry_run=True
        )

        assert len(result["created"]) == 4
        assert not Product.objects.filter(sku__startswith=SAMPLE_SKU_PREFIX).exists()
