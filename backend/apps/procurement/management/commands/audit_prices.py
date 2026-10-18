"""
Management command: audit_prices
Audits Product vendor wholesale prices and PurchaseOrderLine unit prices for anomalies.

Usage:
  python manage.py audit_prices            # audit only, print report
  python manage.py audit_prices --fix      # fix 0.00 PO lines + suspicious products

What it checks:
  1. Products with vendor_wholesale_price = 0.00 or null
  2. Products where vendor_wholesale_price > MSRP (likely data entry error)
  3. Products where vendor_wholesale_price > $100 (suspicious for accessories)
  4. PurchaseOrderLine with unit_price_snapshot = 0.00

What --fix does:
  - PO lines with 0.00 price: re-derive from product buyer_wholesale_price
  - Products with VWP > MSRP: flag for manual review (does NOT auto-change)
  - Products with VWP = 0: flag for manual review (does NOT auto-change)
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db.models import Q


class Command(BaseCommand):
    help = "Audit product prices and PO line snapshots for anomalies"

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Fix 0.00 PO lines by re-deriving from product price",
        )

    def handle(self, *args, **options):
        fix = options["fix"]
        from apps.catalog.models import Product
        from apps.procurement.models import PurchaseOrderLine

        self.stdout.write(self.style.HTTP_INFO("=" * 60))
        self.stdout.write(self.style.HTTP_INFO("CIXCI PRICE AUDIT"))
        self.stdout.write(self.style.HTTP_INFO("=" * 60))

        # ── 1. Products with zero/null vendor wholesale price ──
        zero_prods = Product.objects.filter(
            Q(vendor_wholesale_price_amount__isnull=True)
            | Q(vendor_wholesale_price_amount=Decimal("0"))
        )
        self.stdout.write(f"\n[1] Products with zero/null vendor wholesale price: {zero_prods.count()}")
        for p in zero_prods[:50]:
            self.stdout.write(
                f"    SKU={p.sku}, name={p.name}, "
                f"vwp={p.vendor_wholesale_price_amount}, msrp={p.msrp}"
            )
        if zero_prods.count() > 50:
            self.stdout.write(f"    ... and {zero_prods.count() - 50} more")

        # ── 2. Products where VWP > MSRP ──
        over_msrp = Product.objects.filter(
            vendor_wholesale_price_amount__isnull=False,
            msrp__isnull=False,
        ).extra(
            where=["catalog_product.vendor_wholesale_price_amount > catalog_product.msrp"]
        )
        self.stdout.write(f"\n[2] Products where vendor wholesale > MSRP (data entry error): {over_msrp.count()}")
        for p in over_msrp[:50]:
            self.stdout.write(
                f"    SKU={p.sku}, name={p.name}, "
                f"vwp={p.vendor_wholesale_price_amount}, msrp={p.msrp}, "
                f"ratio={float(p.vendor_wholesale_price_amount) / float(p.msrp):.2f}x"
            )

        # ── 3. Products with suspiciously high VWP ──
        high_vwp = Product.objects.filter(vendor_wholesale_price_amount__gt=Decimal("100"))
        self.stdout.write(f"\n[3] Products with vendor wholesale > $100 (suspicious): {high_vwp.count()}")
        for p in high_vwp[:50]:
            self.stdout.write(
                f"    SKU={p.sku}, name={p.name}, "
                f"vwp={p.vendor_wholesale_price_amount}, msrp={p.msrp}"
            )

        # ── 4. PO Lines with 0.00 unit price ──
        zero_lines = PurchaseOrderLine.objects.filter(
            Q(unit_price_snapshot__isnull=True) | Q(unit_price_snapshot=Decimal("0"))
        ).select_related("purchase_order")
        self.stdout.write(f"\n[4] PO Lines with zero/null unit price: {zero_lines.count()}")
        for line in zero_lines[:100]:
            self.stdout.write(
                f"    PO={line.purchase_order.po_number}, "
                f"product_id={line.product_reference}, qty={line.quantity}, "
                f"price={line.unit_price_snapshot}, total={line.line_total}"
            )
        if zero_lines.count() > 100:
            self.stdout.write(f"    ... and {zero_lines.count() - 100} more")

        # ── Fix mode ──
        if fix and zero_lines.exists():
            self.stdout.write(self.style.WARNING(f"\n[FIX] Re-deriving prices for {zero_lines.count()} zero-priced PO lines..."))
            fixed = 0
            for line in zero_lines:
                # Try to find product by ID
                prod = Product.objects.filter(id=line.product_reference).first()
                if prod:
                    new_price = (
                        prod.buyer_wholesale_price
                        or prod.vendor_wholesale_price_amount
                        or Decimal("0")
                    )
                    if new_price > Decimal("0"):
                        old_price = line.unit_price_snapshot
                        line.unit_price_snapshot = new_price
                        line.line_total = new_price * line.quantity
                        line.save(update_fields=["unit_price_snapshot", "line_total"])
                        fixed += 1
                        self.stdout.write(
                            f"    FIXED: PO={line.purchase_order.po_number}, "
                            f"product={prod.sku}, {old_price} -> {new_price}, "
                            f"total={line.line_total}"
                        )
                    else:
                        self.stdout.write(
                            f"    SKIP: PO={line.purchase_order.po_number}, "
                            f"product_id={line.product_reference} has no valid price"
                        )
                else:
                    self.stdout.write(
                        f"    SKIP: PO={line.purchase_order.po_number}, "
                        f"product_id={line.product_reference} not found in catalog"
                    )
            self.stdout.write(self.style.SUCCESS(f"\n[FIX] Fixed {fixed} PO lines"))
        elif fix:
            self.stdout.write(self.style.SUCCESS("\n[FIX] No zero-priced PO lines to fix"))

        # ── Summary ──
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Zero/null VWP products:     {zero_prods.count()}")
        self.stdout.write(f"  VWP > MSRP products:        {over_msrp.count()}")
        self.stdout.write(f"  Suspicious high VWP:        {high_vwp.count()}")
        self.stdout.write(f"  Zero-priced PO lines:       {zero_lines.count()}")
        if not fix and (zero_prods.exists() or over_msrp.exists() or high_vwp.exists()):
            self.stdout.write(self.style.WARNING(
                "\n  NOTE: Product price issues need manual review. "
                "Run with --fix to auto-fix PO lines only."
            ))
