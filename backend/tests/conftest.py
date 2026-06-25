"""
Shared pytest fixtures for CIXCI integration tests.

All database tests use @pytest.mark.django_db (or the class-level marker).
Fixtures here build the minimal tenant graph needed to authenticate and authorize
requests through the CheckAccessMixin.
"""
import pytest
from rest_framework.test import APIClient

from apps.tenant.models import (
    Company, CompanyEntity, User, Capability, CompanyType,
    CompanyStatus, EntityStatus,
)


# ── Company / Entity ──────────────────────────────────────────────────────────

@pytest.fixture
def buyer_company(db):
    return Company.objects.create(
        name="Buyer Corp",
        company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE,
        slug="buyer-corp",
    )


@pytest.fixture
def vendor_company(db):
    return Company.objects.create(
        name="Vendor Inc",
        company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE,
        slug="vendor-inc",
    )


@pytest.fixture
def buyer_entity(buyer_company):
    return CompanyEntity.objects.create(
        company=buyer_company,
        name="Buyer Entity HQ",
        status=EntityStatus.ACTIVE,
    )


# ── Capabilities ──────────────────────────────────────────────────────────────

@pytest.fixture
def cap_factory(db):
    """Return a helper that lazily creates Capability records."""
    created = {}

    def _get(code: str) -> Capability:
        if code not in created:
            created[code], _ = Capability.objects.get_or_create(
                code=code,
                defaults={"module": code.split(".")[0], "is_active": True},
            )
        return created[code]

    return _get


# ── Users ─────────────────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(db):
    """CIXCI System Admin — bypasses all capability checks."""
    return User.objects.create_superuser(
        email="admin@cixci.test",
        password="adminpass123",
    )


@pytest.fixture
def buyer_user(buyer_entity, cap_factory):
    """Regular buyer user with common device + catalog capabilities."""
    user = User.objects.create_user(
        email="buyer@buyer.test",
        entity=buyer_entity,
        password="buyerpass123",
    )
    caps = [
        "devices.device.list", "devices.device.read", "devices.device.import",
        "devices.device.manage",
        "devices.type.list", "devices.type.read", "devices.type.manage",
        "devices.manufacturer.list", "devices.manufacturer.read", "devices.manufacturer.manage",
        "devices.feature.list", "devices.feature.read", "devices.feature.manage",
        "devices.dqe.list", "devices.dqe.read", "devices.dqe.create", "devices.dqe.resolve",
        "devices.portfolio.self_modify",
        "catalog.product.list", "catalog.product.read", "catalog.product.create",
        "catalog.product.update", "catalog.product.delete",
        "catalog.product.manage_selling",
        "tenant.company.list", "tenant.company.read",
        "tenant.entity.list", "tenant.entity.read",
        "tenant.user.list", "tenant.user.read",
        "tenant.relationship.list", "tenant.relationship.read", "tenant.relationship.create",
        "tenant.relationship.update", "tenant.relationship.approve",
        "media.asset.list", "media.asset.read", "media.asset.upload", "media.asset.manage",
        "analytics.metrics.list", "analytics.metrics.read",
        "analytics.summary.read",
        "integration.connection.list", "integration.connection.read", "integration.connection.manage",
        "integration.action.list", "integration.action.read",
        "procurement.po.list", "procurement.po.read", "procurement.po.create",
        "procurement.po.update", "procurement.po.approve", "procurement.po.manage",
        "launch.event.list", "launch.event.read", "launch.event.create",
        "launch.event.update", "launch.event.manage",
    ]
    for code in caps:
        cap = cap_factory(code)
        user.capabilities.add(cap)
        if user.company:
            user.company.capabilities.add(cap)
    return user


# ── API Clients ───────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def admin_client(admin_user):
    """DRF client authenticated as CIXCI System Admin."""
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def buyer_client(buyer_user):
    """DRF client authenticated as buyer_user."""
    client = APIClient()
    client.force_authenticate(user=buyer_user)
    return client
