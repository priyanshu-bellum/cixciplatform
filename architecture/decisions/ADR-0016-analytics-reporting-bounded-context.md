# ADR-0016: Analytics / Reporting Bounded Context

## Status

Proposed

## Context

CIXCI needs analytics and reporting for system admins, buyers, accessory vendors, and device manufacturers.

Analytics / Reporting should help users understand catalog activity, buyer assortment, vendor performance, device adoption, accessory coverage, order activity, fulfillment performance, returns, invoice trends, warranty signals, integration health, notification health, media quality, AI recommendation outcomes, and operational risks.

Analytics must consume approved events, references, snapshots, and reporting-safe read models without becoming the owner of operational source records.

This ADR is proposal-level. It does not finalize launch reports, dashboard design, metric formulas, refresh frequency, retention, export formats, access implementation, data warehouse implementation, anomaly detection, or implementation behavior.

## Decision

Introduce Analytics / Reporting as a distinct bounded context.

Analytics / Reporting owns reporting read models, dashboards, report definitions, report exports, metric definitions, aggregation logic, trend analysis, reporting filters, reporting permissions projection, reporting refresh status, reporting events, reporting-safe data projections, and role/tenant-scoped report views.

Analytics / Reporting must not become the source of truth for operational source records, workflow state, audit evidence, notification delivery history, integration state, media assets, tenant eligibility, user permissions, or AI recommendations.

### Analytics / Reporting Owns

- Reporting read models.
- Dashboards.
- Report definitions.
- Report exports.
- Metric definitions.
- Aggregation logic.
- Trend analysis.
- Reporting filters.
- Reporting permissions projection.
- Reporting refresh status.
- Reporting events.
- Reporting-safe data projections.
- Role/tenant-scoped report views.

### Analytics / Reporting Does Not Own

- Product Catalog source records.
- Device Catalog source records.
- Pricing calculations or snapshots.
- Order Routing decisions.
- Fulfillment/Returns operational state.
- Invoice Management records.
- Warranty claim lifecycle.
- Logs & Audit evidence records.
- Notification delivery history.
- Media asset source records.
- Integration connection state.
- Tenant Company eligibility/user permissions.
- AI Agent recommendations or action outcomes.

## Reporting Audiences

Analytics / Reporting may support reporting for:

- CIXCI System Admins.
- Buyer Parent Companies.
- Buyer Child Entities.
- Accessory Vendor Parent Companies.
- Accessory Vendor Brand/Child Entities.
- Device Manufacturer Parent Companies.
- Device Manufacturer Child Entities.

All reports must be role-based and tenant-scoped.

## Tenant And Access Boundaries

Tenant Company remains the authority for company/entity hierarchy, users, roles, permissions, activation state, buyer/vendor/manufacturer scope, product-type eligibility, licensed-property scope, and relationship eligibility.

Analytics must not grant access independently.

Analytics must consume access boundaries, relationship eligibility, source-module visibility rules, and redaction rules from the owning modules.

Cross-tenant reporting is denied by default except approved CIXCI system admin views.

Buyer reports may only expose buyer-authorized data.

Vendor reports may only expose vendor-authorized data.

Manufacturer reports may only expose manufacturer-authorized data.

Customer-sensitive data must be redacted or excluded unless explicitly allowed by source-module policy, tenant scope, recipient role, and redaction rules.

## Buyer Reporting Examples

Buyers, MVNOs, wireless carriers, retailers, and future enabled buyer types may need reports on:

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

## Accessory Vendor Reporting Examples

Accessory vendors may need reports on:

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

## Device Manufacturer Reporting Examples

Device manufacturers may need reports on:

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

## System Admin Reporting Examples

CIXCI system admins may need platform-wide reports on:

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

Proposal-level source inputs include:

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

Source modules remain responsible for the operational meaning, source-of-truth state, and domain-specific visibility rules behind these inputs. Analytics may project, aggregate, and report on approved inputs, but it must not mutate or reinterpret source records as operational state.

## Reporting Model

Proposal-level reporting concepts include:

- Reporting read model.
- Metric definition.
- Dashboard definition.
- Report definition.
- Saved report.
- Scheduled report placeholder.
- Exported report.
- Report filter.
- Report refresh job.
- Data freshness marker.
- Aggregation window.
- Tenant/reporting scope.
- Redaction class.
- Access projection.
- Source version/reference.
- Report schema version.

Reporting read models should be reporting-safe projections of source data. They should preserve enough source references, source versions, freshness markers, and redaction classes to explain report outputs without becoming operational records.

## Metric Governance

Metric definitions must be versioned.

Report definitions must be versioned.

Source input versions should be traceable where applicable.

Metric calculation changes should not silently rewrite historical meaning.

Reporting results should include data freshness and source reference where applicable.

