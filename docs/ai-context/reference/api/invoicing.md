# invoicing — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.invoicing.api.InvoiceExceptionRecordViewSet

Handler: [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Declared queryset model: `invoicing.InvoiceExceptionRecord`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"invoicing.exception.list","retrieve":"invoicing.exception.read","create":"invoicing.exception.create","update":"invoicing.exception.manage","partial_update":"invoicing.exception.manage","destroy":"invoicing.exception.manage","resolve":"invoicing.exception.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.invoicing.api.InvoiceExceptionRecordSerializer` at [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py).

Serializer fields: `["id","run","invoice","exception_kind","description","source_reference","is_blocking","resolved","resolved_at","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/invoicing/exceptions/` | `list` |
| POST | `/api/v1/invoicing/exceptions/` | `create` |
| GET | `/api/v1/invoicing/exceptions/{pk}/` | `retrieve` |
| PUT | `/api/v1/invoicing/exceptions/{pk}/` | `update` |
| PATCH | `/api/v1/invoicing/exceptions/{pk}/` | `partial_update` |
| DELETE | `/api/v1/invoicing/exceptions/{pk}/` | `destroy` |
| POST | `/api/v1/invoicing/exceptions/{pk}/resolve/` | `resolve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `resolve`: `apps.invoicing.api.InvoiceExceptionRecordViewSet.resolve` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.invoicing.api.InvoiceRunViewSet

Handler: [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Declared queryset model: `invoicing.InvoiceRun`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"invoicing.run.list","retrieve":"invoicing.run.read","create":"invoicing.run.create","update":"invoicing.run.manage","partial_update":"invoicing.run.manage","destroy":"invoicing.run.manage","exceptions":"invoicing.run.read","reports":"invoicing.run.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.invoicing.api.InvoiceRunSerializer` at [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py).

Serializer fields: `["id","status","company_scope_reference","run_label","idempotency_key","scheduled_for","started_at","completed_at","error_detail","created_at"]`. Read-only fields: `["id","created_at","started_at","completed_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/invoicing/runs/` | `list` |
| POST | `/api/v1/invoicing/runs/` | `create` |
| GET | `/api/v1/invoicing/runs/{pk}/` | `retrieve` |
| PUT | `/api/v1/invoicing/runs/{pk}/` | `update` |
| PATCH | `/api/v1/invoicing/runs/{pk}/` | `partial_update` |
| DELETE | `/api/v1/invoicing/runs/{pk}/` | `destroy` |
| GET | `/api/v1/invoicing/runs/{pk}/exceptions/` | `exceptions` |
| GET | `/api/v1/invoicing/runs/{pk}/reports/` | `reports` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `exceptions`: `apps.invoicing.api.InvoiceRunViewSet.exceptions` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: `resolved`. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `reports`: `apps.invoicing.api.InvoiceRunViewSet.reports` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/InvoicingPage.tsx](../../../../frontend/src/pages/InvoicingPage.tsx).

## apps.invoicing.api.InvoiceViewSet

