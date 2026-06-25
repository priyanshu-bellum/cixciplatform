# Invoice Management Boundary Contracts

This document is proposal-level architecture. It defines what Invoice Management may answer and what it must consume from other bounded contexts.

## Invoice Management Owns

Invoice Management owns:

- Invoice records.
- Invoice lines.
- Invoice eligibility evaluation.
- Source evidence version/disposition preservation for invoice use.
- Invoice preview, finalization, regeneration, and supersession.
- Invoice reports and exports.
- Invoice adjustment lifecycle where assigned.
- Reconciliation detection/review.
- Accounting sync request state and duplicate-posting safeguards for invoice handoff requests.
- Invoice access views.
- Invoice status and history.
- Invoice events.

## Invoice Management Must Consume

Invoice Management consumes:

- Pricing invoice-bindable snapshots, Pricing Channel, commission components, buyer-facing Wholesale Price outputs, pricing rule/version/hash, override/exception references, buyer-specific overrides, owned-channel exceptions, adjustment pricing evidence, PO invoice-bindable evidence, and redaction/visibility evidence.
- Versioned/dispositioned Fulfillment/Returns shipment line evidence, delivered quantity evidence, return operational evidence, return line disposition evidence, and vendor-provided refund/adjustment evidence.
- Versioned/dispositioned Order Routing routed suborder, routed suborder line, and routing snapshot references.
- Versioned/dispositioned Procurement PO, PO line, accepted-price evidence, and submitted/accepted/received/completed evidence placeholders where applicable.
- Versioned/dispositioned Product Catalog product and buyer-product relationship references where applicable.
- Versioned/dispositioned Tenant Company access/scope evidence, role/scope projection, channel/entity scope, and access decisions.
- Integration Management delivery/receipt references for accounting sync and externally delivered exports.
- Logs & Audit immutable file/download/access/reconciliation/audit evidence references.
- Notification Platform Service delivery references where scheduled/emailed exports or invoice notifications are configured.

## Source Evidence Boundary

Bare source references are not enough for invoice immutability. For non-Pricing evidence, Invoice Management should preserve source reference id, source module, source record version/hash, source timestamp, source freshness/expiration timestamps, source disposition, applied-vs-ignored state, stale/missing/conflicting state, supersession reference, review-required state, and audit reference.

Invoice Management validates source evidence bindability and disposition for invoice use. It does not mutate upstream records.

## Must Not Answer

Invoice Management must not answer:

- What is the calculated commission?
- What is the buyer-facing Wholesale Price?
- What is the accepted PO price truth?
- What PO accepted-price variance means commercially?
- Whether fulfillment was delivered without Fulfillment/Returns delivered line evidence.
- Whether a return was operationally accepted/rejected without Fulfillment/Returns return line disposition evidence.
- Whether vendor-provided refund amount is final invoice financial truth without Pricing adjustment evidence and Invoice-owned adjustment disposition.
- Whether a refund, credit, payment, settlement, or ledger posting should execute outside assigned invoice adjustment lifecycle.
- Whether Tenant Company scope, channel eligibility, or role authority exists without Tenant Company evidence.
- Whether an integration delivery succeeded without Integration Management evidence.
- Whether notification delivery succeeded without Notification Platform Service evidence.
- Whether immutable file/download/audit evidence exists without Logs & Audit evidence.

## Pricing Boundary

Use: "Invoice Management consumes Pricing snapshot commission fields."

Avoid: "Invoice calculates commission."

Pricing owns calculation, validation, commercial interpretation, pricing rules, Pricing Channel behavior, buyer-facing Wholesale Price, commission components, PO pricing, adjustment pricing, exceptions, overrides, and bindability.

## Fulfillment / Returns Boundary

Use: "Invoice Management consumes delivered shipment line evidence."

Avoid: "Invoice uses Delivered status" when that implies broad shipment state is enough.

