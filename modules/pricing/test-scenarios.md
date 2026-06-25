# Test Scenarios

## Ownership And Boundary Scenarios

- Vendors submit pricing inputs and Product Catalog/Pricing governance accepts them without describing vendors as sole CIXCI source owners.
- Product Catalog stores catalog-carried pricing inputs while Pricing calculates Buyer-facing Wholesale Price and snapshots.
- Product Catalog owns product/channel flags and product visibility references while Pricing consumes versions for buyer-facing pricing output visibility.
- Tenant Company supplies buyer/vendor/entity/channel scope and Pricing blocks when scope evidence is missing or stale.
- Tenant Company owns permission and channel eligibility authority while Pricing records visibility-safe pricing output evidence.
- Pricing returns quote-like results to Order Routing without selecting vendor, route, split, warehouse, or fulfillment path.
- Pricing returns procurement-bindable evidence to Procurement without creating, submitting, approving, or changing a PO.
- Procurement owns accepted-price workflow and accepted-price evidence while Pricing stores references/dispositions for variance interpretation.
- Pricing returns invoice-bindable evidence to Invoice Management without creating invoice lifecycle, payment, dispute, reconciliation, or accounting state.
- Pricing returns adjustment pricing evidence without owning return approval, refund execution, payment, or invoice adjustment application.

## Commission Scenarios

- Calculate separate vendor-side and buyer-side commission components for the same context.
- Apply configurable standard 7% / 7% default behavior from rule evidence without hard-coding the values.
- Preserve historical snapshots after vendor-side or buyer-side commission rule changes.
- Reject or route to review an invalid commission basis.
- Apply effective date, end date, precedence, scope, contract reference placeholder, and commission rule version/hash to a commission component.
- Redact commission detail for a consumer that may only see commercial summary.

## Channel Pricing Scenarios

- Calculate Online / Direct-to-Consumer price using vendor wholesale input plus applicable buyer-side commission/markup where rule evidence supports it.
- Calculate Bulk Purchase Order price separately from Online/DTC and avoid applying Online/DTC buyer-side commission unless explicitly configured.
- Resolve Owned Channel / Kaseory exception without applying it to unrelated buyer storefront or PO channels.
- Block calculation when channel selection evidence is missing, unauthorized, invalid, or ambiguous.
- Store Pricing Channel in quote-like result, snapshot, validation preview, and audit evidence.
- Apply Buyer-Specific Contract placeholder channel only when Tenant Company scope and Pricing rule evidence allow it.

## Buyer-Facing Wholesale Price Scenarios

- Produce Buyer-facing Wholesale Price as a Pricing-owned calculated output/snapshot.
- Include source inputs, commission components, applied exception/override references, rule versions, snapshot id/version/hash, channel, and redaction class.
- Include Tenant Company scope reference/version, role/scope projection reference, buyer/entity scope reference, channel eligibility reference, Product Catalog product-channel flag version, Product Catalog product visibility/reference version, redaction decision version, authorized consumer class, pricing output visibility state, visibility evidence expiration, recheck-before-display flag, and audit reference.
- Confirm Product Catalog, Order Routing, Procurement, Invoice Management, and Analytics consume the output without recalculating it.
- Block buyer-facing display when visibility evidence is missing, stale, expired, unauthorized, or conflicting.
- Confirm downstream modules consume visibility-safe pricing outputs rather than independently inferring access.
- Block output when Pricing cannot validate vendor wholesale input, buyer-side commission, channel, or scope evidence.

## Online / Direct-to-Consumer Scenarios

- Apply SRP/MSRP, MAP/No MAP, sale price, buyer-specific override, and channel-specific exception placeholders to an Online/DTC calculation.
- Produce an order-bindable snapshot for Order Routing where all evidence is fresh and authorized.
- Route stale Product Catalog pricing input or expired sale window to warning, review-required, or blocked according to validation rules.
- Keep buyer-controlled storefront/customer-facing resale price feedback separate from Pricing-owned wholesale and commission snapshots.

## Bulk PO And PO Bindability Scenarios

- Produce a procurement-bindable quote/snapshot using Vendor Wholesale Price, Agreed Bulk PO Price, or contract-specific PO price where configured.
- Include requested price, accepted price placeholder, accepted price source, accepted price variance, accepted price variance reason, quote-like result id, quote expiration, snapshot id/version/hash, procurement-bindable status, invoice-bindable status, and requote-required state.
- Include Procurement accepted price evidence reference, PO reference, PO line reference, Procurement source record version, Procurement disposition, applied vs ignored state, external response reference, accepted price evidence audit reference, Procurement review state, Pricing review-required state, and supersession reference.
- Route stale, expired, superseded, or non-procurement-bindable evidence to review.
- Interpret accepted-price variance from Procurement evidence without mutating PO lifecycle or treating accepted PO values as standalone Pricing-owned truth.
- Block invoice-bindable PO pricing when Procurement evidence is missing, stale, conflicting, ignored, or review-required.
- Provide invoice-bindable PO pricing evidence to Invoice Management without creating invoice records.

