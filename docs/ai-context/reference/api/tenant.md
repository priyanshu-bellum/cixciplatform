# tenant — active URL reference

Generated from the active Django URL resolver using test settings. HEAD/OPTIONS,
format suffix aliases, router roots and Django admin internals are omitted.
See [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.

## apps.audit.views.AuditRecordViewSet

Handler: [backend/apps/audit/views.py](../../../../backend/apps/audit/views.py). Declared queryset model: `audit.AuditRecord`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.audit.serializers.AuditRecordSerializer` at [backend/apps/audit/serializers.py](../../../../backend/apps/audit/serializers.py).

Serializer fields: `"__all__"`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/audit/` | `list` |
| GET | `/api/v1/tenant/audit/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): no direct resource-path match; may be indirect or external.

## apps.tenant.regional_api.OperatingRegionViewSet

Handler: [backend/apps/tenant/regional_api.py](../../../../backend/apps/tenant/regional_api.py). Declared queryset model: `tenant.OperatingRegion`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"catalog.product.read","retrieve":"catalog.product.read","context":"catalog.product.read","vendors":"catalog.product.read","countries":"catalog.product.read","create":"tenant.company.update","partial_update":"tenant.company.update"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.regional_api.OperatingRegionSerializer` at [backend/apps/tenant/regional_api.py](../../../../backend/apps/tenant/regional_api.py).

Serializer fields: `["id","code","name","is_active"]`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: `validate_code`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/operating-regions/` | `list` |
| POST | `/api/v1/tenant/operating-regions/` | `create` |
| GET | `/api/v1/tenant/operating-regions/context/` | `context` |
| GET | `/api/v1/tenant/operating-regions/countries/` | `countries` |
| GET | `/api/v1/tenant/operating-regions/vendors/` | `vendors` |
| GET | `/api/v1/tenant/operating-regions/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/operating-regions/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/operating-regions/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/operating-regions/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `context`: `apps.tenant.regional_api.OperatingRegionViewSet.context` in [backend/apps/tenant/regional_api.py](../../../../backend/apps/tenant/regional_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `status`. Local service imports: none declared.
- `countries`: `apps.tenant.regional_api.OperatingRegionViewSet.countries` in [backend/apps/tenant/regional_api.py](../../../../backend/apps/tenant/regional_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `vendors`: `apps.tenant.regional_api.OperatingRegionViewSet.vendors` in [backend/apps/tenant/regional_api.py](../../../../backend/apps/tenant/regional_api.py). Direct request/query keys: none declared. Direct Response dictionary keys: `results`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/catalog/CatalogPage.tsx](../../../../frontend/src/pages/catalog/CatalogPage.tsx), [frontend/src/pages/regional/OperatingRegionSetup.tsx](../../../../frontend/src/pages/regional/OperatingRegionSetup.tsx), [frontend/src/pages/regional/RegionUpdateDialog.tsx](../../../../frontend/src/pages/regional/RegionUpdateDialog.tsx), [frontend/src/pages/regional/ShippingFeeDialog.tsx](../../../../frontend/src/pages/regional/ShippingFeeDialog.tsx), [frontend/src/pages/RegionalPage.tsx](../../../../frontend/src/pages/RegionalPage.tsx).

## apps.tenant.views.CapabilityViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.Capability`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.CapabilitySerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","code","description","module","is_active"]`. Read-only fields: `[]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/capabilities/` | `list` |
| GET | `/api/v1/tenant/capabilities/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/CompanyUsersPage.tsx](../../../../frontend/src/pages/CompanyUsersPage.tsx), [frontend/src/pages/StubPages.tsx](../../../../frontend/src/pages/StubPages.tsx).

## apps.tenant.views.ChildOnboardingRequestViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.ChildOnboardingRequest`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"tenant.child_onboarding.list","retrieve":"tenant.child_onboarding.read","create":"tenant.child_onboarding.create","approve":"tenant.child_onboarding.approve","reject":"tenant.child_onboarding.reject","withdraw":"tenant.child_onboarding.withdraw"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.ChildOnboardingRequestSerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","parent_company","parent_company_name","requester","requester_name","company_name","brand_name","website","region","primary_contact","business_email_domain","commission_percentage","status","rejection_reason","created_at","updated_at","decision_by","decision_timestamp"]`. Read-only fields: `["id","parent_company","requester","status","created_at","updated_at","decision_by","decision_timestamp"]`. Excluded: `[]`. Validation methods: `validate_website`, `validate_business_email_domain`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/child-onboarding-requests/` | `list` |
| POST | `/api/v1/tenant/child-onboarding-requests/` | `create` |
| GET | `/api/v1/tenant/child-onboarding-requests/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/child-onboarding-requests/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/child-onboarding-requests/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/child-onboarding-requests/{pk}/` | `destroy` |
| POST | `/api/v1/tenant/child-onboarding-requests/{pk}/approve/` | `approve` |
| POST | `/api/v1/tenant/child-onboarding-requests/{pk}/reject/` | `reject` |
| POST | `/api/v1/tenant/child-onboarding-requests/{pk}/withdraw/` | `withdraw` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `approve`: `apps.tenant.views.ChildOnboardingRequestViewSet.approve` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.tenant.models.BuyerPricingMode`, `apps.tenant.services.log_tenant_audit`.
- `reject`: `apps.tenant.views.ChildOnboardingRequestViewSet.reject` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `rejection_reason`. Direct Response dictionary keys: `error`. Local service imports: `apps.tenant.services.log_tenant_audit`.
- `withdraw`: `apps.tenant.views.ChildOnboardingRequestViewSet.withdraw` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.tenant.services.log_tenant_audit`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/StubPages.tsx](../../../../frontend/src/pages/StubPages.tsx).

## apps.tenant.views.CompanyEntityViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.CompanyEntity`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"tenant.entity.list","retrieve":"tenant.entity.read","create":"tenant.entity.create","update":"tenant.entity.update","partial_update":"tenant.entity.update","destroy":"tenant.entity.delete"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.CompanyEntitySerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","company","company_name","name","status","allowed_channels_override","country_code","region_code","operating_region","operating_region_detail","created_at","updated_at"]`. Read-only fields: `["id","created_at","updated_at","operating_region"]`. Excluded: `[]`. Validation methods: `validate_country_code`, `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/entities/` | `list` |
| POST | `/api/v1/tenant/entities/` | `create` |
| GET | `/api/v1/tenant/entities/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/entities/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/entities/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/entities/{pk}/` | `destroy` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `apps.tenant.views.CompanyEntityViewSet.destroy` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/regional/OperatingRegionSetup.tsx](../../../../frontend/src/pages/regional/OperatingRegionSetup.tsx), [frontend/src/pages/StubPages.tsx](../../../../frontend/src/pages/StubPages.tsx).

