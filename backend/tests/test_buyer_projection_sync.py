"""
Buyer compatibility projection â€” company portfolio sync.

The My Devices portfolio is company-scoped business data, but the compatibility
projection is keyed by user. These tests lock in the invariants that keep the
two consistent:

- a colleague who never touched the portfolio still gets a projection
- portfolio mutations are shared across users of the same buyer entity
- refreshing works without a personal portfolio snapshot
- other entities in the same company stay isolated
"""
import uuid

import pytest

from apps.catalog.models import (
    BuyerScopedCompatibilityProjection,
    Product,
    ProductCompatibilityAssertion,
)
from apps.devices.models import (
    BuyerDevicePortfolioReference,
    Device,
    DeviceType,
    Manufacturer,
)
from apps.devices.services import add_device_to_portfolio, remove_device_from_portfolio
from apps.tenant.models import User


def _make_device(sku="DEV-PROJ-001"):
    dt, _ = DeviceType.objects.get_or_create(
        name="Smartphone", code="smartphone", defaults={"status": "active"}
    )
    dt.status = "active"
    dt.save(update_fields=["status"])
    mfr, _ = Manufacturer.objects.get_or_create(name="ProjectionMfr")
    device, _ = Device.objects.get_or_create(
        sku=sku,
        defaults={
            "name": f"Device {sku}",
            "device_type": dt,
            "manufacturer": mfr,
            "lifecycle_status": "available",
        },
    )
    device.lifecycle_status = "available"
    device.save(update_fields=["lifecycle_status"])
    return device


def _make_product(sku="PROJ-ACC-001", compatible=True):
    product = Product.objects.create(
        name=f"Product {sku}",
        sku=sku,
        brand="Acme",
        product_type="accessory",
        status="active",
        selling_status="for_sale",
        launch_date="2026-01-15",
        compatibility_status="complete",
        company_scope_reference=uuid.uuid4(),
        vendor_company_reference=uuid.uuid4(),
    )
    return product


def _assert_compatible(product, device, is_compatible=True):
    return ProductCompatibilityAssertion.objects.create(
        product=product,
        device_reference=device.id,
        is_compatible=is_compatible,
        is_excluded=False,
    )


@pytest.fixture
def buyer_colleague(buyer_entity, cap_factory):
    """A second buyer user in the same company entity."""
    user = User.objects.create_user(
        email="colleague@buyer.test",
        entity=buyer_entity,
        password="colleaguepass123",
    )
    for code in ("catalog.product.list", "catalog.product.read"):
        user.capabilities.add(cap_factory(code))
        if user.company:
            user.company.capabilities.add(cap_factory(code))
    return user


@pytest.fixture
def colleague_client(buyer_colleague):
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(user=buyer_colleague)
    return client


