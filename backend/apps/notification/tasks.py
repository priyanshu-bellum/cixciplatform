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
    PreferenceOutcome, RecipientResolutionRequest, NotificationTemplate
)
from .services import evaluate_preference_ladder, EvaluationContext
from apps.tenant.models import User

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
        is_required_system=False,  # Can be expanded based on event metadata if needed
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
            if recipient.is_cixci_admin or (recipient.company and recipient.company.id == req.company_scope_reference):
                if recipient.is_active:
                    valid_recipient_ids.append(r_id_str)
                else:
                    excluded_recipient_ids.append(r_id_str)
            else:
                excluded_recipient_ids.append(r_id_str)
        except User.DoesNotExist:
            excluded_recipient_ids.append(r_id_str)

    # Record resolution metadata
    RecipientResolutionRequest.objects.create(
        notification_request=req,
        resolved_recipient_ids=valid_recipient_ids,
        excluded_recipient_ids=excluded_recipient_ids,
        cross_tenant_denied=True,
    )

    # If blocked, suppressed, or review_required, create suppressed attempts for record
    if eval_result.outcome != PreferenceOutcome.SEND:
        for r_id_str in valid_recipient_ids:
            DeliveryAttempt.objects.create(
                notification_request=req,
                recipient_id=UUID(r_id_str),
                channel=req.channel,
                status=DeliveryStatus.SUPPRESSED if eval_result.outcome == PreferenceOutcome.SUPPRESS else DeliveryStatus.FAILED,
                provider_name="preference_filter",
                provider_response_reference={"reason": eval_result.reason},
                failed_at=timezone.now() if eval_result.outcome != PreferenceOutcome.SUPPRESS else None,
            )
        logger.info("NotificationRequest %s not sent due to outcome: %s", request_id, eval_result.outcome)
        return

    # 3. Process dispatch for resolved recipients
    # Find template
    try:
        template = NotificationTemplate.objects.filter(
            event_type=req.event_type,
            channel=req.channel,
            status="approved"
        ).order_by("-version").first()
    except Exception:
        template = None

    if not template:
        # Create failed attempts due to missing template
        for r_id_str in valid_recipient_ids:
            DeliveryAttempt.objects.create(
                notification_request=req,
                recipient_id=UUID(r_id_str),
                channel=req.channel,
                status=DeliveryStatus.FAILED,
                provider_name="template_resolver",
                provider_response_reference={"error": "template_not_found"},
                failed_at=timezone.now(),
            )
        logger.error("No approved template found for event_type=%s, channel=%s", req.event_type, req.channel)
        return

    # Render template using minimal safe payload
    subject = _render_safe(template.subject_template, req.safe_payload_summary)
    body = _render_safe(template.body_template, req.safe_payload_summary)

    for r_id_str in valid_recipient_ids:
        attempt = DeliveryAttempt.objects.create(
            notification_request=req,
            recipient_id=UUID(r_id_str),
            channel=req.channel,
            status=DeliveryStatus.QUEUED,
            attempt_number=1,
        )

        recipient_user = User.objects.get(id=r_id_str)
        try:
            # Check SendGrid config, otherwise fall back to Django send_mail or console
            sendgrid_key = getattr(settings, "SENDGRID_API_KEY", "")
            if sendgrid_key:
                import sendgrid
                from sendgrid.helpers.mail import Mail
                sg = sendgrid.SendGridAPIClient(api_key=sendgrid_key)
                mail = Mail(
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                    to_emails=recipient_user.email,
                    subject=subject,
                    plain_text_content=body
                )
                response = sg.send(mail)
                attempt.status = DeliveryStatus.SENT
                attempt.provider_name = "sendgrid"
                attempt.provider_message_id = response.headers.get("X-Message-Id", "")
                attempt.provider_response_reference = {
                    "status_code": response.status_code,
                    "body": str(response.body)
                }
                attempt.sent_at = timezone.now()
            else:
                # Local dev / test fallback
                send_mail(
                    subject,
                    body,
                    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                    [recipient_user.email],
                    fail_silently=False,
                )
                attempt.status = DeliveryStatus.SENT
                attempt.provider_name = "django_mail"
                attempt.sent_at = timezone.now()

            attempt.save(update_fields=[
                "status", "provider_name", "provider_message_id",
                "provider_response_reference", "sent_at"
            ])
            logger.info("Successfully sent notification to %s for request %s", recipient_user.email, request_id)
        except Exception as ex:
            attempt.status = DeliveryStatus.FAILED
            attempt.provider_response_reference = {"error": str(ex)}
            attempt.failed_at = timezone.now()
            attempt.save(update_fields=["status", "provider_response_reference", "failed_at"])
            logger.exception("Failed to send notification to %s", recipient_user.email)
