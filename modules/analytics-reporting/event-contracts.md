# Analytics / Reporting Event Contracts

This document is proposal-level architecture. It defines event contract expectations between Analytics / Reporting and source or consumer modules.

## Inbound Source Signal Contracts

Analytics may consume reporting-safe events, snapshots, references, and projections from:

- Product Catalog events/snapshots.
- Device Catalog events/snapshots.
- Pricing snapshots/events.
- Order Routing snapshots/events.
- Fulfillment/Returns events/evidence.
- Invoice Management records/events.
- Warranty Registration/Claims events.
- Logs & Audit signals.
- Notification Platform Service delivery signals.
- Media / Image Asset Management signals.
- Integration Management signals.
- Tenant Company scope/eligibility projections.
- AI Agent Services outcome signals.

Inbound source signals should include:

- Source module.
- Source event/snapshot/reference id.
- Source version/hash placeholder.
- Tenant scope reference.
- Tenant/company/entity scope.
- Source timestamp.
- Source-event ordering reference where applicable.
- Relationship eligibility snapshot reference where applicable.
- Source visibility snapshot reference where applicable.
- Product-type scope reference where applicable.
- Licensed-property scope reference where applicable.
- Access projection version where applicable.
- Role / permission projection reference where applicable.
- Redaction class.
- Redaction decision version where applicable.
- Visibility/access rule reference where applicable.
- Data freshness timestamp.
- Reporting-safe projection status.

Source modules remain authoritative for business meaning, operational records, access/visibility decisions, and eligibility decisions. Analytics must not infer buyer/vendor/manufacturer visibility.

## Outbound Analytics Event Contracts

Analytics outbound events should include:

- Analytics event id.
- Analytics event type.
- Tenant/reporting scope.
- Audience type.
- Report/dashboard/metric/read model/export reference.
- Source version/reference list.
- Report schema version.
- Export schema version where applicable.
- Metric definition version list where applicable.
- Read model version where applicable.
- Refresh checkpoint where applicable.
- Replay window where applicable.
- Data freshness marker.
- Stale marker where applicable.
- Relationship eligibility snapshot reference where applicable.
- Source visibility snapshot reference where applicable.
- Product-type scope reference where applicable.
- Licensed-property scope reference where applicable.
- Access projection reference/version where applicable.
- Role / permission projection reference where applicable.
- Redaction class.
- Redaction decision version where applicable.
- Logs & Audit reference where applicable.

## Consumer Boundaries

### Notification Platform Service

Consumes scheduled report ready, scheduled report throttled, dashboard refresh failed, data freshness warning, read-model stale warning, report export failed/expired/revoked where relevant, visibility evidence missing/stale, and future anomaly detected signals. Notification owns recipient resolution, preferences, suppression, delivery, retry, and delivery history.

### Logs & Audit

Receives audit references for report generation, export, export download/expiration/revocation, scheduled report activity, dashboard refresh failure, read-model rebuild/replay, visibility evidence failures, redaction decisions, and sensitive report access. Logs & Audit owns audit evidence.

### AI Agent Services

May consume authorized analytics outputs and events only when authorization and visibility evidence permit. AI Agent Services owns recommendations, insights, confidence, and action outcomes. AI must not use Analytics to bypass tenant scope, visibility evidence, redaction decisions, or source-module permissions.

### Source Modules

Source modules may consume analytics trend signals where approved, but Analytics events must not be treated as operational state commands. Source modules remain authoritative for mutations, access/visibility decisions, eligibility decisions, and workflow state.

## Redaction And Payload Rules

Events must use minimal necessary data. Sensitive customer, order, pricing, invoice, warranty, tenant, media-rights, licensing, and commercial values should be represented by references or redacted summaries unless explicitly allowed.

## Idempotency And Freshness

Analytics events should include idempotency/event ids and source version references. Read model refresh events should distinguish started, completed, failed, stale, delayed, partial, rebuilding, backfilling, replaying, unknown, and review-required freshness states.

## Replay And Ordering

Read-model rebuild/backfill/replay events should include replay window, refresh checkpoint, source-event ordering reference, source-input conflict status, and supersession reference where applicable. Replays must not mutate operational source records.

## Non-Goals

Analytics event contracts do not define product, device, pricing, routing, fulfillment, invoice, warranty, tenant, audit, notification, media, integration, or AI source event payloads. Those remain owned by their modules.

## Scheduled System Admin Activity Summary Aggregation Event Contracts (Cross-Module PR)

This section documents the architecture-level event contract shape for the 2 additive Analytics / Reporting event names introduced by PR-C. The Notification Platform Service and Logs & Audit File Tracking sides of the cross-module event inventory have their own event-contracts.md sections.

### Reference-first payload discipline

PR-C events follow the reference-first payload pattern. Event payloads carry stable identifiers; they do not embed aggregation record content, source-module records, or buyer-or-vendor payloads.

Common payload fields across both Analytics / Reporting PR-C events (proposal-level; aligns with the existing Analytics / Reporting events.md required-fields list):

