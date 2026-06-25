# ADR-0009: Order Routing Bounded Context

## Status

Proposed

## Context

Order Routing must sit between Pricing and Fulfillment.

It must decide how an accepted buyer order is decomposed, assigned, and prepared for downstream execution without absorbing Pricing, Product Catalog, Device Catalog, Tenant Company, Fulfillment, Invoice Management, Warranty, or Analytics responsibilities.

CIXCI order flows may include accessories, devices, future branded merchandise, vendor-fulfilled items, manufacturer-supplied items, split orders, warranty registration requirements, and future procurement references. Without an explicit boundary, Order Routing could become an oversized operational domain that calculates prices, owns catalog facts, performs fulfillment, drives invoice lifecycle, adjudicates warranty claims, or becomes a procurement system.

## Decision

Introduce Order Routing as a distinct bounded context.

Order Routing owns routing decisions and routing evidence for accepted buyer orders. It consumes upstream tenant, catalog, device, pricing, and order-intake context, then produces routed order structures and downstream execution instructions for the appropriate owning modules.

This ADR is proposal-level. It does not finalize order lifecycle, payment timing, routing algorithms, vendor assignment rules, fulfillment contracts, warranty trigger timing, retry behavior, or manual override policy.

### Order Routing Owns

- Routing decisions.
- Order decomposition.
- Parent order to vendor/manufacturer suborder structure.
- Split-order decisions.
- Vendor/manufacturer assignment logic.
- Routing snapshots.
- Routing exceptions.
- Routing retry/review workflows.
- Routing events.

### Order Routing Does Not Own

- Tenant eligibility.
- Product/device source-of-truth.
- Product-type validation.
- Pricing calculation.
- Payment capture.
- Fulfillment execution.
- Shipping status.
- Return execution.
- Invoice lifecycle.
- Warranty claim approval.
- Analytics reporting definitions.

## Relationship Boundaries

### Tenant Company

Tenant Company owns tenant scope, buyer/entity hierarchy, relationship eligibility, geography eligibility, activation readiness, product-type enablement scope, licensed-property scope, user/entity access, and readiness signals.

Order Routing may consume buyer/entity scope, vendor/manufacturer relationship eligibility, readiness, and region signals. Order Routing must not derive tenant eligibility, approve vendor-buyer relationships, manage parent/child scope, or decide user/entity access.

### Product Catalog

Product Catalog owns product records, Product Type validation, Category Validation Profile behavior, product-level visibility, product lifecycle state, product activation/download records, accessory compatibility assertions, catalog-carried pricing inputs, warranty product facts, and product references.

Order Routing may consume Product Catalog references, Product Type, product lifecycle/routability signals, stop-sell/deactivation signals, compatibility references where relevant, warranty registration requirement signals, and product metadata needed for routing. Order Routing must not own product records, Product Type definitions, Product Type validation, category validation, product-level visibility, activation/download, compatibility authority, or product warranty terms.

### Device Catalog

Device Catalog owns canonical Device records, Device References, device identifiers, normalization, lifecycle metadata, taxonomy, buyer-exportable device data, and device events.

Order Routing may consume Device References and safe device attributes where relevant for device order lines, accessory compatibility context, or future manufacturer/manufacturer target selection. Order Routing must not mutate canonical device data, resolve canonical device identity, own buyer device export state, or own manufacturer procurement workflows.

### Pricing

Pricing owns price calculation logic, pricing profiles, commission/margin interpretation, pricing exceptions, effective price snapshots, quote-like results, pricing audit, and pricing events.

Order Routing may consume pricing snapshots, quote-like results, order-bindable price references, pricing exception status, and pricing audit references. Order Routing must not recalculate price, alter pricing snapshots, resolve pricing conflicts, or decide commercial interpretation.

### Fulfillment / Returns

Fulfillment and Returns own shipment execution, fulfillment status, return execution, operational fulfillment exceptions, replacement shipment execution, and downstream logistics state.

Order Routing may produce downstream fulfillment instruction placeholders and target references. Fulfillment/Returns own whether and how those instructions become shipments, returns, replacements, tracking events, or operational exceptions. Order Routing must not own shipping status, warehouse execution, carrier behavior, return approval, or replacement shipment execution.

### Invoice Management

Invoice Management owns invoice lifecycle, payment/accounting records, reconciliation, commercial settlement, corrections, credits, adjustments, and invoice status.

Order Routing may provide routed order, suborder, pricing snapshot reference, and routing snapshot evidence to Invoice Management. Order Routing must not issue invoices, capture payments, reconcile amounts, decide credits/adjustments, or own invoice lifecycle.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability, not a full Warranty Management bounded context yet.

Order Routing may emit or carry a `warranty.registration.required` signal if a routed order line includes warranty registration requirements. Order Routing may preserve warranty registration requirement references on routed order lines or suborders.

