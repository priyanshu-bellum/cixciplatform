"""
Device Catalog integration tests.

Covers: DeviceType CRUD, Manufacturer CRUD, Device CRUD + search,
BuyerPortfolio add/remove/history via the service layer and HTTP endpoints.
"""
import pytest

from apps.devices.models import (
    DeviceType, Manufacturer, Device, DeviceLifecycleStatus,
    BuyerDevicePortfolioReference,
)
from apps.devices.services import add_device_to_portfolio, remove_device_from_portfolio


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def device_type(db):
    return DeviceType.objects.create(name="Smartphone", code="smartphone", status="active")


@pytest.fixture
def manufacturer(db):
    return Manufacturer.objects.create(name="TestMaker")


@pytest.fixture
def device(device_type, manufacturer):
    return Device.objects.create(
        name="TestPhone X",
        sku="TP-X-001",
        device_type=device_type,
        manufacturer=manufacturer,
        lifecycle_status=DeviceLifecycleStatus.CURRENT,
    )


# ── DeviceType ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeviceTypeEndpoints:
    def test_list_device_types(self, buyer_client, device_type):
        resp = buyer_client.get("/api/v1/devices/types/")
        assert resp.status_code == 200
        names = [t["name"] for t in resp.data["results"]]
        assert "Smartphone" in names

    def test_create_device_type(self, admin_client):
        resp = admin_client.post("/api/v1/devices/types/", {
            "name": "Smartwatch", "code": "smartwatch",
        })
        assert resp.status_code == 201
        assert resp.data["name"] == "Smartwatch"
        assert resp.data["code"] == "smartwatch"

    def test_create_device_type_duplicate_code_fails(self, admin_client, device_type):
        resp = admin_client.post("/api/v1/devices/types/", {
            "name": "Another Phone", "code": "smartphone",
        })
        assert resp.status_code == 400

    def test_retrieve_device_type(self, buyer_client, device_type):
        resp = buyer_client.get(f"/api/v1/devices/types/{device_type.id}/")
        assert resp.status_code == 200
        assert resp.data["id"] == str(device_type.id)

    def test_search_device_types(self, buyer_client, device_type):
        resp = buyer_client.get("/api/v1/devices/types/?search=smart")
        assert resp.status_code == 200
        assert any(t["code"] == "smartphone" for t in resp.data["results"])


# ── Manufacturer ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestManufacturerEndpoints:
    def test_list_manufacturers(self, buyer_client, manufacturer):
        resp = buyer_client.get("/api/v1/devices/manufacturers/")
        assert resp.status_code == 200
        assert any(m["name"] == "TestMaker" for m in resp.data["results"])

    def test_create_manufacturer(self, admin_client):
        resp = admin_client.post("/api/v1/devices/manufacturers/", {"name": "Apple"})
        assert resp.status_code == 201
        assert resp.data["name"] == "Apple"

    def test_update_manufacturer(self, admin_client, manufacturer):
        resp = admin_client.patch(
            f"/api/v1/devices/manufacturers/{manufacturer.id}/",
            {"name": "Updated Maker"},
        )
        assert resp.status_code == 200
        assert resp.data["name"] == "Updated Maker"


