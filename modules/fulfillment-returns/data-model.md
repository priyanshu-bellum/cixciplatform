# Fulfillment and Returns Data Model

This document is proposal-level architecture. It defines Fulfillment and Returns entities without finalizing database schema, carrier integration schema, vendor file contracts, refund behavior, or ownership outside the bounded context.

## Entity Groups

### Handoff And Execution

- Fulfillment Handoff Disposition Record
- Fulfillment Execution Record
- Fulfillment Hold Record
- Fulfillment Exception
- Fulfillment Review Record
- Fulfillment Retry Record

### Vendor Fulfillment Import

- Vendor Fulfillment Import Job
- Vendor Fulfillment Import Batch Reference
- Vendor Fulfillment Import Row Result
- Fulfillment Locked Field Validation Result
- Fulfillment Editable Field Evidence
- Fulfillment Import Correction / Reupload Reference
- Fulfillment Import Error Report Placeholder

### Shipment And Tracking

- Shipment Record
- Shipment Line Evidence Record
- Shipment Evidence Record
- Tracking Reference Record
- Shipment Status Record
- Shipment Status History
- Delivery Confirmation Record
- Partial Shipment Group
- Multi-Suborder Shipment Link
- Shipment Reconciliation Record

### Vendor Return Export

- Vendor Return Export Eligibility Record
- Vendor Return Export Batch
- Vendor Return Export Batch Item
- Return Buyer / Retailer Split Reference
- Return Re-Export Request
- Return Manual Download Reference

### Vendor Return Import And Disposition

- Vendor Return Import Job
- Vendor Return Import Batch Reference
- Vendor Return Import Row Result
- RAN Validation Record
- Return Matching Validation Record
- Return Chronology Validation Record
- Vendor Return Disposition Evidence Record
- Return Line Disposition Evidence Record
- Vendor Refund / Adjustment Evidence Reference
- Return Import Correction / Reupload Reference
- Return Import Error Report Placeholder

### Returns And Replacement Execution

- Return Request Intake Reference
- Return Authorization Reference
- Return Authorization Validation Record
- Return Shipment Record
- Return Tracking Reference
- Return Receipt Record
- Return Condition Evidence
- Return Exception
- Replacement Request Reference
- Approved Warranty Replacement Signal Reference
- Replacement Shipment Record
- Replacement Execution Record
- Replacement Chain Record
- Duplicate Replacement Prevention Record

### Common References

- Parent Order Reference
- Routed Suborder Reference
- Routed Suborder Line Reference
- Routing Snapshot Reference
- Order Routing Fulfillment Handoff Request Reference
- Order Routing Vendor Export Batch Item Reference
- Vendor Reference
- Buyer / Entity Reference
- Tenant Scope Reference
- Product Catalog Reference
- Device Reference
- Product Type Reference
- Pricing Snapshot Reference
- Invoice Evidence Reference Placeholder
- Integration Transport Reference Placeholder
- Notification Delivery Reference Placeholder
- Logs & Audit Evidence Reference Placeholder
- AI Fulfillment Signal Reference
- Audit Reference

## Handoff And Execution Records

### Fulfillment Handoff Disposition Record

Represents Fulfillment and Returns' disposition for an Order Routing handoff request. It is Fulfillment-owned evidence that the request was accepted, rejected, ignored, duplicate-blocked, or routed to review.

Proposal-level fields:

- Disposition id.
- Order Routing handoff request reference.
- Routed suborder reference.
- Routing snapshot reference.
- Parent order reference.
- Vendor reference.
- Buyer/entity reference.
- Source version from Order Routing.
- Fulfillment/Returns source version.
- Disposition state: accepted, rejected, ignored, duplicate-blocked, review-required.
- Applied vs ignored state.
- Duplicate handoff blocker.
- Rejection reason.
- Review-required state.
- Received timestamp.
- Idempotency key.
- Audit reference.

`order.routing.fulfillment-handoff.requested` is a request, not proof of accepted fulfillment execution. Missing, duplicate, stale, ignored, or rejected Fulfillment disposition must not be treated as fulfilled, shipped, delivered, accepted, invoiced, or financially final.

### Fulfillment Execution Record

Represents operational work after an accepted handoff disposition.

Proposal-level fields:

- Fulfillment execution id.
- Fulfillment handoff disposition reference.
- Routed suborder reference.
- Routing snapshot reference.
- Vendor reference.
- Buyer/entity reference.
- Current execution status.
- Current shipment references.
- Current shipment line evidence references.
- Current return references where applicable.
- Exception summary.
- Review state.
- Audit reference.

## Vendor Fulfillment Import Records

### Vendor Fulfillment Import Job

Represents a vendor fulfillment file/manual/API import workflow. It follows `architecture/standards/import-export-validation-governance.md`.

Proposal-level fields:

- Import job id.
- Import mode: update-only, validate-only, correction/reupload, supersession/revision placeholder.
- Import batch reference.
- Source export batch reference from Order Routing where applicable.
- Source export batch item references where applicable.
- Vendor reference.
- Buyer/entity reference.
- Tenant scope reference.
- Routed suborder references.
- Routed suborder line references where supplied.
- Import schema version.
- Header validation status.
- Locked field validation status.
- Validation status.
- Preview status.
- Confirmation status.
- Processing status mapped to the shared import status vocabulary.
- Applied row count.
- Rejected row count.
- Skipped row count.
- Warning row count.
- Correction/reupload reference.
- Downloadable error report placeholder.
- Audit reference.

### Vendor Fulfillment Import Row Result

Represents row-level validation and apply outcome.

Proposal-level fields:

- Row result id.
- Import job reference.
- Row number or row identity.
- Source export batch item reference.
- Routed suborder reference.
- Routed suborder line reference where available.
- Original order line reference.
- Vendor reference.
- SKU as preserved text.
- UPC as preserved text.
- Quantity.
- Package id placeholder.
- Shipment line id placeholder.
- Row operation: no-change, update, skip, reject, review-required, supersede.
- Validation errors.
- Validation warnings.
- Applied shipment line evidence references.
- Applied fulfillment evidence references.
- Stale/duplicate/out-of-order handling result.
- Applied vs ignored state.
- Supersession reference.
- Audit reference.

### Locked Order Fields

Locked order fields for vendor fulfillment imports include:

- Retailer / buyer reference.
- Customer shipping name/address fields where allowed by export contract.
- Suborder reference.
- SKU.
- UPC.
- Quantity.
- Device delivery flag where present.
- Source export batch/item reference.
- Original order line references.

Locked field changes should reject, skip, or route the row to review according to Fulfillment source-module rules. They must not mutate Order Routing decisions or original order line facts.

### Editable Fulfillment Field Evidence

Editable vendor fulfillment fields include:

- Vendor confirmation number.
- Shipping carrier.
- Shipping tracking number.
- Custom tracking URL or tracking instructions for `Other` carrier.
- Shipped date.
- Delivered date.
- Package id placeholder.
- Shipment line id placeholder.
- Vendor notes placeholder.

Blank editable fields do not erase existing values by default. Explicit clear behavior remains unresolved and would require source-module support, permission, preview, confirmation, and audit evidence.

## Fulfillment Validation Rules

Vendor fulfillment import validation should include:

- Suborder exists.
- Suborder belongs to importing vendor.
- Source export batch/item matches the routed suborder.
- Each row maps to an expected routed suborder line or explicitly allowed shipment line/package structure.
- SKU/UPC match the original order line.
- Quantity matches the original order line unless split shipment/package structure explicitly supports variance.
- Suborder is eligible for fulfillment update.
- Duplicate row detection by suborder + SKU/UPC unless a split shipment/package model supports multiple rows.
- Package ID and/or Shipment Line ID distinguishes rows when split shipments are supported.
- Shipped quantity and delivered quantity do not exceed expected quantity unless explicitly allowed and reviewed.
- Delivered quantity does not exceed shipped quantity.
- UPC/text identifier preservation.
- Shipped date is valid.
- Delivered date is valid and not before shipped date.
- Blank fulfillment fields do not erase existing values.
- Applied, ignored, rejected, and superseded row outcomes are retained.
- Stale, duplicate, and out-of-order updates append evidence or route to review.

## Shipment And Tracking Records

### Shipment Record

Represents a shipment or shipment placeholder created from accepted fulfillment execution.

Proposal-level fields:

- Shipment id.
- Fulfillment execution reference.
- Handoff disposition reference.
- Parent order reference.
- Routed suborder references.
- Source export batch/item reference where applicable.
- Shipment line evidence references.
- Package id placeholder.
- Vendor reference.
- Buyer/entity reference.
- Current shipment status: Pending, Processing, Partially Shipped, Shipped, Delivered, Exception, Cancelled, Review Required.
- Current tracking reference.
- Current shipment evidence reference.
- Supersession reference.
- Audit reference.

### Shipment Line Evidence Record

Represents per-routed-suborder-line or per-shipment-line operational evidence created from a vendor fulfillment import row, API update, manual update, or reviewed correction.

Proposal-level fields:

- Shipment line evidence id.
- Routed suborder reference.
- Routed suborder line reference.
- Fulfillment handoff disposition reference.
- Source vendor fulfillment import job reference.
- Source import row reference.
- Source order export batch item reference.
- SKU as preserved text.
- UPC as preserved text.
- Expected quantity.
- Shipped quantity.
- Delivered quantity.
- Package id / package membership placeholder.
- Shipment id / shipment reference.
- Shipping carrier.
- Tracking reference.
- Shipped date.
- Delivered date.
- Duplicate prevention key.
- Applied vs ignored state.
- Line-level disposition: applied, ignored, rejected, superseded, review-required.
- Stale/duplicate/out-of-order state.
- Conflict/review-required state.
- Supersession reference.
- Audit reference.

Shipment updates must be attributable to a routed suborder line or shipment line. Partial shipments must preserve per-line/package evidence. Duplicate import rows must not silently overwrite shipment line evidence. Shipment line evidence does not alter Order Routing decisions. Fulfillment and Returns owns operational shipment evidence only. Invoice Management may consume delivered evidence later, but Fulfillment and Returns does not create invoice state.

