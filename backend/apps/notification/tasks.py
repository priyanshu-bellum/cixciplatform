"""
Celery tasks for Notification Platform Service (NPS).
"""
import logging
from uuid import UUID
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail

from .models import (
    NotificationRequest, DeliveryAttempt, DeliveryStatus,
    PreferenceOutcome, RecipientResolutionRequest, NotificationTemplate,
    NotificationChannel, InAppNotification
)
from .services import evaluate_preference_ladder, EvaluationContext
from apps.tenant.models import User
from apps.integration.services import send_notification_email

logger = logging.getLogger(__name__)


def _render_safe(template_str, payload):
    """Safely format a template string using a payload."""
    import re
    if not template_str:
        return ""
    def repl(match):
        key = match.group(1)
        return str(payload.get(key, f"{{{key}}}"))
    return re.sub(r"\{([a-zA-Z0-9_]+)\}", repl, template_str)


@shared_task(name="apps.notification.tasks.process_notification_request", ignore_result=True)
def process_notification_request(request_id):
    """
    Background task to process a NotificationRequest.
    1. Evaluates the 10-step preference precedence ladder.
    2. Resolves and expands recipients within the company tenant scope.
    3. Renders templates and dispatches notification attempts asynchronously.
       - In-App: Creates InAppNotification records in Notification Center.
       - Email: Delegates external transport to Integration Management.
    """
    logger.info("Starting processing of NotificationRequest: %s", request_id)
    try:
        req = NotificationRequest.objects.get(id=request_id)
    except NotificationRequest.DoesNotExist:
        logger.error("NotificationRequest with ID %s does not exist.", request_id)
        return

    # Check idempotency/already processed
    if req.preference_outcome is not None:
        logger.info("NotificationRequest %s is already processed.", request_id)
        return

    # 1. Evaluate preference precedence ladder
    ctx = EvaluationContext(
        event_type=req.event_type,
        channel=req.channel,
        company_scope_id=req.company_scope_reference,
        recipient_ids=[UUID(rid) for rid in req.requested_recipient_ids if rid],
        is_required_system=False,
        source_module_policy={},
    )

    eval_result = evaluate_preference_ladder(ctx)
    req.preference_outcome = eval_result.outcome
    req.preference_evaluation_detail = {
        "reason": eval_result.reason,
        "steps_evaluated": eval_result.steps_evaluated,
    }
    req.save(update_fields=["preference_outcome", "preference_evaluation_detail"])

    # 2. Resolve recipients (must belong to the company scope to prevent cross-tenant leakage)
    valid_recipient_ids = []
    excluded_recipient_ids = []

    for r_id_str in req.requested_recipient_ids:
        try:
            recipient = User.objects.get(id=r_id_str)
            # Prevent cross-tenant leaks: must be cixci_admin or match company_scope_reference
            if recipient.is_cixci_admin or (recipient.entity and recipient.entity.company and recipient.entity.company.id == req.company_scope_reference):
                if recipient.is_active:
                    valid_recipient_ids.append(r_id_str)
                else:
                    excluded_recipient_ids.append(r_id_str)
            else:
                excluded_recipient_ids.append(r_id_str)
        except User.DoesNotExist:
            excluded_recipient_ids.append(r_id_str)

    # Section 10 Fallback: Apply Company Admin fallback for required operational notifications if primary resolution is empty
    is_required = req.classification in ("REQUIRED_OPERATIONAL", "ADMIN_SYSTEM_CRITICAL") or req.event_type == "PRODUCT_EXPORT_FAILED"
    if not valid_recipient_ids and is_required:
        logger.warning("Primary recipient resolution empty for required event %s. Applying Company Admin fallback.", req.event_type)
        admin_users = User.objects.filter(
            entity__company__id=req.company_scope_reference,
            is_active=True
        ).order_by("created_at")
        for admin_u in admin_users:
            valid_recipient_ids.append(str(admin_u.id))

    # If STILL no valid recipients for required operational notification, escalate to CIXCI System Admin
    if not valid_recipient_ids and is_required:
        logger.error("Required notification %s blocked — escalating to CIXCI System Admin.", req.id)
        cixci_admins = User.objects.filter(is_cixci_admin=True, is_active=True)
        for ca in cixci_admins:
            valid_recipient_ids.append(str(ca.id))

    # Record resolution metadata
    RecipientResolutionRequest.objects.create(
        notification_request=req,
        resolved_recipient_ids=valid_recipient_ids,
        excluded_recipient_ids=excluded_recipient_ids,
        cross_tenant_denied=True,
    )

    # If blocked, suppressed, or review_required, create suppressed attempts for record
    if eval_result.outcome != PreferenceOutcome.SEND or not valid_recipient_ids:
        final_status = DeliveryStatus.REVIEW_REQUIRED if (not valid_recipient_ids and is_required) else (
            DeliveryStatus.SUPPRESSED if eval_result.outcome == PreferenceOutcome.SUPPRESS else DeliveryStatus.FAILED
        )
        target_rids = valid_recipient_ids or req.requested_recipient_ids
        for r_id_str in target_rids:
            try:
                DeliveryAttempt.objects.create(
                    notification_request=req,
                    recipient_id=UUID(r_id_str),
                    channel=req.channel,
                    status=final_status,
                    provider_name="preference_filter" if valid_recipient_ids else "recipient_resolution_failure",
                    provider_response_reference={"reason": eval_result.reason if valid_recipient_ids else "no_valid_recipients"},
                    failed_at=timezone.now() if final_status != DeliveryStatus.SUPPRESSED else None,
                )
            except Exception:
                pass
        logger.info("NotificationRequest %s not sent due to outcome: %s (recipients=%d)", request_id, eval_result.outcome, len(valid_recipient_ids))
        return

    # 3. Handle API_ONLY / DASHBOARD_ONLY classification constraints
    if req.classification == "API_ONLY":
        for r_id_str in valid_recipient_ids:
            DeliveryAttempt.objects.create(
                notification_request=req,
                recipient_id=UUID(r_id_str),
                channel=req.channel,
                status=DeliveryStatus.SUPPRESSED,
                provider_name="api_only_classification",
                provider_response_reference={"reason": "api_only_no_human_message"}
            )
        logger.info("NotificationRequest %s suppressed — API_ONLY classification.", request_id)
        return

    # 4. Process dispatch for resolved recipients
    template = None
    try:
        template = NotificationTemplate.objects.filter(
            event_type=req.event_type,
            channel=req.channel,
            status="approved"
        ).order_by("-version").first()
    except Exception:
        template = None

    # Fallback default template if custom approved template not found
    default_subject = req.safe_payload_summary.get("title") or req.safe_payload_summary.get("subject") or f"Notification: {req.event_type}"
    default_body = req.safe_payload_summary.get("body") or req.safe_payload_summary.get("message") or f"System Alert for event {req.event_type}."

    subject = _render_safe(template.subject_template, req.safe_payload_summary) if template else default_subject
    body = _render_safe(template.body_template, req.safe_payload_summary) if template else default_body
    link = req.safe_payload_summary.get("link") or req.safe_payload_summary.get("url") or ""

    template_meta = {
        "template_code": template.template_code if template else req.template_code,
        "template_version": template.version if template else 1
    }

    for r_id_str in valid_recipient_ids:
        attempt = DeliveryAttempt.objects.create(
            notification_request=req,
            recipient_id=UUID(r_id_str),
            channel=req.channel,
            status=DeliveryStatus.QUEUED,
            attempt_number=1,
            provider_response_reference=template_meta
        )

        try:
            recipient_user = User.objects.get(id=r_id_str)

            if req.classification == "DASHBOARD_ONLY" and req.channel == NotificationChannel.EMAIL:
                attempt.status = DeliveryStatus.SUPPRESSED
                attempt.provider_name = "dashboard_only_classification"
                attempt.save(update_fields=["status", "provider_name"])
                continue

            if req.channel == NotificationChannel.IN_APP:
                InAppNotification.objects.create(
                    recipient=recipient_user,
                    company_scope_reference=req.company_scope_reference,
                    notification_request=req,
                    event_type=req.event_type,
                    classification=req.classification,
                    title=subject,
                    body=body,
                    source_module=req.source_module,
                    source_record_id=req.source_record_id,
                    link=link,
                    delivery_mode="IMMEDIATE",
                    delivery_attempt_reference=attempt.id,
                    audit_reference={"notification_request_id": str(req.id)}
                )
                attempt.status = DeliveryStatus.DELIVERED
                attempt.provider_name = "in_app_center"
                attempt.delivered_at = timezone.now()
                attempt.save(update_fields=["status", "provider_name", "delivered_at"])
                logger.info("Created InAppNotification for user %s (%s)", recipient_user.email, request_id)

            elif req.channel == NotificationChannel.EMAIL:
                # Delegate external transport to Integration Management
                res = send_notification_email(
                    recipient_email=recipient_user.email,
                    subject=subject,
                    body=body,
                    template_code=req.template_code,
                    provider_reference={"request_id": str(req.id)}
                )
                if res.get("success"):
                    attempt.status = DeliveryStatus.SENT
                    attempt.provider_name = res.get("provider", "integration_management")
                    attempt.provider_message_id = res.get("message_id", "")
                    attempt.provider_response_reference = res
                    attempt.sent_at = timezone.now()
                else:
                    attempt.status = DeliveryStatus.FAILED
                    attempt.provider_name = res.get("provider", "integration_management")
                    attempt.provider_response_reference = res
                    attempt.failed_at = timezone.now()

                attempt.save(update_fields=[
                    "status", "provider_name", "provider_message_id",
                    "provider_response_reference", "sent_at", "failed_at"
                ])
                logger.info("Delegated email transport for user %s (%s)", recipient_user.email, request_id)

            else:
                # Placeholder channels in Phase 1
                attempt.status = DeliveryStatus.SUPPRESSED
                attempt.provider_name = "unsupported_channel_phase1"
                attempt.save(update_fields=["status", "provider_name"])
                logger.info("Channel %s unsupported in Phase 1 for user %s (%s)", req.channel, recipient_user.email, request_id)

        except User.DoesNotExist:
            logger.error("Recipient user %s does not exist for request %s", r_id_str, request_id)
        except Exception as e:
            logger.exception("Error processing delivery for recipient %s on request %s: %s", r_id_str, request_id, str(e))


