"""
Notification Platform Service — Preference Precedence Evaluator

Architecture rule (spec.md):
  10-step precedence ladder evaluated in strict order. Conflicting preferences
  produce a deterministic outcome. If precedence cannot be resolved, outcome
  is review_required — never a guess.
"""
import logging
from dataclasses import dataclass, field
import uuid
from typing import List, Optional
from uuid import UUID

logger = logging.getLogger(__name__)


@dataclass
class EvaluationContext:
    event_type: str
    channel: str
    company_scope_id: UUID
    recipient_ids: List[UUID]
    is_required_system: bool = False
    classification: str = "CONFIGURABLE_OPERATIONAL"
    source_module_policy: dict = field(default_factory=dict)


@dataclass
class PreferenceEvaluationResult:
    outcome: str          # send | block | delay | digest | review_required | suppress
    reason: str
    steps_evaluated: List[str] = field(default_factory=list)


def evaluate_preference_ladder(ctx: EvaluationContext) -> PreferenceEvaluationResult:
    """
    The 10-step NPS preference precedence ladder.

    Steps:
      1.  Required/system classification
      2.  Legal unsubscribe requirements
      3.  Hard suppression rules
      4.  Source-module policy & redaction eligibility
      5.  Child-entity preference
      6.  Company preference
      7.  User preference
      8.  Event-type preference
      9.  Channel preference
      10. Quiet hours → digest vs immediate
    """
    steps = []

    # ── Step 1: Required / System ──────────────────────────────────────────────
    steps.append("step_1_required_system")
    is_required = ctx.is_required_system or ctx.classification in ("REQUIRED_OPERATIONAL", "ADMIN_SYSTEM_CRITICAL")

    # ── Step 2: Legal unsubscribe ──────────────────────────────────────────────
    steps.append("step_2_legal_unsubscribe")
    if _has_legal_unsubscribe(ctx):
        return _finish(ctx, steps, "block", "legal_unsubscribe")

    # ── Step 3: Hard suppression ───────────────────────────────────────────────
    steps.append("step_3_hard_suppression")
    if _is_hard_suppressed(ctx):
        return _finish(ctx, steps, "suppress", "hard_suppression")

    if is_required:
        # Required notifications bypass optional preference blocks (Steps 5-10)
        logger.debug("NPS: required/system notification — skipping optional preference blocks")
        return _finish(ctx, steps, "send", "required_system_override")

    # ── Step 4: Source-module policy ───────────────────────────────────────────
    steps.append("step_4_source_module_policy")
    policy_outcome = ctx.source_module_policy.get("outcome")
    if policy_outcome == "block":
        return _finish(ctx, steps, "block", "source_module_policy_block")
    if policy_outcome == "review_required":
        return _finish(ctx, steps, "review_required", "source_module_policy_review")

    # ── Step 5: Child-entity preference ───────────────────────────────────────
    steps.append("step_5_entity_preference")
    entity_pref = _load_entity_preference(ctx)
    if entity_pref == "block":
        return _finish(ctx, steps, "block", "entity_preference_block")

    # ── Step 6: Company preference ─────────────────────────────────────────────
    steps.append("step_6_company_preference")
    company_pref = _load_company_preference(ctx)
    if company_pref == "block":
        return _finish(ctx, steps, "block", "company_preference_block")

    # ── Step 7: User preference ────────────────────────────────────────────────
    steps.append("step_7_user_preference")
    user_pref = _load_user_preference(ctx)
    if user_pref == "unsubscribed":
        return _finish(ctx, steps, "suppress", "user_unsubscribed")

    # ── Step 8: Event-type preference ─────────────────────────────────────────
    steps.append("step_8_event_type_preference")
    event_pref = _load_event_type_preference(ctx)
    if event_pref == "disabled":
        return _finish(ctx, steps, "suppress", "event_type_disabled")

    # ── Step 9: Channel preference ─────────────────────────────────────────────
    steps.append("step_9_channel_preference")
    channel_pref = _load_channel_preference(ctx)
    if channel_pref == "disabled":
        return _finish(ctx, steps, "block", "channel_disabled")

    # ── Step 10: Quiet hours → digest vs immediate ────────────────────────────
    steps.append("step_10_quiet_hours_digest")
    if _in_quiet_hours(ctx):
        return _finish(ctx, steps, "delay", "quiet_hours")
    if _prefers_digest(ctx):
        return _finish(ctx, steps, "digest", "digest_preference")

    return _finish(ctx, steps, "send", "all_checks_passed")


