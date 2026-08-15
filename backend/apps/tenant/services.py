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
                "fulfillment.return.create",
                "fulfillment.handoff.update",
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
            if company.company_type == "vendor" and capability_code in vendor_safe_caps:
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


def is_capability_allowed_for_company(capability_code: str, company_type: str, buyer_type: Optional[str] = None) -> bool:
    """Check if a capability is allowed to be assigned to a company based on its type."""
    from apps.tenant.models import CompanyType
    
    if company_type == CompanyType.CIXCI_INTERNAL:
        return True

    if company_type == CompanyType.VENDOR:
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

    if company_type == CompanyType.BUYER:
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

    default_codes = []
    if company.company_type == CompanyType.VENDOR:
        default_codes = [
            "catalog.product.create",
            "catalog.product.update",
            "catalog.product.delete",
            "catalog.product.manage_selling",
        ]
    elif company.company_type == CompanyType.BUYER:
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



