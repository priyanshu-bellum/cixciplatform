# integration — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## integration.BuyerStorefront

Table: `integration_buyer_storefront`. Source: [backend/apps/integration/storefront_models.py](../../../../backend/apps/integration/storefront_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company` / `company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=buyer_storefronts` |
| `entity` / `entity_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.CompanyEntity; PROTECT; reverse=storefronts` |
| `external_connection` / `external_connection_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `integration.ExternalConnection; PROTECT; reverse=(default)` |
| `code` / `code` | `SlugField` | `indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `label` / `label` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"buyer_storefront_code","fields":["company","entity","code"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.CompanyAPIKey

Table: `integration_company_api_key`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `label` / `label` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `token` / `token` | `CharField` | `unique; indexed; NOT NULL; length=128; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `last_used_at` / `last_used_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-created_at"]`.

## integration.ExternalActionOutcome

Table: `integration_external_action_outcome`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `request` / `request_id` | `OneToOneField` | `unique; indexed; NOT NULL; default="<not set>"` | `integration.ExternalActionRequest; PROTECT; reverse=outcome` |
| `outcome_status` / `outcome_status` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `external_reference_id` / `external_reference_id` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `response_summary` / `response_summary` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## integration.ExternalActionRequest

Table: `integration_external_action_request`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `connection` / `connection_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.ExternalConnection; PROTECT; reverse=action_requests` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `action_type` / `action_type` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `source_record_id` / `source_record_id` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `payload_reference` / `payload_reference` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `idempotency_key` / `idempotency_key` | `CharField` | `unique; indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## integration.ExternalConnection

Table: `integration_external_connection`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `connector_type` / `connector_type` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `label` / `label` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `config_reference` / `config_reference` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `connector_type`: `[["quickbooks","QuickBooks"],["sftp","SFTP"],["rest_api","REST API"],["webhook","Webhook"],["email","Email"],["manual","Manual"],["csv","CSV File"]]`
- `status`: `[["draft","Draft"],["active","Active"],["suspended","Suspended"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"integration_company_a7b863_idx","fields":["company_scope_reference","connector_type","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## integration.ExternalIdMapping

Table: `integration_external_id_mapping`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `connection` / `connection_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.ExternalConnection; PROTECT; reverse=id_mappings` |
| `cixci_module` / `cixci_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `cixci_record_type` / `cixci_record_type` | `CharField` | `NOT NULL; length=150; default="<not set>"` | `—` |
| `cixci_record_id` / `cixci_record_id` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `external_id` / `external_id` | `CharField` | `NOT NULL; length=500; default="<not set>"` | `—` |
| `is_active` / `is_active` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["connection","cixci_record_id"]]`. Ordering: `[]`.

## integration.InboundWebhookReceipt

Table: `integration_inbound_webhook_receipt`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `connection` / `connection_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.ExternalConnection; PROTECT; reverse=inbound_receipts` |
| `provider_event_id` / `provider_event_id` | `CharField` | `indexed; NOT NULL; length=500; default="<not set>"` | `—` |
| `event_type` / `event_type` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `signature_verified` / `signature_verified` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `is_duplicate` / `is_duplicate` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `processing_status` / `processing_status` | `CharField` | `NOT NULL; length=30; default="received"` | `—` |
| `received_at` / `received_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["connection","provider_event_id"]]`. Ordering: `[]`.

## integration.SupplierOrderDispatch

Table: `integration_supplier_order_dispatch`. Source: [backend/apps/integration/commerce_models.py](../../../../backend/apps/integration/commerce_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `suborder` / `suborder_id` | `OneToOneField` | `unique; indexed; NOT NULL; default="<not set>"` | `routing.RoutedSuborder; PROTECT; reverse=supplier_dispatch` |
| `profile` / `profile_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `integration.VendorCommerceProfile; PROTECT; reverse=dispatches` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=(default)` |
| `po_number` / `po_number` | `CharField` | `unique; NOT NULL; length=150; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `indexed; NOT NULL; length=30; default="queued"` | `—` |
| `mode` / `mode` | `CharField` | `NOT NULL; length=20; default="preview"` | `—` |
| `config_snapshot` / `config_snapshot` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `config_version` / `config_version` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `transport_origin` / `transport_origin` | `CharField` | `NOT NULL; blank allowed; length=1000; default="<not set>"` | `—` |
| `encrypted_transport_credentials` / `encrypted_transport_credentials` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `transport_auth_type` / `transport_auth_type` | `CharField` | `NOT NULL; blank allowed; length=20; default="<not set>"` | `—` |
| `transport_auth_header` / `transport_auth_header` | `CharField` | `NOT NULL; blank allowed; length=64; default="<not set>"` | `—` |
| `request_hash` / `request_hash` | `CharField` | `NOT NULL; blank allowed; length=64; default="<not set>"` | `—` |
| `external_order_id` / `external_order_id` | `CharField` | `indexed; NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `provider_status` / `provider_status` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `response_summary` / `response_summary` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `attempt_count` / `attempt_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `next_retry_at` / `next_retry_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `lease_token` / `lease_token` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `lease_expires_at` / `lease_expires_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `last_error_code` / `last_error_code` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `provider_updated_at` / `provider_updated_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `next_status_poll_at` / `next_status_poll_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"integration_profile_1142ca_idx","fields":["profile","status","next_retry_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorCatalogBudget

Table: `integration_vendor_catalog_budget`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `BigAutoField` | `PK; unique; NOT NULL; blank allowed; default="<not set>"` | `—` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=(default)` |
| `origin` / `origin` | `CharField` | `NOT NULL; length=255; default="<not set>"` | `—` |
| `day` / `day` | `DateField` | `NOT NULL; default="<not set>"` | `—` |
| `rows` / `rows` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `requests` / `requests` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `window_started_at` / `window_started_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `window_requests` / `window_requests` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"catalog_vendor_daily_budget","fields":["vendor_company","origin","day"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorCatalogConnection

Table: `integration_vendor_catalog_connection`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=catalog_connections` |
| `label` / `label` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `endpoint_url` / `endpoint_url` | `CharField` | `NOT NULL; length=1000; default="<not set>"` | `—` |
| `auth_type` / `auth_type` | `CharField` | `NOT NULL; length=20; default="bearer"` | `—` |
| `auth_header` / `auth_header` | `CharField` | `NOT NULL; length=64; default="X-API-Key"` | `—` |
| `encrypted_credentials` / `encrypted_credentials` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `config` / `config` | `JSONField` | `NOT NULL; default="apps.integration.catalog_config.default_catalog_config (callable; not evaluated)"` | `—` |
| `config_version` / `config_version` | `UUIDField` | `NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `schedule_enabled` / `schedule_enabled` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `is_retired` / `is_retired` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `last_synced_at` / `last_synced_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `next_sync_at` / `next_sync_at` | `DateTimeField` | `indexed; NULL; blank allowed; default="<not set>"` | `—` |
| `last_watermark` / `last_watermark` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `last_error_code` / `last_error_code` | `CharField` | `NOT NULL; blank allowed; length=80; default="<not set>"` | `—` |
| `created_by` / `created_by_id` | `ForeignKey` | `indexed; NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=created_catalog_connections` |
| `updated_by` / `updated_by_id` | `ForeignKey` | `indexed; NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=updated_catalog_connections` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `auth_type`: `[["bearer","bearer"],["api_key","api_key"],["basic","basic"],["none","none"]]`

Indexes: `[["django.db.models.Index",[],{"name":"integration_schedul_4844bb_idx","fields":["schedule_enabled","is_retired","next_sync_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorCatalogItem

Table: `integration_vendor_catalog_item`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `connection` / `connection_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.VendorCatalogConnection; PROTECT; reverse=source_items` |
| `external_id` / `external_id` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `product` / `product_id` | `OneToOneField` | `unique; indexed; NULL; blank allowed; default="<not set>"` | `catalog.Product; PROTECT; reverse=vendor_catalog_source` |
| `payload` / `payload` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `source_hash` / `source_hash` | `CharField` | `NOT NULL; length=64; default="<not set>"` | `—` |
| `applied_config_version` / `applied_config_version` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `is_listed` / `is_listed` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `review_required` / `review_required` | `BooleanField` | `indexed; NOT NULL; default=false` | `—` |
| `review_errors` / `review_errors` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `last_seen_run` / `last_seen_run_id` | `ForeignKey` | `indexed; NULL; default="<not set>"` | `integration.VendorCatalogSyncRun; PROTECT; reverse=(default)` |
| `first_seen_at` / `first_seen_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `last_seen_at` / `last_seen_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"integration_connect_9b8bbb_idx","fields":["connection","is_listed","review_required"]}]]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"catalog_connection_remote_id","fields":["connection","external_id"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorCatalogSyncRun

Table: `integration_vendor_catalog_sync_run`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `connection` / `connection_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.VendorCatalogConnection; PROTECT; reverse=sync_runs` |
| `requested_by` / `requested_by_id` | `ForeignKey` | `indexed; NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=(default)` |
| `trigger` / `trigger` | `CharField` | `NOT NULL; length=20; default="manual"` | `—` |
| `status` / `status` | `CharField` | `indexed; NOT NULL; length=20; default="queued"` | `—` |
| `config_version` / `config_version` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `page_cursor` / `page_cursor` | `JSONField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `page_index` / `page_index` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `cursor_hashes` / `cursor_hashes` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `rows_seen` / `rows_seen` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `created_count` / `created_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `updated_count` / `updated_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `unchanged_count` / `unchanged_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `review_count` / `review_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `error_count` / `error_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `error_code` / `error_code` | `CharField` | `NOT NULL; blank allowed; length=80; default="<not set>"` | `—` |
| `attempt_count` / `attempt_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `next_retry_at` / `next_retry_at` | `DateTimeField` | `indexed; NULL; blank allowed; default="<not set>"` | `—` |
| `lease_token` / `lease_token` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `lease_expires_at` / `lease_expires_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `started_at` / `started_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"catalog_one_active_run","fields":["connection"],"condition":"(AND: ('status__in', ['queued', 'running', 'retrying']))"}]]`.

Unique together: `[]`. Ordering: `["-created_at"]`.

## integration.VendorCommercePollRun

Table: `integration_vendor_commerce_poll`. Source: [backend/apps/integration/commerce_models.py](../../../../backend/apps/integration/commerce_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `profile` / `profile_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.VendorCommerceProfile; PROTECT; reverse=poll_runs` |
| `kind` / `kind` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `indexed; NOT NULL; length=30; default="queued"` | `—` |
| `config_version` / `config_version` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `config_snapshot` / `config_snapshot` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `cursor` / `cursor` | `JSONField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `cursor_hashes` / `cursor_hashes` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `watermark` / `watermark` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `rows_seen` / `rows_seen` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `processed_count` / `processed_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `review_count` / `review_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `page_index` / `page_index` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `attempt_count` / `attempt_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `error_code` / `error_code` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `next_retry_at` / `next_retry_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `lease_token` / `lease_token` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `lease_expires_at` / `lease_expires_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"vendor_one_active_poll","fields":["profile","kind"],"condition":"(AND: ('status__in', ['queued', 'running', 'retrying']))"}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorCommerceProfile

Table: `integration_vendor_commerce_profile`. Source: [backend/apps/integration/commerce_models.py](../../../../backend/apps/integration/commerce_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `connection` / `connection_id` | `OneToOneField` | `unique; indexed; NOT NULL; default="<not set>"` | `integration.VendorCatalogConnection; PROTECT; reverse=commerce_profile` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=(default)` |
| `adapter` / `adapter` | `CharField` | `NOT NULL; length=30; default="generic_json"` | `—` |
| `mode` / `mode` | `CharField` | `NOT NULL; length=20; default="preview"` | `—` |
| `order_enabled` / `order_enabled` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `webhook_enabled` / `webhook_enabled` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `polling_enabled` / `polling_enabled` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `outbound_enabled` / `outbound_enabled` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `outbound_url` / `outbound_url` | `CharField` | `NOT NULL; blank allowed; length=1000; default="<not set>"` | `—` |
| `outbound_events` / `outbound_events` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `config` / `config` | `JSONField` | `NOT NULL; default="apps.integration.commerce_config.default_commerce_config (callable; not evaluated)"` | `—` |
| `config_version` / `config_version` | `UUIDField` | `NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `receiver_id` / `receiver_id` | `UUIDField` | `unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `encrypted_webhook_secret` / `encrypted_webhook_secret` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `encrypted_outbound_secret` / `encrypted_outbound_secret` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `provider_webhook_id` / `provider_webhook_id` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `next_poll_at` / `next_poll_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `updated_by` / `updated_by_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.User; PROTECT; reverse=(default)` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"vendor_one_order_profile","fields":["vendor_company"],"condition":"(AND: ('order_enabled', True))"}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorFinanceRecord

Table: `integration_vendor_finance_record`. Source: [backend/apps/integration/commerce_models.py](../../../../backend/apps/integration/commerce_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `profile` / `profile_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.VendorCommerceProfile; PROTECT; reverse=finance_records` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=vendor_finance_records` |
| `record_type` / `record_type` | `CharField` | `indexed; NOT NULL; length=20; default="<not set>"` | `—` |
| `external_id` / `external_id` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `external_number` / `external_number` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `issued_on` / `issued_on` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `due_on` / `due_on` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `total_cents` / `total_cents` | `BigIntegerField` | `NOT NULL; default=0` | `—` |
| `amount_due_cents` / `amount_due_cents` | `BigIntegerField` | `NOT NULL; default=0` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `po_number` / `po_number` | `CharField` | `indexed; NOT NULL; blank allowed; length=150; default="<not set>"` | `—` |
| `pdf_url` / `pdf_url` | `CharField` | `NOT NULL; blank allowed; length=1000; default="<not set>"` | `—` |
| `raw_data` / `raw_data` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `source` / `source` | `CharField` | `NOT NULL; length=20; default="webhook"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `record_type`: `[["invoice","Invoice"],["credit_memo","Credit Memo"],["payment","Payment"]]`
- `source`: `[["webhook","Webhook"],["api_sync","API Sync"]]`

Indexes: `[["django.db.models.Index",[],{"name":"integration_vendor__1c43e7_idx","fields":["vendor_company","record_type"]}]]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"vendor_finance_unique_record","fields":["profile","record_type","external_id"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorOutboundDelivery

Table: `integration_vendor_outbound_delivery`. Source: [backend/apps/integration/commerce_models.py](../../../../backend/apps/integration/commerce_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `profile` / `profile_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.VendorCommerceProfile; PROTECT; reverse=outbound_deliveries` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=outbound_webhook_deliveries` |
| `event_type` / `event_type` | `CharField` | `indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `idempotency_key` / `idempotency_key` | `CharField` | `unique; indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `payload` / `payload` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `status` / `status` | `CharField` | `indexed; NOT NULL; length=20; default="pending"` | `—` |
| `attempt_count` / `attempt_count` | `PositiveSmallIntegerField` | `NOT NULL; default=0` | `—` |
| `max_attempts` / `max_attempts` | `PositiveSmallIntegerField` | `NOT NULL; default=5` | `—` |
| `next_retry_at` / `next_retry_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `last_response_code` / `last_response_code` | `PositiveSmallIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `last_error` / `last_error` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `delivered_at` / `delivered_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["in_flight","In Flight"],["delivered","Delivered"],["failed","Failed"],["retrying","Retrying"]]`

Indexes: `[["django.db.models.Index",[],{"name":"integration_vendor__d1a4c9_idx","fields":["vendor_company","event_type"]}],["django.db.models.Index",[],{"name":"integration_status_170d87_idx","fields":["status","next_retry_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorReturnRecord

Table: `integration_vendor_return_record`. Source: [backend/apps/integration/commerce_models.py](../../../../backend/apps/integration/commerce_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `profile` / `profile_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.VendorCommerceProfile; PROTECT; reverse=return_records` |
| `vendor_company` / `vendor_company_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `tenant.Company; PROTECT; reverse=vendor_return_records` |
| `external_id` / `external_id` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `source_order_number` / `source_order_number` | `CharField` | `indexed; NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `po_number` / `po_number` | `CharField` | `indexed; NOT NULL; blank allowed; length=150; default="<not set>"` | `—` |
| `total_cents` / `total_cents` | `BigIntegerField` | `NOT NULL; default=0` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `credit_memo_id` / `credit_memo_id` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `raw_data` / `raw_data` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `source` / `source` | `CharField` | `NOT NULL; length=20; default="webhook"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `source`: `[["webhook","Webhook"],["api_sync","API Sync"]]`

Indexes: `[["django.db.models.Index",[],{"name":"integration_vendor__e84413_idx","fields":["vendor_company","status"]}]]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"vendor_return_unique_record","fields":["profile","external_id"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.VendorWebhookReceipt

Table: `integration_vendor_webhook_receipt`. Source: [backend/apps/integration/commerce_models.py](../../../../backend/apps/integration/commerce_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `profile` / `profile_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.VendorCommerceProfile; PROTECT; reverse=webhook_receipts` |
| `provider_event_id` / `provider_event_id` | `CharField` | `NOT NULL; length=200; default="<not set>"` | `—` |
| `event_type` / `event_type` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `is_test` / `is_test` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `payload_hash` / `payload_hash` | `CharField` | `NOT NULL; length=64; default="<not set>"` | `—` |
| `encrypted_payload` / `encrypted_payload` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `indexed; NOT NULL; length=30; default="received"` | `—` |
| `error_code` / `error_code` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `received_at` / `received_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `processed_at` / `processed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"vendor_webhook_event_once","fields":["profile","provider_event_id"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## integration.WebhookDelivery

Table: `integration_webhook_delivery`. Source: [backend/apps/integration/models.py](../../../../backend/apps/integration/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `connection` / `connection_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `integration.ExternalConnection; PROTECT; reverse=webhook_deliveries` |
| `event_type` / `event_type` | `CharField` | `indexed; NOT NULL; length=200; default="<not set>"` | `—` |
| `payload_hash` / `payload_hash` | `CharField` | `NOT NULL; blank allowed; length=512; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `attempt_count` / `attempt_count` | `PositiveSmallIntegerField` | `NOT NULL; default=0` | `—` |
| `next_retry_at` / `next_retry_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `last_response_code` / `last_response_code` | `PositiveSmallIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `idempotency_key` / `idempotency_key` | `CharField` | `indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `is_redacted` / `is_redacted` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `delivered_at` / `delivered_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["in_flight","In Flight"],["delivered","Delivered"],["failed","Failed"],["retrying","Retrying"],["superseded","Superseded"]]`

Indexes: `[["django.db.models.Index",[],{"name":"integration_event_t_c9a555_idx","fields":["event_type","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/integration/migrations/0001_initial.py](../../../../backend/apps/integration/migrations/0001_initial.py)
- [backend/apps/integration/migrations/0002_companyapikey.py](../../../../backend/apps/integration/migrations/0002_companyapikey.py)
- [backend/apps/integration/migrations/0003_vendorcatalogbudget_vendorcatalogconnection_and_more.py](../../../../backend/apps/integration/migrations/0003_vendorcatalogbudget_vendorcatalogconnection_and_more.py)
- [backend/apps/integration/migrations/0004_vendorcatalogitem_applied_config_version.py](../../../../backend/apps/integration/migrations/0004_vendorcatalogitem_applied_config_version.py)
- [backend/apps/integration/migrations/0005_buyer_export_mapping_scopes.py](../../../../backend/apps/integration/migrations/0005_buyer_export_mapping_scopes.py)
- [backend/apps/integration/migrations/0006_vendor_order_webhook_capabilities.py](../../../../backend/apps/integration/migrations/0006_vendor_order_webhook_capabilities.py)
- [backend/apps/integration/migrations/0007_dispatch_status_poll_cursor.py](../../../../backend/apps/integration/migrations/0007_dispatch_status_poll_cursor.py)
- [backend/apps/integration/migrations/0008_outbound_webhook_delivery.py](../../../../backend/apps/integration/migrations/0008_outbound_webhook_delivery.py)
- [backend/apps/integration/migrations/0009_outbound_signing_secret.py](../../../../backend/apps/integration/migrations/0009_outbound_signing_secret.py)
- [backend/apps/integration/migrations/0010_vendor_finance_return_records.py](../../../../backend/apps/integration/migrations/0010_vendor_finance_return_records.py)
