# Media / Image Asset Management Event Contracts

This document defines proposal-level contract expectations for Media events. Event names must match `events.md` exactly.

## Shared Event Envelope

Media events should include:

- event id
- event name
- event version
- occurred timestamp
- source module = Media Management
- actor/service reference where applicable
- vendor/entity scope reference where applicable
- source version/hash where applicable
- audit reference

Events are Media-owned signals only. Notification Platform Service owns notification delivery. Integration Management owns external transport evidence. Logs & Audit owns immutable audit/file/upload/report/download evidence.

## Readiness Evidence Contract

Applies to:

- `media.readiness-evidence-created`
- `media.readiness-evidence-superseded`
- `media.readiness-evidence-stale`
- `media.media-readiness-status-updated`
- `media.media-retail-readiness-blocked`
- `media.main-asset-bound-to-readiness`
- `media.readiness-blocked-by-stale-assignment`
- `media.readiness-blocked-by-missing-validation-result`

Payload fields/concepts:

- media readiness evidence id
- product reference
- variant reference where applicable
- SKU/UPC reference
- vendor/entity scope reference
- source accessory import batch reference
- required media profile reference
- required media profile version/hash
- Main media asset reference
- Main media asset version/hash
- Product Media Assignment reference
- Product Media Assignment version/hash
- assigned media role
- assigned media role disposition
- media asset validation result reference
- validation result version/hash
- media processing result reference
- processing result version/hash
- Main image assigned state
- Main image validated state
- assigned and validated applied-vs-ignored state
- required media complete flag
- media readiness status
- retail-ready-from-media-standpoint flag
- blocker/warning/override disposition
- System Admin override reference
- source version/hash
- source timestamp
- freshness timestamp
- expiration timestamp
- source disposition where applicable
- supersession reference
- review-required state
- audit reference

Summary booleans must be traceable to exact asset, assignment, validation, and processing evidence.

## Product Media Assignment Contract

Applies to:

- `media.asset.assigned-to-product`
- `media.product-media-assignment-created`
- `media.product-media-assignment-superseded`

Payload fields/concepts:

- Product Media Assignment reference
- Product Media Assignment version/hash
- Product Catalog product reference
- variant reference where applicable
- SKU/UPC reference
- media asset reference
- media asset version/hash
- assigned role
- role priority/order
- assignment source
- assignment source version/hash
- assignment timestamp
- validation result reference
- validation result version/hash
- processing result reference
- processing result version/hash
- applied-vs-ignored state
- assignment disposition
- supersession reference
- review-required state
- audit reference

Superseded or ignored assignments must not continue to satisfy readiness.

## Required Media Profile Contract

Applies to:

- `media.required-profile-updated`
- `media.required-profile-superseded`
- `media.required-profile-stale`
- `media.required-media-missing`
- `media.main-image-missing`

Payload fields/concepts:

- required media profile id
- source module = Media Management
- category/vendor/buyer-type/Product Type scope
- required Main image flag
- required image count placeholder
- required video placeholder
- hard blocker / warning-only / allowed exception mode
- effective date
- end date / expiration date
- source record version/hash
- source timestamp
- freshness timestamp
- expiration timestamp
- source disposition
- applied-vs-ignored state
- supersession reference
- review-required state
- audit reference

Missing, stale, expired, superseded, ignored, or conflicting profile evidence should block or route Product Catalog buyer visibility/export evaluation to review according to Product Catalog and Media rules.

## Override Evidence Contract

Applies to:

- `media.media-retail-readiness-override-applied`
- `media.readiness-override-evidence-applied`

Payload fields/concepts:

- override id
- media readiness evidence reference
- required media profile reference
- product/category/vendor/buyer-type/Product Type scope
- override mode
- override reason
- approver/actor reference
- Tenant Company authority reference
- effective date
- expiration date
- source version/hash
- freshness timestamp
- source disposition
- applied-vs-ignored state
- supersession reference
- review-required state
- audit reference

Tenant Company owns override authority. Media Management owns override evidence from an asset-readiness standpoint.

## Report And Summary Contracts

Applies to:

- `media.manager.upload-action-presented`
- `media.readiness-summary.created`
- `media.missing-media-report-generated`

Payload fields/concepts:

- source accessory import batch reference
- vendor/entity scope reference
- Product Catalog product references
- media readiness summary reference
- missing media report reference where applicable
- imported accessory count reference
- accessories with assigned media count
- accessories missing required Main image count
- accessories missing required video count placeholder
- readiness status summary
- audit reference

