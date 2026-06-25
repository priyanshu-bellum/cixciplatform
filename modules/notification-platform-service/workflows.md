# Notification Platform Service Workflows

This document is proposal-level architecture. It defines initial workflows without finalizing implementation behavior, queues, provider mechanics, approvals, or channel support.

## Notification Request Intake

1. Source module emits an eligible event or submits a notification request.
2. Notification Platform Service validates source module identity, source event reference, tenant scope, recipient intent, redaction class, template type, and idempotency key.
3. Eligibility evidence is validated where the request depends on buyer/vendor eligibility, product compatibility, product visibility, supported-device matching, licensed-property scope, or tenant readiness.
4. Duplicate suppression checks whether the same source event, recipient intent, channel, and template should be suppressed.
5. Request is accepted, rejected, suppressed, delayed, digested, or routed to review.

Notification request intake must not decide source business state.

## Eligibility Evidence Validation

1. Notification request identifies required eligibility evidence references.
2. Notification validates source module, source event reference, eligibility signal id, eligibility signal version/hash, recipient scope, recipient group reference, expiration timestamp, tenant scope, source-owned eligibility result, and re-check-before-delivery flag.
3. Expired, missing, inconsistent, cross-tenant, or stale eligibility evidence blocks delivery or routes to review.
4. If re-check-before-delivery is true, delivery is held until the owning module provides a fresh eligibility signal or confirms the current signal remains valid.

Notification Platform Service must not compute buyer/vendor eligibility, product compatibility, product visibility, supported-device matching, licensed-property scope, tenant readiness, routing state, fulfillment state, invoice state, warranty state, or AI recommendation state.

## Recipient Resolution

1. Notification request provides recipient intent and tenant scope.
2. Notification Platform Service consumes Tenant Company-provided user, role, company/entity, activation, eligibility, and scope signals.
3. Role expansion snapshot and recipient expansion snapshot are created.
4. Max recipients per request and recipient projection scope are evaluated.
5. Inactive users and inactive entities are excluded according to Tenant Company signals.
6. Stale roles route to review, refresh, or exclusion according to proposal-level policy.
7. Duplicate recipients are collapsed.
8. Recipients are resolved into scoped recipient references.
9. Excluded recipients and exclusion reasons are recorded where safe.
10. Recipient snapshot/reference is attached to delivery plan.

Notification must not infer buyer/vendor eligibility if source modules do not provide it. Cross-tenant recipient resolution is denied by default.

## Preference And Suppression Evaluation

1. Required/system notification classification is evaluated.
2. Legal unsubscribe requirements are evaluated for notification classes where unsubscribe or consent rules apply.
3. Hard suppression rules are evaluated.
4. Source-module policy and redaction safety are evaluated.
5. Child-entity, company, user, event-type, and channel preferences are evaluated.
6. Quiet hours are evaluated for delay or digest behavior where allowed.
7. Digest vs immediate preference is evaluated after blocking and required/system rules.
8. Final outcome is send, block, delay, digest, review-required, or suppress.

Required/system notifications cannot be accidentally suppressed by normal user preferences. Optional notifications should respect suppression, unsubscribe, and preference settings. Legally required unsubscribe/suppression rules override optional marketing-style notifications.

## Template Selection And Rendering

1. Template type and event type identify candidate templates.
2. Channel, locale/language placeholder, tenant/company scope, approval status, and effective dates are evaluated.
3. Safe dynamic fields are validated against template rules and source-module policy.
4. Redaction rules are applied.
5. Template rendering succeeds or blocks delivery.

Templates must not expose sensitive data unless allowed by recipient scope, source-module policy, and redaction rules.

## Channel Selection

1. Candidate channels are identified from request, template, event type, recipient preferences, and required/system status.
2. Channel availability, provider placeholder constraints, provider throughput limits, and redaction limits are evaluated.
3. Delivery plan is created for email, in-app, SMS placeholder, webhook/external placeholder, or future push placeholder.
4. Channel selection result is recorded.

## Digest And Fanout Workflow

1. Request is evaluated for immediate delivery, digest, delay, or suppression.
2. High-volume requests create fanout batch records.
3. Digest-eligible requests create or join digest job and digest batch records.
4. Queue partition key is selected by tenant, channel, provider, event class, or another proposal-level partition.
5. Fanout caps, provider rate limits, backpressure, and retry budget controls are applied.
6. Fanout batch status and digest job status are queryable.
7. Notification storm prevention may delay, digest, throttle, or route high-risk fanout to review.

