# tenant — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## tenant.Capability

Table: `tenant_capability`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `code` / `code` | `CharField` | `unique; NOT NULL; length=150; default="<not set>"` | `—` |
| `description` / `description` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `module` / `module` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["module","code"]`.

## tenant.CapabilityDelegationEvidence

Table: `tenant_capability_delegation_evidence`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `actor` / `actor_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=delegation_actions` |
| `target_user` / `target_user_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=received_delegations` |
| `company` / `company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=(default)` |
| `capability` / `capability_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Capability; PROTECT; reverse=(default)` |
| `action` / `action` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `passed_7point_rule` / `passed_7point_rule` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-created_at"]`.

## tenant.ChildOnboardingRequest

Table: `tenant_child_onboarding_request`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `parent_company` / `parent_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=child_onboarding_requests` |
| `requester` / `requester_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=submitted_onboarding_requests` |
| `company_name` / `company_name` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `brand_name` / `brand_name` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `website` / `website` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `region` / `region` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `primary_contact` / `primary_contact` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `business_email_domain` / `business_email_domain` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `commission_percentage` / `commission_percentage` | `DecimalField` | `NOT NULL; precision=5, scale=2; default=14` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="submitted"` | `—` |
| `rejection_reason` / `rejection_reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `decision_by` / `decision_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=decided_onboarding_requests` |
| `decision_timestamp` / `decision_timestamp` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["submitted","Submitted"],["approved","Approved"],["rejected","Rejected"],["withdrawn","Withdrawn"],["expired","Expired"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-created_at"]`.

## tenant.Company

Table: `tenant_company`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `name` / `name` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `company_type` / `company_type` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `parent_company` / `parent_company_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.Company; PROTECT; reverse=child_companies` |
| `buyer_pricing_mode` / `buyer_pricing_mode` | `CharField` | `NOT NULL; length=30; default="standard"` | `—` |
| `commission_percentage` / `commission_percentage` | `DecimalField` | `NOT NULL; precision=5, scale=2; default=14` | `—` |
| `external_id` / `external_id` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `slug` / `slug` | `SlugField` | `unique; indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `display_name` / `display_name` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `website` / `website` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `business_email_domain` / `business_email_domain` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `primary_contact_name` / `primary_contact_name` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `primary_contact_email` / `primary_contact_email` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `phone_number` / `phone_number` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `address_line1` / `address_line1` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `address_line2` / `address_line2` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `is_parent` / `is_parent` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `country_code` / `country_code` | `CharField` | `NOT NULL; blank allowed; length=3; default="<not set>"` | `—` |
| `region_code` / `region_code` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `approved_regions` / `approved_regions` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `allowed_channels` / `allowed_channels` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `map_pricing_enforced` / `map_pricing_enforced` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `return_address` / `return_address` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `return_address_line1` / `return_address_line1` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `return_address_line2` / `return_address_line2` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `return_city` / `return_city` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `return_state` / `return_state` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `return_zip_code` / `return_zip_code` | `CharField` | `NOT NULL; blank allowed; length=20; default="<not set>"` | `—` |
| `order_digest_emails` / `order_digest_emails` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `created_by` / `created_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `capabilities` / `capabilities` | `ManyToManyField` | `NOT NULL; blank allowed; default="<not set>"` | `tenant.Capability; M2M; reverse=companies; through=tenant.Company_capabilities` |

Choices (stored value → display label):

- `company_type`: `[["cixci_internal","CIXCI Internal"],["buyer","Buyer"],["vendor","Vendor (Accessory)"],["manufacturer","Device Manufacturer"],["partner","Partner"],["device_distributor","Device Distributor"]]`
- `status`: `[["draft","Draft"],["pending_setup","Pending Setup"],["active","Active"],["suspended","Suspended"],["archived","Archived"],["retired","Retired"]]`
- `buyer_pricing_mode`: `[["standard","Standard Buyer Commission"],["no_commission","No Buyer Commission"],["custom","Custom Buyer Commission"]]`

Indexes: `[["django.db.models.Index",[],{"name":"tenant_comp_company_5a8853_idx","fields":["company_type","status"]}],["django.db.models.Index",[],{"name":"tenant_comp_parent__ea0b6a_idx","fields":["parent_company"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## tenant.CompanyEntity

Table: `tenant_company_entity`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company` / `company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=entities` |
| `operating_region` / `operating_region_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.OperatingRegion; PROTECT; reverse=buyer_entities` |
| `name` / `name` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `allowed_channels_override` / `allowed_channels_override` | `JSONField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `country_code` / `country_code` | `CharField` | `NOT NULL; blank allowed; length=3; default="<not set>"` | `—` |
| `region_code` / `region_code` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["active","Active"],["suspended","Suspended"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"tenant_comp_company_b8dc18_idx","fields":["company","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## tenant.CompanyRelationship

Table: `tenant_company_relationship`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `buyer_company` / `buyer_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=buyer_relationships` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=vendor_relationships` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `eligible_product_types` / `eligible_product_types` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `eligible_regions` / `eligible_regions` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `approved_at` / `approved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `approved_by` / `approved_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=approved_relationships` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["active","Active"],["suspended","Suspended"],["terminated","Terminated"]]`

Indexes: `[["django.db.models.Index",[],{"name":"tenant_comp_buyer_c_bb7790_idx","fields":["buyer_company","status"]}],["django.db.models.Index",[],{"name":"tenant_comp_vendor__e75f8e_idx","fields":["vendor_company","status"]}]]`.

Constraints: `[]`.

Unique together: `[["buyer_company","vendor_company"]]`. Ordering: `[]`.

## tenant.CompanyUserMembership

Table: `tenant_company_user_membership`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `user` / `user_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; CASCADE; reverse=company_memberships` |
| `company` / `company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; CASCADE; reverse=memberships` |
| `entity` / `entity_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.CompanyEntity; CASCADE; reverse=memberships` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="active"` | `—` |
| `role_bundle` / `role_bundle` | `CharField` | `NOT NULL; length=100; default="standard_user"` | `—` |
| `is_company_admin` / `is_company_admin` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `assigned_capabilities` / `assigned_capabilities` | `ManyToManyField` | `NOT NULL; blank allowed; default="<not set>"` | `tenant.Capability; M2M; reverse=membership_assignments; through=tenant.CompanyUserMembership_assigned_capabilities` |
| `delegated_capabilities` / `delegated_capabilities` | `ManyToManyField` | `NOT NULL; blank allowed; default="<not set>"` | `tenant.Capability; M2M; reverse=membership_delegations; through=tenant.CompanyUserMembership_delegated_capabilities` |

Choices (stored value → display label):

- `status`: `[["active","Active"],["suspended","Suspended"],["deactivated","Deactivated"]]`

Indexes: `[["django.db.models.Index",[],{"name":"tenant_comp_company_05800d_idx","fields":["company","status"]}],["django.db.models.Index",[],{"name":"tenant_comp_user_id_e51d83_idx","fields":["user","status"]}]]`.

Constraints: `[]`.

Unique together: `[["user","company"]]`. Ordering: `[]`.

## tenant.CompanyUserMembership_assigned_capabilities

Table: `tenant_company_user_membership_assigned_capabilities`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py). Automatic M2M join model.

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `companyusermembership` / `companyusermembership_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.CompanyUserMembership; CASCADE; reverse=CompanyUserMembership_assigned_capabilities+` |
| `capability` / `capability_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Capability; CASCADE; reverse=CompanyUserMembership_assigned_capabilities+` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["companyusermembership","capability"]]`. Ordering: `[]`.

## tenant.CompanyUserMembership_delegated_capabilities

Table: `tenant_company_user_membership_delegated_capabilities`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py). Automatic M2M join model.

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `companyusermembership` / `companyusermembership_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.CompanyUserMembership; CASCADE; reverse=CompanyUserMembership_delegated_capabilities+` |
| `capability` / `capability_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Capability; CASCADE; reverse=CompanyUserMembership_delegated_capabilities+` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["companyusermembership","capability"]]`. Ordering: `[]`.

## tenant.Company_capabilities

Table: `tenant_company_capabilities`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py). Automatic M2M join model.

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `company` / `company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; CASCADE; reverse=Company_capabilities+` |
| `capability` / `capability_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Capability; CASCADE; reverse=Company_capabilities+` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["company","capability"]]`. Ordering: `[]`.

