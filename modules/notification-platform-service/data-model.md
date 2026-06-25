# Notification Platform Service Data Model

This document is proposal-level architecture. It defines initial Notification Platform Service entities without finalizing schema, persistence, provider implementation, retention, privacy policy, or delivery behavior.

## Entities

### Notification Core

- Notification Request.
- Notification Event Reference.
- Notification History Record.
- Notification Status History.
- Notification Eligibility Signal Reference.
- Source Module Policy Reference.
- Source Record Reference.
- Tenant Scope Reference.
- Correlation Id.
- Idempotency Key.
- Duplicate Suppression Record.

### Eligibility Evidence

- Eligibility Evidence Record.
- Eligibility Signal Id.
- Eligibility Signal Version / Hash.
- Source-Owned Eligibility Result.
- Recipient Group Reference.
- Recipient Scope.
- Expiration Timestamp.
- Re-Check-Before-Delivery Flag.

### Recipient Resolution

- Recipient Resolution Request.
- Recipient Resolution Result.
- Recipient Snapshot Reference.
- Role Expansion Snapshot.
- Recipient Expansion Snapshot.
- Recipient Projection.
- User Recipient.
- Role-Based Recipient.
- Company Recipient.
- Parent Company Recipient.
- Child Entity Recipient.
- Vendor Recipient.
- Buyer Recipient.
- System Admin Recipient.
- Customer Recipient Placeholder.
- External Recipient Placeholder.
- Duplicate Recipient Collapse Record.
- Stale Role Handling Record.

### Preferences And Suppression

- Notification Preference.
- Preference Evaluation Record.
- Preference Precedence Result.
- Required/System Override Record.
- Legal Unsubscribe Requirement Placeholder.
- User-Level Preference.
- Company-Level Preference.
- Child-Entity Preference.
- Event-Type Preference.
- Channel Preference.
- Immediate Preference.
- Digest Preference.
- Quiet Hours Placeholder.
- Suppression Record.
- Hard Suppression Rule.
- Unsubscribe Placeholder.

### Templates

- Notification Template.
- Template Version.
- Template Type.
- Template Channel Binding.
- Template Dynamic Field Definition.
- Template Redaction Rule.
- Template Approval State.
- Template Effective Date Window.
- Locale / Language Placeholder.
- Tenant / Company Scope Placeholder.

### Delivery

- Delivery Plan.
- Channel Selection Result.
- Delivery Attempt.
- Delivery Status.
- Delivery Status Precedence Record.
- Retry Policy Placeholder.
- Retry Budget.
- Failure Reason.
- Bounce Reason Placeholder.
- Delivery Timeout.
- Escalation Placeholder.
- Provider Response Reference.
- Provider Delivery Id Reference.
- Provider Callback Record.
- Delivery Audit Reference.

### Fanout And Digest

- Digest Batch Record.
- Digest Job.
- Fanout Batch Record.
- Queue Partition Key.
- Tenant / Channel / Provider Partition.
- Fanout Cap.
- Backpressure Control Record.
- Provider Rate Limit Record.
- Notification Storm Prevention Record.
- High-Volume Catalog Notification Throttle.

### Channels

- Email Channel.
- In-App Channel.
- SMS Channel Placeholder.
- Webhook / External Notification Channel Placeholder.
- Future Push Notification Channel Placeholder.

## Notification Request

Proposal-level fields:

- Notification request id.
- Source module.
- Source event type.
- Source event id/reference.
- Source record references.
- Tenant scope reference.
- Recipient intent.
- Recipient scope hints.
- Eligibility evidence references where applicable.
- Template type or template reference.
- Channel hints.
- Event priority placeholder.
- Required/system indicator placeholder.
- Redaction class.
- Source-module policy reference.
- Payload reference or safe dynamic field values.
- Idempotency key.
- Correlation id.
- Requested at.
- Request status.

## Eligibility Evidence Record

Eligibility-based notifications must include source-owned eligibility evidence. Proposal-level fields:

