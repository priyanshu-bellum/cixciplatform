# Pricing, commissions, MAP and shipping

Purpose: buyer-facing price calculation, vendor/buyer commissions, effective price
bindability, MAP exceptions and regional shipping evidence. Features PRC-001/002.

## Entry points, workflow and files

[services](../../../backend/apps/pricing/services.py), [models](../../../backend/apps/pricing/models.py),
[api](../../../backend/apps/pricing/api.py). Frontend PricingPage and regional
ShippingFeeDialog; catalog, order and PO/invoice flows consume services directly.

calculate_prices_and_commissions derives buyer commission from MSRP, adds it to
vendor wholesale for buyer price, and computes vendor commission from an approved
agreement. create_effective_price_snapshot freezes calculation/configuration and
bindability after MAP checks. Shipping snapshot selects governed effective fee
configuration. calculate_invoice_line_amounts uses nonnegative net delivered quantity.

## API, entities and dependencies

[Active APIs](../reference/api/pricing.md) under `/api/v1/pricing/` include buyer-prices,
profiles/snapshots, agreements, MAP and shipping controls. [Schema](../reference/schema/pricing.md):
PricingProfile, EffectivePriceSnapshot, BuyerFacingPricingVisibilityEvidence,
POPricingBindability, ReturnAdjustmentPricingEvidence, VendorCommissionAgreement,
MapException, VendorRegionalShippingFee and ShippingFeeSnapshot.
Dependencies: Product, buyer/vendor Company settings, region governance and approval
state; downstream accepted orders, PO and invoices rely on frozen facts.

## Rules, security, tests and precautions

BR-PRC-001/002, BR-REG-001, BR-INV-001. Preserve Decimal behavior and historical
snapshots; do not expose vendor wholesale in buyer representations. The implemented
MAP `buyer_price >= map_price` condition is unusual; approved intent is unresolved
(UQ-002), not permission to reverse it. Currency conversion/rounding policy is not
defined by this memory. Model immutability hooks are bypassable by bulk operations.

Tests: [buyer price](../../../backend/tests/test_buyer_facing_pricing.py),
[MAP](../../../backend/tests/test_map_enforcement.py),
[immutability](../../../backend/tests/test_models_immutable.py),
[regional eligibility](../../../backend/tests/test_regional_visibility_contract.py).
No dedicated unresolved runtime defect is asserted here; business provenance and
edge-case policy require owner review before changing financial calculations.
