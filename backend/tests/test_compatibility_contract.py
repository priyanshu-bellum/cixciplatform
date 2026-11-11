"""Regressions traced to the November category/value/flow and Universal docs."""
from datetime import timedelta
from decimal import Decimal
import uuid

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.catalog.models import DynamicDropdownConfig, Product, ProductCompatibilityAssertion
from apps.catalog.compatibility_contract import capacity_in_gb, resolve_device_types, validate_product_scope
from apps.catalog.compatibility_values import normalized_wireless, validate_compatibility_values
from apps.catalog.compatibility_engine import run_device_remapping, run_universal_device_type_mapping, reconcile_product_compatibility
from apps.devices.models import Device, DeviceType, Manufacturer

pytestmark = pytest.mark.django_db


@pytest.fixture
def contract_data():
    types = {code: DeviceType.objects.create(name=code.title(), code=code, status="active") for code in ("phone", "tablet", "smartwatch")}
    manufacturer = Manufacturer.objects.create(name="Contract Manufacturer")
    for category, mode in (("Exact Contract", "device_specific"), ("Universal Contract", "universal"), ("Hybrid Contract", "hybrid")):
        DynamicDropdownConfig.objects.create(
            field_name="product_category", value=category, display_name=category,
            status="active", compatibility_mode=mode, eligible_device_types=["phone", "tablet"],
            accessory_fields=["bluetooth_compatibility"] if mode == "hybrid" else [],
            compatibility_rules={"bluetooth_compatibility": {"mode": "optional", "comparison": "is_true"}} if mode == "hybrid" else {},
        )
    return types, manufacturer


def make_device(data, name, code="phone", **kwargs):
    types, manufacturer = data
    return Device.objects.create(name=name, device_type=types[code], manufacturer=manufacturer, lifecycle_status="available", launch_date=timezone.localdate(), **kwargs)


def make_product(category="Exact Contract", **kwargs):
    vendor = uuid.uuid4()
    kwargs.setdefault("launch_date", timezone.localdate())
    return Product.objects.create(sku=uuid.uuid4().hex[:16], name="Compatibility Contract Product", product_category=category, company_scope_reference=vendor, vendor_company_reference=vendor, **kwargs)


def test_type_ids_aliases_and_duplicates_resolve_to_one_identity(contract_data):
    phone = contract_data[0]["phone"]
    assert [record.id for record in resolve_device_types([str(phone.id), "Phone", " smartphone "])] == [phone.id]


@pytest.mark.parametrize("values", [["Universal"], ["phone", "iPhone 16 Plus"], ["Everything"], "phone", [None]])
def test_invalid_or_mixed_type_scope_rejected(contract_data, values):
    with pytest.raises(ValidationError):
        resolve_device_types(values)


def test_direct_and_universal_category_methods_cannot_conflict(contract_data):
    product = Product(product_category="Exact Contract", compatibility_mode="universal_device_type", compatible_device_types=["phone"])
    with pytest.raises(ValidationError, match="category"):
        validate_product_scope(product)


def test_negative_required_answer_is_valid_but_missing_answer_is_not(contract_data):
    fields = ["bluetooth_compatibility"]
    rules = {"bluetooth_compatibility": {"mode": "required", "comparison": "is_true"}}
    assert validate_compatibility_values({"bluetooth_compatibility": "No"}, rules=rules, assigned_fields=fields)["bluetooth_compatibility"] == "No"
    with pytest.raises(ValidationError):
        validate_compatibility_values({}, rules=rules, assigned_fields=fields)


def test_saved_wireless_policy_overrides_legacy_restrictions():
    with pytest.raises(ValidationError):
        normalized_wireless("Qi+Qi2")
    DynamicDropdownConfig.objects.create(field_name="wireless_combination_policy", value="global", display_name="Wireless Policy", status="active", compatibility_rules={"allowed_combinations": [["Qi", "Qi2"]], "prohibited_combinations": []})
    assert set(normalized_wireless("Qi2, Qi").split("+")) == {"Qi", "Qi2"}
    with pytest.raises(ValidationError):
        normalized_wireless("Qi+Not Compatible")


def test_tablet_cannot_smuggle_wireless_evidence_through_a_hidden_field(contract_data):
    with pytest.raises(ValidationError):
        validate_compatibility_values({"wireless_charging_compatibility": "Qi"}, device_type=contract_data[0]["tablet"], rules={"wireless_charging_type": {"mode": "hidden"}})


