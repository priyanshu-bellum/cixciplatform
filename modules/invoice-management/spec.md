# Invoice Management Specification

This document is proposal-level architecture. It preserves ADR-0011 boundaries while aligning Invoice Management with the hardened Pricing, Product Catalog, Order Routing, Fulfillment/Returns, Procurement, Integration Management, Logs & Audit, Notification, Tenant Company, Analytics, and import/export governance docs.

## Purpose

Invoice Management owns invoice records, invoice lines, invoice eligibility evaluation, invoice preview, invoice finalization, invoice regeneration/supersession, invoice reports and exports, assigned invoice adjustment lifecycle, reconciliation detection/review, accounting sync request state, invoice access views, invoice status, invoice history, and invoice events.

Invoice Management consumes source-owned evidence. It validates evidence presence, freshness, bindability, access scope, source disposition, and invoice eligibility; it does not become the source of upstream truth.

## Scope

### In Scope

- Invoice records and invoice lines.
- Invoice eligibility evidence evaluation.
- Source evidence version/disposition capture for invoice immutability.
- Invoice preview, finalization, regeneration, and supersession.
- Online / Direct-to-Consumer invoice evidence.
- Bulk Purchase Order invoice evidence.
- Owned Channel / Kaseory exception invoice placeholders where Pricing provides explicit evidence.
- Buyer Storefront, Marketplace, and Retail POS placeholders where future supported channels provide Pricing evidence.
- Return, refund, credit, and adjustment invoice evidence where assigned to Invoice Management.
- Invoice reports, CSV exports, export batches, export schema versions, expiration/revocation, and supersession.
- Tenant-scoped buyer, vendor, and system admin invoice views.
- Reconciliation upload detection/review placeholders.
- Accounting sync request state, duplicate-posting safeguards for invoice handoff requests, and invoice/accounting export references.
- Invoice events and notification/integration hook references.

### Out Of Scope

Invoice Management must not:

- Recalculate Pricing-owned values, including commission, buyer-facing Wholesale Price, PO price, return/refund adjustment price, pricing exceptions, or channel pricing.
- Decide fulfillment delivery, shipment truth, or return operational disposition.
- Treat vendor-provided refund/adjustment values as final invoice financial truth by themselves.
- Execute refunds, credits, payments, settlements, or accounting ledger postings.
- Own QuickBooks/external accounting truth or provider posting execution.
- Own Procurement accepted-price truth or PO lifecycle.
- Mutate Order Routing decisions, routed suborders, or routing snapshots.
- Own Product Catalog source records or buyer-product relationship truth.
- Infer Tenant Company permissions, eligibility, channel scope, or entity hierarchy.
- Deliver notifications or scheduled emails.
- Transport integrations or own external delivery/receipt evidence.
- Own Logs & Audit immutable file, access, import/export, or audit evidence.
- Own Analytics metrics or AI Agent recommendations/action outcomes.

## Evidence Boundary

Invoice Management consumes versioned and dispositioned evidence from:

- Pricing for invoice-bindable snapshots, Pricing Channel, vendor-side and buyer-side commission components, buyer-facing Wholesale Price outputs, override/exception references, owned-channel exceptions, adjustment pricing evidence, PO pricing evidence, redaction/visibility evidence, and pricing rule/version/hash.
- Fulfillment/Returns for shipment line evidence, delivered quantity evidence, return operational evidence, return line disposition evidence, and vendor-provided refund/adjustment evidence.
- Order Routing for routed suborder, routed suborder line, and routing snapshot references.
- Procurement / Purchase Orders for PO, PO line, accepted-price evidence, submitted/accepted/received/completed evidence placeholders, and PO lifecycle references.
- Product Catalog for product references and buyer-product relationship references where applicable.
- Tenant Company for access/scope evidence, role/scope projection, channel/entity scope, and redaction authority.
- Integration Management for external delivery/receipt references and accounting sync transport evidence.
- Logs & Audit for immutable file, download, reconciliation upload, access, and audit evidence references.

