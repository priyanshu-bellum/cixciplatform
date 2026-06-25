# Pricing API Contracts

This document is proposal-level architecture. Endpoint names, schemas, and behaviors are placeholders until confirmed.

## Public / Partner-Facing APIs

- Calculation API for ephemeral effective price calculation.
- Quote API for quote-like price results intended for Order Routing, Procurement, or a future Quote context.
- Snapshot API for immutable order-bindable, procurement-bindable, export-bindable, or invoice-bindable pricing evidence.
- Pricing validation preview API.
- Buyer-facing Wholesale Price lookup API where authorized.
- Buyer-facing pricing visibility evidence API where authorized.
- PO accepted-price evidence handoff / bindability API.
- Return/refund adjustment pricing evidence API.
- Pricing audit lookup API for authorized audit and compliance consumers.
- Rule, profile, commission, exception, and override lookup APIs for authorized administrative and integration consumers.
- Pricing profile administration API for authorized internal users.
- Pricing exception and buyer-specific override administration API for authorized approvers.

## Internal APIs

- Calculate effective price from Tenant Company scope, Product Catalog pricing input references, Device Catalog references, Pricing Channel, and Pricing-owned rules.
- Resolve pricing profile for a tenant, buyer parent, buyer child/entity, vendor, product, Device Reference, category, Product Type, region, channel, contract, timeframe, or another confirmed scope.
- Validate pricing exception and override applicability.
- Validate commission component applicability and commission basis.
- Validate channel selection evidence.
- Validate buyer-facing pricing visibility evidence before display/export.
- Create immutable effective price snapshot.
- Create procurement-bindable quote/snapshot for Procurement.
- Interpret accepted-price variance from Procurement evidence.
- Create or review return/refund adjustment pricing evidence from source-module references.
- Publish pricing events after profile, rule, commission, exception, override, calculation, quote-like result, validation, visibility, PO evidence, adjustment evidence, or snapshot changes.

## API Contract Split

### Calculate API

- Purpose: return an ephemeral calculation result for a supplied context.
- Output class: ephemeral and recalculable.
- Not order-bindable, procurement-bindable, export-bindable, or invoice-bindable unless converted into an explicit snapshot.
- Should include calculation request id, Pricing Channel, channel selection evidence, input references, source input versions, rule versions, commission rule versions, calculation engine version, component summary, redaction class, and audit reference.

### Validation Preview API

- Purpose: validate proposed pricing inputs, imports, partial updates, overrides, commission changes, channel selection, buyer-facing visibility, PO evidence, return/refund evidence, or snapshot bindability before apply or calculation.
- Should return errors, warnings, review-required outcomes, blocked fields, blank-field behavior, stale/superseded source input status, missing/stale visibility evidence, missing/stale Procurement evidence, missing/stale return/refund evidence, and preview before/after summary where safe.
- Should align with `architecture/standards/import-export-validation-governance.md`.

### Quote API

- Purpose: return a quote-like result with a validity window and consumer reference.
- Output class: quote-like, potentially order-consumable or procurement-consumable if the consuming module accepts it.
- Does not select vendor, route, split, warehouse, fulfillment path, PO outcome, or order outcome.
- Placeholder: define whether quote lifecycle stays in Pricing or moves to a future Quote context.

### Snapshot API

- Purpose: create or retrieve immutable pricing evidence from a calculation or quote-like result.
- Output class: immutable historical evidence.
- May be order-bindable when created for Order Routing.
- May be procurement-bindable when created for Procurement.
- May be export-bindable when created for an authorized export consumer.
- May be invoice-bindable historical evidence when consumed by Invoice Management.
- Should preserve visibility evidence for buyer-facing outputs, Procurement evidence handoff references for PO snapshots, and return/refund source evidence references for adjustment snapshots.
- Should not mutate PO lifecycle, invoice lifecycle, reconciliation, payment, dispute, fulfillment, or analytics state.

### Buyer-Facing Pricing Visibility API

- Purpose: expose visibility-safe Pricing output metadata to authorized consumers.
- Should include Tenant Company scope reference/version, role/scope projection reference, buyer/entity scope reference, channel eligibility reference, Product Catalog product-channel flag version, Product Catalog product visibility/reference version, redaction decision version, authorized consumer class, pricing output visibility state, visibility evidence expiration, recheck-before-display flag, and audit reference.
- Missing, stale, expired, unauthorized, or conflicting evidence should block buyer-facing display/export or route to review.
- Tenant Company owns access authority; Product Catalog owns product/channel flags; Pricing owns redaction/visibility-safe pricing outputs.

### PO Pricing API

