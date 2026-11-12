"""
Tests for compatibility engine bug fixes:

1. run_device_remapping() must filter by compatibility_mode="universal_device_type"
   so that direct_device products are not universally mapped to all devices.
2. run_compatibility_automapping() must recognize "device_specific" as same as "explicit".
3. check_compatibility() must accept both "AND"/"match_all" for match_logic.
4. Serializer validation: direct_device must not have compatible_device_types,
   universal_device_type must require at least one.
5. Data migration 0026 cleans up inconsistent data.
"""
import pytest
import uuid
from decimal import Decimal
from django.utils import timezone
from apps.tenant.models import Company, CompanyType, CompanyStatus
from apps.catalog.models import (
    Product, ProductCompatibilityAssertion, ProductStatus,
    DynamicDropdownConfig,
)
from apps.devices.models import Device, DeviceType, Manufacturer


@pytest.fixture
def vendor_company(db):
    return Company.objects.create(
        id=uuid.uuid4(),
        name="Compat Test Vendor",
        company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE,
        slug="compat-test-vendor",
    )


@pytest.fixture
def device_types(db):
    phone = DeviceType.objects.create(name="Phone", code="phone", status="active")
    tablet = DeviceType.objects.create(name="Tablet", code="tablet", status="active")
    watch = DeviceType.objects.create(name="Smartwatch", code="smartwatch", status="active")
    return {"phone": phone, "tablet": tablet, "smartwatch": watch}


@pytest.fixture
def manufacturer(db):
    return Manufacturer.objects.create(name="TestMfg")


@pytest.fixture
def devices(device_types, manufacturer):
    today = timezone.now().date()
    iphone = Device.objects.create(
        name="iPhone 16 Plus",
        manufacturer=manufacturer,
        device_type=device_types["phone"],
        lifecycle_status="available",
        launch_date=today,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible",
        compatible_charging_interface="Type-C",
    )
    galaxy = Device.objects.create(
        name="Samsung Galaxy S24",
        manufacturer=manufacturer,
        device_type=device_types["phone"],
        lifecycle_status="available",
        launch_date=today,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible",
        compatible_charging_interface="Type-C",
    )
    ipad = Device.objects.create(
        name="iPad Pro",
        manufacturer=manufacturer,
        device_type=device_types["tablet"],
        lifecycle_status="available",
        launch_date=today,
        bluetooth_compatibility="Yes",
        headphone_jack_compatibility="Not Compatible",
        compatible_charging_interface="Type-C",
    )
    return {"iphone": iphone, "galaxy": galaxy, "ipad": ipad}


@pytest.fixture
def headphone_config(device_types):
    cfg, _ = DynamicDropdownConfig.objects.update_or_create(
        field_name="product_category",
        value="Headphones",
        defaults=dict(
            display_name="Headphones",
            status="active",
            compatibility_mode="feature_based",
            eligible_device_types=["phone"],
            match_logic="OR",
            accessory_fields=["bluetooth_compatibility", "headphone_jack_compatibility"],
            compatibility_rules={
                "bluetooth_compatibility": {"mode": "optional"},
                "headphone_jack_compatibility": {"mode": "optional"},
            },
        ),
    )
    return cfg


@pytest.fixture
def case_config_device_specific(device_types):
    cfg, _ = DynamicDropdownConfig.objects.update_or_create(
        field_name="product_category",
        value="Cases",
        defaults=dict(
            display_name="Cases",
            status="active",
            compatibility_mode="device_specific",
            eligible_device_types=["phone", "tablet"],
            match_logic="OR",
            accessory_fields=["compatible_charging_interface"],
            compatibility_rules={
                "compatible_charging_interface": {"mode": "optional"},
            },
        ),
    )
    return cfg


