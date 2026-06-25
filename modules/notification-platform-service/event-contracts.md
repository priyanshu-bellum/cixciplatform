# Notification Platform Service Event Contracts

This document is proposal-level architecture. It defines initial event interface contracts for Notification Platform Service without finalizing payload schemas, delivery guarantees, event broker implementation, or source-module event contracts.

## Event Name

Use `notification.*` for Notification-owned events. Source-module triggering events should keep their source-module namespace and be consumed by Notification through approved contracts.

Examples:

- `notification.request.accepted`.
- `notification.delivery.sent`.
- `notification.delivery.failed`.
- `notification.delivery.retry_exhausted`.
- `notification.audit.reference.created`.

## Event Purpose

Notification-owned events communicate notification request, recipient resolution, template, preference, suppression, delivery, retry, provider response, and delivery audit outcomes.

They do not redefine the source business event that caused the notification.

## Event Producer

Notification Platform Service produces `notification.*` events.

Source modules produce triggering events, including Tenant Company, Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty support, Logs & Audit, and AI Agent Services.

## Event Consumers

Potential consumers:

- Logs & Audit File Tracking for delivery audit references.
- Analytics for delivery performance signals.
- AI Agent Services for notification outcome and review signals.
- Source modules where delivery feedback is explicitly required.
- Future monitoring/operations tools.

## Trigger Conditions

Proposal-level trigger conditions:

- Notification request accepted, rejected, or duplicate suppressed.
- Recipient resolution completed or failed.
- Template rendering blocked.
- Preference or suppression blocks delivery.
- Delivery queued, sent, delivered, failed, retried, exhausted, expired, or suppressed.
- Provider response received.
- Delivery audit reference created.

## Payload Schema

Proposal-level fields:

- `eventId`.
- `eventType`.
- `eventVersion`.
- `notificationRequestId`.
- `deliveryAttemptId` where applicable.
- `sourceModule`.
- `sourceEventReference`.
- `tenantScopeReference`.
- `recipientReference` or safe recipient class where permitted.
- `channel`.
- `templateVersionReference`.
- `deliveryStatus` where applicable.
- `failureReason` where applicable.
- `providerResponseReference` where permitted.
- `redactionClass`.
- `correlationId`.
- `idempotencyKey`.
- `occurredAt`.

## Required Fields

Required for most Notification-owned events:

- Event id.
- Event type.
- Event version.
- Notification request id.
- Source module.
- Source event reference.
- Tenant scope reference where applicable.
- Redaction class.
- Correlation id.
- Occurred at.

## Optional Fields

Optional fields depend on event type:

- Delivery attempt id.
- Recipient reference.
- Channel.
- Template version reference.
- Delivery status.
- Failure reason.
- Retry count.
- Provider response reference.
- Delivery audit reference.
- Suppression reason.

## Idempotency Rules

Notification events should include idempotency keys aligned to the notification request and delivery attempt. Consumers should tolerate duplicate event delivery.

Duplicate suppression events should identify the source event, recipient, channel, template type, and suppression reason where safe.

## Ordering / Sequencing Rules

Proposal-level sequencing:

- Request events precede delivery events for the same request.
- Delivery attempt events should carry attempt number and status timestamp.
- Provider responses may arrive out of order and should be correlated by delivery attempt id and provider delivery id.
- Consumers should not rely on global ordering across different notification requests.

## Retry / Failure Handling

Event publishing should be retryable and observable. Delivery failure events should not themselves trigger uncontrolled notification loops.

Retry-exhausted events may be consumed by Logs & Audit, AI Agent Services, or operational review queues.

## Versioning Strategy

Version event schemas independently from:

- API schemas.
- Template versions.
- Source-module event versions.
- Provider response formats.
- Preference schema versions.

## Security / Access Considerations

Events must use minimal necessary payloads. Sensitive data should be represented through references or redacted summaries.

Customer, order, pricing, invoice, warranty, tenant, media, licensing, and commercial data must not appear unless explicitly allowed by source-module policy, recipient scope, redaction class, and template policy.

## Audit / Logging Requirements

Notification delivery audit references may be sent to Logs & Audit. Logs & Audit owns platform audit evidence; Notification owns notification delivery history.

