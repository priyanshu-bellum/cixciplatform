# Invoice Management Assumptions And Open Questions

This document is proposal-level architecture. It records unresolved decisions without assigning ownership outside ADR-0011.

## Assumptions

- Invoice Management consumes source-owned evidence rather than recalculating upstream values.
- Non-Pricing source evidence should be versioned/dispositioned enough to prove which source state made an invoice line eligible.
- Pricing owns invoice-bindable snapshots, commission components, buyer-facing Wholesale Price outputs, PO pricing, adjustment pricing, exceptions, overrides, channel rules, and commercial interpretation.
- Fulfillment/Returns owns delivered shipment line evidence, return operational evidence, return line disposition evidence, and vendor-provided refund/adjustment evidence.
- Procurement owns PO lifecycle, PO line workflow, and accepted-price evidence.
- Order Routing owns routed suborders, routed suborder lines, and routing snapshots.
- Product Catalog owns product and buyer-product relationship source facts.
- Tenant Company owns access/scope, roles, permissions, channel eligibility, and entity scope.
- Logs & Audit owns immutable file/download/audit evidence.
- Integration Management owns external delivery/receipt evidence, including QuickBooks/accounting transport.
- Notification Platform Service owns scheduled email and notification delivery.
- Invoice exports and reconciliation uploads align with `architecture/standards/import-export-validation-governance.md`.

## Open Questions

- Which invoice-period date basis is canonical by invoice type/channel?
- Which Online/DTC delivered evidence state is sufficient for invoice eligibility?
- Which source evidence version/hash and disposition fields are mandatory for each source module?
- Which source evidence expiration windows are required for Fulfillment/Returns, Procurement, Order Routing, Product Catalog, and Tenant Company evidence?
- Which PO lifecycle evidence makes a Bulk PO invoice-eligible: submitted, accepted, received, completed, or another source disposition?
- Which return line disposition states can create invoice adjustment evidence?
- Which invoice adjustment rule/disposition reference determines whether Pricing adjustment evidence can be applied?
- Which vendor refund evidence variance thresholds require review?
- Which financial disposition statuses belong to Invoice Management before a Payment or Accounting context exists?
- Should invoice adjustments be represented as negative lines, adjustment lines, separate adjustment invoices, or another model?
- Which redaction classes are required for customer-sensitive, pricing-sensitive, commission-sensitive, accounting-sensitive, and tenant-sensitive invoice fields?
- Which invoice exports are eligible for scheduled email delivery through Notification Platform Service?
- Which invoice exports are eligible for external delivery through Integration Management?
- Which reconciliation mismatches require system admin review?
- Which accounting sync failures block invoice finalization versus create a follow-up review state?
- Which accounting target/system duplicate blocker is canonical across QuickBooks and future providers?
- Which provider request fingerprint fields are safe to persist?
- How should regenerated/superseded invoices create accounting supersession or correction references without duplicate postings?
- Which sensitive invoice access events must be emitted to Logs & Audit?
- Which AI Agent Services signals may consume invoice evidence, and what action contracts are required before AI can draft review actions?

## Scale And Governance Placeholders

- Invoice generation idempotency keys.
- Source evidence control reference indexing.
- Invoice line count and export row count limits.
- Large invoice review threshold.
- Export expiration/revocation controls.
- Reconciliation upload row/size caps.
- Accounting sync retry budget and duplicate external ID controls.
- Accounting sync idempotency key retention.
- Accounting sync provider request fingerprint retention.
- Tenant/date/channel partitioning.
- Stale evidence warning controls.
- Regeneration/supersession limits.
- Sensitive access monitoring.

## Decisions Needed Later

- Final invoice number format.
- Tax handling ownership.
- Payment processing ownership.
- Accounting ledger ownership.
- QuickBooks field mapping.
- Invoice export retention.
- Reconciliation settlement/correction ownership.
- Canonical invoice adjustment representation.

## Invoice Management Foundation Assumptions and Open Questions

This section adds assumptions and open questions for the Invoice Management foundation hardening. All existing Invoice Management baseline assumptions and open questions are preserved without modification.

### Open question classes

