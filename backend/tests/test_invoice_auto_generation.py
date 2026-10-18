import uuid
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from apps.tenant.models import Company, CompanyEntity, User
from apps.routing.models import Order, RoutedSuborder
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine
from apps.catalog.models import Product
from apps.invoicing.models import Invoice, InvoiceLine, InvoiceRun, InvoiceExceptionRecord


@pytest.fixture
def auto_gen_data(db):
    """Setup buyer, vendor, product, order, PO with lines for auto-generation tests."""
    buyer = Company.objects.create(
        name="AutoGen Buyer",
        company_type="buyer",
        status="active",
        slug="autogen-buyer",
    )
    vendor = Company.objects.create(
        name="AutoGen Vendor",
        company_type="vendor",
        status="active",
        slug="autogen-vendor",
    )
    buyer_entity = CompanyEntity.objects.create(company=buyer, name="Buyer HQ", status="active")
    admin_user = User.objects.create_superuser(
        email="admin@autogen.test",
        password="adminpass123",
    )

    product = Product.objects.create(
        sku="AUTO-PROD-001",
        name="Auto Test Case",
        vendor_company_reference=vendor.id,
        company_scope_reference=vendor.id,
        vendor_wholesale_price_amount=Decimal("10.00"),
        msrp=Decimal("50.00"),
        upc="111111111111",
        status="active",
        launch_date=timezone.now().date(),
    )

    po = PurchaseOrder.objects.create(
        company_scope_reference=buyer.id,
        buyer_reference=admin_user.id,
        vendor_company_reference=vendor.id,
        status="approved",
        po_number="PO-AUTO-001",
        pricing_snapshot_reference=uuid.uuid4(),
    )
    pol = PurchaseOrderLine.objects.create(
        purchase_order=po,
        product_reference=product.id,
        quantity=5,
        unit_price_snapshot=Decimal("17.00"),
        line_total=Decimal("85.00"),
    )

    return {
        "buyer": buyer,
        "vendor": vendor,
        "product": product,
        "po": po,
        "pol": pol,
        "admin_user": admin_user,
    }