Sensitive notification event access should be auditable where feasible.

## Example Event Payload

```json
{
  "eventId": "notification-event-placeholder",
  "eventType": "notification.delivery.failed",
  "eventVersion": "v0-proposal",
  "notificationRequestId": "notification-request-placeholder",
  "deliveryAttemptId": "delivery-attempt-placeholder",
  "sourceModule": "Fulfillment / Returns",
  "sourceEventReference": "source-event-placeholder",
  "tenantScopeReference": "tenant-scope-placeholder",
  "recipientReference": "recipient-reference-placeholder",
  "channel": "email",
  "templateVersionReference": "template-version-placeholder",
  "deliveryStatus": "failed",
  "failureReason": "provider-unavailable-placeholder",
  "providerResponseReference": "masked-provider-response-placeholder",
  "redactionClass": "operational-summary",
  "correlationId": "correlation-placeholder",
  "idempotencyKey": "idempotency-placeholder",
  "occurredAt": "timestamp-placeholder"
}
```

## Open Questions

- Which notification events require guaranteed delivery?
- Which events are internal-only versus buyer/vendor-visible?
- Which consumer classes may see provider response references?
- Which source modules require delivery feedback events?

## Scheduled System Admin Activity Summary Email Event Contracts (Cross-Module PR)

This section documents the architecture-level event contract shape for the 5 additive Notification Platform Service event names introduced by PR-C. Contract notes are at proposal level; concrete payload schemas, OpenAPI definitions, and broker-level mechanics are deferred. The Analytics / Reporting and Logs & Audit File Tracking sides of the cross-module event inventory have their own event-contracts.md sections.

### Reference-first payload discipline

PR-C events follow the reference-first payload pattern established by PR #91, PR #92, and PR #94. Event payloads carry stable identifiers; they do not embed source content, aggregation record content, source-module records, vendor or buyer payloads, or transport-layer payloads.

Common payload fields across all 5 Notification Platform Service PR-C events (proposal-level; aligns with the existing Notification Platform Service event-contracts conventions):

- `eventId` - unique event identifier.
- `eventType` - the event name (one of the 5 PR-C event names).
- `eventVersion` - schema version; all 5 PR-C events are introduced at the baseline `v1` (or the equivalent baseline version per the existing Notification Platform Service event-contracts convention).
- `occurredAt` - the event timestamp.
- `sourceModule` - `notification-platform-service`.
- `activitySummaryConfigurationReference` - the canonical Activity Summary Configuration reference.
- `correlationId` - correlation identifier per existing Notification Platform Service convention.
- `redactionClass` - one of the redaction classes per existing Notification Platform Service convention; PR-C events are scoped to `internal` (CIXCI System Admin-only data; no buyer-or-vendor-scoped data exposure in event payloads).
- `auditRecordReference` - existing Logs & Audit Audit Record reference per existing Notification Platform Service convention.

### Event-specific payload fields (proposal-level)

**`notification.activity-summary-configuration.created`:**
- All common fields.
- `lifecycleState` - typically `draft` or `active` per the create path.
- `actorReference` - the CIXCI System Admin who created the configuration (subject to Tenant Company `check_access` resolution).

**`notification.activity-summary-configuration.updated`:**
- All common fields.
- `lifecycleState` - the new lifecycle state after the update (`draft`, `active`, `paused`, or `retired`); or the unchanged state if a non-lifecycle field was updated.
- `updateDiscriminator` - field-level discriminator indicating which fields were updated (for example, `lifecycle_transition`, `delivery_times_changed`, `recipient_scope_changed`, `business_calendar_reference_changed`). Operators can filter events by this field.
- `actorReference` - the CIXCI System Admin who performed the update.

**`notification.activity-summary-delivery.attempted`:**
- All common fields.
- `activitySummaryDeliveryAttemptReference` - the canonical Activity Summary Delivery Attempt reference.
- `activitySummaryAggregationRecordReference` - the Analytics / Reporting aggregation record being delivered.
- `activitySummaryReportingWindowReference` - the Analytics / Reporting Reporting Window the aggregation came from.
- `effectiveRecipientScopeSnapshotReference` - the immutable recipient scope snapshot at dispatch time.
- `transportReference` - optional; Integration Management transport-layer record reference where available, null otherwise.
- `dispatchTimestamp`.

