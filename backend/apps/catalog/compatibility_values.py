"""Shared approved values for device, accessory, CSV and API compatibility."""
from copy import deepcopy
import re

from django.core.exceptions import ValidationError

from .compatibility_contract import COMPATIBILITY_FIELDS, canonical_field, capacity_in_gb, normalized_rules

NEGATIVE = "Not Compatible"
CAPACITY_OPTIONS = {
    "microSDXC": ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
    "microSDHC": ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "1.5TB"],
}
DEFAULT_VALUES = {
    "compatible_charging_interface": ["Type-C", "Lightning", "Micro-USB", NEGATIVE],
    "headphone_jack_compatibility": ["3.5mm", "Type-C", "Lightning", NEGATIVE],
    "wireless_charging_compatibility": ["MagSafe", "Qi", "Qi2", NEGATIVE],
    "storage_expansion_compatibility": ["microSDXC", "microSDHC", NEGATIVE],
    "memory_capacity": list(dict.fromkeys(sum(CAPACITY_OPTIONS.values(), []) + [NEGATIVE])),
    "compatible_watch_case_size": ["38mm", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "47mm", "49mm", NEGATIVE],
}
MANAGED_FIELDS = tuple(DEFAULT_VALUES)
WIRELESS_POLICY_FIELD = "wireless_combination_policy"
VALUE_ALIASES = {"not_compatible": NEGATIVE, "none": NEGATIVE, "n/a": NEGATIVE, "micro usb": "Micro-USB", "microusb": "Micro-USB", "3.5 mm": "3.5mm"}


def value_catalog():
    from .models import DynamicDropdownConfig
    result = {
        field: [{"id": None, "value": value, "label": value} for value in values]
        for field, values in DEFAULT_VALUES.items()
    }
    result["bluetooth_compatibility"] = [{"id": None, "value": value, "label": value} for value in ("Yes", "No")]
    capacities = deepcopy(CAPACITY_OPTIONS)
    policy = {"configured": False, "allowed_combinations": [], "prohibited_combinations": [["Qi", "MagSafe"], ["Qi", "Qi2"]]}
    records = list(DynamicDropdownConfig.objects.filter(field_name__in=list(MANAGED_FIELDS) + ["maximum_supported_storage", WIRELESS_POLICY_FIELD]))
    for record in records:
        if record.field_name == WIRELESS_POLICY_FIELD:
            if record.status == "active":
                policy = {"configured": True, "id": str(record.id), **record.compatibility_rules}
            continue
        field = canonical_field(record.field_name)
        result[field] = [option for option in result[field] if option["value"].casefold() != record.value.casefold()]
        if record.status == "active":
            result[field].append({"id": str(record.id), "value": record.value, "label": record.display_name or record.value})
        if field == "storage_expansion_compatibility" and record.value != NEGATIVE:
            capacities[record.value] = record.compatibility_rules.get("capacity_options", []) if record.status == "active" else []
    active_capacities = {option["value"] for option in result["memory_capacity"]}
    capacities = {key: [value for value in values if value in active_capacities] for key, values in capacities.items()}
    return {"fields": result, "storage_capacity_options": capacities, "wireless_policy": policy}


def normalized_value(field, value, catalog=None):
    catalog = catalog or value_catalog()
    field = canonical_field(field)
    if value is None or value == "":
        return ""
    if not isinstance(value, str):
        raise ValidationError({field: "Use an approved controlled value."})
    value = value.strip()
    value = VALUE_ALIASES.get(value.casefold(), value)
    options = catalog["fields"].get(field, [])
    matches = [option["value"] for option in options if value.casefold() in (option["value"].casefold(), str(option["id"]).casefold())]
    if not matches and field == "memory_capacity" and capacity_in_gb(value) is not None:
        matches = [option["value"] for option in options if capacity_in_gb(option["value"]) == capacity_in_gb(value)]
    if len(set(matches)) != 1:
        raise ValidationError({field: f"'{value}' is not an active approved value for this field."})
    return matches[0]


