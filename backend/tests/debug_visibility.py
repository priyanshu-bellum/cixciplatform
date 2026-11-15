"""Debug: trace which queryset filter kills product visibility for buyers."""
import uuid
import pytest
from apps.catalog.models import Product, ProductCompatibilityAssertion
from apps.catalog.compatibility_contract import buyer_portfolio_device_ids
from apps.catalog.source_visibility import eligible_vendor_sources
from apps.tenant.regional_visibility import filter_buyer_regional_products
from django.db.models import Q, Value, DateTimeField, Subquery, OuterRef
from django.utils import timezone


@pytest.mark.django_db
def test_debug_buyer_visibility(buyer_user):
    from apps.devices.models import Device, DeviceType, Manufacturer
    from apps.devices.services import add_device_to_portfolio

    dt, _ = DeviceType.objects.get_or_create(name="Phone", code="phone", defaults={"status": "active"})
    if dt.status != "active":
        dt.status = "active"
        dt.save()
    print(f"\nDeviceType: status={dt.status}, is_active={dt.is_active}")

    mfr, _ = Manufacturer.objects.get_or_create(name="TestMfr")
    device, _ = Device.objects.get_or_create(name="TestDevice", device_type=dt, manufacturer=mfr)
    print(f"Device: lifecycle_status={device.lifecycle_status}, launch_date={device.launch_date}")

    add_device_to_portfolio(buyer_user, device.id)

    p = Product.objects.create(
        name="DebugProduct", sku="DBG-001", brand="TestBrand",
        product_type="accessory", status="active", selling_status="for_sale",
        launch_date="2026-06-18", compatibility_status="complete",
        company_scope_reference=buyer_user.entity.company_id,
        vendor_company_reference=uuid.uuid4(),
    )
    ProductCompatibilityAssertion.objects.create(product=p, device_reference=device.id, is_compatible=True, is_excluded=False)

    # Step 1: Portfolio
    portfolio_ids = buyer_portfolio_device_ids(buyer_user) or set()
    print(f"Portfolio IDs: {portfolio_ids}")
    assert portfolio_ids, "Portfolio is empty!"

    # Step 2: Compatibility
    compat_ids = list(ProductCompatibilityAssertion.objects.filter(
        device_reference__in=portfolio_ids, is_compatible=True, is_excluded=False
    ).values_list("product_id", flat=True))
    print(f"Compatible product IDs: {compat_ids}")
    assert p.id in compat_ids, "Product not in compatible IDs!"

    # Step 3: Base filter
    import pytz
    est = pytz.timezone("US/Eastern")
    today_est = timezone.now().astimezone(est).date()
    qs = Product.objects.filter(status="active").exclude(compatibility_status="incomplete").filter(
        Q(release_date__isnull=True) | Q(release_date__lte=today_est)
    )
    print(f"After base filter: {qs.count()}")
    assert qs.filter(pk=p.id).exists(), "Product filtered out by base filter!"

    # Step 4: Compatibility filter
    qs = qs.filter(id__in=compat_ids)
    print(f"After compat filter: {qs.count()}")
    assert qs.filter(pk=p.id).exists(), "Product filtered out by compatibility!"

    # Step 5: source visibility
    qs2 = eligible_vendor_sources(qs)
    print(f"After source visibility: {qs2.count()}")
    assert qs2.filter(pk=p.id).exists(), f"Product filtered out by eligible_vendor_sources!"

    # Step 6: regional visibility
    company = buyer_user.entity.company
    qs3 = filter_buyer_regional_products(qs2, company.id, buyer_user.entity_id)
    print(f"After regional visibility: {qs3.count()}")
    assert qs3.filter(pk=p.id).exists(), "Product filtered out by regional visibility!"

    # Step 7: MAP pricing
    from apps.tenant.models import Company, CompanyStatus, CompanyType
    enforced_vendor_ids = Company.objects.filter(
        company_type=CompanyType.VENDOR, status=CompanyStatus.ACTIVE, map_pricing_enforced=True,
    ).values_list("id", flat=True)
    print(f"MAP-enforced vendor count: {len(list(enforced_vendor_ids))}")

    print("ALL FILTERS PASSED - product should be visible!")
