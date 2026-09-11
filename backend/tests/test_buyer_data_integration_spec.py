import uuid
import decimal
import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus
from apps.catalog.models import Product, ProductStatus, BuyerProductExportJob
from apps.fulfillment.models import FulfillmentHandoff, ReturnRequest, ItemCondition, RefundStatus
from apps.fulfillment.api import FulfillmentHandoffSerializer, ReturnRequestSerializer
from apps.routing.models import Order, RoutedSuborder


@pytest.mark.django_db
class TestBuyerDataIntegrationSpec:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()

        # Companies
        self.vendor_company = Company.objects.create(
            name="Vendor Co",
            slug="vendor-co-test",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE,
            return_address_line1="123 Return Way",
            return_address_line2="Suite 400",
            return_city="Dallas",
            return_state="TX",
            return_zip_code="75001",
        )
        self.buyer_company = Company.objects.create(
            name="Buyer Co",
            slug="buyer-co-test",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE,
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
        self.buyer_user = User.objects.create(
            email="buyer@cixci.com", entity=self.buyer_entity, is_active=True
        )

    def test_company_structured_return_address_fields(self):
        """Component 2: Company model supports 5 structured return address fields."""
        assert self.vendor_company.return_address_line1 == "123 Return Way"
        assert self.vendor_company.return_address_line2 == "Suite 400"
        assert self.vendor_company.return_city == "Dallas"
        assert self.vendor_company.return_state == "TX"
        assert self.vendor_company.return_zip_code == "75001"

    def test_return_request_spec_fields_and_serializer(self):
        """Component 1 & 6: ReturnRequest model & serializer include restocking_fee, item_condition, refund_status, confirmation_id, buyer_order_number."""
        order = Order.objects.create(
            company_scope_reference=self.buyer_company.id,
            buyer_reference=self.buyer_company.id,
            buyer_entity_reference=self.buyer_entity.id,
            status="processing",
        )
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=self.vendor_company.id,
            routing_snapshot={"buyer_order_number": "BUYER-ORD-9999"},
            status="processing"
        )

        ret = ReturnRequest.objects.create(
            ran="RAN-TEST-12345",
            suborder_reference=suborder.id,
            buyer_reference=self.buyer_company.id,
            sku="SKU-PHONE-CASE",
            upc="123456789012",
            return_quantity=1,
            restocking_fee=decimal.Decimal("5.50"),
            item_condition=ItemCondition.LIKE_NEW,
            refund_status=RefundStatus.PROCESSED,
        )

        serializer = ReturnRequestSerializer(ret)
        data = serializer.data

        assert data["confirmation_id"] == str(ret.id)
        assert data["buyer_order_number"] == "BUYER-ORD-9999"
        assert float(data["restocking_fee"]) == 5.50
        assert data["item_condition"] == "like_new"
        assert data["refund_status"] == "processed"

    def test_fulfillment_handoff_serializer_buyer_fields(self):
        """Component 5: FulfillmentHandoffSerializer exposes buyer-facing shipping fields."""
        order = Order.objects.create(
            company_scope_reference=self.buyer_company.id,
            buyer_reference=self.buyer_company.id,
            buyer_entity_reference=self.buyer_entity.id,
            status="processing",
        )
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=self.vendor_company.id,
            routing_snapshot={"buyer_order_number": "BUYER-ORD-5555"},
            status="processing"
        )

        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=suborder.id,
            vendor_company_reference=self.vendor_company.id,
            company_scope_reference=self.buyer_company.id,
            status="shipped",
            vendor_order_number="VND-ORD-111",
            shipping_carrier="UPS",
            tracking_number="1Z9999999999999999",
            shipped_date=timezone.now().date(),
        )

        serializer = FulfillmentHandoffSerializer(handoff)
        data = serializer.data

        assert data["buyer_order_number"] == "BUYER-ORD-5555"
        assert data["buyer_id"] == str(self.buyer_company.id)
        assert data["order_status"] == "Shipped"
        assert data["vendor_order_number"] == "VND-ORD-111"
        assert data["shipping_carrier"] == "UPS"
        assert data["tracking_number"] == "1Z9999999999999999"
        assert str(data["shipped_date"]) == str(handoff.shipped_date)

    def test_product_export_task_headers(self):
        """Component 4: Product export task generates rows matching the full Data Integration Spec."""
        from apps.catalog.tasks import process_buyer_export_job
        import json

        p = Product.objects.create(
            sku="CASE-001",
            name="Super Shield Case",
            upc="012345678901",
            status=ProductStatus.ACTIVE,
            vendor_company_reference=self.vendor_company.id,
            company_scope_reference=self.vendor_company.id,
            launch_date=timezone.now().date(),
            msrp=decimal.Decimal("29.99"),
            warranty="1 Year Manufacturer",
            inventory_level=150,
            length=decimal.Decimal("6.5"),
            width=decimal.Decimal("3.2"),
            height=decimal.Decimal("0.5"),
            weight=decimal.Decimal("0.2"),
        )

        job = BuyerProductExportJob.objects.create(
            buyer_reference=self.buyer_company.id,
            company_scope_reference=self.buyer_company.id,
            buyer_entity_reference=self.buyer_entity.id,
            requested_by=self.buyer_user.id,
            format="json",
            status="pending",
        )
        from apps.catalog.models import BuyerProductExportSelectionSnapshot
        BuyerProductExportSelectionSnapshot.objects.create(
            export_job=job,
            product_ids=[str(p.id)],
            portfolio_snapshot_reference=uuid.uuid4(),
        )

        process_buyer_export_job(str(job.id))
        job.refresh_from_db()
        assert job.status == "completed"

        from apps.media.models import MediaAsset
        asset = MediaAsset.objects.get(id=job.output_file_reference)
        import os
        from django.conf import settings
        full_path = os.path.join(settings.MEDIA_ROOT, asset.storage_key)
        with open(full_path, "r", encoding="utf-8") as f:
            exported_data = json.load(f)

        assert len(exported_data) == 1
        item = exported_data[0]

        # Spec required fields
        assert item["vendor"] == "Vendor Co"
        assert item["product_name"] == "Super Shield Case"
        assert item["sku"] == "CASE-001"
        assert item["upc"] == "012345678901"
        assert item["product_status"] == "active"
        assert item["brand_warranty"] == "1 Year Manufacturer"
        assert item["inventory_level"] == "150"
        assert item["vendor_return_address1"] == "123 Return Way"
        assert item["vendor_return_address2"] == "Suite 400"
        assert item["vendor_return_city"] == "Dallas"
        assert item["vendor_return_state"] == "TX"
        assert item["vendor_return_zip_code"] == "75001"

    def test_buyer_schema_endpoints(self):
        """Component 7: Buyer API schema view contains precisely the 4 use case endpoints with method filtering."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/buyer-schema/")
        assert res.status_code == 200
        paths = res.data.get("paths", {})

        # Expected endpoints for the 4 use cases
        expected_endpoints = {
            "/api/v1/catalog/products/",
            "/api/v1/catalog/products/{id}/",
            "/api/v1/catalog/export-jobs/create_job/",
            "/api/v1/catalog/export-jobs/list_jobs/",
            "/api/v1/catalog/export-jobs/{id}/",
            "/api/v1/catalog/export-jobs/{id}/download/",
            "/api/v1/routing/orders/",
            "/api/v1/routing/orders/{id}/",
            "/api/v1/fulfillment/handoffs/",
            "/api/v1/fulfillment/handoffs/{id}/",
            "/api/v1/fulfillment/return-requests/",
            "/api/v1/fulfillment/return-requests/{id}/",
        }
        assert set(paths.keys()) == expected_endpoints

        # Disallowed/internal endpoints MUST NOT be present
        assert "/api/v1/catalog/my-projection/" not in paths
        assert "/api/v1/procurement/purchase-orders/" not in paths
        assert "/api/v1/fulfillment/handoffs/import-shipping/" not in paths
        assert "/api/v1/routing/orders/{id}/lines/" not in paths

        # Verify method restrictions
        assert list(paths["/api/v1/catalog/products/"].keys()) == ["get"]
        assert list(paths["/api/v1/catalog/products/{id}/"].keys()) == ["get"]
        assert list(paths["/api/v1/fulfillment/handoffs/"].keys()) == ["get"]
        assert list(paths["/api/v1/routing/orders/"].keys()) == ["get", "post"]

        # Verify tags
        assert paths["/api/v1/catalog/products/"]["get"]["tags"] == ["1. Products (Catalog & Export)"]
        assert paths["/api/v1/routing/orders/"]["post"]["tags"] == ["2. Orders (Customer Purchases)"]
        assert paths["/api/v1/fulfillment/handoffs/"]["get"]["tags"] == ["3. Shipping (Order Tracking & Delivery)"]
        assert paths["/api/v1/fulfillment/return-requests/"]["post"]["tags"] == ["4. Returns (RMA & Confirmations)"]

