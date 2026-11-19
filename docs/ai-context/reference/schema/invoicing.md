# invoicing — model definition reference

Generated from Django metadata using test settings. No database queried.
This describes checked-in definitions, not applied/deployed schema.

## invoicing.Invoice

Table: `invoice_invoice`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `run` / `run_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.InvoiceRun; PROTECT; reverse=invoices` |
| `period` / `period_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.InvoicePeriod; PROTECT; reverse=invoices` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `invoice_type` / `invoice_type` | `CharField` | `NOT NULL; length=40; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="draft"` | `—` |
| `counterparty_role` / `counterparty_role` | `CharField` | `NOT NULL; length=20; default="<not set>"` | `—` |
| `counterparty_reference` / `counterparty_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `subtotal` / `subtotal` | `DecimalField` | `NOT NULL; precision=14, scale=4; default="<not set>"` | `—` |
| `commission_total` / `commission_total` | `DecimalField` | `NOT NULL; precision=14, scale=4; default=0` | `—` |
| `adjustment_total` / `adjustment_total` | `DecimalField` | `NOT NULL; precision=14, scale=4; default=0` | `—` |
| `grand_total` / `grand_total` | `DecimalField` | `NOT NULL; precision=14, scale=4; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `quickbooks_handoff_request_reference` / `quickbooks_handoff_request_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `quickbooks_payment_status_reference` / `quickbooks_payment_status_reference` | `CharField` | `NOT NULL; blank allowed; length=100; default="<not set>"` | `—` |
| `auto_payment_submitted` / `auto_payment_submitted` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `issued_at` / `issued_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `updated_at` / `updated_at` | `DateTimeField` | `NOT NULL; blank allowed; auto_now; default="<not set>"` | `—` |

Choices (stored value → display label):

- `invoice_type`: `[["buyer_invoice","Buyer Invoice"],["vendor_statement","Vendor Statement"],["vendor_payable_package","Vendor Payable Package"],["commission_report","Commission Report"],["adjustment_report","Adjustment Report"],["internal_admin_invoice_report","Internal Admin Invoice Report"]]`
- `status`: `[["draft","Draft"],["pending_validation","Pending Validation"],["validation_failed","Validation Failed"],["ready","Ready"],["issued","Issued"],["sent","Sent"],["acknowledged","Acknowledged"],["disputed","Disputed"],["partially_paid","Partially Paid"],["paid","Paid"],["overdue","Overdue"],["void","Void"],["superseded","Superseded"],["archived","Archived"]]`

