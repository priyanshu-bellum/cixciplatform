# Notification Platform Service Edge Cases

This document is proposal-level architecture. It lists edge cases and risks without finalizing behavior.

## Recipient And Eligibility Edge Cases

- Source module emits event without tenant scope reference.
- Tenant Company cannot resolve role-based recipients.
- Buyer/vendor relationship eligibility changes after request intake but before delivery.
- Child entity is inactive but parent company is active.
- User is provisioned but not active.
- User role no longer includes notification access.
- Licensed-property or Product Type scope changes after notification request.
- Eligible buyer/vendor notification signal is incomplete.
- Notification request tries to send to cross-tenant recipients.
- Customer recipient ownership is unclear between CIXCI and buyer systems.

## Preference And Suppression Edge Cases

- User preference conflicts with company preference.
- Child-entity preference conflicts with parent-company preference.
- Required/system notification conflicts with unsubscribe/suppression placeholder.
- Digest preference conflicts with urgent operational event.
- Quiet hours conflict with review-required or failure notification.
- Recipient has no explicit preference.
- Duplicate suppression blocks a legitimate follow-up notification.
- Retry sends duplicate message because provider response is delayed.

## Template And Payload Edge Cases

- Template references unsafe dynamic field.
- Template is approved but source-module policy changes.
- Template effective dates expire during queued delivery.
- Locale/language placeholder is unavailable.
- Dynamic fields contain sensitive pricing, invoice, warranty, customer, tenant, media, licensing, or commercial data.
- Template renders product compatibility or buyer/vendor eligibility as if Notification decided it.
- AI-drafted content conflicts with source-module redaction policy.

## Channel And Provider Edge Cases

- Email provider accepts message but later reports failure.
- Provider response arrives out of order.
- Provider delivery id is missing or duplicated.
- SMS placeholder has shorter content limits than template expects.
- In-app notification is delivered but user no longer has entity access.
- Webhook/external notification behaves like an integration workflow and needs separate boundary review.
- Provider outage causes retry storm.
- Provider response contains sensitive payload that should be masked.

## Delivery Status Edge Cases

- Notification is queued, then source event is superseded.
- Delivery succeeds after the source business state changes.
- Delivery status is unknown because provider callback fails.
- Notification expires before retry succeeds.
- Retry exhausted but source module resolves the underlying issue.
- Delivery audit reference fails to write to Logs & Audit.
- Notification history exists but Logs & Audit has no matching evidence reference.

## Eligibility-Based Catalog Growth Edge Cases

- New vendor is approved, but Product Catalog has no compatible accessories.
- Vendor adds accessories compatible with Device References not in buyer portfolio.
- Buyer is active but region scope excludes vendor/products.
- Buyer can access accessories but not branded merchandise Product Type.
- Device Catalog portfolio reference is stale.
- Product Catalog compatibility assertion is pending review.
- Notification is sent before Product Catalog visibility/activation state is ready.

## AI Agent Services Edge Cases

- AI recommends notifying a recipient who is no longer eligible.
- AI draft includes sensitive or unsupported dynamic fields.
- Risk/control agent blocks a recommendation after Notification request is queued.
- Human approval is missing for AI-drafted customer-facing content.
- AI recommendation is superseded but notification request remains queued.

## Logs & Audit Edge Cases

- Notification delivery history and Logs & Audit evidence disagree.
- Sensitive delivery history access is not audited.
- Delivery audit reference includes too much payload.
- Logs & Audit retention class conflicts with notification history retention placeholder.

## Open Questions

- Should delivery be canceled when source state is superseded?
- Should Notification re-check eligibility immediately before delivery?
- Which conflicts block delivery versus route to review?
- Which duplicate suppression windows are safe by notification type?
- Which failures should trigger operational escalation?

## Scheduled System Admin Activity Summary Email Edge Cases (Cross-Module PR)

This section catalogs edge cases for the Notification Platform Service side of the cross-module summary email hardening pass. Each edge case identifies the expected guardrail; concrete implementation behavior is deferred.

### Edge Case PR-C-NPS-EC-1: Concurrent windows for the same configuration

- Scenario: A scheduled time fires while a prior window's delivery attempt is still in `dispatched` state.
- Expected guardrail: Analytics Workflow 4 does NOT subsume `dispatched`-in-flight windows into the new window's carry-forward. The new window's interval starts at the configuration cursor (which was not advanced because the prior attempt is still in-flight). If the in-flight attempt later succeeds, NPS Workflow 9 advances the cursor; the new window's interval may therefore overlap. Phase 1 accepts that this can produce a window with overlap that is then handled by deduplication on source fact references; alternatively the implementation may serialize evaluations per configuration. Implementation choice deferred.

### Edge Case PR-C-NPS-EC-2: Paused, then unpaused after long pause

- Scenario: Configuration paused for several weeks. Unpaused. Next scheduled time arrives.
- Expected guardrail: cursor not reset; next window's interval is the entire pause period. Aggregation may be large but architecturally well-defined. Future PR may introduce a cursor-reset-on-unpause toggle; Phase 1 accepts the long-pause-large-window behavior.

### Edge Case PR-C-NPS-EC-3: Burst of retries

- Scenario: Implementation produces multiple retry attempts for the same Reporting Window in rapid succession after the first failure.
- Expected guardrail: each retry produces a new Activity Summary Delivery Attempt referencing the same aggregation record and Reporting Window. Cursor advances only on the first attempt that reaches `acknowledged` terminal state. Subsequent retry attempts (if any) become spurious if the first succeeded; implementation should deduplicate. Phase 1 architectural rule: only the first `acknowledged` transition triggers cursor advancement; subsequent transitions to `acknowledged` for the same Reporting Window's attempts are no-ops on the cursor.