## apps.tenant.views.CompanyRelationshipViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.CompanyRelationship`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"tenant.relationship.list","retrieve":"tenant.relationship.read","create":"tenant.relationship.create","update":"tenant.relationship.update","partial_update":"tenant.relationship.update"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.CompanyRelationshipSerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","buyer_company","buyer_company_name","vendor_company","vendor_company_name","status","eligible_product_types","eligible_regions","created_at","updated_at","approved_at"]`. Read-only fields: `["id","created_at","updated_at","approved_at"]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/relationships/` | `list` |
| POST | `/api/v1/tenant/relationships/` | `create` |
| GET | `/api/v1/tenant/relationships/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/relationships/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/relationships/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/relationships/{pk}/` | `destroy` |
| POST | `/api/v1/tenant/relationships/{pk}/approve/` | `approve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `approve`: `apps.tenant.views.CompanyRelationshipViewSet.approve` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.audit.models.AuditRecord`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx).

## apps.tenant.views.CompanyUserMembershipViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.CompanyUserMembership`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.CompanyUserMembershipSerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","user","user_email","user_first_name","user_last_name","company","company_name","entity","status","role_bundle","is_company_admin","assigned_capabilities","delegated_capabilities","created_at","updated_at"]`. Read-only fields: `["id","user","company","created_at","updated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/memberships/` | `list` |
| POST | `/api/v1/tenant/memberships/` | `create` |
| POST | `/api/v1/tenant/memberships/system-admin-transfer/` | `system_admin_transfer` |
| GET | `/api/v1/tenant/memberships/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/memberships/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/memberships/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/memberships/{pk}/` | `destroy` |
| POST | `/api/v1/tenant/memberships/{pk}/assign-capability/` | `assign_capability` |
| POST | `/api/v1/tenant/memberships/{pk}/grant-admin/` | `grant_admin` |
| POST | `/api/v1/tenant/memberships/{pk}/lifecycle/` | `lifecycle` |
| POST | `/api/v1/tenant/memberships/{pk}/remove-capability/` | `remove_capability` |
| POST | `/api/v1/tenant/memberships/{pk}/revoke-admin/` | `revoke_admin` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `system_admin_transfer`: `apps.tenant.views.CompanyUserMembershipViewSet.system_admin_transfer` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `new_company_id`, `reason`, `user_id`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `assign_capability`: `apps.tenant.views.CompanyUserMembershipViewSet.assign_capability` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `capability_code`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `grant_admin`: `apps.tenant.views.CompanyUserMembershipViewSet.grant_admin` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `lifecycle`: `apps.tenant.views.CompanyUserMembershipViewSet.lifecycle` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `status`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `remove_capability`: `apps.tenant.views.CompanyUserMembershipViewSet.remove_capability` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `capability_code`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `revoke_admin`: `apps.tenant.views.CompanyUserMembershipViewSet.revoke_admin` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/CompanyUsersPage.tsx](../../../../frontend/src/pages/CompanyUsersPage.tsx).

