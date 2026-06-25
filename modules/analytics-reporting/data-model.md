# Analytics / Reporting Data Model

This document is proposal-level architecture. It defines initial reporting entities without finalizing schema, storage, warehouse/lake design, metric formulas, refresh cadence, export implementation, anomaly detection, or retention behavior.

## Entities

### Reporting Core

- Reporting Read Model.
- Reporting-Safe Data Projection.
- Dashboard Definition.
- Dashboard Instance / View.
- Report Definition.
- Saved Report.
- Scheduled Report Placeholder.
- Exported Report.
- Report Filter.
- Report Schema Version.
- Report Refresh Job.
- Reporting Refresh Status.
- Data Freshness Marker.
- Aggregation Window.
- Trend Analysis Result.
- Read Model Version.
- Refresh Checkpoint.
- Source-Input Conflict Record.
- Stale Marker.
- Supersession Reference.

### Metrics

- Metric Definition.
- Metric Definition Version.
- Metric Calculation Rule Placeholder.
- Metric Result.
- Metric Snapshot.
- Metric Source Reference.
- Metric Governance Record.
- Historical Metric Interpretation Record.

### Access And Redaction

- Reporting Scope.
- Tenant / Reporting Scope Reference.
- Role / Tenant-Scoped Report View.
- Reporting Permissions Projection.
- Access Projection.
- Role / Permission Projection Reference.
- Source Visibility Rule Reference.
- Source Visibility Snapshot Reference.
- Relationship Eligibility Reference.
- Relationship Eligibility Snapshot Reference.
- Product-Type Scope Reference.
- Licensed-Property Scope Reference.
- Redaction Class.
- Redaction Decision Version.
- Sensitive Report Access Record.

### Source Inputs

- Source Event Reference.
- Source Snapshot Reference.
- Source Version Reference.
- Source Module Reference.
- Product Catalog Reporting Input.
- Device Catalog Reporting Input.
- Pricing Snapshot Reporting Input.
- Order Routing Snapshot Reporting Input.
- Fulfillment / Returns Evidence Reporting Input.
- Invoice Management Reporting Input.
- Warranty Signal Reporting Input.
- Logs & Audit Signal Reporting Input.
- Notification Delivery Signal Reporting Input.
- Media Signal Reporting Input.
- Integration Signal Reporting Input.
- Tenant Company Scope Projection.
- AI Agent Outcome Signal.

### Refresh And Rebuild

- Incremental Refresh Job.
- Full Rebuild Job.
- Backfill Job.
- Source-Event Replay Job.
- Replay Window.
- Partial Refresh Record.
- Refresh Checkpoint.
- Source-Event Ordering Record.
- Failed Refresh State.
- Stale Marker.
- Data Freshness Warning Record.
- Read Model Supersession Record.

### Export And Audit

- Report Export Job.
- Export Job Record.
- Report Export File Reference.
- Export Schema Version.
- Report Export Format.
- Report Export Audit Reference.
- Download Audit Reference.
- Export Expiration Record.
- Export Revocation Record.
- Repeated Download Control Placeholder.
- Export Retention Class.
- Sensitive Export Review State.
- Export Supersession Reference.
- Export Redaction Class.
- Export Access Decision Record.
- Logs & Audit Reference.

### Notifications And Signals

- Analytics Event Record.
- Notification Hook Reference.
- AI Analytics Signal Reference.
- Data Freshness Warning Record.
- Dashboard Refresh Failure Record.
- Anomaly Detected Placeholder.
- Visibility Evidence Missing / Stale Record.
- Scheduled Report Throttle Record.

## Reporting Read Model

Proposal-level fields:

- Reporting read model id.
- Read model type.
- Read model version.
- Source module references.
- Source version/reference list.
- Tenant scope reference.
- Tenant/reporting scope.
- Audience type: system admin, buyer parent, buyer child entity, vendor parent, vendor child/brand, manufacturer parent, manufacturer child entity.
- Relationship eligibility snapshot reference.
- Source visibility snapshot reference.
- Product-type scope reference.
- Licensed-property scope reference.
- Access projection reference.
- Access projection version.
- Role / permission projection reference.
- Source module visibility reference.
- Redaction class.
- Redaction decision version.
- Reporting-safe projection version.
- Report schema version.
- Data freshness marker.
- Stale marker.
- Refresh status.
- Refresh checkpoint reference.
- Source-event ordering reference.
- Source-input conflict reference.
- Aggregation window.
- Created at / refreshed at.
- Supersession reference.

