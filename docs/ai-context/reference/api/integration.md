# integration — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.catalog.offer_api.ExportMappingViewSet

Handler: [backend/apps/catalog/offer_api.py](../../../../backend/apps/catalog/offer_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"catalog.product.read","retrieve":"catalog.product.read","bind_listing":"catalog.product.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.catalog.offer_api.ExportMappingSerializer` at [backend/apps/catalog/offer_api.py](../../../../backend/apps/catalog/offer_api.py).

Serializer fields: `"__all__"`. Read-only fields: `["id","company","entity","storefront","product","supplier_reference","export_job","listing_reference","external_listing_id","external_variant_id","version","status","pricing_snapshot_reference","exported_at","superseded_at","migration_evidence"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/buyer-export-mappings/` | `list` |
| GET | `/api/v1/integration/buyer-export-mappings/{pk}/` | `retrieve` |
| POST | `/api/v1/integration/buyer-export-mappings/{pk}/bind_listing/` | `bind_listing` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `bind_listing`: `apps.catalog.offer_api.ExportMappingViewSet.bind_listing` in [backend/apps/catalog/offer_api.py](../../../../backend/apps/catalog/offer_api.py). Direct request/query keys: `external_listing_id`, `external_variant_id`, `listing_reference`, `replaces_mapping_id`. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.integration.catalog_api.VendorCatalogConnectionViewSet

Handler: [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.connection.read","retrieve":"integration.connection.read","runs":"integration.connection.read","items":"integration.connection.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.catalog_api.ConnectionSerializer` at [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py).

Serializer fields: `["id","vendor_company","label","endpoint_url","auth_type","auth_header","credential","has_credentials","config","config_version","schedule_enabled","is_retired","last_synced_at","next_sync_at","last_error_code","created_at","updated_at","last_run","saved_integration_mode"]`. Read-only fields: `["id","config_version","last_synced_at","next_sync_at","last_error_code","created_at","updated_at"]`. Excluded: `[]`. Validation methods: `validate_config`, `validate_endpoint_url`, `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/vendor-catalog-connections/` | `list` |
| POST | `/api/v1/integration/vendor-catalog-connections/` | `create` |
| GET | `/api/v1/integration/vendor-catalog-connections/template/` | `template` |
| GET | `/api/v1/integration/vendor-catalog-connections/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/vendor-catalog-connections/{pk}/` | `update` |
| PATCH | `/api/v1/integration/vendor-catalog-connections/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/vendor-catalog-connections/{pk}/` | `destroy` |
| POST | `/api/v1/integration/vendor-catalog-connections/{pk}/cancel/` | `cancel` |
| GET | `/api/v1/integration/vendor-catalog-connections/{pk}/items/` | `items` |
| POST | `/api/v1/integration/vendor-catalog-connections/{pk}/recheck/` | `recheck` |
| GET | `/api/v1/integration/vendor-catalog-connections/{pk}/runs/` | `runs` |
| POST | `/api/v1/integration/vendor-catalog-connections/{pk}/sync/` | `sync` |
| POST | `/api/v1/integration/vendor-catalog-connections/{pk}/test_connection/` | `test_connection` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `template`: `apps.integration.catalog_api.VendorCatalogConnectionViewSet.template` in [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py). Direct request/query keys: `provider`. Direct Response dictionary keys: `auth_type`, `config`, `endpoint_url`, `label`, `provider`, `supported_fields`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `cancel`: `apps.integration.catalog_api.VendorCatalogConnectionViewSet.cancel` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: `cancelled_runs`. Local service imports: none declared.
- `items`: `apps.integration.catalog_api.VendorCatalogConnectionViewSet.items` in [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py). Direct request/query keys: `paginate`, `review_required`. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `recheck`: `apps.integration.catalog_api.VendorCatalogConnectionViewSet.recheck` in [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `runs`: `apps.integration.catalog_api.VendorCatalogConnectionViewSet.runs` in [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py). Direct request/query keys: `paginate`. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `sync`: `apps.integration.catalog_api.VendorCatalogConnectionViewSet.sync` in [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `test_connection`: `apps.integration.catalog_api.VendorCatalogConnectionViewSet.test_connection` in [backend/apps/integration/catalog_api.py](../../../../backend/apps/integration/catalog_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/VendorCatalogConsole.tsx](../../../../frontend/src/components/VendorCatalogConsole.tsx), [frontend/src/pages/catalog/VendorImportReviewTab.tsx](../../../../frontend/src/pages/catalog/VendorImportReviewTab.tsx).

## apps.integration.catalog_brands_api.BrandViewSet

Handler: [backend/apps/integration/catalog_brands_api.py](../../../../backend/apps/integration/catalog_brands_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.catalog_brands_api.BrandSerializer` at [backend/apps/integration/catalog_brands_api.py](../../../../backend/apps/integration/catalog_brands_api.py).

Serializer fields: `["id","name","canonical_key","is_active","created_at"]`. Read-only fields: `["id","canonical_key","created_at"]`. Excluded: `[]`. Validation methods: `validate_name`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/catalog-brands/` | `list` |
| POST | `/api/v1/integration/catalog-brands/` | `create` |
| GET | `/api/v1/integration/catalog-brands/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/catalog-brands/{pk}/` | `update` |
| PATCH | `/api/v1/integration/catalog-brands/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/catalog-brands/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/VendorCatalogConsole.tsx](../../../../frontend/src/components/VendorCatalogConsole.tsx).

## apps.integration.catalog_brands_api.VendorBrandRelationshipViewSet

Handler: [backend/apps/integration/catalog_brands_api.py](../../../../backend/apps/integration/catalog_brands_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.catalog_brands_api.RelationshipSerializer` at [backend/apps/integration/catalog_brands_api.py](../../../../backend/apps/integration/catalog_brands_api.py).

Serializer fields: `["id","vendor_company","brand","brand_name","relationship_type","is_active","approved_at","approved_by","updated_at"]`. Read-only fields: `["id","approved_at","approved_by","updated_at"]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/vendor-brand-relationships/` | `list` |
| POST | `/api/v1/integration/vendor-brand-relationships/` | `create` |
| GET | `/api/v1/integration/vendor-brand-relationships/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/vendor-brand-relationships/{pk}/` | `update` |
| PATCH | `/api/v1/integration/vendor-brand-relationships/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/vendor-brand-relationships/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/VendorCatalogConsole.tsx](../../../../frontend/src/components/VendorCatalogConsole.tsx).

## apps.integration.commerce_api.VendorCommerceProfileViewSet

Handler: [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.connection.read","retrieve":"integration.connection.read","dispatches":"integration.connection.read","webhooks":"integration.connection.read","polls":"integration.connection.read","outbound_log":"integration.connection.read","finance_records":"integration.connection.read","return_records":"integration.connection.read","generate_outbound_secret":"integration.connection.write","rotate_outbound_secret":"integration.connection.write","cancel_order":"integration.connection.write","sync_finance":"integration.connection.write"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.commerce_api.CommerceProfileSerializer` at [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py).

Serializer fields: `["id","connection","vendor_company","adapter","mode","order_enabled","webhook_enabled","polling_enabled","outbound_enabled","outbound_url","outbound_events","config","config_version","receiver_id","webhook_secret","has_webhook_secret","has_outbound_secret","webhook_url","available_outbound_events","next_poll_at","connection_label","vendor_name","created_at","updated_at"]`. Read-only fields: `["id","config_version","receiver_id","connection_label","vendor_name","created_at","updated_at"]`. Excluded: `[]`. Validation methods: `validate_outbound_events`, `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/vendor-commerce-profiles/` | `list` |
| POST | `/api/v1/integration/vendor-commerce-profiles/` | `create` |
| GET | `/api/v1/integration/vendor-commerce-profiles/template/` | `template` |
| GET | `/api/v1/integration/vendor-commerce-profiles/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/vendor-commerce-profiles/{pk}/` | `update` |
| PATCH | `/api/v1/integration/vendor-commerce-profiles/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/vendor-commerce-profiles/{pk}/` | `destroy` |
| POST | `/api/v1/integration/vendor-commerce-profiles/{pk}/cancel-order/` | `cancel_order` |
| GET | `/api/v1/integration/vendor-commerce-profiles/{pk}/dispatches/` | `dispatches` |
| GET | `/api/v1/integration/vendor-commerce-profiles/{pk}/finance-records/` | `finance_records` |
| POST | `/api/v1/integration/vendor-commerce-profiles/{pk}/generate-outbound-secret/` | `generate_outbound_secret` |
| GET | `/api/v1/integration/vendor-commerce-profiles/{pk}/outbound-log/` | `outbound_log` |
| POST | `/api/v1/integration/vendor-commerce-profiles/{pk}/poll_now/` | `poll_now` |
| GET | `/api/v1/integration/vendor-commerce-profiles/{pk}/polls/` | `polls` |
| GET | `/api/v1/integration/vendor-commerce-profiles/{pk}/return-records/` | `return_records` |
| POST | `/api/v1/integration/vendor-commerce-profiles/{pk}/rotate-outbound-secret/` | `rotate_outbound_secret` |
| POST | `/api/v1/integration/vendor-commerce-profiles/{pk}/sync-finance/` | `sync_finance` |
| GET | `/api/v1/integration/vendor-commerce-profiles/{pk}/webhooks/` | `webhooks` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `template`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.template` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: `adapter`. Direct Response dictionary keys: `adapter`, `config`, `mode`, `supported_adapters`, `supported_modes`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `cancel_order`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.cancel_order` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: `dispatch_id`. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `dispatches`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.dispatches` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `finance_records`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.finance_records` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: `type`. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `generate_outbound_secret`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.generate_outbound_secret` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `secret`. Local service imports: none declared.
- `outbound_log`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.outbound_log` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `poll_now`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.poll_now` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `polls`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.polls` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `return_records`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.return_records` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `rotate_outbound_secret`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.rotate_outbound_secret` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `secret`. Local service imports: none declared.
- `sync_finance`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.sync_finance` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: `kind`. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `webhooks`: `apps.integration.commerce_api.VendorCommerceProfileViewSet.webhooks` in [backend/apps/integration/commerce_api.py](../../../../backend/apps/integration/commerce_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/IntegrationPage.tsx](../../../../frontend/src/pages/IntegrationPage.tsx).

## apps.integration.operations_api.DispatchViewSet

Handler: [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `integration.operations.view`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.operations_api.DispatchSerializer` at [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py).

Serializer fields: `["id","po_number","status","mode","vendor_name","suborder_id","order_id","external_order_id","provider_status","attempt_count","last_error_code","provider_updated_at","created_at","updated_at"]`. Read-only fields: `["id","po_number","status","mode","vendor_name","suborder_id","order_id","external_order_id","provider_status","attempt_count","last_error_code","provider_updated_at","created_at","updated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/operations/dispatches/` | `list` |
| GET | `/api/v1/integration/operations/dispatches/{pk}/` | `retrieve` |
| POST | `/api/v1/integration/operations/dispatches/{pk}/retry/` | `retry` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retry`: `apps.integration.operations_api.DispatchViewSet.retry` in [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `dispatch_id`, `error`, `status`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.integration.operations_api.PollRunViewSet

Handler: [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `integration.operations.view`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.operations_api.PollRunSerializer` at [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py).

Serializer fields: `["id","vendor_name","kind","status","rows_seen","processed_count","review_count","page_index","attempt_count","error_code","watermark","created_at","completed_at"]`. Read-only fields: `["id","vendor_name","kind","status","rows_seen","processed_count","review_count","page_index","attempt_count","error_code","watermark","created_at","completed_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/operations/poll-runs/` | `list` |
| POST | `/api/v1/integration/operations/poll-runs/trigger/` | `trigger` |
| GET | `/api/v1/integration/operations/poll-runs/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `trigger`: `apps.integration.operations_api.PollRunViewSet.trigger` in [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py). Direct request/query keys: `profile_id`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.integration.operations_api.WebhookReceiptViewSet

Handler: [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `integration.operations.view`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.operations_api.WebhookReceiptSerializer` at [backend/apps/integration/operations_api.py](../../../../backend/apps/integration/operations_api.py).

Serializer fields: `["id","vendor_name","provider_event_id","event_type","is_test","status","error_code","received_at","processed_at"]`. Read-only fields: `["id","vendor_name","provider_event_id","event_type","is_test","status","error_code","received_at","processed_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/operations/webhook-receipts/` | `list` |
| GET | `/api/v1/integration/operations/webhook-receipts/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.integration.storefront_api.BuyerStorefrontViewSet

Handler: [backend/apps/integration/storefront_api.py](../../../../backend/apps/integration/storefront_api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.connection.read","retrieve":"integration.connection.read","create":"integration.connection.manage","partial_update":"integration.connection.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.integration.storefront_api.BuyerStorefrontSerializer` at [backend/apps/integration/storefront_api.py](../../../../backend/apps/integration/storefront_api.py).

Serializer fields: `["id","company","entity","external_connection","code","label","is_active","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/buyer-storefronts/` | `list` |
| POST | `/api/v1/integration/buyer-storefronts/` | `create` |
| GET | `/api/v1/integration/buyer-storefronts/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/buyer-storefronts/{pk}/` | `update` |
| PATCH | `/api/v1/integration/buyer-storefronts/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/buyer-storefronts/{pk}/` | `destroy` |

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

## apps.integration.webhook_receiver.WebhookReceiverView

Handler: [backend/apps/integration/webhook_receiver.py](../../../../backend/apps/integration/webhook_receiver.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: none declared. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/v1/integration/webhooks/{receiver_id}/` | `post` |

- `post`: `apps.integration.webhook_receiver.WebhookReceiverView.post` in [backend/apps/integration/webhook_receiver.py](../../../../backend/apps/integration/webhook_receiver.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/IntegrationPage.tsx](../../../../frontend/src/pages/IntegrationPage.tsx).

## apps.shared_api.CompanyAPIKeyViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `integration.CompanyAPIKey`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.connection.list","retrieve":"integration.connection.read","create":"integration.connection.manage","destroy":"integration.connection.manage","update":"integration.connection.manage","partial_update":"integration.connection.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.CompanyAPIKeySerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","company_scope_reference","company_name","label","token","is_active","created_at","last_used_at"]`. Read-only fields: `["id","token","created_at","last_used_at"]`. Excluded: `[]`. Validation methods: `validate_company_scope_reference`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/api-keys/` | `list` |
| POST | `/api/v1/integration/api-keys/` | `create` |
| GET | `/api/v1/integration/api-keys/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/api-keys/{pk}/` | `update` |
| PATCH | `/api/v1/integration/api-keys/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/api-keys/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/IntegrationPage.tsx](../../../../frontend/src/pages/IntegrationPage.tsx).

## apps.shared_api.ExternalActionRequestViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `integration.ExternalActionRequest`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.action.list","retrieve":"integration.action.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.ExternalActionRequestSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","company_scope_reference","connection","source_module","action_type","target_system","status","idempotency_key","created_at","outcomes"]`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/action-requests/` | `list` |
| GET | `/api/v1/integration/action-requests/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.shared_api.ExternalConnectionViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `integration.ExternalConnection`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.connection.list","retrieve":"integration.connection.read","create":"integration.connection.manage","update":"integration.connection.manage","partial_update":"integration.connection.manage","destroy":"integration.connection.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.ExternalConnectionSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `["id","company_scope_reference","connector_type","status","label","config_reference","created_at"]`. Read-only fields: `["id","company_scope_reference","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/connections/` | `list` |
| POST | `/api/v1/integration/connections/` | `create` |
| GET | `/api/v1/integration/connections/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/connections/{pk}/` | `update` |
| PATCH | `/api/v1/integration/connections/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/connections/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/IntegrationPage.tsx](../../../../frontend/src/pages/IntegrationPage.tsx).

## apps.shared_api.InboundWebhookReceiptViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `integration.InboundWebhookReceipt`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.connection.list","retrieve":"integration.connection.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.InboundWebhookReceiptSerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/inbound-webhooks/` | `list` |
| GET | `/api/v1/integration/inbound-webhooks/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/IntegrationPage.tsx](../../../../frontend/src/pages/IntegrationPage.tsx).

## apps.shared_api.WebhookDeliveryViewSet

Handler: [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py). Declared queryset model: `integration.WebhookDelivery`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"integration.connection.list","retrieve":"integration.connection.read","create":"integration.connection.manage","update":"integration.connection.manage","partial_update":"integration.connection.manage","destroy":"integration.connection.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.shared_api.WebhookDeliverySerializer` at [backend/apps/shared_api.py](../../../../backend/apps/shared_api.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/integration/webhooks/` | `list` |
| POST | `/api/v1/integration/webhooks/` | `create` |
| GET | `/api/v1/integration/webhooks/{pk}/` | `retrieve` |
| PUT | `/api/v1/integration/webhooks/{pk}/` | `update` |
| PATCH | `/api/v1/integration/webhooks/{pk}/` | `partial_update` |
| DELETE | `/api/v1/integration/webhooks/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/IntegrationPage.tsx](../../../../frontend/src/pages/IntegrationPage.tsx).

