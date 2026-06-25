# Invoice Management Edge Cases

This document is proposal-level architecture. It identifies risks and handling expectations without finalizing implementation behavior.

## Source Evidence Edge Cases

- Pricing invoice-bindable snapshot is missing, stale, superseded, redacted, or non-invoice-bindable.
- Pricing Channel does not match requested invoice type.
- Vendor-side or buyer-side commission component is missing from Pricing evidence.
- Buyer-facing Wholesale Price visibility evidence is stale or unavailable.
- Owned Channel / Kaseory exception is referenced without Pricing exception evidence.
- Buyer-specific override conflicts with global Pricing evidence.
- Tenant Company access/scope evidence is missing, stale, expired, superseded, or ignored.
- Product Catalog product/buyer relationship reference is missing, lacks version/hash, or is superseded where required.
- Fulfillment/Returns, Procurement, Order Routing, Product Catalog, or Tenant Company source evidence is supplied as a bare reference without source version/disposition controls.

Expected handling: block invoice line or route to review; do not recalculate or infer upstream facts. Bare source references are not enough for invoice immutability.

## Online/DTC Delivery Edge Cases

- Routed suborder exists but Fulfillment/Returns delivered shipment line evidence is missing.
- Shipment status is Shipped but delivered quantity evidence is absent.
- Tracking URL exists but delivered evidence is absent.
- Partial delivered quantity is less than ordered quantity.
- Delivered quantity evidence conflicts with routed suborder line quantity.
- Shipment line evidence is stale, duplicate, out-of-order, ignored, or superseded.
- Shipment line evidence lacks source record version/hash or source disposition.

Expected handling: invoice only delivered line-level quantities with valid versioned/dispositioned evidence; block or review the rest.

## Return / Adjustment Edge Cases

- Return line disposition evidence is missing or stale.
- Return line disposition evidence lacks source version/hash or disposition.
- Vendor-provided Return Refunded Amount conflicts with Pricing adjustment pricing evidence.
- Vendor-provided refund evidence is present without Pricing adjustment pricing evidence.
- Partial return quantities do not reconcile at line level.
- Vendor-provided refund amount is present without Invoice adjustment rules/evidence.
- Return operational disposition is accepted but financial adjustment evidence is missing.
- Pricing adjustment pricing evidence is missing, stale, or non-bindable.

Expected handling: treat vendor-provided refund amount as evidence, not final financial truth; compare it against Pricing adjustment evidence and Invoice-owned adjustment rules/disposition; block or review adjustment when inconsistent.

## Bulk PO Edge Cases

- Procurement PO reference exists but PO line reference is missing.
- Procurement accepted-price evidence is missing, stale, ignored, or superseded.
- Procurement accepted-price evidence lacks source record version/hash or disposition.
- Pricing PO invoice-bindable evidence is missing or non-bindable.
- PO lifecycle evidence is ambiguous between submitted, accepted, received, and completed.
- Accepted-price variance reference exists but no Pricing review disposition is available.

Expected handling: block PO invoice line or route to review; do not recalculate accepted PO price or interpret Procurement variance.

## Export Edge Cases

- Invoice export requested with stale Tenant Company scope/version.
- Redaction decision version is missing.
- Export attempts to include customer-sensitive, pricing-sensitive, commission-sensitive, or accounting-sensitive fields without authorized view type.
- Export date-basis mixes order date, delivery date, adjustment date, invoice period, generated date, or PO date without metadata.
- Export file was expired, revoked, or superseded but download is attempted.
- External delivery fails after export batch is created.
- Scheduled email delivery fails after export batch is created.

Expected handling: block/review export or record separate Integration/Notification evidence references. Logs & Audit owns immutable file/download evidence.

## Reconciliation Edge Cases

- Reconciliation upload has invalid schema or missing required identifiers.
- Reconciliation rows duplicate existing invoice lines.
- Uploaded amount differs from Pricing evidence.
- Uploaded status implies payment or settlement correction.
- Reconciliation review attempts to mutate source Pricing, Fulfillment/Returns, Procurement, payment, accounting, or Integration records.

Expected handling: detection/review only unless future ADR assigns settlement/payment correction.

## Accounting Sync Edge Cases

- Accounting sync request created but Integration delivery fails.
- Provider response includes external ID conflict.
- Retry creates duplicate external accounting reference risk.
- Accounting system rejects invoice export content.
- Idempotency key is reused for a different invoice version/hash.
- Regenerated or superseded invoice attempts a new accounting handoff without supersession/correction reference.
- Provider request fingerprint matches a prior posting attempt.
- Duplicate external reference blocker detects prior external posting reference.
- User treats sync failed as invoice invalid.

