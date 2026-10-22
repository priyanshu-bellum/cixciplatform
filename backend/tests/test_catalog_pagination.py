"""
Server-side pagination and filtering for the Product Catalog list.

The Catalog page used to fetch the entire catalog in one request
(`paginate=false`) and paginate on the client. These tests lock in the
server-side behaviour: numbered pagination, page-size control, the filters
that moved from the client to the API, and the `paginate=false` escape hatch.
"""
import pytest
from decimal import Decimal

from apps.catalog.models import Product, ProductStatus, SellingStatus
from apps.tenant.models import CompanyType


def _make_product(vendor, sku, **kwargs):
    from django.utils import timezone
    defaults = dict(
        name=f"Product {sku}",
        brand=kwargs.pop("brand", "Acme"),
        product_type="accessory",
        product_category=kwargs.pop("product_category", "Cases"),
        upc=f"UPC-{sku}",
        msrp=Decimal("24.99"),
        vendor_wholesale_price_amount=Decimal("3.15"),
        launch_date=timezone.now().date(),
        compatibility_status="complete",
        company_scope_reference=vendor.id,
        status=ProductStatus.ACTIVE,
        selling_status=SellingStatus.FOR_SALE,
    )
    defaults.update(kwargs)
    return Product.objects.create(vendor_company_reference=vendor.id, sku=sku, **defaults)


@pytest.mark.django_db
class TestCatalogServerSidePagination:
    def test_list_is_paginated_by_default(self, admin_client, vendor_company):
        for i in range(7):
            _make_product(vendor_company, f"SKU-{i:03d}")

        resp = admin_client.get("/api/v1/catalog/products/", {"page_size": 3})

        assert resp.status_code == 200
        assert resp.data["count"] == 7
        assert len(resp.data["results"]) == 3
        assert resp.data["next"] is not None
        assert resp.data["previous"] is None

    def test_page_size_and_page_number(self, admin_client, vendor_company):
        for i in range(7):
            _make_product(vendor_company, f"SKU-{i:03d}")

        page2 = admin_client.get("/api/v1/catalog/products/", {"page_size": 3, "page": 2})
        assert page2.status_code == 200
        assert len(page2.data["results"]) == 3
        assert page2.data["previous"] is not None

        page3 = admin_client.get("/api/v1/catalog/products/", {"page_size": 3, "page": 3})
        assert page3.status_code == 200
        assert len(page3.data["results"]) == 1
        assert page3.data["next"] is None

    def test_paginate_false_returns_every_row(self, admin_client, vendor_company):
        for i in range(7):
            _make_product(vendor_company, f"SKU-{i:03d}")

        resp = admin_client.get("/api/v1/catalog/products/", {"paginate": "false"})

        assert resp.status_code == 200
        assert isinstance(resp.data, list)
        assert len(resp.data) == 7

    def test_vendor_only_sees_own_products(self, vendor_client, vendor_company):
        from apps.tenant.models import Company, CompanyStatus
        other = Company.objects.create(
            name="Other Vendor", company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE, slug="other-vendor",
        )
        _make_product(vendor_company, "MINE-001")
        _make_product(other, "THEIRS-001")

        resp = vendor_client.get("/api/v1/catalog/products/", {"paginate": "false"})

        assert resp.status_code == 200
        skus = {p["sku"] for p in resp.data}
        assert skus == {"MINE-001"}


