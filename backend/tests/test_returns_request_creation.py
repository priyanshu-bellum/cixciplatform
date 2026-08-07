import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyType, CompanyStatus, User, Capability
from apps.tenant.services import assign_default_capabilities_for_company
from apps.routing.models import Order, RoutedSuborder
from apps.fulfillment.models import ReturnRequest
from apps.catalog.models import Product

@pytest.mark.django_db
class TestReturnRequestCreation:
    def setup_method(self):
        self.client = APIClient()
        
        # Ensure fulfillment capabilities exist
        self.cap_create, _ = Capability.objects.get_or_create(code="fulfillment.return.create", defaults={"module": "fulfillment"})
        self.cap_list, _ = Capability.objects.get_or_create(code="fulfillment.return.list", defaults={"module": "fulfillment"})

        # Create Buyer Company
        self.buyer_company = Company.objects.create(
            name="Telco Cellular Inc",
            slug="telco-cellular-test",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE
        )
        assign_default_capabilities_for_company(self.buyer_company)
        self.buyer_company.capabilities.add(self.cap_create, self.cap_list)
        self.buyer_entity = self.buyer_company.entities.first()
        self.buyer_user = User.objects.create_user(
            email="buyer@telcocellular.com",
            password="password123",
            entity=self.buyer_entity
        )
        self.buyer_user.capabilities.add(self.cap_create, self.cap_list)

        # Create Vendor Company
        self.vendor_company = Company.objects.create(
            name="TestComm Vendor",
            slug="testcomm-vendor-test",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE
        )
        assign_default_capabilities_for_company(self.vendor_company)
        self.vendor_company.capabilities.add(self.cap_list)
        self.vendor_entity = self.vendor_company.entities.first()
        self.vendor_user = User.objects.create_user(
            email="vendor@testcomm.com",
            password="password123",
            entity=self.vendor_entity
        )
        self.vendor_user.capabilities.add(self.cap_list)

        # Create Product
        self.product = Product.objects.create(
            name="20K mAh Power Bank",
            sku="PP-211",
            upc="123456789012",
            product_type="accessory",
            launch_date=timezone.now().date(),
            vendor_company_reference=self.vendor_company.id,
            company_scope_reference=self.vendor_company.id
        )

        # Create Purchase Order & Suborder
        self.order = Order.objects.create(
            company_scope_reference=self.buyer_company.id,
            buyer_reference=self.buyer_company.id,
            buyer_entity_reference=self.buyer_entity.id,
            status="delivered"
        )
        self.suborder = RoutedSuborder.objects.create(
            order=self.order,
            vendor_company_reference=self.vendor_company.id,
            status="delivered"
        )

    def test_create_return_request_auto_populates_buyer(self):
        self.client.force_authenticate(user=self.buyer_user)
        payload = {
            "suborder_reference": str(self.suborder.id),
            "sku": self.product.sku,
            "upc": self.product.upc,
            "return_quantity": 1,
            "reason": "Defective port"
        }
        response = self.client.post("/api/v1/fulfillment/return-requests/", payload, format="json")
        assert response.status_code in [200, 201], f"Response error: {response.content}"
        data = response.json()
        assert data["sku"] == "PP-211"
        assert data["buyer_reference"] == str(self.buyer_company.id)
        assert data["ran"].startswith("RAN-")

    def test_vendor_queryset_scoping(self):
        # Create return request
        ret = ReturnRequest.objects.create(
            ran="RAN-TEST001",
            suborder_reference=self.suborder.id,
            buyer_reference=self.buyer_company.id,
            sku="PP-211",
            upc="123456789012",
            return_quantity=1,
            reason="Damaged item"
        )

        # Vendor logs in and requests returns
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get("/api/v1/fulfillment/return-requests/")
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", data)
        assert len(results) == 1
        assert results[0]["id"] == str(ret.id)