### Edge Case PR-C-NPS-EC-4: Weekend / holiday skip

- Scenario: `weekend_behavior = skip` and current scheduled time falls on a Saturday in the configured timezone.
- Expected guardrail: NPS Workflow 2 confirms calendar rules; the trigger is skipped; no window is created; no audit record specific to the skipped trigger is created (the schedule's day-skipping behavior is the documented Phase 1 design). Future operator-surface PR may introduce skip-evidence records.

### Edge Case PR-C-NPS-EC-5: Carry-forward storm

- Scenario: Transport outage causes 10 consecutive scheduled deliveries to fail across two days. The 11th delivery succeeds.
- Expected guardrail: each of the 10 failures preserves its Reporting Window in `delivery_failed`. The 11th evaluation (Analytics Workflow 4) identifies all 10 prior `delivery_failed` windows and includes them in its `carry_forward_window_reference_collection`. The 11th aggregation covers the cumulative interval. On 11th delivery's `acknowledged` transition (NPS Workflow 9), all 10 prior windows transition to `superseded` together. Cursor advances to the 11th window's end timestamp.

### Edge Case PR-C-NPS-EC-6: Zero effective recipients

- Scenario: At delivery time, the role-derived component returns zero CIXCI System Admin users and the explicit recipient list is empty (or fully excluded by vendor/buyer filter).
- Expected guardrail: NPS Workflow 7 cannot proceed with transport handoff. The Activity Summary Delivery Attempt transitions immediately to `failed` with `failure_reason_text = "zero effective recipients"`. Cursor does NOT advance. The Reporting Window enters `delivery_failed` and is eligible for carry-forward.

### Edge Case PR-C-NPS-EC-7: Vendor or buyer email in explicit list

- Scenario: Explicit recipient list contains an address that Tenant Company resolves to a vendor or buyer user.
- Expected guardrail: NPS Workflow 3 filters the address out at delivery time. The exclusion is audited. The effective recipient set may still contain other valid addresses. The configuration's explicit list is not silently edited; future configuration-edit operator UX may surface the filtered address for cleanup, but Phase 1 keeps the explicit list as-stored.

### Edge Case PR-C-NPS-EC-8: Transport reference unavailable

- Scenario: No Integration Management hook exists at PR-C application time; the `transport_reference` field on Activity Summary Delivery Attempt remains null.
- Expected guardrail: the delivery attempt may still transition to `dispatched`, `acknowledged`, or `failed` based on transport-layer behavior (provider-layer code without Integration Management surface). `delivery_acknowledgement_reference` or `delivery_failure_reference` may also be null in Phase 1; `failure_reason_text` provides Phase 1 fallback for failure detail. Future Integration Management hardening PR populates the reference fields.

### Edge Case PR-C-NPS-EC-9: Provider timeout vs. failure

- Scenario: Transport does not respond within a provider-layer timeout; transport layer reports failure.
- Expected guardrail: NPS Workflow 8 handles the failure normally. Distinguishing timeout from explicit provider rejection is implementation detail; PR-C captures the failure via the entity and the failure reason.

### Edge Case PR-C-NPS-EC-10: Acknowledgement out of order

- Scenario: Provider reports acknowledgement for an attempt that has already transitioned to `failed` (due to a prior timeout-based failure decision at the provider layer).
- Expected guardrail: Phase 1 accepts the existing terminal state. The late acknowledgement is not retroactively applied. (Implementation may produce an alert; PR-C does not specify alert semantics.) The Reporting Window remains in `delivery_failed` until carry-forward subsumes it.

### Edge Case PR-C-NPS-EC-11: Configuration retired mid-evaluation

- Scenario: Configuration retired while a Reporting Window for that configuration is in `evaluating` or `aggregated` state.
- Expected guardrail: the in-flight window completes its evaluation/aggregation cycle. NPS Workflow 7 may still create a delivery attempt for the produced aggregation record (Phase 1 accepts this). Subsequent scheduled times for the retired configuration are not triggered. Future operator-surface PR may introduce a "cancel in-flight cycle" workflow; PR-C does not.

### Edge Case PR-C-NPS-EC-12: Concurrent edit to explicit recipient list

- Scenario: CIXCI System Admin edits `explicit_recipient_list` while a Reporting Window for that configuration is between `evaluating` and `dispatched`.
- Expected guardrail: NPS Workflow 3 (Recipient Scope Resolution) uses the configuration's current `explicit_recipient_list` at the moment of NPS Workflow 7 execution. If the edit committed before Workflow 7 ran, the new list is used; if after, the prior list was used. The `effective_recipient_scope_snapshot` captures whichever set was resolved; the snapshot is immutable and is the audit record of what was actually delivered to.

### Edge Case PR-C-NPS-EC-13: Cursor at exact boundary moment of timezone DST shift

- Scenario: DST transition causes a scheduled delivery time to occur twice in one day (fall-back) or to be skipped (spring-forward).
- Expected guardrail: implementation-level detail; PR-C does not specify DST handling. The configuration's `timezone_reference` and `delivery_times` interact with the implementation-layer scheduler. Phase 1 accepts implementation behavior; documented as deferred.

### Edge Case PR-C-NPS-EC-14: Email template renders to zero-length body

- Scenario: Aggregation record is non-empty but all metric values are zero (some legitimate-zero edge case where source events fired but counts ended up zero after some implementation-level filter).
- Expected guardrail: this is a near-equivalent of no-activity; PR-C Phase 1 does not distinguish "Aggregation Record with all zeros" from "Aggregation Record with non-zero values" at the delivery layer. If the Aggregation Record exists, delivery is attempted. (No-activity suppression is determined at Analytics Workflow 5 step 6 before the Aggregation Record is created; if the record exists, it indicates non-zero events were counted somewhere.)
