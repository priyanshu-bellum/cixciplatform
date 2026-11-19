# analytics — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## analytics.ActivitySummaryAggregationRecord

Table: `analytics_summary_aggregation_record`. Source: [backend/apps/analytics/models.py](../../../../backend/apps/analytics/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `window` / `window_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `analytics.ActivitySummaryReportingWindow; PROTECT; reverse=aggregation_records` |
| `is_current` / `is_current` | `BooleanField` | `indexed; NOT NULL; default=true` | `—` |
| `source_fact_references` / `source_fact_references` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `orders_count` / `orders_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `shipments_count` / `shipments_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `sla_exceptions_count` / `sla_exceptions_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `late_imports_count` / `late_imports_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `missing_imports_count` / `missing_imports_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `partial_imports_count` / `partial_imports_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `result_discriminator` / `result_discriminator` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `aggregated_at` / `aggregated_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## analytics.ActivitySummaryReportingWindow

Table: `analytics_summary_reporting_window`. Source: [backend/apps/analytics/models.py](../../../../backend/apps/analytics/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `window_start` / `window_start` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `window_end` / `window_end` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="active"` | `—` |
| `subsumed_by_window` / `subsumed_by_window_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `analytics.ActivitySummaryReportingWindow; PROTECT; reverse=subsumed_windows` |
| `effective_start` / `effective_start` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["active","Active"],["delivery_failed","Delivery Failed"],["superseded","Superseded"],["suppressed_no_activity","Suppressed (No Activity)"]]`

Indexes: `[["django.db.models.Index",[],{"name":"analytics_s_status_05a908_idx","fields":["status","window_start"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## analytics.DataFreshnessMarker

Table: `analytics_data_freshness`. Source: [backend/apps/analytics/models.py](../../../../backend/apps/analytics/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `source_module` / `source_module` | `CharField` | `indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `source_event_type` / `source_event_type` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `last_processed_at` / `last_processed_at` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `last_source_record_reference` / `last_source_record_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `is_stale` / `is_stale` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["source_module","source_event_type"]]`. Ordering: `[]`.

## analytics.ReportingMetric

Table: `analytics_reporting_metric`. Source: [backend/apps/analytics/models.py](../../../../backend/apps/analytics/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `code` / `code` | `SlugField` | `unique; indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `label` / `label` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `aggregation_method` / `aggregation_method` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/analytics/migrations/0001_initial.py](../../../../backend/apps/analytics/migrations/0001_initial.py)
- [backend/apps/analytics/migrations/0002_datafreshnessmarker_created_at.py](../../../../backend/apps/analytics/migrations/0002_datafreshnessmarker_created_at.py)
