"""Tests for vendor integration operations: webhook receiver, operations API, dispatch monitoring."""
import hashlib
import hmac
import json
import time
import uuid
from unittest.mock import patch

import pytest
from django.test import RequestFactory
from django.utils import timezone
from rest_framework.test import APIClient

from apps.integration.commerce_models import (
    SupplierOrderDispatch,
    VendorCommerceProfile,
    VendorCommercePollRun,
    VendorWebhookReceipt,
)
from apps.integration.models import VendorCatalogConnection
from apps.integration.webhook_receiver import (
    WebhookReceiverView,
    encrypt_webhook_secret,
    read_webhook_secret,
)
from apps.integration.commerce_config import GENERIC_COMMERCE_CONFIG
from copy import deepcopy
from apps.tenant.models import (
    Company,
    CompanyEntity,
    CompanyStatus,
    CompanyType,
    EntityStatus,
    User,
)


@pytest.fixture
def ops_vendor(db):
    return Company.objects.create(
        name="Ops Test Vendor",
        company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE,
        slug=f"ops-vendor-{uuid.uuid4().hex[:8]}",
    )


@pytest.fixture
def ops_vendor_entity(ops_vendor):
    return CompanyEntity.objects.create(
        company=ops_vendor, name="Ops Vendor Entity", status=EntityStatus.ACTIVE,
    )


@pytest.fixture
def ops_admin_user(db):
    return User.objects.create_superuser(
        email=f"opsadmin-{uuid.uuid4().hex[:6]}@cixci.test",
        password="adminpass123",
    )


@pytest.fixture
def ops_vendor_user(ops_vendor_entity):
    return User.objects.create_user(
        email=f"opsvendor-{uuid.uuid4().hex[:6]}@test.test",
        entity=ops_vendor_entity,
        password="testpass123",
    )


@pytest.fixture
def ops_connection(ops_vendor, ops_vendor_user):
    from apps.integration.catalog_secrets import encrypt_credentials
    conn = VendorCatalogConnection.objects.create(
        vendor_company=ops_vendor,
        label="Ops Test Connection",
        endpoint_url="https://api.example.com/v1",
        auth_type="bearer",
        auth_header="Authorization",
        encrypted_credentials=encrypt_credentials("bearer", {"token": "test_key_123"}),
        config={"target": "product_catalog", "format": "json"},
        created_by=ops_vendor_user,
        updated_by=ops_vendor_user,
    )
    return conn


@pytest.fixture
def ops_profile(ops_connection, ops_vendor, ops_vendor_user):
    secret = encrypt_webhook_secret(b"test_secret_key")
    profile = VendorCommerceProfile(
        connection=ops_connection,
        vendor_company=ops_vendor,
        adapter="generic_json",
        mode="test",
        order_enabled=True,
        webhook_enabled=True,
        polling_enabled=True,
        encrypted_webhook_secret=secret,
        updated_by=ops_vendor_user,
        config=deepcopy(GENERIC_COMMERCE_CONFIG),
    )
    profile.save()
    return profile


@pytest.fixture
def admin_client(ops_admin_user):
    client = APIClient()
    client.force_authenticate(user=ops_admin_user)
    return client


@pytest.fixture
def vendor_client(ops_vendor_user):
    client = APIClient()
    client.force_authenticate(user=ops_vendor_user)
    return client


# ── Webhook Receiver Tests ──────────────────────────────────────────────