def normalized_wireless(value, catalog=None):
    catalog = catalog or value_catalog()
    if value in (None, "", []):
        return ""
    if isinstance(value, str):
        values = re.split(r"[+,;]", value)
    elif isinstance(value, list):
        values = value
    else:
        raise ValidationError({"wireless_charging_compatibility": "Supply approved wireless values."})
    values = list(dict.fromkeys(normalized_value("wireless_charging_compatibility", token, catalog) for token in values if str(token).strip()))
    if NEGATIVE in values and len(values) > 1:
        raise ValidationError({"wireless_charging_compatibility": "Not Compatible cannot be combined with another value."})
    selected = set(values)
    policy = catalog["wireless_policy"]
    if any(set(combination) <= selected for combination in policy.get("prohibited_combinations", [])):
        raise ValidationError({"wireless_charging_compatibility": "This wireless combination is prohibited by the saved rules."})
    allowed = policy.get("allowed_combinations", [])
    if len(values) > 1 and allowed and selected not in [set(combination) for combination in allowed]:
        raise ValidationError({"wireless_charging_compatibility": "This combination is not in the approved allowed list."})
    return "+".join(values)


def validate_wireless_policy(rules, catalog=None):
    if not isinstance(rules, dict) or set(rules) - {"allowed_combinations", "prohibited_combinations"}:
        raise ValidationError({"compatibility_rules": "Set allowed_combinations and/or prohibited_combinations."})
    catalog = catalog or value_catalog()
    result = {}
    for key in ("allowed_combinations", "prohibited_combinations"):
        combinations = rules.get(key, [])
        if not isinstance(combinations, list):
            raise ValidationError({"compatibility_rules": f"{key} must be an array of arrays."})
        normalized = []
        for combination in combinations:
            if not isinstance(combination, list) or len(combination) < 2:
                raise ValidationError({"compatibility_rules": "Each combination needs at least two distinct approved values."})
            values = sorted(set(normalized_value("wireless_charging_compatibility", item, catalog) for item in combination))
            if len(values) < 2 or NEGATIVE in values:
                raise ValidationError({"compatibility_rules": "Not Compatible is always exclusive; configure positive combinations only."})
            if values not in normalized:
                normalized.append(values)
        result[key] = normalized
    for allowed in result["allowed_combinations"]:
        if any(set(blocked) <= set(allowed) for blocked in result["prohibited_combinations"]):
            raise ValidationError({"compatibility_rules": "An allowed combination cannot contain a prohibited combination."})
    return result


def validate_compatibility_values(attrs, *, instance=None, rules=None, assigned_fields=None, device_type=None, catalog=None):
    """Required governs entry, not a mandatory positive compatibility claim."""
    catalog = catalog or value_catalog()
    rules = normalized_rules(rules or {})
    device = device_type is not None

    def field_key(field):
        return "maximum_supported_storage" if device and field == "memory_capacity" else field

    values = {}
    for field in COMPATIBILITY_FIELDS:
        key = field_key(field)
        values[field] = attrs.get(key, getattr(instance, key, "") if instance else "")
    # Tablet evidence is forbidden even if a rule hides or defaults the field.
    if device and device_type.code == "tablet":
        wire = normalized_wireless(values["wireless_charging_compatibility"], catalog)
        if wire not in ("", NEGATIVE):
            raise ValidationError({"wireless_charging_compatibility": "Tablets cannot supply wireless charging evidence."})
    for field in COMPATIBILITY_FIELDS:
        key = field_key(field)
        rule = rules.get(field, {})
        default_mode = "optional" if device or (assigned_fields is not None and field in assigned_fields) else "hidden"
        mode = rule.get("mode", default_mode)
        raw = values[field]
        if mode == "hidden":
            values[field] = "No" if field == "bluetooth_compatibility" else NEGATIVE
            continue
        if raw in (None, "") and mode == "defaulted":
            raw = rule.get("default_value", rule.get("default", ""))
        if raw in (None, "") and mode == "required":
            raise ValidationError({key: "This configured field requires a declared answer."})
        if mode == "conditional":
            parent = canonical_field(rule.get("condition_field"))
            parent_value = str(values.get(parent, "") or "").strip().casefold()
            if parent_value in {str(value).strip().casefold() for value in rule.get("condition_values", [])} and raw in (None, ""):
                raise ValidationError({key: "This field is required by the saved condition."})
        values[field] = normalized_wireless(raw, catalog) if field == "wireless_charging_compatibility" else normalized_value(field, raw, catalog)
    if device and device_type.code == "tablet":
        values["wireless_charging_compatibility"] = NEGATIVE
    if device and device_type.code != "smartwatch" and values["compatible_watch_case_size"] not in ("", NEGATIVE):
        raise ValidationError({"compatible_watch_case_size": "Watch case size is applicable only to Smartwatch devices."})
    expansion = values["storage_expansion_compatibility"]
    capacity = values["memory_capacity"]
    if expansion not in ("", NEGATIVE):
        allowed = catalog["storage_capacity_options"].get(expansion, [])
        if not allowed:
            raise ValidationError({"storage_expansion_compatibility": "This storage type needs approved linked capacity options."})
        if capacity not in allowed:
            raise ValidationError({field_key("memory_capacity"): "Select a capacity linked to the chosen Storage Expansion value."})
    elif capacity not in ("", NEGATIVE):
        raise ValidationError({"storage_expansion_compatibility": "A positive capacity requires a declared storage expansion type."})
    for field, value in values.items():
        attrs[field_key(field)] = value
    return attrs


