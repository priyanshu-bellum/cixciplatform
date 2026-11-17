"""Tests for Balaji integration — signature verification, webhook handlers, finance sync, order cancellation."""
import hashlib
import hmac as hmac_mod
import json
import time
import uuid
from copy import deepcopy
from unittest.mock import patch, MagicMock

import pytest
from cryptography.fernet import Fernet
from django.conf import settings
from django.test import RequestFactory
from django.utils import timezone
from django.utils.text import slugify

from apps.integration.commerce_config import BALAJI_COMMERCE_CONFIG


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
    creds = encrypt_credentials('bearer', {'token': 'bbw_test_abc123'})
    return VendorCatalogConnection.objects.create(
        vendor_company=vendor_company,
        label=f'{vendor_company.name} Catalog',
        endpoint_url=endpoint,
        auth_type='bearer',
        encrypted_credentials=creds,
    )


def _make_balaji_profile(connection, vendor_company, user, webhook_secret=b'balaji_wh_secret'):
    from apps.integration.commerce_models import VendorCommerceProfile
    from apps.integration.webhook_receiver import encrypt_webhook_secret
    config = deepcopy(BALAJI_COMMERCE_CONFIG)
    config['order']['idempotency_verified'] = True
    config['ship_to'] = {'mode': 'address_id', 'address_id': 1, 'store_id': ''}

    return VendorCommerceProfile.objects.create(
        connection=connection,
        vendor_company=vendor_company,
        adapter='balaji',
        mode='test',
        order_enabled=True,
        webhook_enabled=True,
        polling_enabled=False,
        config=config,
        updated_by=user,
        encrypted_webhook_secret=encrypt_webhook_secret(webhook_secret),
    )


@pytest.fixture(autouse=True, scope='session')
def _encryption_keys():
    settings.VENDOR_CATALOG_ENCRYPTION_KEYS = [Fernet.generate_key().decode()]


# ─── Balaji Signature Verification ──────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestBalajiSignatureVerification:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Balaji Sig Vendor')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'sig-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.secret = b'test_balaji_secret_key'
        self.profile = _make_balaji_profile(
            self.conn, self.vendor, self.user, webhook_secret=self.secret)
        self.factory = RequestFactory()

    def _sign(self, body, ts=None):
        ts = ts or str(int(time.time()))
        message = f'{ts}.'.encode() + body
        sig = hmac_mod.new(self.secret, message, hashlib.sha256).hexdigest()
        return f't={ts},v1={sig}'

    def test_valid_signature_accepted(self):
        from apps.integration.webhook_receiver import WebhookReceiverView
        view = WebhookReceiverView()
        body = b'{"id":"evt_1","type":"order.created","data":{}}'
        sig = self._sign(body)
        assert view._verify_balaji(body, sig, self.profile) is True

    def test_invalid_signature_rejected(self):
        from apps.integration.webhook_receiver import WebhookReceiverView
        view = WebhookReceiverView()
        body = b'{"id":"evt_1","type":"order.created","data":{}}'
        assert view._verify_balaji(body, 't=123,v1=bad', self.profile) is False

    def test_expired_timestamp_rejected(self):
        from apps.integration.webhook_receiver import WebhookReceiverView
        view = WebhookReceiverView()
        body = b'{"id":"evt_1","type":"order.created","data":{}}'
        old_ts = str(int(time.time()) - 600)
        sig = self._sign(body, ts=old_ts)
        assert view._verify_balaji(body, sig, self.profile) is False

    def test_missing_parts_rejected(self):
        from apps.integration.webhook_receiver import WebhookReceiverView
        view = WebhookReceiverView()
        body = b'{"test": true}'
        assert view._verify_balaji(body, 'v1=abc', self.profile) is False
        assert view._verify_balaji(body, 't=123', self.profile) is False
        assert view._verify_balaji(body, '', self.profile) is False


