"""Tests for webhook receiver, event handlers, and shipment polling."""
import hashlib
import hmac
import json
import time
import uuid
from datetime import date
from copy import deepcopy
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet
from django.conf import settings
from django.test import RequestFactory
from django.utils import timezone
from django.utils.text import slugify

from apps.integration.commerce_config import BALAJI_COMMERCE_CONFIG, GENERIC_COMMERCE_CONFIG

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


def _make_connection(vendor_company, endpoint='https://shop.balajibrands.com/api/v1/catalog'):
    from apps.integration.models import VendorCatalogConnection
    from apps.integration.catalog_secrets import encrypt_credentials
    creds = encrypt_credentials('bearer', {'token': 'bbw_live_test123'})
    return VendorCatalogConnection.objects.create(
        vendor_company=vendor_company,
        label=f'{vendor_company.name} Catalog',
        endpoint_url=endpoint,
        auth_type='bearer',
        encrypted_credentials=creds,
    )


def _make_commerce_profile(connection, vendor_company, user, adapter='balaji', mode='live',
                           webhook_enabled=True, polling_enabled=False):
    from apps.integration.commerce_models import VendorCommerceProfile
    config = deepcopy(BALAJI_COMMERCE_CONFIG if adapter == 'balaji' else GENERIC_COMMERCE_CONFIG)
    config['order']['idempotency_verified'] = True
    config['ship_to'] = {'mode': 'address_id', 'address_id': 1, 'store_id': ''}

    fernet_key = Fernet.generate_key()
    f = Fernet(fernet_key)
    secret = b'webhook_secret_for_testing'
    encrypted_secret = fernet_key.decode() + '|' + f.encrypt(secret).decode()

    return VendorCommerceProfile.objects.create(
        connection=connection,
        vendor_company=vendor_company,
        adapter=adapter,
        mode=mode,
        order_enabled=True,
        webhook_enabled=webhook_enabled,
        polling_enabled=polling_enabled,
        config=config,
        updated_by=user,
        encrypted_webhook_secret=encrypted_secret if webhook_enabled else '',
    )


def _sign_balaji(payload_bytes, profile):
    from apps.integration.webhook_receiver import read_webhook_secret
    key = read_webhook_secret(profile)
    return hmac.new(key, payload_bytes, hashlib.sha256).hexdigest()


@pytest.fixture(autouse=True, scope='session')
def _encryption_keys():
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]


@pytest.mark.django_db(transaction=True)
class TestWebhookReceiver:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Balaji WH Recv')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'wh-recv-{_uid()}@test.cixci')
        self.connection = _make_connection(self.vendor)
        self.profile = _make_commerce_profile(
            self.connection, self.vendor, self.user, webhook_enabled=True)
        self.factory = RequestFactory()

    def _post_webhook(self, payload, signature=None, receiver_id=None):
        from apps.integration.webhook_receiver import WebhookReceiverView
        body = json.dumps(payload).encode()
        if signature is None:
            signature = _sign_balaji(body, self.profile)
        rid = receiver_id or self.profile.receiver_id
        request = self.factory.post(
            f'/api/v1/integration/webhooks/{rid}/',
            data=body, content_type='application/json',
            HTTP_BALAJI_SIGNATURE=signature)
        return WebhookReceiverView.as_view()(request, receiver_id=rid)

    def test_valid_webhook_accepted(self):
        payload = {'id': 'evt_001', 'type': 'order.updated', 'test': False, 'data': {
            'order': {'po_number': 'CX-123', 'order_number': 'BWO-456', 'status': 'Processing'}}}
        response = self._post_webhook(payload)
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['status'] == 'accepted'

    def test_invalid_signature_rejected(self):
        payload = {'id': 'evt_002', 'type': 'order.updated', 'data': {}}
        response = self._post_webhook(payload, signature='bad_signature')
        assert response.status_code == 401

    def test_unknown_receiver_404(self):
        payload = {'id': 'evt_003', 'type': 'order.updated', 'data': {}}
        response = self._post_webhook(payload, receiver_id=uuid.uuid4())
        assert response.status_code == 404

    def test_duplicate_event_deduped(self):
        payload = {'id': 'evt_dup_001', 'type': 'order.updated', 'test': False, 'data': {
            'order': {'po_number': 'CX-999'}}}
        r1 = self._post_webhook(payload)
        assert r1.status_code == 200
        r2 = self._post_webhook(payload)
        assert r2.status_code == 200
        data = json.loads(r2.content)
        assert data['status'] == 'duplicate'

    def test_unsubscribed_event_ignored(self):
        payload = {'id': 'evt_004', 'type': 'invoice.created', 'data': {}}
        response = self._post_webhook(payload)
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['status'] == 'ignored'

    def test_test_event_skipped(self):
        from apps.integration.commerce_models import VendorWebhookReceipt
        payload = {'id': f'evt_test_{_uid()}', 'type': 'order.updated', 'test': True, 'data': {}}
        response = self._post_webhook(payload)
        assert response.status_code == 200
        receipt = VendorWebhookReceipt.objects.filter(
            profile=self.profile, is_test=True).order_by('-received_at').first()
        assert receipt is not None
        assert receipt.status == 'skipped'

    def test_missing_event_fields_rejected(self):
        payload = {'no_id': True}
        body = json.dumps(payload).encode()
        sig = _sign_balaji(body, self.profile)
        response = self._post_webhook(payload, signature=sig)
        assert response.status_code == 400


