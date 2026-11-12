"""Client transcript: canonical manual categories and visible image-free imports."""
import csv
import io
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone
from apps.catalog.models import Product, DynamicDropdownConfig
from apps.devices.models import Device, DeviceType, Manufacturer

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("code", ["phone", "tablet", "smartwatch"])
@pytest.mark.parametrize("method", ["device_specific", "universal"])
@pytest.mark.parametrize("vendor_category", ["", "Supplier's optional grouping"])
def test_vendor_can_choose_canonical_manual_category(code, method, vendor_category, vendor_client, vendor_user):
    kind = DeviceType.objects.create(name=code.title(), code=code, status="active")
    device = Device.objects.create(name="Canonical test model", manufacturer=Manufacturer.objects.create(name="Manual Maker"), device_type=kind)
    category = DynamicDropdownConfig.objects.create(field_name="product_category", value="Manual " + method, status="active", compatibility_mode=method, eligible_device_types=[str(kind.id)])
    payload = {"name": "Vendor manually selected accessory", "sku": "MANUAL-CANONICAL", "upc": "123456789012", "brand": vendor_user.company.name,
        "product_type": "accessory", "product_category": category.value, "vendor_category": vendor_category, "status": "pending_review",
        "launch_date": str(timezone.localdate() - timedelta(days=1)), "compatibility_mode": "universal_device_type" if method == "universal" else "direct_device",
        "compatible_device_types": [str(kind.id)] if method == "universal" else [], "vendor_company_reference": str(uuid.uuid4())}
    if method == "device_specific":
        payload["device_ids"] = [str(device.id)]
    response = vendor_client.post("/api/v1/catalog/products/", payload, format="json")
    assert response.status_code == 201, response.data
    product = Product.objects.get(pk=response.data["id"])
    assert product.product_category == category.value
    assert product.vendor_category == vendor_category
    assert product.company_scope_reference == vendor_user.company.id == product.vendor_company_reference
    assert product.compatibility_assertions.filter(device_reference=device.id, is_compatible=True).exists()


def test_vendor_cannot_replace_admin_category_override(vendor_client, vendor_user):
    kind = DeviceType.objects.create(name="Phone", code="phone", status="active")
    for name in ("Governed Category", "Another Category"):
        DynamicDropdownConfig.objects.create(field_name="product_category", value=name, status="active", compatibility_mode="device_specific", eligible_device_types=[str(kind.id)])
    product = Product.objects.create(name="Governed accessory", sku="MANUAL-OVERRIDE", product_category="Governed Category", product_category_override="Governed Category",
        launch_date=timezone.localdate() - timedelta(days=1), brand=vendor_user.company.name, vendor_company_reference=vendor_user.company.id, company_scope_reference=vendor_user.company.id)
    response = vendor_client.patch(f"/api/v1/catalog/products/{product.id}/", {"product_category": "Another Category"}, format="json")
    assert response.status_code == 400
    product.refresh_from_db(); assert product.product_category == "Governed Category"


def test_vendor_cannot_set_admin_category_override(vendor_client, vendor_user):
    kind = DeviceType.objects.create(name="Phone", code="phone", status="active")
    DynamicDropdownConfig.objects.create(field_name="product_category", value="Manual Category", status="active", compatibility_mode="device_specific", eligible_device_types=[str(kind.id)])
    response = vendor_client.post("/api/v1/catalog/products/", {"name": "Unauthorized override", "sku": "MANUAL-OVERRIDE-NEW", "product_category": "Manual Category",
        "product_category_override": "Manual Category", "vendor_category": "", "status": "draft"}, format="json")
    assert response.status_code == 400
    assert not Product.objects.filter(sku="MANUAL-OVERRIDE-NEW").exists()


def test_vendor_two_row_import_is_listed_before_image_upload(vendor_client, vendor_user):
    kinds = [DeviceType.objects.create(name=code.title(), code=code, status="active") for code in ("phone", "tablet", "smartwatch")]
    maker = Manufacturer.objects.create(name="Import Maker")
    devices = [Device.objects.create(name=f"Import test {kind.code}", manufacturer=maker, device_type=kind) for kind in kinds]
    device = devices[0]
    for name, method in (("Import Exact", "device_specific"), ("Import Universal", "universal")):
        DynamicDropdownConfig.objects.create(field_name="product_category", value=name, status="active", compatibility_mode=method, eligible_device_types=[str(kind.id) for kind in kinds])
    DynamicDropdownConfig.objects.create(field_name="brand", value=vendor_user.company.name, status="active")
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["SKU", "Brand", "Product Category", "Vendor Category", "UPC", "Launch Date", "Vendor Wholesale Price", "MSRP", "Product Name", "Product Description", "Product Status", "Device Compatibility", "Inventory Level"])
    for index, category, declaration in ((1, "Import Exact", str(device.id)), (2, "Import Universal", "Universal, Phone, Tablet, Smartwatch")):
        writer.writerow([f"CLIENT-IMPORT-{index}", vendor_user.company.name, category, "", f"12345678901{index}", str(timezone.localdate() - timedelta(days=1)), "10", "30", f"Client import {index}", "Declared compatibility", "Pending Review", declaration, "10"])
    upload = io.BytesIO(stream.getvalue().encode()); upload.name = "client-import.csv"
    response = vendor_client.post("/api/v1/catalog/products/bulk_upload/", {"file": upload, "update_mode": "create_only"}, format="multipart")
    assert response.status_code == 200 and response.data["rows_failed"] == 0, response.data
    assert len(response.data["products"]) == 2
    for index in (1, 2):
        product = Product.objects.get(sku=f"CLIENT-IMPORT-{index}")
        assert not product.primary_image_reference and product.vendor_category == ""
        assert product.vendor_company_reference == vendor_user.company.id
        assert product.compatibility_assertions.filter(is_compatible=True).count() == (1 if index == 1 else 3)
        listed = vendor_client.get("/api/v1/catalog/products/", {"sku": product.sku})
        assert listed.status_code == 200 and [item["id"] for item in listed.data["results"]] == [str(product.id)]
