# Invoice Management API Contracts

This document is proposal-level architecture. It defines API contract concepts without finalizing implementation, authentication, transport, storage, or exact schemas.

## Contract Principles

- APIs validate source evidence presence, freshness, bindability, disposition, redaction, and tenant scope.
- APIs do not recalculate Pricing-owned values.
- APIs do not mutate Pricing, Fulfillment/Returns, Procurement, Order Routing, Product Catalog, Integration, Logs & Audit, Notification, or Tenant Company records.
- APIs preserve date-basis metadata and must not silently mix order date, delivery date, refund/adjustment date, invoice period, generated date, or PO date.
- Export and reconciliation endpoints align with `architecture/standards/import-export-validation-governance.md`.

## Source Evidence Control Contract

For non-Pricing source references, request and response schemas should support:

- Source reference id.
- Source module.
- Source record version/hash.
- Source timestamp.
- Source freshness timestamp.
- Source expiration timestamp.
- Source disposition.
- Applied vs ignored state.
- Stale/missing/conflicting state.
- Supersession reference.
- Review-required state.
- Audit reference.

This contract applies to Fulfillment/Returns shipment line evidence, delivered quantity evidence, return line disposition evidence, vendor-provided refund/adjustment evidence, Procurement PO/line/accepted-price/received/completed evidence, Order Routing routed suborder/line/routing snapshot evidence, Product Catalog product/buyer-product relationship evidence, and Tenant Company access/scope evidence.

## Invoice Preview

`POST /invoice-management/invoices/preview`

Proposal-level request:

- Invoice period.
- Invoice period date-basis.
- Invoice type/channel.
- Buyer/vendor/entity scope.
- Tenant Company scope/version.
- Role/scope projection reference.
- Pricing Channel filter.
- Optional source evidence references with Source Evidence Control fields.
- Idempotency key.

Proposal-level response:

- Preview reference.
- Eligible line count.
- Blocked line count.
- Review-required count.
- Stale/missing/conflicting/ignored/superseded source evidence summary.
- Pricing snapshot missing/stale/non-invoice-bindable summary.
- Delivered shipment line evidence missing/stale summary.
- Return line evidence missing/stale summary.
- Vendor refund evidence variance summary.
- PO invoice-bindability blocked summary.
- Redaction/access warnings.
- Export size estimate placeholder.

## Invoice Eligibility Evidence

`POST /invoice-management/invoice-eligibility/evaluate`

Evaluates source evidence and returns eligibility records without finalizing invoices.

Evidence references may include:

- Pricing invoice-bindable snapshot evidence.
- Pricing Channel and pricing rule/version/hash.
- Vendor-side and buyer-side commission component references.
- Buyer-facing Wholesale Price visibility/redaction evidence.
- Order Routing routed suborder/line and routing snapshot Source Evidence Controls.
- Fulfillment/Returns shipment line evidence and delivered quantity Source Evidence Controls.
- Fulfillment/Returns return line disposition evidence and vendor-provided refund/adjustment Source Evidence Controls.
- Pricing adjustment pricing evidence.
- Procurement PO, PO line, accepted-price, received/completed Source Evidence Controls.
- Pricing PO invoice-bindable evidence.
- Tenant Company access/scope Source Evidence Controls.
- Product Catalog product/buyer relationship Source Evidence Controls.

Response includes eligibility status, blocked reason, stale/missing/conflicting/ignored/superseded evidence state, review-required state, and audit reference placeholder.

## Invoice Generation

`POST /invoice-management/invoices`

Creates invoice records from eligible evidence.

Required proposal-level fields:

- Invoice period and date-basis.
- Invoice type/channel.
- Tenant Company scope/version.
- Pricing Channel.
- Source evidence selection or eligibility evidence references.
- Idempotency key.

Generation is blocked when required source evidence is missing, stale, conflicting, redacted, ignored, expired, superseded, or non-invoice-bindable.

## Invoice Finalization

`POST /invoice-management/invoices/{invoiceId}/finalize`

Finalizes an invoice when review-required states are resolved and required evidence remains bindable and dispositioned as applicable. This does not post accounting ledger entries, process payment, or mutate upstream records.

## Invoice Regeneration / Supersession

`POST /invoice-management/invoices/{invoiceId}/regenerate`