def test_capacity_comparison_is_numeric_and_strict():
    assert capacity_in_gb("1 TB") == Decimal(1024)
    assert capacity_in_gb("512MB") == Decimal("0.5")
    for bad in ("256GB garbage", "NaN", "-1GB", "0GB", "Infinity"):
        assert capacity_in_gb(bad) is None


def test_direct_case_never_inherits_new_phones_through_universal_entrypoint(contract_data):
    exact = make_device(contract_data, "Exact Phone")
    product = make_product()
    ProductCompatibilityAssertion.objects.create(product=product, device_reference=exact.id, is_compatible=True, compatibility_basis="manufacturer_assertion")
    # Simulate legacy corruption without passing through the guarded save path.
    Product.objects.filter(pk=product.pk).update(compatible_device_types=["phone", "tablet"])
    product.refresh_from_db()
    other = make_device(contract_data, "Unrelated New Phone")
    run_universal_device_type_mapping(product)
    run_device_remapping(other)
    assert list(ProductCompatibilityAssertion.objects.filter(product=product, is_compatible=True).values_list("device_reference", flat=True)) == [exact.id]


def test_universal_scope_uses_ids_after_a_display_label_rename(contract_data):
    phone = make_device(contract_data, "Canonical Phone")
    product = make_product("Universal Contract", compatibility_mode="universal_device_type", compatible_device_types=["phone"])
    kind = contract_data[0]["phone"]
    DeviceType.objects.filter(pk=kind.pk).update(name="Renamed Phone Display")
    run_universal_device_type_mapping(product)
    assert list(product.universal_type_scopes.filter(is_active=True).values_list("device_type_id", flat=True)) == [kind.id]
    assert ProductCompatibilityAssertion.objects.get(product=product, device_reference=phone.id).is_compatible


def test_reverse_type_change_archives_the_same_row_instead_of_deleting_history(contract_data):
    phone = make_device(contract_data, "Changes To Tablet")
    product = make_product("Universal Contract", compatibility_mode="universal_device_type", compatible_device_types=["phone"])
    original = ProductCompatibilityAssertion.objects.get(product=product, device_reference=phone.id)
    phone.device_type = contract_data[0]["tablet"]
    phone.save()
    original.refresh_from_db()
    assert not original.is_compatible
    assert original.match_status == "Archived"
    assert original.match_evidence["universal"]["active"] is False


def test_future_universal_mapping_does_not_make_product_currently_ready(contract_data):
    future = make_device(contract_data, "Future Phone")
    future.launch_date = timezone.localdate() + timedelta(days=30)
    future.save()
    product = make_product("Universal Contract", compatibility_mode="universal_device_type", compatible_device_types=["phone"])
    product.refresh_from_db()
    assert product.compatibility_status == "incomplete"
    assert not ProductCompatibilityAssertion.objects.filter(product=product, is_compatible=True).exists()


def test_hybrid_retains_explicit_evidence_when_feature_basis_disappears(contract_data):
    phone = make_device(contract_data, "Hybrid Phone", bluetooth_compatibility="Yes")
    product = make_product("Hybrid Contract", bluetooth_compatibility="Yes")
    assertion = ProductCompatibilityAssertion.objects.get(product=product, device_reference=phone.id)
    assertion.compatibility_basis = "manufacturer_assertion"
    assertion.save()
    product.bluetooth_compatibility = "No"
    product.save()
    assertion.refresh_from_db()
    assert assertion.is_compatible
    assert assertion.match_evidence["explicit"]["active"] is True
    assert assertion.match_evidence["feature"]["active"] is False


def test_exclusion_survives_hybrid_reconciliation(contract_data):
    phone = make_device(contract_data, "Excluded Hybrid Phone", bluetooth_compatibility="Yes")
    product = make_product("Hybrid Contract", bluetooth_compatibility="Yes")
    assertion = ProductCompatibilityAssertion.objects.get(product=product, device_reference=phone.id)
    assertion.is_excluded = True
    assertion.exclusion_type = "vendor"
    assertion.exclusion_reason = "physical_mismatch"
    assertion.save()
    reconcile_product_compatibility(product)
    assertion.refresh_from_db()
    assert assertion.is_excluded and not assertion.is_compatible
    assert ProductCompatibilityAssertion.objects.filter(product=product, device_reference=phone.id).count() == 1
