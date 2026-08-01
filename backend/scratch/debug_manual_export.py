import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.routing.models import RoutedSuborder
from apps.tenant.models import Company
from apps.procurement.models import PurchaseOrderLine
from apps.catalog.models import Product
from apps.routing.tasks import validate_line_eligibility

try:
    sub = RoutedSuborder.objects.get(id="74c01850-08e6-4ac1-9596-53f6970b5ab3")
    print("Found suborder:", sub.id)
    print("routing_snapshot:", sub.routing_snapshot)
    
    vendor = Company.objects.filter(id=sub.vendor_company_reference).first()
    buyer_company = Company.objects.filter(id=sub.order.company_scope_reference).first()
    
    print("Vendor:", vendor)
    print("Buyer:", buyer_company)
    
    lines = PurchaseOrderLine.objects.filter(purchase_order_id=sub.order.id)
    lines = lines.filter(product_reference__in=
        Product.objects.filter(vendor_company_reference=vendor.id).values_list("id", flat=True)
    )
    print("Line count:", lines.count())
    
    for line in lines:
        product = Product.objects.get(id=line.product_reference)
        print("Product:", product.sku)
        is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer_company)
        print(f"Eligibility for {product.sku}: {is_eligible}, Reason: {reason}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
