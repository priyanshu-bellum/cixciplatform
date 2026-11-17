"""Tests for outbound vendor webhook dispatch — tenant isolation, HMAC, retries."""
import hashlib
import hmac
import json
import time
import uuid
from copy import deepcopy
from unittest.mock import patch, MagicMock

import pytest
from cryptography.fernet import Fernet
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify

from apps.integration.commerce_config import GENERIC_COMMERCE_CONFIG


_counter = 0


def _uid():
    global _counter
    _counter += 1
    return _counter


def _make_company(name, company_type='vendor'):
    from apps.tenant.models import Company
    slug = slugify(name) + f'-{_uid()}'
    return Company.objects.create(name=name, company_type=company_type, status='active', slug=slug)


def _make_entity(company, name='Main'):
    from apps.tenant.models import CompanyEntity
    return CompanyEntity.objects.create(company=company, name=name, status='active')


def _make_user(entity, email):
    from apps.tenant.models import User
    return User.objects.create_user(email=email, entity=entity, password='testpass123')


def _make_connection(vendor_company, endpoint='https://vendor-api.example.com/api/v1/catalog'):
    from apps.integration.models import VendorCatalogConnection
    from apps.integration.catalog_secrets import encrypt_credentials
    creds = encrypt_credentials('bearer', {'token': 'test_token_123'})
    return VendorCatalogConnection.objects.create(
        vendor_company=vendor_company,
        label=f'{vendor_company.name} Catalog',
        endpoint_url=endpoint,
        auth_type='bearer',
        encrypted_credentials=creds,
    )


def _make_outbound_profile(connection, vendor_company, user, outbound_url='https://vendor-api.example.com/webhooks/cixci',
                            outbound_events=None):
    from apps.integration.commerce_models import VendorCommerceProfile
    config = deepcopy(GENERIC_COMMERCE_CONFIG)
    config['order']['idempotency_verified'] = True
    config['ship_to'] = {'mode': 'address_id', 'address_id': 1, 'store_id': ''}

    fernet_key = Fernet.generate_key()
    f = Fernet(fernet_key)
    secret = b'outbound_test_secret'
    encrypted_secret = fernet_key.decode() + '|' + f.encrypt(secret).decode()

    if outbound_events is None:
        outbound_events = ['order.routed', 'order.dispatched', 'order.status_changed',
                           'shipment.updated', 'shipment.delivered']

    return VendorCommerceProfile.objects.create(
        connection=connection,
        vendor_company=vendor_company,
        adapter='generic_json',
        mode='live',
        order_enabled=True,
        webhook_enabled=False,
        polling_enabled=False,
        outbound_enabled=True,
        outbound_url=outbound_url,
        outbound_events=outbound_events,
        config=config,
        updated_by=user,
        encrypted_webhook_secret=encrypted_secret,
    )


@pytest.fixture(autouse=True, scope='session')
def _encryption_keys():
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]