High-volume catalog notifications, buyer/vendor fanout, role-based expansion, and future customer-facing notifications should not bypass these controls.

## Delivery Orchestration

1. Delivery attempts are queued.
2. Provider or channel adapter placeholder receives a delivery request.
3. Delivery attempt status is recorded.
4. Provider response reference is stored where permitted.
5. Delivery history is updated.
6. Delivery audit reference may be sent to Logs & Audit.

External providers are not the source of truth for CIXCI notification history.

## Delivery Callback Handling

1. Provider callback is received with provider delivery id, provider event id placeholder, provider status, source system timestamp, received timestamp, and idempotency key.
2. Duplicate callbacks are collapsed.
3. Out-of-order callbacks are evaluated against delivery attempt, attempt number, provider timestamp, received timestamp, and current status.
4. Stale callbacks do not reopen terminal states without review.
5. Callback result updates delivery status history where permitted.
6. Provider response reference is stored or masked according to redaction policy.

## Delivery Status Precedence

Proposal-level status precedence should handle requested, queued, sent, delivered, failed, bounced, suppressed, delayed, expired, cancelled, and superseded.

Rules:

- Suppressed, expired, cancelled, superseded, and retry exhausted are terminal unless source policy allows review and supersession.
- Delivered should not be overwritten by stale failed callbacks without review.
- Bounced may supersede sent where provider evidence is current and idempotent.
- Source-event supersession may cancel or supersede queued and delayed deliveries.
- Retry exhaustion routes to terminal failed or review-required according to retry policy placeholder.

## Retry / Failure Handling

1. Delivery failure is recorded with failure reason.
2. Retry policy placeholder determines retryability and retry budget.
3. Retry is scheduled or failure becomes terminal.
4. Retry exhausted may trigger review, Logs & Audit signal, AI Agent Services signal, or future Notification notification placeholder.
5. Duplicate retry storms are prevented through idempotency, retry budgets, provider rate-limit handling, and backpressure.

## Eligibility-Based Catalog Growth Notification Workflow

1. Tenant Company emits or provides buyer/vendor activation and eligibility signals.
2. Product Catalog emits accessory addition or catalog update signals.
3. Device Catalog provides Device Reference and buyer portfolio signals where compatibility is relevant.
4. Source modules provide eligible notification signal or source event with eligibility evidence.
5. Notification Platform Service validates eligibility evidence, resolves recipients, applies preferences, and delivers notification.

Notification Platform Service must not independently decide buyer/vendor eligibility or product compatibility.

## Logs & Audit Relationship Workflow

1. Notification delivery attempt creates delivery evidence.
2. Notification Platform Service may send delivery audit reference to Logs & Audit.
3. Logs & Audit records platform audit evidence where appropriate.
4. Notification Platform Service retains notification delivery history.

Notification Platform Service must not replace Logs & Audit evidence records.

## AI Agent Draft Workflow

1. AI Agent Services recommends recipients or drafts notification content where approved.
2. Human approval or source-module policy is applied where required.
3. Notification Platform Service receives approved notification request or safe dynamic fields.
4. Notification Platform Service applies eligibility evidence validation, template, redaction, preferences, suppression, and delivery rules.
5. Delivery history links back to AI recommendation/draft references where permitted.

AI must not bypass notification preferences, approval, redaction, tenant scope, suppression, or source-module rules.

## Preference Update Workflow

1. Authorized user/admin requests preference update.
2. Tenant scope and permission are validated.
3. Preference record/version is updated.
4. Future notification requests apply updated preference through the precedence model.
5. Sensitive preference changes may be auditable.

## Template Lifecycle Workflow

1. Template draft is created.
2. Safe dynamic fields, redaction rules, event type, channel, tenant/company scope placeholder, and effective dates are defined.
3. Preview/test occurs.
4. Approval placeholder is completed where required.
5. Template version becomes active or is retired/superseded.

## Open Questions

- Which workflows are synchronous versus queued?
- Which notifications should be digested?
- Which failures require escalation?
- Which template approvals are mandatory?
- Which customer-facing workflows belong to buyer systems instead of CIXCI?
- Which delivery statuses are terminal by channel?
- Which source events require re-check-before-delivery behavior?