# ─── Webhook Finance Handler ─────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestFinanceWebhookHandler:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Finance Vendor')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'fin-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.profile = _make_balaji_profile(self.conn, self.vendor, self.user)

    def _make_receipt(self):
        from apps.integration.commerce_models import VendorWebhookReceipt
        return VendorWebhookReceipt.objects.create(
            profile=self.profile,
            provider_event_id=f'evt_{uuid.uuid4().hex[:12]}',
            event_type='invoice.created',
            payload_hash='abc',
            encrypted_payload='',
            status='received',
        )

    def test_invoice_created_upserts_finance_record(self):
        from apps.integration.webhook_handlers import handle_finance_event
        from apps.integration.commerce_models import VendorFinanceRecord
        receipt = self._make_receipt()
        record = {
            'id': 'inv_001',
            'invoice_number': 'INV-2026-001',
            'status': 'open',
            'issued_on': '2026-11-18',
            'due_on': '2026-12-18',
            'total_cents': 150000,
            'amount_due_cents': 150000,
            'currency': 'USD',
            'po_number': 'CX-abc123',
            'pdf_url': 'https://shop.balajibrands.com/invoices/inv_001.pdf',
        }
        handle_finance_event('invoice.created', 'invoice', record, self.profile, receipt)
        fr = VendorFinanceRecord.objects.get(profile=self.profile, external_id='inv_001')
        assert fr.record_type == 'invoice'
        assert fr.external_number == 'INV-2026-001'
        assert fr.total_cents == 150000
        assert fr.po_number == 'CX-abc123'
        assert fr.vendor_company == self.vendor

    def test_invoice_paid_updates_existing_record(self):
        from apps.integration.webhook_handlers import handle_finance_event
        from apps.integration.commerce_models import VendorFinanceRecord
        receipt1 = self._make_receipt()
        record = {'id': 'inv_002', 'status': 'open', 'total_cents': 50000}
        handle_finance_event('invoice.created', 'invoice', record, self.profile, receipt1)

        receipt2 = self._make_receipt()
        record_updated = {'id': 'inv_002', 'status': 'paid', 'total_cents': 50000, 'amount_due_cents': 0}
        handle_finance_event('invoice.paid', 'invoice', record_updated, self.profile, receipt2)

        fr = VendorFinanceRecord.objects.get(profile=self.profile, external_id='inv_002')
        assert fr.status == 'paid'
        assert fr.amount_due_cents == 0

    def test_credit_memo_created(self):
        from apps.integration.webhook_handlers import handle_finance_event
        from apps.integration.commerce_models import VendorFinanceRecord
        receipt = self._make_receipt()
        record = {'id': 'cm_001', 'number': 'CM-100', 'status': 'issued', 'total_cents': 25000}
        handle_finance_event('credit_memo.created', 'credit_memo', record, self.profile, receipt)
        fr = VendorFinanceRecord.objects.get(profile=self.profile, external_id='cm_001')
        assert fr.record_type == 'credit_memo'
        assert fr.external_number == 'CM-100'

    def test_payment_applied(self):
        from apps.integration.webhook_handlers import handle_finance_event
        from apps.integration.commerce_models import VendorFinanceRecord
        receipt = self._make_receipt()
        record = {
            'id': 'pay_001', 'number': 'PAY-001', 'status': 'applied',
            'total_cents': 50000, 'applied_to': [{'invoice_number': 'INV-001', 'po_number': 'CX-xyz'}],
        }
        handle_finance_event('payment.applied', 'payment', record, self.profile, receipt)
        fr = VendorFinanceRecord.objects.get(profile=self.profile, external_id='pay_001')
        assert fr.record_type == 'payment'

    def test_missing_id_sets_error(self):
        from apps.integration.webhook_handlers import handle_finance_event
        receipt = self._make_receipt()
        handle_finance_event('invoice.created', 'invoice', {'status': 'open'}, self.profile, receipt)
        assert receipt.error_code == 'MISSING_FINANCE_ID'

    def test_tenant_isolation(self):
        from apps.integration.webhook_handlers import handle_finance_event
        from apps.integration.commerce_models import VendorFinanceRecord
        receipt = self._make_receipt()
        record = {'id': 'inv_iso_001', 'status': 'open', 'total_cents': 1000}
        handle_finance_event('invoice.created', 'invoice', record, self.profile, receipt)
        fr = VendorFinanceRecord.objects.get(external_id='inv_iso_001')
        assert fr.vendor_company_id == self.vendor.pk


