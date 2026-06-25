# Analytics / Reporting Specification

This document is proposal-level architecture. It defines initial Analytics / Reporting scope without finalizing launch reports, metric formulas, dashboard UX, refresh frequency, storage implementation, export formats, anomaly detection, retention, or implementation behavior.

## Purpose

Provide a bounded context for role/tenant-scoped reporting, dashboards, metrics, read models, exports, data freshness, trend analysis, and reporting-safe projections across CIXCI platform activity while preserving source-module ownership of operational records.

## Scope

Analytics / Reporting owns:

- Reporting read models.
- Read model versions.
- Refresh job status.
- Dashboards.
- Report definitions.
- Saved reports.
- Scheduled report placeholders.
- Report exports.
- Export lifecycle records.
- Metric definitions.
- Metric versioning.
- Aggregation logic.
- Trend analysis.
- Reporting filters.
- Reporting permissions projection references.
- Reporting refresh status.
- Data freshness markers.
- Stale markers.
- Reporting-safe data projections.
- Role/tenant-scoped reporting views.
- Reporting events.

## Out Of Scope

Analytics / Reporting does not own:

- Product Catalog source records.
- Device Catalog source records.
- Pricing calculations, pricing exceptions, or pricing snapshots.
- Order Routing decisions or routing snapshots.
- Fulfillment/Returns operational state.
- Invoice Management records or invoice lifecycle.
- Warranty claim lifecycle.
- Tenant Company eligibility, hierarchy, user permissions, or access grants.
- AI Agent Services recommendations, insights, confidence, or action outcomes.
- Logs & Audit evidence records.
- Notification Platform Service delivery history.
- Media asset source records, renditions, or access references.
- Integration Management connection state or integration evidence.
- Procurement, Launch/Event Management, Payment, Accounting, Vendor Operational Interface, or source operational ownership.
- Cross-party visibility, relationship eligibility, product-type eligibility, licensed-property scope, or source-module visibility decisions.

## Access Rules

Proposal-level access rules:

- All reports must be role-based and tenant-scoped.
- Tenant Company remains authority for hierarchy, users, roles, permissions, activation state, buyer/vendor/manufacturer scope, product-type eligibility, licensed-property scope, and relationship eligibility.
- Analytics must not grant access independently.
- Analytics must consume access boundaries, relationship eligibility, source-module visibility rules, source visibility snapshots, and redaction rules.
- Cross-tenant reporting is denied by default except approved CIXCI system admin views.
- Approved system-admin platform-wide views must be separated from tenant-facing views.
- Buyer reports may only expose buyer-authorized data.
- Vendor reports may only expose vendor-authorized data.
- Manufacturer reports may only expose manufacturer-authorized data.
- Customer-sensitive data should be redacted or excluded unless explicitly allowed.
- Cross-party reporting should deny by default when required visibility evidence is missing, stale, expired, conflicting, or insufficient.

## Reporting Audiences

Analytics may support reports for:

- CIXCI System Admins.
- Buyer Parent Companies.
- Buyer Child Entities.
- Accessory Vendor Parent Companies.
- Accessory Vendor Brand/Child Entities.
- Device Manufacturer Parent Companies.
- Device Manufacturer Child Entities.

## Buyer Report Families

Proposal-level buyer reports may include:

- Products exported/downloaded.
- Active assortment.
- New accessories available.
- Vendor coverage.
- Product activation/download history.
- Orders placed.
- Delivered orders.
- Return/refund trends.
- Fulfillment performance.
- Warranty claim or registration activity.
- Invoice summaries.
- Accessory/vendor performance.
- Device coverage gaps.
- Device-to-accessory coverage.
- Attach-rate opportunities.
- AI recommendations accepted/rejected.
- Branded merchandise performance where enabled.

## Vendor Report Families

Proposal-level accessory vendor reports may include:

- Which buyers exported their products.
- Buyer activation/download trends.
- Product performance by buyer.
- Delivered orders.
- Return rates.
- Warranty registration issues.
- Image/content quality issues.
- Catalog validation issues.
- Invoice/reconciliation activity.
- Regional performance.
- Buyer eligibility/adoption signals.
- Product coverage by Device Reference.
- New buyer opportunity signals.

Vendor reports that expose buyer adoption, opportunity, or performance signals require source-owned relationship eligibility and visibility evidence.

## Device Manufacturer Report Families

Proposal-level device manufacturer reports may include:

- Device imports.
- Device exports/downloads.
- Buyer device portfolio adds.
- Device launch readiness.
- Device visibility by buyer/region.
- Device-to-accessory coverage gaps.
- Accessory support coverage by device.
- Buyer adoption by device.
- Manufacturer media/data quality.
- Bulk purchase interest signals placeholder.
- Launch performance signals.

Manufacturer reports that expose buyer/vendor opportunity, adoption, or coverage signals require source-owned eligibility, visibility, product-type scope, and licensed-property scope evidence where applicable.

## System Admin Report Families

Proposal-level CIXCI system admin reports may include:

- Catalog growth.
- Device coverage.
- Buyer/vendor/manufacturer performance.
- Order/routing health.
- Fulfillment and return health.
- Invoice/reconciliation health.
- Warranty registration/claim signals.
- Import/export failures.
- Integration health.
- Notification delivery health.
- Media processing health.
- AI agent performance.
- Commission/revenue summaries.
- Operational exceptions.
- Tenant onboarding/readiness status.

## Source Inputs

Proposal-level source inputs:

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

Source modules remain responsible for operational meaning, source-of-truth state, access/visibility decisions, eligibility decisions, and domain-specific visibility rules. Analytics may project and aggregate approved inputs but must not mutate source records or reinterpret them as operational state.

## Read-Model Lifecycle

Proposal-level read-model lifecycle concepts:

- Incremental refresh.
- Full rebuild.
- Backfill.
- Source-event replay.
- Replay window.
- Partial refresh.
- Refresh checkpoint.
- Source-event ordering.
- Failed refresh state.
- Stale marker.
- Supersession reference.
- Source-input conflict handling.
- Data freshness warning.
- Refresh job status.
- Read-model version.

Analytics read models may lag source modules. Analytics must expose freshness/status where appropriate. Rebuilds, backfills, and replays must not mutate operational source records. Failed or partial refreshes must not be presented as fully trustworthy analytics.

## Cross-Party Visibility Evidence

Proposal-level visibility evidence may include:

- Relationship eligibility snapshot reference.
- Source visibility snapshot reference.
- Product-type scope reference.
- Licensed-property scope reference.
- Access projection version.
- Redaction decision version.
- Tenant scope reference.
- Role / permission projection reference.
- Source module visibility reference.
- Recheck-before-export flag.

Analytics must not infer buyer/vendor/manufacturer visibility. Analytics consumes visibility/access evidence from Tenant Company and source modules.

## Metric Governance

Proposal-level rules:

- Metric definitions must be versioned.
- Report definitions must be versioned.
- Source input versions should be traceable.
- Metric calculation changes should not silently rewrite historical meaning.
- Reporting results should include data freshness and source reference where applicable.
- Analytics owns metric definitions and aggregations, not operational source records.

## Report Export

Reports may be exportable as CSV or future formats. Export access must respect tenant scope, role permissions, source-module visibility, visibility evidence, and redaction rules. Exported reports should have audit references, and report export files may be tracked by Logs & Audit.

Proposal-level export lifecycle concepts:

- Export job record.
- Export file reference.
- Export schema version.
- Export generated by / generated at.
- Download audit reference.
- Export expiration.
- Export revocation.
- Repeated download controls.
- Export retention class.
- Sensitive export review state.
- Export supersession reference.
- Export redaction class.
- Export access decision reference.

Sensitive report exports may require review. Report exports must not bypass redaction or tenant-scope rules.

## Relationship Notes

- AI Agent Services may consume authorized Analytics outputs and Analytics may consume AI outcome signals, but AI recommendations and action outcomes remain AI-owned. AI agents may consume Analytics outputs only when authorization and visibility evidence permit.
- Notification Platform Service owns delivery for scheduled report ready, scheduled report throttled, anomaly detected placeholder, dashboard refresh failed, data freshness warning, read-model stale warning, visibility evidence warnings, and report export failed notifications.
- Logs & Audit owns audit evidence for report generation, exports, downloads, scheduled reports, dashboard refresh failures, sensitive report access, redaction decisions, and rebuild/replay activity.
- Integration Management owns connection state and integration evidence; Analytics owns reporting views and trends based on integration signals.

## Proposal-Level Constraints

- Preserve ADR-0016 boundaries.
- Keep unresolved report, metric, refresh, export, retention, anomaly, access implementation, storage implementation, and metric business rule decisions proposal-level.
- Do not move source-module operational ownership into Analytics.
- Do not create Procurement, Launch/Event Management, Payment, Accounting, or Vendor Operational Interface modules.

## Scheduled System Admin Activity Summary Aggregation Surface (Cross-Module PR)

This section anchors the Analytics / Reporting narrative for the cross-module Scheduled System Admin Activity Summary Email hardening pass. The PR is the first true multi-module PR, touching Notification Platform Service, Analytics / Reporting, and Logs & Audit File Tracking together.

### Purpose of the PR-C surface

Analytics / Reporting in its existing scope owns reporting read models, metric / report definitions, aggregations, dashboards, exports, freshness markers, access / visibility evidence references, and reporting-safe projections. PR-C adds a distinct architectural surface for **scheduled summary aggregation**:

- A reporting window with explicit start and end timestamps (derived from the Notification Platform Service Activity Summary Configuration's cursor and the current scheduled evaluation time).
- A read-model aggregation record organized by Section (orders, shipping, returns, exceptions) and Metric (typed counts per section).
- Source fact references collected per metric, providing audit traceability without embedding source-module content.
- A summary dashboard reference field (reference-only; future Analytics PR populates).
- Carry-forward semantics for missed windows after a failed delivery (consecutive failures all carry forward).

The scheduled-summary-aggregation surface is distinct from the existing reporting read model, report execution, scheduled report placeholder, and export surfaces. The two co-exist without modification of existing entities, workflows, or events.

### Immutability invariant (PR-C canonical for Analytics)

The Activity Summary Aggregation Record is **immutable once created**. Re-aggregation of the same window interval produces a new aggregation record; the prior record is preserved. Late-arriving source facts do not edit the prior record; they are picked up by the next window's aggregation if the next window's effective interval extends back via carry-forward.

### Carry-forward discipline (PR-C canonical for Analytics)

The carry-forward mechanism is the Analytics-side complement to the Notification Platform Service anti-loss invariant. When a prior reporting window enters `delivery_failed` state (because its delivery attempt failed), the next window's evaluation pass (Analytics Workflow 4) identifies that window and subsumes its interval. The next window's effective aggregation interval is the union of its primary interval and all subsumed intervals. Source fact references are deduplicated.

Subsumed windows transition to `superseded` only when the subsuming window's delivery reaches `acknowledged` terminal state. Until then, they remain in `delivery_failed` and a further subsuming window will pick them up again. The contract guarantees that no source fact is lost across any sequence of consecutive failures.

### No-empty-email cursor advancement (PR-C canonical for Analytics)

When a window evaluates to zero source-fact activity (including across all carry-forward intervals), Analytics Workflow 6 transitions the Activity Summary Reporting Window to `suppressed_no_activity` terminal state, triggers Logs & Audit Workflow 10 to record No-Activity Summary Suppression Evidence, and emits `analytics.activity-summary-window.evaluated` with `resultDiscriminator = suppressed_no_activity` as the suppression-outcome signal. **Analytics does NOT mutate the Notification Platform Service Activity Summary Configuration cursor; cursor advancement is owned by Notification Platform Service.** Notification Platform Service consumes the suppression-outcome signal and advances its own `last_successful_summary_cursor_reference` to the suppressed window's `window_end_timestamp` via NPS Workflow 9's no-activity-outcome trigger path. The rationale for advancing on no-activity (not re-evaluating the same empty interval indefinitely) is documented at every architectural surface; the boundary discipline is that Analytics produces the outcome and Notification Platform Service performs the cursor mutation.

### Source-module read-only discipline (PR-C canonical for Analytics)

Source modules (Order Routing PR #91, Fulfillment / Returns PR #92, Fulfillment / Returns PR #94, Fulfillment / Returns baseline) are consumed by reference only:

- PR #91's 12 events are read-only inputs to the `orders` and `shipping` section metrics.
- PR #92's 17 events are read-only inputs to the `exceptions` section metrics. The PR #92 SLA-semantics preservation invariant continues to hold unconditionally.
- PR #94's 13 events are read-only inputs to the `shipping` and `exceptions` section metrics. The PR #94 delivery-date and buyer-update semantics preservation invariant continues to hold unconditionally.
- PR #93 (Cross-Module Handoff) is not consumed by this PR.

No source-module entity, event, or contract is modified by PR-C.

### What PR-C does not change on the Analytics / Reporting side

- Existing Reporting Read Model entity, Metric Definition, Report Definition, Dashboard Definition, Report Refresh Job, Data Freshness Marker, Report Export Job, and so on.
- Existing report execution, refresh, rebuild, replay, export, scheduled report placeholder, and dashboard refresh patterns.
- Existing access projection, role / permission projection, source visibility evidence, redaction class, and redaction decision version patterns.
- The AI-Agent-Catalog-Analytics-Hooks sub-contract; this PR does not touch the `ai-agent-catalog-analytics-hooks.md` file.

The PR-C Activity Summary Reporting Window and Activity Summary Aggregation Record entities exist alongside the existing entities. If implementation later consolidates patterns, that is an implementation choice not constrained by this PR's architecture.

### Phase 1 scope reminders

- CIXCI System Admin platform-wide aggregation; per-tenant aggregation is future phase.
- Single aggregate counts per metric; per-buyer or per-vendor breakouts are future operator-surface work.
- Totals only in the aggregation record; detailed source rows are future phase.
- Dashboard reference is optional and reference-only; dashboard implementation is deferred.
- Phase 1 conditional metrics (such as `total_new_orders`, `return_refunded_count`) may be absent if source events do not exist; documented intentional deferrals.
- Scheduled trigger only; no real-time aggregation.

### Files touched by PR-C on the Analytics / Reporting side

PR-C touches the following Analytics / Reporting files: `README.md`, `spec.md`, `data-model.md`, `workflows.md`, `boundary-contracts.md`, `permissions.md`, `api-contracts.md`, `events.md`, `event-contracts.md`, `test-scenarios.md`, `edge-cases.md`, `assumptions-open-questions.md`. PR-C does NOT touch `openapi-contracts.md` or `ai-agent-catalog-analytics-hooks.md`.
