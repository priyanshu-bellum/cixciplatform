import re
from django.db import transaction
from apps.devices.models import Device
from apps.catalog.models import ProductCompatibilityAssertion, Product, ProductStatus

def parse_storage(storage_str):
    if not storage_str:
        return 0
    s = storage_str.strip().upper()
    # Extract number and unit (GB, TB, MB)
    m = re.match(r'^([\d\.]+)\s*(GB|TB|MB)?$', s)
    if not m:
        return 0
    val = float(m.group(1))
    unit = m.group(2)
    if unit == 'TB':
        return val * 1024
    if unit == 'MB':
        return val / 1024
    # Assume GB by default
    return val

def check_compatibility(product, device):
    """
    Evaluates whether a product is compatible with a device based on category rules.
    """
    from apps.catalog.models import DynamicDropdownConfig
    category = product.product_category
    if not category:
        return False
        
    cat_cfg = DynamicDropdownConfig.objects.filter(field_name="product_category", value=category).first()
    if not cat_cfg or cat_cfg.status != 'active':
        return False
        
    if not device.device_type or device.device_type.status != 'active':
        return False
        
    # Check matching matrix check
    eligible_codes = [c.lower() for c in (cat_cfg.eligible_device_types or [])]
    d_type_code = device.device_type.code.lower() if device.device_type.code else ""
    if d_type_code not in eligible_codes:
        return False

    # Check matching rules dynamically
    def check_field_compatibility(field, p_val, device):
        if not p_val or p_val == "Not Compatible":
            return False
            
        if field == "bluetooth_compatibility":
            return p_val == "Yes" and device.bluetooth_compatibility == "Yes"
            
        elif field == "headphone_jack_compatibility":
            return device.headphone_jack_compatibility == p_val or device.compatible_charging_interface == p_val
            
        elif field == "compatible_charging_interface":
            return device.compatible_charging_interface == p_val
            
        elif field == "wireless_charging_compatibility":
            p_wire = [w.strip() for w in p_val.split('+') if w.strip() and w.strip() != 'Not Compatible']
            d_wire = [w.strip() for w in (device.wireless_charging_compatibility or "").split('+') if w.strip() and w.strip() != 'Not Compatible']
            if p_wire and d_wire:
                return any(w in d_wire for w in p_wire)
            return False
            
        elif field == "storage_expansion_compatibility":
            return device.storage_expansion_compatibility == p_val
            
        elif field == "memory_capacity":
            p_cap = parse_storage(p_val)
            d_max = parse_storage(device.maximum_supported_storage)
            if p_cap == 0 or d_max == 0:
                return False
            return p_cap <= d_max
            
        elif field == "compatible_watch_case_size":
            return device.compatible_watch_case_size == p_val
            
        return False

    fields_to_check = cat_cfg.accessory_fields or []
    if not fields_to_check:
        return False

    matches = []
    for f in fields_to_check:
        p_val = getattr(product, f, None)
        # Only check active/enabled rules or non-empty/non-hidden fields
        rule = cat_cfg.compatibility_rules.get(f) if cat_cfg.compatibility_rules else None
        mode = rule.get("mode", "optional") if rule else "optional"
        if mode == "hidden":
            continue
        matches.append(check_field_compatibility(f, p_val, device))

    if not matches:
        return False

    if cat_cfg.match_logic == "AND":
        return all(matches)
    else:
        return any(matches)

