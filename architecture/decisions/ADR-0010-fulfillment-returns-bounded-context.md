# ADR-0010: Fulfillment And Returns Bounded Context

## Status

Proposed

## Context

Fulfillment and Returns sit downstream of Order Routing.

Order Routing decides how an order is assigned and decomposed, but Fulfillment and Returns own execution state once routed orders are handed off for shipping, delivery, return processing, replacement handling, and operational status tracking.

CIXCI order flows may include accessories, devices, future branded merchandise, vendor-fulfilled items, manufacturer-supplied items, split orders, warranty-triggered replacements, return receipts, and operational exceptions. Without an explicit boundary, Fulfillment and Returns could absorb routing decisions, pricing logic, invoice lifecycle, warranty claim approval, procurement purchase order lifecycle, notification delivery, or analytics reporting definitions.

## Decision

Introduce Fulfillment and Returns as a distinct bounded context.

Fulfillment and Returns owns operational execution state after routed order handoff. It consumes routed suborders and references from upstream modules, tracks shipment/delivery/return/replacement execution, emits operational events and exception signals, and provides evidence to downstream consumers.

This ADR is proposal-level. It does not finalize vendor integration contracts, carrier integrations, shipment status model, return approval rules, replacement policies, SLA targets, notification rules, invoice triggers, or implementation behavior.

### Fulfillment And Returns Owns

- Vendor/manufacturer fulfillment handoff tracking.
- Shipment status.
- Tracking information.
- Delivery status.
- Fulfillment exceptions.
- Return request operational handling.
- Return authorization references.
- Return receipt tracking.
- Replacement shipment execution.
- Fulfillment/return events.
- SLA and operational exception signals.

### Fulfillment And Returns Does Not Own

- Pricing calculation.
- Order routing decisions.
- Product/device source-of-truth.
- Tenant eligibility.
- Invoice lifecycle.
- Warranty claim approval.
- Procurement PO lifecycle.
- Analytics reporting definitions.
- Notification delivery.

## Relationship Boundaries

### Order Routing

Order Routing owns routing decisions, order decomposition, routed order records, vendor/manufacturer suborder structure, split-order decisions, routing snapshots, routing exceptions, and routing events.

Fulfillment and Returns consumes routed suborder references, parent order references, order line references, routing snapshot references, fulfillment target placeholders, tenant scope references, Product Type, product/device references, price snapshot references, and warranty registration required signal placeholders.

Fulfillment and Returns must not choose vendors, split orders, re-route orders, alter routing snapshots, or recalculate routing decisions. If fulfillment cannot execute a routed handoff, it should emit a fulfillment exception or handoff rejection signal rather than silently changing routing.

### Product Catalog

Product Catalog owns product records, Product Type definitions and validation, product lifecycle, product-level visibility, activation/download records, compatibility assertions, warranty product facts, stop-sell/deactivation records, and product references.

Fulfillment and Returns may consume Product Catalog references, Product Type, product metadata needed for operational handling, packaging or handling placeholders where defined, and warranty product fact references where authorized. Fulfillment and Returns must not create, validate, publish, activate, deactivate, or alter Product Catalog records.

### Device Catalog

Device Catalog owns canonical Device records, Device References, device identifiers, normalization, lifecycle metadata, taxonomy, buyer-exportable device data, and device events.

Fulfillment and Returns may consume Device References and safe device attributes where relevant for device shipments, returns, replacements, or operational matching. Fulfillment and Returns must not mutate canonical device data, resolve device identity, own buyer device export state, or own manufacturer procurement workflow.

### Pricing

Pricing owns price calculation, pricing profiles, commission/margin interpretation, pricing exceptions, quote-like results, effective price snapshots, pricing audit, and pricing events.

Fulfillment and Returns may reference price snapshot identifiers for returns, replacement context, invoice evidence, or operational audit where required. Fulfillment and Returns must not calculate price, alter pricing snapshots, determine refunds, decide credits, or interpret commercial pricing policy.

### Tenant Company

Tenant Company owns tenant scope, buyer/entity hierarchy, relationship eligibility, geography eligibility, activation readiness, product-type enablement scope, licensed-property scope, user/entity access, and readiness signals.

Fulfillment and Returns may consume tenant/buyer/entity scope references for authorization, operational ownership, vendor/buyer relationship context, and event scoping. Fulfillment and Returns must not derive eligibility, approve relationships, manage parent/child hierarchy, or decide user/entity access.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability and does not create a full Warranty Management bounded context yet.

Warranty claims may trigger replacement or return execution. Fulfillment and Returns may execute approved replacement or return actions when an owning warranty-support workflow, buyer-facing module, or future Warranty Management context provides an approved signal.

