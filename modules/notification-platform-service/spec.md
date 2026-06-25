# Notification Platform Service Specification

This document is proposal-level architecture. It defines initial Notification Platform Service scope without finalizing implementation behavior, provider selection, launch channels, preference precedence, or source-module notification policy.

## Purpose

Provide a centralized platform service for notification delivery so each module does not build its own email, SMS, in-app, webhook, or future notification logic.

Notification Platform Service turns eligible source-module events and notification requests into governed notification delivery attempts while preserving source-module ownership of the business state that triggered the notification.

## Scope

Notification Platform Service owns:

- Notification request intake.
- Notification template management.
- Recipient resolution orchestration.
- Notification preferences.
- Channel selection.
- Delivery orchestration.
- Delivery attempt tracking.
- Delivery status lifecycle.
- Retry/failure handling.
- Suppression rules.
- Unsubscribe/preference handling placeholder.
- Notification history.
- Delivery audit references.
- Provider response references.
- Idempotency and duplicate suppression.

## Channels

Proposal-level channels:

- Email.
- In-app.
- SMS placeholder.
- Webhook/external notification placeholder.
- Future push notification placeholder.

Channel availability, provider selection, failover, and delivery guarantees remain unresolved.

## Recipient Models

Proposal-level recipient models:

- User recipient.
- Role-based recipient.
- Company recipient.
- Parent company recipient.
- Child entity recipient.
- Vendor recipient.
- Buyer recipient.
- System admin recipient.
- Customer recipient placeholder.
- External recipient placeholder.

Tenant Company remains the authority for users, roles, company/entity scope, permissions, activation state, buyer/vendor relationship eligibility, region scope, product-type eligibility, licensed-property scope, readiness signals, and notification eligibility inputs.

## Preferences

Proposal-level preference concepts:

- User-level preferences.
- Company-level preferences.
- Child-entity preferences.
- Event-type preferences.
- Channel preferences.
- Immediate notification preference.
- Digest notification preference.
- Quiet hours placeholder.
- Required/system notification override placeholder.
- Unsubscribe/suppression placeholder.

## Preference Precedence Model

Proposal-level precedence should evaluate notification delivery in an explicit order and produce a clear outcome. This model does not finalize legal, compliance, or business policy.

Possible outcomes:

- Send.
- Block.
- Delay.
- Digest.
- Review-required.
- Suppress.

Proposal-level precedence ladder:

1. Required/system notification classification is evaluated first to identify messages that must not be accidentally suppressed by normal optional preferences.
2. Legal unsubscribe requirements are evaluated for notification classes where unsubscribe or consent rules apply.
3. Hard suppression rules are evaluated for safety, abuse, invalid recipient, invalid channel, tenant-scope failure, or explicit system block conditions.
4. Source-module policy and redaction eligibility are evaluated before template rendering or delivery.
5. Child-entity preference is evaluated where the notification is scoped to a child entity.
6. Company preference is evaluated where the notification is scoped to a parent company, buyer, vendor, or company-level recipient.
7. User preference is evaluated for direct user recipients.
8. Event-type preference is evaluated for optional event classes.
9. Channel preference is evaluated for channel selection.
10. Quiet hours are evaluated for delay or digest behavior where allowed.
11. Digest vs immediate preference is evaluated after blocking, suppression, and required/system rules.

Clarifications:

- Required/system notifications cannot be accidentally suppressed by normal user, company, child-entity, channel, quiet-hour, or digest preferences.
- Required/system notifications still require recipient scope, redaction safety, source-module policy, and any applicable legal unsubscribe/suppression rules.
- Legally required unsubscribe/suppression rules override optional marketing-style notifications.
- Optional notifications should respect suppression, unsubscribe, and preference settings.
- Conflicting preferences should produce a deterministic outcome: block, suppress, delay, digest, send, or review-required.
- If precedence cannot be resolved from available policy, delivery should route to review-required rather than guessing.

## Templates

Proposal-level template concepts:

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

Templates must use safe dynamic fields and must not expose sensitive customer, order, pricing, invoice, warranty, tenant, media, licensing, or commercial data unless allowed by template, recipient scope, source-module policy, and redaction rules.

## Eligibility-Based Notifications

Notification Platform Service may deliver eligibility-based notifications after source modules provide eligible events/signals.

Examples:

- New vendor added and approved, with compatible accessories for devices a buyer sells/supports.
- New buyer added and active, notifying eligible vendors.
- Vendor adds new accessories, notifying eligible buyers.

Eligibility boundaries:

- Tenant Company owns buyer/vendor relationship eligibility, buyer activation, vendor activation, region scope, product-type eligibility, licensed-property scope, readiness signals, users, roles, permissions, and notification eligibility inputs.
- Product Catalog owns product records, accessory additions, product activation/download state, product visibility records, and compatibility assertions.
- Device Catalog owns canonical Device References and buyer device portfolio references.
- Notification Platform Service only delivers notifications after eligible source events/signals are provided.
- Notification Platform Service must not independently decide buyer/vendor eligibility or product compatibility.

