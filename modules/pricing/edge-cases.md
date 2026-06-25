# Edge Cases

## Permissions And Visibility

- A user has access to a child entity but requests a parent-level pricing profile, commission rule, or buyer-specific override.
- A downstream service requests full price component detail but is authorized only for redacted summaries.
- A vendor-visible response would expose buyer-side commission detail that should be redacted.
- A buyer-visible response would expose vendor-side commission or contract detail that should be redacted.
- A Pricing Admin attempts to apply a pricing override outside assigned tenant, buyer, vendor, Product Type, channel, or contract scope.
- A pricing exception approver attempts to approve an exception, override, or commission change they created where dual approval is required.
- An AI workflow requests restricted pricing detail without approved visibility evidence.

## Tenant Isolation

- Parent-level pricing scope is changed and unintentionally affects child entities without Tenant Company override evidence.
- Child-level override scope exists in Tenant Company, but Pricing has no confirmed commercial precedence rule.
- Sibling child entities share Product Catalog or Device Catalog references but require different effective prices.
- A buyer/entity-specific price result is cached without tenant, buyer, child entity, relationship, channel, Product Type, rule version, commission version, or source input version.
- Pricing events expose commercial details to unauthorized tenants, vendors, buyers, notification payloads, analytics feeds, exports, or AI prompts.

## Commission And Channel Conflicts

- Vendor-side and buyer-side commission components both target the same calculation component without precedence.
- A configurable 7% / 7% default exists, but a buyer/entity/vendor contract override partially supersedes one side only.
- Commission rate source, basis, effective date, end date, scope, or status is missing or stale.
- Commission basis is invalid for the selected Pricing Channel.
- Online/DTC rules and Bulk PO rules both match the same request because channel selection evidence is missing.
- A Buyer Storefront or Retail POS placeholder channel is requested before channel-specific rules exist.
- Owned Channel / Kaseory exception overlaps with buyer-specific contract pricing.

## Pricing Input And Validation

- Vendor Wholesale Price is blank in a partial update and should not erase an existing accepted value unless explicit destructive behavior is approved.
- Sale Price is greater than SRP/MSRP or conflicts with MAP/No MAP rules.
- MAP is missing and No MAP is not explicitly recorded.
- A negative price, malformed currency, invalid decimal precision, or unsupported currency is submitted.
- A stale or superseded Product Catalog pricing input is used for a new calculation.
- A buyer-specific pricing override import references an unknown buyer, product, vendor, channel, Product Type, or expired effective date.
- A pricing validation preview returns warnings safe for display but blockers for snapshot bindability.

## Online / Direct-to-Consumer Pricing

- Online/DTC calculation uses Vendor Wholesale Price plus applicable buyer-side commission/markup, but an exception says the buyer-side component is waived.
- MAP/SRP interpretation conflicts with an active sale price.
- Buyer-controlled storefront resale price feedback is received and must remain separate from Pricing-owned wholesale/commission snapshots.
- Order Routing requests a stale order-bindable snapshot after a sale period expires.
- Product Catalog lifecycle or availability context changes after an Online/DTC quote-like result is created.

## Bulk PO Pricing

- Procurement requests a Bulk PO quote for a Product Type whose PO channel rule is not configured.
- Bulk PO request includes a requested price that differs from the Pricing quote-like result.
- Vendor/manufacturer accepted price differs from requested price and Pricing must interpret variance without mutating the PO lifecycle.
- Accepted price source is missing, ambiguous, or comes through an unverified integration response.
- Procurement attempts to use an expired, superseded, or non-procurement-bindable snapshot.
- Bulk PO price incorrectly inherits Online/DTC buyer-side commission without explicit rule evidence.

## Invoice, Return, And Refund Evidence

- Invoice Management requests invoice-bindable evidence for a snapshot class that is export-only or audit-only.
- A PO accepted-price variance is unresolved when Invoice Management requests invoice evidence.
- A return/refund workflow needs historical pricing evidence after the original pricing profile was retired.
- A refund amount is requested from Pricing even though refund execution belongs outside Pricing.
- A snapshot correction is attempted by mutating an immutable historical snapshot instead of creating a supersession or adjustment reference.

## Integrations

- Product Catalog updates catalog-carried pricing inputs after an effective price snapshot was created.
- Device Catalog redirects, deprecates, or splits a Device Reference used by a Pricing rule.
- Tenant Company suspends a buyer or child entity after Pricing calculated a quote-like result but before Order Routing or Procurement consumes it.
- Procurement sends accepted-price evidence through Integration Management, but inbound response evidence is duplicate, replayed, or out of order.
- Integration Management delivery fails for a buyer-specific pricing export; Pricing must not treat transport failure as source-state mutation.
- Notification delivery fails for a pricing change; Pricing retains event/audit state but Notification owns retry/delivery state.

## Reporting And Analytics

- Analytics consumes pricing events but needs redacted payloads and independent reporting models.
- Historical price reporting requires reconstructing calculation from source input versions, rule versions, channel, commission versions, exception versions, and calculation engine version.
- Effective price snapshots are used for invoice evidence, but reporting wants current pricing values.
- A pricing exception affects revenue analysis, but invoice, payment, and accounting ownership remain outside Pricing.

## Data Lifecycle

- Pricing Profile is retired while active snapshots still reference it.
- Pricing Rule expires during a long-running order, procurement, or invoice workflow.
- Sale pricing expires between calculation and snapshot creation.
- MAP/SRP interpretation conflicts with an active buyer-specific override.
- Pricing Exception is revoked after a snapshot was created.
- Upstream input references are deleted, merged, redirected, or hidden while historical snapshots must remain explainable.
- Currency, tax, rebate, fee, payment term, and buyer resale pricing ownership remain unresolved and could distort effective price interpretation if treated as Pricing-owned without future scope.
