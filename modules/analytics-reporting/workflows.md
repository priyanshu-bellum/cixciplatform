# Analytics / Reporting Workflows

This document is proposal-level architecture. It defines initial workflows without finalizing implementation behavior, storage, refresh cadence, metric formulas, report UX, export mechanics, or retention.

## Read Model Refresh Workflow

1. Source modules emit approved events, snapshots, references, or reporting-safe projections.
2. Analytics ingests source inputs with tenant scope, redaction class, source version/reference, source timestamp, and visibility rule references where available.
3. Analytics determines whether the read model needs incremental refresh, full rebuild, backfill, or source-event replay.
4. Analytics creates a refresh job status record with read-model version, source-event ordering reference, refresh checkpoint, replay window where applicable, and tenant/report partition key.
5. Analytics updates or rebuilds reporting read models according to a proposal-level refresh strategy.
6. Analytics records data freshness markers, stale markers, partial refresh state, failed refresh state, source-input conflict handling status, and supersession references where applicable.
7. Analytics emits read-model refresh events such as `analytics.read-model.refresh.started`, `analytics.read-model.refresh.completed`, or `analytics.read-model.refresh.failed`.
8. Refresh failures, partial refreshes, stale source inputs, or source-input conflicts may create data freshness warnings and notification hooks.

Analytics read models may lag source modules. Analytics must expose freshness/status where appropriate. Rebuilds, backfills, and replays must not mutate operational source records. Failed or partial refreshes must not be presented as fully trustworthy analytics.

## Refresh Lifecycle Concepts

Proposal-level refresh concepts:

- Incremental refresh: update a read model from new approved source inputs after a checkpoint.
- Full rebuild: recreate a read model from approved source inputs and source references for a reporting scope.
- Backfill: populate historical reporting periods or missing source windows without changing source records.
- Source-event replay: reprocess approved source events or snapshots within a replay window.
- Replay window: bounded source-event time or sequence range eligible for replay.
- Partial refresh: refresh job completed for only part of the intended scope or source set.
- Refresh checkpoint: durable marker for processed source input position.
- Source-event ordering: proposal-level handling for late, out-of-order, duplicate, or superseded source inputs.
- Failed refresh state: status indicating a read model is not current or reliable for the intended scope.
- Stale marker: indicator that source inputs or access/visibility evidence are older than allowed freshness expectations.
- Supersession reference: link from a replaced read model, export, or refresh result to the newer evidence.
- Source-input conflict handling: review/block/warn behavior when source modules disagree or visibility evidence conflicts.
- Data freshness warning: signal that reports may be incomplete, delayed, stale, partial, or review-required.

## Cross-Party Visibility Evidence Workflow

1. Source modules and Tenant Company provide access, eligibility, visibility, product-type, licensed-property, and redaction evidence as reporting-safe references.
2. Analytics attaches visibility evidence to source inputs, read models, report definitions, and exports where required.
3. Vendor and manufacturer opportunity reports must use source-owned relationship eligibility and visibility evidence.
4. Analytics must not infer buyer/vendor/manufacturer visibility, product compatibility, product visibility, relationship eligibility, product-type scope, licensed-property scope, or tenant readiness.
5. If required visibility evidence is missing, stale, expired, conflicting, or insufficient, report generation/export should deny by default, block, delay, or route to review according to future policy.

## Dashboard Refresh Workflow

1. Actor requests dashboard view or scheduled refresh job runs.
2. Analytics validates tenant/reporting scope and access projection.
3. Analytics validates required visibility evidence, redaction decision version, data freshness marker, and dashboard cache/freshness window.
4. Analytics reads approved read models and metric results.
5. Analytics applies redaction and audience-specific projection.
6. Analytics returns dashboard view and freshness markers.
7. Refresh failure, stale read models, or missing visibility evidence emits a dashboard refresh failure or data freshness warning where appropriate.

## Report Generation Workflow

1. Actor selects report definition and filters.
2. Analytics validates report availability for the audience and scope.
3. Analytics validates access projection, source visibility references, relationship eligibility evidence, product-type scope, licensed-property scope, redaction class, redaction decision version, and filter constraints.
4. Analytics reads reporting read models and metric definitions by version.
5. Analytics checks read-model freshness, partial refresh state, failed refresh state, source-input conflicts, and report schema version.
6. Analytics generates report result with data freshness and source references where applicable.
7. Analytics emits `analytics.report.generated` and an audit reference where required.

