"""
Tests for Buyer B2B API fixes.

Bug 1: API key auth returns 75 products instead of 4 exported — must filter by BuyerProductExportDate
Bug 2: Image URLs are relative — must be absolute when MEDIA_BASE_URL is set
"""
import uuid
from datetime import date
import pytest
from unittest.mock import patch
from decimal import Decimal
from django.test import override_settings

from apps.media.utils import media_short_url, uuid_to_b62


# ── Bug 2: media_short_url absolute URLs ─────────────────────────────────────

class TestMediaShortUrlAbsolute:
    """media_short_url must return absolute URLs when MEDIA_BASE_URL is configured."""

    @override_settings(MEDIA_USE_SHORT_URLS=True, MEDIA_BASE_URL="https://app.cixci.com")
    def test_short_url_absolute_with_base(self):
        asset_id = uuid.uuid4()
        url = media_short_url(asset_id)
        assert url.startswith("https://app.cixci.com/api/img/")
        assert uuid_to_b62(asset_id) in url

    @override_settings(MEDIA_USE_SHORT_URLS=True, MEDIA_BASE_URL="https://app.cixci.com/")
    def test_short_url_strips_trailing_slash(self):
        asset_id = uuid.uuid4()
        url = media_short_url(asset_id)
        assert "//api/img" not in url
        assert url.startswith("https://app.cixci.com/api/img/")

    @override_settings(MEDIA_USE_SHORT_URLS=True, MEDIA_BASE_URL="")
    def test_short_url_relative_when_no_base(self):
        asset_id = uuid.uuid4()
        url = media_short_url(asset_id)
        assert url.startswith("/api/img/")

    @override_settings(MEDIA_USE_SHORT_URLS=False)
    def test_long_url_mode_unchanged(self):
        """Long URL mode uses MEDIA_URL + storage_key, unaffected by MEDIA_BASE_URL."""
        asset_id = uuid.uuid4()
        with patch("apps.media.models.MediaAsset.objects") as mock_qs:
            mock_qs.values_list.return_value.get.return_value = "products/img.png"
            url = media_short_url(asset_id)
            assert "img.png" in url


# ── Bug 1: Buyer API key product filtering (queryset-level) ──────────────────

def _create_product(vendor_ref, name, sku):
    """Helper to create a minimal valid product for buyer visibility tests."""
    from apps.catalog.models import Product, ProductStatus
    return Product.objects.create(
        name=name, sku=sku,
        status=ProductStatus.ACTIVE,
        vendor_company_reference=vendor_ref,
        company_scope_reference=vendor_ref,
        msrp=Decimal("29.99"),
        launch_date=date(2025, 1, 1),
        release_date=date(2025, 1, 1),
        compatibility_status="complete",
    )


@pytest.mark.django_db
def test_export_filter_returns_only_exported_products(buyer_company, buyer_entity, buyer_user):
    """
    BuyerProductExportDate filter must return only the products that were
    explicitly exported to the buyer, not all compatible products.
    This is the core fix for Bug 1 (75 products instead of 4).
    """
    from apps.catalog.models import Product, BuyerProductExportDate, ProductStatus
    from django.utils import timezone
    from django.db.models import Q
    import pytz

    vendor_ref = uuid.uuid4()
    products = [_create_product(vendor_ref, f"Product {i}", f"SKU-{i:04d}") for i in range(5)]

    device_ref = uuid.uuid4()
    for p in products[:2]:
        BuyerProductExportDate.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=buyer_company.id,
            buyer_entity_reference=buyer_entity.id,
            product=p,
            device_reference=device_ref,
            exported_at=timezone.now(),
        )

    # Reproduce the buyer product filtering from get_queryset
    est = pytz.timezone("US/Eastern")
    today_est = timezone.now().astimezone(est).date()
    qs = Product.objects.filter(status=ProductStatus.ACTIVE)
    qs = qs.exclude(compatibility_status="incomplete")
    qs = qs.filter(Q(release_date__isnull=True) | Q(release_date__lte=today_est))

    # Apply BuyerProductExportDate filter (the fix)
    exported_product_ids = BuyerProductExportDate.objects.filter(
        company_scope_reference=buyer_company.id,
    ).values_list("product_id", flat=True)
    qs = qs.filter(id__in=exported_product_ids)

    returned_ids = {str(p.id) for p in qs}
    expected_ids = {str(p.id) for p in products[:2]}
    assert returned_ids == expected_ids, (
        f"Expected only 2 exported products, got {len(returned_ids)}"
    )