Reporting read models are optimized projections for reporting. They are not operational source records and must not be used to mutate source modules.

Analytics read models may lag source modules. Freshness/status should be exposed where appropriate, and failed or partial refreshes must not be presented as fully trustworthy analytics.

## Metric Definition

Proposal-level fields:

- Metric definition id.
- Metric name.
- Metric family.
- Metric description.
- Metric definition version.
- Calculation rule placeholder.
- Source module references.
- Required source input versions.
- Aggregation window.
- Audience eligibility.
- Redaction class.
- Effective dates.
- Deprecated/superseded status.
- Change reason.
- Approved by / approved at placeholder.

Metric calculation changes should create a new version. Historical report meaning should not be silently rewritten.

## Dashboard Definition

Proposal-level fields:

- Dashboard definition id.
- Dashboard name.
- Audience type.
- Tenant/reporting scope rules.
- Widget/report references.
- Filter definitions.
- Required permissions projection.
- Redaction class.
- Data freshness expectations.
- Dashboard schema version.
- Dashboard cache/freshness window placeholder.
- Effective dates.
- Status: draft, active, deprecated, review-required.

## Report Definition

Proposal-level fields:

- Report definition id.
- Report name.
- Report family.
- Audience type.
- Required source inputs.
- Required relationship eligibility snapshot reference.
- Required source visibility snapshot reference.
- Required product-type scope reference.
- Required licensed-property scope reference.
- Required role / permission projection reference.
- Recheck-before-export flag.
- Metric definition references.
- Filter definitions.
- Sort/grouping placeholders.
- Output columns placeholder.
- Report schema version.
- Redaction class.
- Redaction decision version.
- Export eligibility.
- Schedule eligibility.
- Effective dates.
- Status.

Cross-party report definitions should identify required visibility evidence. Vendor and manufacturer opportunity reports must be backed by source-owned eligibility and visibility evidence rather than inferred inside Analytics.

## Saved Report

Proposal-level fields:

- Saved report id.
- Report definition reference.
- Owner user/company/entity reference.
- Tenant/reporting scope.
- Filter values.
- Redaction/access projection reference.
- Created by / created at.
- Last run at.
- Status.

Saved reports should revalidate access, visibility, eligibility, and redaction evidence at run/export time.

## Scheduled Report Placeholder

Proposal-level fields:

- Scheduled report id.
- Report definition reference.
- Saved report reference.
- Schedule placeholder.
- Recipient intent placeholder.
- Notification hook reference.
- Export format.
- Tenant/reporting scope.
- Next run at.
- Last run status.
- Fanout/throttle state placeholder.
- Review-required state.

Notification Platform Service owns delivery. Analytics owns report generation and scheduled report readiness signals only.

## Exported Report

Proposal-level fields:

- Export id.
- Export job record reference.
- Report definition reference.
- Report schema version.
- Export schema version.
- Metric definition version list.
- Tenant scope reference.
- Tenant/reporting scope.
- Relationship eligibility snapshot reference.
- Source visibility snapshot reference.
- Product-type scope reference.
- Licensed-property scope reference.
- Access projection version.
- Role / permission projection reference.
- Source module visibility reference.
- Recheck-before-export flag.
- Generated by / generated at.
- Source freshness marker.
- Export format: CSV or future format.
- Export file reference.
- Download audit reference.
- Logs & Audit reference.
- Export redaction class.
- Redaction decision version.
- Export access decision reference.
- Sensitive export review state.
- Repeated download controls placeholder.
- Row count placeholder.
- Export expiration.
- Export revocation.
- Export retention class.
- Export supersession reference.

Report exports must not bypass tenant scope, role permissions, source visibility, eligibility evidence, or redaction rules. Sensitive report exports may require review. Exported files should be auditable through Logs & Audit.

## Export Job Record

Proposal-level fields:

- Export job id.
- Report definition reference.
- Report schema version.
- Export schema version.
- Tenant/reporting scope.
- Requested by / requested at.
- Generated by / generated at.
- Status: requested, queued, running, completed, failed, expired, revoked, superseded, review-required.
- Export format.
- Row count / size placeholder.
- Export file reference.
- Export access decision reference.
- Export redaction class.
- Download audit reference.
- Logs & Audit reference.
- Expiration / revocation / supersession reference.

