# Pricing Module Specification

This document is proposal-level architecture. It hardens the Pricing module boundary for vendor pricing inputs, commission modeling, pricing channels, buyer-facing wholesale price, purchase order pricing, validation, snapshots, audit, and events without finalizing commercial policy or moving neighboring module ownership into Pricing.

## Purpose

Define the Pricing module boundary for commercial interpretation, price calculation logic, pricing profiles, buyer/entity-specific effective prices, vendor-side and buyer-side commission components, revenue-share interpretation, pricing exceptions and overrides, buyer-specific overrides, channel pricing, effective dating, effective price snapshots, quote-like price results, audit, and pricing events.

This module aligns with ADR-0005, ADR-0003 bounded contexts, and ADR-0004's split between Device Catalog and Product Catalog. This draft remains proposal-level until business rules and commercial policy decisions are confirmed.

## Pricing Ownership And Source Input Language

Vendors are authoritative for submitted pricing inputs where those inputs are accepted by Product Catalog and Pricing governance.

Product Catalog stores catalog-carried pricing inputs, including proposal-level Vendor Wholesale Price, SRP/MSRP, MAP, Sale Price, source metadata, source versions, effective dates, product/channel flags, product visibility references, and catalog change references. Product Catalog does not calculate buyer-facing wholesale price, commission, pricing snapshots, buyer-specific overrides, or channel-specific effective prices.

Pricing owns:

- Commercial interpretation and calculation.
- Pricing validation and pricing preview outcomes.
- Pricing profiles and pricing rules.
- Vendor-side commission components.
- Buyer-side commission/markup components.
- Revenue-share components.
- Pricing exceptions and buyer-specific overrides.
- Channel pricing rules and channel-specific output selection.
- Quote-like results.
- Order-bindable, procurement-bindable, export-bindable, and invoice-bindable snapshots.
- Pricing conflict detection and review-required states.
- Redaction-safe and visibility-safe pricing outputs.
- PO accepted-price variance interpretation based on Procurement-owned evidence references.
- Return/refund adjustment pricing evidence based on source-module evidence references.
- Pricing audit records and pricing events.

Buyer-controlled customer-facing or resale pricing is separate from vendor source inputs and Pricing-owned wholesale/commission snapshots unless future scope assigns otherwise. Pricing may provide buyer-facing wholesale or suggested price evidence, but buyer storefront/resale pricing decisions remain outside Pricing unless a future ADR/module assigns that ownership.

Tenant Company owns buyer, vendor, parent company, child entity, relationship, role, permission, channel eligibility, company configuration, and company-level commission configuration input scope. Pricing consumes Tenant Company evidence and must not infer tenant eligibility, permissions, channel eligibility, hierarchy, or relationship approval independently.

## Scope

