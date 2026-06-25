"""
Pricing — Models

Architecture rules (spec.md):
- Pricing is the SOLE owner of all commercial interpretation, calculations,
  snapshots, and pricing events. No other module may recalculate or override.
- Commission has TWO separate components: vendor_side and buyer_side (never collapsed).
- PricingChannel is a first-class dimension on every result/snapshot/event (8 values).
- BuyerFacingPricingVisibilityEvidence required before any buyer-facing price display.
- PO pricing bindability is explicit: procurement-bindable, invoice-bindable, requote-required.
- Return/refund adjustment pricing is a separate evidence surface.
"""
import uuid
from django.db import models
from django.utils import timezone


class PricingChannel(models.TextChoices):
    ONLINE_DTC = "online_dtc", "Online / Direct-to-Consumer"
    BULK_PO = "bulk_po", "Bulk Purchase Order"
    OWNED_CHANNEL = "owned_channel", "Owned Channel / Kaseory"
    BUYER_STOREFRONT = "buyer_storefront", "Buyer Storefront"
    MARKETPLACE = "marketplace", "Marketplace (placeholder)"
    RETAIL_POS = "retail_pos", "Retail POS (placeholder)"
    PROMOTIONAL = "promotional", "Promotional Campaign (placeholder)"
    BUYER_CONTRACT = "buyer_contract", "Buyer-Specific Contract (placeholder)"


class PricingProfileStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    SUPERSEDED = "superseded", "Superseded"
    RETIRED = "retired", "Retired"


class SnapshotBindability(models.TextChoices):
    ORDER_BINDABLE = "order_bindable", "Order Bindable"
    PROCUREMENT_BINDABLE = "procurement_bindable", "Procurement Bindable"
    INVOICE_BINDABLE = "invoice_bindable", "Invoice Bindable"
    EXPORT_BINDABLE = "export_bindable", "Export Bindable"
    NOT_BINDABLE = "not_bindable", "Not Bindable"
    REQUOTE_REQUIRED = "requote_required", "Requote Required"
    EXPIRED = "expired", "Expired"
    SUPERSEDED = "superseded", "Superseded"


# ─── Pricing Profile ──────────────────────────────────────────────────────────