def log_compatibility_change(assertion, previous_status, new_status, actor_id=None, change_source="Auto-Mapping", exclusion_reason=None, exclusion_source=None):
    from apps.audit.models import AuditRecord
    from apps.devices.models import Device
    from django.utils import timezone
    import json
    
    # Retrieve device
    try:
        device = Device.objects.get(id=assertion.device_reference)
        device_name = device.name
        device_type_name = device.device_type.name if device.device_type else "Unknown"
        device_status = device.lifecycle_status
        device_launch_date = str(device.launch_date) if device.launch_date else "None"
    except Exception:
        device_name = "Unknown"
        device_type_name = "Unknown"
        device_status = "Unknown"
        device_launch_date = "None"

    # Affected buyers check
    affected_buyers = "None"
    if previous_status != new_status:
        affected_buyers = "All buyers with this device in portfolio"

    payload = {
        "product_id": str(assertion.product_id),
        "vendor": str(assertion.product.brand or ""),
        "sku": assertion.product.sku,
        "device_id": str(assertion.device_reference),
        "device_name": device_name,
        "device_type": device_type_name,
        "device_status": device_status,
        "device_launch_date": device_launch_date,
        "previous_mapping_status": previous_status,
        "new_mapping_status": new_status,
        "match_source": assertion.match_source,
        "match_reason": assertion.match_reason,
        "exclusion_source": exclusion_source or assertion.exclusion_source or "None",
        "exclusion_reason": exclusion_reason or assertion.exclusion_reason or "None",
        "changed_by": str(actor_id) if actor_id else "System",
        "change_source": change_source,
        "date_time": str(timezone.now()),
        "affected_buyers": affected_buyers
    }

    company_scope = assertion.product.company_scope_reference
    if not company_scope:
        company_scope = "00000000-0000-0000-0000-000000000000"

    try:
        AuditRecord.objects.create(
            event_code="catalog.compatibility.changed",
            event_description=json.dumps(payload),
            status="success",
            actor_reference=actor_id,
            service_trigger_reference=change_source,
            company_scope_reference=company_scope,
            source_module="catalog",
            source_record_type="ProductCompatibilityAssertion",
            source_record_id=assertion.id,
        )
    except Exception as e:
        print(f"Error logging compatibility change: {e}")

def run_compatibility_automapping(product, actor_id=None, change_source="Auto-Mapping"):
    """
    Calculates compatible device mappings for a product based on its category-specific attributes.
    Preserves existing exclusions and locked assertions.
    """
    from apps.catalog.models import DynamicDropdownConfig
    category = product.product_category
    if not category:
        return

    cat_cfg = DynamicDropdownConfig.objects.filter(field_name="product_category", value=category).first()
    if not cat_cfg or cat_cfg.status != 'active':
        return

    # If it is explicit compatibility mode:
    if cat_cfg.compatibility_mode == "explicit":
        cnt = ProductCompatibilityAssertion.objects.filter(product=product, is_compatible=True, is_excluded=False).count()
        status = "complete" if cnt >= 1 else "incomplete"
        if product.compatibility_status != status:
            product.compatibility_status = status
            Product.objects.filter(id=product.id).update(compatibility_status=status)
        return

    # Find matching devices - only active device types, non-retired and launch date <= now
    from django.utils import timezone
    now_date = timezone.now().date()
    all_devices = Device.objects.filter(
        device_type__status='active'
    ).exclude(
        lifecycle_status='retired'
    )
    all_devices = [d for d in all_devices if not (d.launch_date and d.launch_date > now_date)]

    matched_device_ids = set()
    device_map = {}
    for dev in all_devices:
        if check_compatibility(product, dev):
            matched_device_ids.add(dev.id)
            device_map[dev.id] = dev

    # Use transactions for atomic updates
    with transaction.atomic():
        # Get existing assertions
        existing_assertions = {
            a.device_reference: a for a in ProductCompatibilityAssertion.objects.filter(product=product)
        }

        # Assertions to delete: devices that do not match and are not locked/excluded
        for dev_ref, assertion in list(existing_assertions.items()):
            if dev_ref not in matched_device_ids:
                if not assertion.is_locked and not assertion.is_excluded:
                    prev_status = assertion.match_status
                    assertion.match_status = "Archived"
                    assertion.is_compatible = False
                    log_compatibility_change(assertion, prev_status, "Archived", actor_id=actor_id, change_source=change_source)
                    assertion.delete()
                    existing_assertions.pop(dev_ref)

        # Assertions to create/update: matched devices
        for dev_id in matched_device_ids:
            dev = device_map[dev_id]
            if dev_id in existing_assertions:
                assertion = existing_assertions[dev_id]
                # If it's excluded or locked, preserve its state
                if not assertion.is_excluded and not assertion.is_locked:
                    if not assertion.is_compatible or assertion.match_status != "Active":
                        prev_status = assertion.match_status
                        assertion.is_compatible = True
                        assertion.match_status = "Active"
                        assertion.device_status_at_mapping = dev.lifecycle_status
                        assertion.device_launch_date_at_mapping = dev.launch_date
                        assertion.match_source = change_source
                        assertion.match_reason = f"Auto-mapped based on category {product.product_category} matching rules."
                        assertion.save(update_fields=[
                            "is_compatible", "match_status", "device_status_at_mapping",
                            "device_launch_date_at_mapping", "match_source", "match_reason"
                        ])
                        log_compatibility_change(assertion, prev_status, "Active", actor_id=actor_id, change_source=change_source)
            else:
                # Create new compatibility assertion
                assertion = ProductCompatibilityAssertion.objects.create(
                    product=product,
                    device_reference=dev_id,
                    is_compatible=True,
                    compatibility_basis="feature_evidence",
                    notes="Auto-mapped by Compatibility Engine",
                    vendor_company_reference=product.vendor_company_reference,
                    sku=product.sku,
                    device_status_at_mapping=dev.lifecycle_status,
                    device_launch_date_at_mapping=dev.launch_date,
                    match_source=change_source,
                    match_reason=f"Auto-mapped based on category {product.product_category} matching rules.",
                    match_status="Active"
                )
                log_compatibility_change(assertion, "None", "Active", actor_id=actor_id, change_source=change_source)

        # Update compatibility status
        cnt = ProductCompatibilityAssertion.objects.filter(product=product, is_compatible=True, is_excluded=False).count()
        status = "complete" if cnt >= 1 else "incomplete"
        if product.compatibility_status != status:
            product.compatibility_status = status
            Product.objects.filter(id=product.id).update(compatibility_status=status)

