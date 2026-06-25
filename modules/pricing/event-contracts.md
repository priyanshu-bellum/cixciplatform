# Pricing Event Contracts

Use this template to document event-driven contracts between Pricing and other modules. This draft is proposal-level and should not finalize business rules.

## Event Name

`pricing.effective-price.snapshot-created`

## Event Purpose

Notify authorized consumers that Pricing created an immutable effective price snapshot for a scoped calculation request or quote-like result. The event should support order-time, procurement, export, invoice, return/refund, analytics, and audit traceability without transferring order routing, PO lifecycle, invoice lifecycle, reconciliation, dispute, fulfillment, refund execution, payment, or Procurement accepted-price authority into Pricing.

## Event Producer

Pricing.

## Event Consumers

- Order Routing, for order-bindable snapshot evidence and quote-like result consumption.
- Procurement / Purchase Orders, for procurement-bindable quote/snapshot evidence and pricing variance/requote references.
- Invoice Management, for invoice-bindable historical evidence and PO/adjustment pricing references.
- Fulfillment/Returns, for return/refund pricing evidence references where applicable.
- Analytics, for reporting inputs while Analytics owns reporting models and rollups.
- Logs & Audit or compliance consumers with explicit authorization.
- Notification Platform Service, for notification-triggering references only where a pricing event should later be delivered.

## Trigger Conditions

- An authorized consumer requests snapshot creation for a calculated effective price or quote-like result.
- Pricing confirms tenant scope, channel selection evidence, upstream input references, source input versions, rule versions, commission rule versions, calculation engine version, exceptions, overrides, effective date, transaction time, bindability class, visibility evidence where applicable, Procurement evidence where applicable, return/refund evidence where applicable, and redaction class.
- Pricing persists an immutable snapshot record.

## Payload Schema

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `transactionTime`
- `tenantScopeReference`
- `effectivePriceId`
- `snapshotId`
- `snapshotVersionHash`
- `snapshotClass`
- `calculationRequestId`
- `quoteLikeResultId`
- `consumerReference`
- `consumerType`
- `outputClass`
- `pricingChannel`
- `channelSelectionEvidenceReference`
- `productReference`
- `deviceReference`
- `productType`
- `catalogPricingInputReference`
- `pricingProfileReference`
- `pricingRuleVersionSummary`
- `commissionRuleVersionSummary`
- `sourceInputVersionSummary`
- `calculationEngineVersion`
- `componentSummary`
- `vendorSideCommissionSummary`
- `buyerSideCommissionSummary`
- `buyerFacingWholesalePrice`
- `buyerFacingVisibilityEvidenceReference`
- `redactionDecisionVersion`
- `appliedExceptionReferences`
- `appliedOverrideReferences`
- `warnings`
- `blockReasons`
- `currency`
- `effectiveAt`
- `expiresAt`
- `orderBindableState`
- `procurementBindableState`
- `exportBindableState`
- `invoiceEvidenceState`
- `auditReference`
- `redactionClass`

## Required Fields

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `transactionTime`
- `tenantScopeReference`
- `snapshotId`
- `snapshotClass`
- `effectivePriceId`
- `calculationRequestId`
- `consumerType`
- `outputClass`
- `pricingChannel`
- `pricingProfileReference`
- `pricingRuleVersionSummary`
- `sourceInputVersionSummary`
- `calculationEngineVersion`
- `componentSummary`
- `effectiveAt`
- `auditReference`
- `redactionClass`

At least one bindability state should be populated according to snapshot class: `orderBindableState`, `procurementBindableState`, `exportBindableState`, or `invoiceEvidenceState`.

## Optional Fields

- `quoteLikeResultId`
- `snapshotVersionHash`
- `consumerReference`
- `channelSelectionEvidenceReference`
- `productReference`
- `deviceReference`
- `productType`
- `catalogPricingInputReference`
- `commissionRuleVersionSummary`
- `vendorSideCommissionSummary`
- `buyerSideCommissionSummary`
- `buyerFacingWholesalePrice`
- `buyerFacingVisibilityEvidenceReference`
- `redactionDecisionVersion`
- `appliedExceptionReferences`
- `appliedOverrideReferences`
- `warnings`
- `blockReasons`
- `currency`
- `expiresAt`

## Buyer-Facing Visibility Event Contract Addendum

Buyer-facing visibility events such as `pricing.buyer-facing-pricing.visibility-evidence.missing`, `pricing.buyer-facing-pricing.visibility-evidence.stale`, and `pricing.output-redaction-decision.applied` should include:

- `tenantCompanyScopeReferenceVersion`.
- `roleScopeProjectionReference`.
- `buyerEntityScopeReference`.
- `channelEligibilityReference`.
- `productChannelFlagVersion`.
- `productVisibilityReferenceVersion`.
- `authorizedConsumerClass`.
- `pricingOutputVisibilityState`.
- `visibilityEvidenceExpiration`.
- `recheckBeforeDisplayFlag`.
- `redactionDecisionVersion`.
- `auditReference`.

Tenant Company owns access authority. Product Catalog owns product/channel flags and product visibility references. Pricing owns redaction/visibility-safe pricing outputs.

