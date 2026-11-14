"""The same product rules through vendor JWT/key and buyer entity API paths."""
import uuid
import csv
import io
import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Product, DynamicDropdownConfig, VendorCategoryMapping, ProductCompatibilityAssertion, BuyerProductExportDate
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.devices.services import add_device_to_portfolio
from apps.integration.models import CompanyAPIKey
from apps.tenant.models import CompanyEntity, CompanyUserMembership, User

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("code", ["phone", "tablet", "smartwatch"])
@pytest.mark.parametrize("method", ["device_specific", "universal", "feature_based", "hybrid"])
@pytest.mark.parametrize("authentication", ["jwt", "company_key"])
@pytest.mark.parametrize("entry", ["json", "csv"])
def test_vendor_entry_matrix(code, method, authentication, entry, vendor_user, vendor_company, approve_supplier_brand):
    approve_supplier_brand(vendor_company, 'Test Brand')
    kind = DeviceType.objects.create(name=code.title(), code=code, status="active")
    manufacturer = Manufacturer.objects.create(name="API Matrix Maker")
    devices = [Device.objects.create(name=f"{code} Model {index}", manufacturer=manufacturer, device_type=kind, bluetooth_compatibility="Yes") for index in (1, 2)]
    category = f"API Matrix {method}"
    DynamicDropdownConfig.objects.create(field_name="product_category", value=category, status="active", compatibility_mode=method,
        eligible_device_types=[str(kind.id)], accessory_fields=["bluetooth_compatibility"] if method in ("hybrid", "feature_based") else [],
        compatibility_rules={"bluetooth_compatibility": {"mode": "required", "comparison": "is_true"}} if method in ("hybrid", "feature_based") else {})
    VendorCategoryMapping.objects.create(vendor_company_reference=vendor_user.company.id, company_scope_reference=vendor_user.company.id, vendor_category=category, cixci_category=category, status="active")
    client = APIClient()
    if authentication == "jwt":
        client.force_authenticate(user=vendor_user)
    else:
        key = CompanyAPIKey.objects.create(company_scope_reference=vendor_user.company.id, label="Vendor matrix", token="cixci_key_" + uuid.uuid4().hex)
        client.credentials(HTTP_X_API_KEY=key.token, HTTP_X_CIXCI_ENTITY=str(vendor_user.entity_id))
    payload = {"name": f"Generic {method} accessory", "sku": "API-MATRIX-1", "upc": "123456789012", "vendor_category": category,
        "product_type": "accessory", "status": "pending_review", "launch_date": str(timezone.localdate()), "bluetooth_compatibility": "Yes",
        "compatibility_mode": "universal_device_type" if method == "universal" else "direct_device", "compatible_device_types": [str(kind.id)] if method == "universal" else []}
    if method in ("device_specific", "hybrid"):
        payload["device_ids"] = [str(devices[0].id)]
    if entry == "json":
        response = client.post("/api/v1/catalog/products/", payload, format="json")
        assert response.status_code == 201, response.data
        product = Product.objects.get(pk=response.data["id"])
        summary = response.data["compatibility_summary"]
    else:
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(["SKU", "Brand", "Product Category", "UPC", "Launch Date", "Vendor Wholesale Price", "MSRP", "Product Name", "Product Description", "Product Status", "Bluetooth Compatibility", "Device Compatibility", "Universal Device Types", "Inventory Level"])
        writer.writerow([payload["sku"], "Test Brand", category, payload["upc"], str(timezone.localdate()), "10", "20", payload["name"], "Explicit CSV matrix declaration", "Pending Review", "Yes", str(devices[0].id) if method in ("device_specific", "hybrid") else "", str(kind.id) if method == "universal" else "", "100"])
        upload = io.BytesIO(stream.getvalue().encode()); upload.name = "matrix.csv"
        response = client.post("/api/v1/catalog/products/bulk_upload/", {"file": upload, "update_mode": "create_only", "vendor_company_reference": str(uuid.uuid4())}, format="multipart")
        assert response.status_code == 200, response.data
        assert response.data["rows_failed"] == 0
        product = Product.objects.get(sku=payload["sku"])
        summary = response.data["compatibility_results"][0]
    assert product.vendor_company_reference == vendor_user.company.id
    expected = {devices[0].id} if method == "device_specific" else {device.id for device in devices}
    assert set(product.compatibility_assertions.filter(is_compatible=True, is_excluded=False).values_list("device_reference", flat=True)) == expected
    assert summary["matched"] == len(expected)
    query = client.get("/api/v1/catalog/products/", {"sku": product.sku})
    assert query.status_code == 200 and [row["id"] for row in query.data["results"]] == [str(product.id)]
    if method in ("feature_based", "hybrid"):
        response = client.patch(f"/api/v1/catalog/products/{product.pk}/", {"bluetooth_compatibility": "No"}, format="json")
        assert response.status_code == 200, response.data
        remaining = {devices[0].id} if method == "hybrid" else set()
        assert set(product.compatibility_assertions.filter(is_compatible=True, is_excluded=False).values_list("device_reference", flat=True)) == remaining