def _finish(ctx, steps, outcome, reason):
    return PreferenceEvaluationResult(outcome=outcome, reason=reason, steps_evaluated=steps)


# ── Preference DB Evaluation Functions ─────────────────────────────────────────

def _has_legal_unsubscribe(ctx: EvaluationContext) -> bool:
    from .models import NotificationPreference, PreferenceLevel
    if not ctx.recipient_ids:
        return False
    return NotificationPreference.objects.filter(
        level=PreferenceLevel.USER,
        scope_id__in=ctx.recipient_ids,
        is_unsubscribed=True,
        event_type="legal"
    ).exists()


def _is_hard_suppressed(ctx: EvaluationContext) -> bool:
    from .models import NotificationPreference
    if not ctx.recipient_ids:
        return False
    return NotificationPreference.objects.filter(
        scope_id__in=ctx.recipient_ids,
        is_enabled=False,
        is_unsubscribed=True
    ).exists()


def _load_entity_preference(ctx: EvaluationContext):
    from .models import NotificationPreference, PreferenceLevel
    pref = NotificationPreference.objects.filter(
        level=PreferenceLevel.ENTITY,
        scope_id=ctx.company_scope_id
    ).first()
    if pref and not pref.is_enabled:
        return "block"
    return None


def _load_company_preference(ctx: EvaluationContext):
    from .models import NotificationPreference, PreferenceLevel
    pref = NotificationPreference.objects.filter(
        level=PreferenceLevel.COMPANY,
        scope_id=ctx.company_scope_id
    ).first()
    if pref and not pref.is_enabled:
        return "block"
    return None


def _load_user_preference(ctx: EvaluationContext):
    from .models import NotificationPreference, PreferenceLevel
    if not ctx.recipient_ids:
        return None
    unsub = NotificationPreference.objects.filter(
        level=PreferenceLevel.USER,
        scope_id__in=ctx.recipient_ids,
        is_unsubscribed=True
    ).first()
    if unsub:
        return "unsubscribed"
    return None


def _load_event_type_preference(ctx: EvaluationContext):
    from .models import NotificationPreference
    if not ctx.event_type:
        return None
    pref = NotificationPreference.objects.filter(
        event_type=ctx.event_type,
        is_enabled=False
    ).first()
    if pref:
        return "disabled"
    return None


def _load_channel_preference(ctx: EvaluationContext):
    from .models import NotificationPreference
    if not ctx.channel:
        return None
    pref = NotificationPreference.objects.filter(
        channel=ctx.channel,
        is_enabled=False
    ).first()
    if pref:
        return "disabled"
    return None


def _in_quiet_hours(ctx: EvaluationContext) -> bool:
    from .models import NotificationPreference
    from django.utils import timezone
    now_time = timezone.localtime().time()
    if not ctx.recipient_ids:
        return False
    prefs = NotificationPreference.objects.filter(
        scope_id__in=ctx.recipient_ids,
        quiet_hours_start__isnull=False,
        quiet_hours_end__isnull=False
    )
    for p in prefs:
        if p.quiet_hours_start <= p.quiet_hours_end:
            if p.quiet_hours_start <= now_time <= p.quiet_hours_end:
                return True
        else:
            if now_time >= p.quiet_hours_start or now_time <= p.quiet_hours_end:
                return True
    return False


def _prefers_digest(ctx: EvaluationContext) -> bool:
    from .models import NotificationPreference
    if not ctx.recipient_ids:
        return False
    return NotificationPreference.objects.filter(
        scope_id__in=ctx.recipient_ids,
        use_digest=True
    ).exists()


# ── Service Helper for Source Modules ─────────────────────────────────────────