@pytest.mark.django_db(transaction=True)
class TestWebhookOrderHandler:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Balaji WH Order')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'wh-order-{_uid()}@test.cixci')
        self.connection = _make_connection(self.vendor)
        self.profile = _make_commerce_profile(
            self.connection, self.vendor, self.user, webhook_enabled=True)

        self.buyer = _make_company('Order Buyer', 'buyer')
        self.buyer_entity = _make_entity(self.buyer)

        from apps.routing.models import Order, RoutedSuborder
        self.order = Order.objects.create(
            company_scope_reference=self.buyer.pk,
            buyer_reference=self.user.pk,
            buyer_entity_reference=self.buyer_entity.pk,
            buyer_order_number_reference='BO-001',
            status='placed', mapping_contract_version=1)
        self.suborder = RoutedSuborder.objects.create(
            order=self.order, vendor_company_reference=self.vendor.pk,
            status='placed', routing_snapshot={})
        from apps.integration.commerce_models import SupplierOrderDispatch
        self.dispatch = SupplierOrderDispatch.objects.create(
            suborder=self.suborder, profile=self.profile,
            vendor_company=self.vendor, po_number=f'CX-ORDER-{_uid()}',
            status='accepted', mode='live',
            config_snapshot=self.profile.config, config_version=self.profile.config_version)
        from apps.fulfillment.models import FulfillmentHandoff
        self.handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=self.suborder.pk,
            vendor_company_reference=self.vendor.pk,
            company_scope_reference=self.buyer.pk,
            status='received')

    def test_order_status_update(self):
        from apps.integration.webhook_handlers import handle_order_event
        from apps.integration.commerce_models import VendorWebhookReceipt
        receipt = VendorWebhookReceipt.objects.create(
            profile=self.profile, provider_event_id=f'evt_o_{_uid()}',
            event_type='order.updated', payload_hash='abc', encrypted_payload='', status='received')
        record = {'po_number': self.dispatch.po_number, 'order_number': 'BWO-100',
                  'status': 'Processing', 'updated_at': '2026-11-13T10:00:00Z'}
        handle_order_event('order.updated', record, self.profile, receipt)
        from apps.integration.commerce_models import SupplierOrderDispatch
        d = SupplierOrderDispatch.objects.get(pk=self.dispatch.pk)
        assert d.external_order_id == 'BWO-100'
        assert d.status == 'processing'

    def test_shipment_tracking_update(self):
        from apps.integration.webhook_handlers import handle_shipment_event
        from apps.integration.commerce_models import VendorWebhookReceipt
        receipt = VendorWebhookReceipt.objects.create(
            profile=self.profile, provider_event_id=f'evt_s_{_uid()}',
            event_type='shipment.created', payload_hash='def', encrypted_payload='', status='received')
        record = {'po_number': self.dispatch.po_number, 'shipment_number': 'SHP-001',
                  'status': 'Shipped', 'ship_date': '2026-11-13',
                  'tracking': {'number': '1Z999AA10123456784', 'carrier': 'UPS', 'url': 'https://ups.com/track/1Z999'}}
        handle_shipment_event('shipment.created', record, self.profile, receipt)
        from apps.fulfillment.models import FulfillmentHandoff
        h = FulfillmentHandoff.objects.get(pk=self.handoff.pk)
        assert h.tracking_number == '1Z999AA10123456784'
        assert h.shipping_carrier == 'UPS'
        assert h.shipped_date == date(2026, 11, 13)
        assert h.status == 'shipped'

    def test_delivery_event_completes_handoff(self):
        from apps.integration.webhook_handlers import handle_shipment_event
        from apps.integration.commerce_models import VendorWebhookReceipt
        self.handoff.status = 'shipped'
        self.handoff.save()
        receipt = VendorWebhookReceipt.objects.create(
            profile=self.profile, provider_event_id=f'evt_s_{_uid()}',
            event_type='shipment.delivered', payload_hash='ghi', encrypted_payload='', status='received')
        record = {'po_number': self.dispatch.po_number, 'shipment_number': 'SHP-001',
                  'status': 'Delivered', 'delivered_date': '2026-11-15'}
        handle_shipment_event('shipment.delivered', record, self.profile, receipt)
        from apps.fulfillment.models import FulfillmentHandoff
        h = FulfillmentHandoff.objects.get(pk=self.handoff.pk)
        assert h.status == 'delivered'


