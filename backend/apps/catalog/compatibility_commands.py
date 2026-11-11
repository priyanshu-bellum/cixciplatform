"""Authorized explicit selections and exclusion controls; never delete history."""
from copy import deepcopy
import uuid

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from apps.devices.models import Device
from apps.tenant.services import check_access
from .models import DynamicDropdownConfig, Product, ProductCompatibilityAssertion
from .compatibility_contract import CURRENT_DEVICE_TYPE_CODES, category_mode, configured_type_ids
from .compatibility_engine import log_compatibility_change, reconcile_product_compatibility

EXCLUSION_REASONS = {"physical_mismatch", "connector_incompatibility", "power_spec_conflict", "firmware_os_limitation", "performance_issue", "regulatory_unsupported", "other"}


def authorize_edit(actor, product):
    result = check_access(actor, "catalog.product.update", company_id=product.company_scope_reference, resource_id=product.id)
    company = getattr(actor, "company", None)
    if not result.granted or (result.reason != "cixci_admin" and (not company or company.company_type != "vendor")):
        raise PermissionDenied("Compatibility changes require authorized supplier scope or CIXCI System Admin authority.")
    return result.reason == "cixci_admin"


def canonical_device(value):
    try:
        identifier = uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        raise ValidationError({"device_reference": "Select an existing canonical Device ID."}) from None
    device = Device.objects.filter(id=identifier).select_related("device_type").first()
    if device is None:
        raise ValidationError({"device_reference": "The canonical device record does not exist."})
    return device


@transaction.atomic
def update_explicit_selections(product, items, actor, *, update_type="replace", basis="manual_assertion", change_source="Manual Selection"):
    admin = authorize_edit(actor, product)
    product = Product.objects.select_for_update().get(pk=product.pk)
    if update_type not in ("add", "remove", "replace"):
        raise ValidationError({"update_type": "Use add, remove or replace."})
    if not isinstance(items, list):
        raise ValidationError({"assertions": "Supply a list of canonical device selections."})
    if update_type == "replace" and not admin and (product.status == "active" or product.is_tied_to_activity):
        raise ValidationError({"update_type": "Replacing compatibility on a live or previously exported/sold product requires CIXCI Admin approval. Use Add or a reasoned exclusion."})
    if update_type == "remove":
        selections = []
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("exclusion_reason"), str) or item.get("exclusion_reason") not in EXCLUSION_REASONS:
                raise ValidationError({"exclusion_reason": "Remove requires an approved exclusion reason for every device."})
            if not isinstance(item.get("notes", ""), str):
                raise ValidationError({"notes": "Use plain text."})
            if item["exclusion_reason"] == "other" and not item.get("notes", "").strip():
                raise ValidationError({"notes": "Other requires descriptive notes."})
            device = canonical_device(item.get("device_id") or item.get("device_reference"))
            selections.append((device, item))
        for device, item in selections:
            apply_mapping_control(product, actor, "exclude", device.id, reason=item["exclusion_reason"], notes=item.get("notes", ""), reconcile=False)
        return reconcile_product_compatibility(product, actor.id, change_source)
    config = DynamicDropdownConfig.objects.filter(field_name="product_category", value=product.product_category).first()
    if update_type != "remove" and (not config or config.status != "active" or category_mode(config.compatibility_mode) not in ("device_specific", "hybrid") or product.compatibility_mode != "direct_device"):
        raise ValidationError({"device_ids": "Explicit model selections require a Device Specific or Hybrid category."})
    allowed_types = configured_type_ids(config) if config else set()
    selected = {}
    for item in items:
        item = {"device_id": item} if isinstance(item, (str, uuid.UUID)) else item
        if not isinstance(item, dict):
            raise ValidationError({"assertions": "Each selection needs a canonical device reference."})
        device = canonical_device(item.get("device_id") or item.get("device_reference"))
        compatible = item.get("is_compatible", True)
        if not isinstance(compatible, bool):
            raise ValidationError({"is_compatible": "Use a JSON boolean."})
        if update_type != "remove" and (str(device.device_type_id) not in allowed_types or device.device_type.code not in CURRENT_DEVICE_TYPE_CODES or device.device_type.status != "active" or not device.device_type.is_active):
            raise ValidationError({"device_ids": "A selected device is outside the category's approved current types."})
        notes = item.get("notes", "")
        if not isinstance(notes, str):
            raise ValidationError({"notes": "Use plain text."})
        selected[str(device.id)] = (device, compatible, notes)
    rows = {str(row.device_reference): row for row in ProductCompatibilityAssertion.objects.select_for_update().filter(product=product)}
    for reference, row in rows.items():
        retire = (update_type == "replace" and reference not in selected) or (update_type == "remove" and reference in selected)
        if not retire or row.is_excluded or row.is_locked:
            continue
        before = deepcopy(row.match_evidence or {})
        evidence = deepcopy(before)
        explicit = evidence.get("explicit")
        if explicit is None and row.compatibility_basis not in ("feature_evidence", "universal_device_type", "review_required"):
            explicit = {"basis": row.compatibility_basis, "reason": row.notes, "active": row.is_compatible}
        if not explicit:
            continue
        evidence["explicit"] = {**explicit, "active": False}
        row.match_evidence, row.updated_by = evidence, actor.id
        super(ProductCompatibilityAssertion, row).save()
        log_compatibility_change(row, row.match_status, row.match_status, actor.id, change_source, previous_evidence=before)
    if update_type != "remove":
        for reference, (device, compatible, notes) in selected.items():
            row = rows.get(reference)
            if row and (row.is_locked or row.is_excluded):
                continue
            if row is None:
                row = ProductCompatibilityAssertion(product=product, device_reference=device.id, is_compatible=False, compatibility_basis=basis, match_status="Pending", vendor_company_reference=product.vendor_company_reference, sku=product.sku, created_by=actor.id)
            before = deepcopy(row.match_evidence or {})
            row.match_evidence = {**before, "explicit": {"active": compatible, "basis": basis, "reason": notes or "Explicit canonical model selection."}}
            row.notes, row.updated_by = notes, actor.id
            row.compatibility_basis = basis
            super(ProductCompatibilityAssertion, row).save()
            log_compatibility_change(row, row.match_status, row.match_status, actor.id, change_source, previous_evidence=before)
    return reconcile_product_compatibility(product, actor.id, change_source)


