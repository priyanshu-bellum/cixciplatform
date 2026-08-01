import os
import sys
import django
import json

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from django.utils import timezone
from apps.tenant.models import Company, CompanyEntity, User, CompanyType, CompanyStatus, CompanyRelationship
from apps.procurement.models import PurchaseOrder, PurchaseOrderLine, POStatus
from apps.catalog.models import Product, ProductStatus
from apps.routing.models import Order, RoutedSuborder, RoutingStatus
from apps.procurement.services import orchestrate_po_finalization

# 1. Find or create buyer and vendor
buyer = Company.objects.filter(company_type=CompanyType.BUYER).first()
if not buyer:
    buyer = Company.objects.create(
        name="Local Buyer Corp",
        company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE,
        slug="local-buyer-corp"
    )

vendor = Company.objects.filter(company_type=CompanyType.VENDOR).first()
if not vendor:
    vendor = Company.objects.create(
        name="Local Vendor Inc",
        company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE,
        slug="local-vendor-inc"
    )

# Configure vendor for manual integration
vendor.external_id = json.dumps({
    "integration_mode": "manual"
})
vendor.save()

# Ensure relationship exists and is active
rel, _ = CompanyRelationship.objects.get_or_create(
    buyer_company=buyer,
    vendor_company=vendor,
    defaults={"status": "active", "approved_at": timezone.now()}
)
if rel.status != "active":
    rel.status = "active"
    rel.approved_at = timezone.now()
    rel.save()

# 2. Get/create active vendor user
vendor_entity = CompanyEntity.objects.filter(company=vendor).first()
if not vendor_entity:
    vendor_entity = CompanyEntity.objects.create(company=vendor, name="Vendor HQ", status="active")

vendor_user = User.objects.filter(email="vendor@cixci.com").first()
if not vendor_user:
    vendor_user = User.objects.create_user(
        email="vendor@cixci.com",
        entity=vendor_entity,
        password="password",
        first_name="Vendor",
        last_name="User"
    )
else:
    vendor_user.entity = vendor_entity
    vendor_user.save()

# Get/create active buyer user
buyer_entity = CompanyEntity.objects.filter(company=buyer).first()
if not buyer_entity:
    buyer_entity = CompanyEntity.objects.create(company=buyer, name="Buyer HQ", status="active")

buyer_user = User.objects.filter(email="buyer@cixci.com").first()
if not buyer_user:
    buyer_user = User.objects.create_user(
        email="buyer@cixci.com",
        entity=buyer_entity,
        password="password",
        first_name="Buyer",
        last_name="User"
    )
else:
    buyer_user.entity = buyer_entity
    buyer_user.save()

# Ensure capability for vendor
from apps.tenant.models import Capability
cap, _ = Capability.objects.get_or_create(code="routing.order.update", defaults={"module": "routing"})
vendor_user.capabilities.add(cap)
vendor.capabilities.add(cap)

cap_manage, _ = Capability.objects.get_or_create(code="routing.export.manage", defaults={"module": "routing"})
vendor_user.capabilities.add(cap_manage)
vendor.capabilities.add(cap_manage)

cap_list, _ = Capability.objects.get_or_create(code="routing.export.list", defaults={"module": "routing"})
vendor_user.capabilities.add(cap_list)
vendor.capabilities.add(cap_list)

cap_read, _ = Capability.objects.get_or_create(code="routing.export.read", defaults={"module": "routing"})
vendor_user.capabilities.add(cap_read)
vendor.capabilities.add(cap_read)

# 3. Find or create an active Product
product = Product.objects.filter(vendor_company_reference=vendor.id, status=ProductStatus.ACTIVE).first()
if not product:
    product = Product.objects.create(
        name="Local Phone Accessory",
        sku="LOC-ACC-111",
        upc="111222333444",
        product_type="accessory",
        vendor_company_reference=vendor.id,
        company_scope_reference=vendor.id,
        msrp=25.0,
        launch_date=timezone.now().date(),
        status=ProductStatus.ACTIVE,
        compatibility_status="complete",
    )

# 4. Create and approve a PO
po = PurchaseOrder.objects.create(
    company_scope_reference=buyer.id,
    buyer_reference=buyer_user.id,
    vendor_company_reference=vendor.id,
    status=POStatus.APPROVED,
    approved_at=timezone.now(),
    po_number="PO-LOCAL-MANUAL-1",
    currency="USD",
)

PurchaseOrderLine.objects.create(
    purchase_order=po,
    product_reference=product.id,
    quantity=5,
    unit_price_snapshot=20.0,
    line_total=100.0,
)

# 5. Create Order and RoutedSuborder via PO finalization orchestration
orchestrate_po_finalization(po)

print("PO orchestrated successfully!")
order = Order.objects.get(id=po.id)
print(f"Order status: {order.status}")
for sub in order.routed_suborders.all():
    print(f"Suborder ID: {sub.id}, status: {sub.status}")
