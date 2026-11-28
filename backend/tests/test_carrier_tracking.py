"""EasyPost carrier tracking: admin configuration, tracker lifecycle, signed webhooks,
shipment/order/buyer progress, tenant scope, and the Balaji shipment contract."""
import hashlib
import hmac
import json
import uuid
from copy import deepcopy
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet
from django.utils import timezone

from apps.fulfillment import easypost, tracking
from apps.fulfillment.models import (
    BuyerUpdateReadySignal, CarrierTrackingConfig, CarrierWebhookReceipt, FulfillmentHandoff, ShipmentTracker,
    ShipmentTrackingEvent,
)
from apps.routing.models import Order, RoutedSuborder

pytestmark = pytest.mark.django_db

CONFIG_URL = "/api/v1/fulfillment/carrier-tracking/"
SECRET = "whsec-test-é"


@pytest.fixture(autouse=True)
def key_ring(settings):
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]


@pytest.fixture
def config():
    return CarrierTrackingConfig.objects.create(provider="easypost", enabled=True, mode="test",
        encrypted_api_key=tracking.seal("EZTK_test_key"), encrypted_webhook_secret=tracking.seal(SECRET))


@pytest.fixture
def shipment(buyer_company, buyer_entity, buyer_user, vendor_company):
    order = Order.objects.create(company_scope_reference=buyer_company.pk, buyer_reference=buyer_user.pk,
        buyer_entity_reference=buyer_entity.pk, buyer_order_number_reference="BO-TRACK", status="placed")
    sub = RoutedSuborder.objects.create(order=order, vendor_company_reference=vendor_company.pk, status="placed", routing_snapshot={})
    handoff = FulfillmentHandoff.objects.create(routed_suborder_reference=sub.pk, vendor_company_reference=vendor_company.pk,
        company_scope_reference=buyer_company.pk, status="shipped", tracking_source="manual_csv",
        shipping_carrier="UPS", tracking_number="1Z999AA10123456784", shipped_date=date(2026, 11, 20))
    return order, sub, handoff


def tracker_payload(status="in_transit", code="1Z999AA10123456784", tracker_id="trk_abc", updated="2026-11-22T10:00:00Z", details=None):
    return {"id": tracker_id, "object": "Tracker", "mode": "test", "tracking_code": code, "status": status,
        "status_detail": "arrived_at_facility", "carrier": "UPS", "est_delivery_date": "2026-11-24T00:00:00Z",
        "public_url": "https://track.easypost.com/abc", "signed_by": "J DOE" if status == "delivered" else None,
        "updated_at": updated,
        "tracking_details": details if details is not None else [
            {"message": "Departed", "status": "in_transit", "status_detail": "departed_facility", "datetime": "2026-11-21T08:00:00Z",
             "tracking_location": {"city": "Louisville", "state": "KY", "country": "US"}}]}


def delivered_payload(**kwargs):
    return tracker_payload(status="delivered", updated="2026-11-23T15:00:00Z", details=[
        {"message": "Departed", "status": "in_transit", "status_detail": "departed_facility", "datetime": "2026-11-21T08:00:00Z"},
        {"message": "Delivered", "status": "delivered", "status_detail": "arrived_at_destination", "datetime": "2026-11-23T14:30:00Z",
         "tracking_location": {"city": "Austin", "state": "TX", "country": "US"}}], **kwargs)


def signed(client, cfg, payload, secret=SECRET, signature=None):
    import unicodedata
    body = json.dumps(payload).encode()
    digest = hmac.new(unicodedata.normalize("NFKD", secret).encode("utf8"), body, hashlib.sha256).hexdigest()
    return client.post(f"/api/v1/fulfillment/carrier-webhooks/easypost/{cfg.receiver_id}/", data=body, content_type="application/json",
        HTTP_X_HMAC_SIGNATURE=signature if signature is not None else "hmac-sha256-hex=" + digest)


def event(result, event_id="evt_1", description="tracker.updated", mode="test"):
    return {"id": event_id, "object": "Event", "mode": mode, "description": description, "result": result}


# ─── Admin configuration ──────────────────────────────────────────────────────

def test_only_cixci_admins_reach_carrier_tracking_settings(buyer_client, vendor_client, api_client):
    assert api_client.get(CONFIG_URL).status_code in (401, 403)
    for client in (buyer_client, vendor_client):
        assert client.get(CONFIG_URL).status_code == 403
        assert client.patch(CONFIG_URL + "config/", {"enabled": True}, format="json").status_code == 403
        assert client.post(CONFIG_URL + "sync/").status_code == 403


