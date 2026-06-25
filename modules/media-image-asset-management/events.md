# Media / Image Asset Management Events

This document lists proposal-level Media events for Media Manager upload, assignment, required media profiles, readiness evidence, overrides, and reports.

Media events are signals about Media-owned state. They do not deliver notifications, transport external integrations, mutate Product Catalog product records, or decide final buyer visibility/export.

## Event Catalog

Post-import and summary events:

- `media.manager.upload-action-presented`
- `media.readiness-summary.created`
- `media.required-media-missing`
- `media.main-image-missing`
- `media.missing-media-report-generated`

Asset and assignment events:

- `media.asset.assigned-to-product`
- `media.asset.validation-failed`
- `media.asset.validation-passed`
- `media.product-media-assignment-created`
- `media.product-media-assignment-superseded`
- `media.main-asset-bound-to-readiness`

Required profile events:

- `media.required-profile-updated`
- `media.required-profile-superseded`
- `media.required-profile-stale`

Readiness events:

- `media.media-readiness-status-updated`
- `media.media-retail-readiness-blocked`
- `media.readiness-evidence-created`
- `media.readiness-evidence-superseded`
- `media.readiness-evidence-stale`
- `media.readiness-blocked-by-stale-assignment`
- `media.readiness-blocked-by-missing-validation-result`

Override events:

- `media.media-retail-readiness-override-applied`
- `media.readiness-override-evidence-applied`

## Event Payload Principles

Media readiness events should include enough references for Product Catalog and other consumers to bind to exact evidence:

- media readiness evidence id
- product reference
- variant reference where applicable
- SKU/UPC reference
- vendor/entity scope reference
- required media profile reference and version/hash
- Main media asset reference and version/hash where applicable
- Product Media Assignment reference and version/hash where applicable
- assigned media role and role disposition
- validation result reference and version/hash where applicable
- processing result reference and version/hash where applicable
- blocker/warning/override disposition
- freshness/expiration timestamp
- source disposition
- applied-vs-ignored state
- supersession reference
- review-required state
- audit reference

Required profile events should include source record version/hash, source timestamp, freshness/expiration, effective/end dates, source disposition, applied-vs-ignored state, supersession, review state, and audit reference.

Override events should include Tenant Company authority reference, approver/actor reference, scope, effective/expiration dates, source disposition, applied-vs-ignored state, supersession, review state, and audit reference.

## Consumer Notes

Product Catalog consumes readiness events/evidence to make final buyer visibility/export decisions. Missing, stale, expired, superseded, ignored, failed, or conflicting asset/assignment/profile/validation/processing/override evidence should block or route buyer visibility/export evaluation to review according to Product Catalog and Media rules.

Notification Platform Service owns delivery of notifications triggered by Media events. Integration Management owns external delivery/receipt evidence. Logs & Audit owns immutable audit/file/upload/report/download evidence.

## PR-A Event Inventory - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section adds the exact ten PR-A event names to the Media event catalog. Existing Media events (e.g., `media.readiness-evidence-created`, `media.asset.validation-passed`, `media.product-media-assignment-created`, `media.media-retail-readiness-blocked`, etc.) are not modified by this PR. PR-A additions follow the existing Media event naming convention (`media.<subject>.<verb-past-tense>` and `media.<subject>-<modifier>.<verb-past-tense>`).

### PR-A additive events (exactly 10)

The PR-A event inventory is exactly the following ten events. No additional Media-side events are introduced by PR-A.

**Session and job events:**

- `media.upload-session.created` - Media Upload Session created with `multi_part_upload_completion_state = open`.
- `media.upload-job.created` - Media Upload Job (any `job_type`: `zip`, `manual_drag_drop`, `image_url`, `future_api`) created under a session with `lifecycle_state = received`.
- `media.upload-job.completed` - Media Upload Job transitioned to terminal `completed` state. Validation, processing, asset version creation, and assignment candidate creation have run for the job.
- `media.upload-job.failed` - Media Upload Job transitioned to terminal `failed` state at the job level (e.g., unreadable ZIP, all URL fetches failed, all manual files failed validation).

**Assignment events:**

- `media.assignment-candidate.created` - Media Assignment Candidate created from filename parsing and SKU-Based Media Assignment Rule evaluation OR from an assignment hint (manual / URL ingestion).
- `media.assignment-candidate.review-required` - Media Assignment Candidate transitioned to `review_required` review state because `media_matching_confidence = review_required`.
- `media.assignment-candidate.auto-assigned` - Media Assignment Candidate with `media_matching_confidence = clean` was promoted to a Product Media Assignment Evidence record via auto-assignment.

