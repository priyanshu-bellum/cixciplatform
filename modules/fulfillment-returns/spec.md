# Fulfillment and Returns Specification

This document is proposal-level architecture. It defines the Fulfillment and Returns module shape without finalizing implementation behavior, vendor contracts, carrier integrations, return approval policy, refund behavior, or downstream ownership.

## Purpose

Fulfillment and Returns owns operational execution state after Order Routing requests fulfillment handling for routed suborders. The module records fulfillment handoff disposition, vendor/manufacturer fulfillment updates, shipment state, tracking references, return operational state, vendor return export/import workflows, return receipt evidence, return condition evidence, vendor return disposition evidence, replacement execution, and fulfillment/return exceptions.

Fulfillment and Returns is not the owner of routing decisions, pricing calculations, invoice lifecycle, refund execution, payment, notification delivery, integration transport, audit/file evidence, Product Catalog records, or Tenant Company permissions.

## Scope

### In Scope

- Consume fulfillment handoff requests, routed suborder references, export batch item references, and routing snapshots from Order Routing.
- Record fulfillment handoff acceptance, rejection, ignored state, duplicate blockers, and review-required dispositions.
- Track operational fulfillment execution, shipment records, shipment lines, package placeholders, tracking references, shipment evidence, shipment status history, and delivered evidence.
- Validate vendor fulfillment imports, API fulfillment updates, and manual fulfillment updates using module-owned business validation and the shared Import / Export / Validation Governance standard.
- Define locked order fields and editable fulfillment fields for vendor fulfillment updates.
- Track return operational state, vendor return export eligibility, return export batches/items, return import jobs, RAN matching, return receipt evidence, return condition evidence, and vendor return disposition evidence.
- Record vendor-provided refund/adjustment evidence as operational evidence only.
- Execute approved replacement shipment workflows where an owning warranty-support workflow provides an approved signal.
- Emit shipment, fulfillment import, return export/import, return disposition, replacement, buyer-update-ready, and exception events.

### Out of Scope

- Order Routing routing decisions, routed suborder creation, vendor export eligibility, vendor order export batch/item ownership, and fulfillment handoff request creation.
- Pricing calculation, pricing snapshots, adjustment pricing evidence, quote generation, commercial interpretation, and price variance interpretation.
- Invoice lifecycle, refund/credit/adjustment lifecycle, payment processing, settlement, reconciliation, or financial finality.
- Product Catalog, Device Catalog, Media, Tenant Company, Procurement, Launch/Event, Analytics, AI Agent Services, Warranty, Logs & Audit, Integration Management, and Notification Platform Service ownership.
- Carrier/provider callback receipt evidence and external delivery/transport evidence, which belong to Integration Management where applicable.
- Scheduled email delivery, notification templates, recipient resolution, notification history, and notification retries.
- Immutable file/import/export evidence and audit retention, which belong to Logs & Audit File Tracking.

## Ownership Boundary

Order Routing owns routing decisions, routed suborders, routing snapshots, vendor routed-suborder export eligibility, export batch/item references, and fulfillment handoff requests.

Fulfillment and Returns owns fulfillment handoff disposition, operational fulfillment state, shipment state, tracking references, shipped/delivered evidence, return operational state, return export/import workflows, return receipt evidence, return condition evidence, vendor return disposition evidence, replacement execution, and fulfillment/return exceptions.

Integration Management owns external delivery/receipt evidence, API/webhook/CSV/SFTP/manual transport evidence, carrier/provider callback receipt evidence, retries, provider failures, and external references.

Logs & Audit owns immutable audit/file evidence, import/export file tracking, validation outcome evidence, row counts, payload/file references, and retention.

Notification Platform Service owns scheduled email delivery, recipient delivery status, notification history, notification retries, and delivery evidence.

Pricing owns pricing snapshots, adjustment pricing evidence, and commercial interpretation. Invoice Management owns invoice/refund/credit/adjustment lifecycle. Tenant Company owns users, roles, company/entity scope, and permissions.

## Fulfillment Handoff Disposition

`order.routing.fulfillment-handoff.requested` is a request, not proof that Fulfillment and Returns accepted operational execution.

Fulfillment and Returns should record a Fulfillment Handoff Disposition with:

- Handoff request reference from Order Routing.
- Routed suborder reference.
- Routing snapshot reference.
- Source version.
- Accepted, rejected, ignored, duplicate-blocked, or review-required state.
- Applied vs ignored state.
- Rejection reason where applicable.
- Duplicate handoff blocker.
- Fulfillment/Returns source version.
- Audit reference.

Missing, duplicate, stale, ignored, or rejected disposition must not be treated as fulfilled, shipped, delivered, accepted, invoiced, or financially final.

## Vendor Fulfillment Import Governance

Vendor fulfillment imports update only operational fulfillment evidence. They must follow `architecture/standards/import-export-validation-governance.md` for mode selection, update-only protection, header validation, locked field protection, preview, confirmation, blank field protection, downloadable error report placeholders, audit evidence, UPC/text identifier preservation, and date/time governance.

Vendor fulfillment imports should be modeled as import jobs with validation, preview, confirmation, applied row counts, rejected rows, skipped rows, warning rows, correction/reupload references, and audit references.

Vendors may update only editable fulfillment fields. Locked order fields must reject, skip, or route rows to review according to source-module rules.

## Locked Order Fields

Vendor fulfillment imports must not mutate locked order/routing fields, including:

- Retailer or buyer reference.
- Customer shipping name/address fields where included in the export contract.
- Suborder reference.
- SKU.
- UPC.
- Quantity.
- Device delivery flag where present.
- Source export batch/item reference.
- Original order line references.

## Editable Fulfillment Fields

Vendor fulfillment imports may provide operational evidence for:

- Vendor confirmation number.
- Shipping carrier.
- Shipping tracking number.
- Custom tracking URL or tracking instructions for `Other` carrier.
- Shipped date.
- Delivered date.
- Package id placeholder.
- Shipment line id placeholder.
- Vendor notes placeholder.

Blank editable fields must not erase existing fulfillment evidence unless an explicit source-module clear behavior is defined and permissioned.

## Shipment Tracking

Fulfillment and Returns owns tracking references and shipment status history. Tracking URLs are delivery references, not source-of-truth shipment state.

Approved carrier placeholders are:

- USPS.
- UPS.
- FedEx.
- DHL.
- Other.

Carrier is required when tracking number or shipped date is provided. Tracking number is required when shipped date is provided. `Other` carrier requires a custom tracking URL or tracking instructions. Unsafe, malformed, stale, duplicate, or conflicting tracking references should route to review.

Integration Management owns external carrier/provider callback receipt evidence where applicable.

## Shipment Status Lifecycle

Proposal-level operational statuses:

- Pending.
- Processing.
- Partially Shipped.
- Shipped.
- Delivered.
- Exception.
- Cancelled.
- Review Required.

Shipment status updates should occur only after validated fulfillment evidence. Delivered evidence may later be consumed by Invoice Management, but Fulfillment and Returns does not create invoice state.

## Vendor Return Export Governance

Fulfillment and Returns owns operational return export content and return export eligibility for returns that vendors/manufacturers need to process. Logs & Audit owns file/export evidence. Integration Management or Notification Platform Service owns delivery depending on transport.

Return exports should support eligibility records, export batches, export batch items, buyer/retailer split references, schema version, inclusion rule version, export window, manual download references, re-export references, and audit references.

## Vendor Return Import Governance

Vendor return imports update only operational return processing evidence. They must follow `architecture/standards/import-export-validation-governance.md` for the same header, preview, confirmation, update-only, blank field, locked field, downloadable error report, audit, identifier, and date/time controls as fulfillment imports.

Return imports should validate RAN, source export batch/item, suborder, SKU, UPC, return line, quantity, chronology, condition, duplicate rows, and stale/out-of-order updates before apply.

## Locked Return Fields

Vendor return imports must not mutate locked return fields, including:

- Retailer or buyer reference.
- Suborder reference.
- RAN.
- Reason for return.
- Return initiation date.
- Return quantity.
- Vendor wholesale price snapshot reference or pricing snapshot reference.
- SKU.
- UPC.
- Source return export batch/item reference.

Vendor Wholesale Price or pricing snapshot values are evidence references, not editable pricing truth.

## Editable Return Fields

Vendor return imports may provide operational evidence for:

- Return received date.
- Return refunded amount as vendor-provided refund/adjustment evidence.
- Rejected reason.
- Partial refund reason.
- Return condition.
- Vendor notes.
- Return status where supported by source-module rules.

## Return Operational Disposition And Refund Evidence Boundary

