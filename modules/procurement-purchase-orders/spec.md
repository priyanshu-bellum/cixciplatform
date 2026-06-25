# Procurement / Purchase Orders Specification

This document is proposal-level architecture. It defines initial Procurement / Purchase Orders scope without finalizing PO types, approval thresholds, receiving ownership, submission transports, vendor/manufacturer response behavior, invoice eligibility, payment behavior, or implementation design.

## Purpose

Provide a bounded context for buyer-initiated bulk purchase order workflows for accessories, devices, and future enabled branded merchandise without turning normal customer order routing into procurement or turning procurement into fulfillment, invoicing, payment, catalog, device, tenant, integration, analytics, audit, notification, media, or AI ownership.

## Scope

Procurement / Purchase Orders owns:

- Purchase order creation.
- Purchase order draft state.
- Purchase order approval workflow and approval evidence.
- Purchase order submission.
- Purchase order status lifecycle.
- Purchase order lines.
- Accessory PO references.
- Device PO references.
- Branded merchandise PO placeholder.
- Bulk purchase request records.
- Vendor/manufacturer PO response tracking.
- PO document/export references.
- PO revision/supersession tracking.
- Receiving placeholders.
- PO exception/review states.
- Procurement events and signals.

## Out Of Scope

Procurement / Purchase Orders does not own:

- Normal customer order routing.
- Order Routing routed suborders.
- Pricing calculations or pricing interpretation.
- Product Catalog source records.
- Device Catalog canonical records.
- Tenant Company eligibility, roles, permissions, activation, or readiness.
- Fulfillment/Returns execution.
- Invoice Management lifecycle.
- Payment processing.
- Vendor/manufacturer source catalog ownership.
- Warranty claim lifecycle.
- Notification delivery.
- Logs & Audit evidence records.
- Integration Management connection state, credentials, delivery evidence, receipt evidence, or external ID mapping ownership.
- Analytics metric definitions or reporting models.
- Media source asset ownership.
- AI Agent recommendations.
- Vendor Operational Interface, Payment, Launch/Event Management, or Licensing modules.

## Procurement Vs Order Routing

- Procurement owns buyer bulk purchase workflows.
- Order Routing owns normal customer order routing and routed suborders.
- Procurement must not create normal customer routed suborders.
- Order Routing must not own bulk PO approval, submission, receiving, or PO lifecycle.
- A future business rule may allow a PO to create downstream fulfillment/receiving activity, but that boundary remains proposal-level.

## PO Target Model

Proposal-level rules:

- Default model should be one seller target per PO unless future rules explicitly support multi-seller POs.
- Seller target may be an accessory vendor or device manufacturer.
- PO header target and PO line target must not conflict.
- Line-level targets must match header target unless the PO is explicitly marked as multi-target by a future rule.
- Mixed vendor/manufacturer targets should route to review or require decomposition.
- Ambiguous target cardinality blocks submission.
- Multi-seller PO behavior remains future/open unless explicitly modeled.
- If multi-seller POs are later supported, lines must be grouped by seller target, submission reference, external PO reference, response lifecycle, and receiving placeholder.

## PO Inputs

Proposal-level PO inputs:

- Buyer parent/entity scope from Tenant Company.
- Seller target reference for accessory vendor or device manufacturer.
- Product Catalog product reference for accessory/branded product PO lines.
- Device Catalog Device Reference for device PO lines.
- Product Type.
- Requested quantity.
- Requested price snapshot / quote-like result reference from Pricing.
- Pricing snapshot version/hash and bindability status placeholder.
- Shipping destination / receiving location placeholder.
- Requested delivery date placeholder.
- Buyer user / approver reference.
- Approval policy/evidence reference placeholder.
- Integration method for vendor/manufacturer submission.
- Media references placeholder where relevant.
- AI procurement recommendation reference placeholder.

## PO Outputs

Proposal-level PO outputs:

- Purchase order record.
- Purchase order line.
- PO document/export reference.
- Vendor/manufacturer submission reference.
- External PO reference.
- Vendor/manufacturer response reference.
- PO status.
- PO approval record.
- PO revision/supersession reference.
- Receiving placeholder.
- PO exception/review state.
- Downstream fulfillment/receiving signal placeholder.
- Invoice/payment reference placeholder.
- Procurement events.

## PO Status Lifecycle

Proposal-level statuses:

- Draft.
- Pending Approval.
- Approved.
- Submitted.
- Accepted.
- Rejected.
- Partially Accepted.
- Backordered.
- Cancelled.
- Closed.
- Superseded.
- Review Required.

Status definitions and allowed transitions remain proposal-level. PO status should be derived from structured PO/line response state where vendor/manufacturer responses are involved.

## Approval And Permission Model