Fulfillment/Returns owns operational fulfillment evidence, shipment line evidence, delivered quantity evidence, return operational disposition, return line disposition evidence, and vendor-provided refund/adjustment evidence. Vendor-provided refund/adjustment values are evidence only. Invoice Management owns invoice eligibility and assigned invoice adjustment lifecycle.

## Procurement Boundary

Procurement owns PO lifecycle, PO line workflow, accepted-price evidence, and accepted/submitted/received/completed evidence placeholders. Invoice Management consumes PO evidence and Pricing PO invoice-bindable evidence. It must not recalculate accepted PO price or interpret Procurement accepted-price variance.

## Order Routing Boundary

Order Routing owns routing decisions, routed suborders, routed suborder lines, routing snapshots, export eligibility, and fulfillment handoff requests. Invoice Management consumes routing references for context only. Routing context does not prove delivery or invoice eligibility.

## Product Catalog Boundary

Product Catalog owns product records and buyer-product relationship state where applicable. Invoice Management may reference Product Catalog product/buyer relationship evidence for invoice context but does not own catalog truth.

## Tenant Company Boundary

Tenant Company owns buyer/vendor/entity scope, permissions, role/scope projections, channel eligibility, and access decisions. Invoice Management consumes Tenant evidence and enforces redaction/view rules using that evidence.

## Integration / Notification / Logs Boundary

- Integration Management owns external delivery/receipt evidence, provider responses, external IDs, retries, failures, and QuickBooks/accounting transport evidence.
- Notification Platform Service owns notification and scheduled email delivery.
- Logs & Audit owns immutable invoice/export/reconciliation file evidence, sensitive access evidence, download evidence, and audit records.

Invoice Management may store workflow references to these records but does not own their evidence truth.

## Accounting Sync Boundary

Invoice Management owns accounting sync request state, invoice version/hash references, idempotency key, duplicate external reference blocker, provider request fingerprint, supersession/correction reference, retry attempt reference, duplicate-posting risk flag, applied-vs-ignored state, and review state for invoice handoff requests.

Integration Management owns external delivery/receipt/provider evidence. Invoice Management does not own external accounting ledger truth, QuickBooks truth, payment processing, settlement, or provider posting execution.

## Analytics And AI Boundary

Analytics owns reporting definitions and metrics. AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes. Invoice Management may emit events/signals but must not let AI finalize invoices, mutate financial state, or bypass action contracts and permissions.

## Invoice Management Foundation Boundary Contracts