@pytest.mark.django_db(transaction=True)
class TestShipmentPolling:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Balaji Poll')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'poll-{_uid()}@test.cixci')
        self.connection = _make_connection(self.vendor)
        self.profile = _make_commerce_profile(
            self.connection, self.vendor, self.user,
            webhook_enabled=False, polling_enabled=True)

    def test_request_shipment_poll_creates_run(self):
        from apps.integration.shipment_poll import request_shipment_poll
        run = request_shipment_poll(self.profile.pk)
        assert run.kind == 'shipments'
        assert run.status == 'queued'
        assert run.profile == self.profile

    def test_duplicate_poll_returns_existing(self):
        from apps.integration.shipment_poll import request_shipment_poll
        from apps.integration.commerce_models import VendorCommercePollRun
        run1 = request_shipment_poll(self.profile.pk)
        run2 = request_shipment_poll(self.profile.pk)
        assert run1.pk == run2.pk
        assert VendorCommercePollRun.objects.filter(
            profile=self.profile, kind='shipments').count() == 1

    @patch('apps.integration.shipment_poll.fetch_json')
    @patch('apps.integration.shipment_poll._reserve_request')
    @patch('apps.integration.shipment_poll.profile_transport', return_value={'url': 'https://shop.balajibrands.com/api/v1/shipments'})
    def test_poll_processes_shipment_rows(self, mock_transport, mock_reserve, mock_fetch):
        from apps.integration.shipment_poll import request_shipment_poll, process_shipment_poll
        buyer = _make_company('Poll Buyer', 'buyer')
        buyer_entity = _make_entity(buyer)

        from apps.routing.models import Order, RoutedSuborder
        order = Order.objects.create(
            company_scope_reference=buyer.pk,
            buyer_reference=self.user.pk,
            buyer_entity_reference=buyer_entity.pk,
            buyer_order_number_reference=f'PBO-{_uid()}',
            status='placed', mapping_contract_version=1)
        sub = RoutedSuborder.objects.create(
            order=order, vendor_company_reference=self.vendor.pk,
            status='placed', routing_snapshot={})
        po = f'CX-POLL-{_uid()}'
        from apps.integration.commerce_models import SupplierOrderDispatch
        SupplierOrderDispatch.objects.create(
            suborder=sub, profile=self.profile, vendor_company=self.vendor,
            po_number=po, status='accepted', mode='live',
            config_snapshot=self.profile.config, config_version=self.profile.config_version)
        from apps.fulfillment.models import FulfillmentHandoff
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=sub.pk,
            vendor_company_reference=self.vendor.pk,
            company_scope_reference=buyer.pk, status='received')

        mock_fetch.return_value = {'data': {
            'shipments': [{'po_number': po, 'shipment_number': 'S-100',
                          'status': 'Shipped', 'ship_date': '2026-11-12',
                          'tracking': {'number': 'TRACK123', 'carrier': 'FedEx'}}],
            'next_cursor': None, 'next_updated_since': '2026-11-13T00:00:00Z'}}

        run = request_shipment_poll(self.profile.pk)
        process_shipment_poll(run.pk)

        from apps.integration.commerce_models import VendorCommercePollRun
        updated_run = VendorCommercePollRun.objects.get(pk=run.pk)
        assert updated_run.status == 'completed'

        h = FulfillmentHandoff.objects.get(pk=handoff.pk)
        assert h.tracking_number == 'TRACK123'
        assert h.shipping_carrier == 'FedEx'
        assert h.status == 'shipped'


