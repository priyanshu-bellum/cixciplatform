"""Universal belongs to the Product declaration, not its business category label."""
import csv
import io
import json
from datetime import timedelta

import pytest
from django.utils import timezone
from django.core.management import call_command
from apps.catalog.models import Product, DynamicDropdownConfig
from apps.devices.models import DeviceType, Manufacturer, Device

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("method", ["device_specific", "feature_based", "hybrid"])
@pytest.mark.parametrize("code", ["phone", "tablet", "smartwatch"])
@pytest.mark.parametrize("entry", ["json", "csv"])
def test_explicit_universal_scope_keeps_original_category(method, code, entry, vendor_client, vendor_user):
    kind = DeviceType.objects.create(name=code.title(), code=code, status="active")
    maker = Manufacturer.objects.create(name="Product scope maker")
    devices = [Device.objects.create(name=f"Scope model {index}", manufacturer=maker, device_type=kind) for index in (1, 2)]
    config = DynamicDropdownConfig.objects.create(field_name="product_category", value="Business Category", status="active", compatibility_mode=method, eligible_device_types=[str(kind.id)])
    launch = str(timezone.localdate() - timedelta(days=1))
    if entry == "json":
        response = vendor_client.post("/api/v1/catalog/products/", {"name": "Declared Universal accessory", "sku": "DECLARED-UNIVERSAL", "upc": "123456789012",
            "product_type": "accessory", "product_category": config.value, "status": "pending_review", "launch_date": launch,
            "compatibility_mode": "universal_device_type", "compatible_device_types": [str(kind.id)], "bluetooth_compatibility": "No"}, format="json")
        assert response.status_code == 201, response.data
    else:
        DynamicDropdownConfig.objects.get_or_create(field_name="brand", value=vendor_user.company.name, defaults={"status": "active"})
        stream = io.StringIO(); writer = csv.writer(stream)
        writer.writerow(["SKU","Brand","Product Category","UPC","Launch Date","Vendor Wholesale Price","MSRP","Product Name","Product Description","Product Status","Device Compatibility","Inventory Level"])
        writer.writerow(["DECLARED-UNIVERSAL", vendor_user.company.name, config.value, "123456789012", launch, "10", "30", "Declared Universal accessory", "Explicit scope", "Pending Review", f"Universal, {kind.name}", "10"])
        upload = io.BytesIO(stream.getvalue().encode()); upload.name = "universal-product.csv"
        response = vendor_client.post("/api/v1/catalog/products/bulk_upload/", {"file": upload}, format="multipart")
        assert response.status_code == 200 and response.data["rows_failed"] == 0, response.data
    product = Product.objects.get(sku="DECLARED-UNIVERSAL")
    assert product.product_category == config.value
    assert product.compatibility_mode == "universal_device_type"
    assert set(product.compatibility_assertions.filter(is_compatible=True).values_list("device_reference", flat=True)) == {device.id for device in devices}
    assert not DynamicDropdownConfig.objects.filter(field_name="product_category", value="Universal Accessories").exists()


def test_universal_declared_scope_does_not_expand_category_eligibility(vendor_client, vendor_user):
    kinds = [DeviceType.objects.create(name=code.title(), code=code, status="active") for code in ("phone", "tablet", "smartwatch")]
    maker = Manufacturer.objects.create(name="Eligibility maker")
    devices = [Device.objects.create(name=kind.code, manufacturer=maker, device_type=kind) for kind in kinds]
    category, _ = DynamicDropdownConfig.objects.update_or_create(field_name="product_category", value="Chargers and Cables", defaults={"status": "active", "compatibility_mode": "feature_based", "eligible_device_types": [str(kind.id) for kind in kinds[:2]], "accessory_fields": [], "compatibility_rules": {}})
    response = vendor_client.post("/api/v1/catalog/products/", {"name": "Declared cable", "sku": "DECLARED-CABLE", "upc": "123456789012", "product_type": "accessory", "product_category": category.value,
        "launch_date": str(timezone.localdate() - timedelta(days=1)), "status": "pending_review", "compatibility_mode": "universal_device_type", "compatible_device_types": [str(kind.id) for kind in kinds]}, format="json")
    assert response.status_code == 201, response.data
    product = Product.objects.get(pk=response.data["id"])
    assert product.universal_type_scopes.filter(is_active=True).count() == 3
    assert set(product.compatibility_assertions.filter(is_compatible=True).values_list("device_reference", flat=True)) == {device.id for device in devices[:2]}


@pytest.mark.parametrize("method", ["device_specific", "feature_based", "hybrid"])
def test_product_scope_updates_and_reverse_mapping_preserve_category(method, vendor_client):
    kinds = [DeviceType.objects.create(name=code.title(), code=code, status="active") for code in ("phone", "tablet")]
    maker = Manufacturer.objects.create(name="Reverse mapping maker")
    phone = Device.objects.create(name="Original phone", manufacturer=maker, device_type=kinds[0])
    category = DynamicDropdownConfig.objects.create(field_name="product_category", value="Stable Business Category", status="active", compatibility_mode=method, eligible_device_types=[str(kind.id) for kind in kinds])
    response = vendor_client.post("/api/v1/catalog/products/", {"name": "Declared scope", "sku": "SCOPE-UPDATE", "upc": "123456789012", "product_type": "accessory", "product_category": category.value,
        "launch_date": str(timezone.localdate() - timedelta(days=1)), "status": "pending_review", "compatibility_mode": "universal_device_type", "compatible_device_types": [str(kinds[0].id)]}, format="json")
    assert response.status_code == 201, response.data
    product = Product.objects.get(pk=response.data["id"])
    assert product.compatibility_assertions.filter(device_reference=phone.id, is_compatible=True).exists()
    response = vendor_client.patch(f"/api/v1/catalog/products/{product.id}/", {"compatible_device_types": [str(kinds[1].id)]}, format="json")
    assert response.status_code == 200, response.data
    tablet = Device.objects.create(name="New tablet", manufacturer=maker, device_type=kinds[1])
    from apps.catalog.compatibility_engine import run_device_remapping
    run_device_remapping(tablet)
    product.refresh_from_db()
    assert product.product_category == category.value
    assert not product.compatibility_assertions.filter(device_reference=phone.id, is_compatible=True).exists()
    assert product.compatibility_assertions.filter(device_reference=tablet.id, is_compatible=True).exists()
    assert product.universal_type_scopes.filter(is_active=False, device_type=kinds[0]).exists()
    output = io.StringIO()
    call_command('audit_compatibility', stdout=output)
    report = json.loads(output.getvalue())
    assert not any(row['sku'] == product.sku for row in report['category_product_method_mismatches'])