def run_device_remapping(device, actor_id=None, change_source="System Remap"):
    """
    Runs reverse compatibility matching when a device is created or updated.
    Checks all products in auto-mapped categories against this device.
    """
    from apps.catalog.models import DynamicDropdownConfig
    from django.utils import timezone
    
    # Only active, non-explicit (feature_based/category_rule_based etc) categories
    active_configs = DynamicDropdownConfig.objects.filter(field_name="product_category", status="active").exclude(compatibility_mode="explicit")
    auto_mapped_categories = [cfg.value for cfg in active_configs]
    products = Product.objects.filter(product_category__in=auto_mapped_categories)
    
    is_active_device = (device.device_type and device.device_type.status == 'active' and device.lifecycle_status != 'retired')
    is_future = device.launch_date and device.launch_date > timezone.now().date()
    
    with transaction.atomic():
        for product in products:
            is_compat = is_active_device and not is_future and check_compatibility(product, device)
            # Find existing assertion for this product and device
            assertion = ProductCompatibilityAssertion.objects.filter(product=product, device_reference=device.id).first()
            
            if is_compat:
                if not assertion:
                    # Create assertion
                    assertion = ProductCompatibilityAssertion.objects.create(
                        product=product,
                        device_reference=device.id,
                        is_compatible=True,
                        compatibility_basis="feature_evidence",
                        notes="Auto-mapped by reverse device remapping",
                        vendor_company_reference=product.vendor_company_reference,
                        sku=product.sku,
                        device_status_at_mapping=device.lifecycle_status,
                        device_launch_date_at_mapping=device.launch_date,
                        match_source=change_source,
                        match_reason=f"Auto-mapped based on category {product.product_category} matching rules.",
                        match_status="Active"
                    )
                    log_compatibility_change(assertion, "None", "Active", actor_id=actor_id, change_source=change_source)
                else:
                    if not assertion.is_excluded and not assertion.is_locked:
                        if not assertion.is_compatible or assertion.match_status != "Active":
                            prev_status = assertion.match_status
                            assertion.is_compatible = True
                            assertion.match_status = "Active"
                            assertion.device_status_at_mapping = device.lifecycle_status
                            assertion.device_launch_date_at_mapping = device.launch_date
                            assertion.match_source = change_source
                            assertion.match_reason = f"Auto-mapped based on category {product.product_category} matching rules."
                            assertion.save(update_fields=[
                                "is_compatible", "match_status", "device_status_at_mapping",
                                "device_launch_date_at_mapping", "match_source", "match_reason"
                            ])
                            log_compatibility_change(assertion, prev_status, "Active", actor_id=actor_id, change_source=change_source)
            else:
                # Not compatible or device is retired/not active
                if assertion:
                    if not assertion.is_locked and not assertion.is_excluded:
                        prev_status = assertion.match_status
                        assertion.match_status = "Archived"
                        assertion.is_compatible = False
                        log_compatibility_change(assertion, prev_status, "Archived", actor_id=actor_id, change_source=change_source)
                        assertion.delete()
                        
            # Recalculate status for product
            cnt = ProductCompatibilityAssertion.objects.filter(product=product, is_compatible=True, is_excluded=False).count()
            status = "complete" if cnt >= 1 else "incomplete"
            if product.compatibility_status != status:
                product.compatibility_status = status
                Product.objects.filter(id=product.id).update(compatibility_status=status)
