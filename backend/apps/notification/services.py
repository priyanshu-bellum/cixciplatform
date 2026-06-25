"""
Notification Platform Service — Preference Precedence Evaluator

Architecture rule (spec.md):
  10-step precedence ladder evaluated in strict order. Conflicting preferences
  produce a deterministic outcome. If precedence cannot be resolved, outcome
  is review_required — never a guess.
"""
import logging
from dataclasses import dataclass, field
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
    source_module_policy: dict = field(default_factory=dict)


@dataclass
class PreferenceEvaluationResult:
    outcome: str          # send | block | delay | digest | review_required | suppress
    reason: str
    steps_evaluated: List[str] = field(default_factory=list)


def evaluate_preference_ladder(ctx: EvaluationContext) -> PreferenceEvaluationResult:
    """
    The 10-step NPS preference precedence ladder.

    Steps (from spec.md):
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

    Returns a deterministic outcome for the notification.
    """
    steps = []

    # ── Step 1: Required / System ──────────────────────────────────────────────
    steps.append("step_1_required_system")
    if ctx.is_required_system:
        # Required notifications bypass optional preference suppression
        # but still require recipient scope, redaction, and legal checks
        logger.debug("NPS: required/system notification — skipping optional preference blocks")
        # Fall through to step 2 (legal) and 3 (hard suppression) only
        return _finish(ctx, steps, "send", "required_system_override")

    # ── Step 2: Legal unsubscribe ──────────────────────────────────────────────
    steps.append("step_2_legal_unsubscribe")
    if _has_legal_unsubscribe(ctx):
        return _finish(ctx, steps, "block", "legal_unsubscribe")

    # ── Step 3: Hard suppression ───────────────────────────────────────────────
    steps.append("step_3_hard_suppression")
    if _is_hard_suppressed(ctx):
        return _finish(ctx, steps, "suppress", "hard_suppression")

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


# ── Stub implementations (to be completed with DB queries in each phase) ───────

def _has_legal_unsubscribe(ctx) -> bool:
    return False  # TODO: query NotificationPreference for legal unsubscribe

def _is_hard_suppressed(ctx) -> bool:
    return False  # TODO: check global suppression list

def _load_entity_preference(ctx):
    return None  # TODO: query entity-level preference

def _load_company_preference(ctx):
    return None  # TODO: query company-level preference

def _load_user_preference(ctx):
    return None  # TODO: query user-level preference

def _load_event_type_preference(ctx):
    return None  # TODO: query event-type preference

def _load_channel_preference(ctx):
    return None  # TODO: query channel preference

def _in_quiet_hours(ctx) -> bool:
    return False  # TODO: check quiet hours config

def _prefers_digest(ctx) -> bool:
    return False  # TODO: check digest preference
