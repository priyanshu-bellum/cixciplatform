"""A provider's unknown device name is never turned into a device: it goes to the
Missing Devices panel, and an admin adds it with the right Device Type."""
from copy import deepcopy
from datetime import date
import json

from django.db import transaction
from django.test import TestCase
from rest_framework.test import APIClient

from apps.catalog.models import DynamicDropdownConfig, Product
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.integration.catalog_config import BALAJI_CONFIG
from apps.integration.catalog_import import ingest_rows
from apps.integration.models import VendorCatalogConnection, VendorCatalogItem, VendorCatalogSyncRun
from apps.notification.models import NotificationRequest
from apps.tenant.models import Company, User


class MissingDeviceFlowTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email='missing@cixci.test', password='test-only')
        self.vendor = Company.objects.create(name='Missing Vendor', slug='missing-vendor', company_type='vendor',
            status='active', external_id=json.dumps({'integration_mode': 'api'}))
        self.connection = VendorCatalogConnection.objects.create(vendor_company=self.vendor, label='Feed',
            endpoint_url='https://supplier.example/catalog', auth_type='none', config=deepcopy(BALAJI_CONFIG),
            created_by=self.admin, updated_by=self.admin)
        self.phone, _ = DeviceType.objects.update_or_create(code='phone', defaults={'name': 'Phone', 'status': 'active', 'is_active': True})
        self.laptop, _ = DeviceType.objects.update_or_create(code='laptop', defaults={'name': 'Laptop', 'status': 'active', 'is_active': True})
        self.maker = Manufacturer.objects.create(name='Acme', is_active=True)
        self.known = Device.objects.create(name='Known Phone', manufacturer=self.maker, device_type=self.phone,
            lifecycle_status='available', launch_date=date(2026, 1, 1))
        DynamicDropdownConfig.objects.update_or_create(field_name='product_category', value='Cases', defaults={
            'status': 'active', 'compatibility_mode': 'device_specific', 'accessory_fields': [],
            'eligible_device_types': [str(self.phone.pk), str(self.laptop.pk)],
            'compatibility_rules': {'_eligible_type_ids': [str(self.phone.pk), str(self.laptop.pk)]}})
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def ingest(self, devices, sku='MISS-1'):
        run = VendorCatalogSyncRun.objects.create(connection=self.connection, requested_by=self.admin,
            trigger='manual', config_version=self.connection.config_version)
        with transaction.atomic():
            ingest_rows(self.connection, run, [{'sku': sku, 'name': 'Sleeve ' + sku, 'brand': 'Feed Brand',
                'category': 'Phone Cases', 'msrp_cents': 3000, 'unit_price_cents': 500, 'launch_date': '2026-01-01',
                'compatible_devices': [{'name': name} for name in devices]}], self.admin)
        # Only one active run is allowed per connection.
        VendorCatalogSyncRun.objects.filter(pk=run.pk).update(status='completed')
        return Product.objects.get(sku=sku)

    def compatible(self, product):
        return set(product.compatibility_assertions.filter(is_compatible=True, is_excluded=False).values_list('device_reference', flat=True))

    def test_unknown_name_creates_no_device_and_known_models_are_still_mapped(self):
        devices_before, makers_before = Device.objects.count(), Manufacturer.objects.count()
        product = self.ingest(['Known Phone', 'Acme ProBook 14'])
        self.assertEqual((Device.objects.count(), Manufacturer.objects.count()), (devices_before, makers_before))
        self.assertEqual(self.compatible(product), {self.known.pk})
        source = VendorCatalogItem.objects.get(product=product)
        self.assertTrue(source.review_required)
        self.assertIn('MISSING_DEVICE_REVIEW', {error['code'] for error in source.review_errors})
        alert = NotificationRequest.objects.get(event_type='catalog.missing_device_reference')
        self.assertEqual(alert.safe_payload_summary['missing_devices'], ['Acme ProBook 14'])

    def test_product_with_only_unknown_models_is_saved_without_devices(self):
        product = self.ingest(['Acme ProBook 14'])
        self.assertEqual(self.compatible(product), set())
        self.assertFalse(Device.objects.filter(name__icontains='ProBook').exists())

    def test_admin_adds_the_missing_device_with_its_real_type_and_products_map(self):
        first = self.ingest(['Known Phone', 'Acme ProBook 14'])
        second = self.ingest(['Acme ProBook 14'], sku='MISS-2')
        listing = self.client.get('/api/v1/catalog/missing-devices/')
        self.assertEqual(listing.status_code, 200, listing.data)
        row = next(item for item in listing.data['devices'] if item['vendor_device_name'] == 'Acme ProBook 14')
        self.assertIn('laptop', {item['code'] for item in listing.data['device_types']})
        self.assertEqual(row['suggested_device_type'], 'phone')
        response = self.client.post('/api/v1/catalog/missing-devices/add_device/', {'vendor_device_name': 'Acme ProBook 14',
            'manufacturer_id': str(self.maker.pk), 'device_name': 'ProBook 14', 'device_type_code': 'laptop'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['products_matched'], 2)
        device = Device.objects.get(name='ProBook 14')
        self.assertEqual(device.device_type_id, self.laptop.pk)
        self.assertEqual(self.compatible(first), {self.known.pk, device.pk})
        self.assertEqual(self.compatible(second), {device.pk})
        second.refresh_from_db()
        self.assertEqual(second.compatibility_status, 'complete')
        row = second.compatibility_assertions.get(device_reference=device.pk)
        self.assertTrue(row.match_evidence['explicit']['active'])
        names = [item['vendor_device_name'] for item in self.client.get('/api/v1/catalog/missing-devices/').data['devices']]
        self.assertNotIn('Acme ProBook 14', names)

    def source(self, product):
        return VendorCatalogItem.objects.get(product=product)

    def test_adding_the_device_clears_the_review_and_survives_the_next_sync(self):
        """The admin names the device differently from the vendor; the alias keeps it mapped."""
        product = self.ingest(['Known Phone', 'Acme ProBook 14'])
        self.assertTrue(self.source(product).review_required)
        response = self.client.post('/api/v1/catalog/missing-devices/add_device/', {'vendor_device_name': 'Acme ProBook 14',
            'manufacturer_name': 'Hewlett Packard', 'device_name': 'ProBook 14 G2', 'device_type_code': 'laptop'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data['products_matched'], response.data['reviews_cleared'], response.data['not_mapped']), (1, 1, []))
        device = Device.objects.get(name='ProBook 14 G2')
        self.assertEqual(device.manufacturer.name, 'Hewlett Packard')
        source = self.source(product)
        self.assertNotIn('MISSING_DEVICE_REVIEW', {error['code'] for error in source.review_errors})
        # The vendor sends the product again with a changed payload: nothing is lost or re-reported.
        NotificationRequest.objects.all().delete()
        devices_before = Device.objects.count()
        run = VendorCatalogSyncRun.objects.create(connection=self.connection, requested_by=self.admin,
            trigger='manual', config_version=self.connection.config_version)
        with transaction.atomic():
            ingest_rows(self.connection, run, [{'sku': 'MISS-1', 'name': 'Sleeve MISS-1 v2', 'brand': 'Feed Brand',
                'category': 'Phone Cases', 'msrp_cents': 3100, 'unit_price_cents': 500, 'launch_date': '2026-01-01',
                'compatible_devices': [{'name': 'Known Phone'}, {'name': 'acme  probook 14'}]}], self.admin)
        self.assertEqual(self.compatible(product), {self.known.pk, device.pk})
        self.assertEqual(Device.objects.count(), devices_before)
        self.assertFalse(NotificationRequest.objects.filter(event_type='catalog.missing_device_reference').exists())
        self.assertNotIn('MISSING_DEVICE_REVIEW', {error['code'] for error in self.source(product).review_errors})
        listing = self.client.get('/api/v1/catalog/missing-devices/')
        self.assertEqual((listing.data['counts']['missing'], listing.data['counts']['mapped']), (0, 1))

    def test_review_stays_while_another_declared_model_is_still_missing(self):
        product = self.ingest(['Acme ProBook 14', 'Acme ProBook 16'])
        response = self.client.post('/api/v1/catalog/missing-devices/add_device/', {'vendor_device_name': 'Acme ProBook 14',
            'manufacturer_id': str(self.maker.pk), 'device_name': 'ProBook 14', 'device_type_code': 'laptop'}, format='json')
        self.assertEqual((response.data['products_matched'], response.data['reviews_cleared']), (1, 0))
        self.assertIn('MISSING_DEVICE_REVIEW', {error['code'] for error in self.source(product).review_errors})

    def test_listing_shows_vendor_products_and_a_likely_existing_device_to_link(self):
        product = self.ingest(['Known Phones'])
        listing = self.client.get('/api/v1/catalog/missing-devices/')
        row = listing.data['devices'][0]
        self.assertEqual((row['vendor_device_name'], row['vendor_name'], row['product_count']), ('Known Phones', 'Missing Vendor', 1))
        self.assertEqual(row['similar_devices'], [{'id': str(self.known.pk), 'name': 'Acme Known Phone'}])
        products = self.client.get(f"/api/v1/catalog/missing-devices/{row['id']}/products/")
        self.assertEqual((products.data['count'], products.data['products'][0]['sku']), (1, 'MISS-1'))
        response = self.client.post('/api/v1/catalog/missing-devices/link_device/', {'mapping_id': row['id'], 'device_id': str(self.known.pk)}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['created'], response.data['products_matched']), (False, 1))
        self.assertEqual(self.compatible(product), {self.known.pk})
        self.assertEqual(Device.objects.filter(name__icontains='Known').count(), 1)

    def test_dismissed_text_is_ignored_by_later_syncs_and_can_be_restored(self):
        self.ingest(['Known Phone', 'All Models'])
        row = self.client.get('/api/v1/catalog/missing-devices/').data['devices'][0]
        self.assertEqual(self.client.post('/api/v1/catalog/missing-devices/dismiss_device/', {'mapping_id': row['id']}, format='json').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/catalog/missing-devices/').data['devices'], [])
        other = self.ingest(['Known Phone', 'All Models'], sku='MISS-3')
        self.assertNotIn('MISSING_DEVICE_REVIEW', {error['code'] for error in self.source(other).review_errors})
        self.assertEqual(self.compatible(other), {self.known.pk})
        self.client.post('/api/v1/catalog/missing-devices/restore_device/', {'mapping_id': row['id']}, format='json')
        self.assertEqual(len(self.client.get('/api/v1/catalog/missing-devices/').data['devices']), 1)

    def test_admin_is_told_why_a_product_could_not_be_mapped(self):
        DynamicDropdownConfig.objects.filter(field_name='product_category', value='Cases').update(
            eligible_device_types=[str(self.phone.pk)], compatibility_rules={'_eligible_type_ids': [str(self.phone.pk)]})
        product = self.ingest(['Acme ProBook 14'])
        response = self.client.post('/api/v1/catalog/missing-devices/add_device/', {'vendor_device_name': 'Acme ProBook 14',
            'manufacturer_id': str(self.maker.pk), 'device_name': 'ProBook 14', 'device_type_code': 'laptop'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['products_matched'], 0)
        self.assertEqual(response.data['not_mapped'], [{'reason': 'Category Cases does not list Laptop as an eligible Device Type.', 'products': 1}])
        self.assertEqual(self.compatible(product), set())

    def test_one_vendors_decision_does_not_change_another_vendors_names(self):
        from apps.catalog.missing_devices import vendor_names
        self.ingest(['Acme ProBook 14'])
        self.client.post('/api/v1/catalog/missing-devices/add_device/', {'vendor_device_name': 'Acme ProBook 14',
            'manufacturer_id': str(self.maker.pk), 'device_name': 'ProBook 14', 'device_type_code': 'laptop'}, format='json')
        other = Company.objects.create(name='Other Vendor', slug='other-missing-vendor', company_type='vendor', status='active')
        self.assertEqual(len(vendor_names(self.vendor.pk)[0]), 1)
        self.assertEqual(vendor_names(other.pk), ({}, set()))

    def test_only_admins_use_the_panel(self):
        from apps.tenant.models import CompanyEntity
        user = User.objects.create_user(email='vendor-missing@cixci.test', password='test-only',
            entity=CompanyEntity.objects.filter(company=self.vendor).first())
        client = APIClient()
        client.force_authenticate(user)
        self.assertEqual(client.get('/api/v1/catalog/missing-devices/').status_code, 403)
        self.assertEqual(client.post('/api/v1/catalog/missing-devices/add_device/', {}, format='json').status_code, 403)

    def test_a_type_that_is_not_active_cannot_be_used_for_a_missing_device(self):
        DeviceType.objects.filter(pk=self.laptop.pk).update(status='setup_required')
        self.ingest(['Acme ProBook 14'])
        listing = self.client.get('/api/v1/catalog/missing-devices/')
        self.assertNotIn('laptop', {item['code'] for item in listing.data['device_types']})
        response = self.client.post('/api/v1/catalog/missing-devices/add_device/', {'vendor_device_name': 'Acme ProBook 14',
            'manufacturer_id': str(self.maker.pk), 'device_name': 'ProBook 14', 'device_type_code': 'laptop'}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Device.objects.filter(name='ProBook 14').exists())