def test_atomic_api_rejects_unknown_device_without_creating_product(admin_client, vendor_company):
    kind = DeviceType.objects.create(code="phone", name="Phone", status="active")
    config = DynamicDropdownConfig.objects.create(field_name="product_category", value="Atomic Cases", status="active", compatibility_mode="device_specific", eligible_device_types=[str(kind.id)])
    response = admin_client.post("/api/v1/catalog/products/", {"name": "Atomic invalid", "sku": "ATOMIC-INVALID", "product_type": "accessory", "product_category": config.value, "vendor_company_reference": str(vendor_company.id), "launch_date": str(timezone.localdate()), "device_ids": [str(uuid.uuid4())]}, format="json")
    assert response.status_code == 400
    assert "canonical device record does not exist" in str(response.data).lower()
    assert not Product.objects.filter(sku="ATOMIC-INVALID").exists()


@pytest.mark.parametrize("code", ["phone", "tablet", "smartwatch"])
@pytest.mark.parametrize("entry", ["json", "csv"])
def test_manual_and_bulk_reject_models_outside_category_atomically(code, entry, admin_client, vendor_company):
    kinds = {value: DeviceType.objects.create(code=value, name=value.title(), status="active") for value in ("phone", "tablet", "smartwatch")}
    wrong_code = {"phone": "tablet", "tablet": "smartwatch", "smartwatch": "phone"}[code]
    device = Device.objects.create(name="Wrong category model", manufacturer=Manufacturer.objects.create(name="Entry Guard Maker"), device_type=kinds[wrong_code])
    config = DynamicDropdownConfig.objects.create(field_name="product_category", value="Entry Guard", status="active", compatibility_mode="device_specific", eligible_device_types=[str(kinds[code].id)])
    sku = "ENTRY-GUARD"
    if entry == "json":
        response = admin_client.post("/api/v1/catalog/products/", {"name": "Guarded entry", "sku": sku, "product_type": "accessory", "status": "pending_review", "product_category": config.value,
            "vendor_company_reference": str(vendor_company.id), "launch_date": str(timezone.localdate()), "device_ids": [str(device.id)]}, format="json")
        assert response.status_code == 400, response.data
    else:
        VendorCategoryMapping.objects.create(vendor_company_reference=vendor_company.id, company_scope_reference=vendor_company.id, vendor_category=config.value, cixci_category=config.value, status="active")
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(["SKU", "Brand", "Product Category", "UPC", "Launch Date", "Vendor Wholesale Price", "MSRP", "Product Name", "Product Description", "Product Status", "Device Compatibility", "Inventory Level"])
        writer.writerow([sku, "Entry Guard Brand", config.value, "123456789012", str(timezone.localdate()), "10", "20", "Guarded entry", "Explicit declaration", "Pending Review", str(device.id), "100"])
        upload = io.BytesIO(stream.getvalue().encode()); upload.name = "category-guard.csv"
        response = admin_client.post("/api/v1/catalog/products/bulk_upload/", {"file": upload, "vendor_company_reference": str(vendor_company.id)}, format="multipart")
        assert response.status_code == 207 and response.data["rows_failed"] == 1, response.data
    assert "outside the category" in str(response.data).lower()
    assert not Product.objects.filter(sku=sku).exists()


