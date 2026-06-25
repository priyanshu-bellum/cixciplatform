# Analytics / Reporting Events

This document is proposal-level architecture. It defines initial Analytics event taxonomy without finalizing payload schema, event transport, delivery guarantees, retention, or implementation behavior.

## Event Principles

- Analytics events should use references, source versions, redaction classes, tenant/reporting scope, and freshness markers.
- Analytics events must not expose unrestricted customer, pricing, invoice, warranty, tenant, media-rights, licensing, or commercial data.
- Analytics events announce reporting activity, read model refresh, rebuild, replay, exports, dashboard refresh, freshness warnings, visibility evidence warnings, and metric/report definition changes.
- Source modules remain authoritative for operational event meaning.
- Analytics events are reporting signals, not operational state commands.

## Event Catalog

Proposal-level events:

- `analytics.report.generated`.
- `analytics.report.export.created`.
- `analytics.report.export.expired`.
- `analytics.report.export.revoked`.
- `analytics.report.export.superseded`.
- `analytics.dashboard.refreshed`.
- `analytics.dashboard.refresh.failed`.
- `analytics.metric.definition.updated`.
- `analytics.read-model.refresh.started`.
- `analytics.read-model.refresh.completed`.
- `analytics.read-model.refresh.failed`.
- `analytics.read-model.rebuild.requested`.
- `analytics.read-model.replay.started` placeholder.
- `analytics.read-model.stale.warning`.
- `analytics.data-freshness.warning`.
- `analytics.scheduled-report.ready`.
- `analytics.scheduled-report.throttled`.
- `analytics.report.accessed.sensitive`.
- `analytics.visibility-evidence.missing`.
- `analytics.visibility-evidence.stale`.
- `analytics.redaction-decision.applied`.

## Event Families

### Report Events

- Report generated.
- Report export created.
- Report export expired.
- Report export revoked.
- Report export superseded.
- Scheduled report ready.
- Scheduled report throttled.
- Sensitive report accessed.

### Dashboard Events

- Dashboard refreshed.
- Dashboard refresh failed.

### Metric Governance Events

- Metric definition updated.
- Report definition updated placeholder.
- Dashboard definition updated placeholder.

### Read Model Events

- Read model refresh started.
- Read model refresh completed.
- Read model refresh failed.
- Read model rebuild requested.
- Read model replay started placeholder.
- Read model stale warning.
- Data freshness warning.

### Visibility And Redaction Events

- Visibility evidence missing.
- Visibility evidence stale.
- Redaction decision applied.

## Required Event Fields

Proposal-level fields:

- Event id.
- Event type.
- Occurred at.
- Source: Analytics / Reporting.
- Tenant/reporting scope.
- Audience type.
- Actor/service reference where applicable.
- Report/dashboard/metric/read model/export reference where applicable.
- Read model version where applicable.
- Report schema version.
- Export schema version where applicable.
- Metric definition version list where applicable.
- Source version/reference list where applicable.
- Data freshness marker.
- Stale marker where applicable.
- Refresh checkpoint where applicable.
- Replay window where applicable.
- Relationship eligibility snapshot reference where applicable.
- Source visibility snapshot reference where applicable.
- Product-type scope reference where applicable.
- Licensed-property scope reference where applicable.
- Access projection version where applicable.
- Role / permission projection reference where applicable.
- Redaction class.
- Redaction decision version where applicable.
- Access projection reference where applicable.
- Logs & Audit reference where applicable.
- Notification hook intent where applicable.

## Notification Hooks

Events that may later trigger Notification Platform Service delivery include:

- `analytics.scheduled-report.ready`.
- `analytics.scheduled-report.throttled` where review or operational awareness is required.
- `analytics.data-freshness.warning`.
- `analytics.read-model.stale.warning`.
- `analytics.dashboard.refresh.failed`.
- `analytics.report.export.created` for approved recipients.
- `analytics.report.export.expired` or `analytics.report.export.revoked` where recipients need awareness.
- `analytics.visibility-evidence.missing` or `analytics.visibility-evidence.stale` where review is required.
- Future anomaly detected placeholder.

Notification Platform Service owns delivery, recipient resolution, preferences, retries, and delivery history.

## Logs & Audit Relationship

Report generation, report exports, export expiration/revocation, scheduled reports, dashboard refresh failures, read-model rebuild/replay activity, visibility evidence failures, redaction decisions, and sensitive report access should be auditable. Analytics events may carry Logs & Audit references, but Logs & Audit owns audit evidence.

## AI Agent Services Signals

AI Agent Services may consume authorized Analytics events or derived reporting outputs. Analytics may consume AI outcome signals, but AI Agent Services owns recommendations, confidence, insights, and action outcomes. AI agents may consume Analytics outputs only when authorization and visibility evidence permit.