Eligibility-based notifications must include source-owned eligibility evidence from Tenant Company, Product Catalog, Device Catalog, or other owning modules. Notification Platform Service must not compute buyer/vendor eligibility, product compatibility, product visibility, supported-device matching, licensed-property scope, tenant readiness, routing state, fulfillment state, invoice state, warranty state, or AI recommendation state.

## Recipient Expansion Hardening

Proposal-level recipient expansion should include:

- Role expansion snapshot.
- Recipient expansion snapshot.
- Max recipients per request.
- Inactive user exclusion.
- Inactive entity exclusion.
- Stale role handling.
- Duplicate recipient collapse.
- Cross-tenant denial by default.
- Recipient projection by buyer, vendor, system admin, customer, or external scope.

Notification Platform Service may expand recipients only from source-provided scope and Tenant Company-provided recipient/role/entity signals. It must not expand recipients by inferring business eligibility.

## Digest And Fanout Controls

Proposal-level controls should include:

- Digest batch record.
- Digest job.
- Fanout batch record.
- Queue partition key.
- Tenant/channel/provider partitioning.
- Fanout caps.
- Backpressure controls.
- Retry budgets.
- Provider rate-limit handling.
- Notification storm prevention.
- High-volume catalog notification throttling.

High-volume catalog, buyer/vendor growth, role-based, and customer-facing notification workloads should be batched, partitioned, throttled, or digested where policy allows.

## Delivery Status Precedence

Proposal-level delivery status handling should distinguish:

- Requested.
- Queued.
- Sent.
- Delivered.
- Failed.
- Bounced.
- Suppressed.
- Delayed.
- Expired.
- Cancelled.
- Superseded.

Rules:

- Provider callbacks must be idempotent.
- Duplicate callbacks should collapse into the existing delivery attempt history.
- Out-of-order provider callbacks should be evaluated against source system timestamp, received timestamp, provider event id, attempt number, and current terminal status.
- Stale callbacks should not reopen terminal delivery states without review.
- Source-event supersession should cancel, supersede, or route queued delivery to review according to source-module policy.
- Retry exhaustion should become terminal or review-required according to retry policy placeholder.
- External providers are delivery providers only, not the source of truth for CIXCI notification history.

## Business Rules

Proposal-level rules:

- Source modules emit business and operational events.
- Notification Platform Service consumes eligible notification-triggering events and explicit notification requests.
- Source modules remain the authority for event meaning and source-of-truth state.
- Notification Platform Service may store notification delivery history but must not replace module audit history.
- Notification Platform Service must apply recipient scope, eligibility evidence validation, redaction rules, preference precedence, suppression, idempotency, and duplicate suppression before delivery.
- Notification payloads should use minimal necessary data.
- Notification history should store delivery evidence, not unrestricted source payloads.
- Delivery attempts should be retryable only within bounded retry policy placeholders.
- Provider response references may be stored, but external providers are not the source of truth for CIXCI notification history.

## Out Of Scope

Notification Platform Service does not own:

- Product Catalog business state.
- Device Catalog business state.
- Pricing decisions.
- Order Routing decisions.
- Fulfillment/Returns state.
- Invoice Management state.
- Warranty claim lifecycle.
- Logs & Audit evidence records.
- Tenant Company eligibility, users, roles, or permissions.
- AI Agent recommendations, drafts, or action outcomes.
- Analytics reporting definitions.
- External provider systems of record.
- Media, Analytics, Integration Management, or Vendor Integration module responsibilities.

Notification Platform Service must not independently determine business state, eligibility, product compatibility, routing state, fulfillment state, invoice state, warranty state, or AI recommendation state.

## Dependencies

Notification Platform Service consumes signals or references from:

- Tenant Company for recipient, user, role, company/entity, activation, eligibility, and scope signals.
- Product Catalog for product and accessory notification-triggering events.
- Device Catalog for device and buyer device portfolio notification-triggering events.
- Pricing for pricing exception, pricing snapshot, and pricing rule notification-triggering events.
- Order Routing for routing exception and suborder notification-triggering events.
- Fulfillment/Returns for shipment, delivery, return, and replacement notification-triggering events.
- Invoice Management for invoice, export, and reconciliation notification-triggering events.
- Warranty Registration / Claims for registration and claim notification-triggering signals.
- Logs & Audit for repeated failure, retry exhaustion, audit retention, and vendor file quality signals.
- AI Agent Services for approved notification recommendations/drafts and review-required signals.

## Proposal-Level Constraints

- Keep source-module payloads redacted by default.
- Prefer references and safe summaries over full business payloads.
- Deny cross-tenant recipient resolution by default.
- Treat customer recipients as placeholders until buyer/customer notification ownership is decided.
- Treat webhook/external notification support as a future placeholder, not Vendor Integration ownership.
- Require source-owned eligibility evidence for eligibility-based notifications.
- Use deterministic preference precedence instead of ad hoc preference evaluation.
- Apply fanout, retry, digest, and provider throughput controls before high-volume delivery.

## Scheduled System Admin Activity Summary Email Surface (Cross-Module PR)

