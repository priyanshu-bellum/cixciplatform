import pytest
import io
import json
from django.utils import timezone
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus, CompanyRelationship, RelationshipStatus
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
from apps.catalog.models import Product, ProductStatus
from apps.routing.models import Order, RoutedSuborder, RoutingStatus
from apps.fulfillment.models import (
    FulfillmentHandoff, BuyerUpdateReadySignal, BuyerSignalStatus, BuyerUpdateKind
)

@pytest.mark.django_db
class TestVendorShippingImport:

    @pytest.fixture
    def setup_data(self, db):
        # Create active Buyer
        buyer = Company.objects.create(
            name="Test Buyer Corp",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE,
            slug="test-buyer-corp"
        )
        
        # Create active Vendor
        vendor = Company.objects.create(
            name="Test Vendor Inc",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE,
            slug="test-vendor-inc"
        )

        # Create Another Vendor for permission checking
        other_vendor = Company.objects.create(
            name="Other Vendor Inc",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE,
            slug="other-vendor-inc"
        )

        # Create active Product owned by Vendor
        product = Product.objects.create(
            name="Accessory Product",
            sku="ACC-SKU-999",
            upc="987654321098",
            product_type="accessory",
            vendor_company_reference=vendor.id,
            company_scope_reference=vendor.id,
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

        # Create Vendor user
        vendor_entity = CompanyEntity.objects.create(company=vendor, name="Vendor HQ", status="active")
        vendor_user = User.objects.create_user(
            email="vendor@vendor.test",
            entity=vendor_entity,
            password="vendorpass123"
        )
        # Give vendor user update capability
        from apps.tenant.models import Capability
        cap, _ = Capability.objects.get_or_create(code="routing.order.update", defaults={"module": "routing"})
        vendor_user.capabilities.add(cap)
        vendor.capabilities.add(cap)

        # Create Other Vendor user
        other_vendor_entity = CompanyEntity.objects.create(company=other_vendor, name="Other Vendor HQ", status="active")
        other_vendor_user = User.objects.create_user(
            email="other_vendor@vendor.test",
            entity=other_vendor_entity,
            password="vendorpass123"
        )
        other_vendor_user.capabilities.add(cap)
        other_vendor.capabilities.add(cap)

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

        # Create admin user
        admin_user = User.objects.create_superuser(
            email="admin@cixci.test",
            password="adminpass123"
        )

        return {
            "buyer": buyer,
            "vendor": vendor,
            "other_vendor": other_vendor,
            "product": product,
            "vendor_user": vendor_user,
            "other_vendor_user": other_vendor_user,
            "admin_user": admin_user,
            "order": routing_order,
            "suborder": sub,
            "handoff": handoff
        }

    def test_successful_shipping_csv_import(self, setup_data):
        data = setup_data
        client = APIClient()
        client.force_authenticate(user=data["vendor_user"])

        # CSV Content matching exact headers
        csv_header = "Buyer,First Name,Last Name,Address 1,Address 2,City,State,Zip Code,Suborder,SKU,UPC,Quantity,Vendor Confirmation Number,Shipping Carrier,Shipping Tracking Number,Shipped Date,Delivered Date\n"
        csv_row = f"Test Buyer Corp,John,Doe,123 Main St,,Austin,TX,78701,{data['suborder'].id},ACC-SKU-999,987654321098,5,VND-CONF-123,FedEx,TRK-987654,2026-07-28,\n"
        csv_file = io.BytesIO((csv_header + csv_row).encode("utf-8"))
        csv_file.name = "shipping.csv"

        response = client.post("/api/v1/routing/orders/import-shipping/", {"file": csv_file}, format="multipart")
        assert response.status_code == 200, response.data
        assert response.data["success_count"] == 1

        # Check updates in DB
        data["handoff"].refresh_from_db()
        assert data["handoff"].status == "shipped"
        assert data["handoff"].vendor_order_number == "VND-CONF-123"
        assert data["handoff"].shipping_carrier == "FedEx"
        assert data["handoff"].tracking_number == "TRK-987654"
        assert str(data["handoff"].shipped_date) == "2026-07-28"

        data["suborder"].refresh_from_db()
        assert data["suborder"].status == RoutingStatus.SHIPPED

        data["order"].refresh_from_db()
        assert data["order"].status == RoutingStatus.SHIPPED

        # Check BuyerUpdateReadySignal
        signal = BuyerUpdateReadySignal.objects.get(order_reference=data["order"].id)
        assert signal.update_kind == BuyerUpdateKind.SHIPMENT
        assert signal.status == BuyerSignalStatus.ELIGIBLE
        assert signal.all_vendors_confirmed is True
        assert signal.expected_vendor_count == 1
        assert signal.confirmed_vendor_count == 1

    def test_locked_fields_mismatch_rejection(self, setup_data):
        data = setup_data
        client = APIClient()
        client.force_authenticate(user=data["vendor_user"])

        # CSV Content with mismatched quantity (10 instead of 5)
        csv_header = "Buyer,First Name,Last Name,Address 1,Address 2,City,State,Zip Code,Suborder,SKU,UPC,Quantity,Vendor Confirmation Number,Shipping Carrier,Shipping Tracking Number,Shipped Date,Delivered Date\n"
        csv_row = f"Test Buyer Corp,John,Doe,123 Main St,,Austin,TX,78701,{data['suborder'].id},ACC-SKU-999,987654321098,10,VND-CONF-123,FedEx,TRK-987654,2026-07-28,\n"
        csv_file = io.BytesIO((csv_header + csv_row).encode("utf-8"))
        csv_file.name = "shipping.csv"

        response = client.post("/api/v1/routing/orders/import-shipping/", {"file": csv_file}, format="multipart")
        assert response.status_code == 400
        assert "mismatch" in response.data["errors"][0]["errors"][0]

        # Check that DB was not updated
        data["handoff"].refresh_from_db()
        assert data["handoff"].status == "shipment_pending"
        data["suborder"].refresh_from_db()
        assert data["suborder"].status == RoutingStatus.PROCESSING

    def test_vendor_isolation_permission_check(self, setup_data):
        data = setup_data
        client = APIClient()
        # Login as vendor user from other company
        client.force_authenticate(user=data["other_vendor_user"])

        csv_header = "Buyer,First Name,Last Name,Address 1,Address 2,City,State,Zip Code,Suborder,SKU,UPC,Quantity,Vendor Confirmation Number,Shipping Carrier,Shipping Tracking Number,Shipped Date,Delivered Date\n"
        csv_row = f"Test Buyer Corp,John,Doe,123 Main St,,Austin,TX,78701,{data['suborder'].id},ACC-SKU-999,987654321098,5,VND-CONF-123,FedEx,TRK-987654,2026-07-28,\n"
        csv_file = io.BytesIO((csv_header + csv_row).encode("utf-8"))
        csv_file.name = "shipping.csv"

        response = client.post("/api/v1/routing/orders/import-shipping/", {"file": csv_file}, format="multipart")
        assert response.status_code == 400
        assert "permission" in response.data["errors"][0]["errors"][0]

        # Check that DB was not updated
        data["handoff"].refresh_from_db()
        assert data["handoff"].status == "shipment_pending"

    def test_order_serializer_buyer_and_customer_fields(self, setup_data):
        data = setup_data
        client = APIClient()
        client.force_authenticate(user=data["vendor_user"])

        # Fetch the order details
        response = client.get(f"/api/v1/routing/orders/{data['order'].id}/")
        assert response.status_code == 200, response.data
        
        # Verify serialized fields
        assert response.data["buyer_name"] == "Test Buyer Corp"
        assert response.data["customer_name"] == "John Doe"
        assert response.data["customer_details"] == {
            "first_name": "John",
            "last_name": "Doe",
            "address1": "123 Main St",
            "address2": "",
            "city": "Austin",
            "state": "TX",
            "zip_code": "78701"
        }

    def test_order_lines_enriched_metadata(self, setup_data):
        data = setup_data
        client = APIClient()
        client.force_authenticate(user=data["vendor_user"])

        # Update product to have upc and color
        product = data["product"]
        product.upc = "112233445566"
        product.color = "Space Gray"
        product.media_references = ["https://example.com/image.png"]
        product.save()

        # Fetch the order lines
        response = client.get(f"/api/v1/routing/orders/{data['order'].id}/lines/")
        assert response.status_code == 200, response.data
        assert len(response.data) > 0
        
        line_data = response.data[0]
        assert line_data["upc"] == "112233445566"
        assert line_data["color"] == "Space Gray"
        assert line_data["primary_image_url"] == "https://example.com/image.png"

    def test_manual_export_immediate_transition(self, setup_data):
        data = setup_data
        client = APIClient()
        # Admin is needed to manual-export or has the required capability
        admin_user = data["admin_user"]
        client.force_authenticate(user=admin_user)

        # Set RoutedSuborder and Order status to PLACED
        sub = data["suborder"]
        sub.status = RoutingStatus.PLACED
        sub.save()

        order = data["order"]
        order.status = RoutingStatus.PLACED
        order.save()

        # Let's set vendor configuration
        vendor = data["vendor"]
        vendor.external_id = json.dumps({"integration_mode": "manual"})
        vendor.order_digest_emails = ["vendor@vendor.test"]
        vendor.save()

        # Create active vendor user so digest email recipient is resolved to a User
        # Relationship must be active/approved
        CompanyRelationship.objects.create(
            buyer_company=data["buyer"],
            vendor_company=vendor,
            status=RelationshipStatus.ACTIVE
        )
        
        # Compatibility projection exists and contains the product
        from apps.catalog.models import BuyerScopedCompatibilityProjection
        import uuid
        BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=data["buyer"].id,
            company_scope_reference=data["buyer"].id,
            buyer_entity_reference=order.buyer_entity_reference,
            portfolio_snapshot_reference=uuid.uuid4(),
            compatible_product_ids=[str(data["product"].id)],
            last_recalculated_at=timezone.now()
        )

        # Trigger manual-export
        response = client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(sub.id)],
            "confirm": True
        }, format="json")
        assert response.status_code == 200, response.data

        # Verify immediate transition to PROCESSING
        sub.refresh_from_db()
        assert sub.status == RoutingStatus.PROCESSING

        order.refresh_from_db()
        assert order.status == RoutingStatus.PROCESSING

        # Verify export log serializer resolves vendor and buyer names
        from apps.routing.models import VendorOrderExportLog
        from apps.routing.api import VendorOrderExportLogSerializer
        log = VendorOrderExportLog.objects.filter(vendor_company_reference=vendor.id).first()
        assert log is not None
        serializer = VendorOrderExportLogSerializer(log)
        assert serializer.data["vendor_name"] == vendor.name
        assert serializer.data["buyer_name"] == data["buyer"].name

    def test_reexport_audit_flow(self, setup_data):
        data = setup_data
        client = APIClient()
        
        # Authenticate vendor user
        client.force_authenticate(user=data["vendor_user"])
        
        # Let's set up the manual-export conditions
        order = data["order"]
        sub = data["suborder"]
        order.status = RoutingStatus.PLACED
        order.save()
        sub.status = RoutingStatus.PLACED
        sub.save()

        vendor = data["vendor"]
        vendor.external_id = json.dumps({"integration_mode": "manual"})
        vendor.order_digest_emails = ["vendor@vendor.test"]
        vendor.save()
        
        # Give vendor user capability to manage exports
        from apps.tenant.models import Capability, CompanyRelationship, RelationshipStatus, CompanyStatus
        cap, _ = Capability.objects.get_or_create(code="routing.export.manage", defaults={"module": "routing"})
        data["vendor_user"].capabilities.add(cap)
        vendor.capabilities.add(cap)

        CompanyRelationship.objects.create(
            buyer_company=data["buyer"],
            vendor_company=vendor,
            status=RelationshipStatus.ACTIVE
        )

        from apps.catalog.models import BuyerScopedCompatibilityProjection
        import uuid
        BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=data["buyer"].id,
            company_scope_reference=data["buyer"].id,
            buyer_entity_reference=order.buyer_entity_reference,
            portfolio_snapshot_reference=uuid.uuid4(),
            compatible_product_ids=[str(data["product"].id)],
            last_recalculated_at=timezone.now()
        )

        # Trigger initial manual export as admin_user
        client.force_authenticate(user=data["admin_user"])
        response = client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(sub.id)],
            "confirm": True
        }, format="json")
        assert response.status_code == 200, response.data

        # Authenticate as vendor user for re-export checks
        client.force_authenticate(user=data["vendor_user"])

        from apps.routing.models import VendorOrderExportLog, VendorOrderReexportAttempt
        log = VendorOrderExportLog.objects.filter(vendor_company_reference=vendor.id).first()
        assert log is not None
        assert log.csv_backup != ""
        
        # Test Authorization/Validation Failures
        # 1. Other vendor user tries to re-export this log (tenant isolation check)
        other_client = APIClient()
        other_client.force_authenticate(user=data["other_vendor_user"])
        
        # Give other vendor routing.export.manage capability to make sure it only fails due to scope, not missing capability
        other_user = data["other_vendor_user"]
        other_user.capabilities.add(cap)
        other_user.save()
        
        resp = other_client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/", {
            "reason": "Vendor did not receive file"
        }, format="json")
        assert resp.status_code == 403
        
        # 2. Re-export fails if reason is missing or "Other" without explanation
        resp = client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/", {}, format="json")
        assert resp.status_code == 400
        
        resp = client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/", {
            "reason": "Other"
        }, format="json")
        assert resp.status_code == 400

        # 3. Re-export fails if vendor integration mode is api (not manual)
        vendor.external_id = json.dumps({"integration_mode": "api"})
        vendor.save()
        resp = client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/", {
            "reason": "Vendor requested another copy"
        }, format="json")
        assert resp.status_code == 400
        
        vendor.external_id = json.dumps({"integration_mode": "manual"})
        vendor.save()

        # 4. Re-export fails if vendor company is inactive (suspended)
        vendor.status = CompanyStatus.SUSPENDED
        vendor.save()
        resp = client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/", {
            "reason": "Vendor requested another copy"
        }, format="json")
        assert resp.status_code == 403
        
        vendor.status = CompanyStatus.ACTIVE
        vendor.save()

        # Test Successful Re-export Audit Flow
        # Attempt 1
        resp = client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/", {
            "reason": "Vendor did not receive file"
        }, format="json")
        assert resp.status_code == 201
        
        log.refresh_from_db()
        assert log.reexport_count == 1
        assert log.last_reexport_status == "SENT"
        assert log.last_reexported_by_name == (f"{data['vendor_user'].first_name} {data['vendor_user'].last_name}".strip() or data['vendor_user'].email)
        
        attempt1 = log.reexport_attempts.first()
        assert attempt1 is not None
        assert attempt1.attempt_number == 1
        assert attempt1.reexport_attempt_id == "rx_00001"
        assert attempt1.delivery_status == "SENT"
        assert attempt1.reason_code == "Vendor did not receive file"
        
        # Verify CSV invariant (checksum equality)
        import hashlib
        expected_checksum = hashlib.sha256(log.csv_backup.encode("utf-8")).hexdigest()
        assert attempt1.file_checksum == expected_checksum
        assert attempt1.file_storage_reference == log.filename

        # Verify linked AuditRecord and EvidenceRecord in CIXCI Audit/Evidence spine
        from apps.audit.models import AuditRecord, EvidenceRecord
        
        # Verify AuditRecord exists
        audit_recs = AuditRecord.objects.filter(
            event_code="order_export.reexport_sent",
            source_record_id=attempt1.id
        )
        assert audit_recs.exists()
        audit_rec = audit_recs.first()
        assert audit_rec.status == "success"
        assert audit_rec.company_scope_reference == log.vendor_company_reference
        assert audit_rec.actor_reference == data['vendor_user'].id
        
        # Verify EvidenceRecord exists and is linked
        evidence_recs = EvidenceRecord.objects.filter(audit_record=audit_rec)
        assert evidence_recs.exists()
        evidence_rec = evidence_recs.first()
        assert evidence_rec.evidence_hash_reference == expected_checksum
        assert evidence_rec.company_scope_reference == log.vendor_company_reference
        
        # Attempt 2 (Incremental attempt number, trigger with "Other" + explanation)
        resp = client.post(f"/api/v1/routing/export-logs/{log.id}/reexport/", {
            "reason": "Other",
            "explanation": "Special client request"
        }, format="json")
        assert resp.status_code == 201

        log.refresh_from_db()
        assert log.reexport_count == 2
        attempts = list(log.reexport_attempts.all().order_by("attempt_number"))
        assert len(attempts) == 2
        assert attempts[1].attempt_number == 2
        assert attempts[1].reexport_attempt_id == "rx_00002"
        assert attempts[1].reason_code == "Other"
        assert attempts[1].reason_notes == "Special client request"