- `eventId` - unique event identifier.
- `eventType` - the event name.
- `eventVersion` - `v1` baseline.
- `occurredAt` - the event timestamp.
- `source` - `analytics-reporting`.
- `tenantReportingScope` - existing Analytics / Reporting tenant/reporting scope field; for PR-C, the scope is the CIXCI-internal platform-wide scope.
- `audienceType` - `system-admin` for PR-C events (per the existing Analytics / Reporting audience-type enumeration).
- `activitySummaryConfigurationReference` - the canonical Notification Platform Service Activity Summary Configuration reference.
- `activitySummaryReportingWindowReference` - the canonical Activity Summary Reporting Window reference.
- `redactionClass` - existing Analytics / Reporting redaction class; PR-C events are scoped to `internal` (CIXCI System Admin-only data).
- `redactionDecisionVersion` - existing Analytics / Reporting redaction decision version field.
- `logsAuditReference` - existing Analytics / Reporting Logs & Audit reference field.

### Event-specific payload fields (proposal-level)

**`analytics.activity-summary-window.evaluated`:**
- All common fields.
- `resultDiscriminator` - one of `aggregated`, `suppressed_no_activity`. Operators may filter events by this field.
- `windowStartTimestamp`, `windowEndTimestamp` - the Activity Summary Reporting Window's primary interval.
- `carryForwardWindowReferenceCollection` - optional; references to prior `delivery_failed` windows subsumed by this evaluation.
- `effectiveAggregationIntervalDescription` - human-readable description of the union of primary and carry-forward intervals.
- For `resultDiscriminator = aggregated`:
  - `activitySummaryAggregationRecordReference` - the canonical aggregation record reference.
  - `metricSectionCountSummary` - summary count fields per section (totals only, not individual metric values; full metric content lives in the aggregation record).
- For `resultDiscriminator = suppressed_no_activity`:
  - `noActivitySuppressionEvidenceReference` - the canonical Logs & Audit suppression evidence reference, if already available at emission time; otherwise null.

  The Analytics suppression-outcome event is emitted **before** Notification Platform Service consumes the outcome and advances its own cursor. Therefore the Analytics event payload **does not** include a cursor-advancement timestamp; that timestamp does not exist at Analytics emission time. Notification Platform Service captures the cursor-advancement timestamp on its own NPS-side audit reference after performing the cursor mutation in NPS Workflow 9 Trigger B path.

**`analytics.activity-summary-aggregation.created`:**
- All common fields.
- `activitySummaryAggregationRecordReference` - the canonical aggregation record reference.
- `generatedAtTimestamp` - matches the aggregation record's `generated_at_timestamp`.
- `summaryDashboardReference` - optional; reference to the future Analytics dashboard read model. May be null in Phase 1.
- `sourceModuleReferenceCollection` - existing Analytics / Reporting source module references field; for PR-C, lists the source modules whose facts contributed (typically `order-routing`, `fulfillment-returns`).
- `metricSectionCountSummary` - summary count fields per section.
- `sourceVersionReferenceList` - existing Analytics / Reporting source version reference list; for PR-C, lists the source-event references that contributed.

### Event versioning

Both PR-C event names are introduced at `eventVersion = 1` baseline (or the equivalent baseline per existing Analytics / Reporting event-contracts.md convention).

### Idempotency

- `analytics.activity-summary-window.evaluated` is emitted once per Reporting Window state transition (`evaluating -> aggregated` or `evaluating -> suppressed_no_activity`). Re-emission of the same `eventId` is consumer-deduplicated.
- `analytics.activity-summary-aggregation.created` is emitted once per Activity Summary Aggregation Record creation. The aggregation record is immutable; re-aggregation produces a new record with a new reference and a new event.

### Replay semantics

- Replay does not re-aggregate. The aggregation record is the canonical snapshot at the original emission time.
- Replay does not re-trigger downstream consumers' workflows; consumers may safely re-process for observability.

### Failure handling

- Producers (Analytics Workflows 4, 5, 6) emit events as state transitions occur. Producer-side emission failure is recoverable via replay from the canonical entity record.
- Consumers (Logs & Audit File Tracking, Notification Platform Service for triggering delivery, future Cross-Module operator surfaces) handle their own failure modes.

### Consumer responsibilities

- **Notification Platform Service** consumes `analytics.activity-summary-aggregation.created` (or correlates via the Reporting Window state) to trigger NPS Workflow 7 (Summary Delivery Attempt). The aggregation-created event is the signal that a delivery attempt should be created.
- **Logs & Audit File Tracking** consumes both events to record Activity Summary Generated Evidence (on `aggregated` result of window-evaluated, and on aggregation-created) and No-Activity Summary Suppression Evidence (on `suppressed_no_activity` result of window-evaluated).

### Contract notes that PR-C does not finalize

- Concrete payload field shapes, types, and validation rules.
- OpenAPI / JSON Schema definitions.
- Broker-level guarantees.
- Late-arrival reconciliation policy implementation.
- Real-time aggregation event timing.
- Dashboard reference resolution mechanics.

These remain deferred.
