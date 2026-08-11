"""
Integration Management — External Provider Connection & Transport Service

Architecture Rules:
- Integration Management owns external email-provider connection/configuration,
  SMTP/API provider execution, transport attempts, and provider technical truth.
- Operational Vendor CSV emails (Order CSV, Return CSV, re-exports) route via:
    Source Module → Logs & Audit → Integration Management → Vendor
- Notification Platform delegates external email transport execution to Integration Management.
"""
import base64
import logging
from django.conf import settings
from django.utils import timezone
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def send_operational_vendor_email(
    vendor_company_id,
    filename: str,
    csv_content: str,
    email_subject: str = None,
    recipient_email: str = None,
    audit_reference: str = None
) -> dict:
    """
    Executes operational file delivery (Vendor Order CSV, Vendor Return CSV, re-export).
    Does NOT invoke Notification Platform Service.
    Flow: Source Module → Logs & Audit → Integration Management → Vendor
    """
    if not recipient_email:
        from apps.tenant.models import Company, User
        company = Company.objects.filter(id=vendor_company_id).first()
        if company:
            user = User.objects.filter(entity__company=company, is_active=True).first()
            if user:
                recipient_email = user.email

    if not recipient_email:
        recipient_email = getattr(settings, "DEFAULT_VENDOR_EMAIL", "vendor@example.com")

    subject = email_subject or f"CIXCI Vendor File Delivery: {filename}"
    body = (
        f"Attached is your operational export file ({filename}) from CIXCI Platform.\n\n"
        f"Company ID: {vendor_company_id}\n"
        f"Delivered At: {timezone.now().isoformat()}\n"
    )

    try:
        sendgrid_key = getattr(settings, "SENDGRID_API_KEY", "")
        if sendgrid_key:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
            sg = sendgrid.SendGridAPIClient(api_key=sendgrid_key)
            mail = Mail(
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                to_emails=recipient_email,
                subject=subject,
                plain_text_content=body
            )
            encoded_content = base64.b64encode(csv_content.encode("utf-8")).decode("utf-8")
            att = Attachment(
                FileContent(encoded_content),
                FileName(filename),
                FileType("text/csv"),
                Disposition("attachment")
            )
            mail.add_attachment(att)
            response = sg.send(mail)
            logger.info("Operational Vendor CSV sent via SendGrid to %s (%s)", recipient_email, filename)
            return {
                "success": True,
                "provider": "sendgrid",
                "status_code": response.status_code,
                "message_id": response.headers.get("X-Message-Id", ""),
                "recipient": recipient_email,
                "filename": filename,
            }
        else:
            email = EmailMessage(
                subject,
                body,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                [recipient_email],
            )
            email.attach(filename, csv_content, "text/csv")
            email.send(fail_silently=False)
            logger.info("Operational Vendor CSV sent via Django Mail to %s (%s)", recipient_email, filename)
            return {
                "success": True,
                "provider": "django_mail",
                "recipient": recipient_email,
                "filename": filename,
            }
    except Exception as ex:
        logger.exception("Failed delivering operational vendor email to %s for file %s", recipient_email, filename)
        return {
            "success": False,
            "error": str(ex),
            "recipient": recipient_email,
            "filename": filename,
        }


def send_notification_email(
    recipient_email: str,
    subject: str,
    body: str,
    template_code: str = None,
    provider_reference: dict = None
) -> dict:
    """
    Performs email transport execution on behalf of Notification Platform Service.
    """
    try:
        sendgrid_key = getattr(settings, "SENDGRID_API_KEY", "")
        if sendgrid_key:
            import sendgrid
            from sendgrid.helpers.mail import Mail
            sg = sendgrid.SendGridAPIClient(api_key=sendgrid_key)
            mail = Mail(
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                to_emails=recipient_email,
                subject=subject,
                plain_text_content=body
            )
            response = sg.send(mail)
            logger.info("Notification email sent via SendGrid to %s", recipient_email)
            return {
                "success": True,
                "provider": "sendgrid",
                "status_code": response.status_code,
                "message_id": response.headers.get("X-Message-Id", ""),
                "recipient": recipient_email,
            }
        else:
            email = EmailMessage(
                subject,
                body,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                [recipient_email],
            )
            email.send(fail_silently=False)
            logger.info("Notification email sent via Django Mail to %s", recipient_email)
            return {
                "success": True,
                "provider": "django_mail",
                "recipient": recipient_email,
            }
    except Exception as ex:
        logger.exception("Failed sending notification email to %s", recipient_email)
        return {
            "success": False,
            "error": str(ex),
            "recipient": recipient_email,
        }
