"""Vendor device names that are not in the Device Catalog, and how an admin resolves them.

One durable row per (vendor, name): ``missing`` until an admin adds or links a
device (``mapped``) or says the text is not a device (``dismissed``). A mapped
row is an alias the vendor sync reads, so the mapping survives every later sync
even when the admin gave the device a different name than the vendor uses.
"""
import json
import re
from html import unescape

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from .models import VendorDeviceMapping

MAX_PRODUCT_REFERENCES = 2000


def name_key(value):
    """Same normalization as the sync resolver: entities decoded, spaces collapsed, case-folded."""
    return " ".join(unescape(str(value or "")).split()).casefold()[:255]


def vendor_names(vendor_company_id):
    """(aliases {key: device id}, dismissed keys) for one vendor, in one query."""
    aliases, dismissed = {}, set()
    if not vendor_company_id:
        return aliases, dismissed
    rows = VendorDeviceMapping.objects.filter(vendor_company_reference=vendor_company_id,
        status__in=("mapped", "dismissed")).values_list("name_key", "status", "device_id")
    for key, status, device_id in rows.iterator():
        if status == "mapped" and device_id:
            aliases[key] = str(device_id)
        elif status == "dismissed":
            dismissed.add(key)
    return aliases, dismissed


def record_missing(vendor_company_id, names):
    """Upsert the names one sync page could not resolve. ``names``: {name: set(product ids)}."""
    wanted = {}
    for name, products in names.items():
        key = name_key(name)
        if key:
            entry = wanted.setdefault(key, [str(name).strip()[:255], set()])
            entry[1].update(str(value) for value in products or ())
    if not wanted:
        return 0
    now = timezone.now()
    existing = {row.name_key: row for row in VendorDeviceMapping.objects.filter(
        vendor_company_reference=vendor_company_id, name_key__in=list(wanted))}
    created, updated = [], []
    for key, (name, products) in wanted.items():
        row = existing.get(key)
        if row is None:
            created.append(VendorDeviceMapping(vendor_company_reference=vendor_company_id, vendor_device_name=name, name_key=key,
                status="missing", product_ids=sorted(products)[:MAX_PRODUCT_REFERENCES], first_seen_at=now, last_seen_at=now))
        elif row.status == "missing":
            row.product_ids = sorted(set(row.product_ids or []) | products)[:MAX_PRODUCT_REFERENCES]
            row.last_seen_at = now
            updated.append(row)
    if created:
        VendorDeviceMapping.objects.bulk_create(created, ignore_conflicts=True, batch_size=500)
    if updated:
        VendorDeviceMapping.objects.bulk_update(updated, ["product_ids", "last_seen_at"], batch_size=200)
    return len(created)


def declared_names(payload, config):
    """Device names a vendor source row declares, read with the connection's own mapping."""
    from apps.integration.catalog_config import path_value
    from apps.integration.catalog_import import mapped_values
    payload = json.loads(payload) if isinstance(payload, str) else (payload or {})
    try:
        fields, _ = mapped_values(payload, config)
    except Exception:
        fields = {}
    raw = fields.get("compatibility_declaration", payload.get("compatible_devices", []))
    if isinstance(raw, str):
        return [part.strip() for part in re.split(r"[;,]", raw) if part.strip()], raw
    names = []
    name_path = (config.get("compatibility", {}) if isinstance(config, dict) else {}).get("name_path", "name")
    for entry in raw if isinstance(raw, list) else []:
        value = path_value(entry, name_path, "") if isinstance(entry, dict) else entry
        if isinstance(value, str) and value.strip():
            names.append(value.strip())
    return names, raw


def import_legacy_alerts():
    """Names recorded only in earlier dashboard alerts become durable rows once."""
    from apps.devices.models import Device
    from apps.notification.models import NotificationRequest
    known = set()
    for device in Device.objects.select_related("manufacturer").iterator():
        known.update({name_key(device.name), name_key(f"{device.manufacturer.name} {device.name}")})
    by_vendor = {}
    for payload in NotificationRequest.objects.filter(event_type="catalog.missing_device_reference").values_list("safe_payload_summary", flat=True):
        payload = payload or {}
        vendor = payload.get("vendor_company_id")
        if not vendor:
            continue
        for name in payload.get("missing_devices", []):
            if isinstance(name, str) and name_key(name) not in known:
                by_vendor.setdefault(vendor, {}).setdefault(name, set())
    return sum(record_missing(vendor, names) for vendor, names in by_vendor.items())


def _forget_in_alerts(vendor_device_name):
    try:
        from apps.notification.models import NotificationRequest
        for alert in NotificationRequest.objects.filter(event_type="catalog.missing_device_reference"):
            payload = alert.safe_payload_summary or {}
            names = payload.get("missing_devices", [])
            if vendor_device_name not in names:
                continue
            names = [name for name in names if name != vendor_device_name]
            if not names:
                alert.delete()
            else:
                payload.update(missing_devices=names, count=len(names))
                alert.safe_payload_summary = payload
                alert.save(update_fields=["safe_payload_summary"])
    except Exception:
        pass