## Data Freshness Marker

Proposal-level fields:

- Data freshness marker id.
- Read model reference.
- Read model version.
- Source module reference.
- Latest source event/snapshot reference.
- Latest source event timestamp.
- Refresh completed at.
- Refresh checkpoint reference.
- Replay window reference.
- Partial refresh flag.
- Stale marker.
- Freshness status: fresh, stale, delayed, failed, partial, rebuilding, backfilling, unknown, review-required.
- Freshness threshold placeholder.
- Warning event reference.

## Refresh Job Status

Proposal-level fields:

- Refresh job id.
- Refresh job type: incremental refresh, full rebuild, backfill, source-event replay.
- Read model reference.
- Read model version.
- Tenant/report partition key.
- Replay window.
- Refresh checkpoint.
- Source-event ordering reference.
- Source-input conflict handling status.
- Status: requested, queued, running, partial, completed, failed, stale, superseded, review-required.
- Started at / completed at.
- Failed refresh state.
- Data freshness warning reference.
- Supersession reference.

Rebuilds, backfills, and replays must not mutate operational source records.

## Reporting Permissions Projection

Proposal-level fields:

- Permissions projection id.
- Tenant Company scope reference.
- User/role/company/entity reference.
- Audience type.
- Source visibility rule references.
- Source visibility snapshot reference.
- Relationship eligibility references.
- Relationship eligibility snapshot reference.
- Product-type eligibility reference.
- Product-type scope reference.
- Licensed-property scope reference.
- Role / permission projection reference.
- Redaction class.
- Redaction decision version.
- Projection version.
- Generated at.
- Expiration/recheck placeholder.

Tenant Company and source modules remain authoritative. Analytics consumes projections and must not grant access independently.

## Source Input Record

Proposal-level fields:

- Source input id.
- Source module.
- Source event/snapshot/reference id.
- Source version/hash placeholder.
- Tenant scope reference.
- Tenant/company/entity scope.
- Relationship eligibility snapshot reference.
- Source visibility snapshot reference.
- Product-type scope reference.
- Licensed-property scope reference.
- Access projection version.
- Role / permission projection reference.
- Source module visibility reference.
- Recheck-before-export flag.
- Related product/device/pricing/routing/fulfillment/invoice/warranty/media/integration/audit/AI references where applicable.
- Redaction class.
- Redaction decision version.
- Source visibility rule reference.
- Ingestion timestamp.
- Source-event ordering reference.
- Reporting-safe projection status.

Analytics must not infer buyer/vendor/manufacturer visibility. Cross-party reporting should deny by default when required visibility evidence is missing, stale, expired, or conflicting.

## Ownership

Analytics owns reporting definitions, metric definitions, aggregations, dashboards, read models, exports, freshness markers, access/visibility evidence references, and reporting-safe projections.

Tenant Company and source modules own access, visibility, eligibility, relationship, product-type, licensed-property, and operational decisions. Logs & Audit owns audit evidence. Analytics must not become the source of truth for operational records or cross-party visibility.

AI agents may consume Analytics outputs only when authorization and visibility evidence permit.

## Retention Notes

Placeholder: define retention for reporting read models, historical metric results, report exports, scheduled report results, dashboard refresh history, freshness warnings, sensitive report access records, source input references, visibility evidence references, and refresh/rebuild job history.

## Scheduled System Admin Activity Summary Aggregation Entities (Cross-Module PR)

This section introduces two new entities owned by Analytics / Reporting for the Scheduled System Admin Activity Summary Email cross-module hardening pass. Two additional entities are owned by Notification Platform Service (Activity Summary Configuration, Activity Summary Delivery Attempt), and two additional entities are owned by Logs & Audit File Tracking (Activity Summary Generated Evidence, No-Activity Summary Suppression Evidence). All concepts are additive. Existing Analytics / Reporting entities (Reporting Read Model, Metric Definition, Report Definition, Dashboard Definition, Refresh Job, Data Freshness Marker, and so on) are not redefined; this PR layers on top.

### Cross-module boundary discipline reaffirmed

