"""Buyer webhooks: a registered buyer receives its own order updates, signed, retried and isolated."""
import hashlib
import hmac
import json
import uuid
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet
from django.utils import timezone

from apps.audit.models import AuditRecord
from apps.fulfillment.models import BuyerSignalStatus, BuyerUpdateKind, BuyerUpdateReadySignal, FulfillmentHandoff
from apps.integration import buyer_webhooks
from apps.integration.buyer_webhooks import BuyerWebhookDelivery, BuyerWebhookEndpoint
from apps.routing.models import Order, RoutedSuborder, RoutingStatus
from apps.tenant.models import Company, CompanyStatus, CompanyType

pytestmark = pytest.mark.django_db
URL = "/api/v1/integration/buyer-webhooks/"


@pytest.fixture(autouse=True)
def keys(settings):
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]


@pytest.fixture
def no_queue():
    """No worker in tests: deliveries are processed explicitly."""
    with patch.object(buyer_webhooks, "publish") as publish:
        yield publish


def register(admin_client, company, url="https://hooks.buyer.example/cixci"):
    response = admin_client.post(URL, {"company": str(company.pk), "url": url}, format="json")
    assert response.status_code == 201, response.data
    return response.data


def test_only_admins_manage_and_a_buyer_sees_only_its_own_endpoint(admin_client, buyer_client, vendor_client, buyer_company):
    other = Company.objects.create(name="Other Buyer", slug="other-buyer-hooks", company_type=CompanyType.BUYER, status=CompanyStatus.ACTIVE)
    assert buyer_client.post(URL, {"company": str(buyer_company.pk), "url": "https://hooks.buyer.example/x"}, format="json").status_code == 403
    for bad in ("http://hooks.buyer.example/x", "https://10.0.0.5/x", "https://hooks.buyer.example:8443/x", "https://localhost/x"):
        assert admin_client.post(URL, {"company": str(buyer_company.pk), "url": bad}, format="json").status_code == 400, bad

    mine = register(admin_client, buyer_company)
    theirs = register(admin_client, other, "https://hooks.other.example/cixci")
    assert mine["signing_secret"].startswith("whsec_") and mine["signing_secret"] != theirs["signing_secret"]
    # The secret is stored sealed and never listed again.
    assert mine["signing_secret"] not in BuyerWebhookEndpoint.objects.get(pk=mine["id"]).encrypted_secret
    listed = buyer_client.get(URL).data
    assert [row["id"] for row in listed] == [mine["id"]] and "signing_secret" not in listed[0]
    assert vendor_client.get(URL).data == []
    assert buyer_client.get(f"{URL}{theirs['id']}/deliveries/").status_code == 404
    assert buyer_client.post(f"{URL}{mine['id']}/rotate-secret/").status_code == 403
    assert buyer_client.delete(f"{URL}{mine['id']}/").status_code == 403

    # Saving again updates the same endpoint and does not reveal or change the secret.
    again = admin_client.post(URL, {"company": str(buyer_company.pk), "url": "https://hooks.buyer.example/v2"}, format="json")
    assert again.status_code == 200 and "signing_secret" not in again.data and again.data["id"] == mine["id"]
    assert AuditRecord.objects.filter(event_code="integration.buyer_webhook.created").count() == 2
    assert AuditRecord.objects.filter(event_code="integration.buyer_webhook.updated").count() == 1


def test_signed_delivery_can_be_verified_with_the_secret(admin_client, buyer_company, no_queue):
    secret = register(admin_client, buyer_company)["signing_secret"]
    delivery = buyer_webhooks.queue_buyer_event(buyer_company.pk, "order.shipment_complete", {"order_id": "A1"}, source_id="s1")
    # The same source event is queued once.
    assert buyer_webhooks.queue_buyer_event(buyer_company.pk, "order.shipment_complete", {"order_id": "A1"}, source_id="s1").pk == delivery.pk
    assert buyer_webhooks.queue_buyer_event(buyer_company.pk, "order.unknown", {}) is None
    sent = {}

    def fake_send(url, body, headers):
        sent.update(url=url, body=body, headers=headers)
        return 204

    with patch.object(buyer_webhooks, "send", side_effect=fake_send):
        assert buyer_webhooks.process_delivery(delivery.pk) == "delivered"
    timestamp, digest = (part.split("=", 1)[1] for part in sent["headers"]["CIXCI-Signature"].split(","))
    assert digest == hmac.new(secret.encode(), f"{timestamp}.".encode() + sent["body"], hashlib.sha256).hexdigest()
    body = json.loads(sent["body"])
    assert body["type"] == "order.shipment_complete" and body["data"] == {"order_id": "A1"}
    assert sent["url"] == "https://hooks.buyer.example/cixci"
    delivery.refresh_from_db()
    assert delivery.status == "delivered" and delivery.last_response_code == 204
    # A delivered event is not sent twice.
    with patch.object(buyer_webhooks, "send") as resend:
        assert buyer_webhooks.process_delivery(delivery.pk) == "delivered" and not resend.called


