import pytest
import json
import uuid
from django.utils import timezone
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus, CompanyRelationship, RelationshipStatus
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
from apps.catalog.models import Product, ProductStatus, BuyerScopedCompatibilityProjection
from apps.routing.models import Order, RoutedSuborder, RoutingStatus, VendorExportWindow, VendorExportDeliveryAttempt
from apps.routing.tasks import validate_line_eligibility, trigger_vendor_export
from apps.notification.models import NotificationRequest, DeliveryAttempt, DeliveryStatus
from apps.notification.tasks import process_notification_request

@pytest.mark.django_db
class TestVendorExportValidation:

    @pytest.fixture
    def setup_data(self, db):
        # Create active Buyer
        buyer = Company.objects.create(
            name="Test Buyer",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE,
            slug="test-buyer"
        )
        
        # Create active Vendor
        vendor = Company.objects.create(
            name="Test Vendor",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE,
            slug="test-vendor"
        )
        vendor.external_id = json.dumps({"integration_mode": "manual"})
        vendor.order_digest_emails = ["vendor_receiver@vendor.test"]
        vendor.save()

        # Create active Product owned by Vendor
        product = Product.objects.create(
            name="Accessory Product",
            sku="ACC-SKU-999",
            upc="987654321098",
            product_type="accessory",
            vendor_company_reference=vendor.id,
            company_scope_reference=vendor.id,
            msrp=20.0,
            launch_date=timezone.now().date() - timezone.timedelta(days=1),
            status=ProductStatus.ACTIVE,
            compatibility_status="complete",
        )

        # Create Buyer user
        buyer_entity = CompanyEntity.objects.create(company=buyer, name="Buyer HQ")
        buyer_user = User.objects.create_user(
            email="buyer@buyer.test",
            entity=buyer_entity,
            password="buyerpass123"
        )

        # Create Vendor user
        vendor_entity = CompanyEntity.objects.create(company=vendor, name="Vendor HQ")
        vendor_user = User.objects.create_user(
            email="vendor_receiver@vendor.test",
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

        # Create routing Order
        routing_order = Order.objects.create(
            id=po.id,
            company_scope_reference=buyer.id,
            buyer_reference=buyer_user.id,
            buyer_entity_reference=buyer_entity.id,
            status=RoutingStatus.PLACED
        )

        # Create RoutedSuborder
        sub = RoutedSuborder.objects.create(
            order=routing_order,
            vendor_company_reference=vendor.id,
            status=RoutingStatus.PLACED,
            routing_snapshot={
                "customer_shipping": {
                    "customer_first_name": "Jane",
                    "customer_last_name": "Smith",
                    "address_1": "456 Oak Ave",
                    "city": "Dallas",
                    "state": "TX",
                    "zip": "75201",
                    "country": "US"
                }
            }
        )

        return {
            "buyer": buyer,
            "vendor": vendor,
            "product": product,
            "sub": sub,
            "line": line,
            "po": po,
            "buyer_entity": buyer_entity
        }

    def test_successful_validation(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]
        buyer_entity = setup_data["buyer_entity"]

        # Ensure compatibility projection exists and contains the product
        BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=buyer.id,
            company_scope_reference=buyer.id,
            buyer_entity_reference=buyer_entity.id,
            portfolio_snapshot_reference=uuid.uuid4(),
            compatible_product_ids=[str(product.id)],
            last_recalculated_at=timezone.now()
        )

        # Ensure relationship is approved/active
        CompanyRelationship.objects.create(
            buyer_company=buyer,
            vendor_company=vendor,
            status=RelationshipStatus.ACTIVE
        )

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is True, f"Failed: {reason}"

    def test_inactive_buyer(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]

        buyer.status = CompanyStatus.DRAFT
        buyer.save()

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "Buyer company is not active" in reason

    def test_inactive_vendor(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]

        vendor.status = CompanyStatus.DRAFT
        vendor.save()

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "Vendor company is not active" in reason

    def test_inactive_product(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]

        product.status = ProductStatus.INACTIVE
        product.save()

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "Product is not active" in reason

    def test_missing_shipping_fields(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]

        # Missing first name
        sub.routing_snapshot = {
            "customer_shipping": {
                "customer_first_name": "",
                "customer_last_name": "Smith",
                "address_1": "456 Oak Ave",
                "city": "Dallas",
                "state": "TX",
                "zip": "75201"
            }
        }
        sub.save()

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "Customer First Name is required" in reason

    def test_invalid_zip_code(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]

        # Invalid US Zip code
        sub.routing_snapshot = {
            "customer_shipping": {
                "customer_first_name": "Jane",
                "customer_last_name": "Smith",
                "address_1": "456 Oak Ave",
                "city": "Dallas",
                "state": "TX",
                "zip": "ABCDE",
                "country": "US"
            }
        }
        sub.save()

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "Invalid US zip code format" in reason

    def test_incompatible_product(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]
        buyer_entity = setup_data["buyer_entity"]

        # Compatibility projection exists but DOES NOT contain product
        BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=buyer.id,
            company_scope_reference=buyer.id,
            buyer_entity_reference=buyer_entity.id,
            portfolio_snapshot_reference=uuid.uuid4(),
            compatible_product_ids=[],
            last_recalculated_at=timezone.now()
        )

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "not in compatible product set" in reason

    def test_missing_relationship(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]

        # Create another relationship in DB to enforce relationship checks globally
        other_buyer = Company.objects.create(
            name="Other Buyer", company_type=CompanyType.BUYER, status=CompanyStatus.ACTIVE, slug="other-buyer"
        )
        CompanyRelationship.objects.create(
            buyer_company=other_buyer,
            vendor_company=vendor,
            status=RelationshipStatus.ACTIVE
        )

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "No relationship defined between Buyer" in reason

    def test_inactive_relationship(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        line = setup_data["line"]

        CompanyRelationship.objects.create(
            buyer_company=buyer,
            vendor_company=vendor,
            status=RelationshipStatus.PENDING
        )

        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer)
        assert is_eligible is False
        assert "Relationship is not active" in reason

    def test_delivery_failure_callback(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        buyer_entity = setup_data["buyer_entity"]

        # Setup active relationship & compatibility so trigger_vendor_export succeeds
        BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=buyer.id,
            company_scope_reference=buyer.id,
            buyer_entity_reference=buyer_entity.id,
            portfolio_snapshot_reference=uuid.uuid4(),
            compatible_product_ids=[str(product.id)],
            last_recalculated_at=timezone.now()
        )
        CompanyRelationship.objects.create(
            buyer_company=buyer,
            vendor_company=vendor,
            status=RelationshipStatus.ACTIVE
        )

        trigger_vendor_export(vendor)

        # Get window created
        window = VendorExportWindow.objects.filter(vendor_company_reference=vendor.id).first()
        assert window is not None
        assert window.status == "processing"

        # Check delivery attempt is in progress
        attempt = VendorExportDeliveryAttempt.objects.filter(window=window).first()
        assert attempt is not None
        assert attempt.outcome == "in_progress"

        # Get notification request
        req = NotificationRequest.objects.filter(source_record_id=window.id).first()
        assert req is not None

        # Simulate exception during sending (mock delivery failing)
        from apps.routing.services import handle_failed_export_delivery
        handle_failed_export_delivery(window.id, attempt, error_message="SMTP Connection Timeout")

        window.refresh_from_db()
        attempt.refresh_from_db()
        assert window.status == "cancelled"
        assert attempt.outcome == "failed"

        # Check export log updated with fail message
        from apps.routing.models import VendorOrderExportLog
        log = VendorOrderExportLog.objects.filter(window=window).first()
        assert log is not None
        assert "failed: SMTP Connection Timeout" in log.email_send_result

    def test_delivery_success_callback(self, setup_data):
        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]
        buyer_entity = setup_data["buyer_entity"]

        # Setup active relationship & compatibility
        BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=buyer.id,
            company_scope_reference=buyer.id,
            buyer_entity_reference=buyer_entity.id,
            portfolio_snapshot_reference=uuid.uuid4(),
            compatible_product_ids=[str(product.id)],
            last_recalculated_at=timezone.now()
        )
        CompanyRelationship.objects.create(
            buyer_company=buyer,
            vendor_company=vendor,
            status=RelationshipStatus.ACTIVE
        )

        trigger_vendor_export(vendor)

        window = VendorExportWindow.objects.filter(vendor_company_reference=vendor.id).first()
        assert window is not None
        assert window.status == "processing"

        attempt = VendorExportDeliveryAttempt.objects.filter(window=window).first()
        assert attempt is not None

        # Mock successful delivery
        from apps.routing.services import handle_successful_export_delivery
        class FakeNotificationAttempt:
            id = uuid.uuid4()
        
        handle_successful_export_delivery(window.id, FakeNotificationAttempt())

        window.refresh_from_db()
        assert window.status == "closed"

        # Check export log updated with success message
        from apps.routing.models import VendorOrderExportLog
        log = VendorOrderExportLog.objects.filter(window=window).first()
        assert log is not None
        assert log.email_send_result == "success"

    def test_manual_export_api_validation_preview_and_confirm(self, setup_data):
        from rest_framework.test import APIClient

        buyer = setup_data["buyer"]
        vendor = setup_data["vendor"]
        product = setup_data["product"]
        sub = setup_data["sub"]

        # Make the suborder ineligible by removing shipping info
        sub.routing_snapshot = {"customer_shipping": {"customer_first_name": ""}}
        sub.save()

        client = APIClient()
        from apps.tenant.models import User
        admin_user = User.objects.filter(is_superuser=True, is_active=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                email="admin@cixci.test", password="adminpassword"
            )
        client.force_authenticate(user=admin_user)

        # 1. Test preview when ineligible
        response = client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(sub.id)]
        }, format="json")
        print("PREVIEW RESPONSE DATA:", response.data)
        assert response.status_code == 200
        assert "preview" in response.data
        assert response.data["preview"]["eligible_count"] == 0
        assert response.data["preview"]["ineligible_count"] == 1
        assert "Customer First Name is required" in response.data["preview"]["ineligible_suborders"][0]["errors"][0]

        # 2. Test confirm when ineligible -> must fail with 400
        response = client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(sub.id)],
            "confirm": True
        }, format="json")
        assert response.status_code == 400
        assert "Cannot export: some selected suborders are ineligible." in response.data["detail"]

        # 3. Restore shipping info to make it eligible
        sub.routing_snapshot = {
            "customer_shipping": {
                "customer_first_name": "Jane",
                "customer_last_name": "Smith",
                "address_1": "456 Oak Ave",
                "city": "Dallas",
                "state": "TX",
                "zip": "75201",
                "country": "US"
            }
        }
        sub.save()

        # 4. Test preview when eligible
        response = client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(sub.id)]
        }, format="json")
        assert response.status_code == 200
        assert response.data["preview"]["eligible_count"] == 1
        assert response.data["preview"]["ineligible_count"] == 0

        # 5. Test confirm when eligible -> must succeed with 200
        response = client.post("/api/v1/routing/orders/manual-export/", {
            "suborder_ids": [str(sub.id)],
            "confirm": True
        }, format="json")
        assert response.status_code == 200
        assert "Manual export initiated successfully." in response.data["detail"]
