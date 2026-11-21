# catalog — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.catalog.api.BuyerCompatibilityProjectionViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.catalog.api.BuyerCompatibilityProjectionSerializer` at [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py).

Serializer fields: `["id","status","compatible_product_ids","compatible_product_count","incompatible_product_ids","portfolio_snapshot_reference","last_recalculated_at","recalculation_trigger"]`. Read-only fields: `["id","last_recalculated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/my-projection/my_projection/` | `my_projection` |
| POST | `/api/v1/catalog/my-projection/refresh/` | `refresh` |

- `my_projection`: `apps.catalog.api.BuyerCompatibilityProjectionViewSet.my_projection` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`, `reason`. Local service imports: `apps.catalog.services.ensure_buyer_compatibility_projection`.
- `refresh`: `apps.catalog.api.BuyerCompatibilityProjectionViewSet.refresh` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `compatible_count`, `detail`, `last_recalculated_at`, `status`. Local service imports: `apps.catalog.services.ensure_buyer_compatibility_projection`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/CatalogPage.tsx](../../../../frontend/src/pages/catalog/CatalogPage.tsx), [frontend/src/pages/catalog/CompatibilityTab.tsx](../../../../frontend/src/pages/catalog/CompatibilityTab.tsx), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx).

## apps.catalog.api.BuyerExportJobViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: none declared. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.catalog.api.BuyerExportJobSerializer` at [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py).

Serializer fields: `["id","status","format","include_incompatible","portfolio_snapshot_reference","product_count","output_file_reference","download_url","created_at","completed_at","trigger_type","triggered_by_id","triggered_by_name","triggered_by_role","failure_details","buyer_company_name","products_snapshot","storefront"]`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/export-jobs/added_products/` | `added_products` |
| POST | `/api/v1/catalog/export-jobs/create_job/` | `create_job` |
| GET | `/api/v1/catalog/export-jobs/list_jobs/` | `list_jobs` |
| GET | `/api/v1/catalog/export-jobs/{pk}/` | `retrieve` |
| GET | `/api/v1/catalog/export-jobs/{pk}/download/` | `download` |

- `added_products`: `apps.catalog.api.BuyerExportJobViewSet.added_products` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `device_id`. Direct Response dictionary keys: `product_ids`. Local service imports: `apps.catalog.models.BuyerProductExportDate`.
- `create_job`: `apps.catalog.api.BuyerExportJobViewSet.create_job` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `device_id`, `include_media_missing`, `product_ids`. Direct Response dictionary keys: none declared. Local service imports: `apps.catalog.models.BuyerProductExportSelectionSnapshot`, `apps.catalog.models.Product`, `apps.catalog.services.log_catalog_audit`, `apps.catalog.tasks.process_buyer_export_job`, `apps.devices.models.BuyerDevicePortfolioReference`, `apps.integration.storefront_api.request_storefront`, `apps.pricing.models.MapException`, `apps.tenant.models.Company`, `config.cache_service.company_cache`.
- `list_jobs`: `apps.catalog.api.BuyerExportJobViewSet.list_jobs` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `apps.catalog.api.BuyerExportJobViewSet.retrieve` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `download`: `apps.catalog.api.BuyerExportJobViewSet.download` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.media.models.MediaAsset`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/CompatibilityTab.tsx](../../../../frontend/src/pages/catalog/CompatibilityTab.tsx), [frontend/src/pages/catalog/dialogs/ExportDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/ExportDialog.tsx), [frontend/src/pages/catalog/ExportJobsTab.tsx](../../../../frontend/src/pages/catalog/ExportJobsTab.tsx).

## apps.catalog.api.DynamicDropdownConfigViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `catalog.DynamicDropdownConfig`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.catalog.api.DynamicDropdownConfigSerializer` at [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py).