- Analytics / Reporting owns the Activity Summary Reporting Window entity and the Activity Summary Aggregation Record entity introduced below.
- Notification Platform Service owns the Activity Summary Configuration and the Activity Summary Delivery Attempt entities (see notification-platform-service/data-model.md PR-C section).
- Logs & Audit File Tracking owns the summary-specific evidence retention entities (see logs-audit-file-tracking/data-model.md PR-C section).
- Source modules (Order Routing, Fulfillment / Returns) own the source facts that Analytics / Reporting aggregates by reference. Source records are read-only; never mutated.
- Tenant Company owns recipient scope authority (resolved by Notification Platform Service at delivery time).
- Integration Management owns transport-layer records where applicable (referenced by Notification Platform Service, not by Analytics / Reporting).

### Phase 1 scope guardrails

- The Activity Summary Aggregation Record is a CIXCI System Admin summary aggregation. It is not per-tenant; it is not buyer-facing; it is not vendor-facing.
- Aggregation operates at platform scope. Per-buyer or per-vendor breakouts inside metrics are deferred (Phase 1 produces single aggregate counts per metric).
- The aggregation record is immutable once created. Re-aggregation produces a new record. Late source facts arriving after a window is aggregated do not edit the prior record; they are picked up by the next window (see Out-of-Order edge cases).
- This PR does not introduce or modify any source-module event, entity, or contract. All source consumption is by reference.
- This PR does not implement the dashboard read model. The `summary_dashboard_reference` field is reference-only; the underlying dashboard is a future PR.

---

### Activity Summary Reporting Window

The time-bound aggregation interval for one summary evaluation pass. Carries: window boundaries derived from the configuration's last-successful-summary cursor and the scheduled evaluation time, evaluation lifecycle state, references to aggregation record (when produced), references to suppression evidence (when no activity), and missed-window carry-forward references.

**Ownership:** Analytics / Reporting.

**Identity:** referenced via `activity_summary_reporting_window_reference` from Activity Summary Aggregation Record (when produced), Activity Summary Delivery Attempt (Notification Platform Service), Activity Summary Generated Evidence (Logs & Audit File Tracking), and No-Activity Summary Suppression Evidence (Logs & Audit File Tracking).

**Lifecycle states (proposal-level):**

- `pending` - created by Workflow 4 (Reporting Window Evaluation) trigger; boundaries set; carry-forward references identified.
- `evaluating` - source-fact aggregation in flight (Workflow 5).
- `aggregated` - terminal; Activity Summary Aggregation Record produced with non-empty content; aggregation record reference captured.
- `suppressed_no_activity` - terminal; zero activity in the window interval; No-Activity Summary Suppression Evidence recorded by Logs & Audit; suppression-outcome event emitted; Notification Platform Service consumes the outcome and advances its own configuration cursor via NPS Workflow 9 Trigger B path; no delivery attempt created. Analytics does not mutate the configuration cursor.
- `delivered` - intermediate observability state after a successful delivery of the produced aggregation record (Workflow 9 advances the configuration cursor on this transition; the window itself reaches `delivered` for traceability).
- `delivery_failed` - intermediate observability state after a failed delivery; the cursor is NOT advanced; the window is eligible for carry-forward into the next window's interval. Multiple retry attempts at the Notification Platform level may exist while the window remains in `delivery_failed` state.
- `superseded` - terminal observability state if the window is subsumed by a later carry-forward window (Workflow 4 records the supersession reference but preserves both windows for audit).

State machine notes:

- `pending -> evaluating -> aggregated -> delivered` is the standard success path.
- `pending -> evaluating -> aggregated -> delivery_failed` is the failed-delivery path. The window remains in `delivery_failed` until a later successful delivery causes Workflow 4 to identify it for carry-forward subsumption; if a later window's delivery succeeds while subsuming this one, this window transitions to `superseded`. Otherwise it remains in `delivery_failed` indefinitely (operator-visible).
- `pending -> evaluating -> suppressed_no_activity` is the no-activity path. The window is terminal; Analytics emits the suppression-outcome event; Notification Platform Service consumes it and advances the configuration cursor via NPS Workflow 9 Trigger B path; no delivery is attempted.

**Required fields and references (proposal-level):**