- **BP** Business / Product decision
- **IM** Implementation detail
- **FP** Future Phase
- **EB** Estimate Blocker
- **CU** Cleanup-only

This PR retains 33 open questions: 12 BP, 11 IM, 9 FP, 0 EB, 1 CU. **Zero estimate-blockers.** PR is unblocked for review and merge.

---

### Locked assumptions (this PR)

- Invoice Management owns invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff references, invoice evidence references, and invoice operational workflow.
- Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, and Integration Management each retain their existing source-of-truth boundaries.
- QuickBooks remains the external accounting system of record once an invoice, bill, or vendor payable package is created or synced there.
- Exactly 9 primary entities + 8 sub-structures + 24 reference fields locked.
- 14 internal Invoice statuses + 15 Invoice Run statuses + 10 Vendor Reconciliation Upload statuses + 13 Match Result statuses locked.
- External / reference-only statuses (`sent`, `paid`, `partially_paid`, `credited`, QuickBooks ledger / payment / tax states) pulled back as REFERENCES, NOT as Invoice Management ledger truth.
- 11 events introduced (8 base + 3 vendor reconciliation), discriminator-based, no event explosion.
- 19 architectural workflows introduced.
- Delivered eligibility REQUIRES Fulfillment / Returns delivery evidence; shipment / tracking alone is NOT enough.
- Vendor-reported delivery does NOT automatically create invoice eligibility.
- Refund adjustment eligibility REQUIRES source refund evidence AND Pricing adjustment evidence.
- Vendor-reported refund does NOT automatically reduce invoiceable amount.
- Late refunds create later-period Invoice Adjustments; previously issued Invoice Lines NEVER mutated.
- Invoice generation idempotent by (`invoice_period` + counterparty + `source_order_line_reference`).
- Re-runs produce supersession / Invoice Adjustment behavior, NOT duplicate QuickBooks postings.
- Vendor reconciliation file is comparison evidence, NOT source truth by default.
- Vendor Reconciliation Upload Rows MUST NEVER mutate adjacent module records.
- Pricing owns calculation and commission interpretation; Invoice Management stores snapshot values as evidence only.
- Tax remains deferred or QuickBooks / CPA-owned.
- Buyer / Vendor / CIXCI Commission invoices use `invoice_type` discriminator (NOT separate entity families).
- QuickBooks transport owned by Integration Management; QuickBooks owns external ledger.
- CIXCI does NOT automatically submit vendor payment by default; billing person submits from QuickBooks.
- Automatic vendor payment execution FORBIDDEN this PR.
- QuickBooks-derived payment status stored only as `quickbooks_payment_status_reference`.
- No new Tenant Company capabilities; `audit_export.*` NOT used.
- No new Logs & Audit entities; 8 new evidence kinds emitted via existing `service_identity.evidence_emit`.
- No event explosion (11 events total via discriminators).
- Cross-counterparty reads / mutations architecturally impossible.
- `modules/invoice-management/openapi-contracts.md` UNCHANGED.
- API / OpenAPI deferred to future API Governance Foundation PR.
- Existing Invoice Management baseline + PR #98-#102 + PR #103 + PR #104 + PR #105 preserved by reference.

---

### Business / Product open questions (BP; 12)

#### OQ-BP-1 - Monthly only, or also ad hoc invoice runs?

Default per scoping: monthly. Future ad hoc / on-demand runs require business decision. Class: BP.

#### OQ-BP-2 - Buyers only, vendors only, or both?

Default per scoping: both. `invoice_type` discriminator supports buyer invoices, vendor statements, vendor payable packages, CIXCI commission reports, adjustment reports, internal admin invoice reports. Class: BP.

#### OQ-BP-3 - Are vendor payouts / bills handled in this module?

Default per scoping: yes (vendor payable package + QuickBooks handoff as bill / vendor payment-ready record). Class: BP.

#### OQ-BP-4 - Is vendor-side commission active by default or exception-only?

Default per scoping: open. Architectural support is locked (`vendor_side_commission_amount` snapshot value; nullable); business decision per vendor or per agreement. Class: BP.

#### OQ-BP-5 - How are late refunds handled after QuickBooks sync?