- Purpose: provide Bulk PO quote/snapshot evidence and accepted-price variance interpretation.
- Should include requested price, accepted price placeholder, Procurement accepted price evidence reference, PO reference, PO line reference, Procurement source record version, Procurement disposition, applied vs ignored state, external response reference, accepted price source, accepted price variance, accepted price variance reason, accepted price evidence audit reference, Procurement review state, quote-like result id, quote expiration, snapshot id/version/hash, procurement-bindable status, invoice-bindable status, requote-required state, superseded/expired state, supersession reference, and Pricing review-required state.
- Procurement records accepted price evidence and owns PO lifecycle.
- Pricing owns variance interpretation, requote, review logic, procurement-bindable evidence, and invoice-bindable pricing evidence.
- Missing, stale, conflicting, ignored, or review-required Procurement evidence should block invoice-bindable PO pricing or route to review.

### Return / Refund Adjustment Pricing API

- Purpose: provide Pricing-owned adjustment calculation evidence from source-module return/refund or invoice adjustment references.
- Should include original transaction pricing snapshot reference, original snapshot version/hash, return/refund evidence reference, return/refund evidence version, source module reference, source-module disposition, adjustment reason, quantity basis, refund/adjustment price basis, adjustment pricing calculation reference, invoice adjustment reference placeholder, review-required state, supersession reference, and audit reference.
- Fulfillment/Returns owns operational return/refund evidence. Invoice Management owns invoice lifecycle and adjustment handling.
- Pricing must not decide whether a refund, return, credit, payment, or invoice adjustment should occur.

### Audit Lookup API

- Purpose: expose authorized reconstruction metadata.
- Output class: historical/audit.
- Should include rule versions, source input versions, commission rule versions, Pricing Channel, visibility evidence references, Procurement evidence references where applicable, return/refund evidence references where applicable, calculation engine version, exception/override versions, event references, actor/service identity, transaction time, effective time, and redaction class.

### Rule / Profile / Commission / Exception Lookup APIs

- Purpose: expose authorized Pricing-owned configuration and commercial deviations.
- Output class: administrative or integration reference.
- Should distinguish draft, pending approval, active, expired, revoked, retired, superseded, blocked, and review-required states.

## Request/Response Models

### Price Calculation Request

- tenantScopeReference.
- buyerParentReference.
- buyerChildEntityReference.
- vendorReference.
- productReference.
- deviceReference.
- productType.
- categoryReference.
- regionReference.
- channelReference.
- channelSelectionEvidenceReference.
- buyerFacingVisibilityEvidenceReference where applicable.
- contractReference placeholder.
- catalogPricingInputReference.
- requestedAt.
- effectiveAt.
- quantityPlaceholder.
- correlationId.
- consumerType.
- requestedOutputClass.

### Effective Price Response

- calculationRequestId.
- effectivePriceId.
- pricingChannel.
- pricingProfileReference.
- pricingRuleVersionSummary.
- commissionRuleVersionSummary.
- sourceInputVersionSummary.
- calculationEngineVersion.
- effectiveAt.
- transactionTime.
- expiresAt.
- currency.
- totalPricePlaceholder.
- buyerFacingWholesalePrice where authorized.
- buyerFacingVisibilityEvidenceSummary where applicable.
- componentSummary.
- vendorSideCommissionComponentSummary.
- buyerSideCommissionComponentSummary.
- appliedExceptionReferences.
- appliedOverrideReferences.
- inputReferenceSummary.
- warnings.
- blockReasons.
- redactionClass.
- auditReference.

### Quote-Like Price Result Response

- quoteLikeResultId.
- sourceCalculationRequestId.
- effectivePriceId.
- pricingChannel.
- validFrom.
- validUntil.
- consumerReference.
- orderBindingEligibility.
- procurementBindingEligibility.
- invoiceEvidenceEligibility.
- visibilityEvidenceReference where applicable.
- componentSummary.
- warnings.
- blockReasons.
- redactionClass.
- auditReference.

### Effective Price Snapshot Response

- snapshotId.
- snapshotVersionHash.
- snapshotClass.
- effectivePriceId.
- sourceCalculationRequestId.
- sourceQuoteLikeResultId.
- immutableInputReferences.
- pricingChannel.
- pricingRuleVersionSummary.
- commissionRuleVersionSummary.
- sourceInputVersionSummary.
- calculationEngineVersion.
- componentSummary.
- buyerFacingWholesalePrice where authorized.
- visibilityEvidenceReference where applicable.
- requestedPrice where applicable.
- acceptedPricePlaceholder where applicable.
- procurementAcceptedPriceEvidenceReference where applicable.
- returnRefundEvidenceReference where applicable.
- totalPricePlaceholder.
- effectiveAt.
- transactionTime.
- createdAt.
- expiresAt.
- consumerReference.
- orderBindableState.
- procurementBindableState.
- exportBindableState.
- invoiceEvidenceState.
- auditReference.

