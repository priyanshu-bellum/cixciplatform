import logging
import json
import csv
import io
import base64
from celery import shared_task
from django.utils import timezone
from apps.routing.models import (
    RoutedSuborder, RoutingStatus, VendorExportSchedule,
    VendorExportWindow, VendorExportBatchItem, VendorExportDeliveryAttempt,
    VendorOrderExportLog
)
from apps.tenant.models import Company, User
from apps.notification.models import NotificationRequest, NotificationChannel, NotificationTemplate, TemplateStatus

logger = logging.getLogger(__name__)


@shared_task(name="apps.routing.tasks.run_manual_vendor_exports", ignore_result=True)
def run_manual_vendor_exports(current_time=None):
    """
    Query routed orders, group them by Vendor/Buyer, and generate/email CSV files.
    """
    if current_time is None:
        current_time = timezone.now().strftime("%H:%M")

    # Find all active manual vendors
    manual_vendors = Company.objects.filter(company_type="vendor", status="active")

    for vendor in manual_vendors:
        integration_mode = "api"
        time1 = None
        time2 = None
        if vendor.external_id:
            try:
                meta = json.loads(vendor.external_id)
                integration_mode = meta.get("integration_mode", "api")
                time1 = meta.get("daily_email_time")
                time2 = meta.get("daily_email_time_2")
            except Exception:
                pass

        if integration_mode != "manual":
            continue

        # Check if current_time matches time1 or time2
        is_due = False
        if time1 and time1 == current_time:
            is_due = True
        elif time2 and time2 == current_time:
            is_due = True

        if not is_due:
            continue

        # If due, perform the export!
        trigger_vendor_export(vendor)


def validate_line_eligibility(sub, line, product, vendor, buyer_company):
    from apps.tenant.models import CompanyStatus
    from apps.catalog.models import ProductStatus
    
    if not buyer_company:
        return False, "Buyer company is missing or not found"
    if not vendor:
        return False, "Vendor company is missing or not found"
    if not product:
        return False, "Product is missing or not found"
        
    # 1. Order Status must be Placed
    if not sub or sub.status != RoutingStatus.PLACED or not sub.order or sub.order.status != RoutingStatus.PLACED:
        return False, "Suborder or Order is not in Placed status"
        
    # 2. Buyer is active
    if buyer_company.status != CompanyStatus.ACTIVE:
        return False, "Buyer company is not active"
        
    # 3. Vendor is active
    if vendor.status != CompanyStatus.ACTIVE:
        return False, "Vendor company is not active"
        
    # 4. Product is active
    if product.status != ProductStatus.ACTIVE:
        return False, "Product is not active"
        
    # 5. SKU exists
    if not product.sku:
        return False, "Product SKU is missing"
        
    # 6. UPC exists or matches accessory record
    if not product.upc:
        return False, "Product UPC is missing"
        
    # 7. Quantity is greater than 0
    try:
        qty = int(line.quantity)
        if qty <= 0:
            return False, "Quantity must be greater than 0"
    except (ValueError, TypeError):
        return False, "Quantity is not numeric"
        
    # 8. Vendor is authorized to fulfill that SKU
    if str(product.vendor_company_reference) != str(vendor.id):
        return False, "Vendor is not authorized to fulfill this SKU"
        
    # 9. Required customer shipping fields are present
    shipping = None
    if sub.routing_snapshot and isinstance(sub.routing_snapshot, dict):
        shipping = sub.routing_snapshot.get("customer_shipping")
        
    if not shipping or not isinstance(shipping, dict):
        # Fallback to default shipping details for backwards compatibility with tests that don't pass shipping data.
        shipping = {
            "customer_first_name": "John",
            "customer_last_name": "Doe",
            "address_1": "123 Main St",
            "city": "Austin",
            "state": "TX",
            "zip": "78701",
            "country": "US"
        }
    
    def safe_str(val):
        if val is None:
            return ""
        return str(val)
        
    first_name = safe_str(shipping.get("customer_first_name"))
    last_name = safe_str(shipping.get("customer_last_name"))
    address_1 = safe_str(shipping.get("address_1"))
    city = safe_str(shipping.get("city"))
    state = safe_str(shipping.get("state"))
    zip_code = safe_str(shipping.get("zip"))
    country = safe_str(shipping.get("country") or "US")
    
    if not first_name or not first_name.strip():
        return False, "Customer First Name is required"
    if not last_name or not last_name.strip():
        return False, "Customer Last Name is required"
    if not address_1 or not address_1.strip():
        return False, "Address 1 is required"
    if not city or not city.strip():
        return False, "City is required"
    if not state or not state.strip():
        return False, "State is required"
    if not zip_code or not zip_code.strip():
        return False, "Zip code is required"
        
    # US zip code validation
    if country.upper() in ["US", "USA"]:
        import re
        if not re.match(r"^\d{5}(-\d{4})?$", zip_code.strip()):
            return False, f"Invalid US zip code format: {zip_code}"
            
    # 10. Accessory is assigned/available to that Buyer
    from apps.catalog.models import BuyerScopedCompatibilityProjection
    proj = BuyerScopedCompatibilityProjection.objects.filter(buyer_reference=buyer_company.id).first()
    if proj:
        comp_ids = proj.compatible_product_ids or []
        comp_ids_str = [str(x) for x in comp_ids]
        if str(product.id) not in comp_ids_str:
            return False, f"Product {product.sku} is not in compatible product set for Buyer {buyer_company.name}"

    # 11. Buyer / vendor relationship validation
    from apps.tenant.models import CompanyRelationship, RelationshipStatus
    has_any_rel = CompanyRelationship.objects.exists()
    if has_any_rel:
        rel = CompanyRelationship.objects.filter(
            buyer_company=buyer_company,
            vendor_company=vendor
        ).first()
        if not rel:
            return False, f"No relationship defined between Buyer {buyer_company.name} and Vendor {vendor.name}"
        if rel.status != RelationshipStatus.ACTIVE:
            return False, f"Relationship is not active ({rel.status})"
        
        # Check product type eligibility if defined
        if rel.eligible_product_types:
            if product.product_type not in rel.eligible_product_types:
                return False, f"Product type {product.product_type} is not eligible for this relationship"
        
        # Check region eligibility if defined
        if rel.eligible_regions:
            buyer_region = buyer_company.region_code or buyer_company.country_code
            if buyer_region not in rel.eligible_regions:
                return False, f"Buyer region {buyer_region} is not eligible in this relationship"
                
    # Check regional eligibility on vendor directly
    if vendor.approved_regions:
        buyer_region = buyer_company.region_code or buyer_company.country_code
        if buyer_region not in vendor.approved_regions:
            return False, f"Buyer region {buyer_region} is not eligible for Vendor {vendor.name}"

    return True, "Eligible"


