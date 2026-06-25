# Order Routing Module

Initial architecture draft for the Order Routing module.

This module aligns with ADR-0009 and consumes boundaries from ADR-0008, ADR-0007, ADR-0006, ADR-0005, and ADR-0004. It also references the shared Import / Export / Validation Governance standard for vendor routed-suborder export governance. It is an initial proposal for review, not final implementation design or finalized business rules.

Order Routing owns routing decisions, order decomposition, parent order to vendor/manufacturer suborder structure, split-order decisions, vendor/manufacturer assignment logic, routing snapshots, routing exceptions, routing retry/review workflows, vendor routed-suborder export eligibility/content references, and routing events.

Order Routing consumes pricing snapshots, tenant eligibility/scope signals, Product Catalog references, Device Catalog references, Product Type, and warranty registration requirement signals. It must not recalculate price, derive tenant eligibility, own product/device source records, execute fulfillment, manage invoice lifecycle, adjudicate warranty claims, own procurement workflow, deliver notifications, own external integration transport, own immutable file/audit evidence, or define analytics reporting.

## Focus Areas

- Parent order intake reference
- Order decomposition
- Order line routing
- Vendor suborder creation
- Manufacturer suborder placeholder
- Split-order decisions
- Vendor routed-suborder export eligibility
- Vendor routed-suborder export batch/content references
- Buyer/retailer split export support
- CSV-only vendor order export references
- Manual vendor order download eligibility
- Routing-to-Fulfillment handoff references
- Routing decision records
- Routing snapshots
- Routing exceptions
- Manual review / retry workflows
- Product Type-aware routing for accessories, devices, and future branded merchandise
- Pricing snapshot / quote-like result consumption
- Tenant Company scope consumption
- Product Catalog and Device Catalog references
- Warranty registration required signal placeholder
- Downstream fulfillment instruction placeholder
- Routing events and event contracts
- AI Agent Services routing signals
- Vendor Export Schedule and Delivery Evidence Alignment (PR-A) — per-vendor configurable Vendor Export Schedule (timezone, daily send times, business calendar reference, recipient references, delivery method, buyer/retailer split); Vendor Export Window as materialized execution instance; Vendor Export Delivery Evidence as authoritative delivery record (timestamps, confirmation state, review-required state); Vendor Export Delivery Attempt per-attempt audit capturing Integration-Management-reported outcomes; six interlocking workflows (schedule configuration, window generation, delivery evidence capture, manual download, retry/failure, operational review); Export Schedule Authority class operationalized; 12 additive event names across four families; read-only API placeholders for Schedule, Window, Delivery Evidence, and Delivery Attempt lookups; reference-first event payload discipline with tenant-scoped redaction; evidence layer only — no SLA evaluation (deferred to Fulfillment / Returns PR-A), no notification routing (deferred to Cross-Module Summary Email PR), no shipment/tracking state (Fulfillment / Returns territory)
- Export Delivery to Fulfillment SLA Handoff (Boundary/Handoff PR) - producer-side contract notes for the cross-module handoff from Order Routing Vendor Export Delivery Evidence (PR #91) to Fulfillment / Returns SLA Evaluation Record (PR #92); reaffirms the producer publication contract (at-least-once delivery of `order-routing.export-delivery-evidence.confirmed` and `.failed`; in-order-best-effort; payload reference stability post-emission; terminal-once-`confirmed` invariant); reaffirms PR #91's operational-acceptance non-assertion (confirmed source delivery is a transport-layer fact only - not vendor acknowledgement, opening, processing, or operational responsibility); contract notes added to `boundary-contracts.md` and `event-contracts.md` on the Order Routing side; light cross-reference added to `vendor-export-fulfillment-handoff-governance.md` (<=15 lines, 0 deletions, no restructuring, no ownership changes, no SLA logic); no new Order Routing entities, workflows, events, permissions, or API contracts introduced (Cross-Module Handoff Record is Fulfillment / Returns-owned per scoping decision); Order Routing remains the producer side and does not own consumption state, SLA evaluation, or fulfillment exception lifecycle

## Template Files

- `spec.md`
- `data-model.md`
- `api-contracts.md`
- `openapi-contracts.md`
- `events.md`
- `event-contracts.md`
- `boundary-contracts.md`
- `permissions.md`
- `workflows.md`
- `edge-cases.md`
- `test-scenarios.md`
- `assumptions-open-questions.md`
- `vendor-export-fulfillment-handoff-governance.md`