# ─── Webhook Return Handler ──────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestReturnWebhookHandler:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Return Vendor')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'ret-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.profile = _make_balaji_profile(self.conn, self.vendor, self.user)

    def _make_receipt(self, event_type='return.created'):
        from apps.integration.commerce_models import VendorWebhookReceipt
        return VendorWebhookReceipt.objects.create(
            profile=self.profile,
            provider_event_id=f'evt_{uuid.uuid4().hex[:12]}',
            event_type=event_type,
            payload_hash='abc',
            encrypted_payload='',
            status='received',
        )

    def test_return_created_upserts_record(self):
        from apps.integration.webhook_handlers import handle_return_event
        from apps.integration.commerce_models import VendorReturnRecord
        receipt = self._make_receipt()
        record = {
            'id': 'ret_001',
            'status': 'pending',
            'source_order': {'order_number': 'ORD-100', 'po_number': 'CX-ret001'},
            'total_cents': 30000,
            'currency': 'USD',
            'credit_memo': {'id': 'cm_ret_001'},
        }
        handle_return_event('return.created', record, self.profile, receipt)
        rr = VendorReturnRecord.objects.get(profile=self.profile, external_id='ret_001')
        assert rr.status == 'pending'
        assert rr.source_order_number == 'ORD-100'
        assert rr.po_number == 'CX-ret001'
        assert rr.credit_memo_id == 'cm_ret_001'
        assert rr.vendor_company == self.vendor

    def test_return_updated(self):
        from apps.integration.webhook_handlers import handle_return_event
        from apps.integration.commerce_models import VendorReturnRecord
        receipt1 = self._make_receipt()
        record = {'id': 'ret_002', 'status': 'pending', 'total_cents': 5000}
        handle_return_event('return.created', record, self.profile, receipt1)

        receipt2 = self._make_receipt('return.updated')
        record_upd = {'id': 'ret_002', 'status': 'approved', 'total_cents': 5000}
        handle_return_event('return.updated', record_upd, self.profile, receipt2)

        rr = VendorReturnRecord.objects.get(profile=self.profile, external_id='ret_002')
        assert rr.status == 'approved'

    def test_missing_id_sets_error(self):
        from apps.integration.webhook_handlers import handle_return_event
        receipt = self._make_receipt()
        handle_return_event('return.created', {'status': 'open'}, self.profile, receipt)
        assert receipt.error_code == 'MISSING_RETURN_ID'


# ─── Webhook Inventory Handler ───────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestInventoryWebhookHandler:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Inventory Vendor')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'inv-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.profile = _make_balaji_profile(self.conn, self.vendor, self.user)

    def _make_receipt(self, event_type='item.stock_changed'):
        from apps.integration.commerce_models import VendorWebhookReceipt
        return VendorWebhookReceipt.objects.create(
            profile=self.profile,
            provider_event_id=f'evt_{uuid.uuid4().hex[:12]}',
            event_type=event_type,
            payload_hash='abc',
            encrypted_payload='',
            status='received',
        )

    def test_missing_sku_sets_error(self):
        from apps.integration.webhook_handlers import handle_inventory_event
        receipt = self._make_receipt()
        handle_inventory_event('item.stock_changed', {'stock_on_hand': 50}, self.profile, receipt)
        assert receipt.error_code == 'MISSING_ITEM_SKU'

    def test_item_not_found_sets_error(self):
        from apps.integration.webhook_handlers import handle_inventory_event
        receipt = self._make_receipt()
        handle_inventory_event('item.stock_changed', {'sku': 'NONEXISTENT', 'stock_on_hand': 10}, self.profile, receipt)
        assert receipt.error_code == 'ITEM_NOT_FOUND'


