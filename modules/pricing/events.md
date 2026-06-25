# Pricing Events

This document is proposal-level architecture. Event names, payloads, delivery guarantees, and consumers remain placeholders until implementation contracts are finalized.

## Published Events

### Profile, Rule, Channel, And Validation Events

- `pricing.profile.created`
- `pricing.profile.updated`
- `pricing.profile.retired`
- `pricing.rule.created`
- `pricing.rule.updated`
- `pricing.rule.retired`
- `pricing.rule-conflict.detected`
- `pricing.channel-rule.changed`
- `pricing.validation.preview-created`
- `pricing.validation.failed`
- `pricing.validation.review-required`

### Calculation, Quote, And Snapshot Events

- `pricing.effective-price.calculated`
- `pricing.buyer-facing-wholesale-price.calculated`
- `pricing.buyer-facing-pricing.visibility-evidence.missing`
- `pricing.buyer-facing-pricing.visibility-evidence.stale`
- `pricing.output-redaction-decision.applied`
- `pricing.calculation.blocked`
- `pricing.calculation.warning-recorded`
- `pricing.quote-like-result.created`
- `pricing.quote-like-result.expired`
- `pricing.effective-price.snapshot-created`
- `pricing.effective-price.snapshot-superseded`
- `pricing.order-bindable-snapshot.created`
- `pricing.procurement-bindable-snapshot.created`
- `pricing.export-bindable-snapshot.created`
- `pricing.invoice-bindable-evidence.created`
- `pricing.effective-price.expired`

### PO Pricing Events

- `pricing.po-quote.created`
- `pricing.po-snapshot.created`
- `pricing.po-accepted-price-evidence.received`
- `pricing.po-accepted-price-evidence.stale`
- `pricing.po-accepted-price-evidence.conflicting`
- `pricing.po-accepted-price-variance.detected`
- `pricing.po-pricing.invoice-bindability-blocked`
- `pricing.po-requote.required`
- `pricing.po-pricing.review-required`

### Return / Refund Adjustment Pricing Events

- `pricing.return-refund-evidence.missing`
- `pricing.return-refund-evidence.stale`
- `pricing.adjustment-pricing.review-required`
- `pricing.adjustment-pricing.output-created`

### Exception And Override Events

- `pricing.exception.created`
- `pricing.exception.updated`
- `pricing.exception.expired`
- `pricing.exception.revoked`
- `pricing.override.created`
- `pricing.override.applied`
- `pricing.override.removed`
- `pricing.override.conflict-detected`
- `pricing.owned-channel-exception.changed`

### Commission And Revenue-Share Events

- `pricing.vendor-side-commission.changed`
- `pricing.buyer-side-commission.changed`
- `pricing.commission.changed`
- `pricing.revenue-share.changed`
- `pricing.parent-child-interpretation.changed`

### Policy Interpretation Events

- `pricing.map-srp.changed`
- `pricing.no-map.changed`
- `pricing.sale-pricing.changed`
- `pricing.discount-rule.changed`
- `pricing.currency-validation.failed`
- `pricing.negative-price.blocked`

### Recalculation And Cache Events

- `pricing.input-marked-stale`
- `pricing.recalculation.requested`
- `pricing.recalculation.completed`
- `pricing.cache-invalidation.requested`
- `pricing.cache-invalidation.completed`

## Consumed Events

- Placeholder: `tenant.company.scope.changed` or equivalent Tenant Company hierarchy and eligibility events.
- Placeholder: Tenant Company channel eligibility, company configuration, commission configuration input, readiness, geography eligibility, and user/entity access events as scope signals only.
- Placeholder: `tenant.relationship.changed` or equivalent vendor-buyer eligibility events.
- Placeholder: `catalog.product.updated` and catalog-carried pricing input change events from Product Catalog.
- Placeholder: Product Catalog lifecycle, availability, channel flag, product visibility, and pricing readiness events as calculation and visibility context where authorized.
- Placeholder: `device.reference.changed`, device lifecycle, or taxonomy events from Device Catalog.
- Placeholder: order-time price request or snapshot request events from Order Routing if asynchronous workflows are introduced.
- Placeholder: Procurement quote/snapshot request events, accepted-price evidence references, accepted-price evidence disposition, and PO line references.
- Placeholder: Invoice Management snapshot request or invoice adjustment reference events if invoices require asynchronous snapshot handoff.
- Placeholder: Fulfillment/Returns or Invoice Management return/refund evidence references where adjustment pricing evidence is needed.