def seed_vendor_notification_templates():
    """
    Seeds the 13 approved Vendor Phase 1 Human Notification templates.
    """
    from .models import NotificationTemplate, NotificationChannel

    vendor_catalog_events = [
        ("ORDER_EXPORT_FAILED", "Order Export Delivery Failed", "Vendor order export delivery attempt failed: {{ error_message }}"),
        ("SHIPPING_INFORMATION_OVERDUE", "Shipping Information Overdue", "Shipping updates for suborder {{ suborder_number }} are overdue."),
        ("SHIPPING_IMPORT_FAILED", "Shipping Import Failed", "Shipping CSV import failed due to errors: {{ error_details }}"),
        ("SHIPPING_IMPORT_REVIEW_REQUIRED", "Shipping Import Review Required", "Shipping import requires manual review: {{ review_reason }}"),
        ("RETURN_IMPORT_FAILED", "Return Import Failed", "Return CSV import failed due to errors: {{ error_details }}"),
        ("RETURN_IMPORT_REVIEW_REQUIRED", "Return Import Review Required", "Return import requires manual review: {{ review_reason }}"),
        ("MISSING_PRODUCT_MEDIA", "Missing Product Media", "Product {{ product_name }} is missing required media assets."),
        ("MEDIA_UPLOAD_FAILED", "Media Upload Failed", "Media asset upload failed: {{ error_details }}"),
        ("MEDIA_REVIEW_REQUIRED", "Media Review Required", "Uploaded media asset requires approval review."),
        ("CATALOG_IMPORT_FAILED", "Catalog Import Failed", "Product catalog CSV import failed: {{ error_details }}"),
        ("CATALOG_ROWS_REJECTED", "Catalog Rows Rejected", "{{ rejected_count }} rows were rejected in product catalog import."),
        ("INVENTORY_CATALOG_SLA_ISSUE", "Inventory Catalog SLA Issue", "Inventory catalog update SLA threshold reached for vendor."),
        ("PRICING_CONFIGURATION_BLOCKING_BUYER_VISIBILITY", "Pricing Configuration Issue", "Pricing profile configuration is blocking buyer visibility for product {{ product_name }}."),
    ]

    seeded_count = 0
    for event_type, subject, body in vendor_catalog_events:
        for channel in [NotificationChannel.EMAIL, NotificationChannel.IN_APP]:
            tpl_code = f"tpl_{event_type}_{channel}"
            tpl, created = NotificationTemplate.objects.get_or_create(
                template_code=tpl_code,
                defaults={
                    "event_type": event_type,
                    "channel": channel,
                    "subject_template": subject,
                    "body_template": body,
                    "status": "approved",
                    "version": 1
                }
            )
            if created:
                seeded_count += 1
    return seeded_count