Fulfillment and Returns does not decide warranty eligibility, warranty claim approval, claim denial, vendor warranty registration delivery, customer warranty UX, or vendor warranty system state.

### Invoice Management

Invoice Management owns invoice lifecycle, payment/accounting records, refunds, credits, adjustments, reconciliation, commercial settlement, corrections, disputes, and invoice status.

Fulfillment and Returns may emit shipment, delivery, return receipt, replacement, or operational exception evidence that Invoice Management may later consume. Fulfillment and Returns must not issue invoices, capture payments, determine refunds, decide credits/adjustments, reconcile vendor invoices, or own invoice lifecycle.

### Logs & Audit

Logs & Audit may own centralized audit records, file tracking, transmission logs, retention policy, compliance review workflows, and evidence retention where that platform service exists.

Fulfillment and Returns owns operational fulfillment/return records and operational events. Logs & Audit may consume those records or events for retention, file tracking, transmission audit, and compliance evidence.

### AI Agent Services

AI Agent Services may consume fulfillment and return signals and produce recommendations, suggested review actions, confidence scores, risk signals, or outcome tracking.

AI agents may recommend review actions but must not alter fulfillment/return state, create shipments, approve returns, mark delivery, create replacements, or bypass exceptions without approved action contracts and audit tracking.

### Notification Platform Service Future Placeholder

Fulfillment and Returns may emit business events that later trigger notifications.

Notification delivery, templates, recipient resolution, preferences, retries, delivery status, suppression rules, and delivery audit belong to a future Notification platform service if introduced.

Fulfillment and Returns owns business events and operational state only. It should not become the notification system.

### Analytics

Analytics owns reporting models, rollups, metrics, analytical read models, dashboards, and reporting latency decisions.

Fulfillment and Returns may emit operational events and snapshots for Analytics. Analytics must not become the owner of shipment state, return state, replacement execution, SLA signals, or operational exception workflow.

## Fulfillment Inputs

Proposal-level fulfillment inputs include:

- Routed suborder reference from Order Routing.
- Parent order reference.
- Order line reference.
- Product Catalog references.
- Device Catalog references where relevant.
- Product Type.
- Vendor/manufacturer fulfillment target.
- Price snapshot reference.
- Tenant/buyer/entity scope.
- Warranty registration required signal placeholder.
- Return eligibility signal placeholder.
- Routing snapshot reference.
- Quantity and operational handling references where authorized.

These inputs are consumed for fulfillment and return execution only. They do not transfer ownership of routing, pricing, product, device, tenant, warranty, or invoice decisions into Fulfillment and Returns.

## Fulfillment Outputs

Proposal-level fulfillment outputs include:

- Fulfillment record.
- Shipment record.
- Tracking reference.
- Shipment status.
- Delivery status.
- Fulfillment exception.
- Return request reference.
- Return authorization reference.
- Return receipt record.
- Replacement shipment reference.
- Downstream invoice/warranty/logging signals.
- SLA and operational exception signals.
- Fulfillment and return events.

Outputs should preserve upstream references rather than copying full source records where a boundary reference is sufficient.

## Returns Boundary

Returns operational handling may live with Fulfillment initially.

Returns owns operational return state, return receipt tracking, return exception handling, and replacement execution when a return or approved warranty action results in physical movement or replacement shipment.

Returns does not own warranty claim approval unless future Warranty Management assigns that boundary.

Returns does not own refund, credit, adjustment, payment, invoice, reconciliation, or accounting lifecycle unless future Invoice Management or Payments boundaries assign those behaviors.

Return authorization references should be modeled as references unless Fulfillment and Returns is explicitly assigned return authorization decision ownership in a future refinement.

## Product Type Awareness

Accessories, devices, and future branded merchandise may have different fulfillment and return requirements.

Fulfillment and Returns consumes Product Type to determine operational handling needs such as packaging, shipping constraints, return handling, replacement handling, carrier or target constraints, and review requirements.

Fulfillment and Returns does not own Product Type definitions, Product Type validation, Category Validation Profile behavior, product records, or device records.

Product Catalog and Device Catalog remain source-of-truth for product and device data.

## Warranty Interaction

Warranty claims may trigger replacement or return execution.

Fulfillment and Returns may execute approved replacement or return actions after receiving an approved signal from the owning warranty-support workflow, buyer-facing module, or future Warranty Management context.

Fulfillment and Returns may emit operational evidence such as replacement shipment created, return received, or fulfillment exception created.

Fulfillment and Returns does not decide warranty eligibility, claim approval, claim denial, vendor warranty registration, warranty claim status, customer warranty UX, or warranty financial adjustment behavior.