**Coverage and version events:**

- `media.upload-coverage-summary.created` - Media Upload Coverage Summary produced (or new version recorded) after a child Media Upload Job transitioned to `completed` or `failed`.
- `media.media-asset-version.created` - Media Asset Version created after Media Validation and Processing accepted a file. The version carries the CIXCI Media Asset URL/Reference (platform-managed; not the vendor source URL).

**Source URL fetch event (single event with discriminator):**

- `media.source-url-fetch-result.recorded` - Source URL Fetch Result recorded for an Image URL Ingestion Job. The event payload carries a `resultDiscriminator` field with one of the following values:
  - `fetched` - Integration Management successfully fetched the content; validation/processing flow follows.
  - `failed` - the fetch failed for a transient or generic reason.
  - `blocked` - the fetch was blocked (for example, by a vendor-side ACL).
  - `unauthorized` - the fetch returned an unauthorized response (credentials, scope, or expired token).
  - `unsupported` - the fetched content type is unsupported (e.g., GIF, HEIC, TIFF) or the URL scheme is unsupported.
  - `changed_content_detected` - foundation signal that a subsequent fetch returned content whose hash differs from the prior accepted version's hash. The full re-ingestion lifecycle is PR-B; PR-A records the signal only.

PR-A does NOT introduce separate `media.source-url-fetch.completed` / `media.source-url-fetch.failed` events; a single canonical event with the discriminator is used per scoping decision.

### Events not introduced by PR-A (modeled as records / states / evidence)

The following concepts are modeled as records, states, or evidence surfaces in the data model; PR-A does NOT introduce events for them (no consumer requires events for these in PR-A):

- ZIP Extracted File (field-collection on Media Upload Job; no `media.zip-extracted-file.recorded` event).
- Media Filename Parse Result (record produced inline during filename parsing; no `media.filename-parse.completed` event).
- Unmatched Media File (field-collection on Media Upload Job; no `media.unmatched-file.recorded` event).
- Missing Required Media Result (field-collection on Media Upload Coverage Summary; observable via `media.upload-coverage-summary.created`).

If a future PR-B consumer requires events for any of these surfaces, PR-B may introduce them additively without changing the PR-A inventory.

### Existing events not modified by PR-A

The existing Media event catalog continues unchanged. PR-A does not rename, remove, deprecate, or alter the payload contracts of any existing event including but not limited to:

- `media.manager.upload-action-presented`
- `media.readiness-summary.created`
- `media.required-media-missing`
- `media.main-image-missing`
- `media.missing-media-report-generated`
- `media.asset.assigned-to-product`
- `media.asset.validation-failed`
- `media.asset.validation-passed`
- `media.product-media-assignment-created`
- `media.product-media-assignment-superseded`
- `media.main-asset-bound-to-readiness`
- `media.required-profile-updated`
- `media.required-profile-superseded`
- `media.required-profile-stale`
- `media.media-readiness-status-updated`
- `media.media-retail-readiness-blocked`
- `media.readiness-evidence-created`
- `media.readiness-evidence-superseded`
- `media.readiness-evidence-stale`
- `media.readiness-blocked-by-stale-assignment`
- `media.readiness-blocked-by-missing-validation-result`
- `media.media-retail-readiness-override-applied`
- `media.readiness-override-evidence-applied`

PR-A's hardening of existing entities (Product Media Assignment Evidence, Media Readiness Evidence, Media Asset) does not change the existing event surface; new fields on those entities are carried within their existing event payload contracts by reference. UPC matching language in any existing event documentation should be interpreted under PR-A as SKU-based; the actual event names are not renamed.

### Phase 1 deliberate non-behaviors (Media events side)

- No new Media Restriction Evidence events (PR-B introduces them once the workflow is detailed).
- No new Source URL Re-Ingestion events beyond the `changed_content_detected` discriminator on `media.source-url-fetch-result.recorded` (PR-B may introduce re-ingestion lifecycle events).
- No new Media Asset Version supersession events (PR-B).
- No new buyer marketing download events (PR-B).
- No new CDN / signed URL / rendition events (PR-B).
- No additional Source URL fetch events beyond the single canonical event with discriminator.
- No new aliasing / mapping events (PR-B).

## PR-B Event Inventory - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

PR-B introduces exactly 12 additive events in the `media.*` namespace. PR-A events are preserved without rename or deprecation. All PR-B events are additive; existing PR-A event payload contracts are not modified.

### PR-B additive events (exactly 12)