- Eligibility evidence id.
- Source module.
- Source event reference.
- Eligibility signal id.
- Eligibility signal version/hash.
- Recipient scope.
- Recipient group reference.
- Expiration timestamp.
- Tenant scope.
- Source-owned eligibility result.
- Re-check-before-delivery flag.
- Source policy reference.
- Created at.

Notification Platform Service must not compute buyer/vendor eligibility, product compatibility, product visibility, supported-device matching, licensed-property scope, tenant readiness, routing state, fulfillment state, invoice state, warranty state, or AI recommendation state.

Eligibility-based notifications must include source-owned evidence from Tenant Company, Product Catalog, Device Catalog, or other owning modules before delivery can proceed.

## Recipient Resolution Result

Proposal-level fields:

- Recipient resolution result id.
- Notification request reference.
- Tenant Company scope reference.
- Eligibility evidence references where applicable.
- Role expansion snapshot reference.
- Recipient expansion snapshot reference.
- Max recipients per request.
- User recipient references.
- Role-based recipient references.
- Company/entity recipient references.
- Buyer/vendor recipient references.
- System admin recipient references.
- Customer/external recipient placeholders.
- Recipient projection: buyer, vendor, system admin, customer, or external scope.
- Excluded recipient references.
- Exclusion reasons.
- Inactive user exclusion flag/reference.
- Inactive entity exclusion flag/reference.
- Stale role handling reference.
- Duplicate recipient collapse reference.
- Cross-tenant denial result.
- Recipient scope version/hash placeholder.
- Resolved at.

Tenant Company remains authority for users, roles, permissions, activation, company/entity scope, buyer/vendor relationship eligibility, region scope, product-type eligibility, licensed-property scope, readiness signals, and notification eligibility inputs.

## Preference Evaluation Record

Proposal-level fields:

- Preference evaluation id.
- Notification request reference.
- Required/system notification indicator.
- Legal unsubscribe requirement result placeholder.
- Hard suppression result.
- User preference result.
- Company preference result.
- Child-entity preference result.
- Event-type preference result.
- Channel preference result.
- Quiet hours result.
- Digest vs immediate result.
- Final preference outcome: send, block, delay, digest, review-required, or suppress.
- Precedence explanation.
- Evaluated at.

Required/system notifications cannot be accidentally suppressed by normal user, company, child-entity, channel, quiet-hour, or digest preferences. Optional notifications should respect suppression, unsubscribe, and preference settings.

## Notification Preference

Proposal-level fields:

- Preference id.
- Preference owner type: user, company, child entity, role placeholder, or system placeholder.
- Owner reference.
- Event type.
- Channel.
- Immediate/digest preference.
- Quiet hours placeholder.
- Suppression/unsubscribe placeholder.
- Required/system override applicability placeholder.
- Effective dates.
- Preference version.
- Updated by.
- Updated at.

## Notification Template

Proposal-level fields:

- Template id.
- Template type.
- Event type.
- Channel.
- Locale/language placeholder.
- Tenant/company scope placeholder.
- Dynamic fields.
- Redaction rules.
- Template version.
- Approval status.
- Effective dates.
- Source-module policy reference.
- Preview/test status placeholder.
- Created by / updated by.
- Created at / updated at.

Templates must define safe dynamic fields and must not expose sensitive data unless allowed by source-module policy, recipient scope, and redaction rules.

## Delivery Attempt

Proposal-level fields:

- Delivery attempt id.
- Notification request reference.
- Recipient reference.
- Channel.
- Template version reference.
- Delivery status.
- Attempt number.
- Provider reference.
- Provider delivery id reference.
- Provider response reference.
- Provider callback idempotency key.
- Failure reason.
- Bounce reason placeholder.
- Retry policy reference.
- Retry budget reference.
- Delivery timeout.
- Sent at placeholder.
- Delivered at placeholder where provider-supported.
- Failed at placeholder.
- Bounced at placeholder.
- Suppressed at placeholder.
- Delayed until placeholder.
- Expired at placeholder.
- Cancelled at placeholder.
- Superseded by reference.
- Idempotency key.
- Duplicate suppression reference.
- Delivery audit reference.

## Delivery Status Lifecycle

Proposal-level statuses:

- Requested.
- Queued.
- Sent.
- Delivered where provider-supported.
- Failed.
- Bounced.
- Suppressed.
- Delayed.
- Expired.
- Cancelled.
- Superseded.
- Retrying.
- Retry exhausted.
- Review required.

Status precedence should account for out-of-order provider callbacks, stale callbacks, duplicate callbacks, provider callback idempotency, source-event supersession, and retry exhaustion.

## Digest Batch Record

Proposal-level fields:

- Digest batch id.
- Tenant scope.
- Recipient scope.
- Event type group.
- Channel.
- Digest frequency placeholder.
- Included source event references.
- Template version reference.
- Batch status.
- Created at.
- Scheduled send time.

## Fanout Batch Record

Proposal-level fields:

- Fanout batch id.
- Notification request reference.
- Tenant scope.
- Queue partition key.
- Tenant/channel/provider partition.
- Recipient count.
- Fanout cap.
- Backpressure status.
- Provider rate-limit status.
- Batch status.
- Created at.

## Duplicate Suppression Record

Proposal-level fields:

- Suppression record id.
- Source module.
- Source event reference.
- Recipient reference.
- Channel.
- Template type/reference.
- Idempotency key.
- Suppression reason.
- Suppression window placeholder.
- Created at.

## Provider Response Reference

Proposal-level fields:

- Provider response reference id.
- Provider name/reference.
- Provider delivery id.
- Provider status.
- Provider event id placeholder.
- Provider callback idempotency key.
- Provider error code/message placeholder.
- Response payload reference or masked response reference.
- Source system timestamp.
- Received timestamp.
- Redaction class.

External providers are not the source of truth for CIXCI notification history.

## Ownership

Notification Platform Service owns:

- Notification request records, templates, template versions, recipient resolution results, preference evaluation records, preferences, suppression records, delivery plans, delivery attempts, delivery statuses, notification history, provider response references, delivery audit references, idempotency keys, duplicate suppression records, digest batches, fanout batches, and delivery control metadata.

Notification Platform Service does not own:

- Source-module business records, eligibility decisions, product/device/pricing/order/fulfillment/invoice/warranty state, Logs & Audit evidence records, AI recommendations, Analytics definitions, or external provider systems of record.

## Retention Notes

Placeholder: define retention by notification type, channel, recipient class, source module, required/system status, redaction class, provider response class, and regulatory/contractual need.

Notification history should retain delivery evidence, not unrestricted source payloads.

High-volume notification history should support retention classes, pagination, archival placeholders, and tenant/channel/source-module partitioning.

## Tenant Isolation Notes

- Tenant scope should be present on notification requests and delivery records where applicable.
- Cross-tenant recipient resolution is denied by default.
- Buyer/vendor projections should be scoped.
- Customer and external recipients require additional ownership and privacy decisions.
- Queue partitioning, fanout batches, digest batches, and history lookups should preserve tenant isolation.

## Scheduled System Admin Activity Summary Email Entities (Cross-Module PR)

This section introduces two new entities owned by Notification Platform Service for the Scheduled System Admin Activity Summary Email cross-module hardening pass. Two additional entities are owned by Analytics / Reporting (Activity Summary Reporting Window, Activity Summary Aggregation Record), and two additional entities are owned by Logs & Audit File Tracking (Activity Summary Generated Evidence, No-Activity Summary Suppression Evidence). All concepts are additive. Existing Notification Platform Service entities (Notification Request, Delivery Plan, Delivery Attempt, Notification Template, Notification Preference, Recipient Resolution Request, and so on) are not redefined; this PR layers on top.

### Cross-module boundary discipline reaffirmed

