"""A category supplies matching rules, never an undeclared Universal scope."""
from datetime import timedelta

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.catalog.models import DynamicDropdownConfig, Product
from apps.devices.models import Device, DeviceType, Manufacturer

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('method', ['device_specific', 'feature_based', 'hybrid', 'universal'])
def test_category_matching_without_explicit_devices_preserves_scope_authority(method, vendor_company):
    kinds = [DeviceType.objects.create(name=code.title(), code=code, status='active')
             for code in ('phone', 'tablet', 'smartwatch')]
    maker = Manufacturer.objects.create(name='Category fallback maker')
    devices = [Device.objects.create(name=kind.code, manufacturer=maker,
               device_type=kind, bluetooth_compatibility='Yes') for kind in kinds]
    category = DynamicDropdownConfig.objects.create(
        field_name='product_category', value='Configured ' + method, status='active',
        compatibility_mode=method, eligible_device_types=[str(kind.id) for kind in kinds],
        accessory_fields=['bluetooth_compatibility'],
        compatibility_rules={'bluetooth_compatibility': {'mode': 'optional', 'comparison': 'is_true'}})
    product = Product(
        name='No explicit models', sku='NO-MODELS-' + method, product_type='accessory',
        product_category=category.value, bluetooth_compatibility='Yes',
        launch_date=timezone.localdate() - timedelta(days=1),
        vendor_company_reference=vendor_company.id, company_scope_reference=vendor_company.id)
    if method == 'universal':
        with pytest.raises(ValidationError, match='declared type scope'):
            product.save()
        assert not Product.objects.filter(pk=product.pk).exists()
        return
    product.save()
    mapped = set(product.compatibility_assertions.filter(is_compatible=True).values_list('device_reference', flat=True))
    assert mapped == ({device.id for device in devices} if method in ('feature_based', 'hybrid') else set())
    assert not product.universal_type_scopes.filter(is_active=True).exists()
    product.refresh_from_db()
    assert product.compatibility_mode == 'direct_device' and product.compatible_device_types == []
