"""Controlled JSON connector configuration; no expressions or executable mappings."""
from copy import deepcopy
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import uuid
from django.core.exceptions import ValidationError

BALAJI_CONFIG = {
    "version": 1,
    "items_path": "data.items", "next_cursor_path": "data.next_cursor", "watermark_path": "data.next_updated_since",
    "success_path": "success", "pagination": "cursor", "cursor_param": "cursor", "limit_param": "limit", "updated_since_param": "updated_since", "page_size": 200,
    "daily_row_limit": 100000, "daily_request_limit": 50000, "requests_per_minute": 120, "budget_timezone": "America/Los_Angeles",
    "fields": {"external_id": {"path": "sku"}, "sku": {"path": "sku"}, "name": {"path": "name"}, "series": {"path": "series"},
        "brand": {"path": "brand"}, "upc": {"path": "upc"}, "description": {"path": "description"}, "description_features": {"path": "features"},
        "vendor_category": {"path": "category"}, "color": {"path": "color"},
        "vendor_wholesale_price_amount": {"path": "unit_price_cents", "transform": "cents"},
        "vendor_wholesale_price_currency": {"path": "currency"},
        "msrp": {"path": "msrp_cents", "transform": "cents"},
        "map_price": {"path": "map_price_cents", "transform": "cents"},
        "inventory_level": {"path": "quantity_available"},
        "launch_date": {"path": "launch_date"},
        "weight": {"path": "weight_oz"}, "length": {"path": "length_in"},
        "width": {"path": "width_in"}, "height": {"path": "height_in"},
        "compatibility_declaration": {"path": "compatible_devices"}, "images": {"path": "image_urls"}},
    "category_map": {
        "Phone Cases": "Cases", "Cases": "Cases",
        "Screen Protectors": "Screen Protection", "Screen Protection": "Screen Protection",
        "Cables": "Chargers and Cables", "Wall Chargers": "Chargers and Cables",
        "Chargers": "Chargers and Cables", "Chargers and Cables": "Chargers and Cables",
        "Speakers": "Speakers",
        "Headphones": "Headphones", "Earbuds": "Headphones",
        "Headsets and Headphones": "Headphones", "Headsets": "Headphones",
        "Car Chargers": "Chargers and Cables",
        "Memory": "Memory", "Memory Cards": "Memory",
        "Wearable Tech": "Wearable Tech", "Wearables": "Wearable Tech",
        "Power Banks": "Chargers and Cables",
        "Tablet Cases": "Cases",
        "Phone Attachments": "Phone Attachments",
        "Other Accessories": "Phone Attachments",
        "Other": "Phone Attachments",
    },
    "default_category": "Phone Attachments",
}

TARGETS = {"external_id", "sku", "name", "series", "brand", "upc", "description", "description_features", "color",
    "vendor_category", "msrp", "map_price", "sale_price",
    "vendor_wholesale_price_amount", "vendor_wholesale_price_currency", "inventory_level", "launch_date", "release_date", "eol_date",
    "weight", "length", "width", "height",
    "compatibility_declaration", "images", "bluetooth_compatibility", "headphone_jack_compatibility", "compatible_charging_interface",
    "wireless_charging_compatibility", "storage_expansion_compatibility", "memory_capacity", "compatible_watch_case_size"}
PATH = re.compile(r"^(?:[A-Za-z_][A-Za-z0-9_-]*)(?:\.(?:[A-Za-z_][A-Za-z0-9_-]*|[0-9]+))*$")
PARAM = re.compile(r"^[A-Za-z_][A-Za-z0-9_\-]{0,63}$")

GENERIC_CONFIG = {
    **deepcopy(BALAJI_CONFIG),
    'items_path': 'items', 'next_cursor_path': 'next_cursor',
    'success_path': '', 'watermark_path': '', 'budget_timezone': 'UTC',
    'category_map': {}, 'default_category': '',
    'fields': {field: {'path': path} for field, path in {
        'external_id': 'id', 'sku': 'sku', 'name': 'name', 'brand': 'brand',
        'vendor_category': 'category', 'upc': 'upc', 'msrp': 'msrp',
        'vendor_wholesale_price_amount': 'wholesale_price',
        'vendor_wholesale_price_currency': 'currency', 'inventory_level': 'inventory',
        'launch_date': 'launch_date', 'compatibility_declaration': 'compatibility',
        'images': 'images',
    }.items()},
}


def default_catalog_config():
    return deepcopy(GENERIC_CONFIG)


def saved_integration_mode(company):
    import json
    try:
        data = json.loads(company.external_id or "{}")
        return data.get("integration_mode", "") if isinstance(data, dict) else ""
    except (TypeError, ValueError):
        return ""