## apps.tenant.views.CompanyViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.Company`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"tenant.company.list","retrieve":"tenant.company.read","create":"tenant.company.create","update":"tenant.company.update","partial_update":"tenant.company.update","destroy":"tenant.company.delete","assign_capability":"tenant.company.update","remove_capability":"tenant.company.update"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.CompanySerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","name","display_name","company_type","status","parent_company","slug","country_code","region_code","allowed_channels","external_id","website","business_email_domain","primary_contact_name","primary_contact_email","phone_number","address_line1","address_line2","is_parent","approved_regions","capabilities","created_at","updated_at","allow_personal_email_exception","buyer_pricing_mode","commission_percentage","map_pricing_enforced","return_address","order_digest_emails"]`. Read-only fields: `["id","created_at","updated_at"]`. Excluded: `[]`. Validation methods: `validate_country_code`, `validate_approved_regions`, `validate_website`, `validate_business_email_domain`, `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/companies/` | `list` |
| POST | `/api/v1/tenant/companies/` | `create` |
| GET | `/api/v1/tenant/companies/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/companies/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/companies/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/companies/{pk}/` | `destroy` |
| POST | `/api/v1/tenant/companies/{pk}/assign_capability/` | `assign_capability` |
| POST | `/api/v1/tenant/companies/{pk}/remove_capability/` | `remove_capability` |
| POST | `/api/v1/tenant/companies/{pk}/update-regions/` | `update_regions` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `apps.tenant.views.CompanyViewSet.destroy` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `detail`, `error`. Local service imports: none declared.
- `assign_capability`: `apps.tenant.views.CompanyViewSet.assign_capability` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `capability_code`. Direct Response dictionary keys: `error`, `success`. Local service imports: `apps.tenant.services.is_capability_allowed_for_company`, `apps.tenant.services.log_tenant_audit`.
- `remove_capability`: `apps.tenant.views.CompanyViewSet.remove_capability` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `capability_code`. Direct Response dictionary keys: `error`, `success`. Local service imports: `apps.tenant.services.log_tenant_audit`.
- `update_regions`: `apps.tenant.views.CompanyViewSet.update_regions` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `action`, `reason`, `region_code`. Direct Response dictionary keys: `error`. Local service imports: `apps.tenant.serializers.RegionChangeEventSerializer`, `apps.tenant.services.handle_vendor_region_change`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/hooks/useSupplierCompanies.ts](../../../../frontend/src/hooks/useSupplierCompanies.ts), [frontend/src/pages/catalog/AllProductsTab.tsx](../../../../frontend/src/pages/catalog/AllProductsTab.tsx), [frontend/src/pages/catalog/VendorAuditTab.tsx](../../../../frontend/src/pages/catalog/VendorAuditTab.tsx), [frontend/src/pages/catalog/VendorImportReviewTab.tsx](../../../../frontend/src/pages/catalog/VendorImportReviewTab.tsx), [frontend/src/pages/CompanyUsersPage.tsx](../../../../frontend/src/pages/CompanyUsersPage.tsx), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/IntegrationPage.tsx](../../../../frontend/src/pages/IntegrationPage.tsx), [frontend/src/pages/InvoicingPage.tsx](../../../../frontend/src/pages/InvoicingPage.tsx), [frontend/src/pages/regional/OperatingRegionSetup.tsx](../../../../frontend/src/pages/regional/OperatingRegionSetup.tsx), [frontend/src/pages/regional/RegionUpdateDialog.tsx](../../../../frontend/src/pages/regional/RegionUpdateDialog.tsx), [frontend/src/pages/RegionalPage.tsx](../../../../frontend/src/pages/RegionalPage.tsx), [frontend/src/pages/StubPages.tsx](../../../../frontend/src/pages/StubPages.tsx), [frontend/src/pages/VendorCatalogPage.tsx](../../../../frontend/src/pages/VendorCatalogPage.tsx).

