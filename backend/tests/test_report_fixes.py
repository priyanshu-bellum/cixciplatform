import uuid
import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus
from apps.catalog.models import Product, ProductStatus
from apps.fulfillment.models import VendorShippingImportLog, VendorReturnImportLog, FulfillmentHandoff, ReturnRequest
from apps.integration.models import CompanyAPIKey
from apps.audit.models import AuditRecord

@pytest.mark.django_db
class TestReportFixes:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()

        # Companies
        self.vendor_company = Company.objects.create(
            name="Vendor Co", slug="vendor-co-test", company_type=CompanyType.VENDOR, status=CompanyStatus.ACTIVE
        )
        self.buyer_company = Company.objects.create(
            name="Buyer Co", slug="buyer-co-test", company_type=CompanyType.BUYER, status=CompanyStatus.ACTIVE
        )

        # Entities
        self.vendor_entity = CompanyEntity.objects.create(
            name="Vendor Entity", company=self.vendor_company
        )
        self.buyer_entity = CompanyEntity.objects.create(
            name="Buyer Entity", company=self.buyer_company
        )

        # Users
        self.admin_user = User.objects.create(
            email="admin@cixci.com", is_cixci_admin=True, is_active=True
        )
        self.vendor_user = User.objects.create(
            email="vendor@cixci.com", entity=self.vendor_entity, is_active=True
        )
        self.buyer_user = User.objects.create(
            email="buyer@cixci.com", entity=self.buyer_entity, is_active=True
        )

        # Product
        self.product = Product.objects.create(
            sku="TEST-SKU-001",
            name="Test Phone Case",
            brand="TestBrand",
            product_type="case",
            status=ProductStatus.ACTIVE,
            compatibility_status="complete",
            vendor_company_reference=self.vendor_company.id,
            company_scope_reference=self.vendor_company.id,
            vendor_wholesale_price_amount=15.00,
            vendor_wholesale_price_currency="USD",
            msrp=30.00,
            launch_date=timezone.now().date()
        )

    def test_bpe_052_vendor_wholesale_price_hidden_from_buyer(self):
        """BPE-052: Buyer product detail response hides vendor wholesale price fields."""
        self.client.force_authenticate(user=self.buyer_user)
        res = self.client.get(f"/api/v1/catalog/products/{self.product.id}/")
        assert res.status_code == 200
        data = res.json()
        assert "vendor_wholesale_price_amount" not in data
        assert "vendor_wholesale_price_currency" not in data

    def test_bpe_063_and_061_buyer_cannot_create_or_modify_products(self):
        """BPE-063 & BPE-061: Buyer product creation and modification return 403 Forbidden."""
        self.client.force_authenticate(user=self.buyer_user)
        
        # Create attempt
        res_create = self.client.post("/api/v1/catalog/products/", {
            "sku": "BUYER-CREATE", "name": "Buyer Product", "brand": "Brand", "product_type": "case",
            "launch_date": "2026-01-01"
        })
        assert res_create.status_code == 403

        # Modify attempt
        res_patch = self.client.patch(f"/api/v1/catalog/products/{self.product.id}/", {
            "name": "Buyer Hacked Name"
        })
        assert res_patch.status_code == 403

    def test_bpe_064_buyer_cannot_access_companies_endpoint(self):
        """BPE-064: Buyer access to tenant/companies returns 403 Forbidden."""
        self.client.force_authenticate(user=self.buyer_user)
        res = self.client.get("/api/v1/tenant/companies/")
        assert res.status_code == 403

    def test_bpe_065_and_lat_063_buyer_cannot_access_audit_logs(self):
        """BPE-065 & LAT-063: Buyer access to audit records returns 403 Forbidden."""
        self.client.force_authenticate(user=self.buyer_user)
        res = self.client.get("/api/v1/audit/records/")
        assert res.status_code == 403

    def test_voe_046_and_voe_047_shipping_and_return_import_logs_200_ok(self):
        """VOE-046, VOE-047, VSI-001: Import log endpoints return 200 OK without 500 error."""
        self.client.force_authenticate(user=self.admin_user)

        res_ship = self.client.get("/api/v1/fulfillment/shipping-import-logs/")
        assert res_ship.status_code == 200

        res_ret = self.client.get("/api/v1/fulfillment/return-import-logs/")
        assert res_ret.status_code == 200

    def test_whk_019_api_key_creation_admin(self):
        """WHK-019: API key creation handles admin and scope without 500 server error."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post("/api/v1/integration/api-keys/", {
            "label": "Test Key", "is_active": True,
            "company_scope_reference": str(self.vendor_company.id)
        })
        assert res.status_code == 201

    def test_vsi_014_handoff_rejects_invalid_status(self):
        """VSI-014 & VSI-083: Fulfillment handoff rejects invalid status with 400 Bad Request."""
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=self.vendor_company.id,
            company_scope_reference=self.buyer_company.id,
            status="received"
        )
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f"/api/v1/fulfillment/handoffs/{handoff.id}/", {
            "status": "INVALID_STATUS_XYZ"
        })
        assert res.status_code == 400

    def test_vre_015_buyer_cannot_create_return_request(self):
        """VRE-015: Buyer return creation returns 403 Forbidden."""
        self.client.force_authenticate(user=self.buyer_user)
        res = self.client.post("/api/v1/fulfillment/return-requests/", {
            "ran": "RAN-123", "reason": "Defective"
        })
        assert res.status_code == 403

    def test_vre_039_return_ran_immutable(self):
        """VRE-039: Return Authorization Number (RAN) is protected from mutation."""
        ret_req = ReturnRequest.objects.create(
            ran="RAN-ORIGINAL-123",
            reason="Defective",
            suborder_reference=self.vendor_company.id,
            buyer_reference=self.buyer_company.id,
            vendor_wholesale_price=15.00,
            return_quantity=1,
            sku="SKU-001"
        )
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f"/api/v1/fulfillment/return-requests/{ret_req.id}/", {
            "ran": "HACKED-RAN"
        })
        assert res.status_code == 400