def create_notification_request(
    event_type: str,
    source_module: str,
    company_scope_reference,
    recipient_ids: list,
    safe_payload_summary: dict = None,
    source_record_id=None,
    template_code: str = "",
    channel: str = "email",
    classification: str = "CONFIGURABLE_OPERATIONAL",
    idempotency_key: str = None
):
    """
    Canonical helper function for source modules to emit notification intents.
    Source modules emit alerts, exceptions, and review-required signals ONLY.
    Operational CSV file delivery MUST NOT use this helper.
    """
    import uuid
    from .models import NotificationRequest, NotificationChannel, NotificationClassification

    if not idempotency_key:
        idempotency_key = f"{event_type}_{source_record_id or uuid.uuid4().hex[:12]}_{uuid.uuid4().hex[:8]}"

    # Verify idempotency key exists
    existing = NotificationRequest.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        return existing

    recipient_strs = [str(r) for r in recipient_ids if r]

    req = NotificationRequest.objects.create(
        event_type=event_type,
        source_module=source_module,
        source_record_id=source_record_id,
        safe_payload_summary=safe_payload_summary or {},
        requested_recipient_ids=recipient_strs,
        company_scope_reference=company_scope_reference,
        template_code=template_code or f"tpl_{event_type}",
        channel=channel or NotificationChannel.EMAIL,
        classification=classification or NotificationClassification.CONFIGURABLE_OPERATIONAL,
        idempotency_key=idempotency_key,
    )
    return req


# ── SLA Reminder Chain Services (Section 13) ─────────────────────────────────

def trigger_sla_reminder_chain(
    source_module: str,
    source_condition_id,
    company_scope_id,
    event_type: str,
    recipient_ids: list,
    safe_payload_summary: dict = None,
    channel: str = "email"
):
    """
    Triggers or advances an SLA reminder chain for an unresolved threshold condition.
    - Creates or updates SLAReminderChain record.
    - Repeats daily while condition is active.
    - Emits a NotificationRequest belonging to the chain.
    """
    import datetime
    from django.utils import timezone
    from .models import SLAReminderChain, ChainStatus, NotificationClassification

    chain = SLAReminderChain.objects.filter(
        source_condition_reference=source_condition_id,
        chain_status=ChainStatus.ACTIVE
    ).first()

    now = timezone.now()

    if not chain:
        chain_id_str = f"sla_chain_{source_condition_id}_{uuid.uuid4().hex[:6]}"
        chain = SLAReminderChain.objects.create(
            sla_chain_id=chain_id_str,
            source_module=source_module,
            source_condition_reference=source_condition_id,
            company_scope_reference=company_scope_id,
            event_type=event_type,
            reminder_sequence=1,
            first_threshold_at=now,
            last_reminder_at=now,
            next_reminder_due_at=now + datetime.timedelta(days=1),
            chain_status=ChainStatus.ACTIVE
        )
    else:
        chain.reminder_sequence += 1
        chain.last_reminder_at = now
        chain.next_reminder_due_at = now + datetime.timedelta(days=1)
        chain.save(update_fields=["reminder_sequence", "last_reminder_at", "next_reminder_due_at", "updated_at"])

    idempotency_key = f"{event_type}_{chain.id}_seq_{chain.reminder_sequence}"

    req = create_notification_request(
        event_type=event_type,
        source_module=source_module,
        company_scope_reference=company_scope_id,
        recipient_ids=recipient_ids,
        safe_payload_summary=safe_payload_summary or {},
        source_record_id=source_condition_id,
        template_code=f"tpl_{event_type}",
        channel=channel,
        classification=NotificationClassification.REQUIRED_OPERATIONAL,
        idempotency_key=idempotency_key
    )
    return chain, req


def resolve_sla_reminder_chain(source_condition_id):
    """
    Resolves an SLA reminder chain immediately when source condition is cleared.
    - Marks chain_status="RESOLVED", resolved_at=now().
    - Supersedes queued/undelivered attempts for this condition.
    - Leaves delivered reminders in DELIVERED status.
    """
    from django.utils import timezone
    from .models import SLAReminderChain, ChainStatus, DeliveryAttempt, DeliveryStatus, NotificationRequest

    chains = SLAReminderChain.objects.filter(
        source_condition_reference=source_condition_id,
        chain_status=ChainStatus.ACTIVE
    )
    now = timezone.now()
    resolved_count = 0

    for chain in chains:
        chain.chain_status = ChainStatus.RESOLVED
        chain.resolved_at = now
        chain.save(update_fields=["chain_status", "resolved_at", "updated_at"])
        resolved_count += 1

        # Supersede undelivered queued attempts for this source condition
        requests = NotificationRequest.objects.filter(source_record_id=source_condition_id)
        DeliveryAttempt.objects.filter(
            notification_request__in=requests,
            status__in=[DeliveryStatus.QUEUED, DeliveryStatus.REQUESTED, DeliveryStatus.RETRY_SCHEDULED]
        ).update(status=DeliveryStatus.SUPERSEDED)

    return resolved_count


