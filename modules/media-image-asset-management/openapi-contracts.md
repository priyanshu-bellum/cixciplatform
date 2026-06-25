# Media / Image Asset Management OpenAPI Contracts

This document captures proposal-level OpenAPI-oriented placeholders for Media Manager upload, assignment, required media profiles, readiness evidence, overrides, and reports. It does not finalize endpoint paths, authentication, storage provider behavior, or implementation schemas.

## Contract Principles

- Media APIs expose Media-owned upload, validation, processing, assignment, profile, override, and readiness evidence.
- Media APIs must not mutate Product Catalog product records or decide final buyer visibility/exportability.
- Product Catalog consumes Media Readiness Evidence with exact asset, assignment, validation, processing, profile, and override references.
- Tenant Company owns user/admin authority for overrides.
- Integration Management owns external delivery/receipt evidence.
- Logs & Audit owns immutable file/upload/report/download/audit evidence.

## Proposal-Level Endpoint Groups

- `GET /media/post-import-actions` for `Upload Images in Media Manager` handoff metadata.
- `GET /media/readiness-summaries` for missing media summaries.
- `POST /media/uploads/zip` for ZIP upload jobs.
- `POST /media/uploads/manual` for manual media upload.
- `POST /media/uploads/image-urls` for URL ingestion jobs.
- `POST /media/assignments` for Product Media Assignment evidence.
- `GET /media/assignments/{assignmentId}` for assignment evidence lookup.
- `GET /media/required-profiles` for required media profile lookup.
- `PATCH /media/required-profiles/{profileId}` as a System Admin/configuration placeholder that creates a new profile version.
- `GET /media/readiness-evidence` for product/variant/SKU readiness evidence lookup.
- `POST /media/readiness-overrides` for authorized media readiness override evidence.
- `GET /media/missing-media-reports/{reportId}` for report metadata and content references.
- `POST /media/missing-media-reports` for missing media report generation.

## Product Media Assignment Schema Placeholder

A Product Media Assignment response should include:

- `productMediaAssignmentId`
- `productReference`
- `variantReference`
- `skuUpcReference`
- `mediaAssetReference`
- `mediaAssetVersionHash`
- `assignedRole`
- `rolePriorityOrder`
- `assignmentSource`
- `assignmentSourceVersionHash`
- `assignmentTimestamp`
- `validationResultReference`
- `validationResultVersionHash`
- `processingResultReference`
- `processingResultVersionHash`
- `appliedVsIgnoredState`
- `assignmentDisposition`
- `supersessionReference`
- `reviewRequiredState`
- `auditReference`

Superseded, ignored, stale, failed, or conflicting assignments should not satisfy required media readiness.

## Required Media Profile Schema Placeholder

A Required Media Profile response should include:

- `requiredMediaProfileId`
- `sourceModule`: `Media Management`
- `categoryScope`
- `vendorScope`
- `buyerTypeScope`
- `productTypeScope`
- `requiredMainImageFlag`
- `requiredImageCount`
- `requiredVideoPlaceholder`
- `blockerMode`: hard blocker, warning-only, allowed exception
- `effectiveDate`
- `endDate`
- `expirationDate`
- `sourceRecordVersionHash`
- `sourceTimestamp`
- `freshnessTimestamp`
- `expirationTimestamp`
- `sourceDisposition`
- `appliedVsIgnoredState`
- `supersessionReference`
- `reviewRequiredState`
- `auditReference`

Required Media Profile updates should produce a new version and supersede prior profile evidence without rewriting historical export, visibility, invoice, analytics, or audit evidence.

## Media Readiness Evidence Schema Placeholder

A Media Readiness Evidence response should include:

- `mediaReadinessEvidenceId`
- `productReference`
- `variantReference`
- `skuUpcReference`
- `vendorEntityScopeReference`
- `sourceAccessoryImportBatchReference`
- `requiredMediaProfileReference`
- `requiredMediaProfileVersionHash`
- `mainMediaAssetReference`
- `mainMediaAssetVersionHash`
- `productMediaAssignmentReference`
- `productMediaAssignmentVersionHash`
- `assignedMediaRole`
- `assignedMediaRoleDisposition`
- `mediaAssetValidationResultReference`
- `validationResultVersionHash`
- `mediaProcessingResultReference`
- `processingResultVersionHash`
- `mainImageAssignedState`
- `mainImageValidatedState`
- `assignedAndValidatedAppliedVsIgnoredState`
- `requiredMediaCompleteFlag`
- `mediaReadinessStatus`
- `retailReadyFromMediaStandpointFlag`
- `blockerWarningOverrideDisposition`
- `systemAdminOverrideReference`
- `sourceVersionHash`
- `sourceTimestamp`
- `freshnessTimestamp`
- `expirationTimestamp`
- `supersessionReference`
- `reviewRequiredState`
- `auditReference`

Summary booleans in this response are convenience projections only. Consumers should bind decisions to the exact Media Asset ID/version, Product Media Assignment/version, validation result/version, and processing result/version.

## Override Evidence Schema Placeholder

A Media Readiness Override response should include:

- `overrideId`
- `requiredMediaProfileReference`
- `productCategoryVendorBuyerTypeProductTypeScope`
- `overrideMode`
- `overrideReason`
- `approverActorReference`
- `tenantCompanyAuthorityReference`
- `effectiveDate`
- `expirationDate`
- `sourceVersionHash`
- `freshnessTimestamp`
- `sourceDisposition`
- `appliedVsIgnoredState`
- `supersessionReference`
- `reviewRequiredState`
- `auditReference`

Tenant Company owns override authority. Media Management owns override evidence from an asset-readiness standpoint. Product Catalog consumes override evidence but does not infer override authority.

## Error Codes / Review States

Proposal-level error and review states:

- `media_required_profile_missing`
- `media_required_profile_stale`
- `media_required_profile_superseded`
- `media_assignment_stale`
- `media_assignment_superseded`
- `media_assignment_ignored`
- `media_validation_result_missing`
- `media_processing_result_missing`
- `media_readiness_blocked_by_stale_assignment`
- `media_readiness_blocked_by_missing_validation_result`
- `media_readiness_evidence_stale`
- `media_readiness_evidence_superseded`
- `media_override_authority_missing`
- `media_override_evidence_expired`
- `media_override_evidence_superseded`
- `media_review_required`

## Consumer Contract Notes

Product Catalog should treat missing, stale, expired, superseded, ignored, failed, or conflicting asset/assignment/profile/validation/processing/override evidence as a block or review condition for buyer visibility/export according to Product Catalog and Media rules. Media readiness remains asset-readiness only, not full product sellability.
