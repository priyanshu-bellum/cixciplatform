# Invoice Management Workflows

This document is proposal-level architecture. It outlines workflows without finalizing implementation behavior, payment processing, accounting ledger behavior, reconciliation settlement, or source-module ownership.

## Invoice Preview Workflow

1. User or service requests invoice preview for an invoice period, date-basis, entity scope, view type, and Pricing Channel.
2. Invoice Management validates Tenant Company scope/version, role/scope projection, access decision, and redaction decision version.
3. Invoice Management evaluates candidate source evidence for the requested channel.
4. For non-Pricing source evidence, Invoice Management checks source reference id, source module, source record version/hash, source timestamp, freshness/expiration, source disposition, applied-vs-ignored state, supersession state, and stale/missing/conflicting state.
5. Invoice Management creates or evaluates Invoice Eligibility Evidence without finalizing invoice records.
6. Preview returns eligible, blocked, stale, missing, conflicting, superseded, ignored, review-required, and redacted line counts.
7. Preview surfaces export size/date-basis warnings where available.

Preview must not mutate Pricing, Fulfillment/Returns, Procurement, Order Routing, Product Catalog, Integration, accounting, payment, or audit records.

## Invoice Generation Workflow

1. User or service requests invoice generation with idempotency key.
2. Invoice Management validates invoice period, date-basis, buyer/vendor/entity scope, view type, and Pricing Channel.
3. Invoice Management validates Pricing invoice-bindable evidence and required source evidence by channel.
4. Online/DTC candidates require Order Routing routed suborder/line evidence, routing snapshot evidence, Fulfillment/Returns shipment line evidence, delivered quantity evidence, and Online/DTC Pricing invoice-bindable snapshot evidence.
5. Bulk PO candidates require Procurement PO/line evidence, Procurement accepted-price evidence where applicable, Procurement received/completed evidence where applicable, and Pricing PO invoice-bindable evidence.
6. Return/adjustment candidates require Fulfillment/Returns return line disposition evidence, vendor-provided refund/adjustment evidence where applicable, original transaction Pricing snapshot reference, and Pricing adjustment pricing evidence.
7. Non-Pricing source evidence must be versioned/dispositioned enough to prove the source state used for eligibility.
8. Missing, stale, expired, ignored, conflicting, redacted, superseded, or non-invoice-bindable evidence blocks the candidate or routes it to review.
9. Invoice Management creates invoice records, invoice lines, invoice eligibility evidence references, status history, and export/report placeholders.
10. Invoice Management emits invoice events.

Invoice Management must not recalculate commission, buyer-facing Wholesale Price, PO price, adjustment price, or exception behavior.

## Online / Direct-to-Consumer Workflow

1. Candidate line is selected from versioned/dispositioned routed suborder/line context.
2. Fulfillment/Returns provides shipment line evidence with delivered quantity and source version/disposition controls.
3. Pricing provides Online/DTC invoice-bindable snapshot evidence.
4. Invoice Management validates delivered quantity, source freshness, source disposition, redaction, and invoice-bindability.
5. Invoice line is created for the invoiceable delivered quantity.

Rules:

- Order Routing evidence provides routing context but does not prove delivery.
- Shipment status, shipped date, tracking number, tracking URL, or carrier update alone is not invoice-eligible.
- Partial delivered quantities must be retained at line level.
- Duplicate, stale, superseded, ignored, or out-of-order delivery evidence blocks or routes to review.

## Bulk Purchase Order Workflow

1. Procurement provides PO reference, PO line reference, accepted-price evidence, and lifecycle evidence placeholders such as submitted, accepted, received, or completed where applicable, each with source version/disposition controls.
2. Pricing provides PO invoice-bindable evidence with Pricing Channel = Bulk Purchase Order.
3. Invoice Management validates PO invoice eligibility, accepted-price evidence reference, invoiceable PO quantity, source disposition, Pricing bindability, and source freshness.
4. Eligible lines become Bulk PO Invoice Line Evidence.

Rules:

- Bulk PO invoice logic is separate from Online/DTC delivered-order invoice logic.
- Invoice Management does not recalculate accepted PO price.
- Invoice Management does not interpret Procurement accepted-price variance.
- Procurement owns PO lifecycle and accepted-price truth.
- Pricing owns PO pricing interpretation and invoice-bindable evidence.

## Return / Refund / Adjustment Workflow