Accepted, rejected, or partially accepted return logic is operational disposition, not financial approval.

Fulfillment and Returns may record vendor-provided refund/adjustment evidence. It must not decide refund execution, payment, credit, invoice adjustment, final financial settlement, or return-refunded financial finality unless a future ADR assigns that behavior.

Pricing owns pricing snapshot and adjustment pricing evidence. Invoice Management owns invoice/refund/credit/adjustment lifecycle. Fulfillment and Returns exposes operational evidence and references only.

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

Financial statuses such as Refund Approved, Refund Rejected, Partially Refunded, or Return Refunded should be modeled as external Invoice/Pricing evidence unless future ADR/module scope assigns Fulfillment ownership.

## Buyer Update Signals

Fulfillment and Returns emits shipment and return update events. Integration Management transports buyer system updates where configured. Notification Platform Service delivers user notifications where configured. Logs & Audit tracks evidence.

Signal examples:

- Shipment update ready for buyer transport.
- Return update ready for buyer transport.
- Shipment update transport failed reference.
- Return update transport failed reference.

Fulfillment and Returns does not own external delivery, notification delivery, scheduled email delivery, or transport retries.

## AI Agent Signals

Fulfillment and Returns may emit AI-ready signals for missing tracking, stale updates, duplicate fulfillment updates, return mismatches, RAN validation failures, high return rates, repeated vendor failure, and manual review backlog risk.

AI Agent Services may recommend corrections or review actions but must not mutate fulfillment/return state without approved action contracts, source-module authority, permissions, and audit evidence.

## Open Decision Areas

- Exact vendor fulfillment import headers and versioned CSV schema.
- Exact vendor return export/import headers and versioned CSV schema.
- Carrier-specific tracking number validation formats.
- Return condition taxonomy and operational disposition values.
- Which return financial evidence values are consumed by Pricing versus Invoice Management.
- Which buyer updates are API, webhook, CSV, SFTP, manual download/upload, or scheduled email flows.
- Which external carrier/provider callbacks are accepted through Integration Management at launch.

## Vendor Fulfillment Response SLA and Late/Missing Import Exceptions (PR-A)

PR-A introduces the **SLA evaluation layer** for vendor fulfillment responses. After Order Routing PR #91 established the producer-side Vendor Export Delivery Evidence record, PR-A defines the consumer-side Fulfillment / Returns evaluation: how Fulfillment / Returns determines whether a vendor responded on time with shipment/tracking information after receiving an export, and what happens when they don't.

This is proposal-level architecture. PR-A does not modify code, schema, migrations, runtime files, or OpenAPI schemas. PR-A adds architecture-level API contract placeholders to `modules/fulfillment-returns/api-contracts.md`; it does not define finalized API implementations, OpenAPI schemas, concrete URL paths, or runtime endpoint behavior. PR-A does not modify any file in Order Routing, Integration Management, Notification Platform Service, Tenant Company, Logs & Audit, Analytics / Reporting, Invoice Management, Pricing, Product Catalog, or Device Catalog.

### Core entities introduced

- **Vendor Fulfillment Response SLA Policy** — per-vendor (or per-vendor-per-route) policy carrying the SLA clock-start basis, same-day cutoff, same-day response deadline, next-business-day response deadline, business calendar reference, complete-response definition, and override-allowed flag. Lifecycle: `draft`, `active`, `superseded`, `retired`. Edits produce new versions. (`data-model.md`)
- **SLA Evaluation Record** — per-suborder-per-response authoritative record of SLA evaluation. Created when a confirmed Vendor Export Delivery Evidence is consumed read-only from Order Routing. Carries Expected Fulfillment Response Deadline, Policy version, outcome, Exception references, SLA Reporting Reference. (`data-model.md`)
- **Late Fulfillment Import Exception** — created when a vendor's fulfillment import arrives after Expected Deadline. (`data-model.md`)
- **Missing Fulfillment Import Exception** — created when Expected Deadline elapses with no fulfillment import. If a late import subsequently arrives, the Missing Exception is closed (audit-evidenced) and a Late Exception is created — Missing is not mutated into Late. (`data-model.md`)
- **Partial Fulfillment Response Exception** — created when an on-time fulfillment import covers only some of the suborder lines. Subsequent imports may complete (resolves the Partial) or arrive late (additional Late Exception). (`data-model.md`)
- **SLA Override / Excuse Evidence** — immutable, audit-bearing record excusing an SLA breach. Reversal requires a new reversing record. Vendor users cannot self-create. (`data-model.md`)