## Saved Report Workflow

1. Actor saves a report definition and filter set.
2. Analytics stores saved report metadata with owner, tenant/reporting scope, access projection reference, redaction class, and recheck requirements.
3. Future runs revalidate access, visibility evidence, relationship eligibility, redaction decisions, source freshness, and source visibility. Saved reports do not freeze permissions.

## Scheduled Report Placeholder Workflow

1. Authorized actor configures scheduled report placeholder.
2. Analytics stores schedule metadata and recipient intent placeholder.
3. At scheduled time, Analytics validates current access projection, visibility evidence, redaction decisions, source freshness, and scheduled report fanout/throttle controls.
4. Analytics generates the report or report readiness signal.
5. Analytics emits `analytics.scheduled-report.ready` if successful or `analytics.scheduled-report.throttled` if fanout/backpressure controls defer generation.
6. Notification Platform Service owns recipient resolution, preferences, delivery, retry, and delivery history.

## Report Export Workflow

1. Actor requests export for an export-eligible report.
2. Analytics validates tenant/reporting scope, role permission, access projection, role/permission projection, redaction class, source visibility, relationship eligibility, product-type scope, licensed-property scope, report definition version, and recheck-before-export flag.
3. Analytics creates export job record and generated report output.
4. Analytics applies export schema version, export redaction class, export access decision reference, and sensitive export review state where required.
5. Analytics creates export file reference for CSV or future format.
6. Analytics records generated by / generated at, download audit reference placeholder, export expiration, export revocation placeholder, repeated download controls, export retention class, and export supersession reference where applicable.
7. Analytics emits `analytics.report.export.created` and audit references.
8. Logs & Audit may track export file evidence.

Exports must not bypass redaction, tenant scope, role permission, source-module visibility rules, or visibility evidence requirements. Sensitive report exports may require review.

## Export Expiration / Revocation Workflow

1. Export reaches expiration, is revoked, or is superseded by a regenerated report/export.
2. Analytics records expiration, revocation, or supersession reference.
3. Analytics emits `analytics.report.export.expired`, `analytics.report.export.revoked`, or `analytics.report.export.superseded` where appropriate.
4. Download attempts after expiration or revocation should block or route to review according to future policy.

## Metric Definition Update Workflow

1. Authorized internal actor proposes metric definition update.
2. Analytics records metric definition version, reason, effective dates, source inputs, and calculation placeholder.
3. Analytics activates the version after approval where required.
4. Analytics emits `analytics.metric.definition.updated`.
5. Historical report meaning should remain tied to the metric definition version used at generation time.

## Data Freshness Warning Workflow

1. Analytics detects stale, delayed, failed, partial, conflicting, or missing source inputs/read model refresh.
2. Analytics records data freshness marker and warning.
3. Analytics emits `analytics.data-freshness.warning` or `analytics.read-model.stale.warning`.
4. Notification Platform Service may deliver notifications.
5. AI Agent Services may consume authorized freshness signals.

## Sensitive Report Access Workflow

1. Actor requests sensitive report or export.
2. Analytics validates role, tenant scope, access projection, visibility evidence, redaction class, redaction decision version, and source visibility.
3. If allowed, Analytics records sensitive access event/reference.
4. Analytics emits `analytics.report.accessed.sensitive` where required.
5. Logs & Audit owns audit evidence.

## AI Agent Services Workflow

1. AI Agent Services requests authorized analytics output or consumes approved Analytics events.
2. Analytics enforces tenant scope, redaction, access projection, and visibility evidence.
3. AI Agent Services owns recommendations, insights, confidence, and action outcomes.
4. AI must not use Analytics to bypass source-module permissions, tenant scope, cross-party visibility evidence, redaction decisions, or source-module ownership.

## Integration Health Reporting Workflow

1. Integration Management emits approved health/failure signals.
2. Analytics consumes signals as reporting inputs.
3. Analytics creates health trends, failure rates, and operational risk views.
4. Integration Management remains owner of connection state and integration evidence.