@pytest.mark.django_db
class TestCatalogServerSideFilters:
    def test_brand_filter(self, admin_client, vendor_company):
        _make_product(vendor_company, "A-001", brand="Apple")
        _make_product(vendor_company, "A-002", brand="Samsung")
        _make_product(vendor_company, "A-003", brand="Apple")

        resp = admin_client.get("/api/v1/catalog/products/", {"brand": "Apple", "paginate": "false"})

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"A-001", "A-003"}

    def test_multi_value_brand_filter(self, admin_client, vendor_company):
        _make_product(vendor_company, "A-001", brand="Apple")
        _make_product(vendor_company, "A-002", brand="Samsung")
        _make_product(vendor_company, "A-003", brand="Google")

        resp = admin_client.get(
            "/api/v1/catalog/products/", {"brand": "Apple,Samsung", "paginate": "false"}
        )

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"A-001", "A-002"}

    def test_category_filter(self, admin_client, vendor_company):
        _make_product(vendor_company, "A-001", product_category="Cases")
        _make_product(vendor_company, "A-002", product_category="Chargers and Cables")

        resp = admin_client.get(
            "/api/v1/catalog/products/", {"product_category": "Cases", "paginate": "false"}
        )

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"A-001"}

    def test_color_filter_matches_color_or_system_color(self, admin_client, vendor_company):
        _make_product(vendor_company, "A-001", color="Black", system_color=None)
        _make_product(vendor_company, "A-002", color=None, system_color="Black")
        _make_product(vendor_company, "A-003", color="Blue", system_color=None)

        resp = admin_client.get("/api/v1/catalog/products/", {"color": "Black", "paginate": "false"})

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"A-001", "A-002"}

    def test_msrp_range_filter(self, admin_client, vendor_company):
        _make_product(vendor_company, "LOW", msrp=Decimal("10.00"))
        _make_product(vendor_company, "MID", msrp=Decimal("75.00"))
        _make_product(vendor_company, "HIGH", msrp=Decimal("500.00"))

        resp = admin_client.get("/api/v1/catalog/products/", {"msrp_range": "50-100", "paginate": "false"})

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"MID"}

    def test_msrp_open_ended_top_band(self, admin_client, vendor_company):
        _make_product(vendor_company, "MID", msrp=Decimal("75.00"))
        _make_product(vendor_company, "HIGH", msrp=Decimal("500.00"))

        resp = admin_client.get("/api/v1/catalog/products/", {"msrp_range": "200+", "paginate": "false"})

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"HIGH"}

    def test_product_ids_filter(self, admin_client, vendor_company):
        p1 = _make_product(vendor_company, "A-001")
        p2 = _make_product(vendor_company, "A-002")

        resp = admin_client.get(
            "/api/v1/catalog/products/", {"product_ids": str(p1.id), "paginate": "false"}
        )

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"A-001"}

    def test_search_still_works(self, admin_client, vendor_company):
        _make_product(vendor_company, "A-001", name="Clear Silicone Case")
        _make_product(vendor_company, "A-002", name="Wired Charger")

        resp = admin_client.get("/api/v1/catalog/products/", {"search": "Charger", "paginate": "false"})

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {"A-002"}


@pytest.mark.django_db
class TestCatalogBulkSerialization:
    """The list serializer must not issue per-row queries (N+1)."""

    def test_list_response_contains_expected_fields(self, admin_client, vendor_company):
        _make_product(vendor_company, "A-001")

        resp = admin_client.get("/api/v1/catalog/products/", {"paginate": "false"})

        assert resp.status_code == 200
        row = resp.data[0]
        for field in (
            "id", "name", "sku", "brand", "msrp",
            "vendor_wholesale_price_amount", "buyer_wholesale_price",
            "primary_image_url", "media_references", "device_compatibility",
            "vendor_name", "vendor_map_pricing_enforced",
        ):
            assert field in row

    def test_query_count_is_bounded_by_page_size(self, admin_client, vendor_company, django_assert_num_queries):
        for i in range(5):
            _make_product(vendor_company, f"SKU-{i:03d}")

        with django_assert_num_queries(20) as ctx:
            admin_client.get("/api/v1/catalog/products/", {"page_size": 5})

        # The old implementation issued ~5 queries per product (media assets,
        # vendor company x2, primary image, compatibility assertions + devices).
        assert len(ctx.captured_queries) <= 20


@pytest.mark.django_db
class TestCatalogMatchingIds:
    """
    "Select all" spans every page, so the API exposes the ids of every product
    matching the active filters. Only ids are returned.
    """

    def test_matching_ids_returns_all_matching_products(self, admin_client, vendor_company):
        for i in range(5):
            _make_product(vendor_company, f"SKU-{i:03d}")

        resp = admin_client.get("/api/v1/catalog/products/ids/")

        assert resp.status_code == 200
        assert resp.data["count"] == 5
        assert len(resp.data["ids"]) == 5

    def test_matching_ids_respects_filters(self, admin_client, vendor_company):
        _make_product(vendor_company, "A-001", brand="Acme")
        _make_product(vendor_company, "A-002", brand="Globex")

        resp = admin_client.get("/api/v1/catalog/products/ids/", {"brand": "Globex"})

        assert resp.status_code == 200
        assert resp.data["count"] == 1

        product = Product.objects.get(sku="A-002")
        assert resp.data["ids"] == [str(product.id)]

    def test_matching_ids_is_not_paginated(self, admin_client, vendor_company):
        for i in range(7):
            _make_product(vendor_company, f"SKU-{i:03d}")

        resp = admin_client.get("/api/v1/catalog/products/ids/", {"page_size": 2})

        assert resp.status_code == 200
        assert resp.data["count"] == 7


