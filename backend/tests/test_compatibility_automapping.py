import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.tenant.models import Company, User, CompanyType, CompanyStatus, Capability
from apps.catalog.models import Product, ProductCompatibilityAssertion, ProductStatus
from apps.devices.models import Device, Manufacturer, DeviceType
from apps.audit.models import AuditRecord
from django.utils import timezone
from decimal import Decimal
import uuid

def grant_capability(user, code):
    cap, _ = Capability.objects.get_or_create(
        code=code,
        defaults={"module": code.split(".")[0], "is_active": True}
    )
    user.capabilities.add(cap)
    if user.company:
        user.company.capabilities.add(cap)

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data(db):
    vendor_company = Company.objects.create(
        id=uuid.uuid4(),
        name="Test Vendor Corp",
        company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE,
        slug="test-vendor-corp"
    )
    vendor_entity = vendor_company.entities.first()
    vendor_user = User.objects.create_user(
        email="vendor@test.com",
        entity=vendor_entity,
        password="password123"
    )
    
    caps = [
        "catalog.product.list",
        "catalog.product.read",
        "catalog.product.create",
        "catalog.product.update",
        "catalog.product.delete"
    ]
    for cap_code in caps:
        grant_capability(vendor_user, cap_code)
        
    admin_user = User.objects.create_superuser(
        email="admin@test.com",
        password="password123"
    )
    
    dt = DeviceType.objects.create(name="Smartphone", code="smartphone", status="active")
    from apps.catalog.models import DynamicDropdownConfig
    DynamicDropdownConfig.objects.update_or_create(
        field_name="product_category",
        value="Headphones",
        defaults={
            "display_name": "Headphones",
            "status": "active",
            "compatibility_mode": "feature_based",
            "eligible_device_types": ["smartphone"],
            "match_logic": "OR",
            "accessory_fields": ["bluetooth_compatibility", "headphone_jack_compatibility"],
            "compatibility_rules": {
                "bluetooth_compatibility": {"mode": "optional"},
                "headphone_jack_compatibility": {"mode": "optional"}
            }
        }
    )
    mfg = Manufacturer.objects.create(name="Apple")
    
    device1 = Device.objects.create(
        name="iPhone 15",
        manufacturer=mfg,
        device_type=dt,
        lifecycle_status="available",
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible"
    )
    device2 = Device.objects.create(
        name="iPhone 14",
        manufacturer=mfg,
        device_type=dt,
        lifecycle_status="available",
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible"
    )
    
    return {
        "vendor_user": vendor_user,
        "admin_user": admin_user,
        "device1": device1,
        "device2": device2,
        "vendor_company": vendor_company
    }

