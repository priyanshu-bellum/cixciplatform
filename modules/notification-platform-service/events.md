# Notification Platform Service Events

This document is proposal-level architecture. It defines initial notification event catalog and event modeling notes without finalizing event schemas, delivery guarantees, consumer contracts, or implementation behavior.

## Event Catalog

### Notification Request Events

- `notification.request.received`.
- `notification.request.accepted`.
- `notification.request.rejected`.
- `notification.request.duplicate_suppressed`.
- `notification.request.review_required`.

### Eligibility Evidence Events

- `notification.eligibility_evidence.validated`.
- `notification.eligibility_evidence.missing`.
- `notification.eligibility_evidence.expired`.
- `notification.eligibility_evidence.recheck_required`.

### Recipient Resolution Events

- `notification.recipients.resolved`.
- `notification.recipients.resolution_failed`.
- `notification.recipients.scope_blocked`.
- `notification.recipients.expansion_capped`.
- `notification.recipients.duplicates_collapsed`.

### Preference And Suppression Events

- `notification.preference.updated`.
- `notification.preference.evaluated`.
- `notification.preference.blocked_delivery`.
- `notification.preference.delayed_delivery`.
- `notification.preference.digested_delivery`.
- `notification.suppression.created`.
- `notification.suppression.review_required`.
- `notification.unsubscribe.recorded` placeholder.

### Template Events

- `notification.template.created`.
- `notification.template.version.created`.
- `notification.template.approved`.
- `notification.template.retired`.
- `notification.template.render_blocked`.

### Digest And Fanout Events

- `notification.digest.job.created`.
- `notification.digest.job.completed`.
- `notification.digest.job.failed`.
- `notification.fanout.batch.created`.
- `notification.fanout.batch.throttled`.
- `notification.fanout.batch.completed`.
- `notification.fanout.batch.failed`.
- `notification.fanout.backpressure_applied`.

### Delivery Events

- `notification.delivery.queued`.
- `notification.delivery.sent`.
- `notification.delivery.delivered` where provider-supported.
- `notification.delivery.failed`.
- `notification.delivery.bounced` placeholder.
- `notification.delivery.delayed`.
- `notification.delivery.cancelled`.
- `notification.delivery.superseded`.
- `notification.delivery.retry_scheduled`.
- `notification.delivery.retry_exhausted`.
- `notification.delivery.suppressed`.
- `notification.delivery.expired`.

### Provider Events

- `notification.provider.callback.received`.
- `notification.provider.callback.duplicate_collapsed`.
- `notification.provider.callback.stale_ignored`.
- `notification.provider.response.received`.
- `notification.provider.failure.recorded`.
- `notification.provider.rate_limited`.
- `notification.provider.unavailable` placeholder.

### Audit Events

- `notification.audit.reference.created`.
- `notification.history.recorded`.

## Notification-Triggering Examples By Source Module

Notification Platform Service may consume eligible events from source modules. These are triggering examples, not Notification-owned source events.

### Tenant Company

- User invitation.
- Onboarding approval needed.
- Account activated.
- Buyer activated.
- Vendor activated.
- Admin exception requires review.
- Buyer/vendor relationship eligibility changed.
- Product-type eligibility changed.
- Licensed-property relationship status changed.

### Product Catalog

- Accessory import failed.
- Product export completed.
- Product activation changed.
- Catalog validation errors require review.
- Vendor added new accessories.
- Accessory catalog update requires buyer review.

### Device Catalog

- Device import failed.
- Device visibility changed.
- Launch-ready device published.
- Device identity conflict requires review.
- Buyer device portfolio changed.

### Pricing

- Pricing exception requires approval.
- Pricing snapshot missing or blocked.
- Pricing rule changed.
- Buyer pricing mode exception requires review.

### Order Routing

- Routing failed.
- Manual routing review required.
- Vendor suborder created.
- Routing exception created.

### Fulfillment / Returns

- Shipment created.
- Tracking missing.
- Shipment delayed.
- Delivered.
- Return request received.
- Return exception created.
- Replacement shipment created.

### Invoice Management

- Invoice generated.
- Invoice export created.
- Reconciliation mismatch detected.
- Invoice finalization requires review.

### Warranty Registration / Claims

- Warranty registration failed.
- Warranty registration confirmed.
- Warranty claim initiated.
- Warranty claim requires review.

### Logs & Audit

- Repeated file processing failure.
- Retry exhausted.
- Audit retention review required.
- Vendor file quality issue.

### AI Agent Services

- Recommendation requires approval.
- Risk/control agent flagged issue.
- Agent conflict requires review.

## Eligibility-Based Notification Event Modeling

Notification Platform Service may deliver notifications after source modules provide eligible signals for cases such as:

- New approved vendor has accessories compatible with devices a buyer sells/supports.
- New active buyer should be visible to eligible vendors.
- Vendor adds new accessories that eligible buyers may review.

Eligibility must come from source modules:

- Tenant Company owns buyer/vendor relationship eligibility, activation, region scope, product-type eligibility, licensed-property scope, readiness, users, roles, and permissions.
- Product Catalog owns product records, accessory additions, visibility records, activation/download state, and compatibility assertions.
- Device Catalog owns Device References and buyer device portfolio references.

Notification Platform Service must not independently decide buyer/vendor eligibility or product compatibility.

## Required Event Fields

Proposal-level fields for Notification-owned events:

