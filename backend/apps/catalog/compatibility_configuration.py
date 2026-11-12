"""Audited admin configuration using the existing dropdown and audit models."""
from copy import deepcopy
import json
import uuid

from django.db import transaction
from django.utils import timezone

from .models import DynamicDropdownConfig, Product
from .compatibility_contract import FIELD_OPERATIONS, CURRENT_DEVICE_TYPE_CODES, canonical_field, normalized_rules
from .compatibility_values import MANAGED_FIELDS, NEGATIVE, WIRELESS_POLICY_FIELD, value_catalog

CONFIGURATION_FIELDS = ("field_name", "value", "display_name", "status", "compatibility_mode", "eligible_device_types", "match_logic", "accessory_fields", "compatibility_rules")


def configuration_snapshot(instance):
    return {field: deepcopy(getattr(instance, field)) for field in CONFIGURATION_FIELDS} if instance else None


def audit_configuration(instance, before, actor, *, deleted=False):
    from apps.audit.models import AuditRecord
    company = getattr(getattr(actor, "entity", None), "company_id", None)
    AuditRecord.objects.create(
        event_code="catalog.compatibility.configuration_deleted" if deleted else "catalog.compatibility.configuration_changed",
        event_description=json.dumps({"before": before, "after": None if deleted else configuration_snapshot(instance)}, default=str),
        status="success", actor_reference=actor.id, company_scope_reference=company or uuid.UUID(int=0),
        source_module="catalog", source_record_type="DynamicDropdownConfig", source_record_id=instance.id,
    )


def _link_capacity_options(instance, actor):
    if instance.field_name == "storage_expansion_compatibility" and instance.value != NEGATIVE:
        for capacity in instance.compatibility_rules.get("capacity_options", []):
            _, created = DynamicDropdownConfig.objects.get_or_create(
                field_name="memory_capacity", value=capacity,
                defaults={"display_name": capacity, "status": "active"},
            )
            if created:
                option = DynamicDropdownConfig.objects.get(field_name="memory_capacity", value=capacity)
                audit_configuration(option, None, actor)
    if instance.field_name == "memory_capacity":
        expansion = instance.compatibility_rules.get("storage_expansion")
        if expansion:
            parent = DynamicDropdownConfig.objects.select_for_update().get(field_name="storage_expansion_compatibility", value=expansion, status="active")
            before = configuration_snapshot(parent)
            rules = deepcopy(parent.compatibility_rules)
            capacities = rules.setdefault("capacity_options", [])
            if instance.value not in capacities:
                capacities.append(instance.value)
                parent.compatibility_rules = rules
                parent.save(update_fields=["compatibility_rules"])
                audit_configuration(parent, before, actor)


@transaction.atomic
def save_configuration(serializer, actor):
    previous = configuration_snapshot(serializer.instance)
    instance = serializer.save()
    _link_capacity_options(instance, actor)
    audit_configuration(instance, previous, actor)
    # Adding a value alone does not generate capability truth or matches.
    # Category/rule changes and retirement affect existing calculations.
    if instance.field_name == "product_category":
        if previous and all(previous[field] == getattr(instance, field) for field in ("status", "compatibility_mode", "eligible_device_types", "match_logic", "accessory_fields", "compatibility_rules")):
            return instance
        products = Product.objects.filter(product_category=instance.value)
    elif instance.field_name == WIRELESS_POLICY_FIELD or (previous and instance.field_name in MANAGED_FIELDS):
        if previous and previous["status"] == instance.status and previous["compatibility_rules"] == instance.compatibility_rules:
            return instance
        field = "wireless_charging_compatibility" if instance.field_name == WIRELESS_POLICY_FIELD else instance.field_name
        categories = []
        for config in DynamicDropdownConfig.objects.filter(field_name="product_category"):
            rules = normalized_rules(config.compatibility_rules or {})
            if field in {canonical_field(value) for value in config.accessory_fields or []} and rules.get(field, {}).get("comparison") != "informational":
                categories.append(config.value)
        products = Product.objects.filter(product_category__in=categories)
    else:
        return instance
    from .compatibility_engine import reconcile_product_compatibility
    affected = False
    for product in products.order_by("pk").iterator():
        reconcile_product_compatibility(product, actor_id=actor.id, change_source="Admin Configuration", notify=False)
        affected = True
    if affected:
        from .services import invalidate_buyer_projection_cache
        invalidate_buyer_projection_cache('admin_configuration')
    return instance


def public_configuration_options():
    from apps.devices.models import DeviceType
    result = value_catalog()
    result["device_types"] = list(DeviceType.objects.filter(
        code__in=CURRENT_DEVICE_TYPE_CODES, status="active", is_active=True,
    ).values("id", "name", "code"))
    result["field_operations"] = FIELD_OPERATIONS
    from .compatibility_commands import EXCLUSION_REASONS
    result["exclusion_reasons"] = sorted(EXCLUSION_REASONS)
    return result