For non-Pricing source evidence, bare references are not enough. Invoice Management should preserve source reference id, source module, source record version/hash, source timestamp, freshness/expiration timestamps, source disposition, applied-vs-ignored state, stale/missing/conflicting state, supersession reference, review-required state, and audit reference where applicable. Missing, stale, conflicting, redacted, superseded, ignored, expired, or non-invoice-bindable evidence blocks invoice generation or routes the affected line/report/export/accounting sync request to review.

## Invoice Eligibility Evidence

Invoice Eligibility Evidence is a proposal-level model used to record why a line is eligible, blocked, or review-required. It should be first-class enough to prevent Invoice Management from inventing upstream facts.

Evidence references should include:

- Pricing invoice-bindable snapshot evidence.
- Pricing snapshot id and snapshot version/hash.
- Pricing Channel.
- Vendor-side commission component reference.
- Buyer-side commission component reference.
- Commission basis and rule references from Pricing.
- Pricing rule/version/hash.
- Override/exception references.
- Buyer-specific override reference.
- Owned Channel / Kaseory exception reference where applicable.
- Buyer-facing Wholesale Price visibility/redaction evidence reference.
- Versioned/dispositioned Order Routing routed suborder evidence.
- Versioned/dispositioned Order Routing routed suborder line evidence.
- Versioned/dispositioned routing snapshot evidence.
- Versioned/dispositioned Fulfillment/Returns shipment line evidence.
- Versioned/dispositioned delivered quantity evidence.
- Versioned/dispositioned Fulfillment/Returns return line disposition evidence.
- Versioned/dispositioned vendor-provided refund/adjustment evidence.
- Pricing adjustment pricing evidence reference.
- Versioned/dispositioned Procurement PO evidence.
- Versioned/dispositioned Procurement PO line evidence.
- Versioned/dispositioned Procurement accepted-price evidence.
- Versioned/dispositioned Procurement received/completed evidence where applicable.
- Pricing PO invoice-bindable evidence reference.
- Tenant Company access/scope evidence and version.
- Versioned/dispositioned Product Catalog product/buyer relationship reference where applicable.
- Eligibility status.
- Blocked reason.
- Stale/missing/conflicting evidence state.
- Review-required state.
- Audit reference.

Invoice eligibility is based on source-owned evidence. Invoice Management validates presence, source disposition, and bindability; it does not derive source facts.

## Pricing Snapshot Consumption

Invoice lines consume Pricing evidence. They must preserve enough Pricing-owned fields to support traceability without recalculation:

- Pricing snapshot id.
- Snapshot version/hash.
- Pricing Channel.
- Invoice-bindable status.
- Vendor-side commission component.
- Buyer-side commission component.
- Commission basis and Pricing rule references.
- Buyer-facing Wholesale Price output.
- Pricing visibility/redaction evidence.
- Buyer pricing mode and pricing exception references where applicable.
- Buyer-specific override reference.
- Owned-channel exception reference.
- Adjustment pricing evidence reference for returns/refunds.
- PO pricing invoice-bindable evidence for Procurement.

Invoice line amounts, commission amounts, buyer-facing Wholesale Price, PO price, adjustment price, and exception behavior come from Pricing evidence. Invoice Management must not recalculate them.

## Pricing Channel Split

Invoice handling should be explicit by Pricing Channel:

- Online / Direct-to-Consumer.
- Bulk Purchase Order.
- Owned Channel / Kaseory placeholder.
- Buyer Storefront placeholder.
- Marketplace placeholder.
- Retail POS placeholder.

Online/DTC invoice logic consumes Online/DTC invoice-bindable Pricing snapshot evidence. Bulk PO invoice logic consumes Procurement evidence plus Pricing PO invoice-bindable evidence. Owned-channel or exception pricing must be explicitly evidenced by Pricing and must not be hard-coded in Invoice Management.

## Online Order Invoice Eligibility

Online order invoice eligibility depends on Fulfillment/Returns delivered evidence at shipment-line/order-line level.

Rules:

- Delivered quantity evidence comes from Fulfillment/Returns Shipment Line Evidence.
- Shipment line and delivered quantity evidence must carry source version/disposition controls.
- Order Routing routed suborder and line references provide routing context; they do not prove delivery.
- Shipment status, carrier, tracking number, tracking URL, or shipped date alone is not invoice-eligible.
- Partial delivered quantities must be represented through line-level evidence.
- Missing, stale, duplicate, out-of-order, ignored, superseded, or conflicting shipment line evidence blocks invoice generation or routes the line to review.

