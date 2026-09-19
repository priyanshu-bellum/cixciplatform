"""
check_access() — the ONLY authority gate in the CIXCI platform.

Architecture rule (spec.md — Tenant Company):
  "check_access is the canonical authority gate for all modules.
   Role bundles are documented composites only and are never used
   as the direct source of truth for authorization."

Usage:
    from apps.tenant.services import check_access

    if not check_access(request.user, "catalog.product.import", company_id=...):
        raise PermissionDenied(...)
"""
import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)


@dataclass
class AccessContext:
    """Structured context for an access check."""
    actor_id: UUID                    # The user performing the action
    capability_code: str              # e.g. "catalog.product.import"
    company_id: Optional[UUID] = None # Target company scope (None = platform-wide)
    entity_id: Optional[UUID] = None  # Target entity scope
    resource_id: Optional[UUID] = None  # Specific resource (for future row-level)


@dataclass
class AccessResult:
    """Result of a check_access() call."""
    granted: bool
    reason: str = ""
    actor_id: Optional[UUID] = None
    capability_code: str = ""


def check_access(user, capability_code: str, company_id=None, entity_id=None, resource_id=None) -> AccessResult:
    """
    The canonical CIXCI authority gate.

    Evaluation order:
      1. CIXCI System Admin → always granted for platform-wide capabilities.
      2. User must belong to an active company & have the capability assigned to the company.
      3. User is active → deny if not.
      4. User's entity is active → deny if not.
      5. User has the capability_code → grant if yes, deny otherwise.

    This function is the ONLY place where authorization decisions are made.
    No other module may infer, duplicate, or shortcut this.
    """
    ctx = AccessContext(
        actor_id=user.id,
        capability_code=capability_code,
        company_id=company_id,
        entity_id=entity_id,
        resource_id=resource_id,
    )

    # ── 1. CIXCI System Admin ─────────────────────────────────────────────────
    is_admin = getattr(user, "is_cixci_admin", False) or (
        getattr(user, "company", None) and getattr(user.company, "company_type", None) == "cixci_internal"
    )
    if is_admin and getattr(user, "is_active", False):
        return AccessResult(granted=True, reason="cixci_admin", actor_id=user.id, capability_code=capability_code)

    # ── 2. User must be active ────────────────────────────────────────────────
    if not getattr(user, "is_active", False):
        logger.debug("check_access DENIED: user %s is inactive", user.id)
        return AccessResult(granted=False, reason="user_inactive", actor_id=user.id, capability_code=capability_code)

    # ── 3. Company & Entity checks ────────────────────────────────────────────
    if user.entity_id is not None:
        company = user.entity.company
        if company:
            # Check company status
            if company.status != "active":
                logger.debug("check_access DENIED: company %s is not active (status: %s)", company.id, company.status)
                return AccessResult(granted=False, reason="company_inactive", actor_id=user.id, capability_code=capability_code)
            
            # Fallback for standard buyer capabilities if company type is buyer
            buyer_safe_caps = {
                "company_user_management.read_users",
                "company_user_management.manage_invitations",
                "company_user_management.manage_user_access",
                "company_user_management.manage_user_lifecycle",
                "company_user_management.grant_company_admin",
                "devices.portfolio.self_modify",
                "devices.device.list",
                "devices.device.read",
                "devices.type.list",
                "devices.type.read",
                "devices.manufacturer.list",
                "devices.manufacturer.read",
                "devices.feature.list",
                "devices.feature.read",
                "catalog.product.list",
                "catalog.product.read",
                "integration.connection.list",
                "integration.connection.read",
                "integration.connection.manage",
                "procurement.po.create",
                "procurement.po.list",
                "procurement.po.read",
                "procurement.po.update",
                "routing.order.list",
                "routing.order.read",
                "fulfillment.return.list",
                "fulfillment.return.read",
                "fulfillment.handoff.update",
            }
            if (company.company_type or "").lower() == "buyer" and capability_code in buyer_safe_caps:
                if company_id and str(user.entity.company_id) != str(company_id):
                    logger.debug(
                        "check_access DENIED (buyer fallback): user %s company %s != requested %s",
                        user.id, user.entity.company_id, company_id
                    )
                    return AccessResult(granted=False, reason="company_scope_mismatch", actor_id=user.id, capability_code=capability_code)
                if entity_id and str(user.entity_id) != str(entity_id):
                    logger.debug(
                        "check_access DENIED (buyer fallback): user %s entity %s != requested %s",
                        user.id, user.entity_id, entity_id
                    )
                    return AccessResult(granted=False, reason="entity_scope_mismatch", actor_id=user.id, capability_code=capability_code)
                return AccessResult(granted=True, reason="buyer_default_capability", actor_id=user.id, capability_code=capability_code)

            # Fallback for standard vendor capabilities if company type is vendor
            vendor_safe_caps = {
                "company_user_management.read_users",
                "company_user_management.manage_invitations",
                "company_user_management.manage_user_access",
                "company_user_management.manage_user_lifecycle",
                "company_user_management.grant_company_admin",
                "devices.device.list",
                "devices.device.read",
                "devices.type.list",
                "devices.type.read",
                "devices.manufacturer.list",
                "devices.manufacturer.read",
            }
            if (company.company_type or "").lower() == "vendor" and capability_code in vendor_safe_caps:
                if company_id and str(user.entity.company_id) != str(company_id):
                    logger.debug(
                        "check_access DENIED (vendor fallback): user %s company %s != requested %s",
                        user.id, user.entity.company_id, company_id
                    )
                    return AccessResult(granted=False, reason="company_scope_mismatch", actor_id=user.id, capability_code=capability_code)
                if entity_id and str(user.entity_id) != str(entity_id):
                    logger.debug(
                        "check_access DENIED (vendor fallback): user %s entity %s != requested %s",
                        user.id, user.entity_id, entity_id
                    )
                    return AccessResult(granted=False, reason="entity_scope_mismatch", actor_id=user.id, capability_code=capability_code)
                return AccessResult(granted=True, reason="vendor_default_capability", actor_id=user.id, capability_code=capability_code)


            # Check user capability first
            has_user_cap = user.capabilities.filter(code=capability_code, is_active=True).exists()
            if not has_user_cap:
                logger.debug("check_access DENIED: user %s lacks capability %s", user.id, capability_code)
                return AccessResult(granted=False, reason="capability_missing", actor_id=user.id, capability_code=capability_code)

            # Check company capability assignment
            if not company.capabilities.filter(code=capability_code, is_active=True).exists():
                logger.debug("check_access DENIED: company %s lacks capability %s", company.id, capability_code)
                return AccessResult(granted=False, reason="company_capability_missing", actor_id=user.id, capability_code=capability_code)

        if not _entity_is_active(user):
            logger.debug("check_access DENIED: entity for user %s is not active", user.id)
            return AccessResult(granted=False, reason="entity_inactive", actor_id=user.id, capability_code=capability_code)

        # ── 3a. Company scope check ───────────────────────────────────────────
        if company_id and str(user.entity.company_id) != str(company_id):
            logger.debug(
                "check_access DENIED: user %s company %s != requested %s",
                user.id, user.entity.company_id, company_id
            )
            return AccessResult(granted=False, reason="company_scope_mismatch", actor_id=user.id, capability_code=capability_code)

        # ── 3b. Entity scope check ────────────────────────────────────────────
        if entity_id and str(user.entity_id) != str(entity_id):
            logger.debug(
                "check_access DENIED: user %s entity %s != requested %s",
                user.id, user.entity_id, entity_id
            )
            return AccessResult(granted=False, reason="entity_scope_mismatch", actor_id=user.id, capability_code=capability_code)

    # ── 4. Capability check ───────────────────────────────────────────────────
    has_capability = user.capabilities.filter(code=capability_code, is_active=True).exists()
    if has_capability:
        return AccessResult(granted=True, reason="capability_matched", actor_id=user.id, capability_code=capability_code)

    logger.debug("check_access DENIED: user %s lacks capability %s", user.id, capability_code)
    return AccessResult(granted=False, reason="capability_missing", actor_id=user.id, capability_code=capability_code)