@pytest.mark.django_db
class TestCatalogProjectionScope:
    """
    The "My Compatibility" tab is scoped to the buyer's own compatibility
    projection. The scope is resolved server-side so the id list never has to
    travel in the URL.
    """

    def _buyer_visible_product(self, buyer_user, sku):
        import uuid
        from apps.devices.models import Device, DeviceType, Manufacturer
        from apps.devices.services import add_device_to_portfolio
        from apps.catalog.models import ProductCompatibilityAssertion

        product = Product.objects.create(
            name=f"Product {sku}",
            sku=sku,
            brand="Acme",
            product_type="accessory",
            status="active",
            selling_status="for_sale",
            launch_date="2026-01-15",
            compatibility_status="complete",
            company_scope_reference=buyer_user.entity.company_id,
            vendor_company_reference=uuid.uuid4(),
        )
        dt, _ = DeviceType.objects.get_or_create(
            name="Smartphone", code="smartphone", defaults={"status": "active"}
        )
        mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
        device, _ = Device.objects.get_or_create(name="TestDevice", device_type=dt, manufacturer=mfr)
        add_device_to_portfolio(buyer_user, device.id)
        ProductCompatibilityAssertion.objects.create(
            product=product,
            device_reference=device.id,
            is_compatible=True,
            is_excluded=False,
        )
        return product

    def _make_projection(self, buyer_user, product_ids):
        import uuid
        from apps.catalog.models import BuyerScopedCompatibilityProjection

        # Adding a device to the portfolio auto-recalculates a projection, so
        # the existing record is updated rather than duplicated.
        projection, _ = BuyerScopedCompatibilityProjection.objects.get_or_create(
            buyer_reference=buyer_user.id,
            company_scope_reference=buyer_user.entity.company_id,
            buyer_entity_reference=buyer_user.entity_id,
            defaults={
                "portfolio_snapshot_reference": uuid.uuid4(),
                "status": "active",
            },
        )
        projection.compatible_product_ids = [str(p) for p in product_ids]
        projection.compatible_product_count = len(product_ids)
        projection.save()
        return projection

    def test_projection_scope_limits_list_to_projected_products(self, buyer_client, buyer_user):
        p1 = self._buyer_visible_product(buyer_user, "PROJ-001")
        p2 = self._buyer_visible_product(buyer_user, "PROJ-002")
        self._make_projection(buyer_user, [p1.id])

        unscoped = buyer_client.get("/api/v1/catalog/products/", {"paginate": "false"})
        scoped = buyer_client.get(
            "/api/v1/catalog/products/", {"projection_scope": "true", "paginate": "false"}
        )

        assert unscoped.status_code == 200
        assert {p["sku"] for p in unscoped.data} == {"PROJ-001", "PROJ-002"}

        assert scoped.status_code == 200
        assert {p["sku"] for p in scoped.data} == {"PROJ-001"}

    def test_projection_scope_is_empty_without_a_projection(self, buyer_client, buyer_user):
        from apps.catalog.models import BuyerScopedCompatibilityProjection

        self._buyer_visible_product(buyer_user, "PROJ-003")
        # A portfolio change auto-creates a projection — remove it to model a
        # buyer that has no projection yet.
        BuyerScopedCompatibilityProjection.objects.all().delete()

        resp = buyer_client.get(
            "/api/v1/catalog/products/", {"projection_scope": "true", "paginate": "false"}
        )

        assert resp.status_code == 200
        assert resp.data == []

    def test_matching_ids_respects_projection_scope(self, buyer_client, buyer_user):
        p1 = self._buyer_visible_product(buyer_user, "PROJ-004")
        self._buyer_visible_product(buyer_user, "PROJ-005")
        self._make_projection(buyer_user, [p1.id])

        resp = buyer_client.get("/api/v1/catalog/products/ids/", {"projection_scope": "true"})

        assert resp.status_code == 200
        assert resp.data["ids"] == [str(p1.id)]
