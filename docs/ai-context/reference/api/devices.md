# devices — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.devices.views.BuyerPortfolioViewSet

Handler: [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.devices.serializers.BuyerPortfolioReferenceSerializer` at [backend/apps/devices/serializers.py](../../../../backend/apps/devices/serializers.py).

Serializer fields: `["id","device","device_name","device_manufacturer","device_manufacturer_id","device_type","device_type_id","device_sku","device_model_number","device_status","device_launch_date","has_accessories","active_flag","change_source","last_change_timestamp","current_portfolio_snapshot_reference","created_at"]`. Read-only fields: `["id","buyer_reference","company_scope_reference","buyer_entity_reference","last_change_timestamp","current_portfolio_snapshot_reference","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/v1/devices/portfolio/add/` | `add` |
| GET | `/api/v1/devices/portfolio/history/` | `history` |
| GET | `/api/v1/devices/portfolio/my_devices/` | `my_devices` |
| POST | `/api/v1/devices/portfolio/remove/` | `remove` |
| GET | `/api/v1/devices/portfolio/snapshots/` | `snapshots` |

- `add`: `apps.devices.views.BuyerPortfolioViewSet.add` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: `device_id`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `history`: `apps.devices.views.BuyerPortfolioViewSet.history` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `my_devices`: `apps.devices.views.BuyerPortfolioViewSet.my_devices` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `remove`: `apps.devices.views.BuyerPortfolioViewSet.remove` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: `device_id`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `snapshots`: `apps.devices.views.BuyerPortfolioViewSet.snapshots` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/AllProductsTab.tsx](../../../../frontend/src/pages/catalog/AllProductsTab.tsx), [frontend/src/pages/catalog/CompatibilityTab.tsx](../../../../frontend/src/pages/catalog/CompatibilityTab.tsx), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/DevicesPage.tsx](../../../../frontend/src/pages/DevicesPage.tsx), [frontend/src/pages/TelcoCellularPage.tsx](../../../../frontend/src/pages/TelcoCellularPage.tsx).

## apps.devices.views.DataQualityExceptionViewSet