- Price calculation logic for authorized downstream consumers.
- Pricing profiles and rules for buyer, entity, vendor, product, Device Reference, category, Product Type, region, channel, contract, timeframe, and other confirmed scopes.
- Proposal-level scope lattice and specificity ranking across tenant, buyer parent, buyer child/entity, vendor, product, Device Reference, category, Product Type, region, channel, contract, and timeframe.
- Buyer/entity-specific effective price results derived from tenant scope, catalog pricing inputs, device references, Product Type, channel, and Pricing-owned rules.
- Accessory pricing inputs from Product Catalog, including catalog-carried pricing inputs such as Vendor Wholesale Price, SRP/MSRP, MAP, and Sale Price.
- Device pricing inputs from Device Catalog, including Device References, taxonomy, lifecycle, and safe canonical attributes.
- Vendor-side commission and buyer-side commission/markup interpretation as separate components.
- Standard configurable commission defaults, including a possible standard 7% / 7% model, without hard-coding that behavior as a permanent business rule.
- Pricing exceptions and buyer-specific overrides as typed, scoped, effective-dated, auditable objects.
- MAP, SRP/MSRP, sale pricing, discount, margin, revenue-share, No MAP, and pricing exception interpretation placeholders.
- Pricing channels: Online / Direct-to-Consumer, Bulk Purchase Order, Owned Channel / Kaseory, Buyer Storefront, Marketplace placeholder, Retail POS placeholder, Promotional Campaign placeholder, and Buyer-Specific Contract placeholder.
- Online/DTC pricing output, including buyer-facing Wholesale Price where applicable.
- Buyer-facing pricing visibility evidence, including Tenant Company scope/version, role/scope projection, channel eligibility, Product Catalog product/channel evidence, redaction decision version, authorized consumer class, visibility expiration, and recheck-before-display behavior.
- Bulk PO pricing output, including procurement-bindable quote/snapshot behavior.
- PO accepted-price handoff references, Procurement disposition, applied vs ignored state, and evidence audit references.
- PO pricing variance/requote/review interpretation, without owning Procurement PO lifecycle or accepted-price workflow.
- Return/refund adjustment pricing evidence, without owning refund execution, return approval, payment, or invoice adjustment application.
- Pricing validation hierarchy, validation preview, blank-field protection, partial pricing updates, import governance, and conflict behavior.
- Effective dating, transaction time, source input version, rule version, commission rule version/hash, calculation engine version, snapshot version/hash, evidence version, and audit reconstruction placeholders.
- Lifecycle separation for calculation results, quote-like results, immutable effective price snapshots, order-bindable snapshots, procurement-bindable snapshots, export-bindable snapshots, and invoice-bindable historical evidence.
- Effective price snapshots for order-time, Procurement, Invoice Management, return/refund adjustment, export, audit, and dispute review needs.
- Recalculation, stale marking, cache invalidation, event fanout, replay, and blast-radius guardrails.
- Pricing audit trail and pricing event contracts.

## Out Of Scope

- Tenant eligibility, hierarchy ownership, relationship eligibility, readiness, geography eligibility, user/entity access, role assignment, channel eligibility, and tenant-scoped provisioning, which belong to Tenant Company.
- Accessory product source-of-truth records, product lifecycle, media, compatibility mappings, catalog activation/download records, product/channel flags, product visibility references, and catalog-carried input storage, which belong to Product Catalog.
- Canonical Device records, Device References, device identity, normalization, taxonomy, lifecycle, and buyer-exportable device data, which belong to Device Catalog.
- Buyer storefront design, buyer resale price selection, customer-facing publishing, and buyer-controlled merchandising unless future scope assigns those responsibilities.
- Accessory compatibility authority unless a future ADR assigns compatibility rules to Pricing.
- Order routing decisions, vendor selection, split decisions, route selection, and order orchestration.
- Procurement PO creation, approval, submission, response lifecycle, receiving, accepted-price evidence recording, accepted-price workflow, or PO lifecycle ownership.
- Fulfillment execution, shipment status, returns, return approval, refund execution, inventory ownership, and fulfillment exception handling.
- Invoice lifecycle, invoice approval, invoice adjustment application, payment, reconciliation, dispute workflow, accounting ownership, and invoice regeneration.
- Refund execution, return authorization, replacement execution, warranty claim approval, or payment behavior.
- Analytics ownership, reporting rollups, derived business metrics, or dashboards.
- Notification delivery, recipient resolution, templates, retries, or delivery history.
- Integration delivery/receipt state, external system credentials, webhook/API/CSV/SFTP transport evidence, or provider retries.

## Commission Model

Vendor-side commission and buyer-side commission are separate proposal-level components.

Vendor-side commission may represent a commercial component applied to the vendor side of the transaction, such as CIXCI commission, vendor revenue share, or another approved commercial deduction/addition.

Buyer-side commission may represent the commission/markup component used to calculate buyer-facing Wholesale Price or another authorized buyer-facing commercial output.

Commission concepts should include:

- Vendor-side commission component.
- Buyer-side commission component.
- Commission rate source.
- Commission basis.
- Effective date.
- End date.
- Scope: buyer, vendor, parent entity, child entity, product, Product Type, channel, region, contract, or another confirmed scope.
- Precedence.
- Applied component.
- Snapshot fields.
- Visibility/redaction class.
- Contract reference placeholder.
- Commission rule version/hash.
- Commission status.