Expected handling: Invoice Management records sync request status/review state and duplicate-posting safeguards from request state plus Integration evidence; Integration Management owns transport/provider evidence.

## Access And Redaction Edge Cases

- Buyer attempts to access vendor-only commission data.
- Vendor attempts to access customer-sensitive buyer data beyond permitted scope.
- System admin accesses sensitive invoice export without access event.
- Role/scope projection changes after export generation but before download.
- AI requests invoice evidence without approved access scope.

Expected handling: enforce Tenant Company evidence and recheck-before-display/download flags; emit sensitive access event where required.

## Invoice Management Foundation Edge Cases

This section documents Invoice Management edge cases for the foundation hardening. All existing Invoice Management baseline edge cases are preserved without modification.

### Empty Invoice Run

- Invoice Run for a period with zero eligible source lines: VALID Invoice Run at `invoice_run_status = generated` with empty Result Summary; no Invoices created; not an error.

### Partial eligibility

- Some source lines have delivery evidence; some do not: Invoice Run generates Invoice Lines only for the lines with delivery evidence; lines without delivery evidence are flagged for exception or excluded per business policy.

### Delivered date in prior period

- Source order delivered in prior period but only discovered in current period (e.g., late delivery evidence emission): Invoice Run for current period MAY include the line per business decision on date basis (delivered date vs invoice period; open question OQ-IM-4); if included, idempotency key prevents duplicate vs prior period.

### Refund evidence arriving mid-run

- Source refund evidence arrives between `collecting_sources` and `generating`: Invoice Run sees the refund at collection time; Invoice Adjustment produced in same run.
- Source refund evidence arrives AFTER `generated`: late refund handling (Workflow 14); later-period Invoice Adjustment.

### Missing Pricing snapshot

- Pricing snapshot not available at Invoice Line generation time: Invoice Exception Record at `exception_kind = missing_pricing_snapshot`; Invoice Line generation HELD until snapshot available OR admin resolution.

### Missing commission snapshot

- Commission snapshot not available: Invoice Exception Record at `exception_kind = missing_commission_snapshot`; treated like missing Pricing snapshot.

### Vendor-side commission absent

- Buyer-side commission present but vendor-side commission absent for a vendor where vendor-side commission is exception-only (per business decision OQ-BP-4): Invoice Line snapshot value `vendor_side_commission_amount = null`; NOT an exception.
- Vendor-side commission absent for a vendor where vendor-side commission is active by default: Invoice Exception Record at `exception_kind = missing_commission_snapshot`.

### Missing QuickBooks customer / vendor mapping

- At QuickBooks handoff time, QuickBooks customer or vendor mapping not configured: Invoice Exception Record at `exception_kind = missing_quickbooks_mapping`; QuickBooks handoff HELD; transitions to `sync_failed` if forced.

### Parent / child company scope unresolved

- Source order line's `company_scope_reference` cannot be resolved to a billing profile (e.g., parent company is set but child entity is not in scope): Invoice Exception Record at `exception_kind = parent_company_scope_unresolved`; Invoice Line generation HELD.

### Idempotency collision (same period, counterparty, source line)

- A re-run encounters an existing Invoice Line for the same (`invoice_period`, counterparty, `source_order_line_reference`): Invoice Exception Record at `exception_kind = idempotency_collision`; route to Workflow 14 (supersession / Adjustment, NOT duplicate Invoice Line).

### Source record drift

- Source order line changes after Invoice Line generated: Invoice Exception Record at `exception_kind = source_record_drift`; Invoice Line is NOT mutated; correction produces Invoice Adjustment (Workflow 6 / Workflow 14).

### Late refund after invoice synced to QuickBooks

- Invoice synced to QuickBooks; refund event occurs later: later-period Invoice Adjustment created with `adjustment_kind = late_refund`; QuickBooks handoff for the Adjustment as a separate bill / credit / equivalent QuickBooks-supported object; original Invoice Line / Invoice NOT mutated.

### Partial refund

- Partial refund (e.g., 50% of original line amount): Invoice Adjustment created with partial `adjustment_amount`; net amount on the Invoice Line is NOT recalculated (Pricing-owned); the Adjustment record carries the partial amount as evidence.

### Vendor file with completely valid rows

- Vendor file 100% matches CIXCI source: Vendor Reconciliation Upload Job at `reconciled` (no exceptions); all Match Results at `matched`; downstream Workflow 18 may proceed.

### Vendor file with all mismatches

- Vendor file completely diverges from CIXCI source: high-volume Match Results with mismatch statuses; Vendor Reconciliation Upload Job at `reconciled_with_exceptions` OR `review_required` per business policy; Invoice Exception Records produced.

### Vendor file with duplicate rows

