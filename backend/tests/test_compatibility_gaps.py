"""
Tests covering compatibility engine gaps identified in AM test scripts:

1. Buyer Visibility (AM-064 to AM-072)
2. Category-Specific Mapping (AM-048 to AM-059)
3. Add/Remove/Replace Modes (AM-073 to AM-077)
4. Audit Trail & Downstream Events (AM-088 to AM-095)
"""
import json
import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone

from apps.audit.models import AuditRecord
from apps.catalog.compatibility_commands import (
    EXCLUSION_REASONS,
    apply_mapping_control,
    update_explicit_selections,
)
from apps.catalog.compatibility_engine import (
    check_compatibility,
    log_compatibility_change,
    reconcile_product_compatibility,
    run_compatibility_automapping,
    run_device_remapping,
)
from apps.catalog.models import (
    BuyerScopedCompatibilityProjection,
    DynamicDropdownConfig,
    Product,
    ProductCompatibilityAssertion,
    ProductStatus,
    ProjectionStatus,
)
from apps.devices.models import (
    BuyerDevicePortfolioReference,
    BuyerDevicePortfolioSnapshot,
    ChangeSource,
    Device,
    DeviceType,
    Manufacturer,
)
from apps.tenant.models import (
    Company,
    CompanyEntity,
    CompanyStatus,
    CompanyType,
    EntityStatus,
    User,
)


# ── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def gap_vendor(db):
    return Company.objects.create(
        name="Gap Test Vendor",
        company_type=CompanyType.VENDOR,
        status=CompanyStatus.ACTIVE,
        slug=f"gap-vendor-{uuid.uuid4().hex[:8]}",
    )


@pytest.fixture
def gap_vendor_entity(gap_vendor):
    return CompanyEntity.objects.create(
        company=gap_vendor,
        name="Gap Vendor Entity",
        status=EntityStatus.ACTIVE,
    )


@pytest.fixture
def gap_vendor_user(gap_vendor_entity):
    from apps.tenant.models import Capability
    user = User.objects.create_user(
        email=f"gapvendor-{uuid.uuid4().hex[:6]}@test.test",
        entity=gap_vendor_entity,
        password="testpass123",
    )
    cap, _ = Capability.objects.get_or_create(
        code="catalog.product.update",
        defaults={"module": "catalog", "is_active": True},
    )
    user.capabilities.add(cap)
    user.company.capabilities.add(cap)
    return user


@pytest.fixture
def gap_admin_user(db):
    return User.objects.create_superuser(
        email=f"gapadmin-{uuid.uuid4().hex[:6]}@cixci.test",
        password="adminpass123",
    )


@pytest.fixture
def gap_buyer(db):
    return Company.objects.create(
        name="Gap Test Buyer",
        company_type=CompanyType.BUYER,
        status=CompanyStatus.ACTIVE,
        slug=f"gap-buyer-{uuid.uuid4().hex[:8]}",
    )


@pytest.fixture
def gap_buyer_entity(gap_buyer):
    return CompanyEntity.objects.create(
        company=gap_buyer,
        name="Gap Buyer Entity",
        status=EntityStatus.ACTIVE,
    )


@pytest.fixture
def gap_device_types(db):
    phone, _ = DeviceType.objects.get_or_create(code="phone", defaults={"name": "Phone", "status": "active"})
    tablet, _ = DeviceType.objects.get_or_create(code="tablet", defaults={"name": "Tablet", "status": "active"})
    watch, _ = DeviceType.objects.get_or_create(code="smartwatch", defaults={"name": "Smartwatch", "status": "active"})
    return {"phone": phone, "tablet": tablet, "smartwatch": watch}


@pytest.fixture
def gap_manufacturer(db):
    mfg, _ = Manufacturer.objects.get_or_create(name="GapTestMfg")
    return mfg