## Return / Refund / Adjustment Evidence

Invoice Management consumes Fulfillment/Returns return operational evidence and return line disposition evidence. Vendor-provided Return Refunded Amount is refund/adjustment evidence, not final financial truth by itself.

Rules:

- Vendor-provided refund/adjustment evidence must carry source version/disposition controls.
- Invoice Management consumes Pricing adjustment pricing evidence and original transaction Pricing snapshot references.
- Invoice adjustment amounts should come from Pricing adjustment pricing evidence plus Invoice-owned adjustment lifecycle/rules/disposition where assigned.
- Invoice Management may compare vendor-provided refund/adjustment evidence against Pricing adjustment evidence and invoice rules, then block or route to review if inconsistent.
- Invoice Management owns invoice adjustment lifecycle where assigned.
- Fulfillment/Returns does not approve refunds or own financial finality.
- Pricing does not approve refunds or own invoice adjustment application.
- Partial returns and partial refund/adjustment evidence must be line-level.
- Missing or stale return/adjustment evidence blocks invoice adjustment or routes to review.
- Broad `Return Refunded` language should be avoided unless clearly framed as external evidence, not final source truth.

## Bulk PO Invoice Alignment

Bulk PO invoice eligibility is separate from Online/DTC delivered-order invoice eligibility.

Bulk PO evidence should include:

- Versioned/dispositioned Procurement PO evidence.
- Versioned/dispositioned Procurement PO line evidence.
- Versioned/dispositioned Procurement accepted-price evidence.
- Versioned/dispositioned Procurement submitted/accepted/received/completed evidence where applicable.
- Pricing PO invoice-bindable snapshot/evidence.
- Pricing Channel = Bulk Purchase Order.
- Accepted-price variance reference from Pricing/Procurement evidence where applicable.
- Invoiceable PO quantity.
- Review-required state.

Invoice Management must not recalculate accepted PO price or interpret Procurement accepted-price variance. PO invoice amounts must match Pricing PO invoice-bindable evidence and Procurement accepted/submitted/received evidence where applicable.

## Invoice Report And CSV Export Governance

Invoice exports should align with `architecture/standards/import-export-validation-governance.md`.

Invoice export records should include:

- Invoice export batch/reference.
- Invoice export schema version.
- Generated by actor/service.
- Generated at timestamp.
- Invoice period/date-basis.
- Source evidence basis.
- Tenant Company access scope/version.
- Redaction class/version.
- File/download reference.
- Expiration/revocation state.
- Supersession reference.
- Logs & Audit evidence reference.
- Integration delivery reference where exported externally.
- Notification delivery reference where scheduled/emailed.

Invoice exports must not bypass visibility or redaction rules. Invoice report columns should be populated from source evidence and invoice records, not recalculated ad hoc. EST/ET/date-basis behavior must be preserved. Reports must not silently mix order date, delivery date, refund/adjustment date, invoice period, generated date, or PO date without date-basis metadata.

## Reconciliation Upload Governance

Reconciliation uploads should align with `architecture/standards/import-export-validation-governance.md`.

Reconciliation is detection/review only unless a future ADR assigns settlement or payment correction. Invoice Management may record mismatch review state, but it must not mutate source Pricing, Fulfillment/Returns, Procurement, Order Routing, Product Catalog, Integration, accounting, or payment records during reconciliation. Logs & Audit owns file evidence. Integration Management owns external transport evidence where applicable.

## QuickBooks / Accounting Boundary

Invoice Management owns accounting sync request state, duplicate-posting safeguards for invoice handoff requests, invoice export/reference, and accounting handoff status where assigned.

Accounting sync request evidence should include invoice version/hash, accounting target/system reference, idempotency key, duplicate external reference blocker, provider request fingerprint, external posting reference placeholder, supersession/correction reference, retry attempt reference, duplicate-posting risk flag, applied-vs-ignored state, Integration delivery/receipt evidence reference, review-required state, and audit reference.