**`notification.activity-summary-delivery.succeeded`:**
- All common fields.
- `activitySummaryDeliveryAttemptReference`.
- `deliveryAcknowledgementReference` - Integration Management transport-success record reference where available.
- `acknowledgementTimestamp`.
- `cursorAdvancementTarget` - the `window_end_timestamp` value that the Activity Summary Configuration's `last_successful_summary_cursor_reference` advances to.
- `carryForwardSubsumedWindowReferenceCollection` - optional; if the just-delivered window subsumed prior `delivery_failed` windows, this collection lists them (those windows transition to `superseded` per NPS Workflow 9).

**`notification.activity-summary-delivery.failed`:**
- All common fields.
- `activitySummaryDeliveryAttemptReference`.
- `deliveryFailureReference` - Integration Management transport-failure record reference where available.
- `failureReasonText` - Phase 1 fallback when no Integration Management reference is available; free-text reason.
- `failureTimestamp`.
- `cursorAdvancementOccurred` - boolean; always `false` for failed delivery (the cursor never advances on failure). The explicit field improves auditability.

### Event versioning

All 5 PR-C event names are introduced at `eventVersion = 1` (or the equivalent baseline version per existing Notification Platform Service event-contracts.md convention). Future PRs that materially change payload shape must increment `eventVersion`. PR-C does not anticipate such changes within its scope.

### Idempotency

PR-C events are idempotent at the architectural level:
- Re-emission of an event with the same `eventId` is consumer-deduplicated.
- Payload references are stable; consumers may safely re-process.
- `notification.activity-summary-delivery.succeeded` is not re-emitted for the same Activity Summary Delivery Attempt; if a duplicate provider acknowledgement is observed, Notification Platform Service deduplicates per existing patterns and does not re-advance the cursor.
- `notification.activity-summary-configuration.updated` may be emitted multiple times for separate edits to the same configuration; each emission has a distinct `eventId` and corresponds to a distinct state change.

Concrete idempotency-key derivation, deduplication windows, and broker-level guarantees are implementation concerns and remain deferred.

### Replay semantics

Replay of PR-C events follows the existing Notification Platform Service replay convention:
- Replay does not re-perform transport. The Activity Summary Delivery Attempt's terminal state is canonical.
- Replay of `notification.activity-summary-delivery.succeeded` does not re-advance the cursor; the cursor advancement occurred at the original emission time.
- Replay of `notification.activity-summary-delivery.failed` does not re-trigger Notification Platform Service retry policy at replay time.
- Replay is for consumer observability; the canonical state lives on the Activity Summary Configuration and Activity Summary Delivery Attempt entities.

### Failure handling

- Producers (NPS Workflows 1, 7, 8, 9) emit events as state transitions occur. Producer-side emission failure is recoverable via replay from the canonical entity record.
- Consumers (Logs & Audit File Tracking, Analytics / Reporting for correlation, future Cross-Module operator surfaces) handle their own failure modes. PR-C does not specify consumer retry policy.

### Consumer responsibilities

- **Logs & Audit File Tracking** consumes all 5 Notification Platform Service PR-C events to retain by reference via existing Audit Record entity patterns.
- **Analytics / Reporting** consumes `notification.activity-summary-delivery.succeeded` and `notification.activity-summary-delivery.failed` to update Reporting Window state (`delivered`, `delivery_failed`, `superseded` transitions). The Reporting Window state lives in Analytics / Reporting; Notification Platform Service signals via these events.

### Contract notes that PR-C does not finalize

- Concrete payload field shapes, types, and validation rules.
- OpenAPI / JSON Schema definitions.
- Broker-level guarantees (at-least-once versus exactly-once, ordering, partitioning).
- Consumer-side concurrency, idempotency key derivation specifics, deduplication storage.
- Retry tuning, backoff curves.
- Operator alert thresholds and dashboards.
- Provider-layer transport behavior.

These remain deferred to API Governance Foundation, broker implementation, provider integration, and operator surface PRs.