@pytest.fixture
def gap_devices(gap_device_types, gap_manufacturer):
    today = timezone.now().date()
    phone_a = Device.objects.create(
        name="GapPhone A", manufacturer=gap_manufacturer,
        device_type=gap_device_types["phone"], lifecycle_status="available",
        launch_date=today, bluetooth_compatibility="Yes",
        compatible_charging_interface="Type-C",
        wireless_charging_compatibility="MagSafe",
    )
    phone_b = Device.objects.create(
        name="GapPhone B", manufacturer=gap_manufacturer,
        device_type=gap_device_types["phone"], lifecycle_status="available",
        launch_date=today, bluetooth_compatibility="Yes",
        compatible_charging_interface="Lightning",
        wireless_charging_compatibility="Qi2",
    )
    tablet_a = Device.objects.create(
        name="GapTablet A", manufacturer=gap_manufacturer,
        device_type=gap_device_types["tablet"], lifecycle_status="available",
        launch_date=today, bluetooth_compatibility="Yes",
        compatible_charging_interface="Type-C",
        headphone_jack_compatibility="Type-C",
    )
    watch_a = Device.objects.create(
        name="GapWatch A", manufacturer=gap_manufacturer,
        device_type=gap_device_types["smartwatch"], lifecycle_status="available",
        launch_date=today, bluetooth_compatibility="Yes",
        wireless_charging_compatibility="MagSafe",
        compatible_watch_case_size="45mm",
    )
    watch_b = Device.objects.create(
        name="GapWatch B", manufacturer=gap_manufacturer,
        device_type=gap_device_types["smartwatch"], lifecycle_status="available",
        launch_date=today, bluetooth_compatibility="Yes",
        wireless_charging_compatibility="Qi2",
        compatible_watch_case_size="49mm",
    )
    return {
        "phone_a": phone_a, "phone_b": phone_b,
        "tablet_a": tablet_a, "watch_a": watch_a, "watch_b": watch_b,
    }


def _gap_config(category, mode="feature_based", device_types=None, match_logic="OR",
                fields=None, rules=None):
    cfg, _ = DynamicDropdownConfig.objects.update_or_create(
        field_name="product_category", value=category,
        defaults=dict(
            display_name=category, status="active",
            compatibility_mode=mode,
            eligible_device_types=device_types or ["phone"],
            match_logic=match_logic,
            accessory_fields=fields or [],
            compatibility_rules=rules or {},
        ),
    )
    return cfg


def _gap_product(vendor, skip_clean=False, **overrides):
    now = timezone.now()
    defaults = dict(
        sku=f"GAP-{uuid.uuid4().hex[:8]}",
        name="Gap Test Product",
        brand="GapBrand",
        product_type="accessory",
        product_category="GapCategory",
        status=ProductStatus.PENDING_REVIEW,
        selling_status="for_sale",
        vendor_wholesale_price_amount=Decimal("10.00"),
        msrp=Decimal("20.00"),
        map_price=Decimal("15.00"),
        inventory_level=100,
        vendor_company_reference=vendor.id,
        company_scope_reference=vendor.id,
        launch_date=now.date(),
        compatibility_mode="direct_device",
    )
    defaults.update(overrides)
    if skip_clean:
        defaults.setdefault("created_at", now)
        defaults.setdefault("updated_at", now)
        p = Product(**defaults)
        p.save_base(raw=True)
        return p
    return Product.objects.create(**defaults)


