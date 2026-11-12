"""Canonical compatibility reconciliation shared by forward/reverse triggers."""
from copy import deepcopy
import json
import uuid

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.devices.models import Device
from .models import DynamicDropdownConfig, Product, ProductCompatibilityAssertion
from .compatibility_contract import (
    CURRENT_DEVICE_TYPE_CODES, FIELD_OPERATIONS, canonical_field, category_mode,
    capacity_in_gb, configured_type_ids, eligible_devices, normalized_rules,
    product_universal_types,
)
from .compatibility_values import NEGATIVE, normalized_value, normalized_wireless, value_catalog

DERIVED_BASES = {"feature_evidence", "universal_device_type"}


def parse_storage(storage_str):
    value = capacity_in_gb(storage_str)
    return float(value) if value is not None else 0


def _field_matches(field, product, device, catalog):
    rule = normalized_rules(device.device_type.compatibility_rules or {}).get(field, {})
    if rule.get("mode") == "hidden":
        return False
    if rule.get("mode") == "conditional":
        parent = canonical_field(rule.get("condition_field"))
        key = "maximum_supported_storage" if parent == "memory_capacity" else parent
        if str(getattr(device, key or "", "")).casefold() not in {str(value).casefold() for value in rule.get("condition_values", [])}:
            return False
    raw = getattr(product, field, "")
    device_field = "maximum_supported_storage" if field == "memory_capacity" else field
    other = getattr(device, device_field, "")
    if field == "wireless_charging_compatibility":
        if device.device_type.code == "tablet":
            return False
        left = set(normalized_wireless(raw, catalog).split("+")) - {"", NEGATIVE}
        right = set(normalized_wireless(other, catalog).split("+")) - {"", NEGATIVE}
        return bool(left & right)
    left, right = normalized_value(field, raw, catalog), normalized_value(field, other, catalog)
    if left in ("", NEGATIVE, "No") or right in ("", NEGATIVE, "No"):
        return False
    if field == "memory_capacity":
        required, maximum = capacity_in_gb(left), capacity_in_gb(right)
        return required is not None and maximum is not None and required <= maximum
    if field == "bluetooth_compatibility":
        return left == right == "Yes"
    # In particular, Headphone Jack never falls back to Charging Interface.
    return left == right


def check_compatibility(product, device, *, config=None, catalog=None, evidence=None):
    """Feature matching only: entry requirements do not imply comparisons."""
    config = config or DynamicDropdownConfig.objects.filter(field_name="product_category", value=product.product_category).first()
    if not config or config.status != "active" or not device.device_type_id:
        return False
    kind = device.device_type
    if kind.code not in CURRENT_DEVICE_TYPE_CODES or kind.status != "active" or not kind.is_active or not kind.auto_mapping_eligible:
        return False
    if str(kind.id) not in configured_type_ids(config):
        return False
    if category_mode(config.compatibility_mode) not in ("feature_based", "hybrid"):
        return False
    if product.compatibility_mode != "direct_device":
        return False
    catalog = catalog or value_catalog()
    try:
        rules = normalized_rules(config.compatibility_rules or {})
        fields = list(dict.fromkeys(canonical_field(field) for field in config.accessory_fields or []))
        # Writes enforce complete data-entry requirements. Matching reads only
        # assigned comparisons; unrelated informational/retired values cannot
        # supply evidence or disable another valid connection method.
        # Memory cannot qualify from capacity alone or an OR of type/capacity.
        if "memory_capacity" in fields and rules.get("memory_capacity", {}).get("comparison") != "informational" and rules.get("memory_capacity", {}).get("mode") != "hidden" and (
            "storage_expansion_compatibility" not in fields
            or config.match_logic not in ("AND", "match_all")
        ):
            return False
        matches, matched_fields = [], []
        for field in fields:
            if field not in FIELD_OPERATIONS:
                return False
            rule = rules.get(field)
            if not isinstance(rule, dict) or rule.get("mode") == "hidden":
                continue
            operation = rule.get("comparison", FIELD_OPERATIONS[field])
            if operation == "informational":
                continue
            if operation != FIELD_OPERATIONS[field]:
                return False
            if rule.get("mode") == "conditional":
                parent = canonical_field(rule.get("condition_field"))
                value = str(getattr(product, parent or "", "") or "").casefold()
                if value not in {str(item).casefold() for item in rule.get("condition_values", [])}:
                    continue
            try:
                matched = _field_matches(field, product, device, catalog)
            except ValidationError:
                matched = False
            matches.append(matched)
            if matched:
                matched_fields.append(field)
    except (ValidationError, TypeError, ValueError):
        return False
    if not matches:
        return False
    result = all(matches) if config.match_logic in ("AND", "match_all") else any(matches) if config.match_logic in ("OR", "match_any") else False
    if result and evidence is not None:
        evidence.update(comparisons=matched_fields, match_logic=config.match_logic)
    return result


