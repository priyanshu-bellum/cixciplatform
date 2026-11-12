"""Configuration Save must reconcile once without nested Buyer-wide refreshes."""
import uuid
from datetime import timedelta
import pytest
from django.utils import timezone
from apps.catalog.models import Product, DynamicDropdownConfig, BuyerScopedCompatibilityProjection
from apps.devices.models import DeviceType, Device, Manufacturer

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('existing_policy', [False, True])
def test_wireless_policy_create_and_update_apply_without_per_product_buyer_refresh(existing_policy, admin_client, vendor_company, buyer_user, monkeypatch):
    kind=DeviceType.objects.create(name='Phone',code='phone',status='active')
    Device.objects.create(name='Wireless save test',manufacturer=Manufacturer.objects.create(name='Wireless save maker'),device_type=kind,wireless_charging_compatibility='Qi2')
    config=DynamicDropdownConfig.objects.create(field_name='product_category',value='Wireless Save Category',status='active',compatibility_mode='feature_based',eligible_device_types=[str(kind.id)],accessory_fields=['wireless_charging_compatibility'],compatibility_rules={'wireless_charging_compatibility':{'mode':'optional','comparison':'intersects'}})
    policy=None
    if existing_policy:
        policy=DynamicDropdownConfig.objects.create(field_name='wireless_combination_policy',value='global',status='active',compatibility_rules={'allowed_combinations':[],'prohibited_combinations':[]})
    products=[Product.objects.create(name='Wireless save product',sku=f'WIRELESS-SAVE-{index}',product_type='accessory',product_category=config.value,wireless_charging_compatibility='MagSafe+Qi2',launch_date=timezone.localdate()-timedelta(days=1),vendor_company_reference=vendor_company.id,company_scope_reference=vendor_company.id) for index in range(2)]
    assert all(product.compatibility_assertions.filter(is_compatible=True).exists() for product in products)
    projection=BuyerScopedCompatibilityProjection.objects.create(buyer_reference=buyer_user.id,company_scope_reference=buyer_user.company.id,buyer_entity_reference=buyer_user.entity_id,portfolio_snapshot_reference=uuid.uuid4(),status='active',compatible_product_ids=[str(product.id) for product in products])
    calls=[]
    monkeypatch.setattr('apps.catalog.services.trigger_catalog_recalculation_for_product',lambda *args,**kwargs:calls.append(args))
    payload={'field_name':'wireless_combination_policy','value':'global','display_name':'Wireless policy','status':'active','compatibility_rules':{'allowed_combinations':[],'prohibited_combinations':[['MagSafe','Qi2']]}}
    response=admin_client.patch(f'/api/v1/catalog/dropdown-configs/{policy.id}/',payload,format='json') if policy else admin_client.post('/api/v1/catalog/dropdown-configs/',payload,format='json')
    assert response.status_code in (200,201),response.data
    assert not any(product.compatibility_assertions.filter(is_compatible=True).exists() for product in products)
    assert calls == [], 'Save must not recalculate every Buyer projection separately for each affected Product.'
    projection.refresh_from_db(); assert projection.status == 'review_required'