Serializer fields: `["id","field_name","value","display_name","created_at","status","compatibility_mode","eligible_device_types","match_logic","accessory_fields","compatibility_rules","linked_product_count"]`. Read-only fields: `["id","created_at","linked_product_count"]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/dropdown-configs/` | `list` |
| POST | `/api/v1/catalog/dropdown-configs/` | `create` |
| GET | `/api/v1/catalog/dropdown-configs/compatibility-options/` | `compatibility_options` |
| GET | `/api/v1/catalog/dropdown-configs/{pk}/` | `retrieve` |
| PUT | `/api/v1/catalog/dropdown-configs/{pk}/` | `update` |
| PATCH | `/api/v1/catalog/dropdown-configs/{pk}/` | `partial_update` |
| DELETE | `/api/v1/catalog/dropdown-configs/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `compatibility_options`: `apps.catalog.api.DynamicDropdownConfigViewSet.compatibility_options` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `apps.catalog.api.DynamicDropdownConfigViewSet.destroy` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/CompatibilityValuesManager.tsx](../../../../frontend/src/components/CompatibilityValuesManager.tsx), [frontend/src/components/VendorCatalogConfigEditor.tsx](../../../../frontend/src/components/VendorCatalogConfigEditor.tsx), [frontend/src/hooks/useCompatibilityOptions.ts](../../../../frontend/src/hooks/useCompatibilityOptions.ts), [frontend/src/pages/catalog/CatalogPage.tsx](../../../../frontend/src/pages/catalog/CatalogPage.tsx), [frontend/src/pages/catalog/dialogs/DropdownManagerDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/DropdownManagerDialog.tsx), [frontend/src/pages/DevicesPage.tsx](../../../../frontend/src/pages/DevicesPage.tsx).

## apps.catalog.api.ImportAlertViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/import-alerts/` | `list` |
| POST | `/api/v1/catalog/import-alerts/{pk}/dismiss/` | `dismiss` |

- `list`: `apps.catalog.api.ImportAlertViewSet.list` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `alerts`. Local service imports: `apps.notification.models.NotificationRequest`.
- `dismiss`: `apps.catalog.api.ImportAlertViewSet.dismiss` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `dismissed`. Local service imports: `apps.notification.models.NotificationRequest`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/NotificationBell.tsx](../../../../frontend/src/components/NotificationBell.tsx), [frontend/src/pages/catalog/CatalogPage.tsx](../../../../frontend/src/pages/catalog/CatalogPage.tsx).

## apps.catalog.api.MissingDeviceViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/missing-devices/` | `list` |
| POST | `/api/v1/catalog/missing-devices/add_device/` | `add_device` |
| POST | `/api/v1/catalog/missing-devices/dismiss_device/` | `dismiss_device` |

- `list`: `apps.catalog.api.MissingDeviceViewSet.list` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `device_types`, `devices`, `manufacturers`, `total`. Local service imports: `apps.devices.models.Device`, `apps.devices.models.DeviceType`, `apps.devices.models.Manufacturer`, `apps.notification.models.NotificationRequest`.
- `add_device`: `apps.catalog.api.MissingDeviceViewSet.add_device` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `device_name`, `device_type_code`, `manufacturer_id`, `vendor_device_name`. Direct Response dictionary keys: `created`, `device_id`, `device_name`, `error`, `products_matched`. Local service imports: `apps.audit.models.AuditRecord`, `apps.devices.models.Device`, `apps.devices.models.DeviceType`, `apps.devices.models.Manufacturer`.
- `dismiss_device`: `apps.catalog.api.MissingDeviceViewSet.dismiss_device` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `vendor_device_name`. Direct Response dictionary keys: `dismissed`, `error`. Local service imports: `apps.notification.models.NotificationRequest`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/MissingDevicesTab.tsx](../../../../frontend/src/pages/catalog/MissingDevicesTab.tsx).

