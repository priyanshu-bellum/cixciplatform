import pytest
import io
import json
from django.utils import timezone
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
from apps.catalog.models import Product, ProductStatus
from apps.routing.models import Order, RoutedSuborder, RoutingStatus
from apps.fulfillment.models import (
    FulfillmentHandoff, VendorShippingImportLog, BuyerUpdateReadySignal, BuyerSignalStatus, BuyerUpdateKind
)

@pytest.mark.django_db
class TestBuyerShippingImport:

    @pytest.fixture
    def setup_data(self, db):
        # Create active Buyer
        buyer = Company.objects.create(
            name="Test Buyer Corp",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE,
            slug="test-buyer-corp"
        )
        
        # Create Another Buyer for permission checking
        other_buyer = Company.objects.create(
            name="Other Buyer Corp",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE,
            slug="other-buyer-corp"
        )

        # Create active Vendor
        vendor = Company.objects.create(
            name="Test Vendor Inc",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE,
            slug="test-vendor-inc"
        )

        # Create active Product owned by Vendor
        product = Product.objects.create(
            name="Accessory Product",
            sku="ACC-SKU-999",
            upc="987654321098",
            product_type="accessory",
            vendor_company_reference=vendor.id,
            company_scope_reference=buyer.id,
            msrp=20.0,
            launch_date=timezone.now().date(),
            status=ProductStatus.ACTIVE,
            compatibility_status="complete",
        )

        # Create Buyer user
        buyer_entity = CompanyEntity.objects.create(company=buyer, name="Buyer HQ", status="active")
        buyer_user = User.objects.create_user(
            email="buyer@buyer.test",
            entity=buyer_entity,
            password="buyerpass123"
        )

        # Create Other Buyer user
        other_buyer_entity = CompanyEntity.objects.create(company=other_buyer, name="Other Buyer HQ", status="active")
        other_buyer_user = User.objects.create_user(
            email="other_buyer@buyer.test",
            entity=other_buyer_entity,
            password="buyerpass123"
        )

        # Create Vendor user
        vendor_entity = CompanyEntity.objects.create(company=vendor, name="Vendor HQ", status="active")
        vendor_user = User.objects.create_user(
            email="vendor@vendor.test",
            entity=vendor_entity,
            password="vendorpass123"
        )

        # Create PO
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor.id,
            status=POStatus.APPROVED,
            po_number="PO-VALIDATE-1",
            currency="USD",
        )

        line = PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=15.0,
            line_total=75.0,
        )

        from datetime import timedelta
        # Create routing Order
        routing_order = Order.objects.create(
            id=po.id,
            company_scope_reference=buyer.id,
            buyer_reference=buyer_user.id,
            buyer_entity_reference=buyer_entity.id,
            status=RoutingStatus.PROCESSING,
            placed_at=timezone.now() - timedelta(days=5)
        )

        # Create RoutedSuborder
        sub = RoutedSuborder.objects.create(
            order=routing_order,
            vendor_company_reference=vendor.id,
            status=RoutingStatus.PROCESSING,
            routing_snapshot={
                "customer_shipping": {
                    "customer_first_name": "John",
                    "customer_last_name": "Doe",
                    "address_1": "123 Main St",
                    "address_2": "",
                    "city": "Austin",
                    "state": "TX",
                    "zip": "78701"
                }
            }
        )

        # Create Fulfillment Handoff
        handoff = FulfillmentHandoff.objects.create(
            routed_suborder_reference=sub.id,
            vendor_company_reference=vendor.id,
            company_scope_reference=buyer.id,
            status="shipment_pending"
        )

        return {
            "buyer": buyer,
            "other_buyer": other_buyer,
            "vendor": vendor,
            "product": product,
            "buyer_user": buyer_user,
            "other_buyer_user": other_buyer_user,
            "vendor_user": vendor_user,
            "order": routing_order,
            "suborder": sub,
            "handoff": handoff
        }

    def generate_csv(self, setup_data, qty=5, sku="ACC-SKU-999", upc="987654321098", buyer_name="Test Buyer Corp", carrier="FedEx", tracking="TRK-987654"):
        csv_header = "Buyer,First Name,Last Name,Address 1,Address 2,City,State,Zip Code,Suborder,SKU,UPC,Quantity,Vendor Confirmation Number,Shipping Carrier,Shipping Tracking Number,Shipped Date,Delivered Date\n"
        csv_row = f"{buyer_name},John,Doe,123 Main St,,Austin,TX,78701,{setup_data['suborder'].id},{sku},{upc},{qty},VND-CONF-123,{carrier},{tracking},2026-07-28,\n"
        csv_file = io.BytesIO((csv_header + csv_row).encode("utf-8"))
        csv_file.name = "shipping_import.csv"
        return csv_file

    def test_successful_buyer_shipping_csv_import(self, setup_data):
        client = APIClient()
        client.force_authenticate(user=setup_data["buyer_user"])

        # 1. Preview Mode (confirm=False)
        csv_file = self.generate_csv(setup_data)
        response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file, "confirm": False}, format="multipart")
        assert response.status_code == 200, response.data
        assert response.data["confirm_required"] is True
        assert response.data["summary"]["applied"] == 1

        # No change in DB yet
        setup_data["handoff"].refresh_from_db()
        assert setup_data["handoff"].status == "shipment_pending"

        # 2. Apply Mode (confirm=True)
        csv_file.seek(0)
        response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file, "confirm": True}, format="multipart")
        assert response.status_code == 200, response.data
        assert response.data["success_count"] == 1

        # Check updates in DB
        setup_data["handoff"].refresh_from_db()
        assert setup_data["handoff"].status == "shipped"
        assert setup_data["handoff"].vendor_order_number == "VND-CONF-123"
        assert setup_data["handoff"].shipping_carrier == "FedEx"
        assert setup_data["handoff"].tracking_number == "TRK-987654"
        assert str(setup_data["handoff"].shipped_date) == "2026-07-28"

        # Check that audit log was created
        log = VendorShippingImportLog.objects.first()
        assert log is not None
        assert log.rows_applied == 1
        assert log.rows_skipped == 0
        assert log.rows_rejected == 0
        assert log.uploaded_by == setup_data["buyer_user"]
        assert log.company_scope_reference == setup_data["buyer"].id

    def test_locked_fields_mismatch_rejection(self, setup_data):
        client = APIClient()
        client.force_authenticate(user=setup_data["buyer_user"])

        # Quantity mismatch (10 instead of 5)
        csv_file = self.generate_csv(setup_data, qty=10)
        response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file, "confirm": True}, format="multipart")
        assert response.status_code == 400
        assert "mismatch" in response.data["errors"][0]["errors"][0]

        # No DB updates
        setup_data["handoff"].refresh_from_db()
        assert setup_data["handoff"].status == "shipment_pending"

    def test_buyer_isolation_permission_check(self, setup_data):
        client = APIClient()
        client.force_authenticate(user=setup_data["other_buyer_user"])

        csv_file = self.generate_csv(setup_data)
        response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file, "confirm": True}, format="multipart")
        assert response.status_code == 400
        assert "permission" in response.data["errors"][0]["errors"][0].lower()

        # No DB updates
        setup_data["handoff"].refresh_from_db()
        assert setup_data["handoff"].status == "shipment_pending"

    def test_vendor_successful_shipping_csv_import(self, setup_data):
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        # 1. Preview Mode (confirm=False)
        csv_file = self.generate_csv(setup_data)
        response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file, "confirm": False}, format="multipart")
        assert response.status_code == 200, response.data
        assert response.data["confirm_required"] is True
        assert response.data["summary"]["applied"] == 1

        # No change in DB yet
        setup_data["handoff"].refresh_from_db()
        assert setup_data["handoff"].status == "shipment_pending"

        # 2. Apply Mode (confirm=True)
        csv_file.seek(0)
        response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file, "confirm": True}, format="multipart")
        assert response.status_code == 200, response.data
        assert response.data["success_count"] == 1

        # Check updates in DB
        setup_data["handoff"].refresh_from_db()
        assert setup_data["handoff"].status == "shipped"

    def test_successful_shipping_csv_import_multi_item_suborder(self, setup_data):
        client = APIClient()
        client.force_authenticate(user=setup_data["buyer_user"])

        # Let's create another product to have a second line in the purchase order and suborder
        from apps.catalog.models import Product, ProductStatus
        from apps.procurement.models import PurchaseOrderLine
        
        product2 = Product.objects.create(
            name="Accessory Product 2",
            sku="ACC-SKU-888",
            upc="987654321088",
            product_type="accessory",
            vendor_company_reference=setup_data["vendor"].id,
            company_scope_reference=setup_data["buyer"].id,
            msrp=30.0,
            launch_date=timezone.now().date(),
            status=ProductStatus.ACTIVE,
            compatibility_status="complete",
        )

        PurchaseOrderLine.objects.create(
            purchase_order_id=setup_data["order"].id,
            product_reference=product2.id,
            quantity=3,
            unit_price_snapshot=25.0,
            line_total=75.0,
        )

        # CSV Content with two lines for the same suborder ID
        csv_header = "Buyer,First Name,Last Name,Address 1,Address 2,City,State,Zip Code,Suborder,SKU,UPC,Quantity,Vendor Confirmation Number,Shipping Carrier,Shipping Tracking Number,Shipped Date,Delivered Date\n"
        csv_row1 = f"Test Buyer Corp,John,Doe,123 Main St,,Austin,TX,78701,{setup_data['suborder'].id},ACC-SKU-999,987654321098,5,VND-CONF-123,FedEx,TRK-987654,2026-07-28,\n"
        csv_row2 = f"Test Buyer Corp,John,Doe,123 Main St,,Austin,TX,78701,{setup_data['suborder'].id},ACC-SKU-888,987654321088,3,VND-CONF-123,FedEx,TRK-987654,2026-07-28,\n"
        
        csv_file = io.BytesIO((csv_header + csv_row1 + csv_row2).encode("utf-8"))
        csv_file.name = "shipping_import.csv"

        response = client.post("/api/v1/fulfillment/handoffs/import-shipping/", {"file": csv_file, "confirm": True}, format="multipart")
        assert response.status_code == 200, response.data
        assert response.data["success_count"] == 2
