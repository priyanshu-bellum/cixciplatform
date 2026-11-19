# devices — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## devices.BuyerDevicePortfolioChangeRecord

Table: `device_buyer_portfolio_change_record`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `portfolio_reference` / `portfolio_reference_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.BuyerDevicePortfolioReference; PROTECT; reverse=change_records` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_entity_reference` / `buyer_entity_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `change_type` / `change_type` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `change_source` / `change_source` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `device` / `device_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.Device; PROTECT; reverse=(default)` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `service_trigger_reference` / `service_trigger_reference` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `actor_is_admin_on_behalf` / `actor_is_admin_on_behalf` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `resulting_snapshot` / `resulting_snapshot_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `devices.BuyerDevicePortfolioSnapshot; PROTECT; reverse=(default)` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `change_type`: `[["device_added","Device Added"],["device_removed","Device Removed"],["device_reactivated","Device Reactivated"],["device_deactivated","Device Deactivated"],["portfolio_reset","Portfolio Reset"],["admin_correction","Admin Correction"],["service_sync","Service Identity Sync"],["system_correction","System Correction"]]`
- `change_source`: `[["buyer_action","Buyer Action"],["admin_on_behalf","Admin On Behalf"],["service_identity_sync","Service Identity Sync"],["system_correction","System Correction"]]`

Indexes: `[["django.db.models.Index",[],{"name":"device_buye_buyer_r_320260_idx","fields":["buyer_reference","company_scope_reference","created_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.BuyerDevicePortfolioReference

Table: `device_buyer_portfolio_reference`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device` / `device_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.Device; PROTECT; reverse=portfolio_references` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_entity_reference` / `buyer_entity_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `active_flag` / `active_flag` | `BooleanField` | `indexed; NOT NULL; default=true` | `—` |
| `change_source` / `change_source` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `last_change_timestamp` / `last_change_timestamp` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `current_portfolio_snapshot_reference` / `current_portfolio_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `change_source`: `[["buyer_action","Buyer Action"],["admin_on_behalf","Admin On Behalf"],["service_identity_sync","Service Identity Sync"],["system_correction","System Correction"]]`

Indexes: `[["django.db.models.Index",[],{"name":"device_buye_buyer_r_5c79a1_idx","fields":["buyer_reference","company_scope_reference","active_flag"]}]]`.

Constraints: `[]`.

Unique together: `[["device","buyer_reference","company_scope_reference","buyer_entity_reference"]]`. Ordering: `[]`.

## devices.BuyerDevicePortfolioSnapshot

Table: `device_buyer_portfolio_snapshot`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_entity_reference` / `buyer_entity_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `device_ids` / `device_ids` | `JSONField` | `NOT NULL; default="<not set>"` | `—` |
| `device_count` / `device_count` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `triggered_by_change_record` / `triggered_by_change_record` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `snapshot_reason` / `snapshot_reason` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"device_buye_buyer_r_c727e9_idx","fields":["buyer_reference","company_scope_reference","created_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.CompatibilityMarker

Table: `device_compatibility_marker`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device` / `device_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.Device; PROTECT; reverse=compatibility_markers` |
| `raw_attribute` / `raw_attribute` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `raw_value` / `raw_value` | `CharField` | `NOT NULL; length=500; default="<not set>"` | `—` |
| `normalized_feature_group` / `normalized_feature_group_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `devices.FeatureGroup; SET_NULL; reverse=(default)` |
| `normalized_feature_value` / `normalized_feature_value_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `devices.FeatureValue; SET_NULL; reverse=(default)` |
| `normalization_status` / `normalization_status` | `CharField` | `NOT NULL; length=30; default="pending"` | `—` |
| `import_job_reference` / `import_job_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.DataQualityException

Table: `device_data_quality_exception`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device` / `device_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `devices.Device; PROTECT; reverse=dqe_records` |
| `compatibility_marker` / `compatibility_marker_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `devices.CompatibilityMarker; PROTECT; reverse=(default)` |
| `exception_type` / `exception_type` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `description` / `description` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="created"` | `—` |
| `review_actor_reference` / `review_actor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `resolution_note` / `resolution_note` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `resolved_at` / `resolved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["created","Created"],["under_review","Under Review"],["resolved","Resolved"],["dismissed","Dismissed"],["unresolved","Unresolved"]]`

Indexes: `[["django.db.models.Index",[],{"name":"device_data_status_c8637d_idx","fields":["status","created_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.Device

Table: `device_device`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device_type` / `device_type_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.DeviceType; PROTECT; reverse=devices` |
| `manufacturer` / `manufacturer_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.Manufacturer; PROTECT; reverse=devices` |
| `name` / `name` | `CharField` | `NOT NULL; length=150; default="<not set>"` | `—` |
| `model_number` / `model_number` | `CharField` | `indexed; NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `sku` / `sku` | `CharField` | `indexed; NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `lifecycle_status` / `lifecycle_status` | `CharField` | `NOT NULL; length=20; default="available"` | `—` |
| `announced_date` / `announced_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `release_date` / `release_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `launch_date` / `launch_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `eol_date` / `eol_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `image_readiness_reference` / `image_readiness_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `imported_by` / `imported_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `bluetooth_compatibility` / `bluetooth_compatibility` | `CharField` | `NOT NULL; blank allowed; length=50; default="Yes"` | `—` |
| `headphone_jack_compatibility` / `headphone_jack_compatibility` | `CharField` | `NOT NULL; blank allowed; length=50; default="Not Compatible"` | `—` |
| `compatible_charging_interface` / `compatible_charging_interface` | `CharField` | `NOT NULL; blank allowed; length=50; default="Not Compatible"` | `—` |
| `wireless_charging_compatibility` / `wireless_charging_compatibility` | `CharField` | `NOT NULL; blank allowed; length=100; default="Not Compatible"` | `—` |
| `storage_expansion_compatibility` / `storage_expansion_compatibility` | `CharField` | `NOT NULL; blank allowed; length=50; default="Not Compatible"` | `—` |
| `maximum_supported_storage` / `maximum_supported_storage` | `CharField` | `NOT NULL; blank allowed; length=50; default="Not Compatible"` | `—` |
| `compatible_watch_case_size` / `compatible_watch_case_size` | `CharField` | `NOT NULL; blank allowed; length=50; default="Not Compatible"` | `—` |

Choices (stored value → display label):

- `lifecycle_status`: `[["available","Available"],["launching","Launching"],["inactive","Inactive"],["eol","EOL"],["announced","Announced"],["current","Current"],["legacy","Legacy"],["retired","Retired"],["archived","Archived"]]`

Indexes: `[["django.db.models.Index",[],{"name":"device_devi_lifecyc_175007_idx","fields":["lifecycle_status"]}],["django.db.models.Index",[],{"name":"device_devi_manufac_5904bb_idx","fields":["manufacturer","device_type"]}],["django.db.models.Index",[],{"name":"device_devi_model_n_bdfe4b_idx","fields":["model_number"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.DeviceCapabilityEvidence

Table: `device_capability_evidence`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device` / `device_id` | `OneToOneField` | `unique; indexed; NOT NULL; default="<not set>"` | `devices.Device; PROTECT; reverse=capability_evidence` |
| `feature_snapshot` / `feature_snapshot` | `JSONField` | `NOT NULL; default="<not set>"` | `—` |
| `profile_compliance` / `profile_compliance` | `CharField` | `NOT NULL; length=30; default="unknown"` | `—` |
| `non_compliant_groups` / `non_compliant_groups` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `generated_at` / `generated_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `generation_triggered_by` / `generation_triggered_by` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.DeviceCapabilityProfile

Table: `device_capability_profile`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device_type` / `device_type_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.DeviceType; PROTECT; reverse=capability_profiles` |
| `feature_group` / `feature_group_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.FeatureGroup; PROTECT; reverse=(default)` |
| `requirement_level` / `requirement_level` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `requirement_level`: `[["required","Required"],["optional","Optional"],["unsupported","Unsupported"],["review_required","Review Required"]]`
- `status`: `[["draft","Draft"],["active","Active"],["superseded","Superseded"],["retired","Retired"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["device_type","feature_group","status"]]`. Ordering: `[]`.

## devices.DeviceFeatureAssignment

Table: `device_feature_assignment`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device` / `device_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.Device; PROTECT; reverse=feature_assignments` |
| `feature_group` / `feature_group_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.FeatureGroup; PROTECT; reverse=(default)` |
| `feature_value` / `feature_value_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.FeatureValue; PROTECT; reverse=(default)` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `is_override` / `is_override` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `override_reason` / `override_reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `override_actor_reference` / `override_actor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `audit_record_reference` / `audit_record_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"device_feat_device__05d595_idx","fields":["device","feature_group","is_active"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.DeviceType

Table: `device_type`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `name` / `name` | `CharField` | `unique; NOT NULL; length=100; default="<not set>"` | `—` |
| `code` / `code` | `SlugField` | `unique; indexed; NOT NULL; length=50; default="<not set>"` | `—` |
| `description` / `description` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="setup_required"` | `—` |
| `auto_mapping_eligible` / `auto_mapping_eligible` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `supported_accessory_categories` / `supported_accessory_categories` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `compatibility_rules` / `compatibility_rules` | `JSONField` | `NOT NULL; blank allowed; default="builtins.dict (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.FeatureGroup

Table: `device_feature_group`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `device_type` / `device_type_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.DeviceType; PROTECT; reverse=feature_groups` |
| `name` / `name` | `CharField` | `NOT NULL; length=150; default="<not set>"` | `—` |
| `code` / `code` | `SlugField` | `indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `description` / `description` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `lifecycle` / `lifecycle` | `CharField` | `NOT NULL; length=15; default="draft"` | `—` |
| `is_required_for_compatibility` / `is_required_for_compatibility` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `lifecycle`: `[["draft","Draft"],["active","Active"],["deprecated","Deprecated"],["retired","Retired"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["device_type","code"]]`. Ordering: `[]`.

## devices.FeatureValue

Table: `device_feature_value`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `feature_group` / `feature_group_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.FeatureGroup; PROTECT; reverse=values` |
| `value` / `value` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `code` / `code` | `SlugField` | `indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `lifecycle` / `lifecycle` | `CharField` | `NOT NULL; length=15; default="draft"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `lifecycle`: `[["draft","Draft"],["active","Active"],["deprecated","Deprecated"],["retired","Retired"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["feature_group","code"]]`. Ordering: `[]`.

## devices.Manufacturer

Table: `device_manufacturer`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `name` / `name` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `company_reference` / `company_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## devices.SuggestedNormalization

Table: `device_suggested_normalization`. Source: [backend/apps/devices/models.py](../../../../backend/apps/devices/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `compatibility_marker` / `compatibility_marker_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.CompatibilityMarker; PROTECT; reverse=normalizations` |
| `suggested_feature_group` / `suggested_feature_group_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.FeatureGroup; PROTECT; reverse=(default)` |
| `suggested_feature_value` / `suggested_feature_value_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.FeatureValue; PROTECT; reverse=(default)` |
| `confidence_score` / `confidence_score` | `FloatField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="pending"` | `—` |
| `accepted_by` / `accepted_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `resulting_assignment` / `resulting_assignment_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `devices.DeviceFeatureAssignment; PROTECT; reverse=(default)` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/devices/migrations/0001_initial.py](../../../../backend/apps/devices/migrations/0001_initial.py)
- [backend/apps/devices/migrations/0002_device_bluetooth_compatibility_and_more.py](../../../../backend/apps/devices/migrations/0002_device_bluetooth_compatibility_and_more.py)
- [backend/apps/devices/migrations/0003_devicetype_auto_mapping_eligible_and_more.py](../../../../backend/apps/devices/migrations/0003_devicetype_auto_mapping_eligible_and_more.py)
- [backend/apps/devices/migrations/0004_alter_device_name.py](../../../../backend/apps/devices/migrations/0004_alter_device_name.py)
- [backend/apps/devices/migrations/0005_alter_device_lifecycle_status.py](../../../../backend/apps/devices/migrations/0005_alter_device_lifecycle_status.py)