Integration Management owns QuickBooks/accounting external delivery/receipt evidence, retries, failures, provider responses, external IDs, and transport state. Invoice Management does not own the external accounting ledger, payment processing, QuickBooks truth, settlement execution, or provider posting execution.

Regenerated or superseded invoices must not silently create duplicate external accounting postings. Retry behavior must preserve idempotency and supersession/correction references. Accounting sync failures should be represented as Integration evidence plus Invoice sync status/review state.

## Tenant Visibility And Redaction

Invoice views, exports, downloads, and sensitive access should preserve:

- Tenant Company scope/version.
- Role/scope projection reference.
- Access decision reference.
- Redaction decision version.
- Buyer/vendor/system admin view type.
- Sensitive invoice access event.
- Recheck-before-display flag.
- Recheck-before-download flag.
- Customer-sensitive field handling.
- Pricing-sensitive field handling.
- Accounting-sensitive field handling.

Buyer, vendor, and system admin invoice views must be separated. Invoice exports and downloads must enforce visibility/redaction before access.

## Events, APIs, And Tests

The module should include proposal-level APIs, events, and tests for:

- Invoice eligibility evidence created.
- Invoice eligibility blocked.
- Invoice source evidence stale/superseded/ignored.
- Invoice line blocked for non-bindable source evidence.
- Pricing snapshot missing/stale/non-invoice-bindable.
- PO invoice-bindability blocked.
- Delivered shipment line evidence missing/stale.
- Return line evidence missing/stale.
- Vendor refund evidence variance detected.
- Invoice adjustment amount blocked.
- Invoice adjustment evidence accepted.
- Adjustment pricing evidence missing/stale.
- Invoice export created.
- Invoice export expired/revoked.
- Sensitive invoice accessed.
- Reconciliation upload received/reviewed.
- Accounting sync requested.
- Accounting sync failed reference recorded.
- Accounting sync duplicate blocked.
- Accounting sync idempotency key reused.
- Accounting sync supersession requested.
- Accounting sync correction reference recorded.
- Invoice regeneration superseded.
- Invoice line blocked for missing evidence.

## Open Decision Areas

- Which date basis is canonical for invoice periods by channel.
- Which PO lifecycle evidence makes a Bulk PO invoice-eligible.
- Which return line dispositions can create invoice adjustment evidence.
- Which invoice adjustment representation is canonical: negative line, adjustment line, separate adjustment invoice, or another model.
- Which accounting sync status values are needed before a future Accounting/Payment context exists.
- Which invoice exports are scheduled, manually generated, or integration-delivered.
- Which source evidence expiration windows are required per module.
- Which accounting target/system duplicate blocker is canonical across providers.

## Invoice Management Foundation Specification

This section specifies the Invoice Management foundation hardening, locking the entity model, status models, eligibility rules, vendor reconciliation upload rules, Pricing / Commission boundary, buyer / vendor invoice separation, QuickBooks handoff boundary, and no-auto-payment default. All existing Invoice Management baseline content is preserved without modification.

### Boundary wording (locked)

`Invoice Management owns invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff references, invoice evidence references, and invoice operational workflow; Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, and Integration Management each retain their existing source-of-truth boundaries; QuickBooks remains the external accounting system of record once an invoice, bill, or vendor payable package is created or synced there.`

### Core vendor file rule (locked verbatim)

`The vendor reconciliation upload file is comparison evidence, not source truth by default; source-owned order, delivery, and refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.`

### Core no-auto-payment rule (locked verbatim)

`CIXCI does not automatically submit vendor payment by default; the billing person reviews and submits payment from QuickBooks unless a future approved auto-payment workflow is explicitly defined with additional controls; QuickBooks-derived payment status is stored in CIXCI only as an external payment status reference, not as CIXCI-owned payment truth.`

### Primary entities (exactly 9)

#### 1. Invoice Run

Top-level operational record for a billing period generation pass. Created by CIXCI System Admin. Tracks collection, validation, generation, exception accumulation, approval, and QuickBooks handoff lifecycle.

#### 2. Invoice Period