def log_tenant_audit(event_code: str, description: str, company_id, actor_id, source_record_type="Company", source_record_id=None, status="success"):
    """Log an audit record to the append-only AuditRecord table."""
    try:
        from apps.audit.models import AuditRecord, RetentionClass, RedactionClass, AccessClass
        # Resolve company UUID
        c_id = company_id.id if hasattr(company_id, "id") else company_id
        a_id = actor_id.id if hasattr(actor_id, "id") else actor_id
        r_id = source_record_id.id if hasattr(source_record_id, "id") else source_record_id

        AuditRecord.objects.create(
            event_code=event_code,
            event_description=description,
            status=status,
            actor_reference=a_id,
            company_scope_reference=c_id,
            source_module="tenant",
            source_record_type=source_record_type,
            source_record_id=r_id or c_id,
            retention_class=RetentionClass.STANDARD,
            redaction_class=RedactionClass.INTERNAL_OPS,
            access_class=AccessClass.INTERNAL_OPS,
        )
    except Exception as e:
        logger.error(f"Failed to log audit record for {event_code}: {e}")





def _entity_is_active(user) -> bool:
    """Check if the user's entity is in active status."""
    try:
        from .models import EntityStatus
        return user.entity.status == EntityStatus.ACTIVE
    except Exception:
        return False


def resolve_buyer_scope(user):
    """
    Resolve the buyer-scope triad for a user.

    Returns a dict with:
      buyer_reference, company_scope_reference, buyer_entity_reference

    All buyer-scoped entities downstream MUST carry these three references.
    This is defined in Tenant Company and consumed by Device Catalog, Product Catalog, etc.
    """
    if user.entity is None:
        return None

    return {
        "buyer_reference": user.id,
        "company_scope_reference": user.entity.company_id,
        "buyer_entity_reference": user.entity_id,
    }


# ─── Onboarding & Verification Services ───────────────────────────────────────
from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

def generate_onboarding_token(user) -> str:
    """Generate a signed onboarding token containing the user's ID."""
    signer = TimestampSigner(salt="onboarding")
    return signer.sign(str(user.id))

def verify_onboarding_token(token: str, max_age: int = 259200) -> Optional[str]:
    """Verify signed onboarding token. Default max_age is 3 days (259200 seconds)."""
    signer = TimestampSigner(salt="onboarding")
    try:
        return signer.unsign(token, max_age=max_age)
    except (SignatureExpired, BadSignature) as e:
        logger.warning(f"Onboarding token verification failed: {e}")
        return None