# ── Device ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeviceEndpoints:
    def test_list_devices(self, buyer_client, device):
        resp = buyer_client.get("/api/v1/devices/devices/")
        assert resp.status_code == 200
        assert any(d["name"] == "TestPhone X" for d in resp.data["results"])

    def test_retrieve_device(self, buyer_client, device):
        resp = buyer_client.get(f"/api/v1/devices/devices/{device.id}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "TestPhone X"
        assert resp.data["sku"] == "TP-X-001"

    def test_create_device(self, admin_client, device_type, manufacturer):
        resp = admin_client.post("/api/v1/devices/devices/", {
            "name": "NewPhone Pro",
            "sku": "NP-PRO-001",
            "model_number": "NP-PRO",
            "device_type": str(device_type.id),
            "manufacturer": str(manufacturer.id),
            "lifecycle_status": "announced",
        })
        assert resp.status_code == 201
        assert resp.data["name"] == "NewPhone Pro"

    def test_search_devices_by_name(self, buyer_client, device):
        resp = buyer_client.get("/api/v1/devices/devices/?search=TestPhone")
        assert resp.status_code == 200
        assert any(d["name"] == "TestPhone X" for d in resp.data["results"])

    def test_search_devices_by_sku(self, buyer_client, device):
        resp = buyer_client.get("/api/v1/devices/devices/?search=TP-X")
        assert resp.status_code == 200
        assert any(d["sku"] == "TP-X-001" for d in resp.data["results"])

    def test_filter_by_lifecycle_status(self, buyer_client, device):
        resp = buyer_client.get("/api/v1/devices/devices/?lifecycle_status=current")
        assert resp.status_code == 200
        for d in resp.data["results"]:
            assert d["lifecycle_status"] == "current"

    def test_unauthenticated_cannot_list_devices(self, api_client):
        resp = api_client.get("/api/v1/devices/devices/")
        assert resp.status_code == 401

    def test_capability_evidence_returns_404_when_none(self, buyer_client, device):
        resp = buyer_client.get(f"/api/v1/devices/devices/{device.id}/capability_evidence/")
        assert resp.status_code == 404


# ── Portfolio ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPortfolioEndpoints:
    def test_my_devices_empty_initially(self, buyer_client):
        resp = buyer_client.get("/api/v1/devices/portfolio/my_devices/")
        assert resp.status_code == 200
        assert resp.data == []

    def test_add_device_via_http(self, buyer_client, device):
        resp = buyer_client.post("/api/v1/devices/portfolio/add/", {
            "device_id": str(device.id),
        })
        assert resp.status_code == 201
        assert resp.data["status"] == "added"

    def test_my_devices_shows_added_device(self, buyer_client, buyer_user, device):
        add_device_to_portfolio(buyer_user, device.id)
        resp = buyer_client.get("/api/v1/devices/portfolio/my_devices/")
        assert resp.status_code == 200
        assert any(str(d["device"]) == str(device.id) for d in resp.data)

    def test_add_already_active_device_returns_already_active(self, buyer_user, device):
        add_device_to_portfolio(buyer_user, device.id)
        result = add_device_to_portfolio(buyer_user, device.id)
        assert result["status"] == "already_active"

    def test_remove_device_via_http(self, buyer_client, buyer_user, device):
        add_device_to_portfolio(buyer_user, device.id)
        resp = buyer_client.post("/api/v1/devices/portfolio/remove/", {
            "device_id": str(device.id),
        })
        assert resp.status_code == 200
        assert resp.data["status"] == "removed"

    def test_my_devices_empty_after_removal(self, buyer_client, buyer_user, device):
        add_device_to_portfolio(buyer_user, device.id)
        remove_device_from_portfolio(buyer_user, device.id)
        resp = buyer_client.get("/api/v1/devices/portfolio/my_devices/")
        assert resp.status_code == 200
        assert resp.data == []

    def test_portfolio_history_records_changes(self, buyer_client, buyer_user, device):
        add_device_to_portfolio(buyer_user, device.id)
        remove_device_from_portfolio(buyer_user, device.id)
        resp = buyer_client.get("/api/v1/devices/portfolio/history/")
        assert resp.status_code == 200
        change_types = [r["change_type"] for r in resp.data]
        assert "device_added" in change_types
        assert "device_removed" in change_types

    def test_remove_device_not_in_portfolio(self, buyer_user, device):
        result = remove_device_from_portfolio(buyer_user, device.id)
        assert result["status"] == "not_in_portfolio"

    def test_buyer_scope_isolation(self, buyer_user, device, buyer_entity, buyer_company):
        """A second buyer's portfolio is completely separate."""
        from apps.tenant.models import User
        other_entity = buyer_entity.__class__.objects.create(
            company=buyer_company, name="Other Entity",
            status="active",
        )
        other_user = User.objects.create_user(
            email="other@buyer.test", entity=other_entity, password="pass",
        )
        from apps.tenant.models import Capability
        cap, _ = Capability.objects.get_or_create(
            code="devices.portfolio.self_modify",
            defaults={"module": "devices", "is_active": True},
        )
        other_user.capabilities.add(cap)

        add_device_to_portfolio(buyer_user, device.id)

        # other_user portfolio must be empty
        refs = BuyerDevicePortfolioReference.objects.filter(
            buyer_reference=other_user.id,
            active_flag=True,
        )
        assert refs.count() == 0


# ── Portfolio Service Edge Cases ──────────────────────────────────────────────

@pytest.mark.django_db
class TestPortfolioService:
    def test_add_creates_snapshot(self, buyer_user, device):
        from apps.devices.models import BuyerDevicePortfolioSnapshot
        result = add_device_to_portfolio(buyer_user, device.id)
        assert "snapshot_id" in result
        snap = BuyerDevicePortfolioSnapshot.objects.get(id=result["snapshot_id"])
        assert snap.device_count == 1
        assert str(device.id) in snap.device_ids

    def test_remove_creates_empty_snapshot(self, buyer_user, device):
        from apps.devices.models import BuyerDevicePortfolioSnapshot
        add_device_to_portfolio(buyer_user, device.id)
        result = remove_device_from_portfolio(buyer_user, device.id)
        snap = BuyerDevicePortfolioSnapshot.objects.get(id=result["snapshot_id"])
        assert snap.device_count == 0
        assert snap.snapshot_reason == "device_removed"

    def test_add_without_capability_raises_permission_error(self, buyer_entity):
        """User without devices.portfolio.self_modify cannot add devices."""
        from apps.tenant.models import User
        user_no_cap = User.objects.create_user(
            email="nocap@buyer.test", entity=buyer_entity, password="pass",
        )
        from apps.devices.models import Device as D, DeviceType as DT, Manufacturer as M
        dt = DT.objects.create(name="Tablet", code="tablet")
        mfr = M.objects.create(name="TabCo")
        dev = D.objects.create(name="Tab1", device_type=dt, manufacturer=mfr)

        with pytest.raises(PermissionError, match="check_access denied"):
            add_device_to_portfolio(user_no_cap, dev.id)