1. `media.source-url-reingestion-request.created`
2. `media.source-url-revalidation-job.created`
3. `media.source-url-change-detection.recorded`
4. `media.media-asset-version.superseded`
5. `media.media-asset-version.rejected`
6. `media.restriction-request.created`
7. `media.restriction-evidence.applied`
8. `media.restriction-evidence.superseded`
9. `media.media-usage-disposition.recalculated`
10. `media.sku-alias-mapping.proposed`
11. `media.sku-alias-mapping.approval-recorded`
12. `media.upload-failure-recovery.recorded`

### Per-event purpose and trigger

#### `media.source-url-reingestion-request.created`

- **Purpose.** Signal that a vendor or System Admin (or scheduled-policy actor) has submitted a Source URL Re-Ingestion Request.
- **Trigger.** PR-B Workflow 1 (Source URL Re-Ingestion Request), step 7.
- **Carries.** `source_url_reingestion_request_reference`, `vendor_entity_scope_reference`, `requesting_actor_reference`, `target_source_image_url_reference_collection`, `trigger_path`, `request_lifecycle_state` (always `requested` at emit time), and `audit_reference`.

#### `media.source-url-revalidation-job.created`

- **Purpose.** Signal that a Source URL Revalidation Job has been created from an approved Source URL Re-Ingestion Request.
- **Trigger.** PR-B Workflow 2 (Source URL Revalidation Job), step 2.
- **Carries.** `source_url_revalidation_job_reference`, `source_url_reingestion_request_reference`, `target_source_image_url_reference`, `target_media_asset_version_reference`, `job_lifecycle_state` (always `received` at emit time), and `audit_reference`.

#### `media.source-url-change-detection.recorded`

- **Purpose.** Signal that a Source URL Change Detection Result has been recorded for a single fetch outcome. **Single canonical event with discriminator** in payload (`change_detection_result_discriminator`); PR-B does NOT emit separate "changed" / "unchanged" events.
- **Trigger.** PR-B Workflow 3 (Source URL Change Detection), step 5.
- **Carries.** `source_url_change_detection_result_reference`, `source_url_revalidation_job_reference`, `target_source_image_url_reference`, `target_media_asset_version_reference`, `change_detection_result_discriminator` (one of `hash_unchanged`, `hash_changed`, `fetch_unavailable`, `fetch_unauthorized`, `fetch_expired`, `fetch_redirected`, `validation_skipped`), optional `candidate_media_asset_version_reference` (populated when discriminator is `hash_changed`), and `audit_reference`.

#### `media.media-asset-version.superseded`

- **Purpose.** Signal that a Media Asset Version has been promoted from `candidate`/`accepted` to `current`, and the prior `current` has transitioned to `superseded`. Version Supersession Evidence has been recorded.
- **Trigger.** PR-B Workflow 5 (Media Asset Version Supersession), step 8.
- **Carries.** `version_supersession_evidence_reference`, `media_asset_reference`, the new `current_media_asset_version_reference`, the now-`superseded` `prior_current_media_asset_version_reference`, `supersession_trigger`, optional Source-URL re-ingestion references (when triggered by re-ingestion), and `audit_reference`.

#### `media.media-asset-version.rejected`

- **Purpose.** Signal that a Media Asset Version has been explicitly rejected by reviewer or System Admin action (distinct from `failed_candidate`, which is the automatic fail-safe outcome and is NOT emitted as a separate event).
- **Trigger.** Explicit rejection of a `candidate` or `accepted` Media Asset Version by reviewer or System Admin.
- **Carries.** `media_asset_version_reference`, prior lifecycle state, `rejection_actor_reference`, `tenant_company_authority_reference`, `rejection_reason_reference`, and `audit_reference`.

#### `media.restriction-request.created`

- **Purpose.** Signal that a vendor or System Admin has submitted a Media Restriction Request.
- **Trigger.** PR-B Workflow 7 (Media Restriction Request), step 7.
- **Carries.** `media_restriction_request_reference`, `target_media_asset_version_reference`, optional `target_media_asset_reference`, `requested_restriction_type` (`restricted`, `revoked`, or `expired`), `requested_effective_date`, optional `requested_expiration_date`, `requesting_actor_reference`, `request_lifecycle_state` (always `requested` at emit time), and `audit_reference`.

#### `media.restriction-evidence.applied`

- **Purpose.** Signal that Media Restriction Evidence has been applied by a System Admin. **Revocation** is signaled via this event with `restriction_type = revoked` in the payload (no separate revocation event).
- **Trigger.** PR-B Workflow 8 (Media Restriction Evidence Application), step 6.
- **Carries.** `media_restriction_evidence_reference`, optional `media_restriction_request_reference`, `target_media_asset_version_reference`, `restriction_type` (`restricted`, `revoked`, or `expired`), `applied_actor_reference`, `restriction_effective_date`, optional `restriction_expiration_date`, `restriction_reason_reference`, and `audit_reference`.

