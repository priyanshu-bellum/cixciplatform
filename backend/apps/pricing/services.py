import hashlib
from decimal import Decimal
from django.db import models
from django.utils import timezone
from .models import EffectivePriceSnapshot, PricingProfile, SnapshotBindability, VendorCommissionAgreement, PricingChannel

def get_vendor_commission_percentage(vendor_id):
    """
    Check if an approved Vendor Commission Agreement exists for the vendor.
    If so, return the agreement's commission percentage.
    Otherwise, default to 0%.
    """
    agreement = VendorCommissionAgreement.objects.filter(
        vendor_company_reference=vendor_id,
        status="approved"
    ).first()
    if agreement:
        return agreement.commission_percentage
    return Decimal("0.00")

def calculate_prices_and_commissions(product, buyer_company, channel):
    """
    Core commission calculation engine.
    Calculates prices and commissions based on SRP (msrp), wholesale prices,
    and the buyer pricing mode/onboarding percentage.
    """
    vendor_wholesale_price = product.vendor_wholesale_price_amount or Decimal("0.00")
    srp = product.msrp or Decimal("0.00")
    
    # 1. Buyer Pricing Mode & Commission Percentage
    buyer_pricing_mode = "standard"
    buyer_commission_percentage = Decimal("14.00")
    
    if buyer_company:
        mode = getattr(buyer_company, "buyer_pricing_mode", "standard")
        if mode == "no_commission":
            buyer_pricing_mode = "no_commission"
            buyer_commission_percentage = Decimal("0.00")
        elif mode == "custom":
            buyer_pricing_mode = "custom"
            buyer_commission_percentage = getattr(buyer_company, "commission_percentage", Decimal("14.00"))
        else:
            buyer_pricing_mode = "standard"
            buyer_commission_percentage = Decimal("14.00")
            
    # 2. CIXCI Buyer Commission = SRP * Buyer Commission Percentage
    buyer_side_commission_amount = srp * (buyer_commission_percentage / Decimal("100.00"))
    
    # 3. Buyer Wholesale Price = Vendor Wholesale Price + CIXCI Buyer Commission
    buyer_facing_price = vendor_wholesale_price + buyer_side_commission_amount
    
    # 4. Vendor Commission
    vendor_commission_percentage = get_vendor_commission_percentage(product.vendor_company_reference)
    vendor_side_commission_amount = vendor_wholesale_price * (vendor_commission_percentage / Decimal("100.00"))
    
    return {
        "vendor_wholesale_price": vendor_wholesale_price,
        "buyer_side_commission_amount": buyer_side_commission_amount,
        "buyer_facing_price": buyer_facing_price,
        "vendor_commission_percentage": vendor_commission_percentage,
        "vendor_side_commission_amount": vendor_side_commission_amount,
        "buyer_pricing_mode": buyer_pricing_mode,
        "buyer_commission_percentage": buyer_commission_percentage,
    }

def create_effective_price_snapshot(product, buyer_company, channel):
    """
    Creates and saves an EffectivePriceSnapshot using the calculated prices and commissions.
    """
    calc = calculate_prices_and_commissions(product, buyer_company, channel)
    
    # Get or create a PricingProfile
    profile, _ = PricingProfile.objects.get_or_create(
        vendor_company_reference=product.vendor_company_reference,
        buyer_company_reference=buyer_company.id if buyer_company else None,
        channel=channel,
        defaults={
            "status": "active",
            "vendor_side_commission_rate": calc["vendor_commission_percentage"] / Decimal("100.00"),
            "buyer_side_commission_rate": calc["buyer_commission_percentage"] / Decimal("100.00"),
            "currency": product.vendor_wholesale_price_currency or "USD",
        }
    )
    
    # Generate a unique hash for the snapshot
    raw_str = f"{profile.id}-{product.id}-{channel}-{calc['vendor_wholesale_price']}-{calc['buyer_facing_price']}"
    snapshot_hash = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()
    
    # Check MAP violations
    is_map_violation = False
    from apps.tenant.models import Company
    vendor = Company.objects.filter(id=product.vendor_company_reference).first()
    is_map_enforced = vendor.map_pricing_enforced if vendor else False
    
    if is_map_enforced and product.map_price is None:
        is_map_violation = True
    elif product.map_price is not None:
        if calc["buyer_facing_price"] >= product.map_price:
            has_exception = check_pricing_exception_exists(
                product.vendor_company_reference,
                product.sku,
                buyer_company.id if buyer_company else None
            )
            if not has_exception:
                is_map_violation = True
        
        if not is_map_violation and product.sale_price is not None:
            eff_map = get_effective_map_price(
                product.vendor_company_reference,
                product.sku,
                product.map_price,
                buyer_company.id if buyer_company else None
            )
            if product.sale_price < eff_map:
                is_map_violation = True

    bind_status = SnapshotBindability.NOT_BINDABLE if is_map_violation else SnapshotBindability.ORDER_BINDABLE
    proc_bind = False if is_map_violation else True
    inv_bind = False if is_map_violation else True

    snap = EffectivePriceSnapshot.objects.create(
        pricing_profile=profile,
        product_reference=product.id,
        channel=channel,
        vendor_wholesale_price=calc["vendor_wholesale_price"],
        vendor_side_commission_amount=calc["vendor_side_commission_amount"],
        buyer_side_commission_amount=calc["buyer_side_commission_amount"],
        buyer_facing_price=calc["buyer_facing_price"],
        currency=product.vendor_wholesale_price_currency or "USD",
        bindability_status=bind_status,
        procurement_bindable=proc_bind,
        invoice_bindable=inv_bind,
        buyer_pricing_mode=calc["buyer_pricing_mode"],
        buyer_commission_percentage=calc["buyer_commission_percentage"],
        vendor_commission_percentage=calc["vendor_commission_percentage"],
        snapshot_hash=snapshot_hash,
    )
    return snap