@pytest.mark.parametrize("entry", ["json", "csv"])
def test_manual_and_bulk_universal_ids_deduplicate_without_explicit_models(entry, admin_client, vendor_company):
    kinds = [DeviceType.objects.create(code=value, name=value.title(), status="active") for value in ("phone", "tablet", "smartwatch")]
    config = DynamicDropdownConfig.objects.create(field_name="product_category", value="Entry Universal", status="active", compatibility_mode="universal", eligible_device_types=[str(kind.id) for kind in kinds])
    if entry == "json":
        response = admin_client.post("/api/v1/catalog/products/", {"name": "Structured Universal", "sku": "ENTRY-UNIVERSAL", "product_type": "accessory", "status": "pending_review", "product_category": config.value,
            "vendor_company_reference": str(vendor_company.id), "launch_date": str(timezone.localdate()), "compatibility_mode": "universal_device_type", "compatible_device_types": [str(kind.id) for kind in kinds] + [str(kinds[0].id)]}, format="json")
        assert response.status_code == 201, response.data
    else:
        VendorCategoryMapping.objects.create(vendor_company_reference=vendor_company.id, company_scope_reference=vendor_company.id, vendor_category=config.value, cixci_category=config.value, status="active")
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(["SKU", "Brand", "Product Category", "UPC", "Launch Date", "Vendor Wholesale Price", "MSRP", "Product Name", "Product Description", "Product Status", "Device Compatibility", "Inventory Level"])
        writer.writerow(["ENTRY-UNIVERSAL", "Universal Brand", config.value, "123456789012", str(timezone.localdate()), "10", "20", "Structured Universal", "Explicit declaration", "Pending Review", "Universal, Phone, Tablet, Smartwatch, Phone", "100"])
        upload = io.BytesIO(stream.getvalue().encode()); upload.name = "universal-entry.csv"
        response = admin_client.post("/api/v1/catalog/products/bulk_upload/", {"file": upload, "vendor_company_reference": str(vendor_company.id)}, format="multipart")
        assert response.status_code == 200 and response.data["rows_failed"] == 0, response.data
    product = Product.objects.get(sku="ENTRY-UNIVERSAL")
    assert product.compatibility_mode == "universal_device_type"
    assert set(product.universal_type_scopes.filter(is_active=True).values_list("device_type_id", flat=True)) == {kind.id for kind in kinds}
    assert product.universal_type_scopes.filter(is_active=True).count() == 3


@pytest.mark.parametrize("entity_fixture", ["buyer_entity", "vendor_entity"])
def test_admin_import_owner_is_selected_supplier_not_actor_company(entity_fixture, request, admin_user, admin_client):
    from apps.tenant.models import Company
    admin_user.entity = request.getfixturevalue(entity_fixture)
    admin_user.save()
    supplier = Company.objects.create(name="Selected Supplier", slug="selected-supplier", company_type="vendor", status="active")
    response = admin_client.post("/api/v1/catalog/products/", {"name": "Admin-created accessory", "sku": "ADMIN-SUPPLIER", "product_type": "accessory", "vendor_company_reference": str(supplier.id), "launch_date": str(timezone.localdate())}, format="json")
    assert response.status_code == 201, response.data
    product = Product.objects.get(pk=response.data["id"])
    assert product.vendor_company_reference == supplier.id
    assert product.company_scope_reference == supplier.id