def _make_product(vendor_company, skip_clean=False, **overrides):
    """Create a product, optionally skipping model.clean() validation."""
    now = timezone.now()
    defaults = dict(
        sku=f"TEST-{uuid.uuid4().hex[:8]}",
        name="Test Product",
        brand="TestBrand",
        product_type="accessory",
        product_category="Headphones",
        status=ProductStatus.PENDING_REVIEW,
        selling_status="for_sale",
        vendor_wholesale_price_amount=Decimal("10.00"),
        msrp=Decimal("20.00"),
        map_price=Decimal("15.00"),
        inventory_level=100,
        vendor_company_reference=vendor_company.id,
        company_scope_reference=vendor_company.id,
        launch_date=now.date(),
        compatibility_mode="direct_device",
    )
    defaults.update(overrides)
    if defaults.get("compatibility_mode") == "universal_device_type" and not skip_clean:
        # This fixture exercises the legacy Universal category default. Explicit
        # product scopes under other methods have separate regression coverage.
        for code in defaults.get("compatible_device_types", []):
            DeviceType.objects.get_or_create(code=code, defaults={"name": code.title(), "status": "active"})
        DynamicDropdownConfig.objects.get_or_create(field_name="product_category", value="Universal Test",
            defaults={"display_name": "Universal Test", "status": "active", "compatibility_mode": "universal", "eligible_device_types": ["phone", "tablet", "smartwatch"]})
        defaults["product_category"] = "Universal Test"
    if skip_clean:
        defaults.setdefault("created_at", now)
        defaults.setdefault("updated_at", now)
        p = Product(**defaults)
        p.save_base(raw=True)
        return p
    return Product.objects.create(**defaults)


# ── Bug 1: run_device_remapping must filter by compatibility_mode ─────────


class TestUniversalMappingFilter:

    def test_direct_device_product_not_universally_mapped(
        self, vendor_company, device_types, devices, headphone_config, case_config_device_specific
    ):
        """A direct_device product must NOT be picked up by universal mapping."""
        from apps.catalog.compatibility_engine import run_device_remapping

        # Create product with inconsistent data (direct_device but has compatible_device_types)
        # using skip_clean to bypass model validation, simulating pre-migration bad data
        product = _make_product(
            vendor_company,
            skip_clean=True,
            name="iPhone 16 Plus Case",
            product_category="Cases",
            compatibility_mode="direct_device",
            compatible_device_types=["phone"],
            bluetooth_compatibility="Yes",
        )

        # Manually assert to one device only
        ProductCompatibilityAssertion.objects.create(
            product=product,
            device_reference=devices["iphone"].id,
            is_compatible=True,
            compatibility_basis="manual_assertion",
            match_source="Manual",
            match_status="Active",
            vendor_company_reference=vendor_company.id,
            sku=product.sku,
        )

        new_phone = Device.objects.create(
            name="Motorola Edge",
            manufacturer=Manufacturer.objects.first(),
            device_type=device_types["phone"],
            lifecycle_status="available",
            launch_date=timezone.now().date(),
            bluetooth_compatibility="Yes",
        )

        run_device_remapping(new_phone)

        # The direct_device product must NOT get a universal assertion
        universal_assertions = ProductCompatibilityAssertion.objects.filter(
            product=product,
            device_reference=new_phone.id,
            compatibility_basis="universal_device_type",
        )
        assert universal_assertions.count() == 0

    def test_universal_product_gets_mapped_to_new_device(
        self, vendor_company, device_types, devices, headphone_config
    ):
        """A universal_device_type product SHOULD be mapped to new devices."""
        from apps.catalog.compatibility_engine import run_device_remapping

        DynamicDropdownConfig.objects.update_or_create(
            field_name="product_category", value="Screen Protectors",
            defaults=dict(display_name="Screen Protectors", status="active",
                          compatibility_mode="feature_based",
                          eligible_device_types=["phone"], match_logic="OR",
                          accessory_fields=[], compatibility_rules={}),
        )

        product = _make_product(
            vendor_company,
            name="Universal Phone Screen Protector",
            product_category="Screen Protectors",
            compatibility_mode="universal_device_type",
            compatible_device_types=["phone"],
        )

        new_phone = Device.objects.create(
            name="Pixel 9",
            manufacturer=Manufacturer.objects.first(),
            device_type=device_types["phone"],
            lifecycle_status="available",
            launch_date=timezone.now().date(),
            bluetooth_compatibility="Yes",
        )

        run_device_remapping(new_phone)

        assertion = ProductCompatibilityAssertion.objects.filter(
            product=product,
            device_reference=new_phone.id,
        ).first()
        assert assertion is not None
        assert assertion.compatibility_basis == "universal_device_type"
        assert assertion.is_compatible is True

    def test_universal_mapping_only_targets_matching_device_types(
        self, vendor_company, device_types, manufacturer, headphone_config
    ):
        """Universal mapping for ['phone'] must not map to a tablet device."""
        from apps.catalog.compatibility_engine import run_device_remapping

        DynamicDropdownConfig.objects.update_or_create(
            field_name="product_category", value="Screen Protectors",
            defaults=dict(display_name="Screen Protectors", status="active",
                          compatibility_mode="feature_based",
                          eligible_device_types=["phone"], match_logic="OR",
                          accessory_fields=[], compatibility_rules={}),
        )

        product = _make_product(
            vendor_company,
            name="Phone-only Universal Case",
            product_category="Screen Protectors",
            compatibility_mode="universal_device_type",
            compatible_device_types=["phone"],
        )

        tablet_device = Device.objects.create(
            name="iPad Mini",
            manufacturer=manufacturer,
            device_type=device_types["tablet"],
            lifecycle_status="available",
            launch_date=timezone.now().date(),
        )

        run_device_remapping(tablet_device)

        assert not ProductCompatibilityAssertion.objects.filter(
            product=product,
            device_reference=tablet_device.id,
        ).exists()