@pytest.mark.django_db
class TestCompanyPortfolioSync:
    def test_colleague_projection_self_heals(self, buyer_client, buyer_colleague, colleague_client):
        device = _make_device()
        product = _make_product()
        _assert_compatible(product, device)
        add_device_to_portfolio(buyer_colleague, device.id)

        resp = buyer_client.get("/api/v1/catalog/my-projection/my_projection/")

        assert resp.status_code == 200
        assert resp.data["compatible_product_count"] == 1
        assert str(product.id) in resp.data["compatible_product_ids"]

    def test_projection_scope_lists_products_for_colleague(
        self, buyer_client, buyer_colleague, colleague_client
    ):
        device = _make_device()
        product = _make_product()
        _assert_compatible(product, device)
        add_device_to_portfolio(buyer_colleague, device.id)

        resp = colleague_client.get(
            "/api/v1/catalog/products/", {"projection_scope": "true", "paginate": "false"}
        )

        assert resp.status_code == 200
        assert {p["sku"] for p in resp.data} == {product.sku}

    def test_buyer_without_portfolio_still_gets_404(self, buyer_client):
        resp = buyer_client.get("/api/v1/catalog/my-projection/my_projection/")

        assert resp.status_code == 404
        assert resp.data["reason"] == "no_portfolio_devices"

    def test_refresh_works_without_personal_snapshot(self, buyer_client, buyer_user, buyer_colleague):
        device = _make_device()
        product = _make_product()
        _assert_compatible(product, device)
        add_device_to_portfolio(buyer_colleague, device.id)

        assert not BuyerDevicePortfolioReference.objects.filter(
            buyer_reference=buyer_user.id
        ).exists()

        resp = buyer_client.post("/api/v1/catalog/my-projection/refresh/")

        assert resp.status_code == 200
        assert resp.data["compatible_count"] == 1
        assert resp.data["status"] == "active"

    def test_portfolio_is_shared_across_company_users(self, buyer_client, buyer_colleague):
        device = _make_device()
        add_device_to_portfolio(buyer_colleague, device.id)

        first = buyer_client.get("/api/v1/devices/portfolio/my_devices/")
        assert first.status_code == 200
        assert [str(row["device"]) for row in first.data] == [str(device.id)]

        again = buyer_client.post(
            "/api/v1/devices/portfolio/add/", {"device_id": str(device.id)}
        )
        assert again.status_code == 201
        assert again.data["status"] == "already_active"

        assert BuyerDevicePortfolioReference.objects.filter(
            device=device,
            company_scope_reference=buyer_colleague.entity.company_id,
            buyer_entity_reference=buyer_colleague.entity_id,
            active_flag=True,
        ).count() == 1

    def test_colleague_can_remove_shared_device(self, buyer_client, buyer_colleague):
        device = _make_device()
        add_device_to_portfolio(buyer_colleague, device.id)

        resp = buyer_client.post(
            "/api/v1/devices/portfolio/remove/", {"device_id": str(device.id)}
        )

        assert resp.status_code == 200
        assert resp.data["status"] == "removed"
        listing = buyer_client.get("/api/v1/devices/portfolio/my_devices/")
        assert listing.data == []

    def test_other_entity_is_isolated(self, buyer_client, buyer_colleague, buyer_company):
        from apps.tenant.models import CompanyEntity

        other_entity = CompanyEntity.objects.create(
            company=buyer_company, name="Other Entity", status="active"
        )
        other_user = User.objects.create_user(
            email="other-entity@buyer.test", entity=other_entity, password="pass12345"
        )
        device = _make_device()
        add_device_to_portfolio(other_user, device.id)

        resp = buyer_client.get("/api/v1/devices/portfolio/my_devices/")
        assert resp.data == []
        projection = buyer_client.get("/api/v1/catalog/my-projection/my_projection/")
        assert projection.status_code == 404

    def test_projection_refreshes_for_colleagues_on_portfolio_change(
        self, buyer_client, buyer_user, buyer_colleague
    ):
        device = _make_device()
        product = _make_product()
        _assert_compatible(product, device)
        add_device_to_portfolio(buyer_colleague, device.id)

        first = buyer_client.get("/api/v1/catalog/my-projection/my_projection/")
        assert first.data["compatible_product_count"] == 1

        remove_device_from_portfolio(buyer_colleague, device.id)

        projection = BuyerScopedCompatibilityProjection.objects.get(
            buyer_reference=buyer_user.id
        )
        assert projection.status == "empty_portfolio"
        assert projection.compatible_product_count == 0

    def test_incompatible_assertions_are_not_projected(self, buyer_client, buyer_user):
        device = _make_device()
        product = _make_product()
        _assert_compatible(product, device, is_compatible=False)
        add_device_to_portfolio(buyer_user, device.id)

        resp = buyer_client.get("/api/v1/catalog/my-projection/my_projection/")

        assert resp.status_code == 200
        assert resp.data["status"] == "active"
        assert resp.data["compatible_product_count"] == 0

