# ADR-0017: Procurement / Purchase Orders Bounded Context

## Status

Proposed

## Context

CIXCI needs to support future buyer bulk purchasing workflows for accessories and devices.

Buyers may need to create purchase orders for:

- Bulk accessory purchases from accessory vendors.
- Bulk device purchases from device manufacturers.
- Future branded merchandise or licensed products where enabled.

This workflow is different from normal customer order routing. Order Routing handles buyer customer orders and routed suborders. Procurement / Purchase Orders handles buyer-initiated bulk purchase requests, approval workflows, PO documents, PO lines, PO submission, vendor/manufacturer responses, and PO lifecycle tracking.

This ADR is proposal-level. It does not finalize purchase order types, approval thresholds, receiving ownership, submission transports, vendor/manufacturer response behavior, invoice eligibility, payment behavior, or implementation design.

## Decision

Introduce Procurement / Purchase Orders as a distinct bounded context.

Procurement / Purchase Orders owns buyer bulk purchase order creation, draft state, approval workflow, submission, status lifecycle, purchase order lines, vendor/manufacturer response tracking, document/export references, revision/supersession tracking, receiving placeholders, exceptions/review states, and procurement events.

Procurement / Purchase Orders must not become normal customer order routing, fulfillment execution, invoice lifecycle, payment processing, catalog/device source-of-truth, tenant eligibility, warranty claim lifecycle, notification delivery, audit evidence storage, analytics metric ownership, or AI recommendation ownership.

### Procurement / Purchase Orders Owns

- Purchase order creation.
- Purchase order draft state.
- Purchase order approval workflow.
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
- PO events and signals.

### Procurement / Purchase Orders Does Not Own

- Normal customer order routing.
- Order Routing routed suborders.
- Pricing calculations.
- Product Catalog source records.
- Device Catalog canonical records.
- Tenant Company eligibility.
- Fulfillment/Returns execution.
- Invoice Management lifecycle.
- Payment processing.
- Vendor/manufacturer source catalog ownership.
- Warranty claim lifecycle.
- Notification delivery.
- Logs & Audit evidence records.
- Analytics metric definitions.
- AI Agent recommendations.

## Relationship Boundaries

### Tenant Company

Tenant Company owns company/entity hierarchy, users, roles, permissions, activation state, buyer/vendor/manufacturer scope, buyer/vendor/manufacturer eligibility, product-type eligibility, licensed-property scope, region scope, and relationship eligibility.

Procurement consumes buyer parent/entity scope, buyer user and approver references, vendor/manufacturer eligibility, Product Type enablement, licensed-property scope where applicable, and permission signals. Procurement must not define tenant eligibility, grant permissions, manage users, approve buyer/vendor/manufacturer relationships, or derive company readiness.

### Product Catalog

Product Catalog owns accessory product records, category-extensible branded product records where enabled, Product Type validation, product lifecycle, product visibility/activation/download state, compatibility assertions, catalog-carried pricing inputs, product warranty facts, and product media attachment references.

Procurement may reference Product Catalog products for accessory PO lines and future branded merchandise PO placeholders. Procurement must not own product source records, Product Type definitions, category validation, compatibility, product visibility, catalog imports, catalog-carried pricing inputs, or product media attachment decisions.

### Device Catalog

Device Catalog owns canonical Device References, device master records, device identity, lifecycle status, manufacturer source data, buyer device portfolio references, and device export records.

Procurement may reference Device Catalog Device References for device PO lines and future manufacturer purchase requests. Procurement must not own canonical device records, device identity resolution, device lifecycle, buyer device portfolio state, or manufacturer device source data.

### Pricing

Pricing owns quote-like results, price snapshots, pricing exceptions, commercial interpretation, pricing calculations, commission/rev-share interpretation, effective dating, and pricing audit.

Procurement consumes requested price snapshot or quote-like references. Procurement must not recalculate price, interpret pricing exceptions, decide commercial precedence, or alter Pricing snapshots.

PO lines should preserve price snapshot reference, quantity, requested price, accepted price placeholder, and pricing evidence reference.

### Order Routing

Order Routing handles buyer customer orders that need to be routed for fulfillment. It owns routed orders, routed suborders, routing snapshots, split-order decisions, routing exceptions, and routing retry/review workflows.

Procurement / Purchase Orders handles buyer bulk purchase orders sent to vendors or manufacturers. Procurement must not create normal customer routed suborders. Order Routing must not own bulk PO approval, submission, receiving, or PO lifecycle.

A future business rule may allow a PO to create downstream fulfillment/receiving activity, but that boundary remains proposal-level.

### Fulfillment / Returns

Fulfillment and Returns owns fulfillment execution, shipment status, delivery status, return operational state, replacement execution, and fulfillment/return exceptions.

Procurement may store receiving placeholders or emit downstream fulfillment/receiving signal placeholders. This ADR does not finalize receiving ownership. Procurement must not absorb Fulfillment/Returns execution unless a later ADR/module assigns that boundary.

### Invoice Management

Invoice Management owns invoice lifecycle, invoice records, invoice reports, invoice exports, invoice status, invoice history, and proposal-level reconciliation placeholders.