## PO Pricing Event Contract Addendum

PO pricing events such as `pricing.po-accepted-price-evidence.received`, `pricing.po-accepted-price-evidence.stale`, `pricing.po-accepted-price-evidence.conflicting`, `pricing.po-snapshot.created`, `pricing.po-accepted-price-variance.detected`, `pricing.po-pricing.invoice-bindability-blocked`, `pricing.po-requote.required`, and `pricing.po-pricing.review-required` should include:

- `poReference` where provided by Procurement.
- `poLineReference` where provided by Procurement.
- `procurementAcceptedPriceEvidenceReference`.
- `procurementSourceRecordVersion`.
- `procurementDisposition`.
- `appliedVsIgnoredState`.
- `externalResponseReference`.
- `requestedPrice`.
- `acceptedPricePlaceholder`.
- `acceptedPriceSource`.
- `acceptedPriceVariance`.
- `acceptedPriceVarianceReason`.
- `acceptedPriceEvidenceAuditReference`.
- `procurementReviewState`.
- `quoteLikeResultId`.
- `quoteExpiration`.
- `procurementBindableStatus`.
- `invoiceBindableStatus`.
- `requoteRequiredState`.
- `supersededOrExpiredState`.
- `supersessionReference`.
- `pricingReviewRequiredState`.

Procurement owns PO lifecycle, accepted-price workflow, and accepted-price evidence. Pricing owns pricing interpretation, variance review, requote-required state, pricing review-required state, and pricing snapshot bindability. Pricing must store references/dispositions rather than treating accepted PO values as standalone Pricing-owned truth.

## Return / Refund Adjustment Pricing Event Contract Addendum

Return/refund events such as `pricing.return-refund-evidence.missing`, `pricing.return-refund-evidence.stale`, `pricing.adjustment-pricing.review-required`, and `pricing.adjustment-pricing.output-created` should include:

- `originalTransactionPricingSnapshotReference`.
- `originalSnapshotVersionHash`.
- `returnRefundEvidenceReference`.
- `returnRefundEvidenceVersion`.
- `sourceModuleReference`.
- `sourceModuleDisposition`.
- `adjustmentReason`.
- `quantityBasis`.
- `refundAdjustmentPriceBasis`.
- `adjustmentPricingCalculationReference`.
- `invoiceAdjustmentReferencePlaceholder`.
- `reviewRequiredState`.
- `supersessionReference`.
- `auditReference`.

Fulfillment/Returns owns operational return/refund evidence where applicable. Invoice Management owns invoice lifecycle and adjustment handling. Pricing provides pricing evidence only and does not decide whether a refund, return, credit, payment, or invoice adjustment should occur.

## Validation Event Contract Addendum

Pricing validation events such as `pricing.validation.preview-created`, `pricing.validation.failed`, and `pricing.validation.review-required` should include:

- `validationMode`.
- `pricingChannel`.
- `validatedSubjectReference`.
- `validationRuleVersion`.
- `errorCount`.
- `warningCount`.
- `reviewRequiredCount`.
- `blankFieldBehaviorSummary`.
- `partialUpdateBehaviorSummary`.
- `invalidCommissionBasisSummary`.
- `invalidCurrencySummary`.
- `negativePriceBlockedSummary`.
- `staleOrSupersededSourceInputSummary`.
- `visibilityEvidenceSummary` where applicable.
- `procurementEvidenceSummary` where applicable.
- `returnRefundEvidenceSummary` where applicable.
- `previewBeforeAfterSummary` where safe.

Pricing validation previews must not mutate source records.

## Redaction Classes

- `public-reference`: event ids and non-sensitive status only.
- `tenant-summary`: tenant-scoped summary without commercial component detail.
- `commercial-summary`: authorized commercial summary with limited component names and totals.
- `commercial-detail`: full authorized component detail for Pricing and approved consumers.
- `commission-detail`: authorized commission component detail.
- `audit-restricted`: audit-only payloads with strict access and retention controls.

## Consumer-Specific Payload Boundaries

- Order Routing should receive only fields needed to bind or reject an order-time price snapshot.
- Procurement should receive only fields needed for PO pricing, quote, bindability, and variance/requote review.
- Invoice Management should receive invoice-bindable historical evidence, but not invoice lifecycle, reconciliation, payment state, or Procurement accepted-price authority from Pricing.
- Fulfillment/Returns should receive adjustment pricing references where applicable, but not refund execution behavior from Pricing.
- Analytics should receive redacted pricing evidence unless explicitly authorized for commercial detail.
- Logs & Audit consumers may receive detailed payloads only under audit authorization.
- Notification consumers should receive notification-safe references and summaries only.
- Integration Management should receive transport-safe references for external delivery, not unrestricted commercial detail.

## Idempotency Rules

- Consumers should deduplicate by `eventId` and `snapshotId`.
- Snapshot creation should be idempotent by consumer request id, calculation request id, quote-like result id where present, input reference hash, source input versions, rule versions, commission rule versions, Pricing Channel, visibility evidence version, and calculation engine version.
- PO evidence/variance events should be idempotent by PO reference, PO line reference, Procurement accepted price evidence reference, Procurement source record version, and snapshot/quote reference.
- Return/refund adjustment events should be idempotent by original snapshot reference, return/refund evidence reference/version, source-module disposition, adjustment reason, and quantity basis.
- Replayed events should not cause new pricing calculations unless a consumer explicitly requests recalculation.