def test_server_errors_are_retried_and_client_errors_are_not(admin_client, buyer_company, no_queue, django_capture_on_commit_callbacks):
    register(admin_client, buyer_company)
    retried = buyer_webhooks.queue_buyer_event(buyer_company.pk, "order.delivery_complete", {}, source_id="r")
    with patch.object(buyer_webhooks, "send", return_value=503), django_capture_on_commit_callbacks(execute=True):
        assert buyer_webhooks.process_delivery(retried.pk) == "retrying"
    retried.refresh_from_db()
    assert retried.next_retry_at > timezone.now() and retried.attempt_count == 1
    # Not due yet: nothing is sent.
    with patch.object(buyer_webhooks, "send") as early:
        buyer_webhooks.process_delivery(retried.pk)
        assert not early.called
    BuyerWebhookDelivery.objects.filter(pk=retried.pk).update(next_retry_at=timezone.now(), attempt_count=buyer_webhooks.MAX_ATTEMPTS - 1)
    assert buyer_webhooks.retry_due() == 1
    with patch.object(buyer_webhooks, "send", side_effect=OSError("down")):
        assert buyer_webhooks.process_delivery(retried.pk) == "failed"

    rejected = buyer_webhooks.queue_buyer_event(buyer_company.pk, "order.delivery_complete", {}, source_id="c")
    with patch.object(buyer_webhooks, "send", return_value=400):
        assert buyer_webhooks.process_delivery(rejected.pk) == "failed"
    assert AuditRecord.objects.filter(event_code="integration.buyer_webhook.delivery_failed", status="failure").count() == 2


def test_inactive_endpoint_and_other_companies_receive_nothing(admin_client, buyer_company, no_queue):
    other = Company.objects.create(name="Quiet Buyer", slug="quiet-buyer-hooks", company_type=CompanyType.BUYER, status=CompanyStatus.ACTIVE)
    endpoint = register(admin_client, buyer_company)
    assert buyer_webhooks.queue_buyer_event(other.pk, "order.shipment_complete", {}) is None
    admin_client.post(URL, {"company": str(buyer_company.pk), "url": endpoint["url"], "is_active": False}, format="json")
    assert buyer_webhooks.queue_buyer_event(buyer_company.pk, "order.shipment_complete", {}) is None
    assert not BuyerWebhookDelivery.objects.exists()


def test_test_button_reports_what_the_buyer_server_answered(admin_client, buyer_company, no_queue):
    endpoint = register(admin_client, buyer_company)
    with patch.object(buyer_webhooks, "send", return_value=200):
        response = admin_client.post(f"{URL}{endpoint['id']}/test/")
    assert response.status_code == 200 and response.data["status"] == "delivered" and response.data["event_type"] == "webhook.test"
    assert len(admin_client.get(f"{URL}{endpoint['id']}/deliveries/").data) == 1
    assert admin_client.delete(f"{URL}{endpoint['id']}/").status_code == 204
    assert not BuyerWebhookEndpoint.objects.exists() and not BuyerWebhookDelivery.objects.exists()


def test_shipment_signal_reaches_the_buyer_webhook(admin_client, buyer_company, vendor_company, no_queue,
        django_capture_on_commit_callbacks):
    """End to end: the signal that already notifies the buyer in-app is also pushed to its webhook."""
    from apps.fulfillment.tasks import dispatch_buyer_signals
    register(admin_client, buyer_company)
    order = Order.objects.create(company_scope_reference=buyer_company.pk, buyer_reference=uuid.uuid4(),
        buyer_entity_reference=uuid.uuid4(), status=RoutingStatus.SHIPPED)
    sub = RoutedSuborder.objects.create(order=order, vendor_company_reference=vendor_company.pk, status=RoutingStatus.SHIPPED)
    FulfillmentHandoff.objects.create(routed_suborder_reference=sub.pk, vendor_company_reference=vendor_company.pk,
        company_scope_reference=buyer_company.pk, status="shipped", shipping_carrier="UPS", tracking_number="1Z999")
    signal = BuyerUpdateReadySignal.objects.create(order_reference=order.pk, update_kind=BuyerUpdateKind.SHIPMENT,
        buyer_reference=order.buyer_reference, company_scope_reference=buyer_company.pk, status=BuyerSignalStatus.ELIGIBLE,
        expected_vendor_count=1, confirmed_vendor_count=1, all_vendors_confirmed=True)
    with django_capture_on_commit_callbacks(execute=True):
        dispatch_buyer_signals()
        dispatch_buyer_signals()
    signal.refresh_from_db()
    assert signal.status == BuyerSignalStatus.DISPATCHED
    delivery = BuyerWebhookDelivery.objects.get()
    assert delivery.event_type == "order.shipment_complete" and delivery.company_id == buyer_company.pk
    assert delivery.payload["data"]["shipments"][0]["tracking_number"] == "1Z999"
    assert no_queue.call_count == 1
