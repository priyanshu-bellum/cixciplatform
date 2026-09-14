import uuid
import pytest
from django.utils import timezone
from apps.tenant.models import Company, CompanyEntity, User
from apps.routing.models import Order
from apps.fulfillment.models import FulfillmentHandoff
from apps.invoicing.models import Invoice, InvoiceRun, InvoicePeriod, InvoiceType, InvoiceStatus

@pytest.mark.django_db
class TestCixciAdminCommercePlatformWideVisibility:
    """Verify CIXCI Admin sees all orders, fulfillment, and invoices across all buyers and vendors."""

    @pytest.fixture
    def setup_platform_data(self, buyer_company, vendor_company, buyer_user):
        # Create second buyer company & second vendor company
        buyer_company_2 = Company.objects.create(
            name="Second Buyer Corp",
            company_type="buyer",
            status="active",
            slug="buyer-corp-2",
        )
        vendor_company_2 = Company.objects.create(
            name="Second Vendor Inc",
            company_type="vendor",
            status="active",
            slug="vendor-inc-2",
        )

        # Orders: 1 for Buyer 1, 1 for Buyer 2
        order_1 = Order.objects.create(
            id=uuid.uuid4(),
            company_scope_reference=buyer_company.id,
            buyer_reference=buyer_user.id,
            buyer_entity_reference=buyer_user.entity_id,
            status="pending",
            placed_at=timezone.now(),
        )
        order_2 = Order.objects.create(
            id=uuid.uuid4(),
            company_scope_reference=buyer_company_2.id,
            buyer_reference=uuid.uuid4(),
            buyer_entity_reference=uuid.uuid4(),
            status="routed",
            placed_at=timezone.now(),
        )

        # Fulfillment Handoffs: 1 for Vendor 1, 1 for Vendor 2
        handoff_1 = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=vendor_company.id,
            company_scope_reference=buyer_company.id,
            status="received",
        )
        handoff_2 = FulfillmentHandoff.objects.create(
            routed_suborder_reference=uuid.uuid4(),
            vendor_company_reference=vendor_company_2.id,
            company_scope_reference=buyer_company_2.id,
            status="shipped",
        )

        # Invoices: 1 for Buyer 1, 1 for Buyer 2
        run = InvoiceRun.objects.create(
            company_scope_reference=buyer_company.id,
            run_label="Platform Test Run",
            idempotency_key=f"run-{uuid.uuid4()}",
            created_by=uuid.uuid4(),
        )
        period = InvoicePeriod.objects.create(
            run=run,
            company_scope_reference=buyer_company.id,
            period_start=timezone.now().date(),
            period_end=timezone.now().date(),
        )
        invoice_1 = Invoice.objects.create(
            run=run,
            period=period,
            company_scope_reference=buyer_company.id,
            counterparty_role="buyer",
            counterparty_reference=buyer_company.id,
            invoice_type=InvoiceType.BUYER_INVOICE,
            status=InvoiceStatus.ISSUED,
            subtotal=100.0,
            grand_total=100.0,
        )
        invoice_2 = Invoice.objects.create(
            run=run,
            period=period,
            company_scope_reference=buyer_company_2.id,
            counterparty_role="buyer",
            counterparty_reference=buyer_company_2.id,
            invoice_type=InvoiceType.BUYER_INVOICE,
            status=InvoiceStatus.ISSUED,
            subtotal=250.0,
            grand_total=250.0,
        )

        return {
            "order_1": order_1,
            "order_2": order_2,
            "handoff_1": handoff_1,
            "handoff_2": handoff_2,
            "invoice_1": invoice_1,
            "invoice_2": invoice_2,
            "buyer_company_2": buyer_company_2,
        }

    def test_cixci_admin_sees_all_orders_across_buyers(self, admin_client, setup_platform_data):
        """CIXCI Admin must see all orders on the platform across all buyers."""
        resp = admin_client.get("/api/v1/routing/orders/")
        assert resp.status_code == 200
        order_ids = [o["id"] for o in resp.data.get("results", resp.data)]
        assert str(setup_platform_data["order_1"].id) in order_ids
        assert str(setup_platform_data["order_2"].id) in order_ids

    def test_buyer_only_sees_own_orders(self, buyer_client, setup_platform_data):
        """Non-admin buyer only sees their own scoped orders."""
        resp = buyer_client.get("/api/v1/routing/orders/")
        assert resp.status_code == 200
        order_ids = [o["id"] for o in resp.data.get("results", resp.data)]
        assert str(setup_platform_data["order_1"].id) in order_ids
        assert str(setup_platform_data["order_2"].id) not in order_ids

    def test_cixci_admin_sees_all_fulfillment_handoffs_across_vendors(self, admin_client, setup_platform_data):
        """CIXCI Admin must see all fulfillment handoffs across all vendors and buyers."""
        resp = admin_client.get("/api/v1/fulfillment/handoffs/")
        assert resp.status_code == 200
        handoff_ids = [h["id"] for h in resp.data.get("results", resp.data)]
        assert str(setup_platform_data["handoff_1"].id) in handoff_ids
        assert str(setup_platform_data["handoff_2"].id) in handoff_ids

    def test_cixci_admin_sees_all_invoices_across_buyers_and_vendors(self, admin_client, setup_platform_data):
        """CIXCI Admin must see all invoices across all counterparties."""
        resp = admin_client.get("/api/v1/invoicing/invoices/")
        assert resp.status_code == 200
        invoice_ids = [inv["id"] for inv in resp.data.get("results", resp.data)]
        assert str(setup_platform_data["invoice_1"].id) in invoice_ids
        assert str(setup_platform_data["invoice_2"].id) in invoice_ids

        # Verify serializer method fields include counterparty and company names
        inv_data_1 = next(inv for inv in resp.data.get("results", resp.data) if inv["id"] == str(setup_platform_data["invoice_1"].id))
        assert "counterparty_name" in inv_data_1
        assert "company_name" in inv_data_1