## apps.tenant.views.DistributionCenterViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.DistributionCenter`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"tenant.distribution_center.list","retrieve":"tenant.distribution_center.read","create":"tenant.distribution_center.create","update":"tenant.distribution_center.update","partial_update":"tenant.distribution_center.update","destroy":"tenant.distribution_center.delete","review_region_config":"tenant.distribution_center.update"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.DistributionCenterSerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","vendor_company","vendor_company_name","name","status","address_line1","address_line2","city","state","zip_code","country_code","region_code","region_configuration_required","region_configuration_reviewed_at","region_configuration_reviewed_by","created_at","updated_at"]`. Read-only fields: `["id","created_at","updated_at","region_configuration_reviewed_at","region_configuration_reviewed_by"]`. Excluded: `[]`. Validation methods: `validate`.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/distribution-centers/` | `list` |
| POST | `/api/v1/tenant/distribution-centers/` | `create` |
| GET | `/api/v1/tenant/distribution-centers/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/distribution-centers/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/distribution-centers/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/distribution-centers/{pk}/` | `destroy` |
| POST | `/api/v1/tenant/distribution-centers/{pk}/review-region-config/` | `review_region_config` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `review_region_config`: `apps.tenant.views.DistributionCenterViewSet.review_region_config` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: `apps.tenant.services.log_tenant_audit`.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/regional/DistributionCenterDialog.tsx](../../../../frontend/src/pages/regional/DistributionCenterDialog.tsx), [frontend/src/pages/regional/ReviewRegionConfigDialog.tsx](../../../../frontend/src/pages/regional/ReviewRegionConfigDialog.tsx), [frontend/src/pages/RegionalPage.tsx](../../../../frontend/src/pages/RegionalPage.tsx).

## apps.tenant.views.RegionChangeEventViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.RegionChangeEvent`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"tenant.region_event.list","retrieve":"tenant.region_event.read"}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.RegionChangeEventSerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","vendor_company","vendor_company_name","region_code","action","regions_before","regions_after","visibility_recalculation_triggered","affected_buyer_count","actor_reference","reason","created_at"]`. Read-only fields: `["id","vendor_company","vendor_company_name","region_code","action","regions_before","regions_after","visibility_recalculation_triggered","affected_buyer_count","actor_reference","reason","created_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/region-events/` | `list` |
| GET | `/api/v1/tenant/region-events/{pk}/` | `retrieve` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/RegionalPage.tsx](../../../../frontend/src/pages/RegionalPage.tsx).