@pytest.mark.django_db
class TestWebhookReceiver:

    def _sign_payload(self, payload_bytes, secret, timestamp=None):
        ts = timestamp or str(int(time.time()))
        message = f'{ts}.'.encode() + payload_bytes
        sig = hmac.new(secret, message, hashlib.sha256).hexdigest()
        return sig, ts

    def test_valid_webhook_accepted(self, ops_profile):
        factory = RequestFactory()
        payload = json.dumps({
            'id': 'evt-001',
            'type': 'order.created',
            'test': False,
            'data': {'order': {'po_number': 'PO-123', 'status': 'accepted'}},
        }).encode()
        secret = read_webhook_secret(ops_profile)
        sig, ts = self._sign_payload(payload, secret)
        request = factory.post(
            f'/api/integration/webhooks/{ops_profile.receiver_id}/',
            data=payload, content_type='application/json',
            HTTP_X_SIGNATURE=sig, HTTP_X_TIMESTAMP=ts,
        )
        view = WebhookReceiverView.as_view()
        response = view(request, receiver_id=ops_profile.receiver_id)
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['status'] == 'accepted'
        assert VendorWebhookReceipt.objects.filter(
            profile=ops_profile, provider_event_id='evt-001',
        ).exists()

    def test_invalid_signature_rejected(self, ops_profile):
        factory = RequestFactory()
        payload = json.dumps({
            'id': 'evt-002', 'type': 'order.created', 'data': {},
        }).encode()
        request = factory.post(
            f'/api/integration/webhooks/{ops_profile.receiver_id}/',
            data=payload, content_type='application/json',
            HTTP_X_SIGNATURE='invalid_signature', HTTP_X_TIMESTAMP=str(int(time.time())),
        )
        view = WebhookReceiverView.as_view()
        response = view(request, receiver_id=ops_profile.receiver_id)
        assert response.status_code == 401

    def test_expired_timestamp_rejected(self, ops_profile):
        factory = RequestFactory()
        payload = json.dumps({
            'id': 'evt-003', 'type': 'order.created', 'data': {},
        }).encode()
        old_ts = str(int(time.time()) - 600)
        secret = read_webhook_secret(ops_profile)
        sig, _ = self._sign_payload(payload, secret, timestamp=old_ts)
        request = factory.post(
            f'/api/integration/webhooks/{ops_profile.receiver_id}/',
            data=payload, content_type='application/json',
            HTTP_X_SIGNATURE=sig, HTTP_X_TIMESTAMP=old_ts,
        )
        view = WebhookReceiverView.as_view()
        response = view(request, receiver_id=ops_profile.receiver_id)
        assert response.status_code == 401

    def test_duplicate_event_deduped(self, ops_profile):
        factory = RequestFactory()
        payload = json.dumps({
            'id': 'evt-dup-001', 'type': 'order.created', 'test': False,
            'data': {'order': {'po_number': 'PO-DUP'}},
        }).encode()
        secret = read_webhook_secret(ops_profile)
        sig1, ts1 = self._sign_payload(payload, secret)
        request1 = factory.post(
            f'/api/integration/webhooks/{ops_profile.receiver_id}/',
            data=payload, content_type='application/json',
            HTTP_X_SIGNATURE=sig1, HTTP_X_TIMESTAMP=ts1,
        )
        view = WebhookReceiverView.as_view()
        resp1 = view(request1, receiver_id=ops_profile.receiver_id)
        assert resp1.status_code == 200

        sig2, ts2 = self._sign_payload(payload, secret)
        request2 = factory.post(
            f'/api/integration/webhooks/{ops_profile.receiver_id}/',
            data=payload, content_type='application/json',
            HTTP_X_SIGNATURE=sig2, HTTP_X_TIMESTAMP=ts2,
        )
        resp2 = view(request2, receiver_id=ops_profile.receiver_id)
        assert resp2.status_code == 200
        data = json.loads(resp2.content)
        assert data['status'] == 'duplicate'

    def test_unknown_receiver_returns_404(self, db):
        factory = RequestFactory()
        payload = json.dumps({'id': 'evt-x', 'type': 'order.created', 'data': {}}).encode()
        request = factory.post(
            f'/api/integration/webhooks/{uuid.uuid4()}/',
            data=payload, content_type='application/json',
        )
        view = WebhookReceiverView.as_view()
        response = view(request, receiver_id=uuid.uuid4())
        assert response.status_code == 404

    def test_unsubscribed_event_ignored(self, ops_profile):
        factory = RequestFactory()
        payload = json.dumps({
            'id': 'evt-unsub-001', 'type': 'invoice.paid', 'data': {},
        }).encode()
        secret = read_webhook_secret(ops_profile)
        sig, ts = self._sign_payload(payload, secret)
        request = factory.post(
            f'/api/integration/webhooks/{ops_profile.receiver_id}/',
            data=payload, content_type='application/json',
            HTTP_X_SIGNATURE=sig, HTTP_X_TIMESTAMP=ts,
        )
        view = WebhookReceiverView.as_view()
        response = view(request, receiver_id=ops_profile.receiver_id)
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['status'] == 'ignored'


# ── Operations API Tests ────────────────────────────────────────────────


