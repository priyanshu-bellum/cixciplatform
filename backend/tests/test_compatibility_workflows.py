"""Document acceptance tests across API, CSV, entity portfolio and history."""
import importlib
import json
from types import SimpleNamespace
import uuid

import pytest
from django.apps import apps
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone

from apps.audit.models import AuditRecord
from apps.catalog.api import DynamicDropdownConfigSerializer
from apps.catalog.compatibility_commands import update_explicit_selections, apply_mapping_control
from apps.catalog.compatibility_contract import buyer_portfolio_device_ids
from apps.catalog.compatibility_import import parse_compatibility_row, apply_import_values
from apps.catalog.compatibility_engine import check_compatibility, reconcile_product_compatibility
from apps.catalog.models import Product, ProductCompatibilityAssertion, DynamicDropdownConfig, BuyerProductExportJob, BuyerProductExportSelectionSnapshot, BuyerProductExportDate
from apps.catalog.tasks import process_buyer_export_job
from apps.devices.models import Device, DeviceType, Manufacturer
from apps.devices.services import add_device_to_portfolio
from apps.tenant.models import User, CompanyEntity

pytestmark = pytest.mark.django_db


@pytest.fixture
def workflow(vendor_company):
    kind = DeviceType.objects.create(code="phone", name="Phone", status="active")
    manufacturer = Manufacturer.objects.create(name="Workflow Manufacturer")
    device = Device.objects.create(name="Phone A", device_type=kind, manufacturer=manufacturer, lifecycle_status="available", launch_date=timezone.localdate(), headphone_jack_compatibility="3.5mm", compatible_charging_interface="Micro-USB")
    config = DynamicDropdownConfig.objects.create(field_name="product_category", value="Workflow Exact", status="active", compatibility_mode="device_specific", eligible_device_types=["phone"])
    product = Product.objects.create(sku=uuid.uuid4().hex, name="Workflow Case", launch_date=timezone.localdate(), product_category=config.value, company_scope_reference=vendor_company.id, vendor_company_reference=vendor_company.id, status="active")
    return product, device, config


def test_manual_replace_preserves_row_history_and_alternate_sources(workflow, admin_user):
    product, device, _ = workflow
    update_explicit_selections(product, [str(device.id)], admin_user)
    original = ProductCompatibilityAssertion.objects.get(product=product, device_reference=device.id)
    update_explicit_selections(product, [], admin_user)
    original.refresh_from_db()
    assert not original.is_compatible and original.match_status == "Archived"
    assert original.match_evidence["explicit"]["active"] is False
    assert ProductCompatibilityAssertion.objects.filter(pk=original.pk).exists()
    assert AuditRecord.objects.filter(source_record_id=original.pk).count() >= 2


def test_unmapped_exclusion_never_becomes_positive_after_restore(workflow, admin_user):
    product, device, _ = workflow
    apply_mapping_control(product, admin_user, "exclude", device.id, reason="physical_mismatch")
    apply_mapping_control(product, admin_user, "restore", device.id)
    assert not ProductCompatibilityAssertion.objects.get(product=product, device_reference=device.id).is_compatible


def test_invalid_selection_is_atomic_and_cross_vendor_denied(workflow, admin_user, vendor_user):
    product, device, _ = workflow
    with pytest.raises(ValidationError):
        update_explicit_selections(product, [str(device.id), str(uuid.uuid4())], admin_user)
    assert not product.compatibility_assertions.exists()
    Product.objects.filter(pk=product.pk).update(company_scope_reference=uuid.uuid4(), vendor_company_reference=uuid.uuid4())
    product.refresh_from_db()
    with pytest.raises(PermissionDenied):
        update_explicit_selections(product, [str(device.id)], vendor_user)


def test_csv_and_manual_resolve_same_canonical_selection(workflow, admin_user):
    product, device, config = workflow
    values, types, ids = parse_compatibility_row({"devicecompatibility": device.name}, config)
    assert ids == [str(device.id)] and types == []
    apply_import_values(product, values, types, config, "replace")
    product.save()
    update_explicit_selections(product, ids, admin_user, basis="imported")
    row = ProductCompatibilityAssertion.objects.get(product=product, device_reference=device.id)
    assert row.is_compatible and row.match_evidence["explicit"]["basis"] == "imported"


def test_csv_rejects_ambiguous_models_and_mixed_scope(workflow):
    _, device, config = workflow
    Device.objects.create(name=device.name, device_type=device.device_type, manufacturer=device.manufacturer)
    for payload in ({"devicecompatibility": device.name}, {"devicecompatibility": str(device.id), "universaldevicetypes": "Phone"}, {"universaldevicetypes": "Universal"}):
        with pytest.raises(ValidationError):
            parse_compatibility_row(payload, config)


def test_csv_never_guesses_bluetooth_or_charging_from_a_product_name(workflow):
    _, _, config = workflow
    values, types, ids = parse_compatibility_row({"productname": "Bluetooth Type-C MagSafe Speaker"}, config)
    assert values == {} and types == [] and ids == []