def test_compatibility_automapping_on_create(setup_data):
    client = APIClient()
    client.force_authenticate(user=setup_data["vendor_user"])
    
    product_data = {
        "sku": "HEADPHONE-001",
        "name": "Wireless Pro Headphones",
        "brand": "BeatMaster",
        "product_type": "accessory",
        "product_category": "Headphones",
        "status": "pending_review",
        "selling_status": "for_sale",
        "vendor_wholesale_price_amount": "50.00",
        "msrp": "100.00",
        "map_price": "80.00",
        "inventory_level": 100,
        "bluetooth_compatibility": "Yes",
        "headphone_jack_compatibility": "Not Compatible",
        "launch_date": str(timezone.now().date()),
        "company_scope_reference": str(setup_data["vendor_company"].id),
        "vendor_company_reference": str(setup_data["vendor_company"].id)
    }
    
    url = reverse("product-list")
    response = client.post(url, product_data, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    product_id = response.data["id"]
    
    assertions = ProductCompatibilityAssertion.objects.filter(product_id=product_id)
    assert assertions.count() == 2
    for assertion in assertions:
        assert assertion.is_compatible is True
        assert assertion.match_source == "Auto-Mapping"
        assert assertion.match_status == "Active"

def test_reverse_device_remapping(setup_data):
    product = Product.objects.create(
        sku="HEADPHONE-002",
        name="Wireless Pro Headphones 2",
        brand="BeatMaster",
        product_type="accessory",
        product_category="Headphones",
        status=ProductStatus.PENDING_REVIEW,
        selling_status="for_sale",
        vendor_wholesale_price_amount=Decimal("50.00"),
        msrp=Decimal("100.00"),
        map_price=Decimal("80.00"),
        inventory_level=100,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible",
        vendor_company_reference=setup_data["vendor_company"].id,
        company_scope_reference=setup_data["vendor_company"].id,
        launch_date=timezone.now().date()
    )
    
    assert ProductCompatibilityAssertion.objects.filter(product=product).count() == 2
    
    dt = DeviceType.objects.get(code="smartphone")
    mfg = Manufacturer.objects.get(name="Apple")
    
    new_device = Device.objects.create(
        name="iPhone 16",
        manufacturer=mfg,
        device_type=dt,
        lifecycle_status="available",
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible"
    )
    
    assert ProductCompatibilityAssertion.objects.filter(product=product, device_reference=new_device.id).exists()
    assertion = ProductCompatibilityAssertion.objects.get(product=product, device_reference=new_device.id)
    assert assertion.is_compatible is True
    assert assertion.match_source in ["System Remap", "Device Created"]

def test_exclusion_reasons_validation(setup_data):
    product = Product.objects.create(
        sku="HEADPHONE-003",
        name="Wireless Pro Headphones 3",
        brand="BeatMaster",
        product_type="accessory",
        product_category="Headphones",
        status=ProductStatus.PENDING_REVIEW,
        selling_status="for_sale",
        vendor_wholesale_price_amount=Decimal("50.00"),
        msrp=Decimal("100.00"),
        map_price=Decimal("80.00"),
        inventory_level=100,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible",
        vendor_company_reference=setup_data["vendor_company"].id,
        company_scope_reference=setup_data["vendor_company"].id,
        launch_date=timezone.now().date()
    )
    
    client = APIClient()
    client.force_authenticate(user=setup_data["vendor_user"])
    
    url = reverse("product-compatibility", kwargs={"pk": product.id})
    
    response = client.post(url, {"action": "exclude", "device_reference": str(setup_data["device1"].id)}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    response = client.post(url, {"action": "exclude", "device_reference": str(setup_data["device1"].id), "exclusion_reason": "invalid_reason"}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    response = client.post(url, {"action": "exclude", "device_reference": str(setup_data["device1"].id), "exclusion_reason": "other", "notes": "  "}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    response = client.post(url, {"action": "exclude", "device_reference": str(setup_data["device1"].id), "exclusion_reason": "physical_mismatch"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    
    assertion = ProductCompatibilityAssertion.objects.get(product=product, device_reference=setup_data["device1"].id)
    assert assertion.is_compatible is False
    assert assertion.is_excluded is True
    assert assertion.exclusion_type == "vendor"
    assert assertion.exclusion_reason == "physical_mismatch"

def test_restore_permissions_and_locks(setup_data):
    product = Product.objects.create(
        sku="HEADPHONE-004",
        name="Wireless Pro Headphones 4",
        brand="BeatMaster",
        product_type="accessory",
        product_category="Headphones",
        status=ProductStatus.PENDING_REVIEW,
        selling_status="for_sale",
        vendor_wholesale_price_amount=Decimal("50.00"),
        msrp=Decimal("100.00"),
        map_price=Decimal("80.00"),
        inventory_level=100,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible",
        vendor_company_reference=setup_data["vendor_company"].id,
        company_scope_reference=setup_data["vendor_company"].id,
        launch_date=timezone.now().date()
    )
    
    assertion = ProductCompatibilityAssertion.objects.get(product=product, device_reference=setup_data["device1"].id)
    assertion.is_compatible = False
    assertion.is_excluded = True
    assertion.exclusion_type = "vendor"
    assertion.save()
    
    assertion2 = ProductCompatibilityAssertion.objects.get(product=product, device_reference=setup_data["device2"].id)
    assertion2.is_compatible = False
    assertion2.is_excluded = True
    assertion2.exclusion_type = "admin"
    assertion2.save()
    
    client = APIClient()
    
    client.force_authenticate(user=setup_data["vendor_user"])
    url = reverse("product-compatibility", kwargs={"pk": product.id})
    response = client.post(url, {"action": "restore", "device_reference": str(setup_data["device2"].id)}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    response = client.post(url, {"action": "restore", "device_reference": str(setup_data["device1"].id)}, format="json")
    assert response.status_code == status.HTTP_200_OK
    
    client.force_authenticate(user=setup_data["admin_user"])
    response = client.post(url, {"action": "lock", "device_reference": str(setup_data["device1"].id)}, format="json")
    assert response.status_code == status.HTTP_200_OK
    
    assertion.is_locked = True
    assertion.is_excluded = True
    assertion.exclusion_type = "vendor"
    assertion.save()
    
    client.force_authenticate(user=setup_data["vendor_user"])
    response = client.post(url, {"action": "restore", "device_reference": str(setup_data["device1"].id)}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_recalculate_and_audit_history(setup_data):
    product = Product.objects.create(
        sku="HEADPHONE-005",
        name="Wireless Pro Headphones 5",
        brand="BeatMaster",
        product_type="accessory",
        product_category="Headphones",
        status=ProductStatus.PENDING_REVIEW,
        selling_status="for_sale",
        vendor_wholesale_price_amount=Decimal("50.00"),
        msrp=Decimal("100.00"),
        map_price=Decimal("80.00"),
        inventory_level=100,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible",
        vendor_company_reference=setup_data["vendor_company"].id,
        company_scope_reference=setup_data["vendor_company"].id,
        launch_date=timezone.now().date()
    )
    
    client = APIClient()
    
    client.force_authenticate(user=setup_data["vendor_user"])
    url_recalc = reverse("product-recalculate-compatibility", kwargs={"pk": product.id})
    response = client.post(url_recalc, {}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    client.force_authenticate(user=setup_data["admin_user"])
    response = client.post(url_recalc, {}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == "success"
    
    url_audit = reverse("product-audit-history", kwargs={"pk": product.id})
    response = client.get(url_audit)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) > 0

def test_category_specific_validations(setup_data):
    from django.core.exceptions import ValidationError
    from apps.catalog.models import DynamicDropdownConfig
    
    # Set up Memory dropdown config
    DynamicDropdownConfig.objects.update_or_create(
        field_name="product_category",
        value="Memory",
        defaults={
            "display_name": "Memory",
            "status": "active",
            "compatibility_mode": "feature_based",
            "eligible_device_types": ["smartphone"],
            "match_logic": "AND",
            "accessory_fields": ["storage_expansion_compatibility", "memory_capacity"],
            "compatibility_rules": {
                "storage_expansion_compatibility": {"mode": "required"},
                "memory_capacity": {
                    "mode": "conditional",
                    "condition_field": "storage_expansion_compatibility",
                    "condition_values": ["microSDXC", "microSDHC"]
                }
            }
        }
    )
    
    # 1. Headphones jack compatibility and bluetooth
    p = Product(
        sku="TEST-VALID-1",
        name="Test Headphones",
        brand="BeatMaster",
        product_type="accessory",
        product_category="Headphones",
        status=ProductStatus.PENDING_REVIEW,
        selling_status="for_sale",
        vendor_wholesale_price_amount=Decimal("50.00"),
        msrp=Decimal("100.00"),
        map_price=Decimal("80.00"),
        inventory_level=100,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Lightning",
        vendor_company_reference=setup_data["vendor_company"].id,
        company_scope_reference=setup_data["vendor_company"].id,
        launch_date=timezone.now().date()
    )
    p.clean()  # should not raise
    
    p.headphone_jack_compatibility = "Not Compatible"
    p.bluetooth_compatibility = "No"
    with pytest.raises(ValidationError) as excinfo:
        p.clean()
    assert "cannot both be Not Compatible/No" in str(excinfo.value)
    
    # 2. Memory capacity vs storage expansion
    p.product_category = "Memory"
    p.storage_expansion_compatibility = "microSDXC"
    p.memory_capacity = "2TB"
    p.clean()  # valid
    
    p.memory_capacity = "1.5TB"
    with pytest.raises(ValidationError):
        p.clean()
        
    p.storage_expansion_compatibility = "microSDHC"
    p.memory_capacity = "2TB"
    with pytest.raises(ValidationError):
        p.clean()


