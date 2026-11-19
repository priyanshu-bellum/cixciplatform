# auth — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.tenant.urls.auth.CustomTokenObtainPairView

Handler: [backend/apps/tenant/urls/auth.py](../../../../backend/apps/tenant/urls/auth.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.urls.auth.CustomTokenObtainPairSerializer` at [backend/apps/tenant/urls/auth.py](../../../../backend/apps/tenant/urls/auth.py).

Serializer fields: `"dynamic"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/v1/auth/login/` | `post` |

- `post`: `rest_framework_simplejwt.views.TokenViewBase.post` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/lib/apiClient.ts](../../../../frontend/src/lib/apiClient.ts), [frontend/src/stores/authStore.ts](../../../../frontend/src/stores/authStore.ts).

## rest_framework_simplejwt.views.TokenBlacklistView

Handler: framework/dynamic (inspect handler). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/v1/auth/logout/` | `post` |

- `post`: `rest_framework_simplejwt.views.TokenViewBase.post` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/lib/apiClient.ts](../../../../frontend/src/lib/apiClient.ts), [frontend/src/stores/authStore.ts](../../../../frontend/src/stores/authStore.ts).

## rest_framework_simplejwt.views.TokenRefreshView

Handler: framework/dynamic (inspect handler). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: none declared. Authentication: none declared.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/v1/auth/refresh/` | `post` |

- `post`: `rest_framework_simplejwt.views.TokenViewBase.post` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/lib/apiClient.ts](../../../../frontend/src/lib/apiClient.ts).