## Asset Validation Contracts

Applies to:

- `media.asset.validation-failed`
- `media.asset.validation-passed`

Payload fields/concepts:

- media asset reference
- media asset version/hash
- validation result reference
- validation result version/hash
- validation status
- failure/review reason where applicable
- processing result reference where applicable
- audit reference

## PR-A Event Payload Contracts - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section defines proposal-level payload contracts for the ten PR-A additive Media events. Payload contracts are reference-first: events carry references to canonical Media-owned records and to external module records (Product Catalog product references, Integration Management transport references), not embedded source-module records. UPC is NOT a payload field on any PR-A event; the matching identifier is SKU.

### Shared PR-A event envelope

Each PR-A Media event uses the existing Media event envelope (event id, event name, event version, occurred timestamp, source module = Media Management, actor/service reference where applicable, vendor/entity scope reference where applicable, source version/hash where applicable, audit reference). The envelope is not modified by PR-A.

### `media.upload-session.created`

Emitted by PR-A Workflow 1 (Media Upload Session Initialization).

Payload fields:

- `mediaUploadSessionReference` - the new session's canonical identifier.
- `vendorEntityScopeReference` - vendor scope.
- `sourceAccessoryImportBatchReference` - the Product Catalog source accessory import batch reference where applicable.
- `productCatalogProductReferenceCollection` - the Product Catalog product references in scope for this session (by reference; not embedded).
- `submittedByActorReference` - the vendor user.
- `multiPartUploadCompletionState` - `open` at creation.
- `auditReference` - Logs & Audit retention reference.

Discipline:

- No accessory record contents are embedded; only references.
- No UPC field appears in the payload.

### `media.upload-job.created`

Emitted by PR-A Workflows 2, 3, 4 at child Media Upload Job creation.

Payload fields:

- `mediaUploadJobReference` - the new job's canonical identifier.
- `mediaUploadSessionReference` - the parent session.
- `jobType` - one of `zip`, `manual_drag_drop`, `image_url`, `future_api`.
- `vendorEntityScopeReference` - inherited from session.
- `sourceAccessoryImportBatchReference` - inherited from session where applicable.
- `submittedByActorReference` - the vendor user.
- `lifecycleState` - `received` at creation.
- `sourceFileReference` - present when `jobType` is `zip` or `manual_drag_drop`; placeholder reference at the implementation layer.
- `sourceImageUrlReferenceCollection` - present when `jobType` is `image_url`; the list of vendor-provided URLs (URLs are source-only, captured for audit and source-URL change detection).
- `integrationManagementTransportReference` - present when `jobType` is `image_url`; reference to the Integration Management transport record where applicable. May be null in Phase 1 if no specific hook exists; placeholder reference language applies.
- `auditReference` - Logs & Audit retention reference.

Discipline:

- No vendor URL is reported as a CIXCI-managed durable reference; vendor URLs are source-only.
- No UPC field appears in the payload.

### `media.upload-job.completed`

Emitted by PR-A Workflows 2, 3, 4 at child Media Upload Job terminal `completed` state.

Payload fields:

- `mediaUploadJobReference` - the canonical identifier.
- `mediaUploadSessionReference` - the parent session.
- `jobType` - one of `zip`, `manual_drag_drop`, `image_url`, `future_api`.
- `terminalState` - `completed`.
- `acceptedFileCount` - count of files that passed validation and produced a Media Asset Version.
- `reviewRequiredCount` - count of Media Assignment Candidates with `media_matching_confidence = review_required` produced by this job.
- `unmatchedFileCount` - count of Unmatched Media File records produced by this job.
- `validationFailureCount` - count of files that failed validation in this job.
- `mediaAssetVersionReferenceCollection` - references to Media Asset Versions created by this job.
- `mediaAssignmentCandidateReferenceCollection` - references to Media Assignment Candidates created by this job.
- `auditReference` - Logs & Audit retention reference.

Discipline:

- The event carries reference counts and reference collections; no source records are embedded.
- No UPC field appears in the payload.

### `media.upload-job.failed`

Emitted by PR-A Workflows 2, 3, 4 at child Media Upload Job terminal `failed` state (job-level failure).

Payload fields:

- `mediaUploadJobReference` - the canonical identifier.
- `mediaUploadSessionReference` - the parent session.
- `jobType` - one of `zip`, `manual_drag_drop`, `image_url`, `future_api`.
- `terminalState` - `failed`.
- `jobLevelFailureReason` - enumeration value such as `zip_unreadable`, `zip_oversized`, `zip_archive_nested`, `all_url_fetches_failed`, `all_manual_files_failed_validation`, `job_aborted_by_actor`.
- `jobLevelFailureReasonText` - optional free-text supplement.
- `partialMediaAssetVersionReferenceCollection` - references to any Media Asset Versions created from per-file partial successes prior to the job-level failure (empty in most cases).
- `auditReference` - Logs & Audit retention reference.

Discipline:

- Per-file failures within a job that otherwise completed do NOT trigger `media.upload-job.failed`. Per-file failures are reported within the job's validation result collection and surface in the coverage summary.
- No UPC field appears in the payload.

### `media.assignment-candidate.created`

Emitted by PR-A Workflow 5 when a Media Assignment Candidate is created.

Payload fields:

- `mediaAssignmentCandidateReference` - the new candidate's canonical identifier.
- `mediaUploadSessionReference` - the originating session.
- `mediaUploadJobReference` - the originating child job.
- `mediaFilenameParseResultReference` - the parse result that produced this candidate (where applicable).
- `mediaAssetVersionReference` - the candidate Media Asset Version.
- `productCatalogProductReference` - the matched product.
- `variantReference` - optional.
- `skuReference` - the SKU matched (Media-side matching key; never UPC).
- `mediaRole` - one of `Main`, `Alt`, `Lifestyle`, `Packaging`, `Video placeholder`.
- `displayOrder` - integer from filename sequence.
- `mediaMatchingConfidence` - one of `clean`, `review_required`.
- `mediaMatchingConfidenceSubReason` - present when `mediaMatchingConfidence = review_required`; one of the enumeration values defined in `data-model.md`.
- `mediaAssignmentReviewState` - `pending` at creation.
- `auditReference` - Logs & Audit retention reference.

Discipline:

- The candidate is not yet a Product Media Assignment Evidence; it carries pending state.
- No UPC field appears in the payload; SKU is the matching key.

### `media.assignment-candidate.review-required`

Emitted by PR-A Workflow 6 step 2 when a Media Assignment Candidate transitions to `review_required` review state.

Payload fields:

- `mediaAssignmentCandidateReference` - the candidate.
- `mediaUploadSessionReference` - the session.
- `mediaUploadJobReference` - the job.
- `productCatalogProductReference` - the product the candidate targets.
- `skuReference` - the SKU (Media-side matching key; never UPC).
- `mediaRole` - the role.
- `displayOrder` - from filename sequence.
- `mediaMatchingConfidence` - `review_required`.
- `mediaMatchingConfidenceSubReason` - the specific sub-reason (one of `folder_filename_sku_mismatch`, `main_one_missing_with_main_two_plus_present`, `duplicate_filename`, `duplicate_content_hash`, `ambiguous_parse`, `assignment_hint_disagreement`).
- `mediaAssignmentReviewState` - `review_required`.
- `auditReference` - Logs & Audit retention reference.

Discipline:

- No UPC field appears in the payload.
- The sub-reason enumeration is bounded; free-text reasons are not introduced by PR-A.

### `media.assignment-candidate.auto-assigned`

Emitted by PR-A Workflow 10 step 6 when a Media Assignment Candidate with `media_matching_confidence = clean` is promoted to a Product Media Assignment Evidence record via auto-assignment.

Payload fields:

- `mediaAssignmentCandidateReference` - the candidate that was promoted.
- `productMediaAssignmentReference` - the new Product Media Assignment Evidence record.
- `productCatalogProductReference` - the product.
- `skuReference` - the SKU (Media-side matching key; never UPC).
- `mediaAssetReference` - the assigned asset.
- `mediaAssetVersionReference` - the assigned version.
- `mediaRole` - the role.
- `displayOrder` - from filename sequence.
- `mediaUsageDisposition` - `approved_by_default` (the PR-A default at auto-assignment).
- `buyerUsageAllowed` - `true` at auto-assignment.
- `marketingDownloadAllowed` - `true` at auto-assignment.
- `mediaAssignmentReviewState` - `approved` (terminal).
- `auditReference` - Logs & Audit retention reference.

Discipline:

- This event fires only on the auto-assignment path (clean SKU evidence). Review-approved promotions reuse the existing `media.product-media-assignment-created` event.
- No UPC field appears in the payload; SKU is the matching key.

