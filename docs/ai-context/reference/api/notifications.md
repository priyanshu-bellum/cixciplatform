# notifications — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.notification.api.ActivitySummaryConfigViewSet

Handler: [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Declared queryset model: `notification.ActivitySummaryConfiguration`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"notifications.summary.manage","retrieve":"notifications.summary.manage","create":"notifications.summary.manage","update":"notifications.summary.manage","partial_update":"notifications.summary.manage","destroy":"notifications.summary.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.notification.api.ActivitySummaryConfigSerializer` at [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py).

Serializer fields: `["id","status","delivery_times","schedule_timezone","skip_weekends","skip_holidays","explicit_recipient_ids","last_successful_summary_cursor_reference","created_at"]`. Read-only fields: `["id","created_at","last_successful_summary_cursor_reference"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/notifications/summary-config/` | `list` |
| POST | `/api/v1/notifications/summary-config/` | `create` |
| GET | `/api/v1/notifications/summary-config/{pk}/` | `retrieve` |
| PUT | `/api/v1/notifications/summary-config/{pk}/` | `update` |
| PATCH | `/api/v1/notifications/summary-config/{pk}/` | `partial_update` |
| DELETE | `/api/v1/notifications/summary-config/{pk}/` | `destroy` |

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

## apps.notification.api.DeliveryAttemptViewSet

Handler: [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Declared queryset model: `notification.DeliveryAttempt`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"notifications.request.list","retrieve":"notifications.request.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.notification.api.DeliveryAttemptSerializer` at [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py).

Serializer fields: `["id","notification_request","recipient_id","channel","status","provider_name","attempt_number","sent_at","delivered_at","failed_at","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/notifications/delivery-attempts/` | `list` |
| GET | `/api/v1/notifications/delivery-attempts/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/NotificationsPage.tsx](../../../../frontend/src/pages/NotificationsPage.tsx).

## apps.notification.api.InAppNotificationViewSet

Handler: [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.notification.api.InAppNotificationSerializer` at [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py).

Serializer fields: `["id","recipient","company_scope_reference","notification_request","event_type","classification","title","body","source_module","source_record_id","link","delivery_mode","delivery_attempt_reference","audit_reference","is_read","read_at","created_at"]`. Read-only fields: `["id","recipient","company_scope_reference","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/notifications/in-app/` | `list` |
| POST | `/api/v1/notifications/in-app/mark-all-read/` | `mark_all_read` |
| GET | `/api/v1/notifications/in-app/unread-count/` | `unread_count` |
| GET | `/api/v1/notifications/in-app/{pk}/` | `retrieve` |
| POST | `/api/v1/notifications/in-app/{pk}/mark-read/` | `mark_read` |
| POST | `/api/v1/notifications/in-app/{pk}/mark-unread/` | `mark_unread` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `mark_all_read`: `apps.notification.api.InAppNotificationViewSet.mark_all_read` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `marked_read_count`. Local service imports: none declared.
- `unread_count`: `apps.notification.api.InAppNotificationViewSet.unread_count` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `unread_count`. Local service imports: none declared.
- `retrieve`: `apps.notification.api.InAppNotificationViewSet.retrieve` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: `apps.tenant.services.check_access`.
- `mark_read`: `apps.notification.api.InAppNotificationViewSet.mark_read` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `mark_unread`: `apps.notification.api.InAppNotificationViewSet.mark_unread` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/components/NotificationBell.tsx](../../../../frontend/src/components/NotificationBell.tsx).

## apps.notification.api.NotificationPreferenceViewSet

Handler: [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Declared queryset model: `dynamic/undeclared; inspect handler`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.notification.api.NotificationPreferenceSerializer` at [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py).

Serializer fields: `["id","level","scope_id","event_type","channel","is_enabled","use_digest","quiet_hours_start","quiet_hours_end","is_unsubscribed","unsubscribed_at","created_at"]`. Read-only fields: `["id","created_at","unsubscribed_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/notifications/preferences/` | `list` |
| POST | `/api/v1/notifications/preferences/` | `create` |
| GET | `/api/v1/notifications/preferences/mine/` | `mine` |
| POST | `/api/v1/notifications/preferences/unsubscribe/` | `unsubscribe` |
| GET | `/api/v1/notifications/preferences/{pk}/` | `retrieve` |
| PUT | `/api/v1/notifications/preferences/{pk}/` | `update` |
| PATCH | `/api/v1/notifications/preferences/{pk}/` | `partial_update` |
| DELETE | `/api/v1/notifications/preferences/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `mine`: `apps.notification.api.NotificationPreferenceViewSet.mine` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `unsubscribe`: `apps.notification.api.NotificationPreferenceViewSet.unsubscribe` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: `channel`, `event_type`. Direct Response dictionary keys: `status`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.notification.api.NotificationRequestViewSet

Handler: [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Declared queryset model: `notification.NotificationRequest`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"notifications.request.list","retrieve":"notifications.request.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.notification.api.NotificationRequestSerializer` at [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py).

Serializer fields: `["id","event_type","source_module","source_record_id","safe_payload_summary","requested_recipient_ids","company_scope_reference","template_code","channel","idempotency_key","preference_outcome","created_at"]`. Read-only fields: `["id","created_at","preference_outcome"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/notifications/requests/` | `list` |
| GET | `/api/v1/notifications/requests/{pk}/` | `retrieve` |
| GET | `/api/v1/notifications/requests/{pk}/delivery_attempts/` | `delivery_attempts` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `delivery_attempts`: `apps.notification.api.NotificationRequestViewSet.delivery_attempts` in [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/NotificationsPage.tsx](../../../../frontend/src/pages/NotificationsPage.tsx).

## apps.notification.api.NotificationTemplateViewSet

Handler: [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py). Declared queryset model: `notification.NotificationTemplate`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`, `rest_framework.authentication.SessionAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"notifications.template.list","retrieve":"notifications.template.read","create":"notifications.template.manage","update":"notifications.template.manage","partial_update":"notifications.template.manage","destroy":"notifications.template.manage"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.notification.api.NotificationTemplateSerializer` at [backend/apps/notification/api.py](../../../../backend/apps/notification/api.py).

Serializer fields: `["id","template_code","version","channel","event_type","subject_template","body_template","dynamic_fields","status","locale","company_scope","effective_from","created_at"]`. Read-only fields: `["id","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/notifications/templates/` | `list` |
| POST | `/api/v1/notifications/templates/` | `create` |
| GET | `/api/v1/notifications/templates/{pk}/` | `retrieve` |
| PUT | `/api/v1/notifications/templates/{pk}/` | `update` |
| PATCH | `/api/v1/notifications/templates/{pk}/` | `partial_update` |
| DELETE | `/api/v1/notifications/templates/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/NotificationsPage.tsx](../../../../frontend/src/pages/NotificationsPage.tsx).