Invoice Management may later consume PO accepted, received, completed, or invoice-eligible references for billing where applicable. Procurement does not own invoice lifecycle and does not process payments.

### Logs & Audit File Tracking

PO creation, approval, submission, revision, cancellation, vendor/manufacturer response, export/import, and status changes should be auditable.

Logs & Audit owns audit evidence and file tracking. Procurement owns PO workflow and state.

### Notification Platform Service

Procurement may emit events that later trigger notifications. Notification Platform Service owns delivery, recipient resolution, preferences, templates, retries, suppression, and delivery history.

Possible notification triggers include PO approval required, PO submitted, vendor/manufacturer response received, PO rejected, PO accepted, backorder status, and PO review required.

### Integration Management

PO submission may happen through Integration Management using API, webhook, CSV export, manual download/upload, SFTP placeholder, or future provider connectors.

Integration Management owns external connection state, credential references, delivery evidence, webhook/API transmission records, external action references, and external ID mappings. Procurement owns the PO record and PO lifecycle. Logs & Audit owns audit/file evidence.

### AI Agent Services

AI agents may recommend bulk purchase opportunities, draft PO suggestions, flag demand signals, compare vendor/manufacturer options, or identify inventory gaps.

AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes. Procurement owns approved PO records and PO workflow. AI agents must not create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

### Analytics

Analytics may consume PO signals for bulk purchase interest, device demand, vendor demand, buyer purchasing behavior, and procurement performance.

Analytics owns reporting models and metrics. Procurement owns PO source records and lifecycle.

### Media / Image Asset Management

Media / Image Asset Management owns Media Asset IDs, media storage references, renditions, asset metadata, URL references, and processing state.

Procurement may consume media references for product/device context where relevant, but must not own media source assets, media transformations, media access policy, or Product Catalog / Device Catalog media attachment decisions.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability and does not create a full Warranty Management bounded context yet.

Procurement may preserve warranty-related product facts or references where bulk purchases later require registration or support, but it must not own warranty eligibility, warranty claim approval, warranty registration delivery, replacement execution, or vendor warranty system state.

## Procurement Vs Order Routing

Order Routing handles buyer customer orders that need to be routed for fulfillment.

Procurement / Purchase Orders handles buyer bulk purchase orders sent to vendors or manufacturers.

Procurement must not create normal customer routed suborders.

Order Routing must not own bulk PO approval, submission, receiving, or PO lifecycle.

A future business rule may allow a PO to create downstream fulfillment/receiving activity, but that boundary remains proposal-level.

## PO Inputs

Proposal-level PO inputs include:

- Buyer parent/entity scope from Tenant Company.
- Vendor or manufacturer target reference.
- Product Catalog product reference for accessory/branded product PO lines.
- Device Catalog Device Reference for device PO lines.
- Product Type.
- Requested quantity.
- Requested price snapshot / quote-like result reference from Pricing.
- Shipping destination / receiving location placeholder.
- Requested delivery date placeholder.
- Buyer user / approver reference.
- Integration method for vendor/manufacturer submission.
- Media references placeholder where relevant.
- AI procurement recommendation reference placeholder.

These inputs are consumed for procurement workflow only. They do not transfer source-of-truth ownership into Procurement.

## PO Outputs

Proposal-level PO outputs include:

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

Outputs should preserve upstream references rather than copying source records where boundary references are sufficient.

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

Status definitions remain proposal-level. Future module work should define allowed transitions, terminal states, revision behavior, cancellation rules, and line-level versus header-level status behavior.

## Approval And Permission Model

Proposal-level approval and permission guidance:

- Buyer users may draft POs based on permissions.
- Buyer approvers may approve POs.
- System admins may review/override where allowed.
- Vendors/manufacturers may respond to submitted POs where integration/onboarding allows.
- Tenant Company owns roles, permissions, company/entity scope, and buyer/vendor/manufacturer eligibility.
- Procurement consumes scope and permissions; it does not define tenant eligibility.

Approval thresholds, approval chains, dollar amount limits, quantity limits, Product Type-specific approval rules, and entity-specific policies remain unresolved.

## Product Type Awareness

Accessory PO lines reference Product Catalog.

Branded merchandise PO lines may reference Product Catalog where enabled by ADR-0007.

Device PO lines reference Device Catalog.

Product Type influences PO validation and target type.

Procurement consumes Product Type but does not own Product Type definitions.

## Pricing Relationship

Pricing owns quote-like results, price snapshots, pricing exceptions, commercial interpretation, and pricing calculations.

Procurement consumes price snapshot or quote-like references.

Procurement must not recalculate price.

PO lines should preserve:

- Price snapshot reference.
- Quantity.
- Requested price.
- Accepted price placeholder.
- Pricing evidence reference.

If required price evidence is missing, stale, non-procurement-bindable, or inconsistent, Procurement should block or route the PO to review rather than calculating price.

## Vendor / Manufacturer Submission

PO submission may happen through Integration Management using:

- API.
- Webhook.
- CSV export.
- Manual download/upload.
- SFTP placeholder.
- Future provider connectors.

