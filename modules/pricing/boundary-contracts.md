# Pricing Boundary Contracts

This document is proposal-level architecture. It clarifies Pricing boundaries without finalizing formulas, commission defaults, payment behavior, tax behavior, buyer resale pricing, invoice lifecycle, PO lifecycle, routing decisions, return/refund execution, or downstream execution rules.

## What Pricing Owns

Pricing owns commercial interpretation and pricing evidence for authorized CIXCI contexts:

- Pricing Profiles and Pricing Rules.
- Pricing Channels and channel-specific calculation rules.
- Vendor-side commission components.
- Buyer-side commission components.
- Commission and revenue-share interpretation.
- Buyer-facing Wholesale Price calculated outputs and snapshots.
- Redaction-safe and visibility-safe Pricing outputs.
- Buyer-specific pricing overrides.
- Pricing exceptions, including Owned Channel / Kaseory placeholders.
- MAP, No MAP, SRP/MSRP, sale price, discount, and promotion-date interpretation where assigned to Pricing.
- Quote-like results.
- Order-bindable, procurement-bindable, export-bindable, invoice-bindable, return/refund, and audit pricing snapshots.
- Pricing validation previews, blocked states, warnings, and review-required states.
- Pricing-sensitive redaction classes, pricing events, and pricing audit references.
- PO accepted-price variance interpretation based on Procurement-owned accepted-price evidence references.
- Return/refund adjustment pricing evidence based on source-module evidence references.

## What Pricing May Answer

- What Pricing Profile, Pricing Channel, Pricing Rule, commission rule, exception, or buyer-specific override applies to an authorized commercial scope.
- What effective price, Buyer-facing Wholesale Price, component summary, and commission components result from an authorized calculation.
- Whether a calculated result is order-bindable, procurement-bindable, export-bindable, invoice-bindable, audit-only, expired, superseded, stale, or review-required.
- Whether buyer-facing pricing output is visibility-safe according to supplied Tenant Company, Product Catalog, channel, role/scope, and redaction evidence.
- Whether accepted PO price evidence differs from Pricing evidence and requires requote, review, invoice-bindability blocking, or permitted variance treatment.
- Whether return/refund source evidence is sufficient to create Pricing-owned adjustment pricing evidence.
- Whether proposed pricing inputs, partial updates, imports, overrides, commission changes, or channel selections pass Pricing validation.
- What historical Pricing snapshot, rule version, commission version, channel, source input version, exception, override, visibility evidence reference, Procurement evidence reference, return/refund evidence reference, and calculation engine version explain a Pricing output.

## What Pricing Must Not Answer

- Tenant hierarchy, buyer/vendor/entity eligibility, relationship approval, user permissions, channel eligibility, geography eligibility, activation state, or destructive action authority owned by Tenant Company.
- Product source record ownership, product lifecycle, product availability, Product Type definitions, product channel flags, product visibility references, compatibility assertions, product-media attachment acceptance, or catalog export baselines owned by Product Catalog.
- Canonical Device Records, Device References, device lifecycle, device normalization, or device portfolio ownership owned by Device Catalog.
- Normal customer order routing, vendor/warehouse/route/split selection, routed suborders, or order lifecycle owned by Order Routing.
- Bulk PO creation, approval, submission, accepted-price evidence capture, accepted-price workflow, vendor/manufacturer response lifecycle, receiving placeholders, or PO lifecycle owned by Procurement / Purchase Orders.
- Fulfillment execution, shipment, return operational state, return receipt, return approval, refund execution, refund payment, or inventory execution owned by Fulfillment/Returns or future Inventory contexts.
- Invoice creation, invoice lifecycle, invoice adjustment application, payment, reconciliation, accounting sync, dispute workflow, or payment processing owned by Invoice Management or future Payment/Accounting contexts.
- External delivery, webhook/API/CSV/SFTP transport evidence, external ID mappings, provider retries, or integration health owned by Integration Management.
- Notification delivery, recipient history, schedule delivery, or provider delivery state owned by Notification Platform Service.
- Audit evidence, immutable file tracking, import/export evidence, or audit record ownership owned by Logs & Audit.
- Analytics metric definitions, dashboards, report exports, or reporting read models owned by Analytics / Reporting.
- AI recommendations, confidence scores, drafts, or autonomous action outcomes owned by AI Agent Services.
- Buyer-controlled customer-facing or resale pricing unless a future ADR/module explicitly assigns that scope to Pricing.