### Shipment Evidence Record

Represents immutable evidence that supports shipment state transitions.

Proposal-level fields:

- Shipment evidence id.
- Shipment reference.
- Shipment line evidence references.
- Shipment line/package reference placeholders.
- Evidence source: vendor import, API update, manual update, carrier/provider callback reference, internal review.
- Source timestamp.
- Received timestamp.
- Source version.
- Idempotency key.
- Stale status.
- Out-of-order status.
- Duplicate status.
- Status transition guard references.
- Applied vs ignored state.
- Review-required state.
- Audit reference.

Shipment status updates only after validated fulfillment evidence. Delivered evidence may be consumed by Invoice Management, but Fulfillment and Returns does not create invoice state.

### Tracking Reference Record

Represents tracking data and tracking URL evidence.

Proposal-level fields:

- Tracking reference id.
- Shipment reference.
- Shipment line evidence references where tracking is line/package specific.
- Shipping carrier: USPS, UPS, FedEx, DHL, Other.
- Carrier name/details.
- Shipping tracking number.
- Generated tracking URL.
- Custom tracking URL.
- Tracking instructions for `Other` carrier.
- Tracking URL source.
- Tracking URL validation status.
- Carrier-specific tracking format validation placeholder.
- Duplicate tracking number handling state.
- Unsafe/malformed tracking URL review state.
- Carrier/provider evidence reference where available.
- Tracking redirect placeholder.
- Tracking URL supersession reference.
- Audit reference.

Carrier is required when tracking number or shipped date is provided. Tracking number is required when shipped date is provided. `Other` carrier requires a custom tracking URL or instructions. Tracking URL is a delivery reference, not source-of-truth shipment state. Integration Management owns carrier/provider callback receipt evidence where applicable.

### Shipment Status Record

Represents one immutable status observation for a shipment.

Proposal-level fields:

- Shipment status record id.
- Shipment reference.
- Shipment line evidence references where status is line/package specific.
- Status.
- Source.
- Source timestamp.
- Received timestamp.
- Source version.
- Sequence number/cursor placeholder.
- Idempotency key.
- Stale handling result.
- Duplicate handling result.
- Out-of-order handling result.
- Transition guard result.
- Reason.
- Actor/system actor.
- Audit reference.

Current shipment status is derived from accepted status records and conflict rules, not by overwriting prior evidence.

## Vendor Return Export Records

### Vendor Return Export Eligibility Record

Represents whether an operational return may be included in a vendor return export.

Proposal-level fields:

- Eligibility record id.
- Return reference.
- Source return request/reference.
- Return lifecycle state.
- Return line references.
- RAN reference.
- Return authorization/RAN source version.
- Return authorization freshness.
- Stale authorization state.
- Closed return state.
- Superseded return state.
- Vendor reference.
- Buyer/entity reference.
- Parent order reference.
- Routed suborder reference.
- Export window.
- Return inclusion rule version.
- Return export schema version.
- Eligibility status.
- Eligibility reason.
- Exclusion reason.
- Export blocked/review-required reason.
- Prior export state.
- Re-export allowed flag.
- Review-required state.
- Audit reference.

Return export eligibility should avoid sending stale, closed, superseded, unauthorized, or mismatched returns to vendors. RAN validation is needed both before export and during import. Fulfillment and Returns owns operational return export eligibility but does not own customer-facing return policy or financial refund approval unless future ADR assigns it.

### Vendor Return Export Batch

Represents a Fulfillment-owned grouping of vendor return export batch items and operational return export content references.

Proposal-level fields:

- Return export batch id.
- Vendor reference.
- Buyer/retailer split mode.
- Export method reference.
- Return export schema version.
- Export window.
- Generated timestamp.
- Generated by actor/service.
- Batch idempotency key.
- Return export content reference.
- File/reference placeholder.
- Delivery reference placeholder.
- Manual download reference.
- Re-export reference.
- Audit reference.

Logs & Audit owns immutable file/export evidence. Integration Management and Notification Platform Service own delivery depending on transport.

### Vendor Return Export Batch Item

Represents per-return-line inclusion and disposition inside a return export batch.

Proposal-level fields:

- Return export batch item id.
- Return export batch reference.
- Eligibility record reference.
- Return reference.
- Source return request/reference.
- Return line reference.
- RAN reference.
- Return lifecycle state.
- Vendor reference.
- Buyer/entity reference.
- Included/excluded status.
- Included/excluded reason.
- Prior export membership reference.
- Re-export reason.
- Duplicate prevention key.
- Source event/version.
- Review-required state.
- Audit reference.

### Return Buyer / Retailer Split Reference

Represents return export grouping by buyer/retailer.

Proposal-level fields:

- Split reference id.
- Vendor reference.
- Buyer/entity reference.
- Split rule version.
- Return export batch reference.
- Return references.
- Return line references.
- RAN references.
- Review-required state.
- Audit reference.

Split behavior changes export grouping only. It must not change return ownership, shipment evidence, routing decisions, refund evidence, or vendor responsibility.

## Vendor Return Import Records

### Vendor Return Import Job

Represents a vendor return processing file/manual/API import workflow.

Proposal-level fields:

- Return import job id.
- Import mode: update-only, validate-only, correction/reupload, supersession/revision placeholder.
- Import batch reference.
- Source return export batch reference.
- Source return export batch item references.
- Vendor reference.
- Buyer/entity reference.
- RAN references.
- Return line references.
- Import schema version.
- Header validation status.
- Locked field validation status.
- Validation status.
- Preview status.
- Confirmation status.
- Processing status mapped to shared import status vocabulary.
- Applied row count.
- Rejected row count.
- Skipped row count.
- Warning row count.
- Correction/reupload reference.
- Downloadable error report placeholder.
- Audit reference.

### Vendor Return Import Row Result

Represents row-level validation and apply outcome for vendor return processing imports.

Proposal-level fields:

- Row result id.
- Return import job reference.
- Row number or row identity.
- Source return export batch item reference.
- RAN reference.
- Return line reference.
- Source return request/reference.
- SKU as preserved text.
- UPC as preserved text.
- Expected return quantity.
- Received quantity.
- Accepted quantity.
- Rejected quantity.
- Partially accepted quantity.
- CIXCI Return Line ID where available.
- Package/receipt reference placeholder where applicable.
- Row operation: no-change, update, skip, reject, review-required, supersede.
- Applied return line disposition evidence references.
- Stale/duplicate/out-of-order handling result.
- Applied vs ignored state.
- Supersession reference.
- Audit reference.

### Locked Return Fields

Locked return fields include:

- Retailer / buyer reference.
- Suborder reference.
- RAN.
- Reason for return.
- Return initiation date.
- Return quantity.
- Vendor wholesale price snapshot reference or pricing snapshot reference.
- SKU.
- UPC.
- Source return export batch/item reference.

Locked field changes should reject or route the row to review. Vendor Wholesale Price is a snapshot/evidence reference, not editable pricing truth.

### Editable Return Field Evidence

Editable vendor return fields include:

- Return received date.
- Return refunded amount as vendor-provided refund/adjustment evidence.
- Rejected reason.
- Partial acceptance/refund reason.
- Return condition.
- Vendor notes.
- Return status where supported.

### RAN Validation Record

Represents validation of return authorization number/reference matching.

Proposal-level fields:

- RAN validation id.
- RAN reference.
- Vendor reference.
- Return reference.
- Source return request/reference.
- Return line reference.
- Source return export batch/item reference.
- Return authorization/RAN source version.
- Return authorization freshness.
- Stale authorization state.
- Closed return state.
- Superseded return state.
- Validation result: valid, missing, unknown, wrong-vendor, stale, closed, superseded, duplicate, review-required.
- Matching source version.
- Audit reference.

Validation should ensure the RAN exists, belongs to the importing vendor, matches an open return record, and matches the source export batch/item.

### Return Matching Validation Record

Proposal-level fields:

- Matching validation id.
- Return reference.
- Source return request/reference.
- RAN reference.
- Suborder reference.
- SKU as preserved text.
- UPC as preserved text.
- Expected return quantity.
- Received quantity.
- Accepted quantity.
- Rejected quantity.
- Partially accepted quantity.
- Original return line reference.
- CIXCI Return Line ID where available.
- Package/receipt reference placeholder.
- Match status.
- Duplicate RAN + SKU/UPC row status.
- Partial return line support flag.
- Quantity reconciliation status.
- Review-required state.
- Audit reference.

### Return Chronology Validation Record

Proposal-level fields:

- Chronology validation id.
- Return reference.
- Return initiation date.
- Return received date.
- Source timestamp.
- Received timestamp.
- Future-date handling status.
- Received-before-initiation status.
- Stale/duplicate/out-of-order handling result.
- Audit reference.

## Vendor Return Disposition And Refund Evidence

### Vendor Return Disposition Evidence Record

Represents vendor-provided operational disposition evidence at the return summary level.

Proposal-level fields:

- Disposition evidence id.
- Return reference.
- Return line disposition evidence references.
- RAN reference.
- Vendor reference.
- Received by vendor flag/timestamp.
- Operational disposition: received, operationally-accepted, operationally-rejected, partially-accepted, closed, exception, review-required.
- Return condition evidence summary.
- Vendor notes evidence summary.
- Rejected reason summary.
- Partial acceptance/refund reason summary.
- Vendor-provided refund/adjustment evidence reference.
- Source timestamp.
- Received timestamp.
- Source version.
- Idempotency key.
- Review-required state.
- Audit reference.

Accepted/rejected return logic is operational disposition, not financial approval. Summary-level disposition should be derived from return line disposition evidence where line quantities differ.

### Return Line Disposition Evidence Record

Represents per-return-line vendor operational disposition evidence, especially where SKU/UPC, quantity, or partial return outcomes differ.

Proposal-level fields:

- Return line disposition evidence id.
- RAN reference.
- Return line reference.
- Source return request/reference.
- Source return export batch item reference.
- Vendor return import job reference.
- Source import row reference.
- SKU as preserved text.
- UPC as preserved text.
- Expected return quantity.
- Received quantity.
- Accepted quantity.
- Rejected quantity.
- Partially accepted quantity.
- Vendor operational disposition.
- Rejected reason.
- Partial acceptance/refund reason.
- Return condition.
- Vendor notes.
- Vendor-provided refund/adjustment evidence reference.
- Source timestamp.
- Received timestamp.
- Source version.
- Duplicate prevention key.
- Applied vs ignored state.
- Stale/duplicate/out-of-order state.
- Conflict/review-required state.
- Supersession reference.
- Audit reference.

Return disposition is operational evidence, not final financial approval. Accepted, rejected, and partial outcomes must be recorded at return-line level where quantities can differ by SKU/UPC or partial quantity. Fulfillment and Returns does not decide refund execution, credit, payment, or invoice adjustment. Pricing owns pricing snapshot and adjustment pricing evidence. Invoice Management owns invoice/refund/credit/adjustment lifecycle.

### Vendor Refund / Adjustment Evidence Reference

Represents a vendor-provided financial-adjacent value captured for downstream Pricing/Invoice interpretation.

Proposal-level fields:

- Vendor refund/adjustment evidence id.
- Return disposition evidence reference.
- Return line disposition evidence reference where amount is line-specific.
- Return refunded amount as provided by vendor.
- Currency.
- Quantity/basis reference.
- Pricing snapshot reference.
- Source timestamp.
- Received timestamp.
- Source version.
- Review-required state.
- Pricing adjustment evidence reference placeholder.
- Invoice adjustment reference placeholder.
- Audit reference.

Fulfillment and Returns does not decide refund execution, payment, credit, invoice adjustment, final financial settlement, or return-refunded financial finality.

## Return Import Row-To-Line Application Rules

Proposal-level rules:

- Each return import row must map to an expected return line through RAN + SKU/UPC and/or CIXCI Return Line ID where available.
- Duplicate RAN + SKU/UPC rows are rejected or routed to review unless partial return line structure explicitly supports them.
- If partial return lines are supported, CIXCI Return Line ID and/or package/receipt reference should distinguish rows.
- Received quantity, accepted quantity, rejected quantity, and partially accepted quantity must not exceed expected return quantity.
- Accepted + rejected + partially accepted quantities must reconcile to received quantity where applicable.
- Applied, ignored, rejected, and superseded row outcomes must be retained.

## Operational Return Status Lifecycle

Proposal-level statuses:

- Return Requested.
- Exported to Vendor.
- Received by Vendor.
- Operationally Accepted.
- Operationally Rejected.
- Partially Accepted.
- Closed.
- Exception.
- Review Required.

Financial statuses such as Refund Approved, Refund Rejected, Partially Refunded, or Return Refunded should remain external/Invoice/Pricing evidence unless future ADR/module scope assigns Fulfillment ownership.

## Buyer Update Signal References

Fulfillment and Returns may track workflow references for:

- Shipment update ready for buyer transport.
- Return update ready for buyer transport.
- Shipment update transport failed reference.
- Return update transport failed reference.

Integration Management owns transport/delivery evidence and retries. Notification Platform Service owns user notification delivery. Logs & Audit owns immutable evidence.

## Ownership

Fulfillment and Returns owns:

- Fulfillment handoff disposition, operational execution, per-line shipment evidence, tracking, shipment evidence, return operational state, return export/import workflows, return receipt/condition, per-line return disposition evidence, vendor-provided refund/adjustment evidence references, replacement execution, and fulfillment/return exceptions.

Fulfillment and Returns does not own:

- Order Routing decisions, routed suborder truth, routing snapshot truth, or vendor order export batch/item ownership.
- Pricing calculation, pricing snapshot creation, or adjustment pricing evidence.
- Invoice lifecycle, refund/credit/adjustment application, payment, or settlement.
- Integration transport or carrier/provider callback receipt evidence.
- Notification delivery or scheduled email delivery.
- Logs & Audit immutable file/download/audit evidence.
- Product Catalog, Device Catalog, Tenant Company, Procurement, Analytics, AI Agent Services, Warranty, Media, or Launch/Event source ownership.

## Retention Notes

Placeholder: define retention for fulfillment import jobs, row results, shipment line evidence, tracking references, shipment evidence, return export/import jobs, RAN validation records, return line disposition evidence, vendor refund/adjustment evidence references, replacement execution, operational exceptions, transport references, and audit references.

## Vendor Fulfillment Response SLA Entities (PR-A)

PR-A introduces the SLA evaluation layer on top of existing Fulfillment / Returns content. The existing entities (Fulfillment Import, Shipment Line, Tracking, Shipment Status, returns entities, replacement shipment, buyer update-ready signals) are unchanged by PR-A. PR-A adds entity shape for the SLA Policy, the SLA Evaluation Record, three distinct Exception entities (Late, Missing, Partial), and SLA Override / Excuse Evidence. PR-A adds one field to the existing Fulfillment Import entity (Fulfillment Import Received Timestamp) without modifying the rest of the entity.

The chain of states from Order Routing's confirmed export delivery through to a final SLA outcome is **architecturally non-collapsible**:

```
Order Routing Vendor Export Delivery Evidence (confirmed)
    └─ consumed read-only by Fulfillment / Returns
        └─ produces ─> SLA Evaluation Record (Fulfillment / Returns truth)
            ├─ on-time + complete  ─> outcome = on_time (no exception)
            ├─ late                ─> outcome = late + Late Fulfillment Import Exception
            ├─ missing             ─> outcome = missing + Missing Fulfillment Import Exception
            └─ partial             ─> outcome = partial + Partial Fulfillment Response Exception
                └─ each Exception may ─> SLA Override / Excuse Evidence (audit-bearing, immutable)
                    └─ raises ─> SLA Breach Signal (one-way; consumed by future Cross-Module PRs)
```

These states are **not interchangeable**. A confirmed Vendor Export Delivery Evidence record is Order-Routing-owned and is not feature truth for Fulfillment / Returns SLA evaluation; consuming it produces the Fulfillment-Returns-side SLA Evaluation Record. An SLA Evaluation Record is not an Exception. An Exception is not an Override. An Override is not vendor operational acceptance.

PR #91's clarification is preserved in force: **a confirmed Vendor Export Delivery Evidence means only that delivery evidence was successfully confirmed for the configured delivery method.** It does not mean the vendor acknowledged, opened, processed, or accepted operational responsibility for the export, and it does not mean fulfillment execution was accepted. PR-A uses confirmed delivery evidence as the SLA clock-start basis only because the SLA Policy says so; SLA evaluation is about *whether the vendor's fulfillment import arrived on time*, not whether the vendor "accepted" anything.

---

### Vendor Fulfillment Response SLA Policy

**Status:** Entity. New in PR-A.

**Owner:** Fulfillment / Returns.

**Purpose:** Per-vendor (or per-vendor-per-route) policy governing how vendor fulfillment response SLA is evaluated. The Policy carries the SLA clock-start basis, the same-day cutoff, the same-day response deadline, the next-business-day response deadline, the business calendar reference, the complete-response definition, and override behavior flags.

**Identity:**

- `sla_policy_id` — canonical platform-assigned identifier. Stable.
- `sla_policy_version` — monotonically increasing version per Policy identity. Edits produce new versions; prior versions remain for audit.
- `vendor_reference` — the vendor this Policy applies to. Required.
- `route_reference` — optional. Per-vendor-per-route Policies are permitted; when null, the Policy applies vendor-wide.

**Configuration content:**

- `timezone_reference` — IANA timezone, e.g., `America/New_York`. Required.
- `business_calendar_reference` — reference into a Tenant-Company-owned (or future-platform-owned) business calendar. Optional in PR-A; if absent, the SLA evaluation falls back to calendar-day semantics with an audit-visible note (per PR-A OQ 1). The fallback is proposal-level and not final implementation behavior.
- `sla_clock_start_basis` — proposal-level enumeration:
  - `confirmed_export_delivery` — Phase 1 default. The clock starts when the consumed Order Routing Vendor Export Delivery Evidence has `delivery_confirmation_state = confirmed`.
  - Reserved values for future phases (e.g., `export_generated`, `manual_acknowledgement`) — not enabled in PR-A.
- `same_day_cutoff_time` — wall-clock time within the configured timezone, e.g., `14:00`. Defines whether a confirmed delivery counts as a same-day delivery or after-hours.
- `same_day_response_deadline_time` — wall-clock time within the configured timezone. The deadline by which the vendor's fulfillment import must arrive if the delivery is same-day. Example: `16:00`.
- `next_business_day_response_deadline_time` — wall-clock time within the configured timezone. The deadline by which the vendor's fulfillment import must arrive if the delivery is after-hours. Example: `10:00` next business day.
- `complete_response_definition` — proposal-level. Defines what counts as a complete response:
  - `all_suborder_lines_covered` — Phase 1 default. The response is complete only when every suborder line has shipment + tracking evidence.
  - `all_required_lines_covered` — reserved for future phases.
- `override_allowed` — boolean. When false, SLA Override / Excuse Evidence is rejected for this Policy. When true (Phase 1 default), Override Evidence is permitted per SLA Override Authority.

**Lifecycle:**

- `draft` — created but not yet active. SLA evaluation does not use draft policies.
- `active` — in effect. Used by Workflow 3 (Expected Deadline Calculation) for Delivery Evidence consumed under this Policy's effective time range.
- `superseded` — a new version replaced this Policy. Prior version remains for audit; SLA Evaluation Records computed against the prior version are not retroactively re-evaluated.
- `retired` — no longer in use. Terminal.

**Versioning:**

Edits to an `active` Policy produce a new Policy version with state `active`; the prior version transitions to `superseded`. The SLA Evaluation Record references the Policy version active at the moment of Delivery Evidence consumption; subsequent Policy edits do not affect Evaluation Records already in `pending` or `evaluated` state.

**Audit:**

- `created_at`, `created_by`, `created_audit_reference`.
- `state_transition_history` — append-only record of every state transition (`draft → active`, `active → superseded`, etc.) with timestamp, actor, prior state, new state, audit reference.

**Relationships:**

