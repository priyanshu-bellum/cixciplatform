"""
Tests for fulfillment shipping flow:
- TrackingSource enum and field
- BuyerShipmentTrackingViewSet (buyer-shipments endpoint)
- dispatch_buyer_signals Celery task
- OrderSerializer suborder_shipments field
- CSV import tracking_source setting
"""
import uuid
import pytest
from datetime import date
from django.utils import timezone
from rest_framework.test import APIClient

from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus
from apps.routing.models import Order, RoutedSuborder, RoutingStatus
from apps.fulfillment.models import (
    FulfillmentHandoff, TrackingSource,
    BuyerUpdateReadySignal, BuyerSignalStatus, BuyerUpdateKind,
)


@pytest.fixture
def shipping_data(db):
    """Minimal tenant + order + handoff graph for shipping tests."""
    buyer = Company.objects.create(
        name="Ship Buyer", company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE, slug="ship-buyer",
    )
    vendor = Company.objects.create(
        name="Ship Vendor", company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE, slug="ship-vendor",
    )
    buyer_entity = CompanyEntity.objects.create(
        company=buyer, name="Ship Buyer HQ", status="active",
    )
    order = Order.objects.create(
        buyer_reference=buyer.id,
        buyer_entity_reference=buyer_entity.id,
        company_scope_reference=buyer.id,
        status=RoutingStatus.PLACED,
    )
    sub = RoutedSuborder.objects.create(
        order=order,
        vendor_company_reference=vendor.id,
        status="placed",
        routing_snapshot={"buyer_order_number": "BO-12345"},
    )
    handoff = FulfillmentHandoff.objects.create(
        routed_suborder_reference=sub.id,
        vendor_company_reference=vendor.id,
        company_scope_reference=buyer.id,
        status="shipped",
        shipping_carrier="FedEx",
        tracking_number="FX123456789",
        shipped_date=date(2026, 11, 10),
        tracking_source=TrackingSource.MANUAL_CSV,
    )
    return {
        "buyer": buyer, "vendor": vendor, "buyer_entity": buyer_entity,
        "order": order, "sub": sub, "handoff": handoff,
    }


@pytest.fixture
def buyer_shipping_user(shipping_data, cap_factory):
    user = User.objects.create_user(
        email="shipbuyer@test.com",
        entity=shipping_data["buyer_entity"],
        password="testpass123",
    )
    for cap_code in [
        "fulfillment.handoff.list", "fulfillment.handoff.read",
        "routing.route.list", "routing.route.read",
    ]:
        cap = cap_factory(cap_code)
        user.capabilities.add(cap)
        user.company.capabilities.add(cap)
    return user


@pytest.fixture
def buyer_shipping_client(buyer_shipping_user):
    client = APIClient()
    client.force_authenticate(user=buyer_shipping_user)
    return client


# ── TrackingSource Model Tests ───────────────────────────────────────────────

@pytest.mark.django_db
class TestTrackingSourceField:
    def test_tracking_source_choices(self):
        assert ("manual_csv", "Manual CSV Upload") in TrackingSource.choices
        assert ("vendor_api", "Vendor API (Webhook/Polling)") in TrackingSource.choices
        assert ("easypost", "EasyPost Carrier Tracking") in TrackingSource.choices

    def test_handoff_tracking_source_saved(self, shipping_data):
        handoff = shipping_data["handoff"]
        assert handoff.tracking_source == "manual_csv"
        handoff.tracking_source = TrackingSource.VENDOR_API
        handoff.save()
        handoff.refresh_from_db()
        assert handoff.tracking_source == "vendor_api"

    def test_handoff_tracking_source_blank_default(self, db):
        buyer = Company.objects.create(
            name="B2", company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE, slug="b2",
        )
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=uuid.uuid4(),
            company_scope_reference=buyer.id,
            status="received",
        )
        assert handoff.tracking_source == ""


# ── BuyerShipmentTrackingViewSet Tests ───────────────────────────────────────

