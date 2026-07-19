import pytest
import io
import uuid
from apps.devices.models import Device, Manufacturer, DeviceType
from apps.catalog.models import Product, ProductCompatibilityAssertion, DynamicDropdownConfig

@pytest.mark.django_db
def test_intelligent_compatibility_mapping(buyer_client, buyer_user):
    # Setup dropdown config for Cases category
    DynamicDropdownConfig.objects.get_or_create(field_name="brand", value="TestBrand", display_name="TestBrand")
    DynamicDropdownConfig.objects.get_or_create(field_name="product_category", value="Cases", display_name="Cases")

    # Setup manufacturer
    mfg, _ = Manufacturer.objects.get_or_create(name="Apple")
    dt, _ = DeviceType.objects.get_or_create(name="Smartphone", code="smartphone")
    dt.status = "active"
    dt.save()

    # Create devices with different features
    # Device 1: iPhone 14 - supports MagSafe, Lightning charging
    dev1, _ = Device.objects.get_or_create(
        name="Apple iPhone 14",
        manufacturer=mfg,
        device_type=dt,
        lifecycle_status="available",
        wireless_charging_compatibility="MagSafe",
        compatible_charging_interface="Lightning",
        headphone_jack_compatibility="Not Compatible"
    )

    # Device 2: iPhone 15 - supports MagSafe, Type-C charging
    dev2, _ = Device.objects.get_or_create(
        name="Apple iPhone 15",
        manufacturer=mfg,
        device_type=dt,
        lifecycle_status="available",
        wireless_charging_compatibility="MagSafe",
        compatible_charging_interface="Type-C",
        headphone_jack_compatibility="Not Compatible"
    )

    # Device 3: iPhone 18 - supports MagSafe, Type-C charging
    dev3, _ = Device.objects.get_or_create(
        name="Apple iPhone 18",
        manufacturer=mfg,
        device_type=dt,
        lifecycle_status="available",
        wireless_charging_compatibility="MagSafe",
        compatible_charging_interface="Type-C",
        headphone_jack_compatibility="Not Compatible"
    )

    # 1. Test "plus" delimiter and feature matching for "iPhone plus MagSafe plus Lightning"
    # This should match Device 1 (iPhone 14) but NOT Device 2 or Device 3
    csv_data1 = (
        "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,Device Compatibility\n"
        'PROD-SKU-101,TestBrand,Cases,123456789091,06/18/2026,12.00,24.00,Test Cable 1,Premium accessory,Active,"iPhone plus MagSafe plus Lightning"\n'
    )
    file_obj1 = io.BytesIO(csv_data1.encode("utf-8"))
    file_obj1.name = "import1.csv"

    resp1 = buyer_client.post(
        "/api/v1/catalog/products/bulk_upload/",
        {"file": file_obj1, "update_mode": "create_only"},
        format="multipart"
    )
    assert resp1.status_code == 200, resp1.data
    assert resp1.data["rows_failed"] == 0

    prod1 = Product.objects.get(sku="PROD-SKU-101")
    assertions1 = ProductCompatibilityAssertion.objects.filter(product=prod1)
    assert assertions1.count() == 1
    assert assertions1.filter(device_reference=dev1.id).exists()

    # 2. Test "+" delimiter and feature matching for "iPhone + MagSafe + Type-C"
    # This should match Device 2 and Device 3 (iPhone 15 and 18) but NOT Device 1 (iPhone 14)
    csv_data2 = (
        "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,Device Compatibility\n"
        'PROD-SKU-102,TestBrand,Cases,123456789092,06/18/2026,12.00,24.00,Test Cable 2,Premium accessory,Active,"iPhone + MagSafe + Type-C"\n'
    )
    file_obj2 = io.BytesIO(csv_data2.encode("utf-8"))
    file_obj2.name = "import2.csv"

    resp2 = buyer_client.post(
        "/api/v1/catalog/products/bulk_upload/",
        {"file": file_obj2, "update_mode": "create_only"},
        format="multipart"
    )
    assert resp2.status_code == 200, resp2.data
    assert resp2.data["rows_failed"] == 0

    prod2 = Product.objects.get(sku="PROD-SKU-102")
    assertions2 = ProductCompatibilityAssertion.objects.filter(product=prod2)
    assert assertions2.count() == 2
    assert assertions2.filter(device_reference=dev2.id).exists()
    assert assertions2.filter(device_reference=dev3.id).exists()

    # 3. Test validation check with non-existent device name in features: "iPhone 99 + MagSafe + Lightning"
    # This should fail validation since "iPhone 99" is not a valid device name and doesn't match any device or manufacturer as a substring.
    csv_data3 = (
        "SKU,Brand,Product Category,UPC,Launch Date,Vendor Wholesale Price,MSRP,Product Name,Product Description,Product Status,Device Compatibility\n"
        'PROD-SKU-103,TestBrand,Cases,123456789093,06/18/2026,12.00,24.00,Test Cable 3,Premium accessory,Active,"iPhone 99 + MagSafe + Lightning"\n'
    )
    file_obj3 = io.BytesIO(csv_data3.encode("utf-8"))
    file_obj3.name = "import3.csv"

    resp3 = buyer_client.post(
        "/api/v1/catalog/products/bulk_upload/",
        {"file": file_obj3, "update_mode": "create_only"},
        format="multipart"
    )
    assert resp3.status_code == 207, resp3.data
    assert resp3.data["rows_failed"] == 1
    assert "Invalid device/feature part 'iPhone 99'" in resp3.data["errors"][0]["validation_error"]