@pytest.mark.django_db(transaction=True)
class TestParentCompleteness:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor1 = _make_company('Vendor A Compl')
        self.vendor2 = _make_company('Vendor B Compl')
        self.entity1 = _make_entity(self.vendor1)
        self.entity2 = _make_entity(self.vendor2)
        self.user1 = _make_user(self.entity1, f'v1-{_uid()}@compl.test')
        self.user2 = _make_user(self.entity2, f'v2-{_uid()}@compl.test')
        self.buyer = _make_company('Completeness Buyer', 'buyer')
        self.buyer_entity = _make_entity(self.buyer)

        from apps.routing.models import Order, RoutedSuborder
        self.order = Order.objects.create(
            company_scope_reference=self.buyer.pk,
            buyer_reference=self.user1.pk,
            buyer_entity_reference=self.buyer_entity.pk,
            buyer_order_number_reference=f'CBO-{_uid()}',
            status='placed', mapping_contract_version=1)
        self.sub1 = RoutedSuborder.objects.create(
            order=self.order, vendor_company_reference=self.vendor1.pk,
            status='placed', routing_snapshot={})
        self.sub2 = RoutedSuborder.objects.create(
            order=self.order, vendor_company_reference=self.vendor2.pk,
            status='placed', routing_snapshot={})

        from apps.fulfillment.models import FulfillmentHandoff
        self.h1 = FulfillmentHandoff.objects.create(
            routed_suborder_reference=self.sub1.pk,
            vendor_company_reference=self.vendor1.pk,
            company_scope_reference=self.buyer.pk, status='received')
        self.h2 = FulfillmentHandoff.objects.create(
            routed_suborder_reference=self.sub2.pk,
            vendor_company_reference=self.vendor2.pk,
            company_scope_reference=self.buyer.pk, status='received')

    def _make_dispatch(self, suborder, profile, vendor):
        from apps.integration.commerce_models import SupplierOrderDispatch
        return SupplierOrderDispatch.objects.create(
            suborder=suborder, profile=profile, vendor_company=vendor,
            po_number=f'CX-C-{_uid()}', status='accepted', mode='live',
            config_snapshot=profile.config, config_version=profile.config_version)

    def test_all_delivered_creates_eligible_signal(self):
        from apps.integration.webhook_handlers import _check_parent_completeness
        self.h1.status = 'delivered'
        self.h1.save()
        self.h2.status = 'delivered'
        self.h2.save()

        conn1 = _make_connection(self.vendor1)
        profile1 = _make_commerce_profile(conn1, self.vendor1, self.user1)
        dispatch1 = self._make_dispatch(self.sub1, profile1, self.vendor1)

        _check_parent_completeness(self.h2, dispatch1)

        from apps.fulfillment.models import BuyerUpdateReadySignal
        signal = BuyerUpdateReadySignal.objects.filter(
            order_reference=self.order.pk, update_kind='delivery').first()
        assert signal is not None
        assert signal.all_vendors_confirmed is True
        assert signal.status == 'eligible'

    def test_partial_delivery_creates_held_signal(self):
        from apps.integration.webhook_handlers import _check_parent_completeness
        self.h1.status = 'delivered'
        self.h1.save()

        conn1 = _make_connection(self.vendor1)
        profile1 = _make_commerce_profile(conn1, self.vendor1, self.user1)
        dispatch1 = self._make_dispatch(self.sub1, profile1, self.vendor1)

        _check_parent_completeness(self.h1, dispatch1)

        from apps.fulfillment.models import BuyerUpdateReadySignal
        signal = BuyerUpdateReadySignal.objects.filter(
            order_reference=self.order.pk, update_kind='shipment').first()
        assert signal is not None
        assert signal.all_vendors_confirmed is False
