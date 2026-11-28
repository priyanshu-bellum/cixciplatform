"""Canonical Product adapter. Invalid source stays durable; approved data is preserved."""
from decimal import Decimal, InvalidOperation
from copy import deepcopy
import hashlib
import json
import logging
from types import SimpleNamespace
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError as APIValidationError
from django.utils import timezone
from apps.catalog.models import Product, DynamicDropdownConfig, VendorBrandRelationship, VendorCategoryMapping, VendorColorMapping
from apps.catalog.api import ProductDetailSerializer
from apps.catalog.compatibility_import import parse_compatibility_row
from apps.catalog.compatibility_contract import COMPATIBILITY_FIELDS
from .catalog_config import path_value
from .catalog_secrets import redact, decrypt_credentials
from .catalog_media import process_vendor_product_images
from .catalog_compatibility import CatalogDeviceResolver
from .models import VendorCatalogItem

# CharField model fields that vendor APIs commonly return as null.
# Remove from attrs so the model default applies instead of DRF rejecting None.
_NULLABLE_TEXT_FIELDS = frozenset({
    "series", "color", "short_description", "warranty",
    "meta_title", "meta_description", "promo_information",
    "vendor_category", "vendor_category_raw",
})

logger = logging.getLogger(__name__)

def canonical_evidence(product):
    if product is None:
        return None
    fields = ('id', 'vendor_company_reference', 'sku', 'name', 'brand', 'brand_reference_id',
              'product_category', 'product_category_override', 'status', 'launch_date', 'release_date', 'eol_date',
              'vendor_wholesale_price_amount', 'vendor_wholesale_price_currency', 'msrp', 'map_price',
              'sale_price', 'inventory_level', 'primary_image_reference', 'compatibility_mode', 'compatible_device_types')
    return deepcopy({field: getattr(product, field) for field in (*fields, *COMPATIBILITY_FIELDS)})


def source_observation(connection, run, actor, source, before, after, old_hash, *, action='source_processed'):
    from apps.audit.models import AuditRecord
    return AuditRecord(event_code='integration.vendor_catalog.' + action,
        event_description=json.dumps({'connection_id': str(connection.pk), 'run_id': str(run.pk),
            'external_id': source.external_id, 'before': before, 'after': after,
            'linked_product_id': str(source.product_id) if source.product_id else None,
            'review_required': source.review_required, 'review_errors': source.review_errors,
            'source_hash_before': old_hash, 'source_hash_after': source.source_hash,
            'applied_config_version': str(connection.config_version), 'configured_by': str(connection.updated_by_id)}, default=str),
        status='review_required' if source.review_required else 'success',
        actor_reference=getattr(actor, 'id', None) if run.trigger != 'weekly' else None,
        service_trigger_reference='Vendor API Sync', correlation_id=run.pk,
        company_scope_reference=connection.vendor_company_id, source_module='integration',
        source_record_type='VendorCatalogItem', source_record_id=source.pk)


def resolved_category(raw, product, configured, approved, default):
    """Use existing category authority; conflicting declarations require review."""
    errors = []
    if raw is None:
        raw = ''
    if not isinstance(raw, str):
        errors.append({'code': 'INVALID_FIELD_TYPE', 'field': 'vendor_category'})
        raw = ''
    key = raw.strip().casefold()
    if product and product.product_category_override:
        return product.product_category_override, errors
    canonical = approved.get(key, set()) if key else set()
    explicit = configured.get(key, set()) if key else set()
    if len(canonical) > 1 or len(explicit) > 1 or (canonical and explicit and canonical != explicit):
        errors.append({'code': 'CATEGORY_MAPPING_CONFLICT', 'field': 'product_category'})
        return '', errors
    candidates = canonical or explicit
    return (next(iter(candidates)) if candidates else default or (product.product_category if product else '')), errors


