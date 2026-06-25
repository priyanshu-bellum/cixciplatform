# Order Routing Vendor Export And Fulfillment Handoff Governance

This document is proposal-level architecture. It hardens Order Routing vendor routed-suborder export governance and fulfillment handoff boundaries without moving Fulfillment/Returns, Integration Management, Logs & Audit, Notification Platform Service, Tenant Company, Pricing, Product Catalog, Invoice Management, Procurement, Analytics, Warranty, or AI Agent Services ownership into Order Routing.

This document references the shared `architecture/standards/import-export-validation-governance.md` standard for common export status vocabulary, CSV governance, identifier preservation, scheduled email export governance, audit expectations, and integration failure tracking.

## Ownership Rules

- Order Routing owns routed suborder records, routing decisions, routing snapshots, vendor suborder grouping, vendor routed-suborder export eligibility, vendor order export batches, vendor order export batch items, buyer/retailer split references, re-export requests, manual download workflow references, and fulfillment handoff requests when the export is the vendor order instruction.
- Order Routing emits vendor routed-suborder export records. It does not send vendor orders directly and does not own external delivery.
- Fulfillment/Returns owns fulfillment handoff acceptance/disposition, shipment execution, tracking numbers, tracking URLs, carrier behavior, shipped dates, delivered dates, fulfillment import validation, return status, refund evidence, and operational fulfillment status.
- Integration Management owns external delivery/receipt evidence, API/webhook/CSV/SFTP/manual transport evidence, provider failures, retries, and external references.
- Logs & Audit owns immutable export/download/file evidence, row counts, file references, validation summaries, processing summaries, and audit retention.
- Notification Platform Service owns scheduled email delivery, recipient delivery status, notification history, and delivery retry behavior.
- Tenant Company owns user/vendor permission, company/entity scope, schedule authority, manual download authority, and destructive/re-export authority.

## Vendor Routed-Suborder Export Governance

Order Routing may create vendor routed-suborder export evidence after routing execution creates vendor suborders. Export governance determines which routed suborders are eligible to appear in a vendor-facing order instruction export. Export governance does not determine whether fulfillment has executed.

Proposal-level concepts:

- Vendor order export eligibility record.
- Vendor order export batch.
- Vendor order export batch item.
- Vendor order export content reference.
- Export schema version.
- Export window.
- Export inclusion rule version.
- Export split-by-buyer flag.
- Buyer/retailer split reference.
- Re-export request.
- Export status reference.
- Manual download reference.
- Fulfillment handoff request.
- Audit reference.

Vendor routed-suborder export statuses should map to the shared standard export vocabulary while allowing Order Routing-specific substates such as eligibility-conflict, split-generated, re-export-requested, duplicate-export-blocked, handoff-requested, handoff-disposition-recorded, and handoff-duplicate-blocked.

## Vendor Order Export Eligibility Record

Proposal-level fields:

- Eligibility record id.
- Parent order reference.
- Routed suborder reference.
- Routing snapshot reference.
- Vendor reference.
- Buyer/entity reference.
- Export window.
- Source event/reference.
- Source version.
- Export schema version.
- Export inclusion rule version.
- Idempotency key.
- Eligibility status.
- Eligibility reason.
- Exclusion reason.
- Prior export state.
- Re-export allowed flag.
- Review-required state.
- Supersession/cancellation state.
- Audit reference.

Eligibility record determines whether a routed suborder may be included in a vendor order export. Eligibility does not mean the vendor has received or accepted the export. Integration Management, Notification Platform Service, and Logs & Audit own delivery, scheduled email, and immutable file/download evidence as applicable.

## Vendor Order Export Inclusion Rules

Proposal-level inclusion rules:

- Include only routed suborders assigned to the vendor receiving the export.
- Include only routed suborders eligible for vendor processing according to Order Routing-owned routing state and export eligibility rules.
- Exclude cancelled or superseded routed suborders.
- Exclude routed suborders already exported in the same batch unless explicit re-export is requested and authorized.
- Exclude routed suborders assigned to another vendor.
- Preserve export window reference and source event reference.
- Route ambiguous eligibility, conflicting vendor assignment, missing routing snapshot, stale supersession state, duplicate batch membership, duplicate prevention key conflict, or stale Fulfillment disposition to review.

Inclusion rules determine export eligibility only. Fulfillment/Returns determines fulfillment execution state after handoff and must record vendor fulfillment updates in its own model.

## Buyer / Retailer Split Support

Vendor order exports may be split by buyer or retailer where vendor configuration, retailer operational rules, or export governance requires it.

Proposal-level split evidence should preserve:

- Split reference id.
- Vendor reference.
- Buyer/entity reference.
- Split rule version.
- Export batch reference.
- Routed suborder references.
- Routing snapshot references.
- Export schema version.
- Export inclusion rule version.
- Review-required state.
- Audit reference.

Split-by-buyer behavior must not alter routing decisions, parent order linkage, vendor assignment, pricing snapshot references, or fulfillment ownership. If split behavior conflicts with routing snapshots or vendor grouping, Order Routing should create review-required state rather than silently reshaping the order.

## CSV-Only Vendor Order Export References

Vendor order exports may be CSV-only where configured. CSV-only behavior means:

- No Excel workbook or worksheet tab naming is required.
- Buyer name, export date, export batch id, vendor reference, and schema version should be represented in file name metadata or export metadata.
- Exact field and header rules should reference the shared Import / Export / Validation Governance standard and the Order Routing export contract.
- UPC, SKU, order numbers, routed suborder references, tracking-capable identifiers, and external identifiers should be treated as text identifiers where present.

Order Routing owns routed-suborder export content and export batch/item workflow references. Logs & Audit owns file tracking. Integration Management or Notification Platform Service owns delivery evidence depending on whether transport is external integration delivery, manual exchange, or scheduled email delivery.

## Manual Vendor Order Download

Vendors may manually download eligible routed-suborder CSV exports where allowed by Tenant Company scope and Order Routing export eligibility.

Manual download governance:

- Manual download reference id.
- Export batch reference.
- Actor/user reference.
- Vendor/company/entity reference.
- Download timestamp.
- Download count.
- Last downloaded by.
- Last downloaded at.
- Permission/scope reference.
- Audit reference.

Tenant Company owns user/vendor permission, company/entity scope, and download authority. Logs & Audit owns immutable download evidence, actor, timestamp, row count, file reference, retention class, redaction class, and repeated download audit evidence. Order Routing may keep workflow references to manual download status only where needed for export/re-export eligibility.

Manual download must not bypass export eligibility, tenant scope, redaction, file tracking, re-export controls, or source-module state controls.

## Routing-To-Fulfillment Handoff

Order Routing may emit fulfillment handoff requests after vendor suborder export or route completion where appropriate. The handoff says routing produced a vendor routed-suborder instruction or reference. It does not say shipment has begun, tracking exists, delivery occurred, a return was accepted, a refund is owed, or Fulfillment/Returns accepted execution.

Fulfillment handoff request fields:

- Fulfillment handoff request id.
- Parent order reference.
- Routed suborder reference.
- Export batch item reference.
- Routing snapshot reference.
- Vendor reference.
- Buyer/entity reference.
- Handoff requested timestamp.
- Handoff source version.
- Handoff idempotency key.
- Fulfillment/Returns disposition reference.
- Fulfillment/Returns source version.
- Accepted/rejected/ignored state.
- Applied vs ignored state.
- Duplicate handoff blocker.
- Review-required state.
- Audit reference.

Fulfillment/Returns owns:

- Fulfillment handoff acceptance or rejection.
- Fulfillment/Returns disposition reference and source version.
- Vendor fulfillment updates.
- Shipment records.
- Tracking numbers.
- Tracking URLs.
- Shipped dates.
- Delivered dates.
- Carrier references.
- Fulfillment import validation.
- Operational fulfillment status.
- Return status.
- Refund or adjustment evidence where applicable.

`order.routing.fulfillment-handoff.requested` is a request, not proof that Fulfillment/Returns accepted execution. Missing, duplicate, stale, ignored, or rejected Fulfillment/Returns disposition should not be treated as fulfilled, shipped, delivered, or accepted. Order Routing must not update shipment status, delivered status, tracking URL, return status, refund evidence, fulfillment execution state, or customer tracking experience.

## Export Batch Model

Proposal-level batch fields:

- Export batch id.
- Vendor reference.
- Buyer/retailer split mode.
- Export method reference.
- Export window start/end.
- Export generated at.
- Export generated by actor/service.
- Export schema version.
- Export inclusion rule version.
- Batch idempotency key.
- Buyer/retailer split references.
- Vendor order export content reference.
- File/reference placeholder.
- Delivery reference placeholder.
- Notification delivery reference placeholder.
- Logs & Audit evidence reference placeholder.
- Review-required state.
- Audit reference.

## Export Batch Item Model

Proposal-level batch item fields:

- Export batch item id.
- Export batch reference.
- Parent order reference.
- Routed suborder reference.
- Routing snapshot reference.
- Vendor reference.
- Buyer/entity reference.
- Eligibility record reference.
- Included/excluded status.
- Included/excluded reason.
- Prior export membership reference.
- Re-export reason.
- Duplicate prevention key.
- Source event/version.
- Resulting fulfillment handoff request reference.
- Review-required state.
- Supersession/cancellation state.
- Audit reference.

Duplicate prevention must be enforced at routed-suborder/batch-item level, not only at export batch level. Partial re-exports must not cause duplicate vendor processing unless explicitly authorized and recorded with prior export membership and re-export reason.

## Re-Export Controls

Re-export should be explicit, permissioned, and auditable.

Proposal-level re-export fields:

- Re-export request id.
- Original export batch reference.
- Original export batch item references.
- Requested routed suborders.
- Re-export reason.
- Requested by actor/service.
- Tenant Company permission/approval reference placeholder.
- Duplicate processing risk flag.
- Allowed/blocked state.
- Generated replacement export reference.
- Supersession reference.
- Audit reference.

Re-export must be explicit and auditable. Re-export should preserve prior export membership and reason. Re-export must not silently re-send all previously exported suborders, create duplicate routed suborders, alter routing decisions, or imply fulfillment execution.

## API Coverage

Proposal-level APIs or contract concepts to add to Order Routing contracts:

- Create routed suborder export eligibility record.
- Create vendor order export batch.
- Retrieve vendor order export batch and content reference.
- Retrieve vendor order export batch item disposition.
- Request vendor order re-export.
- Record vendor manual download request or completion.
- Create buyer/retailer split export reference.
- Create fulfillment handoff request.
- Record Fulfillment/Returns disposition reference.
- Retrieve export eligibility conflicts and review-required records.

Proposal-level endpoint candidates:

- `POST /order-routing/vendor-exports/eligibility`
- `POST /order-routing/vendor-exports/batches`
- `GET /order-routing/vendor-exports/batches/{exportBatchId}`
- `GET /order-routing/vendor-exports/batches/{exportBatchId}/items`
- `POST /order-routing/vendor-exports/batches/{exportBatchId}/re-export-requests`
- `POST /order-routing/vendor-exports/batches/{exportBatchId}/manual-downloads`
- `POST /order-routing/vendor-exports/batches/{exportBatchId}/buyer-splits`
- `POST /order-routing/fulfillment-handoffs`
- `POST /order-routing/fulfillment-handoffs/{handoffRequestId}/disposition-references`
- `GET /order-routing/vendor-exports/review-records`

These APIs must not accept fulfillment status fields, shipment fields, tracking URLs, carrier execution values, return statuses, refund amounts, invoice status, or delivery-provider results as Order Routing-owned mutations. Disposition reference APIs should store Fulfillment/Returns disposition references, not Fulfillment-owned operational state.

## Events

Proposal-level events:

- `order.routing.vendor-export.eligibility-created`
- `order.routing.vendor-export.batch-created`
- `order.routing.vendor-export.batch-item.included`
- `order.routing.vendor-export.batch-item.excluded`
- `order.routing.vendor-export.duplicate-blocked`
- `order.routing.vendor-export.generated`
- `order.routing.vendor-export.split-reference.created`
- `order.routing.vendor-export.re-export-requested`
- `order.routing.vendor-export.re-export-approved`
- `order.routing.vendor-export.re-export-blocked`
- `order.routing.vendor-export.manual-download-recorded`
- `order.routing.fulfillment-handoff.requested`
- `order.routing.fulfillment-handoff.duplicate-blocked`
- `order.routing.fulfillment-handoff.disposition-reference-recorded`
- `order.routing.vendor-export.review-required`
- `order.routing.vendor-export.eligibility-conflict-detected`

Events should include references rather than sensitive raw payloads where possible. Common event fields should include tenant scope reference, vendor reference, export batch reference, export batch item reference, routed suborder references, routing snapshot references, export schema version, export inclusion rule version, export window, split-by-buyer flag, buyer/retailer split reference, re-export request reference, fulfillment handoff request reference, Fulfillment/Returns disposition reference where applicable, audit reference, correlation id, causation id, and redaction class.

Event consumers must not treat vendor export or handoff request events as shipment, tracking, delivery, invoice, return, refund, or payment state.

## Test Scenarios

Proposal-level tests:

1. Vendor export eligibility includes only routed suborders assigned to the target vendor.
2. Vendor export eligibility excludes cancelled and superseded routed suborders.
3. Vendor export eligibility excludes suborders already exported in the same batch unless re-export is explicitly requested.
4. Routed suborder assigned to another vendor is excluded and produces review-required state if requested for the wrong vendor.
5. Export batch preserves export schema version, export window, inclusion rule version, routing snapshot references, and audit reference.
6. Export batch item preserves included/excluded disposition, prior export membership, duplicate prevention key, source event/version, and resulting handoff request reference.
7. Duplicate export is blocked at routed-suborder/batch-item level.
8. Partial re-export includes only explicitly requested routed suborders and preserves prior export membership.
9. Buyer/retailer split export preserves buyer reference, vendor suborder references, export batch reference, and routing snapshot references without changing routing decisions.
10. CSV-only export has no Excel worksheet dependency and preserves text identifiers according to the shared standard.
11. Manual vendor download requires Tenant Company scope and produces Logs & Audit download evidence.
12. Scheduled email delivery failure is recorded by Notification Platform Service, not Order Routing.
13. External delivery failure is recorded by Integration Management, not Order Routing.
14. Routing-to-Fulfillment handoff creates a request reference without changing shipment, tracking, delivered, return, refund, or fulfillment execution status.
15. Duplicate fulfillment handoff is blocked by handoff idempotency key or duplicate handoff blocker.
16. Fulfillment/Returns disposition reference is recorded as accepted, rejected, or ignored without mutating Fulfillment-owned operational state.
17. Rejected, ignored, stale, or missing Fulfillment disposition is not treated as fulfilled, shipped, delivered, or accepted.
18. Fulfillment/Returns records vendor fulfillment updates without mutating Order Routing snapshots.
19. Re-export request creates explicit re-export evidence and does not duplicate routed suborders.
20. Ambiguous eligibility, conflicting batch membership, missing routing snapshot, stale supersession state, or missing/stale Fulfillment disposition routes to review.

## Boundary Wording

Use these terms in future Order Routing docs and contracts:

- Prefer: Order Routing emits vendor routed-suborder export records.
- Avoid: Order Routing sends vendor orders.
- Prefer: Order Routing records fulfillment handoff requests.
- Avoid: Order Routing marks fulfillment accepted.
- Prefer: Fulfillment/Returns records vendor fulfillment updates and handoff disposition.
- Avoid: Order Routing updates order status after export.
- Prefer: Integration Management owns external delivery/receipt evidence.
- Prefer: Notification Platform Service owns scheduled email delivery.
- Prefer: Logs & Audit owns immutable export/download/file evidence.

## Open Questions

- Which vendor order export fields are required at launch, and which are optional by vendor configuration?
- Which routed suborder state first becomes eligible for vendor export?
- Does vendor export generation always request Fulfillment/Returns handoff, or can handoff be delayed?
- Which Fulfillment/Returns dispositions should Order Routing store as references for export/handoff review?
- Which vendors require split-by-buyer or split-by-retailer export behavior?
- Which vendors are CSV-only at launch?
- Which export classes are scheduled email, manual download, API/webhook, SFTP placeholder, or hybrid?
- Which re-export reasons require System Admin approval?
- Which export statuses should be visible to vendors versus internal users?
- Which audit/file evidence belongs in Logs & Audit versus Order Routing-owned export references?
- Which Integration Management delivery failures should create Order Routing review-required state versus remain transport-only evidence?

## Cross-Reference to Vendor Export Delivery Evidence (PR-A)

PR-A introduces the **Vendor Export Delivery Evidence** entity in `modules/order-routing/data-model.md`. This entity is the authoritative record of vendor export delivery (when, to whom, by what method, with what confirmation). The export-to-fulfillment handoff governed by this document references **Vendor Export Delivery Evidence** as the future source of confirmed delivery facts for downstream SLA calculation. PR-A does not modify the handoff governance itself; the explicit join-point contract between Order Routing's delivery evidence and Fulfillment / Returns' SLA evaluation is the **Boundary/Handoff PR** (item 3 in the Order Routing / Fulfillment hardening audit sequence). PR-A is the producer side only.


### See also (Boundary/Handoff PR)

The cross-module consumption seam between Vendor Export Delivery Evidence and Fulfillment / Returns SLA evaluation is formalized in the Boundary/Handoff PR. The consumer side introduces a Fulfillment / Returns-owned Cross-Module Handoff Record that records observation, eligibility, and consumption state for each source Vendor Export Delivery Evidence by reference. Order Routing is not the owner of that record and does not maintain consumer-side state. For the producer-side publication contract see `modules/order-routing/boundary-contracts.md`. For the consumer-side consumption contract, Handoff Record entity, and Workflows A and B see `modules/fulfillment-returns/boundary-contracts.md`, `modules/fulfillment-returns/data-model.md`, and `modules/fulfillment-returns/workflows.md`.