Order Routing does not own warranty product facts, customer warranty claim lifecycle, warranty claim approval, vendor warranty systems, warranty registration delivery, replacement fulfillment, or warranty claim status unless a future ADR assigns that responsibility.

### Logs & Audit

Logs & Audit owns audit/file tracking for transmissions, retries, failures, manual files, and retained operational evidence where that platform service exists.

Order Routing owns routing snapshots and routing decision audit evidence, but Logs & Audit may own centralized audit records, file tracking, transmission logs, retention policy, and compliance review workflows.

### AI Agent Services

AI Agent Services may consume routing signals and produce recommendations, suggested actions, confidence scores, review queues, or outcome tracking.

AI agents may recommend routing review actions but must not override routing decisions without approved action contracts and audit tracking. Order Routing remains responsible for routing decisions and routing snapshots.

### Analytics

Analytics owns reporting models, rollups, metrics, analytical read models, and reporting latency decisions.

Order Routing may emit routing events and snapshots for Analytics. Analytics must not become the owner of routing decisions, routing exceptions, routing retries, or routed order state.

### Future Procurement / Purchase Orders

Bulk purchase orders for devices or accessories may need a future Procurement / Purchase Orders bounded context.

Order Routing should not absorb procurement approval, purchase order lifecycle, purchase order submission, receiving, procurement reconciliation, or manufacturer purchasing workflow. Order Routing may reference procurement-related placeholders only where needed for routing context until a future context is defined.

## Routing Inputs

Proposal-level routing inputs include:

- Buyer/entity scope from Tenant Company.
- Order lines from buyer-facing order intake.
- Product Catalog references.
- Device Catalog references where relevant.
- Product Type.
- Pricing snapshot / quote-like result from Pricing.
- Vendor/manufacturer relationship eligibility.
- Fulfillment capability placeholder.
- Warranty registration requirement signal placeholder.
- Product lifecycle, stop-sell, activation, or routability signals where authorized.
- Region, channel, or tenant scope signals where relevant.

These inputs are consumed for routing only. They do not transfer source-of-truth ownership into Order Routing.

## Routing Outputs

Proposal-level routing outputs include:

- Routed order record.
- Vendor suborder.
- Manufacturer suborder placeholder.
- Routing snapshot.
- Routing decision summary.
- Routing exception / review-required state.
- Downstream fulfillment instruction placeholder.
- Warranty registration required signal placeholder.
- Routing events.
- Manual review or retry state.

Routing outputs should preserve upstream references instead of copying full source records where a boundary reference is sufficient.

## Split-Order / Multi-Party Orchestration

One buyer order may split across vendors, manufacturers, or downstream fulfillment targets.

Order Routing should preserve parent order linkage across every routed suborder.

Suborders must preserve:

- Parent order reference.
- Order line references.
- Product Catalog references.
- Device References where relevant.
- Product Type.
- Price snapshot or quote-like result reference.
- Tenant scope and buyer/entity references.
- Vendor/manufacturer assignment references.
- Fulfillment target references.
- Warranty registration requirement references where applicable.

Routing must not recalculate price. If a required pricing snapshot or order-bindable price reference is missing, stale, rejected, or invalid, Order Routing should produce a routing exception or review-required state rather than calculating price.

## Product Type Awareness

Accessories, devices, and future branded merchandise may have different routing needs.

Order Routing consumes Product Type to determine whether a line requires accessory routing, device routing, branded merchandise routing, vendor/manufacturer assignment, fulfillment capability checks, warranty registration handling, or review.

Order Routing does not own Product Type definitions, Product Type validation, Category Validation Profile behavior, product records, or device records.

Product Catalog and Device Catalog remain the source-of-truth for product and device data.

## Warranty Registration Trigger Awareness

Order Routing may emit or carry a `warranty.registration.required` signal if a routed order line includes warranty registration requirements.

Order Routing may preserve the warranty registration method reference from Product Catalog or the owning warranty-support capability.

Order Routing does not own warranty claim lifecycle, claim approval, vendor warranty systems, registration delivery, customer warranty UX, replacement fulfillment, or warranty claim status.

Open trigger timing remains unresolved: warranty registration may be triggered by order placement, shipment, delivery, return-window close, or another lifecycle event.

## Routing Snapshot Concept

A routing snapshot is immutable evidence of a routing decision.

Proposal-level routing snapshot fields include:

- Routing snapshot identifier.
- Source order reference.
- Parent order reference.
- Order line references.
- Buyer/entity scope.
- Product Catalog references.
- Device Catalog references where relevant.
- Product Type.
- Selected route.
- Vendor/manufacturer assignment references.
- Fulfillment target references.
- Price snapshot or quote-like result reference.
- Warranty registration requirement reference where applicable.
- Routing rule version.
- Input version references.
- Timestamp.
- Actor or system actor.
- Decision summary.
- Exception/review state where applicable.
- Downstream target references.

Routing snapshots should be immutable once created. Corrections should produce new snapshots or explicit correction records rather than rewriting historical routing evidence.

