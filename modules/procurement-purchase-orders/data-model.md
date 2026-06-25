# Procurement / Purchase Orders Data Model

This document is proposal-level architecture. It defines initial entities without finalizing schema, PO numbering, approval thresholds, receiving ownership, integration implementation, payment behavior, or lifecycle transition rules.

## Entities

### Core Procurement

- Bulk Purchase Request Record.
- Purchase Order Record.
- Purchase Order Line.
- Purchase Order Status History.
- Purchase Order Draft State.
- Purchase Order Approval Record.
- Purchase Order Submission Record.
- Purchase Order Document / Export Reference.
- Purchase Order Revision Record.
- Purchase Order Supersession Reference.
- Purchase Order Exception / Review State.

### PO Line References

- Accessory PO Line Reference.
- Device PO Line Reference.
- Branded Merchandise PO Placeholder.
- Product Catalog Product Reference.
- Device Catalog Device Reference.
- Product Type Reference.
- Requested Quantity.
- Requested Price Snapshot / Quote-Like Reference.
- Requested Price.
- Accepted Price Placeholder.
- Pricing Evidence Reference.
- Media Reference Placeholder.

### Target And Submission

- Seller Target Reference.
- Seller Target Type: accessory vendor or device manufacturer.
- PO Target Cardinality: single-target default or future multi-target placeholder.
- Vendor Target Reference.
- Manufacturer Target Reference.
- Line Target Reference.
- Target Conflict State.
- Target Decomposition Requirement.
- Integration Method Reference.
- Vendor / Manufacturer Submission Reference.
- External PO Reference.
- External Line Reference.
- Vendor Response Reference.
- Manufacturer Response Reference.
- External Response Status.
- Submission Retry / Review Placeholder.

### Receiving And Downstream Placeholders

- Receiving Placeholder.
- Receiving Location Placeholder.
- Shipping Destination Placeholder.
- Requested Delivery Date Placeholder.
- Downstream Fulfillment / Receiving Signal Placeholder.
- Invoice / Payment Reference Placeholder.

### Signals And Audit

- Procurement Event Record.
- Notification Hook Reference.
- Logs & Audit Reference.
- Analytics Signal Reference.
- AI Procurement Recommendation Reference Placeholder.

## PO Target Model

Proposal-level rules:

- Default target model is one seller target per PO unless future rules explicitly support multi-seller POs.
- Seller target may be an accessory vendor or a device manufacturer.
- PO header target and PO line target must not conflict.
- Line-level targets must match the header target unless the PO is explicitly marked as multi-target by a future rule.
- Mixed vendor/manufacturer targets should route to review or require decomposition.
- Ambiguous target cardinality blocks submission.
- Multi-seller PO behavior remains future/open unless explicitly modeled.
- If multi-seller POs are later supported, lines must be grouped by seller target, submission reference, external PO reference, response lifecycle, and receiving placeholder.

Proposal-level fields:

- Target cardinality: single-target default, multi-target placeholder, review-required.
- Header seller target reference.
- Header seller target type.
- Line seller target reference.
- Line target match status.
- Target conflict state.
- Target decomposition reference placeholder.
- Target review-required state.

## Purchase Order Record

Proposal-level fields:

- PO id.
- PO number placeholder.
- Bulk purchase request reference.
- Buyer parent/entity scope from Tenant Company.
- Buyer user reference.
- Approver reference placeholder.
- Header seller target reference.
- Header seller target type: accessory vendor or device manufacturer.
- Target cardinality: single-target default or future multi-target placeholder.
- Target conflict / decomposition review state.
- Product Type scope.
- Status: Draft, Pending Approval, Approved, Submitted, Accepted, Rejected, Partially Accepted, Backordered, Cancelled, Closed, Superseded, Review Required.
- PO line references.
- PO document/export reference.
- Submission reference.
- External PO reference.
- Revision/supersession reference.
- Receiving placeholder reference.
- Invoice/payment reference placeholder.
- Created by / created at.
- Updated by / updated at.
- Audit reference.

## Purchase Order Line

Proposal-level fields:

- PO line id.
- PO id.
- Line number placeholder.
- Product Type.
- Product Catalog product reference for accessory/branded merchandise lines.
- Device Catalog Device Reference for device lines.
- Line seller target reference.
- Line seller target type: accessory vendor or device manufacturer.
- Header target match status.
- Requested quantity.
- Requested price snapshot / quote-like result reference from Pricing.
- Requested price.
- Accepted quantity placeholder.
- Accepted price placeholder.
- Pricing evidence reference.
- Pricing review-required state.
- Requested delivery date placeholder.
- Shipping destination / receiving location placeholder.
- Vendor/manufacturer line response reference.
- External line reference placeholder.
- Line status placeholder.
- Exception/review state.

Accessory and branded merchandise PO lines reference Product Catalog. Device PO lines reference Device Catalog. Procurement consumes Product Type but does not own Product Type definitions.

## Pricing Snapshot Bindability Evidence

Procurement consumes Pricing evidence and must not recalculate or reinterpret price conflicts.

Proposal-level fields:

- Pricing snapshot id.
- Pricing snapshot version/hash.
- Quote-like result reference.
- Bindability status: bindable, not-bindable, expired, superseded, review-required placeholder.
- Expiration timestamp.
- Supersession status.
- Stale snapshot behavior.
- Requote-required state.
- Requested price.
- Accepted price placeholder.
- Accepted price source: vendor/manufacturer response, manual review placeholder, future value.
- Accepted price variance.
- Accepted price variance reason.
- Pricing review-required state.

Stale, missing, expired, superseded, inconsistent, or non-procurement-bindable pricing evidence should block submission or route to review. Pricing owns pricing interpretation, calculations, exceptions, and quote-like outcomes.

## PO Approval Record

Proposal-level fields:

- Approval id.
- PO id.
- Approval status: requested, approved, rejected, returned-for-changes, escalated, expired, review-required placeholder.
- Requested by.
- Approver reference.
- Buyer entity scope.
- Approval policy reference.
- Approval policy version.
- Threshold basis: amount, quantity, Product Type, buyer entity, seller target, risk flag, future value.
- Approver authority snapshot.
- Approver role/entity scope.
- Approval chain.
- Escalation chain.
- Override flag.
- Override reason.
- Rejection reason.
- Approval expiration placeholder.
- Approval reason/comment placeholder.
- Approved/rejected at.
- Audit reference.

Tenant Company owns roles, permissions, company/entity scope, and eligibility. Procurement consumes those permissions and stores approval workflow evidence. Procurement must not infer tenant permission rules independently.

## PO Submission Record

Proposal-level fields:

- Submission id.
- PO id.
- Target type: vendor or manufacturer.
- Vendor/manufacturer target reference.
- Target cardinality status.
- Integration method: API, webhook, CSV export, manual download/upload, SFTP placeholder, future connector.
- Integration Management reference.
- Submission status.
- External action reference.
- PO document/export reference.
- Submitted by / submitted at.
- Failure/retry placeholder.
- Audit reference.

Integration Management owns connection state, credential references, delivery evidence, webhook/API transmission records, and external action references.

## External PO Reference Controls

Procurement may store external PO references as workflow references. External PO references must not replace internal PO IDs.

Proposal-level fields:

- External PO reference.
- External line reference.
- Integration reference.
- External response reference.
- External reference dedupe key.
- External reference conflict state.
- External reference supersession/correction reference.
- External reference review-required state.

Integration Management owns external ID mapping, delivery evidence, receipt evidence, connection health, and external action records.

## Vendor / Manufacturer Response Reference

Proposal-level fields:

- Response id.
- PO id.
- PO line references where applicable.
- Response level: PO-level or line-level.
- Responder type: vendor or manufacturer.
- Responder reference.
- Response status: accepted, rejected, partially accepted, backordered, review-required placeholder.
- Header/line response precedence placeholder.
- Accepted quantity placeholder.
- Rejected quantity placeholder.
- Backordered quantity placeholder.
- Partially accepted quantity placeholder.
- Unknown line reference behavior.
- Response conflict state.
- Response dedupe key.
- Response source reference.
- External response reference.
- Received through integration/manual process reference.
- Response timestamp.
- Received at.
- Audit reference.

PO status should be derived from structured PO/line response state. Partial acceptance and backorder behavior remain proposal-level but must be represented explicitly. Conflicting header and line responses should route to review.

## Revision / Supersession Record

Proposal-level fields:

- Revision id.
- Original PO reference.
- Revised PO reference.
- Superseded PO reference.
- Revision reason.
- Changed line references.
- Changed price/quantity/target/date placeholders.
- Actor reference.
- Created at.
- Audit reference.

## Receiving Placeholder

Proposal-level fields:

- Receiving placeholder id.
- PO id.
- PO line references.
- Seller target reference.
- Receiving location placeholder.
- Expected receipt date placeholder.
- Expected quantity placeholder.
- Received quantity placeholder.
- Receiving status placeholder.
- Fulfillment/Returns handoff reference placeholder.
- Invoice eligibility reference placeholder.

This does not finalize receiving ownership. Fulfillment/Returns may own operational receiving or fulfillment execution if future ADR/module assigns it.

## PO Exception / Review State

Proposal-level fields:

- Exception id.
- PO id.
- PO line reference where applicable.
- Exception type.
- Severity.
- Blocking state.
- Owner / reviewer reference placeholder.
- Retryability placeholder.
- Reason.
- Created at.
- Resolved at placeholder.
- Audit reference.

## Ownership

Procurement owns PO records, PO lines, approval workflow evidence, PO lifecycle, PO submission references, vendor/manufacturer response tracking, PO revisions/supersessions, PO exceptions, receiving placeholders, and procurement events.

Procurement does not own pricing calculation, pricing interpretation, catalog/device source records, tenant eligibility, normal order routing, fulfillment execution, invoice lifecycle, payment processing, integration connection state, external ID mapping authority, audit evidence storage, notification delivery, analytics metrics, media source assets, or AI recommendations.

## Retention And Scale Notes

Placeholder: define retention for PO records, PO lines, approvals, submissions, responses, documents/exports, revisions, cancellations, receiving placeholders, exceptions, audit references, and external references.

Proposal-level scale controls should include PO line count caps/placeholders, large PO review thresholds, tenant/seller partitioning, response dedupe keys, revision/supersession limits, document retention placeholders, and bulk status pagination.