def send_onboarding_invite(user=None, invitation=None):
    """
    Send onboarding invitation email with signed activation link matching CIXCI email design.
    Supports either a User instance or a UserInvitation instance.
    """
    if not user and not invitation:
        raise ValueError("Either user or invitation must be provided to send_onboarding_invite.")

    if invitation:
        token = invitation.token
        recipient_email = invitation.email
        first_name = invitation.first_name or "there"
        company_id = invitation.target_company_id
        actor_id = invitation.invited_by_id if invitation.invited_by else None
        record_type = "UserInvitation"
        record_id = invitation.id
    else:
        token = generate_onboarding_token(user)
        recipient_email = user.email
        first_name = user.first_name or "there"
        company_id = getattr(user, "company_id", None) or (user.entity.company_id if getattr(user, "entity", None) else None)
        actor_id = user.id
        record_type = "User"
        record_id = user.id

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    confirmation_url = f"{frontend_url}/confirm-email?token={token}"

    subject = "Confirm your email address"

    context = {
        "first_name": first_name,
        "confirmation_url": confirmation_url,
        "year": timezone.now().year,
    }

    try:
        html_content = render_to_string("emails/confirm_email.html", context)
    except Exception as e:
        logger.warning(f"Failed to render HTML email template: {e}")
        html_content = None

    plain_message = (
        f"Confirm your email address\n\n"
        f"Hi {first_name},\n\n"
        f"Welcome to CIXCI — we're glad you're here.\n\n"
        f"Before we dive in, we just need to confirm your email address to keep your account secure "
        f"and make sure we're reaching the right inbox.\n\n"
        f"Tap the button below or visit the link to confirm:\n"
        f"{confirmation_url}\n\n"
        f"Once confirmed, you'll be the first to hear about new drops, exclusive content, "
        f"and more from the world of CIXCI.\n\n"
        f"If you didn't sign up for this, feel free to ignore this email.\n\n"
        f"See you soon,\n"
        f"The CIXCI Team\n\n"
        f"You're receiving this message because you have an account with CIXCI or requested to be notified about updates.\n"
        f"All content © {timezone.now().year} CIXCI. All rights reserved."
    )

    resend_key = getattr(settings, "RESEND_API_KEY", "")
    sent_via_resend = False
    if resend_key:
        try:
            import resend
            resend.api_key = resend_key
            params = {
                "from": getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                "to": [recipient_email],
                "subject": subject,
                "html": html_content or plain_message,
                "text": plain_message,
            }
            res = resend.Emails.send(params)
            logger.info("Onboarding email sent via Resend API to %s: %s", recipient_email, res)
            sent_via_resend = True
        except Exception as e:
            logger.error(f"Failed sending onboarding email via Resend API: {e}, falling back to django email backend.")

    if not sent_via_resend:
        email_msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
            to=[recipient_email],
        )
        if html_content:
            email_msg.attach_alternative(html_content, "text/html")

        email_msg.send(fail_silently=False)

    log_tenant_audit(
        event_code="user.onboarding_invite_sent",
        description=f"Sent onboarding email to {recipient_email}",
        company_id=company_id,
        actor_id=actor_id,
        source_record_type=record_type,
        source_record_id=record_id,
    )

    return token


def generate_password_reset_token(user) -> str:
    """Generate a signed password reset token containing the user's ID."""
    signer = TimestampSigner(salt="password-reset")
    return signer.sign(str(user.id))


def verify_password_reset_token(token: str, max_age: int = 3600) -> Optional[str]:
    """Verify signed password reset token. Expires in 60 minutes (3600 seconds)."""
    signer = TimestampSigner(salt="password-reset")
    try:
        return signer.unsign(token, max_age=max_age)
    except (SignatureExpired, BadSignature) as e:
        logger.warning(f"Password reset token verification failed: {e}")
        return None


def send_password_reset_email(user):
    """
    Send password reset email with 60-minute expiry link matching CIXCI email design.
    """
    token = generate_password_reset_token(user)
    recipient_email = user.email
    first_name = user.first_name or "there"
    company_id = getattr(user, "company_id", None) or (user.entity.company_id if getattr(user, "entity", None) else None)

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    subject = "Reset your password"

    context = {
        "first_name": first_name,
        "reset_url": reset_url,
        "year": timezone.now().year,
    }

    try:
        html_content = render_to_string("emails/reset_password.html", context)
    except Exception as e:
        logger.warning(f"Failed to render HTML reset_password template: {e}")
        html_content = None

    plain_message = (
        f"Reset your password\n\n"
        f"Hi {first_name},\n\n"
        f"We received a request to reset your password. No worries — it happens.\n\n"
        f"Click the button below or visit the link to create a new one:\n"
        f"{reset_url}\n\n"
        f"This link will expire in 60 minutes for your security.\n\n"
        f"Didn't request this? Just ignore this email — your account is still safe and your password hasn't been changed.\n\n"
        f"The CIXCI Team\n\n"
        f"You're receiving this message because you have an account with CIXCI or requested to be notified about updates.\n"
        f"All content © {timezone.now().year} CIXCI. All rights reserved."
    )

    resend_key = getattr(settings, "RESEND_API_KEY", "")
    sent_via_resend = False
    if resend_key:
        try:
            import resend
            resend.api_key = resend_key
            params = {
                "from": getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                "to": [recipient_email],
                "subject": subject,
                "html": html_content or plain_message,
                "text": plain_message,
            }
            res = resend.Emails.send(params)
            logger.info("Password reset email sent via Resend API to %s: %s", recipient_email, res)
            sent_via_resend = True
        except Exception as e:
            logger.error(f"Failed sending password reset email via Resend API: {e}, falling back to django email backend.")

    if not sent_via_resend:
        email_msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
            to=[recipient_email],
        )
        if html_content:
            email_msg.attach_alternative(html_content, "text/html")
        email_msg.send(fail_silently=False)

    log_tenant_audit(
        event_code="user.password_reset_sent",
        description=f"Sent password reset email to {recipient_email}",
        company_id=company_id,
        actor_id=user.id,
        source_record_type="User",
        source_record_id=user.id,
    )

    return token


