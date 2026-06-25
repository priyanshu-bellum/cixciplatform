# Procurement / Purchase Orders Edge Cases

This document captures proposal-level edge cases and architecture risks. It does not finalize business rules or implementation behavior.

## Tenant And Permission Edge Cases

- Buyer user can view products but lacks PO drafting permission.
- Buyer approver belongs to parent but not child entity scope.
- Buyer entity is inactive or not ready.
- Vendor/manufacturer target is suspended or not eligible.
- Product Type is not enabled for the buyer/entity.
- Licensed-property scope is missing for branded merchandise PO placeholder.
- Approval policy reference is missing or stale.
- Approver authority snapshot is expired.
- System admin override lacks override reason or audit reference.

## Targeting Edge Cases

- Header seller target is missing.
- Line seller target conflicts with header seller target.
- One PO includes accessories and devices, but target handling is unresolved.
- One PO includes multiple accessory vendors.
- One PO includes a vendor target and manufacturer target.
- Mixed seller targets require decomposition but no decomposition rule exists.
- Future multi-target PO is attempted without grouping by seller target, submission reference, external PO reference, response lifecycle, and receiving placeholder.
- Ambiguous target cardinality blocks submission.

## Product / Device / Product Type Edge Cases

- Accessory PO line references a Product Catalog product that is inactive, stop-sell, or not PO-eligible.
- Device PO line references a Device Reference that is deprecated or superseded.
- Branded merchandise PO line is attempted before product type support is enabled.
- PO line target conflicts with Product Type or vendor/manufacturer target.

## Pricing Edge Cases

- Price snapshot / quote-like result is missing.
- Price snapshot is stale, expired, superseded, rejected, inconsistent, or not procurement-bindable.
- Pricing snapshot version/hash is missing.
- Requote-required state exists before submission.
- Requested price differs from accepted price placeholder.
- Vendor/manufacturer responds with pricing that conflicts with Pricing evidence.
- Buyer wants to override price manually.

Procurement must route pricing conflicts to review instead of recalculating or reinterpreting price.

## Submission Edge Cases

- Integration method unavailable or disabled.
- External connection credentials expired.
- Vendor/manufacturer API fails after Procurement marks submitted.
- Manual PO export is downloaded but not sent.
- Duplicate submission attempt occurs.
- External PO reference conflicts with existing PO.
- External line reference conflicts with existing line.
- External PO reference arrives for wrong tenant/seller scope.
- Vendor/manufacturer response arrives for superseded PO.

Integration Management owns connection/delivery/receipt evidence and external ID mapping. Logs & Audit owns file/audit evidence.

## Response Edge Cases

- Vendor accepts only some lines.
- Manufacturer backorders device PO lines.
- Vendor rejects PO after partial acceptance.
- Vendor/manufacturer sends response with unknown line reference.
- Response arrives after cancellation.
- Header-level accepted but line-level conflicts exist.
- Duplicate response arrives with same response dedupe key.
- Response arrives with stale timestamp.
- Accepted quantity exceeds requested quantity.
- Accepted, rejected, and backordered quantities do not reconcile to requested quantity.

## Revision And Cancellation Edge Cases

- Buyer revises PO after approval but before submission.
- Buyer revises PO after submission.
- Cancellation requested after vendor/manufacturer acceptance.
- Superseded PO receives external response.
- Revision changes target vendor/manufacturer.
- Revision changes Product Type mix.
- Revision changes pricing evidence after approval.

## Receiving / Invoice / Payment Edge Cases

- Accepted PO has no receiving location.
- Partial acceptance creates unclear receiving expectation.
- Receiving is needed before Fulfillment/Returns boundary is finalized.
- Invoice Management asks whether PO is invoice-eligible before receiving ownership is defined.
- Payment status is requested but Payment context does not exist.

## Scale Edge Cases

- PO exceeds proposal-level line count cap.
- Large PO requires review threshold.
- Approval queue becomes overloaded.
- Response retry budget is exhausted.
- Backorder volume exceeds review capacity.
- Document/export volume requires throttling.
- Bulk status lookup requires pagination.
- Revision/supersession chain becomes too long.

## AI Edge Cases

- AI drafts PO suggestion using stale demand signals.
- AI recommends a vendor/manufacturer that is not eligible.
- AI suggests quantity or price without current Pricing evidence.
- AI action attempts PO submission without approval.

## Boundary Risks

- Procurement begins creating routed suborders.
- Procurement recalculates or reinterprets price.
- Procurement treats vendor/manufacturer catalog data as source-of-truth.
- Procurement starts executing fulfillment/receiving without assigned ownership.
- Procurement starts generating invoices or processing payments.
- Procurement stores integration credentials, external ID mapping authority, or delivery evidence as source truth.

## Proposal-Level Mitigations

- Preserve source references and source versions where available.
- Route missing/stale eligibility, product, device, pricing, approval, target, or integration evidence to review.
- Keep receiving placeholders separate from fulfillment execution.
- Keep invoice/payment references placeholders only.
- Require human/role approval for AI-driven PO actions.
- Default to one seller target per PO unless future multi-seller rules are explicitly modeled.