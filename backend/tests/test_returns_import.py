import pytest
import io
import json
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus, Capability
from apps.routing.models import Order, RoutedSuborder, RoutingStatus
from apps.fulfillment.models import ReturnRequest, ReturnStatus, VendorReturnImportLog

@pytest.mark.django_db
class TestVendorReturnImport:

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
        # Give vendor capability
        cap, _ = Capability.objects.get_or_create(code="fulfillment.return.update", defaults={"module": "fulfillment"})
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

        # Create parent order
        order = Order.objects.create(
            company_scope_reference=buyer.id,
            buyer_reference=buyer_user.id,
            buyer_entity_reference=buyer_entity.id,
            status=RoutingStatus.PROCESSING
        )

        # Create RoutedSuborder
        sub = RoutedSuborder.objects.create(
            order=order,
            vendor_company_reference=vendor.id,
            status=RoutingStatus.PROCESSING
        )

        # Create ReturnRequest in CIXCI (Return Sent to Vendor)
        initiation_time = timezone.now()
        return_req = ReturnRequest.objects.create(
            ran="RAN-12345",
            suborder_reference=sub.id,
            buyer_reference=buyer.id,
            reason="Defective battery",
            return_initiation_date=initiation_time,
            return_quantity=2,
            vendor_wholesale_price=Decimal("15.50"),
            pricing_snapshot_reference=None,
            sku="ACC-BAT-111",
            upc="111222333444",
            status=ReturnStatus.RETURN_SENT_TO_VENDOR
        )

        return {
            "buyer": buyer,
            "vendor": vendor,
            "other_vendor": other_vendor,
            "vendor_user": vendor_user,
            "other_vendor_user": other_vendor_user,
            "order": order,
            "sub": sub,
            "return_req": return_req,
            "initiation_date_str": initiation_time.strftime("%Y-%m-%d")
        }

    def generate_csv(self, rows):
        """Helper to generate a CSV file in memory matching the export returns example headers"""
        headers = [
            "Buyer", "Suborder", "RAN", "Reason", "Return Initiation Date",
            "Return Quantity", "Vendor Wholesale Price",
            "SKU", "UPC", "Return Received Date", "Return Refunded Amount", "Rejected Reason"
        ]
        out = io.StringIO()
        out.write(",".join(headers) + "\n")
        for row in rows:
            out.write(",".join(str(val) if val is not None else "" for val in row) + "\n")
        
        bio = io.BytesIO(out.getvalue().encode("utf-8"))
        bio.name = "return_import.csv"
        return bio

    # ─── Core Two-Step Workflow ───────────────────────────────────────────

    def test_import_returns_preview_and_confirm(self, setup_data):
        """Preview returns analysis without mutations; confirm applies changes + creates audit log."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "2026-07-28",
            "",
            ""
        ]]
        
        # 1. Preview Mode
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": False},
            format="multipart"
        )
        assert response.status_code == 200
        assert response.data["confirm_required"] is True
        assert response.data["summary"]["applied"] == 1

        # No DB mutation
        req = ReturnRequest.objects.get(ran="RAN-12345")
        assert req.status == ReturnStatus.RETURN_SENT_TO_VENDOR
        assert req.return_received_date is None

        # 2. Confirm Mode
        csv_file.seek(0)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        assert response.status_code == 200
        assert response.data["success_count"] == 1

        # DB updated
        req.refresh_from_db()
        assert req.status == ReturnStatus.RETURN_RECEIVED
        assert req.return_received_date is not None

        # Audit log created
        assert VendorReturnImportLog.objects.count() == 1
        log = VendorReturnImportLog.objects.first()
        assert log.rows_applied == 1
        assert log.rows_rejected == 0
        assert log.uploaded_by == setup_data["vendor_user"]
        assert log.company_scope_reference == setup_data["buyer"].id

    # ─── Locked Field Validation ──────────────────────────────────────────

    def test_import_returns_locked_field_mismatch(self, setup_data):
        """Mismatched SKU → row rejected, no DB mutation."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-BAD",  # wrong SKU
            "111222333444",
            "2026-07-28",
            "",
            ""
        ]]
        
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        assert response.status_code == 400
        assert "mismatch" in response.data["errors"][0]["errors"][0]
        assert "SKU" in response.data["errors"][0]["errors"][0]

        req = ReturnRequest.objects.get(ran="RAN-12345")
        assert req.status == ReturnStatus.RETURN_SENT_TO_VENDOR

    # ─── Vendor Isolation ─────────────────────────────────────────────────

    def test_import_returns_unauthorized_vendor(self, setup_data):
        """Other vendor cannot import returns for suborders they don't own."""
        client = APIClient()
        client.force_authenticate(user=setup_data["other_vendor_user"])

        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "2026-07-28",
            "",
            ""
        ]]
        
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        assert response.status_code == 400
        assert "permission" in response.data["errors"][0]["errors"][0]

    # ─── Blank Field Retention ────────────────────────────────────────────

    def test_import_returns_blank_fields_retention(self, setup_data):
        """Blank outcome fields must not erase previously accepted evidence."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        # Step 1: Import Return Received
        rows_recv = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "2026-07-28",
            "",
            ""
        ]]
        csv_recv = self.generate_csv(rows_recv)
        res = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_recv, "confirm": True},
            format="multipart"
        )
        assert res.status_code == 200

        req = ReturnRequest.objects.get(ran="RAN-12345")
        assert req.status == ReturnStatus.RETURN_RECEIVED
        assert req.return_received_date is not None

        # Step 2: Import Refunded with blank Return Received Date
        rows_refund = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "",       # blank Return Received Date
            "31.00",  # Return Refunded Amount
            ""
        ]]
        csv_refund = self.generate_csv(rows_refund)
        res2 = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_refund, "confirm": True},
            format="multipart"
        )
        assert res2.status_code == 200

        req.refresh_from_db()
        # Auto-closed after refund
        assert req.status == ReturnStatus.RETURN_CLOSED
        assert req.return_refunded_amount == Decimal("31.00")
        # Critical: return_received_date NOT erased
        assert req.return_received_date is not None

    # ─── Terminal State Protection ────────────────────────────────────────

    def test_import_returns_terminal_state_rejection(self, setup_data):
        """Cannot transition from refunded→rejected; identical re-import is skipped; closed returns are skipped."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        # Set to terminal: Closed (after refund)
        req = setup_data["return_req"]
        req.status = ReturnStatus.RETURN_CLOSED
        req.return_refunded_amount = Decimal("31.00")
        req.save()

        # Try to provide a rejection on a closed return
        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "",
            "",
            "Customer damaged the item"
        ]]
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        # Closed returns are skipped, not rejected
        assert response.status_code == 200
        assert response.data["skipped_count"] == 1
        assert response.data["success_count"] == 0

    # ─── Mutual Exclusivity ───────────────────────────────────────────────

    def test_mutual_exclusivity_refund_and_rejection(self, setup_data):
        """Refund amount and rejected reason cannot both be present on the same row."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "",
            "15.00",                    # Refund Amount
            "Customer damaged the item"  # Rejected Reason
        ]]
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        assert response.status_code == 400
        assert any("cannot both be present" in e.lower() for e in response.data["errors"][0]["errors"])

        # No DB mutation
        req = ReturnRequest.objects.get(ran="RAN-12345")
        assert req.status == ReturnStatus.RETURN_SENT_TO_VENDOR

    # ─── Refund Ceiling ───────────────────────────────────────────────────

    def test_refund_exceeds_allowed_amount(self, setup_data):
        """Refund amount exceeding wholesale × qty is rejected."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        # wholesale = 15.50, qty = 2, max = 31.00
        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "",
            "50.00",  # exceeds 31.00
            ""
        ]]
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        assert response.status_code == 400
        assert any("exceeds maximum" in e.lower() for e in response.data["errors"][0]["errors"])

        # No DB mutation
        req = ReturnRequest.objects.get(ran="RAN-12345")
        assert req.status == ReturnStatus.RETURN_SENT_TO_VENDOR

    # ─── Duplicate RAN in Batch ───────────────────────────────────────────

    def test_duplicate_ran_in_batch(self, setup_data):
        """Same RAN appearing twice in the CSV → second row = review_required."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        row_data = [
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "2026-07-28",
            "",
            ""
        ]
        rows = [row_data, row_data]  # duplicate
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": False},
            format="multipart"
        )
        assert response.status_code == 200
        assert response.data["summary"]["applied"] == 1
        assert response.data["summary"]["review_required"] == 1
        # Second row is review_required
        assert response.data["rows"][1]["status"] == "review_required"
        assert "Duplicate RAN" in response.data["rows"][1]["errors"][0]

    # ─── Auto-Close After Refund ──────────────────────────────────────────

    def test_return_closed_after_refund(self, setup_data):
        """Confirmed refund → status becomes return_closed."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "",
            "31.00",
            ""
        ]]
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        assert response.status_code == 200
        assert response.data["success_count"] == 1

        req = ReturnRequest.objects.get(ran="RAN-12345")
        assert req.status == ReturnStatus.RETURN_CLOSED
        assert req.return_refunded_amount == Decimal("31.00")

    # ─── Auto-Close After Rejection ───────────────────────────────────────

    def test_return_closed_after_rejection(self, setup_data):
        """Confirmed rejection → status becomes return_closed."""
        client = APIClient()
        client.force_authenticate(user=setup_data["vendor_user"])

        rows = [[
            "Test Buyer Corp",
            setup_data["sub"].id,
            "RAN-12345",
            "Defective battery",
            setup_data["initiation_date_str"],
            2,
            "15.50",
            "ACC-BAT-111",
            "111222333444",
            "",
            "",
            "Item was tampered with"
        ]]
        csv_file = self.generate_csv(rows)
        response = client.post(
            "/api/v1/fulfillment/return-requests/import-returns/",
            {"file": csv_file, "confirm": True},
            format="multipart"
        )
        assert response.status_code == 200
        assert response.data["success_count"] == 1

        req = ReturnRequest.objects.get(ran="RAN-12345")
        assert req.status == ReturnStatus.RETURN_CLOSED
        assert req.rejected_reason == "Item was tampered with"

    # ─── CSV Export ───────────────────────────────────────────────────────

    def test_export_returns_csv(self, setup_data):
        """Test exporting returns to CSV format."""
        client = APIClient()
        cap, _ = Capability.objects.get_or_create(code="fulfillment.return.list", defaults={"module": "fulfillment"})
        setup_data["vendor_user"].capabilities.add(cap)
        setup_data["vendor"].capabilities.add(cap)
        
        client.force_authenticate(user=setup_data["vendor_user"])
        response = client.get("/api/v1/fulfillment/return-requests/export-csv/")
        assert response.status_code == 200
        assert response["Content-Type"] == "text/csv"
        
        csv_content = response.content.decode("utf-8")
        lines = csv_content.splitlines()
        assert len(lines) >= 2
        
        headers = lines[0].split(",")
        assert headers[0] == "Buyer"
        assert headers[1] == "suborder"
        assert headers[2] == "RAN"
        assert headers[7] == "SKU"
        assert headers[8] == "UPC"

        row = lines[1].split(",")
        assert row[0] == "Test Buyer Corp"
        assert row[1] == str(setup_data["sub"].id)
        assert row[2] == "RAN-12345"
        assert row[7] == "ACC-BAT-111"
        assert row[8] == "111222333444"
