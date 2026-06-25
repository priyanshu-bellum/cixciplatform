# Pricing Data Model

This document is proposal-level architecture. It hardens Pricing entities for commission, channel pricing, buyer-facing wholesale price, purchase order pricing, validation, snapshots, visibility, and audit without finalizing commercial rules.

## Entities

- Pricing Profile.
- Pricing Rule.
- Pricing Channel.
- Price Component.
- Vendor-Side Commission Component.
- Buyer-Side Commission Component.
- Revenue Share Component.
- Buyer-Facing Wholesale Price Output.
- Buyer-Facing Price Visibility Evidence.
- Pricing Validation Result.
- Pricing Validation Preview.
- Price Calculation Request.
- Calculation Result.
- Effective Price.
- Quote-Like Price Result.
- Effective Price Snapshot.
- Order-Bindable Snapshot.
- Procurement-Bindable Snapshot.
- Export-Bindable Snapshot.
- Invoice-Bindable Historical Evidence.
- Return/Refund Pricing Evidence Reference.
- Return/Refund Adjustment Pricing Evidence.
- Catalog Pricing Input Reference.
- Device Pricing Input Reference.
- Tenant Pricing Scope Reference.
- Channel Selection Evidence Reference.
- Commission Rule.
- Commission Rule Version.
- Revenue Share Rule Placeholder.
- Parent/Child Override Interpretation Placeholder.
- Buyer-Specific Pricing Override.
- Pricing Exception.
- Owned Channel / Kaseory Exception Placeholder.
- MAP/SRP Policy Interpretation Placeholder.
- No MAP Policy Placeholder.
- Sale Pricing Rule Placeholder.
- PO Pricing Bindability Record.
- PO Accepted-Price Evidence Handoff Reference.
- Accepted Price Variance Review.
- Pricing Visibility Policy.
- Pricing Audit Record.
- Pricing Event Record.
- Pricing Rule Version.
- Source Input Version Reference.
- Calculation Engine Version.

## Relationships

- Pricing Profile may contain one or more Pricing Rules.
- Pricing Rule may apply to a Tenant Pricing Scope Reference, buyer, child entity, vendor, product, Device Reference, category, Product Type, region, channel, contract, timeframe, or another confirmed scope.
- Pricing Rule Version records the effective commercial rule definition used during calculation.
- Pricing Channel is selected from transaction/source workflow evidence and is stored on calculation results, quote-like results, snapshots, events, and audit records.
- Vendor-Side Commission Component and Buyer-Side Commission Component are separate Price Components and may have different rate sources, bases, scopes, precedence, redaction, and snapshot behavior.
- Price Calculation Request combines authorized tenant scope, Product Catalog pricing input references, Device Catalog input references, Pricing Channel, channel selection evidence, Product Type, and Pricing-owned rules.
- Calculation Result is the immediate output of a calculation request and may be ephemeral.
- Effective Price is derived from one or more Price Components for an effective date, channel, and scope.
- Buyer-Facing Wholesale Price Output is a Pricing-owned calculated output and may be captured in snapshots.
- Buyer-Facing Price Visibility Evidence records the Tenant Company, Product Catalog, channel, role/scope, and redaction evidence that governs whether a buyer-facing output can be displayed or exported.
- Quote-Like Price Result may be consumed by Order Routing, Procurement, or another approved consumer without transferring workflow decisions into Pricing.
- Effective Price Snapshot records calculation inputs, component summary, versions, effective date, transaction time, channel, and audit metadata needed for order-time, procurement, export, invoice, return/refund, and audit use.
- Order-Bindable Snapshot represents snapshot form Order Routing may bind to an order decision while Order Routing owns order orchestration.
- Procurement-Bindable Snapshot represents snapshot form Procurement may consume for PO draft/submission workflows while Procurement owns PO lifecycle.
- PO Accepted-Price Evidence Handoff Reference links Pricing variance interpretation to Procurement-owned accepted-price evidence without making Pricing authoritative for accepted PO facts.
- Invoice-Bindable Historical Evidence represents snapshot evidence Invoice Management may use while Invoice Management owns invoice lifecycle and reconciliation.
- Return/Refund Pricing Evidence Reference links original snapshot or adjustment evidence to downstream return/refund or invoice adjustment workflows without Pricing owning refund execution.
- Return/Refund Adjustment Pricing Evidence records Pricing-owned adjustment calculation evidence from source-module references, while Fulfillment/Returns and Invoice Management own operational disposition.
- Pricing Exception and Pricing Override may affect one or more Pricing Rules, Price Components, Effective Prices, or Pricing Profiles within typed scope, effective dates, transaction time, and approval state.