#### `media.restriction-evidence.superseded`

- **Purpose.** Signal that a previously active Media Restriction Evidence has been superseded by a new evidence record (via lift, or via auto-lift on `restriction_expiration_date` elapse). **Lift creates new evidence; this event signals that the prior evidence was superseded.**
- **Trigger.** PR-B Workflow 9 (Media Restriction Lift and Expiry Evaluation), restriction lift path (step 1) and restriction expiration path (step 2).
- **Carries.** the prior `media_restriction_evidence_reference`, the new (lift or expired-restriction) `superseding_media_restriction_evidence_reference`, `target_media_asset_version_reference`, lift or expiration trigger, lift actor reference (when applicable), lift effective date (when applicable), and `audit_reference`.

#### `media.media-usage-disposition.recalculated`

- **Purpose.** Signal that the Media Usage Disposition of one or more Product Media Assignment Evidence records has been recalculated as a Media-owned readiness recalculation. **Media-owned readiness language; NOT a buyer-export event.** Buyer export concerns are PR-C.
- **Trigger.** PR-B Workflow 10 (Media Usage Disposition Recalculation), step 7.
- **Carries.** `product_media_assignment_evidence_reference`, `media_asset_version_reference`, prior `media_usage_disposition`, new `media_usage_disposition`, `media_usage_disposition_recalculation_reference`, recalculation trigger (one of `restriction_applied`, `restriction_superseded`, `restriction_expired`, `version_superseded`, `version_revoked`, `version_expired`, `version_failed_candidate`, `expiration_date_elapsed`, `media_admin_recalculation_requested`), and `audit_reference`.

#### `media.sku-alias-mapping.proposed`

- **Purpose.** Signal that a vendor or System Admin has proposed a SKU Alias Mapping. The mapping is in `lifecycle_state = proposed`.
- **Trigger.** PR-B Workflow 11 (SKU Alias Mapping Proposal), step 5.
- **Carries.** `sku_alias_mapping_reference`, `alias_sku_text`, `canonical_sku_reference`, `alias_scope`, optional `vendor_entity_scope_reference`, optional `import_session_reference`, optional `expiration_date`, `proposing_actor_reference`, and `audit_reference`.

#### `media.sku-alias-mapping.approval-recorded`

- **Purpose.** Signal that a System Admin has recorded an approval outcome for a SKU Alias Mapping. **Single canonical event with discriminator** in payload (`approval_outcome`); PR-B does NOT emit separate "approved" / "rejected" events.
- **Trigger.** PR-B Workflow 12 (SKU Alias Mapping Approval), step 5.
- **Carries.** `sku_alias_mapping_reference`, `approval_outcome` (one of `approved`, `rejected`), `approval_actor_reference`, `approval_tenant_company_authority_reference`, `approval_reason_reference`, `approval_timestamp`, resulting `lifecycle_state` (`approved` or `rejected`), and `audit_reference`.

#### `media.upload-failure-recovery.recorded`

- **Purpose.** Signal that an Upload Failure Recovery Evidence record has been created for a retry following a partial or full child Media Upload Job failure. The original job is preserved; the retry job is a new sibling.
- **Trigger.** PR-B Workflow 14 (Upload Failure Recovery), step 8.
- **Carries.** `upload_failure_recovery_evidence_reference`, `media_upload_session_reference`, `original_media_upload_job_reference`, `retry_media_upload_job_reference`, `failure_reason_reference`, `preserved_prior_successes_collection`, `recovery_actor_reference`, `recovery_timestamp`, and `audit_reference`.

---

### Events NOT introduced by PR-B (intentionally modeled as records, states, or contract rules)

PR-B explicitly does NOT introduce the following events. These concepts are modeled as Media Asset Version lifecycle states, contract rules, or are subsumed under one of the 12 PR-B events above via discriminator.

