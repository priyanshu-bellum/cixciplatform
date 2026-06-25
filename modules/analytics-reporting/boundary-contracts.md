# Analytics / Reporting Boundary Contracts

This document is proposal-level architecture. It clarifies what Analytics / Reporting may answer and what must remain owned by source modules.

## Analytics May Answer

Analytics may answer proposal-level questions such as:

- What reports, dashboards, and metrics are available for an authorized actor and tenant/reporting scope?
- What is the current value of a versioned metric based on approved reporting inputs?
- What is the trend for a reporting-safe metric over an aggregation window?
- What report exports were generated and under which scope/redaction class?
- When was a read model refreshed and what is its freshness status?
- Which source versions contributed to a report where references are available?
- Which reports are stale, failed, partial, superseded, or review-required?
- Which scheduled report placeholder is ready for notification delivery?
- Which visibility evidence references were used to produce a reporting view where authorized?

## Analytics Must Not Answer

Analytics must not answer source-of-truth or workflow questions such as:

- Is a product active, visible, compatible, or downloadable as the Product Catalog authority?
- What is the canonical Device Reference or device lifecycle status as the Device Catalog authority?
- What is the authoritative price, commission, exception, or price snapshot as the Pricing authority?
- How should an order be routed or rerouted as the Order Routing authority?
- What is the authoritative shipment, delivery, return, or replacement state as Fulfillment/Returns authority?
- What is the authoritative invoice, invoice status, reconciliation result, or payment status as Invoice Management or future Payment authority?
- Is a tenant, user, buyer, vendor, manufacturer, product type, licensed property, or relationship eligible as Tenant Company authority?
- What audit record is immutable evidence as Logs & Audit authority?
- Was a notification delivered as Notification Platform Service authority?
- What is the authoritative media asset, rendition, URL, access policy, or processing state as Media authority?
- What is the authoritative integration configuration, webhook receipt, external action outcome, or external ID mapping as Integration Management authority?
- What recommendation, insight, confidence, or action outcome belongs to AI Agent Services?
- Which buyer/vendor/manufacturer may see cross-party data without source-owned visibility evidence?

## Source Module Boundaries

### Tenant Company

Owns hierarchy, users, roles, permissions, activation state, buyer/vendor/manufacturer scope, product-type eligibility, licensed-property scope, and relationship eligibility. Analytics consumes access projections and scope signals but must not grant access independently.

### Product Catalog

Owns accessory product records, product type validation, category validation, product visibility, compatibility assertions, product activation/download records, product exports, catalog imports, and product media attachments. Analytics may report on approved product signals.

### Device Catalog

Owns canonical Device References, device master records, manufacturer source data, lifecycle status, buyer device portfolio references, and device export records. Analytics may report on approved device signals.

### Pricing

Owns pricing interpretation, calculations, pricing profiles, exceptions, snapshots, effective dating, and pricing events. Analytics may report on approved pricing snapshots/events but must not calculate or reinterpret price.

### Order Routing

Owns routing decisions, suborders, routing snapshots, exceptions, retry/review workflows, and routing events. Analytics may report on routing health and trends.

### Fulfillment / Returns

Owns fulfillment handoff tracking, shipment/delivery status, return operational state, replacement execution, and exceptions. Analytics may report on fulfillment/return performance and risk trends.

### Invoice Management

Owns invoice records, invoice reports, invoice exports, invoice status lifecycle, and reconciliation placeholders. Analytics may report on invoice trends but must not generate or finalize invoices.

### Logs & Audit

Owns audit evidence and file tracking. Analytics may consume audit signals and emit audit references but does not own immutable audit records.

### Notification Platform Service

Owns delivery, preferences, recipient resolution, templates, attempts, and delivery history. Analytics emits notification-triggering signals only.

### Media / Image Asset Management

Owns media asset storage references, renditions, transformations, asset metadata, URL references, and processing state. Analytics may report on media quality and processing health.

### Integration Management

Owns connection configuration, integration state, webhook receipt/delivery evidence, external action records, and external references. Analytics may report on integration health and failure trends.

### AI Agent Services

Owns recommendations, insights, confidence, feedback, and action outcomes. Analytics may report on AI outcomes but must not create or approve AI actions.

