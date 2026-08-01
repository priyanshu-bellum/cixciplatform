import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.procurement.models import PurchaseOrder, PurchaseOrderLine
from apps.routing.models import Order, RoutedSuborder

print("=== Purchase Orders ===")
pos = PurchaseOrder.objects.all()
for po in pos:
    print(f"PO ID: {po.id}, PO Number: {po.po_number}, Status: {po.status}, Vendor Ref: {po.vendor_company_reference}, Buyer Ref: {po.buyer_reference}")
    for line in po.lines.all():
        print(f"  Line: Product {line.product_reference}, Qty: {line.quantity}, Price: {line.unit_price_snapshot}")

print("\n=== Routing Orders ===")
orders = Order.objects.all()
for o in orders:
    print(f"Order ID: {o.id}, Status: {o.status}, Buyer Ref: {o.buyer_reference}")
    for sub in o.routed_suborders.all():
        print(f"  Suborder: Vendor {sub.vendor_company_reference}, Status: {sub.status}")
