"""
Data migration: Update existing PO lines and PO totals to use MSRP-based line_total.
Client rule: line_total = MSRP × Qty (fallback: wholesale × Qty)
"""
from decimal import Decimal
from django.db import migrations


def update_msrp_line_totals(apps, schema_editor):
    PurchaseOrderLine = apps.get_model("procurement", "PurchaseOrderLine")
    PurchaseOrder = apps.get_model("procurement", "PurchaseOrder")
    Product = apps.get_model("catalog", "Product")

    # Build product MSRP lookup
    msrp_map = {}
    for p in Product.objects.all().only("id", "msrp"):
        msrp_map[str(p.id)] = p.msrp

    # Update each PO line: line_total = msrp × qty (fallback: keep existing)
    po_totals = {}
    for line in PurchaseOrderLine.objects.all():
        prod_id = str(line.product_reference)
        msrp = msrp_map.get(prod_id)
        if msrp and msrp > 0:
            new_total = Decimal(str(msrp)) * line.quantity
            if line.line_total != new_total:
                line.line_total = new_total
                line.save(update_fields=["line_total"])
        # Accumulate PO total
        po_id = str(line.purchase_order_id)
        po_totals[po_id] = po_totals.get(po_id, Decimal("0")) + line.line_total

    # Update PO total_amount
    for po_id, total in po_totals.items():
        PurchaseOrder.objects.filter(id=po_id).update(total_amount=total)


def reverse_msrp_line_totals(apps, schema_editor):
    """No-op — old wholesale-based totals cannot be reliably restored."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("procurement", "0002_purchaseorderline_msrp_snapshot"),
        ("catalog", "0018_product_compatibility_mode"),
    ]

    operations = [
        migrations.RunPython(update_msrp_line_totals, reverse_msrp_line_totals),
    ]