def test_api_key_is_write_only_encrypted_and_required_before_enabling(admin_client):
    response = admin_client.patch(CONFIG_URL + "config/", {"enabled": True}, format="json")
    assert response.status_code == 400
    response = admin_client.patch(CONFIG_URL + "config/", {"api_key": "EZTK_secret_value_9876", "enabled": True, "mode": "test"}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["has_api_key"] is True and response.data["api_key_hint"] == "…9876"
    assert "EZTK_secret_value_9876" not in json.dumps(response.data, default=str)
    stored = CarrierTrackingConfig.objects.get()
    assert "EZTK_secret_value_9876" not in stored.encrypted_api_key
    assert tracking.unseal(stored.encrypted_api_key) == "EZTK_secret_value_9876"
    from apps.audit.models import AuditRecord
    record = AuditRecord.objects.get(event_code="fulfillment.carrier_tracking.configured")
    assert "EZTK_secret_value_9876" not in record.event_description


def test_connection_test_records_result_without_exposing_the_key(admin_client, config):
    with patch("apps.fulfillment.easypost._request", return_value={"trackers": []}) as call:
        response = admin_client.post(CONFIG_URL + "test/")
    assert response.status_code == 200 and response.data["ok"] is True
    assert call.call_args.args[0] == "EZTK_test_key"
    assert CarrierTrackingConfig.objects.get().last_verified_at is not None
    with patch("apps.fulfillment.easypost._request", side_effect=easypost.EasyPostError("AUTHENTICATION_FAILED", status=401)):
        response = admin_client.post(CONFIG_URL + "test/")
    assert response.status_code == 400 and response.data["code"] == "AUTHENTICATION_FAILED"
    assert CarrierTrackingConfig.objects.get().last_error == "AUTHENTICATION_FAILED"


def test_webhook_secret_is_shown_once_and_registration_uses_public_https(admin_client, config):
    response = admin_client.post(CONFIG_URL + "generate-webhook-secret/")
    secret = response.data["webhook_secret"]
    assert response.status_code == 200 and len(secret) >= 32
    assert tracking.unseal(CarrierTrackingConfig.objects.get().encrypted_webhook_secret) == secret
    assert "webhook_secret" not in admin_client.get(CONFIG_URL).data
    assert admin_client.post(CONFIG_URL + "register-webhook/", {"origin": "http://localhost:8000"}, format="json").status_code == 400
    with patch("apps.fulfillment.easypost._request", return_value={"id": "hook_123"}) as call:
        response = admin_client.post(CONFIG_URL + "register-webhook/", {"origin": "https://app.cixci.example"}, format="json")
    assert response.status_code == 200, response.data
    body = call.call_args.kwargs["body"]["webhook"]
    assert body["url"] == f"https://app.cixci.example/api/v1/fulfillment/carrier-webhooks/easypost/{config.receiver_id}/"
    stored = CarrierTrackingConfig.objects.get()
    assert stored.provider_webhook_id == "hook_123" and tracking.unseal(stored.encrypted_webhook_secret) == body["webhook_secret"]


# ─── Provider client ──────────────────────────────────────────────────────────

def test_signature_matches_the_official_client_algorithm():
    body = b'{"id":"evt_1"}'
    good = "hmac-sha256-hex=" + hmac.new("secret".encode(), body, hashlib.sha256).hexdigest()
    assert easypost.valid_signature(body, good, "secret")
    assert not easypost.valid_signature(body + b" ", good, "secret")
    assert not easypost.valid_signature(body, good.split("=", 1)[1], "secret")
    assert not easypost.valid_signature(body, good, "other") and not easypost.valid_signature(body, "", "secret")


def test_requests_use_basic_auth_with_the_key_as_username():
    class Response:
        status = 200
        def read(self, size): return b'{"id":"trk_1"}'
        def getheader(self, name, default=None): return default
    class Connection:
        def __init__(self, host, address): self.seen = None
        def request(self, method, path, body=None, headers=None): Connection.seen = (method, path, body, headers)
        def getresponse(self): return Response()
        def close(self): pass
    with patch("apps.fulfillment.easypost.public_target", return_value=("api.easypost.com", "/v2", ["1.1.1.1"])), \
            patch("apps.fulfillment.easypost.PinnedHTTPSConnection", Connection):
        easypost.create_tracker("EZTK_key", "1Z999", "UPS")
    method, path, body, headers = Connection.seen
    import base64
    assert (method, path) == ("POST", "/v2/trackers")
    assert json.loads(body) == {"tracker": {"tracking_code": "1Z999", "carrier": "UPS"}}
    assert headers["Authorization"] == "Basic " + base64.b64encode(b"EZTK_key:").decode()


# ─── Tracker lifecycle ────────────────────────────────────────────────────────

def test_disabled_provider_never_creates_or_calls_anything(shipment):
    _, _, handoff = shipment
    assert tracking.ensure_tracker(handoff) is None
    with patch("apps.fulfillment.easypost._request") as call:
        assert tracking.sync_due_trackers() == {"status": "skipped", "reason": "no_carrier_tracker_configured"}
    call.assert_not_called()


def test_shipment_is_registered_then_follows_the_carrier_to_delivery(config, shipment, django_capture_on_commit_callbacks):
    order, sub, handoff = shipment
    with patch("apps.fulfillment.tracking.publish_sync"), django_capture_on_commit_callbacks(execute=True):
        tracker = tracking.ensure_tracker(handoff)
    assert tracker.state == "pending" and tracking.ensure_tracker(handoff).pk == tracker.pk
    with patch("apps.fulfillment.tracking.create_tracker", return_value=tracker_payload()) as create:
        assert tracking.sync_due_trackers()["updated"] == 1
    assert create.call_args.args == ("EZTK_test_key", "1Z999AA10123456784", "UPS")
    tracker.refresh_from_db(); handoff.refresh_from_db()
    assert (tracker.state, tracker.status, tracker.provider_tracker_id) == ("registered", "in_transit", "trk_abc")
    assert handoff.tracking_source == "easypost" and handoff.easypost_tracker_id == "trk_abc" and handoff.status == "shipped"
    assert ShipmentTrackingEvent.objects.filter(handoff=handoff, source="easypost").count() == 1
    # Not due again until the poll interval passes: no second provider call.
    with patch("apps.fulfillment.tracking.retrieve_tracker") as retrieve:
        assert tracking.sync_due_trackers()["checked"] == 0
    retrieve.assert_not_called()
    ShipmentTracker.objects.filter(pk=tracker.pk).update(next_poll_at=timezone.now() - timedelta(minutes=1))
    with patch("apps.fulfillment.tracking.retrieve_tracker", return_value=delivered_payload()):
        tracking.sync_due_trackers()
    tracker.refresh_from_db(); handoff.refresh_from_db(); sub.refresh_from_db(); order.refresh_from_db()
    assert (tracker.state, tracker.next_poll_at, tracker.signed_by) == ("stopped", None, "J DOE")
    assert (handoff.status, handoff.delivered_date) == ("delivered", date(2026, 11, 23))
    assert sub.status == "delivered" and order.status == "delivered"
    signal = BuyerUpdateReadySignal.objects.get(order_reference=order.pk, update_kind="delivery")
    assert signal.status == "eligible" and signal.company_scope_reference == order.company_scope_reference


def test_unknown_vendor_carrier_falls_back_to_provider_detection(config, shipment):
    _, _, handoff = shipment
    handoff.shipping_carrier = "Speedy Local Courier"; handoff.save()
    tracking.ensure_tracker(handoff)
    with patch("apps.fulfillment.tracking.create_tracker", return_value=tracker_payload()) as create:
        tracking.sync_due_trackers()
    assert create.call_args.args == ("EZTK_test_key", "1Z999AA10123456784", None)
    # A mapped carrier the provider rejects is retried once without a carrier.
    ShipmentTracker.objects.all().delete()
    handoff.shipping_carrier = "FedEx"; handoff.save()
    tracking.ensure_tracker(handoff)
    with patch("apps.fulfillment.tracking.create_tracker", side_effect=[easypost.EasyPostError("TRACKER.CREATE.ERROR", status=422), tracker_payload()]) as create:
        assert tracking.sync_due_trackers()["updated"] == 1
    assert [call.args[2:] for call in create.call_args_list] == [("FedEx",), ()]


def test_failures_back_off_and_a_rejected_number_needs_correction(config, shipment):
    _, _, handoff = shipment
    tracker = tracking.ensure_tracker(handoff)
    with patch("apps.fulfillment.tracking.create_tracker", side_effect=easypost.EasyPostError("PROVIDER_UNAVAILABLE", status=503)):
        assert tracking.sync_due_trackers()["failed"] == 1
    tracker.refresh_from_db()
    assert tracker.state == "pending" and tracker.attempt_count == 1 and tracker.next_poll_at > timezone.now()
    handoff.shipping_carrier = ""; handoff.save()
    ShipmentTracker.objects.filter(pk=tracker.pk).update(next_poll_at=timezone.now(), carrier="")
    with patch("apps.fulfillment.tracking.create_tracker", side_effect=easypost.EasyPostError("TRACKER.CREATE.ERROR", status=422)):
        tracking.sync_due_trackers()
    tracker.refresh_from_db()
    assert tracker.state == "failed" and tracker.last_error == "TRACKER.CREATE.ERROR"
    # The vendor uploads the corrected number: tracking restarts for it.
    handoff.tracking_number = "1Z000CORRECTED"; handoff.save()
    assert tracking.ensure_tracker(handoff).pk == tracker.pk
    tracker.refresh_from_db()
    assert (tracker.state, tracker.tracking_code, tracker.attempt_count) == ("pending", "1Z000CORRECTED", 0)


def test_vendor_api_shipments_are_tracked_only_when_the_admin_opts_in(config, shipment):
    _, _, handoff = shipment
    handoff.tracking_source = "vendor_api"; handoff.save()
    assert tracking.ensure_tracker(handoff) is None
    config.track_vendor_api_shipments = True; config.save()
    assert tracking.ensure_tracker(handoff) is not None


def test_delivered_is_never_reversed_and_stale_updates_are_ignored(config, shipment):
    _, _, handoff = shipment
    tracker = tracking.ensure_tracker(handoff)
    tracking.apply_tracker_payload(tracker.pk, delivered_payload(), config)
    assert tracking.apply_tracker_payload(tracker.pk, tracker_payload(status="in_transit", updated="2026-11-22T10:00:00Z"), config) is False
    tracking.apply_tracker_payload(tracker.pk, tracker_payload(status="failure", updated="2026-11-25T10:00:00Z", details=[]), config)
    handoff.refresh_from_db(); tracker.refresh_from_db()
    assert handoff.status == "delivered" and tracker.status == "failure"


def test_carrier_problem_marks_an_undelivered_shipment_and_can_recover(config, shipment):
    _, sub, handoff = shipment
    tracker = tracking.ensure_tracker(handoff)
    tracking.apply_tracker_payload(tracker.pk, tracker_payload(status="return_to_sender", details=[]), config)
    handoff.refresh_from_db()
    assert handoff.status == "delivery_exception"
    tracking.apply_tracker_payload(tracker.pk, delivered_payload(), config)
    handoff.refresh_from_db()
    assert handoff.status == "delivered"


# ─── Provider webhook ─────────────────────────────────────────────────────────

def test_signed_webhook_updates_the_shipment_once(client, config, shipment):
    order, _, handoff = shipment
    tracker = tracking.ensure_tracker(handoff)
    ShipmentTracker.objects.filter(pk=tracker.pk).update(provider_tracker_id="trk_abc", state="registered")
    response = signed(client, config, event(delivered_payload()))
    assert response.status_code == 200 and response.json()["status"] == "processed"
    handoff.refresh_from_db()
    assert handoff.status == "delivered" and handoff.delivered_date == date(2026, 11, 23)
    assert signed(client, config, event(delivered_payload())).json()["status"] == "duplicate"
    assert CarrierWebhookReceipt.objects.count() == 1
    assert ShipmentTrackingEvent.objects.filter(handoff=handoff).count() == 2


def test_webhook_rejects_bad_signatures_and_unknown_receivers(client, config, shipment):
    _, _, handoff = shipment
    payload = event(delivered_payload())
    assert signed(client, config, payload, secret="wrong").status_code == 401
    assert signed(client, config, payload, signature="").status_code == 401
    other = deepcopy(config); other.receiver_id = uuid.uuid4()
    assert signed(client, other, payload).status_code == 404
    config.enabled = False; config.save()
    assert signed(client, config, payload).status_code == 404
    handoff.refresh_from_db()
    assert handoff.status == "shipped" and not CarrierWebhookReceipt.objects.exists()


def test_webhook_ignores_other_modes_other_events_and_unknown_trackers(client, config, shipment):
    _, _, handoff = shipment
    tracker = tracking.ensure_tracker(handoff)
    ShipmentTracker.objects.filter(pk=tracker.pk).update(provider_tracker_id="trk_abc", state="registered")
    assert signed(client, config, event(delivered_payload(), event_id="evt_live", mode="production")).json()["status"] == "skipped"
    assert signed(client, config, event({"id": "batch_1"}, event_id="evt_batch", description="batch.updated")).json()["status"] == "skipped"
    assert signed(client, config, event(delivered_payload(tracker_id="trk_other", code="OTHER"), event_id="evt_other")).json()["status"] == "skipped"
    handoff.refresh_from_db()
    assert handoff.status == "shipped"
    assert set(CarrierWebhookReceipt.objects.values_list("error_code", flat=True)) == {"MODE_MISMATCH", "UNSUBSCRIBED_EVENT", "TRACKER_NOT_FOUND"}


def test_webhook_before_registration_completes_is_matched_by_tracking_code(client, config, shipment):
    _, _, handoff = shipment
    tracking.ensure_tracker(handoff)
    assert signed(client, config, event(tracker_payload(), description="tracker.created")).json()["status"] == "processed"
    assert ShipmentTracker.objects.get().provider_tracker_id == "trk_abc"


# ─── What buyers, vendors and other tenants see ───────────────────────────────

def test_buyer_sees_carrier_status_and_history_for_own_shipments_only(buyer_client, vendor_client, config, shipment, vendor_company):
    _, _, handoff = shipment
    tracker = tracking.ensure_tracker(handoff)
    tracking.apply_tracker_payload(tracker.pk, tracker_payload(), config)
    listing = buyer_client.get("/api/v1/fulfillment/buyer-shipments/")
    assert listing.status_code == 200, listing.data
    rows = listing.data["results"] if isinstance(listing.data, dict) else listing.data
    row = next(item for item in rows if item["id"] == str(handoff.pk))
    assert row["tracking"]["status"] == "in_transit" and row["tracking"]["status_label"] == "In transit"
    assert row["tracking"]["tracking_url"] == "https://track.easypost.com/abc" and row["tracking_events"] is None
    detail = buyer_client.get(f"/api/v1/fulfillment/buyer-shipments/{handoff.pk}/")
    assert detail.data["tracking_events"][0]["location"] == "Louisville, KY, US"
    # Another buyer company cannot read it.
    from apps.tenant.models import Company
    FulfillmentHandoff.objects.filter(pk=handoff.pk).update(company_scope_reference=Company.objects.create(
        name="Other Buyer", slug="other-buyer-track", company_type="buyer", status="active").pk)
    assert buyer_client.get(f"/api/v1/fulfillment/buyer-shipments/{handoff.pk}/").status_code == 404


def test_buyer_signals_are_scoped_to_the_buyer_company(buyer_client, vendor_client, admin_client, buyer_company, cap_factory, buyer_user, vendor_user):
    for user in (buyer_user, vendor_user):
        user.capabilities.add(cap_factory("fulfillment.buyer_signal.list"))
    mine = BuyerUpdateReadySignal.objects.create(order_reference=uuid.uuid4(), buyer_reference=uuid.uuid4(),
        company_scope_reference=buyer_company.pk, update_kind="shipment")
    BuyerUpdateReadySignal.objects.create(order_reference=uuid.uuid4(), buyer_reference=uuid.uuid4(),
        company_scope_reference=uuid.uuid4(), update_kind="shipment")
    ids = lambda response: {row["id"] for row in (response.data["results"] if isinstance(response.data, dict) else response.data)}
    assert ids(buyer_client.get("/api/v1/fulfillment/buyer-signals/")) == {str(mine.pk)}
    vendor = vendor_client.get("/api/v1/fulfillment/buyer-signals/")
    assert vendor.status_code == 403 or ids(vendor) == set()
    assert len(ids(admin_client.get("/api/v1/fulfillment/buyer-signals/"))) == 2


def test_buyer_notification_is_addressed_to_the_buyer_company(shipment, buyer_company):
    order, _, handoff = shipment
    tracking.apply_progress(handoff.pk, source="easypost", phase="delivered", delivered_on=date(2026, 11, 23))
    from apps.fulfillment.tasks import dispatch_buyer_signals
    from apps.notification.models import NotificationRequest
    dispatch_buyer_signals()
    requests = NotificationRequest.objects.filter(event_type__startswith="buyer.order.")
    assert requests.exists() and set(requests.values_list("company_scope_reference", flat=True)) == {buyer_company.pk}
    assert not BuyerUpdateReadySignal.objects.filter(order_reference=order.pk, status="eligible").exists()
    # A later scan does not notify the buyer a second time.
    tracking.sync_order_progress(FulfillmentHandoff.objects.get(pk=handoff.pk))
    assert not BuyerUpdateReadySignal.objects.filter(order_reference=order.pk, status="eligible").exists()
