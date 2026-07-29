import pytest
import json
import base64
from django.utils import timezone
from datetime import timedelta

from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
from apps.catalog.models import Product, ProductStatus
from apps.routing.models import (
    Order, RoutedSuborder, RoutingStatus, VendorExportWindow,
    VendorExportBatchItem, VendorExportDeliveryAttempt, VendorExportDeliveryEvidence
)
from apps.fulfillment.models import FulfillmentHandoff, SLAEvaluationRecord, SLAOutcome
from apps.notification.models import NotificationRequest, DeliveryAttempt, DeliveryStatus
from apps.routing.tasks import run_manual_vendor_exports
from apps.notification.tasks import process_notification_request
from apps.procurement.services import orchestrate_po_finalization

@pytest.mark.django_db
class TestManualVendorExport:

    @pytest.fixture
    def product(self, vendor_company):
        return Product.objects.create(
            name="Manual Phone Accessories",
            sku="MAN-SKU-123",
            upc="123456789012",
            product_type="accessory",
            vendor_company_reference=vendor_company.id,
            company_scope_reference=vendor_company.id,
            msrp=50.0,
            launch_date=timezone.now().date() - timedelta(days=1),
            status=ProductStatus.ACTIVE,
            compatibility_status="complete",
        )

    def test_manual_vendor_export_flow(self, buyer_company, buyer_user, vendor_company, product):
        # 1. Set vendor to manual integration mode
        vendor_company.external_id = json.dumps({
            "integration_mode": "manual",
            "daily_email_time": "08:00",
            "daily_email_time_2": "17:00"
        })
        vendor_company.order_digest_emails = ["vendor_receiver@vendor.test"]
        vendor_company.save()

        # Create active vendor user so digest email recipient is resolved to a User
        vendor_entity = CompanyEntity.objects.create(company=vendor_company, name="Vendor HQ")
        recipient_user = User.objects.create_user(
            email="vendor_receiver@vendor.test",
            entity=vendor_entity,
            password="vendorpassword123",
        )

        # 2. Create and finalize/approve a PO
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.DRAFT,
            po_number="PO-MANUAL-1",
            currency="USD",
        )

        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=10,
            unit_price_snapshot=45.0,
            line_total=450.0,
        )

        # Finalize the PO -> orchestrate
        po.status = POStatus.APPROVED
        po.approved_at = timezone.now()
        po.save()

        orchestrate_po_finalization(po)

        # Check Order and RoutedSuborder are created but have status PLACED
        order = Order.objects.get(id=po.id)
        assert order.status == RoutingStatus.PLACED

        suborder = RoutedSuborder.objects.get(order=order)
        assert suborder.status == RoutingStatus.PLACED

        # Verify no FulfillmentHandoff or SLA Evaluation exists yet
        assert not FulfillmentHandoff.objects.filter(routed_suborder_reference=suborder.id).exists()
        assert not SLAEvaluationRecord.objects.filter(handoff__routed_suborder_reference=suborder.id).exists()

        # 3. Trigger manual exports for a non-matching time -> nothing should happen
        run_manual_vendor_exports(current_time="07:00")
        assert not VendorExportWindow.objects.filter(vendor_company_reference=vendor_company.id).exists()

        # 4. Trigger manual exports for matching time "08:00"
        run_manual_vendor_exports(current_time="08:00")

        # Verify VendorExportWindow is created
        window = VendorExportWindow.objects.get(vendor_company_reference=vendor_company.id)
        assert window.status == "processing"

        # Verify VendorExportBatchItem links suborder to window
        batch_item = VendorExportBatchItem.objects.get(window=window)
        assert batch_item.routed_suborder == suborder

        # Verify VendorExportDeliveryAttempt is created in progress
        attempt = VendorExportDeliveryAttempt.objects.get(window=window)
        assert attempt.outcome == "in_progress"

        # Verify NotificationRequest is created with correct event type and scoped company
        notif_req = NotificationRequest.objects.get(event_type="vendor.order_export")
        assert notif_req.company_scope_reference == vendor_company.id
        assert notif_req.source_record_id == window.id

        # Verify CSV attachment exists and is correct
        assert len(notif_req.attachments) == 1
        attachment = notif_req.attachments[0]
        assert "csv" in attachment["filename"]
        assert attachment["mime_type"] == "text/csv"

        # Decode base64 CSV content and check values
        csv_text = base64.b64decode(attachment["content"]).decode("utf-8")
        assert "Buyer" in csv_text
        assert "First Name" in csv_text
        assert "Address 1" in csv_text
        assert "Buyer Corp" in csv_text
        assert "MAN-SKU-123" in csv_text
        assert "Suborder" in csv_text
        assert "Vendor Confirmation Number" in csv_text

        # 5. Process notification request synchronously (Django mail fallback)
        # Trigger process_notification_request
        process_notification_request(str(notif_req.id))

        # 6. Verify delivery success, evidence and downstream transitions
        notif_req.refresh_from_db()
        delivery_attempt = DeliveryAttempt.objects.get(notification_request=notif_req)
        assert delivery_attempt.status == DeliveryStatus.SENT

        # Verify attempt, window, suborder, order statuses have transitioned
        attempt.refresh_from_db()
        assert attempt.outcome == "succeeded"

        window.refresh_from_db()
        assert window.status == "closed"

        suborder.refresh_from_db()
        assert suborder.status == RoutingStatus.PROCESSING

        order.refresh_from_db()
        assert order.status == RoutingStatus.PROCESSING

        # Verify FulfillmentHandoff exists with shipment_pending status
        handoff = FulfillmentHandoff.objects.get(routed_suborder_reference=suborder.id)
        assert handoff.status == "shipment_pending"

        # Verify SLAEvaluationRecord exists with pending status
        sla_record = SLAEvaluationRecord.objects.get(handoff=handoff)
        assert sla_record.outcome == SLAOutcome.PENDING

    def test_export_logging_and_reexport(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        from apps.routing.models import VendorOrderExportLog
        # Set vendor integration mode to manual
        vendor_company.external_id = json.dumps({
            "integration_mode": "manual",
            "daily_email_time": "08:00"
        })
        vendor_company.primary_contact_email = "vendor@test.com"
        vendor_company.save()

        # Create active vendor user so digest email recipient is resolved to a User
        from apps.tenant.models import CompanyEntity, User as TenantUser
        vendor_entity = CompanyEntity.objects.create(company=vendor_company, name="Vendor HQ")
        TenantUser.objects.create_user(
            email="vendor@test.com",
            entity=vendor_entity,
            password="vendorpass123",
        )

        # Create PO
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-LOG-1",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        orchestrate_po_finalization(po)

        # Run automated export at due time
        run_manual_vendor_exports(current_time="08:00")

        # Verify a log entry was created
        log = VendorOrderExportLog.objects.get(vendor_company_reference=vendor_company.id)
        assert log.order_count == 1
        assert log.suborder_count == 1
        assert log.is_reexport is False
        assert log.trigger_type == "system"
        assert "CIXCI_VENDOR_ORDERS_" in log.filename
        assert "MAN-SKU-123" in log.csv_backup

        # Let's test the re-export API action
        response = admin_client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/")
        assert response.status_code == 201
        
        # Verify a re-export log entry was created
        reexport_log = VendorOrderExportLog.objects.filter(is_reexport=True).first()
        assert reexport_log is not None
        assert reexport_log.original_log == log
        assert reexport_log.trigger_type == "user"
        assert "_REEXPORT.csv" in reexport_log.filename
        assert reexport_log.csv_backup == log.csv_backup

    def test_manual_export_via_api(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        from apps.routing.models import VendorOrderExportLog
        # Set vendor integration mode to manual
        vendor_company.external_id = json.dumps({"integration_mode": "manual"})
        vendor_company.primary_contact_email = "vendor@test.com"
        vendor_company.save()

        # Create active vendor user so digest email recipient is resolved to a User
        from apps.tenant.models import CompanyEntity, User as TenantUser
        vendor_entity = CompanyEntity.objects.create(company=vendor_company, name="Vendor HQ")
        TenantUser.objects.create_user(
            email="vendor@test.com",
            entity=vendor_entity,
            password="vendorpass123",
        )

        # Create PO
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-MAN-API",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        orchestrate_po_finalization(po)

        order = Order.objects.get(id=po.id)
        suborder = RoutedSuborder.objects.get(order=order)
        assert suborder.status == RoutingStatus.PLACED

        # Trigger manual export preview via API endpoint
        response = admin_client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(suborder.id)]
        }, format="json")
        assert response.status_code == 200
        assert "preview" in response.data
        assert response.data["preview"]["eligible_count"] == 1

        # Now confirm the manual export via API endpoint
        response = admin_client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(suborder.id)],
            "confirm": True
        }, format="json")
        assert response.status_code == 200

        # Verify a log entry was created
        log = VendorOrderExportLog.objects.get(vendor_company_reference=vendor_company.id)
        assert log.trigger_type == "user"
        assert log.is_reexport is False
        assert "MAN-SKU-123" in log.csv_backup

    def test_manual_export_legacy_suborder_missing_shipping(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        vendor_company.external_id = json.dumps({"integration_mode": "manual"})
        vendor_company.save()
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-LEGACY-1",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        order = Order.objects.create(
            id=po.id,
            company_scope_reference=po.company_scope_reference,
            buyer_reference=po.buyer_reference,
            buyer_entity_reference=buyer_user.id,
            status=RoutingStatus.PLACED,
            placed_at=timezone.now(),
        )
        # Create suborder with empty/missing customer_shipping
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=vendor_company.id,
            status=RoutingStatus.PLACED,
            routing_snapshot={"po_number": po.po_number} # No customer_shipping
        )
        
        response = admin_client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(suborder.id)]
        }, format="json")
        assert response.status_code == 200
        assert response.data["preview"]["eligible_count"] == 1

    def test_manual_export_legacy_suborder_null_snapshot(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        from unittest.mock import patch
        vendor_company.external_id = json.dumps({"integration_mode": "manual"})
        vendor_company.save()
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-LEGACY-2",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        order = Order.objects.create(
            id=po.id,
            company_scope_reference=po.company_scope_reference,
            buyer_reference=po.buyer_reference,
            buyer_entity_reference=buyer_user.id,
            status=RoutingStatus.PLACED,
            placed_at=timezone.now(),
        )
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=vendor_company.id,
            status=RoutingStatus.PLACED,
            routing_snapshot={}
        )
        
        # Patch suborder in-memory to have null routing_snapshot
        suborder.routing_snapshot = None
        with patch("apps.routing.api.RoutedSuborder.objects.filter") as mock_filter:
            mock_filter.return_value.exists.return_value = True
            mock_filter.return_value.__iter__.return_value = [suborder]
            
            response = admin_client.post("/api/v1/routing/orders/manual-export/", {
                "suborder_ids": [str(suborder.id)]
            }, format="json")
            assert response.status_code == 200
            assert response.data["preview"]["eligible_count"] == 1

    def test_manual_export_legacy_suborder_string_snapshot(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        vendor_company.external_id = json.dumps({"integration_mode": "manual"})
        vendor_company.save()
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-LEGACY-3",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        order = Order.objects.create(
            id=po.id,
            company_scope_reference=po.company_scope_reference,
            buyer_reference=po.buyer_reference,
            buyer_entity_reference=buyer_user.id,
            status=RoutingStatus.PLACED,
            placed_at=timezone.now(),
        )
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=vendor_company.id,
            status=RoutingStatus.PLACED,
            routing_snapshot="invalid_snapshot_type_string" # String snapshot
        )
        
        response = admin_client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(suborder.id)]
        }, format="json")
        assert response.status_code == 200
        assert response.data["preview"]["eligible_count"] == 1

    def test_manual_export_integer_zip_code(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        vendor_company.external_id = json.dumps({"integration_mode": "manual"})
        vendor_company.save()
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-INT-ZIP",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        order = Order.objects.create(
            id=po.id,
            company_scope_reference=po.company_scope_reference,
            buyer_reference=po.buyer_reference,
            buyer_entity_reference=buyer_user.id,
            status=RoutingStatus.PLACED,
            placed_at=timezone.now(),
        )
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=vendor_company.id,
            status=RoutingStatus.PLACED,
            routing_snapshot={
                "customer_shipping": {
                    "customer_first_name": "Jane",
                    "customer_last_name": "Doe",
                    "address_1": "100 Telco Way",
                    "address_2": "Suite A",
                    "city": "San Jose",
                    "state": "CA",
                    "zip": 95112, # Integer ZIP
                    "country": "US"
                }
            }
        )
        
        response = admin_client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(suborder.id)]
        }, format="json")
        assert response.status_code == 200
        assert response.data["preview"]["eligible_count"] == 1

    def test_manual_export_missing_buyer_company(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        import uuid
        vendor_company.external_id = json.dumps({"integration_mode": "manual"})
        vendor_company.save()
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-MISSING-BUYER",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        order = Order.objects.create(
            id=po.id,
            company_scope_reference=uuid.uuid4(), # Missing/deleted buyer company ID
            buyer_reference=po.buyer_reference,
            buyer_entity_reference=buyer_user.id,
            status=RoutingStatus.PLACED,
            placed_at=timezone.now(),
        )
        suborder = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=vendor_company.id,
            status=RoutingStatus.PLACED,
            routing_snapshot={}
        )
        
        response = admin_client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(suborder.id)]
        }, format="json")
        assert response.status_code == 200
        assert response.data["preview"]["ineligible_count"] == 1
        assert "Vendor or Buyer company not found" in response.data["preview"]["ineligible_suborders"][0]["errors"]

    def test_manual_export_no_recipients(self, admin_client, buyer_company, buyer_user, vendor_company, product):
        from apps.routing.models import VendorOrderExportLog, RoutedSuborder, Order
        from apps.fulfillment.models import FulfillmentHandoff
        
        # Set vendor integration mode to manual and make sure NO emails/recipients exist
        vendor_company.external_id = json.dumps({"integration_mode": "manual"})
        vendor_company.order_digest_emails = []
        vendor_company.primary_contact_email = ""
        vendor_company.save()
        
        # Ensure no active users exist for this vendor company to guarantee zero recipients
        from apps.tenant.models import User as TenantUser
        TenantUser.objects.filter(entity__company=vendor_company).update(is_active=False)

        # Create PO
        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor_company.id,
            status=POStatus.APPROVED,
            po_number="PO-NO-RECIPIENTS",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=5,
            unit_price_snapshot=10.0,
            line_total=50.0,
        )
        orchestrate_po_finalization(po)

        order = Order.objects.get(id=po.id)
        suborder = RoutedSuborder.objects.get(order=order)
        assert suborder.status == RoutingStatus.PLACED

        # Now confirm the manual export via API endpoint
        response = admin_client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(suborder.id)],
            "confirm": True
        }, format="json")
        assert response.status_code == 200

        # Verify a log entry was created even with zero recipients
        log = VendorOrderExportLog.objects.get(vendor_company_reference=vendor_company.id)
        assert log.trigger_type == "user"
        assert log.is_reexport is False
        assert log.email_send_result == "no_recipients_configured"
        assert log.recipients == []
        assert "MAN-SKU-123" in log.csv_backup

        # Verify downstream transitions occurred successfully
        suborder.refresh_from_db()
        assert suborder.status == RoutingStatus.PROCESSING

        order.refresh_from_db()
        assert order.status == RoutingStatus.PROCESSING

        # Verify FulfillmentHandoff exists
        handoff = FulfillmentHandoff.objects.get(routed_suborder_reference=suborder.id)
        assert handoff.status == "shipment_pending"