def reset_user_password(token: str, new_password: str):
    """
    Resets user's password using the signed 60-minute token.
    """
    user_id = verify_password_reset_token(token)
    if not user_id:
        raise ValidationError("INVALID_OR_EXPIRED_TOKEN: Password reset link is invalid or has expired.")

    if len(new_password) < 8:
        raise ValidationError("PASSWORD_TOO_SHORT: Password must be at least 8 characters long.")

    user = User.objects.filter(id=user_id).first()
    if not user:
        raise ValidationError("USER_NOT_FOUND: User does not exist.")

    user.set_password(new_password)
    user.save()

    company_id = getattr(user, "company_id", None) or (user.entity.company_id if getattr(user, "entity", None) else None)
    log_tenant_audit(
        event_code="user.password_reset_completed",
        description=f"Password reset completed for {user.email}",
        company_id=company_id,
        actor_id=user.id,
        source_record_type="User",
        source_record_id=user.id,
    )
    return user


def send_unsubscribed_email(email: str, first_name: str = "there", user=None, feedback_url: str = None, resubscribe_url: str = None):
    """
    Send unsubscribe confirmation email matching CIXCI email design.
    """
    recipient_email = email
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if not feedback_url:
        feedback_url = f"{frontend_url}/feedback?email={recipient_email}"
    if not resubscribe_url:
        resubscribe_url = f"{frontend_url}/resubscribe?email={recipient_email}"

    subject = "You’ve unsubscribed"

    context = {
        "first_name": first_name or "there",
        "feedback_url": feedback_url,
        "resubscribe_url": resubscribe_url,
        "year": timezone.now().year,
    }

    try:
        html_content = render_to_string("emails/unsubscribed.html", context)
    except Exception as e:
        logger.warning(f"Failed to render HTML unsubscribed template: {e}")
        html_content = None

    plain_message = (
        f"You’ve unsubscribed\n\n"
        f"Hi {first_name},\n\n"
        f"You’ve been unsubscribed from CIXCI emails. No more drops, updates, or inside looks — unless you change your mind.\n\n"
        f"We get it — inboxes get crowded. Just know you’re always welcome back.\n\n"
        f"Before you go, mind telling us why?\n"
        f"It’ll help us improve what we send (and how often).\n\n"
        f"Share Feedback:\n{feedback_url}\n\n"
        f"If this was a mistake or you ever want to reconnect, you can resubscribe here:\n{resubscribe_url}\n\n"
        f"Thanks for being part of CIXCI’s story — even if just for a chapter.\n\n"
        f"The CIXCI Team\n\n"
        f"You're receiving this message because you have an account with CIXCI or requested to be notified about updates.\n"
        f"All content © {timezone.now().year} CIXCI. All rights reserved."
    )

    resend_key = getattr(settings, "RESEND_API_KEY", "")
    sent_via_resend = False
    if resend_key:
        try:
            import resend
            resend.api_key = resend_key
            params = {
                "from": getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                "to": [recipient_email],
                "subject": subject,
                "html": html_content or plain_message,
                "text": plain_message,
            }
            res = resend.Emails.send(params)
            logger.info("Unsubscribed email sent via Resend API to %s: %s", recipient_email, res)
            sent_via_resend = True
        except Exception as e:
            logger.error(f"Failed sending unsubscribed email via Resend API: {e}, falling back to django email backend.")

    if not sent_via_resend:
        email_msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
            to=[recipient_email],
        )
        if html_content:
            email_msg.attach_alternative(html_content, "text/html")
        email_msg.send(fail_silently=False)

    company_id = None
    user_id = None
    if user:
        user_id = user.id
        company_id = getattr(user, "company_id", None) or (user.entity.company_id if getattr(user, "entity", None) else None)

    log_tenant_audit(
        event_code="user.unsubscribed_email_sent",
        description=f"Sent unsubscribe confirmation email to {recipient_email}",
        company_id=company_id,
        actor_id=user_id,
        source_record_type="User" if user_id else "Email",
        source_record_id=user_id,
    )


def send_welcome_email(user, browse_url: Optional[str] = None):
    """
    Send welcome email after email confirmation matching CIXCI email design.
    """
    recipient_email = user.email
    first_name = user.first_name or "there"
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if not browse_url:
        browse_url = f"{frontend_url}/catalog"

    subject = "Welcome to CIXCI !"

    context = {
        "first_name": first_name,
        "browse_url": browse_url,
        "year": timezone.now().year,
    }

    try:
        html_content = render_to_string("emails/welcome.html", context)
    except Exception as e:
        logger.warning(f"Failed to render HTML welcome template: {e}")
        html_content = None

    plain_message = (
        f"Welcome to CIXCI !\n\n"
        f"Hi {first_name},\n\n"
        f"Thanks for confirming your email — you're officially part of the CIXCI community.\n\n"
        f"Here's what to expect:\n"
        f"· First looks at new drops\n"
        f"· Exclusive content and offers\n"
        f"· First looks at what we're building behind the scenes\n\n"
        f"We're all about changing the way wireless carriers and accessory vendors do business!\n\n"
        f"Take a look around - Browse CIXCI:\n{browse_url}\n\n"
        f"If you ever have questions or just want to say hey, we’re one click away at support@cixci.com.\n\n"
        f"Welcome again — let's build something different.\n\n"
        f"The CIXCI Team\n\n"
        f"You're receiving this message because you have an account with CIXCI or requested to be notified about updates.\n"
        f"All content © {timezone.now().year} CIXCI. All rights reserved."
    )

    resend_key = getattr(settings, "RESEND_API_KEY", "")
    sent_via_resend = False
    if resend_key:
        try:
            import resend
            resend.api_key = resend_key
            params = {
                "from": getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                "to": [recipient_email],
                "subject": subject,
                "html": html_content or plain_message,
                "text": plain_message,
            }
            res = resend.Emails.send(params)
            logger.info("Welcome email sent via Resend API to %s: %s", recipient_email, res)
            sent_via_resend = True
        except Exception as e:
            logger.error(f"Failed sending welcome email via Resend API: {e}, falling back to django email backend.")

    if not sent_via_resend:
        email_msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
            to=[recipient_email],
        )
        if html_content:
            email_msg.attach_alternative(html_content, "text/html")
        email_msg.send(fail_silently=False)

    company_id = getattr(user, "company_id", None) or (user.entity.company_id if getattr(user, "entity", None) else None)
    log_tenant_audit(
        event_code="user.welcome_email_sent",
        description=f"Sent welcome email to {recipient_email}",
        company_id=company_id,
        actor_id=user.id,
        source_record_type="User",
        source_record_id=user.id,
    )


