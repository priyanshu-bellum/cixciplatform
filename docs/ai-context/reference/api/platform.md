# platform — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.media.views.MediaProxyView

Handler: [backend/apps/media/views.py](../../../../backend/apps/media/views.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: none declared. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/img/{code}` | `get` |

- `get`: `apps.media.views.MediaProxyView.get` in [backend/apps/media/views.py](../../../../backend/apps/media/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## config.urls.AdminSchemaFileView

Handler: [backend/config/urls.py](../../../../backend/config/urls.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: none declared. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/schema/` | `get` |
| GET | `/api/v1/schema/` | `get` |

- `get`: `config.urls.AdminSchemaFileView.get` in [backend/config/urls.py](../../../../backend/config/urls.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## config.urls.AdminSwaggerView

Handler: [backend/config/urls.py](../../../../backend/config/urls.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: none declared. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/docs/` | `get` |
| GET | `/api/v1/docs/` | `get` |

- `get`: `config.urls.AdminSwaggerView.get` in [backend/config/urls.py](../../../../backend/config/urls.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/Sidebar.tsx](../../../../frontend/src/components/Sidebar.tsx).

## config.urls.BuyerSchemaView

Handler: [backend/config/urls.py](../../../../backend/config/urls.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/buyer-schema/` | `get` |
| GET | `/api/v1/buyer-schema/` | `get` |

- `get`: `config.urls.BuyerSchemaView.get` in [backend/config/urls.py](../../../../backend/config/urls.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## config.urls.VendorSchemaView

Handler: [backend/config/urls.py](../../../../backend/config/urls.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/vendor-schema/` | `get` |
| GET | `/api/v1/vendor-schema/` | `get` |

- `get`: `config.urls.VendorSchemaView.get` in [backend/config/urls.py](../../../../backend/config/urls.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## drf_spectacular.views.SpectacularRedocView

Handler: framework/dynamic (inspect handler). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.AllowAny`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/redoc/` | `get` |
| GET | `/api/v1/redoc/` | `get` |
| GET | `/api/buyer-redoc/` | `get` |
| GET | `/api/v1/buyer-redoc/` | `get` |
| GET | `/api/vendor-redoc/` | `get` |
| GET | `/api/v1/vendor-redoc/` | `get` |

- `get`: `drf_spectacular.views.SpectacularRedocView.get` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## drf_spectacular.views.SpectacularSwaggerView

Handler: framework/dynamic (inspect handler). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.AllowAny`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/buyer-docs/` | `get` |
| GET | `/api/v1/buyer-docs/` | `get` |
| GET | `/api/vendor-docs/` | `get` |
| GET | `/api/v1/vendor-docs/` | `get` |

- `get`: `drf_spectacular.views.SpectacularSwaggerView.get` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