Standard 7% / 7% behavior may exist as a configurable default, but should not be hard-coded as a permanent business rule. Commission changes must preserve historical transaction snapshots and should not mutate prior order, PO, invoice, return/refund, or audit evidence.

## Buyer-Facing Wholesale Price

Buyer-facing Wholesale Price is a Pricing-owned calculated output and/or immutable snapshot value.

The default Online/DTC formula may be Vendor Wholesale Price plus applicable buyer-side commission/markup where rule evidence supports that calculation. The formula remains proposal-level and may be superseded by channel rules, buyer-specific overrides, contract-specific rules, owned-channel exceptions, MAP/SRP constraints, sale pricing, or pricing exceptions.

Buyer-facing Wholesale Price must not be calculated by Product Catalog, Invoice Management, Order Routing, Procurement, Fulfillment/Returns, Analytics, Integration Management, Notification Platform Service, or Logs & Audit.

Buyer-facing Wholesale Price should preserve calculation inputs, catalog pricing input references, commission component references, Pricing rule references, Pricing channel, snapshot id, snapshot version/hash, calculation engine version, effective date, transaction time, redaction class, and audit reference.

## Buyer-Facing Pricing Visibility Evidence

Buyer-facing Wholesale Price is a Pricing-owned calculated output, but visibility of that output depends on Tenant Company scope, permissions, channel eligibility, and Product Catalog channel/product evidence.

Proposal-level visibility concepts should include:

- Tenant Company scope reference/version.
- Role/scope projection reference.
- Buyer/entity scope reference.
- Channel eligibility reference.
- Product Catalog product-channel flag version.
- Product Catalog product visibility/reference version.
- Redaction decision version.
- Authorized consumer class.
- Pricing output visibility state.
- Visibility evidence expiration.
- Recheck-before-display flag.
- Audit reference.

Pricing owns redaction/visibility-safe pricing outputs. Tenant Company owns access authority. Product Catalog owns product/channel flags and product visibility references. Missing, stale, expired, unauthorized, or conflicting visibility evidence should block buyer-facing display/export or route to review. Downstream modules should consume visibility-safe pricing outputs rather than recalculating or independently inferring access.

## Pricing Channels

Pricing Channel is a first-class calculation dimension and should be stored in calculation results, quote-like results, snapshots, events, and audit records.

Proposal-level channels:

- Online / Direct-to-Consumer.
- Bulk Purchase Order.
- Owned Channel / Kaseory.
- Buyer Storefront.
- Marketplace placeholder.
- Retail POS placeholder.
- Promotional Campaign placeholder.
- Buyer-Specific Contract placeholder.

Pricing owns channel-specific calculation rules. Tenant Company owns buyer/vendor/entity channel eligibility and channel permission evidence. Product Catalog owns product channel flags where accepted by Product Catalog governance. Transaction type or source workflow should provide channel selection evidence before calculation or snapshot creation. Missing, invalid, stale, or unauthorized channel evidence should block or route calculation to review.

## Online / Direct-To-Consumer Pricing

Online/DTC pricing is separate from Bulk PO pricing.

Proposal-level Online/DTC behavior:

- Uses Vendor Wholesale Price from Product Catalog input references plus applicable buyer-side commission/markup unless an exception applies.
- Supports SRP/MSRP, MAP, Sale Price, No MAP behavior, buyer-specific overrides, channel-specific exceptions, owned-channel exceptions, and promotional placeholders.
- Produces order-bindable and/or export-bindable snapshots where applicable.
- Requires visibility evidence before buyer-facing display/export where applicable.
- Order Routing consumes Pricing snapshots or quote-like results only; it owns order orchestration and routing decisions.
- Invoice Management consumes invoice-bindable snapshot values; it does not recalculate Online/DTC pricing.

## Bulk Purchase Order Pricing

Bulk PO pricing is separate from Online/DTC pricing.