1. Fulfillment/Returns provides operational return evidence and return line disposition evidence with source version/disposition controls.
2. Fulfillment/Returns may provide vendor-provided refund/adjustment evidence, including Return Refunded Amount as evidence only.
3. Pricing provides original transaction Pricing snapshot reference and adjustment pricing evidence.
4. Invoice Management validates line-level return quantity, adjustment basis, source freshness, source disposition, and Pricing bindability.
5. Invoice Management compares vendor-provided refund/adjustment evidence against Pricing adjustment evidence and Invoice-owned adjustment rules/disposition where assigned.
6. Invoice Management creates invoice adjustment line/evidence only when adjustment amount source classification and adjustment amount applied flag allow it.
7. Missing, stale, inconsistent, superseded, ignored, or non-bindable return/adjustment evidence blocks adjustment or routes to review.

Rules:

- Vendor-provided Return Refunded Amount is not final financial truth by itself.
- Vendor evidence variance should block or route to review rather than become an invoice amount automatically.
- Fulfillment/Returns owns operational return evidence, not financial finality.
- Pricing owns adjustment pricing evidence, not refund approval or invoice adjustment application.
- Invoice Management owns invoice adjustment lifecycle where assigned.
- Partial returns and partial refund/adjustment evidence must remain line-level.

## Invoice Finalization Workflow

1. Authorized actor requests finalization.
2. Invoice Management checks invoice status, eligibility evidence, blocked lines, review-required states, redaction/access evidence, source evidence versions/dispositions, and source freshness.
3. Pricing evidence must still be invoice-bindable.
4. Shipment/return/PO evidence must still be fresh enough and not ignored/superseded under proposal-level rules.
5. Invoice Management records finalization status and emits event.

Finalization must not mutate source modules, post accounting ledger entries, process payments, or deliver notifications/integrations directly.

## Regeneration And Supersession Workflow

1. Authorized actor requests regeneration with reason and idempotency key.
2. Invoice Management checks regeneration lock and prior invoice state.
3. Invoice Management creates supersession reference rather than silently overwriting finalized evidence.
4. Regeneration uses current source-owned evidence and Pricing bindability.
5. If the prior invoice has an accounting sync request, regeneration must check accounting sync idempotency, duplicate external reference blocker, provider request fingerprint, external posting reference placeholder, and supersession/correction reference before any new accounting handoff request.
6. Prior invoice/export remains traceable.

## Invoice Export Workflow

1. User or service requests invoice export for buyer, vendor, or system admin view.
2. Invoice Management validates Tenant Company access scope/version, role/scope projection, access decision, redaction decision version, and recheck-before-download flag.
3. Invoice Management creates invoice export batch/reference with schema version, generated by/at, invoice period/date-basis, source evidence basis, redaction class/version, expiration/revocation state, and supersession reference.
4. Logs & Audit receives immutable file/download evidence references where applicable.
5. Integration Management receives delivery reference where exported externally.
6. Notification Platform Service receives delivery reference where scheduled/emailed.
7. Sensitive invoice access/download events are emitted where required.

Exports follow `architecture/standards/import-export-validation-governance.md`. They must not bypass visibility or redaction rules and must not silently mix order date, delivery date, adjustment date, invoice period, generated date, or PO date without date-basis metadata.

## Reconciliation Upload Workflow

1. Reconciliation upload is received.
2. Invoice Management creates reconciliation upload job with schema version and source file reference placeholder.
3. Upload validation, preview, and review follow `architecture/standards/import-export-validation-governance.md`.
4. Invoice Management compares uploaded rows against invoice records, invoice lines, and source evidence references.
5. Mismatches are recorded for detection/review.
6. Logs & Audit owns file evidence; Integration Management owns transport evidence where applicable.

Reconciliation must not mutate source Pricing, Fulfillment/Returns, Procurement, Order Routing, payment, accounting ledger, or Integration records. Settlement/payment correction remains future scope unless assigned by ADR.

## QuickBooks / Accounting Sync Workflow

1. Invoice or invoice export is marked eligible for accounting handoff placeholder.
2. Invoice Management creates accounting sync request state with invoice version/hash, accounting target/system reference, idempotency key, duplicate external reference blocker, provider request fingerprint, and duplicate-posting risk flag.
3. Integration Management transports the request and records QuickBooks/accounting delivery/receipt evidence, provider response, external ID, retry, and failure references.
4. Invoice Management records accounting handoff status, applied-vs-ignored state, retry attempt reference, supersession/correction reference, and review state based on Integration evidence.
5. Reused idempotency keys, duplicate external references, provider fingerprint conflicts, regenerated invoices, or superseded invoices block or route to review before a new accounting handoff request is made.

Invoice Management does not own external accounting ledger, QuickBooks truth, payment processing, settlement execution, or provider transport.

## Tenant Visibility Workflow

1. Buyer, vendor, or system admin opens invoice view or export.
2. Invoice Management validates Tenant Company scope/version, role/scope projection, access decision, redaction decision version, and recheck-before-display/download flags.
3. Invoice Management applies view-specific field handling for customer-sensitive, pricing-sensitive, commission-sensitive, and accounting-sensitive fields.
4. Sensitive access event is emitted where required.

