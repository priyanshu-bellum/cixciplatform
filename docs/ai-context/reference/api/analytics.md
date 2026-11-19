# analytics — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.shared_api.ActivitySummaryWindowViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `analytics.ActivitySummaryReportingWindow`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"analytics.summary.read","retrieve":"analytics.summary.read","live_summary":"analytics.summary.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.ActivitySummaryWindowSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","window_start","window_end","status","effective_start","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/analytics/summary-windows/` | `list` |
| GET | `/api/v1/analytics/summary-windows/live-summary/` | `live_summary` |
| GET | `/api/v1/analytics/summary-windows/{pk}/` | `retrieve` |
| GET | `/api/v1/analytics/summary-windows/{pk}/aggregations/` | `aggregations` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `live_summary`: `apps.shared_api.ActivitySummaryWindowViewSet.live_summary` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: `days`. Direct Response dictionary keys: `generated_at`, `late_imports_count`, `missing_imports_count`, `orders_count`, `partial_imports_count`, `shipments_count`, `sla_exceptions_count`, `window_days`. Local service imports: `apps.fulfillment.models.DeliveryDateEvidence`, `apps.fulfillment.models.LateFulfillmentImportException`, `apps.fulfillment.models.MissingFulfillmentImportException`, `apps.fulfillment.models.PartialFulfillmentResponseException`, `apps.routing.models.Order`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `aggregations`: `apps.shared_api.ActivitySummaryWindowViewSet.aggregations` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/AnalyticsPage.tsx](../../../../frontend/src/pages/AnalyticsPage.tsx).

## apps.shared_api.DataFreshnessMarkerViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `analytics.DataFreshnessMarker`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"analytics.summary.read","retrieve":"analytics.summary.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.DataFreshnessMarkerSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","source_module","source_event_type","last_processed_at","last_source_record_reference","is_stale","updated_at"]`. Read-only fields: `["id","last_processed_at","updated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/analytics/freshness-markers/` | `list` |
| GET | `/api/v1/analytics/freshness-markers/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/AnalyticsPage.tsx](../../../../frontend/src/pages/AnalyticsPage.tsx).

## apps.shared_api.ReportingMetricViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `analytics.ReportingMetric`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"analytics.metrics.list","retrieve":"analytics.metrics.read","create":"analytics.metrics.manage","update":"analytics.metrics.manage","partial_update":"analytics.metrics.manage","destroy":"analytics.metrics.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.ReportingMetricSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","code","label","source_module","aggregation_method","is_active"]`. Read-only fields: `["id"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/analytics/metrics/` | `list` |
| POST | `/api/v1/analytics/metrics/` | `create` |
| GET | `/api/v1/analytics/metrics/{pk}/` | `retrieve` |
| PUT | `/api/v1/analytics/metrics/{pk}/` | `update` |
| PATCH | `/api/v1/analytics/metrics/{pk}/` | `partial_update` |
| DELETE | `/api/v1/analytics/metrics/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/AnalyticsPage.tsx](../../../../frontend/src/pages/AnalyticsPage.tsx).