### `media.upload-coverage-summary.created`

Emitted by PR-A Workflow 7 step 9 when a Media Upload Coverage Summary is produced (or new version recorded) after a child job completion.

Payload fields:

- `mediaUploadCoverageSummaryReference` - the new summary's canonical identifier.
- `mediaUploadSessionReference` - the session.
- `evaluatedAfterMediaUploadJobReference` - the child job whose completion triggered this evaluation.
- `importedAccessorySkuCount` - count of SKUs in the source accessory import batch / Product Catalog product reference set in scope.
- `mediaAssignedSkuCount` - count of SKUs that have at least one promoted Product Media Assignment Evidence in this session so far.
- `unmatchedMediaFileCount` - count of Unmatched Media File records across all child jobs in this session.
- `missingRequiredMediaProductCount` - count of in-scope products with at least one missing required role.
- `coverageStatus` - one of `complete`, `partial`, `none`.
- `vendorOptionsOffered` - enumeration collection: `upload_another_zip`, `upload_manually_drag_drop`, `add_image_urls`, `download_missing_media_report`, `continue_without_uploading`, `return_later`.
- `previousMediaUploadCoverageSummaryReference` - optional; the prior summary on the session (preserved for audit).
- `auditReference` - Logs & Audit retention reference.

Discipline:

- The payload carries counts and references; no source records are embedded.
- The matching identifier in the underlying summary is SKU. No UPC field appears in the payload.

### `media.media-asset-version.created`

Emitted by PR-A Workflow 9 step 6 when a Media Asset Version is created.

Payload fields:

- `mediaAssetVersionReference` - the new version's canonical identifier.
- `mediaAssetReference` - the parent Media Asset.
- `mediaUploadJobReference` - the job that produced this version.
- `cixciMediaAssetUrlReference` - the platform-managed durable reference. **The vendor source URL is NEVER the value of this field.**
- `sourceImageUrlReference` - present when `uploadMethod = image_url`; the vendor URL captured for audit (source-only).
- `sourceUrlContentHash` - present when `uploadMethod = image_url`; the content hash for source-URL change detection.
- `contentHash` - hash of the accepted content.
- `mediaRole` - assigned at promotion time.
- `displayOrder` - from filename sequence.
- `mediaValidationResultReference` - the validation result.
- `mediaProcessingResultReference` - the processing result.
- `lifecycleState` - `created` at emission; `current` is set in the same workflow step for first-version creation.
- `uploadMethod` - one of `zip`, `manual_drag_drop`, `image_url`, `future_api`.
- `auditReference` - Logs & Audit retention reference.

Discipline:

- The `cixciMediaAssetUrlReference` is the durable buyer-visible surface. The vendor `sourceImageUrlReference` is captured for audit only and is NEVER the durable buyer-visible reference.
- New versions from URL re-ingestion are emitted with `lifecycleState = created`; transition to `current` is governed by the full supersession lifecycle (PR-B). Under PR-A's fail-safe rule, the prior `current` version remains active until PR-B explicitly supersedes it; a failed candidate transitions to `failed_candidate` and never becomes `current`.
- No UPC field appears in the payload.

### `media.source-url-fetch-result.recorded`

Emitted by PR-A Workflow 4 step 5 when a Source URL Fetch Result is recorded for an Image URL Ingestion Job.

Payload fields:

- `sourceUrlFetchResultReference` - the result reference on the Media side.
- `mediaUploadJobReference` - the parent Image URL Ingestion Job.
- `mediaUploadSessionReference` - the session.
- `integrationManagementTransportReference` - the Integration Management transport record reference where applicable. May be null in Phase 1; placeholder reference language applies.
- `sourceImageUrlReference` - the vendor URL fetched.
- `resultDiscriminator` - one of:
  - `fetched` - Integration Management successfully fetched the content; validation/processing flow follows.
  - `failed` - the fetch failed for a transient or generic reason.
  - `blocked` - the fetch was blocked.
  - `unauthorized` - the fetch returned an unauthorized response.
  - `unsupported` - the fetched content type is unsupported or the URL scheme is unsupported.
  - `changed_content_detected` - the fetched content's hash differs from the prior accepted version's hash. PR-A records the signal; full re-ingestion lifecycle is PR-B.
