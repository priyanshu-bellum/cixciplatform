# ADR-0008: Warranty Registration And Claim Support

## Status

Proposed

## Context

Accessory vendors may offer different warranty structures, including lifetime warranties, limited warranties, and product-specific warranty terms.

CIXCI needs to support a streamlined buyer-facing warranty experience where the buyer's customer can initiate warranty support through the buyer's site instead of being redirected to the accessory vendor's site.

At the same time, accessory vendors need a way to receive purchase and warranty registration information so the product is recognized in their warranty system.

Warranty support crosses several platform boundaries. Product Catalog may describe warranty facts on products. Orders may provide proof of purchase. Buyer-facing modules may expose claim workflows. Vendor integrations may deliver registration data. Fulfillment or Returns may handle replacement or return execution. Logs & Audit may track files, transmissions, retries, and audit history.

Without explicit guidance, warranty support could become an accidental Product Catalog workflow, an Order Routing responsibility, a vendor integration side effect, or a premature Warranty Management bounded context.

## Decision

Introduce warranty support as a cross-module capability that must be represented in Product Catalog, Orders, Buyer APIs, and Vendor integrations.

Do not create a full Warranty Management bounded context yet unless future complexity requires it.

This ADR keeps warranty guidance proposal-level. It does not finalize implementation behavior, claim approval rules, vendor-specific registration requirements, replacement workflows, customer data sharing, or data retention policy.

## Product Catalog Responsibilities

Product Catalog should store warranty-related product facts needed to describe warranty terms and downstream warranty eligibility inputs.

Proposal-level warranty product attributes include:

- Warranty Type.
- Warranty Duration.
- Warranty Provider.
- Warranty Terms Reference.
- Warranty Claim Instructions.
- Warranty Eligibility Rules placeholder.
- Warranty Registration Required? Yes/No.
- Warranty Registration Method: API / Export / Manual / Not Supported.
- Warranty Claim Support Method: Buyer Portal / Vendor API / Manual Review / Future Value.

Product Catalog owns product warranty attributes only.

Product Catalog does not own customer warranty claims, customer claim workflow, warranty approval, warranty fulfillment, replacement shipment, returns processing, vendor warranty registration delivery, or warranty registration transmission logs.

## Buyer-Side Warranty Support

Buyers may expose warranty support through their own customer-facing site or portal.

Buyer-side API needs may include:

- Customer order lookup.
- Purchased accessory lookup.
- Warranty eligibility lookup.
- Warranty claim initiation.
- Warranty claim status retrieval.
- Warranty documentation upload placeholder.
- Customer communication status placeholder.

Buyer-facing modules own the customer UX, including customer-facing forms, status display, document upload experience, messaging, and claim progress presentation.

CIXCI APIs should provide the buyer with warranty-eligible product and order data where authorized. CIXCI APIs should not force buyers to redirect customers to vendor sites when a buyer-facing warranty flow is supported.

## Vendor-Side Warranty Registration

Vendors may need purchase or warranty registration data after a buyer sells the vendor's product.

Supported vendor registration methods include:

- Vendor API registration.
- Manual export from CIXCI.
- Scheduled export.
- Future webhook/event-based registration.

Vendor registration payload may include:

- Buyer.
- Buyer entity.
- Vendor.
- Order reference.
- Order date.
- Customer reference or masked customer reference.
- Product SKU.
- UPC/GTIN.
- CIXCI product identifier.
- Quantity.
- Warranty type.
- Warranty duration.
- Purchase channel.
- Registration timestamp.
- Registration status.
- Registration error/retry status.

Vendor registration delivery should respect privacy, masking, authorization, vendor contract, and audit requirements. Vendor registration failures should produce retry/error handling and review signals instead of silently losing registration data.

## Warranty Claim Boundaries

- Product Catalog owns warranty terms and product warranty facts.
- Orders owns purchase proof, order reference, order line reference, order date, and purchased item context.
- Buyer-facing modules own customer-facing warranty UX and customer claim interaction state.
- Buyer APIs expose warranty-eligible product/order data and may support claim initiation or claim status retrieval where authorized.
- Vendor integrations own vendor warranty registration delivery, vendor API/export mapping, delivery status, retry state, and vendor response handling.
- Fulfillment and Returns may own replacement shipment, return processing, or operational execution if a warranty claim results in replacement or return activity.
- Invoice Management does not own warranty claims unless credits, adjustments, refunds, or warranty-related commercial corrections are later introduced.
- Logs & Audit owns audit/file tracking for warranty exports, API transmissions, retries, failures, and manual file handling where that platform service exists.
- Analytics may consume warranty events or snapshots for reporting but does not own claim workflow or registration delivery.