## Upstream Dependencies

- Tenant Company supplies tenant scope, parent/child entity scope, permissions, role authority, buyer/vendor/manufacturer eligibility, channel eligibility, relationship scope, company configuration inputs, and commission configuration input scope.
- Product Catalog supplies catalog-carried pricing input references such as vendor wholesale, SRP/MSRP, MAP/No MAP, sale price, Product Type, product channel flags, product visibility references, lifecycle/availability context, and source input versions.
- Device Catalog supplies Device References and device attributes when a Pricing rule explicitly depends on canonical device context.
- Procurement supplies requested price, accepted price evidence references, PO/line references, Procurement source record versions, Procurement disposition, applied vs ignored state, external response references, and accepted-price variance evidence for Pricing interpretation.
- Invoice Management, Fulfillment/Returns, and Order Routing may supply references when they request snapshot evidence or return/refund pricing evidence.
- Fulfillment/Returns supplies return/refund operational evidence references where applicable; Pricing consumes those references only for pricing evidence.
- Import / Export / Validation Governance supplies shared expectations for create/update separation, blank-field protection, validation preview, destructive action controls, identifier preservation, and audit evidence.

## Downstream Consumers

- Product Catalog may consume pricing readiness, authorized price/snapshot references, pricing input validation outcomes, and pricing events, but does not calculate Pricing outputs.
- Order Routing consumes quote-like results or order-bindable snapshots and owns routing decisions.
- Procurement consumes procurement-bindable quotes/snapshots and Pricing variance interpretation; it owns PO lifecycle and accepted-price evidence.
- Invoice Management consumes invoice-bindable historical evidence and owns invoice lifecycle, adjustment handling, reconciliation, and dispute behavior.
- Fulfillment/Returns consumes return/refund pricing evidence where applicable and owns return/refund operational state.
- Integration Management transports authorized pricing exports/import outcomes and external references; it does not own Pricing validation or source mutation.
- Notification Platform Service may consume notification-safe Pricing event references and owns delivery.
- Analytics consumes redacted Pricing events/snapshots and owns reporting models.
- Logs & Audit owns immutable audit evidence linked from Pricing records.

## Buyer-Facing Visibility Boundary Rules

- Buyer-facing Wholesale Price is a Pricing-owned output, but output visibility depends on Tenant Company scope, permissions, channel eligibility, Product Catalog product/channel evidence, and Pricing redaction rules.
- Tenant Company owns access authority and channel eligibility.
- Product Catalog owns product/channel flags and product visibility references.
- Pricing owns redaction-safe and visibility-safe pricing output records.
- Missing, stale, expired, unauthorized, or conflicting visibility evidence should block buyer-facing display/export or route to review.
- Downstream modules should consume visibility-safe Pricing outputs and references, not recalculate or independently infer access.

## Commission Boundary Rules

- Vendor-side commission and buyer-side commission are separate Pricing-owned commercial components.
- Standard 7% / 7% behavior may exist as configurable default evidence, but must not be hard-coded as a permanent business rule.
- Tenant Company may own company-level configuration input scope and authority, but Pricing owns commercial interpretation, precedence, calculation, validation, snapshotting, and redaction of commission components.
- Commission changes must not rewrite historical transaction, PO, invoice, return/refund, or export snapshots.
- Commission details should be redacted by consumer class and tenant scope.

## Channel Boundary Rules

- Pricing owns channel-specific calculation rules for Online / Direct-to-Consumer, Bulk Purchase Order, Owned Channel / Kaseory, Buyer Storefront, Marketplace placeholder, Retail POS placeholder, Promotional Campaign placeholder, and Buyer-Specific Contract placeholder.
- Tenant Company owns whether a buyer/entity is eligible for a channel.
- Product Catalog owns accepted product channel flags.
- Transaction source modules provide channel selection evidence before Pricing calculates or snapshots.
- Pricing Channel must be stored in quote-like results, snapshots, validation previews, and audit references.

## Online / Direct-to-Consumer Boundary

- Pricing may calculate Online/DTC Buyer-facing Wholesale Price from vendor wholesale input plus applicable buyer-side commission/markup where rule evidence supports that formula.
- Online/DTC calculations may consider SRP/MSRP, MAP/No MAP, sale price, buyer-specific overrides, and channel exceptions.
- Order Routing consumes order-bindable snapshots and does not recalculate Online/DTC price.
- Buyer storefront resale/customer-facing pricing remains separate unless future scope assigns it.