### PO Pricing Bindability Response

- poPricingBindabilityId.
- poReference.
- poLineReference.
- procurementAcceptedPriceEvidenceReference.
- procurementSourceRecordVersion.
- procurementDisposition.
- appliedVsIgnoredState.
- externalResponseReference.
- requestedPrice.
- acceptedPricePlaceholder.
- acceptedPriceSource.
- acceptedPriceVariance.
- acceptedPriceVarianceReason.
- acceptedPriceEvidenceAuditReference.
- procurementReviewState.
- pricingSnapshotId.
- snapshotVersionHash.
- quoteLikeResultId.
- quoteExpiration.
- procurementBindableStatus.
- invoiceBindableStatus.
- requoteRequiredState.
- supersessionReference.
- pricingReviewRequiredState.
- auditReference.

### Adjustment Pricing Evidence Response

- adjustmentPricingEvidenceId.
- originalTransactionPricingSnapshotReference.
- originalSnapshotVersionHash.
- returnRefundEvidenceReference.
- returnRefundEvidenceVersion.
- sourceModuleReference.
- sourceModuleDisposition.
- adjustmentReason.
- quantityBasis.
- refundAdjustmentPriceBasis.
- adjustmentPricingCalculationReference.
- invoiceAdjustmentReferencePlaceholder.
- reviewRequiredState.
- supersessionReference.
- auditReference.

### Pricing Validation Preview Response

- validationId.
- validationMode.
- pricingChannel.
- subjectReference.
- errorCount.
- warningCount.
- reviewRequiredCount.
- blockedFields.
- blankFieldBehaviorSummary.
- staleSourceInputSummary.
- visibilityEvidenceSummary.
- procurementEvidenceSummary.
- returnRefundEvidenceSummary.
- invalidCommissionBasisSummary.
- invalidChannelSummary.
- previewBeforeAfterSummary.
- auditReference.

## Versioning

- Placeholder: define API versioning for calculation, quote, snapshot, audit, validation, rule lookup, commission lookup, exception lookup, visibility lookup, PO evidence lookup, return/refund evidence lookup, and administration APIs.
- Placeholder: define compatibility rules when pricing formulas, component names, precedence classes, commission models, channel values, evidence references, or payload fields change.
- Placeholder: define how old snapshots remain readable after API contract changes.
- Placeholder: include source input version, rule version, commission rule version, calculation engine version, event version, and API version in audit reconstruction.

## Error Handling

- Return explicit errors for missing tenant scope, unauthorized scope, unknown product reference, unknown Device Reference, missing pricing profile, expired rule, conflicting exceptions, stale input references, invalid channel, invalid commission basis, invalid currency, negative price, blank protected field, stale/superseded Product Catalog input, missing/stale visibility evidence, missing/stale Procurement accepted-price evidence, missing/stale return/refund evidence, expired quote, and snapshot creation failure.
- Unresolved upstream ownership or eligibility should produce review-required or blocked responses instead of inferred pricing decisions.
- Calculation failure must not trigger order routing decisions, PO lifecycle behavior, invoice lifecycle behavior, integration delivery, notification delivery, return execution, refund execution, or payment behavior inside Pricing.
- Conflict responses should identify scope conflict, temporal conflict, component conflict, source conflict, authorization conflict, channel conflict, commission conflict, consumer conflict, visibility conflict, evidence conflict, adjustment conflict, or bindability conflict.
- Warning responses should distinguish warnings safe for display from warnings that must block order/procurement/invoice binding.

## Boundary Notes

- Pricing APIs may consume Tenant Company, Product Catalog, and Device Catalog references, but those modules remain source owners for their records.
- Product Catalog owns catalog-carried pricing inputs and product/channel flags.
- Pricing consumes Tenant Company eligibility and scope signals; it must not derive relationship approval, readiness, geography eligibility, user/entity access, channel eligibility, or tenant hierarchy.
- Pricing APIs may return quote-like results to Order Routing, but Order Routing owns whether and how an order proceeds.
- Pricing APIs may return quote-like results or procurement-bindable snapshots to Procurement, but Procurement owns PO lifecycle and accepted-price evidence.
- Pricing APIs may provide snapshots to Invoice Management, but Invoice Management owns invoice lifecycle, reconciliation, and adjustment handling.
- Pricing APIs may provide adjustment pricing evidence based on Fulfillment/Returns or Invoice Management references, but Fulfillment/Returns owns return/refund operational evidence and Invoice Management owns invoice adjustment application.
- Pricing APIs may provide pricing events and audit records to Analytics, but Analytics owns reporting models and rollups.
- Pricing APIs must not expose sensitive price components outside authorized redaction class.
