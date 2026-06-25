# Invoice Management OpenAPI Contracts

This document is proposal-level architecture. It sketches OpenAPI-facing resources without finalizing path names, schema shape, authentication, or implementation behavior.

## Resource Groups

- `/invoice-management/invoices`
- `/invoice-management/invoices/preview`
- `/invoice-management/invoice-eligibility`
- `/invoice-management/invoices/{invoiceId}/finalize`
- `/invoice-management/invoices/{invoiceId}/regenerate`
- `/invoice-management/invoices/{invoiceId}/adjustments`
- `/invoice-management/po-invoice-eligibility`
- `/invoice-management/exports`
- `/invoice-management/reconciliation-uploads`
- `/invoice-management/accounting-sync-requests`
- `/invoice-management/invoice-views`
- `/invoice-management/sensitive-access-events`

## Shared Schema Concepts

### SourceEvidenceControlReference

Used for non-Pricing source evidence references:

- `sourceReferenceId`
- `sourceModule`
- `sourceEntityReference`
- `sourceRecordVersionHash`
- `sourceTimestamp`
- `sourceFreshnessTimestamp`
- `sourceExpirationTimestamp`
- `sourceDisposition`
- `appliedVsIgnoredState`
- `staleMissingConflictingState`
- `supersessionReference`
- `reviewRequiredState`
- `auditReference`

Bare source references are not sufficient for invoice immutability.

### InvoiceEligibilityEvidence

Required proposal-level properties:

- `invoiceEligibilityEvidenceId`
- `invoicePeriodReference`
- `invoicePeriodDateBasis`
- `invoiceTypeChannel`
- `pricingInvoiceBindableSnapshotEvidenceReference`
- `pricingSnapshotId`
- `pricingSnapshotVersionHash`
- `pricingChannel`
- `vendorSideCommissionComponentReference`
- `buyerSideCommissionComponentReference`
- `pricingRuleVersionHash`
- `buyerFacingWholesalePriceVisibilityEvidenceReference`
- `routedSuborderEvidenceControlReference`
- `routedSuborderLineEvidenceControlReference`
- `routingSnapshotEvidenceControlReference`
- `shipmentLineEvidenceControlReference`
- `deliveredQuantityEvidenceControlReference`
- `returnLineDispositionEvidenceControlReference`
- `vendorProvidedRefundAdjustmentEvidenceControlReference`
- `pricingAdjustmentPricingEvidenceReference`
- `procurementPoEvidenceControlReference`
- `procurementPoLineEvidenceControlReference`
- `procurementAcceptedPriceEvidenceControlReference`
- `pricingPoInvoiceBindableEvidenceReference`
- `tenantCompanyAccessScopeEvidenceControlReference`
- `productBuyerRelationshipEvidenceControlReference`
- `eligibilityStatus`
- `blockedReason`
- `staleMissingConflictingEvidenceState`
- `reviewRequiredState`
- `auditReference`

### PricingEvidenceReference

Carries Pricing-owned invoice values and references:

- `pricingSnapshotId`
- `snapshotVersionHash`
- `pricingChannel`
- `invoiceBindableStatus`
- `vendorSideCommissionComponent`
- `buyerSideCommissionComponent`
- `commissionBasisRuleReferences`
- `buyerFacingWholesalePriceOutput`
- `pricingVisibilityRedactionEvidence`
- `buyerPricingModeReference`
- `buyerSpecificOverrideReference`
- `ownedChannelExceptionReference`
- `adjustmentPricingEvidenceReference`
- `poPricingInvoiceBindableEvidenceReference`

OpenAPI consumers must treat these as evidence values, not formulas to recalculate.

### InvoiceLine

Important proposal-level properties:

- `sourceEvidenceControlReferences`
- `pricingEvidenceReference`
- `pricingChannel`
- `productCatalogProductEvidenceControlReference`
- `routedSuborderEvidenceControlReference`
- `routedSuborderLineEvidenceControlReference`
- `shipmentLineEvidenceControlReference`
- `deliveredQuantityEvidenceControlReference`
- `returnLineDispositionEvidenceControlReference`
- `procurementPoEvidenceControlReference`
- `procurementPoLineEvidenceControlReference`
- `invoiceableQuantity`
- `adjustmentQuantity`
- `lineAmountFromPricingOrInvoiceAdjustmentEvidence`
- `adjustmentAmountSourceClassification`
- `invoiceAdjustmentRuleDispositionReference`
- `adjustmentAmountAppliedFlag`
- `adjustmentAmountBlockedReason`
- `vendorEvidenceVarianceAmount`
- `redactionDecisionVersion`
- `sourceEvidenceFreshnessStatus`
- `auditReference`

### InvoiceExportBatch

Aligned with `architecture/standards/import-export-validation-governance.md`:

- `invoiceExportBatchReference`
- `invoiceExportSchemaVersion`
- `generatedByActorOrService`
- `generatedAtTimestamp`
- `invoicePeriodDateBasis`
- `sourceEvidenceBasis`
- `tenantCompanyAccessScopeVersion`
- `redactionClassVersion`
- `fileDownloadReference`
- `expirationRevocationState`
- `supersessionReference`
- `logsAuditEvidenceReference`
- `integrationDeliveryReference`
- `notificationDeliveryReference`
- `recheckBeforeDownloadFlag`

### ReconciliationUploadJob

- `reconciliationUploadJobId`
- `uploadSchemaVersion`
- `sourceFileReferencePlaceholder`
- `validationStatus`
- `previewReviewState`
- `mismatchDetectionResult`
- `sourceInvoiceReference`
- `sourceInvoiceLineReference`
- `correctionSupersessionReference`
- `logsAuditEvidenceReference`

### AccountingSyncRequest

- `accountingSyncRequestId`
- `invoiceReference`
- `invoiceVersionHash`
- `invoiceExportReference`
- `accountingTargetSystemReference`
- `idempotencyKey`
- `duplicateExternalReferenceBlocker`
- `providerRequestFingerprint`
- `externalPostingReferencePlaceholder`
- `supersessionCorrectionReference`
- `retryAttemptReference`
- `duplicatePostingRiskFlag`
- `appliedVsIgnoredState`
- `integrationDeliveryReceiptEvidenceReference`
- `syncRequestedAcceptedFailedState`
- `reviewRequiredState`

## Status Responses

Endpoints should surface explicit blocked/review reasons for:

- Source evidence stale, superseded, ignored, expired, or conflicting.
- Source evidence non-bindable for invoice use.
- Pricing snapshot missing, stale, or non-invoice-bindable.
- Delivered shipment line evidence missing/stale.
- Return line evidence missing/stale.
- Adjustment pricing evidence missing/stale.
- Vendor refund evidence variance detected.
- Invoice adjustment amount blocked.
- PO invoice-bindability blocked.
- Tenant visibility/redaction evidence missing/stale.
- Accounting sync duplicate blocked.
- Accounting sync idempotency key reused.
- Invoice line blocked for missing evidence.

## Boundary Notes

OpenAPI schemas must avoid formula fields that imply Invoice Management calculates commission, buyer-facing Wholesale Price, PO price, or adjustment price. Values should be represented as Pricing evidence references, versioned source evidence references, or Invoice-owned adjustment lifecycle/disposition fields.
