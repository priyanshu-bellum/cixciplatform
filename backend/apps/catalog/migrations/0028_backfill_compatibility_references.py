"""Add canonical references/evidence without remapping or editing product facts."""
from copy import deepcopy
import json
import uuid

from django.db import migrations


CAPACITIES = {
    "microSDXC": ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
    "microSDHC": ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "1.5TB"],
}
INITIAL_VALUES = {
    "compatible_charging_interface": ["Type-C", "Lightning", "Micro-USB", "Not Compatible"],
    "headphone_jack_compatibility": ["3.5mm", "Type-C", "Lightning", "Not Compatible"],
    "wireless_charging_compatibility": ["MagSafe", "Qi", "Qi2", "Not Compatible"],
    "storage_expansion_compatibility": ["microSDXC", "microSDHC", "Not Compatible"],
    "memory_capacity": ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "1.5TB", "2TB", "Not Compatible"],
    "compatible_watch_case_size": ["38mm", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "47mm", "49mm", "Not Compatible"],
}


def backfill(apps, schema_editor):
    alias = schema_editor.connection.alias
    Config = apps.get_model("catalog", "DynamicDropdownConfig")
    Product = apps.get_model("catalog", "Product")
    Scope = apps.get_model("catalog", "ProductUniversalDeviceTypeScope")
    Assertion = apps.get_model("catalog", "ProductCompatibilityAssertion")
    Type = apps.get_model("devices", "DeviceType")
    Audit = apps.get_model("audit", "AuditRecord")

    def audit(kind, identifier, payload, scope=None):
        Audit.objects.using(alias).create(
            event_code="catalog.compatibility.canonical_backfill",
            event_description=json.dumps(payload, default=str), status="success",
            service_trigger_reference="catalog.0028_backfill_compatibility_references",
            company_scope_reference=scope or uuid.UUID(int=0), source_module="catalog",
            source_record_type=kind, source_record_id=identifier,
        )

    for field, values in INITIAL_VALUES.items():
        for value in values:
            rules = {"capacity_options": CAPACITIES[value]} if field == "storage_expansion_compatibility" and value in CAPACITIES else {}
            record, created = Config.objects.using(alias).get_or_create(
                field_name=field, value=value,
                defaults={"display_name": value, "status": "active", "compatibility_rules": rules},
            )
            if created:
                audit("DynamicDropdownConfig", record.id, {"field": field, "value": value, "source": "Document-approved shared options and existing device capacity/size options"})

    types = list(Type.objects.using(alias).all())
    by_id = {str(record.id): record for record in types}
    by_value = {}
    for record in types:
        for token in (record.code, record.name):
            by_value.setdefault(str(token).strip().casefold(), {})[record.id] = record

    def resolve(values):
        if not isinstance(values, list):
            return [], [str(values)]
        found, unknown = {}, []
        for value in values:
            token = str(value).strip()
            token = "phone" if token.casefold() == "smartphone" else token
            candidates = [by_id[token]] if token in by_id else list(by_value.get(token.casefold(), {}).values())
            if len(candidates) != 1:
                unknown.append(str(value))
            else:
                found[candidates[0].id] = candidates[0]
        return list(found.values()), unknown

    for config in Config.objects.using(alias).filter(field_name="product_category").iterator():
        records, unknown = resolve(config.eligible_device_types)
        before = deepcopy(config.compatibility_rules or {})
        rules = deepcopy(before)
        rules["_eligible_type_ids"] = [str(record.id) for record in records]
        if unknown:
            rules["_resolution_errors"] = unknown
        config.compatibility_rules = rules
        config.save(using=alias, update_fields=["compatibility_rules"])
        audit("DynamicDropdownConfig", config.id, {"before": before, "after": rules})

    for product in Product.objects.using(alias).filter(compatibility_mode="universal_device_type").iterator():
        records, unknown = resolve(product.compatible_device_types)
        if unknown or not records:
            audit("Product", product.id, {"review_required": "Unresolved Universal declaration", "unresolved": unknown}, product.company_scope_reference)
            continue
        for record in records:
            Scope.objects.using(alias).get_or_create(product_id=product.id, device_type_id=record.id)
        audit("Product", product.id, {"canonical_type_ids": [str(record.id) for record in records], "legacy_scope_unchanged": product.compatible_device_types}, product.company_scope_reference)

    for assertion in Assertion.objects.using(alias).filter(match_evidence={}).iterator():
        basis = assertion.compatibility_basis
        source = "feature" if basis == "feature_evidence" else "universal" if basis == "universal_device_type" else "explicit"
        evidence = {source: {"active": basis not in ("review_required", "exclusion_only") and bool(assertion.is_compatible or assertion.is_excluded or assertion.is_locked), "basis": basis, "reason": assertion.match_reason or assertion.notes}}
        Assertion.objects.using(alias).filter(pk=assertion.pk).update(match_evidence=evidence)
        product = Product.objects.using(alias).get(pk=assertion.product_id)
        audit("ProductCompatibilityAssertion", assertion.id, {"before_evidence": {}, "after_evidence": evidence}, product.company_scope_reference)


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0027_canonical_compatibility_evidence"),
        ("audit", "0001_initial"),
    ]
    # Reference/evidence backfill is deliberately irreversible; rollback must
    # not erase audit records, shared values or newly established history.
    operations = [migrations.RunPython(backfill)]