## Redaction Rules

Analytics events should not carry full report payloads or hidden data exports. Events should prefer record references, counts, statuses, freshness markers, visibility evidence references, redaction decision versions, and redaction classes.

## Replay And Ordering Notes

Read model refresh, rebuild, replay, and report generation events should include source version references where possible so consumers can distinguish stale, refreshed, partial, superseded, or failed reporting outputs. Event replay must not mutate source operational records.

## Scheduled System Admin Activity Summary Aggregation - Additive Event Names (Cross-Module PR)

PR-C introduces exactly 2 additive event names in the Analytics / Reporting namespace. Per the established Analytics / Reporting naming convention (`analytics.<subject>.<verb_past_tense>` per existing events.md), the PR-C events use `analytics.activity-summary-<subject>.<verb_past_tense>` form. The full PR-C event inventory across the three target modules is 9 events: 5 Notification Platform Service + 2 Analytics / Reporting + 2 Logs & Audit File Tracking.

Existing Analytics / Reporting event names are not modified.

Event payload contract shape, redaction class, idempotency, and replay semantics for these events are documented in `event-contracts.md`.

### Activity Summary Reporting Window lifecycle (1 event)

- `analytics.activity-summary-window.evaluated` - raised when Analytics Workflow 5 (Source Fact Aggregation) or Analytics Workflow 6 (No-Activity Suppression) completes the evaluation pass for an Activity Summary Reporting Window. The payload's result-discriminator field indicates one of:
  - `aggregated` - non-empty aggregation; an Activity Summary Aggregation Record was produced; NPS Workflow 7 will be signaled.
  - `suppressed_no_activity` - zero source-fact activity in the effective window interval; Logs & Audit Workflow 10 records No-Activity Summary Suppression Evidence; Notification Platform Service consumes this suppression-outcome event and advances its own configuration cursor via NPS Workflow 9's Trigger B path. No delivery attempt is created. Analytics does not mutate the cursor.

  No separate event name per result; the discriminator is in the payload. The event also carries the `activity_summary_reporting_window_reference` and the `activity_summary_configuration_reference`; consumers may filter by result-discriminator if they care only about one outcome.

### Activity Summary Aggregation Record creation (1 event)

- `analytics.activity-summary-aggregation.created` - raised when Analytics Workflow 5 produces an Activity Summary Aggregation Record (the non-empty path of `analytics.activity-summary-window.evaluated`). The two events are emitted together in the non-empty case: `analytics.activity-summary-window.evaluated` with result `aggregated`, plus `analytics.activity-summary-aggregation.created`. The aggregation event is the immutable-record-created signal for downstream consumers (Logs & Audit, Notification Platform Service); the window-evaluated event captures the lifecycle transition on the Reporting Window entity.

  In the empty case, only `analytics.activity-summary-window.evaluated` is emitted (with result `suppressed_no_activity`); the aggregation-created event is not emitted because no aggregation record exists.

### Analytics / Reporting PR-C event summary

Total Analytics / Reporting additive events: 2.

By family:
- Activity Summary Reporting Window lifecycle: 1 (covering both `aggregated` and `suppressed_no_activity` terminal results via payload discriminator)
- Activity Summary Aggregation Record creation: 1 (emitted only on the non-empty path)

### Events PR-C explicitly does not introduce on the Analytics / Reporting side

- Separate Analytics window events for the aggregated or suppressed outcomes. The result is carried as a payload discriminator field on the single `analytics.activity-summary-window.evaluated` event, not as distinct event names per outcome.
- Per-section or per-metric event names. The section / metric structure is internal to the aggregation record; downstream consumers read the record by reference.
- Per-source-module aggregation events. PR-C does not introduce events for "Order Routing facts aggregated" or similar; the aggregation is a single pass.
- Per-window-state-transition event names beyond the single evaluated event. The `delivered`, `delivery_failed`, and `superseded` state transitions on the Reporting Window are not emitted as separate Analytics events; they are reflected in the Notification Platform Service delivery events (`notification.activity-summary-delivery.succeeded` / `.failed`) and in the Reporting Window's state. (Operators query Analytics for the current Reporting Window state; the lifecycle transitions are observable on the entity.)
- Dashboard refresh or aggregation-export events; dashboard implementation is deferred.
- Per-tenant aggregation events; per-tenant aggregation is future phase.
- Late source fact arrival event names; late-arrival handling is an architectural expectation documented in edge-cases.md, not a separate event.
- Cross-module workflow events (events that span the three target modules); each module emits its own events, and downstream consumers correlate via the canonical references.
- Source-module event modification of any kind.