## Visibility Evidence Boundary

Analytics must not infer buyer/vendor/manufacturer visibility, product visibility, supported-device matching, relationship eligibility, product-type scope, licensed-property scope, or tenant readiness.

Analytics consumes visibility/access evidence from Tenant Company and source modules, including proposal-level references such as relationship eligibility snapshot, source visibility snapshot, product-type scope, licensed-property scope, access projection version, role/permission projection, source module visibility reference, and redaction decision version.

Vendor and manufacturer opportunity reports must be backed by source-owned eligibility/visibility evidence. Cross-party reporting should deny by default when required visibility evidence is missing, stale, expired, conflicting, or insufficient.

## Access Boundary

Analytics must enforce consumed access projections and redaction rules. If access projection is missing, stale, conflicting, or insufficient, report generation/export should block or route to review.

## Read Model Boundary

Analytics owns reporting read models, read-model versions, refresh checkpoints, stale markers, refresh job statuses, rebuild/backfill/replay records, and reporting-safe projections.

Analytics read models may lag source modules. Rebuilds, backfills, and replays must not mutate operational source records. Failed or partial refreshes must not be presented as fully trustworthy analytics.

## Export Boundary

Report exports are reporting outputs only. They must not bypass source-module visibility rules, redaction classes, tenant scope, role permissions, visibility evidence requirements, or Logs & Audit tracking where required.

Sensitive report exports may require review. Exported files should be auditable through Logs & Audit, while Analytics owns export job records, export file references, export schema versions, expiration/revocation/supersession references, redaction class, and access decision references.

## AI Boundary

AI agents may consume Analytics outputs only when authorization and visibility evidence permit. Analytics must not become an AI action engine, and AI must not use Analytics to bypass tenant scope, source-module permissions, redaction, or visibility evidence.

## Ownership Summary

Analytics owns reporting definitions, metric definitions, read models, aggregations, dashboards, and report exports.

Tenant Company and source modules own access, visibility, eligibility, relationship, product-type, licensed-property, and operational decisions.

Logs & Audit owns audit evidence.

Analytics must not become the source of truth for operational records or cross-party visibility.

## Scheduled System Admin Activity Summary Aggregation Boundaries (Cross-Module PR)

This section declares the Analytics / Reporting side of the cross-module boundary surface for the scheduled summary email hardening pass. Each of the three target modules (Notification Platform Service, Analytics / Reporting, Logs & Audit File Tracking) carries a reciprocal boundary section. Source modules (Order Routing, Fulfillment / Returns) and supporting modules (Tenant Company, Integration Management) are not modified by this PR.

### Analytics / Reporting owns (PR-C additions)

- Activity Summary Reporting Window entity, lifecycle (`pending`, `evaluating`, `aggregated`, `suppressed_no_activity`, `delivered`, `delivery_failed`, `superseded`), cursor logic for window boundaries.
- Activity Summary Aggregation Record entity, immutability.
- Section / Metric field structure on the aggregation record (orders, shipping, returns, exceptions; per-metric structure with `metric_name`, `metric_value`, `metric_source_module`, `metric_source_fact_reference_collection`).
- Summary Source Fact Reference collection pattern. Per-metric audit trail to source-module records, by reference; never embedded content.
- Summary Dashboard Reference field (reference-only; dashboard itself deferred to future PR).
- Missed Window Carry-Forward Reference collection on the Reporting Window.
- Three PR-C workflows (Reporting Window Evaluation, Source Fact Aggregation, No-Activity Suppression).
- Two PR-C events: `analytics.activity-summary-window.evaluated`, `analytics.activity-summary-aggregation.created`.
- Production of the no-activity suppression outcome (the `suppressed_no_activity` terminal state on the Reporting Window, the `analytics.activity-summary-window.evaluated` event with `resultDiscriminator = suppressed_no_activity`, and the trigger to Logs & Audit Workflow 10 for No-Activity Summary Suppression Evidence). **Analytics produces the outcome only; Analytics does NOT mutate the Notification Platform Service Activity Summary Configuration cursor.** Notification Platform Service consumes the outcome and advances its own cursor via NPS Workflow 9's no-activity-outcome trigger path.