## Scheduled System Admin Activity Summary Email Workflows (Cross-Module PR)

This section adds six architecture-level workflows owned by Notification Platform Service for the scheduled summary email cross-module hardening pass. Three additional workflows are owned by Analytics / Reporting (see analytics-reporting/workflows.md PR-C section), and one additional workflow is owned by Logs & Audit File Tracking (see logs-audit-file-tracking/workflows.md PR-C section), for a total of ten workflows across the three modules. Workflows are described at proposal level; runtime concurrency, retry tuning, and persistence mechanics are implementation concerns and remain deferred.

### Cross-module workflow choreography (high level)

Notification initiates schedule. Analytics aggregates. Logs & Audit records evidence.

The choreography for one summary cycle:

1. **NPS Workflow 1** (Configuration Lifecycle) - prior administrative step; produces an `active` Activity Summary Configuration.
2. **NPS Workflow 2** (Scheduled Window Evaluation Trigger) - a configured delivery time arrives; Notification Platform Service requests Analytics / Reporting to evaluate a window.
3. **Analytics Workflow 4** (Reporting Window Evaluation) - Analytics creates a window with carry-forward references.
4. **Analytics Workflow 5** (Source Fact Aggregation) - Analytics aggregates source facts. If non-empty, produces Aggregation Record and triggers Logs & Audit Workflow 10 to record Generated Evidence; then triggers NPS Workflow 7. If empty, triggers Analytics Workflow 6.
5. **Analytics Workflow 6** (No-Activity Suppression) - Analytics transitions window to suppressed-no-activity; triggers Logs & Audit Workflow 10 to record No-Activity Summary Suppression Evidence; emits the suppression-outcome event. **Analytics does NOT mutate the Notification Platform Service Activity Summary Configuration cursor.** Notification Platform Service consumes the no-activity outcome and advances its own cursor via NPS Workflow 9 (which handles both the successful-delivery cursor-advancement trigger and the consumed-no-activity-outcome cursor-advancement trigger). No delivery attempt is created.
6. **NPS Workflow 7** (Summary Delivery Attempt) - Notification Platform Service creates a delivery attempt; runs NPS Workflow 3 (Recipient Scope Resolution); hands off to transport (Integration Management or provider layer).
7. **NPS Workflow 8** (Delivery Failure / Carry-Forward) - on transport failure, captures the failure reference; does not advance cursor; the window remains in `delivery_failed` state and is eligible for carry-forward at the next window evaluation.
8. **NPS Workflow 9** (Delivery Success / Cursor Advancement) - on transport acknowledgement, captures the acknowledgement reference; advances the configuration's last-successful-summary cursor to the window's end timestamp.
9. **Logs & Audit Workflow 10** (Summary Audit Evidence Recording) - throughout the choreography, creates appropriate evidence records.

### NPS Workflow 1 - Activity Summary Configuration Lifecycle

- **Trigger:** CIXCI System Admin creates, updates, pauses, or retires an Activity Summary Configuration.
- **Steps:**
  1. Resolve authority via Tenant Company `check_access`. Only CIXCI System Admin actors may proceed; vendor users and buyer users are excluded.
  2. For `create`: create the configuration in `draft` state.
  3. For `update`: validate the requested field changes (scheduling fields, recipient scope, business calendar reference, weekend/holiday behavior). Vendor and buyer users cannot be added to recipient scope. Cursor field cannot be edited via this workflow.
  4. For `pause`: transition `active -> paused`. Cursor remains as-is.
  5. For `retire`: transition (any state) `-> retired`. Cursor remains as-is for audit traceability.
  6. For `activate`: transition `draft -> active` or `paused -> active`. Cursor remains as-is; the next scheduled evaluation extends from cursor to current scheduled time.
  7. Audit. Emit the appropriate event from the PR-C event inventory (`notification.activity-summary-configuration.created` or `notification.activity-summary-configuration.updated`).
- **Discipline:**
  - Vendor users and buyer users excluded.
  - Cursor field is not edited by this workflow; only NPS Workflow 9 (Delivery Success / Cursor Advancement) advances the cursor, and it does so on both the delivery-acknowledged trigger and the consumed-no-activity-suppression-outcome trigger. Analytics / Reporting and Logs & Audit File Tracking never mutate the cursor directly.
  - Configuration retirement does not delete prior windows, aggregation records, delivery attempts, or evidence records.
  - Pausing does not advance the cursor; the long-pause-large-window behavior is accepted in Phase 1.