@pytest.mark.django_db(transaction=True)
class TestOutboundWebhookQueueing:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor_a = _make_company('Vendor A Outbound')
        self.vendor_b = _make_company('Vendor B Outbound')
        self.entity_a = _make_entity(self.vendor_a)
        self.entity_b = _make_entity(self.vendor_b)
        self.user_a = _make_user(self.entity_a, f'outbound-a-{_uid()}@test.cixci')
        self.user_b = _make_user(self.entity_b, f'outbound-b-{_uid()}@test.cixci')
        self.conn_a = _make_connection(self.vendor_a)
        self.conn_b = _make_connection(self.vendor_b)
        self.profile_a = _make_outbound_profile(self.conn_a, self.vendor_a, self.user_a)
        self.profile_b = _make_outbound_profile(self.conn_b, self.vendor_b, self.user_b)

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_queue_event_only_for_matching_vendor(self, mock_publish):
        from apps.integration.webhook_dispatch import queue_outbound_event
        deliveries = queue_outbound_event(
            self.vendor_a.pk, 'order.routed',
            {'po_number': 'CX-001'}, source_id='test-1')

        assert len(deliveries) == 1
        d = deliveries[0]
        assert d.vendor_company_id == self.vendor_a.pk
        assert d.profile_id == self.profile_a.pk
        assert d.event_type == 'order.routed'
        assert d.payload['data']['po_number'] == 'CX-001'
        mock_publish.assert_called_once_with(d.pk)

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_vendor_b_does_not_get_vendor_a_events(self, mock_publish):
        """Tenant isolation: vendor B must never receive vendor A's events."""
        from apps.integration.webhook_dispatch import queue_outbound_event
        from apps.integration.commerce_models import VendorOutboundDelivery

        queue_outbound_event(
            self.vendor_a.pk, 'order.dispatched',
            {'po_number': 'CX-002'}, source_id='test-2')

        vendor_b_deliveries = VendorOutboundDelivery.objects.filter(
            vendor_company=self.vendor_b)
        assert vendor_b_deliveries.count() == 0

        vendor_a_deliveries = VendorOutboundDelivery.objects.filter(
            vendor_company=self.vendor_a, event_type='order.dispatched')
        assert vendor_a_deliveries.count() == 1

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_unsubscribed_event_not_queued(self, mock_publish):
        from apps.integration.webhook_dispatch import queue_outbound_event
        from apps.integration.commerce_models import VendorOutboundDelivery

        self.profile_a.outbound_events = ['order.routed']
        self.profile_a.save()

        deliveries = queue_outbound_event(
            self.vendor_a.pk, 'shipment.delivered',
            {'tracking': '1Z999'}, source_id='test-3')

        assert len(deliveries) == 0
        assert not VendorOutboundDelivery.objects.filter(
            profile=self.profile_a, event_type='shipment.delivered').exists()

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_idempotency_prevents_duplicates(self, mock_publish):
        from apps.integration.webhook_dispatch import queue_outbound_event

        d1 = queue_outbound_event(
            self.vendor_a.pk, 'order.routed',
            {'po': '1'}, source_id='dup-key-1')
        d2 = queue_outbound_event(
            self.vendor_a.pk, 'order.routed',
            {'po': '1'}, source_id='dup-key-1')

        assert len(d1) == 1
        assert len(d2) == 0

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_invalid_event_type_ignored(self, mock_publish):
        from apps.integration.webhook_dispatch import queue_outbound_event

        deliveries = queue_outbound_event(
            self.vendor_a.pk, 'nonexistent.event',
            {'data': 'x'}, source_id='test-inv')
        assert len(deliveries) == 0
        mock_publish.assert_not_called()

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_disabled_profile_skipped(self, mock_publish):
        from apps.integration.webhook_dispatch import queue_outbound_event

        self.profile_a.outbound_enabled = False
        self.profile_a.save()

        deliveries = queue_outbound_event(
            self.vendor_a.pk, 'order.routed',
            {'po': 'CX-100'}, source_id='test-dis')
        assert len(deliveries) == 0


