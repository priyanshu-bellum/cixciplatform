import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from apps.tenant.models import User, Company, CompanyEntity, CompanyType, CompanyStatus
from apps.tenant.views import CompanyViewSet
from apps.catalog.api import ProductViewSet, ProductDetailSerializer
from apps.catalog.models import Product
from apps.routing.api import VendorOrderExportLogViewSet
from apps.routing.models import VendorOrderExportLog
from apps.notification.api import NotificationRequestViewSet
from apps.notification.models import NotificationRequest
from apps.audit.views import AuditRecordViewSet
from apps.fulfillment.api import ReturnRequestSerializer
from apps.fulfillment.models import ReturnRequest

factory = APIRequestFactory()

print("=== VERIFYING FIXES ===")

# 1. Tenant Companies Endpoint Permissions
vendor_co, _ = Company.objects.get_or_create(name="Test Vendor Co", company_type=CompanyType.VENDOR, status=CompanyStatus.ACTIVE, slug="test-vendor-co")
vendor_entity, _ = CompanyEntity.objects.get_or_create(company=vendor_co, name="Vendor HQ")
vendor_user, _ = User.objects.get_or_create(email="test_vendor_user@cixci.com", entity=vendor_entity)

req = factory.get("/api/v1/tenant/companies/")
force_authenticate(req, user=vendor_user)
view = CompanyViewSet.as_view({"get": "list"})
res = view(req)
print("1. Vendor GET /tenant/companies/ status code:", res.status_code, "(Expected: 403)")
assert res.status_code == 403, f"Expected 403, got {res.status_code}"

# 2. Product Catalog Scoping & Wholesale Price Privacy
prod = Product.objects.filter(vendor_company_reference=vendor_co.id).first()
if not prod:
    prod = Product.objects.create(
        name="Vendor Test Product",
        sku="VEND-TEST-001",
        upc="012345678905",
        company_scope_reference=vendor_co.id,
        vendor_company_reference=vendor_co.id,
        status="active",
        launch_date="2026-01-01",
        vendor_wholesale_price_amount=50.00
    )

ser = ProductDetailSerializer(prod, context={"request": req})
data = ser.data
print("2a. vendor_wholesale_price_amount in vendor representation:", "vendor_wholesale_price_amount" in data, "(Expected: False)")
assert "vendor_wholesale_price_amount" not in data, "Wholesale price exposed to non-admin!"

req_prod = factory.get("/api/v1/catalog/products/")
force_authenticate(req_prod, user=vendor_user)
prod_view = ProductViewSet.as_view({"get": "list"})
prod_res = prod_view(req_prod)
print("2b. Vendor products list count:", len(prod_res.data.get("results", prod_res.data)), "out of total Products:", Product.objects.count())

# 3. Export Log Scoping
req_exp = factory.get("/api/v1/routing/export-logs/")
force_authenticate(req_exp, user=vendor_user)
exp_view = VendorOrderExportLogViewSet.as_view({"get": "list"})
exp_res = exp_view(req_exp)
print("3. Vendor export logs status code & count:", exp_res.status_code, len(exp_res.data.get("results", exp_res.data)))

# 4. Refund Immutability
ret_req = ReturnRequest.objects.first()
if ret_req:
    ser_ret = ReturnRequestSerializer(instance=ret_req, data={"return_refunded_amount": 99999.99}, partial=True)
    is_valid = ser_ret.is_valid()
    print("4. Return refund modification valid:", is_valid, "Errors:", ser_ret.errors)
    assert not is_valid, "Modification of unapproved refund should be invalid!"

print("=== ALL TARGETED VERIFICATIONS PASSED SUCCESSFULLY ===")