## Pricing Channel

Represents the commercial channel selected for calculation.

Proposal-level values:

- Online / Direct-to-Consumer.
- Bulk Purchase Order.
- Owned Channel / Kaseory.
- Buyer Storefront.
- Marketplace placeholder.
- Retail POS placeholder.
- Promotional Campaign placeholder.
- Buyer-Specific Contract placeholder.

Proposal-level fields:

- Pricing Channel id/value.
- Channel selection evidence reference.
- Source workflow: order, PO, export, pricing preview, import validation, invoice, return/refund, or future value.
- Tenant Company channel eligibility reference.
- Product Catalog product channel flag reference.
- Buyer/vendor/entity scope.
- Effective date and transaction time.
- Review-required state.
- Audit reference.

Pricing owns channel-specific calculation rules. Tenant Company owns channel eligibility. Product Catalog owns product channel flags where accepted.

## Commission Components

Vendor-side and buyer-side commissions are separate components.

Proposal-level fields:

- Commission component id.
- Component side: vendor-side or buyer-side.
- Commission rate source.
- Commission basis.
- Effective date.
- End date.
- Scope: buyer, vendor, parent entity, child entity, product, Product Type, channel, region, contract, or future value.
- Precedence.
- Applied component.
- Snapshot field references.
- Visibility/redaction class.
- Contract reference placeholder.
- Commission rule version/hash.
- Commission status: draft, active, expired, revoked, superseded, blocked, or review-required.
- Audit reference.

Standard 7% / 7% behavior may exist as a configurable default profile or rule, not as hard-coded behavior. Historical snapshots must preserve the commission rule/version and component values applied at transaction time.

## Buyer-Facing Wholesale Price Output

Represents a Pricing-owned calculated output/snapshot value. Visibility of this output depends on Tenant Company scope, permissions, channel eligibility, Product Catalog product/channel evidence, and Pricing redaction rules.

Proposal-level fields:

- Buyer-facing Wholesale Price id.
- Pricing Channel.
- Vendor Wholesale Price input reference.
- Buyer-side commission/markup component reference.
- Applicable exception/override references.
- Formula/rule reference.
- Pricing rule version summary.
- Source input version summary.
- Snapshot id.
- Snapshot version/hash.
- Calculation engine version.
- Currency.
- Effective date and transaction time.
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
- Redaction class.
- Audit reference.

Default Online/DTC behavior may calculate Buyer-facing Wholesale Price as Vendor Wholesale Price plus applicable buyer-side commission/markup where rule evidence supports it. Product Catalog, Invoice Management, Order Routing, Procurement, and Analytics must not calculate this value independently. Downstream modules should consume visibility-safe pricing outputs and references instead of recalculating or independently inferring access. Missing or stale visibility evidence should block buyer-facing display or route to review.

## PO Pricing Bindability Record

Represents Pricing-owned quote/snapshot bindability for Procurement and later invoice use. Procurement owns accepted PO price evidence and accepted-price workflow. Pricing owns pricing variance interpretation, requote/review logic, procurement-bindable quote/snapshot evidence, and invoice-bindable pricing evidence.

Proposal-level fields:

- PO pricing bindability id.
- Pricing Channel: Bulk Purchase Order or another configured PO channel.
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
- Contract reference placeholder.
- Audit reference.

Pricing may consume Procurement accepted-price evidence to evaluate variance, but must store references, source versions, and dispositions rather than treating accepted PO values as standalone Pricing-owned truth. Missing, stale, conflicting, ignored, or review-required Procurement evidence should block invoice-bindable PO pricing or route to review.

## Return/Refund Adjustment Pricing Evidence

Represents Pricing-owned pricing evidence for return, refund, credit, or invoice adjustment scenarios. Pricing must not decide whether a return, refund, credit, payment, or invoice adjustment should occur.

Proposal-level fields:

- Adjustment pricing evidence id.
- Original transaction pricing snapshot reference.
- Original snapshot version/hash.
- Return/refund evidence reference.
- Return/refund evidence version.
- Source module reference: Fulfillment/Returns, Invoice Management, or another approved source.
- Source-module disposition.
- Adjustment reason.
- Quantity basis.
- Refund/adjustment price basis.
- Adjustment pricing calculation reference.
- Invoice adjustment reference placeholder.
- Review-required state.
- Supersession reference.
- Audit reference.