## Required Event Fields

All Pricing events should carry:

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `tenantScopeReference` or explicit platform-wide scope
- `correlationId`
- `producer`
- `subjectReference`
- `subjectVersion`
- `pricingChannel` where commercially relevant
- `effectiveAt` where commercially relevant
- `transactionTime`
- `redactionClass`
- `auditReference`

Calculation, quote, validation, and snapshot events should additionally carry:

- `calculationRequestId`
- `pricingProfileReference`
- `pricingRuleVersionSummary`
- `commissionRuleVersionSummary`
- `sourceInputVersionSummary`
- `calculationEngineVersion`
- `consumerType`
- `outputClass`
- `validationResultReference` where applicable

Snapshot events should additionally carry:

- `snapshotId`
- `snapshotVersionHash`
- `snapshotClass`
- `immutableInputReferences`
- `componentSummary` or redacted component summary
- `vendorSideCommissionSummary` where authorized
- `buyerSideCommissionSummary` where authorized
- `buyerFacingWholesalePrice` where authorized
- `buyerFacingVisibilityEvidenceReference` where applicable
- `redactionDecisionVersion` where applicable
- `appliedExceptionReferences`
- `appliedOverrideReferences`
- `orderBindableState`
- `procurementBindableState`
- `exportBindableState`
- `invoiceEvidenceState`

Buyer-facing visibility events should additionally carry:

- `tenantCompanyScopeReferenceVersion`
- `roleScopeProjectionReference`
- `buyerEntityScopeReference`
- `channelEligibilityReference`
- `productChannelFlagVersion`
- `productVisibilityReferenceVersion`
- `authorizedConsumerClass`
- `pricingOutputVisibilityState`
- `visibilityEvidenceExpiration`
- `recheckBeforeDisplayFlag`
- `redactionDecisionVersion`

PO pricing events should additionally carry:

- `poReference` where provided by Procurement
- `poLineReference` where provided by Procurement
- `procurementAcceptedPriceEvidenceReference`
- `procurementSourceRecordVersion`
- `procurementDisposition`
- `appliedVsIgnoredState`
- `externalResponseReference`
- `requestedPrice`
- `acceptedPricePlaceholder`
- `acceptedPriceSource`
- `acceptedPriceVariance`
- `acceptedPriceVarianceReason`
- `acceptedPriceEvidenceAuditReference`
- `procurementReviewState`
- `quoteLikeResultId`
- `quoteExpiration`
- `procurementBindableStatus`
- `invoiceBindableStatus`
- `requoteRequiredState`
- `supersessionReference`
- `pricingReviewRequiredState`

Return/refund adjustment pricing events should additionally carry:

- `originalTransactionPricingSnapshotReference`
- `originalSnapshotVersionHash`
- `returnRefundEvidenceReference`
- `returnRefundEvidenceVersion`
- `sourceModuleReference`
- `sourceModuleDisposition`
- `adjustmentReason`
- `quantityBasis`
- `refundAdjustmentPriceBasis`
- `adjustmentPricingCalculationReference`
- `invoiceAdjustmentReferencePlaceholder`
- `supersessionReference`
- `pricingReviewRequiredState`

## Redaction Classes

- `public-reference`: identifiers and non-sensitive status only.
- `tenant-summary`: tenant-scoped summary without commercial component detail.
- `commercial-summary`: authorized commercial summary with limited component names and totals.
- `commercial-detail`: full authorized component detail for Pricing and approved consumers.
- `commission-detail`: authorized commission component detail.
- `audit-restricted`: audit-only payloads with strict access and retention controls.

## Consumer-Specific Payload Boundaries

- Order Routing may receive quote-like result or order-bindable snapshot data needed for order decisions, but not invoice lifecycle or reconciliation fields.
- Procurement may receive procurement-bindable quote/snapshot evidence and variance interpretation, but not Pricing administration workflow ownership or accepted-price workflow ownership.
- Invoice Management may receive invoice-bindable historical evidence and Pricing references, but not Pricing administration workflow ownership or Procurement accepted-price authority.
- Fulfillment/Returns may receive return/refund pricing evidence references where applicable, but not Pricing-owned refund execution.
- Analytics may receive redacted pricing events and snapshots for reporting models, but not unrestricted commercial terms by default.
- Audit consumers may receive detailed payloads only with explicit authorization and tenant scope.
- Product Catalog, Device Catalog, and Tenant Company should receive references or invalidation signals, not Pricing-owned commercial detail unless explicitly authorized.
- Notification Platform Service should receive notification-safe trigger metadata only; Pricing owns event content and Notification owns delivery.
- Integration Management owns transport evidence for external pricing imports/exports; Pricing owns source validation and business disposition.