Proposal-level request:

- Regeneration reason.
- Source evidence basis.
- Idempotency key.
- Actor/service reference.
- Accounting sync duplicate-check requested flag where the invoice has prior accounting handoff state.

Response includes replacement invoice reference, superseded invoice reference, blocked/review state, and accounting sync supersession/correction requirement where applicable.

## Invoice Adjustment

`POST /invoice-management/invoices/{invoiceId}/adjustments`

Creates assigned invoice adjustment lifecycle evidence from source references.

Required proposal-level references:

- Original invoice line reference.
- Fulfillment/Returns return line disposition Source Evidence Control.
- Vendor-provided refund/adjustment Source Evidence Control where applicable.
- Pricing adjustment pricing evidence.
- Original transaction Pricing snapshot reference.
- Adjustment quantity/basis.
- Adjustment amount source classification.
- Invoice adjustment rule/disposition reference.

Vendor-provided refund amount is adjustment evidence only, not final financial truth. The response should include adjustment amount applied flag, adjustment amount blocked reason, vendor evidence variance amount, review-required state, supersession reference, and audit reference.

## Bulk PO Invoice Evaluation

`POST /invoice-management/po-invoice-eligibility/evaluate`

Evaluates Bulk Purchase Order invoice eligibility from Procurement and Pricing evidence.

Required proposal-level references:

- Procurement PO Source Evidence Control.
- Procurement PO line Source Evidence Control.
- Procurement accepted-price Source Evidence Control.
- Procurement accepted/submitted/received/completed Source Evidence Control where applicable.
- Pricing PO invoice-bindable evidence reference.
- Pricing Channel = Bulk Purchase Order.

Invoice Management must not recalculate accepted PO price or interpret accepted-price variance.

## Invoice Exports

`POST /invoice-management/exports`

Creates invoice export batch/reference.

Proposal-level request fields:

- Invoice/report reference.
- Export schema version.
- Invoice period/date-basis.
- Source evidence basis.
- Buyer/vendor/system admin view type.
- Tenant Company access scope/version.
- Role/scope projection reference.
- Redaction class/version.
- Recheck-before-download flag.
- External delivery requested flag.
- Scheduled/emailed delivery requested flag.

Proposal-level response fields:

- Invoice export batch/reference.
- Generated by actor/service.
- Generated at timestamp.
- File/download reference placeholder.
- Expiration/revocation state.
- Supersession reference.
- Logs & Audit evidence reference.
- Integration delivery reference where exported externally.
- Notification delivery reference where scheduled/emailed.

## Reconciliation Uploads

`POST /invoice-management/reconciliation-uploads`

Creates reconciliation upload detection/review job.

Proposal-level request fields:

- Upload schema version.
- Source file reference placeholder.
- Vendor/entity scope.
- Invoice period/date-basis.
- Tenant Company access scope/version.

Response includes validation status, preview/review state, mismatch detection result, correction/supersession reference, and Logs & Audit evidence reference.

Reconciliation must not mutate source Pricing, Fulfillment/Returns, Procurement, payment, or accounting records.

## Accounting Sync Requests

`POST /invoice-management/accounting-sync-requests`

Creates accounting sync request state and invoice export/reference.

Request/response concepts:

- Accounting sync request id.
- Invoice reference.
- Invoice version/hash.
- Invoice export/reference.
- Accounting target/system reference.
- Idempotency key.
- Duplicate external reference blocker.
- Provider request fingerprint.
- External posting reference placeholder.
- Supersession/correction reference.
- Retry attempt reference.
- Duplicate-posting risk flag.
- Applied vs ignored state.
- Integration delivery/receipt evidence reference.
- Sync requested/accepted/failed state.
- Review-required state.

Integration Management owns QuickBooks/accounting delivery/receipt evidence, provider responses, external IDs, retries, and failures. Invoice Management owns duplicate-posting safeguards for invoice handoff requests only.

## Invoice Views And Sensitive Access

`GET /invoice-management/invoices/{invoiceId}`

`GET /invoice-management/invoice-views`

Requests must include or resolve Tenant Company scope/version, role/scope projection, access decision reference, redaction decision version, buyer/vendor/system admin view type, and recheck-before-display flag.

Sensitive access should emit a sensitive invoice access event where required.

