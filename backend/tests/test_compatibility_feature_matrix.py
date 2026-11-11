"""Category field comparisons across every currently approved device type."""
import importlib
from types import SimpleNamespace
import uuid
import pytest
from django.apps import apps
from django.core.management import call_command
from django.utils import timezone
from apps.catalog.models import Product, DynamicDropdownConfig, ProductCompatibilityAssertion
from apps.catalog.compatibility_engine import check_compatibility, run_device_remapping
from apps.devices.models import DeviceType, Manufacturer, Device

pytestmark = pytest.mark.django_db

SCENARIOS = [
    ("Wired Audio", {"headphone_jack_compatibility": "3.5mm"}, {"headphone_jack_compatibility": "3.5mm"}, ["phone", "tablet"]),
    ("Wired Charging", {"compatible_charging_interface": "Micro-USB"}, {"compatible_charging_interface": "Micro-USB"}, ["phone", "tablet"]),
    ("Bluetooth Audio", {"bluetooth_compatibility": "Yes"}, {"bluetooth_compatibility": "Yes"}, ["phone", "tablet"]),
    ("Memory Numeric", {"storage_expansion_compatibility": "microSDXC", "memory_capacity": "256GB"}, {"storage_expansion_compatibility": "microSDXC", "maximum_supported_storage": "512GB"}, ["phone", "tablet"]),
    ("Watch Size", {"compatible_watch_case_size": "45mm"}, {"compatible_watch_case_size": "45mm"}, ["smartwatch"]),
    ("Wireless Charging", {"wireless_charging_compatibility": "Qi2"}, {"wireless_charging_compatibility": "Qi2"}, ["phone", "smartwatch"]),
]


@pytest.mark.parametrize("code", ["phone", "tablet", "smartwatch"])
@pytest.mark.parametrize("negative", [False, True])
@pytest.mark.parametrize("scenario,product_values,device_values,eligible", SCENARIOS, ids=[item[0] for item in SCENARIOS])
def test_feature_comparison_matrix(code, negative, scenario, product_values, device_values, eligible):
    from apps.catalog.compatibility_contract import FIELD_OPERATIONS
    kinds = {name: DeviceType.objects.create(name=name.title(), code=name, status="active") for name in ("phone", "tablet", "smartwatch")}
    maker = Manufacturer.objects.create(name="Feature Matrix Maker")
    evidence = dict(device_values)
    if code != "smartwatch":
        evidence.pop("compatible_watch_case_size", None)
    if code == "tablet":
        evidence.pop("wireless_charging_compatibility", None)
    device = Device.objects.create(name="Structured Test Device", manufacturer=maker, device_type=kinds[code], **evidence)
    category = "Matrix " + scenario
    rules = {field: {"mode": "required", "comparison": FIELD_OPERATIONS[field]} for field in product_values}
    DynamicDropdownConfig.objects.create(field_name="product_category", value=category, status="active", compatibility_mode="feature_based",
        eligible_device_types=[str(kinds[value].id) for value in eligible], match_logic="AND", accessory_fields=list(product_values), compatibility_rules=rules)
    values = {field: "No" if field == "bluetooth_compatibility" else "Not Compatible" for field in product_values} if negative else product_values
    vendor = uuid.uuid4()
    product = Product.objects.create(name="Names contain no compatibility truth", sku=uuid.uuid4().hex, product_category=category, launch_date=timezone.localdate(),
        company_scope_reference=vendor, vendor_company_reference=vendor, **values)
    expected = code in eligible and not negative
    assert check_compatibility(product, device) is expected
    assert product.compatibility_assertions.filter(is_compatible=True).exists() is expected


def test_reverse_remap_only_compares_the_changed_device(monkeypatch):
    kind = DeviceType.objects.create(name="Phone", code="phone", status="active")
    maker = Manufacturer.objects.create(name="Incremental Matrix Maker")
    devices = [Device.objects.create(name=f"Device {index}", manufacturer=maker, device_type=kind, bluetooth_compatibility="Yes") for index in range(25)]
    category = DynamicDropdownConfig.objects.create(field_name="product_category", value="Incremental Audio", status="active", compatibility_mode="feature_based", eligible_device_types=[str(kind.id)], accessory_fields=["bluetooth_compatibility"], compatibility_rules={"bluetooth_compatibility": {"mode": "required", "comparison": "is_true"}})
    vendor = uuid.uuid4()
    product = Product.objects.create(name="Incremental Product", sku="INCREMENTAL", launch_date=timezone.localdate(), product_category=category.value, bluetooth_compatibility="Yes", company_scope_reference=vendor, vendor_company_reference=vendor)
    untouched = dict(product.compatibility_assertions.exclude(device_reference=devices[0].id).values_list("id", "updated_at"))
    from apps.catalog import compatibility_engine as engine
    original = engine.check_compatibility
    compared = []
    def observed(product, device, **kwargs):
        compared.append(device.id)
        return original(product, device, **kwargs)
    monkeypatch.setattr(engine, "check_compatibility", observed)
    run_device_remapping(devices[0])
    assert compared == [devices[0].id]
    assert dict(product.compatibility_assertions.exclude(device_reference=devices[0].id).values_list("id", "updated_at")) == untouched


def test_approved_configuration_migration_and_read_only_rebuild_plan(capsys):
    kind = DeviceType.objects.create(name="Phone", code="phone", status="active", auto_mapping_eligible=False)
    memory, _ = DynamicDropdownConfig.objects.update_or_create(field_name="product_category", value="Memory", defaults={"status": "active", "accessory_fields": ["memory_capacity"], "match_logic": "OR", "compatibility_rules": {"memory_capacity": {"mode": "optional"}}})
    speaker, _ = DynamicDropdownConfig.objects.update_or_create(field_name="product_category", value="Speakers", defaults={"accessory_fields": ["compatible_charging_interface"], "compatibility_rules": {"compatible_charging_interface": {"mode": "required"}}})
    module = importlib.import_module("apps.catalog.migrations.0031_approved_automatic_mapping_configuration")
    module.configure(apps, SimpleNamespace(connection=SimpleNamespace(alias="default")))
    kind.refresh_from_db(); memory.refresh_from_db(); speaker.refresh_from_db()
    assert kind.auto_mapping_eligible
    assert memory.match_logic == "AND" and "storage_expansion_compatibility" in memory.accessory_fields
    assert speaker.compatibility_rules["compatible_charging_interface"]["comparison"] == "informational"
    before = ProductCompatibilityAssertion.objects.count()
    call_command("reconcile_compatibility", "--all")
    assert '"read_only": true' in capsys.readouterr().out
    assert ProductCompatibilityAssertion.objects.count() == before