Analytics owns metric definitions and aggregations, not operational source records.

Historical report interpretation may need to preserve metric definition version, report schema version, aggregation window, source input version, and generated-at timestamp.

## Report Export

Reports may be exportable as CSV or other future formats.

Export access must respect tenant scope and role permissions.

Exported reports should have audit references.

Report export files may be tracked by Logs & Audit.

Report exports must not bypass redaction rules, source-module visibility rules, tenant scope, or recipient role boundaries.

Exported report records should include report definition version, generated by, generated at, tenant/reporting scope, redaction class, source freshness marker, export format, and archive/reference placeholder where applicable.

## AI Agent Services Relationship

AI agents may consume Analytics outputs where authorized.

Analytics may consume AI recommendation outcome signals such as accepted, rejected, ignored, edited, confidence, or action outcome references.

AI Agent Services owns recommendations, insights, confidence, and action outcomes.

Analytics owns reporting models and aggregated views.

AI must not use Analytics to bypass tenant scope, source-module permissions, redaction rules, or source-module ownership boundaries.

## Notification Hooks

Analytics may emit events that later trigger notifications.

Notification Platform Service owns delivery.

Possible notification triggers include:

- Scheduled report ready.
- Anomaly detected placeholder.
- Dashboard refresh failed.
- Data freshness warning.
- Report export failed.

Analytics should emit notification-triggering signals with source references, tenant scope, report definition reference, redaction class, and recipient intent where applicable. Notification Platform Service remains responsible for recipient resolution, preferences, suppression, delivery, retry, and delivery history.

## Logs & Audit Relationship

Report generation, report exports, scheduled reports, dashboard refresh failures, and access to sensitive reports should be auditable.

Logs & Audit owns audit evidence.

Analytics owns reporting definitions and generated reporting views.

Sensitive report access should produce audit references without copying unrestricted report payloads into Logs & Audit unless permitted by retention and redaction policy.

## Integration Management Relationship

Analytics may report on integration health and integration failures.

Integration Management owns connection state and integration evidence.

Analytics owns reporting views and trends based on integration signals.

Analytics must not enable, disable, configure, retry, or mutate integrations. It may expose trends, failure counts, health rollups, and operational risk indicators from approved Integration Management signals.

## Privacy And Redaction

Reports must use minimal necessary data.

Customer-sensitive data should be excluded or redacted by default.

Pricing-sensitive, invoice-sensitive, tenant-sensitive, media-rights-sensitive, licensing-sensitive, and warranty-sensitive data should use redaction classes.

Buyer, vendor, manufacturer, and system admin report views should be projected differently based on role and tenant scope.

Analytics must not become a hidden data export path. Report filters, exports, saved reports, scheduled reports, and dashboards should all enforce tenant scope, source-module visibility rules, redaction class, and role permissions.

## Events

Proposal-level events:

- `analytics.report.generated`.
- `analytics.report.export.created`.
- `analytics.dashboard.refreshed`.
- `analytics.dashboard.refresh.failed`.
- `analytics.metric.definition.updated`.
- `analytics.read-model.refresh.completed`.
- `analytics.read-model.refresh.failed`.
- `analytics.data-freshness.warning`.
- `analytics.scheduled-report.ready`.
- `analytics.report.accessed.sensitive`.

Event payloads should use references, source versions, redaction classes, tenant/reporting scope, and freshness markers. Events should not expose unrestricted customer, pricing, invoice, warranty, tenant, media-rights, licensing, or commercial data.

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

## Impacts

Future Analytics / Reporting module drafting should define:

- Reporting read model structure.
- Dashboard and report definition models.
- Metric definition governance.
- Report export model.
- Scheduled report placeholder model.
- Reporting refresh and data freshness model.
- Tenant-scoped access projection model.
- Redaction and privacy rules for report views.
- Source input contracts from Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty support, Logs & Audit, Notification, Media, Integration Management, Tenant Company, and AI Agent Services.
- Logs & Audit references for report generation, export, and sensitive access.
- Notification hooks for scheduled report readiness, freshness warnings, refresh failures, export failures, and future anomaly alerts.

Future source modules should expose reporting-safe events, snapshots, references, or projections without moving source-of-truth responsibilities into Analytics.

## Consequences

- Analytics / Reporting becomes the bounded context for metrics, dashboards, report definitions, reporting read models, exports, aggregation logic, and role/tenant-scoped report views.
- Source modules remain authoritative for operational records, workflow state, eligibility, visibility, audit evidence, delivery history, integration state, media assets, and AI recommendations.
- Reporting access must be explicitly scoped by Tenant Company permissions, source-module visibility rules, and redaction classes.
- Metric and report definition changes require versioning so historical meaning is not silently rewritten.
- Future Analytics module work should happen after this bounded-context boundary is accepted.