Buyer, vendor, and system admin invoice views remain separated.

## Notification Hook Workflow

1. Invoice Management emits invoice event.
2. Notification Platform Service consumes event where configured.
3. Notification Platform Service owns delivery, recipient resolution, retry, and delivery history.

## AI Signal Workflow

1. Invoice Management emits signals for missing Pricing evidence, stale/superseded/ignored source evidence, missing delivered shipment line evidence, missing return line evidence, vendor refund evidence variance, PO bindability blocks, reconciliation mismatch, sensitive access, accounting duplicate risk, or regeneration supersession.
2. AI Agent Services may recommend review actions where authorized.
3. AI must not finalize invoices, mutate invoice financial state, or bypass permissions/action contracts.

## Invoice Management Foundation Workflows

This section adds **19 numbered architectural workflows** for the Invoice Management foundation hardening. All existing Invoice Management baseline workflows are preserved without modification.

### Core boundary wording (locked)

`Invoice Management owns invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff references, invoice evidence references, and invoice operational workflow; Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, and Integration Management each retain their existing source-of-truth boundaries; QuickBooks remains the external accounting system of record once an invoice, bill, or vendor payable package is created or synced there.`

### Core vendor file rule (locked verbatim; reaffirmed in Workflow 16 and 17)

`The vendor reconciliation upload file is comparison evidence, not source truth by default; source-owned order, delivery, and refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.`

### Core no-auto-payment rule (locked verbatim; reaffirmed in Workflow 19)

`CIXCI does not automatically submit vendor payment by default; the billing person reviews and submits payment from QuickBooks unless a future approved auto-payment workflow is explicitly defined with additional controls; QuickBooks-derived payment status is stored in CIXCI only as an external payment status reference, not as CIXCI-owned payment truth.`

---

### Workflow 1 - Invoice Run Creation

**Purpose:** create an Invoice Run for a billing period.

**Steps (architectural):**

1. CIXCI System Admin (or authorized service identity per Tenant Company authority) initiates Invoice Run creation.
2. Validate authority via Tenant Company `check_access`. **Do NOT use `audit_export.*` capabilities.**
3. Create an Invoice Run at `invoice_run_status = requested` with `invoice_period_reference`, `requested_by_actor_reference`, counterparty scope summary.
4. Emit `invoice-management.invoice-run.requested`.
5. Emit `invoice-management.invoice-run.status-changed` with `invoice_run_status = requested`.
6. Hand off to Workflow 2 (Invoice Period Selection) and Workflow 3 (Invoice Eligibility Collection).

**Outputs:** Invoice Run at `requested`.

**Boundary:** Invoice Management owns Invoice Run; Tenant Company owns authority.

### Workflow 2 - Invoice Period Selection

**Purpose:** select / resolve the Invoice Period for the Invoice Run.

**Steps (architectural):**

1. Resolve the `invoice_period_reference` to a concrete Invoice Period (month start, month end, identifier).
2. If the period is already covered by a prior `synced` Invoice Run for the same counterparty scope, route to supersession path per Workflow 14 (Invoice Regeneration / Supersession / Adjustment).
3. Bind the Invoice Period to the Invoice Run.

**Outputs:** Invoice Period bound.

**Boundary:** Invoice Period is an Invoice Management reference entity; no adjacent module mutation.

### Workflow 3 - Invoice Eligibility Collection

**Purpose:** gather eligible delivered order lines and return-refunded adjustments from source modules.

**Steps (architectural):**

1. Transition Invoice Run to `invoice_run_status = collecting_sources`.
2. Query Order Routing for source order / suborder / order line references in the period.
3. Query Fulfillment / Returns for `fulfillment_delivery_evidence_reference` per source order line.
4. Query Fulfillment / Returns for `return_refund_evidence_reference` per applicable line.
5. **Apply eligibility rules:**
   - Delivered eligibility REQUIRES Fulfillment / Returns delivery evidence (shipment / tracking alone is NOT enough).
   - Refund adjustment eligibility REQUIRES source refund evidence AND Pricing adjustment evidence.
   - Canceled / failed / pending / unfulfilled / undelivered / returned-not-refunded / rejected-without-refund orders are EXCLUDED.
   - Split orders and multi-vendor orders are sourced at line / suborder / vendor scope.
6. Hand off to Workflow 4 (Invoice Source Snapshot).

**Outputs:** eligibility list per source line; ineligible lines flagged for exclusion or exception.

**Boundary:** Invoice Management consumes; Order Routing and Fulfillment / Returns own.

### Workflow 4 - Invoice Source Snapshot

**Purpose:** snapshot source references and source versions on every eligible line.

**Steps (architectural):**