## Typed Routing Exceptions

Routing exceptions should be typed, scoped, auditable, and reviewable.

Proposal-level routing exception examples include:

- Missing price snapshot.
- Product not routable.
- Vendor/manufacturer unavailable.
- Invalid tenant scope.
- Unsupported product type.
- Missing fulfillment target.
- Warranty registration requirement missing delivery method.
- Manual review required.
- Product lifecycle state blocks routing.
- Product Type scope or eligibility unresolved.
- Downstream target unavailable.
- Split-order conflict.

Routing exceptions should identify affected order, order line, tenant scope, product/device reference, selected or attempted route, reason, severity, retry eligibility, review requirement, and audit references.

## Routing Retry / Review Workflows

Order Routing may own retry and review workflows for routing-specific failures.

Proposal-level workflow states may include:

- Pending routing.
- Routed.
- Partially routed.
- Review required.
- Retry scheduled.
- Retry exhausted.
- Routing failed.
- Superseded by corrected routing snapshot.

Retry/review workflows must not become fulfillment execution, pricing recalculation, invoice correction, warranty claim adjudication, tenant eligibility approval, or procurement lifecycle.

## Routing Events

Proposal-level routing events include:

- `order.routing.requested`.
- `order.routing.completed`.
- `order.routing.partially_completed`.
- `order.routing.failed`.
- `order.routing.review_required`.
- `order.routing.retry_scheduled`.
- `order.routing.snapshot.created`.
- `order.suborder.created`.
- `order.suborder.updated`.
- `order.routing.exception.created`.

Event payloads should use references and consumer-appropriate fields. Sensitive price, tenant, customer, warranty, or vendor details should be redacted or scoped by consumer class.

## AI Agent Services Signals

Possible routing signals for AI Agent Services include:

- Routing failure signal.
- Split-order complexity signal.
- Vendor routing exception signal.
- Warranty registration risk signal.
- Manual review signal.
- Downstream target unavailable signal.
- Repeated retry failure signal.

AI agents may recommend routing review actions, summarize failure clusters, suggest manual review queues, or identify routing risk patterns. AI agents must not override routing decisions, reroute orders, bypass routing exceptions, or change routing snapshots without approved action contracts and audit tracking.

## Future Procurement Note

Bulk purchase orders for devices or accessories may need a future Procurement / Purchase Orders bounded context.

Order Routing should not absorb procurement approval, PO lifecycle, receiving, procurement reconciliation, manufacturer purchasing workflow, or procurement financial controls.

Order Routing may carry procurement placeholders or references only when needed to preserve routing context until a dedicated Procurement / Purchase Orders context is defined.

## Open Questions

- Is Order Routing triggered before or after payment authorization?
- What lifecycle event triggers vendor/manufacturer suborder creation?
- When is warranty registration triggered: order placement, shipment, delivery, return-window close, or another event?
- How are mixed carts handled across accessories, devices, and branded merchandise?
- What routing rules are configurable by CIXCI versus fixed?
- What retry behavior is needed for downstream target failures?
- How are routing snapshots retained?
- How are manual routing overrides approved and audited?
- Which routing events are required by Fulfillment, Invoice Management, Warranty Registration, Logs & Audit, Analytics, and AI Agent Services?
- Which routing decisions must be synchronous versus asynchronous?
- Which downstream target failures require re-routing versus manual review?
- How should routing handle stale or superseded price snapshots?

## Impacts

Future Order Routing module drafting should define:

- Routed order and suborder data model.
- Routing input contracts.
- Routing output contracts.
- Routing snapshot model.
- Split-order orchestration model.
- Typed routing exceptions.
- Retry/review workflows.
- Routing event taxonomy and payload boundaries.
- Product Type-aware routing scenarios.
- Warranty registration signal handling.
- Fulfillment instruction handoff boundaries.
- Invoice Management evidence needs.
- Logs & Audit integration for routing decisions and manual overrides.
- AI Agent Services signal contracts.

Future Product Catalog, Device Catalog, Pricing, Tenant Company, Fulfillment/Returns, Invoice Management, Warranty support, Logs & Audit, AI Agent Services, Analytics, and Procurement/Purchase Orders refinements should preserve Order Routing as the owner of routing decisions without moving their source-of-truth responsibilities into Order Routing.

## Consequences

- Order Routing becomes the canonical owner of route decisions, order decomposition, split-order structure, suborder assignment, routing snapshots, routing exceptions, and routing events.
- Pricing remains the owner of price calculation and price snapshots.
- Product Catalog and Device Catalog remain source-of-truth for product and device data.
- Tenant Company remains source-of-truth for tenant eligibility and scope.
- Fulfillment/Returns remains the owner of execution state.
- Invoice Management remains the owner of invoice lifecycle and reconciliation.
- Warranty support remains cross-module and does not become an Order Routing responsibility.
- Future procurement workflows can be designed without forcing PO lifecycle into Order Routing.