def send_welcome_back_email(email: str, first_name: str = "there", user=None, explore_url: Optional[str] = None):
    """
    Send welcome back email upon resubscribing matching CIXCI email design.
    """
    recipient_email = email
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if not explore_url:
        explore_url = f"{frontend_url}/catalog"

    subject = "Welcome back to CIXCI !"

    context = {
        "first_name": first_name or "there",
        "explore_url": explore_url,
        "year": timezone.now().year,
    }

    try:
        html_content = render_to_string("emails/welcome_back.html", context)
    except Exception as e:
        logger.warning(f"Failed to render HTML welcome_back template: {e}")
        html_content = None

    plain_message = (
        f"Welcome back to CIXCI !\n\n"
        f"Hi {first_name},\n\n"
        f"We’re glad to see you again — welcome back to CIXCI.\n\n"
        f"You’re officially back on the list, which means:\n"
        f"· First looks at new drops\n"
        f"· Exclusive content and offers\n"
        f"· First looks at what we’re building behind the scenes\n\n"
        f"We missed having you around. Let’s keep building something bold together.\n\n"
        f"Explore What’s New:\n{explore_url}\n\n"
        f"If you ever need anything, reach out to us at support@cixci.com. No bots, just humans who care.\n\n"
        f"Talk soon,\n\n"
        f"The CIXCI Team\n\n"
        f"You're receiving this message because you have an account with CIXCI or requested to be notified about updates.\n"
        f"All content © {timezone.now().year} CIXCI. All rights reserved."
    )

    resend_key = getattr(settings, "RESEND_API_KEY", "")
    sent_via_resend = False
    if resend_key:
        try:
            import resend
            resend.api_key = resend_key
            params = {
                "from": getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
                "to": [recipient_email],
                "subject": subject,
                "html": html_content or plain_message,
                "text": plain_message,
            }
            res = resend.Emails.send(params)
            logger.info("Welcome back email sent via Resend API to %s: %s", recipient_email, res)
            sent_via_resend = True
        except Exception as e:
            logger.error(f"Failed sending welcome back email via Resend API: {e}, falling back to django email backend.")

    if not sent_via_resend:
        email_msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cixci.com"),
            to=[recipient_email],
        )
        if html_content:
            email_msg.attach_alternative(html_content, "text/html")
        email_msg.send(fail_silently=False)

    company_id = None
    user_id = None
    if user:
        user_id = user.id
        company_id = getattr(user, "company_id", None) or (user.entity.company_id if getattr(user, "entity", None) else None)

    log_tenant_audit(
        event_code="user.welcome_back_email_sent",
        description=f"Sent welcome back email to {recipient_email}",
        company_id=company_id,
        actor_id=user_id,
        source_record_type="User" if user_id else "Email",
        source_record_id=user_id,
    )


def is_capability_allowed_for_company(capability_code: str, company_type: str, buyer_type: Optional[str] = None) -> bool:
    """Check if a capability is allowed to be assigned to a company based on its type."""
    from apps.tenant.models import CompanyType
    
    comp_type = (company_type or "").lower()
    if comp_type in (CompanyType.CIXCI_INTERNAL, "cixci_internal"):
        return True

    if comp_type in (CompanyType.VENDOR, "vendor"):
        # Vendor allowed patterns/prefixes
        allowed_prefixes = (
            "catalog.product.",
            "media.asset.",
            "analytics.metrics.",
            "analytics.summary.",
            "tenant.relationship.read",
            "tenant.relationship.list",
            "devices.device.list",
            "devices.device.read",
            "devices.type.list",
            "devices.type.read",
            "devices.manufacturer.list",
            "devices.manufacturer.read",
            "fulfillment.return.",
            "fulfillment.handoff.",
            "routing.order.",
            "routing.export.",
        )
        return capability_code.startswith(allowed_prefixes)

    if comp_type in (CompanyType.BUYER, "buyer"):
        # Buyer allowed capabilities
        buyer_safe_caps = {
            "devices.portfolio.self_modify",
            "devices.device.list",
            "devices.device.read",
            "devices.type.list",
            "devices.type.read",
            "devices.manufacturer.list",
            "devices.manufacturer.read",
            "devices.feature.list",
            "devices.feature.read",
            "catalog.product.list",
            "catalog.product.read",
            "tenant.company.read",
            "tenant.entity.list",
            "tenant.entity.read",
            "tenant.user.list",
            "tenant.user.read",
            "tenant.relationship.list",
            "tenant.relationship.read",
            "tenant.relationship.create",
            "integration.connection.list",
            "integration.connection.read",
            "integration.connection.manage",
            "procurement.po.create",
            "procurement.po.list",
            "procurement.po.read",
            "procurement.po.update",
            "company_user_management.read_users",
            "company_user_management.manage_invitations",
            "company_user_management.manage_user_access",
            "company_user_management.manage_user_lifecycle",
            "company_user_management.grant_company_admin",
        }
        if capability_code in buyer_safe_caps:
            return True

        # DQE capabilities are only allowed for MVNO / Wireless Carrier
        if buyer_type in ("mvno", "wireless_carrier"):
            dqe_caps = {
                "devices.dqe.create",
                "devices.dqe.read",
                "devices.dqe.list",
            }
            if capability_code in dqe_caps:
                return True

        return False

    return True


