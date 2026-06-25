# ADR-0005: Pricing Bounded Context

## Status

Proposed

## Context

Pricing must be established as a distinct bounded context before the Pricing module is drafted.

CIXCI pricing will depend on tenant scope, buyer/entity context, catalog inputs, Device References, commission settings, overrides, and order/invoice consumers. Without an explicit boundary, Pricing could become an oversized commercial domain that absorbs tenant eligibility, catalog ownership, order routing, invoice lifecycle, reconciliation, or analytics responsibilities.

ADR-0003 defines Pricing as an initial bounded context. ADR-0004 clarifies that Device Catalog and Product Catalog are separate upstream contexts. This ADR refines the Pricing boundary at the planning level while keeping all business rules proposal-level.

## Decision

Define Pricing as the bounded context that owns commercial interpretation and calculation of prices.

### Pricing Owns

- Price calculation logic.
- Pricing profiles.
- Commission and margin calculation logic.
- Pricing exceptions and overrides.
- Effective price snapshots.
- Pricing audit and effective dating.
- Pricing events.

### Pricing Does Not Own

- Tenant eligibility.
- Product or device source-of-truth records.
- Accessory-to-device compatibility decisions.
- Order routing decisions.
- Fulfillment execution.
- Invoice lifecycle.
- Reconciliation.
- Analytics ownership.

Pricing may consume inputs from other contexts and emit calculated pricing outputs, but it must not become the owner of upstream eligibility, catalog, device, routing, fulfillment, invoicing, reconciliation, or reporting behavior.

## Relationship Boundaries

### Tenant Company

Tenant Company owns tenant scope, parent/child hierarchy, company/entity identity, user access, relationship eligibility, regional eligibility, activation readiness, and tenant-scoped setup signals.

Pricing may consume Tenant Company scope and eligibility signals to decide which pricing profile, commission rule, override, or effective-price calculation applies. Pricing must not decide whether a tenant, buyer, child entity, user, or relationship is eligible outside commercial pricing interpretation.

### Device Catalog

Device Catalog owns canonical Device records, Device References, device identifiers, normalization, lifecycle metadata, taxonomy, and buyer-exportable device data.

Pricing may consume Device References, device taxonomy, lifecycle state, or safe canonical device attributes as pricing inputs. Pricing must not mutate canonical device data, resolve device identity, own buyer device export state, or decide device compatibility.

### Product Catalog

Product Catalog owns accessory product records, product content, product media references, product lifecycle state, product-level visibility and activation records, and accessory-to-device compatibility mappings unless a future Compatibility Authority is assigned.

Product Catalog may carry vendor wholesale, SRP, MAP, sale, or other pricing attribute inputs as catalog facts. Pricing owns interpretation, calculation, effective price outputs, commission effects, pricing exceptions, and pricing audit.

### Order Routing

Order Routing owns order intake, routing decisions, vendor selection, split decisions, vendor suborder creation, and order orchestration.

Order Routing may request effective price snapshots or quote-like pricing results from Pricing. Pricing must not choose vendors, routes, warehouses, fulfillment paths, or split behavior.

### Fulfillment

Fulfillment owns shipment, return, fulfillment status, and operational execution state.

Fulfillment may reference price snapshots for returns, adjustments, or operational context where required. Pricing must not own shipment status, return execution, inventory, or fulfillment exceptions.

### Invoice Management

Invoice Management is a future bounded context for invoice lifecycle, payment, accounting, reconciliation, corrections, and commercial settlement workflows.

Invoice Management will need Pricing to provide effective price snapshots, commission and margin calculation outputs, override reason codes, effective dates, quote/order pricing context, and pricing audit references. Pricing must not own invoice issuance, invoice status, payment state, reconciliation, accounting sync, or invoice correction workflow.

### Analytics

Analytics owns reporting models, rollups, metrics, analytical read models, and reporting latency decisions.

Analytics may consume pricing events and price snapshots. Pricing must remain the source for pricing facts and calculations, but Analytics owns derived metrics and reporting views.