## apps.catalog.api.ProductViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `catalog.Product`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"catalog.product.list","matching_ids":"catalog.product.list","filter_options":"catalog.product.list","retrieve":"catalog.product.read","create":"catalog.product.create","update":"catalog.product.update","partial_update":"catalog.product.update","destroy":"catalog.product.delete","set_selling_status":"catalog.product.manage_selling","compatibility":"catalog.product.read","bulk_upload":"catalog.product.create","recalculate_compatibility":"catalog.product.update","recalculate_bulk_compatibility":"catalog.product.update","audit_history":"catalog.product.read","vendor_audit":"catalog.product.list","vendor_audit_stats":"catalog.product.list","map_devices":"catalog.product.update","bulk_map_devices":"catalog.product.update","resolve_review":"catalog.product.update","bulk_resolve_review":"catalog.product.update"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/products/` | `list` |
| POST | `/api/v1/catalog/products/` | `create` |
| POST | `/api/v1/catalog/products/batch-revalidate/` | `batch_revalidate` |
| POST | `/api/v1/catalog/products/bulk-map-devices/` | `bulk_map_devices` |
| POST | `/api/v1/catalog/products/bulk-resolve-review/` | `bulk_resolve_review` |
| POST | `/api/v1/catalog/products/bulk_upload/` | `bulk_upload` |
| GET | `/api/v1/catalog/products/bulk-upload-template/` | `bulk_upload_template` |
| POST | `/api/v1/catalog/products/check-skus/` | `check_skus` |
| POST | `/api/v1/catalog/products/clear-sync/` | `clear_sync` |
| GET | `/api/v1/catalog/products/filter-options/` | `filter_options` |
| GET | `/api/v1/catalog/products/ids/` | `matching_ids` |
| GET | `/api/v1/catalog/products/pending-sync/` | `pending_sync` |
| POST | `/api/v1/catalog/products/recalculate-compatibility/` | `recalculate_bulk_compatibility` |
| GET | `/api/v1/catalog/products/vendor-audit/` | `vendor_audit` |
| GET | `/api/v1/catalog/products/vendor-audit-stats/` | `vendor_audit_stats` |
| GET | `/api/v1/catalog/products/{pk}/` | `retrieve` |
| PUT | `/api/v1/catalog/products/{pk}/` | `update` |
| PATCH | `/api/v1/catalog/products/{pk}/` | `partial_update` |
| DELETE | `/api/v1/catalog/products/{pk}/` | `destroy` |
| GET | `/api/v1/catalog/products/{pk}/audit_history/` | `audit_history` |
| GET | `/api/v1/catalog/products/{pk}/compatibility/` | `compatibility` |
| POST | `/api/v1/catalog/products/{pk}/compatibility/` | `compatibility` |
| POST | `/api/v1/catalog/products/{pk}/map-devices/` | `map_devices` |
| POST | `/api/v1/catalog/products/{pk}/recalculate-compatibility/` | `recalculate_compatibility` |
| POST | `/api/v1/catalog/products/{pk}/resolve-review/` | `resolve_review` |
| POST | `/api/v1/catalog/products/{pk}/set_selling_status/` | `set_selling_status` |

