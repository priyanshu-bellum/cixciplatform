"""Repair the exact-case Universal bug without deleting mapping history."""
from copy import deepcopy
import json
import uuid
from django.db import migrations
from django.db.models import Q
from django.utils import timezone


def repair(apps, schema_editor):
    alias = schema_editor.connection.alias
    Product = apps.get_model("catalog", "Product")
    Assertion = apps.get_model("catalog", "ProductCompatibilityAssertion")
    Device = apps.get_model("devices", "Device")
    Audit = apps.get_model("audit", "AuditRecord")
    Projection = apps.get_model("catalog", "BuyerScopedCompatibilityProjection")
    repaired = set()
    eligible = Device.objects.using(alias).filter(lifecycle_status="available", device_type__status="active", device_type__is_active=True,
        device_type__code__in=["phone", "tablet", "smartwatch"]).filter(Q(launch_date__isnull=True) | Q(launch_date__lte=timezone.localdate())).values_list("id", flat=True)
    eligible = set(eligible)

    def audit(product, kind, record_id, before, after):
        Audit.objects.using(alias).create(event_code="catalog.compatibility.invalid_universal_repaired", status="success",
            service_trigger_reference="catalog.0029_repair_invalid_universal_evidence",
            event_description=json.dumps({"before": before, "after": after}, default=str),
            company_scope_reference=product.company_scope_reference or uuid.UUID(int=0), source_module="catalog",
            source_record_type=kind, source_record_id=record_id)

    for product in Product.objects.using(alias).filter(compatibility_mode="direct_device").iterator():
        changed = False
        if product.compatible_device_types:
            before = {"compatible_device_types": product.compatible_device_types}
            Product.objects.using(alias).filter(pk=product.pk).update(compatible_device_types=[])
            audit(product, "Product", product.pk, before, {"compatible_device_types": []})
            changed = True
        for row in Assertion.objects.using(alias).filter(product_id=product.pk).iterator():
            evidence = deepcopy(row.match_evidence or {})
            universal = evidence.get("universal")
            if universal is not None and not universal.get("active"):
                continue
            if row.compatibility_basis != "universal_device_type" and not (universal and universal.get("active")):
                continue
            before = {"is_compatible": row.is_compatible, "match_status": row.match_status, "match_evidence": evidence}
            evidence["universal"] = {**(universal or {}), "active": False, "reason": "Universal evidence is invalid for Direct Device mode."}
            alternate = any(source.get("active") for key, source in evidence.items() if key != "universal" and isinstance(source, dict))
            current = bool(alternate and row.device_reference in eligible and not row.is_excluded)
            after = {"match_evidence": evidence, "is_compatible": current,
                "match_status": "Excluded" if row.is_excluded else "Active" if current else "Archived"}
            Assertion.objects.using(alias).filter(pk=row.pk).update(**after)
            audit(product, "ProductCompatibilityAssertion", row.pk, before, after)
            changed = True
        if changed:
            repaired.add(str(product.pk))
            status = "complete" if Assertion.objects.using(alias).filter(product_id=product.pk, is_compatible=True, is_excluded=False, device_reference__in=eligible).exists() else "incomplete"
            Product.objects.using(alias).filter(pk=product.pk).update(compatibility_status=status)
    if repaired:
        for projection in Projection.objects.using(alias).all().iterator():
            if repaired.intersection(str(value) for value in (projection.compatible_product_ids or [])):
                Projection.objects.using(alias).filter(pk=projection.pk).update(status="review_required", review_required_reason="compatibility_mapping_repaired")


class Migration(migrations.Migration):
    dependencies = [("catalog", "0028_backfill_compatibility_references")]
    operations = [migrations.RunPython(repair)]