@pytest.mark.django_db(transaction=True)
class TestOutboundWebhookDelivery:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Vendor Delivery Test')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'outbound-del-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.profile = _make_outbound_profile(self.conn, self.vendor, self.user)

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_successful_delivery(self, mock_publish):
        from apps.integration.webhook_dispatch import queue_outbound_event, process_outbound_delivery
        from apps.integration.commerce_models import VendorOutboundDelivery

        deliveries = queue_outbound_event(
            self.vendor.pk, 'order.routed',
            {'po_number': 'CX-DEL-1'}, source_id='del-1')
        delivery = deliveries[0]

        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read = MagicMock(return_value=b'{"ok":true}')

        with patch('apps.integration.webhook_dispatch.public_target') as mock_target, \
             patch('apps.integration.webhook_dispatch.PinnedHTTPSConnection') as mock_conn_cls:
            mock_target.return_value = ('vendor-api.example.com', '/webhooks/cixci', ['1.2.3.4'])
            mock_conn = MagicMock()
            mock_conn_cls.return_value = mock_conn
            mock_conn.getresponse.return_value = mock_response

            process_outbound_delivery(delivery.pk)

        delivery.refresh_from_db()
        assert delivery.status == 'delivered'
        assert delivery.last_response_code == 200
        assert delivery.delivered_at is not None

        call_args = mock_conn.request.call_args
        headers = call_args[1].get('headers') or call_args[0][3] if len(call_args[0]) > 3 else call_args[1]['headers']
        assert 'X-Signature' in headers
        assert 'X-Timestamp' in headers
        assert headers['X-Event-Type'] == 'order.routed'

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_failed_delivery_retries(self, mock_publish):
        from apps.integration.webhook_dispatch import queue_outbound_event, process_outbound_delivery
        from apps.integration.commerce_models import VendorOutboundDelivery

        deliveries = queue_outbound_event(
            self.vendor.pk, 'order.dispatched',
            {'po': 'CX-FAIL'}, source_id='fail-1')
        delivery = deliveries[0]

        mock_response = MagicMock()
        mock_response.status = 500
        mock_response.read = MagicMock(return_value=b'')

        with patch('apps.integration.webhook_dispatch.public_target') as mock_target, \
             patch('apps.integration.webhook_dispatch.PinnedHTTPSConnection') as mock_conn_cls:
            mock_target.return_value = ('vendor-api.example.com', '/webhooks/cixci', ['1.2.3.4'])
            mock_conn = MagicMock()
            mock_conn_cls.return_value = mock_conn
            mock_conn.getresponse.return_value = mock_response

            process_outbound_delivery(delivery.pk)

        delivery.refresh_from_db()
        assert delivery.status == 'retrying'
        assert delivery.attempt_count == 1
        assert delivery.next_retry_at is not None
        assert delivery.last_response_code == 500

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_tenant_mismatch_fails_immediately(self, mock_publish):
        """A delivery whose vendor_company doesn't match the profile must fail."""
        from apps.integration.webhook_dispatch import process_outbound_delivery
        from apps.integration.commerce_models import VendorOutboundDelivery

        other_vendor = _make_company('Other Vendor')

        delivery = VendorOutboundDelivery.objects.create(
            profile=self.profile,
            vendor_company=other_vendor,
            event_type='order.routed',
            idempotency_key=f'mismatch-{_uid()}',
            payload={'id': 'x', 'type': 'order.routed', 'timestamp': '2026-01-01', 'data': {}},
            status='pending',
        )

        process_outbound_delivery(delivery.pk)
        delivery.refresh_from_db()
        assert delivery.status == 'failed'
        assert delivery.last_error == 'TENANT_MISMATCH'


@pytest.mark.django_db(transaction=True)
class TestRetryStalled:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Vendor Retry Test')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'outbound-retry-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.profile = _make_outbound_profile(self.conn, self.vendor, self.user)

    @patch('apps.integration.webhook_dispatch._publish_delivery')
    def test_retry_picks_up_stalled(self, mock_publish):
        from apps.integration.webhook_dispatch import retry_stalled_deliveries
        from apps.integration.commerce_models import VendorOutboundDelivery
        from datetime import timedelta

        delivery = VendorOutboundDelivery.objects.create(
            profile=self.profile,
            vendor_company=self.vendor,
            event_type='order.routed',
            idempotency_key=f'stalled-{_uid()}',
            payload={'id': 'x', 'type': 'order.routed', 'timestamp': '2026-01-01', 'data': {}},
            status='retrying',
            next_retry_at=timezone.now() - timedelta(minutes=1),
        )

        count = retry_stalled_deliveries()
        assert count == 1
        mock_publish.assert_called_with(delivery.pk)
