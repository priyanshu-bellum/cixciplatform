# ADR-0004: Device Catalog Bounded Context Split

## Status
Proposed

## Context
ADR-0003 currently treats Catalog too broadly by combining device and accessory concerns in one bounded context.

Device data is now both:

- commerce data
- compatibility anchor data

Buyers may export device data to sell devices on their own websites or other buyer-controlled channels.

Future buyers may create bulk purchase orders to manufacturers for device purchases.

This means canonical device data should not be treated as a secondary field inside Product Catalog. Device data can influence commerce, compatibility, buyer export/download workflows, procurement workflows, and downstream analytics. Combining all of that with accessory product catalog ownership risks creating an oversized Catalog context with unclear source-of-truth rules.

## Decision
Split the current Catalog bounded context from ADR-0003 into two bounded contexts:

- Device Catalog
- Product Catalog

Use this revised proposal-level sequencing:

1. Tenant Company
2. Device Catalog
3. Product Catalog
4. Pricing
5. Order Routing
6. Fulfillment
7. Analytics

This ADR amends ADR-0003 at the bounded-context planning level. It does not finalize implementation design or business rules.

## Ownership Boundaries

### Device Catalog Owns

- Canonical device records.
- Device identifiers and normalization.
- Device manufacturer, brand, model, variant, carrier, region, and lifecycle metadata.
- Device taxonomy and hierarchy.
- Buyer-exportable device data and device export/download contracts.
- Device import and enrichment source tracking.
- Device lifecycle events.
- Device references used by Product Catalog, Pricing, Order Routing, Fulfillment, Analytics, and future procurement workflows.

### Device Catalog Does Not Own

- Accessory product records.
- Accessory-to-device compatibility assertions beyond canonical device identity and attributes.
- Product-level visibility or product activation records.
- Final buyer-specific pricing rules or calculations.
- Order routing decisions.
- Fulfillment execution.
- Manufacturer purchase order workflow, approval, submission, or status.
- Invoice management.

### Product Catalog Owns

- Accessory product records.
- Product variants and product content.
- Product media and product content asset references.
- Product catalog import batches and product lifecycle state.
- Product-level visibility and product activation/download records.
- Accessory-to-device compatibility mappings as product catalog assertions, unless a future Compatibility Authority bounded context is assigned.
- Catalog-carried pricing attribute inputs, while Pricing owns interpretation and calculation.

### Product Catalog Does Not Own

- Canonical Device records.
- Device manufacturer, model, variant, carrier, region, or lifecycle source-of-truth records.
- Buyer device export/download source records.
- Manufacturer bulk device purchase order workflows.
- Final buyer-specific pricing rules or calculations.
- Order routing decisions.

### Product Catalog References Device Reference

Product Catalog should reference `Device Reference` rather than owning canonical `Device`.

A `Device Reference` should point to Device Catalog-owned records and should be treated as a boundary reference, not as copied source-of-truth device data.

## Future Supporting Contexts To Watch

### Compatibility Authority

Track as a future supporting bounded context if compatibility becomes disputed, buyer-specific, region-specific, manufacturer-provided, vendor-provided, override-based, or approval-based.

Until then, Product Catalog may own accessory-to-device compatibility mappings as product catalog assertions that reference Device Catalog records.

### Identity Resolution

Track as a future supporting bounded context or platform service if canonicalization spans devices, accessory products, vendors, manufacturers, buyer identifiers, UPC/GTIN, SKUs, aliases, and external feeds.

### Procurement / Purchase Orders

Track as a future bounded context for manufacturer bulk device purchase workflows.

Device Catalog should provide device references for purchase orders, but it should not own procurement logic, approval workflows, purchase order submission, or purchase order status.

### Invoice Management

Track as a future bounded context for invoice, payment, accounting, and commercial reconciliation workflows.

### Launch/Event Management

Track as a future bounded context if product or device launches, buyer rollouts, release windows, activation campaigns, and launch readiness become operational workflows.

### Media Asset Management

Track as a platform service or future bounded context for asset storage, transformations, approvals, localization, CDN access, rights, and syndication.

### Logs & Audit

Recognize Logs & Audit as a platform service rather than a normal domain bounded context unless future requirements make audit review and compliance workflow domain-specific.

## Impacts

- ADR-0003 should be read as amended by this ADR for Catalog boundaries and sequencing.
- Product Catalog should later replace `Device` ownership references with `Device Reference` ownership references.
- Product Catalog should later clarify that canonical device data belongs to Device Catalog.
- Product Catalog compatibility mappings should explicitly reference Device Catalog records.
- Future Device Catalog drafting should happen before deeper Product Catalog, Pricing, Order Routing, Fulfillment, or Analytics design.
- Buyer device export/download should be modeled through Device Catalog, with buyer-facing modules owning UX/workflow state where applicable.
- Future manufacturer bulk device purchase orders should reference Device Catalog records but belong to a Procurement / Purchase Orders bounded context if that capability is introduced.

## Open Questions

- Which device identifiers are canonical across manufacturers, buyers, carriers, regions, and external feeds?
- Which device data fields are manufacturer-owned, CIXCI-governed, buyer-editable, or externally sourced?
- Which buyer device export/download workflows are owned by Device Catalog versus buyer-facing modules?
- When does compatibility mapping need a separate Compatibility Authority context?
- When does identity resolution need its own supporting context or platform service?
- What device data volume, export volume, and manufacturer purchase order volume should the architecture assume?

## Consequences

- Device data becomes a first-class source-of-truth concern rather than an accessory catalog subfield.
- Product Catalog can stay focused on accessory product records and product-level catalog behavior.
- Pricing, Order Routing, Fulfillment, and Analytics can reference clear device and product boundaries.
- Future manufacturer purchase order workflows can be designed without forcing procurement logic into Device Catalog.
- Additional context boundaries are identified early without prematurely implementing them.