## tenant.DistributionCenter

Table: `tenant_distribution_center`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=distribution_centers` |
| `name` / `name` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `address_line1` / `address_line1` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `address_line2` / `address_line2` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `city` / `city` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `state` / `state` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `zip_code` / `zip_code` | `CharField` | `NOT NULL; blank allowed; length=20; default="<not set>"` | `—` |
| `country_code` / `country_code` | `CharField` | `NOT NULL; blank allowed; length=3; default="<not set>"` | `—` |
| `region_code` / `region_code` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `region_configuration_required` / `region_configuration_required` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `region_configuration_reviewed_at` / `region_configuration_reviewed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `region_configuration_reviewed_by` / `region_configuration_reviewed_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["active","Active"],["suspended","Suspended"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"tenant_dist_vendor__e72d21_idx","fields":["vendor_company","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## tenant.EffectiveCompanyAdminEvidence

Table: `tenant_effective_admin_evidence`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company` / `company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; CASCADE; reverse=admin_continuity_evidence` |
| `active_admin_count` / `active_admin_count` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `verified_at` / `verified_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `actor` / `actor_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=(default)` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-verified_at"]`.

## tenant.OperatingRegion

Table: `tenant_operatingregion`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `code` / `code` | `SlugField` | `unique; indexed; NOT NULL; length=50; default="<not set>"` | `—` |
| `name` / `name` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["name","code"]`.

## tenant.RegionChangeEvent

Table: `tenant_region_change_event`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=region_change_events` |
| `region_code` / `region_code` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `action` / `action` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `regions_before` / `regions_before` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `regions_after` / `regions_after` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `visibility_recalculation_triggered` / `visibility_recalculation_triggered` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `affected_buyer_count` / `affected_buyer_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `reason` / `reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `action`: `[["region_activated","Region Activated"],["region_deactivated","Region Deactivated"]]`