# ─── Commerce Config Validation ──────────────────────────────────────────────

@pytest.mark.django_db
class TestCommerceConfigValidation:
    def test_balaji_config_validates(self):
        from apps.integration.commerce_config import validate_commerce_config
        config = deepcopy(BALAJI_COMMERCE_CONFIG)
        result = validate_commerce_config(config)
        assert result['webhook']['scheme'] == 'balaji_v1'
        assert len(result['webhook']['events']) == 12

    def test_new_routes_accepted(self):
        from apps.integration.commerce_config import validate_commerce_config
        config = deepcopy(BALAJI_COMMERCE_CONFIG)
        for route in ('finance', 'return', 'inventory'):
            assert route in config['webhook']['event_routes'].values()
        validate_commerce_config(config)

    def test_invalid_route_rejected(self):
        from apps.integration.commerce_config import validate_commerce_config
        from django.core.exceptions import ValidationError
        config = deepcopy(BALAJI_COMMERCE_CONFIG)
        config['webhook']['event_routes']['order.created'] = 'invalid_route'
        with pytest.raises(ValidationError):
            validate_commerce_config(config)


# ─── Order Cancellation ─────────────────────────────────────────────────────

def _make_order_and_suborder(vendor_company, buyer_company):
    from apps.routing.models import Order, RoutedSuborder
    entity = _make_entity(buyer_company)
    order = Order.objects.create(
        company_scope_reference=buyer_company.pk,
        buyer_reference=buyer_company.pk,
        buyer_entity_reference=entity.pk,
        status='placed',
    )
    sub = RoutedSuborder.objects.create(
        order=order,
        vendor_company_reference=vendor_company.pk,
        status='placed',
        routing_snapshot={},
    )
    return order, sub


@pytest.mark.django_db(transaction=True)
class TestOrderCancellation:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('Cancel Vendor')
        self.buyer = _make_company('Cancel Buyer', company_type='buyer')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'cancel-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.profile = _make_balaji_profile(self.conn, self.vendor, self.user)

    def _make_dispatch(self, status='accepted'):
        from apps.integration.commerce_models import SupplierOrderDispatch
        _, sub = _make_order_and_suborder(self.vendor, self.buyer)
        return SupplierOrderDispatch.objects.create(
            suborder=sub,
            profile=self.profile,
            vendor_company=self.vendor,
            po_number=f'CX-cancel-{_uid()}',
            status=status,
            mode='preview',
            config_snapshot=self.profile.config,
        )

    def test_preview_cancel_no_api_call(self):
        from apps.integration.order_dispatch import cancel_supplier_order
        dispatch = self._make_dispatch(status='accepted')
        result = cancel_supplier_order(dispatch.pk, actor=self.user)
        assert result.status == 'cancelled'

    def test_already_cancelled_raises(self):
        from apps.integration.order_dispatch import cancel_supplier_order
        from django.core.exceptions import ValidationError
        dispatch = self._make_dispatch(status='cancelled')
        with pytest.raises(ValidationError, match='not in a cancellable state'):
            cancel_supplier_order(dispatch.pk, actor=self.user)