def seed_buyer_notification_templates():
    """
    Seeds the 12 approved Buyer Phase 1 Human Notification templates (Sections 15 & 16).
    """
    from .models import NotificationTemplate, NotificationChannel

    buyer_catalog_events = [
        ("NEW_COMPATIBLE_PRODUCTS_AVAILABLE", "New Compatible Products Available", "New compatible products are now available in your catalog: {{ product_list }}"),
        ("PRODUCT_EXPORT_COMPLETED", "Product Export Completed", "Your product export {{ export_id }} has completed successfully."),
        ("PRODUCT_EXPORT_FAILED", "Product Export Failed", "Your product export {{ export_id }} failed: {{ error_message }}"),
        ("SHIPPING_UPDATE_AVAILABLE", "Shipping Update Available", "Shipping updates are available for your suborder {{ suborder_number }}."),
        ("DELIVERY_EXCEPTION", "Delivery Exception Alert", "Delivery exception encountered for order {{ order_number }}: {{ exception_details }}"),
        ("RETURN_REJECTED", "Return Request Rejected", "Return request {{ return_id }} was rejected by vendor: {{ rejection_reason }}"),
        ("MEDIA_RESTRICTION_REVOKED", "Media Restriction Revoked", "Media restriction has been revoked for product {{ product_name }}."),
        ("EXPORTED_PRODUCT_INACTIVE_EOL", "Exported Product Inactive / EOL", "Exported product {{ product_name }} is now marked inactive or End-of-Life."),
        ("EXPORTED_PRODUCT_PRICING_CHANGED", "Exported Product Pricing Changed", "Pricing has changed for exported product {{ product_name }}."),
        ("INVOICE_GENERATED", "Invoice Generated", "Invoice {{ invoice_number }} has been generated."),
        ("INVOICE_EXCEPTION", "Invoice Exception Alert", "Invoice exception encountered for {{ invoice_number }}: {{ exception_details }}"),
        ("RECONCILIATION_REPORT_READY", "Reconciliation Report Ready", "Your monthly reconciliation report {{ report_id }} is now ready."),
    ]

    seeded_count = 0
    for event_type, subject, body in buyer_catalog_events:
        for channel in [NotificationChannel.EMAIL, NotificationChannel.IN_APP]:
            tpl_code = f"tpl_{event_type}_{channel}"
            tpl, created = NotificationTemplate.objects.get_or_create(
                template_code=tpl_code,
                defaults={
                    "event_type": event_type,
                    "channel": channel,
                    "subject_template": subject,
                    "body_template": body,
                    "status": "approved",
                    "version": 1
                }
            )
            if created:
                seeded_count += 1
    return seeded_count