## Bulk PO Boundary

- Bulk PO pricing is separate from Online/DTC pricing.
- Pricing may produce procurement-bindable quote/snapshot evidence based on Vendor Wholesale Price, Agreed Bulk PO Price, contract-specific PO price, or other configured PO pricing rules.
- Bulk PO pricing should not automatically apply Online/DTC buyer-side commission unless a Pricing rule/contract explicitly configures it.
- Procurement records requested price and accepted price evidence, owns PO lifecycle, and must not recalculate Pricing outputs.
- Pricing must store Procurement accepted-price references, source versions, dispositions, and review states rather than treating accepted PO values as standalone Pricing-owned truth.
- Pricing owns interpretation of accepted-price variance, requote-required state, pricing review-required state, and invoice-bindable PO pricing evidence.
- Missing, stale, conflicting, ignored, or review-required Procurement evidence should block invoice-bindable PO pricing or route to review.

## Validation And Import Boundary

- Pricing owns Pricing-specific validation for vendor wholesale, Buyer-facing Wholesale Price output, buyer-facing visibility evidence, SRP/MSRP, MAP/No MAP, sale price, commission basis, channel, currency format, negative values, buyer-specific overrides, stale/superseded source inputs, Procurement accepted-price evidence, return/refund evidence, and partial pricing updates.
- Product Catalog owns catalog product import source records and catalog-carried pricing input storage.
- Pricing imports/exports should follow `architecture/standards/import-export-validation-governance.md` for preview, create/update separation, update-only protection, blank-field protection, destructive controls, identifier preservation, user-facing summaries, and audit evidence.
- Pricing validation previews must not mutate source records.

## Invoice, Return, And Refund Boundary

- Pricing owns snapshot evidence and return/refund pricing interpretation references where applicable.
- Invoice Management owns invoice lifecycle, invoice line creation, invoice approval, invoice adjustment application, reconciliation, disputes, and payment/accounting handoff.
- Fulfillment/Returns owns return operational state, return/refund evidence, return approval, and refund execution workflow where applicable.
- Pricing may provide original transaction snapshot references, adjustment pricing calculation references, and review-required states from source evidence.
- Pricing must not decide whether a refund, return, credit, payment, or invoice adjustment should occur.
- Snapshot corrections should be modeled as new snapshots or adjustment references, not silent mutation.

## Conflict Classes

- Scope conflict: multiple profiles, overrides, channel rules, or commission rules match the same context incompatibly.
- Temporal conflict: effective dates, end dates, sale windows, promotion windows, quote expiration, or snapshot bindability windows overlap incorrectly.
- Component conflict: vendor-side commission, buyer-side commission, markup, discount, MAP/SRP, sale, exception, override, or channel rules modify the same component incompatibly.
- Source conflict: Product Catalog, Device Catalog, Tenant Company, Procurement, Fulfillment/Returns, or Invoice Management inputs are missing, stale, superseded, redirected, ignored, or version-incompatible.
- Authorization conflict: caller has access to calculation but not full component detail, commission detail, exception detail, visibility evidence, or snapshot evidence.
- Consumer conflict: Order Routing, Procurement, Invoice Management, Fulfillment/Returns, Analytics, Notification, Integration, or audit consumers require different payload classes or redaction levels.
- Bindability conflict: requested output cannot become order-bindable, procurement-bindable, export-bindable, invoice-bindable, buyer-displayable, or adjustment-output-ready due to stale, missing, expired, superseded, ignored, or review-required evidence.

## Open Questions

- Which exact formulas apply per channel and Product Type?
- Which commission settings are Tenant Company configuration inputs versus Pricing-managed commercial rules?
- What is the confirmed precedence order across base price, vendor wholesale, SRP/MSRP, MAP/No MAP, sale price, discounts, vendor-side commission, buyer-side commission, revenue share, exceptions, overrides, and buyer-specific contracts?
- Which buyer-controlled customer-facing pricing feedback should Pricing receive without owning buyer resale pricing?
- What accepted PO price variance thresholds require Pricing review?
- Which Procurement evidence dispositions should block invoice-bindable PO pricing?
- Which return/refund evidence dispositions should block adjustment pricing output?
- Which snapshot classes are required by Invoice Management, Fulfillment/Returns, Procurement, and Order Routing at launch?