- Notification Platform Service owns the Activity Summary Configuration and the Activity Summary Delivery Attempt entities introduced below.
- Analytics / Reporting owns aggregation: the Activity Summary Reporting Window entity and the Activity Summary Aggregation Record entity (see analytics-reporting/data-model.md PR-C section).
- Logs & Audit File Tracking owns evidence retention: the Activity Summary Generated Evidence entity and the No-Activity Summary Suppression Evidence entity (see logs-audit-file-tracking/data-model.md PR-C section). The Notification Platform Activity Summary Delivery Attempt is retained by Logs & Audit by reference, not duplicated as a separate Logs & Audit entity.
- Tenant Company owns CIXCI System Admin role definition and `check_access` resolution for recipient scope and configuration authority.
- Integration Management owns transport-layer records where applicable. Notification Platform Service may store transport, acknowledgement, and failure references but does not own the underlying transport records. If a specific Integration Management hook does not yet exist, reference-placeholder language is used and the hook is deferred to future Integration Management hardening.
- Order Routing, Fulfillment / Returns, Invoice Management, Pricing, Product Catalog, Device Catalog, and Media / Image Asset Management are source modules. PR-C reads source-module facts by reference only via Analytics aggregation. No source-module record, event, or contract is modified by this PR.

### Phase 1 scope guardrails

- Recipients are CIXCI System Admin only. Vendor users and buyer users are excluded.
- One Activity Summary Configuration applies platform-wide; per-tenant configuration is future phase.
- Email body is totals-only with optional dashboard link. Detailed source rows are not included.
- Email template is hardcoded in Phase 1; configurable template is future phase.
- The Multi-Vendor / Multi-Suborder aggregation defaults established by PR #94 apply to source facts consumed by this PR; they are not redefined here.
- PR #92 SLA semantics and PR #94 delivery-date and buyer-update semantics are preserved unconditionally; this PR consumes source events by reference only.

### Non-collapsible state chain (Cross-Module)

The chain that this PR introduces, spanning the three target modules:

Scheduled delivery time arrives per Activity Summary Configuration (Notification Platform Service)
  -> Reporting Window is created with start = last-successful-summary cursor, end = scheduled time (Analytics / Reporting)
  -> Source-fact aggregation runs (Analytics / Reporting)
  -> If non-empty: Activity Summary Aggregation Record is produced (Analytics / Reporting)
     -> Activity Summary Generated Evidence is recorded (Logs & Audit File Tracking)
     -> Activity Summary Delivery Attempt is created (Notification Platform Service)
     -> Recipient Scope is resolved at delivery time (Notification Platform Service)
     -> Transport is handed off (Integration Management; referenced read-only)
     -> Delivery succeeds (cursor advances) or fails (cursor does NOT advance; carry-forward applies)
  -> If empty: No-Activity Summary Suppression Evidence is recorded (Logs & Audit File Tracking); cursor advances; no delivery attempt is created

Each link is independently observable and audited. Skipping any link is a violation of this PR's discipline.

The canonical anti-loss invariant: **the last-successful-summary cursor on Activity Summary Configuration advances only on `acknowledged` terminal state of a delivery attempt OR on no-activity suppression. The cursor never advances on `failed` terminal state of a delivery attempt.**

---

### Activity Summary Configuration

The authoritative record of one scheduled CIXCI System Admin activity summary configuration. Carries: name, scheduling fields, recipient scope (hybrid role-derived + explicit list), state, and the last-successful-summary cursor.

**Ownership:** Notification Platform Service.

**Identity:** referenced via `activity_summary_configuration_reference` from Activity Summary Reporting Window (Analytics / Reporting), Activity Summary Delivery Attempt (Notification Platform Service), and Logs & Audit evidence records.

**Lifecycle states (proposal-level):**

- `draft` - created; not yet active.
- `active` - in service; scheduled evaluations run per configured times.
- `paused` - in service but evaluation suspended; not retired; can return to `active`.
- `retired` - terminal; configuration no longer evaluated.

**Required fields and references (proposal-level):**

