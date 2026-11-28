"""Balaji shipment events against the documented contract (OpenAPI ``Shipment``):
``tracking`` is an array, there is no delivered date, and ``carrier_status`` is the
last UPS status. Every documented webhook event must be accounted for."""
import json
from datetime import date

import pytest
from django.test import RequestFactory

from apps.integration.commerce_config import BALAJI_COMMERCE_CONFIG
from tests.test_webhook_and_shipment import (
    _make_commerce_profile, _make_company, _make_connection, _make_entity, _make_user, _sign_balaji, _uid,
)

pytestmark = pytest.mark.django_db

# WebhookEvent enum of the provider's published OpenAPI document.
DOCUMENTED_EVENTS = ["order.created", "order.updated", "shipment.created", "shipment.delivered", "invoice.created",
    "invoice.paid", "credit_memo.created", "payment.applied", "return.created", "return.updated",
    "item.stock_changed", "item.eta_changed", "entitlement.changed", "feed_batch.processed"]


@pytest.fixture
def world():
    from apps.fulfillment.models import FulfillmentHandoff
    from apps.integration.commerce_models import SupplierOrderDispatch
    from apps.routing.models import Order, RoutedSuborder
    vendor = _make_company("Balaji Contract")
    user = _make_user(_make_entity(vendor), f"contract-{_uid()}@test.cixci")
    profile = _make_commerce_profile(_make_connection(vendor), vendor, user, webhook_enabled=True)
    buyer = _make_company("Contract Buyer", "buyer")
    order = Order.objects.create(company_scope_reference=buyer.pk, buyer_reference=user.pk,
        buyer_entity_reference=_make_entity(buyer).pk, buyer_order_number_reference="BO-C1", status="placed")
    sub = RoutedSuborder.objects.create(order=order, vendor_company_reference=vendor.pk, status="placed", routing_snapshot={})
    dispatch = SupplierOrderDispatch.objects.create(suborder=sub, profile=profile, vendor_company=vendor,
        po_number=f"CX-CONTRACT-{_uid()}", status="accepted", mode="live", config_snapshot=profile.config,
        config_version=profile.config_version)
    handoff = FulfillmentHandoff.objects.create(routed_suborder_reference=sub.pk, vendor_company_reference=vendor.pk,
        company_scope_reference=buyer.pk, status="received")
    return {"profile": profile, "order": order, "sub": sub, "dispatch": dispatch, "handoff": handoff, "buyer": buyer}


def shipment(world, **changes):
    record = {"shipment_number": "IF1234567", "order_number": "SO51696890123", "po_number": world["dispatch"].po_number,
        "customer_id": 14442724, "status": "Shipped", "ship_date": "2026-09-26", "ship_method": "UPS Ground",
        "tracking": [{"number": "1Z999AA10123456784", "carrier": "ups", "url": "https://www.ups.com/track?tracknum=1Z999AA10123456784"}],
        "carrier_status": "In Transit", "updated_at": "2026-09-26T21:40:03.000000Z"}
    record.update(changes)
    return record


def post(world, event_type, record, event_id=None):
    from apps.integration.webhook_receiver import WebhookReceiverView
    profile = world["profile"]
    body = json.dumps({"id": event_id or f"evt_{_uid()}", "type": event_type, "test": False, "data": {"shipment": record}}).encode()
    request = RequestFactory().post(f"/api/v1/integration/webhooks/{profile.receiver_id}/", data=body,
        content_type="application/json", HTTP_BALAJI_SIGNATURE=_sign_balaji(body, profile))
    return WebhookReceiverView.as_view()(request, receiver_id=profile.receiver_id)


def test_every_documented_event_is_routed_or_deliberately_ignored():
    hook = BALAJI_COMMERCE_CONFIG["webhook"]
    handled = set(hook["events"])
    assert set(hook["event_routes"]) == handled
    # Account-level notices that carry no order or shipment fact for a buyer.
    assert set(DOCUMENTED_EVENTS) - handled == {"entitlement.changed", "feed_batch.processed"}
    assert hook["event_routes"]["shipment.created"] == hook["event_routes"]["shipment.delivered"] == "shipment"