Reference / window definition for a billing period (month start, month end, period identifier). May be shared across multiple Invoice Runs (e.g., regeneration / supersession).

#### 3. Invoice Report

Counterparty-scoped grouping of one or more Invoices. Examples: buyer monthly invoice report; vendor monthly statement / payout statement; CIXCI internal commission report; adjustment report. Distinguished by `invoice_view_type`.

#### 4. Invoice

Counterparty-scoped invoice record. `invoice_type` discriminator covers `buyer_invoice`, `vendor_statement`, `vendor_payable_package`, `commission_report`, `adjustment_report`, `internal_admin_invoice_report`. Carries `counterparty_role` (`buyer`, `vendor`, `cixci_internal`) and `billing_profile_reference`.

#### 5. Invoice Line

Per-line invoice entry. Carries Invoice Line Source Reference (sub-structure) snapshotting source order / suborder / order line / fulfillment delivery evidence / refund evidence / pricing snapshot / commission snapshot. Stores snapshot values (`unit_price`, `quantity`, `vendor_wholesale_amount`, `buyer_wholesale_amount`, `buyer_side_commission_amount`, `vendor_side_commission_amount`, `invoiceable_amount`, `refund_adjustment_amount`, `net_amount`) AS EVIDENCE of issued state. Invoice Lines MUST NOT mutate when upstream records later change.

#### 6. Invoice Adjustment

Counterparty-scoped adjustment / refund / correction record linked to a parent Invoice Line. Used for late refunds after a closed invoice period (later-period adjustment) and for approved exception resolution. Carries `adjustment_kind` discriminator.

#### 7. Invoice Exception Record

Operational record for invoice-level review / hold / blocking conditions. Counterparty-scoped or run-scoped. Carries `exception_kind` discriminator (e.g., `missing_quickbooks_mapping`, `missing_commission_snapshot`, `missing_delivery_evidence`, `missing_refund_evidence`, `vendor_report_mismatch`, `parent_company_scope_unresolved`).

#### 8. Vendor Reconciliation Upload Job

Vendor-scoped + period-scoped record for a single vendor month-end reconciliation upload session. Carries `reconciliation_upload_status` discriminator (10 values). Has Vendor Reconciliation Upload Rows (sub-structure). Produces Vendor Reconciliation Match Results.

#### 9. Vendor Reconciliation Match Result

Vendor-scoped per-row match outcome against CIXCI source records. Carries `match_result_status` discriminator (13 values). Linked to the Vendor Reconciliation Upload Job, the affected CIXCI source records (read-only references), and any resulting Invoice Exception Records.

### Sub-structures (exactly 8)

| # | Sub-structure | Parent | Purpose |
|---|---|---|---|
| 1 | Invoice Line Source Reference | Invoice Line | Snapshots source order / suborder / order line, delivery evidence, refund evidence, pricing / commission snapshots. |
| 2 | Invoice Status History | Invoice / Invoice Run | Append-only status transition history. |
| 3 | Invoice Run Result Summary | Invoice Run | Counts by status / exception kind / discriminator value. |
| 4 | Invoice Export / File Reference | Invoice Report | Generated file artifact reference. |
| 5 | Invoice Evidence Reference | Invoice / Invoice Line / Invoice Adjustment | Logs & Audit Evidence Record reference. |
| 6 | QuickBooks Handoff Reference | Invoice / Invoice Report | Aggregates all `quickbooks_*_reference` fields. |
| 7 | Vendor Reconciliation Upload Row | Vendor Reconciliation Upload Job | Per-row vendor-reported entry. |
| 8 | Vendor Reconciliation Evidence Reference | Vendor Reconciliation Upload Job / Match Result / Exception | Logs & Audit Evidence Record reference. |

### Internal Invoice statuses (exactly 14)

`draft`, `generated`, `pending_review`, `approved`, `rejected`, `queued_for_sync`, `sync_requested`, `synced`, `sync_failed`, `adjustment_required`, `superseded`, `voided`, `canceled`, `archived`.

### External / reference-only statuses (NOT Invoice Management ledger truth)

`sent`, `paid`, `partially_paid`, `credited`, QuickBooks ledger / payment / tax states. Pulled back as `quickbooks_payment_status_reference` and related fields.

