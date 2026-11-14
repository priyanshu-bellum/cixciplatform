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
from apps.catalog.models import Product, DynamicDropdownConfig, VendorBrandRelationship, VendorCategoryMapping
from apps.catalog.api import ProductDetailSerializer
from apps.catalog.compatibility_import import parse_compatibility_row
from apps.catalog.compatibility_contract import COMPATIBILITY_FIELDS
from .catalog_config import path_value
from .catalog_secrets import redact, decrypt_credentials
from .catalog_media import process_vendor_product_images
from .models import VendorCatalogItem

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
    links = {}
    for link in VendorBrandRelationship.objects.filter(vendor_company_id=connection.vendor_company_id, is_active=True, brand__is_active=True).select_related("brand"):
        links[link.brand.canonical_key] = link.brand_id
        links[" ".join(link.brand.name.split()).casefold()] = link.brand_id
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
    counts = {"created_count": 0, "updated_count": 0, "unchanged_count": 0, "review_count": 0, "error_count": 0}
    unchanged, observations = [], []
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
        if (source and source.source_hash == digest and not source.review_required
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
        attrs = {key: value for key, value in fields.items() if key not in {"external_id", "images", "compatibility_declaration"}}
        for required in ("sku", "name"):
            if not isinstance(attrs.get(required), str) or not attrs[required].strip():
                errors.append({"code": "REQUIRED_FIELD", "field": required})
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
        if brand_id:
            attrs["brand_reference"] = str(brand_id)
        else:
            errors.append({"code": "BRAND_RELATIONSHIP_REQUIRED", "field": "brand"})
        if not product or not product.primary_image_reference:
            errors.append({"code": "MEDIA_REVIEW_REQUIRED", "field": "images"})
        if "[REDACTED]" in json.dumps(payload):
            errors.append({"code": "SENSITIVE_DATA_REMOVED", "field": "source"})
        if config:
            try:
                compatibility_input = {'devicecompatibility': fields.get('compatibility_declaration', '')}
                compatibility_input.update({field.replace('_', ''): fields[field] for field in COMPATIBILITY_FIELDS if field in fields})
                values, types, devices = parse_compatibility_row(compatibility_input, config)
                attrs.update(values)
                if types:
                    attrs.update(compatibility_mode="universal_device_type", compatible_device_types=types)
                if devices:
                    attrs.update(device_ids=devices, compatibility_update_type="add")
            except (ValidationError, TypeError, AttributeError):
                errors.append({"code": "COMPATIBILITY_REVIEW_REQUIRED", "field": "compatibility_declaration"})
        attrs.update(vendor_company_reference=connection.vendor_company_id)
        if not product:
            attrs.update(company_scope_reference=connection.vendor_company_id, product_type="accessory", status="draft", selling_status="not_for_sale")
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
        fatal_codes = {"OFFER_ALREADY_MANAGED", "REQUIRED_FIELD", "REMOTE_ID_REQUIRED", "CONFLICTING_DUPLICATE", "CONFLICTING_SKU_IDENTITY", "SKU_CHANGE_REQUIRES_REVIEW", "BRAND_CHANGE_REQUIRES_REVIEW", "COMPATIBILITY_REVIEW_REQUIRED", "CATEGORY_MAPPING_CONFLICT"}
        fatal = any(error["code"] in fatal_codes for error in errors)
        if valid and not fatal and not (product and product.status == "active" and errors):
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
            actor_id = getattr(actor, "id", None)
            try:
                linked = process_vendor_product_images(
                    canonical, image_urls, connection.vendor_company_id, actor_id,
                )
                if linked:
                    errors = [e for e in errors if e.get("code") != "MEDIA_REVIEW_REQUIRED"]
            except Exception:
                logger.debug("Vendor image processing deferred for %s", canonical.sku, exc_info=True)
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
        # Every observation is new; retain the existing append-only audit store
        # without adding one extra insert round trip per source row.
        AuditRecord.objects.bulk_create(observations, batch_size=200)
    return counts