This section anchors the Notification Platform Service narrative for the cross-module Scheduled System Admin Activity Summary Email hardening pass. The PR is the first true multi-module PR in the CIXCI Platform Architecture workspace, touching Notification Platform Service, Analytics / Reporting, and Logs & Audit File Tracking together.

### Purpose of the PR-C surface

Notification Platform Service in its existing scope handles per-event notification orchestration, recipient resolution, template management, channel selection, delivery attempts, and provider response references. PR-C adds a distinct architectural surface for **scheduled summary email delivery**:

- A configurable schedule (one or more delivery times per timezone, with weekend / holiday / business-calendar behavior) produces an Activity Summary Reporting Window at each scheduled time.
- Analytics / Reporting aggregates source facts in the window's interval into an Activity Summary Aggregation Record (read-only consumption of PR #91, PR #92, PR #94 source events).
- Notification Platform Service dispatches the aggregation record to a CIXCI-System-Admin-scoped recipient list (hybrid role-derived + explicit) through Integration Management or the provider layer.
- Logs & Audit File Tracking retains the evidence surface (Activity Summary Generated Evidence on aggregation; No-Activity Summary Suppression Evidence on no-activity windows).

The scheduled-summary surface is distinct from the per-event notification surface. The two co-exist without modification of existing entities or events.

### Anti-loss invariant (PR-C canonical)

The Activity Summary Configuration's `last_successful_summary_cursor_reference` advances **only** through NPS Workflow 9 (Delivery Success / Cursor Advancement), which handles two distinct triggers: Trigger A is the `acknowledged` terminal state of a delivery attempt; Trigger B is the consumed no-activity-suppression-outcome event from Analytics Workflow 6. The cursor never advances on `failed` terminal state of a delivery attempt. **Cursor advancement is exclusively a Notification Platform Service action; Analytics produces outcomes (Reporting Window state, aggregation record, suppression-outcome event, Logs & Audit evidence trigger) but never writes to the configuration cursor.**

When delivery fails, the next reporting window's start equals the unchanged cursor; the next window's effective aggregation interval extends back through any missed `delivery_failed` windows (carry-forward). No activity is lost. Multiple consecutive failures all carry forward into the next successful delivery.

### No-empty-email discipline (PR-C canonical)

If a reporting window evaluates to zero source-fact activity in its effective interval, no Activity Summary Delivery Attempt is created. A No-Activity Summary Suppression Evidence record is recorded by Logs & Audit File Tracking. The cursor advances (rationale: not advancing would re-evaluate the same empty interval indefinitely). The Suppression Evidence preserves the audit trail.

### Recipient discipline (PR-C canonical)

Recipients are CIXCI System Admin only in Phase 1. The recipient model is hybrid:

- Role-derived: Tenant Company `check_access` enumeration of CIXCI System Admin users at delivery time (not configuration time).
- Explicit: configuration-level explicit recipient list.
- Effective recipients: the deduplicated union, with vendor and buyer users filtered out.

The filtering is enforced both at configuration authority (CIXCI System Admin only may edit) and at delivery time (effective set excludes any address that resolves to a vendor or buyer user). Exclusions are auditable.

### Cross-module choreography (PR-C canonical)

Notification initiates schedule. Analytics aggregates. Logs & Audit records evidence.

The choreography is described in detail in `workflows.md`. The Notification Platform Service side carries six workflows; Analytics / Reporting carries three; Logs & Audit File Tracking carries one. Total: ten workflows.

### What PR-C does not change on the Notification Platform Service side

- Existing Notification Request entity, Delivery Plan, Delivery Attempt (the existing entity, distinct from the PR-C Activity Summary Delivery Attempt), Notification Template, Notification Preference, Recipient Resolution Request, and so on.
- Existing per-event notification orchestration patterns.
- Existing recipient resolution patterns for the per-event case.
- Existing template management patterns.
- Existing channel selection, suppression, preference precedence, digest, fanout, and provider response patterns.

The PR-C Activity Summary Configuration and Activity Summary Delivery Attempt entities exist alongside the existing entities. If implementation later consolidates patterns, that is an implementation choice not constrained by this PR's architecture.

### Phase 1 scope reminders

- Scheduled summary email only; per-event notification behavior is not introduced by this PR.
- CIXCI System Admin only; vendor-facing and buyer-facing summary delivery is not introduced.
- Platform-wide; per-tenant summary configuration is not introduced (future phase).
- Hardcoded template; configurable templates are future phase.
- Totals only in email body; detailed source rows are not introduced.
- No read-receipt or end-recipient confirmation; "acknowledged" means transport-layer acknowledgement.
- No cursor reset on configuration unpause (long-pause-large-window accepted).
- No alert escalation for repeated delivery failures (future operator-surface PR).

### Files touched by PR-C on the Notification Platform Service side

PR-C touches the following Notification Platform Service files: `README.md`, `spec.md`, `data-model.md`, `workflows.md`, `boundary-contracts.md`, `permissions.md`, `api-contracts.md`, `events.md`, `event-contracts.md`, `test-scenarios.md`, `edge-cases.md`, `assumptions-open-questions.md`. PR-C does NOT touch `openapi-contracts.md`.