- `list`: `apps.catalog.api.ProductViewSet.list` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `batch_revalidate`: `apps.catalog.api.ProductViewSet.batch_revalidate` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `date_from`, `date_to`, `limit`, `mode`, `product_category`, `status`, `vendor_company_reference`. Direct Response dictionary keys: `error`, `mode`, `results`, `rule_version`, `summary`. Local service imports: `apps.catalog.normalization.Outcome`, `apps.catalog.normalization.RULE_VERSION`, `apps.catalog.normalization.detect_buyer_sync_needed`, `apps.catalog.normalization.normalize_product`, `apps.catalog.normalization.normalize_short_description`, `apps.catalog.services.log_catalog_audit`.
- `bulk_map_devices`: `apps.catalog.api.ProductViewSet.bulk_map_devices` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: `failures`, `results`, `status`, `total`, `updated`. Local service imports: none declared.
- `bulk_resolve_review`: `apps.catalog.api.ProductViewSet.bulk_resolve_review` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: `cleared`, `status`. Local service imports: none declared.
- `bulk_upload`: `apps.catalog.api.ProductViewSet.bulk_upload` in framework/dynamic (inspect handler). Direct request/query keys: `compatibility_update_type`, `update_mode`, `vendor_company_reference`. Direct Response dictionary keys: `compatibility_results`, `error`, `errors`, `missing_headers`, `products`, `rows_created`, `rows_failed`, `rows_passed`, `rows_staged`, `rows_updated`, `total_rows_processed`. Local service imports: `apps.catalog.compatibility_commands.update_explicit_selections`, `apps.catalog.compatibility_import.apply_import_values`, `apps.catalog.compatibility_import.parse_compatibility_row`, `apps.catalog.models.CategoryValidationStatus`, `apps.catalog.models.DynamicDropdownConfig`, `apps.catalog.models.ProductCompatibilityAssertion`, `apps.catalog.models.ProductStatus`, `apps.catalog.models.VendorCategoryMapping`, `apps.catalog.models.VendorCategoryMappingStatus`, `apps.catalog.services.log_catalog_audit`, `apps.devices.models.Device`, `apps.devices.models.DeviceType`, `apps.devices.models.Manufacturer`, `apps.media.models.AssetStatus`, `apps.media.models.AssetType`, `apps.media.models.MediaAsset`, `apps.media.validation.validate_image_bytes`, `apps.media.validation.validate_image_url`, `apps.pricing.services.check_pricing_exception_exists`, `apps.pricing.services.get_effective_map_price`, `apps.tenant.models.Company`.
- `bulk_upload_template`: `apps.catalog.api.ProductViewSet.bulk_upload_template` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.catalog.models.ProductStatus`.
- `check_skus`: `apps.catalog.api.ProductViewSet.check_skus` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `skus`, `vendor_company_reference`. Direct Response dictionary keys: `existing`. Local service imports: none declared.
- `clear_sync`: `apps.catalog.api.ProductViewSet.clear_sync` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `product_ids`. Direct Response dictionary keys: `cleared`, `error`. Local service imports: none declared.
- `filter_options`: `apps.catalog.api.ProductViewSet.filter_options` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `brands`. Local service imports: none declared.
- `matching_ids`: `apps.catalog.api.ProductViewSet.matching_ids` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `count`, `ids`. Local service imports: none declared.
- `pending_sync`: `apps.catalog.api.ProductViewSet.pending_sync` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `limit`. Direct Response dictionary keys: `count`, `products`. Local service imports: none declared.
- `recalculate_bulk_compatibility`: `apps.catalog.api.ProductViewSet.recalculate_bulk_compatibility` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `brand`, `category`, `vendor_id`. Direct Response dictionary keys: `error`, `recalculated_count`, `status`. Local service imports: `apps.catalog.compatibility_engine.run_compatibility_automapping`.
- `vendor_audit`: `apps.catalog.api.ProductViewSet.vendor_audit` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `vendor_audit_stats`: `apps.catalog.api.ProductViewSet.vendor_audit_stats` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `vendor`. Direct Response dictionary keys: none declared. Local service imports: `apps.integration.models.VendorCatalogItem`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `apps.catalog.api.ProductViewSet.destroy` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`. Local service imports: none declared.
- `audit_history`: `apps.catalog.api.ProductViewSet.audit_history` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.audit.models.AuditRecord`.
- `compatibility`: `apps.catalog.api.ProductViewSet.compatibility` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `action`, `assertions`, `compatibility_update_type`, `device_ids`, `device_reference`, `exclusion_reason`, `include_archived`, `notes`, `update_type`. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `map_devices`: `apps.catalog.api.ProductViewSet.map_devices` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `recalculate_compatibility`: `apps.catalog.api.ProductViewSet.recalculate_compatibility` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `compatibility_status`, `error`, `status`. Local service imports: `apps.catalog.compatibility_engine.run_compatibility_automapping`.
- `resolve_review`: `apps.catalog.api.ProductViewSet.resolve_review` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `cleared`, `status`. Local service imports: none declared.
- `set_selling_status`: `apps.catalog.api.ProductViewSet.set_selling_status` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `selling_status`. Direct Response dictionary keys: `error`, `selling_status`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/AllProductsTab.tsx](../../../../frontend/src/pages/catalog/AllProductsTab.tsx), [frontend/src/pages/catalog/CatalogPage.tsx](../../../../frontend/src/pages/catalog/CatalogPage.tsx), [frontend/src/pages/catalog/CompatibilityTab.tsx](../../../../frontend/src/pages/catalog/CompatibilityTab.tsx), [frontend/src/pages/catalog/dialogs/BatchRevalidateDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/BatchRevalidateDialog.tsx), [frontend/src/pages/catalog/dialogs/BulkUploadDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/BulkUploadDialog.tsx), [frontend/src/pages/catalog/dialogs/ExcludeDeviceDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/ExcludeDeviceDialog.tsx), [frontend/src/pages/catalog/dialogs/ManageProductDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/ManageProductDialog.tsx), [frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx), [frontend/src/pages/catalog/hooks/useCatalogBrandOptions.ts](../../../../frontend/src/pages/catalog/hooks/useCatalogBrandOptions.ts), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/DevicesPage.tsx](../../../../frontend/src/pages/DevicesPage.tsx), [frontend/src/pages/MediaPage.tsx](../../../../frontend/src/pages/MediaPage.tsx), [frontend/src/pages/TelcoCellularPage.tsx](../../../../frontend/src/pages/TelcoCellularPage.tsx).

## apps.catalog.api.VendorCategoryMappingViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `catalog.VendorCategoryMapping`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":null,"retrieve":null,"create":"admin_only","update":"admin_only","partial_update":"admin_only","destroy":"admin_only"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.catalog.api.VendorCategoryMappingSerializer` at [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py).