@pytest.mark.django_db
class TestOperationsAPI:

    def test_admin_can_list_dispatches(self, admin_client, ops_profile, ops_vendor):
        from apps.routing.models import Order, RoutedSuborder
        order = Order.objects.create(
            buyer_reference=uuid.uuid4(),
            buyer_entity_reference=uuid.uuid4(),
            company_scope_reference=uuid.uuid4(),
        )
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=ops_vendor.id,
        )
        SupplierOrderDispatch.objects.create(
            suborder=suborder, profile=ops_profile, vendor_company=ops_vendor,
            po_number=f"OPS-{uuid.uuid4().hex[:8]}", status='queued', mode='test',
        )
        resp = admin_client.get('/api/v1/integration/operations/dispatches/?include_count=true')
        assert resp.status_code == 200
        assert resp.data['count'] >= 1

    def test_vendor_cannot_list_dispatches(self, vendor_client):
        resp = vendor_client.get('/api/v1/integration/operations/dispatches/')
        assert resp.status_code == 403

    def test_admin_can_list_webhook_receipts(self, admin_client, ops_profile):
        VendorWebhookReceipt.objects.create(
            profile=ops_profile,
            provider_event_id='evt-ops-001',
            event_type='order.created',
            payload_hash='abc123',
            encrypted_payload='encrypted',
            status='processed',
        )
        resp = admin_client.get('/api/v1/integration/operations/webhook-receipts/?include_count=true')
        assert resp.status_code == 200
        assert resp.data['count'] >= 1

    def test_admin_can_list_poll_runs(self, admin_client, ops_profile):
        VendorCommercePollRun.objects.create(
            profile=ops_profile, kind='shipments', status='completed',
            config_version=ops_profile.config_version,
            rows_seen=50, processed_count=45,
        )
        resp = admin_client.get('/api/v1/integration/operations/poll-runs/?include_count=true')
        assert resp.status_code == 200
        assert resp.data['count'] >= 1

    def test_dispatch_filter_by_status(self, admin_client, ops_profile, ops_vendor):
        from apps.routing.models import Order, RoutedSuborder
        order = Order.objects.create(
            buyer_reference=uuid.uuid4(),
            buyer_entity_reference=uuid.uuid4(),
            company_scope_reference=uuid.uuid4(),
        )
        sub1 = RoutedSuborder.objects.create(
            order=order, vendor_company_reference=ops_vendor.id,
        )
        sub2 = RoutedSuborder.objects.create(
            order=order, vendor_company_reference=ops_vendor.id,
        )
        SupplierOrderDispatch.objects.create(
            suborder=sub1, profile=ops_profile, vendor_company=ops_vendor,
            po_number=f"QUEUED-{uuid.uuid4().hex[:8]}", status='queued',
        )
        SupplierOrderDispatch.objects.create(
            suborder=sub2, profile=ops_profile, vendor_company=ops_vendor,
            po_number=f"FAILED-{uuid.uuid4().hex[:8]}", status='failed',
        )
        resp = admin_client.get('/api/v1/integration/operations/dispatches/?status=failed')
        assert resp.status_code == 200
        for item in resp.data['results']:
            assert item['status'] == 'failed'

    def test_webhook_receipt_filter_by_event_type(self, admin_client, ops_profile):
        VendorWebhookReceipt.objects.create(
            profile=ops_profile, provider_event_id='evt-filter-1',
            event_type='order.created', payload_hash='h1',
            encrypted_payload='enc', status='processed',
        )
        VendorWebhookReceipt.objects.create(
            profile=ops_profile, provider_event_id='evt-filter-2',
            event_type='shipment.delivered', payload_hash='h2',
            encrypted_payload='enc', status='processed',
        )
        resp = admin_client.get('/api/v1/integration/operations/webhook-receipts/?event_type=shipment.delivered')
        assert resp.status_code == 200
        for item in resp.data['results']:
            assert item['event_type'] == 'shipment.delivered'


# ── Webhook Secret Encryption Tests ─────────────────────────────────────


@pytest.mark.django_db
class TestWebhookSecretEncryption:

    def test_encrypt_decrypt_roundtrip(self, ops_profile):
        secret_text = b"my_signing_secret_123"
        encrypted = encrypt_webhook_secret(secret_text)
        ops_profile.encrypted_webhook_secret = encrypted
        ops_profile.save()
        ops_profile.refresh_from_db()
        decrypted = read_webhook_secret(ops_profile)
        assert decrypted == secret_text

    def test_invalid_secret_returns_none(self, ops_profile):
        ops_profile.encrypted_webhook_secret = "not_valid_fernet_data"
        ops_profile.save()
        ops_profile.refresh_from_db()
        result = read_webhook_secret(ops_profile)
        assert result is None

    def test_empty_secret_returns_none(self, ops_profile):
        ops_profile.webhook_enabled = False
        ops_profile.encrypted_webhook_secret = ""
        ops_profile.save()
        ops_profile.refresh_from_db()
        result = read_webhook_secret(ops_profile)
        assert result is None