@pytest.mark.django_db
class TestBuyerShipmentTrackingAPI:
    def test_list_returns_buyer_scoped_handoffs(self, buyer_shipping_client, shipping_data):
        resp = buyer_shipping_client.get("/api/v1/fulfillment/buyer-shipments/")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) >= 1
        item = results[0]
        assert item["shipping_carrier"] == "FedEx"
        assert item["tracking_number"] == "FX123456789"
        assert item["tracking_source"] == "manual_csv"
        assert item["tracking_source_label"] == "Manual Upload"

    def test_filter_by_status(self, buyer_shipping_client, shipping_data):
        resp = buyer_shipping_client.get("/api/v1/fulfillment/buyer-shipments/?status=shipped")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert all(r["status"] == "shipped" for r in results)

    def test_filter_by_tracking_source(self, buyer_shipping_client, shipping_data):
        resp = buyer_shipping_client.get("/api/v1/fulfillment/buyer-shipments/?tracking_source=manual_csv")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) >= 1
        assert all(r["tracking_source"] == "manual_csv" for r in results)

    def test_filter_by_shipped_after(self, buyer_shipping_client, shipping_data):
        resp = buyer_shipping_client.get("/api/v1/fulfillment/buyer-shipments/?shipped_after=2026-11-01")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) >= 1

    def test_filter_shipped_before_excludes(self, buyer_shipping_client, shipping_data):
        resp = buyer_shipping_client.get("/api/v1/fulfillment/buyer-shipments/?shipped_before=2026-11-01")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) == 0

    def test_unauthenticated_denied(self, shipping_data):
        client = APIClient()
        resp = client.get("/api/v1/fulfillment/buyer-shipments/")
        assert resp.status_code in (401, 403)

    def test_other_buyer_cannot_see(self, shipping_data, cap_factory):
        other_buyer = Company.objects.create(
            name="Other Buyer", company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE, slug="other-buyer-ship",
        )
        other_entity = CompanyEntity.objects.create(
            company=other_buyer, name="Other HQ", status="active",
        )
        other_user = User.objects.create_user(
            email="other_ship@test.com", entity=other_entity, password="pass123",
        )
        for code in ["fulfillment.handoff.list", "fulfillment.handoff.read"]:
            cap = cap_factory(code)
            other_user.capabilities.add(cap)
            other_user.company.capabilities.add(cap)
        client = APIClient()
        client.force_authenticate(user=other_user)
        resp = client.get("/api/v1/fulfillment/buyer-shipments/")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) == 0

    def test_admin_sees_all(self, admin_client, shipping_data):
        resp = admin_client.get("/api/v1/fulfillment/buyer-shipments/")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert len(results) >= 1

    def test_retrieve_single(self, buyer_shipping_client, shipping_data):
        hid = str(shipping_data["handoff"].id)
        resp = buyer_shipping_client.get(f"/api/v1/fulfillment/buyer-shipments/{hid}/")
        assert resp.status_code == 200
        assert resp.data["id"] == hid


# ── dispatch_buyer_signals Task Tests ────────────────────────────────────────