## Invoice Management Foundation API Surface Notes

This section documents architecture-level API surface notes for the Invoice Management foundation hardening. **No concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, or error code catalogs are introduced.** `modules/invoice-management/openapi-contracts.md` is NOT modified. All concrete API contract work is deferred to a future API Governance Foundation PR + an Invoice-Management-specific OpenAPI hardening PR.

### Critical reframing notice (locked)

API / Swagger work is currently paused at the platform level. Any pre-existing route-looking examples elsewhere in this file (for example, `POST /invoice-management/invoices/preview` or `POST /invoice-management/accounting-sync-requests`) are TO BE READ AS NON-FINAL CONCEPTUAL ARCHITECTURE SURFACES, not finalized API routes or payload contracts. They illustrate the architectural shape of the surface; they do NOT define HTTP method, path, request payload, response payload, status codes, pagination, authentication, or error code semantics. Concrete routes and payloads are deferred to future API governance work.

Specifically:

- `POST /invoice-management/invoices/preview` (if present elsewhere in this file): TO BE READ AS the **Invoice Preview surface (architectural shape; not a final route)**. Concrete HTTP method, path, payload, and response shape are out of scope for this PR.
- `POST /invoice-management/accounting-sync-requests` (if present elsewhere in this file): TO BE READ AS the **QuickBooks Handoff Request surface (architectural shape; not a final route; Integration Management owns the QuickBooks API transport)**. The QuickBooks transport itself is owned by Integration Management; Invoice Management owns the handoff request reference only.

This is the canonical reframing statement; any reviewer encountering route-looking text in this file should treat it as conceptual architecture, not finalized API.

### Discipline

- **No concrete API.** Architectural shape only.
- **`openapi-contracts.md` NOT modified.** Per PR-A through PR-E + PR #103 + PR #104 + PR #105 deferral discipline.
- **No concrete request / response payload schemas, pagination cursors, authentication header specs, error code catalogs.**
- **Reference-first per PR-A discipline.** All inputs and outputs described as references to existing fields / records.

### Conceptual surfaces (architectural shape; not final routes)

#### Invoice Preview surface (architectural shape; not a final route)

**Architectural inputs (reference-first):**

- `actor_reference` (CIXCI System Admin per existing baseline).
- `invoice_period_reference`.
- Optional counterparty filter: `buyer_reference` / `vendor_reference` / `company_scope_reference` / `billing_profile_reference`.
- Optional preview scope (e.g., specific subset of source order references).

**Architectural outputs (reference-first):**

- Preview envelope listing eligible Invoice Lines (NOT yet generated) with snapshot summary values.
- Anticipated exception summary (counts by `exception_kind`).
- Anticipated `invoice_run_status` trajectory.

**Concrete HTTP route, payload schema, status codes: future API.**

#### Invoice Run Creation surface (architectural shape; not a final route)

**Architectural inputs:**

- `actor_reference` (CIXCI System Admin).
- `invoice_period_reference`.
- Optional counterparty scope.
- Optional reconciliation evidence prerequisites flag (e.g., require vendor reconciliation `reconciled` or `reconciled_with_exceptions` per business policy).

**Architectural outputs:**

- `invoice_run_id` of the produced Invoice Run.
- Initial `invoice_run_status = requested`.
- PR-A envelope echoed.

#### Invoice Run Status retrieval surface (architectural)

**Architectural inputs:**

- `invoice_run_id` OR counterparty-scope filter.

**Architectural outputs:**

- Invoice Run envelope including `invoice_run_status`, `invoice_run_result_summary_reference`, `status_history_reference`.

#### Invoice retrieval / list surfaces (architectural)

**Architectural inputs:**

- `actor_reference`.
- Counterparty scope keys (buyer / vendor / company / billing profile).
- Optional `invoice_status` filter, `invoice_type` filter, `invoice_period_reference` filter.

**Architectural outputs:**

- List of Invoice envelopes.

#### Invoice Approval surface (architectural)

**Architectural inputs:**

- `actor_reference` (CIXCI System Admin).
- `invoice_id` OR `invoice_run_id`.
- Approval reason / actions.

**Architectural outputs:**

- Updated Invoice / Invoice Run with status transition recorded in Invoice Status History.