- Vendor file contains two rows for the same vendor_order_reference: Match Results at `duplicate_in_vendor_file`; Invoice Exception Record; **upload rows MUST NEVER mutate adjacent module records**; reconciliation does NOT create duplicate Invoice Lines.

### CIXCI invoice-eligible row missing from vendor file

- CIXCI has a delivered + invoice-eligible row that vendor file omits: Match Result at `missing_in_vendor_file`; Invoice Exception Record at `exception_kind = vendor_report_mismatch`; admin reviews.

### Row in vendor file but not in CIXCI

- Vendor file row references a CIXCI order that does NOT exist (e.g., typo or fraud attempt): Match Result at `missing_in_cixci`; Invoice Exception Record; **upload row does NOT create a CIXCI order**.

### Vendor-reported delivery without CIXCI source delivery evidence

- Vendor reports delivered date / status; CIXCI source has no delivery evidence: Match Result at `status_mismatch` or `missing_in_cixci`; Invoice Exception Record at `exception_kind = vendor_report_mismatch`; **invoice eligibility NOT automatically created**.
- Open business decision (OQ-BP-9): whether vendor reconciliation evidence can ever be accepted as delivery evidence after manual review (default: NO; future business decision MAY allow with explicit approval).

### Vendor-reported refund without CIXCI source refund evidence

- Vendor reports refund amount; CIXCI source has no refund evidence: Match Result at `refund_mismatch` or `missing_in_cixci`; Invoice Exception Record; **invoiceable amount NOT automatically reduced**.

### Vendor reconciliation file uploaded by admin-on-behalf

- CIXCI billing person uploads vendor reconciliation file on behalf of a vendor (e.g., vendor emailed CSV): Tenant Company act-on-behalf authority consulted; Vendor Reconciliation Upload Job records `change_source = admin_on_behalf` (or equivalent); `actor_reference` set to billing person; vendor reference set to actual vendor.

### Vendor reconciliation file uploaded multiple times for same period

- Vendor uploads file twice for same vendor + period: second upload either supersedes (prior Vendor Reconciliation Upload Job transitions to `superseded`) or is rejected per business policy; default architectural intent: supersede.

### Concurrent invoice run creation for same period and counterparty

- Two admins attempt to create Invoice Runs for the same period + counterparty scope concurrently: implementation owns concurrency control; default: serialize; one Invoice Run succeeds, the other receives Invoice Exception Record OR is rejected per implementation.

### Invoice Run canceled mid-generation

- Admin cancels an Invoice Run in `generating` state: transitions to `canceled`; partial Invoices / Lines / Adjustments are marked `canceled` per implementation; no QuickBooks handoff occurs.

### Invoice Run partial approval

- Some Invoices in the Run approved; others have unresolved exceptions: business decision (OQ-BP-6) on whether to allow partial Invoice Run approval; default: approve only Invoices whose exceptions are resolved; Invoice Run transitions to `approved` per business policy when all child Invoices reach terminal-equivalent status.

### QuickBooks transport timeout / retry

- Integration Management dispatches QuickBooks API call; QuickBooks times out: Integration Management owns retry per its retry policy; Invoice Management's Invoice remains in `sync_requested` until Integration Management reports outcome; on persistent failure, Invoice transitions to `sync_failed`.

### QuickBooks returns error (invalid customer / vendor mapping)

- QuickBooks rejects handoff due to invalid mapping: Integration Management reports error; Invoice transitions to `sync_failed`; `quickbooks_error_reference` populated; Invoice Exception Record at `exception_kind = missing_quickbooks_mapping`.

### QuickBooks customer / vendor reference changes externally

- QuickBooks ID for a customer changes externally (e.g., merged customer record): Invoice Management's `quickbooks_customer_reference` MAY become stale; default behavior: future syncs use the new mapping per Tenant configuration; prior `quickbooks_customer_reference` preserved as historical evidence on synced Invoices.

### QuickBooks payment status pulled back

- QuickBooks reports `paid` for a synced Invoice: Integration Management notifies Invoice Management; `quickbooks_payment_status_reference` updated; event `quickbooks-handoff.reference-recorded` emitted with `quickbooks_handoff_object_kind = payment_status_update`; Invoice's internal `invoice_status` REMAINS at `synced` (NOT changed to `paid`; `paid` is external reference only).

### Partial payment in QuickBooks

- QuickBooks reports `partially_paid` for a synced vendor bill: `quickbooks_payment_status_reference` updated; CIXCI does NOT track partial payment amount as internal truth; QuickBooks owns partial payment ledger.

### Credited in QuickBooks

- QuickBooks reports `credited` for a synced bill: `quickbooks_payment_status_reference` updated; CIXCI does NOT execute credit application.