Indexes: `[["django.db.models.Index",[],{"name":"invoice_inv_company_ce945c_idx","fields":["company_scope_reference","status","invoice_type"]}],["django.db.models.Index",[],{"name":"invoice_inv_counter_2cfdc4_idx","fields":["counterparty_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## invoicing.InvoiceAdjustment

Table: `invoice_adjustment`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `invoice` / `invoice_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.Invoice; PROTECT; reverse=adjustments` |
| `original_line` / `original_line_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `invoicing.InvoiceLine; PROTECT; reverse=(default)` |
| `adjustment_kind` / `adjustment_kind` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `amount` / `amount` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `reason` / `reason` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `evidence_reference` / `evidence_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## invoicing.InvoiceExceptionRecord

Table: `invoice_exception_record`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `run` / `run_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.InvoiceRun; PROTECT; reverse=exceptions` |
| `invoice` / `invoice_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `invoicing.Invoice; PROTECT; reverse=(default)` |
| `exception_kind` / `exception_kind` | `CharField` | `NOT NULL; length=80; default="<not set>"` | `—` |
| `description` / `description` | `TextField` | `NOT NULL; default="<not set>"` | `—` |
| `source_reference` / `source_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `is_blocking` / `is_blocking` | `BooleanField` | `NOT NULL; default=true` | `—` |
| `resolved` / `resolved` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `resolved_at` / `resolved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"invoice_exc_run_id_7f7a62_idx","fields":["run","is_blocking","resolved"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## invoicing.InvoiceLine

Table: `invoice_line`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `invoice` / `invoice_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.Invoice; PROTECT; reverse=lines` |
| `idempotency_key` / `idempotency_key` | `CharField` | `indexed; NOT NULL; length=512; default="<not set>"` | `—` |
| `source_module` / `source_module` | `CharField` | `NOT NULL; length=100; default="<not set>"` | `—` |
| `source_order_line_reference` / `source_order_line_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `source_product_reference` / `source_product_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `source_pricing_snapshot_reference` / `source_pricing_snapshot_reference` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `source_fulfillment_evidence_reference` / `source_fulfillment_evidence_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `unit_price_snapshot` / `unit_price_snapshot` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `quantity` / `quantity` | `PositiveIntegerField` | `NOT NULL; default="<not set>"` | `—` |
| `line_total` / `line_total` | `DecimalField` | `NOT NULL; precision=12, scale=4; default="<not set>"` | `—` |
| `currency` / `currency` | `CharField` | `NOT NULL; length=3; default="USD"` | `—` |
| `line_description` / `line_description` | `CharField` | `NOT NULL; blank allowed; length=500; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[["invoice","idempotency_key"]]`. Ordering: `[]`.

## invoicing.InvoicePeriod

Table: `invoice_period`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `run` / `run_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.InvoiceRun; PROTECT; reverse=periods` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `period_start` / `period_start` | `DateField` | `NOT NULL; default="<not set>"` | `—` |
| `period_end` / `period_end` | `DateField` | `NOT NULL; default="<not set>"` | `—` |
| `channel` / `channel` | `CharField` | `NOT NULL; blank allowed; length=30; default="<not set>"` | `—` |
| `is_closed` / `is_closed` | `BooleanField` | `NOT NULL; default=false` | `—` |
| `closed_at` / `closed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Indexes: `[["django.db.models.Index",[],{"name":"invoice_per_company_069e1b_idx","fields":["company_scope_reference","period_start","is_closed"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## invoicing.InvoiceReport

Table: `invoice_report`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `run` / `run_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.InvoiceRun; PROTECT; reverse=reports` |
| `report_type` / `report_type` | `CharField` | `NOT NULL; length=50; default="<not set>"` | `—` |
| `generated_at` / `generated_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |
| `file_reference` / `file_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## invoicing.InvoiceRun

Table: `invoice_run`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="draft"` | `—` |
| `company_scope_reference` / `company_scope_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `run_label` / `run_label` | `CharField` | `NOT NULL; blank allowed; length=200; default="<not set>"` | `—` |
| `idempotency_key` / `idempotency_key` | `CharField` | `unique; indexed; NOT NULL; length=255; default="<not set>"` | `—` |
| `scheduled_for` / `scheduled_for` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `started_at` / `started_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `error_detail` / `error_detail` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `created_by` / `created_by` | `UUIDField` | `NOT NULL; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["draft","Draft"],["scheduled","Scheduled"],["queued","Queued"],["initializing","Initializing"],["running","Running"],["paused","Paused"],["validation_failed","Validation Failed"],["partially_complete","Partially Complete"],["complete","Complete"],["superseded","Superseded"],["cancelled","Cancelled"],["failed","Failed"],["rolled_back","Rolled Back"],["pending_review","Pending Review"],["archived","Archived"]]`

Indexes: `[]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## invoicing.VendorReconciliationMatchResult

Table: `invoice_reconciliation_match_result`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `upload_job` / `upload_job_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.VendorReconciliationUploadJob; PROTECT; reverse=match_results` |
| `invoice_line` / `invoice_line_id` | `ForeignKey` | `indexed; NULL; blank allowed; default="<not set>"` | `invoicing.InvoiceLine; PROTECT; reverse=(default)` |
| `match_result_status` / `match_result_status` | `CharField` | `NOT NULL; length=30; default="<not set>"` | `—` |
| `cixci_line_total` / `cixci_line_total` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `vendor_reported_total` / `vendor_reported_total` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `vendor_line_reference` / `vendor_line_reference` | `CharField` | `NOT NULL; blank allowed; length=255; default="<not set>"` | `—` |
| `variance_amount` / `variance_amount` | `DecimalField` | `NULL; blank allowed; precision=12, scale=4; default="<not set>"` | `—` |
| `resolution_note` / `resolution_note` | `TextField` | `NOT NULL; blank allowed; default="<not set>"` | `—` |
| `resolved_by` / `resolved_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `resolved_at` / `resolved_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `match_result_status`: `[["matched","Matched"],["matched_with_variance","Matched with Variance"],["unmatched_cixci_only","Unmatched — CIXCI Only"],["unmatched_vendor_only","Unmatched — Vendor Only"],["disputed","Disputed"],["pending_review","Pending Review"],["override_accepted","Override Accepted"],["override_rejected","Override Rejected"],["resolved","Resolved"],["partial_match","Partial Match"],["excluded","Excluded"],["escalated","Escalated"],["archived","Archived"]]`

Indexes: `[["django.db.models.Index",[],{"name":"invoice_rec_upload__1ca952_idx","fields":["upload_job","match_result_status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## invoicing.VendorReconciliationUploadJob

Table: `invoice_reconciliation_upload_job`. Source: [backend/apps/invoicing/models.py](../../../../backend/apps/invoicing/models.py).

| Field / column | Django type | Constraints / defaults | Relationship |
|---|---|---|---|
| `id` / `id` | `UUIDField` | `PK; unique; NOT NULL; length=32; default="uuid.uuid4 (callable; not evaluated)"` | `—` |
| `invoice` / `invoice_id` | `ForeignKey` | `indexed; NOT NULL; default="<not set>"` | `invoicing.Invoice; PROTECT; reverse=reconciliation_jobs` |
| `vendor_company_reference` / `vendor_company_reference` | `UUIDField` | `indexed; NOT NULL; length=32; default="<not set>"` | `—` |
| `status` / `status` | `CharField` | `NOT NULL; length=30; default="pending"` | `—` |
| `file_reference` / `file_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `file_tracking_reference` / `file_tracking_reference` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `row_count` / `row_count` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `matched_count` / `matched_count` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `unmatched_count` / `unmatched_count` | `PositiveIntegerField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `uploaded_at` / `uploaded_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `completed_at` / `completed_at` | `DateTimeField` | `NULL; blank allowed; default="<not set>"` | `—` |
| `uploaded_by` / `uploaded_by` | `UUIDField` | `NULL; blank allowed; length=32; default="<not set>"` | `—` |
| `created_at` / `created_at` | `DateTimeField` | `NOT NULL; default="django.utils.timezone.now (callable; not evaluated)"` | `—` |

Choices (stored value → display label):

- `status`: `[["pending","Pending"],["uploading","Uploading"],["received","Received"],["parsing","Parsing"],["parse_failed","Parse Failed"],["validating","Validating"],["validation_failed","Validation Failed"],["matching","Matching"],["complete","Complete"],["failed","Failed"]]`

Indexes: `[["django.db.models.Index",[],{"name":"invoice_rec_vendor__b6fd67_idx","fields":["vendor_company_reference","status"]}]]`.

Constraints: `[]`.

Unique together: `[]`. Ordering: `[]`.

## Migrations

- [backend/apps/invoicing/migrations/0001_initial.py](../../../../backend/apps/invoicing/migrations/0001_initial.py)
