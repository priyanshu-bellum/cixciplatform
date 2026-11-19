# routing — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## routing.AcceptedOrderLine

Table: `routing_accepted_order_line`. Source: [backend/apps/routing/accepted_models.py](../../../../backend/apps/routing/accepted_models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `order` / `order_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.Order; PROTECT; reverse=accepted_lines` |
| `suborder` / `suborder_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.RoutedSuborder; PROTECT; reverse=accepted_lines` |
| `mapping` / `mapping_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `catalog.BuyerExportMapping; PROTECT; reverse=(default)` |
| `product_reference` / `product_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `supplier_reference` / `supplier_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `line_reference` / `line_reference` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `quantity` / `quantity` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `pricing_snapshot_reference` / `pricing_snapshot_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `unit_price_snapshot` / `unit_price_snapshot` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `vendor_unit_price_snapshot` / `vendor_unit_price_snapshot` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="<not set>"` | `—` |
| `source_snapshot` / `source_snapshot` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[["django.db.models.UniqueConstraint",[],{"name":"accepted_order_line_reference","fields":["order","line_reference"]}]]`.

Unique together: `[]`. Ordering: `[]`.

## routing.Order

Table: `routing_order`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_entity_reference` / `buyer_entity_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="pending"` | `—` |
| `pricing_snapshot_references` / `pricing_snapshot_references` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `shipping_fee_snapshot_references` / `shipping_fee_snapshot_references` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `storefront` / `storefront_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `integration.BuyerStorefront; PROTECT; reverse=(default)` |
| `buyer_order_number_reference` / `buyer_order_number_reference` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `acceptance_key` / `acceptance_key` | `CharField` | `unique; NULL; blank allowed; length=64; default="<not set>"` | `—` |
| `acceptance_hash` / `acceptance_hash` | `CharField` | `NOT NULL; blank allowed; length=64; default="<not set>"` | `—` |
| `mapping_contract_version` / `mapping_contract_version` | `PositiveSmallIntegerField` | `NOT NULL; default=0` | `—` |
| `order_id` / `order_id` | `CharField` | `unique; indexed; NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `placed_at` / `placed_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["in_progress","In Progress"],["routed","Routed"],["partially_routed","Partially Routed"],["failed","Failed"],["cancelled","Cancelled"],["placed","Placed"],["processing","Processing"],["shipment_pending","Shipment Pending"],["partially_shipped","Partially Shipped"],["shipped","Shipped"],["delivered","Delivered"]]`

Indexes: `[["django.db.models.Index",[],{"name":"routing_ord_company_dac7a8_idx","fields":["company_scope_reference","status"]}],["django.db.models.Index",[],{"name":"routing_ord_buyer_r_497e9f_idx","fields":["buyer_reference","placed_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## routing.RoutedSuborder

Table: `routing_routed_suborder`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `order` / `order_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.Order; PROTECT; reverse=routed_suborders` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="pending"` | `—` |
| `routing_snapshot` / `routing_snapshot` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `shipping_fee_snapshot_reference` / `shipping_fee_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["in_progress","In Progress"],["routed","Routed"],["partially_routed","Partially Routed"],["failed","Failed"],["cancelled","Cancelled"],["placed","Placed"],["processing","Processing"],["shipment_pending","Shipment Pending"],["partially_shipped","Partially Shipped"],["shipped","Shipped"],["delivered","Delivered"]]`

Indexes: `[["django.db.models.Index",[],{"name":"routing_rou_vendor__03f45d_idx","fields":["vendor_company_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## routing.VendorExportBatchItem

Table: `routing_vendor_export_batch_item`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `window` / `window_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.VendorExportWindow; PROTECT; reverse=batch_items` |
| `routed_suborder` / `routed_suborder_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.RoutedSuborder; PROTECT; reverse=batch_items` |
| `included_at` / `included_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["window","routed_suborder"]]`. Ordering: `[]`.

## routing.VendorExportDeliveryAttempt

Table: `routing_vendor_export_delivery_attempt`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `window` / `window_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.VendorExportWindow; PROTECT; reverse=delivery_attempts` |
| `attempt_number` / `attempt_number` | `PositiveSmallIntegerField` | `NOT NULL; default=1` | `—` |
| `delivery_method` / `delivery_method` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `started_at` / `started_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `outcome` / `outcome` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `error_detail` / `error_detail` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `provider_reference` / `provider_reference` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## routing.VendorExportDeliveryEvidence

Table: `routing_vendor_export_delivery_evidence`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `window` / `window_id` | `OneToOneField` | `unique; indexed; NOT NULL; default="<not set>"` | `routing.VendorExportWindow; PROTECT; reverse=delivery_evidence` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `delivery_method` / `delivery_method` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `last_attempt` / `last_attempt_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `routing.VendorExportDeliveryAttempt; PROTECT; reverse=(default)` |
| `confirmed_at` / `confirmed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `failed_at` / `failed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["attempted","Attempted"],["confirmed","Confirmed"],["failed","Failed"],["superseded","Superseded"]]`

Indexes: `[["django.db.models.Index",[],{"name":"routing_ven_vendor__0bcac7_idx","fields":["vendor_company_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## routing.VendorExportSchedule

Table: `routing_vendor_export_schedule`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `delivery_method` / `delivery_method` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `schedule_cron` / `schedule_cron` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `window_duration_minutes` / `window_duration_minutes` | `PositiveIntegerField` | `NOT NULL; default=60` | `—` |
| `schedule_timezone` / `schedule_timezone` | `CharField` | `NOT NULL; length=50; default="UTC"` | `—` |
| `effective_from` / `effective_from` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `effective_to` / `effective_to` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `superseded_by` / `superseded_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `routing.VendorExportSchedule; PROTECT; reverse=supersedes` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["active","Active"],["superseded","Superseded"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"routing_ven_vendor__593644_idx","fields":["vendor_company_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## routing.VendorExportWindow

Table: `routing_vendor_export_window`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `schedule` / `schedule_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.VendorExportSchedule; PROTECT; reverse=windows` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="scheduled"` | `—` |
| `opens_at` / `opens_at` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `closes_at` / `closes_at` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `item_count` / `item_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["scheduled","Scheduled"],["open","Open"],["processing","Processing"],["closed","Closed"],["cancelled","Cancelled"]]`

Indexes: `[["django.db.models.Index",[],{"name":"routing_ven_vendor__f0da8c_idx","fields":["vendor_company_reference","status","opens_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## routing.VendorOrderExportLog

Table: `routing_vendor_order_export_log`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_company_reference` / `buyer_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `window` / `window_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.VendorExportWindow; PROTECT; reverse=export_logs` |
| `filename` / `filename` | `CharField` | `NOT NULL; length=500; default="<not set>"` | `—` |
| `sent_at` / `sent_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `order_count` / `order_count` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `suborder_count` / `suborder_count` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `sending_method` / `sending_method` | `CharField` | `NOT NULL; length=50; default="email"` | `—` |
| `recipients` / `recipients` | `JSONField` | `NOT NULL; blank allowed; default="builtins.list (callable; not evaluated)"` | `—` |
| `trigger_type` / `trigger_type` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `triggered_by` / `triggered_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=(default)` |
| `status_before` / `status_before` | `CharField` | `NOT NULL; length=30; default="placed"` | `—` |
| `status_after` / `status_after` | `CharField` | `NOT NULL; length=30; default="processing"` | `—` |
| `csv_backup` / `csv_backup` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `email_send_result` / `email_send_result` | `TextField` | `NOT NULL; default="pending"` | `—` |
| `is_reexport` / `is_reexport` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `original_log` / `original_log_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `routing.VendorOrderExportLog; SET_NULL; reverse=reexports` |
| `audit_reference` / `audit_reference` | `UUIDField` | `NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `reexport_count` / `reexport_count` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `last_reexport_status` / `last_reexport_status` | `CharField` | `NULL; blank allowed; length=30; default="<not set>"` | `—` |
| `last_reexported_at` / `last_reexported_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `last_reexported_by_name` / `last_reexported_by_name` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `triggered_by_user_name_snapshot` / `triggered_by_user_name_snapshot` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `triggered_by_company_name_snapshot` / `triggered_by_company_name_snapshot` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `triggered_by_role_snapshot` / `triggered_by_role_snapshot` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `ip_address` / `ip_address` | `GenericIPAddressField` | `NULL; blank allowed; length=39; default="<not set>"` | `—` |
| `user_agent` / `user_agent` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `correlation_id` / `correlation_id` | `UUIDField` | `NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `system_process_name` / `system_process_name` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `system_process_id` / `system_process_id` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `system_job_id` / `system_job_id` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `system_schedule_desc` / `system_schedule_desc` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"routing_ven_vendor__fada64_idx","fields":["vendor_company_reference","buyer_company_reference"]}],["django.db.models.Index",[],{"name":"routing_ven_sent_at_5febd7_idx","fields":["sent_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## routing.VendorOrderReexportAttempt

Table: `routing_vendor_order_reexport_attempt`. Source: [backend/apps/routing/models.py](../../../../backend/apps/routing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `reexport_attempt_id` / `reexport_attempt_id` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `original_export_batch` / `original_export_batch_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `routing.VendorOrderExportLog; CASCADE; reverse=reexport_attempts` |
| `attempt_number` / `attempt_number` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `trigger_type` / `trigger_type` | `CharField` | `NOT NULL; length=20; default="USER"` | `—` |
| `action_type` / `action_type` | `CharField` | `NOT NULL; length=50; default="REEXPORT"` | `—` |
| `parent_attempt` / `parent_attempt_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `routing.VendorOrderReexportAttempt; SET_NULL; reverse=child_attempts` |
| `actor_user` / `actor_user_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=(default)` |
| `actor_user_name_snapshot` / `actor_user_name_snapshot` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `actor_company` / `actor_company_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.Company; SET_NULL; reverse=(default)` |
| `actor_company_name_snapshot` / `actor_company_name_snapshot` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `actor_role_snapshot` / `actor_role_snapshot` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `actor_process_code` / `actor_process_code` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `actor_process_name` / `actor_process_name` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `reason_code` / `reason_code` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `reason_notes` / `reason_notes` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `requested_at` / `requested_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `processing_started_at` / `processing_started_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `delivery_method` / `delivery_method` | `CharField` | `NOT NULL; length=50; default="email"` | `—` |
| `delivery_destination_snapshot` / `delivery_destination_snapshot` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `file_storage_reference` / `file_storage_reference` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `file_checksum` / `file_checksum` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `result_status` / `result_status` | `CharField` | `NOT NULL; length=30; default="QUEUED"` | `—` |
| `provider_message_id` / `provider_message_id` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `error_code` / `error_code` | `CharField` | `NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `error_message` / `error_message` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `correlation_id` / `correlation_id` | `UUIDField` | `NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `ip_address` / `ip_address` | `GenericIPAddressField` | `NULL; blank allowed; length=39; default="<not set>"` | `—` |
| `user_agent` / `user_agent` | `TextField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `system_job_id` / `system_job_id` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `system_schedule_desc` / `system_schedule_desc` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |

Choices (stored value → display label):

- `action_type`: `[["ORIGINAL_EXPORT","ORIGINAL_EXPORT"],["REEXPORT","REEXPORT"],["AUTOMATIC_RETRY","AUTOMATIC_RETRY"],["MANUAL_RETRY","MANUAL_RETRY"],["DOWNLOAD","DOWNLOAD"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["attempt_number"]`.

## Migrations

- [backend/apps/routing/migrations/0001_initial.py](../../../../backend/apps/routing/migrations/0001_initial.py)
- [backend/apps/routing/migrations/0002_alter_order_status_alter_routedsuborder_status.py](../../../../backend/apps/routing/migrations/0002_alter_order_status_alter_routedsuborder_status.py)
- [backend/apps/routing/migrations/0003_vendororderexportlog.py](../../../../backend/apps/routing/migrations/0003_vendororderexportlog.py)
- [backend/apps/routing/migrations/0004_vendororderexportlog_email_send_result.py](../../../../backend/apps/routing/migrations/0004_vendororderexportlog_email_send_result.py)
- [backend/apps/routing/migrations/0005_alter_order_status_alter_routedsuborder_status.py](../../../../backend/apps/routing/migrations/0005_alter_order_status_alter_routedsuborder_status.py)
- [backend/apps/routing/migrations/0006_vendororderexportlog_last_reexport_status_and_more.py](../../../../backend/apps/routing/migrations/0006_vendororderexportlog_last_reexport_status_and_more.py)
- [backend/apps/routing/migrations/0007_rename_attempt_completed_at_vendororderreexportattempt_completed_at_and_more.py](../../../../backend/apps/routing/migrations/0007_rename_attempt_completed_at_vendororderreexportattempt_completed_at_and_more.py)
- [backend/apps/routing/migrations/0008_vendororderexportlog_correlation_id_and_more.py](../../../../backend/apps/routing/migrations/0008_vendororderexportlog_correlation_id_and_more.py)
- [backend/apps/routing/migrations/0009_rename_triggered_by_company_name_snapshot_vendororderreexportattempt_actor_company_name_snapshot_and.py](../../../../backend/apps/routing/migrations/0009_rename_triggered_by_company_name_snapshot_vendororderreexportattempt_actor_company_name_snapshot_and.py)
- [backend/apps/routing/migrations/0010_alter_vendororderexportlog_recipients.py](../../../../backend/apps/routing/migrations/0010_alter_vendororderexportlog_recipients.py)
- [backend/apps/routing/migrations/0011_alter_order_status_alter_routedsuborder_status.py](../../../../backend/apps/routing/migrations/0011_alter_order_status_alter_routedsuborder_status.py)
- [backend/apps/routing/migrations/0012_order_order_id.py](../../../../backend/apps/routing/migrations/0012_order_order_id.py)
- [backend/apps/routing/migrations/0013_order_shipping_fee_snapshot_references_and_more.py](../../../../backend/apps/routing/migrations/0013_order_shipping_fee_snapshot_references_and_more.py)
- [backend/apps/routing/migrations/0014_accepted_supplier_evidence.py](../../../../backend/apps/routing/migrations/0014_accepted_supplier_evidence.py)
