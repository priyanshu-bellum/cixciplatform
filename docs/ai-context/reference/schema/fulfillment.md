# fulfillment — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## fulfillment.BuyerUpdateReadySignal

Table: `fulfillment_buyer_update_signal`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `order_reference` / `order_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `update_kind` / `update_kind` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `expected_vendor_count` / `expected_vendor_count` | `PositiveSmallIntegerField` | `NOT NULL; default=1` | `—` |
| `confirmed_vendor_count` / `confirmed_vendor_count` | `PositiveSmallIntegerField` | `NOT NULL; default=0` | `—` |
| `all_vendors_confirmed` / `all_vendors_confirmed` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `buyer_integration_profile_reference` / `buyer_integration_profile_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `dispatched_at` / `dispatched_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `acknowledged_at` / `acknowledged_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `failed_at` / `failed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `update_kind`: `[["shipment","Shipment Update"],["delivery","Delivery Update"],["correction","Delivery Date Correction"]]`
- `status`: `[["pending","Pending"],["held","Held (awaiting all vendors)"],["eligible","Eligible"],["dispatched","Dispatched"],["acknowledged","Acknowledged"],["failed","Failed"]]`

Indexes: `[["django.db.models.Index",[],{"name":"fulfillment_order_r_c37eaa_idx","fields":["order_reference","update_kind","status"]}],["django.db.models.Index",[],{"name":"fulfillment_buyer_r_8198f1_idx","fields":["buyer_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.DeliveryDateCorrectionEvidence

Table: `fulfillment_delivery_date_correction`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `original_delivery_date_evidence` / `original_delivery_date_evidence_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.DeliveryDateEvidence; PROTECT; reverse=corrections` |
| `corrected_delivery_date` / `corrected_delivery_date` | `DateField` | `NOT NULL; default="<not set>"` | `—` |
| `correction_reason` / `correction_reason` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `authority_reference` / `authority_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `audit_record_reference` / `audit_record_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.DeliveryDateEvidence

Table: `fulfillment_delivery_date_evidence`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `handoff` / `handoff_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.FulfillmentHandoff; PROTECT; reverse=delivery_date_evidence` |
| `shipment_line_reference` / `shipment_line_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `vendor_reported_delivery_date` / `vendor_reported_delivery_date` | `DateField` | `NOT NULL; default="<not set>"` | `—` |
| `validation_outcome` / `validation_outcome` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `validation_detail` / `validation_detail` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `triggers_delivered_state` / `triggers_delivered_state` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `validation_outcome`: `[["valid","Valid"],["invalid","Invalid"],["review_required","Review Required"],["pending","Pending Validation"]]`

Indexes: `[["django.db.models.Index",[],{"name":"fulfillment_shipmen_e8ab1f_idx","fields":["shipment_line_reference"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.FulfillmentHandoff

Table: `fulfillment_handoff`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `routed_suborder_reference` / `routed_suborder_reference` | `UUIDField` | `unique; indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=50; default="received"` | `—` |
| `tracking_source` / `tracking_source` | `CharField` | `NOT NULL; blank allowed; length=20; default=""` | `—` |
| `easypost_tracker_id` / `easypost_tracker_id` | `CharField` | `NOT NULL; blank allowed; length=100; default=""` | `—` |
| `delivery_evidence_reference` / `delivery_evidence_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `vendor_order_number` / `vendor_order_number` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `shipping_carrier` / `shipping_carrier` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `tracking_number` / `tracking_number` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `shipped_date` / `shipped_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `delivered_date` / `delivered_date` | `DateField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `tracking_source`: `[["manual_csv","Manual CSV Upload"],["vendor_api","Vendor API (Webhook/Polling)"],["easypost","EasyPost Carrier Tracking"]]`

Indexes: `[["django.db.models.Index",[],{"name":"fulfillment_vendor__be2055_idx","fields":["vendor_company_reference","status"]}],["django.db.models.Index",[],{"name":"fulfillment_company_bfb4b6_idx","fields":["company_scope_reference","status"]}],["django.db.models.Index",[],{"name":"fulfillment_company_7d8820_idx","fields":["company_scope_reference","shipped_date"]}],["django.db.models.Index",[],{"name":"fulfillment_updated_fa2d52_idx","fields":["updated_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.LateFulfillmentImportException

Table: `fulfillment_late_import_exception`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `sla_evaluation` / `sla_evaluation_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.SLAEvaluationRecord; PROTECT; reverse=(default)` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="open"` | `—` |
| `actual_import_received_at` / `actual_import_received_at` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `delay_hours` / `delay_hours` | `DecimalField` | `NOT NULL; precision=8, scale=2; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["open","Open"],["acknowledged","Acknowledged"],["overridden","Overridden / Excused"],["closed","Closed"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.MissingFulfillmentImportException

Table: `fulfillment_missing_import_exception`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `sla_evaluation` / `sla_evaluation_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.SLAEvaluationRecord; PROTECT; reverse=(default)` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="open"` | `—` |
| `late_arrival_reference` / `late_arrival_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `closed_at` / `closed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["open","Open"],["acknowledged","Acknowledged"],["overridden","Overridden / Excused"],["closed","Closed"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.PartialFulfillmentResponseException

Table: `fulfillment_partial_response_exception`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `sla_evaluation` / `sla_evaluation_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.SLAEvaluationRecord; PROTECT; reverse=(default)` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="open"` | `—` |
| `expected_line_count` / `expected_line_count` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `received_line_count` / `received_line_count` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `missing_line_references` / `missing_line_references` | `JSONField` | `NOT NULL; default="builtins.list (callable; not evaluated)"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["open","Open"],["acknowledged","Acknowledged"],["overridden","Overridden / Excused"],["closed","Closed"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.ReturnRequest

Table: `fulfillment_return_request`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `ran` / `ran` | `CharField` | `unique; indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `suborder_reference` / `suborder_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `buyer_reference` / `buyer_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `reason` / `reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `return_initiation_date` / `return_initiation_date` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `return_quantity` / `return_quantity` | `PositiveIntegerField` | `NOT NULL; default=1` | `—` |
| `vendor_wholesale_price` / `vendor_wholesale_price` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `pricing_snapshot_reference` / `pricing_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `sku` / `sku` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `upc` / `upc` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=50; default="return_sent_to_vendor"` | `—` |
| `return_received_date` / `return_received_date` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `return_refunded_amount` / `return_refunded_amount` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `rejected_reason` / `rejected_reason` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `restocking_fee` / `restocking_fee` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `item_condition` / `item_condition` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `refund_status` / `refund_status` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `status`: `[["return_sent_to_vendor","Return Sent to Vendor"],["return_received","Return Received"],["return_refunded","Return Refunded"],["return_rejected","Return Rejected"],["return_closed","Return Closed"]]`
- `item_condition`: `[["unopened","Unopened"],["like_new","Like New"],["used","Used"],["damaged","Damaged"],["defective","Defective"],["other","Other"]]`
- `refund_status`: `[["pending","Pending"],["processed","Processed"],["rejected","Rejected"],["partial","Partial"]]`

Indexes: `[["django.db.models.Index",[],{"name":"fulfillment_suborde_d7b7d0_idx","fields":["suborder_reference"]}],["django.db.models.Index",[],{"name":"fulfillment_buyer_r_69b0e1_idx","fields":["buyer_reference"]}],["django.db.models.Index",[],{"name":"fulfillment_status_5a4587_idx","fields":["status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.SLAEvaluationRecord

Table: `fulfillment_sla_evaluation`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `handoff` / `handoff_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.FulfillmentHandoff; PROTECT; reverse=sla_evaluations` |
| `sla_policy` / `sla_policy_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.VendorFulfillmentResponseSLAPolicy; PROTECT; reverse=(default)` |
| `delivery_evidence_reference` / `delivery_evidence_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `delivery_confirmed_at` / `delivery_confirmed_at` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `expected_response_by` / `expected_response_by` | `DateTimeField` | `NOT NULL; default="<not set>"` | `—` |
| `fulfillment_import_received_timestamp` / `fulfillment_import_received_timestamp` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `outcome` / `outcome` | `CharField` | `NOT NULL; length=20; default="pending"` | `—` |
| `evaluated_at` / `evaluated_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `outcome`: `[["on_time","On Time"],["late","Late"],["missing","Missing"],["partial","Partial"],["pending","Pending (evaluation in progress)"],["overridden","Overridden / Excused"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.SLAOverrideExcuseEvidence

Table: `fulfillment_sla_override_evidence`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `sla_evaluation` / `sla_evaluation_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `fulfillment.SLAEvaluationRecord; PROTECT; reverse=(default)` |
| `exception_type` / `exception_type` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `exception_reference` / `exception_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `override_reason` / `override_reason` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `override_category` / `override_category` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `audit_record_reference` / `audit_record_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `reversal_reference` / `reversal_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `is_reversal` / `is_reversal` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.VendorFulfillmentResponseSLAPolicy

Table: `fulfillment_sla_policy`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=20; default="draft"` | `—` |
| `response_window_hours` / `response_window_hours` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `partial_threshold_percent` / `partial_threshold_percent` | `DecimalField` | `NOT NULL; precision=5, scale=2; default=100` | `—` |
| `effective_from` / `effective_from` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `effective_to` / `effective_to` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `superseded_by` / `superseded_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `fulfillment.VendorFulfillmentResponseSLAPolicy; PROTECT; reverse=supersedes` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["active","Active"],["superseded","Superseded"],["retired","Retired"]]`

Indexes: `[["django.db.models.Index",[],{"name":"fulfillment_vendor__42484a_idx","fields":["vendor_company_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## fulfillment.VendorReturnImportLog

Table: `fulfillment_vendor_return_import_log`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `uploaded_at` / `uploaded_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `uploaded_by` / `uploaded_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=(default)` |
| `csv_filename` / `csv_filename` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `csv_content` / `csv_content` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `rows_applied` / `rows_applied` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `rows_skipped` / `rows_skipped` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `rows_rejected` / `rows_rejected` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `rows_review_required` / `rows_review_required` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `return_export_batch_reference` / `return_export_batch_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `results_payload` / `results_payload` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `audit_reference` / `audit_reference` | `UUIDField` | `NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-uploaded_at"]`.

## fulfillment.VendorShippingImportLog

Table: `fulfillment_vendor_shipping_import_log`. Source: [backend/apps/fulfillment/models.py](../../../../backend/apps/fulfillment/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `uploaded_at` / `uploaded_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `uploaded_by` / `uploaded_by_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `tenant.User; SET_NULL; reverse=(default)` |
| `csv_filename` / `csv_filename` | `CharField` | `NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `csv_content` / `csv_content` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `rows_applied` / `rows_applied` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `rows_skipped` / `rows_skipped` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `rows_rejected` / `rows_rejected` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `rows_review_required` / `rows_review_required` | `PositiveIntegerField` | `NOT NULL; default=0` | `—` |
| `results_payload` / `results_payload` | `JSONField` | `NOT NULL; default="builtins.dict (callable; not evaluated)"` | `—` |
| `audit_reference` / `audit_reference` | `UUIDField` | `NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `["-uploaded_at"]`.

## Migrations

- [backend/apps/fulfillment/migrations/0001_initial.py](../../../../backend/apps/fulfillment/migrations/0001_initial.py)
- [backend/apps/fulfillment/migrations/0002_fulfillmenthandoff_delivered_date_and_more.py](../../../../backend/apps/fulfillment/migrations/0002_fulfillmenthandoff_delivered_date_and_more.py)
- [backend/apps/fulfillment/migrations/0003_alter_fulfillmenthandoff_status_and_more.py](../../../../backend/apps/fulfillment/migrations/0003_alter_fulfillmenthandoff_status_and_more.py)
- [backend/apps/fulfillment/migrations/0004_returnrequest_vendorreturnimportlog.py](../../../../backend/apps/fulfillment/migrations/0004_returnrequest_vendorreturnimportlog.py)
- [backend/apps/fulfillment/migrations/0005_vendorreturnimportlog_company_scope_reference_and_more.py](../../../../backend/apps/fulfillment/migrations/0005_vendorreturnimportlog_company_scope_reference_and_more.py)
- [backend/apps/fulfillment/migrations/0006_add_missing_handoff_columns.py](../../../../backend/apps/fulfillment/migrations/0006_add_missing_handoff_columns.py)
- [backend/apps/fulfillment/migrations/0007_buyer_data_integration_spec.py](../../../../backend/apps/fulfillment/migrations/0007_buyer_data_integration_spec.py)
- [backend/apps/fulfillment/migrations/0008_add_tracking_source.py](../../../../backend/apps/fulfillment/migrations/0008_add_tracking_source.py)
- [backend/apps/fulfillment/migrations/0009_add_buyer_shipment_indexes.py](../../../../backend/apps/fulfillment/migrations/0009_add_buyer_shipment_indexes.py)
- [backend/apps/fulfillment/migrations/0010_add_easypost_tracker_id.py](../../../../backend/apps/fulfillment/migrations/0010_add_easypost_tracker_id.py)
