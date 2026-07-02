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
    if getattr(user, "is_cixci_admin", False) and getattr(user, "is_active", False):
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
            }
            if company.company_type == "buyer" and capability_code in buyer_safe_caps:
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
from django.core.mail import send_mail
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

def send_onboarding_invite(user):
    """Send onboarding invitation email with signed activation link."""
    token = generate_onboarding_token(user)
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    link = f"{frontend_url}/confirm-email?token={token}"
    
    subject = "Activate your CIXCI Account"
    message = (
        f"Hello {user.first_name or 'there'},\n\n"
        f"You have been added as an admin on CIXCI. Please click the link below "
        f"to confirm your email and set your password to log in:\n\n"
        f"{link}\n\n"
        f"This invitation link will expire in 3 days."
    )
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )

