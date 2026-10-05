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

        from unittest.mock import patch
        with patch("apps.integration.services.send_operational_vendor_email") as mock_send:
            mock_send.return_value = {"success": False, "error": "SMTP Connection Timeout"}
            trigger_vendor_export(vendor)

        window = VendorExportWindow.objects.filter(vendor_company_reference=vendor.id).first()
        assert window is not None
        assert window.status == "cancelled"

        attempt = VendorExportDeliveryAttempt.objects.filter(window=window).first()
        assert attempt is not None
        assert attempt.outcome == "failed"

        from apps.routing.models import VendorOrderExportLog
        log = VendorOrderExportLog.objects.filter(window=window).first()
        assert log is not None
        assert log.email_send_result == "failed"

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
        assert window.status == "closed"

        attempt = VendorExportDeliveryAttempt.objects.filter(window=window).first()
        assert attempt is not None
        assert attempt.outcome == "succeeded"
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


@pytest.mark.django_db
class TestUpdateShippingEndpoint:
    """
    Tests for PATCH /api/v1/routing/orders/{id}/update-shipping/

    Covers the bug reported in production where orders created without shipping
    data cannot be exported until shipping is added retroactively.
    """

    @pytest.fixture
    def setup(self, db):
        buyer = Company.objects.create(
            name="Shipping Test Buyer",
            company_type=CompanyType.BUYER,
            status=CompanyStatus.ACTIVE,
            slug="shipping-test-buyer",
        )
        vendor = Company.objects.create(
            name="Shipping Test Vendor",
            company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE,
            slug="shipping-test-vendor",
        )
        import json
        vendor.external_id = json.dumps({"integration_mode": "manual"})
        vendor.order_digest_emails = ["vendor@vendor.test"]
        vendor.save()

        product = Product.objects.create(
            name="Ship Test Product",
            sku="SHIP-SKU-001",
            upc="111222333444",
            product_type="accessory",
            vendor_company_reference=vendor.id,
            company_scope_reference=vendor.id,
            msrp=10.0,
            launch_date=timezone.now().date() - timezone.timedelta(days=1),
            status=ProductStatus.ACTIVE,
            compatibility_status="complete",
        )

        buyer_entity = CompanyEntity.objects.create(company=buyer, name="Buyer HQ")
        buyer_user = User.objects.create_user(
            email="buyer@ship.test",
            entity=buyer_entity,
            password="buyerpass",
        )

        po = PurchaseOrder.objects.create(
            company_scope_reference=buyer.id,
            buyer_reference=buyer_user.id,
            vendor_company_reference=vendor.id,
            status=POStatus.APPROVED,
            po_number="PO-SHIP-001",
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po,
            product_reference=product.id,
            quantity=2,
            unit_price_snapshot=10.0,
            line_total=20.0,
        )

        order = Order.objects.create(
            id=po.id,
            company_scope_reference=buyer.id,
            buyer_reference=buyer_user.id,
            buyer_entity_reference=buyer_entity.id,
            status=RoutingStatus.PLACED,
        )

        # Suborder intentionally created WITHOUT valid customer_shipping fields.
        # We use an empty dict (not a missing key) to prevent the fallback default
        # from kicking in so eligibility validation will correctly fail.
        sub = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=vendor.id,
            status=RoutingStatus.PLACED,
            routing_snapshot={
                "po_number": "PO-SHIP-001",
                # Use blank string values so the dict is truthy (prevents fallback default)
                # but required field validation still fails due to empty strings.
                "customer_shipping": {
                    "customer_first_name": "",
                    "customer_last_name": "",
                    "address_1": "",
                    "city": "",
                    "state": "",
                    "zip": "",
                },
            },
        )

        admin_user = User.objects.filter(is_superuser=True, is_active=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                email="admin@ship.test", password="adminpass"
            )

        return {
            "buyer": buyer,
            "vendor": vendor,
            "product": product,
            "order": order,
            "sub": sub,
            "buyer_entity": buyer_entity,
            "admin_user": admin_user,
        }

    def _client(self, user):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    # ── 1. Happy path: add shipping to an order that has none ─────────────────

    def test_update_shipping_success(self, setup):
        order = setup["order"]
        sub = setup["sub"]
        client = self._client(setup["admin_user"])

        payload = {
            "customer_first_name": "John",
            "customer_last_name": "Doe",
            "address_1": "123 Main St",
            "city": "Austin",
            "state": "TX",
            "zip": "78701",
            "country": "US",
        }
        response = client.patch(
            f"/api/v1/routing/orders/{order.id}/update-shipping/",
            payload,
            format="json",
        )
        assert response.status_code == 200, response.data
        assert response.data["suborders_updated"] == 1

        sub.refresh_from_db()
        shipping = sub.routing_snapshot["customer_shipping"]
        assert shipping["customer_first_name"] == "John"
        assert shipping["customer_last_name"] == "Doe"
        assert shipping["address_1"] == "123 Main St"
        assert shipping["city"] == "Austin"
        assert shipping["zip"] == "78701"
        # Aliases should also be populated
        assert shipping["first_name"] == "John"
        assert shipping["zip_code"] == "78701"

    # ── 2. Guard: cannot update shipping on a non-placed order ────────────────

    def test_update_shipping_blocked_on_non_placed_order(self, setup):
        order = setup["order"]
        client = self._client(setup["admin_user"])

        order.status = RoutingStatus.PROCESSING
        order.save(update_fields=["status"])

        response = client.patch(
            f"/api/v1/routing/orders/{order.id}/update-shipping/",
            {"customer_first_name": "Jane"},
            format="json",
        )
        assert response.status_code == 400
        assert "placed" in response.data["detail"].lower()

    # ── 3. Rejection: no recognized shipping fields sent ──────────────────────

    def test_update_shipping_rejects_unknown_fields(self, setup):
        order = setup["order"]
        client = self._client(setup["admin_user"])

        response = client.patch(
            f"/api/v1/routing/orders/{order.id}/update-shipping/",
            {"some_random_field": "value"},
            format="json",
        )
        assert response.status_code == 400
        assert "No recognized shipping fields" in response.data["detail"]
        assert "accepted_fields" in response.data

    # ── 4. Partial update: only provided fields are overwritten ───────────────

    def test_update_shipping_is_additive(self, setup):
        order = setup["order"]
        sub = setup["sub"]
        client = self._client(setup["admin_user"])

        # Pre-populate with partial data
        sub.routing_snapshot = {
            "customer_shipping": {
                "customer_first_name": "OrigFirst",
                "customer_last_name": "OrigLast",
            }
        }
        sub.save()

        # Only update the first name
        response = client.patch(
            f"/api/v1/routing/orders/{order.id}/update-shipping/",
            {"customer_first_name": "NewFirst"},
            format="json",
        )
        assert response.status_code == 200

        sub.refresh_from_db()
        shipping = sub.routing_snapshot["customer_shipping"]
        assert shipping["customer_first_name"] == "NewFirst"
        # Last name must be preserved
        assert shipping["customer_last_name"] == "OrigLast"

    # ── 5. End-to-end: fix missing shipping → export succeeds ────────────────

    def test_fix_shipping_then_export_succeeds(self, setup):
        """
        Reproduces the production bug: order created without shipping info
        cannot be exported.  After calling update-shipping the export
        preview shows the suborder as eligible.
        """
        order = setup["order"]
        sub = setup["sub"]
        buyer = setup["buyer"]
        vendor = setup["vendor"]
        product = setup["product"]
        buyer_entity = setup["buyer_entity"]
        client = self._client(setup["admin_user"])

        # Set up compatibility projection & relationship so all other checks pass
        BuyerScopedCompatibilityProjection.objects.create(
            buyer_reference=buyer.id,
            company_scope_reference=buyer.id,
            buyer_entity_reference=buyer_entity.id,
            portfolio_snapshot_reference=uuid.uuid4(),
            compatible_product_ids=[str(product.id)],
            last_recalculated_at=timezone.now(),
        )
        CompanyRelationship.objects.create(
            buyer_company=buyer,
            vendor_company=vendor,
            status=RelationshipStatus.ACTIVE,
        )

        # Step 1: preview before shipping is present → ineligible
        preview_before = client.post(
            "/api/v1/routing/orders/manual-export/",
            {"suborder_ids": [str(sub.id)]},
            format="json",
        )
        assert preview_before.status_code == 200
        assert preview_before.data["preview"]["ineligible_count"] == 1

        # Step 2: add the missing shipping via update-shipping
        fix_response = client.patch(
            f"/api/v1/routing/orders/{order.id}/update-shipping/",
            {
                "customer_first_name": "John",
                "customer_last_name": "Doe",
                "address_1": "123 Main St",
                "city": "Austin",
                "state": "TX",
                "zip": "78701",
                "country": "US",
            },
            format="json",
        )
        assert fix_response.status_code == 200, fix_response.data

        # Step 3: preview after shipping is present → eligible
        preview_after = client.post(
            "/api/v1/routing/orders/manual-export/",
            {"suborder_ids": [str(sub.id)]},
            format="json",
        )
        assert preview_after.status_code == 200
        assert preview_after.data["preview"]["eligible_count"] == 1
        assert preview_after.data["preview"]["ineligible_count"] == 0