## Return / Refund Adjustment Pricing Scenarios

- Provide original transaction pricing snapshot reference and original snapshot version/hash for return/refund adjustment pricing evidence.
- Include return/refund evidence reference/version, source module reference, source-module disposition, adjustment reason, quantity basis, refund/adjustment price basis, adjustment pricing calculation reference, invoice adjustment reference placeholder, review-required state, supersession reference, and audit reference.
- Block adjustment pricing output when return/refund evidence is missing, stale, conflicting, or insufficient.
- Confirm Fulfillment/Returns owns operational return/refund evidence and Invoice Management owns invoice lifecycle and adjustment handling.
- Confirm Pricing does not decide whether a refund, return, credit, payment, or invoice adjustment should occur.

## Pricing Validation Scenarios

- Validate Vendor Wholesale Price, Buyer-facing Wholesale Price output, SRP/MSRP, MAP, No MAP, Sale Price, negative values, currency format, blank-field protection, partial pricing updates, stale/superseded source inputs, invalid channel, and invalid commission basis.
- Validate buyer-facing visibility evidence before display/export.
- Validate Procurement accepted-price evidence before PO invoice bindability.
- Validate return/refund evidence before adjustment pricing output.
- Preview buyer-specific pricing override imports before apply.
- Preserve UPC/text identifiers and date/time fields through import/export governance.
- Block blank fields in update-only imports unless explicit destructive action controls authorize clearing.
- Return separate errors, warnings, review-required states, and safe before/after preview summaries.
- Confirm validation preview does not mutate source records.

## Buyer-Specific Override Scenarios

- Create, approve, expire, revoke, and supersede buyer-specific pricing overrides with scope, effective dates, version/hash, redaction class, and audit evidence.
- Detect conflict between buyer-specific override and active exception or commission rule.
- Confirm overrides do not alter vendor source pricing inputs or buyer-controlled resale prices.
- Validate override import rows against Tenant Company scope, Product Catalog references, Product Type, channel, effective dates, and Pricing rules.

## Invoice, Return, And Refund Scenarios

- Provide invoice-bindable snapshot evidence for an order or PO without allowing Invoice Management to recalculate pricing.
- Preserve historical invoice evidence after profile, commission, channel, exception, or source input changes.
- Provide return/refund pricing evidence where applicable without owning return/refund execution.
- Block or route to review invoice evidence when accepted PO price variance remains unresolved.
- Block or route to review adjustment pricing evidence when source-module return/refund evidence is unresolved.

## Notification, Integration, Analytics, Audit, And AI Scenarios

- Pricing emits notification-triggering events while Notification Platform Service owns delivery.
- Pricing emits integration/export signals while Integration Management owns transport evidence and external references.
- Pricing emits redacted analytics events while Analytics owns reporting models and metric definitions.
- Logs & Audit receives audit references without mutating Pricing source records.
- AI Agent Services may recommend pricing cleanup or conflict review but cannot mutate Pricing rules, overrides, or snapshots without approved action contracts and permissions.

## Event And API Scenarios

- Publish `pricing.po-accepted-price-evidence.received` when Pricing receives a Procurement evidence reference for variance interpretation.
- Publish stale/conflicting PO evidence events when Procurement evidence cannot support invoice bindability.
- Publish `pricing.po-pricing.invoice-bindability-blocked` when PO pricing cannot become invoice-bindable.
- Publish buyer-facing visibility evidence missing/stale events and redaction decision events when display/export access cannot be confirmed.
- Publish return/refund evidence missing/stale, adjustment review required, and adjustment output created events.
- API responses include visibility evidence summaries, Procurement evidence handoff summaries, and adjustment evidence summaries where applicable.

## Regression Scenarios

- Existing Effective Price Snapshots remain immutable after pricing profile, channel, commission, exception, override, visibility evidence, Procurement evidence, return/refund evidence, or upstream input changes.
- Expired pricing exceptions no longer affect new calculations but remain visible in audit history.
- Conflicting pricing overrides produce review-required results instead of silent precedence guesses.
- MAP/SRP, No MAP, sale, commission, margin, discount, channel, exception, and override interpretation changes are versioned and auditable.
- Event replay does not create duplicate snapshots, quote-like results, PO variance records, adjustment pricing records, or downstream price effects.