- `fetchedContentHash` - present when `resultDiscriminator` is `fetched` or `changed_content_detected`.
- `fetchFailureReasonText` - present when `resultDiscriminator` is `failed`, `blocked`, `unauthorized`, or `unsupported`. Free-text bounded reason for cases where Integration Management transport-record content is unavailable in Phase 1.
- `auditReference` - Logs & Audit retention reference.

Discipline:

- This is the single canonical Source URL fetch result event. PR-A does not introduce separate `media.source-url-fetch.completed` or `media.source-url-fetch.failed` events.
- `resultDiscriminator = fetched` triggers downstream PR-A Workflow 8 (Media Validation and Processing) and PR-A Workflow 9 (Media Asset Version Creation).
- `resultDiscriminator = failed`, `blocked`, `unauthorized`, or `unsupported` does NOT produce a Media Asset Version.
- `resultDiscriminator = changed_content_detected` is the foundation signal for source-URL change handling. The full re-ingestion lifecycle (vendor-triggered, scheduled, admin-triggered, ETag / Last-Modified evaluation, detailed supersession workflow) is PR-B.
- The vendor source URL is captured as `sourceImageUrlReference`; the durable CIXCI-managed reference is set later on the Media Asset Version via PR-A Workflow 9.
- No UPC field appears in the payload.

### Event versioning

PR-A introduces additive events at their initial version. Existing events are not re-versioned by PR-A. Future PR-B may version-bump events whose payloads change to accommodate the full restriction or re-ingestion lifecycle.

### Phase 1 deliberate non-behaviors (Media event-contracts side)

- No new payload fields for `cursorAdvancementTimestamp`-style cross-module sequencing (PR-A is single-module).
- No new Media Restriction Evidence event contracts (PR-B).
- No new Source URL Re-Ingestion event contracts beyond the `changed_content_detected` discriminator (PR-B).
- No new Media Asset Version supersession event contracts (PR-B).
- No new buyer marketing download event contracts (PR-B).
- No new CDN / signed URL / rendition event contracts (PR-B).
- No UPC field appears on any PR-A event payload contract.

## PR-B Event Payload Contracts - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section defines the payload contracts for the 12 PR-B additive events. **Payloads are reference-first.** Whole entity bodies are NOT embedded; subscribers resolve detail by reference per the existing PR-A pattern. Field names below are documentation-level; concrete wire format (JSON shape, camelCase / snake_case at the wire layer, required vs optional flags) is a future API hardening concern.

### Common envelope fields (all PR-B events)

Every PR-B event payload carries the existing envelope established by prior PRs:

- `eventId` - canonical event identifier (string).
- `eventName` - the dotted event name (e.g., `media.source-url-reingestion-request.created`).
- `eventOccurredAt` - timestamp of event occurrence.
- `eventVersion` - schema version identifier for the event payload.
- `eventActorReference` - reference to the actor that produced the event (vendor user, System Admin user, scheduled-policy actor, or system).
- `tenantCompanyAuthorityReference` - existing `check_access` reference (when applicable).
- `auditReference` - Logs & Audit retention reference.
- `correlationReference` - optional; ties related events together (e.g., a Source URL Re-Ingestion Request and its derived Revalidation Job, Change Detection Result, and Version Supersession share a correlation reference).

The body fields below are listed in addition to the envelope.

---

### `media.source-url-reingestion-request.created`

**Body fields:**

- `sourceUrlReingestionRequestReference` - canonical identifier of the created request.
- `vendorEntityScopeReference` - vendor scope.
- `requestingActorReference` - vendor user, System Admin user, or scheduled-policy actor.
- `targetSourceImageUrlReferenceCollection` - one or more Source Image URL References targeted.
- `targetMediaAssetVersionReferenceCollection` - optional; populated when the request scopes to specific versions.
- `triggerPath` - one of `vendor`, `system_admin`, `scheduled`.
- `schedulingPolicyReference` - optional; populated when `triggerPath = scheduled`.
- `requestReasonReference` - optional.
- `requestLifecycleState` - `requested` at emit time.

**Notes:**

- The request itself does not perform any fetch; the resulting Source URL Revalidation Job (PR-B Workflow 2) performs the work.
- Integration Management transport is invoked downstream; this event does not carry transport details.

---

### `media.source-url-revalidation-job.created`

**Body fields:**