## Ordering / Sequencing Rules

- Snapshot-created events should follow successful effective price calculation or quote-like result creation.
- Buyer-facing pricing display/export should follow successful visibility evidence validation where required.
- PO invoice-bindability events should follow Procurement evidence handoff and Pricing variance/review disposition where required.
- Adjustment pricing output events should follow source-module return/refund evidence validation.
- Pricing profile, channel, commission, rule, exception, or override changes may produce later calculations but should not mutate existing snapshots.
- Consumers should use snapshot class, rule versions, commission rule versions, effective date, transaction time, channel, evidence references, and output class instead of assuming event arrival order reflects commercial precedence.

## Retry / Failure Handling

- Failed delivery should retry with the same event payload and snapshot id.
- Consumers should request authorized lookup if payload redaction prevents local processing.
- If an upstream reference is later retired, redirected, superseded, or marked stale, Pricing should not rewrite the original snapshot; it may publish a separate recalculation, supersession, or review-required event if needed.

## Versioning Strategy

- Increment `eventVersion` for payload shape changes.
- Preserve backward-compatible fields for historical snapshot replay.
- Version component names, commission components, Pricing Channel values, evidence reference shapes, and rule summaries independently from the event envelope.
- Preserve calculation engine version and source input versions for audit reconstruction.

## Security / Access Considerations

- Pricing details may be sensitive and should be redacted by consumer class.
- Tenant scope must be explicit on every event.
- Events should not expose Product Catalog, Device Catalog, Tenant Company, Procurement, invoice, return/refund, or order data beyond references required for authorized lookup.
- Dead-letter queues, retry logs, AI prompts, notification payloads, exports, and analytics feeds should preserve redaction class.

## Audit / Logging Requirements

- Event publication should link to a Pricing Audit Record.
- Audit metadata should include actor or service identity, calculation request id, source input versions, rule versions, commission rule versions, channel evidence, visibility evidence, Procurement evidence references, return/refund evidence references, calculation engine version, exception/override references, transaction time, effective time, and redaction class.
- Logging should avoid leaking full price component details into unauthorized observability systems.

## Example Event Payload

```json
{
  "eventId": "evt_pricing_snapshot_placeholder",
  "eventType": "pricing.effective-price.snapshot-created",
  "eventVersion": "0.0.0",
  "occurredAt": "2026-04-28T00:00:00Z",
  "transactionTime": "2026-04-28T00:00:00Z",
  "tenantScopeReference": "tenant_scope_placeholder",
  "effectivePriceId": "effective_price_placeholder",
  "snapshotId": "price_snapshot_placeholder",
  "snapshotClass": "order_bindable_placeholder",
  "pricingChannel": "online_direct_to_consumer_placeholder",
  "calculationRequestId": "calculation_request_placeholder",
  "quoteLikeResultId": "quote_like_result_placeholder",
  "consumerReference": "order_or_invoice_consumer_placeholder",
  "consumerType": "order_routing_placeholder",
  "outputClass": "immutable_snapshot_placeholder",
  "productReference": "product_reference_placeholder",
  "catalogPricingInputReference": "catalog_pricing_input_placeholder",
  "pricingProfileReference": "pricing_profile_placeholder",
  "pricingRuleVersionSummary": "rule_versions_placeholder",
  "commissionRuleVersionSummary": "commission_rule_versions_placeholder",
  "sourceInputVersionSummary": "source_input_versions_placeholder",
  "calculationEngineVersion": "pricing_engine_version_placeholder",
  "componentSummary": "redacted_component_summary_placeholder",
  "buyerFacingVisibilityEvidenceReference": "visibility_evidence_placeholder",
  "appliedExceptionReferences": [],
  "appliedOverrideReferences": [],
  "warnings": [],
  "blockReasons": [],
  "currency": "USD-placeholder",
  "effectiveAt": "2026-04-28T00:00:00Z",
  "expiresAt": null,
  "orderBindableState": "eligible_placeholder",
  "procurementBindableState": "not_applicable_placeholder",
  "invoiceEvidenceState": "historical_evidence_placeholder",
  "auditReference": "pricing_audit_placeholder",
  "redactionClass": "consumer_class_placeholder"
}
```

## Open Questions

- Which consumers may receive full component details versus redacted summaries?
- Should quote-like price results and snapshot-created events be separate contracts in all flows?
- What fields will Invoice Management require for invoice line evidence, disputes, and reconciliation without moving invoice lifecycle into Pricing?
- Which snapshot classes are order-bindable, procurement-bindable, export-bindable, invoice-bindable, audit-only, or review-required?
- Which Pricing Channel values must be available at launch?
- Which visibility evidence must be rechecked before buyer-facing display or export?
- Which Procurement evidence states block invoice bindability?
- Which adjustment pricing evidence states block return/refund output?