- `activity_summary_configuration_reference` - canonical identifier.
- `configuration_name` - human-readable label.
- `delivery_times` - array of time-of-day values (for example, `[09:00, 13:00, 18:00]`).
- `timezone_reference` - timezone identifier.
- `business_calendar_reference` - optional reference to a business calendar source. If null, default behavior applies (no calendar-aware skipping).
- `weekend_behavior` - enumeration: `skip`, `deliver`, `deliver_only_summary_of_weekend_activity`.
- `holiday_behavior` - enumeration: `skip`, `deliver`, `deliver_only_summary_of_holiday_activity`.
- `role_derived_recipient_scope` - reference to the CIXCI System Admin role context resolved at delivery time via Tenant Company `check_access`.
- `explicit_recipient_list` - optional list of explicit email addresses; effective recipients at delivery time are the deduplicated union of role-derived and explicit.
- `lifecycle_state` - one of `draft`, `active`, `paused`, `retired`.
- `last_successful_summary_cursor_reference` - reference to the last reporting window whose delivery reached `acknowledged` terminal state, or whose evaluation reached `suppressed_no_activity` terminal state and was consumed by Notification Platform Service. **Updated exclusively by NPS Workflow 9 (Delivery Success / Cursor Advancement), which serves two trigger paths: Trigger A (delivery acknowledged) and Trigger B (consumed no-activity-suppression-outcome from Analytics Workflow 6).** Analytics / Reporting and Logs & Audit File Tracking never write to this field directly.
- `audit_reference` - Logs & Audit retention reference.
- `created_at`, `updated_at` - record-management timestamps.

**Boundary discipline:**

- Vendor users and buyer users cannot be present in `role_derived_recipient_scope` or `explicit_recipient_list` in Phase 1. Recipient resolution must filter accordingly.
- The cursor is not advanced by configuration edits; only NPS Workflow 9 advances it (via its Trigger A path on delivery acknowledgement and via its Trigger B path on consumed no-activity-suppression-outcome).
- Configuration retirement does not delete prior windows, aggregation records, delivery attempts, or evidence records; those remain in their canonical owning modules.
- Pausing does not advance the cursor; when unpaused, the next window's interval extends back to the cursor (long pauses produce large windows; Phase 1 accepts this behavior; future PR may add a cursor-reset-on-unpause toggle).
- Business calendar, weekend, and holiday behavior fields are reference-only / enumeration-only; this PR does not implement calendar evaluation.

---

### Activity Summary Delivery Attempt

The authoritative per-attempt record that one delivery of one Activity Summary Aggregation Record was attempted via the configured transport. Multiple attempts may exist for the same aggregation record if retry behavior produces re-attempts.

**Ownership:** Notification Platform Service.

**Identity:** referenced via `activity_summary_delivery_attempt_reference` from Logs & Audit File Tracking evidence (by reference, not duplicated as Logs & Audit-side entity).

**Lifecycle states (proposal-level):**

- `pending` - created; recipient resolution and transport handoff in flight.
- `dispatched` - transport accepted the request; transport reference captured.
- `acknowledged` - terminal success; transport confirms delivery acknowledgement.
- `failed` - terminal failure; transport reports exhaustion or rejection.

`dispatched -> acknowledged` and `dispatched -> failed` are the only terminal transitions. `dispatched -> dispatched` (retry within the same record) is not permitted; retry produces a new Activity Summary Delivery Attempt referencing the same aggregation record.

**Required fields and references (proposal-level):**

- `activity_summary_delivery_attempt_reference` - canonical identifier.
- `activity_summary_configuration_reference` - the configuration that produced this attempt.
- `activity_summary_aggregation_record_reference` - the Analytics / Reporting aggregation record being delivered.
- `activity_summary_reporting_window_reference` - the Analytics / Reporting window the aggregation came from.
- `effective_recipient_scope_snapshot_reference` - reference to the recipient scope resolved at delivery time (the deduplicated union of role-derived and explicit recipients).
- `dispatch_timestamp` - moment the attempt transitioned to `dispatched`.
- `transport_reference` - reference to the Integration Management transport-layer record where applicable. If no Integration Management hook exists at PR-C application time, this field is null and the reference is deferred to future Integration Management hardening.
- `delivery_acknowledgement_reference` - optional; set when attempt transitions to `acknowledged`. Reference to Integration Management transport-success record where applicable.
- `delivery_failure_reference` - optional; set when attempt transitions to `failed`. Reference to Integration Management transport-failure record where applicable.
- `failure_reason_text` - optional; free-text reason captured when transport-level failure detail is not available via Integration Management reference (Phase 1 fallback).
- `acknowledgement_timestamp` or `failure_timestamp` - terminal-state timestamp.
- `lifecycle_state` - one of the four states above.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- Notification Platform Service does not perform transport directly. Transport is the responsibility of Integration Management or the underlying provider layer; PR-C captures the reference.
- A failed delivery attempt does not advance the configuration cursor; the carry-forward rule applies via Analytics / Reporting at the next window evaluation (Workflow 4).
- A retry produces a new Activity Summary Delivery Attempt; the prior attempt is preserved for audit.
- Multiple consecutive failures across multiple windows preserve all failed attempts; the next successful window subsumes all prior carry-forward intervals (Workflow 4 enumerates all prior `failed`-terminal windows for the configuration).
- "Acknowledged" indicates the transport layer confirms delivery to the configured destination. It does not constitute end-recipient confirmation (no read-receipt semantics in Phase 1).
- The attempt does not embed source-module records; the aggregation record is the snapshot, and source facts are referenced by Analytics / Reporting.