Indexes: `[["django.db.models.Index",[],{"name":"tenant_regi_vendor__de443b_idx","fields":["vendor_company","region_code"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-created_at"]`.

## tenant.User

Table: `tenant_user`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `password` / `password` | `CharField` | `NOT NULL; length=128; default="<not set>"` | `—` |
| `last_login` / `last_login` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `is_superuser` / `is_superuser` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `email` / `email` | `CharField` | `unique; NOT NULL; length=254; default="<not set>"` | `—` |
| `entity` / `entity_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.CompanyEntity; PROTECT; reverse=users` |
| `first_name` / `first_name` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `last_name` / `last_name` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `is_staff` / `is_staff` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `is_cixci_admin` / `is_cixci_admin` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `last_login_at` / `last_login_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `groups` / `groups` | `ManyToManyField` | `NOT NULL; blank allowed; default="<not set>"` | `auth.Group; M2M; reverse=user_set; through=tenant.User_groups` |
| `user_permissions` / `user_permissions` | `ManyToManyField` | `NOT NULL; blank allowed; default="<not set>"` | `auth.Permission; M2M; reverse=user_set; through=tenant.User_user_permissions` |
| `capabilities` / `capabilities` | `ManyToManyField` | `NOT NULL; blank allowed; default="<not set>"` | `tenant.Capability; M2M; reverse=users; through=tenant.User_capabilities` |

Indexes: `[["django.db.models.Index",[],{"name":"tenant_user_entity__754571_idx","fields":["entity","is_active"]}],["django.db.models.Index",[],{"name":"tenant_user_is_cixc_ef0af1_idx","fields":["is_cixci_admin"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## tenant.UserInvitation

Table: `tenant_user_invitation`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `target_company` / `target_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; CASCADE; reverse=user_invitations` |
| `target_entity` / `target_entity_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.CompanyEntity; CASCADE; reverse=user_invitations` |
| `email` / `email` | `CharField` | `indexed; NOT NULL; length=254; default="<not set>"` | `—` |
| `first_name` / `first_name` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `last_name` / `last_name` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `job_title` / `job_title` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `phone_number` / `phone_number` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `role_bundle` / `role_bundle` | `CharField` | `NOT NULL; length=100; default="standard_user"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `token` / `token` | `CharField` | `unique; NOT NULL; length=255; default="<not set>"` | `—` |
| `expires_at` / `expires_at` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `invited_by` / `invited_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=sent_invitations` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `assigned_capabilities` / `assigned_capabilities` | `ManyToManyField` | `NOT NULL; blank allowed; default="<not set>"` | `tenant.Capability; M2M; reverse=invitations; through=tenant.UserInvitation_assigned_capabilities` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["accepted","Accepted"],["expired","Expired"],["revoked","Revoked"]]`

Indexes: `[["django.db.models.Index",[],{"name":"tenant_user_target__a8ffdf_idx","fields":["target_company","status"]}],["django.db.models.Index",[],{"name":"tenant_user_email_e46fa6_idx","fields":["email","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-created_at"]`.

## tenant.UserInvitation_assigned_capabilities

Table: `tenant_user_invitation_assigned_capabilities`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py). Automatic M2M join model.

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `userinvitation` / `userinvitation_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.UserInvitation; CASCADE; reverse=UserInvitation_assigned_capabilities+` |
| `capability` / `capability_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Capability; CASCADE; reverse=UserInvitation_assigned_capabilities+` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["userinvitation","capability"]]`. Ordering: `[]`.

## tenant.User_capabilities

Table: `tenant_user_capabilities`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py). Automatic M2M join model.

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `user` / `user_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; CASCADE; reverse=User_capabilities+` |
| `capability` / `capability_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Capability; CASCADE; reverse=User_capabilities+` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["user","capability"]]`. Ordering: `[]`.

## tenant.User_groups

Table: `tenant_user_groups`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py). Automatic M2M join model.

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `user` / `user_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; CASCADE; reverse=User_groups+` |
| `group` / `group_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `auth.Group; CASCADE; reverse=User_groups+` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["user","group"]]`. Ordering: `[]`.

## tenant.User_user_permissions

Table: `tenant_user_user_permissions`. Source: [backend/apps/tenant/models.py](../../../../backend/apps/tenant/models.py). Automatic M2M join model.

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `user` / `user_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; CASCADE; reverse=User_user_permissions+` |
| `permission` / `permission_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `auth.Permission; CASCADE; reverse=User_user_permissions+` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["user","permission"]]`. Ordering: `[]`.

## Migrations

- [backend/apps/tenant/migrations/0001_initial.py](../../../../backend/apps/tenant/migrations/0001_initial.py)
- [backend/apps/tenant/migrations/0002_company_address_company_approved_regions_and_more.py](../../../../backend/apps/tenant/migrations/0002_company_address_company_approved_regions_and_more.py)
- [backend/apps/tenant/migrations/0003_alter_company_allowed_channels.py](../../../../backend/apps/tenant/migrations/0003_alter_company_allowed_channels.py)
- [backend/apps/tenant/migrations/0004_remove_company_address_company_address_line1_and_more.py](../../../../backend/apps/tenant/migrations/0004_remove_company_address_company_address_line1_and_more.py)
- [backend/apps/tenant/migrations/0005_alter_company_company_type.py](../../../../backend/apps/tenant/migrations/0005_alter_company_company_type.py)
- [backend/apps/tenant/migrations/0006_childonboardingrequest_commission_percentage_and_more.py](../../../../backend/apps/tenant/migrations/0006_childonboardingrequest_commission_percentage_and_more.py)
- [backend/apps/tenant/migrations/0007_company_map_pricing_enforced.py](../../../../backend/apps/tenant/migrations/0007_company_map_pricing_enforced.py)
- [backend/apps/tenant/migrations/0008_company_order_digest_emails_company_return_address.py](../../../../backend/apps/tenant/migrations/0008_company_order_digest_emails_company_return_address.py)
- [backend/apps/tenant/migrations/0009_capabilitydelegationevidence_and_more.py](../../../../backend/apps/tenant/migrations/0009_capabilitydelegationevidence_and_more.py)
- [backend/apps/tenant/migrations/0010_buyer_data_integration_spec.py](../../../../backend/apps/tenant/migrations/0010_buyer_data_integration_spec.py)
- [backend/apps/tenant/migrations/0011_buyer_price_capability.py](../../../../backend/apps/tenant/migrations/0011_buyer_price_capability.py)
- [backend/apps/tenant/migrations/0012_distributioncenter_regionchangeevent.py](../../../../backend/apps/tenant/migrations/0012_distributioncenter_regionchangeevent.py)
- [backend/apps/tenant/migrations/0013_explicit_operating_regions.py](../../../../backend/apps/tenant/migrations/0013_explicit_operating_regions.py)
- [backend/apps/tenant/migrations/0014_buyer_region_from_country.py](../../../../backend/apps/tenant/migrations/0014_buyer_region_from_country.py)