@pytest.mark.parametrize("code", ["phone", "tablet", "smartwatch"])
def test_company_key_selects_entity_and_combines_users_only_inside_it(code, buyer_user, vendor_company):
    kind = DeviceType.objects.create(name=code.title(), code=code, status="active")
    maker = Manufacturer.objects.create(name="Buyer Matrix Maker")
    device = Device.objects.create(name=f"{code} Buyer Model", device_type=kind, manufacturer=maker)
    colleague = User.objects.create_user(email="api-colleague@test.local", password="test", entity=buyer_user.entity)
    other_entity = CompanyEntity.objects.create(company=buyer_user.company, name="Another API Entity", status="active")
    User.objects.create_user(email="api-other@test.local", password="test", entity=other_entity)
    add_device_to_portfolio(buyer_user, device.id)
    product = Product.objects.create(name="Buyer Matrix Accessory", sku="BUYER-MATRIX", status="active", launch_date=timezone.localdate(), company_scope_reference=vendor_company.id, vendor_company_reference=vendor_company.id)
    ProductCompatibilityAssertion.objects.create(product=product, device_reference=device.id, compatibility_basis="manufacturer_assertion", is_compatible=True)
    BuyerProductExportDate.objects.create(buyer_reference=buyer_user.id, company_scope_reference=buyer_user.company.id, buyer_entity_reference=buyer_user.entity_id, product=product, device_reference=device.id, exported_at=timezone.now())
    key = CompanyAPIKey.objects.create(company_scope_reference=buyer_user.company.id, label="Shared company key", token="cixci_key_" + uuid.uuid4().hex)
    client = APIClient()
    client.credentials(HTTP_X_API_KEY=key.token)
    assert client.get("/api/v1/catalog/products/").status_code in (401, 403)
    client.credentials(HTTP_X_API_KEY=key.token, HTTP_X_CIXCI_ENTITY=str(buyer_user.entity_id))
    response = client.get("/api/v1/catalog/products/")
    assert response.status_code == 200, response.data
    assert [row["id"] for row in response.data["results"]] == [str(product.id)]
    assert response.data["results"][0]["device_compatibility"][0]["device_id"] == str(device.id)
    client.credentials(HTTP_X_API_KEY=key.token, HTTP_X_CIXCI_ENTITY=str(other_entity.pk))
    response = client.get("/api/v1/catalog/products/")
    assert response.status_code == 200 and response.data["results"] == []
    client.credentials(HTTP_X_API_KEY=key.token, HTTP_X_CIXCI_ENTITY=str(uuid.uuid4()))
    assert client.get("/api/v1/catalog/products/").status_code in (401, 403)
    colleague.refresh_from_db()
    assert colleague.entity_id == buyer_user.entity_id


def test_company_key_cannot_relink_foreign_or_inactive_memberships(buyer_user, vendor_user):
    membership, _ = CompanyUserMembership.objects.get_or_create(user=vendor_user, company=buyer_user.company, defaults={"status": "active", "is_company_admin": True})
    key = CompanyAPIKey.objects.create(company_scope_reference=buyer_user.company.id, label="Bound company", token="cixci_key_" + uuid.uuid4().hex)
    client = APIClient()
    client.credentials(HTTP_X_API_KEY=key.token, HTTP_X_CIXCI_ENTITY=str(vendor_user.entity_id))
    assert client.get("/api/v1/catalog/products/").status_code in (401, 403)
    membership.status = "inactive"; membership.save()
    vendor_user.refresh_from_db()
    assert vendor_user.entity.company_id != buyer_user.company.id


@pytest.mark.parametrize("payload", [
    {"field_name": "product_category", "value": "Malformed", "eligible_device_types": "phone"},
    {"field_name": "product_category", "value": "Malformed", "eligible_device_types": [None]},
    {"field_name": "product_category", "value": "Malformed", "accessory_fields": ["nfc"]},
    {"field_name": "product_category", "value": "Malformed", "compatibility_rules": []},
    {"field_name": "compatible_charging_interface", "value": "Proprietary"},
    {"field_name": "wireless_combination_policy", "value": "global", "compatibility_rules": {"allowed_combinations": [["Not Compatible", "Qi"]]}},
    {"field_name": "storage_expansion_compatibility", "value": "No capacities", "compatibility_rules": {"capacity_options": ["NaN"]}},
])
def test_malformed_admin_configuration_fails_without_server_error(admin_client, payload):
    response = admin_client.post("/api/v1/catalog/dropdown-configs/", payload, format="json")
    assert response.status_code == 400, response.data


def test_company_key_cannot_be_transferred_or_changed_by_buyer(admin_client, buyer_client, buyer_user, vendor_company):
    key = CompanyAPIKey.objects.create(company_scope_reference=buyer_user.company.id, label="Immutable scope", token="cixci_key_" + uuid.uuid4().hex)
    endpoint = f"/api/v1/integration/api-keys/{key.pk}/"
    assert buyer_client.patch(endpoint, {"is_active": False}, format="json").status_code == 403
    assert admin_client.patch(endpoint, {"company_scope_reference": str(vendor_company.id)}, format="json").status_code == 400
    assert admin_client.delete(endpoint).status_code == 204
    key.refresh_from_db()
    assert not key.is_active