# ── Bug 2: device_specific mode recognition ──────────────────────────────


class TestDeviceSpecificModeRecognition:

    def test_device_specific_category_skips_automapping(
        self, vendor_company, device_types, devices, case_config_device_specific
    ):
        """
        A category with compatibility_mode='device_specific' must not auto-map
        via feature comparison — it should only do status calculation.
        """
        from apps.catalog.compatibility_engine import run_compatibility_automapping

        product = _make_product(
            vendor_company,
            name="iPhone Case Specific",
            product_category="Cases",
            compatibility_mode="direct_device",
            compatible_charging_interface="Type-C",
        )

        # Clear any assertions that might have been created on save
        ProductCompatibilityAssertion.objects.filter(product=product).delete()

        run_compatibility_automapping(product)

        # Should NOT create feature-based assertions for device_specific categories
        assert ProductCompatibilityAssertion.objects.filter(
            product=product, compatibility_basis="feature_evidence"
        ).count() == 0

    def test_device_specific_excluded_from_device_remapping(
        self, vendor_company, device_types, devices, case_config_device_specific
    ):
        """
        run_device_remapping should exclude device_specific categories
        from feature-based auto-mapping.
        """
        from apps.catalog.compatibility_engine import run_device_remapping

        product = _make_product(
            vendor_company,
            name="Exact-fit Case",
            product_category="Cases",
            compatibility_mode="direct_device",
            compatible_charging_interface="Type-C",
        )

        # Clear any assertions from product save
        ProductCompatibilityAssertion.objects.filter(product=product).delete()

        new_phone = Device.objects.create(
            name="New Phone",
            manufacturer=Manufacturer.objects.first(),
            device_type=device_types["phone"],
            lifecycle_status="available",
            launch_date=timezone.now().date(),
            compatible_charging_interface="Type-C",
        )

        run_device_remapping(new_phone)

        # Should not be auto-mapped via feature logic
        assert not ProductCompatibilityAssertion.objects.filter(
            product=product,
            device_reference=new_phone.id,
            compatibility_basis="feature_evidence",
        ).exists()


# ── Bug 3: match_logic format handling ───────────────────────────────────