- `activity_summary_reporting_window_reference` - canonical identifier.
- `activity_summary_configuration_reference` - the configuration that triggered the window.
- `window_start_timestamp` - the last-successful-summary cursor at trigger time.
- `window_end_timestamp` - the scheduled evaluation time at trigger time.
- `carry_forward_window_reference_collection` - optional; references to prior `delivery_failed` windows whose intervals are subsumed by this window. Empty for normal (no-prior-failure) windows.
- `aggregation_record_reference` - optional; populated when the window reaches `aggregated` state.
- `suppression_evidence_reference` - optional; populated when the window reaches `suppressed_no_activity` state.
- `superseded_by_reference` - optional; populated when the window reaches `superseded` state.
- `lifecycle_state` - one of the states above.
- `audit_reference` - Logs & Audit retention reference.
- `created_at`, `state_change_timestamp` - record-management timestamps.

**Boundary discipline:**

- The window does not modify source-module records. Source events are read-only via the source-module event streams or read models.
- The window does not directly hand off to Notification Platform Service. Workflow 5 produces the aggregation record; Workflow 5 / Workflow 6 trigger the appropriate Logs & Audit evidence; Notification Platform Service's Workflow 7 reads the aggregation record by reference and creates the delivery attempt.
- The window does not aggregate cross-tenant boundaries in a way that mixes per-tenant data. Phase 1 produces platform-wide CIXCI System Admin aggregates; per-tenant aggregation is future phase.
- The carry-forward collection is identified at window-creation time (Workflow 4 step 2). Carry-forward applies if and only if prior windows are in `delivery_failed` terminal state for the same configuration; windows in `dispatched`-in-flight state at Notification Platform level are not subsumed.
- A window in `aggregated` or `delivery_failed` state can transition to `superseded` only by a later window's successful delivery that subsumes its interval. Operators may manually intervene via future operator-surface PR; PR-C does not introduce manual override workflows.

---

### Activity Summary Aggregation Record

The read-model snapshot of one reporting window's aggregated facts, organized by Section (orders, shipping, returns, exceptions) and Metric (counts within each section). Immutable once created.

**Ownership:** Analytics / Reporting.

**Identity:** referenced via `activity_summary_aggregation_record_reference` from Activity Summary Reporting Window (when window reaches `aggregated`), Activity Summary Delivery Attempt (Notification Platform Service), and Activity Summary Generated Evidence (Logs & Audit File Tracking).

**Lifecycle:** Created once when Workflow 5 completes successfully (non-empty aggregation). Immutable. No state transitions.

**Required fields and references (proposal-level):**

- `activity_summary_aggregation_record_reference` - canonical identifier.
- `activity_summary_reporting_window_reference` - the window that produced this record.
- `activity_summary_configuration_reference` - the configuration that triggered the window.
- `section_collection` - structured collection of Activity Summary Section field-groupings; see Section / Metric structure below.
- `summary_source_fact_reference_collection` - structured collection of Summary Source Fact References per metric; see Summary Source Fact Reference below.
- `summary_dashboard_reference` - optional; reference to the Analytics dashboard read model for drilldown. Phase 1 may be null (dashboard PR is future); when null, the Notification Platform Service email body omits the dashboard link or shows a fallback.
- `generated_at_timestamp` - moment Workflow 5 completed.
- `audit_reference` - Logs & Audit retention reference (separate from Activity Summary Generated Evidence; the evidence record is the canonical Logs & Audit-side artifact).

**Section / Metric structure (fields on Activity Summary Aggregation Record, not separate entities):**

- **Activity Summary Section** - field-level grouping. Phase 1 enumeration: `orders`, `shipping`, `returns`, `exceptions`.
- **Activity Summary Metric** - typed count within a section. Each metric carries:
  - `metric_name` - human-readable label (for example, `orders_routed_successfully`).
  - `metric_value` - scalar count.
  - `metric_source_module` - which source module the underlying facts came from (for example, `order-routing`, `fulfillment-returns`). Used for audit traceability and for distinguishing facts that span modules.
  - `metric_source_fact_reference_collection` - subset of the aggregation record's overall Summary Source Fact Reference collection that contributed to this specific metric.

Phase 1 metric inventory (proposal-level; some metrics may be conditionally absent per Phase 1 source-availability decisions):