@transaction.atomic
def apply_mapping_control(product, actor, action, device_reference, *, reason=None, notes="", reconcile=True):
    admin = authorize_edit(actor, product)
    Product.objects.select_for_update().get(pk=product.pk)
    if action not in ("exclude", "restore", "lock", "convert_to_admin_exclusion"):
        raise ValidationError({"action": "Unknown mapping control."})
    device = canonical_device(device_reference)
    row = ProductCompatibilityAssertion.objects.select_for_update().filter(product=product, device_reference=device.id).first()
    previous = row.match_status if row else "None"
    before = deepcopy(row.match_evidence or {}) if row else {}
    if action in ("lock", "convert_to_admin_exclusion") and not admin:
        raise PermissionDenied("This mapping control requires CIXCI System Admin authority.")
    if action == "exclude":
        if not isinstance(reason, str) or reason not in EXCLUSION_REASONS or not isinstance(notes, str) or (reason == "other" and not notes.strip()):
            raise ValidationError({"exclusion_reason": "Choose an approved reason; Other requires descriptive notes."})
        if row and (row.is_locked or row.exclusion_type == "admin") and not admin:
            raise PermissionDenied("Vendor actions cannot override an admin exclusion or lock.")
        if row is None:
            row = ProductCompatibilityAssertion(product=product, device_reference=device.id, is_compatible=False, compatibility_basis="review_required", vendor_company_reference=product.vendor_company_reference, sku=product.sku)
        row.is_compatible, row.is_excluded, row.match_status = False, True, "Excluded"
        row.exclusion_type = row.exclusion_source = "admin" if admin else "vendor"
        row.exclusion_reason, row.notes = reason, notes
    elif row is None:
        raise ValidationError({"device_reference": "Select an existing mapping for this action."})
    elif action == "restore":
        if not row.is_excluded:
            raise ValidationError({"device_reference": "This mapping is not excluded."})
        if not admin and (row.is_locked or row.exclusion_type != "vendor"):
            raise PermissionDenied("Vendors may restore only their unlocked vendor exclusions.")
        row.is_excluded, row.exclusion_type = False, None
        row.exclusion_source = row.exclusion_reason = None
    elif action == "lock":
        row.is_locked = True
    else:
        if not row.is_excluded:
            raise ValidationError({"device_reference": "Only an existing exclusion can be converted."})
        row.is_compatible, row.is_excluded = False, True
        row.exclusion_type = row.exclusion_source = "admin"
    relock = action == "restore" and row.is_locked and admin
    if relock:
        row.is_locked = False
    row.updated_by = actor.id
    super(ProductCompatibilityAssertion, row).save()
    if reconcile:
        reconcile_product_compatibility(product, actor.id, "Manual Override")
        row.refresh_from_db()
    if relock:
        row.is_locked = True
        super(ProductCompatibilityAssertion, row).save(update_fields=["is_locked", "updated_at"])
    log_compatibility_change(row, previous, row.match_status, actor.id, "Manual Override", previous_evidence=before)
    return row
