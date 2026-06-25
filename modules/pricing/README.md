# Pricing Module

Initial architecture draft for the Pricing module.

This module aligns with ADR-0005, ADR-0003, ADR-0004, the Product Catalog and Procurement module boundaries, and the shared Import / Export / Validation Governance standard. It is an initial proposal for review, not final implementation design or finalized business rules.

Pricing owns commercial interpretation, calculation, validation, channel rules, commission components, quote-like results, and immutable pricing snapshots. It does not own tenant eligibility, catalog source records, device source records, order routing, PO lifecycle, fulfillment, invoice lifecycle, payment, reconciliation, notification delivery, integration transport, analytics ownership, buyer storefront resale pricing, or audit evidence ownership.

## Focus Areas

- Pricing ownership and source input language
- Catalog-carried pricing inputs from Product Catalog
- Tenant scope and channel eligibility evidence from Tenant Company
- Vendor-side commission components
- Buyer-side commission components
- Configurable commission defaults
- Buyer-facing Wholesale Price calculated outputs
- Pricing channels
- Online / Direct-to-Consumer pricing
- Bulk Purchase Order pricing
- PO pricing bindability and accepted-price variance interpretation
- Buyer-specific pricing overrides and imports
- Owned Channel / Kaseory pricing exception placeholder
- MAP, No MAP, SRP/MSRP, sale price, discount, and promotion-date interpretation
- Pricing validation previews and validation hierarchy
- Partial update and blank-field protection for pricing imports
- Effective dating, expiration, supersession, and historical snapshot preservation
- Order-bindable, procurement-bindable, export-bindable, invoice-bindable, return/refund, and audit pricing evidence
- Pricing visibility/redaction classes
- Pricing audit references
- Pricing events and event contracts

## Template Files

- `spec.md`
- `data-model.md`
- `api-contracts.md`
- `openapi-contracts.md`
- `events.md`
- `event-contracts.md`
- `boundary-contracts.md`
- `permissions.md`
- `workflows.md`
- `edge-cases.md`
- `test-scenarios.md`
- `assumptions-open-questions.md`