Handler: [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Declared queryset model: `invoicing.Invoice`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"invoicing.invoice.list","retrieve":"invoicing.invoice.read","create":"invoicing.invoice.create","create_manual":"invoicing.invoice.create","update":"invoicing.invoice.update","partial_update":"invoicing.invoice.update","destroy":"invoicing.invoice.manage","lines":"invoicing.invoice.read","adjustments":"invoicing.invoice.read","reconciliation":"invoicing.reconciliation.read","issue":"invoicing.invoice.issue"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/invoicing/invoices/` | `list` |
| POST | `/api/v1/invoicing/invoices/` | `create` |
| POST | `/api/v1/invoicing/invoices/create-from-orders/` | `create_from_orders` |
| POST | `/api/v1/invoicing/invoices/create-manual/` | `create_manual` |
| GET | `/api/v1/invoicing/invoices/preview-from-orders/` | `preview_from_orders` |
| GET | `/api/v1/invoicing/invoices/{pk}/` | `retrieve` |
| PUT | `/api/v1/invoicing/invoices/{pk}/` | `update` |
| PATCH | `/api/v1/invoicing/invoices/{pk}/` | `partial_update` |
| DELETE | `/api/v1/invoicing/invoices/{pk}/` | `destroy` |
| GET | `/api/v1/invoicing/invoices/{pk}/adjustments/` | `adjustments` |
| POST | `/api/v1/invoicing/invoices/{pk}/adjustments/` | `adjustments` |
| POST | `/api/v1/invoicing/invoices/{pk}/issue/` | `issue` |
| GET | `/api/v1/invoicing/invoices/{pk}/lines/` | `lines` |
| GET | `/api/v1/invoicing/invoices/{pk}/reconciliation/` | `reconciliation` |
| POST | `/api/v1/invoicing/invoices/{pk}/reconciliation/` | `reconciliation` |
| POST | `/api/v1/invoicing/invoices/{pk}/transition/` | `transition` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create_from_orders`: `apps.invoicing.api.InvoiceViewSet.create_from_orders` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`, `errors`, `exceptions`. Local service imports: `apps.catalog.models.Product`, `apps.procurement.models.POStatus`, `apps.procurement.models.PurchaseOrder`, `apps.procurement.models.PurchaseOrderLine`.
- `create_manual`: `apps.invoicing.api.InvoiceViewSet.create_manual` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`, `errors`. Local service imports: none declared.
- `preview_from_orders`: `apps.invoicing.api.InvoiceViewSet.preview_from_orders` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: `buyer_id`, `period_end`, `period_start`. Direct Response dictionary keys: `buyer`, `error`, `errors`, `estimated_total`, `orders`, `orders_count`, `period_end`, `period_start`, `total_lines`, `zero_price_lines`. Local service imports: `apps.catalog.models.Product`, `apps.procurement.models.POStatus`, `apps.procurement.models.PurchaseOrder`, `apps.procurement.models.PurchaseOrderLine`, `apps.tenant.models.Company`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `adjustments`: `apps.invoicing.api.InvoiceViewSet.adjustments` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `issue`: `apps.invoicing.api.InvoiceViewSet.issue` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `lines`: `apps.invoicing.api.InvoiceViewSet.lines` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `reconciliation`: `apps.invoicing.api.InvoiceViewSet.reconciliation` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `transition`: `apps.invoicing.api.InvoiceViewSet.transition` in [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Direct request/query keys: `status`. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/InvoicingPage.tsx](../../../../frontend/src/pages/InvoicingPage.tsx).

## apps.invoicing.api.ReconciliationMatchResultViewSet

Handler: [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py). Declared queryset model: `invoicing.VendorReconciliationMatchResult`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"invoicing.reconciliation.read","retrieve":"invoicing.reconciliation.read","create":"invoicing.reconciliation.upload","update":"invoicing.reconciliation.manage","partial_update":"invoicing.reconciliation.manage","destroy":"invoicing.reconciliation.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.invoicing.api.ReconciliationMatchResultSerializer` at [backend/apps/invoicing/api.py](../../../../backend/apps/invoicing/api.py).

Serializer fields: `["id","upload_job","invoice_line","match_result_status","cixci_line_total","vendor_reported_total","vendor_line_reference","variance_amount","resolution_note","resolved_at","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/invoicing/match-results/` | `list` |
| POST | `/api/v1/invoicing/match-results/` | `create` |
| GET | `/api/v1/invoicing/match-results/{pk}/` | `retrieve` |
| PUT | `/api/v1/invoicing/match-results/{pk}/` | `update` |
| PATCH | `/api/v1/invoicing/match-results/{pk}/` | `partial_update` |
| DELETE | `/api/v1/invoicing/match-results/{pk}/` | `destroy` |

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