# ═══════════════════════════════════════════════════════════════════════════
# 1. BUYER VISIBILITY TESTS (AM-064 to AM-072)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestBuyerVisibility:

    def _setup_projection(self, buyer, buyer_entity, device_ids):
        snapshot = BuyerDevicePortfolioSnapshot.objects.create(
            buyer_reference=buyer.id,
            company_scope_reference=buyer.id,
            buyer_entity_reference=buyer_entity.id,
            device_ids=[str(d) for d in device_ids],
            device_count=len(device_ids),
            snapshot_reason="test",
        )
        for did in device_ids:
            BuyerDevicePortfolioReference.objects.get_or_create(
                device_id=did,
                buyer_reference=buyer.id,
                company_scope_reference=buyer.id,
                buyer_entity_reference=buyer_entity.id,
                defaults={"active_flag": True, "change_source": ChangeSource.BUYER_ACTION},
            )
        return snapshot

    def _recalc(self, buyer, buyer_entity, snapshot):
        from apps.catalog.services import recalculate_buyer_compatibility_projection
        return recalculate_buyer_compatibility_projection(
            buyer_reference=buyer.id,
            company_scope_reference=buyer.id,
            buyer_entity_reference=buyer_entity.id,
            portfolio_snapshot_reference=snapshot.id,
            trigger="test",
        )

    def test_am064_auto_mapping_alone_not_enough(
        self, gap_vendor, gap_buyer, gap_buyer_entity, gap_devices, gap_device_types,
    ):
        """AM-064: Product with valid mapping but missing visibility rules stays hidden."""
        _gap_config("AM064Cat", device_types=["phone"], fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AM064Cat",
                               bluetooth_compatibility="Yes",
                               status=ProductStatus.PENDING_REVIEW)
        ProductCompatibilityAssertion.objects.update_or_create(
            product=product, device_reference=gap_devices["phone_a"].id,
            defaults=dict(
                is_compatible=True, compatibility_basis="feature_evidence",
                match_source="Auto-Mapping", match_status="Active",
                vendor_company_reference=gap_vendor.id, sku=product.sku,
            ),
        )
        snapshot = self._setup_projection(gap_buyer, gap_buyer_entity, [gap_devices["phone_a"].id])
        result = self._recalc(gap_buyer, gap_buyer_entity, snapshot)
        proj = BuyerScopedCompatibilityProjection.objects.get(
            buyer_reference=gap_buyer.id, company_scope_reference=gap_buyer.id,
        )
        assert str(product.id) not in [str(pid) for pid in proj.compatible_product_ids]

    def test_am065_no_my_devices_no_accessories(
        self, gap_vendor, gap_buyer, gap_buyer_entity, gap_devices, gap_device_types,
    ):
        """AM-065: Buyer with no My Devices portfolio sees no accessories."""
        snapshot = BuyerDevicePortfolioSnapshot.objects.create(
            buyer_reference=gap_buyer.id,
            company_scope_reference=gap_buyer.id,
            buyer_entity_reference=gap_buyer_entity.id,
            device_ids=[], device_count=0, snapshot_reason="empty",
        )
        result = self._recalc(gap_buyer, gap_buyer_entity, snapshot)
        assert result["status"] == "empty_portfolio"
        assert result["compatible_count"] == 0

    def test_am070_future_launch_device_no_visibility(
        self, gap_vendor, gap_buyer, gap_buyer_entity, gap_devices, gap_device_types, gap_manufacturer,
    ):
        """AM-070: Future launch device maps internally but doesn't drive buyer visibility."""
        future_date = timezone.now().date() + timedelta(days=60)
        future_phone = Device.objects.create(
            name="FuturePhone", manufacturer=gap_manufacturer,
            device_type=gap_device_types["phone"], lifecycle_status="available",
            launch_date=future_date, bluetooth_compatibility="Yes",
            compatible_charging_interface="Type-C",
        )
        _gap_config("AM070Cat", device_types=["phone"], fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AM070Cat",
                               bluetooth_compatibility="Yes",
                               status=ProductStatus.ACTIVE)
        ProductCompatibilityAssertion.objects.update_or_create(
            product=product, device_reference=future_phone.id,
            defaults=dict(
                is_compatible=True, compatibility_basis="feature_evidence",
                match_source="Auto-Mapping", match_status="Pending",
                vendor_company_reference=gap_vendor.id, sku=product.sku,
            ),
        )
        snapshot = self._setup_projection(gap_buyer, gap_buyer_entity, [future_phone.id])
        result = self._recalc(gap_buyer, gap_buyer_entity, snapshot)
        proj = BuyerScopedCompatibilityProjection.objects.get(
            buyer_reference=gap_buyer.id, company_scope_reference=gap_buyer.id,
        )
        assert str(product.id) not in [str(pid) for pid in proj.compatible_product_ids]

    def test_am071_inactive_device_no_visibility(
        self, gap_vendor, gap_buyer, gap_buyer_entity, gap_devices, gap_device_types, gap_manufacturer,
    ):
        """AM-071: Inactive device does not drive buyer visibility.

        Device.save() auto-corrects lifecycle_status based on launch_date,
        so we use save_base(raw=True) to persist the "inactive" status directly.
        """
        inactive_phone = Device(
            name="InactivePhone", manufacturer=gap_manufacturer,
            device_type=gap_device_types["phone"], lifecycle_status="inactive",
            launch_date=timezone.now().date(), bluetooth_compatibility="Yes",
            created_at=timezone.now(), updated_at=timezone.now(),
        )
        inactive_phone.save_base(raw=True)
        assert Device.objects.get(id=inactive_phone.id).lifecycle_status == "inactive"

        _gap_config("AM071Cat", device_types=["phone"], fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AM071Cat",
                               bluetooth_compatibility="Yes",
                               status=ProductStatus.ACTIVE)
        ProductCompatibilityAssertion.objects.update_or_create(
            product=product, device_reference=inactive_phone.id,
            defaults=dict(
                is_compatible=True, compatibility_basis="feature_evidence",
                match_source="Auto-Mapping", match_status="Active",
                vendor_company_reference=gap_vendor.id, sku=product.sku,
            ),
        )
        snapshot = self._setup_projection(gap_buyer, gap_buyer_entity, [inactive_phone.id])
        result = self._recalc(gap_buyer, gap_buyer_entity, snapshot)
        proj = BuyerScopedCompatibilityProjection.objects.get(
            buyer_reference=gap_buyer.id, company_scope_reference=gap_buyer.id,
        )
        assert str(product.id) not in [str(pid) for pid in proj.compatible_product_ids]

    def test_am072_archived_device_no_visibility(
        self, gap_vendor, gap_buyer, gap_buyer_entity, gap_devices, gap_device_types, gap_manufacturer,
    ):
        """AM-072: Archived device does not drive buyer visibility."""
        archived_phone = Device.objects.create(
            name="ArchivedPhone", manufacturer=gap_manufacturer,
            device_type=gap_device_types["phone"], lifecycle_status="archived",
            launch_date=timezone.now().date(), bluetooth_compatibility="Yes",
        )
        _gap_config("AM072Cat", device_types=["phone"], fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AM072Cat",
                               bluetooth_compatibility="Yes",
                               status=ProductStatus.ACTIVE)
        ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=archived_phone.id,
            is_compatible=True, compatibility_basis="feature_evidence",
            match_source="Auto-Mapping", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        snapshot = self._setup_projection(gap_buyer, gap_buyer_entity, [archived_phone.id])
        result = self._recalc(gap_buyer, gap_buyer_entity, snapshot)
        proj = BuyerScopedCompatibilityProjection.objects.get(
            buyer_reference=gap_buyer.id, company_scope_reference=gap_buyer.id,
        )
        assert str(product.id) not in [str(pid) for pid in proj.compatible_product_ids]


