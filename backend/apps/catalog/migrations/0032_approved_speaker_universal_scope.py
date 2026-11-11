"""Apply the user's explicit Speakers method and BAS declaration decision.

This is a one-time audited configuration/data correction, not an engine rule.
Other offers receive no invented Universal scope and remain review-required.
Rebuild derived results with the shared reconciliation command after migration.
"""
from copy import deepcopy
import json
import uuid
from django.db import migrations

APPROVED_PRODUCT = uuid.UUID("81fe757c-827b-5a2e-9e79-c09860c93940")
APPROVED_SUPPLIER = uuid.UUID("4f5f93da-7d4c-5d5b-b136-e9333e3726cc")
APPROVED_TYPES = ("phone", "tablet", "smartwatch")


def configure(apps, schema_editor):
    alias = schema_editor.connection.alias
    Config = apps.get_model("catalog", "DynamicDropdownConfig")
    Product = apps.get_model("catalog", "Product")
    Type = apps.get_model("devices", "DeviceType")
    Scope = apps.get_model("catalog", "ProductUniversalDeviceTypeScope")
    Audit = apps.get_model("audit", "AuditRecord")
    types = list(Type.objects.using(alias).filter(code__in=APPROVED_TYPES, status="active", is_active=True))
    complete = {kind.code for kind in types} == set(APPROVED_TYPES)

    def audit(kind, record_id, company, before, after):
        Audit.objects.using(alias).create(event_code="catalog.compatibility.approved_speaker_universal", status="success",
            event_description=json.dumps({"before": before, "after": after, "basis": "Explicit user decision; no capability or title inference", "derived_rebuild": "reconcile_compatibility"}, default=str),
            service_trigger_reference="catalog.0032_approved_speaker_universal_scope", company_scope_reference=company or uuid.UUID(int=0),
            source_module="catalog", source_record_type=kind, source_record_id=record_id)

    config = Config.objects.using(alias).filter(field_name="product_category", value="Speakers").first()
    if config:
        rules = deepcopy(config.compatibility_rules or {})
        before = {"mode": config.compatibility_mode, "eligible_types": config.eligible_device_types, "rules": deepcopy(rules), "status": config.status}
        rules["_eligible_type_ids"] = [str(kind.id) for kind in types] if complete else []
        for field in config.accessory_fields or []:
            if not isinstance(rules.get(field), dict):
                rules[field] = {"mode": "optional"}
            rules[field]["comparison"] = "informational"
        Config.objects.using(alias).filter(pk=config.pk).update(compatibility_mode="universal", eligible_device_types=list(APPROVED_TYPES) if complete else [],
            compatibility_rules=rules, status="active" if complete else "setup_required")
        audit("DynamicDropdownConfig", config.id, None, before, {"mode": "universal", "type_ids": rules["_eligible_type_ids"], "status": "active" if complete else "setup_required"})

    for product in Product.objects.using(alias).filter(product_category="Speakers", compatibility_mode="direct_device").iterator():
        if product.id == APPROVED_PRODUCT and product.vendor_company_reference == APPROVED_SUPPLIER and complete:
            before = {"mode": product.compatibility_mode, "types": product.compatible_device_types}
            Product.objects.using(alias).filter(pk=product.pk).update(compatibility_mode="universal_device_type", compatible_device_types=list(APPROVED_TYPES), compatibility_status="incomplete")
            for kind in types:
                Scope.objects.using(alias).update_or_create(product_id=product.id, device_type_id=kind.id, defaults={"is_active": True})
            audit("Product", product.id, product.company_scope_reference, before, {"mode": "universal_device_type", "type_ids": [str(kind.id) for kind in types]})
        else:
            Product.objects.using(alias).filter(pk=product.pk).update(compatibility_status="incomplete")
            audit("Product", product.id, product.company_scope_reference, {"mode": product.compatibility_mode}, {"review_required": "Declare an approved Universal scope; no scope was inferred."})


class Migration(migrations.Migration):
    dependencies = [("catalog", "0031_approved_automatic_mapping_configuration"), ("tenant", "0014_buyer_region_from_country")]
    operations = [migrations.RunPython(configure)]