**`orders` section:**
- `orders_routed_successfully` - count of successful Order Routing export delivery events from PR #91 in the window.
- `orders_requiring_review` - count of Export Operational Review-Required State transitions from PR #91 in the window.
- `vendors_involved` - distinct count of vendors referenced by routed orders in the window.
- `retailers_buyers_involved` - distinct count of retailers / buyers referenced by routed orders in the window.
- `total_new_orders` - count of new-order intake events in the window. **Phase 1 conditional:** if no source event for "new orders received" exists (the order-intake stage is not currently producing events Analytics can consume), this metric is **deferred** and is absent from Phase 1 aggregation records. The aggregation record's section structure preserves a placeholder note that the metric was intentionally deferred. The metric returns to scope in a future Order Intake / Order Orchestration hardening PR.

**`shipping` section:**
- `orders_processed` - count of Vendor Export Window completion events from PR #91 in the window.
- `vendors_involved` - distinct count of vendors referenced by shipped or processed orders in the window.
- `retailers_buyers_involved` - distinct count of retailers / buyers referenced by shipping in the window.
- `orders_shipped` - count of shipment-line shipped transitions from Fulfillment / Returns baseline in the window. **Phase 1 conditional:** if the baseline shipped-state transition does not produce a distinct event Analytics can consume (separate from PR #94's delivered event), this metric is deferred similarly.
- `orders_delivered` - count of `fulfillment-returns.shipment-line.delivered` events from PR #94 in the window.
- `missing_tracking_count` - count of fulfillment-import rows that lacked a tracking number; sourced from Fulfillment / Returns baseline row-validation evidence where available.
- `late_vendor_fulfillment_import_count` - count of `fulfillment-returns.late-fulfillment-import-exception.created` events from PR #92 in the window.

**`returns` section:**
- `return_submissions` - count of return-submission events from Fulfillment / Returns baseline in the window.
- `return_received_count` - count of return-received transitions from Fulfillment / Returns baseline in the window.
- `return_rejected_count` - count of return-rejected dispositions from Fulfillment / Returns baseline in the window.
- `returns_requiring_review` - count of returns in review-required state from Fulfillment / Returns baseline in the window.
- `return_refunded_count` - **Phase 1 conditional:** included only if an existing Fulfillment / Returns-owned operational source for refund execution evidence exists at bundle application time. If refund execution evidence lives in Invoice Management or is not yet modeled, this metric is deferred and absent from Phase 1 aggregation records. PR-C does not create Invoice Management linkage and does not create refund execution semantics.
- `vendors_involved` - distinct count of vendors referenced by returns in the window.
- `retailers_buyers_involved` - distinct count of retailers / buyers referenced by returns in the window.

**`exceptions` section:**
- `failed_vendor_imports` - count of fulfillment-import-failure evidence from Fulfillment / Returns baseline in the window.
- `rejected_import_rows` - count of row-level validation failures from Fulfillment / Returns baseline in the window. Includes `fulfillment-returns.delivery-date-evidence.rejected` events from PR #94 where the rejection corresponds to a row.
- `failed_buyer_updates` - count of `fulfillment-returns.buyer-update-ready.failed` events from PR #94 in the window. Phase 1 produces a single aggregate count; per-buyer or per-vendor breakouts are future operator-surface work.
- `held_buyer_updates` - count of `fulfillment-returns.buyer-update-ready.held` events from PR #94 in the window. Placed in the `exceptions` section (not `shipping`) because held buyer updates indicate operational attention is required.
- `late_missing_vendor_responses` - combined count of `fulfillment-returns.late-fulfillment-import-exception.created` and `fulfillment-returns.missing-fulfillment-import-exception.created` events from PR #92 in the window.
- `partial_fulfillment_response_exceptions` - count of `fulfillment-returns.partial-fulfillment-response-exception.created` events from PR #92 in the window.
- `delivery_date_corrections_pending_review` - count of `fulfillment-returns.delivery-date-correction.proposed` events from PR #94 in the window (corrections in `proposed` state; terminal `applied` or `rejected` not counted here).
- `return_exceptions_requiring_review` - count of return exceptions in review-required state from Fulfillment / Returns baseline in the window.

The exact set of metrics produced per aggregation record depends on source-event availability at PR-C application time. Any metric with a "Phase 1 conditional" tag above may be absent if the source event or evidence does not yet exist; the aggregation record's section structure documents intentional deferrals.

**Boundary discipline:**

- The record does not embed source-module record content. Source facts are referenced via Summary Source Fact References (see below).
- The record is immutable. Re-aggregation of the same window interval produces a new record; the prior record is preserved.
- The record does not include detailed source rows. Phase 1 is totals-only.
- The record's `summary_dashboard_reference` does not constitute a dashboard implementation; it is a forward-compat reference. Dashboard implementation is a future PR.
- Metric values are deterministic for a given window interval and source-event content. Re-aggregation with the same inputs produces the same metric values.
- Late-arriving source facts (events whose `occurredAt` falls in this window's interval but whose receipt timestamp arrives after this window is aggregated) do not edit this record; they are picked up by the next window's aggregation with a Late Source Fact Reference disposition (documented in workflows.md PR-C section).

---

### Summary Source Fact Reference (reference field collection on Activity Summary Aggregation Record)

Per-metric audit trail. For each metric in each section, the references point back to the source-module records that contributed to the count.

**Type:** field collection on Activity Summary Aggregation Record, not a separate entity.

**Owner:** Analytics / Reporting collects the references; source modules own the underlying records.

**Structure (proposal-level):**

- `summary_source_fact_reference_collection` is a collection of references organized by metric.
- Each reference carries: `metric_name`, `source_module`, `source_event_reference` or `source_record_reference`, `source_occurred_at_timestamp`.
- The collection does not embed source-module content; it carries references only.

**Boundary discipline:**

- References must not expose buyer-specific or vendor-specific identifiers to recipients not authorized to see them. Phase 1 recipients are CIXCI System Admin only, which mitigates this risk; future per-tenant summaries must apply Tenant Company `check_access` filtering before the email body uses references for drilldown.
- References must not cross Tenant Company boundaries in a way that exposes one tenant's data to another tenant's scope. Phase 1 platform-wide aggregation accepts the CIXCI-internal-only nature of the recipient list as the boundary control.

---

### Missed Window Carry-Forward Reference (reference field collection on Activity Summary Reporting Window)

Provides the audit trail when a window subsumes one or more earlier missed windows.

**Type:** reference field collection on Activity Summary Reporting Window (the `carry_forward_window_reference_collection` field).

**Owner:** Analytics / Reporting.

**Purpose:** When Workflow 4 (Reporting Window Evaluation) creates a new window, it enumerates prior `delivery_failed` windows for the same configuration; their references are added to the new window's carry-forward collection. The new window's aggregation interval is the union of: (a) the new window's primary interval (cursor to scheduled time) and (b) the subsumed intervals. Source-fact references are deduplicated.

**Boundary discipline:**

- Carry-forward applies only to windows in `delivery_failed` terminal state, not `dispatched`-in-flight or `pending`-not-yet-evaluated states.
- Subsumed windows transition to `superseded` only when the subsuming window's delivery reaches `acknowledged` terminal state (per Workflow 9). Until then, the subsumed windows remain in `delivery_failed`, and a further subsuming window will pick them up again.

---

### Summary Dashboard Reference (reference field on Activity Summary Aggregation Record)

Reference-only field anticipating a future Analytics dashboard read model.

**Owner:** Analytics / Reporting (field exists on the aggregation record); the underlying dashboard is a future PR.

**Phase 1 behavior:** the field may be null. The Notification Platform Service delivery payload assembly logic omits the "View dashboard" line or shows a fallback when null.

**Boundary discipline:**

- This field does not constitute a dashboard implementation.
- This field is optional.
- Future dashboard PR populates the field; PR-C captures the forward-compat surface.

---

### Phase 1 deliberate non-behaviors (Analytics / Reporting side)

The following are explicitly out of scope for PR-C on the Analytics / Reporting side:

- Per-tenant or per-buyer summary aggregation.
- Per-buyer or per-vendor metric breakouts.
- Detailed source rows in the aggregation record (Phase 1 is totals-only).
- Dashboard implementation, drilldown UI, dashboard URL generation.
- Aggregation engine implementation (the architectural entity is introduced; query plans, materialized-view strategy, storage are deferred).
- Real-time aggregation; Phase 1 aggregation runs on the scheduled evaluation trigger from Notification Platform Service.
- Source-module event modification of any kind.
- Modification of existing Analytics / Reporting entities (Reporting Read Model, Metric Definition, Report Definition, Dashboard Definition); the PR-C entities exist alongside.