Fulfillment/Returns owns operational return/refund evidence where applicable. Invoice Management owns invoice lifecycle and adjustment handling. Missing, stale, conflicting, or insufficient return/refund evidence should block adjustment pricing output or route to review.

## Pricing Validation Result And Preview

Represents validation before calculation, import apply, quote creation, or snapshot binding.

Proposal-level validation subjects:

- Vendor Wholesale Price.
- Buyer-facing Wholesale Price.
- Buyer-facing price visibility evidence.
- SRP/MSRP.
- MAP.
- Sale Price.
- No MAP.
- Negative values.
- Currency format.
- Blank-field protection.
- Partial pricing updates.
- Stale/superseded source inputs.
- Invalid channel.
- Invalid commission basis.
- Procurement accepted-price evidence.
- Return/refund adjustment pricing evidence.
- Overlapping effective dates.
- Expired quote-like result.
- Missing snapshot evidence.
- Buyer-specific override conflict.
- Owned-channel exception conflict.

Proposal-level fields:

- Validation id.
- Validation mode: import preview, calculation preview, quote validation, snapshot bindability, override validation, visibility validation, PO evidence validation, adjustment evidence validation, or audit review.
- Subject reference.
- Pricing Channel.
- Input value and redacted display value.
- Source input version reference.
- Validation rule/version.
- Severity: error, warning, calculate, block, or review-required.
- Remediation hint.
- Preview before/after summary.
- Audit reference.

Pricing imports should follow `architecture/standards/import-export-validation-governance.md`.

## Lifecycle Split

This split is proposal-level and prevents calculation, quote, order, procurement, export, invoice, and return/refund evidence from becoming one ambiguous record.

### Calculation Result

- Ephemeral output of a calculation request.
- May be used for preview, validation, or interactive display.
- Should carry calculation request id, pricing channel, input references, rule versions, commission rule versions, calculation engine version, effective date, transaction time, and audit reference.
- Should not be treated as order-bindable, procurement-bindable, export-bindable, or invoice-bindable unless promoted to a snapshot through an explicit workflow.

### Quote-Like Price Result

- Pricing-owned commercial result intended for Order Routing, Procurement, or a future Quote context.
- May have validity window, expiration, consumer reference, output class, and redaction rules.
- Does not select vendor, route, warehouse, split, fulfillment path, PO outcome, or order outcome.
- Placeholder: define whether quote-like result lifecycle remains in Pricing or moves to a future Quote context.

### Immutable Effective Price Snapshot

- Immutable record of calculation evidence at a transaction time.
- Should preserve source input versions, rule versions, commission rule versions, calculation engine version, component summary, exception/override references, pricing channel, redaction class, and audit reference.
- Should not be silently rewritten when upstream catalog, device, tenant, or pricing records change.
- Corrections should create a new snapshot, adjustment reference, supersession, or review-required record.

### Order-Bindable Snapshot

- Snapshot form consumed by Order Routing for order-time evidence.
- Should declare whether it is valid for order binding, expired, superseded, revoked, or review-required.
- Should not decide whether an order proceeds; Order Routing owns that decision.

### Procurement-Bindable Snapshot

- Snapshot form consumed by Procurement for PO workflow evidence.
- Should declare procurement-bindable status, quote expiration, requested price, Procurement accepted-price evidence reference where applicable, accepted-price variance status, and review-required state.
- Should not approve, submit, accept, reject, receive, or close a PO; Procurement owns those decisions.

### Export-Bindable Snapshot

- Snapshot form that may be exported to an authorized buyer/system where export rules allow.
- Should preserve redaction class, export schema/version reference, buyer-facing visibility evidence reference, and channel.
- Should not bypass Tenant Company visibility, Product Catalog export rules, or Integration Management delivery boundaries.

### Invoice-Bindable Historical Evidence

- Snapshot evidence Invoice Management may use for invoice line support, audit, disputes, or adjustments.
- PO invoice-bindable evidence should reference Procurement accepted-price evidence and Pricing variance/review disposition where applicable.
- Should preserve historical calculation facts even if current pricing changes.
- Should not create invoice state, payment state, reconciliation state, accounting entries, or dispute workflow inside Pricing.

## Bitemporal / Versioning Model

### Effective Dates