1. For each eligible line, snapshot:
   - `source_order_reference`, `source_suborder_reference`, `source_order_line_reference` (with source version).
   - `fulfillment_delivery_evidence_reference` (with source version).
   - `return_refund_evidence_reference` (with source version; nullable).
2. Populate Invoice Line Source Reference sub-structure.
3. Bind to Invoice Line draft (not yet emitted).

**Outputs:** snapshot-bound Invoice Line draft.

**Boundary:** snapshots are READ-ONLY references; source modules NEVER mutated.

### Workflow 5 - Invoice Line Generation

**Purpose:** generate Invoice Lines for eligible counterparties grouped per `invoice_type`, `counterparty_role`, and `billing_profile_reference`.

**Steps (architectural):**

1. Transition Invoice Run to `invoice_run_status = generating`.
2. For each counterparty grouping, create draft Invoices (one per `invoice_type` + counterparty + billing profile).
3. Generate Invoice Lines per source line snapshot.
4. **Apply idempotency:** invoice generation is idempotent by (`invoice_period` + counterparty + `source_order_line_reference`). On idempotency collision, create Invoice Exception Record at `exception_kind = idempotency_collision` and route to Workflow 14.
5. **Locked invariant:** Invoice Lines are IMMUTABLE once generated. Upstream changes produce Invoice Adjustments, not mutation.
6. Hand off to Workflow 6 (Return Refund Adjustment Handling) and Workflow 7 (Commission / Pricing Snapshot Binding).

**Outputs:** Invoice Line records bound to Invoices.

**Boundary:** Invoice Management owns Invoice Lines; Order Routing / Fulfillment / Returns own source records.

### Workflow 6 - Return Refund Adjustment Handling

**Purpose:** create Invoice Adjustments for return / refund events.

**Steps (architectural):**