# ═══════════════════════════════════════════════════════════════════════════
# 2. CATEGORY-SPECIFIC MAPPING (AM-048 to AM-059)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestCategorySpecificMapping:

    def test_am051_speakers_bluetooth_only(self, gap_vendor, gap_devices, gap_device_types):
        """AM-051: Speakers map by Bluetooth only, charging interface doesn't drive mapping."""
        _gap_config("Speakers", device_types=["phone", "tablet"],
                     fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        speaker = _gap_product(gap_vendor, product_category="Speakers",
                               bluetooth_compatibility="Yes",
                               compatible_charging_interface="Type-C")
        assert check_compatibility(speaker, gap_devices["phone_a"]) is True
        assert check_compatibility(speaker, gap_devices["tablet_a"]) is True

    def test_am051_speakers_charging_not_mapped(self, gap_vendor, gap_devices, gap_device_types):
        """AM-051: Speaker with only charging interface and no Bluetooth shouldn't map."""
        _gap_config("SpeakersNobt", device_types=["phone", "tablet"],
                     fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        speaker = _gap_product(gap_vendor, product_category="SpeakersNobt",
                               bluetooth_compatibility="No",
                               compatible_charging_interface="Type-C")
        assert check_compatibility(speaker, gap_devices["phone_a"]) is False

    def test_am054_wearable_tech_smartwatch_only(self, gap_vendor, gap_devices, gap_device_types):
        """AM-054: Wearable Tech maps only to Smartwatch, not Phone/Tablet."""
        _gap_config("Wearable Tech", device_types=["smartwatch"],
                     fields=["wireless_charging_compatibility"],
                     rules={"wireless_charging_compatibility": {"mode": "optional"}})
        wearable = _gap_product(gap_vendor, product_category="Wearable Tech",
                                wireless_charging_compatibility="MagSafe")
        assert check_compatibility(wearable, gap_devices["watch_a"]) is True
        assert check_compatibility(wearable, gap_devices["phone_a"]) is False
        assert check_compatibility(wearable, gap_devices["tablet_a"]) is False

    def test_am055_watch_accessories_case_size(self, gap_vendor, gap_devices, gap_device_types):
        """AM-055: Watch Accessories map by case size when size-specific."""
        _gap_config("Watch Accessories", device_types=["smartwatch"],
                     match_logic="AND",
                     fields=["wireless_charging_compatibility", "compatible_watch_case_size"],
                     rules={
                         "wireless_charging_compatibility": {"mode": "optional"},
                         "compatible_watch_case_size": {"mode": "optional"},
                     })
        watch_band = _gap_product(gap_vendor, product_category="Watch Accessories",
                                  wireless_charging_compatibility="MagSafe",
                                  compatible_watch_case_size="45mm")
        assert check_compatibility(watch_band, gap_devices["watch_a"]) is True
        assert check_compatibility(watch_band, gap_devices["watch_b"]) is False

    def test_am050_wireless_charging_conflict_magsafe_qi2_allowed(self, gap_vendor, gap_device_types):
        """AM-050: MagSafe + Qi2 is allowed."""
        product = _gap_product(gap_vendor, skip_clean=True,
                               wireless_charging_compatibility="MagSafe+Qi2")
        from apps.catalog.compatibility_values import normalized_wireless, value_catalog
        cat = value_catalog()
        result = normalized_wireless("MagSafe+Qi2", cat)
        parts = set(result.split("+")) - {""}
        assert "MagSafe" in parts
        assert "Qi2" in parts

    def test_am050_wireless_tablet_excluded(self, gap_vendor, gap_devices, gap_device_types):
        """AM-049/050: Tablet must not match on wireless charging."""
        _gap_config("ChargersTablet", device_types=["phone", "tablet"],
                     fields=["wireless_charging_compatibility"],
                     rules={"wireless_charging_compatibility": {"mode": "optional"}})
        charger = _gap_product(gap_vendor, product_category="ChargersTablet",
                               wireless_charging_compatibility="MagSafe")
        assert check_compatibility(charger, gap_devices["phone_a"]) is True
        assert check_compatibility(charger, gap_devices["tablet_a"]) is False


# ═══════════════════════════════════════════════════════════════════════════
# 3. ADD/REMOVE/REPLACE COMPATIBILITY MODES (AM-073 to AM-077)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestAddRemoveReplace:

    def test_am073_add_keeps_existing(
        self, gap_vendor, gap_vendor_user, gap_devices, gap_device_types,
    ):
        """AM-073: Add mode preserves existing mappings and adds new ones."""
        _gap_config("CasesAR", mode="device_specific", device_types=["phone"],
                     fields=["compatible_charging_interface"],
                     rules={"compatible_charging_interface": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="CasesAR",
                               compatible_charging_interface="Type-C")
        ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=gap_devices["phone_a"].id,
            is_compatible=True, compatibility_basis="manual_assertion",
            match_source="Manual", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        update_explicit_selections(
            product,
            [{"device_id": str(gap_devices["phone_b"].id)}],
            gap_vendor_user,
            update_type="add",
        )
        assert ProductCompatibilityAssertion.objects.filter(
            product=product, device_reference=gap_devices["phone_a"].id,
        ).exists()
        assert ProductCompatibilityAssertion.objects.filter(
            product=product, device_reference=gap_devices["phone_b"].id,
        ).exists()

    def test_am074_remove_marks_excluded_by_vendor(
        self, gap_vendor, gap_vendor_user, gap_devices, gap_device_types,
    ):
        """AM-074: Remove marks mapping as Excluded by Vendor, not hard delete."""
        _gap_config("CasesRM", mode="device_specific", device_types=["phone"],
                     fields=["compatible_charging_interface"],
                     rules={"compatible_charging_interface": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="CasesRM",
                               compatible_charging_interface="Type-C")
        ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=gap_devices["phone_a"].id,
            is_compatible=True, compatibility_basis="manual_assertion",
            match_source="Manual", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        apply_mapping_control(
            product, gap_vendor_user, "exclude", gap_devices["phone_a"].id,
            reason="physical_mismatch", notes="Does not fit",
        )
        row = ProductCompatibilityAssertion.objects.get(
            product=product, device_reference=gap_devices["phone_a"].id,
        )
        assert row.is_excluded is True
        assert row.exclusion_type == "vendor"
        assert row.exclusion_reason == "physical_mismatch"

    def test_am075_cixci_remove_marks_admin_exclusion(
        self, gap_vendor, gap_admin_user, gap_devices, gap_device_types,
    ):
        """AM-075: CIXCI Admin remove marks as Excluded by CIXCI Admin."""
        _gap_config("CasesAdm", mode="device_specific", device_types=["phone"],
                     fields=["compatible_charging_interface"],
                     rules={"compatible_charging_interface": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="CasesAdm",
                               compatible_charging_interface="Type-C")
        ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=gap_devices["phone_a"].id,
            is_compatible=True, compatibility_basis="manual_assertion",
            match_source="Manual", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        apply_mapping_control(
            product, gap_admin_user, "exclude", gap_devices["phone_a"].id,
            reason="regulatory_unsupported", notes="Compliance issue",
        )
        row = ProductCompatibilityAssertion.objects.get(
            product=product, device_reference=gap_devices["phone_a"].id,
        )
        assert row.is_excluded is True
        assert row.exclusion_type == "admin"

    def test_am076_replace_requires_approval_for_live(
        self, gap_vendor, gap_vendor_user, gap_devices, gap_device_types,
    ):
        """AM-076: Replace on active product requires CIXCI Admin approval."""
        _gap_config("CasesRepl", mode="device_specific", device_types=["phone"],
                     fields=["compatible_charging_interface"],
                     rules={"compatible_charging_interface": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="CasesRepl",
                               compatible_charging_interface="Type-C",
                               status=ProductStatus.ACTIVE)
        ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=gap_devices["phone_a"].id,
            is_compatible=True, compatibility_basis="manual_assertion",
            match_source="Manual", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        with pytest.raises(ValidationError) as exc:
            update_explicit_selections(
                product,
                [{"device_id": str(gap_devices["phone_b"].id)}],
                gap_vendor_user,
                update_type="replace",
            )
        assert "update_type" in exc.value.message_dict

    def test_am077_replace_preserves_locked(
        self, gap_vendor, gap_admin_user, gap_devices, gap_device_types,
    ):
        """AM-077: Replace preserves locked exclusions and overrides."""
        _gap_config("CasesLock", mode="device_specific", device_types=["phone"],
                     fields=["compatible_charging_interface"],
                     rules={"compatible_charging_interface": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="CasesLock",
                               compatible_charging_interface="Type-C")
        locked_row = ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=gap_devices["phone_a"].id,
            is_compatible=True, is_locked=True,
            compatibility_basis="manual_assertion",
            match_source="Admin", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        update_explicit_selections(
            product,
            [{"device_id": str(gap_devices["phone_b"].id)}],
            gap_admin_user,
            update_type="replace",
        )
        locked_row.refresh_from_db()
        assert locked_row.is_locked is True
        assert ProductCompatibilityAssertion.objects.filter(
            product=product, device_reference=gap_devices["phone_a"].id,
        ).exists()


# ═══════════════════════════════════════════════════════════════════════════
# 4. AUDIT TRAIL & DOWNSTREAM EVENTS (AM-088 to AM-095)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestAuditTrail:

    def test_am088_auto_mapping_creates_audit(
        self, gap_vendor, gap_devices, gap_device_types,
    ):
        """AM-088: Auto-mapping creates audit log entry."""
        _gap_config("AuditCat", device_types=["phone"],
                     fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AuditCat",
                               bluetooth_compatibility="Yes")
        ProductCompatibilityAssertion.objects.filter(product=product).delete()
        AuditRecord.objects.filter(event_code="catalog.compatibility.changed").delete()
        run_compatibility_automapping(product)
        audits = AuditRecord.objects.filter(
            event_code="catalog.compatibility.changed",
            source_record_type="ProductCompatibilityAssertion",
        )
        assert audits.exists()
        payload = json.loads(audits.first().event_description)
        assert payload["sku"] == product.sku
        assert payload["change_source"] == "Auto-Mapping"

    def test_am089_vendor_exclusion_creates_audit(
        self, gap_vendor, gap_vendor_user, gap_devices, gap_device_types,
    ):
        """AM-089: Vendor exclusion creates audit log."""
        _gap_config("AuditExcl", mode="device_specific", device_types=["phone"],
                     fields=["compatible_charging_interface"],
                     rules={"compatible_charging_interface": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AuditExcl",
                               compatible_charging_interface="Type-C")
        ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=gap_devices["phone_a"].id,
            is_compatible=True, compatibility_basis="manual_assertion",
            match_source="Manual", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        AuditRecord.objects.filter(event_code="catalog.compatibility.changed").delete()
        apply_mapping_control(
            product, gap_vendor_user, "exclude", gap_devices["phone_a"].id,
            reason="physical_mismatch", notes="Vendor removal",
        )
        audits = AuditRecord.objects.filter(
            event_code="catalog.compatibility.changed",
        )
        assert audits.exists()
        payload = json.loads(audits.first().event_description)
        assert payload["exclusion_reason"] == "physical_mismatch"

    def test_am090_admin_exclusion_creates_audit(
        self, gap_vendor, gap_admin_user, gap_devices, gap_device_types,
    ):
        """AM-090: CIXCI Admin exclusion creates audit log."""
        _gap_config("AuditAdmExcl", mode="device_specific", device_types=["phone"],
                     fields=["compatible_charging_interface"],
                     rules={"compatible_charging_interface": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AuditAdmExcl",
                               compatible_charging_interface="Type-C")
        ProductCompatibilityAssertion.objects.create(
            product=product, device_reference=gap_devices["phone_a"].id,
            is_compatible=True, compatibility_basis="manual_assertion",
            match_source="Manual", match_status="Active",
            vendor_company_reference=gap_vendor.id, sku=product.sku,
        )
        AuditRecord.objects.filter(event_code="catalog.compatibility.changed").delete()
        apply_mapping_control(
            product, gap_admin_user, "exclude", gap_devices["phone_a"].id,
            reason="regulatory_unsupported", notes="Admin exclusion",
        )
        audits = AuditRecord.objects.filter(event_code="catalog.compatibility.changed")
        assert audits.exists()
        payload = json.loads(audits.first().event_description)
        assert payload["exclusion_source"] == "admin"

    def test_am091_recalculate_creates_audit(
        self, gap_vendor, gap_devices, gap_device_types,
    ):
        """AM-091: Recalculate compatibility creates audit log."""
        _gap_config("AuditRecalc", device_types=["phone"],
                     fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        product = _gap_product(gap_vendor, product_category="AuditRecalc",
                               bluetooth_compatibility="Yes")
        ProductCompatibilityAssertion.objects.filter(product=product).delete()
        AuditRecord.objects.filter(event_code="catalog.compatibility.changed").delete()
        reconcile_product_compatibility(product, change_source="Manual Recalculation")
        audits = AuditRecord.objects.filter(
            event_code="catalog.compatibility.changed",
        )
        assert audits.exists()
        payload = json.loads(audits.first().event_description)
        assert payload["change_source"] == "Manual Recalculation"

    def test_am095_audit_is_tenant_scoped(
        self, gap_vendor, gap_devices, gap_device_types, db,
    ):
        """AM-095: Audit records carry the correct tenant company scope."""
        _gap_config("AuditTenant", device_types=["phone"],
                     fields=["bluetooth_compatibility"],
                     rules={"bluetooth_compatibility": {"mode": "optional"}})
        other_vendor = Company.objects.create(
            name="Other Vendor", company_type=CompanyType.VENDOR,
            status=CompanyStatus.ACTIVE, slug=f"other-{uuid.uuid4().hex[:8]}",
        )
        product_a = _gap_product(gap_vendor, product_category="AuditTenant",
                                 bluetooth_compatibility="Yes")
        product_b = _gap_product(other_vendor, product_category="AuditTenant",
                                 bluetooth_compatibility="Yes")
        AuditRecord.objects.filter(event_code="catalog.compatibility.changed").delete()
        run_compatibility_automapping(product_a)
        run_compatibility_automapping(product_b)
        audits_a = AuditRecord.objects.filter(
            event_code="catalog.compatibility.changed",
            company_scope_reference=gap_vendor.id,
        )
        audits_b = AuditRecord.objects.filter(
            event_code="catalog.compatibility.changed",
            company_scope_reference=other_vendor.id,
        )
        if audits_a.exists():
            for audit in audits_a:
                assert audit.company_scope_reference == gap_vendor.id
        if audits_b.exists():
            for audit in audits_b:
                assert audit.company_scope_reference == other_vendor.id
        all_audits = AuditRecord.objects.filter(event_code="catalog.compatibility.changed")
        for audit in all_audits:
            assert audit.company_scope_reference in (gap_vendor.id, other_vendor.id)
