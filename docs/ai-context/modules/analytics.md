# Analytics and reporting

Purpose: reporting metrics, global activity-summary windows/aggregations and data
freshness. Feature ANA-001 is partial pending isolation/audience and event review.

## Entry points, workflow and files

[models](../../../backend/apps/analytics/models.py), [tasks](../../../backend/apps/analytics/tasks.py),
[generate_analytics command](../../../backend/apps/analytics/management/commands/generate_analytics.py),
active ReportingMetric/ActivitySummaryWindow/DataFreshnessMarker viewsets in
[shared_api](../../../backend/apps/shared_api.py). Frontend AnalyticsPage/DashboardPage.

aggregate_reporting_window_metrics loads a window, queries order/delivery/exception
facts by interval, suppresses zero activity or creates an immutable aggregation
with source references, marking older aggregation as noncurrent. Current queries
are global. Window carry-forward and NPS cursor/delivery policies in specs must not
be assumed fully implemented from these models alone.

## API, entities and dependencies

[API](../reference/api/analytics.md): metrics, summary-windows/aggregate actions and
freshness-markers under `/api/v1/analytics/`. [Schema](../reference/schema/analytics.md):
ReportingMetric, ActivitySummaryReportingWindow, ActivitySummaryAggregationRecord,
DataFreshnessMarker. Dependencies: routing, fulfillment, tenant authority and
notification summaries. Source facts are consumed read-only.

## Rules, security, tests and precautions

BR-TEN-001, BR-SRC-001; immutable aggregation updates create new facts. ISSUE-004:
global view querysets/windows/task source reads need approved audience and
two-company isolation tests. ISSUE-007: full event delivery/carry-forward remains
unverified. Capability access alone does not prove permitted cross-company reads.

Tests: [Celery](../../../backend/tests/test_celery_tasks.py),
[immutability](../../../backend/tests/test_models_immutable.py).
Do not add tenant filters by guessing a business aggregation rule or expose global
metrics to a new role without clarification. Avoid seeds against unidentified data.