### Analytics / Reporting does not own (PR-C reaffirmations)

- Activity Summary Configuration entity, Activity Summary Delivery Attempt entity, recipient scope resolution, transport-layer references, cursor advancement on successful delivery. Notification Platform Service owns these.
- Activity Summary Generated Evidence entity, No-Activity Summary Suppression Evidence entity, evidence retention. Logs & Audit File Tracking owns these.
- Email transport mechanics, transport retry policy, dead-letter handling. Integration Management or the provider layer owns these.
- CIXCI System Admin role definition, `check_access` resolution. Tenant Company owns these.
- Source-module records: Order Routing entities (PR #91), Fulfillment / Returns entities (PR #92, PR #94), Cross-Module Handoff Records (PR #93). Consumed by reference; never modified.
- Dashboard implementation. Future Analytics PR owns this.

### Cross-module dependency on Notification Platform Service

- Analytics / Reporting receives evaluation triggers from NPS Workflow 2 (Scheduled Window Evaluation Trigger). Without the trigger, no window is created.
- Analytics / Reporting signals NPS Workflow 7 (Summary Delivery Attempt) when an aggregation record is produced (non-empty). Notification Platform Service then creates the delivery attempt and dispatches via transport.
- Analytics / Reporting reads the Activity Summary Configuration's `last_successful_summary_cursor_reference` to determine window start. **Analytics / Reporting does NOT write to the cursor under any condition.** For both successful delivery and no-activity suppression, cursor advancement is performed exclusively by NPS Workflow 9 (Notification Platform Service). In the no-activity case, Analytics emits the suppression outcome event and triggers Logs & Audit evidence; Notification Platform Service consumes the outcome and advances its own cursor.

### Cross-module dependency on Logs & Audit File Tracking

- Analytics / Reporting triggers Logs & Audit Workflow 10 on:
  - Workflow 5 success (non-empty aggregation): Logs & Audit creates Activity Summary Generated Evidence.
  - Workflow 6 suppression (no-activity): Logs & Audit creates No-Activity Summary Suppression Evidence.
- Logs & Audit File Tracking creates evidence records that reference the canonical Activity Summary Reporting Window and Activity Summary Aggregation Record. Logs & Audit does not duplicate the lifecycle.

### Source-module boundary (read-only consumption)

PR-C consumes the following source events by reference only. No source-module file, entity, or event is modified by this PR.

**Order Routing (PR #91):**
- `order-routing.export-window.executed`
- `order-routing.export-window.failed`
- `order-routing.export-delivery-evidence.confirmed`
- `order-routing.export-delivery-evidence.failed`
- `order-routing.export-review.required`
- `order-routing.export-review.resolved`

These feed the `orders` section metrics (orders routed successfully, orders requiring review, vendors involved, retailers/buyers involved). The `total_new_orders` metric is Phase 1 conditional: if no source event for new-order intake exists, the metric is deferred from Phase 1 aggregation records.

**Fulfillment / Returns (PR #92):**
- `fulfillment-returns.sla-evaluation.evaluated`
- `fulfillment-returns.late-fulfillment-import-exception.created`
- `fulfillment-returns.missing-fulfillment-import-exception.created`
- `fulfillment-returns.partial-fulfillment-response-exception.created`
- `fulfillment-returns.sla-breach.signaled`

These feed the `exceptions` section SLA-related metrics (late vendor fulfillment imports, late/missing vendor responses, partial fulfillment response exceptions). The **PR #92 SLA-semantics preservation invariant continues to hold unconditionally:** consumption is read-only; SLA Evaluation Record outcomes are not modified by PR-C.

**Fulfillment / Returns (PR #94):**
- `fulfillment-returns.shipment-line.delivered`
- `fulfillment-returns.delivery-date-evidence.rejected`
- `fulfillment-returns.buyer-update-ready.held`
- `fulfillment-returns.buyer-update-ready.failed`
- `fulfillment-returns.delivery-date-correction.proposed`

These feed the `shipping` section orders-delivered metric, and the `exceptions` section held-buyer-updates, failed-buyer-updates, delivery-date-corrections-pending-review, and (where applicable) rejected-import-rows metrics. The **PR #94 delivery-date and buyer-update semantics preservation invariant continues to hold unconditionally:** consumption is read-only; PR #94 entity state is not modified by PR-C.

**Fulfillment / Returns baseline:**
Return-submission, return-received, return-rejected, returns-requiring-review, fulfillment-import-failure, missing-tracking, shipped-state-transition events from the existing baseline are consumed where they exist as Analytics-consumable events. Where baseline events are not Analytics-consumable, the corresponding metric is Phase 1 conditional and may be absent. The `return_refunded_count` metric is Phase 1 conditional and is deferred if refund execution evidence is not owned by Fulfillment / Returns.

**Cross-Module Handoff Record (PR #93):**
Not consumed by PR-C. The Cross-Module Handoff Record pertains to the Order Routing -> Fulfillment / Returns SLA handoff and is unrelated to the summary aggregation domain.

### Tenant Company boundary

- Tenant Company owns CIXCI System Admin role definition and `check_access` patterns. Analytics / Reporting does not resolve roles; recipient scope resolution is Notification Platform Service territory.
- Phase 1 aggregation is platform-wide (CIXCI System Admin overview). Per-tenant aggregation is future phase; this PR does not introduce per-tenant filtering of source facts.
- Analytics / Reporting does not modify any Tenant Company file.

### Integration Management boundary

- Integration Management owns transport-layer records (where applicable). Analytics / Reporting does not interact with transport; it reads source-module events and produces the aggregation record, which Notification Platform Service then dispatches.
- Analytics / Reporting does not modify any Integration Management file.

### Logs & Audit redaction and access discipline

- Activity Summary Aggregation Record content is internal-scope (CIXCI System Admin only) in Phase 1.
- Summary Source Fact References must not expose buyer-specific or vendor-specific identifiers to recipients not authorized to see them. Phase 1's CIXCI-internal-only recipient list is the boundary control.
- The aggregation record is not exported via the existing Analytics report export mechanism in Phase 1; future per-tenant or per-recipient export is a future PR.
- Existing Analytics access projections, role / permission projections, and redaction class patterns continue to apply to all Analytics / Reporting content unmodified.

### Analytics / Reporting deferrals (Phase 1)

PR-C does not introduce:

- Per-tenant summary aggregation.
- Per-buyer or per-vendor metric breakouts (Phase 1 single aggregate counts).
- Detailed source rows in the aggregation record (totals only).
- Dashboard implementation, drilldown UI, dashboard URL generation.
- Real-time aggregation (PR-C aggregation runs on scheduled trigger only).
- Source-module event modification.
- Existing Analytics / Reporting entity modification.
- New retention class, redaction class, or access class.
- Late source fact reconciliation policy implementation; the architectural expectation (late facts picked up by next window's effective interval if it extends back via carry-forward) is documented; implementation tuning is deferred.

### Files this PR does NOT touch (Analytics / Reporting side)

- `modules/analytics-reporting/openapi-contracts.md` if it exists (forbidden in PR-C; Analytics / Reporting may not have one currently  -  applier confirms during application).
- `modules/analytics-reporting/ai-agent-catalog-analytics-hooks.md` (existing sub-contract; not in PR-C scope).
- Any file under source modules (Order Routing, Fulfillment / Returns).
- Any file under Tenant Company, Integration Management.
- Any file under Invoice Management, Pricing, Product Catalog, Device Catalog, Media / Image Asset Management, AI Agent Services modules.
- `modules/README.md`.
- Any ADR or platform standard.
- Any code, schema, migration, build, or lockfile.

### Phase 1 conservative defaults summary

- Aggregation scope: CIXCI System Admin platform-wide overview.
- Per-tenant aggregation: deferred.
- Per-buyer or per-vendor breakouts: deferred.
- Detailed source rows: deferred.
- Dashboard reference: optional; null in Phase 1 if dashboard PR not yet merged.
- Aggregation timing: scheduled trigger only; no real-time.
- Late source facts: picked up by next window's effective interval where carry-forward applies; otherwise lost (Phase 1 accepts this).
- Carry-forward: applies only to `delivery_failed` terminal windows; multiple consecutive failures all carry forward into the next successful delivery.
- Source-module modification: none.
- PR #92 and PR #94 source events consumed read-only; invariants preserved.