@pytest.mark.django_db
class TestCreateFromOrders:

    def test_create_from_orders_generates_invoice(self, auto_gen_data):
        """Auto-generate invoice from POs in date range creates invoice with lines."""
        client = APIClient()
        client.force_authenticate(user=auto_gen_data["admin_user"])

        today = timezone.now().date()
        response = client.post(
            "/api/v1/invoicing/invoices/create-from-orders/",
            {
                "invoice_type": "buyer_invoice",
                "counterparty_reference": str(auto_gen_data["buyer"].id),
                "period_start": today.isoformat(),
                "period_end": today.isoformat(),
                "currency": "USD",
            },
            format="json",
        )
        assert response.status_code == 201

        invoice_id = response.data["id"]
        invoice = Invoice.objects.get(id=invoice_id)
        assert invoice.counterparty_reference == auto_gen_data["buyer"].id
        assert invoice.status == "draft"
        assert invoice.invoice_type == "buyer_invoice"

        lines = InvoiceLine.objects.filter(invoice=invoice)
        assert lines.count() == 1
        line = lines.first()
        assert line.quantity == 5
        assert line.unit_price_snapshot == Decimal("17.00")
        assert line.line_total == Decimal("85.00")
        assert line.source_module == "procurement"
        assert line.source_order_line_reference == auto_gen_data["pol"].id

        run = InvoiceRun.objects.get(id=invoice.run_id)
        assert run.status == "complete"

    def test_create_from_orders_skips_zero_price_lines(self, auto_gen_data):
        """Lines with 0.00 price create exception records, not invoice lines."""
        client = APIClient()
        client.force_authenticate(user=auto_gen_data["admin_user"])

        # Add a zero-price line
        product2 = Product.objects.create(
            sku="AUTO-PROD-002",
            name="Zero Price Product",
            vendor_company_reference=auto_gen_data["vendor"].id,
            company_scope_reference=auto_gen_data["vendor"].id,
            vendor_wholesale_price_amount=None,
            msrp=None,
            upc="222222222222",
            status="active",
            launch_date=timezone.now().date(),
        )
        PurchaseOrderLine.objects.create(
            purchase_order=auto_gen_data["po"],
            product_reference=product2.id,
            quantity=3,
            unit_price_snapshot=Decimal("0.00"),
            line_total=Decimal("0.00"),
        )

        today = timezone.now().date()
        response = client.post(
            "/api/v1/invoicing/invoices/create-from-orders/",
            {
                "invoice_type": "buyer_invoice",
                "counterparty_reference": str(auto_gen_data["buyer"].id),
                "period_start": today.isoformat(),
                "period_end": today.isoformat(),
                "currency": "USD",
            },
            format="json",
        )
        assert response.status_code == 201

        invoice = Invoice.objects.get(id=response.data["id"])
        lines = InvoiceLine.objects.filter(invoice=invoice)
        # Only the priced line should be invoiced
        assert lines.count() == 1
        assert lines.first().quantity == 5

        exceptions = InvoiceExceptionRecord.objects.filter(invoice=invoice)
        assert exceptions.count() == 1
        assert exceptions.first().exception_kind == "missing_pricing_evidence"
        assert exceptions.first().is_blocking is False

    def test_create_from_orders_no_orders_in_period(self, auto_gen_data):
        """Returns error when no orders in the specified period."""
        client = APIClient()
        client.force_authenticate(user=auto_gen_data["admin_user"])

        # Use a future date range with no orders
        response = client.post(
            "/api/v1/invoicing/invoices/create-from-orders/",
            {
                "invoice_type": "buyer_invoice",
                "counterparty_reference": str(auto_gen_data["buyer"].id),
                "period_start": "2030-01-01",
                "period_end": "2030-01-31",
                "currency": "USD",
            },
            format="json",
        )
        assert response.status_code == 400
        assert "No billable orders" in response.data["error"]

    def test_create_from_orders_requires_fields(self, auto_gen_data):
        """Missing required fields returns 400."""
        client = APIClient()
        client.force_authenticate(user=auto_gen_data["admin_user"])

        response = client.post(
            "/api/v1/invoicing/invoices/create-from-orders/",
            {"invoice_type": "buyer_invoice"},
            format="json",
        )
        assert response.status_code == 400
        assert "counterparty_reference" in response.data["errors"]
        assert "period_start" in response.data["errors"]
        assert "period_end" in response.data["errors"]

    def test_create_from_orders_aggregates_by_product(self, auto_gen_data):
        """Same product across multiple POs is aggregated into one invoice line."""
        client = APIClient()
        client.force_authenticate(user=auto_gen_data["admin_user"])

        # Create a second PO for the same buyer with the same product
        po2 = PurchaseOrder.objects.create(
            company_scope_reference=auto_gen_data["buyer"].id,
            buyer_reference=auto_gen_data["admin_user"].id,
            vendor_company_reference=auto_gen_data["vendor"].id,
            status="approved",
            po_number="PO-AUTO-002",
            pricing_snapshot_reference=uuid.uuid4(),
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po2,
            product_reference=auto_gen_data["product"].id,
            quantity=3,
            unit_price_snapshot=Decimal("17.00"),
            line_total=Decimal("51.00"),
        )

        today = timezone.now().date()
        response = client.post(
            "/api/v1/invoicing/invoices/create-from-orders/",
            {
                "invoice_type": "buyer_invoice",
                "counterparty_reference": str(auto_gen_data["buyer"].id),
                "period_start": today.isoformat(),
                "period_end": today.isoformat(),
                "currency": "USD",
            },
            format="json",
        )
        assert response.status_code == 201

        lines = InvoiceLine.objects.filter(invoice_id=response.data["id"])
        # Should aggregate into one line: 5 + 3 = 8
        assert lines.count() == 1
        assert lines.first().quantity == 8
        assert lines.first().line_total == Decimal("136.00")

    def test_create_from_orders_excludes_cancelled(self, auto_gen_data):
        """Cancelled/draft/rejected POs are excluded from invoice generation."""
        client = APIClient()
        client.force_authenticate(user=auto_gen_data["admin_user"])

        # Cancel the existing PO and create a new approved one
        auto_gen_data["po"].status = "cancelled"
        auto_gen_data["po"].save()

        po2 = PurchaseOrder.objects.create(
            company_scope_reference=auto_gen_data["buyer"].id,
            buyer_reference=auto_gen_data["admin_user"].id,
            vendor_company_reference=auto_gen_data["vendor"].id,
            status="approved",
            po_number="PO-AUTO-003",
            pricing_snapshot_reference=uuid.uuid4(),
        )
        PurchaseOrderLine.objects.create(
            purchase_order=po2,
            product_reference=auto_gen_data["product"].id,
            quantity=2,
            unit_price_snapshot=Decimal("17.00"),
            line_total=Decimal("34.00"),
        )

        today = timezone.now().date()
        response = client.post(
            "/api/v1/invoicing/invoices/create-from-orders/",
            {
                "invoice_type": "buyer_invoice",
                "counterparty_reference": str(auto_gen_data["buyer"].id),
                "period_start": today.isoformat(),
                "period_end": today.isoformat(),
                "currency": "USD",
            },
            format="json",
        )
        assert response.status_code == 201

        lines = InvoiceLine.objects.filter(invoice_id=response.data["id"])
        # Only the approved PO's line should be included
        assert lines.count() == 1
        assert lines.first().quantity == 2