---

### Recipient Scope contract rule (field collection on Configuration)

Phase 1 hybrid recipient model:

- **Role-derived:** at delivery time, Notification Platform Service requests Tenant Company `check_access` enumeration of CIXCI System Admin users; the resolved list becomes the role-derived component.
- **Explicit:** the configuration's `explicit_recipient_list` is read literally.
- **Effective recipients:** the deduplicated union.

Resolution timing:

- Resolution happens at delivery time, not configuration time. This ensures CIXCI System Admin role changes (joins, departures, role revocations) propagate to summary delivery without requiring configuration edits.
- Vendor users and buyer users must not be present in either component in Phase 1. If `explicit_recipient_list` contains an address that resolves (via Tenant Company) to a vendor or buyer user, that address is excluded from effective recipients and the exclusion is audited.

The `effective_recipient_scope_snapshot_reference` field on Activity Summary Delivery Attempt captures the resolved set at the moment of dispatch. The snapshot is immutable.

---

### Summary Retry / Carry-Forward Delivery rule

Two distinct rules across the two PR-C modules that participate in retry/carry-forward semantics:

- **Notification Platform Service retry rule (delivery-side):** A failed delivery attempt may be retried by Notification Platform Service; retry produces a new Activity Summary Delivery Attempt referencing the same aggregation record. Retry policy (count, backoff) is implementation-level and remains deferred. The prior attempt remains in `failed` terminal state.
- **Analytics / Reporting carry-forward rule (aggregation-side):** See analytics-reporting/data-model.md PR-C section. The next reporting window's start = last-successful-summary cursor; consecutive failures preserve all carry-forward intervals.

These rules cooperate but are not redundant. The Notification Platform retry rule produces additional attempts for the same window's content. The Analytics carry-forward rule extends the next window's interval if no delivery for the prior window has reached `acknowledged` state.

---

### Field additions to existing Notification Platform Service entities

PR-C does not modify the structure of existing Notification Platform Service entities (Notification Request, Notification Template, Notification Preference, Delivery Plan, Delivery Attempt, and so on). The Activity Summary Configuration and Activity Summary Delivery Attempt entities are introduced alongside the existing entities. Existing Delivery Attempt is unrelated to Activity Summary Delivery Attempt; the two entities are distinct (existing Delivery Attempt handles per-notification-request delivery for the broader Notification Platform Service surface, while Activity Summary Delivery Attempt is scoped to scheduled summary delivery).

If implementation later consolidates the two entities, that is an implementation choice not constrained by this PR's architecture.

---

### Phase 1 deliberate non-behaviors (Notification Platform side)

The following are explicitly out of scope for PR-C on the Notification Platform Service side:

- Per-event notification of scheduled summary events (this PR introduces scheduled summary delivery only; per-event notification of activity is explicitly out of scope).
- Buyer-facing or vendor-facing summary delivery.
- Per-tenant or per-buyer-integration-profile summary configuration.
- Configurable email templates (Phase 1 template is hardcoded).
- Detailed source rows in email body (totals-only).
- Read-receipt or end-recipient confirmation semantics.
- Cursor reset on configuration unpause (future PR).
- Multi-language email body (future PR).
- Per-recipient personalization (future PR).
- Alert escalation for repeated delivery failures (future operator-surface PR).