@pytest.mark.django_db
class TestDispatchBuyerSignals:
    def test_dispatches_eligible_signal(self, shipping_data):
        from apps.fulfillment.tasks import dispatch_buyer_signals
        signal = BuyerUpdateReadySignal.objects.create(
            order_reference=shipping_data["order"].pk,
            buyer_reference=shipping_data["buyer"].id,
            company_scope_reference=shipping_data["buyer"].id,
            update_kind=BuyerUpdateKind.SHIPMENT,
            expected_vendor_count=1,
            confirmed_vendor_count=1,
            all_vendors_confirmed=True,
            status=BuyerSignalStatus.ELIGIBLE,
        )
        dispatch_buyer_signals()
        signal.refresh_from_db()
        assert signal.status == BuyerSignalStatus.DISPATCHED
        assert signal.dispatched_at is not None

    def test_skips_non_eligible(self, shipping_data):
        from apps.fulfillment.tasks import dispatch_buyer_signals
        signal = BuyerUpdateReadySignal.objects.create(
            order_reference=shipping_data["order"].pk,
            buyer_reference=shipping_data["buyer"].id,
            company_scope_reference=shipping_data["buyer"].id,
            update_kind=BuyerUpdateKind.SHIPMENT,
            expected_vendor_count=1,
            confirmed_vendor_count=0,
            all_vendors_confirmed=False,
            status=BuyerSignalStatus.HELD,
        )
        dispatch_buyer_signals()
        signal.refresh_from_db()
        assert signal.status == BuyerSignalStatus.HELD

    def test_marks_failed_on_missing_order(self, shipping_data):
        from apps.fulfillment.tasks import dispatch_buyer_signals
        signal = BuyerUpdateReadySignal.objects.create(
            order_reference=99999999,
            buyer_reference=shipping_data["buyer"].id,
            company_scope_reference=shipping_data["buyer"].id,
            update_kind=BuyerUpdateKind.DELIVERY,
            expected_vendor_count=1,
            confirmed_vendor_count=1,
            all_vendors_confirmed=True,
            status=BuyerSignalStatus.ELIGIBLE,
        )
        dispatch_buyer_signals()
        signal.refresh_from_db()
        assert signal.status == BuyerSignalStatus.FAILED


# ── OrderSerializer suborder_shipments Tests ─────────────────────────────────

@pytest.mark.django_db
class TestOrderSuborderShipments:
    def test_suborder_shipments_in_order_detail(self, buyer_shipping_client, shipping_data):
        oid = shipping_data["order"].pk
        resp = buyer_shipping_client.get(f"/api/v1/routing/orders/{oid}/")
        assert resp.status_code == 200
        shipments = resp.data.get("suborder_shipments", [])
        assert len(shipments) == 1
        s = shipments[0]
        assert s["shipping_carrier"] == "FedEx"
        assert s["tracking_number"] == "FX123456789"
        assert s["tracking_source"] == "manual_csv"
        assert s["fulfillment_status"] == "Shipped"
        assert s["vendor_company_reference"] == str(shipping_data["vendor"].id)

    def test_shipping_info_includes_tracking_source(self, buyer_shipping_client, shipping_data):
        oid = shipping_data["order"].pk
        resp = buyer_shipping_client.get(f"/api/v1/routing/orders/{oid}/")
        assert resp.status_code == 200
        info = resp.data.get("shipping_info", {})
        assert info.get("tracking_source") == "manual_csv"


# ── Carrier Tracking Extension Point Tests ─────────────────────────────────

@pytest.mark.django_db
class TestCarrierTrackingExtension:
    def test_easypost_tracker_id_field_exists(self, shipping_data):
        h = shipping_data["handoff"]
        assert h.easypost_tracker_id == ""
        h.easypost_tracker_id = "trk_abc123"
        h.save()
        h.refresh_from_db()
        assert h.easypost_tracker_id == "trk_abc123"

    def test_tracking_source_transition_manual_to_easypost(self, shipping_data):
        h = shipping_data["handoff"]
        assert h.tracking_source == "manual_csv"
        h.tracking_source = "easypost"
        h.easypost_tracker_id = "trk_xyz456"
        h.save()
        h.refresh_from_db()
        assert h.tracking_source == "easypost"
        assert h.easypost_tracker_id == "trk_xyz456"

    def test_poll_manual_shipments_noop_without_backend(self):
        from apps.fulfillment.carrier_tracking import poll_manual_shipments
        result = poll_manual_shipments()
        assert result["status"] == "skipped"
        assert result["reason"] == "no_carrier_tracker_configured"

    def test_noop_tracker_register_returns_none(self):
        from apps.fulfillment.carrier_tracking import NoOpCarrierTracker
        tracker = NoOpCarrierTracker()
        assert tracker.register("FX123", "FedEx") is None

    def test_carrier_tracking_result_has_tracker_id(self):
        from apps.fulfillment.carrier_tracking import CarrierTrackingResult
        result = CarrierTrackingResult(
            tracking_number="FX123", carrier="FedEx",
            status="delivered", tracker_id="trk_ep_001",
        )
        assert result.tracker_id == "trk_ep_001"