- Buyer users may draft POs based on permissions.
- Buyer approvers may approve POs.
- System admins may review/override where allowed.
- Vendors/manufacturers may respond to submitted POs where integration/onboarding allows.
- Tenant Company owns roles, permissions, company/entity scope, buyer/vendor/manufacturer eligibility, and activation/readiness.
- Procurement consumes scope and permissions; it does not define tenant eligibility.
- Procurement records approval evidence and workflow state.

Proposal-level approval evidence should include approval policy reference/version, threshold basis, approver authority snapshot, approver role/entity scope, approval chain, escalation chain, override flag/reason, rejection reason, approval expiration placeholder, and audit reference.

## Product Type Awareness

- Accessory PO lines reference Product Catalog.
- Branded merchandise PO lines may reference Product Catalog where enabled by ADR-0007.
- Device PO lines reference Device Catalog.
- Product Type influences PO validation and target type.
- Procurement consumes Product Type but does not own Product Type definitions.

## Pricing Relationship

- Pricing owns quote-like results, price snapshots, pricing exceptions, commercial interpretation, and pricing calculations.
- Procurement consumes price snapshot or quote-like references.
- Procurement must not recalculate price.
- PO lines should preserve price snapshot id, version/hash, bindability status, expiration timestamp, supersession status, quantity, requested price, accepted price placeholder, accepted price variance placeholder, and pricing evidence reference.
- Missing, stale, expired, superseded, non-procurement-bindable, or inconsistent price evidence should block or route the PO to review.
- Procurement must not reinterpret accepted price conflicts; pricing conflicts route to Pricing/review.

## Submission Relationship

PO submission may happen through Integration Management using API, webhook, CSV export, manual download/upload, SFTP placeholder, or future provider connectors.

Integration Management owns external connection state, credentials references, delivery evidence, receipt evidence, webhook/API transmission records, external ID mappings, and external action references. Procurement owns the PO record and lifecycle. Logs & Audit owns audit/file evidence.

External PO references may be stored as Procurement workflow references, but must not replace internal PO IDs.

## Vendor / Manufacturer Response Relationship

Proposal-level response handling should distinguish:

- PO-level response.
- Line-level response.
- Header/line response precedence.
- Accepted quantity.
- Rejected quantity.
- Backordered quantity.
- Partially accepted quantity.
- Unknown line reference behavior.
- Response conflict state.
- Response dedupe key.
- Response source reference.
- Response timestamp.
- Review-required state.

Partial acceptance and backorder behavior remain proposal-level but must be represented explicitly. Conflicting header and line responses should route to review.

## Receiving Placeholder

PO receiving may later be tracked as receiving state or handed off to Fulfillment/Returns if operational fulfillment is involved. This module does not finalize receiving ownership. Procurement may store receiving placeholders but must not absorb Fulfillment/Returns execution unless a future ADR/module assigns it.

## Invoice / Payment Boundary

Invoice Management may later consume PO accepted/received/completed references for billing where applicable. Procurement does not own invoice lifecycle and does not process payments. Payment processing remains future/placeholder unless assigned by future ADR.

## AI Agent Services Relationship

AI agents may recommend bulk purchase opportunities, draft PO suggestions, flag demand signals, compare vendor/manufacturer options, or identify inventory gaps. AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes. Procurement owns approved PO records and PO workflow. AI agents must not create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

## Analytics Relationship

Analytics may consume PO signals for bulk purchase interest, device demand, vendor demand, buyer purchasing behavior, procurement performance, and backorder trends. Analytics owns reporting models and metrics. Procurement owns PO source records and lifecycle.

## Notification Hooks

Procurement may emit events that later trigger notifications. Notification Platform Service owns delivery. Possible notifications include PO approval required, PO submitted, vendor/manufacturer response received, PO rejected, PO accepted, backorder status, and PO review required.

## Logs & Audit Relationship

PO creation, approval, submission, revision, cancellation, vendor/manufacturer response, export/import, and status changes should be auditable. Logs & Audit owns audit evidence and file tracking. Procurement owns PO workflow/state.

## Scale Controls

Proposal-level controls should include PO line count caps/placeholders, large PO review thresholds, async PO submission jobs, document/export throttling, approval queue priority, approval queue SLA placeholder, response retry budgets, response dedupe keys, bulk status pagination, backorder volume controls, revision/supersession limits, document retention placeholders, and tenant/seller partitioning.

## Proposal-Level Constraints

- Preserve ADR-0017 boundaries.
- Keep unresolved procurement behavior proposal-level.
- Do not recalculate price.
- Do not create normal customer routed suborders.
- Do not process payments.
- Do not own fulfillment execution unless a future ADR assigns it.
- Do not create Payment, Vendor Operational Interface, Launch/Event Management, or Licensing modules.