Serializer fields: `["id","vendor_company_reference","vendor_company_name","vendor_category","cixci_category","cixci_category_reference","status","mapping_source","effective_date","created_at","updated_at","created_by","created_by_name","updated_by","updated_by_name","company_scope_reference"]`. Read-only fields: `["id","created_at","updated_at","company_scope_reference","cixci_category_reference"]`. Excluded: `[]`. Validation methods: `validate_cixci_category`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/vendor-category-mappings/` | `list` |
| POST | `/api/v1/catalog/vendor-category-mappings/` | `create` |
| POST | `/api/v1/catalog/vendor-category-mappings/bulk_create/` | `bulk_create` |
| GET | `/api/v1/catalog/vendor-category-mappings/{pk}/` | `retrieve` |
| PUT | `/api/v1/catalog/vendor-category-mappings/{pk}/` | `update` |
| PATCH | `/api/v1/catalog/vendor-category-mappings/{pk}/` | `partial_update` |
| DELETE | `/api/v1/catalog/vendor-category-mappings/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `bulk_create`: `apps.catalog.api.VendorCategoryMappingViewSet.bulk_create` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `mappings`. Direct Response dictionary keys: `created`, `error`, `errors`, `summary`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx](../../../../frontend/src/pages/catalog/dialogs/ProductFormDialog.tsx).

## apps.catalog.api.VendorColorMappingViewSet

Handler: [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Declared queryset model: `catalog.VendorColorMapping`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":null,"retrieve":null,"create":"admin_only","update":"admin_only","partial_update":"admin_only","destroy":"admin_only"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.catalog.api.VendorColorMappingSerializer` at [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py).

Serializer fields: `["id","vendor_company_reference","vendor_company_name","vendor_color","system_color","status","affected_product_count","created_at","updated_at","created_by","created_by_name"]`. Read-only fields: `["id","created_at","updated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/catalog/vendor-color-mappings/` | `list` |
| POST | `/api/v1/catalog/vendor-color-mappings/` | `create` |
| POST | `/api/v1/catalog/vendor-color-mappings/bulk_create/` | `bulk_create` |
| GET | `/api/v1/catalog/vendor-color-mappings/unresolved/` | `unresolved` |
| GET | `/api/v1/catalog/vendor-color-mappings/{pk}/` | `retrieve` |
| PUT | `/api/v1/catalog/vendor-color-mappings/{pk}/` | `update` |
| PATCH | `/api/v1/catalog/vendor-color-mappings/{pk}/` | `partial_update` |
| DELETE | `/api/v1/catalog/vendor-color-mappings/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `bulk_create`: `apps.catalog.api.VendorColorMappingViewSet.bulk_create` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `mappings`. Direct Response dictionary keys: `created`, `error`, `errors`, `summary`. Local service imports: none declared.
- `unresolved`: `apps.catalog.api.VendorColorMappingViewSet.unresolved` in [backend/apps/catalog/api.py](../../../../backend/apps/catalog/api.py). Direct request/query keys: `vendor_company_reference`. Direct Response dictionary keys: `error`, `total_unresolved`, `unresolved`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/VendorCatalogConsole.tsx](../../../../frontend/src/components/VendorCatalogConsole.tsx).

