# audit — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.audit.views.AuditRecordViewSet

Handler: [backend/apps/audit/views.py](../../../../backend/apps/audit/views.py). Declared queryset model: `audit.AuditRecord`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.audit.serializers.AuditRecordSerializer` at [backend/apps/audit/serializers.py](../../../../backend/apps/audit/serializers.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/audit/records/` | `list` |
| GET | `/api/v1/audit/records/{pk}/` | `retrieve` |
| GET | `/api/v1/audit/` | `list` |
| GET | `/api/v1/audit/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/dialogs/ManageProductDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/ManageProductDialog.tsx), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/DevicesPage.tsx](../../../../frontend/src/pages/DevicesPage.tsx), [frontend/src/pages/FulfillmentPage.tsx](../../../../frontend/src/pages/FulfillmentPage.tsx).

## apps.audit.views.ExportBatchViewSet

Handler: [backend/apps/audit/views.py](../../../../backend/apps/audit/views.py). Declared queryset model: `audit.FileTrackingRecord`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.audit.serializers.FileTrackingRecordSerializer` at [backend/apps/audit/serializers.py](../../../../backend/apps/audit/serializers.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/audit/export-batches/` | `list` |
| GET | `/api/v1/audit/export-batches/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.audit.views.FileTrackingRecordViewSet

Handler: [backend/apps/audit/views.py](../../../../backend/apps/audit/views.py). Declared queryset model: `audit.FileTrackingRecord`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.audit.serializers.FileTrackingRecordSerializer` at [backend/apps/audit/serializers.py](../../../../backend/apps/audit/serializers.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/audit/file-tracking/` | `list` |
| GET | `/api/v1/audit/file-tracking/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.audit.views.ImportBatchViewSet

Handler: [backend/apps/audit/views.py](../../../../backend/apps/audit/views.py). Declared queryset model: `audit.FileTrackingRecord`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.audit.serializers.FileTrackingRecordSerializer` at [backend/apps/audit/serializers.py](../../../../backend/apps/audit/serializers.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/audit/import-batches/` | `list` |
| GET | `/api/v1/audit/import-batches/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