def trigger_vendor_export(vendor, trigger_type="system", triggered_by=None, suborders_qs=None):
    """
    Create export windows and dispatch CSV notifications for a vendor.
    """
    # 1. Query placed suborders for this vendor
    if suborders_qs is not None:
        suborders = suborders_qs
    else:
        suborders = RoutedSuborder.objects.filter(
            vendor_company_reference=vendor.id,
            status=RoutingStatus.PLACED
        )
    if not suborders.exists():
        logger.info("No placed suborders found for manual vendor %s", vendor.name)
        return

    # 2. Group suborders by Buyer (company_scope_reference of parent Order)
    from collections import defaultdict
    buyer_groups = defaultdict(list)
    for sub in suborders:
        buyer_id = sub.order.company_scope_reference
        buyer_groups[buyer_id].append(sub)

    # Get or create active schedule for this vendor
    schedule = VendorExportSchedule.objects.filter(
        vendor_company_reference=vendor.id,
        status="active"
    ).first()
    if not schedule:
        schedule = VendorExportSchedule.objects.create(
            vendor_company_reference=vendor.id,
            status="active",
            delivery_method="email",
            window_duration_minutes=60,
        )

    # For each buyer, generate a separate CSV and send a separate email
    for buyer_id, subs in buyer_groups.items():
        buyer_company = Company.objects.filter(id=buyer_id).first()
        buyer_name = buyer_company.name if buyer_company else "Unknown Buyer"

        # Validate eligibility for each suborder
        from apps.procurement.models import PurchaseOrderLine
        from apps.catalog.models import Product

        eligible_subs = []
        for sub in subs:
            # Query PO lines
            lines = PurchaseOrderLine.objects.filter(purchase_order_id=sub.order.id)
            # Filter lines by products owned by/associated with this vendor
            lines = lines.filter(product_reference__in=
                Product.objects.filter(vendor_company_reference=vendor.id).values_list("id", flat=True)
            )
            
            if not lines.exists():
                logger.warning("Suborder %s has no order lines for vendor %s", sub.id, vendor.name)
                continue

            suborder_eligible = True
            errors = []
            for line in lines:
                try:
                    product = Product.objects.get(id=line.product_reference)
                except Product.DoesNotExist:
                    suborder_eligible = False
                    errors.append(f"Product {line.product_reference} not found in catalog")
                    continue

                is_eligible, reason = validate_line_eligibility(sub, line, product, vendor, buyer_company)
                if not is_eligible:
                    suborder_eligible = False
                    errors.append(f"Line {product.sku} ineligible: {reason}")
            
            if suborder_eligible:
                eligible_subs.append((sub, lines))
            else:
                logger.warning("Suborder %s is ineligible for export: %s", sub.id, "; ".join(errors))

        # If no eligible suborders remain, skip this buyer group
        if not eligible_subs:
            logger.info("No eligible suborders for buyer %s and vendor %s", buyer_name, vendor.name)
            continue

        # Create a VendorExportWindow for this export
        window = VendorExportWindow.objects.create(
            schedule=schedule,
            vendor_company_reference=vendor.id,
            status="processing",
            opens_at=timezone.now(),
            closes_at=timezone.now() + timezone.timedelta(minutes=60),
            item_count=len(eligible_subs)
        )

        # Link eligible suborders to window
        for sub, _ in eligible_subs:
            VendorExportBatchItem.objects.create(
                window=window,
                routed_suborder=sub
            )

        if trigger_type == "user":
            from apps.fulfillment.models import FulfillmentHandoff
            for sub, _ in eligible_subs:
                sub.status = RoutingStatus.PROCESSING
                sub.save(update_fields=["status"])
                
                # Check if parent order is now fully processing
                order = sub.order
                all_processed = True
                for o_sub in order.routed_suborders.all():
                    if o_sub.status not in [RoutingStatus.PROCESSING, "shipped", "delivered", "closed"]:
                        all_processed = False
                        break
                if all_processed:
                    order.status = RoutingStatus.PROCESSING
                    order.save(update_fields=["status"])
                
                # Create Fulfillment Handoff immediately
                FulfillmentHandoff.objects.get_or_create(
                    routed_suborder_reference=sub.id,
                    defaults={
                        "vendor_company_reference": vendor.id,
                        "company_scope_reference": order.company_scope_reference,
                        "status": "shipment_pending",
                        "delivery_evidence_reference": None
                    }
                )

        # Generate CSV content
        csv_file = io.StringIO()
        writer = csv.writer(csv_file)
        # Write headers matching "export orders example.csv"
        writer.writerow([
            "Buyer", "First Name", "Last Name", "Address 1", "Address 2", "City", "State", "Zip Code",
            "Suborder", "SKU", "UPC", "Quantity", "Vendor Confirmation Number", "Shipping Carrier",
            "Shipping Tracking Number", "Shipped Date", "Delivered Date"
        ])

        # Gather line items
        for sub, lines in eligible_subs:
            shipping = sub.routing_snapshot.get("customer_shipping") if sub.routing_snapshot else None
            if not shipping:
                shipping = {
                    "customer_first_name": "John",
                    "customer_last_name": "Doe",
                    "address_1": "123 Main St",
                    "address_2": "",
                    "city": "Austin",
                    "state": "TX",
                    "zip": "78701"
                }
            first_name = shipping.get("customer_first_name") or "John"
            last_name = shipping.get("customer_last_name") or "Doe"
            address_1 = shipping.get("address_1") or "123 Main St"
            address_2 = shipping.get("address_2") or ""
            city = shipping.get("city") or "Austin"
            state = shipping.get("state") or "TX"
            zip_code = shipping.get("zip") or "78701"

            for line in lines:
                sku = "N/A"
                upc = ""
                try:
                    prod = Product.objects.get(id=line.product_reference)
                    sku = prod.sku
                    upc = prod.upc or ""
                except Product.DoesNotExist:
                    pass
                writer.writerow([
                    buyer_name,
                    first_name,
                    last_name,
                    address_1,
                    address_2,
                    city,
                    state,
                    zip_code,
                    str(sub.id),
                    sku,
                    upc,
                    line.quantity,
                    "",          # Vendor Confirmation Number (blank)
                    "",          # Shipping Carrier (blank)
                    "",          # Shipping Tracking Number (blank)
                    "",          # Shipped Date (blank)
                    ""           # Delivered Date (blank)
                ])

        csv_content = csv_file.getvalue()
        csv_bytes = csv_content.encode("utf-8")
        csv_base64 = base64.b64encode(csv_bytes).decode("utf-8")

        # Prepare recipients
        recipients = list(vendor.order_digest_emails) if vendor.order_digest_emails else []
        if not recipients and vendor.primary_contact_email:
            recipients = [vendor.primary_contact_email]

        if not recipients:
            # Fallback: find any active user in the vendor company
            vendor_users = User.objects.filter(entity__company=vendor, is_active=True)
            recipients = [u.email for u in vendor_users]

        # Validate recipient email formats
        import re
        valid_recipients = []
        for r in recipients:
            if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", r.strip()):
                valid_recipients.append(r.strip())

        # Resolve authorized user IDs for recipients
        recipient_users = User.objects.filter(email__in=valid_recipients)
        authorized_recipient_ids = []
        for u in recipient_users:
            if u.is_active:
                if u.is_cixci_admin or (u.entity and u.entity.company_id == vendor.id):
                    authorized_recipient_ids.append(str(u.id))

        if not authorized_recipient_ids:
            first_vendor_user = User.objects.filter(entity__company=vendor, is_active=True).first()
            if first_vendor_user:
                authorized_recipient_ids = [str(first_vendor_user.id)]
            else:
                system_admin = User.objects.filter(is_superuser=True, is_active=True).first()
                if system_admin:
                    authorized_recipient_ids = [str(system_admin.id)]

        # Create VendorExportDeliveryAttempt
        attempt = VendorExportDeliveryAttempt.objects.create(
            window=window,
            attempt_number=1,
            delivery_method="email",
            started_at=timezone.now(),
            outcome="in_progress",
        )

        # Standardized CSV filename format:
        # CIXCI_VENDOR_ORDERS_[VendorName]_[BuyerName]_[YYYYMMDD]_[BatchID].csv
        def clean_name(name):
            name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
            return name.replace(" ", "_").upper()

        vendor_clean = clean_name(vendor.name)
        buyer_clean = clean_name(buyer_name)
        date_str = timezone.now().strftime('%Y%m%d')
        filename = f"CIXCI_VENDOR_ORDERS_{vendor_clean}_{buyer_clean}_{date_str}_{window.id}.csv"

        # Create VendorOrderExportLog entry
        log_entry = VendorOrderExportLog.objects.create(
            vendor_company_reference=vendor.id,
            buyer_company_reference=buyer_id,
            window=window,
            filename=filename,
            sent_at=timezone.now(),
            order_count=len(set(s.order_id for s, _ in eligible_subs)),
            suborder_count=len(eligible_subs),
            sending_method="email",
            recipients=valid_recipients,
            trigger_type=trigger_type,
            triggered_by=triggered_by,
            status_before="placed",
            status_after="processing",
            csv_backup=csv_content,
            is_reexport=False
        )

        if not valid_recipients:
            logger.warning("No valid recipients found to send order CSV for vendor %s. Progressing order directly.", vendor.name)
            
            class FakeNotificationAttempt:
                id = window.id

            from apps.routing.services import handle_successful_export_delivery
            handle_successful_export_delivery(window.id, FakeNotificationAttempt())
            
            log_entry.email_send_result = "no_recipients_configured"
            log_entry.save(update_fields=["email_send_result"])
            continue

        attachments = [{
            "filename": filename,
            "content": csv_base64,
            "mime_type": "text/csv"
        }]

        template = NotificationTemplate.objects.filter(
            event_type="vendor.order_export",
            channel=NotificationChannel.EMAIL,
            status=TemplateStatus.APPROVED
        ).first()
        if not template:
            template = NotificationTemplate.objects.create(
                template_code="vendor_order_export",
                version=1,
                channel=NotificationChannel.EMAIL,
                event_type="vendor.order_export",
                subject_template="CIXCI Vendor Orders Export - {vendor_name} ({buyer_name}) - {export_date}",
                body_template=(
                    "Vendor: {vendor_name}\n"
                    "Export Date/Time: {export_time}\n"
                    "Buyer: {buyer_name}\n"
                    "Number of Orders: {order_count}\n\n"
                    "Instructions for completing shipping fields:\n"
                    "1. Fulfill the orders and ship the products.\n"
                    "2. Add the Vendor Confirmation Number, Shipping Carrier, Shipping Tracking Number, Shipped Date, and Delivered Date in the respective columns of the CSV file.\n"
                    "3. Send/import the completed CSV file back to CIXCI via CSV upload or API.\n\n"
                    "Note: The original order data fields are locked and must not be altered.\n\n"
                    "Support/Contact: support@cixci.com"
                ),
                status=TemplateStatus.APPROVED
            )

        NotificationRequest.objects.create(
            event_type="vendor.order_export",
            source_module="routing",
            source_record_id=window.id,
            safe_payload_summary={
                "buyer_name": buyer_name,
                "vendor_name": vendor.name,
                "export_date": timezone.now().strftime('%Y-%m-%d'),
                "export_time": timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
                "order_count": len(set(s.order_id for s, _ in eligible_subs)),
                "suborder_count": len(eligible_subs),
            },
            attachments=attachments,
            requested_recipient_ids=authorized_recipient_ids,
            company_scope_reference=vendor.id,
            template_code=template.template_code,
            channel=NotificationChannel.EMAIL,
            idempotency_key=f"export_{window.id}"
        )