- One vendor may have at most one `active` SLA Policy version at any time per `(vendor_reference, route_reference)` pair. Multiple `draft` and `superseded` versions may exist.
- An SLA Evaluation Record references exactly one SLA Policy version.

**Boundary preservation:**

- SLA Policy carries its own cutoffs (`same_day_cutoff_time`, `same_day_response_deadline_time`, `next_business_day_response_deadline_time`). It does not reference or read from Order Routing's Vendor Export Schedule cutoff configuration. The two configurations are conceptually distinct: Order Routing controls when export delivery happens; Fulfillment / Returns controls when vendor response is expected.
- SLA Policy does not own the business calendar; it references one.
- SLA Policy is not vendor-self-service-editable in Phase 1.
- SLA Policy does not enforce SLA on its own — it carries configuration; Workflow 3 (Expected Deadline Calculation) and Workflow 5 (On-Time Evaluation) enforce.

---

### SLA Evaluation Record

**Status:** Entity. New in PR-A.

**Owner:** Fulfillment / Returns.

**Purpose:** The authoritative per-suborder-per-response record of vendor fulfillment response SLA evaluation. Created when an Order Routing Vendor Export Delivery Evidence is confirmed for a suborder (Workflow 2). Carries the Expected Fulfillment Response Deadline, the SLA Policy version applied, the outcome of evaluation, and references to any resulting Exceptions.

**Identity:**

- `sla_evaluation_id` — canonical platform-assigned identifier. Stable.
- `suborder_reference` — the suborder being evaluated. Required.
- `vendor_export_delivery_evidence_reference` — the Order Routing record consumed read-only as the clock-start basis. Required.
- `sla_policy_version_reference` — the SLA Policy version active at consumption. Required.

**Computed / captured fields:**

- `delivery_confirmation_timestamp` — copied from the source Vendor Export Delivery Evidence's `export_delivered_timestamp` at the moment of consumption. Immutable.
- `expected_fulfillment_response_deadline` — wall-clock deadline. Computed by Workflow 3 (Expected Deadline Calculation) at SLA Evaluation Record creation. Immutable after computation. Computation depends on `delivery_confirmation_timestamp`, SLA Policy version's cutoffs, timezone, and business calendar reference.
- `fulfillment_import_received_timestamp` — populated when Workflow 4 captures the vendor's fulfillment import transport receipt. Null while no import has arrived. **This is the transport receipt time** (per PR-A confirmed decision), not the post-validation acceptance time. Captured from the existing Fulfillment Import entity's transport-receipt field.
- `fulfillment_import_references` — list of references to Fulfillment Import records that have arrived for this suborder. Populated incrementally as imports arrive.
- `outcome` — proposal-level enumeration:
  - `pending` — Evaluation Record is created but evaluation has not yet been determined (no import yet, deadline not yet elapsed).
  - `on_time` — terminal. Complete response received before Expected Deadline.
  - `late` — terminal. Complete response received but after Expected Deadline (whether arriving directly late, or completing after an earlier Partial).
  - `missing` — terminal. Expected Deadline elapsed with no fulfillment import. **Note:** if a late import subsequently arrives, the outcome transitions to `late` (per Workflow 7 late-import-after-Missing-Exception behavior); the prior `missing` outcome is preserved in `outcome_history`.
  - `partial` — non-terminal interim outcome (the Evaluation Record's lifecycle is `pending` until terminal outcome is reached or deadline elapsed). A Partial Exception is created; subsequent imports may complete the response (terminal `on_time` is no longer reachable once deadline elapses; terminal outcome becomes `late`).
- `outcome_history` — append-only record of every outcome transition with timestamp, prior outcome, new outcome, triggering event, audit reference.
- `late_fulfillment_import_exception_references` — zero, one, or more Late Exception references attached during the Evaluation Record's lifecycle.
- `missing_fulfillment_import_exception_references` — zero or one Missing Exception reference (if a Missing Exception was opened and then later closed because a late import arrived, the reference is retained for audit).
- `partial_fulfillment_response_exception_references` — zero, one, or more Partial Exception references.
- `sla_reporting_reference` — stable identifier for downstream Analytics / Reporting consumption (future Cross-Module PR). Reference field only; not a separate entity.

**Lifecycle:**

- `pending` — created. Outcome may be `pending` or transient `partial`. No terminal evaluation yet.
- `evaluated` — terminal. Outcome is `on_time`, `late`, `missing`, or `partial-then-late`. No further state transitions occur.
- `evaluation_excused` — terminal. All Exceptions on this Evaluation Record have been overridden via SLA Override / Excuse Evidence; the SLA breach is excused. The `outcome` retains its evaluated value (`late`, `missing`, `partial`); the lifecycle indicates the breach is operationally excused.

**Severity priority (proposal-level):**

When multiple Exceptions exist on one suborder, the SLA Evaluation Record's `outcome` reflects the most-severe breach state. Proposal-level severity:

```
Late > Missing > Partial > On Time
```

This severity convention is proposal-level for PR-A and may be refined as existing Fulfillment / Returns severity patterns are aligned in a future PR. The Evaluation Record's `outcome_history` preserves every transition; downstream consumers should read both the current outcome and the history if they need full context.

**Audit:**

- `created_at`, `created_by`, `created_audit_reference`.
- `outcome_history` (above).
- `lifecycle_transition_history` — `pending → evaluated`, `pending → evaluation_excused`, `evaluated → evaluation_excused` with timestamps and audit references.

**Boundary preservation:**

- SLA Evaluation Record is Fulfillment-Returns-owned. Order Routing does not read or mutate it.
- SLA Evaluation Record does not mutate Vendor Export Delivery Evidence.
- SLA Evaluation Record does not assert vendor operational acceptance; it asserts only whether the vendor's fulfillment import arrived by the Expected Deadline.
- SLA Evaluation Record is created only for confirmed Vendor Export Delivery Evidence (`delivery_confirmation_state = confirmed`). Behavior for `unconfirmable`, `failed`, or `partial` Delivery Evidence is deferred to the Boundary/Handoff PR.

---

### Late Fulfillment Import Exception

**Status:** Entity. New in PR-A. Distinct from Missing and Partial.

**Owner:** Fulfillment / Returns.

**Purpose:** Created when a vendor's fulfillment import arrives *after* the Expected Fulfillment Response Deadline.

**Identity:**

- `late_fulfillment_import_exception_id` — canonical platform-assigned identifier. Stable.
- `sla_evaluation_reference` — the parent SLA Evaluation Record. Required.
- `suborder_reference` — the suborder. Required.
- `late_fulfillment_import_reference` — the late Fulfillment Import that triggered creation. Required.

**Captured fields:**

- `expected_deadline_at_creation` — snapshot of the SLA Evaluation Record's `expected_fulfillment_response_deadline` at the moment of Exception creation. Immutable.
- `received_at_creation` — snapshot of the Fulfillment Import Received Timestamp at the moment of Exception creation. Immutable.
- `delay_duration` — derived. The interval `received_at_creation - expected_deadline_at_creation`.

**SLA Breach Review State (state field on this entity):**

- `open` — initial state when the Exception is created. No review action yet.
- `under_review` — a System Admin (holding SLA Override Authority or equivalent existing Fulfillment / Returns review authority) has acknowledged the Exception and is investigating.
- `resolved` — terminal. The breach is acknowledged as a vendor SLA breach; no override is granted; operational outcome is recorded.
- `overridden` — terminal. The breach is excused via an SLA Override / Excuse Evidence record. The Override Evidence reference is recorded.
- `closed` — terminal. The Exception is closed without resolution or override (e.g., the import was a duplicate, the suborder was cancelled, or other operational reason). Closure is audit-evidenced.

State transitions are defined in `workflows.md` Workflow 9 (SLA Breach Review).

**Audit:**

- `created_at`, `created_by`, `created_audit_reference`.
- `state_transition_history` — append-only.
- `sla_breach_signal_reference` — when the Exception's creation raised a SLA Breach Signal event, the audit reference to that signal. PR-A names the signal at architecture level (`fulfillment-returns.sla-breach.signaled`) and contracts the shape at event-contract level; payload transport is deferred.

**Relationships:**

- A Late Exception belongs to exactly one SLA Evaluation Record.
- A Late Exception may have at most one SLA Override / Excuse Evidence reference (which, when present, indicates the `overridden` state).
- Multiple Late Exceptions may not exist on the same SLA Evaluation Record unless multiple distinct late imports occur (which is permitted for vendors that submit partial imports across days).

**Boundary preservation:**

- A Late Exception does not block fulfillment processing. The late import is still validated and processed by existing Fulfillment / Returns workflows; the Exception is about SLA, not about whether the import is operationally usable.
- A Late Exception does not mutate Order Routing state.
- A Late Exception's resolution does not produce Order Routing events.

---

### Missing Fulfillment Import Exception

**Status:** Entity. New in PR-A. Distinct from Late and Partial.

**Owner:** Fulfillment / Returns.

**Purpose:** Created when the Expected Fulfillment Response Deadline elapses without any fulfillment import arriving for the suborder.

**Identity:**

- `missing_fulfillment_import_exception_id` — canonical platform-assigned identifier. Stable.
- `sla_evaluation_reference` — the parent SLA Evaluation Record. Required.
- `suborder_reference` — the suborder. Required.

**Captured fields:**

- `expected_deadline_at_creation` — snapshot of the SLA Evaluation Record's `expected_fulfillment_response_deadline` at the moment of Exception creation. Immutable.
- `detected_at` — when the time-driven detection workflow identified the elapsed deadline.

**SLA Breach Review State (state field on this entity):**

Same enumeration as Late: `open`, `under_review`, `resolved`, `overridden`, `closed`.

**Late-import-after-Missing-Exception behavior (per Workflow 7):**

If a fulfillment import arrives for the suborder *after* a Missing Exception has been opened:

1. The Missing Exception transitions to `closed` with audit evidence indicating the reason (`late_import_arrived`). The Missing Exception's history is preserved.
2. A new Late Fulfillment Import Exception is created against the same SLA Evaluation Record.
3. The SLA Evaluation Record's `outcome` transitions from `missing` to `late`; the `outcome_history` preserves both.
4. Both Exception histories are preserved.

**Audit:**

Same shape as Late Exception (`created_at`, `created_by`, `created_audit_reference`, `state_transition_history`, `sla_breach_signal_reference`).

**Relationships:**

- A Missing Exception belongs to exactly one SLA Evaluation Record.
- At most one Missing Exception per SLA Evaluation Record (a missing import that later arrives is closed and a Late Exception is opened — Missing is not reopened).

**Boundary preservation:**

- A Missing Exception does not block any subsequent fulfillment processing. If a late import arrives, the late import is processed normally.
- A Missing Exception does not mutate Order Routing state.

---

### Partial Fulfillment Response Exception

**Status:** Entity. New in PR-A. Distinct from Late and Missing.

**Owner:** Fulfillment / Returns.

**Purpose:** Created when a fulfillment import arrives by the Expected Fulfillment Response Deadline but covers only some of the suborder's lines (given the SLA Policy's complete-response definition).

