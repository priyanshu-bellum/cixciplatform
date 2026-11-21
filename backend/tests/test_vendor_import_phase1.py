"""Requested onboarding policy, exercised through real API/import/task paths."""
from copy import deepcopy
import json
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.db import transaction
from django.test import TestCase
from rest_framework.test import APIClient

from apps.audit.models import AuditRecord
from apps.catalog.compatibility_import import parse_compatibility_row
from apps.catalog.models import Brand, VendorBrandRelationship
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.integration.catalog_config import BALAJI_CONFIG, validate_config
from apps.integration.catalog_import import ingest_rows
from apps.integration.catalog_sync import request_sync, process_sync_page
from apps.integration.models import VendorCatalogConnection, VendorCatalogSyncRun
from apps.tenant.models import Company, User


class VendorImportPhase1Tests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email='phase1@cixci.test', password='test-only')
        self.vendor = Company.objects.create(name='Phase One Vendor', slug='phase-one',
            company_type='vendor', status='draft', external_id=json.dumps({'integration_mode':'api'}))
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.config = deepcopy(BALAJI_CONFIG)

    def connection(self):
        return VendorCatalogConnection.objects.create(vendor_company=self.vendor,
            label='Phase One', endpoint_url='https://supplier.example/catalog', auth_type='none',
            config=self.config, created_by=self.admin, updated_by=self.admin)

    def test_auto_activate_vendor_on_connection_create(self):
        for status in ('draft', 'pending_setup'):
            self.vendor.status = status
            self.vendor.save(update_fields=['status'])
            response = self.client.post('/api/v1/integration/vendor-catalog-connections/', {
                'vendor_company':str(self.vendor.pk), 'label':'New '+status,
                'endpoint_url':'https://supplier.example/catalog', 'auth_type':'none',
                'config':self.config}, format='json')
            self.assertEqual(response.status_code, 201, response.data)
            self.vendor.refresh_from_db()
            self.assertEqual(self.vendor.status, 'active')
        self.assertEqual(AuditRecord.objects.filter(event_code='integration.vendor_catalog.vendor_auto_activated').count(), 2)

    def test_auto_brand_relationship_creation(self):
        connection = self.connection()
        run = VendorCatalogSyncRun.objects.create(connection=connection, requested_by=self.admin,
            trigger='review', config_version=connection.config_version)
        with transaction.atomic():
            ingest_rows(connection, run, [{'sku':'PHASE1', 'name':'Feed product',
                'brand':'  New   Feed Brand ', 'category':'Phone Cases',
                'msrp_cents':3000,'unit_price_cents':500,'launch_date':'2026-01-01'}], self.admin)
        brand = Brand.objects.get(canonical_key='new feed brand')
        relationship = VendorBrandRelationship.objects.get(brand=brand, vendor_company=self.vendor)
        self.assertTrue(relationship.is_active)
        self.assertEqual(relationship.relationship_type, 'authorized_distributor')
        self.assertEqual(relationship.approved_by, self.admin)
        self.assertTrue(AuditRecord.objects.filter(event_code='integration.vendor_catalog.brand_auto_linked').exists())

    def test_sync_config_accepts_larger_page_size(self):
        for size in (200, 500):
            self.config['page_size'] = size
            self.assertEqual(validate_config(self.config)['page_size'], size)
        self.config['page_size'] = 501
        with self.assertRaises(ValidationError):
            validate_config(self.config)
        self.config['page_size'] = 200
        self.config['daily_row_limit'] = 100001
        with self.assertRaises(ValidationError):
            validate_config(self.config)

    def test_parse_compatibility_row_none_config_allows_devices(self):
        kind, _ = DeviceType.objects.get_or_create(code='phone', defaults={'name':'Phone'})
        maker = Manufacturer.objects.create(name='Phase One Maker')
        device = Device.objects.create(name='Phase One Model', manufacturer=maker, device_type=kind)
        _, types, devices = parse_compatibility_row({'devicecompatibility':str(device.pk)}, None)
        self.assertEqual(devices, [str(device.pk)])
        self.assertEqual(types, [])

    @patch('apps.integration.catalog_sync.publish_job')
    @patch('apps.integration.catalog_sync.fetch_json', return_value={'success':True,'data':{'items':[],'next_cursor':None}})
    def test_vendor_draft_activated_during_sync(self, fetch, publish):
        connection = self.connection()
        run = request_sync(connection, self.admin)
        process_sync_page(run.pk)
        self.vendor.refresh_from_db()
        run.refresh_from_db()
        self.assertEqual(self.vendor.status, 'active')
        self.assertEqual(run.status, 'completed')

    def test_inactive_brand_and_relationship_are_not_reactivated(self):
        from apps.integration.catalog_onboarding import resolve_import_brand
        connection = self.connection()
        brand = Brand.objects.create(name='Inactive Brand', is_active=False)
        self.assertIsNone(resolve_import_brand(connection, brand.name, self.admin))
        brand.is_active = True
        brand.save()
        relationship = VendorBrandRelationship.objects.create(brand=brand, vendor_company=self.vendor,
            relationship_type='owned', is_active=False)
        self.assertIsNone(resolve_import_brand(connection, brand.name, self.admin))
        relationship.refresh_from_db()
        self.assertFalse(relationship.is_active)

    @patch('apps.integration.catalog_sync.publish_job')
    def test_suspended_vendor_is_not_activated_or_synced(self, publish):
        self.vendor.status = 'suspended'
        self.vendor.save(update_fields=['status'])
        with self.assertRaises(ValueError):
            request_sync(self.connection(), self.admin)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.status, 'suspended')