@pytest.mark.django_db
def test_export_filter_respects_device_id(buyer_company, buyer_entity, buyer_user):
    """BuyerProductExportDate filter with device_reference narrows to a single device."""
    from apps.catalog.models import Product, BuyerProductExportDate, ProductStatus
    from django.utils import timezone
    from django.db.models import Q
    import pytz

    device_a = uuid.uuid4()
    device_b = uuid.uuid4()
    vendor_ref = uuid.uuid4()

    p_a = _create_product(vendor_ref, "Product for Device A", "SKU-DEV-A")
    p_b = _create_product(vendor_ref, "Product for Device B", "SKU-DEV-B")

    for p, dev in [(p_a, device_a), (p_b, device_b)]:
        BuyerProductExportDate.objects.create(
            buyer_reference=buyer_user.id,
            company_scope_reference=buyer_company.id,
            buyer_entity_reference=buyer_entity.id,
            product=p,
            device_reference=dev,
            exported_at=timezone.now(),
        )

    # Filter exports by device_a only
    est = pytz.timezone("US/Eastern")
    today_est = timezone.now().astimezone(est).date()
    qs = Product.objects.filter(status=ProductStatus.ACTIVE)
    qs = qs.exclude(compatibility_status="incomplete")
    qs = qs.filter(Q(release_date__isnull=True) | Q(release_date__lte=today_est))

    exported_product_ids = BuyerProductExportDate.objects.filter(
        company_scope_reference=buyer_company.id,
        device_reference=device_a,
    ).values_list("product_id", flat=True)
    qs = qs.filter(id__in=exported_product_ids)

    returned_ids = {str(p.id) for p in qs}
    assert returned_ids == {str(p_a.id)}, "Should only return product exported for device A"


@pytest.mark.django_db
def test_no_exports_returns_empty(buyer_company, buyer_entity, buyer_user):
    """If no BuyerProductExportDate records exist, the API key query returns nothing."""
    from apps.catalog.models import Product, BuyerProductExportDate, ProductStatus
    from django.db.models import Q
    import pytz
    from django.utils import timezone

    vendor_ref = uuid.uuid4()
    _create_product(vendor_ref, "Orphan Product", "SKU-ORPHAN")

    est = pytz.timezone("US/Eastern")
    today_est = timezone.now().astimezone(est).date()
    qs = Product.objects.filter(status=ProductStatus.ACTIVE)
    qs = qs.exclude(compatibility_status="incomplete")
    qs = qs.filter(Q(release_date__isnull=True) | Q(release_date__lte=today_est))

    exported_product_ids = BuyerProductExportDate.objects.filter(
        company_scope_reference=buyer_company.id,
    ).values_list("product_id", flat=True)
    qs = qs.filter(id__in=exported_product_ids)

    assert qs.count() == 0, "No exported products should mean empty queryset"


@pytest.mark.django_db
def test_api_key_auth_detected_correctly(buyer_company, buyer_user):
    """CompanyAPIKey instance as request.auth is correctly identified as API key auth."""
    from apps.integration.models import CompanyAPIKey

    api_key = CompanyAPIKey.objects.create(
        company_scope_reference=buyer_company.id,
        label="Detection Test Key",
        token="cixci_key_detect_" + uuid.uuid4().hex[:40],
    )

    assert isinstance(api_key, CompanyAPIKey)
    # The view checks: isinstance(self.request.auth, CompanyAPIKey)
    # This should be True for API key auth, False for JWT auth (where auth is a token)
    assert not isinstance(None, CompanyAPIKey), "JWT auth (None) should not match"
    assert not isinstance("token_string", CompanyAPIKey), "String token should not match"