### Auto-payment attempted (FORBIDDEN)

- Hypothetical future contributor attempts to add auto-payment execution: FORBIDDEN by locked default. Future auto-payment workflow requires explicit additional controls (per-vendor enablement, per-amount thresholds, dual approval) and is out of scope for this PR.

### Invoice Report export file lost

- Generated Invoice Report file deleted from storage: Invoice Export / File Reference still exists with the original `file_artifact_reference`; Logs & Audit retention policy governs file lifecycle per PR-D; re-export creates a new file artifact.

### Cross-tenant boundary

- Buyer A in tenant T1 and buyer B in tenant T2: entirely independent Invoices; cross-tenant reads / mutations architecturally impossible.

### Re-parented buyer / vendor entity (PR #103 OQ-PC-2 deferred discipline)

- A buyer / vendor entity re-parented under a different company: existing PR #103 deferred discipline applies; concrete behavior on Invoice Runs spanning re-parenting events is NOT locked here.

### Source order line corrected away (reference correction)

- Source order line's reference corrected (e.g., wrong product variant originally; corrected post-Invoice generation): Invoice Exception Record at `exception_kind = source_record_drift`; Invoice Line NOT mutated; correction produces Invoice Adjustment per Workflow 14.

### Pricing snapshot version updated retroactively

- Pricing snapshot for a prior period updated retroactively (e.g., commission rate correction): Invoice Lines already generated continue to reference the ORIGINAL `pricing_snapshot_reference` and `commission_snapshot_reference` (snapshot immutability); correction produces Invoice Adjustment or runs through Workflow 14.

### Vendor reconciliation evidence reference reused

- Multiple Invoice Lines / Adjustments / Exceptions reference the same Vendor Reconciliation Match Result: allowed; the Match Result is shared evidence; references propagate per Workflow 13.

### Vendor reconciliation upload after Invoice approval

- Vendor uploads reconciliation file AFTER Invoice already approved: Match Results may surface discrepancies; produces Invoice Exception Records; resolution path is Workflow 14 (Invoice Adjustment or supersession), NOT mutation of approved Invoices.

### Vendor reconciliation never uploaded

- Period closes; vendor never uploads reconciliation: business decision (OQ-BP-8) on whether vendor payable package requires reconciliation; default: yes; payable package NOT marked approved-ready; Invoice Run held in `completed_with_exceptions` or `pending_review` until business decision.

### Multiple invoice runs in same period

- Admin creates Invoice Run A; later creates Invoice Run B for the same period (e.g., to include late deliveries). Per Workflow 14: A is superseded if B is intended to replace; OR A remains primary and B is a delta run that produces Invoice Adjustments. Default per business policy; both paths supported architecturally.

### `audit_export.*` capability present (out of band)

- Even if a buyer / vendor / admin has been granted `audit_export.*` capabilities (e.g., for PR-E Audit Report Export Records), this PR's invoice / reconciliation / handoff actions do NOT consult `audit_export.*` and do NOT confer invoice-related privilege. Boundary preserved.

### High-volume vendor reconciliation match events

- Reconciliation with thousands of rows: per-row `vendor-reconciliation-match.completed` event MAY be emitted as a batch / summary at completion; discriminator and structure preserved per `event-contracts.md`.

### AI-Agent-initiated Invoice Run

- Future AI Agent Services module initiates an Invoice Run on behalf of admin (future PR if module exists): same authority discipline (Tenant Company `check_access`); `actor_reference` or `service_trigger_reference` records the AI agent identity. Not in scope for this PR.

### Tax calculation absent

- CIXCI does NOT calculate tax; QuickBooks / CPA owns. Tax fields on QuickBooks-side bill / invoice are external truth via `quickbooks_*_reference`. Future business / CPA decision MAY assign tax to CIXCI; out of scope for this PR.

### Settlement / payout automation absent

- CIXCI does NOT execute settlement / payout automation. Future Settlement / Payout module may handle automated payouts with additional controls; out of scope for this PR.

### What this edge-cases section intentionally does NOT lock

- Concrete numerics for: retention, throttle, dedupe, batching, reconciliation mismatch thresholds, cancel grace.
- Concrete API request / response shapes.
- Concrete UI for any edge case.
- Concrete generation queue technology, fairness algorithm.
- Concrete idempotency cache shape, TTL.
- Concrete propagation latency for `check_access` revocation mid-Invoice-Run.
- Re-parenting concrete invoice behavior (existing PR #103 deferred discipline).
- AI-Agent-initiated concrete behavior (future PR).
- Tax calculation logic (deferred or QuickBooks / CPA-owned).
- Settlement / payout automation (future Settlement / Payout module).
- Automatic vendor payment execution (FORBIDDEN by default).