def affected_sources(mapping):
    """Vendor source rows (with a product) that declare this exact name."""
    from django.db.models import Q
    from apps.integration.models import VendorCatalogItem
    sources = VendorCatalogItem.objects.filter(connection__vendor_company_id=mapping.vendor_company_reference,
        product_id__isnull=False).filter(Q(payload__icontains=mapping.vendor_device_name) | Q(product_id__in=mapping.product_ids or [])
    ).select_related("product", "connection").order_by("pk")[:5000]
    result = []
    for source in sources:
        names, raw = declared_names(source.payload, source.connection.config)
        if mapping.name_key in {name_key(name) for name in names}:
            result.append((source, raw))
    return result


def _why_not_mapped(product, device, row):
    from apps.devices.models import Device  # noqa: F401
    from .compatibility_contract import category_mode, configured_type_ids, eligible_devices, usable_device_type
    from .models import DynamicDropdownConfig
    if row is not None and row.is_excluded:
        return "An exclusion already blocks this model for the product."
    if row is not None and row.is_locked:
        return "The existing mapping is locked."
    config = DynamicDropdownConfig.objects.filter(field_name="product_category", value=product.product_category).first()
    label = product.product_category or "no category"
    if config is None or config.status != "active":
        return f"Category {label} is not active."
    if product.compatibility_mode != "direct_device" or category_mode(config.compatibility_mode) not in ("device_specific", "hybrid"):
        return f"Category {label} does not use model lists (set it to Device Specific or Hybrid)."
    if not usable_device_type(device.device_type):
        return f"Device Type {device.device_type.name} is not Active."
    if str(device.device_type_id) not in configured_type_ids(config):
        return f"Category {label} does not list {device.device_type.name} as an eligible Device Type."
    if not eligible_devices().filter(pk=device.pk).exists():
        return "The device is not available yet (launch date or lifecycle status)."
    return "The current category rules do not accept this model."


@transaction.atomic
def resolve_mapping(mapping, device, actor):
    """Point a vendor name at a canonical device and bring every declaring product in line."""
    from apps.audit.models import AuditRecord
    from apps.integration.catalog_compatibility import CatalogDeviceResolver
    from .compatibility_commands import update_explicit_selections
    from .services import defer_buyer_projection_refresh, invalidate_buyer_projection_cache

    mapping = VendorDeviceMapping.objects.select_for_update().get(pk=mapping.pk)
    mapping.status, mapping.device = "mapped", device
    mapping.resolved_by, mapping.resolved_at = actor.pk, timezone.now()
    mapping.save()

    mapped, skipped, cleared, resolvers = [], {}, 0, {}
    seen = set()
    with defer_buyer_projection_refresh():
        for source, raw in affected_sources(mapping):
            product = source.product
            if product.pk not in seen:
                seen.add(product.pk)
                try:
                    update_explicit_selections(product, [str(device.pk)], actor, update_type="add", basis="imported",
                        change_source="Missing Device Resolved", vendor_import=True)
                    row = product.compatibility_assertions.filter(device_reference=device.pk).first()
                    if row is not None and row.is_compatible and not row.is_excluded:
                        mapped.append(product.pk)
                    else:
                        reason = _why_not_mapped(product, device, row)
                        skipped[reason] = skipped.get(reason, 0) + 1
                except (ValidationError, PermissionDenied) as error:
                    reason = "; ".join(getattr(error, "messages", [str(error)]))[:200]
                    skipped[reason] = skipped.get(reason, 0) + 1
            # The source stays in review only while it still declares an unknown model.
            if source.review_required and any(item.get("code") == "MISSING_DEVICE_REVIEW" for item in source.review_errors or []):
                resolver = resolvers.setdefault(source.connection_id, CatalogDeviceResolver(source.connection.config, mapping.vendor_company_reference))
                try:
                    resolver.declaration(raw, category=product.product_category, product=product)
                    still_missing = bool(resolver.missing)
                except (ValidationError, TypeError, AttributeError):
                    still_missing = True
                if not still_missing:
                    source.review_errors = [item for item in source.review_errors if item.get("code") != "MISSING_DEVICE_REVIEW"]
                    source.review_required = bool(source.review_errors)
                    source.save(update_fields=["review_errors", "review_required"])
                    cleared += 1
    if mapped:
        invalidate_buyer_projection_cache("missing_device_resolved")
    _forget_in_alerts(mapping.vendor_device_name)
    AuditRecord.objects.create(event_code="catalog.missing_device.resolved", status="completed",
        event_description=json.dumps({"vendor_device_name": mapping.vendor_device_name, "device_id": str(device.pk),
            "device_name": str(device), "products_mapped": len(mapped), "products_not_mapped": skipped, "reviews_cleared": cleared}),
        actor_reference=actor.pk, service_trigger_reference="admin_missing_device_panel", source_module="catalog",
        company_scope_reference=mapping.vendor_company_reference, source_record_type="VendorDeviceMapping", source_record_id=mapping.pk)
    return {"products_matched": len(mapped), "reviews_cleared": cleared,
            "not_mapped": [{"reason": reason, "products": count} for reason, count in sorted(skipped.items(), key=lambda item: -item[1])]}
