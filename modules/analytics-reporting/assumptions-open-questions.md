# Analytics / Reporting Assumptions And Open Questions

This document is proposal-level architecture. It lists assumptions and decisions still needed before implementation.

## Assumptions

- Analytics / Reporting is a distinct bounded context per ADR-0016.
- Analytics consumes approved source events, snapshots, references, and reporting-safe projections.
- Source modules remain authoritative for operational records and workflow state.
- Tenant Company remains authority for hierarchy, users, roles, permissions, activation, buyer/vendor/manufacturer scope, product-type eligibility, licensed-property scope, and relationship eligibility.
- Analytics must not grant access independently.
- Cross-tenant reporting is denied by default except approved CIXCI system admin views.
- Report exports require tenant scope, role permission, source visibility, and redaction enforcement.
- Metric definitions and report definitions must be versioned.
- Reports should expose data freshness markers and source references where applicable.
- Customer-sensitive data is excluded or redacted by default.
- Read models may lag source modules and should expose freshness/status where appropriate.
- Cross-party reporting should deny by default when required visibility evidence is missing, stale, expired, conflicting, or insufficient.

## Scale Assumptions Placeholder

Future hardening should define proposal-level assumptions for:

- Number of tenants.
- Buyer parent companies and child entities.
- Accessory vendors and vendor child/brand entities.
- Device manufacturers and child entities.
- Reports per tenant.
- Saved reports per user/company/entity.
- Scheduled reports per tenant.
- Dashboard refresh frequency.
- Report export volume.
- Reporting read model size.
- Source events consumed per day.
- Metric result cardinality.
- Maximum report result size.
- Export file size and retention.
- Data freshness targets by report family.
- Maximum acceptable report lookup latency.

## Proposal-Level Scale Controls

Initial scale controls to refine before implementation:

- Tenant/report partition keys for refresh, query, dashboard, and export workloads.
- Refresh queue strategy for incremental refresh, full rebuild, backfill, and replay jobs.
- Scheduled report fanout limits.
- Result pagination for interactive report views.
- Streaming export placeholder for approved large exports.
- High-cardinality metric limits.
- Export row/size caps.
- Dashboard cache/freshness windows.
- Retry budgets for refresh, rebuild, replay, and export jobs.
- Backpressure for dashboard, query, refresh, export, and scheduled report workloads.
- Dashboard/query rate limits.
- Aggregation window limits.
- Saved report limits per user/company/entity/tenant placeholder.
- Stale-read warning controls.
- Rebuild/backfill/replay concurrency controls.
- Export retention and cleanup placeholders.
- Visibility evidence recheck cost controls.

## Open Questions

- Which reports are supported at launch?
- Which reports are system-admin-only?
- Which reports are buyer-facing, vendor-facing, and manufacturer-facing?
- Which reports can be exported?
- Which reports can be scheduled?
- What refresh frequency is required by report type?
- Which metrics are real-time versus batch?
- What data retention applies to reporting read models?
- What source data can vendors see about buyers?
- What source data can buyers see about vendors?
- What source data can manufacturers see about buyers and accessory coverage?
- What customer-level data is excluded or redacted?
- How are metric definition changes versioned and communicated?
- How are report exports tracked by Logs & Audit?
- Which Analytics events should trigger notifications?
- Which Analytics outputs may AI agents consume?
- Which report fields require pricing-sensitive, invoice-sensitive, warranty-sensitive, tenant-sensitive, media-rights-sensitive, licensing-sensitive, or commercial-sensitive redaction?
- Which source modules must provide reporting-safe projections versus events only?
- How should source input conflicts or delayed events be represented in freshness markers?
- How should saved reports behave when source-module visibility rules change?
- Which reports require sensitive access audit events?
- What anomaly detection, if any, belongs in Analytics versus AI Agent Services?
- Which read models require incremental refresh versus full rebuild?
- What replay windows are allowed by report family?
- How should partial refreshes be displayed to users?
- What source-event ordering guarantees are required from source modules?
- Which cross-party reports require relationship eligibility snapshots, product-type scope, licensed-property scope, and source visibility snapshots?
- Which sensitive exports require review before generation or download?
- What export expiration, revocation, repeated download, and supersession behavior is required?

## Decisions Needed Before Implementation

- Launch report catalog and audience matrix.
- Metric definition governance and approval workflow.
- Reporting read model refresh strategy.
- Read-model rebuild, backfill, and source-event replay strategy.
- Refresh checkpoint and source-event ordering model.
- Source-input conflict handling behavior.
- Report export formats and limits.
- Export lifecycle behavior for expiration, revocation, supersession, retention, and repeated downloads.
- Redaction class taxonomy for reporting fields.
- Visibility evidence requirements for cross-party reports.
- Access projection expiration/recheck behavior.
- Scheduled report ownership, fanout limits, and notification handoff details.
- Logs & Audit evidence expectations for report generation, export, download, revocation, sensitive access, and rebuild/replay activity.
- Analytics event payload standards.
- Reporting retention and archival policies.
- Scale controls for refresh queues, high-cardinality metrics, dashboard load, scheduled reports, and export volume.

## Non-Goals For First Draft

- Do not define final data warehouse/storage implementation.
- Do not finalize metric formulas.
- Do not finalize dashboard UX.
- Do not define procurement, launch/event management, payment, or vendor operational interface modules.
- Do not move source-module operational ownership into Analytics.
- Do not finalize refresh frequency, retry limits, cache behavior, or export size limits.

## Scheduled System Admin Activity Summary Aggregation Assumptions and Open Questions (Cross-Module PR)