def log_compatibility_change(assertion, previous_status, new_status, actor_id=None,
                             change_source="Auto-Mapping", exclusion_reason=None,
                             exclusion_source=None, previous_evidence=None, device=None):
    """Append to the existing audit spine; a failed audit must not look successful."""
    from apps.audit.models import AuditRecord
    device = device or Device.objects.filter(id=assertion.device_reference).select_related("device_type").first()
    payload = {
        "product_id": str(assertion.product_id), "sku": assertion.product.sku,
        "vendor": str(assertion.product.vendor_company_reference or ""),
        "device_id": str(assertion.device_reference),
        "device_name": str(device) if device else "Device record unavailable",
        "device_type": device.device_type.name if device and device.device_type else None,
        "device_status": device.lifecycle_status if device else None,
        "device_launch_date": str(device.launch_date) if device and device.launch_date else None,
        "previous_mapping_status": previous_status, "new_mapping_status": new_status,
        "before_evidence": previous_evidence, "after_evidence": assertion.match_evidence,
        "match_source": assertion.match_source, "match_reason": assertion.match_reason,
        "exclusion_source": exclusion_source or assertion.exclusion_source,
        "exclusion_reason": exclusion_reason or assertion.exclusion_reason,
        "changed_by": str(actor_id) if actor_id else "System", "change_source": change_source,
    }
    AuditRecord.objects.create(
        event_code="catalog.compatibility.changed", event_description=json.dumps(payload),
        status="success", actor_reference=actor_id, service_trigger_reference=change_source,
        company_scope_reference=assertion.product.company_scope_reference or assertion.product.vendor_company_reference or uuid.UUID(int=0),
        source_module="catalog", source_record_type="ProductCompatibilityAssertion", source_record_id=assertion.id,
    )


def _existing_evidence(assertion):
    evidence = deepcopy(assertion.match_evidence or {})
    basis = assertion.compatibility_basis
    if not evidence:
        source = "feature" if basis == "feature_evidence" else "universal" if basis == "universal_device_type" else "explicit"
        evidence[source] = {
            "active": bool(assertion.is_compatible or assertion.is_excluded or assertion.is_locked) and basis not in ("review_required", "exclusion_only"),
            "basis": basis, "reason": assertion.match_reason or assertion.notes,
        }
    return evidence


def _permitted_sources(product, config):
    if not config or config.status != "active":
        return set()
    mode = category_mode(config.compatibility_mode)
    if product.compatibility_mode == "universal_device_type":
        return {"universal"}
    return {"device_specific": {"explicit"}, "feature_based": {"feature"}, "hybrid": {"explicit", "feature"}}.get(mode, set())