# ─── Finance Sync Pipeline ──────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestFinanceSyncPipeline:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('FinSync Vendor')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'finsync-{_uid()}@test.cixci')
        self.conn = _make_connection(self.vendor)
        self.profile = _make_balaji_profile(self.conn, self.vendor, self.user)

    @patch('apps.integration.finance_sync.request_json')
    @patch('apps.integration.finance_sync._reserve_request')
    def test_sync_invoices_creates_records(self, mock_reserve, mock_request):
        from apps.integration.finance_sync import request_finance_sync, process_finance_poll
        from apps.integration.commerce_models import VendorFinanceRecord

        mock_request.return_value = (200, {
            'data': {
                'invoices': [
                    {'id': 'inv_sync_1', 'invoice_number': 'INV-S1', 'status': 'open',
                     'total_cents': 100000, 'currency': 'USD', 'updated_at': '2026-11-18T10:00:00Z'},
                    {'id': 'inv_sync_2', 'invoice_number': 'INV-S2', 'status': 'paid',
                     'total_cents': 50000, 'currency': 'USD', 'updated_at': '2026-11-18T11:00:00Z'},
                ],
            },
        })

        run = request_finance_sync(self.profile.pk, kind='invoice', actor=self.user)
        assert run is not None
        process_finance_poll(str(run.pk))

        run.refresh_from_db()
        assert run.status == 'completed'
        assert run.processed_count == 2
        assert VendorFinanceRecord.objects.filter(profile=self.profile, record_type='invoice').count() == 2

    @patch('apps.integration.finance_sync.request_json')
    @patch('apps.integration.finance_sync._reserve_request')
    def test_sync_returns_creates_return_records(self, mock_reserve, mock_request):
        from apps.integration.finance_sync import request_finance_sync, process_finance_poll
        from apps.integration.commerce_models import VendorReturnRecord

        mock_request.return_value = (200, {
            'data': {
                'returns': [
                    {'id': 'ret_sync_1', 'status': 'pending',
                     'source_order': {'order_number': 'ORD-1', 'po_number': 'CX-1'},
                     'total_cents': 20000, 'updated_at': '2026-11-18T10:00:00Z'},
                ],
            },
        })

        run = request_finance_sync(self.profile.pk, kind='return', actor=self.user)
        process_finance_poll(str(run.pk))

        run.refresh_from_db()
        assert run.status == 'completed'
        assert VendorReturnRecord.objects.filter(profile=self.profile).count() == 1

    def test_non_balaji_adapter_returns_none(self):
        from apps.integration.finance_sync import request_finance_sync
        from apps.integration.commerce_config import GENERIC_COMMERCE_CONFIG
        self.profile.adapter = 'generic_json'
        self.profile.config = deepcopy(GENERIC_COMMERCE_CONFIG)
        self.profile.config['order']['idempotency_verified'] = True
        self.profile.config['ship_to'] = {'mode': 'address_id', 'address_id': 1, 'store_id': ''}
        self.profile.save()
        result = request_finance_sync(self.profile.pk, kind='invoice')
        assert result is None


# ─── API Endpoints ───────────────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestFinanceReturnAPI:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.vendor = _make_company('API Vendor')
        self.entity = _make_entity(self.vendor)
        self.user = _make_user(self.entity, f'api-{_uid()}@test.cixci')
        self.user.is_cixci_admin = True
        self.user.save()
        self.conn = _make_connection(self.vendor)
        self.profile = _make_balaji_profile(self.conn, self.vendor, self.user)

    def test_finance_records_endpoint_returns_data(self):
        from apps.integration.commerce_models import VendorFinanceRecord
        VendorFinanceRecord.objects.create(
            profile=self.profile, vendor_company=self.vendor,
            record_type='invoice', external_id='inv_api_1',
            total_cents=100000, source='webhook',
        )
        factory = RequestFactory()
        request = factory.get(f'/api/v1/integration/commerce-profiles/{self.profile.pk}/finance-records/')
        request.user = self.user
        from apps.integration.commerce_api import VendorCommerceProfileViewSet
        view = VendorCommerceProfileViewSet.as_view({'get': 'finance_records'})
        response = view(request, pk=str(self.profile.pk))
        assert response.status_code == 200

    def test_return_records_endpoint_returns_data(self):
        from apps.integration.commerce_models import VendorReturnRecord
        VendorReturnRecord.objects.create(
            profile=self.profile, vendor_company=self.vendor,
            external_id='ret_api_1', status='pending',
        )
        factory = RequestFactory()
        request = factory.get(f'/api/v1/integration/commerce-profiles/{self.profile.pk}/return-records/')
        request.user = self.user
        from apps.integration.commerce_api import VendorCommerceProfileViewSet
        view = VendorCommerceProfileViewSet.as_view({'get': 'return_records'})
        response = view(request, pk=str(self.profile.pk))
        assert response.status_code == 200