def assign_default_capabilities_for_company(company) -> None:
    """Automatically assigns default capabilities based on company type and buyer type."""
    from apps.tenant.models import Capability, CompanyType
    import json

    buyer_type = None
    if company.external_id:
        try:
            meta = json.loads(company.external_id)
            buyer_type = meta.get("buyer_type")
        except Exception:
            pass

    comp_type = (company.company_type or "").lower()
    default_codes = []
    if comp_type in (CompanyType.VENDOR, "vendor"):
        default_codes = [
            "catalog.product.create",
            "catalog.product.update",
            "catalog.product.delete",
            "catalog.product.manage_selling",
        ]
    elif comp_type in (CompanyType.BUYER, "buyer"):
        # Every buyer gets self_modify by default
        default_codes = ["devices.portfolio.self_modify"]
        if buyer_type in ("mvno", "wireless_carrier"):
            default_codes.extend([
                "devices.dqe.create",
                "devices.dqe.read",
                "devices.dqe.list",
            ])

    if default_codes:
        caps = Capability.objects.filter(code__in=default_codes)
        for cap in caps:
            if not company.capabilities.filter(id=cap.id).exists():
                company.capabilities.add(cap)


# ──────────────────────────────────────────────────────────────────────────────
# Company User Management Services (Phase 1 V2)
# ──────────────────────────────────────────────────────────────────────────────
import secrets
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.tenant.models import (
    Capability, Company, CompanyEntity, User, UserInvitation,
    CompanyUserMembership, InvitationStatus, MembershipStatus,
    CapabilityDelegationEvidence, EffectiveCompanyAdminEvidence
)


def seed_company_user_management_capabilities():
    """Ensure the 5 core Phase 1 Company User Management capability atoms exist."""
    caps = [
        ("company_user_management.read_users", "Read company users and invitations"),
        ("company_user_management.manage_invitations", "Create, resend, and revoke company user invitations"),
        ("company_user_management.manage_user_access", "Manage user role bundles and capability assignments"),
        ("company_user_management.manage_user_lifecycle", "Suspend, deactivate, and reactivate company users"),
        ("company_user_management.grant_company_admin", "Grant or revoke local Company Admin authority"),
    ]
    for code, desc in caps:
        Capability.objects.get_or_create(
            code=code,
            defaults={"module": "tenant", "description": desc, "is_active": True}
        )


def ensure_effective_local_company_admin_invariant(company, actor=None, exclude_user_id=None):
    """
    Enforces the Final Local Company Admin Invariant.
    Every ACTIVE company must retain at least 1 ACTIVE local Company Admin.
    Parent admins do not satisfy this requirement.
    """
    with transaction.atomic():
        query = CompanyUserMembership.objects.select_for_update().filter(
            company=company,
            is_company_admin=True,
            status=MembershipStatus.ACTIVE,
            user__is_active=True
        )
        if exclude_user_id:
            query = query.exclude(user_id=exclude_user_id)
        
        active_count = query.count()
        EffectiveCompanyAdminEvidence.objects.create(
            company=company,
            active_admin_count=active_count,
            actor=actor
        )
        if active_count < 1:
            raise ValidationError("FINAL_COMPANY_ADMIN_REQUIRED: Operation denied because active company requires at least one active local Company Admin.")
        return active_count


def validate_7point_delegation_rule(actor, target_user, capability, company):
    """
    Validates the approved 7-point capability delegation rule.
    """
    # 1. Actor may administer target user
    if not actor.is_cixci_admin:
        actor_comp = actor.company
        if not actor_comp or (actor_comp.id != company.id and company.parent_company_id != actor_comp.id):
            return False, "DELEGATION_NOT_AUTHORIZED: Actor scope does not permit administering target company"
    
    # 2. Target scope is within actor scope
    if not actor.is_cixci_admin and actor.company_id != company.id and company.parent_company_id != actor.company_id:
        return False, "COMPANY_SCOPE_MISMATCH: Target scope is outside actor scope"

    # 3. Capability is valid for company
    if not company.capabilities.filter(id=capability.id, is_active=True).exists():
        return False, "CAPABILITY_NOT_ELIGIBLE: Capability is not enabled for target company"

    # 4. Capability is delegable (active atom)
    if not capability.is_active:
        return False, "CAPABILITY_NOT_DELEGABLE: Capability is inactive"

    # 5. Actor is authorized to delegate it
    if not actor.is_cixci_admin:
        actor_membership = CompanyUserMembership.objects.filter(user=actor, company=actor.company, status=MembershipStatus.ACTIVE).first()
        if not actor_membership or not (actor_membership.is_company_admin or actor_membership.delegated_capabilities.filter(id=capability.id).exists()):
            return False, "DELEGATION_NOT_AUTHORIZED: Actor lacks explicit delegation authority for capability"

    # 6. Separation of duties / sensitivity check
    # 7. Current lifecycle allows assignment
    if company.status != "active":
        return False, "COMPANY_NOT_ACTIVE: Company state does not allow capability assignment"

    return True, "passed"