- `sourceUrlRevalidationJobReference` - canonical identifier of the created job.
- `sourceUrlReingestionRequestReference` - the request that produced this job.
- `vendorEntityScopeReference`.
- `targetSourceImageUrlReference` - the single Source Image URL Reference for this job.
- `targetMediaAssetVersionReference` - the Media Asset Version associated with the URL at job creation (typically the `current` version).
- `integrationManagementTransportReference` - reference to the Integration-Management-owned transport invocation.
- `jobLifecycleState` - `received` at emit time.

**Notes:**

- Independent of the original `image_url` Media Upload Job (PR-A), which remains immutable.
- Subscribers MAY use `sourceUrlReingestionRequestReference` and `correlationReference` to associate this job with its originating request.

---

### `media.source-url-change-detection.recorded`

**Body fields:**

- `sourceUrlChangeDetectionResultReference` - canonical identifier of the recorded result.
- `sourceUrlRevalidationJobReference` - the job that produced this result.
- `targetSourceImageUrlReference`.
- `targetMediaAssetVersionReference` - the version associated with the URL at the time of fetch.
- `changeDetectionResultDiscriminator` - one of:
  - `hash_unchanged`
  - `hash_changed`
  - `fetch_unavailable`
  - `fetch_unauthorized`
  - `fetch_expired`
  - `fetch_redirected`
  - `validation_skipped`
- `sourceUrlContentHashReference` - the authoritative hash (populated when body was fetched).
- `priorSourceUrlContentHashReference` - the prior version's hash for comparison.
- `sourceUrlEtagReference` - optional supplemental hint.
- `sourceUrlLastModifiedReference` - optional supplemental hint.
- `candidateMediaAssetVersionReference` - populated only when `changeDetectionResultDiscriminator = hash_changed` and a candidate was created.
- `fetchedAtTimestamp`.

**Notes:**

- **Single canonical event with discriminator.** PR-B does NOT emit separate "changed" / "unchanged" / "fetch_unavailable" events.
- The ETag and Last-Modified references are hints only. The Source URL Content Hash is the authoritative change-detection signal.
- On any failure discriminator (`fetch_unavailable`, `fetch_unauthorized`, `fetch_expired`, `fetch_redirected`), no candidate is created; the prior `current` Media Asset Version remains active per the fail-safe rule.

---

### `media.media-asset-version.superseded`

**Body fields:**

- `versionSupersessionEvidenceReference` - canonical identifier of the supersession evidence.
- `mediaAssetReference` - the Media Asset whose `current_media_asset_version_reference` was updated.
- `newCurrentMediaAssetVersionReference` - the version that is now `current`.
- `priorCurrentMediaAssetVersionReference` - the version that is now `superseded`.
- `supersessionTrigger` - one of `source_url_reingestion`, `vendor_reupload`, `system_admin_restoration`, `system_admin_correction`.
- `sourceUrlReingestionRequestReference` - optional; populated when `supersessionTrigger = source_url_reingestion`.
- `sourceUrlRevalidationJobReference` - optional; populated when `supersessionTrigger = source_url_reingestion`.
- `sourceUrlChangeDetectionResultReference` - optional; populated when `supersessionTrigger = source_url_reingestion`.
- `mediaValidationResultReference` - the Validation Result reference for the new current version.
- `mediaProcessingResultReference` - the Processing Result reference for the new current version.
- `mediaReadinessEvidenceReference` - the regenerated readiness reference.
- `supersessionActorReference`.
- `supersessionTimestamp`.

**Notes:**

- Indicates that all four promotion conditions succeeded (Validation, Processing, Readiness, Version Supersession Evidence).
- The CIXCI Media Asset URL/Reference now resolves to `newCurrentMediaAssetVersionReference`. The vendor source URL remains source-only.
- The prior `current` is now in `superseded` lifecycle state and remains accessible by reference for audit and lineage traversal.

---

### `media.media-asset-version.rejected`

**Body fields:**

- `mediaAssetVersionReference` - the version that was explicitly rejected.
- `mediaAssetReference`.
- `priorLifecycleState` - `candidate` or `accepted`.
- `rejectionActorReference`.
- `rejectionReasonReference`.
- `rejectionTimestamp`.

**Notes:**

- Distinct from `failed_candidate`. `rejected` is explicit reviewer / System Admin action; `failed_candidate` is the automatic fail-safe outcome (no event).
- The rejected version remains in `rejected` lifecycle state for audit; it is NOT deleted.

---

### `media.restriction-request.created`

**Body fields:**