1. For each `return_refund_evidence_reference` on an in-scope line: create an Invoice Adjustment with `adjustment_kind = refund` (within same period) OR `adjustment_kind = late_refund` (for refunds falling in a later period referencing a prior closed period's Invoice Line).
2. Bind `parent_invoice_line_reference`.
3. Compute snapshot `refund_adjustment_amount` per Pricing snapshot (NOT recalculated by Invoice Management).
4. **Late refund rule:** for refunds occurring after a closed invoice period, create a later-period Invoice Adjustment referencing the original Invoice Line. **Previously issued Invoice Lines MUST NOT be mutated.**
5. **Vendor-reported refund rule:** vendor-reported refund status (from reconciliation) MAY create an adjustment CANDIDATE or exception, but does NOT automatically reduce invoiceable amount without CIXCI source refund evidence or approved exception resolution.
6. Emit `invoice-management.invoice-adjustment.recorded` with `adjustment_kind` discriminator.

**Outputs:** Invoice Adjustment records.

**Boundary:** Invoice Management owns Invoice Adjustments; Fulfillment / Returns owns refund evidence; Pricing owns adjustment calculation.

### Workflow 7 - Commission / Pricing Snapshot Binding

**Purpose:** bind `pricing_snapshot_reference` and `commission_snapshot_reference` on every Invoice Line.

**Steps (architectural):**

1. For each Invoice Line, query Pricing for `pricing_snapshot_reference` and `commission_snapshot_reference` applicable at the source line's effective time.
2. Snapshot the references (REQUIRED on every Invoice Line).
3. Store snapshot values (`unit_price`, `quantity`, `vendor_wholesale_amount`, `buyer_wholesale_amount`, `buyer_side_commission_amount`, `vendor_side_commission_amount`, `invoiceable_amount`, `refund_adjustment_amount`, `net_amount`) AS EVIDENCE.
4. **Locked rule:** Invoice Management MUST NOT recalculate Pricing-owned values.
5. If Pricing snapshot is missing, create Invoice Exception Record at `exception_kind = missing_pricing_snapshot` or `missing_commission_snapshot` and route to Workflow 8.

**Outputs:** Pricing / Commission snapshot references bound; snapshot values populated.

**Boundary:** Pricing owns calculation; Invoice Management stores snapshot values as evidence.

### Workflow 8 - Invoice Exception Review

**Purpose:** surface Invoice Exception Records to admin for review and acknowledgment.

**Steps (architectural):**

1. For each Invoice Exception Record produced by Workflows 3-7, 11, 14, 16, 17: route to admin review queue (data-level signal; UI surface is future UX).
2. Admin reviews exception details, severity, and triggering references.
3. Admin acknowledges (sets `acknowledged_flag = true`, `acknowledged_timestamp`, `acknowledged_actor_reference`) and optionally resolves (sets `resolution_reference`).
4. Resolution MAY trigger Invoice Adjustment creation (Workflow 6) or supersession (Workflow 14) depending on exception kind.
5. If exceptions remain unresolved AND severity is `blocking`: Invoice Run transitions to `invoice_run_status = completed_with_exceptions` then `pending_review`; invoice approval (Workflow 9) is HELD.
6. **Open business decision:** which actors can approve reconciliation exceptions (default per scoping: CIXCI System Admin).

**Outputs:** acknowledged / resolved Invoice Exception Records; review queue cleared.

**Boundary:** admin review per Tenant Company authority; no adjacent module mutation.

### Workflow 9 - Invoice Approval

**Purpose:** approve generated Invoices for QuickBooks handoff.

**Steps (architectural):**

1. Admin reviews generated Invoices / Reports.
2. Validate prerequisite gates:
   - All blocking Invoice Exception Records resolved or acknowledged with explicit resolution.
   - Vendor reconciliation upload (if applicable) at `reconciled` or `reconciled_with_exceptions` (depending on business policy).
   - QuickBooks customer / vendor mappings present (no `missing_quickbooks_mapping` blocking exception).
3. Admin approves; Invoice transitions to `invoice_status = approved`; Invoice Run transitions to `invoice_run_status = approved` once all child invoices approved (or partial approval per business policy).
4. Emit `invoice-management.invoice.status-changed` with `invoice_status = approved`.
5. Hand off to Workflow 10 (QuickBooks Handoff).

**Outputs:** Invoices at `approved`; Invoice Run at `approved`.

**Boundary:** approval per Tenant Company admin authority; Invoice Management owns approval state.

### Workflow 10 - QuickBooks Handoff

**Purpose:** create a QuickBooks handoff request via Integration Management.

**Steps (architectural):**

1. Transition Invoice (or Invoice Report) status to `invoice_status = queued_for_sync` then `sync_requested`.
2. Invoice Management creates a QuickBooks Handoff Reference sub-structure populated with `quickbooks_handoff_object_kind` (one of: `invoice`, `bill`, `vendor_payable_package`, `payment_status_update`).
3. Invoice Management calls Integration Management to dispatch the QuickBooks API transport. **Integration Management owns the QuickBooks API transport and records the QuickBooks sync outcome.**
4. Integration Management populates `integration_management_dispatch_reference` on the QuickBooks Handoff Reference.
5. Emit `invoice-management.quickbooks-handoff.reference-recorded` with the appropriate `quickbooks_handoff_object_kind`.

**Outputs:** QuickBooks Handoff Reference populated; transport dispatched.

**Boundary:** **Invoice Management owns the handoff REQUEST; Integration Management owns the transport; QuickBooks owns the external ledger.**

### Workflow 11 - QuickBooks Sync Reference Recording

**Purpose:** record the QuickBooks sync outcome reference returned by Integration Management.

**Steps (architectural):**

1. Integration Management reports QuickBooks sync outcome (success / failure / external reference IDs).
2. Invoice Management populates `quickbooks_sync_reference`, `quickbooks_invoice_reference` OR `quickbooks_bill_reference`, `quickbooks_last_synced_at`, and (where applicable) `quickbooks_error_reference` on the QuickBooks Handoff Reference.
3. On success: transition Invoice to `invoice_status = synced`.
4. On failure: transition Invoice to `invoice_status = sync_failed`; create Invoice Exception Record at `exception_kind = source_record_drift` or similar if drift detected; route to Workflow 8.
5. Emit `invoice-management.invoice.status-changed` with `invoice_status = synced` or `sync_failed`.
6. Emit `invoice-management.quickbooks-handoff.reference-recorded` (sync-side) with updated references.

**Outputs:** QuickBooks sync state recorded as REFERENCES; Invoice status updated.

**Boundary:** Invoice Management stores QuickBooks-derived state as REFERENCES only; QuickBooks owns external ledger.

### Workflow 12 - Invoice Status Lifecycle

**Purpose:** maintain Invoice / Invoice Run status lifecycle and history.

**Steps (architectural):**

1. Every status transition records a new entry in Invoice Status History (sub-structure).
2. Status History entry includes: `prior_status`, `new_status`, `transition_timestamp`, `reason_reference`, `actor_reference` OR `service_trigger_reference`, optional triggering references.
3. Status transitions respect the 14 Invoice statuses + 15 Invoice Run statuses + their semantics (locked in `spec.md`).
4. Invoice statuses transition independently per Invoice; Invoice Run statuses transition based on aggregate child Invoice statuses + exception state + sync state.
5. **External / reference-only statuses** (`sent`, `paid`, `partially_paid`, `credited`) are NOT Invoice Management ledger truth; pulled back as `quickbooks_payment_status_reference` via Workflow 11.

**Outputs:** Status History entries; lifecycle observability via `invoice-run.status-changed` and `invoice.status-changed` events.

**Boundary:** Invoice Management owns internal status lifecycle; external statuses stored as REFERENCES only.

### Workflow 13 - Invoice Evidence Recording

**Purpose:** emit Logs & Audit Evidence Records for Invoice / Invoice Line / Invoice Adjustment / Invoice Exception / Vendor Reconciliation / QuickBooks Handoff lifecycle.

**Steps (architectural):**

1. For every Invoice Run creation, Invoice generation, Invoice status transition, Invoice Adjustment creation, Invoice Exception Record creation, Vendor Reconciliation Upload Job creation, Vendor Reconciliation Match Result creation, and QuickBooks Handoff Reference population: emit Evidence Record via existing `service_identity.evidence_emit` discipline.
2. New evidence kinds emitted by Invoice Management:
   - `invoice_run`.
   - `invoice`.
   - `invoice_line`.
   - `invoice_adjustment`.
   - `invoice_exception`.
   - `vendor_reconciliation_upload`.
   - `vendor_reconciliation_match`.
   - `quickbooks_handoff`.
3. For invoice report export files and vendor reconciliation upload files: emit File Tracking Record references per existing PR-B baseline.
4. Logs & Audit indexes Evidence Records per existing PR-A discipline.
5. Logs & Audit applies retention, redaction, legal hold per existing PR-D discipline.
6. CPA / legal / DevOps retention duration review for the new evidence kinds occurs in parallel post-merge.

**Outputs:** Evidence Records emitted; Logs & Audit indexed.

**Boundary:** Invoice Management emits evidence references only; Logs & Audit owns persistence and governance. **No Logs & Audit file is modified by this PR.**

### Workflow 14 - Invoice Regeneration / Supersession / Adjustment

**Purpose:** handle Invoice Run re-runs and source drift after generation.

**Steps (architectural):**

1. **Re-run pattern (locked):** Re-runs MUST NOT duplicate QuickBooks postings. Detection via idempotency key (`invoice_period` + counterparty + `source_order_line_reference`).
2. If a re-run finds an Invoice Line already issued for the same idempotency key AND the prior Invoice is at `synced`: produce an Invoice Adjustment for any delta (Workflow 6), NOT a duplicate Invoice Line.
3. If a re-run is explicitly intended to SUPERSEDE a prior `pending_review` or unapproved Invoice Run (e.g., admin canceled and re-runs): the prior Invoice Run transitions to `invoice_run_status = superseded`; new Invoice Run becomes the current run for the period.
4. Late refunds after a closed period: create later-period Invoice Adjustment per Workflow 6; original Invoice Line is NEVER mutated.
5. Source record drift detected after Invoice generation (e.g., source order line corrected): create Invoice Exception Record at `exception_kind = source_record_drift`; route to Workflow 8 for resolution.

**Outputs:** supersession / Invoice Adjustment instead of duplicate postings.

**Boundary:** **Generated invoice lines MUST NOT mutate when upstream records later change.** Snapshot immutability preserved.

### Workflow 15 - Admin Invoice Report Export

**Purpose:** generate Invoice Report export files.

**Steps (architectural):**

1. Admin (or authorized actor per existing capability) requests export of an Invoice Report.
2. Generate file artifact per existing baseline + future implementation.
3. Populate Invoice Export / File Reference sub-structure with `file_artifact_reference` (Logs & Audit File Tracking Record reference per PR-B).
4. Emit `invoice-management.invoice-report-export.recorded`.
5. Logs & Audit governs file lifecycle and retention per PR-D.

**Outputs:** Invoice Report export file artifact reference; export event emitted.

**Boundary:** Invoice Management owns export REFERENCE; Logs & Audit owns file tracking and retention.

---

### Workflow 16 - Vendor Month-End Reconciliation Upload

**Purpose:** receive and validate vendor's month-end reconciliation report upload.

**Steps (architectural):**

1. Vendor (or admin-on-behalf per Tenant Company act-on-behalf authority) uploads month-end reconciliation file for a specific vendor + period.
2. Validate authority via Tenant Company `check_access`. **Do NOT use `audit_export.*` capabilities.**
3. Create Vendor Reconciliation Upload Job at `reconciliation_upload_status = uploaded`.
4. Persist file artifact reference via Logs & Audit PR-B File Tracking Record discipline.
5. Emit `invoice-management.vendor-reconciliation-upload.received`.
6. Transition to `validating`; validate file structure and rows:
   - Required file headers.
   - File format.
   - Duplicate rows.
   - Missing required identifiers.
   - Invalid order / suborder / order line references.
   - Unknown vendor order numbers.
7. On validation success: transition to `validated`. On validation failure: transition to `failed` (or `review_required` per business policy) and route to Workflow 8.
8. Emit `invoice-management.vendor-reconciliation-upload.status-changed` for each transition with `reconciliation_upload_status` discriminator.
9. **Locked invariant:** Upload rows are READ-ONLY representations of vendor-reported values; upload MUST NEVER mutate Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, Integration Management, or QuickBooks records.

**Outputs:** Vendor Reconciliation Upload Job with Upload Rows.

**Boundary:** **The vendor reconciliation upload file is comparison evidence, not source truth by default; source-owned order, delivery, and refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.**

### Workflow 17 - Vendor Reconciliation Matching / Exception Generation

**Purpose:** match vendor-reported rows against CIXCI source records and produce match results / exceptions.

**Steps (architectural):**

1. Transition Vendor Reconciliation Upload Job to `reconciliation_upload_status = matching`.
2. For each Vendor Reconciliation Upload Row, query CIXCI source records (Order Routing + Fulfillment-Returns + Pricing) to find the matching CIXCI source line.
3. Compare vendor-reported values against CIXCI source values across the 19 validation dimensions: SKU; UPC; quantity; delivered status; delivered date; tracking number; return status; refund amount; rejected return reason; presence in vendor file (CIXCI-eligible rows missing from vendor file); presence in CIXCI (rows in vendor file not in CIXCI).
4. Create Vendor Reconciliation Match Result per Upload Row with `match_result_status` discriminator (one of 13 values).
5. For non-`matched` statuses: create Invoice Exception Record at appropriate `exception_kind` (e.g., `vendor_report_mismatch`); route to Workflow 8.
6. **Locked rule:** Vendor-reported values do NOT mutate CIXCI source records. Vendor file is comparison evidence only.
7. **Locked rule:** Vendor-reported delivery does NOT automatically create final invoice eligibility. Vendor-reported refund does NOT automatically reduce invoiceable amount.
8. On matching completion: transition Vendor Reconciliation Upload Job to `reconciled` (no exceptions) OR `reconciled_with_exceptions` OR `review_required`.
9. Emit `invoice-management.vendor-reconciliation-match.completed` (batched / summary acceptable for high-volume runs) with `match_result_status` discriminator.
10. Emit `invoice-management.vendor-reconciliation-upload.status-changed` with the transition discriminator.

**Outputs:** Match Results per row; Invoice Exception Records for mismatches; reconciliation outcome.

**Boundary:** **The vendor reconciliation upload file is comparison evidence, not source truth by default; source-owned order, delivery, and refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.**

### Workflow 18 - Vendor Payable Package Approval-Ready

**Purpose:** determine when a vendor payout statement / payable package is approved-ready.

**Steps (architectural):**

1. Aggregate Invoices for a vendor + billing period with `invoice_type = vendor_statement` or `vendor_payable_package`.
2. Validate prerequisites:
   - All in-scope Invoices at `invoice_status = approved` (per Workflow 9).
   - Vendor Reconciliation Upload Job at `reconciled` or `reconciled_with_exceptions` (all critical exceptions resolved).
   - All blocking Invoice Exception Records resolved.
3. If all prerequisites pass: mark the vendor payable package as approved-ready (data-level signal; UI surface is future UX).
4. **Open business decision:** whether vendor reconciliation is required before every vendor payout (default per scoping: yes for vendor payable package).
5. **Open business decision:** vendor payable package grouping (vendor parent, vendor child / entity, warehouse, or billing profile).
6. Hand off to Workflow 19 (Vendor Payment QuickBooks Handoff).

**Outputs:** vendor payable package marked approved-ready.

**Boundary:** Invoice Management owns the approved-ready determination; downstream QuickBooks handoff per Workflow 19.

### Workflow 19 - Vendor Payment QuickBooks Handoff

**Purpose:** create a QuickBooks handoff request for an approved-ready vendor payable package and pull back QuickBooks-derived payment status as REFERENCE only.

**Steps (architectural):**

1. For each approved-ready vendor payable package (per Workflow 18), create a QuickBooks Handoff Reference with `quickbooks_handoff_object_kind = vendor_payable_package` (or `bill`, depending on QuickBooks-supported accounting object).
2. Invoice Management transitions the parent vendor Invoice to `invoice_status = queued_for_sync`, then `sync_requested`.
3. Invoice Management calls Integration Management to dispatch the QuickBooks API transport. **Integration Management owns the QuickBooks API transport and records the QuickBooks sync outcome.**
4. Integration Management populates `integration_management_dispatch_reference` and (on success) `quickbooks_sync_reference`, `quickbooks_bill_reference` (or equivalent), `quickbooks_vendor_reference`, `quickbooks_last_synced_at` on the QuickBooks Handoff Reference.
5. On success: transition vendor Invoice to `invoice_status = synced`; emit `invoice-management.quickbooks-handoff.reference-recorded` with `quickbooks_handoff_object_kind = vendor_payable_package` (or `bill`).
6. On failure: transition vendor Invoice to `invoice_status = sync_failed`; populate `quickbooks_error_reference`; route to Workflow 8 (Invoice Exception Review).
7. **Locked invariant (no auto-payment):** `CIXCI does not automatically submit vendor payment by default; the billing person reviews and submits payment from QuickBooks unless a future approved auto-payment workflow is explicitly defined with additional controls; QuickBooks-derived payment status is stored in CIXCI only as an external payment status reference, not as CIXCI-owned payment truth.`
8. **Payment status pull-back (REFERENCE ONLY):** when QuickBooks payment status becomes available (`paid`, `partially_paid`, `credited`, etc.), Integration Management reports the status back; Invoice Management updates `quickbooks_payment_status_reference` on the QuickBooks Handoff Reference and emits `invoice-management.quickbooks-handoff.reference-recorded` with `quickbooks_handoff_object_kind = payment_status_update`. The vendor Invoice's `invoice_status` remains in the internal taxonomy; the external payment status is REFERENCE only, NOT CIXCI ledger truth.
9. **Automatic vendor payment execution is FORBIDDEN** in this PR. Future auto-payment workflow with additional controls (per-vendor enablement, per-amount thresholds, dual approval, etc.) is out of scope.

**Outputs:** vendor payable package handoff to QuickBooks; QuickBooks-derived payment status stored as REFERENCE only.

**Boundary:** **Invoice Management owns the handoff REQUEST; Integration Management owns the QuickBooks API transport; QuickBooks owns external ledger / payment / tax state; CIXCI does NOT execute payment.**

---

### Workflow inventory summary

- **PR additive numbered workflows: 19** (Workflows 1-19 above).
- Existing Invoice Management baseline workflows: preserved without modification.
- **Total architectural workflows for this Foundation: 19.**

### Workflows intentionally NOT introduced

- Concrete API endpoint workflows. Future API Governance Foundation PR + Invoice-Management-specific OpenAPI hardening PR.
- Concrete UI workflow for invoice dashboard, run creation, billing period selection, exception review, approval, reconciliation upload, payable package readiness display. Future UX.
- Concrete notification delivery workflow. Future Notification Platform coordination.
- Concrete generation queue / fairness / dedupe / batching algorithm. Implementation.
- Concrete idempotency cache shape / TTL. Implementation.
- Concrete vendor reconciliation file template / required header names. Implementation + business decision.
- Concrete row matching key definition. Implementation.
- Concrete reconciliation mismatch thresholds. Implementation + business decision.
- **Automatic vendor payment execution workflow. FORBIDDEN by default; future PR with additional controls.**
- Tax calculation workflow. Deferred or QuickBooks / CPA-owned.
- Settlement / payout automation workflow. Future Settlement / Payout module.
- Deep reconciliation ownership workflow (e.g., 3-way / 4-way reconciliation). Future phase.
- AI-Agent-initiated invoice / reconciliation workflow. Future PR.

### Workflow boundary discipline (this Foundation)

- All 19 workflows are owned by Invoice Management.
- All 19 workflows respect Tenant Company `check_access` as the canonical authority surface.
- All 19 workflows respect Logs & Audit as the owner of evidence persistence.
- All 19 workflows respect Notification Platform as the owner of delivery; Invoice Management emits notification intent only.
- All 19 workflows respect Analytics as the owner of BI; invoice operational records are NOT BI dashboards.
- All 19 workflows respect Integration Management as the owner of QuickBooks transport; Invoice Management owns the handoff REQUEST.
- All 19 workflows respect QuickBooks (external) as the owner of external ledger / payment / tax / accounting state.
- All 19 workflows respect Order Routing, Fulfillment / Returns, Pricing, Product Catalog as the owners of their respective source truths.
- No workflow mutates Order Routing / Fulfillment-Returns / Pricing / Product Catalog / Tenant Company / Logs & Audit / Integration Management / QuickBooks records.
- No workflow uses `audit_export.*` capabilities.
- No workflow creates cross-counterparty invoice / reconciliation state.
- No workflow auto-executes vendor payment.
- No workflow mutates previously issued Invoice Lines (corrections produce Invoice Adjustments).

### Cleanup wording reaffirmed

`Invoice Management owns invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff references, invoice evidence references, and invoice operational workflow; Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, and Integration Management each retain their existing source-of-truth boundaries; QuickBooks remains the external accounting system of record once an invoice, bill, or vendor payable package is created or synced there.`

`The vendor reconciliation upload file is comparison evidence, not source truth by default; source-owned order, delivery, and refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.`

`CIXCI does not automatically submit vendor payment by default; the billing person reviews and submits payment from QuickBooks unless a future approved auto-payment workflow is explicitly defined with additional controls; QuickBooks-derived payment status is stored in CIXCI only as an external payment status reference, not as CIXCI-owned payment truth.`