@transaction.atomic
def reconcile_product_compatibility(product, actor_id=None, change_source="Auto-Mapping", *, config=None, catalog=None, device_ids=None, notify=True):
    # Serialize reconciliation for a supplier product, including concurrent
    # product/device updates; the existing pair uniqueness remains authoritative.
    caller_product = product
    product = Product.objects.select_for_update().get(pk=product.pk)
    # Read current committed configuration after taking the product lock. A
    # reverse-remap batch must not replay a stale admin rule over a newer save.
    config = DynamicDropdownConfig.objects.filter(field_name="product_category", value=product.product_category).first()
    catalog = value_catalog()
    allowed = _permitted_sources(product, config)
    category_types = configured_type_ids(config) if config else set()
    scope_types = {str(record.id) for record in product_universal_types(product)} if "universal" in allowed else set()
    rows = ProductCompatibilityAssertion.objects.select_for_update().filter(product=product)
    if device_ids is not None:
        rows = rows.filter(device_reference__in=device_ids)
    existing = {str(row.device_reference): row for row in rows}
    candidates = Device.objects.select_related("device_type", "manufacturer")
    if device_ids is not None:
        candidates = candidates.filter(pk__in=device_ids)
    elif "feature" in allowed or "universal" in allowed:
        candidates = candidates.filter(Q(device_type_id__in=category_types) | Q(pk__in=existing))
    else:
        candidates = candidates.filter(pk__in=existing)
    devices = {str(row.id): row for row in candidates}
    current_ids = {str(value) for value in eligible_devices().filter(pk__in=devices).values_list("id", flat=True)}
    now = timezone.localdate()
    changed = 0
    for reference in sorted(set(devices) | set(existing)):
        device, assertion = devices.get(reference), existing.get(reference)
        evidence = _existing_evidence(assertion) if assertion else {}
        before_evidence = deepcopy(assertion.match_evidence or {}) if assertion else {}
        future = bool(device and device.launch_date and device.launch_date > now)
        valid_type = bool(device and device.device_type and device.device_type.is_active and device.device_type.status == "active" and device.device_type.code in CURRENT_DEVICE_TYPE_CODES and str(device.device_type_id) in category_types)
        candidate = valid_type and (reference in current_ids or (future and device.lifecycle_status in ("inactive", "launching", "announced", "available")))
        feature_details = {}
        feature = bool(candidate and "feature" in allowed and check_compatibility(product, device, config=config, catalog=catalog, evidence=feature_details))
        universal = bool(candidate and "universal" in allowed and str(device.device_type_id) in scope_types and device.device_type.auto_mapping_eligible)
        for source, active, basis, reason in (
            ("feature", feature, "feature_evidence", "Matched configured comparisons: " + ", ".join(feature_details.get("comparisons", [])) if feature else "No current configured feature comparison result supports this mapping."),
            ("universal", universal, "universal_device_type", "Device Type is included in the product's canonical Universal scope." if universal else "Current type scope, category or device eligibility no longer supports this Universal source."),
        ):
            if active or source in evidence:
                evidence[source] = {"active": active, "basis": basis, "reason": reason}
        supporting = [source for source in ("explicit", "feature", "universal") if source in allowed and evidence.get(source, {}).get("active")]
        if not assertion and not supporting:
            continue
        if assertion is None:
            assertion = ProductCompatibilityAssertion(
                product=product, device_reference=reference, is_compatible=False,
                compatibility_basis=evidence[supporting[0]]["basis"],
                vendor_company_reference=product.vendor_company_reference, sku=product.sku,
                created_by=actor_id,
            )
        previous = assertion.match_status if assertion.pk and not assertion._state.adding else "None"
        old_effective = assertion.is_compatible
        if assertion.is_excluded:
            effective, status = False, "Excluded"
        elif assertion.is_locked:
            effective, status = assertion.is_compatible, assertion.match_status
        else:
            effective = bool(supporting and valid_type and reference in current_ids)
            status = "Active" if effective else "Pending" if supporting and future and valid_type else "Archived"
        reason = " + ".join(evidence[source].get("reason", source) for source in supporting)
        if not supporting:
            reason = "No currently permitted matching source remains; historical evidence retained."
        needs_save = assertion._state.adding or before_evidence != evidence or old_effective != effective or assertion.match_status != status
        if not needs_save:
            continue
        assertion.is_compatible, assertion.match_status = effective, status
        assertion.match_evidence, assertion.match_reason = evidence, reason
        if supporting and not assertion.is_locked:
            assertion.compatibility_basis = evidence[supporting[0]]["basis"]
        assertion.match_source = change_source
        assertion.updated_by = actor_id
        assertion.device_status_at_mapping = device.lifecycle_status if device else assertion.device_status_at_mapping
        assertion.device_launch_date_at_mapping = device.launch_date if device else assertion.device_launch_date_at_mapping
        # Use the base save to update readiness once after the atomic batch.
        super(ProductCompatibilityAssertion, assertion).save()
        log_compatibility_change(assertion, previous, status, actor_id, change_source, previous_evidence=before_evidence, device=device)
        changed += 1
    readiness_changed = ProductCompatibilityAssertion.update_product_status(product, notify=False)
    caller_product.compatibility_status = product.compatibility_status
    if notify and (changed or readiness_changed):
        from .services import trigger_catalog_recalculation_for_product
        trigger_catalog_recalculation_for_product(product.id)
    return changed


def run_compatibility_automapping(product, actor_id=None, change_source="Auto-Mapping"):
    return reconcile_product_compatibility(product, actor_id, change_source)


def run_universal_device_type_mapping(product, actor_id=None, change_source="Universal Type Mapping"):
    # Defensive entry-point guard, including callers bypassing serializer clean.
    if product.compatibility_mode != "universal_device_type":
        return 0
    return reconcile_product_compatibility(product, actor_id, change_source)


def run_device_remapping(device, actor_id=None, change_source="System Remap"):
    """The same reconciliation removes stale type/status matches as well as adds."""
    changed = 0
    # Include inactive/mismatched categories and products with old assertions;
    # filtering to the new type would leave stale relationships behind.
    feature_categories = [row.value for row in DynamicDropdownConfig.objects.filter(field_name="product_category")
                          if category_mode(row.compatibility_mode) in ("feature_based", "hybrid") and str(device.device_type_id) in configured_type_ids(row)]
    prior_products = ProductCompatibilityAssertion.objects.filter(device_reference=device.id).values_list("product_id", flat=True)
    affected = Product.objects.filter(Q(product_category__in=feature_categories) |
        Q(compatibility_mode="universal_device_type", universal_type_scopes__device_type_id=device.device_type_id, universal_type_scopes__is_active=True) |
        Q(id__in=prior_products)).distinct()
    for product in affected.order_by("pk").iterator():
        changed += reconcile_product_compatibility(product, actor_id, change_source, device_ids=[device.id])
    return changed