- `media.source-url-change.detected` - subsumed under `media.source-url-change-detection.recorded` with discriminator `hash_changed`.
- `media.source-url-change.unchanged` - subsumed under `media.source-url-change-detection.recorded` with discriminator `hash_unchanged`.
- `media.source-url-fetch.unavailable` / `media.source-url-fetch.unauthorized` / `media.source-url-fetch.expired` / `media.source-url-fetch.redirected` - subsumed under `media.source-url-change-detection.recorded` with the corresponding discriminator value (`fetch_unavailable`, `fetch_unauthorized`, `fetch_expired`, `fetch_redirected`).
- `media.source-url-fetch.skipped` - subsumed under `media.source-url-change-detection.recorded` with discriminator `validation_skipped`.
- `media.media-asset-version.validation-failed` - modeled as Media Asset Version lifecycle transition to `failed_candidate` (PR-A fail-safe state). The Media Validation Result and Media Processing Result records, plus the Source URL Change Detection Result (when applicable), provide observability. No separate event.
- `media.media-asset-version.accepted` - modeled as Media Asset Version lifecycle transition to `accepted` (the intermediate state before promotion). PR-A's `media.media-asset-version.created` (foundation) covers candidate creation; PR-B's `media.media-asset-version.superseded` covers promotion to `current`. No separate `accepted` event.
- `media.media-asset-version.failed-candidate` - modeled as the Media Asset Version `failed_candidate` lifecycle state (PR-A). PR-A foundation; no PR-B event.
- `media.media-asset-version.expired` - modeled via `media.restriction-evidence.applied` with `restriction_type = expired` and `media.media-usage-disposition.recalculated`. No separate version-level expired event.
- `media.media-asset-version.revoked` - modeled via `media.restriction-evidence.applied` with `restriction_type = revoked` and `media.media-usage-disposition.recalculated`. No separate version-level revoked event.
- `media.restriction-evidence.removed` - subsumed under `media.restriction-evidence.superseded` (lift creates new evidence; prior evidence is superseded; prior evidence is never mutated or deleted).
- `media.media-restriction.lifted` - subsumed under `media.restriction-evidence.superseded`.
- `media.expiry.evaluated` - modeled through `media.restriction-evidence.applied` (with `restriction_type = expired`) and `media.media-usage-disposition.recalculated`. No separate expiry event.
- `media.alias-assignment.review-required` - reuses the PR-A event `media.assignment-candidate.review-required` with the new sub-reason `alias_resolved_pending_review`. No new alias-routing event.
- `media.alias-mapping.expired` - modeled as SKU Alias Mapping lifecycle transition to `expired`. No separate event.
- `media.export-eligibility.recalculated` - **deliberately NOT introduced.** PR-B uses Media-owned disposition/readiness language: `media.media-usage-disposition.recalculated`. The phrase "export eligibility" is buyer-export-flavored and would conflict with PR-C scope; PR-B avoids it.
- `media.resumable-upload.initialized` / `media.upload-chunk.recorded` / `media.upload-retry.required` - implementation-level. PR-B captures `media.upload-failure-recovery.recorded` only as the architecture-level audit event.
- `media.upload-session.closed-on-child-failure` - **deliberately NOT introduced.** Per the canonical Child Job Failure Handling Rule, child job failure does NOT close the parent session. The non-event is the architecturally correct state.
- All buyer Media Export, buyer Marketing Download, Buyer Media Download Request, Buyer Media Download Evidence, CDN, signed URL, rendition, and cache invalidation events - deferred to PR-C. No PR-B events.
- Notification Platform Service delivery events (push, email, in-app) for restriction / revocation / expiry - future PR. No PR-B events.

### PR-A events preserved (no rename, no deprecation, no version bump)

PR-B does NOT rename, deprecate, or version-bump any PR-A event. The PR-A 10-event inventory remains:

- `media.upload-session.created`
- `media.upload-job.created`
- `media.upload-job.completed`
- `media.upload-job.failed`
- `media.assignment-candidate.created`
- `media.assignment-candidate.review-required`
- `media.assignment-candidate.auto-assigned`
- `media.upload-coverage-summary.created`
- `media.media-asset-version.created`
- `media.source-url-fetch-result.recorded`

### Event totals after PR-B

The Media / Image Asset Management module emits 22 events after PR-B: the 10 PR-A events above plus the 12 PR-B events listed in this section.

### Event payload contracts

Detailed payload contracts for the 12 PR-B events are in `event-contracts.md` (PR-B section).

### Event discipline summary

- Single canonical event with discriminator is preferred over paired events. `media.source-url-change-detection.recorded` (with `change_detection_result_discriminator`) and `media.sku-alias-mapping.approval-recorded` (with `approval_outcome`) are the canonical PR-B examples.
- Lifecycle state transitions that are observable via existing entity reads or via existing PR-A events are NOT given new PR-B events (e.g., `failed_candidate`, `accepted`, alias-mapping-expired).
- Buyer-flavored event names ("export eligibility", "buyer download", etc.) are deliberately not introduced; PR-B uses Media-owned readiness/disposition language.
- Notification, transport, and runtime-mechanic events remain implementation-level.