def test_shipment_created_with_documented_tracking_array_reaches_the_buyer(world):
    from apps.fulfillment.models import BuyerUpdateReadySignal, ShipmentTrackingEvent
    assert post(world, "shipment.created", shipment(world)).status_code == 200
    handoff, sub, order = world["handoff"], world["sub"], world["order"]
    handoff.refresh_from_db(); sub.refresh_from_db(); order.refresh_from_db()
    assert (handoff.tracking_number, handoff.shipping_carrier) == ("1Z999AA10123456784", "ups")
    assert (handoff.status, handoff.shipped_date, handoff.tracking_source) == ("shipped", date(2026, 9, 26), "vendor_api")
    assert sub.status == "shipped" and order.status == "shipped"
    signal = BuyerUpdateReadySignal.objects.get(order_reference=order.pk, update_kind="shipment")
    assert signal.status == "eligible" and signal.company_scope_reference == world["buyer"].pk
    event = ShipmentTrackingEvent.objects.get(handoff=handoff)
    assert (event.source, event.status, event.message) == ("vendor_api", "shipped", "In Transit")


def test_shipment_delivered_event_delivers_even_when_status_still_reads_shipped(world):
    from apps.fulfillment.models import BuyerUpdateReadySignal
    post(world, "shipment.created", shipment(world))
    assert post(world, "shipment.delivered", shipment(world, carrier_status="Delivered", updated_at="2026-09-29T15:12:00.000000Z")).status_code == 200
    handoff, sub, order, dispatch = world["handoff"], world["sub"], world["order"], world["dispatch"]
    for row in (handoff, sub, order, dispatch):
        row.refresh_from_db()
    # The provider sends no delivered date; the event's own timestamp is the evidence.
    assert (handoff.status, handoff.delivered_date) == ("delivered", date(2026, 9, 29))
    assert sub.status == "delivered" and order.status == "delivered" and dispatch.status == "delivered"
    assert BuyerUpdateReadySignal.objects.get(order_reference=order.pk, update_kind="delivery").status == "eligible"


def test_polled_shipment_with_delivered_carrier_status_is_delivered(world):
    from apps.integration.webhook_handlers import apply_vendor_shipment
    cfg = world["profile"].config["shipments"]
    outcome = apply_vendor_shipment(shipment(world, carrier_status="Delivered"), world["profile"], cfg)
    world["handoff"].refresh_from_db()
    assert outcome["normalized"] == "delivered" and world["handoff"].status == "delivered"
    # The same row on the next poll changes nothing and adds no duplicate history.
    again = apply_vendor_shipment(shipment(world, carrier_status="Delivered"), world["profile"], cfg)
    assert again["changed"] is False and world["handoff"].tracking_events.count() == 1


def test_event_for_an_order_cixci_did_not_place_is_recorded_as_skipped(world):
    from apps.integration.commerce_models import VendorWebhookReceipt
    assert post(world, "shipment.created", shipment(world, po_number="NOT-OURS", order_number="SO-NOT-OURS"), event_id="evt_foreign").status_code == 200
    receipt = VendorWebhookReceipt.objects.get(provider_event_id="evt_foreign")
    assert (receipt.status, receipt.error_code) == ("skipped", "DISPATCH_NOT_FOUND")
    world["handoff"].refresh_from_db()
    assert world["handoff"].status == "received"


def test_one_vendor_cannot_move_another_vendors_shipment(world):
    other_vendor = _make_company("Other Supplier")
    other_user = _make_user(_make_entity(other_vendor), f"other-{_uid()}@test.cixci")
    other = dict(world, profile=_make_commerce_profile(_make_connection(other_vendor), other_vendor, other_user, webhook_enabled=True))
    assert post(other, "shipment.delivered", shipment(world)).status_code == 200
    world["handoff"].refresh_from_db()
    assert world["handoff"].status == "received"


def test_stored_event_can_be_read_back_for_support(world, settings):
    """The raw event is sealed with the platform key ring, not with a key that is thrown away."""
    from cryptography.fernet import Fernet
    from apps.integration.commerce_models import VendorWebhookReceipt
    from apps.integration.webhook_receiver import decrypt_payload
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]
    assert post(world, "shipment.created", shipment(world), event_id="evt_readable").status_code == 200
    receipt = VendorWebhookReceipt.objects.get(provider_event_id="evt_readable")
    stored = json.loads(decrypt_payload(receipt))
    assert stored["data"]["shipment"]["shipment_number"] == "IF1234567"
    assert "IF1234567" not in receipt.encrypted_payload