This section captures Analytics / Reporting-side assumptions, open questions, and risks for the cross-module summary email hardening pass. Notification Platform Service and Logs & Audit File Tracking carry their own sections.

### Assumptions (confirmed in scoping)

- Activity Summary Aggregation Record is immutable once created.
- Section / Metric structure is field-level on the aggregation record, not separate entities.
- Source modules are read-only inputs: Order Routing PR #91, Fulfillment / Returns PR #92, Fulfillment / Returns PR #94, Fulfillment / Returns baseline. PR #93 (Cross-Module Handoff) is not consumed by this PR.
- PR #92 SLA-semantics preservation invariant continues to hold.
- PR #94 delivery-date and buyer-update semantics preservation invariant continues to hold.
- Carry-forward applies only to windows in `delivery_failed` terminal state.
- Carry-forward subsumption finalization (transition to `superseded`) happens only at NPS Workflow 9 (successful delivery of the subsuming window).
- Cursor advancement is owned by Notification Platform Service. The cursor is advanced exclusively by NPS Workflow 9, which handles two triggers: Trigger A is the delivery-acknowledged transition on the Activity Summary Delivery Attempt; Trigger B is the consumed no-activity-suppression-outcome signal from Analytics Workflow 6. **Analytics never writes to the configuration cursor under any condition.** Analytics owns the Reporting Window state, the aggregation record, and the suppression outcome production; Notification Platform Service owns the configuration entity and the cursor.
- Summary Dashboard Reference is reference-only and optional; dashboard implementation is deferred to future PR.
- Phase 1 aggregation is CIXCI System Admin platform-wide; per-tenant aggregation is future phase.
- Phase 1 metrics produce single aggregate counts; per-buyer or per-vendor breakouts are future operator-surface work.
- Phase 1 conditional metrics (such as `total_new_orders` and `return_refunded_count`) may be absent if source events do not exist.

### Open questions (resolved per scoping; Analytics-side perspective)

The 18 numbered open questions and 8 lettered open questions are catalogued in the Notification Platform Service assumptions-open-questions.md PR-C section. The Analytics-side perspective on the most relevant ones:

- PR-C OQ 1 (cursor-based reporting window): resolved; Analytics Workflow 4 uses configuration cursor as window start.
- PR-C OQ 2 (failed delivery roll-forward): resolved; Analytics Workflow 4 identifies prior `delivery_failed` windows.
- PR-C OQ 3 (no-activity suppression cursor advancement): resolved with cursor-ownership boundary correction; Analytics Workflow 6 produces the suppression outcome (Reporting Window state, suppression-outcome event, Logs & Audit evidence trigger), and Notification Platform Service consumes the outcome and advances its own cursor via NPS Workflow 9's Trigger B path. Analytics does not write to the configuration cursor.
- PR-C OQ 8 (return refunded count): resolved with deferral; metric absent if source not available.
- PR-C OQ 13 (touch permissions.md and api-contracts.md): resolved; both files exist in Analytics / Reporting; both touched.
- PR-C OQ 15 ("Total new orders" source ambiguity): applier identifies source-event availability during application; if absent, the metric is conditionally absent from aggregation records.
- PR-C OQ F (late source fact arrival reconciliation): implementation deferred; architectural expectation documented (late events picked up via carry-forward if applicable; otherwise Phase 1 accepts loss).

### Risks (Analytics / Reporting side)

- **R-A1** - Aggregation engine implementation not part of PR-C. The architectural entity is introduced; query plans, materialized-view strategy, storage are deferred. Mitigation: future Analytics-aggregation-engine hardening.
- **R-A2** - Late source fact arrival loss in Phase 1 when carry-forward does not apply. Mitigation: documented architectural acceptance; future reconciliation policy.
- **R-A3** - Source event retention vs. carry-forward depth mismatch. Mitigation: future hardening must coordinate source-event retention with maximum carry-forward depth.
- **R-A4** - Out-of-order source events handled via `occurredAt`-based window membership. Mitigation: documented in workflows.md PR-C section.
- **R-A5** - Phase 1 conditional metrics may be misunderstood by recipients. Mitigation: deferred-metric placeholder in section structure; documented in data-model.md.
- **R-A6** - Concurrent windows for the same configuration race. Mitigation: documented; implementation may serialize.
- **R-A7** - Aggregation record immutability could be questioned for "fix a wrong count" scenarios. Mitigation: re-aggregation produces a new record; prior record preserved for audit; no in-place edits.
- **R-A8** - Source Fact References could expose buyer / vendor identifiers if shown to non-authorized recipients in future per-tenant work. Mitigation: Phase 1's CIXCI-internal-only scope is the control; future per-tenant work must apply `check_access` filtering.
- **R-A9** - Dashboard reference null indefinitely. Mitigation: optional field; fallback in email body documented.
- **R-A10** - Per-tenant summary expansion in future PR. Mitigation: PR-C entity design does not prevent future per-tenant fields.

### Future-phase considerations

- Analytics-aggregation-engine hardening: query plans, materialized-view strategy, storage, real-time aggregation, retention coordination with carry-forward depth.
- Dashboard implementation: dashboard read model, drilldown UI, URL generation, dashboard refresh patterns.
- Per-tenant summary aggregation: per-tenant Activity Summary Configurations, per-tenant Aggregation Records, per-tenant recipient resolution.
- Per-buyer or per-vendor metric breakouts: structured field additions to Section / Metric.
- Late source fact reconciliation policy: explicit Late Source Fact Reference disposition workflow.
- Detailed source rows in aggregation record: section structure extension for row-level content.
- Anomaly detection on aggregation patterns: integration with existing Analytics anomaly detection placeholder.

These future-phase considerations are documented to ensure PR-C does not foreclose them.
