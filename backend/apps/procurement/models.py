"""
Procurement / Purchase Orders — Models (Proposal-level Phase 5)

Architecture rule: Procurement must NOT recalculate prices.
It consumes Pricing snapshot/quote-like references ONLY.
"""
import uuid
from django.db import models
from django.utils import timezone


class POStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    APPROVED = "approved", "Approved"
    SUBMITTED = "submitted", "Submitted"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    PARTIALLY_FULFILLED = "partially_fulfilled", "Partially Fulfilled"
    FULFILLED = "fulfilled", "Fulfilled"
    CANCELLED = "cancelled", "Cancelled"
    REJECTED = "rejected", "Rejected"
    EXPIRED = "expired", "Expired"
    DISPUTE = "dispute", "Dispute"
    CLOSED = "closed", "Closed"


class PurchaseOrder(models.Model):
    """Bulk Purchase Order. Consumes Pricing snapshots — NEVER recalculates."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_scope_reference = models.UUIDField(db_index=True)
    buyer_reference = models.UUIDField(db_index=True)
    vendor_company_reference = models.UUIDField(db_index=True)
    status = models.CharField(max_length=30, choices=POStatus.choices, default=POStatus.DRAFT)
    # Pricing snapshot reference (consume only — never recalculate)
    pricing_snapshot_reference = models.UUIDField(
        null=True, blank=True,
        help_text="EffectivePriceSnapshot ID from Pricing module — read-only reference"
    )
    po_number = models.CharField(max_length=200, blank=True)
    currency = models.CharField(max_length=3, default="USD")
    total_amount = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "procurement_purchase_order"
        indexes = [models.Index(fields=["company_scope_reference", "status"])]

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        if self.pricing_snapshot_reference:
            from apps.pricing.models import EffectivePriceSnapshot, SnapshotBindability
            try:
                snapshot = EffectivePriceSnapshot.objects.get(id=self.pricing_snapshot_reference)
                if snapshot.bindability_status == SnapshotBindability.NOT_BINDABLE:
                    raise ValidationError({"pricing_snapshot_reference": "The selected pricing snapshot is not bindable due to MAP policy violations."})
            except EffectivePriceSnapshot.DoesNotExist:
                pass

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class PurchaseOrderLine(models.Model):
    """Single line of a PurchaseOrder."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="lines")
    product_reference = models.UUIDField(db_index=True)
    quantity = models.PositiveIntegerField()
    # Unit price from snapshot — read-only
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=4)
    line_total = models.DecimalField(max_digits=12, decimal_places=4)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "procurement_purchase_order_line"

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        from apps.catalog.models import Product, ProductStatus
        
        is_new = not self.pk
        po = getattr(self, "purchase_order", None)
        po_is_new_or_draft = False
        if po:
            po_is_new_or_draft = not po.pk or po.status in ["draft", "pending_approval"]
            
        if is_new or po_is_new_or_draft:
            try:
                product = Product.objects.get(id=self.product_reference)
                if product.status == ProductStatus.OUT_OF_STOCK:
                    raise ValidationError(f"Product SKU '{product.sku}' is currently Out of Stock and cannot be ordered.")
                if product.compatibility_status == "incomplete":
                    raise ValidationError(f"Product SKU '{product.sku}' is Compatibility Incomplete and cannot be ordered.")
            except Product.DoesNotExist:
                pass

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