- Effective start and end dates determine when a pricing rule, profile, commission component, exception, override, sale, MAP/SRP interpretation, channel rule, or snapshot applies commercially.
- Overlapping effective windows should be resolved by confirmed precedence rules or blocked as conflicts.

### Transaction Time

- Transaction time records when Pricing observed, calculated, approved, snapshotted, expired, revoked, imported, validated, or published a pricing fact.
- Audit reconstruction should be able to answer what Pricing knew at a transaction time and what was commercially effective at an effective time.

### Rule Version

- Every calculation should reference Pricing Rule Version, Pricing Profile Version, Commission Rule Version, exception/override version, and Pricing Channel rule version where applicable.
- Rule version changes should not mutate historical snapshots.
- Placeholder: define version compatibility rules when component names, formulas, or precedence rules change.

### Source Input Version

- Product Catalog input references should include source input version or change record reference where available.
- Product Catalog product-channel flag and product visibility references should include versions where buyer-facing output visibility depends on them.
- Device Catalog input references should include Device Reference version, lifecycle version, or source change reference where available.
- Tenant Company scope references should include scope signal version, event version, or lookup timestamp where available.
- Procurement accepted-price evidence references should include source record version and disposition where PO variance or invoice bindability depends on them.
- Return/refund evidence references should include source evidence version and source-module disposition where adjustment pricing depends on them.

### Calculation Engine Version

- Every calculation and snapshot should record the calculation engine version or equivalent pricing evaluator version.
- Placeholder: define when engine version changes require replay, validation, or migration of pricing outputs.

### Audit Reconstruction Needs

- Pricing Audit Record should link calculation request, rule versions, source input versions, engine version, exception/override versions, commission rule versions, Pricing Channel, buyer-facing visibility evidence, Procurement evidence references where applicable, return/refund evidence references where applicable, actor or service identity, redaction class, and event ids.
- Historical reconstruction should not depend on current mutable Product Catalog, Device Catalog, Tenant Company, Procurement, Fulfillment/Returns, Invoice Management, or Pricing rule state alone.

## Ownership

- Pricing owns price calculation logic, pricing profiles, pricing rules, commission and margin interpretation, pricing exceptions, buyer-specific pricing overrides, effective dating, effective prices, effective price snapshots, pricing audit, and pricing events.
- Pricing owns commercial interpretation of Tenant Company hierarchy scope, parent/child scope, eligibility scope, channel eligibility evidence, company-level commission configuration input scope, and child override scope signals.
- Pricing owns redaction/visibility-safe pricing outputs, while Tenant Company owns access authority and Product Catalog owns product/channel flags.
- Tenant Company owns hierarchy, eligibility, readiness, relationship, geography eligibility, user/entity access, role, permission, channel eligibility, and child override scope signals.
- Pricing consumes Tenant Company scope signals; it must not derive relationship approval, readiness, geography eligibility, user/entity access, or tenant hierarchy.
- Product Catalog owns accessory product records, product/channel flags, product visibility references, and catalog-carried pricing input values. Pricing owns how those inputs affect calculated prices.
- Device Catalog owns Device References, canonical device records, taxonomy, lifecycle, and device attributes. Pricing owns how approved device inputs affect calculated prices.
- Order Routing owns routing, vendor selection, split decisions, and order orchestration. Pricing may return quote-like price results and order-bindable snapshots.
- Procurement owns PO lifecycle, accepted-price workflow, and accepted-price evidence. Pricing may return quote-like results, procurement-bindable snapshots, and pricing variance/requote decisions.
- Invoice Management owns invoice lifecycle, adjustment handling, and reconciliation. Pricing may provide immutable invoice-bindable price snapshots and adjustment pricing evidence.
- Fulfillment/Returns owns return/refund operational evidence. Pricing may provide original snapshot or adjustment pricing evidence.
- Analytics owns reporting models and rollups. Pricing may publish events and snapshots for analytics consumption.

## Field-Level Ownership

### Pricing-Owned Fields