### Invoice Run statuses (exactly 15)

`requested`, `collecting_sources`, `validating_reconciliation`, `generating`, `generated`, `completed_with_exceptions`, `pending_review`, `approved`, `queued_for_sync`, `sync_requested`, `synced`, `sync_failed`, `canceled`, `superseded`, `archived`.

Run status semantics (locked):

- `generated` = run completed generation WITHOUT blocking exceptions.
- `completed_with_exceptions` = run completed generation BUT has exceptions / holds / review items.
- `pending_review` = admin review state after generated output or exceptions.
- `sync_failed` = QuickBooks / handoff sync failure, NOT source collection failure.

### Vendor reconciliation upload statuses (exactly 10)

`uploaded`, `validating`, `validated`, `matching`, `reconciled`, `reconciled_with_exceptions`, `failed`, `review_required`, `superseded`, `canceled`.

### Match result statuses (exactly 13)

`matched`, `missing_in_vendor_file`, `missing_in_cixci`, `duplicate_in_vendor_file`, `status_mismatch`, `amount_mismatch`, `quantity_mismatch`, `sku_upc_mismatch`, `tracking_mismatch`, `date_mismatch`, `refund_mismatch`, `rejected_reason_mismatch`, `review_required`.

### Invoice eligibility rules (locked)

1. **Delivered order lines are invoice-eligible only with Fulfillment / Returns delivery evidence.**
2. Shipment / tracking status alone is NOT enough.
3. Vendor-reported delivered status MAY validate, challenge, or supplement review, but does NOT automatically create final invoice eligibility by default.
4. **Return Refunded outcomes create adjustment / refund eligibility only when source refund evidence AND Pricing adjustment evidence exist.**
5. Vendor-reported refund status MAY create an adjustment CANDIDATE or exception, but does NOT automatically reduce invoiceable amount without CIXCI source evidence or approved exception resolution.
6. Return Rejected MAY be reportable but MUST NOT reduce invoiceable amount by default.
7. Canceled, failed, pending, unfulfilled, undelivered, returned-not-refunded, or rejected-without-refund orders MUST NOT create final invoice lines.
8. **Split orders and multi-vendor orders MUST invoice at line / suborder / vendor scope.**
9. **Late refunds after a closed invoice period MUST create a later-period Invoice Adjustment** referencing the original Invoice Line.
10. **Previously issued invoice lines MUST NOT be mutated.**
11. Source records MUST be snapshotted by reference / version on every Invoice Line.
12. **Generated invoice lines MUST NOT mutate when upstream records later change.**
13. Invoice generation MUST be idempotent by (`invoice_period` + counterparty + `source_order_line_reference`) or equivalent.
14. **Re-runs MUST create supersession / Invoice Adjustment behavior, not duplicate QuickBooks postings.**

### Vendor Month-End Reconciliation Upload rules (locked)

1. Vendor runs month-end report from their internal system.
2. Vendor uploads the report to CIXCI.
3. Invoice Management creates a Vendor Reconciliation Upload Job.
4. System validates file structure and rows (headers, format, required identifiers, duplicates).
5. System compares vendor rows against CIXCI source records (Order Routing + Fulfillment-Returns + Pricing).
6. System produces match results and exceptions per row.
7. Clean reconciliation MAY allow invoice approval / vendor payable package readiness.
8. Exceptions hold invoice approval or route to review.
9. **Vendor file is comparison evidence, NOT source truth by default.**
10. **Source-owned order / delivery / refund facts remain source-owned.**
11. Reconciliation evidence links to Invoice Run, Invoice Lines, Invoice Adjustments, and Invoice Exception Records.
12. **Upload rows MUST NEVER mutate Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, Integration Management, or QuickBooks records.**

### Vendor reconciliation validation coverage (19 dimensions)

Required file headers; file format; duplicate rows; missing required identifiers; invalid order references; invalid suborder references; invalid order line references; unknown vendor order numbers; SKU mismatches; UPC mismatches; quantity mismatches; delivered status mismatches; delivered date mismatches; tracking number mismatches where applicable; return status mismatches; refund amount mismatches; rejected return reason mismatches; rows in vendor file that do not exist in CIXCI; CIXCI invoice-eligible rows missing from vendor file.