### Concept-only references and field additions

- `business_calendar_reference` on SLA Policy — reference into a Tenant-Company-owned (or future-platform-owned) business calendar. Fulfillment / Returns does not own the calendar.
- `vendor_export_delivery_evidence_reference` on SLA Evaluation Record — read-only reference into Order Routing PR #91's Vendor Export Delivery Evidence entity.
- `fulfillment_import_received_timestamp` — field added to the **existing** Fulfillment Import entity. Captures **transport receipt time**, not post-validation acceptance time.
- `expected_fulfillment_response_deadline` on SLA Evaluation Record — derived field, computed once at Evaluation Record creation, immutable thereafter.
- `sla_reporting_reference` on SLA Evaluation Record — reference field for future Analytics / Reporting consumption.
- **SLA Breach Review State** as a state field on each Exception entity (`open`, `under_review`, `resolved`, `overridden`, `closed`) — not a separate entity.
- **SLA Breach Signal** as an event concept (`fulfillment-returns.sla-breach.signaled`) — not an entity.

### Non-collapsible state chain

```
Order Routing Vendor Export Delivery Evidence (confirmed)
    └─ consumed read-only ─> SLA Evaluation Record (Fulfillment / Returns truth)
        ├─ on-time + complete ─> outcome = on_time
        ├─ late               ─> outcome = late + Late Fulfillment Import Exception
        ├─ missing            ─> outcome = missing + Missing Fulfillment Import Exception
        └─ partial            ─> outcome = partial + Partial Fulfillment Response Exception
            └─ each Exception may be ─> overridden by SLA Override / Excuse Evidence (immutable)
                └─ raises ─> SLA Breach Signal (one-way; consumed by future Cross-Module PRs)
```

A confirmed Vendor Export Delivery Evidence (Order Routing-owned) is not feature truth for Fulfillment / Returns SLA evaluation — consuming it produces the Fulfillment-Returns-side SLA Evaluation Record. An SLA Evaluation Record is not an Exception. An Exception is not an Override. An Override is not vendor operational acceptance.

PR #91's clarification is preserved: a confirmed Vendor Export Delivery Evidence means only that delivery evidence was successfully confirmed for the configured delivery method. It does not mean the vendor acknowledged, opened, processed, or accepted operational responsibility for the export. PR-A uses confirmed delivery evidence as the SLA clock-start basis per SLA Policy; SLA evaluation is about response timeliness, not acceptance.

### Workflows introduced

Ten architecture-level workflows in `workflows.md`:

1. SLA Policy Configuration
2. Export Delivery Evidence Consumption (read-only Order Routing consumption)
3. Expected Fulfillment Response Deadline Calculation
4. Fulfillment Import Received Timestamp Capture (transport receipt time)
5. On-Time Fulfillment Response Evaluation
6. Late Fulfillment Import Exception
7. Missing Fulfillment Import Exception (including late-import-after-Missing-Exception handling)
8. Partial Fulfillment Response Exception
9. SLA Breach Review
10. SLA Override / Excuse Evidence

### Events introduced

17 additive events in `events.md` across six families:

- SLA Policy lifecycle: 4 events
- SLA Evaluation lifecycle: 3 events
- Late Exception lifecycle: 3 events
- Missing Exception lifecycle: 3 events
- Partial Exception lifecycle: 3 events
- SLA Breach Signal: 1 event

Contracts at architecture level in `event-contracts.md`. Reference-first payloads. Redaction class baseline `tenant_scoped` for most events.

### What PR-A does NOT do

