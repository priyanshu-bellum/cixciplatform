import pytest
import io
import uuid
from apps.devices.models import Device, Manufacturer, DeviceType
from apps.catalog.models import Product, ProductCompatibilityAssertion, DynamicDropdownConfig

@pytest.mark.django_db
def test_buyer_cannot_import_supplier_product_facts(buyer_client):
    file_obj = io.BytesIO(b"SKU,Product Name\nTEST-UNAUTHORIZED,Do not import\n")
    file_obj.name = "unauthorized.csv"
    response = buyer_client.post("/api/v1/catalog/products/bulk_upload/", {"file": file_obj}, format="multipart")
    assert response.status_code == 403
    assert not Product.objects.filter(sku="TEST-UNAUTHORIZED").exists()
@pytest.mark.django_db
def test_product_wireless_charging_bulk_import_comma_separated(admin_client, vendor_company, db):
    DynamicDropdownConfig.objects.update_or_create(
        field_name="product_category",
        value="Chargers and Cables",
        display_name="Chargers and Cables",
        defaults={
            "status": "active", "compatibility_mode": "feature_based", "eligible_device_types": ["phone"],
            "accessory_fields": ["wireless_charging_compatibility", "compatible_charging_interface"],
            "compatibility_rules": {
                "wireless_charging_compatibility": {"mode": "optional"},
                "compatible_charging_interface": {"mode": "optional"}
            }
        }
    )
    DynamicDropdownConfig.objects.get_or_create(field_name="brand", value="ChargeCo", display_name="ChargeCo")

    csv_data = (
        "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,"
        "Compatible Charging Interface,Wireless Charging Compatibility\n"
        'CHG-SKU-999,ChargeCo,Chargers and Cables,123456789999,06/18/2026,15.00,30.00,Fast Charger,Dual wireless charger,Active,Type-C,"MagSafe, Qi2"\n'
    )
    file_obj = io.BytesIO(csv_data.encode("utf-8"))
    file_obj.name = "import_charger.csv"

    resp = admin_client.post(
        "/api/v1/catalog/products/bulk_upload/",
        {"file": file_obj, "vendor_company_reference": str(vendor_company.id), "update_mode": "create_only"},
        format="multipart"
    )
    assert resp.status_code == 200, resp.data
    assert resp.data["rows_failed"] == 0

    prod = Product.objects.get(sku="CHG-SKU-999")
    assert prod.wireless_charging_compatibility == "MagSafe+Qi2"

    from apps.catalog.api import ProductDetailSerializer
    rep = ProductDetailSerializer(prod).data
    assert rep["wireless_charging_compatibility"] == "MagSafe+Qi2"