def seed_cixci_admin_notification_templates():
    """
    Seeds the 21 approved CIXCI Admin Phase 1 Notification templates (Section 17).
    """
    from .models import NotificationTemplate, NotificationChannel

    admin_catalog_events = [
        ("REVIEW_REQUIRED", "Review Required Alert", "Review required condition emitted by module {{ source_module }}: {{ details }}"),
        ("CONFIGURATION_REQUIRED", "Configuration Required Alert", "Configuration required condition emitted: {{ details }}"),
        ("CATALOG_IMPORT_FAILED", "Catalog Import System Failure", "Product catalog import failure: {{ details }}"),
        ("DEVICE_IMPORT_FAILED", "Device Import System Failure", "Device catalog import failure: {{ details }}"),
        ("MEDIA_IMPORT_FAILED", "Media Import System Failure", "Media asset import failure: {{ details }}"),
        ("MEDIA_UNMATCHED_AMBIGUOUS", "Ambiguous Media Unmatched Alert", "Ambiguous unmatched media asset detected: {{ media_id }}"),
        ("ORDER_EXPORT_ESCALATION", "Order Export Escalation", "Order export transport failure unrecoverable — immediate escalation."),
        ("REEXPORT_FAILED", "Re-export Operation Failed", "Re-export attempt failed: {{ details }}"),
        ("SHIPPING_IMPORT_FAILED", "Shipping Import System Failure", "Shipping import system failure: {{ details }}"),
        ("RETURN_EXPORT_FAILED", "Return Export System Failure", "Return export delivery failure: {{ details }}"),
        ("RETURN_IMPORT_FAILED", "Return Import System Failure", "Return import system failure: {{ details }}"),
        ("API_INTEGRATION_FAILED", "API Integration Failure", "API integration endpoint failure: {{ endpoint }}"),
        ("PROVIDER_TRANSPORT_FAILED", "Provider Transport Failure", "Provider transport failure: {{ provider_name }}"),
        ("QUICKBOOKS_SYNC_FAILED", "QuickBooks Sync Failure", "QuickBooks sync integration failure: {{ details }}"),
        ("INVOICE_PROCESSING_FAILED", "Invoice Processing Failure", "Invoice processing failure: {{ invoice_id }}"),
        ("RECONCILIATION_MISMATCH", "Reconciliation Mismatch Alert", "Reconciliation mismatch detected: {{ details }}"),
        ("SLA_BREACH", "SLA Breach Alert", "Formal SLA breach recorded: {{ details }}"),
        ("VENDOR_OVERDUE_SHIPPING_DATA", "Vendor Overdue Shipping Digest", "Vendor overdue shipping data digest: {{ vendor_count }} vendors overdue."),
        ("PENDING_APPROVAL", "Pending Approval Notification", "Item pending approval: {{ item_id }}"),
        ("RETRY_EXHAUSTED", "Retry Exhausted Alert", "Delivery retry exhausted for notification request {{ request_id }}."),
        ("SCHEDULED_SYSTEM_ADMIN_ACTIVITY_SUMMARY", "System Admin Activity Summary", "Scheduled CIXCI System Admin activity summary report."),
    ]

    seeded_count = 0
    for event_type, subject, body in admin_catalog_events:
        for channel in [NotificationChannel.EMAIL, NotificationChannel.IN_APP]:
            tpl_code = f"tpl_{event_type}_{channel}"
            tpl, created = NotificationTemplate.objects.get_or_create(
                template_code=tpl_code,
                defaults={
                    "event_type": event_type,
                    "channel": channel,
                    "subject_template": subject,
                    "body_template": body,
                    "status": "approved",
                    "version": 1
                }
            )
            if created:
                seeded_count += 1
    return seeded_count

