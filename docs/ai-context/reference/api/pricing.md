# pricing — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.pricing.api.BuyerFacingPriceViewSet

Handler: [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"pricing.buyer_price.list","retrieve":"pricing.buyer_price.list"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.pricing.api.BuyerFacingPriceSerializer` at [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py).

Serializer fields: `["id","product_reference","product_name","sku","channel","buyer_facing_price","currency","bindability_status","valid_from","is_current"]`. Read-only fields: `["id","product_reference","product_name","sku","channel","buyer_facing_price","currency","bindability_status","valid_from","is_current"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/pricing/buyer-prices/` | `list` |
| GET | `/api/v1/pricing/buyer-prices/{pk}/` | `retrieve` |

- `list`: `apps.pricing.api.BuyerFacingPriceViewSet.list` in [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `apps.pricing.api.BuyerFacingPriceViewSet.retrieve` in [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/PricingPage.tsx](../../../../frontend/src/pages/PricingPage.tsx).

## apps.pricing.api.EffectivePriceSnapshotViewSet

Handler: [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Declared queryset model: `pricing.EffectivePriceSnapshot`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"pricing.snapshot.list","retrieve":"pricing.snapshot.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.pricing.api.EffectivePriceSnapshotSerializer` at [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py).

Serializer fields: `["id","product_reference","channel","vendor_wholesale_price","vendor_side_commission_amount","buyer_side_commission_amount","buyer_facing_price","currency","bindability_status","procurement_bindable","invoice_bindable","valid_from","valid_to","is_current","superseded_by_snapshot","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/pricing/snapshots/` | `list` |
| GET | `/api/v1/pricing/snapshots/for_product/` | `for_product` |
| GET | `/api/v1/pricing/snapshots/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `for_product`: `apps.pricing.api.EffectivePriceSnapshotViewSet.for_product` in [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Direct request/query keys: `product_id`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/PricingPage.tsx](../../../../frontend/src/pages/PricingPage.tsx).

## apps.pricing.api.MapExceptionViewSet

Handler: [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Declared queryset model: `pricing.MapException`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"pricing.exception.list","retrieve":"pricing.exception.read","create":"pricing.exception.create","update":"pricing.exception.update","partial_update":"pricing.exception.update","destroy":"pricing.exception.delete"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.pricing.api.MapExceptionSerializer` at [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py).

Serializer fields: `["id","vendor_company_reference","product_reference","sku","buyer_company_reference","approved_minimum_price","start_date","end_date","status","approval_notes","created_at","updated_at"]`. Read-only fields: `["id","created_at","updated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/pricing/exceptions/` | `list` |
| POST | `/api/v1/pricing/exceptions/` | `create` |
| GET | `/api/v1/pricing/exceptions/{pk}/` | `retrieve` |
| PUT | `/api/v1/pricing/exceptions/{pk}/` | `update` |
| PATCH | `/api/v1/pricing/exceptions/{pk}/` | `partial_update` |
| DELETE | `/api/v1/pricing/exceptions/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/StubPages.tsx](../../../../frontend/src/pages/StubPages.tsx).

## apps.pricing.api.PricingProfileViewSet

Handler: [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Declared queryset model: `pricing.PricingProfile`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"pricing.profile.list","retrieve":"pricing.profile.read","create":"pricing.profile.create","update":"pricing.profile.update","partial_update":"pricing.profile.update","destroy":"pricing.profile.delete"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.pricing.api.PricingProfileSerializer` at [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py).

Serializer fields: `["id","vendor_company_reference","buyer_company_reference","channel","status","vendor_side_commission_rate","buyer_side_commission_rate","markup_rate","currency","rounding_rule","order_bindable","procurement_bindable","effective_from","effective_to","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/pricing/profiles/` | `list` |
| POST | `/api/v1/pricing/profiles/` | `create` |
| GET | `/api/v1/pricing/profiles/{pk}/` | `retrieve` |
| PUT | `/api/v1/pricing/profiles/{pk}/` | `update` |
| PATCH | `/api/v1/pricing/profiles/{pk}/` | `partial_update` |
| DELETE | `/api/v1/pricing/profiles/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/PricingPage.tsx](../../../../frontend/src/pages/PricingPage.tsx).

## apps.pricing.api.ShippingFeeSnapshotViewSet

Handler: [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Declared queryset model: `pricing.ShippingFeeSnapshot`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"pricing.shipping_fee_snapshot.list","retrieve":"pricing.shipping_fee_snapshot.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.pricing.api.ShippingFeeSnapshotSerializer` at [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py).

Serializer fields: `["id","source_fee","vendor_company_reference","region_code","fee_amount","fee_type","currency","order_reference","routed_suborder_reference","applied_amount","created_at"]`. Read-only fields: `["id","source_fee","vendor_company_reference","region_code","fee_amount","fee_type","currency","order_reference","routed_suborder_reference","applied_amount","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/pricing/shipping-fee-snapshots/` | `list` |
| GET | `/api/v1/pricing/shipping-fee-snapshots/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/RegionalPage.tsx](../../../../frontend/src/pages/RegionalPage.tsx).

## apps.pricing.api.VendorCommissionAgreementViewSet

Handler: [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Declared queryset model: `pricing.VendorCommissionAgreement`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"pricing.agreement.list","retrieve":"pricing.agreement.read","create":"pricing.agreement.create","update":"pricing.agreement.update","partial_update":"pricing.agreement.update","destroy":"pricing.agreement.delete","approve":"pricing.agreement.approve"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.pricing.api.VendorCommissionAgreementSerializer` at [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py).

Serializer fields: `["id","vendor_company_reference","commission_percentage","status","approved_at","approved_by","created_at","updated_at"]`. Read-only fields: `["id","created_at","updated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/pricing/agreements/` | `list` |
| POST | `/api/v1/pricing/agreements/` | `create` |
| GET | `/api/v1/pricing/agreements/{pk}/` | `retrieve` |
| PUT | `/api/v1/pricing/agreements/{pk}/` | `update` |
| PATCH | `/api/v1/pricing/agreements/{pk}/` | `partial_update` |
| DELETE | `/api/v1/pricing/agreements/{pk}/` | `destroy` |
| POST | `/api/v1/pricing/agreements/{pk}/approve/` | `approve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `approve`: `apps.pricing.api.VendorCommissionAgreementViewSet.approve` in [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.pricing.api.VendorRegionalShippingFeeViewSet

Handler: [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py). Declared queryset model: `pricing.VendorRegionalShippingFee`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"pricing.shipping_fee.list","retrieve":"pricing.shipping_fee.read","create":"pricing.shipping_fee.create","update":"pricing.shipping_fee.update","partial_update":"pricing.shipping_fee.update","destroy":"pricing.shipping_fee.delete"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.pricing.api.VendorRegionalShippingFeeSerializer` at [backend/apps/pricing/api.py](../../../../backend/apps/pricing/api.py).

Serializer fields: `["id","vendor_company_reference","region_code","fee_amount","currency","fee_type","status","effective_from","effective_to","superseded_by","created_by","created_at","updated_at"]`. Read-only fields: `["id","created_by","created_at","updated_at"]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/pricing/shipping-fees/` | `list` |
| POST | `/api/v1/pricing/shipping-fees/` | `create` |
| GET | `/api/v1/pricing/shipping-fees/{pk}/` | `retrieve` |
| PUT | `/api/v1/pricing/shipping-fees/{pk}/` | `update` |
| PATCH | `/api/v1/pricing/shipping-fees/{pk}/` | `partial_update` |
| DELETE | `/api/v1/pricing/shipping-fees/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/regional/ShippingFeeDialog.tsx](../../../../frontend/src/pages/regional/ShippingFeeDialog.tsx), [frontend/src/pages/RegionalPage.tsx](../../../../frontend/src/pages/RegionalPage.tsx).