def create_user_invitation(actor, target_company, email, first_name, last_name, role_bundle="standard_user", assigned_capability_codes=None, job_title="", phone_number="", entity_id=None):
    """
    Creates and issues a company user invitation.
    """
    # Verify actor authority
    res = check_access(actor, "company_user_management.manage_invitations", company_id=target_company.id)
    if not res.granted:
        raise ValidationError(f"ACCESS_DENIED: {res.reason}")

    # Hierarchy conflict check: check if identity exists in unrelated hierarchy
    existing = User.objects.filter(email=email).first()
    if existing and existing.company:
        existing_comp = existing.company
        if existing_comp.id != target_company.id and existing_comp.id != target_company.parent_company_id and target_company.parent_company_id != existing_comp.id:
            raise ValidationError("IDENTITY_IN_UNRELATED_HIERARCHY: User identity belongs to an unrelated company hierarchy.")

    # Check for duplicate pending invitation
    if UserInvitation.objects.filter(target_company=target_company, email=email, status=InvitationStatus.PENDING, expires_at__gt=timezone.now()).exists():
        raise ValidationError("INVITATION_ALREADY_PENDING: A valid pending invitation already exists for this email.")

    token = secrets.token_urlsafe(32)
    expires_at = timezone.now() + timedelta(days=7)

    invitation = UserInvitation.objects.create(
        target_company=target_company,
        target_entity_id=entity_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
        job_title=job_title,
        phone_number=phone_number,
        role_bundle=role_bundle,
        token=token,
        expires_at=expires_at,
        invited_by=actor,
        status=InvitationStatus.PENDING
    )

    if assigned_capability_codes:
        caps = Capability.objects.filter(code__in=assigned_capability_codes)
        invitation.assigned_capabilities.set(caps)

    log_tenant_audit("invitation.created", f"Created invitation for {email}", target_company.id, actor.id, source_record_type="UserInvitation", source_record_id=invitation.id)
    try:
        send_onboarding_invite(invitation=invitation)
    except Exception as e:
        logger.error(f"Failed sending onboarding email for invitation {invitation.id}: {e}")

    return invitation


def resend_user_invitation(actor, invitation_id):
    """Resends/reissues an invitation (rotates token, resets 7-day expiration)."""
    invitation = UserInvitation.objects.get(id=invitation_id)
    res = check_access(actor, "company_user_management.manage_invitations", company_id=invitation.target_company_id)
    if not res.granted:
        raise ValidationError(f"ACCESS_DENIED: {res.reason}")

    invitation.token = secrets.token_urlsafe(32)
    invitation.expires_at = timezone.now() + timedelta(days=7)
    invitation.status = InvitationStatus.PENDING
    invitation.save()

    log_tenant_audit("invitation.resent", f"Resent invitation for {invitation.email}", invitation.target_company_id, actor.id, source_record_type="UserInvitation", source_record_id=invitation.id)
    try:
        send_onboarding_invite(invitation=invitation)
    except Exception as e:
        logger.error(f"Failed resending onboarding email for invitation {invitation.id}: {e}")

    return invitation


def revoke_user_invitation(actor, invitation_id):
    """Revokes a pending invitation."""
    invitation = UserInvitation.objects.get(id=invitation_id)
    res = check_access(actor, "company_user_management.manage_invitations", company_id=invitation.target_company_id)
    if not res.granted:
        raise ValidationError(f"ACCESS_DENIED: {res.reason}")

    invitation.status = InvitationStatus.REVOKED
    invitation.save()

    log_tenant_audit("invitation.revoked", f"Revoked invitation for {invitation.email}", invitation.target_company_id, actor.id, source_record_type="UserInvitation", source_record_id=invitation.id)
    return invitation


def accept_user_invitation(token, password):
    """Idempotent single-use invitation acceptance."""
    invitation = UserInvitation.objects.filter(token=token).first()
    if not invitation:
        raise ValidationError("INVITATION_TOKEN_INVALID: Invalid invitation token.")

    if invitation.status == InvitationStatus.ACCEPTED:
        # Idempotent return existing user membership
        existing_user = User.objects.filter(email=invitation.email).first()
        return existing_user

    if invitation.status == InvitationStatus.REVOKED:
        raise ValidationError("INVITATION_REVOKED: Invitation has been revoked.")

    if invitation.expires_at <= timezone.now() or invitation.status == InvitationStatus.EXPIRED:
        invitation.status = InvitationStatus.EXPIRED
        invitation.save()
        raise ValidationError("INVITATION_EXPIRED: Invitation has expired.")

    with transaction.atomic():
        # Get or create target entity
        target_entity = invitation.target_entity
        if not target_entity:
            target_entity = CompanyEntity.objects.filter(company=invitation.target_company).first()

        user = User.objects.filter(email=invitation.email).first()
        if not user:
            user = User.objects.create_user(
                email=invitation.email,
                entity=target_entity,
                password=password,
                first_name=invitation.first_name,
                last_name=invitation.last_name,
                is_active=True
            )
        else:
            user.is_active = True
            user.save()

        membership, _ = CompanyUserMembership.objects.get_or_create(
            user=user,
            company=invitation.target_company,
            defaults={
                "entity": target_entity,
                "role_bundle": invitation.role_bundle,
                "status": MembershipStatus.ACTIVE,
                "is_company_admin": (invitation.role_bundle == "company_admin")
            }
        )
        membership.assigned_capabilities.set(invitation.assigned_capabilities.all())

        invitation.status = InvitationStatus.ACCEPTED
        invitation.save()

        log_tenant_audit("invitation.accepted", f"Accepted invitation for {user.email}", invitation.target_company_id, user.id, source_record_type="UserInvitation", source_record_id=invitation.id)

        # Update company status if it was in PENDING_SETUP
        if invitation.target_company.status == "pending_setup" and membership.is_company_admin:
            invitation.target_company.status = "active"
            invitation.target_company.save()

        return user


