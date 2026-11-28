# catalog — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## catalog.Brand

Table: `catalog_brand`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `name` / `name` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `canonical_key` / `canonical_key` | `CharField` | `unique; NOT NULL; length=200; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## catalog.BuyerExportMapping

Table: `catalog_buyer_export_mapping`. Source: [backend/apps/catalog/offer_models.py](../../../../backend/apps/catalog/offer_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company` / `company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=(default)` |
| `entity` / `entity_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.CompanyEntity; PROTECT; reverse=(default)` |
| `storefront` / `storefront_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `integration.BuyerStorefront; PROTECT; reverse=(default)` |
| `product` / `product_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `catalog.Product; PROTECT; reverse=export_mappings` |
| `supplier_reference` / `supplier_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `export_job` / `export_job_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `catalog.BuyerProductExportJob; PROTECT; reverse=(default)` |
| `listing_reference` / `listing_reference` | `CharField` | `NOT NULL; length=500; default="<not set>"` | `—` |
| `external_listing_id` / `external_listing_id` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `external_variant_id` / `external_variant_id` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `version` / `version` | `PositiveIntegerField` | `NOT NULL; default=1` | `—` |
| `status` / `status` | `CharField` | `indexed; NOT NULL; length=30; default="active"` | `—` |
| `pricing_snapshot_reference` / `pricing_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `exported_at` / `exported_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `superseded_at` / `superseded_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `migration_evidence` / `migration_evidence` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"catalog_buy_company_a24c43_idx","fields":["company","entity","product","status"]}]]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"export_active_listing","fields":["storefront","listing_reference"],"condition":"(AND: ('status', 'active'), ('storefront__isnull', False))"}],["django.db.models.UniqueConstraint",[],{"name":"export_legacy_active_listing","fields":["company","entity","listing_reference"],"condition":"(AND: ('status', 'active'), ('storefront__isnull', True))"}],["django.db.models.UniqueConstraint",[],{"name":"export_listing_version","fields":["storefront","listing_reference","version"],"condition":"(AND: ('storefront__isnull', False))"}],["django.db.models.UniqueConstraint",[],{"name":"export_legacy_listing_version","fields":["company","entity","listing_reference","version"],"condition":"(AND: ('storefront__isnull', True))"}],["django.db.models.UniqueConstraint",[],{"name":"export_active_external_variant","fields":["storefront","external_variant_id"],"condition":"(AND: ('status', 'active'), ('storefront__isnull', False), (NOT (AND: ('external_variant_id', ''))))"}],["django.db.models.UniqueConstraint",[],{"name":"export_active_external_listing","fields":["storefront","external_listing_id"],"condition":"(AND: ('external_variant_id', ''), ('status', 'active'), ('storefront__isnull', False), (NOT (AND: ('external_listing_id', ''))))"}]]`.

Unique together: `[]`. Ordering: `[]`.

## catalog.BuyerProductExportDate

