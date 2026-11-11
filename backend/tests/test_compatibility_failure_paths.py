"""Destructive attempts run only inside the isolated pytest database."""
import uuid
import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from apps.catalog.models import Product, ProductCompatibilityAssertion, DynamicDropdownConfig
from apps.catalog.compatibility_commands import update_explicit_selections, apply_mapping_control
from apps.catalog.compatibility_engine import reconcile_product_compatibility
from apps.devices.models import DeviceType, Device, Manufacturer

pytestmark = pytest.mark.django_db


@pytest.fixture
def universal_pair(vendor_user):
    kind = DeviceType.objects.create(name="Phone", code="phone", status="active")
    maker = Manufacturer.objects.create(name="Failure Path Maker")
    devices = [Device.objects.create(name=f"Failure Path Device {index}", device_type=kind, manufacturer=maker) for index in (1, 2)]
    config = DynamicDropdownConfig.objects.create(field_name="product_category", value="Failure Universal", status="active", compatibility_mode="universal", eligible_device_types=[str(kind.id)])
    product = Product.objects.create(name="Failure Universal Product", sku=uuid.uuid4().hex, launch_date=timezone.localdate(), status="active", product_category=config.value,
        company_scope_reference=vendor_user.company.id, vendor_company_reference=vendor_user.company.id, compatibility_mode="universal_device_type", compatible_device_types=[str(kind.id)])
    return product, devices


def test_vendor_remove_records_exclusion_and_remap_cannot_restore(universal_pair, vendor_user):
    product, devices = universal_pair
    update_explicit_selections(product, [{"device_id": str(devices[0].id), "exclusion_reason": "physical_mismatch"}], vendor_user, update_type="remove")
    row = ProductCompatibilityAssertion.objects.get(product=product, device_reference=devices[0].id)
    assert row.is_excluded and row.exclusion_type == "vendor" and not row.is_compatible
    reconcile_product_compatibility(product)
    row.refresh_from_db()
    assert row.is_excluded and not row.is_compatible
    assert ProductCompatibilityAssertion.objects.get(product=product, device_reference=devices[1].id).is_compatible


def test_locked_mapping_rejects_entire_batch_of_vendor_removals(universal_pair, vendor_user, admin_user):
    product, devices = universal_pair
    apply_mapping_control(product, admin_user, "lock", devices[1].id)
    with pytest.raises(PermissionDenied):
        update_explicit_selections(product, [{"device_id": str(device.id), "exclusion_reason": "physical_mismatch"} for device in devices], vendor_user, update_type="remove")
    assert product.compatibility_assertions.filter(is_compatible=True, is_excluded=False).count() == 2


def test_live_vendor_replacement_requires_admin_while_add_and_exclusion_are_available(universal_pair, vendor_user):
    product, _ = universal_pair
    with pytest.raises(ValidationError, match="Admin approval"):
        update_explicit_selections(product, [], vendor_user, update_type="replace")
    assert product.compatibility_assertions.filter(is_compatible=True).count() == 2


@pytest.mark.parametrize("code", ["phone", "tablet", "smartwatch"])
def test_audit_failure_rolls_back_product_scope_and_mapping(code, vendor_company, monkeypatch):
    kind = DeviceType.objects.create(name=code.title(), code=code, status="active")
    maker = Manufacturer.objects.create(name="Atomic Audit Maker")
    Device.objects.create(name="Atomic Audit Device", manufacturer=maker, device_type=kind)
    category = DynamicDropdownConfig.objects.create(field_name="product_category", value="Atomic Universal", status="active", compatibility_mode="universal", eligible_device_types=[str(kind.id)])
    from apps.catalog import compatibility_engine
    def audit_unavailable(*args, **kwargs):
        raise RuntimeError("Audit unavailable")
    monkeypatch.setattr(compatibility_engine, "log_compatibility_change", audit_unavailable)
    with pytest.raises(RuntimeError):
        Product.objects.create(name="Atomic Audit Product", sku="AUDIT-ROLLBACK", launch_date=timezone.localdate(), product_category=category.value,
            company_scope_reference=vendor_company.id, vendor_company_reference=vendor_company.id, compatibility_mode="universal_device_type", compatible_device_types=[str(kind.id)])
    assert not Product.objects.filter(sku="AUDIT-ROLLBACK").exists()
    assert not ProductCompatibilityAssertion.objects.exists()