def path_value(data, path, default=None):
    if not path:
        return data
    for segment in path.split("."):
        if isinstance(data, dict):
            data = data.get(segment, default)
        elif isinstance(data, list) and segment.isdigit() and int(segment) < len(data):
            data = data[int(segment)]
        else:
            return default
    return data


def validate_config(value):
    if not isinstance(value, dict) or set(value) - set(BALAJI_CONFIG) - {"page_param", "offset_param", "has_more_path", "updated_since_param", "compatibility", "search_param"}:
        raise ValidationError("Use the supported catalog configuration fields.")
    config = deepcopy(value)
    if config.get("version") != 1 or config.get("pagination") not in ("cursor", "page", "offset", "none"):
        raise ValidationError("Select version 1 and a supported pagination method.")
    for key in ("items_path", "next_cursor_path", "watermark_path", "success_path", "has_more_path"):
        path = config.get(key, "")
        if not isinstance(path, str) or (path and not PATH.fullmatch(path)):
            raise ValidationError(f"{key} must be a controlled JSON field path.")
    if config["pagination"] == "cursor" and not config.get("next_cursor_path"):
        raise ValidationError("Cursor pagination needs a next-cursor response path.")
    if config["pagination"] in ("page", "offset") and not config.get("has_more_path"):
        raise ValidationError("Page/offset pagination requires the provider's explicit has-more response field.")
    for key in ("cursor_param", "limit_param", "page_param", "offset_param", "updated_since_param", "search_param"):
        if key in config and (not isinstance(config[key], str) or not PARAM.fullmatch(config[key])):
            raise ValidationError(f"Invalid query parameter: {key}.")
    for key, ceiling in (("page_size", 500), ("daily_row_limit", 100000), ("daily_request_limit", 50000), ("requests_per_minute", 120)):
        number = config.get(key)
        if type(number) is not int or not 1 <= number <= ceiling:
            raise ValidationError(f"{key} must be between 1 and {ceiling}.")
    try:
        ZoneInfo(config.get("budget_timezone", "UTC"))
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        raise ValidationError("Use a recognized budget timezone.")
    fields = config.get("fields")
    if not isinstance(fields, dict) or set(fields) - TARGETS or not {"external_id", "sku", "name"} <= set(fields):
        raise ValidationError("Map external_id, sku and name using supported Product fields.")
    for field, rule in fields.items():
        if not isinstance(rule, dict) or set(rule) - {"path", "constant", "transform"} or ("path" in rule) == ("constant" in rule):
            raise ValidationError(f"{field} needs one source path or explicit constant.")
        if "path" in rule and (not isinstance(rule["path"], str) or not PATH.fullmatch(rule["path"])):
            raise ValidationError(f"Invalid source path for {field}.")
        if rule.get("transform", "identity") not in ("identity", "cents"):
            raise ValidationError(f"Unsupported conversion for {field}.")
        if "constant" in rule and not isinstance(rule["constant"], (str, int, float, bool, list, type(None))):
            raise ValidationError(f"Invalid constant for {field}.")
    mapping = config.get("category_map", {})
    if not isinstance(mapping, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in mapping.items()):
        raise ValidationError("Category mappings must associate source labels with approved CIXCI category labels.")
    if not isinstance(config.get("default_category", ""), str):
        raise ValidationError("Default category must be an explicit approved category label.")
    compatibility = config.get('compatibility', {})
    if not isinstance(compatibility, dict) or set(compatibility) - {'name_path', 'id_path', 'slug_path', 'manufacturer_path', 'device_map', 'universal_type_map'}:
        raise ValidationError('Use supported device-reference paths and explicit canonical mappings.')
    for key in ('name_path', 'id_path', 'slug_path', 'manufacturer_path'):
        if key in compatibility and (not isinstance(compatibility[key], str) or not PATH.fullmatch(compatibility[key])):
            raise ValidationError(f'Invalid device-reference path: {key}.')
    device_map = compatibility.get('device_map', {})
    if not isinstance(device_map, dict) or len(device_map) > 5000:
        raise ValidationError('Device mappings must be a bounded object of source reference to canonical Device ID.')
    for key, identifier in device_map.items():
        try:
            if not isinstance(key, str) or not key.strip() or not isinstance(identifier, str):
                raise ValueError()
            uuid.UUID(identifier)
        except (ValueError, TypeError, AttributeError):
            raise ValidationError('Each device mapping needs a non-empty source reference and canonical Device UUID.') from None
    universal_map = compatibility.get('universal_type_map', {})
    if not isinstance(universal_map, dict) or any(not isinstance(key, str) or not isinstance(values, list) or not values or any(not isinstance(v, str) or not v.strip() for v in values) for key, values in universal_map.items()):
        raise ValidationError('Universal scopes must map category labels to explicit Device Type ID/code lists.')
    return config