### Vendor reconciliation output classes

Reconciled rows; unmatched vendor rows; missing vendor rows; status mismatch exceptions; amount mismatch exceptions; duplicate row exceptions; source evidence conflict exceptions; invoice hold / review-required state where needed.

### Pricing / Commission boundary

- **Pricing owns commercial calculation and commission interpretation.**
- **Invoice Management consumes `pricing_snapshot_reference` and `commission_snapshot_reference`.**
- Invoice Management MAY store snapshot values used for issued invoice evidence, but MUST NOT recalculate Pricing-owned truth.
- Invoice line snapshot values storable as evidence: `unit_price`, `quantity`, `vendor_wholesale_amount`, `buyer_wholesale_amount`, `buyer_side_commission_amount`, `vendor_side_commission_amount` (where applicable), `invoiceable_amount`, `refund_adjustment_amount`, `net_amount`, `pricing_snapshot_reference`, `commission_snapshot_reference`.
- **Tax remains deferred or QuickBooks / CPA-owned** unless a future accounting / tax decision assigns it to CIXCI.

### Buyer / Vendor Invoice separation

Discriminator-based; NO separate entity families.

- `invoice_type`: `buyer_invoice`, `vendor_statement`, `vendor_payable_package`, `commission_report`, `adjustment_report`, `internal_admin_invoice_report`.
- `counterparty_role`: `buyer`, `vendor`, `cixci_internal`.
- `invoice_view_type`: operational view discriminator.
- `billing_profile_reference`: per-billing-profile grouping.

### Vendor Payable Package / QuickBooks Handoff boundary

1. When vendor reconciliation passes for a billing period AND all invoice exceptions are cleared, Invoice Management MAY mark the vendor payout statement or vendor payable package as approved-ready.
2. Invoice Management creates a QuickBooks handoff REQUEST.
3. **Integration Management owns the QuickBooks API transport and records the QuickBooks sync outcome.**
4. QuickBooks SHOULD receive the approved vendor payable package as a bill, vendor payment-ready record, or equivalent QuickBooks-supported accounting object.
5. **QuickBooks remains the external accounting system of record.**
6. **CIXCI MUST NOT automatically submit vendor payment by default.**
7. The billing person reviews and submits payment FROM QuickBooks unless a future approved auto-payment workflow is explicitly defined with additional controls.
8. **Payment status returned from QuickBooks MUST be stored in CIXCI only as `quickbooks_payment_status_reference`** (external reference), NOT as CIXCI-owned payment truth.

Invoice Management stores REFERENCES (not truth):

`quickbooks_customer_reference`, `quickbooks_vendor_reference`, `quickbooks_invoice_reference`, `quickbooks_bill_reference`, `quickbooks_sync_reference`, `quickbooks_last_synced_at`, `quickbooks_error_reference`, `quickbooks_payment_status_reference`.

### What this specification intentionally does NOT prescribe

- Concrete HTTP routes, request / response payload schemas, pagination cursors, authentication headers, error code catalogs.
- Concrete numeric retention / throttle / freshness window / reconciliation mismatch thresholds.
- Concrete recalculation / generation queue technology, persistence shape, fairness algorithm.
- Concrete idempotency cache shape, TTL, retry queue persistence.
- Concrete UI / UX surfaces.
- Concrete notification template / recipient resolution / delivery surface.
- Concrete vendor reconciliation file template / required header names.
- Concrete row matching key definition.
- Concrete tax calculation logic.
- Concrete settlement / payout automation.
- Automatic vendor payment execution.
- Separate Buyer Invoice / Vendor Invoice / CIXCI Commission Invoice entity families.
- Rename, removal, or rewrite of any existing baseline content.
- Modifications to `modules/invoice-management/openapi-contracts.md`.
- Modifications to any adjacent module file.
- Mutation of vendor-owned reconciliation file as source truth.
- Mutation of Order Routing / Fulfillment-Returns / Pricing / Product Catalog / Tenant Company / Logs & Audit / Integration Management / QuickBooks records.