Handler: [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Declared queryset model: `devices.DataQualityException`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"devices.dqe.list","retrieve":"devices.dqe.read","create":"devices.dqe.create","update":"devices.dqe.resolve","partial_update":"devices.dqe.resolve","destroy":"devices.dqe.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.devices.serializers.DataQualityExceptionSerializer` at [backend/apps/devices/serializers.py](../../../../backend/apps/devices/serializers.py).

Serializer fields: `["id","device","exception_type","description","status","resolution_note","created_at","resolved_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/devices/dqe/` | `list` |
| POST | `/api/v1/devices/dqe/` | `create` |
| GET | `/api/v1/devices/dqe/{pk}/` | `retrieve` |
| PUT | `/api/v1/devices/dqe/{pk}/` | `update` |
| PATCH | `/api/v1/devices/dqe/{pk}/` | `partial_update` |
| DELETE | `/api/v1/devices/dqe/{pk}/` | `destroy` |

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

## apps.devices.views.DeviceTypeViewSet

Handler: [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Declared queryset model: `devices.DeviceType`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"devices.type.list","retrieve":"devices.type.read","create":"devices.type.manage","update":"devices.type.manage","partial_update":"devices.type.manage","destroy":"devices.type.manage","recalculate_compatibility":"devices.type.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.devices.serializers.DeviceTypeSerializer` at [backend/apps/devices/serializers.py](../../../../backend/apps/devices/serializers.py).

Serializer fields: `["id","name","code","description","is_active","created_at","status","auto_mapping_eligible","supported_accessory_categories","compatibility_rules"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/devices/types/` | `list` |
| POST | `/api/v1/devices/types/` | `create` |
| GET | `/api/v1/devices/types/{pk}/` | `retrieve` |
| PUT | `/api/v1/devices/types/{pk}/` | `update` |
| PATCH | `/api/v1/devices/types/{pk}/` | `partial_update` |
| DELETE | `/api/v1/devices/types/{pk}/` | `destroy` |
| POST | `/api/v1/devices/types/{pk}/recalculate-compatibility/` | `recalculate_compatibility` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `apps.devices.views.DeviceTypeViewSet.destroy` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.catalog.compatibility_contract.configured_type_ids`, `apps.catalog.models.DynamicDropdownConfig`.
- `recalculate_compatibility`: `apps.devices.views.DeviceTypeViewSet.recalculate_compatibility` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`, `recalculated_count`, `status`. Local service imports: `apps.catalog.compatibility_engine.run_devices_remapping`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/CatalogPage.tsx](../../../../frontend/src/pages/catalog/CatalogPage.tsx), [frontend/src/pages/DevicesPage.tsx](../../../../frontend/src/pages/DevicesPage.tsx).

## apps.devices.views.DeviceViewSet

Handler: [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Declared queryset model: `devices.Device`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"devices.device.list","retrieve":"devices.device.read","create":"devices.device.import","update":"devices.device.manage","partial_update":"devices.device.manage","destroy":"devices.device.manage","capability_evidence":"devices.device.read","feature_assignments":"devices.device.read","bulk_import":"devices.device.import","audit_history":"devices.device.read","recalculate_compatibility":"devices.device.manage","recalculate_bulk_compatibility":"devices.device.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/devices/devices/` | `list` |
| POST | `/api/v1/devices/devices/` | `create` |
| POST | `/api/v1/devices/devices/bulk_import/` | `bulk_import` |
| GET | `/api/v1/devices/devices/import_template/` | `import_template` |
| POST | `/api/v1/devices/devices/recalculate-compatibility/` | `recalculate_bulk_compatibility` |
| GET | `/api/v1/devices/devices/{pk}/` | `retrieve` |
| PUT | `/api/v1/devices/devices/{pk}/` | `update` |
| PATCH | `/api/v1/devices/devices/{pk}/` | `partial_update` |
| DELETE | `/api/v1/devices/devices/{pk}/` | `destroy` |
| GET | `/api/v1/devices/devices/{pk}/audit_history/` | `audit_history` |
| GET | `/api/v1/devices/devices/{pk}/capability_evidence/` | `capability_evidence` |
| GET | `/api/v1/devices/devices/{pk}/feature_assignments/` | `feature_assignments` |
| POST | `/api/v1/devices/devices/{pk}/recalculate-compatibility/` | `recalculate_compatibility` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `bulk_import`: `apps.devices.views.DeviceViewSet.bulk_import` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: `import_mode`. Direct Response dictionary keys: `created_count`, `error`, `errors`, `status`, `updated_count`. Local service imports: `apps.devices.models.Device`, `apps.devices.models.DeviceType`, `apps.devices.models.Manufacturer`, `apps.devices.services.log_device_audit`.
- `import_template`: `apps.devices.views.DeviceViewSet.import_template` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.devices.models.Device`, `apps.devices.models.DeviceType`, `apps.devices.models.Manufacturer`.
- `recalculate_bulk_compatibility`: `apps.devices.views.DeviceViewSet.recalculate_bulk_compatibility` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: `all`, `device_type_id`, `manufacturer_id`. Direct Response dictionary keys: `error`, `recalculated_count`, `status`. Local service imports: `apps.catalog.compatibility_engine.run_devices_remapping`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `audit_history`: `apps.devices.views.DeviceViewSet.audit_history` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.audit.models.AuditRecord`.
- `capability_evidence`: `apps.devices.views.DeviceViewSet.capability_evidence` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`. Local service imports: none declared.
- `feature_assignments`: `apps.devices.views.DeviceViewSet.feature_assignments` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `recalculate_compatibility`: `apps.devices.views.DeviceViewSet.recalculate_compatibility` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `device_name`, `error`, `status`. Local service imports: `apps.catalog.compatibility_engine.run_device_remapping`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/AllProductsTab.tsx](../../../../frontend/src/pages/catalog/AllProductsTab.tsx), [frontend/src/pages/catalog/CatalogPage.tsx](../../../../frontend/src/pages/catalog/CatalogPage.tsx), [frontend/src/pages/catalog/MissingDevicesTab.tsx](../../../../frontend/src/pages/catalog/MissingDevicesTab.tsx), [frontend/src/pages/catalog/VendorAuditDevicePicker.tsx](../../../../frontend/src/pages/catalog/VendorAuditDevicePicker.tsx), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/DevicesPage.tsx](../../../../frontend/src/pages/DevicesPage.tsx).

## apps.devices.views.FeatureGroupViewSet

Handler: [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Declared queryset model: `devices.FeatureGroup`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"devices.feature.list","retrieve":"devices.feature.read","create":"devices.feature.manage","update":"devices.feature.manage","partial_update":"devices.feature.manage","destroy":"devices.feature.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.devices.serializers.FeatureGroupSerializer` at [backend/apps/devices/serializers.py](../../../../backend/apps/devices/serializers.py).

Serializer fields: `["id","device_type","name","code","description","lifecycle","is_required_for_compatibility","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/devices/feature-groups/` | `list` |
| POST | `/api/v1/devices/feature-groups/` | `create` |
| GET | `/api/v1/devices/feature-groups/{pk}/` | `retrieve` |
| PUT | `/api/v1/devices/feature-groups/{pk}/` | `update` |
| PATCH | `/api/v1/devices/feature-groups/{pk}/` | `partial_update` |
| DELETE | `/api/v1/devices/feature-groups/{pk}/` | `destroy` |

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

## apps.devices.views.FeatureValueViewSet

Handler: [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Declared queryset model: `devices.FeatureValue`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"devices.feature.list","retrieve":"devices.feature.read","create":"devices.feature.manage","update":"devices.feature.manage","partial_update":"devices.feature.manage","destroy":"devices.feature.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.devices.serializers.FeatureValueSerializer` at [backend/apps/devices/serializers.py](../../../../backend/apps/devices/serializers.py).

Serializer fields: `["id","feature_group","value","code","lifecycle","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/devices/feature-values/` | `list` |
| POST | `/api/v1/devices/feature-values/` | `create` |
| GET | `/api/v1/devices/feature-values/{pk}/` | `retrieve` |
| PUT | `/api/v1/devices/feature-values/{pk}/` | `update` |
| PATCH | `/api/v1/devices/feature-values/{pk}/` | `partial_update` |
| DELETE | `/api/v1/devices/feature-values/{pk}/` | `destroy` |

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

## apps.devices.views.ManufacturerViewSet

Handler: [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Declared queryset model: `devices.Manufacturer`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"devices.manufacturer.list","retrieve":"devices.manufacturer.read","create":"devices.manufacturer.manage","update":"devices.manufacturer.manage","partial_update":"devices.manufacturer.manage","destroy":"devices.manufacturer.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.devices.serializers.ManufacturerSerializer` at [backend/apps/devices/serializers.py](../../../../backend/apps/devices/serializers.py).

Serializer fields: `["id","name","company_reference","is_active","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/devices/manufacturers/` | `list` |
| POST | `/api/v1/devices/manufacturers/` | `create` |
| GET | `/api/v1/devices/manufacturers/{pk}/` | `retrieve` |
| PUT | `/api/v1/devices/manufacturers/{pk}/` | `update` |
| PATCH | `/api/v1/devices/manufacturers/{pk}/` | `partial_update` |
| DELETE | `/api/v1/devices/manufacturers/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `apps.devices.views.ManufacturerViewSet.destroy` in [backend/apps/devices/views.py](../../../../backend/apps/devices/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/DevicesPage.tsx](../../../../frontend/src/pages/DevicesPage.tsx).