## Scale Control Workflow Notes

Proposal-level workflow controls:

- Tenant/report partition keys for refresh, query, and export jobs.
- Refresh queue strategy for incremental refresh, full rebuild, backfill, and replay jobs.
- Scheduled report fanout limits and throttling.
- Result pagination and streaming export placeholder.
- High-cardinality metric limits.
- Export row/size caps.
- Dashboard cache/freshness windows.
- Retry budgets and backpressure.
- Dashboard/query rate limits.
- Aggregation window limits.
- Saved report limits.
- Stale-read warning controls.

## Scheduled System Admin Activity Summary Aggregation Workflows (Cross-Module PR)

This section adds three architecture-level workflows owned by Analytics / Reporting for the scheduled summary email cross-module hardening pass. Six additional workflows are owned by Notification Platform Service (see notification-platform-service/workflows.md PR-C section), and one additional workflow is owned by Logs & Audit File Tracking (see logs-audit-file-tracking/workflows.md PR-C section), for a total of ten workflows across the three modules. Existing Analytics / Reporting workflows (Read Model Refresh, Saved Report, Scheduled Report Placeholder, Report Export, Export Expiration / Revocation, and others) are not modified by this PR.

### Cross-module workflow choreography reaffirmed

Notification initiates schedule. Analytics aggregates. Logs & Audit records evidence.

Analytics / Reporting receives an evaluation request from NPS Workflow 2 (Scheduled Window Evaluation Trigger), runs Analytics Workflows 4 through 6 as appropriate, and signals NPS Workflow 7 (when aggregation is non-empty) or terminates the cycle (when aggregation is empty and no-activity suppression applies).

### Analytics Workflow 4 - Reporting Window Evaluation

- **Trigger:** NPS Workflow 2 requests a window evaluation, passing the Activity Summary Configuration reference, the configuration's current `last_successful_summary_cursor_reference` (window start), and the current scheduled time (window end).
- **Steps:**
  1. Create Activity Summary Reporting Window in `pending` state. Set `activity_summary_configuration_reference`, `window_start_timestamp`, `window_end_timestamp`.
  2. Identify carry-forward windows: query for all prior windows for this configuration in `delivery_failed` terminal state. Their references are added to the new window's `carry_forward_window_reference_collection`. The collection preserves the original window intervals; subsumed windows are not edited at this stage.
  3. Audit the window creation. Hand off to Analytics Workflow 5 (Source Fact Aggregation). Transition the window state from `pending` to `evaluating`.
- **Discipline:**
  - Carry-forward applies only to windows in `delivery_failed` terminal state. Windows in `dispatched`-in-flight state at Notification Platform Service level are NOT subsumed (the in-flight attempt may still succeed; subsuming it prematurely would double-count if it later succeeds).
  - Windows in `pending` or `evaluating` state are not subsumed (they have not yet completed their own evaluation pass).
  - Windows in `aggregated` state but no delivery attempt yet (a transient race condition) are not subsumed; the next signal from NPS Workflow 7 produces the delivery attempt for the `aggregated`-state window.
  - The window does not modify the configuration's cursor at any step; cursor advancement is NPS Workflow 9 territory for both delivered windows (Trigger A) and consumed no-activity outcomes (Trigger B). Analytics produces outcomes; Notification Platform Service performs cursor mutations.
  - Carry-forward windows are preserved for audit; they do not transition to `superseded` here. Supersession transitions occur only at NPS Workflow 9 (successful delivery of the subsuming window).

### Analytics Workflow 5 - Source Fact Aggregation

