"""Approved declaration migration and ordinary Universal engine behavior."""
import importlib
from types import SimpleNamespace
import pytest
from django.apps import apps
from django.utils import timezone
from apps.catalog.models import DynamicDropdownConfig, Product, ProductCompatibilityAssertion
from apps.catalog.compatibility_commands import apply_mapping_control
from apps.catalog.compatibility_engine import reconcile_product_compatibility
from apps.devices.models import DeviceType, Device, Manufacturer
from apps.tenant.models import Company

pytestmark = pytest.mark.django_db


def test_approved_speaker_migration_declares_scope_without_guessing_other_offers(admin_user):
    migration = importlib.import_module("apps.catalog.migrations.0032_approved_speaker_universal_scope")
    kinds = [DeviceType.objects.create(code=code, name=code.title(), status="active") for code in migration.APPROVED_TYPES]
    maker = Manufacturer.objects.create(name="Universal Matrix Maker")
    devices = [Device.objects.create(name=f"Declared {kind.code}", device_type=kind, manufacturer=maker, launch_date=timezone.localdate()) for kind in kinds]
    supplier = Company.objects.create(id=migration.APPROVED_SUPPLIER, name="Approved declaration supplier", company_type="vendor", status="active", slug="approved-declaration-supplier")
    config, _ = DynamicDropdownConfig.objects.update_or_create(field_name="product_category", value="Speakers", defaults={
        "status": "active", "compatibility_mode": "feature_based", "eligible_device_types": [str(kind.id) for kind in kinds],
        "accessory_fields": ["bluetooth_compatibility"], "compatibility_rules": {"bluetooth_compatibility": {"mode": "required", "comparison": "is_true"}},
    })
    product = Product.objects.create(id=migration.APPROVED_PRODUCT, sku="APPROVED-DECLARATION", name="Declared speaker", product_category=config.value,
        bluetooth_compatibility="No", company_scope_reference=supplier.id, vendor_company_reference=supplier.id, launch_date=timezone.localdate())
    other = Product.objects.create(sku="NO-DECLARATION", name="Another speaker", product_category=config.value,
        bluetooth_compatibility="No", company_scope_reference=supplier.id, vendor_company_reference=supplier.id, launch_date=timezone.localdate())
    apply_mapping_control(product, admin_user, "exclude", devices[0].id, reason="physical_mismatch")
    original_id = ProductCompatibilityAssertion.objects.get(product=product, device_reference=devices[0].id).id
    migration.configure(apps, SimpleNamespace(connection=SimpleNamespace(alias="default")))
    product.refresh_from_db(); other.refresh_from_db(); config.refresh_from_db()
    assert config.compatibility_mode == "universal"
    assert product.compatibility_mode == "universal_device_type" and product.bluetooth_compatibility == "No"
    assert set(product.universal_type_scopes.values_list("device_type_id", flat=True)) == {kind.id for kind in kinds}
    assert other.compatibility_mode == "direct_device" and other.compatible_device_types == [] and other.compatibility_status == "incomplete"
    reconcile_product_compatibility(product, admin_user.id)
    assert set(product.compatibility_assertions.filter(is_compatible=True).values_list("device_reference", flat=True)) == {device.id for device in devices[1:]}
    excluded = ProductCompatibilityAssertion.objects.get(pk=original_id)
    assert excluded.is_excluded and not excluded.is_compatible
    new_phone = Device.objects.create(name="Future newly registered phone", device_type=kinds[0], manufacturer=maker, launch_date=timezone.localdate())
    assert product.compatibility_assertions.get(device_reference=new_phone.id).is_compatible
    assert not product.compatibility_assertions.get(device_reference=devices[0].id).is_compatible
    assert reconcile_product_compatibility(product, admin_user.id) == 0