**Identity:**

- `partial_fulfillment_response_exception_id` — canonical platform-assigned identifier. Stable.
- `sla_evaluation_reference` — the parent SLA Evaluation Record. Required.
- `suborder_reference` — the suborder. Required.
- `partial_fulfillment_import_references` — the Fulfillment Import(s) that comprised the partial response. Required.

**Captured fields:**

- `expected_deadline_at_creation`.
- `received_at_creation`.
- `lines_covered_at_creation` — references to suborder lines covered by the partial response at the moment of Exception creation.
- `lines_missing_at_creation` — references to suborder lines not yet covered.

**SLA Breach Review State (state field on this entity):**

Same enumeration as Late and Missing.

**Subsequent imports:**

- If subsequent fulfillment imports complete the response *before* the Expected Deadline, the Partial Exception transitions to `resolved` with audit evidence indicating the completion.
- If subsequent imports arrive *after* the Expected Deadline (whether completing or further partial), a Late Exception is also created. The Partial Exception remains in its current state until reviewed; multiple Exceptions per suborder are permitted (per PR-A confirmed scope decision 7).

**Audit:**

Same shape as Late and Missing.

**Relationships:**

- A Partial Exception belongs to exactly one SLA Evaluation Record.
- Multiple Partial Exceptions may exist per SLA Evaluation Record if distinct partial windows occur (rare but architecturally permitted).

**Boundary preservation:**

- A Partial Exception does not block fulfillment processing of the partial content.
- A Partial Exception's resolution does not require all suborder lines to be covered — only that the operational reviewer has determined the partial is acceptable (e.g., the missing lines are pending RAN, the missing lines have been cancelled, etc.).

---

### SLA Override / Excuse Evidence

**Status:** Entity. New in PR-A. Immutable.

**Owner:** Fulfillment / Returns.

**Purpose:** Audit-bearing record of a CIXCI System Admin (or authorized actor) deciding that an SLA breach (Late, Missing, or Partial) is excused. Carries actor, timestamp, affected Exception reference, reason category, reason text, supporting evidence reference, audit reference.

**Identity:**

- `sla_override_excuse_evidence_id` — canonical platform-assigned identifier. Stable.
- `affected_exception_reference` — the Late, Missing, or Partial Exception being overridden. Required.

**Content:**

- `actor_reference` — who created the Override Evidence. Required. Must hold SLA Override Authority (see `permissions.md`).
- `created_at` — timestamp. Required.
- `reason_category` — proposal-level enumeration; final enumeration is a business / product decision (per PR-A OQ A):
  - `vendor_confirmed_outage` — vendor confirmed an operational disruption.
  - `cixci_infrastructure_outage` — CIXCI platform / Integration Management issue confirmed.
  - `force_majeure` — external event (natural disaster, regional outage).
  - `dispute_pending` — vendor disputes the SLA breach and resolution is pending.
  - `other_evidenced` — operationally evidenced reason not in the standard set.
- `reason_text` — freeform text. Required. Captures the specific reasoning.
- `supporting_evidence_reference` — reference to supporting documentation (ticket reference, vendor communication reference, internal investigation reference). Optional but strongly recommended.
- `audit_reference` — platform audit reference produced at creation.

**Immutability:**

- An SLA Override / Excuse Evidence record is **immutable after creation.** No field may be edited.
- Reversal of an override requires a **new reversing SLA Override / Excuse Evidence record** that references the prior record and indicates `reason_category = override_reversal`. The prior record remains immutable in audit history.

**Effect on Exception state:**

- Creating an Override Evidence record transitions the affected Exception to `overridden`.
- Creating a reversing Override Evidence record transitions the affected Exception from `overridden` back to `under_review` (the reviewer must decide the new state).
- The Exception's `state_transition_history` records each transition with the relevant Override Evidence reference.

**Effect on SLA Evaluation Record:**

- When all Exceptions on an SLA Evaluation Record are in `overridden` or `resolved` state, the Evaluation Record lifecycle transitions from `evaluated` to `evaluation_excused`.
- If a reversing Override Evidence is created and at least one Exception returns to `under_review`, the Evaluation Record returns to `evaluated`.

**Authority:**

- Only actors holding SLA Override Authority (per `permissions.md`) may create or reverse SLA Override / Excuse Evidence.
- Vendor users cannot create SLA Override / Excuse Evidence. PR-A explicitly excludes vendor self-override.
- Missing authority and missing audit evidence are distinct failure cases: missing authority is `SLA_OVERRIDE_AUTHORITY_REQUIRED`; missing audit evidence on an authorized override is `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING`. These are not mixed.

**Audit:**

The Override Evidence record itself is audit. Every creation produces a Logs & Audit reference. Reversal produces a separate audit reference; the prior record remains.

**Boundary preservation:**

- Override Evidence is Fulfillment-Returns-owned.
- Override Evidence does not mutate Order Routing state, Integration Management state, Notification Platform state, or any external module's state.
- Override Evidence does not produce vendor-facing notifications directly; if vendors are to be notified of overrides, that is Notification Platform Service / Cross-Module PR territory.

---

### Fulfillment Import Received Timestamp — field addition

**Status:** Field on the existing **Fulfillment Import** entity. Not a new entity.

**Owner:** Fulfillment / Returns (entity owner; PR-A adds the field).

**Definition:**

- `fulfillment_import_received_timestamp` — the **transport receipt time** of the fulfillment import payload, as reported by Integration Management. Captured by Workflow 4 (Fulfillment Import Received Timestamp Capture).
- This is the SLA-relevant timestamp. SLA evaluation in Workflow 5 compares this to the SLA Evaluation Record's `expected_fulfillment_response_deadline`.
- It is **not** the post-validation acceptance time. It is **not** the time at which Fulfillment / Returns finished row-level validation. Validation timing is captured by existing Fulfillment / Returns validation workflows on the Fulfillment Import entity, not by this field.

**Semantic constraint:**

- The timestamp is captured from the first transport receipt of the import payload. Row-level validity is evaluated separately by Fulfillment / Returns validation workflows.
- If the import is received on time but invalid, the SLA response is considered received for SLA purposes; the invalid import still produces or links to existing Fulfillment / Returns import validation exceptions per existing validation rules. **A malformed on-time file does not silently count as successful fulfillment completion** — it is on-time for SLA, but separately exception-bearing for validation.

**Audit:**

- Captured per Workflow 4 with the Integration Management transport receipt as the source.
- The Fulfillment Import entity's existing audit trail captures the transport receipt event.

**Boundary preservation:**

- The transport receipt timestamp is Integration-Management-reported. Fulfillment / Returns captures it; Integration Management owns transport.
- The timestamp is not synthesized from validation results; it is the unmodified transport receipt.

---

### SLA Breach Signal — concept, not entity

PR-A defines the **SLA Breach Signal** at architecture level. It is a one-way signal raised when an Exception (Late, Missing, or Partial) is created. It is not an entity; it is an event-level concept that downstream consumers (future Cross-Module Summary Email PR and future Notification Platform Service routing) consume read-only.

PR-A's `events.md` names the signal (`fulfillment-returns.sla-breach.signaled`). PR-A's `event-contracts.md` describes the contract shape at architecture level. PR-A does **not**:

- Specify event transport semantics.
- Specify idempotency / replay / ordering behavior.
- Specify who receives the signal.
- Specify how the signal becomes a notification (email, Slack, page).

These are deferred to the Boundary/Handoff PR (for transport semantics) and the Cross-Module Summary Email PR (for delivery / aggregation).

---

### SLA Reporting Reference — reference field

PR-A introduces `sla_reporting_reference` as a stable identifier field on the SLA Evaluation Record. Analytics / Reporting (future Cross-Module Summary Email PR or a future Analytics PR) consumes this reference to identify SLA evaluations in aggregations and dashboards.

It is **not** a separate entity. It is a reference field that participates in cross-module identification without exposing internal Fulfillment / Returns lifecycle details.

---

### What PR-A does NOT add to data-model.md

- **Does not add a generic "Fulfillment Import Exception" parent entity.** Late, Missing, and Partial are three distinct entities per scoping decision 2.
- **Does not add an SLA Reporting entity.** Reporting reference is a field.
- **Does not add an Expected Deadline entity.** It is a field on the SLA Evaluation Record.
- **Does not add a Same-Day Response Deadline or Next-Business-Day Response Deadline entity.** They are configuration fields on the SLA Policy.
- **Does not add a Fulfillment Import Received Timestamp entity.** It is a field on the existing Fulfillment Import entity.
- **Does not add an SLA Breach Review State entity.** It is a state field on each Exception entity.
- **Does not add an SLA Breach Signal entity.** It is an event-level concept.
- **Does not modify existing baseline entities** (Fulfillment Import beyond the field addition, Shipment Line, Tracking, Shipment Status, returns entities, replacement shipment, buyer update-ready signals). All existing entity definitions remain unchanged.
- **Does not introduce vendor operational acceptance modeling.** Per PR #91, confirmed export delivery does not assert vendor acceptance; PR-A respects this boundary.
- **Does not introduce Order Routing entities.** PR-A consumes Vendor Export Delivery Evidence read-only via reference; it does not redefine the entity.
- **Does not introduce buyer-update entities.** Buyer update hardening is Fulfillment / Returns PR-B.
- **Does not introduce delivery date entities.** Delivery date hardening is Fulfillment / Returns PR-B.
- **Does not introduce invoice / refund / payment / pricing entities.** Out of PR-A scope.
- **Does not introduce notification / summary email entities.** Out of PR-A scope.
- **Does not introduce analytics aggregation entities.** Out of PR-A scope.