Proposal-level Bulk PO behavior:

- May use Vendor Wholesale Price, Agreed Bulk PO Price, contract-specific PO price, buyer-specific override, or another configured PO pricing rule.
- Does not automatically apply online buyer-side commission unless a Pricing rule or contract explicitly configures that behavior.
- Produces procurement-bindable quote-like results and/or procurement-bindable snapshots for Procurement.
- May later produce invoice-bindable snapshot evidence for Invoice Management.
- Procurement owns PO lifecycle, accepted-price evidence, approval, submission, response, receiving placeholder, and PO status.
- Pricing owns interpretation of accepted-price variance, requote-required behavior, review-required behavior, and pricing conflict resolution.

## PO Pricing Bindability

PO pricing concepts should include:

- Requested price.
- Accepted price placeholder.
- Procurement accepted price evidence reference.
- PO reference.
- PO line reference.
- Procurement source record version.
- Procurement disposition.
- Applied vs ignored state.
- External response reference.
- Accepted price source.
- Accepted price variance.
- Accepted price variance reason.
- Accepted price evidence audit reference.
- Procurement review state.
- Pricing snapshot id.
- Snapshot version/hash.
- Quote-like result id.
- Quote expiration.
- Procurement-bindable status.
- Invoice-bindable status.
- Requote-required state.
- Superseded/expired state.
- Supersession reference.
- Pricing review-required state.

Procurement records accepted price evidence and owns accepted-price workflow. Pricing owns interpretation of accepted-price variance and requote/review logic. Pricing must store references/dispositions, not treat accepted PO values as standalone Pricing-owned truth. Missing, stale, conflicting, ignored, or review-required Procurement evidence should block invoice-bindable PO pricing or route to review.

## Return / Refund Adjustment Pricing

Pricing provides original transaction snapshot references and adjustment pricing evidence. Fulfillment/Returns owns operational return/refund evidence where applicable. Invoice Management owns invoice lifecycle and adjustment handling. Pricing must not own refund execution, return approval, payment, or invoice adjustment application.

Proposal-level adjustment pricing concepts should include:

- Original transaction pricing snapshot reference.
- Original snapshot version/hash.
- Return/refund evidence reference.
- Return/refund evidence version.
- Source module reference.
- Source-module disposition.
- Adjustment reason.
- Quantity basis.
- Refund/adjustment price basis.
- Adjustment pricing calculation reference.
- Invoice adjustment reference placeholder.
- Review-required state.
- Supersession reference.
- Audit reference.

Missing, stale, conflicting, or insufficient return/refund evidence should block adjustment pricing output or route to review. Pricing does not decide whether a refund, return, credit, or invoice adjustment should occur.

## Pricing Validation Hierarchy

Pricing validation should produce preview, block, warning, calculate, or review-required outcomes before calculation, import apply, quote creation, or snapshot binding.

Proposal-level hierarchy:

1. Tenant scope, permission, and channel evidence from Tenant Company.
2. Product Catalog pricing input reference, source input version, product visibility evidence, product channel flags, and locked/editable field governance.
3. Pricing Channel and transaction/source workflow evidence.
4. Required pricing inputs by channel and output class.
5. Currency format and numeric value validation.
6. Vendor Wholesale Price validation.
7. Commission basis/rate/source/effective-date validation.
8. Buyer-facing Wholesale Price validation and visibility evidence validation.
9. SRP/MSRP validation.
10. MAP / No MAP validation.
11. Sale Price and promotion effective-date validation.
12. Buyer-specific override and exception validation.
13. Procurement accepted-price evidence validation for PO bindability and variance review.
14. Return/refund source evidence validation for adjustment pricing.
15. Snapshot bindability validation for order, procurement, export, invoice, return/refund, or audit use.

Validation should cover Vendor Wholesale Price, Buyer-facing Wholesale Price, SRP/MSRP, MAP, Sale Price, No MAP, negative values, currency format, blank-field protection, partial pricing updates, stale/superseded source inputs, invalid channel, invalid commission basis, visibility evidence, Procurement evidence, return/refund evidence, overlapping effective dates, expired quote-like results, and missing snapshot evidence.

