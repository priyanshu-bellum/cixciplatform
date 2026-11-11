"""Shared compatibility configuration contract; no tenant data is changed here."""
from copy import deepcopy
from decimal import Decimal, InvalidOperation
import re
import uuid

from django.core.exceptions import ValidationError


CURRENT_DEVICE_TYPE_CODES = ("phone", "tablet", "smartwatch")
MODE_ALIASES = {"explicit": "device_specific"}
CATEGORY_MODES = ("device_specific", "universal", "hybrid", "feature_based")
ENTRY_MODES = ("required", "optional", "hidden", "defaulted", "conditional")
FIELD_ALIASES = {
    "charging_interface": "compatible_charging_interface",
    "storage_expansion_type": "storage_expansion_compatibility",
    "max_supported_storage": "memory_capacity",
    "maximum_supported_storage": "memory_capacity",
    "headphone_jack_type": "headphone_jack_compatibility",
    "bluetooth_supported": "bluetooth_compatibility",
    "wireless_charging_type": "wireless_charging_compatibility",
    "watch_case_size": "compatible_watch_case_size",
}
FIELD_OPERATIONS = {
    "compatible_charging_interface": "equals",
    "storage_expansion_compatibility": "equals",
    "memory_capacity": "capacity_lte",
    "headphone_jack_compatibility": "equals",
    "bluetooth_compatibility": "is_true",
    "wireless_charging_compatibility": "intersects",
    "compatible_watch_case_size": "equals",
}
COMPATIBILITY_FIELDS = tuple(FIELD_OPERATIONS)


def category_mode(value):
    value = str(value or "feature_based").strip().lower()
    return MODE_ALIASES.get(value, value)


def canonical_field(value):
    return FIELD_ALIASES.get(value, value)


def capacity_in_gb(value):
    """Decimal arithmetic rejects partial, negative, NaN and infinite inputs."""
    match = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*(MB|GB|TB)?\s*", str(value or ""), re.I)
    if not match:
        return None
    try:
        number = Decimal(match.group(1))
    except InvalidOperation:
        return None
    if not number.is_finite() or number <= 0:
        return None
    return number * {"MB": Decimal(1) / 1024, "GB": Decimal(1), "TB": Decimal(1024)}[str(match.group(2) or "GB").upper()]


def resolve_device_types(values, *, field="compatible_device_types", eligible=True):
    """Resolve IDs or approved legacy names/codes; never create vendor taxonomy."""
    from apps.devices.models import DeviceType
    if not isinstance(values, list):
        raise ValidationError({field: "Supply a list of canonical Device Type IDs or approved type values."})
    records = list(DeviceType.objects.all())
    by_id = {str(record.id): record for record in records}
    by_value = {}
    for record in records:
        for value in (record.code, record.name):
            by_value.setdefault(str(value).strip().casefold(), []).append(record)
    result, invalid = [], []
    for value in values:
        if not isinstance(value, (str, uuid.UUID)) or not str(value).strip():
            invalid.append(str(value))
            continue
        token = str(value).strip()
        # Smartphone -> Phone is explicitly approved by the newer requirements.
        if token.casefold() == "smartphone":
            token = "phone"
        if token in by_id:
            candidates = [by_id[token]]
        else:
            candidates = list({str(r.id): r for r in by_value.get(token.casefold(), [])}.values())
        if len(candidates) != 1:
            invalid.append(str(value))
            continue
        record = candidates[0]
        if eligible and (record.code not in CURRENT_DEVICE_TYPE_CODES or record.status != "active" or not record.is_active):
            invalid.append(str(value))
            continue
        if record.id not in {r.id for r in result}:
            result.append(record)
    if invalid:
        raise ValidationError({field: "Unknown, ambiguous, inactive or ineligible Device Types: " + ", ".join(invalid)})
    return result


def configured_type_ids(config):
    """ID metadata is authoritative; codes are a legacy input/output adapter."""
    references = (config.compatibility_rules or {}).get("_eligible_type_ids")
    if references is not None:
        return {str(value) for value in references}
    signature = repr(config.eligible_device_types)
    cached = getattr(config, "_resolved_compatibility_types", None)
    if cached is not None and cached[0] == signature:
        return cached[1]
    try:
        result = {str(record.id) for record in resolve_device_types(config.eligible_device_types or [], eligible=False)}
    except ValidationError:
        result = set()
    config._resolved_compatibility_types = (signature, result)
    return result


def normalized_rules(rules):
    if not isinstance(rules, dict):
        raise ValidationError({"compatibility_rules": "Rules must be a JSON object."})
    return {canonical_field(key): deepcopy(value) for key, value in rules.items() if not key.startswith("_")}


