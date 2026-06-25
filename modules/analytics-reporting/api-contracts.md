# Analytics / Reporting API Contracts

This document is proposal-level architecture. It defines domain API contract concepts without finalizing endpoint design, authentication implementation, pagination shape, export formats, refresh cadence, storage, or implementation behavior.

## API Principles

- APIs must enforce tenant scope, role permissions, source-module visibility rules, and redaction classes.
- Analytics must not grant access independently; it consumes access projections from Tenant Company and source modules.
- APIs should expose reporting definitions, read models, metrics, dashboards, exports, freshness status, refresh/rebuild status, and visibility evidence status only.
- APIs must not mutate Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, Logs & Audit, Notification, Media, Integration Management, or AI Agent Services source records.
- Report export APIs must not bypass redaction rules or become hidden data export paths.
- Cross-party reporting should deny by default when required visibility evidence is missing or stale.

## Read APIs

Proposal-level APIs:

- List available dashboards for an actor and tenant/reporting scope.
- Get dashboard definition and dashboard view.
- List report definitions available to an actor.
- Get report definition.
- Run report preview / query.
- List saved reports.
- Get saved report.
- List metrics and metric definition versions.
- Get metric definition.
- Get metric results / snapshots.
- Get data freshness markers.
- Get report refresh status.
- Get read-model version and stale marker.
- Get visibility evidence status for a report/read model where authorized.

## Report Execution APIs

Proposal-level APIs:

- Run report with filters.
- Validate report filters.
- Preview report result count/shape.
- Create report refresh job placeholder.
- Get report refresh job status.
- Retrieve paginated report results.
- Validate visibility evidence for report execution.
- Preview redaction decision for a report request.

Report execution should require report definition reference, report schema version, tenant/reporting scope, access projection reference, access projection version, role/permission projection reference, filter values, redaction class, redaction decision version, visibility evidence references, and source freshness expectations where applicable.

## Refresh And Rebuild APIs

Proposal-level APIs:

- Request read-model incremental refresh.
- Request read-model full rebuild.
- Request read-model backfill.
- Request source-event replay within a replay window.
- Get read-model refresh job status.
- Get refresh checkpoint.
- Get source-input conflict status.
- Get stale-read warnings.

Refresh/rebuild APIs operate on Analytics read models only. Rebuilds, backfills, and replays must not mutate operational source records.

## Saved And Scheduled Report APIs

Proposal-level APIs:

- Create saved report.
- Update saved report filters/name.
- Delete/deactivate saved report.
- Create scheduled report placeholder.
- Update scheduled report placeholder.
- Pause/resume scheduled report placeholder.
- Get scheduled report run history.
- Get scheduled report throttle/fanout status.

Scheduled report APIs produce report readiness signals only. Notification Platform Service owns notification delivery.

## Export APIs

Proposal-level APIs:

- Request report export.
- Get report export job status.
- Download/export report file reference where authorized.
- List report export history.
- Revoke/expire export reference placeholder.
- Review sensitive export placeholder.
- Get export access decision.
- Get export download audit references where authorized.
- Supersede export placeholder.

Export requests should include report definition reference, report schema version, export schema version, filters, tenant/reporting scope, export format, redaction class, redaction decision version, access projection reference, role/permission projection reference, visibility evidence references, recheck-before-export flag, and idempotency key.

## Administration APIs

Proposal-level internal/system-admin APIs:

- Create/update report definition.
- Create/update dashboard definition.
- Create/update metric definition.
- Activate/deprecate metric definition version.
- Trigger read model refresh placeholder.
- Review data freshness warning.
- Review sensitive report access records.
- Review missing/stale visibility evidence.
- Review source-input conflicts.

These APIs require approved internal roles and must be auditable.

## Source Input APIs

Analytics may expose proposal-level ingestion or reference APIs for source-module reporting inputs, but source modules remain authoritative. Inputs should include source module, source event/snapshot/reference, source version/hash, tenant scope, relationship eligibility snapshot reference, source visibility snapshot reference, product-type scope reference, licensed-property scope reference, redaction class, redaction decision version, visibility rule reference, and freshness timestamp.

## AI Agent Services APIs

AI agents may consume authorized Analytics outputs through the same tenant-scoped, visibility-evidence-scoped, and redaction-scoped APIs as other consumers. Analytics may expose AI-readable report summaries or metric snapshots only where authorized. AI must not use Analytics APIs to bypass tenant scope or source-module permissions.

## Logs & Audit APIs

Analytics should emit or reference Logs & Audit records for report generation, exports, scheduled report runs, dashboard refresh failures, sensitive report access, export downloads, export revocations, visibility evidence failures, and read-model rebuild/replay activity. Logs & Audit owns audit evidence; Analytics owns reporting records and generated views.

## Error And Review States

Proposal-level errors:

- Report definition not found.
- Report not available for audience.
- Invalid tenant/reporting scope.
- Access projection missing or expired.
- Relationship eligibility snapshot missing or stale.
- Source visibility snapshot missing or stale.
- Product-type scope missing or denied.
- Licensed-property scope missing or denied.
- Source visibility rule denies access.
- Redaction class blocks requested field/export.
- Redaction decision version missing or stale.
- Required source input unavailable.
- Source-input conflict requires review.
- Read model stale, partial, rebuilding, backfilling, replaying, or refresh failed.
- Export format unsupported.
- Export row/size cap exceeded.
- Report schema version superseded.
- Metric definition version deprecated.
- Scheduled report throttled.
- Review required.

## Idempotency And Pagination

Report export and refresh requests should use idempotency keys. Large report results and export histories should support pagination or streaming placeholders. Result pagination must preserve redaction and tenant isolation.

## Scalability Controls

Proposal-level API controls:

- Tenant/report partition keys for refresh, query, and export workloads.
- Result pagination for all large report outputs.
- Streaming export placeholder for large approved exports.
- Export row/size caps.
- Dashboard/query rate limits.
- Aggregation window limits.
- Saved report limits.
- Scheduled report fanout limits.
- Retry budgets and backpressure for refresh/export jobs.
- Stale-read warning controls.

## Scheduled System Admin Activity Summary Aggregation API Contracts (Cross-Module PR)

This section adds architecture-level placeholder API contract concepts for the Analytics / Reporting side of the cross-module summary email hardening pass. **No OpenAPI schemas, concrete HTTP routes, finalized request / response payloads, or runtime endpoint behavior are introduced.** API governance hardening occurs in later sequencing items.

### Placeholder API surfaces

The following lookup surfaces are anticipated; concrete API design is deferred:

- **Activity Summary Reporting Window lookup** - read access to Reporting Windows by reference, by configuration reference, by state, or by time range. Architecture-level only. CIXCI System Admin scope.
- **Activity Summary Aggregation Record lookup** - read access to Aggregation Records by reference, by configuration reference, by Reporting Window reference, or by time range. Architecture-level only. CIXCI System Admin scope.
- **Summary Dashboard Reference lookup** - read access to the Summary Dashboard Reference field on Aggregation Records. Phase 1 may return null or a fallback if the dashboard PR is not yet merged. The underlying dashboard read model is a future PR.

### API contract principles (proposal-level)

- All PR-C lookup surfaces enforce CIXCI System Admin scope via Tenant Company `check_access`.
- Vendor users and buyer users are excluded.
- Cross-tenant access is denied by default; Phase 1 is platform-wide CIXCI-internal-only aggregation.
- Read-only surfaces; no PR-C lookup surface mutates state.
- Lookups return references, lifecycle state, section / metric counts, and source fact references; they do not embed source-module records.
- Existing Analytics / Reporting access projection, role / permission projection, source visibility evidence, redaction class, and redaction decision version patterns apply unmodified.

### Surfaces PR-C does not introduce

- OpenAPI schema definitions.
- Concrete endpoint paths, HTTP methods, query parameters, path parameters, request bodies, response bodies, error envelopes, or pagination schemes.
- Mutation surfaces for Activity Summary Reporting Window. State transitions happen via Analytics Workflows 4, 5, 6 (and via NPS Workflows 8 / 9 for `delivery_failed`, `delivered`, `superseded` transitions).
- Mutation surfaces for Activity Summary Aggregation Record. Records are immutable; re-aggregation produces a new record.
- Manual aggregation re-trigger surfaces.
- Manual Reporting Window state override surfaces.
- Aggregation export surfaces via the existing Analytics report export mechanism. Phase 1 does not introduce summary-specific export.
- Dashboard read model surfaces. Dashboard implementation is deferred.

### Boundary discipline reaffirmed

- The Analytics / Reporting api-contracts.md PR-C section does not introduce APIs for Activity Summary Configuration or Activity Summary Delivery Attempt access; those surfaces belong to Notification Platform Service.
- The Analytics / Reporting api-contracts.md PR-C section does not introduce APIs for Activity Summary Generated Evidence or No-Activity Summary Suppression Evidence access; those surfaces belong to Logs & Audit File Tracking.
- No source-module API mutation surfaces (PR #91, PR #92, PR #93, PR #94 entities all read-only).
- Existing Analytics / Reporting api-contracts.md surfaces (read APIs, report execution APIs, refresh and rebuild APIs, saved and scheduled report APIs, and so on) are not modified.

### Deferral note

Concrete OpenAPI design, route paths, payload schemas, validation rules, error envelopes, rate limiting, authentication, idempotency keys, pagination, and runtime behavior for these surfaces are deferred to the API Governance Foundation PR and the OpenAPI / module API hardening PRs.