Default per scoping: later-period Invoice Adjustment with `adjustment_kind = late_refund`; previously issued Invoice Lines NEVER mutated; QuickBooks handoff for the Adjustment as a separate bill / credit / equivalent. Approval path: CIXCI System Admin. Concrete approval gate per business policy. Class: BP.

#### OQ-BP-6 - Who approves invoices before sync?

Default per scoping: CIXCI System Admin. Concrete role assignment (e.g., billing person vs general admin) per business decision. Whether partial Invoice Run approval is allowed: open. Class: BP.

#### OQ-BP-7 - Parent company, child entity, or billing profile grouping?

Default per scoping: support all three via `company_scope_reference` + `billing_profile_reference`; specific grouping selection per business decision per counterparty type. Class: BP.

#### OQ-BP-8 - Is vendor reconciliation required before every vendor payout?

Default per scoping: yes for vendor payable package (Workflow 18 prerequisite). Concrete exception cases (e.g., vendors without internal systems) per business decision. Class: BP.

#### OQ-BP-9 - Can vendor reconciliation evidence ever override source records after approval?

Default per scoping: NO; vendor file is comparison evidence, not source truth. Future business decision MAY allow vendor reconciliation evidence to be ACCEPTED as delivery / refund evidence after explicit manual review (NOT automatic override). Class: BP.

#### OQ-BP-10 - Who can approve reconciliation exceptions?

Default per scoping: CIXCI System Admin. Vendor-side actor approval via admin-on-behalf authority per existing PR #103 baseline. Class: BP.

#### OQ-BP-11 - Should vendor payment be manually submitted in QuickBooks by default?

Default per scoping: YES (locked). Billing person reviews and submits payment from QuickBooks. Locked invariant in `spec.md`, `boundary-contracts.md`, `workflows.md` (Workflow 19). Class: BP.

#### OQ-BP-12 - Should CIXCI ever support auto-payment later (with additional controls)?

Default per scoping: open; would require future PR with explicit additional controls (per-vendor enablement, per-amount thresholds, dual approval). NOT in this PR. Class: BP.

---

### Implementation open questions (IM; 11)

#### OQ-IM-1 - Exact status taxonomy

14 internal Invoice statuses + 15 Invoice Run statuses + 10 Reconciliation Upload statuses + 13 Match Result statuses LOCKED in this PR. Implementation owns transition guards, retry semantics, archival cadence. Class: IM.

#### OQ-IM-2 - Exact QuickBooks mapping fields

`quickbooks_customer_reference`, `quickbooks_vendor_reference`, `quickbooks_invoice_reference`, `quickbooks_bill_reference`, `quickbooks_sync_reference`, `quickbooks_last_synced_at`, `quickbooks_error_reference`, `quickbooks_payment_status_reference` locked architecturally. Concrete QuickBooks-side field mapping is implementation + Integration Management work. Class: IM.

#### OQ-IM-3 - Invoice numbering rules

Format, sequencing, scoping per counterparty / billing profile / period: implementation. Architectural requirement: uniqueness within scope; supersession-aware. Class: IM.

#### OQ-IM-4 - Date basis by channel

Delivered date vs invoice period vs refund date: per business policy (OQ-BP-5) and implementation. Default architectural assumption: delivered date drives Invoice Line period assignment unless overridden. Class: IM.

#### OQ-IM-5 - Re-run / idempotency behavior

Architectural pattern LOCKED: idempotent by (`invoice_period` + counterparty + `source_order_line_reference`); supersession / Invoice Adjustment, NOT duplicate Invoice Lines. Concrete idempotency cache shape, TTL, retry behavior: implementation. Class: IM.

#### OQ-IM-6 - Source evidence freshness windows

How recent must Fulfillment / Returns delivery / refund evidence be to qualify as source-owned evidence: implementation + business decision. Class: IM.

#### OQ-IM-7 - Vendor reconciliation file template

Concrete file format (CSV, XLSX, etc.), encoding, version: implementation + business decision. Class: IM.

#### OQ-IM-8 - Vendor reconciliation required headers