## Accessory vs Device Pricing

Accessory pricing should be based on Product Catalog accessory product records and catalog-carried pricing inputs such as vendor wholesale, SRP, MAP, sale attributes, product category, product identity, and Product Catalog visibility or activation context where authorized.

Device pricing should be based on Device Catalog Device References, canonical device attributes, taxonomy, lifecycle state, manufacturer/brand/model/variant context, and buyer-visible/exportable device context where authorized.

Device Catalog owns canonical device data. Product Catalog owns accessory product data. Pricing owns price interpretation and calculation for both accessory and device pricing cases.

## Commission And Child Override Boundary Split

Tenant Company owns hierarchy scope: parent company, child entity, entity relationship, tenant scope, inheritance context, operational activation, and whether a child-specific configuration or override scope exists.

Pricing owns commercial interpretation: commission rate, margin impact, price adjustment, effective dates, approval requirements, calculation precedence, pricing exception behavior, and pricing audit.

If parent and child commission or pricing settings conflict, Pricing should define proposal-level precedence rules in its module specification. Tenant Company should provide scoped hierarchy and readiness signals without calculating price, margin, commission, discount, or quote outcomes.

## Pricing Exceptions As Typed Auditable Objects

Pricing exceptions should be represented as typed, scoped, effective-dated, auditable objects rather than informal flags.

A pricing exception should include proposal-level fields such as:

- Exception type.
- Scope.
- Affected tenant, parent, child entity, buyer, vendor, product, Device Reference, category, region, or relationship where applicable.
- Effective date and expiration.
- Approver.
- Reason code and rationale.
- Override mode such as hard override, advisory override, or review-required.
- Affected downstream modules.
- Audit trail.
- Pricing event behavior.

Pricing exceptions must not bypass Tenant Company eligibility, Product Catalog visibility, Device Catalog reference validity, Order Routing decisions, Fulfillment execution, or Invoice Management lifecycle unless the owning context explicitly provides an eligible signal.

## Context Map Note

Proposal-level context flow:

```text
Tenant Company -> Pricing <- Device Catalog
Product Catalog -> Pricing -> Order Routing -> Invoice Management
```

This context map means Pricing consumes tenant, device, and product context; produces effective pricing outputs for order and invoice consumers; and remains separate from routing and invoice lifecycle ownership.

## Impacts

- Product Catalog boundary language may later need refinement to consistently describe wholesale, SRP, MAP, sale, and similar values as catalog-carried pricing inputs rather than effective prices.
- Tenant Company boundary language may later need refinement to distinguish hierarchy/eligibility/override scope from commercial interpretation of commission, margin, and price calculation.
- Future Pricing module drafting should include field ownership, precedence rules, pricing exceptions, effective dating, price snapshots, event taxonomy, scale assumptions, and integration contracts.
- Future Invoice Management drafting should consume Pricing snapshots and audit references without taking ownership of price calculation logic.
- ADR-0003 should be read with this ADR for Pricing boundaries, and ADR-0004 should be read with this ADR for Device Catalog and Product Catalog pricing inputs.

## Open Questions

- Which commission settings are configured in Tenant Company scope versus Pricing scope?
- Which pricing inputs are vendor-owned, Product Catalog-owned, Device Catalog-owned, Tenant Company-owned, or Pricing-owned?
- Which effective price snapshots are required by Order Routing and future Invoice Management?
- Which pricing exceptions require approval, expiration, or downstream notifications?
- Which pricing events are required by Order Routing, Invoice Management, Analytics, and buyer-facing modules?

## Consequences

- Pricing becomes the canonical owner of commercial price interpretation and calculation.
- Tenant Company, Device Catalog, and Product Catalog remain upstream sources of context rather than pricing engines.
- Order Routing and Invoice Management can consume stable price outputs without owning pricing rules.
- Future module work can harden pricing rules, exceptions, snapshots, and events without blurring source-of-truth boundaries.