- **Trigger:** Analytics Workflow 4 hands off a window in `evaluating` state.
- **Steps:**
  1. Determine the effective aggregation interval as the union of: (a) the window's primary interval (`window_start_timestamp` to `window_end_timestamp`) and (b) the intervals of all windows in the `carry_forward_window_reference_collection`.
  2. Query source-module event streams or read models for the effective aggregation interval. Source modules consumed (read-only):
     - **Order Routing (PR #91):** `order-routing.export-window.executed`, `order-routing.export-window.failed`, `order-routing.export-delivery-evidence.confirmed`, `order-routing.export-delivery-evidence.failed`, `order-routing.export-review.required`, `order-routing.export-review.resolved`. Source events feed the `orders` section metrics for routed-successfully and orders-requiring-review.
     - **Fulfillment / Returns (PR #92):** `fulfillment-returns.sla-evaluation.evaluated`, `fulfillment-returns.late-fulfillment-import-exception.created`, `fulfillment-returns.missing-fulfillment-import-exception.created`, `fulfillment-returns.partial-fulfillment-response-exception.created`, `fulfillment-returns.sla-breach.signaled`. Source events feed the `exceptions` section SLA-related metrics.
     - **Fulfillment / Returns (PR #94):** `fulfillment-returns.shipment-line.delivered`, `fulfillment-returns.delivery-date-evidence.rejected`, `fulfillment-returns.buyer-update-ready.held`, `fulfillment-returns.buyer-update-ready.failed`, `fulfillment-returns.delivery-date-correction.proposed`. Source events feed the `shipping` section orders-delivered metric, and the `exceptions` section held-buyer-updates, failed-buyer-updates, delivery-date-corrections-pending-review, and rejected-import-rows metrics.
     - **Fulfillment / Returns baseline:** return-submission, return-received, return-rejected, returns-requiring-review, fulfillment-import-failure, missing-tracking, and shipped-state-transition events where they exist in the baseline. Where baseline events are not Analytics-consumable, the corresponding metric is marked as Phase 1 conditional and may be absent from the aggregation record.
  3. For each metric per section, aggregate counts. Use event `occurredAt` for window-membership decisions, not receipt timestamps.
  4. For each metric, collect Summary Source Fact References (per-event references organized by metric).
  5. Deduplicate source fact references across carry-forward intervals: a source event whose `occurredAt` falls in a carry-forward window's interval is counted once; events that arrive late at Analytics but whose `occurredAt` is in the carry-forward interval are picked up here.
  6. **No-activity check:** if the total count across all sections is zero, hand off to Analytics Workflow 6 (No-Activity Suppression). Transition the window state from `evaluating` to `suppressed_no_activity` via Workflow 6.
  7. **Non-empty aggregation:** create an Activity Summary Aggregation Record. Set `activity_summary_reporting_window_reference`, `activity_summary_configuration_reference`, `section_collection`, `summary_source_fact_reference_collection`, `summary_dashboard_reference` (may be null in Phase 1 if dashboard PR not yet merged), `generated_at_timestamp`.
  8. Transition the window state from `evaluating` to `aggregated`. Set `aggregation_record_reference` on the window.
  9. Emit `analytics.activity-summary-window.evaluated` (carries a payload field indicating non-empty result) and `analytics.activity-summary-aggregation.created`.
  10. Trigger Logs & Audit Workflow 10 to record Activity Summary Generated Evidence.
  11. Signal NPS Workflow 7 to create a delivery attempt for the aggregation record.
- **Discipline:**
  - The aggregation record is immutable once created. Re-aggregation produces a new record.
  - Source-module records are never modified.
  - Source events are consumed by reference only; source-module record content is never embedded.
  - Late-arriving source facts (events whose `occurredAt` falls in this window's interval but whose receipt at Analytics arrives after this window is aggregated) do not edit this record; they are picked up by the next window's aggregation if their `occurredAt` falls within that next window's effective interval (which extends back to this window's start if this window's delivery later fails).
  - First-failure-halts is not used here (unlike PR #94 Workflow 2 validation); aggregation processes all source events regardless of any one event's content quirks.
  - The "Phase 1 conditional" metrics may be absent if their source events do not exist. The aggregation record's section structure preserves notes for intentional deferrals (the recipient sees, for example, the `orders` section with the deferred-metric marker rather than a missing metric line).
  - PR #92 SLA-semantics preservation invariant continues to hold; Analytics consumes SLA evaluation events by reference and does not modify SLA evaluation outcomes.
  - PR #94 delivery-date and buyer-update semantics continue to hold; Analytics consumes those events by reference and does not modify PR #94 entity state.
  - The aggregation record does not include detailed source rows; metric values are counts.
  - The aggregation does not introduce per-buyer or per-vendor breakouts in Phase 1; metrics are single aggregate counts.

### Analytics Workflow 6 - No-Activity Suppression

- **Trigger:** Analytics Workflow 5 step 6 detects zero source-fact activity in the effective aggregation interval (the union of primary and carry-forward intervals).
- **Steps:**
  1. Transition the Activity Summary Reporting Window from `evaluating` to `suppressed_no_activity` terminal state.
  2. Audit. Trigger Logs & Audit Workflow 10 to record No-Activity Summary Suppression Evidence with `suppression_reason = no_source_facts_in_window`. The Suppression Evidence record references the Reporting Window and the configuration and captures the zero-activity assertion. **The Suppression Evidence record does NOT carry a cursor-advancement timestamp; the cursor mutation has not yet occurred at evidence-creation time.** Cursor-advancement audit traceability lives on a separate NPS-side Audit Record that NPS creates later, after NPS Workflow 9 Trigger B path performs the cursor mutation; that NPS-side Audit Record carries the actual `cursor_advancement_timestamp` value.
  3. Emit `analytics.activity-summary-window.evaluated` (carries a payload field indicating `suppressed_no_activity` result). This event is the suppression-outcome signal that Notification Platform Service consumes.
  4. **Analytics does NOT mutate the Activity Summary Configuration's `last_successful_summary_cursor_reference`. Cursor advancement is owned by Notification Platform Service and is performed by NPS Workflow 9 (Trigger B path) when Notification Platform Service consumes the no-activity outcome.** Analytics holds the canonical Reporting Window state and the canonical suppression result; Notification Platform Service holds the canonical configuration cursor and advances it.
  5. Do NOT signal NPS Workflow 7 (no delivery attempt should be created). The no-activity outcome flows to NPS Workflow 9's Trigger B path instead.
- **Discipline:**
  - **Cursor advancement on no-activity is intentional and is owned by Notification Platform Service.** The rationale for advancing on no-activity (rather than re-evaluating the same empty interval indefinitely) is preserved; the boundary correction is that Analytics produces the outcome and Notification Platform Service performs the cursor mutation. The Suppression Evidence record preserves the audit trail for the advancement.
  - **Analytics never writes to the Activity Summary Configuration entity. The configuration is owned by Notification Platform Service in every respect.**
  - No delivery attempt is created. This is the no-empty-email discipline.
  - The Suppression Evidence distinguishes "window was evaluated and produced zero activity" from "window was never evaluated"; the cursor advancement record (mirrored from the NPS-side cursor mutation) is part of the evidence.
  - Carry-forward windows that were subsumed by this no-activity window are NOT transitioned to `superseded`. The carry-forward subsumption finalization is reserved for NPS Workflow 9 Trigger A path (successful delivery only); the Trigger B path (no-activity outcome) preserves carry-forward windows in `delivery_failed` state for future evaluation in case they later get content. (Edge case: if a carry-forward window subsequently receives a late-arriving source fact, the next window's aggregation will pick it up via the carry-forward interval extension. If no late facts arrive, the carry-forward windows remain in `delivery_failed` state; operators may surface them via future operator-surface PR.)

---

### Phase 1 deliberate non-behaviors (Analytics / Reporting workflows)

- No per-tenant summary aggregation workflow.
- No per-buyer or per-vendor metric breakout workflow.
- No detailed-source-row aggregation workflow (Phase 1 is totals-only).
- No dashboard read-model refresh workflow specific to summary aggregation (the existing Analytics read-model refresh patterns are not modified; PR-C aggregation operates independently).
- No real-time aggregation; PR-C aggregation runs on the scheduled trigger from Notification Platform Service.
- No source-module event modification.
- No aggregation record mutation workflow; immutability is preserved.
- No carry-forward override workflow; carry-forward identification is deterministic per Workflow 4.
- No manual aggregation trigger workflow; future operator-surface PR may introduce one.
- No SLA event modification (PR #92 preserved).
- No PR #94 entity state modification (consumed by reference only).
- No PR #91 entity state modification (consumed by reference only).
- No PR #93 handoff record modification (PR #93 not consumed by PR-C).