Concrete header names and required vs optional designation: implementation + business decision. Class: IM.

#### OQ-IM-9 - Row matching keys

Concrete row matching key derivation (e.g., vendor_order_reference + SKU + quantity, or composite): implementation + business decision. Class: IM.

#### OQ-IM-10 - Reconciliation mismatch thresholds

Concrete tolerance thresholds (e.g., +/- 1 cent on refund amount counts as `matched`; >1 cent counts as `amount_mismatch`): implementation + business decision. Class: IM.

#### OQ-IM-11 - Reconciliation duplicate row handling

Default architectural: produce Match Result at `duplicate_in_vendor_file` + Invoice Exception Record. Concrete dedupe vs reject vs first-wins policy: implementation + business decision. Class: IM.

---

### Future Phase open questions (FP; 9)

#### OQ-FP-1 - OpenAPI / routes / payloads

Concrete HTTP routes, request / response payload schemas, pagination, error codes for invoice / reconciliation / handoff surfaces. Future API Governance Foundation PR + Invoice-Management-specific OpenAPI hardening PR. Class: FP.

#### OQ-FP-2 - Runtime generation jobs

Concrete queue technology, fairness algorithm, persistence shape, recalculation cadence. Implementation owns; out of scope here. Class: FP.

#### OQ-FP-3 - Tax calculation

CIXCI does NOT calculate tax in this PR; QuickBooks / CPA-owned. Future business / CPA decision MAY assign tax to CIXCI. Class: FP.

#### OQ-FP-4 - Payment processing

CIXCI does NOT execute payment in this PR; QuickBooks owns. Future Settlement / Payout module may handle payment processing with additional controls. Class: FP.

#### OQ-FP-5 - Settlement / payout automation

NOT introduced this PR. Future Settlement / Payout module + auto-payment workflow with additional controls (per-vendor enablement, per-amount thresholds, dual approval, etc.). Class: FP.

#### OQ-FP-6 - Deep reconciliation ownership

3-way / 4-way reconciliation (CIXCI + vendor file + carrier + QuickBooks): out of scope this PR. Future phase. Class: FP.

#### OQ-FP-7 - UX / UI design

Concrete UI for CIXCI System Admin invoice dashboard, monthly invoice run creation, billing period selection, vendor reconciliation upload, reconciliation exception queue, buyer / vendor invoice grouping, invoice exception queue, missing-X warnings, vendor report mismatch warning, invoice review and approval, vendor payable package approval-ready state, QuickBooks sync status, QuickBooks bill / payment-ready reference, invoice history, drill-downs, export invoice report, audit / evidence links. Future UX / UI work. Class: FP.

#### OQ-FP-8 - Notification delivery

Concrete notification template / recipient resolution / delivery surface for invoice-approved / sync-failed / reconciliation-completed events. Future Notification Platform coordination. Class: FP.

#### OQ-FP-9 - Automatic payment execution

FORBIDDEN by locked default this PR. Future PR with explicit additional controls (per-vendor enablement, per-amount thresholds, dual approval) would be required. Class: FP.

---

### Estimate Blocker open questions (EB; 0)

**None.** This PR is unblocked at scoping level. Codex can review and apply the bundle directly after bundle review.

---

### Cleanup-only open questions (CU; 1)

#### OQ-CU-1 - Route-looking language in `api-contracts.md`

Route-looking examples (`POST /invoice-management/invoices/preview`, `POST /invoice-management/accounting-sync-requests`) reframed as non-final conceptual architecture surfaces ("Invoice Preview surface (architectural shape; not a final route)" and "QuickBooks Handoff Request surface (architectural shape; not a final route; Integration Management owns the QuickBooks API transport)") by the api-contracts.md append-block in this PR. Cleanup; not new content. Class: CU.

---

### Summary of open question counts

| Class | Count |
|---|---|
| BP (Business / Product decision) | 12 |
| IM (Implementation detail) | 11 |
| FP (Future Phase) | 9 |
| EB (Estimate Blocker) | 0 |
| CU (Cleanup-only) | 1 |
| **Total** | **33** |

**Zero estimate-blockers.** PR can be reviewed and applied directly.