#### Invoice Exception review / acknowledgment surface (architectural)

**Architectural inputs:**

- `actor_reference`.
- `invoice_exception_record_id`.
- Acknowledgment / resolution intent.

**Architectural outputs:**

- Updated Invoice Exception Record with `acknowledged_flag = true`, `acknowledged_timestamp`, `acknowledged_actor_reference`, `resolution_reference`.

#### Vendor Reconciliation Upload surface (architectural)

**Architectural inputs:**

- `actor_reference` (vendor user OR admin-on-behalf).
- `vendor_reference`, `company_scope_reference`, `invoice_period_reference`.
- File payload reference (architectural; file format implementation deferred).

**Architectural outputs:**

- `vendor_reconciliation_upload_job_id`.
- Initial `reconciliation_upload_status = uploaded`.

#### Vendor Reconciliation Match Result retrieval surface (architectural)

**Architectural inputs:**

- `vendor_reconciliation_upload_job_id` OR vendor / period scope.
- Optional `match_result_status` filter.

**Architectural outputs:**

- List of Vendor Reconciliation Match Result envelopes with mismatch detail.

#### QuickBooks Handoff Request surface (architectural shape; not a final route; Integration Management owns the QuickBooks API transport)

**Architectural inputs:**

- `actor_reference` (CIXCI System Admin OR service identity).
- `invoice_id` OR `invoice_report_id`.
- `quickbooks_handoff_object_kind` (one of: `invoice`, `bill`, `vendor_payable_package`, `payment_status_update`).

**Architectural outputs:**

- QuickBooks Handoff Reference sub-structure populated.
- `integration_management_dispatch_reference` provided by Integration Management.

#### Invoice Report Export surface (architectural)

**Architectural inputs:**

- `actor_reference`.
- `invoice_report_id`.
- Optional format hint (concrete file format deferred).

**Architectural outputs:**

- Invoice Export / File Reference sub-structure populated.
- File artifact reference per existing Logs & Audit PR-B File Tracking Record baseline.

### Capability registration / lifecycle surfaces

NONE. This PR introduces no new tenant capabilities, role bundles, or service identity profiles. Existing Tenant Company PR #103 + baseline capability registry surfaces continue to govern.

### `openapi-contracts.md` discipline

- **NOT modified.** Per PR-A through PR-E + PR #103 + PR #104 + PR #105 deferral discipline.
- All concrete HTTP routes, payload schemas, pagination contracts, authentication header specs, error code catalogs deferred to future API Governance Foundation PR + Invoice-Management-specific OpenAPI hardening PR.

### What this api-contracts section intentionally does NOT do

- No concrete HTTP route definitions.
- No concrete request / response payload schemas.
- No pagination cursor specification.
- No authentication / authorization header specification.
- No error code catalog.
- No rate-limit policy values.
- No API versioning scheme beyond existing Invoice Management baseline.
- No concrete idempotency cache shape or TTL (architectural idempotency key derivation locked in `spec.md` and `data-model.md`).
- No concrete event delivery semantics for `invoice-run.status-changed` / `invoice.status-changed` / `vendor-reconciliation-upload.status-changed` / `vendor-reconciliation-match.completed` events.
- No concrete propagation latency or eventual-consistency policy beyond existing baseline.
- No modifications to source-module APIs (Logs & Audit, Tenant Company, Integration Management, Order Routing, Fulfillment-Returns, Pricing, Product Catalog, Notification Platform, Analytics).
- No `openapi-contracts.md` modifications.

### Sequencing note

After this PR merges, the following API hardening PRs become natural next steps:

1. API Governance Foundation PR (cross-module API contract conventions; resumes the paused API / Swagger work).
2. Invoice-Management-specific OpenAPI hardening PR (concrete HTTP routes / payloads / pagination / error codes for the surfaces sketched above).
3. Pricing OpenAPI hardening PR (reciprocal: `pricing_snapshot_reference` + `commission_snapshot_reference` shape).
4. Fulfillment-Returns OpenAPI hardening PR (reciprocal: delivery / refund evidence emission shape).
5. Integration Management QuickBooks transport hardening PR.

These PRs are out of scope here. This PR documents architectural shape only, with explicit reframing of any pre-existing route-looking examples as non-final conceptual surfaces.
