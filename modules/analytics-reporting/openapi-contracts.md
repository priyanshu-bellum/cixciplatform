# Analytics / Reporting OpenAPI Contract Notes

This document is proposal-level architecture for future OpenAPI contracts. It is not an implementation-ready API specification.

## Contract Goals

Future OpenAPI contracts should expose Analytics / Reporting capabilities for dashboards, reports, saved reports, scheduled report placeholders, exports, metrics, read model freshness, and admin definition management while preserving tenant scope and source-module ownership.

## Common Request Fields

Proposal-level request fields:

- `tenantScopeRef`.
- `reportingScopeRef`.
- `audienceType`.
- `actorRef`.
- `roleRef`.
- `accessProjectionRef`.
- `redactionClass`.
- `reportDefinitionId`.
- `reportSchemaVersion`.
- `metricDefinitionId`.
- `metricDefinitionVersion`.
- `filters`.
- `aggregationWindow`.
- `sourceFreshnessRequirement`.
- `idempotencyKey` where applicable.

## Common Response Fields

Proposal-level response fields:

- `requestId`.
- `tenantScopeRef`.
- `reportingScopeRef`.
- `redactionClass`.
- `accessProjectionRef`.
- `dataFreshnessMarker`.
- `sourceVersionRefs`.
- `reportSchemaVersion`.
- `metricDefinitionVersions`.
- `generatedAt`.
- `resultPage` / `nextPageToken` placeholders.
- `reviewRequired`.
- `auditRef` where applicable.

## Endpoint Groups

### Dashboards

- `GET /analytics/dashboards`
- `GET /analytics/dashboards/{dashboardDefinitionId}`
- `GET /analytics/dashboards/{dashboardDefinitionId}/view`
- `GET /analytics/dashboards/{dashboardDefinitionId}/freshness`

### Reports

- `GET /analytics/reports/definitions`
- `GET /analytics/reports/definitions/{reportDefinitionId}`
- `POST /analytics/reports/run`
- `POST /analytics/reports/validate-filters`
- `GET /analytics/reports/results/{reportRunId}`

### Saved And Scheduled Reports

- `GET /analytics/reports/saved`
- `POST /analytics/reports/saved`
- `PATCH /analytics/reports/saved/{savedReportId}`
- `GET /analytics/reports/scheduled`
- `POST /analytics/reports/scheduled`
- `PATCH /analytics/reports/scheduled/{scheduledReportId}`
- `GET /analytics/reports/scheduled/{scheduledReportId}/runs`

### Exports

- `POST /analytics/reports/export`
- `GET /analytics/reports/export/{exportId}/status`
- `GET /analytics/reports/export/{exportId}/download-reference`
- `GET /analytics/reports/export/history`

### Metrics

- `GET /analytics/metrics/definitions`
- `GET /analytics/metrics/definitions/{metricDefinitionId}`
- `GET /analytics/metrics/results`
- `GET /analytics/metrics/{metricDefinitionId}/versions`

### Refresh And Freshness

- `GET /analytics/read-models/{readModelId}/freshness`
- `POST /analytics/read-models/{readModelId}/refresh-placeholder`
- `GET /analytics/refresh-jobs/{refreshJobId}`
- `GET /analytics/freshness-warnings`

### Administration

- `POST /analytics/admin/report-definitions`
- `PATCH /analytics/admin/report-definitions/{reportDefinitionId}`
- `POST /analytics/admin/metric-definitions`
- `PATCH /analytics/admin/metric-definitions/{metricDefinitionId}`
- `POST /analytics/admin/dashboard-definitions`
- `PATCH /analytics/admin/dashboard-definitions/{dashboardDefinitionId}`

Administration endpoints are internal/system-admin scoped and must be auditable.

## Security And Redaction Notes

Future contracts should require authentication and authorization through platform identity/access services and Tenant Company scope projections. Analytics must not grant access independently.

Responses should omit or redact customer-sensitive, pricing-sensitive, invoice-sensitive, tenant-sensitive, media-rights-sensitive, licensing-sensitive, warranty-sensitive, and commercial data unless explicitly allowed.

## Error Shapes

Proposal-level errors should include:

- Error code.
- Message.
- Source module reference where applicable.
- Report definition reference.
- Redaction/access denial reason.
- Review-required flag.
- Audit reference placeholder.

## Non-Goals

OpenAPI contracts must not expose mutation endpoints for source operational records in Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, Logs & Audit, Notification, Media, Integration Management, or AI Agent Services.