def mapped_values(payload, config):
    result, errors = {}, []
    absent = object()
    for field, rule in config["fields"].items():
        value = rule["constant"] if "constant" in rule else path_value(payload, rule["path"], absent)
        if value is absent:
            continue
        if rule.get("transform") == "cents" and value is not None:
            try:
                amount = Decimal(str(value))
                if isinstance(value, bool) or not amount.is_finite() or amount != amount.to_integral_value():
                    raise ValueError()
                value = str(amount / Decimal(100))
            except (InvalidOperation, ValueError):
                errors.append({"code": "INVALID_CENTS", "field": field})
                continue
        result[field] = value
    return result, errors


def row_identity(payload, config, fields=None):
    if fields is None:
        fields, _ = mapped_values(payload, config)
    value = fields.get("external_id")
    if isinstance(value, (str, int)) and not isinstance(value, bool) and str(value).strip() and len(str(value).strip()) <= 200:
        return str(value).strip()
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return "unresolved:" + digest


def ingest_rows(connection, run, items, actor):
    """Call inside the leased page transaction; all lookups are bounded to this page."""
    credential = decrypt_credentials(connection) if connection.encrypted_credentials else {}
    secrets = [str(value) for value in credential.values() if value]
    payloads = [redact(item, secrets) for item in items]
    prepared, duplicates, sku_identities = {}, set(), {}
    for payload in payloads:
        fields, errors = mapped_values(payload, connection.config)
        if isinstance(fields.get('sku'), str):
            fields['sku'] = fields['sku'].strip()
        identifier = row_identity(payload, connection.config, fields)
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        if identifier in prepared and prepared[identifier][1] != digest:
            duplicates.add(identifier)
        prepared[identifier] = (payload, digest, fields, errors)
        sku = fields.get('sku')
        if isinstance(sku, str) and sku:
            sku_identities.setdefault(sku, set()).add(identifier)
    conflicting_skus = {sku for sku, references in sku_identities.items() if len(references) > 1}
    existing = {row.external_id: row for row in VendorCatalogItem.objects.select_for_update().defer('payload').filter(
        connection=connection, external_id__in=prepared).order_by('pk')}
    skus = [record[2].get('sku') for record in prepared.values()]
    from django.db.models import Q
    products = {row.sku: row for row in Product.objects.select_for_update().filter(vendor_company_reference=connection.vendor_company_id).filter(
        Q(sku__in=[sku for sku in skus if isinstance(sku, str)]) | Q(pk__in=[row.product_id for row in existing.values() if row.product_id])).order_by('pk')}
    products_by_id = {row.id: row for row in products.values()}
    # Product locks serialize offer binding. Do not lock another connection's
    # source rows here: Source -> Product -> foreign Source creates lock inversion.
    owners = {row.product_id: row for row in VendorCatalogItem.objects.filter(product_id__in=products_by_id).only(
        'id', 'product_id', 'connection_id', 'source_hash', 'review_required', 'review_errors')}
    links, brand_labels = {}, {}
    for link in VendorBrandRelationship.objects.filter(vendor_company_id=connection.vendor_company_id, is_active=True, brand__is_active=True).select_related("brand"):
        links[link.brand.canonical_key] = link.brand_id
        links[" ".join(link.brand.name.split()).casefold()] = link.brand_id
        brand_labels[link.brand_id] = link.brand.name
    categories = {row.value: row for row in DynamicDropdownConfig.objects.filter(field_name="product_category", status="active")}
    category_keys = {record[2]['vendor_category'].strip().casefold() for record in prepared.values()
                     if isinstance(record[2].get('vendor_category'), str) and record[2]['vendor_category'].strip()}
    approved_categories, configured_categories = {}, {}
    if category_keys:
        for raw, canonical in VendorCategoryMapping.objects.filter(vendor_company_reference=connection.vendor_company_id, status='active').values_list('vendor_category', 'cixci_category').iterator():
            key = raw.strip().casefold()
            if key in category_keys:
                approved_categories.setdefault(key, set()).add(canonical)
    for raw, canonical in connection.config.get('category_map', {}).items():
        configured_categories.setdefault(raw.strip().casefold(), set()).add(canonical)
    # Color mapping: vendor color → system color
    color_mappings = {}
    for vc, sc in VendorColorMapping.objects.filter(
        vendor_company_reference=connection.vendor_company_id, status='active'
    ).values_list('vendor_color', 'system_color').iterator():
        color_mappings[vc.strip().casefold()] = sc

    counts = {"created_count": 0, "updated_count": 0, "unchanged_count": 0, "review_count": 0, "error_count": 0}
    device_resolver = CatalogDeviceResolver(connection.config, connection.vendor_company_id)
    # name → products that declared it; stored for the Missing Devices panel.
    missing_products = {}
    # Controlled compatibility values are read once per page, not once per row.
    from apps.catalog.compatibility_values import value_catalog
    value_options = value_catalog()
    unchanged, observations, deferred_images = [], [], []
    resolved_brand_names = set()
    unresolved_colors = set()
    missing_device_names = set()
    unresolved_categories = set()
    approved_brands = set(links.values())
    for identifier, (payload, digest, fields, field_errors) in prepared.items():
        source = existing.get(identifier)
        sku = fields.get('sku')
        safe_sku = sku if isinstance(sku, str) else ''
        cached_product = products_by_id.get(source.product_id) if source and source.product_id else None
        original_product = cached_product or products.get(safe_sku)
        before = canonical_evidence(original_product)
        old_hash = source.source_hash if source else None
        old_config = source.applied_config_version if source else None
        old_review = (source.review_required, deepcopy(source.review_errors)) if source else None
        category, category_errors = resolved_category(fields.get('vendor_category'), cached_product or products.get(safe_sku),
            configured_categories, approved_categories, connection.config.get('default_category'))
        if (run.trigger != 'review' and source and source.source_hash == digest and not source.review_required
                and source.applied_config_version == connection.config_version
                and safe_sku not in conflicting_skus and identifier not in duplicates
                and cached_product and cached_product.brand_reference_id in approved_brands
                and not category_errors and category in categories and category == cached_product.product_category):
            unchanged.append(source.pk); counts["unchanged_count"] += 1
            continue
        errors = [*field_errors, *category_errors]
        if source and source.last_seen_run_id == run.id and source.source_hash != digest:
            errors.append({"code": "CONFLICTING_DUPLICATE", "field": "external_id"})
        if identifier.startswith("unresolved:"):
            errors.append({"code": "REMOTE_ID_REQUIRED", "field": "external_id"})
        if identifier in duplicates:
            errors.append({"code": "CONFLICTING_DUPLICATE", "field": "external_id"})
        if safe_sku in conflicting_skus:
            errors.append({'code': 'CONFLICTING_SKU_IDENTITY', 'field': 'sku'})
        product = cached_product if source and source.product_id else products.get(safe_sku)
        if product and not (source and source.product_id):
            owner = owners.get(product.pk)
            if owner and (source is None or owner.pk != source.pk):
                if owner.connection_id == connection.pk:
                    issue = {'code': 'REMOTE_ID_CHANGED_REQUIRES_REVIEW', 'field': 'external_id'}
                    owner.review_required = True
                    if issue not in owner.review_errors:
                        owner.review_errors = [*owner.review_errors, issue]
                    owner.save(update_fields=['review_required', 'review_errors'])
                    observations.append(source_observation(connection, run, actor, owner, before, before, owner.source_hash,
                        action='source_identity_conflict'))
                errors.append({"code": "OFFER_ALREADY_MANAGED", "field": "sku"})
                product = None
        if product and fields.get("sku") != product.sku:
            errors.append({"code": "SKU_CHANGE_REQUIRES_REVIEW", "field": "sku"})
        incoming_brand = fields.get('brand')
        incoming_brand_id = links.get(' '.join(str(incoming_brand or '').split()).casefold())
        if (product and incoming_brand not in (None, '', product.brand)
                and (not product.brand_reference_id or incoming_brand_id != product.brand_reference_id)):
            errors.append({"code": "BRAND_CHANGE_REQUIRES_REVIEW", "field": "brand"})
        attrs = {key: value for key, value in fields.items() if key not in {"external_id", "images", "compatibility_declaration", "description_features"}}
        # Append vendor feature bullets to description when the config maps description_features.
        raw_features = fields.get("description_features")
        if raw_features:
            if isinstance(raw_features, list):
                bullets = "\n".join(f"• {str(f).strip()}" for f in raw_features if str(f).strip())
            else:
                bullets = str(raw_features).strip()
            if bullets:
                desc = str(attrs.get("description") or "").strip()
                attrs["description"] = f"{desc}\n\n{bullets}".strip() if desc else bullets
        for required in ("sku", "name"):
            if not isinstance(attrs.get(required), str) or not attrs[required].strip():
                errors.append({"code": "REQUIRED_FIELD", "field": required})
        # §4 Source Preservation — capture raw vendor values before normalization
        attrs["vendor_original_data"] = {
            k: attrs.get(k) for k in
            ("name", "description", "short_description", "meta_title",
             "meta_description", "color", "brand")
            if attrs.get(k)
        }
        # Run normalization on import data — deterministic rules (§5-§10)
        from apps.catalog.normalization import normalize_product
        if isinstance(attrs.get("name"), str) and attrs["name"].strip():
            norm = normalize_product(
                name=attrs.get("name", ""),
                brand=attrs.get("brand", product.brand if product else "") or "",
                category=category or "",
                color=attrs.get("color", "") or "",
                short_description=attrs.get("short_description"),
                description=attrs.get("description"),
                meta_title=attrs.get("meta_title"),
                meta_description=attrs.get("meta_description"),
            )
            if norm.changes.get("name"):
                attrs["name"] = norm.changes["name"]
            if "description" in norm.changes and norm.changes["description"] is not None:
                attrs["description"] = norm.changes["description"]
            if not attrs.get("meta_title"):
                attrs["meta_title"] = norm.changes.get("meta_title", "")
            if not attrs.get("meta_description"):
                attrs["meta_description"] = norm.changes.get("meta_description", "")
            # §6: short_description is vendor pass-through only — never auto-generate
            for w in norm.warnings:
                errors.append({"code": w.get("code", "NORMALIZATION_WARNING"), "field": w.get("field", "normalization")})
        config = categories.get(category)
        if not config:
            errors.append({"code": "CATEGORY_MAPPING_REQUIRED", "field": "product_category"})
        else:
            attrs["product_category"] = category
            attrs['category_validation_status'] = 'override_applied' if product and product.product_category_override else 'resolved'
        if not fields.get("msrp") and not (product and product.msrp):
            errors.append({"code": "MSRP_REQUIRED", "field": "msrp"})
        brand = fields.get("brand", product.brand if product else "") or ""
        brand_id = links.get(" ".join(str(brand).split()).casefold())
        if not brand_id:
            from .catalog_onboarding import resolve_import_brand
            resolved_brand = resolve_import_brand(connection, brand, actor)
            if resolved_brand is not None:
                brand_id = resolved_brand.pk
                links[' '.join(brand.split()).casefold()] = brand_id
                brand_labels[brand_id] = resolved_brand.name
        if brand_id:
            attrs["brand_reference"] = str(brand_id)
            attrs['brand'] = brand_labels[brand_id]
            if brand.strip():
                resolved_brand_names.add(brand.strip())
        else:
            errors.append({"code": "BRAND_RELATIONSHIP_REQUIRED", "field": "brand"})
        # Color mapping: resolve vendor color → system color (supports multicolor)
        vendor_color = attrs.get("color") or (product.color if product else "")
        if vendor_color and isinstance(vendor_color, str):
            from apps.catalog.normalization import resolve_system_colors
            system_colors_list, primary_color, color_warnings = resolve_system_colors(vendor_color, color_mappings)
            if system_colors_list:
                attrs["system_color"] = primary_color
                attrs["system_colors"] = system_colors_list
            elif vendor_color.strip():
                unresolved_colors.add(vendor_color.strip())

        # Track unresolved categories for notification
        if any(e.get("code") == "CATEGORY_MAPPING_REQUIRED" for e in errors):
            raw_cat = fields.get("vendor_category", "")
            if isinstance(raw_cat, str) and raw_cat.strip():
                unresolved_categories.add(raw_cat.strip())

        if not product or not product.primary_image_reference:
            errors.append({"code": "MEDIA_REVIEW_REQUIRED", "field": "images"})
        if "[REDACTED]" in json.dumps(payload):
            errors.append({"code": "SENSITIVE_DATA_REMOVED", "field": "source"})
        compat_raw = fields.get('compatibility_declaration', '')
        row_missing = []
        if compat_raw:
            try:
                compat_raw = device_resolver.declaration(compat_raw, category=category, product=product)
                if device_resolver.missing:
                    # Known models are mapped now; the unknown ones wait for an admin.
                    missing_device_names.update(device_resolver.missing)
                    row_missing = list(device_resolver.missing)
                    errors.append({"code": "MISSING_DEVICE_REVIEW", "field": "compatibility_declaration"})
            except (ValidationError, TypeError, AttributeError):
                errors.append({"code": "COMPATIBILITY_REVIEW_REQUIRED", "field": "compatibility_declaration"})
                if isinstance(compat_raw, str):
                    for _dn in compat_raw.split(';'):
                        _dn = _dn.strip()
                        if _dn and _dn.casefold() != 'universal':
                            missing_device_names.add(_dn)
                compat_raw = ''
        if compat_raw:
            try:
                compatibility_input = {'devicecompatibility': compat_raw}
                if config:
                    compatibility_input.update({field.replace('_', ''): fields[field] for field in COMPATIBILITY_FIELDS if field in fields})
                values, types, devices = parse_compatibility_row(compatibility_input, None, catalog=value_options)
                if config:
                    attrs.update(values)
                if types:
                    attrs.update(compatibility_mode="universal_device_type", compatible_device_types=types)
                if devices:
                    attrs.update(device_ids=devices, compatibility_update_type="replace",
                        compatibility_mode='direct_device', compatible_device_types=[])
                if not devices and not types:
                    for device_name in compat_raw.split(';'):
                        device_name = device_name.strip()
                        if device_name:
                            missing_device_names.add(device_name)
            except (ValidationError, TypeError, AttributeError):
                errors.append({"code": "COMPATIBILITY_REVIEW_REQUIRED", "field": "compatibility_declaration"})
                if isinstance(compat_raw, str):
                    for _dn in compat_raw.split(';'):
                        _dn = _dn.strip()
                        if _dn and _dn.casefold() != 'universal':
                            missing_device_names.add(_dn)
        attrs.update(vendor_company_reference=connection.vendor_company_id)
        if not product:
            attrs.update(company_scope_reference=connection.vendor_company_id, product_type="accessory", status="active", selling_status="for_sale")
        # Vendor APIs return null for absent text fields; DRF CharFields reject None.
        for _key in list(attrs):
            if attrs[_key] is None and _key in _NULLABLE_TEXT_FIELDS:
                del attrs[_key]
        serializer, valid = None, False
        if product is None and (attrs.get('launch_date') is None or attrs.get('launch_date') == ''):
            # Canonical Product validation requires Launch Date for every new
            # offer. Record missing setup without repeatedly constructing the
            # full serializer/model workflow for a known-uncreatable source row.
            errors.append({'code': 'PRODUCT_VALIDATION_REQUIRED', 'field': 'launch_date'})
        else:
            serializer = ProductDetailSerializer(product, data=attrs, partial=bool(product), context={
                'request': SimpleNamespace(user=actor), 'update_source': 'Vendor API Sync', 'source_run_reference': run.pk})
            valid = serializer.is_valid()
            if not valid:
                for field in serializer.errors:
                    errors.append({"code": "PRODUCT_VALIDATION_REQUIRED", "field": field})
        canonical = product
        new_product = False
        identity_fatal = {"OFFER_ALREADY_MANAGED", "REQUIRED_FIELD", "REMOTE_ID_REQUIRED", "CONFLICTING_DUPLICATE", "CONFLICTING_SKU_IDENTITY", "SKU_CHANGE_REQUIRES_REVIEW", "BRAND_CHANGE_REQUIRES_REVIEW", "CATEGORY_MAPPING_CONFLICT"}
        compat_fatal = {"COMPATIBILITY_REVIEW_REQUIRED"}
        informational = {"MEDIA_REVIEW_REQUIRED", "SENSITIVE_DATA_REMOVED", "SEO_PRODUCT_FACT_CONFLICT", "MISSING_DEVICE_REVIEW"}
        error_codes = {error["code"] for error in errors}
        fatal = bool(error_codes & identity_fatal)
        compat_only = not fatal and bool(error_codes & compat_fatal)
        blocking_errors = [e for e in errors if e["code"] not in informational]
        if compat_only and valid and serializer is not None:
            compat_fields = {"device_ids", "compatibility_update_type", "compatibility_declaration"}
            for field in compat_fields:
                serializer.validated_data.pop(field, None)
        allow_save = (valid and not fatal
            and not (product and product.status == "active" and blocking_errors and not compat_only))
        if allow_save:
            try:
                with transaction.atomic():
                    if product is None:
                        canonical = serializer.save(company_scope_reference=connection.vendor_company_id)
                        new_product = True; counts["created_count"] += 1
                        products[canonical.sku] = canonical
                    else:
                        changed = any(key in {"device_ids", "compatibility_update_type"} or getattr(product, key, object()) != value for key, value in serializer.validated_data.items())
                        if changed:
                            canonical = serializer.save(); counts["updated_count"] += 1
                        else:
                            counts["unchanged_count"] += 1
            except (ValidationError, APIValidationError) as error:
                details = getattr(error, 'message_dict', getattr(error, 'detail', {}))
                for field in details if isinstance(details, dict) else ['product']:
                    errors.append({'code': 'PRODUCT_VALIDATION_REQUIRED', 'field': field})
                # Keep durable review evidence even when model-level validation
                # rejects a row; one bad source must not roll back the whole page.
                canonical = Product.objects.get(pk=product.pk) if product else None
        elif product:
            counts["unchanged_count"] += 1
        if canonical and not canonical.primary_image_reference:
            image_urls = fields.get("images")
            if image_urls and isinstance(image_urls, list):
                deferred_images.append((canonical.pk, image_urls, connection.vendor_company_id, getattr(actor, "id", None)))
        if source is None:
            source = VendorCatalogItem(connection=connection, external_id=identifier)
        source.product, source.payload, source.source_hash = canonical, payload, digest
        source.applied_config_version = connection.config_version
        source.review_required, source.review_errors = bool(errors), errors
        if run.trigger != "review":
            source.is_listed, source.last_seen_at, source.last_seen_run = True, timezone.now(), run
        source.save()
        after = canonical_evidence(canonical or original_product)
        if before != after or old_hash != digest or old_config != connection.config_version or old_review != (source.review_required, source.review_errors):
            observations.append(source_observation(connection, run, actor, source, before, after, old_hash))
        for missing_name in row_missing:
            missing_products.setdefault(missing_name, set()).update([str(canonical.pk)] if canonical else [])
        if canonical:
            owners[canonical.pk] = source
            products[canonical.sku] = canonical
            products_by_id[canonical.pk] = canonical
        if errors:
            counts["review_count"] += 1
        if fatal:
            counts["error_count"] += 1
    if unchanged:
        if run.trigger != "review":
            VendorCatalogItem.objects.filter(pk__in=unchanged).update(last_seen_at=timezone.now(), last_seen_run=run, is_listed=True)
    if observations:
        from apps.audit.models import AuditRecord
        AuditRecord.objects.bulk_create(observations, batch_size=200)
    if resolved_brand_names:
        existing_brands = set(DynamicDropdownConfig.objects.filter(
            field_name="brand", value__in=resolved_brand_names,
        ).values_list("value", flat=True))
        new_brands = resolved_brand_names - existing_brands
        if new_brands:
            DynamicDropdownConfig.objects.bulk_create(
                [DynamicDropdownConfig(field_name="brand", value=name, display_name=name) for name in new_brands],
                ignore_conflicts=True,
            )

    if missing_products:
        from apps.catalog.missing_devices import record_missing
        record_missing(connection.vendor_company_id, missing_products)

    # Emit dashboard notifications for unresolved colors, categories, missing devices
    _emit_import_notifications(connection, unresolved_colors, unresolved_categories, missing_device_names)

    return counts, deferred_images


