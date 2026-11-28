"""A Device Type an admin activates (e.g. Laptop) takes part in compatibility without a
code change; activating it never widens existing products or a provider's "Universal"."""
from datetime import date
from decimal import Decimal

import pytest

from apps.catalog.compatibility_contract import eligible_devices, resolve_device_types
from apps.catalog.models import DynamicDropdownConfig, Product
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.integration.catalog_compatibility import CatalogDeviceResolver
from django.core.exceptions import ValidationError

pytestmark = pytest.mark.django_db

OPTIONS = "/api/v1/catalog/dropdown-configs/compatibility-options/"
CATEGORY = "Activation Test Chargers"


@pytest.fixture
def phone():
    return DeviceType.objects.update_or_create(code="phone", defaults={"name": "Phone", "status": "active", "is_active": True})[0]


@pytest.fixture
def laptop():
    return DeviceType.objects.update_or_create(code="laptop", defaults={"name": "Laptop", "status": "setup_required", "is_active": True})[0]


@pytest.fixture
def maker():
    return Manufacturer.objects.create(name="Activation Maker")


def activate(kind):
    kind.status = "active"
    kind.save()
    return kind


def device(maker, kind, name, **fields):
    return Device.objects.create(name=name, manufacturer=maker, device_type=kind, lifecycle_status="available",
        launch_date=date(2026, 1, 1), **fields)


def category(*kinds, mode="feature_based"):
    return DynamicDropdownConfig.objects.create(field_name="product_category", value=CATEGORY, status="active",
        compatibility_mode=mode, match_logic="OR", eligible_device_types=[str(kind.pk) for kind in kinds],
        accessory_fields=["compatible_charging_interface"],
        compatibility_rules={"compatible_charging_interface": {"mode": "optional", "comparison": "equals"},
            "_eligible_type_ids": [str(kind.pk) for kind in kinds]})


def product(vendor_company, sku="ACT-1", **changes):
    values = dict(name="Activation item " + sku, sku=sku, vendor_company_reference=vendor_company.id,
        company_scope_reference=vendor_company.id, product_type="accessory", product_category=CATEGORY,
        launch_date="2026-01-01", status="draft", msrp=Decimal("30"), vendor_wholesale_price_amount=Decimal("5"),
        compatibility_mode="direct_device")
    values.update(changes)
    return Product.objects.create(**values)


def compatible(item):
    return set(item.compatibility_assertions.filter(is_compatible=True, is_excluded=False).values_list("device_reference", flat=True))


def test_a_type_is_offered_only_after_an_admin_activates_it(admin_client, phone, laptop):
    codes = lambda: {row["code"] for row in admin_client.get(OPTIONS).data["device_types"]}
    assert "phone" in codes() and "laptop" not in codes()
    with pytest.raises(ValidationError):
        resolve_device_types([str(laptop.pk)])
    activate(laptop)
    assert "laptop" in codes()
    assert resolve_device_types([str(laptop.pk)]) == [laptop]


def test_activated_type_matches_once_a_category_lists_it(vendor_company, phone, laptop, maker):
    activate(laptop)
    handset = device(maker, phone, "Type-C Phone", compatible_charging_interface="Type-C")
    notebook = device(maker, laptop, "Type-C Laptop", compatible_charging_interface="Type-C")
    config = category(phone)
    item = product(vendor_company, compatible_charging_interface="Type-C")
    # Active but not listed by the category: still not matched.
    assert compatible(item) == {handset.pk}
    assert notebook.pk in set(eligible_devices().values_list("pk", flat=True))
    config.eligible_device_types = [str(phone.pk), str(laptop.pk)]
    config.compatibility_rules = {**config.compatibility_rules, "_eligible_type_ids": [str(phone.pk), str(laptop.pk)]}
    config.save()
    from apps.catalog.compatibility_engine import reconcile_product_compatibility
    reconcile_product_compatibility(item)
    assert compatible(item) == {handset.pk, notebook.pk}


def test_activated_type_can_be_selected_as_category_scope_and_explicit_model(admin_client, vendor_company, phone, laptop, maker):
    activate(laptop)
    notebook = device(maker, laptop, "Explicit Laptop")
    response = admin_client.post("/api/v1/catalog/dropdown-configs/", {"field_name": "product_category", "value": CATEGORY,
        "status": "active", "compatibility_mode": "device_specific", "eligible_device_types": [str(laptop.pk)],
        "accessory_fields": [], "compatibility_rules": {}}, format="json")
    assert response.status_code == 201, response.data
    item = product(vendor_company)
    response = admin_client.post(f"/api/v1/catalog/products/{item.pk}/map-devices/", {"device_ids": [str(notebook.pk)], "update_type": "replace"}, format="json")
    assert response.status_code == 200, response.data
    assert compatible(item) == {notebook.pk}


def test_setup_required_type_stays_out_even_when_a_category_lists_it(vendor_company, phone, laptop, maker):
    notebook = device(maker, laptop, "Pending Laptop", compatible_charging_interface="Type-C")
    category(phone, laptop)
    item = product(vendor_company, compatible_charging_interface="Type-C")
    assert notebook.pk not in compatible(item)
    assert notebook.pk not in set(eligible_devices().values_list("pk", flat=True))


def test_new_type_does_not_widen_existing_universal_products_or_provider_universal(vendor_company, phone, laptop, maker):
    handset = device(maker, phone, "Universal Phone")
    category(phone, mode="universal")
    item = product(vendor_company, compatibility_mode="universal_device_type", compatible_device_types=[str(phone.pk)])
    assert compatible(item) == {handset.pk}
    activate(laptop)
    notebook = device(maker, laptop, "Later Laptop")
    assert compatible(item) == {handset.pk}
    # A provider's bare "Universal" keeps its original three-type meaning.
    resolved = CatalogDeviceResolver({"compatibility": {}}).declaration("Universal", category=CATEGORY)
    assert str(phone.pk) in resolved and str(laptop.pk) not in resolved and str(notebook.pk) not in resolved