Table: `catalog_buyer_product_exported_date`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_entity_reference` / `buyer_entity_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `product` / `product_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `catalog.Product; CASCADE; reverse=exported_dates` |
| `device_reference` / `device_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `exported_at` / `exported_at` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"catalog_buy_company_bac888_idx","fields":["company_scope_reference","product"]}],["django.db.models.Index",[],{"name":"catalog_buy_company_4d82bf_idx","fields":["company_scope_reference","device_reference"]}]]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"unique_buyer_product_device_export","fields":["company_scope_reference","buyer_entity_reference","product","device_reference"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## catalog.BuyerProductExportJob

Table: `catalog_buyer_export_job`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_entity_reference` / `buyer_entity_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `storefront` / `storefront_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `integration.BuyerStorefront; PROTECT; reverse=(default)` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="pending"` | `—` |
| `portfolio_snapshot_reference` / `portfolio_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `compatibility_projection_reference` / `compatibility_projection_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `device_reference` / `device_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `include_incompatible` / `include_incompatible` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `include_media_missing` / `include_media_missing` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `format` / `format` | `CharField` | `NOT NULL; length=20; default="API"` | `—` |
| `output_file_reference` / `output_file_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `product_count` / `product_count` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `requested_by` / `requested_by` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `trigger_type` / `trigger_type` | `CharField` | `NOT NULL; length=10; default="USER"` | `—` |
| `triggered_by_id` / `triggered_by_id` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `triggered_by_name` / `triggered_by_name` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `triggered_by_role` / `triggered_by_role` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `failure_details` / `failure_details` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `started_at` / `started_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["running","Running"],["processing","Processing"],["completed","Completed"],["completed_with_errors","Completed with Errors"],["failed","Failed"],["cancelled","Cancelled"],["canceled","Canceled"]]`
- `trigger_type`: `[["USER","User"],["SYSTEM","System"]]`

Indexes: `[["django.db.models.Index",[],{"name":"catalog_buy_buyer_r_ff5a46_idx","fields":["buyer_reference","status","created_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## catalog.BuyerProductExportSelectionSnapshot

Table: `catalog_export_selection_snapshot`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `export_job` / `export_job_id` | `OneToOneField` | `unique; indexed; NOT NULL; default="<not set>"` | `catalog.BuyerProductExportJob; PROTECT; reverse=selection_snapshot` |
| `product_ids` / `product_ids` | `JSONField` | `NOT NULL; default="<not set>"` | `—` |
| `exported_products_snapshot` / `exported_products_snapshot` | `JSONField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `portfolio_snapshot_reference` / `portfolio_snapshot_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## catalog.BuyerScopedCompatibilityProjection

Table: `catalog_buyer_compatibility_projection`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_entity_reference` / `buyer_entity_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `portfolio_snapshot_reference` / `portfolio_snapshot_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="recalculating"` | `—` |
| `compatible_product_ids` / `compatible_product_ids` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `compatible_product_count` / `compatible_product_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `incompatible_product_ids` / `incompatible_product_ids` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `last_recalculated_at` / `last_recalculated_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `recalculation_trigger` / `recalculation_trigger` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `recalculation_duration_ms` / `recalculation_duration_ms` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `review_required_reason` / `review_required_reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["active","Active"],["stale","Stale"],["recalculating","Recalculating"],["review_required","Review Required"],["empty_portfolio","Empty Portfolio"]]`

Indexes: `[["django.db.models.Index",[],{"name":"catalog_buy_buyer_r_031ba0_idx","fields":["buyer_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[["buyer_reference","company_scope_reference","buyer_entity_reference"]]`. Ordering: `[]`.

## catalog.DynamicDropdownConfig

Table: `catalog_dynamic_dropdown_config`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `field_name` / `field_name` | `CharField` | `indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `value` / `value` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `display_name` / `display_name` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="setup_required"` | `—` |
| `compatibility_mode` / `compatibility_mode` | `CharField` | `NOT NULL; length=20; default="feature_based"` | `—` |
| `eligible_device_types` / `eligible_device_types` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `match_logic` / `match_logic` | `CharField` | `NOT NULL; length=50; default="OR"` | `—` |
| `accessory_fields` / `accessory_fields` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `compatibility_rules` / `compatibility_rules` | `JSONField` | `NOT NULL; blank allowed; default="builtins.dict (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["field_name","value"]]`. Ordering: `[]`.

## catalog.Product

Table: `catalog_product`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `product_type` / `product_type` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `product_category` / `product_category` | `CharField` | `indexed; NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `vendor_category` / `vendor_category` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `vendor_category_raw` / `vendor_category_raw` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `product_category_override` / `product_category_override` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `product_category_override_by` / `product_category_override_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `product_category_override_at` / `product_category_override_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `category_validation_status` / `category_validation_status` | `CharField` | `indexed; NOT NULL; length=30; default="pending"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `name` / `name` | `CharField` | `NOT NULL; length=300; default="<not set>"` | `—` |
| `series` / `series` | `CharField` | `NOT NULL; blank allowed; length=255; default=""` | `—` |
| `sku` / `sku` | `CharField` | `indexed; NOT NULL; length=200; default="<not set>"` | `—` |
| `brand` / `brand` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `brand_reference` / `brand_reference_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `catalog.Brand; PROTECT; reverse=offers` |
| `description` / `description` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `selling_status` / `selling_status` | `CharField` | `NOT NULL; length=20; default="not_for_sale"` | `—` |
| `vendor_wholesale_price_amount` / `vendor_wholesale_price_amount` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `vendor_wholesale_price_currency` / `vendor_wholesale_price_currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `primary_image_reference` / `primary_image_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `media_references` / `media_references` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `upc` / `upc` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `launch_date` / `launch_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `release_date` / `release_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `eol_date` / `eol_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `color` / `color` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `system_color` / `system_color` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `system_colors` / `system_colors` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `msrp` / `msrp` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `map_price` / `map_price` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `sale_price` / `sale_price` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `recommended_accessory` / `recommended_accessory` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `inventory_level` / `inventory_level` | `IntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `inventory_threshold` / `inventory_threshold` | `IntegerField` | `NULL; blank allowed; default=0` | `—` |
| `length` / `length` | `DecimalField` | `NULL; blank allowed; precision=8, scale=3; default="<not set>"` | `—` |
| `width` / `width` | `DecimalField` | `NULL; blank allowed; precision=8, scale=3; default="<not set>"` | `—` |
| `height` / `height` | `DecimalField` | `NULL; blank allowed; precision=8, scale=3; default="<not set>"` | `—` |
| `weight` / `weight` | `DecimalField` | `NULL; blank allowed; precision=8, scale=3; default="<not set>"` | `—` |
| `weight_unit` / `weight_unit` | `CharField` | `NOT NULL; blank allowed; length=10; default="oz"` | `—` |
| `warranty` / `warranty` | `CharField` | `NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `short_description` / `short_description` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `promo_information` / `promo_information` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `meta_title` / `meta_title` | `CharField` | `NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `meta_description` / `meta_description` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `deactivation_reason` / `deactivation_reason` | `CharField` | `NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `is_clearance` / `is_clearance` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `clearance_type` / `clearance_type` | `CharField` | `NOT NULL; blank allowed; length=30; default=""` | `—` |
| `clearance_end_date` / `clearance_end_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `needs_buyer_sync` / `needs_buyer_sync` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `vendor_original_data` / `vendor_original_data` | `JSONField` | `NOT NULL; blank allowed; default="builtins.dict (callable; not evaluated)"` | `—` |
| `headphone_jack_compatibility` / `headphone_jack_compatibility` | `CharField` | `NOT NULL; blank allowed; length=50; default=""` | `—` |
| `bluetooth_compatibility` / `bluetooth_compatibility` | `CharField` | `NOT NULL; blank allowed; length=50; default=""` | `—` |
| `compatible_charging_interface` / `compatible_charging_interface` | `CharField` | `NOT NULL; blank allowed; length=50; default=""` | `—` |
| `wireless_charging_compatibility` / `wireless_charging_compatibility` | `CharField` | `NOT NULL; blank allowed; length=100; default=""` | `—` |
| `storage_expansion_compatibility` / `storage_expansion_compatibility` | `CharField` | `NOT NULL; blank allowed; length=50; default=""` | `—` |
| `memory_capacity` / `memory_capacity` | `CharField` | `NOT NULL; blank allowed; length=50; default=""` | `—` |
| `compatible_watch_case_size` / `compatible_watch_case_size` | `CharField` | `NOT NULL; blank allowed; length=50; default=""` | `—` |
| `compatibility_status` / `compatibility_status` | `CharField` | `NOT NULL; length=30; default="incomplete"` | `—` |
| `compatibility_mode` / `compatibility_mode` | `CharField` | `NOT NULL; length=25; default="direct_device"` | `—` |
| `compatible_device_types` / `compatible_device_types` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `product_type`: `[["accessory","Accessory"],["branded_merchandise","Branded Merchandise"],["device","Device (reference only)"]]`
- `category_validation_status`: `[["pending","Pending"],["mapping_required","Category Mapping Required"],["resolved","Resolved via Mapping"],["override_applied","Override Applied by Admin"]]`
- `status`: `[["draft","Draft"],["pending_review","Pending Review"],["active","Active"],["inactive","Inactive"],["archived","Archived"],["eol","EOL"],["out_of_stock","Out of Stock"]]`
- `selling_status`: `[["not_for_sale","Not For Sale"],["for_sale","For Sale"],["stop_selling","Stop Selling"]]`
- `clearance_type`: `[["","None"],["end_date","End Date Based"],["inventory","Inventory Based"]]`
- `compatibility_mode`: `[["direct_device","Direct Device"],["universal_device_type","Universal Device Type"]]`

Indexes: `[["django.db.models.Index",[],{"name":"catalog_pro_product_a3cbc0_idx","fields":["product_type","status","selling_status"]}],["django.db.models.Index",[],{"name":"catalog_pro_vendor__d7013f_idx","fields":["vendor_company_reference","status"]}],["django.db.models.Index",[],{"name":"catalog_vendor_sku_idx","fields":["vendor_company_reference","sku"]}],["django.db.models.Index",[],{"name":"catalog_pro_sku_2c4c34_idx","fields":["sku"]}]]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"catalog_vendor_offer_sku","fields":["vendor_company_reference","sku"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## catalog.ProductCompatibilityAssertion

Table: `catalog_product_compatibility`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `product` / `product_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `catalog.Product; PROTECT; reverse=compatibility_assertions` |
| `device_reference` / `device_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `capability_evidence_snapshot_reference` / `capability_evidence_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `is_compatible` / `is_compatible` | `BooleanField` | `NOT NULL; default="<not set>"` | `—` |
| `compatibility_basis` / `compatibility_basis` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `notes` / `notes` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `asserted_at` / `asserted_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `asserted_by_reference` / `asserted_by_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `is_excluded` / `is_excluded` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `exclusion_type` / `exclusion_type` | `CharField` | `NULL; blank allowed; length=30; default="<not set>"` | `—` |
| `is_locked` / `is_locked` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `sku` / `sku` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `device_status_at_mapping` / `device_status_at_mapping` | `CharField` | `NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `device_launch_date_at_mapping` / `device_launch_date_at_mapping` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `match_source` / `match_source` | `CharField` | `NOT NULL; length=50; default="Auto-Mapped"` | `—` |
| `match_reason` / `match_reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `match_evidence` / `match_evidence` | `JSONField` | `NOT NULL; blank allowed; default="builtins.dict (callable; not evaluated)"` | `—` |
| `match_status` / `match_status` | `CharField` | `NOT NULL; length=50; default="Active"` | `—` |
| `exclusion_source` / `exclusion_source` | `CharField` | `NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `exclusion_reason` / `exclusion_reason` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_by` / `created_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `updated_by` / `updated_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `reviewed_by` / `reviewed_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `reviewed_date` / `reviewed_date` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"compat_device_lookup_idx","fields":["device_reference","is_compatible","is_excluded","product"]}]]`.

Constraints: `[]`.

Unique together: `[["product","device_reference"]]`. Ordering: `[]`.

## catalog.ProductUniversalDeviceTypeScope

Table: `catalog_product_universal_type_scope`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `product` / `product_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `catalog.Product; CASCADE; reverse=universal_type_scopes` |
| `device_type` / `device_type_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `devices.DeviceType; PROTECT; reverse=universal_product_scopes` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `created_by` / `created_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `updated_by` / `updated_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["product","device_type"]]`. Ordering: `[]`.

## catalog.VendorBrandRelationship

Table: `catalog_vendor_brand_relationship`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=brand_relationships` |
| `brand` / `brand_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `catalog.Brand; PROTECT; reverse=vendor_relationships` |
| `relationship_type` / `relationship_type` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `approved_by` / `approved_by_id` | `ForeignKey` | `indexed; NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=(default)` |
| `approved_at` / `approved_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `relationship_type`: `[["owned","Owned"],["authorized_distributor","Authorized Distributor"]]`

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"catalog_one_vendor_brand_relation","fields":["vendor_company","brand"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## catalog.VendorCategoryMapping

Table: `catalog_vendor_category_mapping`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `vendor_category` / `vendor_category` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `cixci_category` / `cixci_category` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `cixci_category_reference` / `cixci_category_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="active"` | `—` |
| `mapping_source` / `mapping_source` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `effective_date` / `effective_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `created_by` / `created_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `updated_by` / `updated_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["active","Active"],["inactive","Inactive"],["review_required","Review Required"]]`

Indexes: `[["django.db.models.Index",[],{"name":"catalog_ven_vendor__c0918d_idx","fields":["vendor_company_reference","vendor_category","status"]}],["django.db.models.Index",[],{"name":"catalog_ven_cixci_c_1f6a18_idx","fields":["cixci_category"]}]]`.

Constraints: `[]`.

Unique together: `[["vendor_company_reference","vendor_category"]]`. Ordering: `[]`.

## catalog.VendorColorMapping

Table: `catalog_vendor_color_mapping`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `vendor_color` / `vendor_color` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `system_color` / `system_color` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="active"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |
| `created_by` / `created_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["active","Active"],["inactive","Inactive"],["review_required","Review Required"]]`

Indexes: `[["django.db.models.Index",[],{"name":"catalog_ven_vendor__d00bff_idx","fields":["vendor_company_reference","vendor_color","status"]}]]`.

Constraints: `[]`.

Unique together: `[["vendor_company_reference","vendor_color"]]`. Ordering: `[]`.

## catalog.VendorDeviceMapping

Table: `catalog_vendor_device_mapping`. Source: [backend/apps/catalog/models.py](../../../../backend/apps/catalog/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `vendor_device_name` / `vendor_device_name` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `name_key` / `name_key` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `indexed; NOT NULL; length=20; default="missing"` | `—` |
| `device` / `device_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `devices.Device; PROTECT; reverse=vendor_names` |
| `product_ids` / `product_ids` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `first_seen_at` / `first_seen_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `last_seen_at` / `last_seen_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `resolved_by` / `resolved_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `resolved_at` / `resolved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"vendor_device_status_idx","fields":["status","last_seen_at"]}]]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"vendor_device_name_once","fields":["vendor_company_reference","name_key"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/catalog/migrations/0001_initial.py](../../../../backend/apps/catalog/migrations/0001_initial.py)
- [backend/apps/catalog/migrations/0002_product_color_product_height_product_inventory_level_and_more.py](../../../../backend/apps/catalog/migrations/0002_product_color_product_height_product_inventory_level_and_more.py)
- [backend/apps/catalog/migrations/0003_product_inventory_threshold_product_product_category.py](../../../../backend/apps/catalog/migrations/0003_product_inventory_threshold_product_product_category.py)
- [backend/apps/catalog/migrations/0004_dynamicdropdownconfig.py](../../../../backend/apps/catalog/migrations/0004_dynamicdropdownconfig.py)
- [backend/apps/catalog/migrations/0005_populate_colors.py](../../../../backend/apps/catalog/migrations/0005_populate_colors.py)
- [backend/apps/catalog/migrations/0006_product_eol_date_alter_product_status.py](../../../../backend/apps/catalog/migrations/0006_product_eol_date_alter_product_status.py)
- [backend/apps/catalog/migrations/0007_populate_brands_and_categories.py](../../../../backend/apps/catalog/migrations/0007_populate_brands_and_categories.py)
- [backend/apps/catalog/migrations/0008_alter_product_status.py](../../../../backend/apps/catalog/migrations/0008_alter_product_status.py)
- [backend/apps/catalog/migrations/0009_product_bluetooth_compatibility_and_more.py](../../../../backend/apps/catalog/migrations/0009_product_bluetooth_compatibility_and_more.py)
- [backend/apps/catalog/migrations/0010_productcompatibilityassertion_created_at_and_more.py](../../../../backend/apps/catalog/migrations/0010_productcompatibilityassertion_created_at_and_more.py)
- [backend/apps/catalog/migrations/0011_dynamicdropdownconfig_accessory_fields_and_more.py](../../../../backend/apps/catalog/migrations/0011_dynamicdropdownconfig_accessory_fields_and_more.py)
- [backend/apps/catalog/migrations/0012_increase_meta_title_max_length.py](../../../../backend/apps/catalog/migrations/0012_increase_meta_title_max_length.py)
- [backend/apps/catalog/migrations/0013_activate_default_categories.py](../../../../backend/apps/catalog/migrations/0013_activate_default_categories.py)
- [backend/apps/catalog/migrations/0014_product_deactivation_reason.py](../../../../backend/apps/catalog/migrations/0014_product_deactivation_reason.py)
- [backend/apps/catalog/migrations/0015_buyerproductexportdate.py](../../../../backend/apps/catalog/migrations/0015_buyerproductexportdate.py)
- [backend/apps/catalog/migrations/0016_buyerproductexportjob_failure_details_and_more.py](../../../../backend/apps/catalog/migrations/0016_buyerproductexportjob_failure_details_and_more.py)
- [backend/apps/catalog/migrations/0017_add_compatible_device_types.py](../../../../backend/apps/catalog/migrations/0017_add_compatible_device_types.py)
- [backend/apps/catalog/migrations/0018_product_compatibility_mode.py](../../../../backend/apps/catalog/migrations/0018_product_compatibility_mode.py)
- [backend/apps/catalog/migrations/0019_buyerproductexportjob_include_media_missing.py](../../../../backend/apps/catalog/migrations/0019_buyerproductexportjob_include_media_missing.py)
- [backend/apps/catalog/migrations/0020_fix_pc301_vendor_wholesale_price.py](../../../../backend/apps/catalog/migrations/0020_fix_pc301_vendor_wholesale_price.py)
- [backend/apps/catalog/migrations/0021_add_vendor_category_mapping.py](../../../../backend/apps/catalog/migrations/0021_add_vendor_category_mapping.py)
- [backend/apps/catalog/migrations/0022_category_governance_v2.py](../../../../backend/apps/catalog/migrations/0022_category_governance_v2.py)
- [backend/apps/catalog/migrations/0023_activate_system_colors.py](../../../../backend/apps/catalog/migrations/0023_activate_system_colors.py)
- [backend/apps/catalog/migrations/0024_per_device_product_tracking.py](../../../../backend/apps/catalog/migrations/0024_per_device_product_tracking.py)
- [backend/apps/catalog/migrations/0025_rename_catalog_buyer_prod_comp_dev_idx_catalog_buy_company_4d82bf_idx.py](../../../../backend/apps/catalog/migrations/0025_rename_catalog_buyer_prod_comp_dev_idx_catalog_buy_company_4d82bf_idx.py)
- [backend/apps/catalog/migrations/0026_fix_compatibility_data.py](../../../../backend/apps/catalog/migrations/0026_fix_compatibility_data.py)
- [backend/apps/catalog/migrations/0027_canonical_compatibility_evidence.py](../../../../backend/apps/catalog/migrations/0027_canonical_compatibility_evidence.py)
- [backend/apps/catalog/migrations/0028_backfill_compatibility_references.py](../../../../backend/apps/catalog/migrations/0028_backfill_compatibility_references.py)
- [backend/apps/catalog/migrations/0029_repair_invalid_universal_evidence.py](../../../../backend/apps/catalog/migrations/0029_repair_invalid_universal_evidence.py)
- [backend/apps/catalog/migrations/0030_vendor_sku_lookup_index.py](../../../../backend/apps/catalog/migrations/0030_vendor_sku_lookup_index.py)
- [backend/apps/catalog/migrations/0031_approved_automatic_mapping_configuration.py](../../../../backend/apps/catalog/migrations/0031_approved_automatic_mapping_configuration.py)
- [backend/apps/catalog/migrations/0032_approved_speaker_universal_scope.py](../../../../backend/apps/catalog/migrations/0032_approved_speaker_universal_scope.py)
- [backend/apps/catalog/migrations/0033_approved_speaker_scopes_and_deployment_rebuild.py](../../../../backend/apps/catalog/migrations/0033_approved_speaker_scopes_and_deployment_rebuild.py)
- [backend/apps/catalog/migrations/0034_brand_vendorbrandrelationship_and_more.py](../../../../backend/apps/catalog/migrations/0034_brand_vendorbrandrelationship_and_more.py)
- [backend/apps/catalog/migrations/0035_backfill_approved_brands.py](../../../../backend/apps/catalog/migrations/0035_backfill_approved_brands.py)
- [backend/apps/catalog/migrations/0036_buyer_export_mapping_scopes.py](../../../../backend/apps/catalog/migrations/0036_buyer_export_mapping_scopes.py)
- [backend/apps/catalog/migrations/0037_buyer_export_mapping_scopes.py](../../../../backend/apps/catalog/migrations/0037_buyer_export_mapping_scopes.py)
- [backend/apps/catalog/migrations/0038_unique_external_listing_selection.py](../../../../backend/apps/catalog/migrations/0038_unique_external_listing_selection.py)
- [backend/apps/catalog/migrations/0039_fix_universal_scope_cascade.py](../../../../backend/apps/catalog/migrations/0039_fix_universal_scope_cascade.py)
- [backend/apps/catalog/migrations/0040_add_product_series.py](../../../../backend/apps/catalog/migrations/0040_add_product_series.py)
- [backend/apps/catalog/migrations/0041_product_clearance_weight_unit_vendor_color_mapping.py](../../../../backend/apps/catalog/migrations/0041_product_clearance_weight_unit_vendor_color_mapping.py)
- [backend/apps/catalog/migrations/0042_product_system_colors.py](../../../../backend/apps/catalog/migrations/0042_product_system_colors.py)
- [backend/apps/catalog/migrations/0043_product_needs_buyer_sync.py](../../../../backend/apps/catalog/migrations/0043_product_needs_buyer_sync.py)
- [backend/apps/catalog/migrations/0044_normalize_balaji_products.py](../../../../backend/apps/catalog/migrations/0044_normalize_balaji_products.py)
- [backend/apps/catalog/migrations/0045_product_vendor_original_data.py](../../../../backend/apps/catalog/migrations/0045_product_vendor_original_data.py)
- [backend/apps/catalog/migrations/0046_performance_indexes.py](../../../../backend/apps/catalog/migrations/0046_performance_indexes.py)
- [backend/apps/catalog/migrations/0047_vendor_device_mapping.py](../../../../backend/apps/catalog/migrations/0047_vendor_device_mapping.py)