def test_wired_audio_charging_and_capacity_use_separate_evidence(workflow):
    product, device, config = workflow
    config.compatibility_mode = "feature_based"
    config.accessory_fields = ["headphone_jack_compatibility"]
    config.compatibility_rules = {"headphone_jack_compatibility": {"mode": "optional", "comparison": "equals"}}
    config.save()
    product.headphone_jack_compatibility = "3.5mm"
    product.save()
    assert check_compatibility(product, device)
    product.headphone_jack_compatibility = "Micro-USB"
    assert not check_compatibility(product, device)
    config.accessory_fields = ["compatible_charging_interface"]
    config.compatibility_rules = {"compatible_charging_interface": {"mode": "optional", "comparison": "equals"}}
    config.save()
    values, _, _ = parse_compatibility_row({"devicecompatibility": "Micro-USB"}, config)
    assert values == {"compatible_charging_interface": "Micro-USB"}


def test_entity_combines_authorized_users_but_excludes_other_entities(workflow, buyer_user):
    _, device, _ = workflow
    colleague = User.objects.create_user(email="colleague@workflow.test", password="test", entity=buyer_user.entity)
    add_device_to_portfolio(buyer_user, device.id)
    assert device.id in buyer_portfolio_device_ids(colleague)
    other_entity = CompanyEntity.objects.create(company=buyer_user.company, name="Other Workflow Entity", status="active")
    other = User.objects.create_user(email="other@workflow.test", password="test", entity=other_entity)
    assert device.id not in buyer_portfolio_device_ids(other)


def test_controlled_values_admin_only_normalized_duplicates_and_linked_capacity(admin_client, buyer_client):
    endpoint = "/api/v1/catalog/dropdown-configs/"
    payload = {"field_name": "compatible_charging_interface", "value": "Micro-USB", "status": "active"}
    assert buyer_client.post(endpoint, payload, format="json").status_code == 403
    response = admin_client.post(endpoint, {"field_name": "storage_expansion_compatibility", "value": "New Card", "status": "active"}, format="json")
    assert response.status_code == 400
    # Normalization happens before uniqueness, including capacity whitespace.
    DynamicDropdownConfig.objects.get_or_create(field_name="memory_capacity", value="256GB", defaults={"status": "active"})
    serializer = DynamicDropdownConfigSerializer(data={"field_name": "memory_capacity", "value": "256 gb", "compatibility_rules": {"storage_expansion": "microSDXC"}})
    assert not serializer.is_valid() and "value" in serializer.errors


def test_new_category_field_requires_explicit_matching_role(workflow):
    _, device, _ = workflow
    serializer = DynamicDropdownConfigSerializer(data={"field_name": "product_category", "value": "Workflow New", "status": "active", "eligible_device_types": [str(device.device_type_id)], "accessory_fields": ["bluetooth_compatibility"], "compatibility_rules": {"bluetooth_compatibility": {"mode": "required"}}})
    assert not serializer.is_valid()


def test_repair_migration_is_idempotent_and_preserves_alternate_history(workflow):
    product, device, _ = workflow
    Product.objects.filter(pk=product.pk).update(compatible_device_types=["phone", "tablet"])
    row = ProductCompatibilityAssertion.objects.create(product=product, device_reference=device.id, compatibility_basis="universal_device_type", is_compatible=True,
        match_evidence={"universal": {"active": True}, "explicit": {"active": True, "basis": "manufacturer_assertion"}})
    module = importlib.import_module("apps.catalog.migrations.0029_repair_invalid_universal_evidence")
    editor = SimpleNamespace(connection=SimpleNamespace(alias="default"))
    module.repair(apps, editor)
    row.refresh_from_db(); product.refresh_from_db()
    assert product.compatible_device_types == [] and row.is_compatible
    assert row.match_evidence["explicit"]["active"] and not row.match_evidence["universal"]["active"]
    count = AuditRecord.objects.filter(event_code="catalog.compatibility.invalid_universal_repaired").count()
    module.repair(apps, editor)
    assert ProductCompatibilityAssertion.objects.filter(pk=row.pk).exists()
    assert AuditRecord.objects.filter(event_code="catalog.compatibility.invalid_universal_repaired").count() == count


def test_completed_export_is_immutable_on_duplicate_execution(buyer_user):
    job = BuyerProductExportJob.objects.create(buyer_reference=buyer_user.id, requested_by=buyer_user.id, company_scope_reference=buyer_user.company.id, buyer_entity_reference=buyer_user.entity_id, status="completed", completed_at=timezone.now(), format="API")
    snapshot = BuyerProductExportSelectionSnapshot.objects.create(export_job=job, product_ids=[str(uuid.uuid4())], portfolio_snapshot_reference=uuid.uuid4(), exported_products_snapshot=[{"device_compatibility": ["Historical Canonical Phone"]}])
    before = (snapshot.product_ids, snapshot.exported_products_snapshot, job.completed_at)
    process_buyer_export_job(job.id)
    job.refresh_from_db(); snapshot.refresh_from_db()
    assert (snapshot.product_ids, snapshot.exported_products_snapshot, job.completed_at) == before


def test_export_failure_rolls_back_product_added_dates(workflow, buyer_user, monkeypatch):
    product, _, _ = workflow
    job = BuyerProductExportJob.objects.create(buyer_reference=buyer_user.id, requested_by=buyer_user.id, company_scope_reference=buyer_user.company.id, buyer_entity_reference=buyer_user.entity_id, format="API")
    monkeypatch.setattr("apps.catalog.tasks._process_buyer_export_job", lambda *_: (_ for _ in ()).throw(RuntimeError("Export failed before completion")))
    with pytest.raises(RuntimeError):
        process_buyer_export_job(job.id)
    assert not BuyerProductExportDate.objects.filter(product=product).exists()
    job.refresh_from_db()
    assert job.status == "failed"