def validate_managed_configuration(attrs, instance=None):
    from .models import DynamicDropdownConfig
    field = canonical_field(attrs.get("field_name", instance.field_name if instance else ""))
    value = attrs.get("value", instance.value if instance else "")
    if not isinstance(value, str) or not value.strip():
        raise ValidationError({"value": "Enter a nonblank value."})
    value = value.strip()
    if instance and field in MANAGED_FIELDS and (field != canonical_field(instance.field_name) or value != instance.value):
        raise ValidationError({"value": "Retire a controlled value instead of changing its identity; its display label may be edited."})
    duplicates = DynamicDropdownConfig.objects.filter(field_name=field, value__iexact=value)
    if instance:
        duplicates = duplicates.exclude(pk=instance.pk)
    if duplicates.exists():
        raise ValidationError({"value": "This value already exists in the same controlled list."})
    rules = deepcopy(attrs.get("compatibility_rules", instance.compatibility_rules if instance else {}))
    if not isinstance(rules, dict):
        raise ValidationError({"compatibility_rules": "Rules must be a JSON object."})
    if field == WIRELESS_POLICY_FIELD:
        if value != "global":
            raise ValidationError({"value": "Use the single global wireless policy."})
        rules = validate_wireless_policy(rules)
    elif field in MANAGED_FIELDS:
        if len(value) > 50 or value.casefold() in ("nfc", "ant+") or (field == "compatible_charging_interface" and value.casefold() == "proprietary"):
            raise ValidationError({"value": "This value is not permitted for compatibility evidence."})
        if field == "memory_capacity" and value != NEGATIVE:
            if capacity_in_gb(value) is None or not re.fullmatch(r"\d+(?:\.\d+)?\s*(MB|GB|TB)", value, re.I):
                raise ValidationError({"value": "Enter a positive capacity with MB, GB or TB units."})
            value = re.sub(r"\s+", "", value).upper()
            parent = rules.get("storage_expansion")
            if not instance and not parent:
                raise ValidationError({"compatibility_rules": "Choose the Storage Expansion value to which this capacity belongs."})
            if parent:
                expansion = normalized_value("storage_expansion_compatibility", parent)
                if expansion in ("", NEGATIVE):
                    raise ValidationError({"compatibility_rules": "Choose a storage-capable expansion value."})
                rules["storage_expansion"] = expansion
        if field == "storage_expansion_compatibility" and value != NEGATIVE:
            capacities = rules.get("capacity_options")
            if not isinstance(capacities, list) or not capacities:
                raise ValidationError({"compatibility_rules": "At least one linked capacity option is required before saving Storage Expansion."})
            normalized = []
            for capacity in capacities:
                if not isinstance(capacity, str) or capacity_in_gb(capacity) is None or not re.fullmatch(r"\d+(?:\.\d+)?\s*(MB|GB|TB)", capacity, re.I):
                    raise ValidationError({"compatibility_rules": "All linked capacities need positive MB, GB or TB values."})
                capacity = re.sub(r"\s+", "", capacity).upper()
                if capacity not in normalized:
                    normalized.append(capacity)
            rules["capacity_options"] = normalized
    duplicates = DynamicDropdownConfig.objects.filter(field_name=field, value__iexact=value)
    if instance:
        duplicates = duplicates.exclude(pk=instance.pk)
    if duplicates.exists():
        raise ValidationError({"value": "This normalized value already exists in the same controlled list."})
    if field == "storage_expansion_compatibility":
        retired = DynamicDropdownConfig.objects.filter(field_name="memory_capacity", value__in=rules.get("capacity_options", [])).exclude(status="active")
        if retired.exists():
            raise ValidationError({"compatibility_rules": "Reactivate retired capacity options explicitly before linking them."})
    attrs.update(field_name=field, value=value, compatibility_rules=rules)
    return attrs