## What Warranty Support Must Not Become

- Product Catalog must not become the owner of customer warranty claims or claim fulfillment.
- Order Routing must not become the owner of warranty claim approval, vendor registration delivery, or replacement fulfillment.
- Vendor integrations must not become the source of Product Catalog warranty terms.
- Buyer-facing modules must not become the source of Product Catalog product warranty facts.
- Fulfillment and Returns must not decide warranty eligibility unless an owning warranty or buyer-facing workflow provides an approved signal.
- Invoice Management must not own warranty lifecycle unless financial credits, adjustments, or reconciliation workflows require a future boundary decision.

## Events And Integration Signals

Proposal-level events and signals include:

- `warranty.registration.required`.
- `warranty.registration.sent`.
- `warranty.registration.failed`.
- `warranty.registration.confirmed`.
- `warranty.claim.initiated`.
- `warranty.claim.status.updated`.
- `warranty.claim.requires-review`.

Event payloads should be scoped to the consumer and should not expose unnecessary customer, order, pricing, or warranty details. Sensitive customer data should use customer references, masked customer references, or approved fields where applicable.

## API And Export Implications

- Buyer API should expose warranty eligibility and claim initiation support where authorized.
- Buyer API should support purchased accessory lookup and warranty claim status retrieval where the owning module can provide state.
- Vendor API/export should support warranty registration after sale.
- Manual vendor export must be logged and auditable.
- Scheduled vendor export must support status, retry, failure, and review states.
- API failures require retry/error handling and should not silently drop registration obligations.
- Customer data must follow privacy and masking rules where applicable.
- Documentation upload should remain a placeholder until ownership of file storage, rights, retention, and claim workflow is confirmed.

## Future Warranty Management Watchlist

Do not create a Warranty Management bounded context yet.

Consider a future Warranty Management context if warranty support grows to include first-class ownership of:

- Warranty claim intake and lifecycle.
- Claim approval rules.
- Vendor-specific adjudication workflows.
- Replacement eligibility and policy interpretation.
- Customer communications.
- Documentation review.
- Return/replacement orchestration signals.
- Warranty-specific credits, adjustments, or financial workflows.
- Cross-vendor claim dashboards.
- Claim SLA tracking and escalations.

Until that complexity is justified, warranty support should remain a cross-module capability with clear ownership boundaries.

## Open Questions

- Which vendors require warranty registration?
- Is registration triggered at order placement, shipment, delivery, return-window close, or another lifecycle point?
- What customer fields can be shared with vendors?
- Does CIXCI store warranty claim state or only pass status between buyer and vendor?
- Who approves warranty claims?
- What happens if vendor registration fails?
- Are warranty claims separate from returns?
- Are replacement orders handled through Fulfillment or a future Warranty module?
- Which warranty events are required by Product Catalog, Orders, Buyer APIs, Vendor integrations, Fulfillment/Returns, Invoice Management, Logs & Audit, and Analytics?
- Which warranty claim documents need retention, access control, and audit rules?
- Which vendors support API registration versus manual or scheduled export?
- Can warranty registration be retried automatically, or does retry require manual review?

## Impacts

Future module refinements should update:

- Product Catalog warranty attributes.
- Order Routing / Orders warranty registration triggers.
- Vendor integration API/export contracts.
- Buyer API warranty claim endpoints.
- Logs & Audit warranty transmission tracking.
- Fulfillment/Returns warranty replacement boundaries.

Future Product Catalog updates should add proposal-level product warranty attributes without taking ownership of customer claims or warranty fulfillment.

Future Order Routing or Orders work should identify the purchase lifecycle trigger for warranty registration without moving claim ownership into Order Routing.

Future Vendor integration work should define registration delivery contracts, retry behavior, export formats, API mappings, and failure handling.

Future Buyer API work should define warranty eligibility, claim initiation, claim status, and customer documentation contracts.

Future Logs & Audit work should define warranty export/API transmission audit records, file tracking, retry history, and retention requirements.

## Consequences

- CIXCI can support buyer-facing warranty experiences without redirecting every customer to vendor sites.
- Vendors can receive purchase and registration data through API, export, scheduled export, or future event/webhook mechanisms.
- Product Catalog can describe warranty facts without owning customer claim workflow.
- Orders can provide proof of purchase without owning claim approval or fulfillment.
- Vendor integrations can deliver registration data without becoming Product Catalog or Orders.
- Warranty Management remains a future option if claim lifecycle complexity becomes large enough to justify a dedicated bounded context.