- **Does not mutate Order Routing records under any path.** PR-A consumes Vendor Export Delivery Evidence read-only.
- **Does not modify `modules/order-routing/vendor-export-fulfillment-handoff-governance.md`** or any other Order Routing file. PR #91 added the cross-reference from Order Routing's side; PR-A does not modify Order Routing files for any reason.
- **Does not redefine Order Routing PR #91 concepts** (Vendor Export Schedule, Window, Delivery Evidence, Delivery Attempt, Operational Review-Required state).
- **Does not produce events that Order Routing consumes.** The 17 PR-A events are Fulfillment / Returns-internal.
- **Does not assert vendor operational acceptance.** PR #91's clarification is preserved.
- **Does not own export scheduling, export delivery transport, recipient identity, notification delivery, analytics aggregation, invoice / payment / refund / pricing outcomes, or buyer update-ready signals.**
- **Does not contract the cross-module event transport semantics** for `order-routing.export-delivery-evidence.confirmed` consumption (idempotency, replay, ordering, behavior for non-`confirmed` Delivery Evidence states) — those are **Boundary/Handoff PR** territory.
- **Does not introduce Delivery Date hardening, buyer update-ready expansion, customer-facing aggregation, or all-vendors-shipped-before-buyer-update rules.** Those are **Fulfillment / Returns PR-B** territory.
- **Does not introduce scheduled System Admin Activity Summary Emails, summary aggregation, Notification Platform Service routing for breach signals, or Analytics summary read model.** Those are **Cross-Module Summary Email PR** territory.
- **Does not introduce OpenAPI schemas, concrete URL paths, runtime endpoint code, broker mechanics, database schemas, or migrations.** Architecture / spec only.
- **Does not modify `modules/fulfillment-returns/openapi-contracts.md`.**
- **Does not introduce vendor self-service SLA Policy editing or vendor self-override of SLA breaches.** Phase 1 is System-Admin-only for SLA actions.

### Sequence reference

PR-A is the **second** PR in the Order Routing / Fulfillment / Returns hardening audit sequence:

1. ✓ **Order Routing PR-A — Vendor Export Schedule and Delivery Evidence** (merged as PR #91).
2. **Fulfillment / Returns PR-A — Vendor Fulfillment Response SLA and Late/Missing Import Exceptions** (this PR).
3. **Boundary/Handoff PR — Export Delivery to Fulfillment SLA Handoff.** Formalizes the cross-module event contract; resolves Delivery-Evidence-in-non-`confirmed`-state behavior; further hardens `vendor-export-fulfillment-handoff-governance.md`.
4. **Fulfillment / Returns PR-B — Delivery Date and Buyer Update Hardening.**
5. **Cross-Module PR — Scheduled System Admin Activity Summary Emails.** Consumes PR-A's SLA Breach Signal and Fulfillment / Returns SLA exception state for aggregation.

### Cross-references

- See `data-model.md` for entity definitions (SLA Policy, SLA Evaluation Record, three Exception entities, SLA Override / Excuse Evidence, plus field additions and state enumerations).
- See `workflows.md` for the ten interlocking workflows.
- See `boundary-contracts.md` for Fulfillment-Returns-side boundary declarations vs. Order Routing, Integration Management, Notification Platform Service, Tenant Company, Logs & Audit, Analytics / Reporting, Invoice Management, Pricing.
- See `permissions.md` for SLA Configuration Authority and SLA Override Authority operationalization.
- See `events.md` for the 17 additive event names.
- See `event-contracts.md` for reference-first payload shape, redaction class, and architecture-level idempotency / replay / failure-handling expectations.
- See `api-contracts.md` for read-only API contract placeholders.
- See `test-scenarios.md` for lightweight review scenarios.
- See `edge-cases.md` for SLA-related edge cases.
- See `assumptions-open-questions.md` for PR-A assumptions (18), open questions (10 numbered + 8 lettered = 18), and risks (15).
- See Order Routing PR #91's `modules/order-routing/vendor-export-fulfillment-handoff-governance.md` for the existing handoff governance — **not modified by PR-A.**
## Delivery Date and Buyer Update Hardening (PR-B)

This section anchors the narrative for the delivery-date and buyer-update hardening pass introduced by PR-B. Detailed entity definitions, workflows, boundary contracts, permissions, events, event contracts, and API placeholders are in the per-file PR-B sections.

### What PR-B adds

PR-B hardens the content side of the vendor-fulfillment-response surface. PR #92 hardened SLA timing (was the vendor's response on time?); PR-B hardens content validity (is the vendor's reported delivery date valid, and when is the buyer's system notified?).

PR-B introduces:

- Delivery Date Evidence as the authoritative per-shipment-line record of a vendor-reported delivery date, its validation outcome, and the resulting shipment-state effect.
- Delivered Shipment Evidence as field extensions on the existing Shipment Line entity, populated only when an accepted Delivery Date Evidence triggers Delivered state via the explicit transition workflow.
- Delivery Date Correction Evidence as an immutable authority-gated entity supporting post-Delivered corrections without silently rewriting prior evidence.
- Buyer Update-Ready Signal as the authoritative record that a buyer-facing update is ready for Integration Management transport. A single entity with an `update_kind` discriminator (shipment, delivery, correction) carries the lifecycle from `pending` through `held` (with explicit hold reasons), `eligible`, `dispatched`, `acknowledged`, and `failed` states.
- Multi-Vendor / Multi-Suborder Buyer Update Rule with Phase 1 default of all-vendors aggregation: buyer-facing updates are held until all vendor suborders or Shipment Lines required for the parent order have reached the corresponding state.
- Stale, duplicate, and out-of-order Delivery Update handling rules.
- Delivery Date Override / Correction Authority for post-Delivered corrections and manual buyer-update holds.
- Thirteen additive event names across four event families.

### Non-collapsible state chain

The PR-B chain from vendor submission to buyer system is intentionally non-collapsible. Each link is independently observable and audited:

Vendor Fulfillment Import (existing) -> Delivery Date Evidence (PR-B) -> Delivered Shipment Evidence on Shipment Line (PR-B field extensions) -> Buyer Update-Ready Signal (PR-B) -> Integration Management dispatch (referenced) -> Integration Management acknowledgement or failure (referenced)

Buyer Update-Ready does not equal buyer update delivered. `eligible` indicates Fulfillment / Returns has marked the update ready; `dispatched` indicates Integration Management has accepted the request; `acknowledged` indicates the buyer system confirmed receipt. Only `acknowledged` constitutes evidence of buyer delivery.

### What PR-B does not do

PR-B is deliberately conservative in Phase 1 to support the boundary discipline and to leave room for future evolution. PR-B does not:

- Introduce carrier-originated Delivery Date Evidence. Phase 1 source is vendor-submitted only. Source-agnostic naming anticipates future carrier integration without committing to it.
- Implement per-buyer configurability of the Multi-Vendor / Multi-Suborder Buyer Update Rule. Phase 1 default is all-vendors aggregation; future configurability is anticipated by `buyer_integration_profile_reference` but not implemented.
- Modify any Order Routing record, event, or contract from PR #91.
- Modify any SLA Policy, SLA Evaluation Record, Exception, Override Evidence, or SLA Breach Signal from PR #92.
- Modify any Cross-Module Handoff Record from PR #93.
- Introduce Scheduled System Admin Activity Summary Emails. Cross-Module Summary Email PR follows.
- Introduce Notification Platform delivery of buyer updates or summaries.
- Introduce Analytics aggregation of buyer-update lifecycle facts.
- Introduce buyer-facing payload structure, field selection, format, or per-buyer customization. Payload concerns are owned by Integration Management buyer integration profile.
- Introduce OpenAPI schemas, concrete HTTP routes, runtime code, or migrations.
- Introduce vendor self-service correction after Delivered state.
- Introduce invoice, pricing, product-catalog, device-catalog, AI-agent, or any other cross-domain linkage.

### PR #92 SLA semantics preserved

PR-B preserves PR #92's SLA semantics unconditionally. A Fulfillment Import that arrives on time but whose Delivery Date field fails PR-B's validation rules remains on-time for SLA purposes; the SLA Evaluation Record outcome reflects timing of the response, not content validity. PR-B's content validation rejection does not retroactively change PR #92's SLA outcome, and PR-B's rejected content does not silently become valid shipment or delivery evidence. The two surfaces (SLA timing and content validity) are independent.

### Sequencing reference

PR-B is the fourth in the current hardening series:

1. PR #91 - Order Routing PR-A (Vendor Export Schedule and Delivery Evidence).
2. PR #92 - Fulfillment / Returns PR-A (Vendor Response SLA and Exceptions).
3. PR #93 - Boundary / Handoff PR (Export Delivery to Fulfillment SLA Handoff).
4. PR-B (this PR) - Fulfillment / Returns PR-B (Delivery Date and Buyer Update Hardening).

After PR-B, the planned sequence continues:

5. Cross-Module PR - Scheduled System Admin Activity Summary Emails.
6. API Governance / Postman readiness audit.
7. API Governance Foundation PR.
8. OpenAPI / per-module API hardening.

PR-B does not constrain decisions for items 5-8 beyond producing the entities, events, and audit references those items will consume.