## Notification Hooks

Fulfillment and Returns may emit events that later trigger notifications.

Possible notification-triggering events include shipment created, tracking updated, delivered, fulfillment exception created, return authorization created, return received, replacement shipment created, and return exception created.

Notification delivery, templates, recipient resolution, preferences, retries, delivery status, suppression rules, and delivery audit belong to a future Notification platform service.

Fulfillment and Returns should expose business events and operational state; it should not own notification delivery implementation.

## Events And Signals

Proposal-level events include:

- `fulfillment.handoff.received`.
- `fulfillment.shipment.created`.
- `fulfillment.shipment.updated`.
- `fulfillment.delivered`.
- `fulfillment.exception.created`.
- `return.request.received`.
- `return.authorization.created`.
- `return.received`.
- `return.replacement.shipment.created`.
- `return.exception.created`.

Event payloads should use references and consumer-appropriate fields. Sensitive customer, tenant, vendor, pricing, warranty, tracking, or return details should be redacted or scoped by consumer class.

## SLA And Operational Exception Signals

Fulfillment and Returns may emit operational signals such as:

- Shipment delayed.
- Missing tracking.
- Delivery delayed.
- Vendor fulfillment failure.
- Manufacturer fulfillment failure.
- Return receipt delayed.
- Replacement delayed.
- Repeated vendor SLA risk.
- High return operational review signal.

These are operational signals, not Analytics metric definitions. Analytics may consume them but owns rollups and reporting definitions.

## AI Agent Services Signals

Possible signals for AI Agent Services include:

- Late shipment risk.
- Repeated fulfillment failure.
- Vendor SLA risk.
- High return rate.
- Replacement delay risk.
- Missing tracking signal.
- Return exception review signal.
- Carrier or fulfillment target anomaly placeholder.

AI agents may recommend review actions, summarize risk clusters, suggest review queues, or identify operational patterns. AI agents must not alter fulfillment/return state, mark shipment delivered, create replacements, approve returns, resolve exceptions, or bypass workflows without approved action contracts and audit tracking.

## Open Questions

- Is fulfillment status sourced from vendors, manufacturers, carriers, buyers, or all of them?
- When does CIXCI consider an order fulfilled: shipped, delivered, or vendor-confirmed?
- Which return reasons are supported?
- Who approves return requests?
- How are replacements handled versus refunds?
- Which return workflows are buyer-managed versus vendor-managed?
- What shipment/return fields are required from vendors?
- How are partial shipments handled?
- How are mixed product-type orders handled?
- What fulfillment events should trigger future notifications?
- What data must be retained for invoice/reconciliation?
- Which fulfillment/return events are required by Invoice Management, Warranty support, Logs & Audit, Analytics, AI Agent Services, and future Notification service?
- Which carrier, vendor, manufacturer, or buyer statuses are authoritative when they conflict?
- What SLA targets are operational rules versus Analytics reporting metrics?

## Impacts

Future Fulfillment and Returns module drafting should define:

- Fulfillment record and shipment data model.
- Handoff contract from Order Routing.
- Shipment status and delivery status model.
- Tracking reference contract.
- Fulfillment exception taxonomy.
- Return request, return authorization reference, and return receipt model.
- Replacement shipment execution model.
- Product Type-aware fulfillment and return scenarios.
- Warranty-triggered replacement/return boundaries.
- Invoice Management evidence needs.
- Logs & Audit evidence and retention needs.
- Notification event hooks without owning notification delivery.
- AI Agent Services signal contracts.
- SLA and operational exception signals.

Future Order Routing, Product Catalog, Device Catalog, Pricing, Tenant Company, Warranty support, Invoice Management, Logs & Audit, AI Agent Services, Notification, and Analytics refinements should preserve Fulfillment and Returns as the owner of fulfillment/return execution state without moving their source-of-truth responsibilities into Fulfillment and Returns.

## Consequences

- Fulfillment and Returns becomes the canonical owner of shipment, delivery, return, replacement, fulfillment exception, and operational execution state.
- Order Routing remains the owner of route decisions and suborder assignment.
- Product Catalog and Device Catalog remain source-of-truth for product and device data.
- Pricing remains the owner of price calculation and price snapshots.
- Tenant Company remains source-of-truth for tenant eligibility and scope.
- Warranty support remains cross-module and does not become Fulfillment-owned claim approval.
- Invoice Management remains the owner of invoice lifecycle, refunds, credits, adjustments, reconciliation, and accounting behavior.
- Notification delivery remains a future platform service rather than a Fulfillment responsibility.
- Analytics can consume fulfillment/return signals without owning operational execution state.