def update_user_lifecycle(actor, target_user_id, new_status):
    """Updates user membership lifecycle (active, suspended, deactivated)."""
    target_user = User.objects.get(id=target_user_id)
    membership = CompanyUserMembership.objects.filter(user=target_user).first()
    if not membership:
        raise ValidationError("USER_MEMBERSHIP_NOT_FOUND")

    res = check_access(actor, "company_user_management.manage_user_lifecycle", company_id=membership.company_id)
    if not res.granted:
        raise ValidationError(f"ACCESS_DENIED: {res.reason}")

    if new_status in (MembershipStatus.SUSPENDED, MembershipStatus.DEACTIVATED) and membership.is_company_admin:
        ensure_effective_local_company_admin_invariant(membership.company, actor=actor, exclude_user_id=target_user.id)

    membership.status = new_status
    membership.save()

    if new_status in (MembershipStatus.SUSPENDED, MembershipStatus.DEACTIVATED):
        target_user.is_active = False
        target_user.save()
    elif new_status == MembershipStatus.ACTIVE:
        target_user.is_active = True
        target_user.save()

    log_tenant_audit("user.lifecycle_updated", f"Updated user {target_user.email} status to {new_status}", membership.company_id, actor.id, source_record_type="User", source_record_id=target_user.id)
    return membership


def grant_company_admin(actor, target_user_id):
    """Grants Company Admin authority to a qualified user."""
    target_user = User.objects.get(id=target_user_id)
    membership = CompanyUserMembership.objects.filter(user=target_user).first()
    if not membership:
        raise ValidationError("USER_MEMBERSHIP_NOT_FOUND")

    res = check_access(actor, "company_user_management.grant_company_admin", company_id=membership.company_id)
    if not res.granted:
        raise ValidationError(f"ACCESS_DENIED: {res.reason}")

    membership.is_company_admin = True
    membership.role_bundle = "company_admin"
    membership.save()

    log_tenant_audit("user.admin_granted", f"Granted Company Admin to {target_user.email}", membership.company_id, actor.id, source_record_type="User", source_record_id=target_user.id)
    return membership


def revoke_company_admin(actor, target_user_id):
    """Revokes Company Admin authority from a user (gated by Final Admin invariant)."""
    target_user = User.objects.get(id=target_user_id)
    membership = CompanyUserMembership.objects.filter(user=target_user).first()
    if not membership:
        raise ValidationError("USER_MEMBERSHIP_NOT_FOUND")

    res = check_access(actor, "company_user_management.grant_company_admin", company_id=membership.company_id)
    if not res.granted:
        raise ValidationError(f"ACCESS_DENIED: {res.reason}")

    # Enforce final local admin invariant
    ensure_effective_local_company_admin_invariant(membership.company, actor=actor, exclude_user_id=target_user.id)

    membership.is_company_admin = False
    membership.role_bundle = "standard_user"
    membership.save()

    log_tenant_audit("user.admin_revoked", f"Revoked Company Admin from {target_user.email}", membership.company_id, actor.id, source_record_type="User", source_record_id=target_user.id)
    return membership


def system_admin_hierarchy_transfer(system_admin, target_user_id, new_company_id, reason="Hierarchy Transfer"):
    """
    CIXCI System Admin workflow to transfer a user identity across unrelated company hierarchies.
    """
    if not system_admin.is_cixci_admin:
        raise ValidationError("CROSS_TENANT_ACCESS_DENIED: Only CIXCI System Admin can execute hierarchy transfer.")

    user = User.objects.get(id=target_user_id)
    old_membership = CompanyUserMembership.objects.filter(user=user).first()
    new_company = Company.objects.get(id=new_company_id)

    with transaction.atomic():
        if old_membership:
            if old_membership.is_company_admin:
                ensure_effective_local_company_admin_invariant(old_membership.company, actor=system_admin, exclude_user_id=user.id)
            old_membership.status = MembershipStatus.DEACTIVATED
            old_membership.save()

        new_entity = CompanyEntity.objects.filter(company=new_company).first()
        user.entity = new_entity
        user.is_active = True
        user.save()

        new_membership, _ = CompanyUserMembership.objects.get_or_create(
            user=user,
            company=new_company,
            defaults={
                "entity": new_entity,
                "status": MembershipStatus.ACTIVE,
                "role_bundle": "standard_user",
                "is_company_admin": False
            }
        )
        new_membership.status = MembershipStatus.ACTIVE
        new_membership.save()

        log_tenant_audit("user.hierarchy_transferred", f"Transferred user {user.email} to {new_company.name}. Reason: {reason}", new_company.id, system_admin.id, source_record_type="User", source_record_id=user.id)
        return new_membership