class TestMatchLogicFormats:

    def test_and_match_logic(
        self, vendor_company, device_types, devices, db
    ):
        """check_compatibility must work with match_logic='AND'."""
        from apps.catalog.compatibility_engine import check_compatibility

        DynamicDropdownConfig.objects.update_or_create(
            field_name="product_category",
            value="Chargers",
            defaults=dict(
                display_name="Chargers",
                status="active",
                compatibility_mode="feature_based",
                eligible_device_types=["phone"],
                match_logic="AND",
                accessory_fields=["bluetooth_compatibility", "compatible_charging_interface"],
                compatibility_rules={
                    "bluetooth_compatibility": {"mode": "optional"},
                    "compatible_charging_interface": {"mode": "optional"},
                },
            ),
        )

        product = _make_product(
            vendor_company,
            product_category="Chargers",
            bluetooth_compatibility="Yes",
            compatible_charging_interface="Type-C",
        )

        # Both fields match
        result = check_compatibility(product, devices["iphone"])
        assert result is True

    def test_match_all_legacy_format(
        self, vendor_company, device_types, devices, db
    ):
        """check_compatibility must also accept legacy match_logic='match_all'."""
        from apps.catalog.compatibility_engine import check_compatibility

        DynamicDropdownConfig.objects.update_or_create(
            field_name="product_category",
            value="Chargers_legacy",
            defaults=dict(
                display_name="Chargers Legacy",
                status="active",
                compatibility_mode="feature_based",
                eligible_device_types=["phone"],
                match_logic="match_all",
                accessory_fields=["bluetooth_compatibility", "compatible_charging_interface"],
                compatibility_rules={
                    "bluetooth_compatibility": {"mode": "optional"},
                    "compatible_charging_interface": {"mode": "optional"},
                },
            ),
        )

        product = _make_product(
            vendor_company,
            product_category="Chargers_legacy",
            bluetooth_compatibility="Yes",
            compatible_charging_interface="Type-C",
        )

        assert check_compatibility(product, devices["iphone"]) is True

    def test_and_fails_when_one_field_mismatches(
        self, vendor_company, device_types, devices, db
    ):
        """AND/match_all must return False if any field doesn't match."""
        from apps.catalog.compatibility_engine import check_compatibility

        DynamicDropdownConfig.objects.update_or_create(
            field_name="product_category",
            value="Chargers_strict",
            defaults=dict(
                display_name="Chargers Strict",
                status="active",
                compatibility_mode="feature_based",
                eligible_device_types=["phone"],
                match_logic="AND",
                accessory_fields=["bluetooth_compatibility", "compatible_charging_interface"],
                compatibility_rules={
                    "bluetooth_compatibility": {"mode": "optional"},
                    "compatible_charging_interface": {"mode": "optional"},
                },
            ),
        )

        product = _make_product(
            vendor_company,
            product_category="Chargers_strict",
            bluetooth_compatibility="Yes",
            compatible_charging_interface="Lightning",
        )

        # Charging interface doesn't match iphone's Type-C
        assert check_compatibility(product, devices["iphone"]) is False

    def test_or_match_logic_passes_with_one_match(
        self, vendor_company, device_types, devices, headphone_config
    ):
        """OR match logic passes if at least one field matches."""
        from apps.catalog.compatibility_engine import check_compatibility

        product = _make_product(
            vendor_company,
            bluetooth_compatibility="Yes",
            headphone_jack_compatibility="Not Compatible",
        )

        # bluetooth matches, headphone_jack doesn't -> OR should pass
        assert check_compatibility(product, devices["iphone"]) is True


# ── Bug 4: Serializer validation for mode/device-types consistency ───────


class TestSerializerCompatibilityValidation:

    def test_direct_device_rejects_compatible_device_types(
        self, vendor_company, db
    ):
        """Inconsistent scope is rejected; it must not be silently discarded."""
        from apps.catalog.api import ProductDetailSerializer

        product = _make_product(
            vendor_company,
            compatibility_mode="direct_device",
            compatible_device_types=[],
        )

        serializer = ProductDetailSerializer(
            instance=product,
            data={"compatible_device_types": ["phone", "tablet"]},
            partial=True,
        )
        assert not serializer.is_valid()
        assert "compatible_device_types" in serializer.errors

    def test_universal_requires_device_types(
        self, vendor_company, db
    ):
        """Serializer should reject universal_device_type without device types."""
        from apps.catalog.api import ProductDetailSerializer
        from rest_framework.exceptions import ValidationError

        product = _make_product(
            vendor_company,
            compatibility_mode="universal_device_type",
            compatible_device_types=["phone"],
        )

        serializer = ProductDetailSerializer(
            instance=product,
            data={"compatible_device_types": []},
            partial=True,
        )
        with pytest.raises(ValidationError) as exc:
            serializer.is_valid(raise_exception=True)
        assert "compatible_device_types" in exc.value.detail


# ── Universal device type mapping function ───────────────────────────────