## apps.tenant.views.UserInvitationViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.UserInvitation`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `apps.tenant.serializers.UserInvitationSerializer` at [backend/apps/tenant/serializers.py](../../../../backend/apps/tenant/serializers.py).

Serializer fields: `["id","target_company","target_company_name","target_entity","email","first_name","last_name","job_title","phone_number","role_bundle","assigned_capabilities","status","expires_at","invited_by","invited_by_email","created_at","updated_at"]`. Read-only fields: `["id","status","expires_at","invited_by","created_at","updated_at"]`. Excluded: `[]`. Validation methods: none declared.

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/invitations/` | `list` |
| POST | `/api/v1/tenant/invitations/` | `create` |
| POST | `/api/v1/tenant/invitations/accept/` | `accept` |
| POST | `/api/v1/tenant/invitations/invite/` | `invite` |
| GET | `/api/v1/tenant/invitations/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/invitations/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/invitations/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/invitations/{pk}/` | `destroy` |
| POST | `/api/v1/tenant/invitations/{pk}/resend/` | `resend` |
| POST | `/api/v1/tenant/invitations/{pk}/revoke/` | `revoke` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `accept`: `apps.tenant.views.UserInvitationViewSet.accept` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `password`, `token`. Direct Response dictionary keys: `detail`, `email`, `error`. Local service imports: none declared.
- `invite`: `apps.tenant.views.UserInvitationViewSet.invite` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `assigned_capabilities`, `email`, `first_name`, `job_title`, `last_name`, `phone_number`, `role_bundle`, `target_company`. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `resend`: `apps.tenant.views.UserInvitationViewSet.resend` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.
- `revoke`: `apps.tenant.views.UserInvitationViewSet.revoke` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: `error`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/CompanyUsersPage.tsx](../../../../frontend/src/pages/CompanyUsersPage.tsx).

## apps.tenant.views.UserViewSet

Handler: [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Declared queryset model: `tenant.User`.

Declared permissions: `rest_framework.permissions.IsAuthenticated`. Authentication: `rest_framework.authentication.SessionAuthentication`, `apps.integration.authentication.CompanyAPIKeyAuthentication`, `rest_framework_simplejwt.authentication.JWTAuthentication`.

Throttles: `rest_framework.throttling.AnonRateThrottle`, `rest_framework.throttling.UserRateThrottle`. Required capability: `none`.

Action capability map: `{"list":"tenant.user.list","retrieve":"tenant.user.read","create":"tenant.user.create","update":"tenant.user.update","partial_update":"tenant.user.update","destroy":"tenant.user.delete","me":null,"confirm_email":null,"verify_token":null,"request_password_reset":null,"verify_reset_token":null,"reset_password":null,"unsubscribe":null,"resubscribe":null}`.

These are declarations, not a complete access proof: read custom permission,
queryset and action checks in the handler and its mixins. Plain Django views may
implement signature or session validation instead of DRF policies.

Serializer: `none` at framework/dynamic (inspect handler).

| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/v1/tenant/users/` | `list` |
| POST | `/api/v1/tenant/users/` | `create` |
| POST | `/api/v1/tenant/users/confirm_email/` | `confirm_email` |
| GET | `/api/v1/tenant/users/me/` | `me` |
| POST | `/api/v1/tenant/users/request_password_reset/` | `request_password_reset` |
| POST | `/api/v1/tenant/users/reset_password/` | `reset_password` |
| POST | `/api/v1/tenant/users/resubscribe/` | `resubscribe` |
| POST | `/api/v1/tenant/users/unsubscribe/` | `unsubscribe` |
| GET | `/api/v1/tenant/users/verify_reset_token/` | `verify_reset_token` |
| POST | `/api/v1/tenant/users/verify_reset_token/` | `verify_reset_token` |
| GET | `/api/v1/tenant/users/verify_token/` | `verify_token` |
| GET | `/api/v1/tenant/users/{pk}/` | `retrieve` |
| PUT | `/api/v1/tenant/users/{pk}/` | `update` |
| PATCH | `/api/v1/tenant/users/{pk}/` | `partial_update` |
| DELETE | `/api/v1/tenant/users/{pk}/` | `destroy` |
| POST | `/api/v1/tenant/users/{pk}/check_access/` | `check_access` |