## Cross-Module Handoff Entity (Boundary/Handoff PR)

This section adds the **Cross-Module Handoff Record** entity. The Handoff Record is the Fulfillment / Returns-owned record that one specific confirmed Vendor Export Delivery Evidence (Order Routing, PR #91) has been observed and acted upon by a Fulfillment / Returns consumer scope. It makes consumption observable, replayable, and idempotent without mutating Order Routing state.

The Handoff Record is the seam between Order Routing's Vendor Export Delivery Evidence (producer) and the Fulfillment / Returns SLA Evaluation Record (consumer). It is not a snapshot of source evidence; it carries references only.

#### Boundary discipline reaffirmed

- The Handoff Record is **Fulfillment / Returns-owned.**
- Source Vendor Export Delivery Evidence remains Order Routing-owned and is referenced read-only.
- The Handoff Record treats Order Routing state as read-only under every path.
- The Handoff Record does not embed or copy source evidence payloads; only reference fields point at source evidence.
- Late / Missing / Partial Exception creation remains outside the Handoff Record. SLA Evaluation Record creation and downstream Exception creation (PR #92) remain workflow-driven and Fulfillment / Returns-owned.
- Confirmed source Delivery Evidence asserts only transport-layer confirmation per PR #91; it does not assert vendor operational acceptance. The Handoff Record preserves this distinction and does not assert acceptance.
- The Handoff Record is not vendor-self-service-visible in Phase 1.

### Cross-Module Handoff Record

**Purpose:** Per-consumer-scope record that one specific source Vendor Export Delivery Evidence has been observed by Fulfillment / Returns. Captures consumption lifecycle, idempotency key, eligibility decision, source evidence reference, audit join. Phase 1 supports one consumer scope (`fulfillment-returns.sla-evaluation`); the entity is designed to support additional consumer scopes in future PRs without contract changes.

**Lifecycle states (Confirmed Delivery Evidence Consumption State):**

- `pending` - Handoff Record created upon observation of a source event; consumption attempt in flight. Eligibility decision pending or being evaluated.
- `consumed` - Source event observed, eligibility passed, SLA Evaluation Record (PR #92) created and bound by reference. Terminal for the happy path.
- `replay_acknowledged` - Audit-only acknowledgement attached to an existing Handoff Record when a duplicate source event is observed. **Not a destructive state transition.** A Handoff Record in `consumed` state remains in `consumed`; replay acknowledgements are recorded as audit references on the existing record and do not replace the canonical state.
- `consumption_skipped` - Eligibility failed (no active SLA Policy, out-of-scope vendor/route, source evidence non-`confirmed` with `failed` or `unconfirmable` mapping). No SLA Evaluation Record created. Terminal.
- `consumption_failed` - Transient consumer-side failure during consumption (e.g., dependency lookup error). Retry from `consumption_failed -> pending` permitted; retry policy itself is Integration Management's. Non-terminal.
- `consumption_held` - Source Delivery Evidence is in `partial` state per PR #91. Phase 1 does not start SLA clock from partial delivery. No SLA Evaluation Record created. Audit reference recorded. Terminal in Phase 1; future SLA Policy may opt into partial-delivery-starts-clock semantics in a later PR (out of scope here).

**State transition discipline:**

- Once `consumed`, a Handoff Record does not transition out of `consumed`. Subsequent duplicate source events produce `replay_acknowledged` audit entries on the existing record.
- Once `consumption_skipped`, the record does not transition out of `consumption_skipped`. Subsequent duplicate source events produce audit entries.
- Once `consumption_held`, the record does not transition out of `consumption_held` in Phase 1. (A re-export per PR #91 produces a new source Vendor Export Delivery Evidence, which produces a new Handoff Record via Workflow A; the prior held record remains held.)
- `consumption_failed` is non-terminal and may transition back to `pending` for retry.
- Replay of any event for a record in any state is recorded as audit; it does not replace the canonical state.

**Fields and references:**

- `cross_module_handoff_record_reference` - stable identifier for the Handoff Record.
- `consumer_scope_reference` - Phase 1 value: `fulfillment-returns.sla-evaluation`. The field is structured to allow additional consumer scopes in future PRs.
- `handoff_idempotency_key` - deterministic key derived from `vendor_export_delivery_evidence_reference` (Order Routing, PR #91) plus `consumer_scope_reference`. Used to detect duplicate observation of the same source event for the same consumer scope. Stable for the lifetime of the source Delivery Evidence per PR #91's terminal-after-confirmed invariant.
- `source_evidence_snapshot_reference` - reference-only field identifying the source evidence version/state that was consumed. **Not a copied source-evidence payload.** Refers to the Order Routing Vendor Export Delivery Evidence at the moment of observation (`delivery_confirmation_state` at that point, plus the `vendor_export_delivery_evidence_reference`, plus any version anchor PR #91 makes stable). The reference does not embed source content; reading the source requires reading Order Routing's record by reference.
- `confirmed_delivery_evidence_consumption_state` - the lifecycle state above.
- `handoff_eligibility_decision_reference` - reference to the eligibility evaluation rationale (audit entry capturing why the Handoff Record landed in its current state). Required for every state except `pending`.
- `handoff_failure_retry_reference` - optional reference field. When non-null, points to the most recent failed consumption attempt's audit record. Retry policy itself is Integration Management's; this field records that retries occurred and where to find their audit trail.
- `bound_sla_evaluation_record_reference` - optional reference to the SLA Evaluation Record (PR #92) created upon `consumed` state. Null in any non-`consumed` state.
- `handoff_audit_reference` - reference to the audit-trail join entry capturing source event ID, source Delivery Evidence reference, consumer scope, idempotency key, eligibility decision, and (if `consumed`) the bound SLA Evaluation Record reference.
- `state_transition_history` - append-only record of `confirmed_delivery_evidence_consumption_state` transitions, each with timestamp, prior state, new state, audit reference, and reason reference. Replay acknowledgements are recorded as audit references on the latest transition, not as new transitions.
- `observed_source_event_reference` - reference to the source event (`order-routing.export-delivery-evidence.confirmed`, `.failed`, or - if PR #91 publishes them - events related to `partial` / `unconfirmable` source states) that produced the Handoff Record. For replay-acknowledged audit entries, additional references are appended to the audit log, not to this primary reference.
- `tenant_scope_reference` - Tenant-Company-scoped reference identifying the tenant the source Delivery Evidence belongs to. Used for `check_access` on read paths and Logs & Audit retention scoping.

**Uniqueness invariant:**

For a given (`handoff_idempotency_key`, `consumer_scope_reference`) pair, at most one Handoff Record exists. Duplicate source-event observation resolves to the existing record per Workflow A.

**Immutability invariant:**

- The `handoff_idempotency_key`, `source_evidence_snapshot_reference`, `observed_source_event_reference`, `consumer_scope_reference`, and `tenant_scope_reference` fields are written on record creation and not modified afterward.
- `confirmed_delivery_evidence_consumption_state` transitions follow the discipline above; terminal states are not reversed.
- `state_transition_history` is append-only.

**What the Handoff Record does not do:**

- Does not mutate Order Routing's Vendor Export Delivery Evidence under any path.
- Does not modify Order Routing's `delivery_confirmation_state`, `export_review_required_state`, or any other Order Routing field.
- Does not assert vendor operational acceptance; confirmed source delivery is a transport-layer fact per PR #91 and the Handoff Record preserves that framing.
- Does not produce events Order Routing consumes.
- Does not create SLA Exceptions directly (Late / Missing / Partial Exceptions remain workflow-driven from the SLA Evaluation Record per PR #92).
- Does not start an SLA clock when source Delivery Evidence is non-`confirmed`. Phase 1 mapping per Workflow B: `partial -> consumption_held`, `failed -> consumption_skipped`, `unconfirmable -> consumption_skipped`.
- Does not re-evaluate eligibility on replay. The original eligibility decision is honored; replay is audit-acknowledged.
- Does not expose vendor-self-service interfaces in Phase 1.
- Does not encode SLA Policy logic. SLA Policy lookup is via reference into Fulfillment / Returns PR #92 entities; the lookup result is captured at consumption time and frozen on the Handoff Record's eligibility decision reference.

#### Field additions to existing entities

The Boundary/Handoff PR introduces no fields on PR #91 Order Routing entities and no fields on PR #92 Fulfillment / Returns entities beyond what already exists. SLA Evaluation Record (PR #92) already carries `vendor_export_delivery_evidence_reference`; the Handoff Record adds a back-reference (`bound_sla_evaluation_record_reference`) on its own side. PR #92's existing forward reference is not modified.

If a future PR wants the SLA Evaluation Record to carry a back-reference to its Handoff Record, that addition is out of scope here and lives in a future Fulfillment / Returns hardening PR.

#### Source Evidence Snapshot Reference - wording discipline

The term "snapshot reference" is deliberate to distinguish reference-by-identity (what this PR introduces) from snapshot-by-copy (which is not introduced). The Source Evidence Snapshot Reference identifies which source evidence version / state was consumed; it does not copy source payload into Fulfillment / Returns. Reading the source's content requires reading Order Routing's record by reference.

#### Non-collapsible state chain reaffirmed

Per PR #91 and PR #92, the cross-module state chain is non-collapsible. The Boundary/Handoff PR reaffirms the chain and adds one new link:
## Delivery Date and Buyer Update Entities (PR-B)

This section introduces three new entities and supporting field/state/reference extensions for the Fulfillment / Returns delivery-date and buyer-update hardening pass (PR-B). All concepts are additive. Existing Fulfillment Import, Shipment Line, Tracking, Shipment Status, returns, and replacement entities remain unchanged by this PR.

### Boundary discipline reaffirmed

- Fulfillment / Returns owns Delivery Date Evidence, Delivered Shipment Evidence (as field extensions on existing Shipment Line), Delivery Date Correction Evidence, and Buyer Update-Ready Signal.
- Integration Management owns buyer-update transport mechanics, dispatch attempts, acknowledgement records, and failure records. Fulfillment / Returns carries the corresponding references but does not own the underlying Integration Management records.
- Logs & Audit owns immutable retention. Fulfillment / Returns produces audit references; Logs & Audit retains.
- Tenant Company owns buyer scope, vendor scope, and `check_access` patterns. Fulfillment / Returns reads these by reference; never mutates.
- Order Routing entities (PR #91), Cross-Module Handoff Records (PR #93), and SLA Evaluation Records (PR #92) are not modified by this PR. PR-B layers on top of existing Fulfillment / Returns shipment-line state.
- Notification Platform Service is not in scope for buyer-update transport in this PR.
- Analytics / Reporting is a future consumer, not an owner of operational state in this PR.

### PR #92 SLA-semantics preservation invariant

PR-B reaffirms PR #92's invariant: the Fulfillment Import Received Timestamp captured at transport receipt remains the SLA-relevant timestamp. Delivery Date validation outcomes produced by PR-B (whether `accepted` or one of several rejection outcomes) do not retroactively alter PR #92's SLA Evaluation Record outcome. A vendor that submitted a fulfillment import on time but whose Delivery Date field fails validation remains on-time for SLA purposes; the invalid Delivery Date content is separately rejected for shipment / delivery evidence purposes. Invalid content does not silently become valid shipment or delivery evidence, and valid SLA timing does not silently become invalid because of content validation outcomes.

### Source-agnostic naming for future evidence sources

Delivery Date Evidence is named source-agnostically to anticipate future carrier-originated evidence as an alternate source. Phase 1 sources are vendor-submitted only (Fulfillment Imports). The entity carries a source reference that names the originating record type; future carrier-integration PRs may extend the enumeration without breaking the Phase 1 contract. PR-B does not introduce carrier evidence ingestion, carrier-vs-vendor conflict resolution, or carrier-confirmed delivery precedence rules; those are future-phase concerns.

### Non-collapsible state chain

The chain that PR-B introduces is:

Vendor Fulfillment Import (existing, transport-receipt timestamp owned by PR #92 semantics)
  -> Delivery Date Evidence (PR-B, validation outcome captured)
  -> Delivered Shipment Evidence (PR-B, field extensions on existing Shipment Line; only when validation outcome is `accepted`)
  -> Buyer Update-Ready Signal (PR-B, with `update_kind` discriminator; eligibility and hold state captured)
  -> Integration Management dispatch (referenced read-only; not owned by Fulfillment / Returns)
  -> Buyer Update Acknowledgement / Failure (referenced read-only; not owned by Fulfillment / Returns)

Delivery Date Correction Evidence is a parallel chain initiated only when a Delivery Date update for a Shipment Line already in Delivered state is submitted; it produces new Delivery Date Evidence and supersedes prior, with both records preserved. Correction may also produce a new Buyer Update-Ready Signal with `update_kind = correction` if the buyer was previously updated for the same Shipment Line.

This chain is non-collapsible. Each link records a distinct architectural fact and is independently auditable. Skipping any link is a violation of PR-B's discipline.

---

### Delivery Date Evidence

The authoritative per-shipment-line record that a Delivery Date was reported by the vendor (or a future evidence source), validated against PR-B's validation rules, and accepted or rejected. The entity is immutable once terminal; corrections produce new Delivery Date Correction Evidence records and new Delivery Date Evidence records.

**Ownership:** Fulfillment / Returns.

**Identity:** referenced via `delivery_date_evidence_reference` from Shipment Line (when accepted) and from Delivery Date Correction Evidence (when superseded or replaced).

**Lifecycle states (proposal-level):**

- `pending` - validation in flight after Workflow 1 created the record.
- `accepted` - terminal; validated successfully; Workflow 3 (Shipment Status Evidence Update) may proceed.
- `rejected_invalid_format` - terminal; Delivery Date value not parseable as a date.
- `rejected_before_shipped` - terminal; Delivery Date precedes Shipped Date.
- `rejected_before_order_creation` - terminal; Delivery Date precedes order or suborder creation date.
- `rejected_before_tracking_evidence` - terminal; Delivery Date precedes the earliest tracking-evidence timestamp where tracking evidence exists.
- `rejected_stale` - terminal; Delivery Date is older than the existing accepted Delivery Date Evidence for the same Shipment Line.
- `rejected_duplicate` - terminal; exact-match prior accepted Delivery Date Evidence exists for the same Shipment Line; idempotent acknowledgement recorded.
- `rejected_regression_without_authority` - terminal; the Shipment Line is already in Delivered state and the update would regress it without Delivery Date Override / Correction Authority.
- `superseded` - terminal; replaced by a newer accepted Delivery Date Evidence record produced by an applied Delivery Date Correction Evidence.

Terminal-once means the lifecycle state does not transition further. Re-evaluation of the same source value produces audit but does not transition.

**Required fields and references (proposal-level):**

- `delivery_date_evidence_reference` - canonical identifier.
- `source_reference_type` - enumeration; Phase 1 value is `vendor_fulfillment_import`. Future PRs may add `carrier_tracking_evidence` or others.
- `source_reference` - identifier of the source record (the Fulfillment Import in Phase 1).
- `shipment_line_reference` - the affected Shipment Line.
- `reported_delivery_date` - the Delivery Date value as reported, before validation.
- `validation_result` - the lifecycle state above acting as a validation outcome.
- `validation_rule_failure_reference` - optional reference to the specific validation rule that produced a rejection outcome (for audit clarity when multiple rules could apply).
- `superseded_by_reference` - optional reference to the replacement Delivery Date Evidence record when this record reaches `superseded` state.
- `audit_reference` - Logs & Audit retention reference.
- `created_at` and `updated_at` - record-management timestamps; reaching terminal state freezes `updated_at`.

**Boundary discipline:**

- Delivery Date Evidence does not embed the source Fulfillment Import payload; it carries `source_reference` only.
- Delivery Date Evidence does not mutate Shipment Line directly; Workflow 3 (Shipment Status Evidence Update) is the explicit transition path when the validation outcome is `accepted`.
- Delivery Date Evidence does not produce or modify SLA Evaluation Records or Exceptions (PR #92's domain).
- Delivery Date Evidence does not produce Order Routing events or modify Order Routing records.
- Delivery Date Evidence is immutable once terminal. Subsequent updates create new records via Delivery Date Correction Evidence.
- A `rejected_duplicate` outcome is an idempotent acknowledgement, not an error; no new Buyer Update-Ready Signal is produced. The duplicate is recorded for audit clarity.
- Vendor users cannot directly create Delivery Date Evidence in `accepted` state; acceptance is the outcome of Workflow 2 (Delivery Date Validation), never a vendor self-assertion.

---

### Delivered Shipment Evidence (field extensions on existing Shipment Line)

PR-B does not introduce a Delivered Shipment Evidence entity. Instead, it extends the existing Shipment Line entity (which is established baseline content) with field references that record the Delivered-state evidence.

**Field additions to existing Shipment Line:**

- `delivered_shipment_evidence_reference` - reference to the Delivery Date Evidence record that triggered Delivered state. Optional; null until accepted Delivery Date Evidence transitions the Shipment Line to Delivered.
- `delivered_at_timestamp` - the validated Delivery Date value from the referenced Delivery Date Evidence. Optional; null until Delivered state is reached.

**Boundary discipline:**

- Delivered state must not be set without an accepted Delivery Date Evidence. The reference and timestamp are populated together by Workflow 3, atomically with the Shipment Status transition to delivered.
- Existing Shipment Line fields, existing Shipment Status lifecycle states, and existing tracking-evidence fields are not redefined by PR-B; they remain owned by the established baseline.
- A Delivery Date Correction Evidence in `applied` state replaces `delivered_shipment_evidence_reference` and updates `delivered_at_timestamp` to point to the new Delivery Date Evidence. The prior Delivery Date Evidence record transitions to `superseded` but is preserved.

---

### Delivery Date Correction Evidence

An immutable audit-bearing entity recording corrections to Delivery Date Evidence after the affected Shipment Line has reached Delivered state. Correction is authority-gated; vendor users cannot self-correct Delivery Date after Delivered state in Phase 1.

**Ownership:** Fulfillment / Returns.

**Identity:** referenced via `delivery_date_correction_evidence_reference` from the new Delivery Date Evidence record produced by application, and from audit material.

**Lifecycle states (proposal-level):**

- `proposed` - created; awaiting authority validation and content validation.
- `applied` - terminal; authority verified; new Delivery Date Evidence created in `accepted` state; prior Delivery Date Evidence transitioned to `superseded`; Shipment Line `delivered_shipment_evidence_reference` and `delivered_at_timestamp` updated.
- `rejected` - terminal; either authority absent or content invalid. The prior Delivery Date Evidence and Shipment Line state are unchanged.

**Required fields and references (proposal-level):**

- `delivery_date_correction_evidence_reference` - canonical identifier.
- `actor_reference` - identity of the CIXCI System Admin (or other authorized actor) submitting the correction.
- `correction_timestamp` - moment the correction was submitted.
- `prior_delivery_date_evidence_reference` - reference to the Delivery Date Evidence being superseded.
- `corrected_delivery_date_value` - the new Delivery Date value the correction asserts.
- `reason_category` - enumeration; Phase 1 starter set may include `data_entry_error`, `carrier_dispute`, `vendor_correction`, `cixci_correction`, `force_majeure_date_change`. Specific enumeration finalized during bundle review.
- `reason_text` - free-text rationale.
- `supporting_evidence_reference` - optional reference to supporting documentation (ticket reference, external evidence record, vendor confirmation reference). Reference only; PR-B does not embed external content.
- `authority_reference` - reference to the Tenant Company `check_access` result that authorized the correction. Distinguishes authority presence from supporting evidence presence.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- Delivery Date Correction Evidence is immutable once created. Reversal of a prior correction requires a new Delivery Date Correction Evidence record that points back to the prior correction and the pre-correction state.
- Prior Delivery Date Evidence is never edited in place. The correction creates a new Delivery Date Evidence record and supersedes the prior; both records are preserved for audit.
- Vendor users cannot self-create Delivery Date Correction Evidence. The authority gate is Tenant Company `check_access`; CIXCI System Admin holds the relevant authority in Phase 1.
- Missing authority and missing correction evidence are distinct failure cases (see permissions.md for `DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED` versus `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING`).
- Application of a correction may produce a new Buyer Update-Ready Signal with `update_kind = correction` if the buyer was previously updated for the affected Shipment Line. The new signal does not silently rewrite the historical buyer-update record; it is a controlled supersession of the prior delivery update with a new audit reference.
- If the buyer-update for the affected Shipment Line was not yet dispatched or acknowledged (still in `pending` or `held` state), correction supersedes the pending/held Buyer Update-Ready Signal in place via controlled state transition rather than silent mutation; the prior signal record transitions to `superseded`, and a new signal record is created.

---

### Buyer Update-Ready Signal

The authoritative record that a buyer-facing update is ready to be transported by Integration Management to the buyer's internal system. Buyer Update-Ready Signal records lifecycle independent of the Shipment Line; one signal record exists per relevant (parent order, update_kind) pair under Phase 1 multi-vendor aggregation rules.

**Ownership:** Fulfillment / Returns.

**Update-kind discriminator:**

- `shipment` - a buyer shipment update; produced when the parent order's Multi-Vendor / Multi-Suborder Buyer Update Rule's shipped-state condition is satisfied.
- `delivery` - a buyer delivery update; produced when the parent order's Multi-Vendor / Multi-Suborder Buyer Update Rule's delivered-state condition is satisfied.
- `correction` - a buyer correction update; produced when a Delivery Date Correction Evidence is applied for a Shipment Line where the buyer was previously updated.

This entity is intentionally single-entity with the `update_kind` discriminator. Splitting into separate Buyer Shipment Update-Ready and Buyer Delivery Update-Ready entities was considered and rejected: the lifecycle is identical across kinds, eligibility evaluation differs only by the source condition, and downstream consumers (future Cross-Module Summary Email PR, future Analytics) benefit from a single subscription surface.

**Lifecycle states (proposal-level):**

- `pending` - created; eligibility evaluation in flight.
- `held` - suppressed pending some condition; the Buyer Update Suppression / Hold State carries the reason.
- `eligible` - eligibility passes; awaiting Integration Management dispatch.
- `dispatched` - Integration Management has accepted the transport request; Buyer Update Dispatch Reference set.
- `acknowledged` - buyer system acknowledged receipt; Buyer Update Acknowledgement Reference set.
- `failed` - buyer system failed receipt or transport exhausted; Buyer Update Failure Reference set.
- `superseded` - replaced by a new Buyer Update-Ready Signal record (typically a correction-kind signal supersedes a prior delivery-kind signal for the same Shipment Line, or a controlled supersession during correction of a pending/held signal). The superseded record is preserved for audit.

**Required fields and references (proposal-level):**

- `buyer_update_ready_reference` - canonical identifier.
- `update_kind` - one of `shipment`, `delivery`, `correction`.
- `parent_order_reference` - the parent order this signal pertains to.
- `tenant_company_reference` - the Tenant Company / buyer scope.
- `buyer_integration_profile_reference` - reference to the Integration Management buyer integration profile that drives transport. Reference only; the profile itself is owned by Integration Management.
- `shipment_line_references` - the set of Shipment Line records the signal aggregates (one for `correction` kind targeting a single line; many for `shipment` and `delivery` kinds aggregating all vendor suborders under the all-vendors aggregation default).
- `triggering_delivery_date_evidence_reference` - optional; populated for `delivery` and `correction` kinds to identify the Delivery Date Evidence that triggered creation.
- `triggering_delivery_date_correction_evidence_reference` - optional; populated for `correction` kind only.
- `superseded_buyer_update_ready_reference` - optional; populated when this signal supersedes a prior signal (typical for `correction` kind).
- `buyer_update_suppression_hold_state` - the suppression / hold state field; see below.
- `buyer_update_dispatch_reference` - optional; reference to the Integration Management transport attempt.
- `buyer_update_acknowledgement_reference` - optional; reference to the Integration Management success outcome record.
- `buyer_update_failure_reference` - optional; reference to the Integration Management failure outcome record.
- `audit_reference` - Logs & Audit retention reference.

**Buyer Update Suppression / Hold State (state field on this entity):**

States and hold reasons:

- `not_held` - no hold; lifecycle proceeds normally to `eligible` if eligibility passes.
- `held_awaiting_all_vendors_shipped` - Phase 1 Multi-Vendor rule; one or more vendor suborders for the parent order have not yet reached shipped state.
- `held_awaiting_all_vendors_delivered` - Phase 1 Multi-Vendor rule; one or more vendor suborders for the parent order have not yet reached delivered state.
- `held_buyer_integration_paused` - Tenant Company-level pause flag is set for the buyer.
- `held_correction_under_review` - a Delivery Date Correction Evidence in `proposed` state affects a Shipment Line referenced by this signal.
- `held_tenant_scope_inactive` - the Tenant Company scope is inactive.
- `held_manual` - a System Admin has manually held the signal; requires authority.

Re-evaluation of hold occurs when the relevant condition changes (additional vendor suborder ships or delivers, buyer integration unpauses, correction resolves, manual hold lifts). Workflow 9 (Buyer Update Hold / Suppression Re-Evaluation) governs the transition path.

**Boundary discipline:**

- Buyer Update-Ready Signal does not mean the buyer update was delivered. `eligible` indicates Fulfillment / Returns has handed off responsibility to Integration Management; `dispatched` indicates Integration Management has accepted the request; `acknowledged` indicates the buyer system confirmed receipt. Each transition is independently observable and audited.
- Buyer Update-Ready Signal does not include the buyer-facing payload structure. Payload content, field selection, format, and per-buyer customization are buyer integration profile concerns owned by Integration Management.
- Buyer Update-Ready Signal does not transition `dispatched -> eligible` directly. A failed dispatch produces `failed` state; retry is Integration Management's call. Retry attempts produce new dispatch reference records but do not reset this signal's lifecycle state to `eligible` once it has transitioned to `dispatched`. If retry is required at the architectural level (rather than at the transport level), a new Buyer Update-Ready Signal is produced via correction or controlled supersession.
- Buyer Update-Ready Signal does not aggregate across distinct Tenant Company scopes. A parent order belongs to one Tenant Company scope; all aggregation is within that scope.
- Vendor users cannot view, create, or transition Buyer Update-Ready Signal records in Phase 1. The signal is a CIXCI-internal facet exposed only to Integration Management (for transport handoff) and to System Admin (for operational review).

---

### Multi-Vendor / Multi-Suborder Buyer Update Rule (Phase 1 default)

Phase 1 default behavior:

- Buyer Update-Ready Signal of `update_kind = shipment` is held in `held_awaiting_all_vendors_shipped` state until all Shipment Lines / vendor suborders required for the parent order have reached shipped state.
- Buyer Update-Ready Signal of `update_kind = delivery` is held in `held_awaiting_all_vendors_delivered` state until all Shipment Lines / vendor suborders required for the parent order have reached delivered state.

The architecture leaves room for future per-buyer configurability through `buyer_integration_profile_reference`. A future Integration Management Buyer Integration Profile hardening PR may expose a per-buyer toggle that overrides the Phase 1 default. PR-B does not implement buyer-specific configuration behavior. PR-B's default is conservative and matches the prior multi-vendor shipping policy that buyer-facing updates should not be sent until all vendor suborders have reported the required shipping or delivery data.

Partial shipment and partial delivery are visible through held Buyer Update-Ready Signal records and their hold-reason values. PR-B does not silently omit partial states from operator visibility.

---

### Validation rule contract summary

The following contract rules govern Delivery Date validation outcomes and are operationalized by Workflow 2 (Delivery Date Validation):

- **Stale Delivery Update Rejection Rule:** a Delivery Date value older than the currently-accepted Delivery Date Evidence for the same Shipment Line is rejected with `rejected_stale`.
- **Duplicate Delivery Update Handling Rule:** a Delivery Date value exactly matching the currently-accepted Delivery Date Evidence for the same Shipment Line is recorded as `rejected_duplicate`; no new Buyer Update-Ready Signal is produced; the outcome is an idempotent acknowledgement.
- **Out-of-Order Shipment Update Handling Rule:** if a Shipped Date update arrives after a Shipment Line is already in Delivered state, the update is recorded for audit but does not regress the Delivered state. A new Buyer Update-Ready Signal is not produced for the regression attempt.

These rules are contract-level, not entity-level. Their effects are visible in Delivery Date Evidence's `validation_result` state and in audit references.

---

### Phase 1 vendor self-service exclusion

Phase 1 explicitly excludes vendor users from:

- Creating Delivery Date Correction Evidence for Shipment Lines in Delivered state.
- Transitioning Buyer Update-Ready Signal records.
- Overriding `rejected_*` validation outcomes.
- Creating Buyer Update-Ready Signal records in `held_manual` state or releasing manually-held signals.

Vendor users may submit Fulfillment Imports containing Delivery Date values; validation outcomes are produced by Workflow 2 without vendor approval. If a vendor disputes a `rejected_*` outcome, the dispute path routes through CIXCI System Admin review, potentially producing a Delivery Date Correction Evidence in `proposed` state.

---

### Field additions to existing Fulfillment Import entity (referential only)

PR-B references the existing Fulfillment Import entity as the `source_reference` for Delivery Date Evidence. PR-B does not add fields to Fulfillment Import; the existing fulfillment-import row-validation pattern is honored, and Delivery Date is one of several fields that may be present in an import row. Row-level validity for other fields (carrier, tracking number, shipped date, shipment status, fulfillment line reference) is evaluated by the existing baseline validation flow and is not redefined by PR-B.