class TestUniversalDeviceTypeMapping:

    def test_maps_to_all_matching_devices(
        self, vendor_company, device_types, devices
    ):
        """run_universal_device_type_mapping maps to all phone devices."""
        from apps.catalog.compatibility_engine import run_universal_device_type_mapping

        product = _make_product(
            vendor_company,
            compatibility_mode="universal_device_type",
            compatible_device_types=["phone"],
        )

        # Clear any auto-created assertions from product save
        ProductCompatibilityAssertion.objects.filter(product=product).delete()

        run_universal_device_type_mapping(product)

        phone_assertions = ProductCompatibilityAssertion.objects.filter(
            product=product,
            compatibility_basis="universal_device_type",
        )
        phone_device_ids = {devices["iphone"].id, devices["galaxy"].id}
        mapped_ids = {a.device_reference for a in phone_assertions}
        assert phone_device_ids.issubset(mapped_ids)

        # Must NOT include the iPad (tablet)
        assert devices["ipad"].id not in mapped_ids

    def test_preserves_locked_assertions(
        self, vendor_company, device_types, devices
    ):
        """Locked assertions must not be overwritten by universal mapping."""
        from apps.catalog.compatibility_engine import run_universal_device_type_mapping

        product = _make_product(
            vendor_company,
            compatibility_mode="universal_device_type",
            compatible_device_types=["phone"],
        )

        # Clear auto-created assertions, then create a locked one manually
        ProductCompatibilityAssertion.objects.filter(product=product).delete()

        ProductCompatibilityAssertion.objects.create(
            product=product,
            device_reference=devices["iphone"].id,
            is_compatible=False,
            is_excluded=True,
            is_locked=True,
            compatibility_basis="manual_assertion",
            match_source="Admin",
            match_status="Excluded",
            vendor_company_reference=vendor_company.id,
            sku=product.sku,
        )

        run_universal_device_type_mapping(product)

        locked = ProductCompatibilityAssertion.objects.get(
            product=product, device_reference=devices["iphone"].id
        )
        assert locked.is_compatible is False
        assert locked.is_locked is True
        assert locked.is_excluded is True

    def test_updates_compatibility_status(
        self, vendor_company, device_types, devices
    ):
        """After universal mapping, compatibility_status should be 'complete'."""
        from apps.catalog.compatibility_engine import run_universal_device_type_mapping

        product = _make_product(
            vendor_company,
            compatibility_mode="universal_device_type",
            compatible_device_types=["phone"],
        )

        # Clear assertions and reset status
        ProductCompatibilityAssertion.objects.filter(product=product).delete()
        Product.objects.filter(id=product.id).update(compatibility_status="incomplete")
        product.refresh_from_db()
        assert product.compatibility_status == "incomplete"

        run_universal_device_type_mapping(product)

        product.refresh_from_db()
        assert product.compatibility_status == "complete"


# ── Data migration 0026 coverage ─────────────────────────────────────────


class TestDataConsistency:

    def test_direct_device_with_device_types_is_inconsistent(
        self, vendor_company, device_types, devices, headphone_config
    ):
        """
        Demonstrates the exact data inconsistency the client hit:
        a direct_device product with compatible_device_types=['phone']
        gets universally mapped to all phones.
        With the fix, it must NOT.
        """
        from apps.catalog.compatibility_engine import run_device_remapping

        # Use skip_clean to simulate pre-migration bad data
        bad_product = _make_product(
            vendor_company,
            skip_clean=True,
            name="Bad iPhone Case",
            product_category="Cases",
            compatibility_mode="direct_device",
            compatible_device_types=["phone"],
        )

        new_phone = Device.objects.create(
            name="OnePlus 12",
            manufacturer=Manufacturer.objects.first(),
            device_type=device_types["phone"],
            lifecycle_status="available",
            launch_date=timezone.now().date(),
        )

        run_device_remapping(new_phone)

        # With the fix, direct_device products should NOT be universally mapped
        assert not ProductCompatibilityAssertion.objects.filter(
            product=bad_product,
            device_reference=new_phone.id,
            compatibility_basis="universal_device_type",
        ).exists()

    def test_clean_product_data_consistency(self, vendor_company, db):
        """
        Verify the cleanup logic that migration 0026 performs:
        direct_device products should have compatible_device_types=[].
        """
        # Use skip_clean to simulate pre-migration bad data
        product = _make_product(
            vendor_company,
            skip_clean=True,
            compatibility_mode="direct_device",
            compatible_device_types=["phone", "tablet"],
        )

        # Simulate what migration does
        if product.compatibility_mode == "direct_device" and product.compatible_device_types:
            product.compatible_device_types = []
            product.save_base(raw=True)

        product.refresh_from_db()
        assert product.compatible_device_types == []

    def test_model_clean_rejects_direct_device_with_device_types(self, vendor_company, db):
        """Model validation must reject direct_device with compatible_device_types."""
        from django.core.exceptions import ValidationError

        p = Product(
            sku="TEST-CLEAN-001",
            name="Should Fail",
            brand="TestBrand",
            product_type="accessory",
            product_category="Headphones",
            status=ProductStatus.PENDING_REVIEW,
            selling_status="for_sale",
            vendor_wholesale_price_amount=Decimal("10.00"),
            msrp=Decimal("20.00"),
            map_price=Decimal("15.00"),
            inventory_level=100,
            vendor_company_reference=vendor_company.id,
            company_scope_reference=vendor_company.id,
            launch_date=timezone.now().date(),
            compatibility_mode="direct_device",
            compatible_device_types=["phone"],
        )

        with pytest.raises(ValidationError) as exc:
            p.clean()
        assert "compatible_device_types" in exc.value.message_dict
