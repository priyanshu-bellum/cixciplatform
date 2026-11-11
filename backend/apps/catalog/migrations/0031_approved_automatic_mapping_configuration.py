"""User-approved type enablement and documented legacy category corrections.

Only missing legacy matching roles are initialized. Explicit admin comparison
choices are retained. Derived rows are rebuilt by reconcile_compatibility,
using the same engine as UI/CSV/API rather than embedding a second engine here.
"""
from copy import deepcopy
import json
import uuid
from django.db import migrations


def configure(apps, schema_editor):
    alias = schema_editor.connection.alias
    Type = apps.get_model("devices", "DeviceType")
    Config = apps.get_model("catalog", "DynamicDropdownConfig")
    Audit = apps.get_model("audit", "AuditRecord")

    def audit(kind, record_id, before, after):
        Audit.objects.using(alias).create(event_code="catalog.compatibility.approved_configuration_backfill", status="success",
            event_description=json.dumps({"before": before, "after": after, "derived_rebuild": "Run reconcile_compatibility after migration."}, default=str),
            service_trigger_reference="catalog.0031_approved_automatic_mapping_configuration", company_scope_reference=uuid.UUID(int=0),
            source_module="catalog", source_record_type=kind, source_record_id=record_id)

    for kind in Type.objects.using(alias).filter(code__in=["phone", "tablet", "smartwatch"], status="active", is_active=True, auto_mapping_eligible=False):
        Type.objects.using(alias).filter(pk=kind.pk).update(auto_mapping_eligible=True)
        audit("DeviceType", kind.pk, {"auto_mapping_eligible": False}, {"auto_mapping_eligible": True})
    for config in Config.objects.using(alias).filter(field_name="product_category"):
        rules = deepcopy(config.compatibility_rules or {})
        before = {"accessory_fields": config.accessory_fields, "match_logic": config.match_logic, "compatibility_rules": deepcopy(rules)}
        fields = list(config.accessory_fields or [])
        category = config.value.strip().casefold()
        if category == "speakers" and "compatible_charging_interface" in fields:
            rule = rules.setdefault("compatible_charging_interface", {"mode": "optional"})
            rule.setdefault("comparison", "informational")
        if category == "memory" and "memory_capacity" in fields and not any(isinstance(rule, dict) and "comparison" in rule for key, rule in rules.items() if not key.startswith("_")):
            if "storage_expansion_compatibility" not in fields:
                fields.append("storage_expansion_compatibility")
            rules.setdefault("storage_expansion_compatibility", {"mode": "required"})["comparison"] = "equals"
            rules.setdefault("memory_capacity", {"mode": "optional"})["comparison"] = "capacity_lte"
            config.match_logic = "AND"
        after = {"accessory_fields": fields, "match_logic": config.match_logic, "compatibility_rules": rules}
        if before != after:
            Config.objects.using(alias).filter(pk=config.pk).update(**after)
            audit("DynamicDropdownConfig", config.pk, before, after)


class Migration(migrations.Migration):
    dependencies = [("catalog", "0030_vendor_sku_lookup_index")]
    operations = [migrations.RunPython(configure)]
