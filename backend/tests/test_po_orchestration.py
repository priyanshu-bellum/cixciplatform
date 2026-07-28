import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
from apps.catalog.models import Product, ProductStatus
from apps.routing.models import Order, RoutedSuborder, VendorExportDeliveryEvidence
from apps.fulfillment.models import FulfillmentHandoff, SLAEvaluationRecord

@pytest.mark.django_db
class TestPOOrchestration:
    @pytest.fixture
    def buyer_client(self, buyer_user):
        client = APIClient()
        client.force_authenticate(user=buyer_user)
        return client

    @pytest.fixture
    def product(self, vendor_company):
        return Product.objects.create(
            name="Test Phone",
            sku="TEST-SKU-1",
            product_type="accessory",
            vendor_company_reference=vendor_company.id,
            company_scope_reference=vendor_company.id,
            msrp=100.0,
            launch_date=timezone.now().date(),
            status=ProductStatus.ACTIVE,
            compatibility_status="complete",
        )

    def test_end_to_end_orchestration_on_manual_approval(self, buyer_client, buyer_user, vendor_company, product):
        """Test manual PO approval triggers full orchestration."""
        # 1. Create a draft PO
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_user.entity.company_id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.DRAFT,
            po_number="PO-TEST-123",
            currency="USD",
        )

        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=100.0,
            line_total=500.0,
        )

        # Confirm nothing routed/fulfilled yet
        assert not Order.objects.filter(id=po.id).exists()

        # 2. Approve via API
        response = buyer_client.post(f"/api/v1/procurement/purchase-orders/{po.id}/approve/")
        assert response.status_code == 200
        assert response.data["status"] == "approved"

        # 3. Verify Routing and Fulfillment objects created
        po.refresh_from_db()
        assert po.status == POStatus.APPROVED
        assert po.pricing_snapshot_reference is not None

        # Check Order
        order = Order.objects.get(id=po.id)
        assert order.company_scope_reference == po.company_scope_reference
        assert order.buyer_reference == po.buyer_reference

        # Check RoutedSuborder
        suborder = RoutedSuborder.objects.get(order=order)
        assert suborder.vendor_company_reference == vendor_company.id

        # Check Delivery Evidence
        evidence = VendorExportDeliveryEvidence.objects.get(vendor_company_reference=vendor_company.id)
        assert evidence.status == "confirmed"

        # Check FulfillmentHandoff
        handoff = FulfillmentHandoff.objects.get(routed_suborder_reference=suborder.id)
        assert handoff.delivery_evidence_reference == evidence.id
        assert handoff.status == "received"

        # Check SLAEvaluationRecord
        sla_record = SLAEvaluationRecord.objects.get(handoff=handoff)
        assert sla_record.outcome == "pending"

    def test_storefront_auto_approval_triggers_orchestration(self, buyer_client, buyer_user, vendor_company, product):
        """Test storefront PO creation (simulated by PO-TELCO po_number) auto-approves and orchestrates."""
        po_payload = {
            "vendor_company_reference": str(vendor_company.id),
            "po_number": "PO-TELCO-999",
            "currency": "USD",
            "lines": [
                {
                    "product_reference": str(product.id),
                    "quantity": 2
                }
            ]
        }

        # Create PO
        response = buyer_client.post("/api/v1/procurement/purchase-orders/", po_payload, format="json")
        assert response.status_code == 201
        
        po_id = response.data["id"]
        po = PurchaseOrder.objects.get(id=po_id)
        
        # Verify it auto-approved
        assert po.status == POStatus.APPROVED
        assert po.pricing_snapshot_reference is not None

        # Verify Order & Handoff exist
        assert Order.objects.filter(id=po_id).exists()
        suborder = RoutedSuborder.objects.get(order_id=po_id)
        assert FulfillmentHandoff.objects.filter(routed_suborder_reference=suborder.id).exists()
        assert SLAEvaluationRecord.objects.filter(handoff__routed_suborder_reference=suborder.id).exists()

    def test_storefront_custom_shipping_passed_to_suborder(self, buyer_client, buyer_user, vendor_company, product):
        """Test storefront PO creation with custom shipping info passes it to suborder routing snapshot."""
        shipping_payload = {
            "customer_first_name": "Alice",
            "customer_last_name": "Smith",
            "address_1": "555 Pine Rd",
            "address_2": "Apt 4",
            "city": "Seattle",
            "state": "WA",
            "zip": "98101",
            "country": "US"
        }
        po_payload = {
            "vendor_company_reference": str(vendor_company.id),
            "po_number": "PO-TELCO-777",
            "currency": "USD",
            "lines": [
                {
                    "product_reference": str(product.id),
                    "quantity": 3
                }
            ],
            "customer_shipping": shipping_payload
        }

        response = buyer_client.post("/api/v1/procurement/purchase-orders/", po_payload, format="json")
        assert response.status_code == 201
        
        po_id = response.data["id"]
        suborder = RoutedSuborder.objects.get(order_id=po_id)
        
        # Verify custom shipping info is written to routing_snapshot
        assert suborder.routing_snapshot["customer_shipping"] == shipping_payload
