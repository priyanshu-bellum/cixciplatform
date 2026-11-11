"""CSV compatibility adapter. Explicit declarations only; no name-based guesses."""
import re
import uuid

from django.core.exceptions import ValidationError
from django.db.models import Q

from apps.devices.models import Device
from .compatibility_contract import COMPATIBILITY_FIELDS, category_mode, resolve_device_types
from .compatibility_values import normalized_value, normalized_wireless, validate_compatibility_values, value_catalog

ALIASES = {
    "bluetooth_compatibility": ("bluetooth",),
    "headphone_jack_compatibility": ("headphonejack",),
    "compatible_charging_interface": ("charginginterface",),
    "wireless_charging_compatibility": ("wirelesscharging",),
    "storage_expansion_compatibility": ("storageexpansion",),
    "memory_capacity": (), "compatible_watch_case_size": ("watchcasesize",),
}


def parse_compatibility_row(row, config):
    def key(value):
        return re.sub(r"[^a-z0-9]", "", value.casefold())

    values = {}
    for field in COMPATIBILITY_FIELDS:
        for alias in (key(field), *ALIASES[field]):
            if alias in row:
                values[field] = str(row[alias] or "").strip()
                break
    types_raw = next((row.get(name) for name in ("universaldevicetypes", "universaldevicetype", "devicetypes", "universalcompatibility", "universaldevices") if row.get(name)), "")
    type_values = [part.strip() for part in re.split(r"[;,]", str(types_raw)) if part.strip()]
    declaration = str(row.get("devicecompatibility") or row.get("compatibility") or row.get("compatibilitynames") or "").strip()
    parts = [part.strip() for part in re.split(r"[;,]", declaration) if part.strip()]
    devices = []
    catalog = value_catalog()
    mode = category_mode(config.compatibility_mode) if config else "device_specific"
    if parts and parts[0].casefold() == "universal":
        if devices or type_values:
            raise ValidationError("Use one Universal declaration, without individual models or another type declaration.")
        type_values, parts = parts[1:], []
        if not type_values:
            raise ValidationError("Universal requires at least one approved Device Type.")
    for part in parts:
        try:
            identifier = uuid.UUID(part)
        except ValueError:
            identifier = None
        matches = Device.objects.filter(Q(pk=identifier) if identifier else Q(name__iexact=part))
        if not identifier and not matches.exists():
            # Match a complete canonical display name, never a substring or
            # a product-name feature guess. Ambiguous names remain errors.
            display_ids = [device.id for device in Device.objects.select_related("manufacturer")
                if " ".join(str(device).split()).casefold() == " ".join(part.split()).casefold()]
            matches = Device.objects.filter(pk__in=display_ids)
        if not identifier and not matches.exists():
            matches = Device.objects.filter(model_number__iexact=part)
        if matches.count() == 1:
            devices.append(str(matches.get().id))
            continue
        if matches.count() > 1:
            raise ValidationError(f"Ambiguous device '{part}'; submit its canonical Device ID.")
        # Legacy feature-column tokens are explicit feature declarations. Never
        # infer Bluetooth, charging, capacity or model scope from product names.
        candidates = []
        if mode in ("feature_based", "hybrid"):
            for field in (config.accessory_fields or []):
                try:
                    normalized = normalized_wireless(part, catalog) if field == "wireless_charging_compatibility" else normalized_value(field, part, catalog)
                    if normalized not in ("", "Not Compatible", "No"):
                        candidates.append((field, normalized))
                except (ValidationError, KeyError):
                    continue
        if len(candidates) != 1:
            raise ValidationError(f"Unknown or ambiguous compatibility declaration '{part}'; use canonical IDs or separate compatibility columns.")
        field, value = candidates[0]
        if field in values and values[field] != value:
            raise ValidationError(f"Conflicting declarations for {field}.")
        values[field] = value
    types = resolve_device_types(type_values) if type_values else []
    if types and devices:
        raise ValidationError("Universal type scope cannot be mixed with individual device models.")
    if types and mode != "universal":
        raise ValidationError("Universal product scope requires a Universal category.")
    if devices and mode not in ("device_specific", "hybrid"):
        raise ValidationError("Individual models require a Device Specific or Hybrid category.")
    return values, [str(record.id) for record in types], list(dict.fromkeys(devices))


def apply_import_values(product, values, types, config, update_type):
    validate_compatibility_values(values, instance=product,
        rules=config.compatibility_rules if config else {},
        assigned_fields=config.accessory_fields if config else [])
    for field, value in values.items():
        setattr(product, field, value)
    if types:
        existing = [str(row.device_type_id) for row in product.universal_type_scopes.filter(is_active=True)] if product.pk and not product._state.adding else []
        chosen = list(dict.fromkeys(existing + types)) if update_type == "add" else [value for value in existing if value not in types] if update_type == "remove" else types
        product.compatibility_mode = "universal_device_type"
        product.compatible_device_types = chosen
    elif not product.pk or product._state.adding:
        product.compatibility_mode = "direct_device"
        product.compatible_device_types = []
