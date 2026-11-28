# routing — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.routing.api.OrderViewSet

Handler: [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"routing.order.list","retrieve":"routing.order.read","create":"routing.order.create","update":"routing.order.update","partial_update":"routing.order.update","destroy":"routing.order.cancel","suborders":"routing.order.read","lines":"routing.order.read","import_shipping":"routing.order.update","manual_export":"routing.export.manage","update_shipping":"routing.order.update"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/routing/orders/` | `list` |
| POST | `/api/v1/routing/orders/` | `create` |
| POST | `/api/v1/routing/orders/import-shipping/` | `import_shipping` |
| POST | `/api/v1/routing/orders/manual-export/` | `manual_export` |
| GET | `/api/v1/routing/orders/{pk}/` | `retrieve` |
| PUT | `/api/v1/routing/orders/{pk}/` | `update` |
| PATCH | `/api/v1/routing/orders/{pk}/` | `partial_update` |
| DELETE | `/api/v1/routing/orders/{pk}/` | `destroy` |
| GET | `/api/v1/routing/orders/{pk}/lines/` | `lines` |
| GET | `/api/v1/routing/orders/{pk}/suborders/` | `suborders` |
| PATCH | `/api/v1/routing/orders/{pk}/update-shipping/` | `update_shipping` |

- `list`: `apps.routing.api.OrderViewSet.list` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `import_shipping`: `apps.routing.api.OrderViewSet.import_shipping` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: `confirm`, `file`, `tracking_url`. Direct Response dictionary keys: `applied_count`, `confirm_required`, `detail`, `errors`, `review_required_count`, `rows`, `skipped_count`, `success_count`, `summary`. Local service imports: `apps.catalog.models.Product`, `apps.fulfillment.models.BuyerSignalStatus`, `apps.fulfillment.models.BuyerUpdateKind`, `apps.fulfillment.models.BuyerUpdateReadySignal`, `apps.fulfillment.models.FulfillmentHandoff`, `apps.fulfillment.models.VendorShippingImportLog`, `apps.fulfillment.tracking.ensure_tracker`, `apps.fulfillment.tracking.sync_order_progress`, `apps.procurement.models.PurchaseOrderLine`, `apps.routing.models.RoutingStatus`, `apps.tenant.models.Company`, `apps.tenant.models.CompanyStatus`.
- `manual_export`: `apps.routing.api.OrderViewSet.manual_export` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: `confirm`, `suborder_ids`. Direct Response dictionary keys: `detail`, `preview`. Local service imports: `apps.catalog.models.Product`, `apps.procurement.models.PurchaseOrderLine`, `apps.routing.models.RoutedSuborder`, `apps.routing.tasks.trigger_vendor_export`, `apps.routing.tasks.validate_line_eligibility`, `apps.tenant.models.Company`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `lines`: `apps.routing.api.OrderViewSet.lines` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.catalog.models.Product`, `apps.media.models.MediaAsset`, `apps.procurement.models.PurchaseOrderLine`, `apps.tenant.models.Company`.
- `suborders`: `apps.routing.api.OrderViewSet.suborders` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update_shipping`: `apps.routing.api.OrderViewSet.update_shipping` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `accepted_fields`, `detail`, `order_id`, `shipping`, `suborders_updated`. Local service imports: `apps.routing.models.RoutingStatus`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/OrdersPage.tsx](../../../../frontend/src/pages/OrdersPage.tsx), [frontend/src/pages/TelcoCellularPage.tsx](../../../../frontend/src/pages/TelcoCellularPage.tsx).

## apps.routing.api.VendorExportScheduleViewSet

Handler: [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Declared queryset model: `routing.VendorExportSchedule`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"routing.export.list","retrieve":"routing.export.read","create":"routing.export.manage","update":"routing.export.manage","partial_update":"routing.export.manage","destroy":"routing.export.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.routing.api.VendorExportScheduleSerializer` at [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py).

Serializer fields: `["id","vendor_company_reference","status","delivery_method","schedule_cron","window_duration_minutes","schedule_timezone","effective_from","effective_to","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/routing/export-schedules/` | `list` |
| POST | `/api/v1/routing/export-schedules/` | `create` |
| GET | `/api/v1/routing/export-schedules/{pk}/` | `retrieve` |
| PUT | `/api/v1/routing/export-schedules/{pk}/` | `update` |
| PATCH | `/api/v1/routing/export-schedules/{pk}/` | `partial_update` |
| DELETE | `/api/v1/routing/export-schedules/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.routing.api.VendorExportWindowViewSet

Handler: [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Declared queryset model: `routing.VendorExportWindow`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"routing.export.list","retrieve":"routing.export.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.routing.api.VendorExportWindowSerializer` at [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py).

Serializer fields: `["id","schedule","vendor_company_reference","status","opens_at","closes_at","item_count","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/routing/export-windows/` | `list` |
| GET | `/api/v1/routing/export-windows/{pk}/` | `retrieve` |
| GET | `/api/v1/routing/export-windows/{pk}/delivery_evidence/` | `delivery_evidence` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `delivery_evidence`: `apps.routing.api.VendorExportWindowViewSet.delivery_evidence` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.routing.api.VendorOrderExportLogViewSet

Handler: [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Declared queryset model: `routing.VendorOrderExportLog`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"routing.export.list","retrieve":"routing.export.read","reexport":"routing.export.manage","audit_download":"routing.export.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.routing.api.VendorOrderExportLogSerializer` at [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py).

Serializer fields: `["id","vendor_company_reference","buyer_company_reference","window","filename","sent_at","order_count","suborder_count","sending_method","recipients","trigger_type","triggered_by","triggered_by_name","status_before","status_after","csv_backup","email_send_result","is_reexport","original_log","audit_reference","vendor_name","buyer_name","reexport_attempts","reexport_count","last_reexport_status","last_reexported_at","last_reexported_by_name","triggered_by_user_name_snapshot","triggered_by_company_name_snapshot","triggered_by_role_snapshot","ip_address","user_agent","correlation_id","system_process_name","system_process_id","system_job_id","system_schedule_desc"]`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: `validate_trigger_type`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/routing/export-logs/` | `list` |
| GET | `/api/v1/routing/export-logs/{pk}/` | `retrieve` |
| POST | `/api/v1/routing/export-logs/{pk}/audit_download/` | `audit_download` |
| POST | `/api/v1/routing/export-logs/{pk}/reexport/` | `reexport` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `audit_download`: `apps.routing.api.VendorOrderExportLogViewSet.audit_download` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`. Local service imports: `apps.routing.models.VendorOrderReexportAttempt`, `apps.tenant.services.check_access`.
- `reexport`: `apps.routing.api.VendorOrderExportLogViewSet.reexport` in [backend/apps/routing/api.py](../../../../backend/apps/routing/api.py). Direct request/query keys: `explanation`, `reason`. Direct Response dictionary keys: `detail`. Local service imports: `apps.integration.services.send_operational_vendor_email`, `apps.notification.models.NotificationChannel`, `apps.notification.models.NotificationRequest`, `apps.notification.models.NotificationTemplate`, `apps.notification.models.TemplateStatus`, `apps.notification.services.create_notification_request`, `apps.routing.models.ExportWindowStatus`, `apps.routing.models.VendorOrderReexportAttempt`, `apps.tenant.models.Company`, `apps.tenant.models.User`, `apps.tenant.services.check_access`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx).