- `mediaRestrictionRequestReference` - canonical identifier of the created request.
- `vendorEntityScopeReference`.
- `requestingActorReference`.
- `targetMediaAssetVersionReference`.
- `targetMediaAssetReference` - optional; populated for future asset-wide restriction (Phase 1 default is per-version).
- `requestedRestrictionType` - one of `restricted`, `revoked`, `expired`.
- `requestedEffectiveDate`.
- `requestedExpirationDate` - optional.
- `requestReasonReference`.
- `requestLifecycleState` - `requested` at emit time.

**Notes:**

- A vendor MAY submit but CANNOT apply restriction. Application is System Admin only.
- Subscribers should treat this event as intent, not as effective restriction. Effective restriction is signaled by `media.restriction-evidence.applied`.

---

### `media.restriction-evidence.applied`

**Body fields:**

- `mediaRestrictionEvidenceReference` - canonical identifier of the applied evidence.
- `mediaRestrictionRequestReference` - optional; populated when a Request preceded application.
- `targetMediaAssetVersionReference`.
- `targetMediaAssetReference` - optional.
- `restrictionType` - one of `restricted`, `revoked`, `expired`.
- `appliedActorReference` - System Admin actor.
- `restrictionApplicationWorkflowReference`.
- `restrictionEffectiveDate`.
- `restrictionExpirationDate` - optional.
- `restrictionReasonReference`.

**Notes:**

- **Revocation is signaled here with `restrictionType = revoked`.** No separate revocation event.
- Triggers downstream `media.media-usage-disposition.recalculated` via PR-B Workflow 10.

---

### `media.restriction-evidence.superseded`

**Body fields:**

- `priorMediaRestrictionEvidenceReference` - the evidence that was superseded.
- `supersedingMediaRestrictionEvidenceReference` - the new evidence (lift or expired_restriction record).
- `targetMediaAssetVersionReference`.
- `supersessionTrigger` - one of `restriction_lifted`, `restriction_auto_expired`.
- `liftActorReference` - optional; populated when `supersessionTrigger = restriction_lifted`.
- `liftReasonReference` - optional; populated when `supersessionTrigger = restriction_lifted`.
- `liftEffectiveDate` - optional; populated when `supersessionTrigger = restriction_lifted`.
- `supersessionTimestamp`.

**Notes:**

- Lift creates new evidence; the prior evidence is superseded. Prior evidence is never mutated or deleted.
- Triggers downstream `media.media-usage-disposition.recalculated`.

---

### `media.media-usage-disposition.recalculated`

**Body fields:**

- `productMediaAssignmentEvidenceReference` - the assignment evidence whose disposition was recalculated. The event MAY be emitted per affected assignment evidence record (one event per record); alternatively a batched representation MAY carry a collection. The architectural surface allows either; the wire-format choice is deferred to API hardening.
- `mediaAssetVersionReference`.
- `priorMediaUsageDisposition` - one of `approved_by_default`, `restricted`, `revoked`, `expired`, `review_required`, `failed`.
- `newMediaUsageDisposition` - one of `approved_by_default`, `restricted`, `revoked`, `expired`, `review_required`, `failed`.
- `mediaUsageDispositionRecalculationReference`.
- `recalculationTrigger` - one of `restriction_applied`, `restriction_superseded`, `restriction_expired`, `version_superseded`, `version_revoked`, `version_expired`, `version_failed_candidate`, `expiration_date_elapsed`, `media_admin_recalculation_requested`.
- `regeneratedMediaReadinessEvidenceReference` - the new Media Readiness Evidence record produced by recalculation.

**Notes:**

- **Media-owned readiness language; NOT a buyer-export event.** Buyer-export concerns are PR-C.
- The exclusion rule (canonical): `restricted`, `revoked`, `expired`, `review_required`, `failed` dispositions exclude the affected Media Asset Version from buyer-visible Media Readiness Evidence.

---

### `media.sku-alias-mapping.proposed`

**Body fields:**

- `skuAliasMappingReference` - canonical identifier of the proposed mapping.
- `aliasSkuText` - the non-canonical SKU text.
- `canonicalSkuReference` - the canonical Product Catalog SKU reference (by reference; no Product Catalog mutation).
- `aliasScope` - one of `global`, `vendor`, `import_session`.
- `vendorEntityScopeReference` - optional; populated when `aliasScope = vendor`.
- `importSessionReference` - optional; populated when `aliasScope = import_session`.
- `expirationDate` - optional.
- `proposingActorReference`.
- `proposalReasonReference`.