Integration Management owns external connection state, credential references, delivery evidence, webhook/API transmission records, and external action references.

Procurement owns the PO record and PO lifecycle.

Logs & Audit owns audit/file evidence.

## Receiving Placeholder

PO receiving may be tracked later as receiving state or handed off to Fulfillment/Returns if operational fulfillment is involved.

This ADR does not finalize receiving ownership.

Procurement may store receiving placeholders but must not absorb Fulfillment/Returns execution unless a later ADR/module assigns it.

## Invoice / Payment Boundary

Invoice Management may later consume PO accepted/received/completed references for billing where applicable.

Procurement does not own invoice lifecycle.

Procurement does not process payments.

Payment processing remains future/placeholder unless assigned by future ADR.

## AI Agent Services Relationship

AI agents may recommend bulk purchase opportunities, draft PO suggestions, flag demand signals, compare vendor/manufacturer options, or identify inventory gaps.

AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes.

Procurement owns approved PO records and PO workflow.

AI agents must not create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

## Analytics Relationship

Analytics may consume PO signals for:

- Bulk purchase interest.
- Device demand.
- Vendor demand.
- Buyer purchasing behavior.
- Procurement performance.

Analytics owns reporting models and metrics. Procurement owns PO source records and lifecycle.

## Notification Hooks

Procurement may emit events that later trigger notifications.

Notification Platform Service owns delivery.

Possible notification triggers include:

- PO approval required.
- PO submitted.
- Vendor/manufacturer response received.
- PO rejected.
- PO accepted.
- Backorder status.
- PO review required.

## Logs & Audit Relationship

PO creation, approval, submission, revision, cancellation, vendor/manufacturer response, export/import, and status changes should be auditable.

Logs & Audit owns audit evidence and file tracking.

Procurement owns PO workflow/state.

## Events

Proposal-level events:

- `procurement.po.created`.
- `procurement.po.updated`.
- `procurement.po.approval.requested`.
- `procurement.po.approved`.
- `procurement.po.rejected`.
- `procurement.po.submitted`.
- `procurement.po.accepted`.
- `procurement.po.partially-accepted`.
- `procurement.po.backordered`.
- `procurement.po.cancelled`.
- `procurement.po.closed`.
- `procurement.po.superseded`.
- `procurement.po.review-required`.
- `procurement.po.vendor-response.received`.
- `procurement.po.manufacturer-response.received`.

Event payloads should use references and consumer-appropriate fields. Sensitive buyer, vendor, manufacturer, pricing, product, device, media, payment, or commercial details should be scoped and redacted by consumer class.

## Open Questions

- Are accessory and device POs handled in the same PO object or separate PO types?
- Can one PO include both accessories and devices?
- Can one PO include multiple vendors/manufacturers, or must each PO target one seller?
- Who can approve buyer POs?
- Are approval thresholds based on dollar amount, quantity, buyer entity, or Product Type?
- What lifecycle event makes a PO invoice-eligible?
- Does PO receiving belong in Procurement or Fulfillment/Returns?
- What integration methods are supported at launch for vendor/manufacturer PO submission?
- Should vendors/manufacturers accept/reject PO lines individually?
- How are backorders handled?
- How are PO revisions and cancellations handled after submission?
- Can AI draft POs, and what approval is required before submission?
- What audit/file tracking is required for PO exports/imports?
- What data should Analytics expose about procurement demand?

## Impacts

Future Procurement / Purchase Orders module drafting should define:

- Purchase order record and PO line model.
- PO status lifecycle and transition rules.
- Approval workflow and permission model.
- Product Type-aware PO validation.
- Pricing snapshot / quote-like input contracts.
- Vendor/manufacturer submission contracts through Integration Management.
- Vendor/manufacturer response model.
- PO document/export reference model.
- Revision, supersession, cancellation, and exception behavior.
- Receiving placeholder model and boundary with Fulfillment/Returns.
- Invoice/payment reference placeholders.
- Logs & Audit references for PO workflow and file exchanges.
- Notification hooks.
- AI Agent Services signal and action boundaries.
- Analytics signal contracts.

Future Order Routing, Fulfillment/Returns, Invoice Management, Integration Management, Logs & Audit, Notification, Analytics, AI Agent Services, Product Catalog, Device Catalog, Pricing, and Tenant Company refinements should preserve Procurement / Purchase Orders as the owner of bulk PO lifecycle without moving their source-of-truth responsibilities into Procurement.

## Consequences

- Procurement / Purchase Orders becomes the canonical owner of buyer bulk purchase order records, approval workflow, submission, status lifecycle, PO lines, vendor/manufacturer responses, revisions, and procurement events.
- Order Routing remains focused on normal buyer customer orders and routed suborders.
- Pricing remains owner of pricing calculation and quote/snapshot evidence.
- Product Catalog and Device Catalog remain source-of-truth for product and device records.
- Tenant Company remains owner of eligibility, scope, roles, and permissions.
- Fulfillment/Returns and Invoice Management remain downstream operational/financial owners where future PO receiving or billing references are needed.
- Integration Management, Logs & Audit, Notification, Analytics, and AI Agent Services can support procurement workflows without owning PO lifecycle.
