"""Manual and bulk supplier entries use the same approved Brand identity."""
import csv
import io
from datetime import timedelta

import pytest
from django.utils import timezone
from apps.catalog.models import Brand, VendorBrandRelationship, Product, DynamicDropdownConfig
from apps.devices.models import DeviceType

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('entry', ['json', 'csv'])
@pytest.mark.parametrize('approved', [True, False])
def test_supplier_brand_identity_is_consistent_across_manual_and_csv(entry, approved, vendor_user, vendor_client, buyer_company):
    brand = Brand.objects.create(name='Distributed Accessory Brand')
    VendorBrandRelationship.objects.create(vendor_company=vendor_user.company if approved else buyer_company,
        brand=brand, relationship_type='authorized_distributor')
    kind = DeviceType.objects.create(code='phone', name='Phone', status='active')
    category = DynamicDropdownConfig.objects.create(field_name='product_category', value='Supplier Brand Category', status='active',
        compatibility_mode='device_specific', eligible_device_types=[str(kind.id)])
    DynamicDropdownConfig.objects.create(field_name='brand', value=brand.name, status='active')
    launch = str(timezone.localdate() - timedelta(days=1))
    if entry == 'json':
        response = vendor_client.post('/api/v1/catalog/products/', {'name':'Supplier brand offer', 'sku':'BRAND-PARITY', 'upc':'123456789012',
            'brand':brand.name, 'product_type':'accessory', 'product_category':category.value,
            'launch_date':launch, 'status':'pending_review'}, format='json')
        assert response.status_code == (201 if approved else 400), response.data
    else:
        stream = io.StringIO(); writer = csv.writer(stream)
        writer.writerow(['SKU','Brand','Product Category','UPC','Launch Date','Vendor Wholesale Price','MSRP','Product Name','Product Description','Product Status','Inventory Level'])
        writer.writerow(['BRAND-PARITY',brand.name,category.value,'123456789012',launch,'10','30','Supplier brand offer','Description','Pending Review','10'])
        upload = io.BytesIO(stream.getvalue().encode()); upload.name='supplier-brand.csv'
        response = vendor_client.post('/api/v1/catalog/products/bulk_upload/', {'file':upload}, format='multipart')
        assert response.data['rows_failed'] == (0 if approved else 1), response.data
    if approved:
        product = Product.objects.get(sku='BRAND-PARITY')
        assert product.brand_reference_id == brand.id and product.brand == brand.name
        assert product.vendor_company_reference == vendor_user.company.id
    else:
        assert not Product.objects.filter(sku='BRAND-PARITY').exists()