This section reaffirms boundary discipline for the Invoice Management foundation hardening. All existing Invoice Management boundary contracts are preserved by reference without modification. All adjacent module baselines (Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Device Catalog, Tenant Company PR #103, Logs & Audit PR #98-#102, Integration Management, Notification Platform, Analytics, Procurement) are preserved by reference; no adjacent module file is modified.

### Core boundary wording (locked)

`Invoice Management owns invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff references, invoice evidence references, and invoice operational workflow; Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, and Integration Management each retain their existing source-of-truth boundaries; QuickBooks remains the external accounting system of record once an invoice, bill, or vendor payable package is created or synced there.`

### Core vendor file rule (locked verbatim)

`The vendor reconciliation upload file is comparison evidence, not source truth by default; source-owned order, delivery, and refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.`

### Core no-auto-payment rule (locked verbatim)

`CIXCI does not automatically submit vendor payment by default; the billing person reviews and submits payment from QuickBooks unless a future approved auto-payment workflow is explicitly defined with additional controls; QuickBooks-derived payment status is stored in CIXCI only as an external payment status reference, not as CIXCI-owned payment truth.`

### Invoice Management owns (under this Foundation)

- Invoice Run (entity).
- Invoice Period (entity).
- Invoice Report (entity).
- Invoice (entity).
- Invoice Line (entity).
- Invoice Adjustment (entity).
- Invoice Exception Record (entity).
- Vendor Reconciliation Upload Job (entity).
- Vendor Reconciliation Match Result (entity).
- Invoice Line Source Reference (sub-structure).
- Invoice Status History (sub-structure).
- Invoice Run Result Summary (sub-structure).
- Invoice Export / File Reference (sub-structure).
- Invoice Evidence Reference (sub-structure).
- QuickBooks Handoff Reference (sub-structure).
- Vendor Reconciliation Upload Row (sub-structure).
- Vendor Reconciliation Evidence Reference (sub-structure).
- The 14 internal Invoice statuses.
- The 15 Invoice Run statuses.
- The 10 Vendor Reconciliation Upload statuses.
- The 13 Match Result statuses.
- Invoice status lifecycle.
- Invoice Run status lifecycle.
- Invoice report generation.
- Invoice line source snapshot references.
- QuickBooks handoff REFERENCES.
- Invoice evidence references.
- Invoice approval / review workflow.
- Invoice export / report references.
- Vendor payout statement / payable package readiness determination.
- The 11 new events.
- The 19 new architectural workflows.
- New evidence kinds emitted via existing `service_identity.evidence_emit`: `invoice_run`, `invoice`, `invoice_line`, `invoice_adjustment`, `invoice_exception`, `vendor_reconciliation_upload`, `vendor_reconciliation_match`, `quickbooks_handoff`.

### Invoice Management does NOT own

- Order truth (Order Routing).
- Suborder / source order line truth (Order Routing).
- Fulfillment / shipping / delivery truth (Fulfillment / Returns).
- Return / refund / rejection / return outcome truth (Fulfillment / Returns).
- Pricing calculation truth (Pricing).
- Commission interpretation truth (Pricing).
- Effective pricing logic (Pricing).
- Product / accessory source truth (Product Catalog).
- Buyer catalog mapping truth (Product Catalog).
- Product Catalog export state (Product Catalog; PR #104).
- Compatibility projection (Product Catalog; PR #105).
- Buyer-scoped Selling / Added state (Product Catalog).
- Company identity, parent / child scope, agreement / capability authority, lifecycle, `check_access` (Tenant Company; PR #103).
- Logs & Audit Evidence Record / File Tracking Record persistence and retention (Logs & Audit; PR #98-#102).
- QuickBooks ledger truth (QuickBooks external).
- QuickBooks transport truth (Integration Management).
- Payment execution truth (QuickBooks external + future Settlement / Payout).
- Tax calculation truth (QuickBooks / CPA deferred).
- Settlement / payout execution truth (future Settlement / Payout).
- Analytics / BI / reporting dashboards / KPIs (Analytics).
- Notification delivery (Notification Platform).
- PO lifecycle (Procurement).

---

### Invoice Management vs Order Routing

- **Order Routing owns** source order / suborder / order line truth.
- **Invoice Management consumes** `source_order_reference`, `source_suborder_reference`, `source_order_line_reference` (snapshotted on Invoice Line).
- Invoice Management does NOT mutate Order Routing records.
- Split orders and multi-vendor orders are sourced at line / suborder / vendor scope.
- Order corrections after invoice generation produce Invoice Adjustments, NOT mutation of issued Invoice Lines.

### Invoice Management vs Fulfillment / Returns

- **Fulfillment / Returns owns** delivery / return / refund / rejection outcome truth.
- **Invoice Management consumes** `fulfillment_delivery_evidence_reference` (REQUIRED for delivered eligibility) and `return_refund_evidence_reference` (REQUIRED for refund adjustment eligibility).
- Invoice Management does NOT mutate Fulfillment / Returns records.
- Shipment / tracking status alone is NOT enough; delivery evidence is REQUIRED.
- Vendor-reported delivery does NOT automatically create final invoice eligibility.
- Vendor-reported refund does NOT automatically reduce invoiceable amount.
- Late refunds produce later-period Invoice Adjustments; previously issued Invoice Lines are NOT mutated.

### Invoice Management vs Pricing

- **Pricing owns** commercial calculation, commission logic, pricing snapshots, exceptions, effective pricing.
- **Invoice Management consumes** `pricing_snapshot_reference` and `commission_snapshot_reference` (REQUIRED on every Invoice Line).
- Invoice Management MAY store snapshot values (`unit_price`, `quantity`, `vendor_wholesale_amount`, `buyer_wholesale_amount`, `buyer_side_commission_amount`, `vendor_side_commission_amount`, `invoiceable_amount`, `refund_adjustment_amount`, `net_amount`) AS EVIDENCE of issued state.
- Invoice Management MUST NOT recalculate Pricing-owned truth.
- Tax is deferred or QuickBooks / CPA-owned; NOT calculated by Invoice Management.

### Invoice Management vs Tenant Company

- **Tenant Company owns** `check_access`, buyer / company / entity capabilities, audit capability families, lifecycle, parent / child scope (PR #103).
- **Invoice Management calls** `check_access` for buyer / vendor / admin / service identity authority per existing baseline.
- Invoice Management respects lifecycle blocking returns.
- Invoice Management respects parent / child scope rules via `company_scope_reference`.
- Invoice Management respects service identity scope / expiration.
- **Critical boundary lock:** Invoice Management MUST NOT use `audit_export.*` (PR #103's compliance audit report export capability family). Existing buyer / company / entity capability set + admin authority + Tenant API integration user authority is sufficient.
- Invoice Management does NOT modify any Tenant Company file.

### Invoice Management vs Logs & Audit

- **Logs & Audit owns** Evidence Record (PR-A), File Tracking Record (PR-B), retention (PR-D), audit access (PR-E).
- **Invoice Management emits** Evidence Record references via existing `service_identity.evidence_emit` discipline. New evidence kinds: `invoice_run`, `invoice`, `invoice_line`, `invoice_adjustment`, `invoice_exception`, `vendor_reconciliation_upload`, `vendor_reconciliation_match`, `quickbooks_handoff`.
- Invoice Management emits File Tracking Record references for generated invoice report exports and vendor reconciliation upload files.
- Logs & Audit indexes and governs.
- Invoice Management does NOT modify any Logs & Audit file.
- Invoice Management does NOT mutate Logs & Audit records.
- CPA / legal / DevOps retention duration review for the new Invoice Management evidence kinds occurs in parallel post-merge (consistent with PR #105 retention review pattern).

### Invoice Management vs Integration Management / QuickBooks

- **Integration Management owns** QuickBooks API transport, provider response, retry, external delivery evidence, failures.
- **QuickBooks (external)** owns external invoice id, bill id, ledger / payment / tax / accounting state after sync.
- **Invoice Management owns** invoice readiness, generation, review, approval, invoice status, vendor payable package readiness, QuickBooks handoff REFERENCE.
- Invoice Management stores QuickBooks-derived state as REFERENCES (`quickbooks_customer_reference`, `quickbooks_vendor_reference`, `quickbooks_invoice_reference`, `quickbooks_bill_reference`, `quickbooks_sync_reference`, `quickbooks_last_synced_at`, `quickbooks_error_reference`, `quickbooks_payment_status_reference`).
- Invoice Management MUST NOT become QuickBooks or the ledger.
- QuickBooks payment status is external REFERENCE only.
- **CIXCI MUST NOT execute payment by default.** Billing person reviews and submits from QuickBooks.
- Invoice Management does NOT modify any Integration Management file.

### Invoice Management vs Product Catalog

- **Product Catalog owns** product / accessory references, buyer catalog mappings, Product Catalog export state (PR #104), compatibility projection (PR #105), buyer-scoped Selling / Added state.
- **Invoice Management consumes** `product_reference` and (where applicable) `variant_reference` as read-only references.
- Compatibility projection / buyer catalog mapping is NOT consumed by Invoice Management.
- Invoice Management does NOT modify any Product Catalog file.

### Invoice Management vs Analytics

- **Analytics owns** BI / reporting / dashboards / KPIs.
- Invoice operational records (Invoice Run, Invoice, Invoice Line, etc.) are operational EVIDENCE, NOT BI dashboards.
- Analytics MAY consume invoice operational records via existing patterns, but this PR does NOT introduce analytics dashboards or BI surfaces.
- Invoice Management does NOT modify any Analytics file.

### Invoice Management vs Procurement

- **Procurement owns** PO lifecycle.
- No direct interaction in this PR; Procurement boundary preserved.
- Invoice Management does NOT modify any Procurement file.

### Invoice Management vs Notification Platform

- **Notification Platform owns** recipient resolution, templates, delivery, retry, suppression, notification history.
- Invoice Management emits notification intent only (future Notification Platform coordination; not concrete delivery in this PR).
- Invoice Management does NOT modify any Notification Platform file.

### Invoice Management vs vendor reconciliation file source

- **The vendor reconciliation upload file is comparison evidence, NOT source truth by default.**
- Source-owned order / delivery / refund facts remain owned by Order Routing, Fulfillment / Returns, and Pricing.
- **Vendor Reconciliation Upload Rows MUST NEVER mutate Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, Integration Management, or QuickBooks records.**
- Vendor-reported values appear in Vendor Reconciliation Match Results with explicit `vendor_reported_value_evidence` and `cixci_source_value_evidence` to make the comparison-evidence boundary explicit.
- Vendor-reported delivery / refund MAY produce adjustment CANDIDATES or exceptions but does NOT automatically create final invoice eligibility or reduce invoiceable amount without CIXCI source evidence or approved exception resolution.

### Forbidden file modifications under this Foundation

- `modules/invoice-management/openapi-contracts.md`.
- All files under `modules/product-catalog/`.
- All files under `modules/device-catalog/`.
- All files under `modules/logs-audit-file-tracking/`.
- All files under `modules/tenant-company-model/`.
- All files under `modules/integration-management/`.
- All files under `modules/pricing/`.
- All files under `modules/order-routing/`.
- All files under `modules/fulfillment-returns/`.
- All files under `modules/procurement-purchase-orders/`.
- All files under `modules/analytics-reporting/`.
- All files under `modules/notification-platform-service/`.
- All other module files.
- All ADRs, platform standards, runtime / code / schema / migration / build / lockfile.
- `modules/README.md`.

### Critical boundary rules summary

- **`Invoice Management owns invoice generation, invoice report records, invoice line records, invoice status, adjustment linkage, vendor reconciliation upload records, QuickBooks handoff references, invoice evidence references, and invoice operational workflow; Order Routing, Fulfillment / Returns, Pricing, Product Catalog, Tenant Company, Logs & Audit, and Integration Management each retain their existing source-of-truth boundaries; QuickBooks remains the external accounting system of record once an invoice, bill, or vendor payable package is created or synced there.`**
- Tenant Company decides authority via `check_access`; Invoice Management calls and consumes.
- Logs & Audit records evidence; Invoice Management emits references via existing `service_identity.evidence_emit`.
- Integration Management dispatches QuickBooks transport; Invoice Management owns the handoff REQUEST.
- Notification Platform owns delivery; Invoice Management emits notification intent only.
- Analytics owns BI; invoice operational records are NOT BI dashboards.
- Counterparty-specific records carry the counterparty scope keys at the data-model level.
- Cross-counterparty reads / mutations are architecturally impossible.
- `audit_export.*` is NOT used for invoice / reconciliation / handoff actions.
- Automatic vendor payment execution is FORBIDDEN by default; billing person submits from QuickBooks.
- QuickBooks ledger / payment / tax state stays external; CIXCI stores REFERENCES only.
- Vendor reconciliation file is comparison evidence, NOT source truth.
- Vendor Reconciliation Upload Rows MUST NEVER mutate adjacent module records.
- Previously issued invoice lines are NEVER mutated; corrections produce Invoice Adjustments.
- Existing PR #98-#102, PR #103, PR #104, PR #105 baselines preserved by reference; no adjacent module file is modified.

### Sequence positioning

This PR is the next architecture hardening step after PR #98-#105 (all merged at origin/main) and after API / Swagger work was paused. The next planned PRs after this one are documented in `README.md`'s Sequence positioning section.