- Event id.
- Event type.
- Event version.
- Notification request id.
- Source module reference.
- Source event reference.
- Eligibility evidence reference where applicable.
- Tenant scope reference.
- Recipient class or recipient reference where safe.
- Recipient group reference where applicable.
- Digest job reference where applicable.
- Fanout batch reference where applicable.
- Channel.
- Template version reference.
- Delivery attempt reference where applicable.
- Delivery status where applicable.
- Idempotency key.
- Provider callback idempotency key where applicable.
- Correlation id.
- Redaction class.
- Occurred at.

## Payload Boundaries

Notification events should use references and safe summaries. Sensitive customer, order, pricing, invoice, warranty, tenant, media, licensing, and commercial data must not appear unless explicitly allowed by source-module policy and redaction rules.

Notification events must not become hidden data exports.

## Consumer-Specific Boundaries

- Logs & Audit may consume delivery audit references, retry exhaustion, suppression review, and provider failure signals.
- Analytics may consume delivery outcome, fanout, digest, and provider rate-limit signals without owning Notification history.
- AI Agent Services may consume review-required, risk, retry exhaustion, and delivery outcome signals.
- Source modules may consume delivery status feedback only where explicitly required.

## Replay And Idempotency Notes

- Consumers should tolerate duplicate Notification events.
- Provider callback events should be idempotent by provider delivery id, provider event id placeholder, delivery attempt id, and callback idempotency key where available.
- Replay should preserve tenant scope and redaction class.
- Stale provider callback events should not reopen terminal states without review.

## Open Questions

- Which Notification-owned events are required at launch?
- Which source-module events should trigger immediate notification versus digest notification?
- Which delivery events should be visible to buyers, vendors, or internal users?
- What replay guarantees apply to notification events?
- Which fanout and digest events should Analytics consume?

## Scheduled System Admin Activity Summary Email - Additive Event Names (Cross-Module PR)

PR-C introduces exactly 5 additive event names in the Notification Platform Service namespace. Per the established Notification Platform Service naming convention (`notification.<entity_or_action>.<verb_past_tense>` per existing events.md), the PR-C events use `notification.activity-summary-<subject>.<verb_past_tense>` form. The full PR-C event inventory across the three target modules is 9 events: 5 Notification Platform Service + 2 Analytics / Reporting + 2 Logs & Audit File Tracking.

Existing Notification Platform Service event names are not modified. The PR #91 (Order Routing - 12 events), PR #92 (Fulfillment / Returns SLA - 17 events), and PR #94 (Fulfillment / Returns Delivery Date and Buyer Update - 13 events) event inventories remain unchanged.

Event payload contract shape, redaction class, idempotency, and replay semantics for these events are documented in `event-contracts.md`.

### Activity Summary Configuration lifecycle (2 events)

- `notification.activity-summary-configuration.created` - raised when NPS Workflow 1 creates an Activity Summary Configuration in `draft` state (or directly in `active` state if the create-and-activate path is used).
- `notification.activity-summary-configuration.updated` - raised when NPS Workflow 1 mutates an existing Activity Summary Configuration. The payload's lifecycle state field discriminates the specific change (lifecycle transition to `paused`, `active`, `retired`, or non-lifecycle field updates such as scheduling-field changes, recipient-scope changes, or business-calendar-reference changes). No separate event name per lifecycle sub-transition; the discriminator field is in the payload.

### Activity Summary Delivery Attempt lifecycle (3 events)

- `notification.activity-summary-delivery.attempted` - raised when NPS Workflow 7 transitions an Activity Summary Delivery Attempt from `pending` to `dispatched` (delivery initiated; transport handoff complete or attempted).
- `notification.activity-summary-delivery.succeeded` - raised when NPS Workflow 9 transitions an Activity Summary Delivery Attempt from `dispatched` to `acknowledged` terminal state. Triggers cursor advancement on the Activity Summary Configuration and triggers carry-forward subsumption transitions on any prior `delivery_failed` Reporting Windows referenced by the just-delivered window's `carry_forward_window_reference_collection`.
- `notification.activity-summary-delivery.failed` - raised when NPS Workflow 8 transitions an Activity Summary Delivery Attempt from `dispatched` to `failed` terminal state. The cursor is NOT advanced. The associated Reporting Window transitions to `delivery_failed` state.

### Notification Platform Service PR-C event summary

Total Notification Platform Service additive events: 5.

By family:
- Activity Summary Configuration lifecycle: 2
- Activity Summary Delivery Attempt lifecycle: 3

### Events PR-C explicitly does not introduce on the Notification Platform Service side

- Per-event notification events for source-module activity. PR-C is scheduled-summary-only; per-event behavior is explicitly out of scope.
- Buyer-facing or vendor-facing summary delivery events. CIXCI System Admin only in Phase 1.
- Per-recipient-personalization or per-recipient-delivery events.
- Configuration-paused or configuration-retired or configuration-activated as separate event names. These lifecycle sub-transitions are payload discriminators on `notification.activity-summary-configuration.updated`.
- Per-failure-mode event names. The single `notification.activity-summary-delivery.failed` event carries failure reason in its payload; no per-reason event splits.
- Per-attempt-retry event names. Retry attempts produce a new Activity Summary Delivery Attempt; that new attempt emits its own `notification.activity-summary-delivery.attempted` event in due course. There is no separate "retry" event.
- Cross-module aggregation events; aggregation belongs to Analytics / Reporting.
- Evidence-recording events; evidence retention belongs to Logs & Audit File Tracking.
- Dashboard events; dashboard implementation is deferred.
- Summary template events; template configurability is deferred.
- Read-receipt or end-recipient-confirmation events; not in Phase 1.
- Alert-escalation events for repeated failures; future operator-surface PR.
