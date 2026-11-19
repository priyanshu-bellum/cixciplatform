# procurement — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.shared_api.PurchaseOrderViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `procurement.PurchaseOrder`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"procurement.po.list","retrieve":"procurement.po.read","create":"procurement.po.create","update":"procurement.po.update","partial_update":"procurement.po.update","destroy":"procurement.po.manage","approve":"procurement.po.approve","lines":"procurement.po.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.PurchaseOrderSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","company_scope_reference","buyer_reference","vendor_company_reference","status","pricing_snapshot_reference","po_number","currency","total_amount","approved_at","created_at"]`. Read-only fields: `["id","company_scope_reference","buyer_reference","created_at","approved_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/procurement/purchase-orders/` | `list` |
| POST | `/api/v1/procurement/purchase-orders/` | `create` |
| GET | `/api/v1/procurement/purchase-orders/{pk}/` | `retrieve` |
| PUT | `/api/v1/procurement/purchase-orders/{pk}/` | `update` |
| PATCH | `/api/v1/procurement/purchase-orders/{pk}/` | `partial_update` |
| DELETE | `/api/v1/procurement/purchase-orders/{pk}/` | `destroy` |
| POST | `/api/v1/procurement/purchase-orders/{pk}/approve/` | `approve` |
| GET | `/api/v1/procurement/purchase-orders/{pk}/lines/` | `lines` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `apps.shared_api.PurchaseOrderViewSet.create` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.catalog.models.Product`, `apps.pricing.services.create_effective_price_snapshot`, `apps.procurement.services.orchestrate_po_finalization`, `apps.tenant.models.Company`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `approve`: `apps.shared_api.PurchaseOrderViewSet.approve` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`, `status`. Local service imports: `apps.procurement.services.orchestrate_po_finalization`, `apps.tenant.services.check_access`.
- `lines`: `apps.shared_api.PurchaseOrderViewSet.lines` in [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/ProcurementPage.tsx](../../../../frontend/src/pages/ProcurementPage.tsx), [frontend/src/pages/TelcoCellularPage.tsx](../../../../frontend/src/pages/TelcoCellularPage.tsx).