- Pricing profile identifier, type, status, scope, effective dates, transaction timestamps, and version.
- Pricing rule identifier, priority, calculation component, formula placeholder, effective dates, expiration, approval status, and version.
- Vendor-side commission component and buyer-side commission component.
- Commission rate, commission basis, rate source, applied component, precedence, status, rule version/hash, and visibility/redaction class.
- Buyer-facing Wholesale Price output and snapshot fields.
- Buyer-facing output redaction decision, visibility-safe output state, and recheck-before-display flag.
- Pricing Channel, channel rule references, and channel-specific output class.
- Pricing exception type, scope, affected subject, reason, approver, effective dates, transaction timestamps, expiration, override mode, and audit metadata.
- Buyer-specific pricing override scope, approval, effective dates, supersession, and conflict behavior.
- Final buyer/entity/channel-specific effective price, component breakdown, currency, tax-exclusion or tax-inclusion placeholder, and snapshot identifier.
- MAP, No MAP, SRP/MSRP, Sale Price, discount, and quote-like interpretation results.
- PO pricing bindability, accepted-price variance interpretation, requote-required state, pricing review-required state, and references to Procurement accepted-price evidence.
- Return/refund adjustment pricing calculation references and Pricing review disposition.
- Calculation engine version, input hash, source input version summary, and redaction class.

### Tenant Company-Owned Context Fields

- Tenant identifier, parent company identifier, child entity identifier, relationship identifier, region or eligibility scope, channel eligibility, activation readiness, and child override scope.
- User, role, permission, and provisioning state used for access checks.
- Role/scope projection and buyer/entity scope evidence used for buyer-facing pricing visibility.
- Company-level commission configuration input scope where configured, without owning Pricing commercial interpretation.
- Admin exceptions affecting eligibility, readiness, or scope only.

### Product Catalog-Owned Input Fields

- Accessory product identifier, product variant placeholder, catalog-carried Vendor Wholesale Price, SRP/MSRP, MAP, Sale Price, product lifecycle, channel flags, product visibility references, and catalog activation references.
- Product-channel flag versions, product visibility/reference versions, Product Catalog source metadata, source input version, and catalog change record references.

### Device Catalog-Owned Input Fields

- Device Reference, device taxonomy, lifecycle, manufacturer, brand, model, variant, region, and other safe canonical device attributes.
- Device source metadata, Device Reference lifecycle state, and source input version.

### Order / Procurement / Invoice Consumer Fields

- Order request identifier or correlation identifier supplied by Order Routing.
- PO reference, PO line reference, requested price, accepted price evidence reference, Procurement source record version, Procurement disposition, applied vs ignored state, accepted-price source, accepted-price variance reason, Procurement review state, and PO lifecycle state supplied by Procurement.
- Invoice snapshot reference and invoice adjustment reference requested or supplied by Invoice Management.
- Return/refund evidence reference, return/refund evidence version, quantity basis, source-module disposition, and adjustment reason supplied by Fulfillment/Returns or Invoice Management.
- Downstream consumer type and redaction class for price result payloads.

### Shared Or Unresolved Fields

- Which company-level commission settings live in Tenant Company scope versus Pricing commercial interpretation.
- Whether region-specific pricing scope is driven only by Tenant Company geography or also by Product Catalog and Device Catalog availability signals.
- Currency, tax, fee, rebate, payment terms, refund execution, and invoice adjustment ownership.
- Quote-like price result lifetime and whether a future Quote context is required.
- Reconciliation and dispute references needed by Invoice Management without moving invoice lifecycle into Pricing.

## Retention

- Preserve pricing profiles, pricing rules, commission rules, effective price snapshots, pricing exceptions, buyer-specific overrides, validation previews, PO bindability records, buyer-facing visibility evidence references, return/refund adjustment pricing evidence references, and audit records.
- Preserve calculation requests and calculation results according to retention rules when they do not become order, procurement, export, or invoice snapshots.
- Preserve stale upstream input references after Product Catalog, Device Catalog, Tenant Company, Procurement, Fulfillment/Returns, or Invoice Management records change.
- Preserve replay and reconstruction evidence for historical effective prices.
- Preserve source input version summaries, calculation engine version records, commission rule versions, and channel rule versions.

## Tenant Isolation Notes

- Every pricing profile, rule, exception, override, calculation result, effective price, channel rule, buyer-facing output, and snapshot must carry explicit tenant scope or explicit platform-wide scope.
- Buyer/entity-specific price results must not leak across parent companies, child entities, vendors, regions, channels, contracts, Product Types, or relationship scopes.
- Pricing must validate tenant scope by consuming Tenant Company signals before returning tenant-scoped price results.
- Pricing must not derive relationship approval, readiness, geography eligibility, user/entity access, channel eligibility, or tenant hierarchy.
- Pricing events must avoid exposing sensitive pricing details to unauthorized consumers and should use redaction or lookup contracts where needed.
- Shared catalog or device references must not imply shared pricing visibility.