def _emit_import_notifications(connection, unresolved_colors, unresolved_categories, missing_device_names):
    """Create dashboard notifications for import data quality issues."""
    try:
        from apps.notification.models import NotificationRequest
    except ImportError:
        return

    vendor_id = connection.vendor_company_id
    notifications = []

    if unresolved_categories:
        notifications.append(NotificationRequest(
            event_type="catalog.category_mapping_required",
            source_module="integration",
            company_scope_reference=vendor_id,
            classification="DASHBOARD_ONLY",
            safe_payload_summary={
                "vendor_company_id": str(vendor_id),
                "connection_id": str(connection.pk),
                "unresolved_categories": sorted(unresolved_categories)[:20],
                "count": len(unresolved_categories),
                "message": f"{len(unresolved_categories)} vendor categories need mapping to CIXCI categories",
            },
        ))

    if unresolved_colors:
        notifications.append(NotificationRequest(
            event_type="catalog.color_mapping_required",
            source_module="integration",
            company_scope_reference=vendor_id,
            classification="DASHBOARD_ONLY",
            safe_payload_summary={
                "vendor_company_id": str(vendor_id),
                "connection_id": str(connection.pk),
                "unresolved_colors": sorted(unresolved_colors)[:20],
                "count": len(unresolved_colors),
                "message": f"{len(unresolved_colors)} vendor colors need mapping to system colors",
            },
        ))

    if missing_device_names:
        notifications.append(NotificationRequest(
            event_type="catalog.missing_device_reference",
            source_module="integration",
            company_scope_reference=vendor_id,
            classification="DASHBOARD_ONLY",
            safe_payload_summary={
                "vendor_company_id": str(vendor_id),
                "connection_id": str(connection.pk),
                "missing_devices": sorted(missing_device_names)[:500],
                "count": len(missing_device_names),
                "message": f"{len(missing_device_names)} vendor device names not found in CIXCI Device Catalog — add these devices so cases/screen protectors can be matched",
            },
        ))
        # Audit log: record each missing device name so admins can see the
        # full list and add them to the Device Catalog.
        try:
            from apps.audit.models import AuditRecord
            audit_entries = []
            for device_name in sorted(missing_device_names):
                audit_entries.append(AuditRecord(
                    event_code="catalog.compatibility.missing_device",
                    event_description=f"Vendor device '{device_name}' not found in CIXCI Device Catalog. Add this device so cases and screen protectors can be matched to it.",
                    status="pending_review",
                    service_trigger_reference="vendor_catalog_sync",
                    source_module="integration",
                    company_scope_reference=vendor_id,
                    source_record_type="VendorCatalogConnection",
                    source_record_id=connection.pk,
                ))
            if audit_entries:
                AuditRecord.objects.bulk_create(audit_entries, batch_size=200, ignore_conflicts=True)
        except Exception as exc:
            logger.warning("Failed to create missing device audit entries: %s", exc)

    if notifications:
        try:
            from django.db import transaction
            with transaction.atomic():
                NotificationRequest.objects.bulk_create(notifications, ignore_conflicts=True)
            from apps.notification.broadcast import broadcast_import_alert
            for nr in notifications:
                broadcast_import_alert({
                    "event_type": nr.event_type,
                    "message": (nr.safe_payload_summary or {}).get("message", ""),
                    "count": (nr.safe_payload_summary or {}).get("count", 0),
                })
        except Exception as exc:
            logger.warning("Failed to create import notifications: %s", exc)