class PricingProfile(models.Model):
    """
    Rules framework for a vendor/buyer relationship on a specific channel.
    Pricing owns interpretation; other modules consume snapshots.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_company_reference = models.UUIDField(db_index=True)
    buyer_company_reference = models.UUIDField(null=True, blank=True, db_index=True,
        help_text="Null = platform-default profile for this vendor")
    channel = models.CharField(max_length=30, choices=PricingChannel.choices, db_index=True)
    status = models.CharField(max_length=20, choices=PricingProfileStatus.choices, default=PricingProfileStatus.DRAFT)

    # Commission — ALWAYS two separate components (spec rule: never collapse)
    vendor_side_commission_rate = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
        help_text="e.g. 0.0700 = 7%. Configurable default — not a hard-coded rule."
    )
    buyer_side_commission_rate = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
        help_text="e.g. 0.0700 = 7%. Configurable default — not a hard-coded rule."
    )

    # Base rules
    markup_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    currency = models.CharField(max_length=3, default="USD")
    rounding_rule = models.CharField(max_length=30, default="round_half_up")

    # Bindability config
    order_bindable = models.BooleanField(default=True)
    procurement_bindable = models.BooleanField(default=False)

    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pricing_profile"
        indexes = [
            models.Index(fields=["vendor_company_reference", "channel", "status"]),
        ]


# ─── Effective Price Snapshot ─────────────────────────────────────────────────

class EffectivePriceSnapshot(models.Model):
    """
    Immutable snapshot of a calculated price at a point in time.
    Consuming modules (Order Routing, Invoice, Procurement) store the snapshot ID —
    they NEVER recalculate or re-interpret the price.

    Append-only: corrections produce a new snapshot (supersession), not a mutation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pricing_profile = models.ForeignKey(PricingProfile, on_delete=models.PROTECT, related_name="snapshots")
    product_reference = models.UUIDField(db_index=True)
    channel = models.CharField(max_length=30, choices=PricingChannel.choices, db_index=True)

    # Calculated values (set at creation; never changed)
    vendor_wholesale_price = models.DecimalField(max_digits=12, decimal_places=4)
    vendor_side_commission_amount = models.DecimalField(max_digits=12, decimal_places=4)
    buyer_side_commission_amount = models.DecimalField(max_digits=12, decimal_places=4)
    buyer_facing_price = models.DecimalField(max_digits=12, decimal_places=4)
    currency = models.CharField(max_length=3, default="USD")

    # Auditing parameters
    buyer_pricing_mode = models.CharField(max_length=50, blank=True, null=True)
    buyer_commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=14.00)
    vendor_commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    # Bindability
    bindability_status = models.CharField(max_length=30, choices=SnapshotBindability.choices)
    procurement_bindable = models.BooleanField(default=False)
    invoice_bindable = models.BooleanField(default=False)

    # Validity
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    is_current = models.BooleanField(default=True, db_index=True)

    # Supersession chain
    superseded_by_snapshot = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="supersedes"
    )

    # Version hash for integrity
    snapshot_hash = models.CharField(max_length=512, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "pricing_effective_price_snapshot"
        indexes = [
            models.Index(fields=["product_reference", "channel", "is_current"]),
            models.Index(fields=["bindability_status"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and EffectivePriceSnapshot.objects.filter(pk=self.pk).exists():
            raise ValueError("EffectivePriceSnapshot is immutable. Create a new snapshot for corrections.")
        super().save(*args, **kwargs)


# ─── Buyer-Facing Pricing Visibility Evidence ─────────────────────────────────

class BuyerFacingPricingVisibilityEvidence(models.Model):
    """
    Required before any buyer-facing price display or export.
    Validates tenant scope, channel eligibility, product-channel flag,
    redaction decision, and recheck-before-display flag.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    snapshot = models.ForeignKey(EffectivePriceSnapshot, on_delete=models.PROTECT)
    buyer_reference = models.UUIDField(db_index=True)
    company_scope_reference = models.UUIDField(db_index=True)
    channel = models.CharField(max_length=30, choices=PricingChannel.choices)

    # Validation state
    tenant_scope_version = models.CharField(max_length=100, blank=True)
    channel_eligibility_reference = models.UUIDField(null=True, blank=True)
    product_channel_flag_version = models.CharField(max_length=100, blank=True)
    redaction_decision = models.CharField(max_length=30, default="allowed",
        help_text="allowed | redacted | blocked")
    recheck_before_display = models.BooleanField(default=False)
    visibility_granted = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "pricing_visibility_evidence"
        indexes = [models.Index(fields=["buyer_reference", "channel", "visibility_granted"])]


# ─── PO Pricing Bindability ───────────────────────────────────────────────────

class POPricingBindability(models.Model):
    """
    Explicit model tracking PO-level pricing bindability.
    Procurement consumes this — never recalculates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    snapshot = models.ForeignKey(EffectivePriceSnapshot, on_delete=models.PROTECT)
    purchase_order_reference = models.UUIDField(db_index=True)
    procurement_bindable_status = models.CharField(max_length=30, choices=SnapshotBindability.choices)
    invoice_bindable_status = models.CharField(max_length=30, choices=SnapshotBindability.choices)
    requote_required = models.BooleanField(default=False)
    requote_reason = models.TextField(blank=True)
    accepted_price_variance_reference = models.UUIDField(null=True, blank=True)
    pricing_evidence_reference = models.UUIDField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "pricing_po_bindability"


# ─── Return / Refund Adjustment Pricing Evidence ──────────────────────────────

class ReturnAdjustmentPricingEvidence(models.Model):
    """
    Separate evidence surface for return/refund pricing adjustments.
    References original transaction snapshot — never re-derives it.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_reference = models.UUIDField(db_index=True)
    original_snapshot = models.ForeignKey(
        EffectivePriceSnapshot, on_delete=models.PROTECT, related_name="return_adjustments"
    )
    adjustment_amount = models.DecimalField(max_digits=12, decimal_places=4)
    adjustment_currency = models.CharField(max_length=3, default="USD")
    adjustment_reason = models.CharField(max_length=200)
    line_disposition = models.CharField(max_length=50, blank=True,
        help_text="e.g. full_refund, partial_refund, restocking_fee, no_refund")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "pricing_return_adjustment_evidence"

    def save(self, *args, **kwargs):
        if self.pk and ReturnAdjustmentPricingEvidence.objects.filter(pk=self.pk).exists():
            raise ValueError("ReturnAdjustmentPricingEvidence is append-only.")
        super().save(*args, **kwargs)


class AgreementStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    TERMINATED = "terminated", "Terminated"


class VendorCommissionAgreement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_company_reference = models.UUIDField(db_index=True, help_text="Tenant Company vendor ID")
    commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=AgreementStatus.choices, default=AgreementStatus.DRAFT)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.UUIDField(null=True, blank=True, help_text="User ID of the CIXCI admin who approved the agreement")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pricing_vendor_commission_agreement"

    def __str__(self):
        return f"Agreement({self.vendor_company_reference}: {self.commission_percentage}% - {self.status})"


from django.core.exceptions import ValidationError

class MapExceptionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class MapException(models.Model):
    """
    Vendor-specific, product/SKU-specific, buyer-specific (optional) MAP exceptions.
    Approved by CIXCI Admins.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_company_reference = models.UUIDField(db_index=True, help_text="Tenant Company vendor ID")
    product_reference = models.UUIDField(db_index=True, null=True, blank=True, help_text="Optional catalog product reference")
    sku = models.CharField(max_length=255, db_index=True)
    buyer_company_reference = models.UUIDField(db_index=True, null=True, blank=True, help_text="Optional buyer company reference (null = applies to all)")
    approved_minimum_price = models.DecimalField(max_digits=12, decimal_places=4)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=30, choices=MapExceptionStatus.choices, default=MapExceptionStatus.PENDING)
    approval_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pricing_map_exception"
        indexes = [
            models.Index(fields=["vendor_company_reference", "sku", "status"]),
            models.Index(fields=["buyer_company_reference", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "End Date cannot be earlier than the Start Date."})
        if self.approved_minimum_price is not None and self.approved_minimum_price <= 0:
            raise ValidationError({"approved_minimum_price": "Approved minimum price must be greater than 0."})

    def save(self, *args, **kwargs):
        self.full_clean()
        is_new = not self.pk or not MapException.objects.filter(pk=self.pk).exists()
        old_status = None
        old_price = None
        if not is_new:
            try:
                old_self = MapException.objects.get(pk=self.pk)
                old_status = old_self.status
                old_price = old_self.approved_minimum_price
            except MapException.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Log to AuditRecord
        from apps.audit.models import AuditRecord, RetentionClass, RedactionClass, AccessClass
        event_code = "pricing.map_exception.created" if is_new else "pricing.map_exception.updated"
        description = f"MAP exception created for SKU={self.sku}, Vendor={self.vendor_company_reference}, Buyer={self.buyer_company_reference}, Price={self.approved_minimum_price}, Status={self.status}"
        if not is_new:
            description = f"MAP exception updated for SKU={self.sku}. Status changed from {old_status} to {self.status}. Price changed from {old_price} to {self.approved_minimum_price}."

        AuditRecord.objects.create(
            event_code=event_code,
            event_description=description,
            status="success",
            actor_reference=None,
            company_scope_reference=self.vendor_company_reference,
            source_module="pricing",
            source_record_type="MapException",
            source_record_id=self.id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )

    def __str__(self):
        return f"MapException({self.sku}: {self.approved_minimum_price} - {self.status})"


