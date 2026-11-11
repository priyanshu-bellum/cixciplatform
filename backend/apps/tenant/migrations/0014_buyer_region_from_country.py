"""Resolve Buyer countries recorded at onboarding without per-Buyer assignment.

This registers country identities only. It grants no Vendor coverage,
relationship, fee approval or historical transaction change.
"""
import json
from django.db import migrations, models


def backfill(apps, schema_editor):
    from apps.tenant.country_regions import country_region, normalize_country_code
    alias = schema_editor.connection.alias
    Entity = apps.get_model("tenant", "CompanyEntity")
    Audit = apps.get_model("audit", "AuditRecord")
    Projection = apps.get_model("catalog", "BuyerScopedCompatibilityProjection")
    for entity in Entity.objects.using(alias).filter(company__company_type="buyer").iterator():
        region = country_region(entity.country_code, registry=apps, using=alias, company_id=entity.company_id)
        target = region.id if region else None
        country = normalize_country_code(entity.country_code) or entity.country_code
        if entity.operating_region_id == target and country == entity.country_code:
            continue
        before = {"operating_region": str(entity.operating_region_id or ""), "country_code": entity.country_code}
        Entity.objects.using(alias).filter(pk=entity.pk).update(operating_region_id=target, country_code=country)
        Audit.objects.using(alias).create(event_code="tenant.entity.country_region_backfill", status="success",
            event_description=json.dumps({"before": before, "after_region": str(target or ""), "country_code": country}),
            service_trigger_reference="tenant.0014_buyer_region_from_country", company_scope_reference=entity.company_id,
            source_module="tenant", source_record_type="CompanyEntity", source_record_id=entity.id)
        Projection.objects.using(alias).filter(company_scope_reference=entity.company_id, buyer_entity_reference=entity.id).update(status="review_required", review_required_reason="buyer_country_region_reconciled")


class Migration(migrations.Migration):
    dependencies = [("tenant", "0013_explicit_operating_regions"), ("catalog", "0031_approved_automatic_mapping_configuration")]
    operations = [
        migrations.AlterField(model_name="companyentity", name="operating_region", field=models.ForeignKey(blank=True,
            help_text="Derived from this entity's onboarding country; never from state, delivery address or parent visibility.",
            null=True, on_delete=models.PROTECT, related_name="buyer_entities", to="tenant.operatingregion")),
        migrations.RunPython(backfill),
    ]