**Notes:**

- The mapping is in `proposed` lifecycle state at emit time; it does NOT resolve alias matching until a System Admin approves it via PR-B Workflow 12.

---

### `media.sku-alias-mapping.approval-recorded`

**Body fields:**

- `skuAliasMappingReference`.
- `approvalOutcome` - one of `approved`, `rejected`.
- `approvalActorReference` - System Admin actor.
- `approvalTenantCompanyAuthorityReference`.
- `approvalReasonReference`.
- `approvalTimestamp`.
- `resultingLifecycleState` - `approved` or `rejected` (mirrors `approvalOutcome`).

**Notes:**

- **Single canonical event with discriminator.** PR-B does NOT emit separate `media.sku-alias-mapping.approved` / `media.sku-alias-mapping.rejected` events.
- An `approved` mapping resolves alias matching in PR-B Workflow 13 (Alias-Based Assignment Review). A `rejected` mapping does NOT resolve.

---

### `media.upload-failure-recovery.recorded`

**Body fields:**

- `uploadFailureRecoveryEvidenceReference` - canonical identifier.
- `mediaUploadSessionReference` - the parent session.
- `originalMediaUploadJobReference` - the failed original job.
- `retryMediaUploadJobReference` - the new sibling retry job.
- `failureReasonReference`.
- `preservedPriorSuccessesCollection` - collection of Media Asset Version references for files that succeeded in the original job before the failure.
- `recoveryActorReference`.
- `recoveryTimestamp`.

**Notes:**

- The original Media Upload Job is NOT mutated. Its `lifecycle_state` remains `failed` (or `failed_with_partial_successes`).
- The new sibling retry job enters PR-A's job-type-specific processing workflow.
- Duplicate detection on retry follows PR-A's content hash logic; duplicates are flagged as `review_required`, not silently overwriting prior Media Asset Versions.

---

### Cross-event correlation discipline

When a Source URL Re-Ingestion Request flows through to a Version Supersession, the events emitted share a `correlationReference`:

1. `media.source-url-reingestion-request.created`
2. `media.source-url-revalidation-job.created`
3. `media.source-url-change-detection.recorded` (with `change_detection_result_discriminator = hash_changed` in the happy path)
4. `media.media-asset-version.superseded` (after Validation, Processing, Readiness, and Version Supersession Evidence all succeed)
5. `media.media-usage-disposition.recalculated` (one event per affected Product Media Assignment Evidence record, OR a batched representation)

Subscribers MAY use the `correlationReference` to assemble the end-to-end trace.

For restriction flows, the events share a `correlationReference`:

1. `media.restriction-request.created` (when a request precedes application)
2. `media.restriction-evidence.applied`
3. `media.media-usage-disposition.recalculated` (one event per affected Product Media Assignment Evidence record)

For restriction lift / expiration flows:

1. `media.restriction-evidence.superseded`
2. `media.media-usage-disposition.recalculated`

For SKU alias flows:

1. `media.sku-alias-mapping.proposed`
2. `media.sku-alias-mapping.approval-recorded`
3. `media.assignment-candidate.review-required` (PR-A event, with the new sub-reason `alias_resolved_pending_review`)

For upload failure recovery:

1. `media.upload-job.failed` (PR-A event, on the original job)
2. `media.upload-failure-recovery.recorded`
3. `media.upload-job.created` (PR-A event, on the new sibling retry job)

### Payload discipline summary

- **Reference-first.** PR-B payloads carry references, not embedded entity bodies. Subscribers resolve detail by reference.
- **Single event with discriminator.** Where a binary outcome would otherwise produce paired events, PR-B uses a single event with a discriminator field. The two examples are `media.source-url-change-detection.recorded` (with `change_detection_result_discriminator`) and `media.sku-alias-mapping.approval-recorded` (with `approval_outcome`).
- **No buyer export payload language.** PR-B payloads use Media-owned readiness / disposition language. Buyer Media Export Package, Buyer Marketing Download Package, Buyer Media Download Evidence, Signed URL Reference, CDN Reference, Rendition Reference, and Cache Invalidation Reference do NOT appear in PR-B payloads.
- **No new Tenant Company role or capability flag in payloads.** PR-B authority references reuse existing `check_access` patterns.
- **No new Logs & Audit retention class in payloads.** PR-B audit references reuse existing patterns.
- **No notification delivery semantics in payloads.** Notification Platform Service consumption of PR-B events is a future PR.