def calculate_invoice_line_amounts(snapshot, delivered_qty, returned_qty):
    """
    Computes pricing calculations using the net fulfilled quantity (Delivered Quantity - Returned Quantity).
    """
    net_qty = max(0, delivered_qty - returned_qty)
    
    buyer_wholesale_price = snapshot.buyer_facing_price
    vendor_wholesale_price = snapshot.vendor_wholesale_price
    buyer_commission = snapshot.buyer_side_commission_amount
    vendor_commission = snapshot.vendor_side_commission_amount
    
    buyer_invoice_line_total = buyer_wholesale_price * net_qty
    vendor_payout = (vendor_wholesale_price - vendor_commission) * net_qty
    cixci_commission_earned = (buyer_commission + vendor_commission) * net_qty
    
    return {
        "net_qty": net_qty,
        "buyer_invoice_line_total": buyer_invoice_line_total,
        "vendor_payout": vendor_payout,
        "cixci_commission_earned": cixci_commission_earned,
    }


def get_effective_map_price(vendor_id, sku, standard_map_price, buyer_id=None, date=None):
    """
    Returns the lowest approved minimum advertised price (MAP) exception override
    for a given vendor and SKU/product, or falls back to the standard MAP price.
    """
    if standard_map_price is None:
        return None
        
    if not date:
        import pytz
        from django.utils import timezone
        est = pytz.timezone("US/Eastern")
        date = timezone.now().astimezone(est).date()
        
    from apps.pricing.models import MapException
    from django.db.models import Q
    
    q = MapException.objects.filter(
        vendor_company_reference=vendor_id,
        sku=sku,
        status="approved",
        start_date__lte=date,
        end_date__gte=date
    )
    
    if buyer_id:
        q = q.filter(Q(buyer_company_reference=buyer_id) | Q(buyer_company_reference__isnull=True))
    else:
        q = q.filter(buyer_company_reference__isnull=True)
        
    exception = q.order_by("approved_minimum_price").first()
    if exception:
        return exception.approved_minimum_price
    return standard_map_price


def create_shipping_fee_snapshot(vendor_company_reference, region_code, order_reference,
                                  routed_suborder_reference=None, quantity=1,
                                  order_subtotal=None):
    """
    Look up the active VendorRegionalShippingFee for vendor+region,
    calculate the applied_amount based on fee_type, and create an
    immutable ShippingFeeSnapshot.

    Returns the snapshot, or None if no active fee exists for this vendor-region.
    """
    from .models import VendorRegionalShippingFee, ShippingFeeSnapshot, ShippingFeeStatus

    # Hard server-side check: vendor must be approved for the given region.
    from apps.tenant.models import Company
    vendor = Company.objects.filter(id=vendor_company_reference).first()
    if vendor:
        approved = vendor.approved_regions or []
        if approved and region_code not in approved:
            return None  # vendor not approved for this region — no snapshot

    fee = VendorRegionalShippingFee.objects.filter(
        vendor_company_reference=vendor_company_reference,
        region_code=region_code,
        status=ShippingFeeStatus.ACTIVE,
    ).filter(
        effective_from__lte=timezone.now(),
    ).filter(
        models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=timezone.now())
    ).order_by("-effective_from").first()

    if not fee:
        return None

    # Calculate applied_amount based on fee_type
    if fee.fee_type == "per_unit":
        applied_amount = fee.fee_amount * Decimal(str(quantity))
    elif fee.fee_type == "percentage":
        subtotal = order_subtotal or Decimal("0.00")
        applied_amount = subtotal * (fee.fee_amount / Decimal("100.00"))
    else:
        # flat rate
        applied_amount = fee.fee_amount

    snapshot = ShippingFeeSnapshot.objects.create(
        source_fee=fee,
        vendor_company_reference=vendor_company_reference,
        region_code=region_code,
        fee_amount=fee.fee_amount,
        fee_type=fee.fee_type,
        currency=fee.currency,
        order_reference=order_reference,
        routed_suborder_reference=routed_suborder_reference,
        applied_amount=applied_amount,
    )
    return snapshot


def check_pricing_exception_exists(vendor_id, sku, buyer_id=None, date=None):
    """
    Checks if an approved MAP exception exists for a given vendor and SKU.
    """
    if not date:
        import pytz
        from django.utils import timezone
        est = pytz.timezone("US/Eastern")
        date = timezone.now().astimezone(est).date()
        
    from apps.pricing.models import MapException
    from django.db.models import Q
    
    q = MapException.objects.filter(
        vendor_company_reference=vendor_id,
        sku=sku,
        status="approved",
        start_date__lte=date,
        end_date__gte=date
    )
    
    if buyer_id:
        q = q.filter(Q(buyer_company_reference=buyer_id) | Q(buyer_company_reference__isnull=True))
    
    return q.exists()