Pricing imports and pricing-related exports should follow `architecture/standards/import-export-validation-governance.md` for mode selection, preview, non-destructive defaults, blank field protection, locked field protection, destructive controls, audit evidence, and standard import/export statuses.

## Buyer-Specific Pricing Overrides

Buyer-specific overrides are Pricing-owned commercial constructs scoped by Tenant Company evidence.

Overrides should include buyer parent/child/entity scope, vendor scope, product/Product Type scope, channel, contract reference placeholder, effective date, end date, approval state, supersession/expiration behavior, visibility/redaction class, override reason, approver, audit reference, and conflict behavior.

Buyer-specific override imports must preserve create/update separation, preview affected pricing outcomes where allowed, protect blanks from clearing values unintentionally, and route missing/stale Tenant Company evidence to review.

## Owned Channel / Kaseory Pricing Exception

Owned Channel / Kaseory behavior should be modeled as a Pricing Channel, Pricing Exception, Pricing Profile, or Buyer-Specific Contract placeholder, not as hard-coded Product Catalog, Order Routing, Procurement, Invoice, or Integration behavior.

Owned-channel rules should include explicit scope, effective dates, channel selection evidence, component changes, redaction class, audit reference, and snapshot behavior.

## Invoice, Return, And Refund Pricing

Invoice Management consumes Pricing snapshot values and validates bindability. It must not recalculate commission, wholesale price, accepted price variance, buyer-facing Wholesale Price, or pricing exceptions.

Return/refund pricing should use original pricing snapshot references, adjustment references, or new Pricing-owned adjustment evidence where needed. Fulfillment/Returns owns return execution and return evidence. Invoice Management owns invoice/adjustment lifecycle. Pricing owns calculation/snapshot evidence only.

## Price Visibility, Notifications, Audit, And Analytics

Pricing-sensitive outputs must be governed by Tenant Company permissions and Pricing redaction classes.

Proposal-level visibility audiences include System Admin, Pricing Admin, Pricing Manager, Pricing Viewer, buyer parent user, buyer child/entity user, vendor user, Procurement consumer, Order Routing consumer, Invoice Management consumer, Integration consumer, Analytics consumer, and audit viewer.

Pricing emits price-change and pricing-review events. Notification Platform Service owns delivery. Logs & Audit owns immutable audit evidence. Analytics owns reporting models. Integration Management owns transport evidence for external pricing imports/exports or provider exchange.

## Dependencies

- ADR-0005 Pricing bounded context.
- ADR-0003 bounded contexts, as amended by ADR-0004 and ADR-0005.
- ADR-0004 Device Catalog bounded context split.
- Platform integration principles: API first, CSV fallback where needed, event-driven where possible, retry handling, audit logging, loose coupling, and API versioning.
- `architecture/standards/import-export-validation-governance.md` for pricing import/export validation governance.
- Tenant Company for tenant, parent/child entity, hierarchy scope, eligibility scope, relationship eligibility, channel eligibility, readiness, geography eligibility, user/entity access, child override scope signals, and company-level commission configuration input scope.
- Product Catalog for accessory product records, product/channel flags, product visibility references, and catalog-carried pricing inputs.
- Device Catalog for Device References, taxonomy, lifecycle, and safe canonical device attributes.
- Order Routing for order-time price requests and consumption of quote-like price results or order-bindable snapshots.
- Procurement / Purchase Orders for PO quote/snapshot requests, PO lifecycle, accepted-price workflow, and accepted-price evidence.
- Invoice Management for consumption of invoice-bindable historical evidence and ownership of invoice adjustment handling.
- Fulfillment/Returns for return/refund operational evidence, without moving return execution into Pricing.
- Notification Platform Service for delivery of pricing-related notifications.
- Logs & Audit for immutable evidence and file tracking.
- Analytics for pricing events and snapshots, while Analytics owns reporting models and rollups.