### NPS Workflow 2 - Scheduled Window Evaluation Trigger

- **Trigger:** A scheduled delivery time arrives per a configuration's `delivery_times` and `timezone_reference`, evaluated against `business_calendar_reference`, `weekend_behavior`, and `holiday_behavior` rules. The configuration's `lifecycle_state` must be `active`.
- **Steps:**
  1. Notification Platform Service confirms the configuration is `active`. Paused, draft, and retired configurations do not trigger evaluation.
  2. Notification Platform Service confirms calendar / weekend / holiday rules permit evaluation at this scheduled time. If `weekend_behavior` is `skip` and the current day is a weekend per the timezone, evaluation is skipped; no window is created; no audit record is created for the skipped trigger (the schedule's day-skipping behavior is the documented Phase 1 design; future operator-surface PR may introduce skip-evidence).
  3. Notification Platform Service requests Analytics / Reporting to evaluate a window by passing the configuration reference, the current cursor (window start), and the current scheduled time (window end).
  4. Analytics / Reporting takes over via Analytics Workflow 4.
- **Discipline:**
  - Notification Platform Service initiates; Analytics / Reporting evaluates.
  - Notification Platform Service does not aggregate. Aggregation is exclusively Analytics / Reporting territory.
  - Notification Platform Service does not create a delivery attempt at this stage; the delivery attempt is created only after Analytics returns a non-empty aggregation record (NPS Workflow 7).
  - Calendar / weekend / holiday evaluation is reference-only in Phase 1; PR-C does not implement calendar logic. If `business_calendar_reference` is null, default behavior applies (no calendar-aware skipping; weekend_behavior and holiday_behavior alone govern day-level skipping).

### NPS Workflow 3 - Recipient Scope Resolution

- **Trigger:** NPS Workflow 7 needs the effective recipient set for a delivery attempt.
- **Steps:**
  1. Resolve role-derived component: request Tenant Company `check_access` enumeration of CIXCI System Admin users. The returned list becomes the role-derived component.
  2. Read the configuration's `explicit_recipient_list` literally.
  3. Filter both components: vendor users and buyer users (as identified via Tenant Company role/scope) must be excluded. Excluded addresses are audited.
  4. Compute the effective recipient set as the deduplicated union.
  5. Create an immutable `effective_recipient_scope_snapshot` and produce a reference for the Activity Summary Delivery Attempt.
  6. Audit.
- **Discipline:**
  - Resolution is at delivery time, not configuration time. Role changes propagate.
  - Vendor and buyer user exclusion is enforced at resolution time, not merely at configuration edit time. Even if a buyer email was added to the explicit list at some prior moment, it is filtered out at delivery time if Tenant Company `check_access` identifies it as a buyer user.
  - The snapshot is immutable and is referenced by the delivery attempt; future audit can verify the exact recipient set at the moment of dispatch.

### NPS Workflow 7 - Summary Delivery Attempt

- **Trigger:** Analytics Workflow 5 completes with a non-empty Activity Summary Aggregation Record and signals Notification Platform Service to dispatch.
- **Steps:**
  1. Create Activity Summary Delivery Attempt in `pending` state. Set `activity_summary_configuration_reference`, `activity_summary_aggregation_record_reference`, `activity_summary_reporting_window_reference`.
  2. Run NPS Workflow 3 (Recipient Scope Resolution). Set `effective_recipient_scope_snapshot_reference`.
  3. Assemble the email payload using the hardcoded Phase 1 template, the section/metric content from the aggregation record, and the optional `summary_dashboard_reference`. If the dashboard reference is null, the email body omits the "View dashboard" line or shows a fallback.
  4. Hand off to transport (Integration Management or provider layer where applicable). If an Integration Management hook does not exist, the handoff uses placeholder reference language; the `transport_reference` field on the delivery attempt may be null in Phase 1.
  5. Capture transport reference (when available). Set `dispatch_timestamp`.
  6. Transition the delivery attempt to `dispatched`.
  7. Emit `notification.activity-summary-delivery.attempted`.
  8. Audit. Trigger Logs & Audit Workflow 10 to retain the delivery attempt by reference (via the existing Audit Record entity pattern).
- **Discipline:**
  - Notification Platform Service does not perform transport directly; transport is Integration Management's or the provider layer's responsibility.
  - The delivery attempt does not advance the configuration cursor. Cursor advancement is NPS Workflow 9 only.
  - The hardcoded template is used in Phase 1; configurable templates are future phase.
  - Detailed source rows are not assembled into the email body; totals only.
  - If recipient scope resolution returns zero effective recipients (e.g., no CIXCI System Admin users exist and `explicit_recipient_list` is empty after filtering), the delivery attempt transitions immediately to `failed` with a specific failure reason text (the cursor is not advanced; the window remains eligible for carry-forward). The zero-effective-recipient case is auditable.

### NPS Workflow 8 - Delivery Failure / Carry-Forward (delivery side)

- **Trigger:** Transport reports a failure for an Activity Summary Delivery Attempt currently in `dispatched` state.
- **Steps:**
  1. Capture `delivery_failure_reference` (Integration Management transport-failure record reference where available) or `failure_reason_text` (Phase 1 fallback when no Integration Management reference is available).
  2. Set `failure_timestamp`.
  3. Transition the delivery attempt to `failed` terminal state.
  4. Transition the Activity Summary Reporting Window to `delivery_failed` state (the window is now eligible for carry-forward into the next window's interval at Analytics Workflow 4).
  5. Do NOT advance the Activity Summary Configuration's `last_successful_summary_cursor_reference`.
  6. Emit `notification.activity-summary-delivery.failed`.
  7. Audit. Trigger Logs & Audit Workflow 10.
  8. Optionally schedule a retry attempt at the Notification Platform Service implementation layer; retry produces a new Activity Summary Delivery Attempt referencing the same aggregation record, the same configuration, and the same reporting window. The prior attempt remains in `failed` terminal state.
- **Discipline:**
  - Cursor never advances on failure. This is the canonical anti-loss invariant.
  - Retry produces a new attempt, not a state reset.
  - The window remains in `delivery_failed` state until either (a) a retry attempt succeeds (Workflow 9 advances the cursor and transitions the window to `delivered`), or (b) a later window's delivery succeeds while subsuming this window's interval (the subsuming window's Workflow 9 transitions this window to `superseded`).
  - Phase 1 does not specify retry policy (count, backoff); that is implementation-level. PR-C captures the attempt entity for observability.

### NPS Workflow 9 - Delivery Success / Cursor Advancement

This workflow owns cursor advancement on the Activity Summary Configuration. It is invoked on either of two distinct triggers; in both cases, cursor advancement is performed by Notification Platform Service. Analytics / Reporting never mutates the configuration cursor directly.

- **Trigger A (delivery acknowledged):** Transport reports an acknowledgement for an Activity Summary Delivery Attempt currently in `dispatched` state.
- **Trigger B (no-activity suppression outcome consumed):** Analytics Workflow 6 has transitioned the Activity Summary Reporting Window to `suppressed_no_activity` and Logs & Audit Workflow 10 has created the No-Activity Summary Suppression Evidence record; Notification Platform Service is signaled (via `analytics.activity-summary-window.evaluated` with `resultDiscriminator = suppressed_no_activity` and/or via the suppression-evidence reference) to advance its own cursor.
- **Steps for Trigger A (delivery acknowledged):**
  1. Capture `delivery_acknowledgement_reference` (Integration Management transport-success record reference where available).
  2. Set `acknowledgement_timestamp`.
  3. Transition the delivery attempt to `acknowledged` terminal state.
  4. Transition the Activity Summary Reporting Window to `delivered` state.
  5. **Advance the Activity Summary Configuration's `last_successful_summary_cursor_reference`** to point to the Activity Summary Reporting Window's `window_end_timestamp`. This mutation is owned by Notification Platform Service.
  6. For each window in the just-delivered window's `carry_forward_window_reference_collection`: transition that window from `delivery_failed` to `superseded`. The supersession reference points to the just-delivered window's reference. The subsumed windows are preserved for audit; only their lifecycle state changes.
  7. Emit `notification.activity-summary-delivery.succeeded`.
  8. Audit. Trigger Logs & Audit Workflow 10.
- **Steps for Trigger B (no-activity outcome consumed):**
  1. Consume the Analytics suppression-outcome signal: validate that the referenced Activity Summary Reporting Window is in `suppressed_no_activity` terminal state and that the No-Activity Summary Suppression Evidence record exists at Logs & Audit File Tracking.
  2. Validate that the referenced configuration matches a configuration currently owned by this Notification Platform Service instance and that no in-flight `dispatched` delivery attempt exists for the same window (defensive check; the no-activity result implies no delivery attempt was created).
  3. **Advance the Activity Summary Configuration's `last_successful_summary_cursor_reference`** to point to the Activity Summary Reporting Window's `window_end_timestamp`. This mutation is owned by Notification Platform Service. Capture the cursor-advancement timestamp at the moment of mutation; this timestamp exists only after the cursor mutation has occurred. The pre-cursor No-Activity Summary Suppression Evidence record at Logs & Audit File Tracking is not modified; it does not carry this timestamp.
  4. Do NOT create an Activity Summary Delivery Attempt for the suppressed window. The no-activity outcome has no delivery attempt; the window remains in `suppressed_no_activity` terminal state.
  5. Audit the cursor advancement. Trigger Logs & Audit Workflow 10 to create an NPS-side Audit Record (existing Audit Record entity pattern, no new entity) with `source_module = notification-platform-service`, `event_action_type = activity_summary_cursor_advanced_on_consumed_no_activity_outcome`, `related_record_references` pointing to the Activity Summary Configuration, the Activity Summary Reporting Window, and the No-Activity Summary Suppression Evidence record at Logs & Audit. The cursor-advancement timestamp captured in step 3 is carried on this NPS-side Audit Record. This is the canonical post-mutation cursor-advancement audit reference.
  6. Do NOT emit `notification.activity-summary-delivery.succeeded` (no delivery occurred). The suppression-outcome cursor advancement is observable via the NPS-side Audit Record created in step 5 plus the pre-cursor `audit.activity-summary-suppression-evidence.recorded` event from Logs & Audit File Tracking (which itself does not carry a cursor-advancement timestamp; the two retention surfaces together form the full audit trail).
- **Discipline:**
  - **Cursor advancement is the canonical anti-loss invariant AND a Notification Platform Service boundary discipline.** The cursor lives on the Activity Summary Configuration entity at Notification Platform Service. Only this workflow advances it. Analytics / Reporting and Logs & Audit File Tracking never mutate the configuration cursor directly; they signal the outcome, and Notification Platform Service performs the mutation.
  - Both triggers advance the cursor to the relevant Reporting Window's `window_end_timestamp`. The trigger source is captured in the audit trail (delivery-acknowledged vs. consumed-no-activity-outcome).
  - "Acknowledged" indicates transport-level acknowledgement; it does not constitute end-recipient confirmation (Phase 1 has no read-receipt semantics).
  - Carry-forward subsumption finalizes only on Trigger A. Trigger B (no-activity outcome) does NOT transition carry-forward `delivery_failed` windows to `superseded`; subsumed windows remain available for the next successful delivery to subsume them (per Analytics Workflow 6 discipline).
  - Cursor never advances on `failed` terminal state of a delivery attempt. Trigger A applies only on `acknowledged` transitions; Trigger B applies only on consumed `suppressed_no_activity` outcomes.
  - Concurrency: if Trigger A and Trigger B race (extremely unlikely given the no-activity case implies no delivery attempt), the cursor only advances forward; Notification Platform Service implementation must ensure cursor monotonicity. PR-C documents the architectural rule but does not specify the implementation-level concurrency primitive.

---

### Phase 1 deliberate non-behaviors (Notification Platform Service workflows)

- No per-event notification workflow is introduced. This PR is scheduled-summary-only.
- No buyer-facing or vendor-facing summary delivery workflow.
- No per-tenant summary configuration workflow.
- No configurable template workflow.
- No detailed-row-content workflow.
- No retry policy tuning workflow; retry attempts are produced by implementation when needed.
- No cursor reset workflow; configuration unpause does not reset the cursor.
- No read-receipt or end-recipient confirmation workflow.
- No alert escalation workflow for repeated delivery failures.
- No source-module record modification workflow.
- No SLA-related event modification (PR #92 SLA semantics preserved unconditionally; PR-C consumes SLA events by reference via Analytics aggregation).
- No PR #94 buyer-update-ready or delivery-date-evidence event modification.
- No PR #91 export evidence event modification.
- No PR #93 handoff record modification.