def validate_category_configuration(attrs, instance=None):
    def current(key, default=None):
        return attrs[key] if key in attrs else getattr(instance, key, default)

    mode = category_mode(current("compatibility_mode", "feature_based"))
    if mode not in CATEGORY_MODES:
        raise ValidationError({"compatibility_mode": "Select Device Specific, Universal, Hybrid or the existing Feature Based method."})
    logic = {"match_any": "OR", "match_all": "AND"}.get(current("match_logic", "OR"), current("match_logic", "OR"))
    if logic not in ("OR", "AND"):
        raise ValidationError({"match_logic": "Match logic must be OR (Match Any) or AND (Match All)."})
    status = current("status", "setup_required")
    if status not in ("active", "inactive", "setup_required", "retired"):
        raise ValidationError({"status": "Invalid configuration status."})
    types = resolve_device_types(current("eligible_device_types", []) or [], field="eligible_device_types", eligible=status == "active")
    if status == "active" and not types:
        raise ValidationError({"eligible_device_types": "An active category needs at least one approved eligible type."})
    fields = current("accessory_fields", [])
    if not isinstance(fields, list) or any(not isinstance(field, str) for field in fields):
        raise ValidationError({"accessory_fields": "Supply a list of existing compatibility field names."})
    fields = list(dict.fromkeys(canonical_field(field) for field in fields))
    unknown = set(fields) - set(COMPATIBILITY_FIELDS)
    if unknown:
        raise ValidationError({"accessory_fields": "Unknown fields: " + ", ".join(sorted(unknown))})
    raw_rules = current("compatibility_rules", {})
    if not isinstance(raw_rules, dict):
        raise ValidationError({"compatibility_rules": "Supply a JSON object of field rules."})
    rules = normalized_rules(raw_rules)
    if set(rules) - set(fields):
        raise ValidationError({"compatibility_rules": "Rules may refer only to the category's assigned fields."})
    old_fields = {canonical_field(field) for field in (instance.accessory_fields or [])} if instance else set()
    for field in fields:
        rule = rules.get(field)
        if not isinstance(rule, dict) or rule.get("mode") not in ENTRY_MODES:
            raise ValidationError({"compatibility_rules": f"Configure a valid data-entry mode for {field}."})
        comparison = rule.get("comparison")
        if comparison is None and field in old_fields:
            # Preserve an existing approved field's engine operation. Newly
            # assigned fields require an explicit admin matching decision.
            comparison = FIELD_OPERATIONS[field]
            rule["comparison"] = comparison
        if comparison not in (FIELD_OPERATIONS[field], "informational"):
            raise ValidationError({"compatibility_rules": f"Choose the matching operation or Informational for {field}."})
        if rule["mode"] == "defaulted" and not str(rule.get("default_value", rule.get("default", ""))).strip():
            raise ValidationError({"compatibility_rules": f"Set a default value for {field}."})
        if rule["mode"] == "conditional":
            parent = canonical_field(rule.get("condition_field"))
            values = rule.get("condition_values")
            if parent not in fields or parent == field or not isinstance(values, list) or not values:
                raise ValidationError({"compatibility_rules": f"Configure an assigned condition field and values for {field}."})
            rule["condition_field"] = parent
            from .compatibility_values import normalized_value, normalized_wireless
            rule["condition_values"] = [normalized_wireless(value) if parent == "wireless_charging_compatibility" else normalized_value(parent, value) for value in values]
        from .compatibility_values import normalized_value, normalized_wireless
        if rule["mode"] == "defaulted":
            default = rule.get("default_value", rule.get("default"))
            rule["default_value"] = normalized_wireless(default) if field == "wireless_charging_compatibility" else normalized_value(field, default)
    matching = [field for field in fields if rules[field].get("mode") != "hidden" and rules[field].get("comparison") != "informational"]
    if "memory_capacity" in matching and ("storage_expansion_compatibility" not in matching or logic != "AND"):
        raise ValidationError({"match_logic": "Memory matching requires Storage Expansion and Capacity with Match All."})
    rules["_eligible_type_ids"] = [str(record.id) for record in types]
    attrs.update(compatibility_mode=mode, match_logic=logic, eligible_device_types=[record.code for record in types], accessory_fields=fields, compatibility_rules=rules, status=status)
    return attrs


def product_universal_types(product):
    """Read the persisted canonical scope; legacy fallback is read-only."""
    if product.compatibility_mode != "universal_device_type":
        return []
    if product.pk:
        rows = list(product.universal_type_scopes.filter(is_active=True).select_related("device_type"))
        if rows:
            return [row.device_type for row in rows]
    try:
        return resolve_device_types(product.compatible_device_types or [])
    except ValidationError:
        return []


