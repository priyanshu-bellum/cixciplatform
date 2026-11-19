# audit — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## audit.AuditRecord

Table: `audit_record`. Source: [backend/apps/audit/models.py](../../../../backend/apps/audit/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `event_code` / `event_code` | `CharField` | `indexed; NOT NULL; length=200; default="<not set>"` | `—` |
| `event_description` / `event_description` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `service_trigger_reference` / `service_trigger_reference` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `source_record_type` / `source_record_type` | `CharField` | `NOT NULL; blank allowed; length=150; default="<not set>"` | `—` |
| `source_record_id` / `source_record_id` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `evidence_record_reference` / `evidence_record_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `correlation_id` / `correlation_id` | `UUIDField` | `indexed; NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `idempotency_key` / `idempotency_key` | `CharField` | `indexed; NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `error_code` / `error_code` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `error_message` / `error_message` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `retry_count` / `retry_count` | `PositiveSmallIntegerField` | `NOT NULL; default=0` | `—` |
| `retention_class` / `retention_class` | `CharField` | `NOT NULL; length=30; default="standard"` | `—` |
| `redaction_class` / `redaction_class` | `CharField` | `NOT NULL; length=50; default="internal_operations"` | `—` |
| `access_class` / `access_class` | `CharField` | `NOT NULL; length=30; default="internal_operations"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `indexed; NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `retention_class`: `[["transient","Transient"],["standard","Standard"],["extended","Extended"],["regulatory","Regulatory"],["legal_hold","Legal Hold"],["audit_critical","Audit Critical"]]`
- `redaction_class`: `[["public_metadata_placeholder","Public Metadata"],["buyer_visible_audit","Buyer Visible Audit"],["vendor_visible_audit","Vendor Visible Audit"],["internal_operations","Internal Operations"],["customer_sensitive_restricted","Customer Sensitive Restricted"],["pricing_sensitive_restricted","Pricing Sensitive Restricted"],["invoice_sensitive_restricted","Invoice Sensitive Restricted"],["warranty_sensitive_restricted","Warranty Sensitive Restricted"],["tenant_security_restricted","Tenant Security Restricted"],["audit_only","Audit Only"]]`
- `access_class`: `[["public_metadata","Public Metadata"],["buyer_visible","Buyer Visible"],["vendor_visible","Vendor Visible"],["internal_operations","Internal Operations"],["system_admin_only","System Admin Only"],["compliance_only","Compliance Only"]]`

Indexes: `[["django.db.models.Index",[],{"name":"audit_recor_source__d1338d_idx","fields":["source_module","source_record_id"]}],["django.db.models.Index",[],{"name":"audit_recor_company_8ac3b1_idx","fields":["company_scope_reference","created_at"]}],["django.db.models.Index",[],{"name":"audit_recor_event_c_ab7f18_idx","fields":["event_code","created_at"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## audit.EvidenceAmendmentRecord

Table: `audit_evidence_amendment`. Source: [backend/apps/audit/models.py](../../../../backend/apps/audit/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `evidence_record` / `evidence_record_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `audit.EvidenceRecord; PROTECT; reverse=amendments` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `reason` / `reason` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `amendment_detail` / `amendment_detail` | `JSONField` | `NOT NULL; default="<not set>"` | `—` |
| `audit_record_reference` / `audit_record_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## audit.EvidenceRecord

Table: `audit_evidence_record`. Source: [backend/apps/audit/models.py](../../../../backend/apps/audit/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `audit_record` / `audit_record_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `audit.AuditRecord; PROTECT; reverse=evidence_records` |
| `evidence_type` / `evidence_type` | `CharField` | `indexed; NOT NULL; length=100; default="<not set>"` | `—` |
| `evidence_status` / `evidence_status` | `CharField` | `NOT NULL; length=20; default="active"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `source_record_type` / `source_record_type` | `CharField` | `NOT NULL; blank allowed; length=150; default="<not set>"` | `—` |
| `source_record_id` / `source_record_id` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `source_snapshot_reference` / `source_snapshot_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `service_trigger_reference` / `service_trigger_reference` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `evidence_attachment_reference` / `evidence_attachment_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `evidence_hash_reference` / `evidence_hash_reference` | `CharField` | `NOT NULL; blank allowed; length=512; default="<not set>"` | `—` |
| `evidence_schema_version` / `evidence_schema_version` | `CharField` | `NOT NULL; length=20; default="1.0"` | `—` |
| `source_event_reference` / `source_event_reference` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `correlation_reference` / `correlation_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `trace_reference` / `trace_reference` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `idempotency_key` / `idempotency_key` | `CharField` | `indexed; NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `replay_safe_dedupe_reference` / `replay_safe_dedupe_reference` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `retention_class` / `retention_class` | `CharField` | `NOT NULL; length=30; default="standard"` | `—` |
| `redaction_class` / `redaction_class` | `CharField` | `NOT NULL; length=50; default="internal_operations"` | `—` |
| `access_class` / `access_class` | `CharField` | `NOT NULL; length=30; default="internal_operations"` | `—` |
| `restricted_evidence` / `restricted_evidence` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `raw_evidence_reference` / `raw_evidence_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `redacted_view_reference` / `redacted_view_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `legal_hold_reference` / `legal_hold_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `captured_at` / `captured_at` | `DateTimeField` | `indexed; NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `evidence_status`: `[["active","Active"],["superseded","Superseded"],["amended","Amended"]]`
- `retention_class`: `[["transient","Transient"],["standard","Standard"],["extended","Extended"],["regulatory","Regulatory"],["legal_hold","Legal Hold"],["audit_critical","Audit Critical"]]`
- `redaction_class`: `[["public_metadata_placeholder","Public Metadata"],["buyer_visible_audit","Buyer Visible Audit"],["vendor_visible_audit","Vendor Visible Audit"],["internal_operations","Internal Operations"],["customer_sensitive_restricted","Customer Sensitive Restricted"],["pricing_sensitive_restricted","Pricing Sensitive Restricted"],["invoice_sensitive_restricted","Invoice Sensitive Restricted"],["warranty_sensitive_restricted","Warranty Sensitive Restricted"],["tenant_security_restricted","Tenant Security Restricted"],["audit_only","Audit Only"]]`
- `access_class`: `[["public_metadata","Public Metadata"],["buyer_visible","Buyer Visible"],["vendor_visible","Vendor Visible"],["internal_operations","Internal Operations"],["system_admin_only","System Admin Only"],["compliance_only","Compliance Only"]]`

Indexes: `[["django.db.models.Index",[],{"name":"audit_evide_evidenc_305ce4_idx","fields":["evidence_type","captured_at"]}],["django.db.models.Index",[],{"name":"audit_evide_source__58f953_idx","fields":["source_module","source_record_id"]}],["django.db.models.Index",[],{"name":"audit_evide_company_068333_idx","fields":["company_scope_reference","captured_at"]}],["django.db.models.Index",[],{"name":"audit_evide_evidenc_725b42_idx","fields":["evidence_status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## audit.EvidenceSupersessionRecord

Table: `audit_evidence_supersession`. Source: [backend/apps/audit/models.py](../../../../backend/apps/audit/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `prior_evidence_record` / `prior_evidence_record_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `audit.EvidenceRecord; PROTECT; reverse=superseded_by` |
| `new_evidence_record` / `new_evidence_record_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `audit.EvidenceRecord; PROTECT; reverse=supersedes` |
| `source_module_correction_reference` / `source_module_correction_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `reason` / `reason` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## audit.FileTrackingRecord

Table: `audit_file_tracking_record`. Source: [backend/apps/audit/models.py](../../../../backend/apps/audit/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `audit_record` / `audit_record_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `audit.AuditRecord; PROTECT; reverse=file_tracking_records` |
| `evidence_record` / `evidence_record_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `audit.EvidenceRecord; PROTECT; reverse=file_tracking_records` |
| `file_direction` / `file_direction` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `file_purpose` / `file_purpose` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `file_lifecycle_status` / `file_lifecycle_status` | `CharField` | `NOT NULL; length=40; default="<not set>"` | `—` |
| `file_name` / `file_name` | `CharField` | `NOT NULL; length=500; default="<not set>"` | `—` |
| `file_type` / `file_type` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `file_version` / `file_version` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `file_storage_reference` / `file_storage_reference` | `CharField` | `NOT NULL; blank allowed; length=1000; default="<not set>"` | `—` |
| `file_hash_reference` / `file_hash_reference` | `CharField` | `NOT NULL; blank allowed; length=512; default="<not set>"` | `—` |
| `file_integrity_reference` / `file_integrity_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `vendor_reference` / `vendor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `buyer_entity_scope` / `buyer_entity_scope` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `actor_reference` / `actor_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `service_trigger_reference` / `service_trigger_reference` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `row_count` / `row_count` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `accepted_row_count` / `accepted_row_count` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `failed_row_count` / `failed_row_count` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `validation_status` / `validation_status` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `processing_status` / `processing_status` | `CharField` | `NOT NULL; blank allowed; length=50; default="<not set>"` | `—` |
| `error_summary` / `error_summary` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `duplicate_file_detection_reference` / `duplicate_file_detection_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `correction_reupload_history_reference` / `correction_reupload_history_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `masked_payload_reference` / `masked_payload_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `retention_class` / `retention_class` | `CharField` | `NOT NULL; length=30; default="standard"` | `—` |
| `redaction_class` / `redaction_class` | `CharField` | `NOT NULL; length=50; default="internal_operations"` | `—` |
| `access_class` / `access_class` | `CharField` | `NOT NULL; length=30; default="internal_operations"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `indexed; NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `file_direction`: `[["uploaded","Uploaded (external → CIXCI)"],["generated","Generated (CIXCI-created)"],["downloaded","Downloaded (CIXCI → external)"]]`
- `file_purpose`: `[["product_import","Product Import"],["product_export","Product Export"],["vendor_order_export","Vendor Order Export"],["vendor_return_export","Vendor Return Export"],["vendor_shipping_import","Vendor Shipping Import"],["vendor_delivery_import","Vendor Delivery Import"],["vendor_return_import","Vendor Return Import"],["media_upload","Media Upload"],["invoice_export","Invoice Export"],["report_export","Report Export"],["audit_export","Audit Export"],["unknown_other","Unknown / Other"]]`
- `file_lifecycle_status`: `[["received","Received"],["generated","Generated"],["stored","Stored"],["queued_for_validation","Queued for Validation"],["validating","Validating"],["validation_failed","Validation Failed"],["validation_passed","Validation Passed"],["processing","Processing"],["processing_failed","Processing Failed"],["processed","Processed"],["partially_processed","Partially Processed"],["duplicate_detected","Duplicate Detected"],["superseded","Superseded"],["replaced","Replaced"],["canceled","Canceled"],["expired","Expired"],["archived","Archived"]]`
- `retention_class`: `[["transient","Transient"],["standard","Standard"],["extended","Extended"],["regulatory","Regulatory"],["legal_hold","Legal Hold"],["audit_critical","Audit Critical"]]`
- `redaction_class`: `[["public_metadata_placeholder","Public Metadata"],["buyer_visible_audit","Buyer Visible Audit"],["vendor_visible_audit","Vendor Visible Audit"],["internal_operations","Internal Operations"],["customer_sensitive_restricted","Customer Sensitive Restricted"],["pricing_sensitive_restricted","Pricing Sensitive Restricted"],["invoice_sensitive_restricted","Invoice Sensitive Restricted"],["warranty_sensitive_restricted","Warranty Sensitive Restricted"],["tenant_security_restricted","Tenant Security Restricted"],["audit_only","Audit Only"]]`
- `access_class`: `[["public_metadata","Public Metadata"],["buyer_visible","Buyer Visible"],["vendor_visible","Vendor Visible"],["internal_operations","Internal Operations"],["system_admin_only","System Admin Only"],["compliance_only","Compliance Only"]]`

Indexes: `[["django.db.models.Index",[],{"name":"audit_file__company_7452b1_idx","fields":["company_scope_reference","file_purpose","created_at"]}],["django.db.models.Index",[],{"name":"audit_file__source__a500fb_idx","fields":["source_module","file_lifecycle_status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/audit/migrations/0001_initial.py](../../../../backend/apps/audit/migrations/0001_initial.py)