## Retry Behavior

- Calculation events should be idempotent by calculation request id, correlation id, input hash, Pricing Channel, Pricing rule version, commission rule version, source input versions, visibility evidence version where applicable, and calculation engine version.
- Snapshot creation events should be idempotent by consumer request id and snapshot id.
- PO variance review events should be idempotent by PO reference, line reference, Procurement accepted price evidence reference, Procurement source record version, and snapshot/quote reference.
- Adjustment pricing events should be idempotent by original snapshot reference, return/refund evidence reference/version, source-module disposition, and adjustment calculation reference.
- Failed event publication should retry without recalculating from changed upstream inputs unless the calculation is explicitly re-run.
- Stale upstream references should route to review-required or recalculation queues rather than silently publishing price changes.

## Idempotency

- Pricing profile, channel, commission, and rule events should carry profile/rule/component id and version.
- Effective price events should carry calculation request id, effective price id, input reference summary, rule version summary, commission rule version summary, source input version summary, visibility evidence reference where applicable, and calculation engine version.
- Snapshot events should carry immutable snapshot id, snapshot class, consumer reference, and output class.
- Exception and override events should carry exception/override id, scope, effective date range, transaction time, version, and lifecycle state.

## Replay Guarantees

- Replayed events should not create duplicate snapshots, duplicate quote-like results, duplicate PO variance records, duplicate adjustment pricing records, or duplicate downstream price effects.
- Snapshot replay should reconstruct the original immutable evidence, not recalculate from current upstream state.
- Calculation event replay should identify whether the event is historical evidence, stale, superseded, or review-required.
- Placeholder: define replay windows and dead-letter policies for high-volume recalculation events.

## Audit Events

- Every pricing profile, rule, channel rule, commission rule, exception, override, validation, calculation, quote-like result, snapshot, expiration, supersession, revocation, PO evidence handoff, buyer-facing visibility decision, and adjustment pricing evidence record should produce audit metadata.
- Audit events should include actor or service identity, tenant scope, affected subject references, before/after references where safe, reason code, source input versions, calculation engine version, Pricing Channel, commission rule version, visibility evidence reference, Procurement evidence reference where applicable, return/refund evidence reference where applicable, and redaction class.
- Sensitive component details should be redacted or exposed only to authorized consumers.

## Pricing-Sensitive Payload Handling

- Pricing-sensitive payloads should avoid full commercial detail in broad fanout events.
- Consumers needing detailed pricing evidence should perform authorized lookup using event references.
- Payloads should not leak tenant-specific price, commission, margin, exception, override, channel, contract, buyer-specific pricing details, Procurement accepted-price evidence, or return/refund adjustment evidence across tenants or consumer classes.
- Logs, analytics feeds, retries, AI prompts, notification payloads, exports, and dead-letter queues should preserve redaction class.

## Event Taxonomy Notes

- Profile/rule/channel events describe Pricing-owned configuration changes.
- Validation events describe proposed pricing input, import, override, channel, commission, visibility evidence, PO evidence, adjustment evidence, or bindability outcomes.
- Calculation events describe Pricing-owned ephemeral output or blocked/warning states.
- Quote-like result events describe commercially time-bound Pricing output without order or PO decision ownership.
- Snapshot events describe immutable historical evidence for order-time, procurement, export, invoice, return/refund, or audit consumers.
- PO pricing events describe Pricing variance/requote/review interpretation from Procurement-owned accepted-price evidence, not Procurement lifecycle ownership.
- Return/refund adjustment pricing events describe Pricing evidence only, not refund execution, return approval, payment, or invoice adjustment application.
- Exception/override events describe typed commercial deviations owned by Pricing.
- Commission/revenue-share events describe commercial interpretation changes, not Tenant Company hierarchy ownership.
- Policy interpretation events describe Pricing interpretation of MAP, No MAP, SRP/MSRP, sale, or discount policy placeholders, not Product Catalog ownership of upstream inputs.
- Recalculation/cache events describe stale marking, invalidation, batch processing, and replay control.
