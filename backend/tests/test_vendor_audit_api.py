"""Vendor audit authorization, pagination, canonical mutations and audit evidence."""
from copy import deepcopy
from decimal import Decimal
from datetime import date
import json
import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.audit.models import AuditRecord
from apps.catalog.compatibility_commands import update_explicit_selections
from apps.catalog.models import Brand, DynamicDropdownConfig, Product, ProductCompatibilityAssertion
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.integration.catalog_config import BALAJI_CONFIG
from apps.integration.catalog_sync import request_sync, process_sync_page
from apps.integration.models import VendorCatalogConnection, VendorCatalogItem
from apps.notification.models import InAppNotification
from apps.tenant.models import Capability, Company, CompanyEntity, User


class VendorAuditAPITests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email='audit@cixci.test',password='test-only')
        self.vendor = Company.objects.create(name='Audit Vendor',slug='audit-vendor',company_type='vendor',
            status='active',external_id=json.dumps({'integration_mode':'api'}))
        entity = CompanyEntity.objects.filter(company=self.vendor).first()
        self.regular = User.objects.create_user(email='regular@cixci.test',password='test-only',entity=entity)
        for code in ('catalog.product.list','catalog.product.update'):
            capability,_ = Capability.objects.get_or_create(code=code,defaults={'module':'catalog','is_active':True})
            self.regular.capabilities.add(capability)
            self.vendor.capabilities.add(capability)
        self.brand = Brand.objects.create(name='Audit Brand')
        self.connection = VendorCatalogConnection.objects.create(vendor_company=self.vendor,label='Audit Feed',
            endpoint_url='https://supplier.example/catalog',auth_type='none',config=deepcopy(BALAJI_CONFIG),
            created_by=self.admin,updated_by=self.admin)
        kind,_ = DeviceType.objects.update_or_create(code='phone',defaults={'name':'Phone','status':'active','is_active':True})
        maker = Manufacturer.objects.create(name='Audit Maker')
        self.device = Device.objects.create(name='Audit Model',manufacturer=maker,device_type=kind,
            lifecycle_status='available',launch_date=date(2026,1,1))
        DynamicDropdownConfig.objects.update_or_create(field_name='product_category',value='Cases',
            defaults={'status':'active','compatibility_mode':'device_specific',
                'eligible_device_types':[str(kind.pk)],'compatibility_rules':{},'accessory_fields':[]})
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.base = '/api/v1/catalog/products/'

    def product(self, sku='AUDIT-1', **changes):
        values = dict(name='Audit item '+sku,sku=sku,brand=self.brand.name,brand_reference=self.brand,
            vendor_company_reference=self.vendor.pk,company_scope_reference=self.vendor.pk,
            product_type='accessory',product_category='Cases',launch_date='2026-01-01',status='draft',
            msrp=Decimal('30'),vendor_wholesale_price_amount=Decimal('5'),compatibility_mode='direct_device')
        values.update(changes)
        return Product.objects.create(**values)

    def source(self, product, review=True):
        return VendorCatalogItem.objects.create(connection=self.connection,product=product,
            external_id=product.sku,review_required=review,
            review_errors=[{'code':'COMPATIBILITY_REVIEW_REQUIRED','field':'compatibility_declaration'}] if review else [],
            payload={'sku':product.sku,'name':'Provider item','brand':self.brand.name,'category':'Phone Cases',
                'compatible_devices':[{'id':47,'name':self.device.name}],
                'image_urls':['https://supplier.example/product.jpg'],'api_key':'redact-me'})

    def list(self, **params):
        return self.client.get(self.base+'vendor-audit/',{'vendor':str(self.vendor.pk),**params})

    def test_vendor_audit_list_admin_only(self):
        product = self.product()
        self.client.force_authenticate(self.regular)
        for method,url,body in [
            ('get',self.base+'vendor-audit/',{'vendor':str(self.vendor.pk)}),
            ('get',self.base+'vendor-audit-stats/',{'vendor':str(self.vendor.pk)}),
            ('post',self.base+str(product.pk)+'/map-devices/',{'device_ids':[str(self.device.pk)]}),
            ('post',self.base+str(product.pk)+'/resolve-review/',{}),
            ('post',self.base+'bulk-map-devices/',{'product_ids':[str(product.pk)],'device_ids':[]}),
            ('post',self.base+'bulk-resolve-review/',{'product_ids':[str(product.pk)]})]:
            response = getattr(self.client,method)(url,body,format='json')
            self.assertEqual(response.status_code,403,(url,response.data))

    def test_vendor_audit_list_returns_payload(self):
        product = self.product()
        self.source(product)
        response = self.list()
        self.assertEqual(response.status_code,200,response.data)
        row = response.data['results'][0]
        self.assertEqual(row['vendor_payload']['name'],'Provider item')
        self.assertEqual(row['vendor_payload']['api_key'],'[REDACTED]')
        self.assertEqual(row['payload_category'],'Phone Cases')
        self.assertEqual(row['payload_devices'][0]['name'],self.device.name)
        self.assertEqual(row['payload_images'],['https://supplier.example/product.jpg'])
        self.assertEqual(row['audit_status'],'review')

    def test_vendor_audit_stats(self):
        product = self.product()
        self.source(product)
        response = self.client.get(self.base+'vendor-audit-stats/',{'vendor':str(self.vendor.pk)})
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['total'],1)
        self.assertEqual(response.data['unmapped'],1)
        self.assertEqual(response.data['mapped'],0)
        self.assertEqual(response.data['review_required'],1)
        self.assertEqual(response.data['no_image'],1)

    def test_map_devices(self):
        product = self.product()
        response = self.client.post(self.base+str(product.pk)+'/map-devices/',
            {'device_ids':[str(self.device.pk)],'update_type':'replace'},format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['device_count'],1)
        self.assertTrue(product.compatibility_assertions.filter(device_reference=self.device.pk,is_compatible=True).exists())
        self.assertTrue(AuditRecord.objects.filter(event_code='catalog.vendor_audit.devices_mapped',source_record_id=product.pk).exists())

    def test_bulk_map_devices(self):
        products = [self.product('BULK-1'),self.product('BULK-2')]
        response = self.client.post(self.base+'bulk-map-devices/',{'product_ids':[str(p.pk) for p in products],
            'device_ids':[str(self.device.pk)],'update_type':'add'},format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['updated'],2)
        self.assertEqual(ProductCompatibilityAssertion.objects.filter(is_compatible=True).count(),2)

    def test_resolve_review(self):
        product = self.product()
        source = self.source(product)
        response = self.client.post(self.base+str(product.pk)+'/resolve-review/',{},format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['cleared'],1)
        source.refresh_from_db()
        self.assertFalse(source.review_required)
        self.assertEqual(source.review_errors,[])
        record = AuditRecord.objects.get(event_code='catalog.vendor_audit.review_resolved')
        self.assertIn('COMPATIBILITY_REVIEW_REQUIRED',record.event_description)
        self.assertNotIn('redact-me',record.event_description)

    def test_bulk_resolve_review(self):
        products = [self.product('CLEAR-1'),self.product('CLEAR-2')]
        for product in products:
            self.source(product)
        response = self.client.post(self.base+'bulk-resolve-review/',{'product_ids':[str(p.pk) for p in products]},format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['cleared'],2)
        self.assertFalse(VendorCatalogItem.objects.filter(review_required=True).exists())
        self.assertEqual(AuditRecord.objects.filter(event_code='catalog.vendor_audit.review_resolved').count(),2)

    def test_audit_status_filter(self):
        review = self.product('REVIEW');self.source(review)
        no_devices = self.product('NO-DEVICES')
        no_image = self.product('NO-IMAGE')
        ok = self.product('OK',primary_image_reference=uuid.uuid4())
        for product in (no_image,ok):
            update_explicit_selections(product,[str(self.device.pk)],self.admin,vendor_import=True)
        for status,product in [('review',review),('no_devices',no_devices),('no_image',no_image),('ok',ok)]:
            response = self.list(audit_status=status,page_size=1)
            self.assertEqual(response.status_code,200,response.data)
            self.assertEqual(response.data['count'],1)
            self.assertEqual(response.data['results'][0]['id'],str(product.pk))

    def test_invalid_ids_and_request_limits_are_400(self):
        self.assertEqual(self.client.get(self.base+'vendor-audit/').status_code,400)
        self.assertEqual(self.list(vendor='bad-id').status_code,400)
        self.assertEqual(self.list(brand='bad-id').status_code,400)
        self.assertEqual(self.list(audit_status='invented').status_code,400)
        product = self.product()
        self.assertEqual(self.client.post(self.base+'bulk-map-devices/',{'product_ids':[str(product.pk)]*51,'device_ids':[]},format='json').status_code,400)
        self.assertEqual(self.client.post(self.base+'bulk-resolve-review/',{'product_ids':[str(product.pk)]*201},format='json').status_code,400)
        response = self.client.post(self.base+str(product.pk)+'/map-devices/',{'device_ids':['bad-id']},format='json')
        self.assertEqual(response.status_code,400)

    def test_vendor_filter_does_not_leak_other_vendor_sources(self):
        other = Company.objects.create(name='Other Vendor',slug='other-audit',company_type='vendor',status='active')
        self.product('FOREIGN',vendor_company_reference=other.pk,company_scope_reference=other.pk)
        own = self.product();self.source(own)
        response = self.list()
        self.assertEqual(response.data['count'],1)
        self.assertEqual(response.data['results'][0]['id'],str(own.pk))

    def test_bulk_mapping_reports_missing_product_instead_of_silently_skipping(self):
        product = self.product()
        response = self.client.post(self.base+'bulk-map-devices/',{'product_ids':[str(product.pk),str(uuid.uuid4())],
            'device_ids':[str(self.device.pk)]},format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['status'],'partial')
        self.assertEqual(response.data['updated'],1)
        self.assertEqual(len(response.data['failures']),1)

    def test_mapping_preserves_exclusions_and_locks(self):
        product = self.product()
        ProductCompatibilityAssertion.objects.create(product=product,device_reference=self.device.pk,
            vendor_company_reference=self.vendor.pk,sku=product.sku,is_compatible=False,is_excluded=True,
            is_locked=True,exclusion_type='admin',match_status='Excluded',compatibility_basis='review_required')
        response = self.client.post(self.base+str(product.pk)+'/map-devices/',{'device_ids':[str(self.device.pk)]},format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['unapplied_device_ids'],[str(self.device.pk)])
        row = product.compatibility_assertions.get()
        self.assertTrue(row.is_excluded and row.is_locked)

    @patch('apps.integration.catalog_sync.publish_job')
    @patch('apps.integration.catalog_sync.fetch_json')
    def test_sync_review_notifies_only_active_admins(self,fetch,publish):
        inactive = User.objects.create_superuser(email='inactive@cixci.test',password='test-only')
        inactive.is_active=False;inactive.save(update_fields=['is_active'])
        fetch.return_value={'success':True,'data':{'items':[{'sku':'NEEDS-REVIEW','name':'Review item',
            'brand':'Audit Brand','category':'Phone Cases','launch_date':'2026-01-01',
            'msrp_cents':3000,'unit_price_cents':500}],'next_cursor':None}}
        run = request_sync(self.connection,self.admin)
        process_sync_page(run.pk)
        messages = InAppNotification.objects.filter(event_type='integration.vendor_catalog.review_required')
        self.assertEqual(messages.count(),1)
        message = messages.get()
        self.assertEqual(message.recipient,self.admin)
        self.assertEqual(message.link,f'/catalog?tab=vendor-audit&vendor={self.vendor.pk}')
        process_sync_page(run.pk)
        self.assertEqual(messages.count(),1)
