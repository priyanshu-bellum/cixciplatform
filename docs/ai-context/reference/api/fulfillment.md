# fulfillment — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.fulfillment.api.BuyerShipmentTrackingViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.handoff.list","retrieve":"fulfillment.handoff.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.BuyerShipmentSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `["id","order_id","routed_suborder_reference","buyer_order_number","vendor_name","vendor_company_reference","status","order_status","tracking_source","tracking_source_label","tracking","tracking_events","shipping_carrier","tracking_number","additional_tracking","vendor_order_number","shipped_date","delivered_date","easypost_tracker_id","created_at","updated_at"]`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/buyer-shipments/` | `list` |
| GET | `/api/v1/fulfillment/buyer-shipments/{pk}/` | `retrieve` |

- `list`: `apps.fulfillment.api.BuyerShipmentTrackingViewSet.list` in [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.routing.models.RoutedSuborder`, `apps.tenant.models.Company`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.fulfillment.api.BuyerUpdateSignalViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.buyer_signal.list","retrieve":"fulfillment.buyer_signal.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.BuyerUpdateSignalSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `["id","order_reference","buyer_reference","update_kind","status","expected_vendor_count","confirmed_vendor_count","all_vendors_confirmed","dispatched_at","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/buyer-signals/` | `list` |
| GET | `/api/v1/fulfillment/buyer-signals/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.fulfillment.api.FulfillmentHandoffViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.handoff.list","retrieve":"fulfillment.handoff.read","create":"fulfillment.handoff.create","update":"fulfillment.handoff.update","partial_update":"fulfillment.handoff.update","destroy":"fulfillment.handoff.manage","sla_evaluations":"fulfillment.sla.read","delivery_dates":"fulfillment.handoff.read","debug_order":"fulfillment.handoff.list"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.FulfillmentHandoffSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `["id","routed_suborder_reference","vendor_company_reference","company_scope_reference","status","tracking_source","tracking","delivery_evidence_reference","buyer_order_number","buyer_id","vendor_order","shipping_carrier","shipping_tracking_number","order_status","shipped_date","delivered_date","vendor_order_number","tracking_number","additional_tracking","created_at","updated_at"]`. Read-only fields: `["id","created_at","additional_tracking"]`. Excluded: `[]`. Validation methods: `validate_status`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/handoffs/` | `list` |
| POST | `/api/v1/fulfillment/handoffs/` | `create` |
| GET | `/api/v1/fulfillment/handoffs/debug-order/` | `debug_order` |
| POST | `/api/v1/fulfillment/handoffs/import-shipping/` | `import_shipping` |
| GET | `/api/v1/fulfillment/handoffs/{pk}/` | `retrieve` |
| PUT | `/api/v1/fulfillment/handoffs/{pk}/` | `update` |
| PATCH | `/api/v1/fulfillment/handoffs/{pk}/` | `partial_update` |
| DELETE | `/api/v1/fulfillment/handoffs/{pk}/` | `destroy` |
| GET | `/api/v1/fulfillment/handoffs/{pk}/delivery_dates/` | `delivery_dates` |
| GET | `/api/v1/fulfillment/handoffs/{pk}/sla_evaluations/` | `sla_evaluations` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `debug_order`: `apps.fulfillment.api.FulfillmentHandoffViewSet.debug_order` in [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Direct request/query keys: `order_id`. Direct Response dictionary keys: `lines`, `order_id`. Local service imports: `apps.catalog.models.Product`, `apps.procurement.models.PurchaseOrderLine`.
- `import_shipping`: `apps.fulfillment.api.FulfillmentHandoffViewSet.import_shipping` in [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Direct request/query keys: `confirm`, `file`. Direct Response dictionary keys: `confirm_required`, `detail`, `errors`, `rejected_count`, `rows`, `skipped_count`, `success_count`, `summary`. Local service imports: `apps.catalog.models.Product`, `apps.fulfillment.models.BuyerSignalStatus`, `apps.fulfillment.models.BuyerUpdateKind`, `apps.fulfillment.models.BuyerUpdateReadySignal`, `apps.procurement.models.PurchaseOrderLine`, `apps.routing.models.RoutedSuborder`, `apps.routing.models.RoutingStatus`, `apps.tenant.models.Company`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `delivery_dates`: `apps.fulfillment.api.FulfillmentHandoffViewSet.delivery_dates` in [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `sla_evaluations`: `apps.fulfillment.api.FulfillmentHandoffViewSet.sla_evaluations` in [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx), [frontend/src/pages/TelcoCellularPage.tsx](../../../../frontend/src/pages/TelcoCellularPage.tsx).

## apps.fulfillment.api.ReturnRequestViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `fulfillment.ReturnRequest`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.return.list","retrieve":"fulfillment.return.read","create":"fulfillment.return.create","update":"fulfillment.return.update","partial_update":"fulfillment.return.update","destroy":"fulfillment.return.manage","import_returns":"fulfillment.return.update","export_returns_csv":"fulfillment.return.list"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.ReturnRequestSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/return-requests/` | `list` |
| POST | `/api/v1/fulfillment/return-requests/` | `create` |
| GET | `/api/v1/fulfillment/return-requests/export-csv/` | `export_returns_csv` |
| POST | `/api/v1/fulfillment/return-requests/import-returns/` | `import_returns` |
| GET | `/api/v1/fulfillment/return-requests/{pk}/` | `retrieve` |
| PUT | `/api/v1/fulfillment/return-requests/{pk}/` | `update` |
| PATCH | `/api/v1/fulfillment/return-requests/{pk}/` | `partial_update` |
| DELETE | `/api/v1/fulfillment/return-requests/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `export_returns_csv`: `apps.fulfillment.api.ReturnRequestViewSet.export_returns_csv` in [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.audit.models.AuditRecord`, `apps.audit.models.EvidenceRecord`, `apps.audit.models.FileDirection`, `apps.audit.models.FileLifecycleStatus`, `apps.audit.models.FilePurpose`, `apps.audit.models.FileTrackingRecord`, `apps.notification.models.NotificationChannel`, `apps.notification.models.NotificationClassification`, `apps.notification.models.NotificationRequest`, `apps.tenant.models.Company`.
- `import_returns`: `apps.fulfillment.api.ReturnRequestViewSet.import_returns` in [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Direct request/query keys: `confirm`, `file`. Direct Response dictionary keys: `confirm_required`, `detail`, `errors`, `rejected_count`, `review_required`, `review_required_count`, `rows`, `save_errors`, `skipped_count`, `success_count`, `summary`. Local service imports: `apps.routing.models.RoutedSuborder`, `apps.tenant.models.Company`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx), [frontend/src/pages/TelcoCellularPage.tsx](../../../../frontend/src/pages/TelcoCellularPage.tsx).

## apps.fulfillment.api.SLAEvaluationRecordViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.sla.list","retrieve":"fulfillment.sla.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.SLAEvaluationRecordSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `["id","handoff","sla_policy","delivery_evidence_reference","expected_response_by","fulfillment_import_received_timestamp","outcome","evaluated_at","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/sla-evaluations/` | `list` |
| GET | `/api/v1/fulfillment/sla-evaluations/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx).

## apps.fulfillment.api.SLAOverrideViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `fulfillment.SLAOverrideExcuseEvidence`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.sla.list","retrieve":"fulfillment.sla.read","create":"fulfillment.sla.override"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.SLAOverrideEvidenceSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `["id","sla_evaluation","exception_type","exception_reference","override_reason","override_category","actor_reference","reversal_reference","is_reversal","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/sla-overrides/` | `list` |
| POST | `/api/v1/fulfillment/sla-overrides/` | `create` |
| GET | `/api/v1/fulfillment/sla-overrides/{pk}/` | `retrieve` |
| PUT | `/api/v1/fulfillment/sla-overrides/{pk}/` | `update` |
| PATCH | `/api/v1/fulfillment/sla-overrides/{pk}/` | `partial_update` |
| DELETE | `/api/v1/fulfillment/sla-overrides/{pk}/` | `destroy` |

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

## apps.fulfillment.api.SLAPolicyViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `fulfillment.VendorFulfillmentResponseSLAPolicy`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.sla.list","retrieve":"fulfillment.sla.read","create":"fulfillment.sla.manage","update":"fulfillment.sla.manage","partial_update":"fulfillment.sla.manage","destroy":"fulfillment.sla.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.SLAPolicySerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `["id","vendor_company_reference","status","response_window_hours","partial_threshold_percent","effective_from","effective_to","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/sla-policies/` | `list` |
| POST | `/api/v1/fulfillment/sla-policies/` | `create` |
| GET | `/api/v1/fulfillment/sla-policies/{pk}/` | `retrieve` |
| PUT | `/api/v1/fulfillment/sla-policies/{pk}/` | `update` |
| PATCH | `/api/v1/fulfillment/sla-policies/{pk}/` | `partial_update` |
| DELETE | `/api/v1/fulfillment/sla-policies/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx).

## apps.fulfillment.api.VendorReturnImportLogViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `fulfillment.VendorReturnImportLog`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.return.list","retrieve":"fulfillment.return.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.VendorReturnImportLogSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/return-import-logs/` | `list` |
| GET | `/api/v1/fulfillment/return-import-logs/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx).

## apps.fulfillment.api.VendorShippingImportLogViewSet

Handler: [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py). Declared queryset model: `fulfillment.VendorShippingImportLog`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"fulfillment.handoff.list","retrieve":"fulfillment.handoff.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.api.VendorShippingImportLogSerializer` at [backend/apps/fulfillment/api.py](../../../../backend/apps/fulfillment/api.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/shipping-import-logs/` | `list` |
| GET | `/api/v1/fulfillment/shipping-import-logs/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx).

## apps.fulfillment.tracking_api.CarrierTrackingViewSet

Handler: [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Declared queryset model: `fulfillment.CarrierTrackingConfig`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.fulfillment.tracking_api.CarrierTrackingConfigSerializer` at [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py).

Serializer fields: `["id","provider","enabled","mode","api_key","has_api_key","api_key_hint","has_webhook_secret","provider_webhook_id","webhook_path","track_vendor_api_shipments","carrier_map","poll_interval_minutes","last_verified_at","last_error","updated_at"]`. Read-only fields: `["id","provider","api_key_hint","provider_webhook_id","last_verified_at","last_error","updated_at"]`. Excluded: `[]`. Validation methods: `validate_mode`, `validate_poll_interval_minutes`, `validate_carrier_map`, `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/fulfillment/carrier-tracking/` | `list` |
| PATCH | `/api/v1/fulfillment/carrier-tracking/config/` | `configure` |
| POST | `/api/v1/fulfillment/carrier-tracking/generate-webhook-secret/` | `generate_webhook_secret` |
| POST | `/api/v1/fulfillment/carrier-tracking/register-webhook/` | `register_webhook` |
| POST | `/api/v1/fulfillment/carrier-tracking/trackers/{tracker_id}/retry/` | `retry_tracker` |
| POST | `/api/v1/fulfillment/carrier-tracking/sync/` | `sync` |
| POST | `/api/v1/fulfillment/carrier-tracking/test/` | `test_connection` |
| GET | `/api/v1/fulfillment/carrier-tracking/trackers/` | `trackers` |

- `list`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.list` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `configure`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.configure` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `generate_webhook_secret`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.generate_webhook_secret` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`, `webhook_secret`. Local service imports: none declared.
- `register_webhook`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.register_webhook` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: `origin`. Direct Response dictionary keys: `code`, `detail`, `ok`. Local service imports: `apps.integration.catalog_transport.CatalogTransportError`, `apps.integration.catalog_transport.public_target`.
- `retry_tracker`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.retry_tracker` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`, `ok`. Local service imports: none declared.
- `sync`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.sync` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `test_connection`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.test_connection` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `code`, `detail`, `ok`. Local service imports: none declared.
- `trackers`: `apps.fulfillment.tracking_api.CarrierTrackingViewSet.trackers` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: `search`, `state`. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/integration/CarrierTrackingPanel.tsx](../../../../frontend/src/pages/integration/CarrierTrackingPanel.tsx).

## apps.fulfillment.tracking_api.CarrierWebhookView

Handler: [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: none declared. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/v1/fulfillment/carrier-webhooks/{provider}/{receiver_id}/` | `post` |

- `post`: `apps.fulfillment.tracking_api.CarrierWebhookView.post` in [backend/apps/fulfillment/tracking_api.py](../../../../backend/apps/fulfillment/tracking_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