- `list`: `rest_framework.mixins.ListModelMixin.list` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `create`: `rest_framework.mixins.CreateModelMixin.create` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `confirm_email`: `apps.tenant.views.UserViewSet.confirm_email` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `password`, `token`. Direct Response dictionary keys: `email`, `error`, `message`, `success`. Local service imports: `apps.tenant.models.UserInvitation`, `apps.tenant.services.accept_user_invitation`, `apps.tenant.services.send_welcome_email`, `apps.tenant.services.verify_onboarding_token`.
- `me`: `apps.tenant.views.UserViewSet.me` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `request_password_reset`: `apps.tenant.views.UserViewSet.request_password_reset` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `email`. Direct Response dictionary keys: `detail`, `error`. Local service imports: `apps.tenant.services.send_password_reset_email`.
- `reset_password`: `apps.tenant.views.UserViewSet.reset_password` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `password`, `token`. Direct Response dictionary keys: `email`, `error`, `message`, `success`. Local service imports: `apps.tenant.services.reset_user_password`.
- `resubscribe`: `apps.tenant.views.UserViewSet.resubscribe` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `email`, `first_name`. Direct Response dictionary keys: `error`, `message`, `success`. Local service imports: `apps.tenant.services.send_welcome_back_email`.
- `unsubscribe`: `apps.tenant.views.UserViewSet.unsubscribe` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `email`, `first_name`. Direct Response dictionary keys: `error`, `message`, `success`. Local service imports: `apps.tenant.services.send_unsubscribed_email`.
- `verify_reset_token`: `apps.tenant.views.UserViewSet.verify_reset_token` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `token`. Direct Response dictionary keys: `email`, `error`, `first_name`, `valid`. Local service imports: `apps.tenant.services.verify_password_reset_token`.
- `verify_token`: `apps.tenant.views.UserViewSet.verify_token` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `token`. Direct Response dictionary keys: `company_name`, `email`, `error`, `first_name`, `type`, `valid`. Local service imports: `apps.tenant.models.InvitationStatus`, `apps.tenant.models.UserInvitation`, `apps.tenant.services.verify_onboarding_token`.
- `retrieve`: `rest_framework.mixins.RetrieveModelMixin.retrieve` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `update`: `rest_framework.mixins.UpdateModelMixin.update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `partial_update`: `rest_framework.mixins.UpdateModelMixin.partial_update` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `destroy`: `rest_framework.mixins.DestroyModelMixin.destroy` in framework/dynamic (inspect handler). Direct request/query keys: none declared. Direct Response dictionary keys: none declared. Local service imports: none declared.
- `check_access`: `apps.tenant.views.UserViewSet.check_access` in [backend/apps/tenant/views.py](../../../../backend/apps/tenant/views.py). Direct request/query keys: `capability_code`. Direct Response dictionary keys: `capability_code`, `error`, `granted`, `reason`. Local service imports: none declared.

Request/response key extraction is static and partial; inherited CRUD uses the
serializer above. Action-specific serializers, nested schemas, validations,
service calls and conditional response redaction must be read in source.

Frontend consumers (resource-path text matches; confirm action callers): [frontend/src/pages/ConfirmEmailPage.tsx](../../../../frontend/src/pages/ConfirmEmailPage.tsx), [frontend/src/pages/DashboardPage.tsx](../../../../frontend/src/pages/DashboardPage.tsx), [frontend/src/pages/LoginPage.tsx](../../../../frontend/src/pages/LoginPage.tsx), [frontend/src/pages/ResetPasswordPage.tsx](../../../../frontend/src/pages/ResetPasswordPage.tsx), [frontend/src/pages/StubPages.tsx](../../../../frontend/src/pages/StubPages.tsx), [frontend/src/stores/authStore.ts](../../../../frontend/src/stores/authStore.ts).