def validate_product_scope(product, original=None):
    from .models import DynamicDropdownConfig
    values = product.compatible_device_types
    if product.compatibility_mode not in ("direct_device", "universal_device_type"):
        raise ValidationError({"compatibility_mode": "Select Direct Device or Universal Device Type."})
    if not isinstance(values, list):
        raise ValidationError({"compatible_device_types": "Supply a list of controlled Device Type values."})
    config = DynamicDropdownConfig.objects.filter(field_name="product_category", value=product.product_category).first()
    if config:
        universal_category = category_mode(config.compatibility_mode) == "universal"
        if universal_category != (product.compatibility_mode == "universal_device_type"):
            raise ValidationError({"compatibility_mode": "The product method must agree with its category: Universal needs a declared type scope; other category methods use Direct Device storage."})
    if product.compatibility_mode == "direct_device":
        if values:
            raise ValidationError({"compatible_device_types": "Direct Device mode cannot contain a Universal type scope."})
        return []
    if not values:
        raise ValidationError({"compatible_device_types": "Universal requires at least one approved Device Type."})
    # An unrelated edit must not reinterpret a persisted ID-based declaration
    # using a renamed display label or an old mirrored type code.
    if original and original.compatibility_mode == product.compatibility_mode and original.compatible_device_types == values:
        existing = list(original.universal_type_scopes.filter(is_active=True).select_related("device_type"))
        if existing:
            return [row.device_type for row in existing]
    return resolve_device_types(values)


def eligible_devices():
    """Current buyer/readiness eligibility; future preparation is separate."""
    from django.db.models import Q
    from django.utils import timezone
    from apps.devices.models import Device
    return Device.objects.filter(
        device_type__code__in=CURRENT_DEVICE_TYPE_CODES,
        device_type__status="active", device_type__is_active=True,
        lifecycle_status="available",
    ).filter(Q(launch_date__lte=timezone.localdate()) | Q(launch_date__isnull=True))


def entity_portfolio_device_ids(company_id, entity_id):
    """Consume Device Catalog's existing entity-shared portfolio authority."""
    from apps.devices.services import get_company_portfolio_device_ids
    from apps.tenant.models import CompanyEntity
    if not company_id or not entity_id or not CompanyEntity.objects.filter(id=entity_id, company_id=company_id, status="active").exists():
        return set()
    ids = get_company_portfolio_device_ids(company_id, entity_id)
    return set(eligible_devices().filter(id__in=ids).values_list("id", flat=True))


def buyer_portfolio_device_ids(user):
    """None means a non-buyer caller; an empty set is a real zero-match scope."""
    entity = getattr(user, "entity", None)
    if not entity or entity.company.company_type != "buyer" or getattr(user, "is_cixci_admin", False):
        return None
    return entity_portfolio_device_ids(entity.company_id, entity.id)


def sync_product_scope(product, types, actor_id=None):
    """Retain retired rule rows and audit every effective ID-scope change."""
    from apps.catalog.models import ProductUniversalDeviceTypeScope
    from apps.audit.models import AuditRecord
    rows = {row.device_type_id: row for row in ProductUniversalDeviceTypeScope.objects.filter(product=product)}
    before = {str(row.device_type_id) for row in rows.values() if row.is_active}
    after = {str(record.id) for record in types}
    if before == after:
        return
    for record in types:
        row = rows.get(record.id)
        if row is None:
            ProductUniversalDeviceTypeScope.objects.create(product=product, device_type=record, created_by=actor_id, updated_by=actor_id)
        elif not row.is_active:
            row.is_active, row.updated_by = True, actor_id
            row.save(update_fields=["is_active", "updated_by", "updated_at"])
    for row in rows.values():
        if row.is_active and str(row.device_type_id) not in after:
            row.is_active, row.updated_by = False, actor_id
            row.save(update_fields=["is_active", "updated_by", "updated_at"])
    import json
    AuditRecord.objects.create(
        event_code="catalog.compatibility.universal_scope_changed",
        event_description=json.dumps({"before_type_ids": sorted(before), "after_type_ids": sorted(after), "sku": product.sku}),
        status="success", actor_reference=actor_id, service_trigger_reference="Product compatibility save",
        company_scope_reference=product.company_scope_reference or product.vendor_company_reference or uuid.UUID(int=0),
        source_module="catalog", source_record_type="Product", source_record_id=product.id,
    )
