# Media / Image Asset Management Test Scenarios

These proposal-level scenarios validate the Media Manager post-accessory-import upload and readiness workflow.

## Accessory Import Handoff

- Accessory import succeeds without media.
- Accessory records remain saved after successful accessory import.
- `Upload Images in Media Manager` action appears after import.
- Action routes vendor to Media Manager with source accessory import batch reference.
- Accessory import workflow does not process image/video files.

## Missing Media Summary

- Vendor sees missing media summary after import.
- Summary shows imported accessory count.
- Summary shows accessories with assigned media count.
- Summary shows accessories missing required Main image count.
- Summary shows status `Not Retail Ready` when required Main images are missing.
- Source import batch and Product Catalog product references are preserved.

## Upload Methods

- ZIP upload creates Media Upload Job and Media Asset records.
- Manual media upload validates and processes files.
- Add Image URLs creates URL ingestion job and references Integration evidence where applicable.
- Media file upload supports assignment to product/variant references.
- Future video upload support remains gated by configuration.

## Product Media Assignment Bindability

- Product Media Assignment records Media Asset ID and asset version/hash.
- Product Media Assignment records product reference, variant reference, SKU/UPC, assigned role, role priority/order, assignment source, and assignment source version/hash.
- Product Media Assignment records validation result reference/version and processing result reference/version.
- Superseded assignment no longer satisfies required Main image readiness.
- Ignored assignment does not satisfy required media readiness.
- Assignment with failed validation routes readiness to blocked or review-required state.

## Required Media Profile Evidence

- Required Media Profile records source module, scope, required Main image flag, blocker mode, effective date, end/expiration date, source record version/hash, source timestamp, freshness timestamp, expiration timestamp, source disposition, applied-vs-ignored state, supersession reference, review-required state, and audit reference.
- Missing Required Media Profile blocks or routes Product Catalog visibility/export evaluation to review.
- Stale Required Media Profile blocks or routes Product Catalog visibility/export evaluation to review.
- Expired Required Media Profile blocks or routes Product Catalog visibility/export evaluation to review.
- Superseded Required Media Profile is not used for new readiness evaluation.
- Required Media Profile changes do not rewrite historical export, visibility, invoice, analytics, or audit evidence.

## Required Media And Readiness

- Missing Main image blocks buyer visibility/export by default.
- Missing required media warning-only mode does not hard block where configured.
- Required Media Profile supports category-specific requirements.
- Required Media Profile supports vendor-specific requirements.
- Required Media Profile supports buyer-type-specific requirements.
- Temporary override is versioned, permissioned, auditable, and time-bound.
- Uploaded Main image validates and changes media readiness.
- Invalid media keeps accessory `Not Retail Ready`.
- Media processing status does not become `Retail Ready From Media Standpoint` until validation and assignment complete.

## Media Readiness Evidence Bindability

- Media Readiness Evidence includes required media profile reference and version/hash.
- Media Readiness Evidence includes Main media asset reference and version/hash.
- Media Readiness Evidence includes Product Media Assignment reference and version/hash.
- Media Readiness Evidence includes assigned media role and role disposition.
- Media Readiness Evidence includes validation result reference/version and processing result reference/version.
- Summary booleans are traceable to exact asset, assignment, validation, and processing evidence.
- `media.main-asset-bound-to-readiness` is emitted when exact Main asset evidence is bound.
- `media.readiness-evidence-created` is emitted when readiness evidence is created.
- `media.readiness-evidence-superseded` is emitted when readiness evidence is replaced.
- `media.readiness-evidence-stale` is emitted or represented when readiness evidence becomes stale.
- `media.readiness-blocked-by-stale-assignment` is emitted or represented when assignment evidence blocks readiness.
- `media.readiness-blocked-by-missing-validation-result` is emitted or represented when validation evidence is missing.

## Vendor Leaves Media Manager

- Vendor leaves Media Manager without uploading media.
- Accessory records remain saved, editable, and visible to vendor/System Admin.
- Records remain blocked from buyer visibility/export when required media is hard blocker.
- Records become buyer-visible/exportable only after Product Catalog consumes successful readiness evidence or authorized override evidence.

## Missing Media Report

- Download Missing Media Report lists accessories missing required media.
- Report includes SKU, UPC, accessory name, required media type, current readiness status, validation errors, and assignment status.
- Logs & Audit owns immutable report/file/download evidence.
- Media Management owns report content/source readiness state.

## Override Behavior

- System Admin override allows media-readiness bypass where authorized and configured.
- Override requires Tenant Company authority reference.
- Override includes required media profile reference, scope, mode, reason, approver/actor, effective/expiration dates, source version/hash, freshness timestamp, source disposition, applied-vs-ignored state, supersession, review state, and audit reference.
- Expired override no longer allows readiness bypass.
- Superseded override no longer allows readiness bypass.
- Product Catalog consumes override evidence rather than inferring visibility or override authority.

## Product Catalog Consumption

- Product Catalog consumes media readiness evidence without owning media workflow.
- Product Catalog consumes exact Media Asset ID/version for buyer visibility/export evaluation.
- Product Catalog consumes Product Media Assignment version and validation/processing evidence.
- Product Catalog blocks buyer visibility/export when readiness evidence is missing.
- Product Catalog blocks buyer visibility/export when asset, assignment, validation, processing, required profile, or override evidence is stale, failed, superseded, ignored, expired, or conflicting.
- Product Catalog does not treat media readiness as full product sellability.

## Event/API Coverage

- `media.manager.upload-action-presented` emitted after successful import handoff.
- `media.readiness-summary.created` emitted when summary is created.
- `media.required-media-missing` emitted for missing required media.
- `media.main-image-missing` emitted for missing Main image.
- `media.media-readiness-status-updated` emitted after readiness changes.
- `media.media-retail-readiness-blocked` emitted when hard blocker applies.
- `media.media-retail-readiness-override-applied` emitted when override applies.
- `media.missing-media-report-generated` emitted when report is generated.
- `media.asset.assigned-to-product` emitted when asset is assigned.
- `media.asset.validation-failed` and `media.asset.validation-passed` emitted after validation.
- `media.product-media-assignment-created` and `media.product-media-assignment-superseded` emitted for assignment lifecycle.
- `media.required-profile-updated`, `media.required-profile-superseded`, and `media.required-profile-stale` emitted or represented for profile lifecycle.
- `media.readiness-override-evidence-applied` emitted when override evidence is applied.

## PR-A Test Scenarios - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

These proposal-level scenarios validate the PR-A hardening pass. Each scenario references the PR-A workflows defined in `workflows.md` and the entities / fields / contract rules defined in `data-model.md`. Matching identifier is SKU throughout; UPC must not appear as a matching key in any Media-side step.

### Scenario PR-A-1: Media Upload Session Initialization

1. Vendor V completes accessory import for batch B in Product Catalog producing accessory SKUs `S001`, `S002`, `S003`.
2. Vendor V enters Media Manager from the Post-Accessory-Import Handoff action button.
3. Vendor V initiates a new Media Upload Session for batch B. PR-A Workflow 1 runs:
   - Media Upload Session U1 is created with `multi_part_upload_completion_state = open`, `vendor_entity_scope_reference = V`, `source_accessory_import_batch_reference = B`, `product_catalog_product_reference_collection` referencing the three accessory products, `submitted_by_actor_reference = V's user`.
   - `child_media_upload_job_reference_collection` is empty.
   - `media.upload-session.created` is emitted with payload referencing U1, V, B, and the three product references.
4. Logs & Audit retention record is created via the existing Audit Record pattern.

Expected: U1 exists; vendor sees Media Manager landing view with no child jobs yet; coverage status is `none`.

### Scenario PR-A-2: ZIP Upload Job with clean SKU evidence (auto-assignment path)

1. Within U1, vendor V uploads ZIP file `Z1.zip` containing folder `S001/` with files `S001_Main_1.png`, `S001_Alt_1.png`.
2. PR-A Workflow 2 runs:
   - Media Upload Job J1 is created with `job_type = zip`, `media_upload_session_reference = U1`, `lifecycle_state = received`.
   - `media.upload-job.created` is emitted.
   - ZIP extraction produces two ZIP Extracted File Records with `extraction_outcome = extracted`.
   - PR-A Workflow 5 runs for each file: Media Filename Parse Result is produced for each with `parsed_sku = S001`, `parsed_folder_sku = S001`, `media_role = Main` (for the first) and `Alt` (for the second), `display_order = 1`, `parse_disposition = clean`. SKU-Based Media Assignment Rule evaluation: folder SKU = filename SKU = S001, and S001 is in scope. `media_matching_confidence = clean` on each candidate.
   - PR-A Workflow 8 runs for each file: Media Validation Result `passed`; Media Processing Result `completed`.
   - PR-A Workflow 9 runs for each accepted file: Media Asset MA1, Media Asset Version MAV1.1 (for Main) and Media Asset MA2, Media Asset Version MAV2.1 (for Alt) are created with `cixci_media_asset_url_reference` set to platform-managed durable references. `lifecycle_state` transitions to `current` for each (first-version case).
   - `media.media-asset-version.created` is emitted for each.
   - PR-A Workflow 5 produces Media Assignment Candidates C1, C2 with `media_matching_confidence = clean`.
   - `media.assignment-candidate.created` is emitted for each.
   - PR-A Workflow 10 runs for each `clean` candidate: Product Media Assignment Evidence A1, A2 are created with `sku_reference = S001`, `media_asset_version_reference = MAV1.1` / `MAV2.1`, `media_usage_disposition = approved_by_default`, `buyer_usage_allowed = true`, `marketing_download_allowed = true`.
   - `media.assignment-candidate.auto-assigned` is emitted for each.
   - PR-A Workflow 11 produces or updates Media Readiness Evidence for product S001.
3. Job J1 transitions to `lifecycle_state = completed`. `media.upload-job.completed` is emitted with `acceptedFileCount = 2`, `reviewRequiredCount = 0`, `unmatchedFileCount = 0`, `validationFailureCount = 0`.
4. PR-A Workflow 7 produces Media Upload Coverage Summary CS1 with `imported_accessory_sku_count = 3`, `media_assigned_sku_count = 1` (S001), `coverage_status = partial`, `vendor_options_offered` including `upload_another_zip`, `upload_manually_drag_drop`, `add_image_urls`, `download_missing_media_report`, `continue_without_uploading`, `return_later`.
5. `media.upload-coverage-summary.created` is emitted.
6. UPC does NOT appear in any payload or any record produced by this scenario.

Expected: S001 has Product Media Assignment Evidence for Main_1 and Alt_1; S002 and S003 remain unmatched; the coverage summary shows partial coverage; the vendor can upload another ZIP.

### Scenario PR-A-3: ZIP Upload Job with folder SKU vs filename SKU disagreement (review path)

1. Within U1, vendor V uploads ZIP file `Z2.zip` containing folder `S002/` with file `S003_Main_1.png` (folder says S002; filename says S003).
2. PR-A Workflow 2 runs:
   - Media Upload Job J2 is created. ZIP extraction produces one ZIP Extracted File Record.
   - PR-A Workflow 5: Media Filename Parse Result has `parsed_sku = S003`, `parsed_folder_sku = S002`. SKU-Based Media Assignment Rule evaluation: folder SKU != filename SKU. `media_matching_confidence = review_required` with `media_matching_confidence_sub_reason = folder_filename_sku_mismatch`.
   - PR-A Workflow 8 runs: validation passes (the file itself is a valid PNG).
   - PR-A Workflow 9 runs: Media Asset Version MAV3.1 is created with `lifecycle_state = current` (first version for this Media Asset).
   - PR-A Workflow 5 produces Media Assignment Candidate C3 with `media_matching_confidence = review_required` and the sub-reason.
   - `media.assignment-candidate.created` is emitted with `mediaMatchingConfidence = review_required`.
   - PR-A Workflow 6 transitions C3 to `media_assignment_review_state = review_required`. `media.assignment-candidate.review-required` is emitted.
   - C3 is NOT promoted to Product Media Assignment Evidence; no Media Readiness Evidence is satisfied by C3 yet.
3. Job J2 transitions to `completed` with `reviewRequiredCount = 1`.
4. A System Admin reviews C3 and approves it for SKU S003 (or rejects it). On approval, PR-A Workflow 10 promotes C3 to Product Media Assignment Evidence A3 with `sku_reference = S003`; the existing `media.product-media-assignment-created` event fires. On rejection, no assignment is created.
5. UPC does NOT appear in any payload or record.

Expected: Auto-assignment is suppressed for the folder/filename mismatch; the candidate awaits review; SKU is the matching key throughout.

### Scenario PR-A-4: ZIP Upload Job with SKU not in scope (unmatched media path)

1. Within U1, vendor V uploads ZIP file `Z3.zip` containing file `S999_Main_1.png` (S999 is not in the source accessory import batch and not in the Product Catalog product reference set in scope for U1).
2. PR-A Workflow 5: filename parses as SKU S999, role Main, display order 1. SKU-Based Media Assignment Rule: parsed SKU is not in scope. The file routes to Unmatched Media File state on the job. No Media Assignment Candidate is created.
3. Job J3 transitions to `completed` with `unmatchedFileCount = 1`.
4. PR-A Workflow 7 produces a Media Upload Coverage Summary with `unmatched_media_file_count = 1`.
5. The Unmatched Media File record is not silently auto-assigned to a near-match SKU; it remains as evidence for later review (future operator-surface PR).
6. UPC does NOT appear.

Expected: Unmatched media files are recorded but not auto-assigned; coverage summary surfaces the count.

### Scenario PR-A-5: Multi-ZIP coverage (multiple ZIPs in one session)

1. Vendor V continues U1 and uploads ZIP `Z4.zip` covering S002. PR-A Workflow 2 runs successfully producing Product Media Assignment Evidence for S002.
2. PR-A Workflow 7 produces an updated Media Upload Coverage Summary CS2 with `media_assigned_sku_count = 2` (S001 and S002), `coverage_status = partial`, `previous_media_upload_coverage_summary_reference = CS1`.
3. `media.upload-coverage-summary.created` is emitted for CS2. CS1 is preserved for audit; U1's `latest_media_upload_coverage_summary_reference` now points to CS2.
4. Vendor V uploads ZIP `Z5.zip` covering S003. PR-A Workflow 2 runs successfully.
5. PR-A Workflow 7 produces CS3 with `media_assigned_sku_count = 3`, `coverage_status = complete`, `vendor_options_offered` excludes `download_missing_media_report` (since coverage is complete) and includes `continue_without_uploading` and `return_later`.
6. UPC does NOT appear.

Expected: Multiple ZIPs accumulate coverage; one ZIP is not treated as complete; the latest coverage summary is the session reference; prior summaries preserved.

### Scenario PR-A-6: Missing Main_1 with Main_2+ present (review path)

1. Within U1, vendor V uploads `S004_Main_2.png` and `S004_Main_3.png` (no `Main_1`).
2. PR-A Workflow 5: filename parses to `media_role = Main` for both. The session detects that S004 has Main_2 and Main_3 candidates but no Main_1 candidate. `media_matching_confidence = review_required` with `media_matching_confidence_sub_reason = main_one_missing_with_main_two_plus_present` is applied.
3. PR-A Workflow 6 routes candidates to review.
4. Media Manager does NOT silently promote Main_2 to primary.
5. UPC does NOT appear.

Expected: Main_1 primacy rule is enforced; auto-assignment is blocked until review.

### Scenario PR-A-7: Manual / Drag-and-Drop Upload with assignment hint

1. Vendor V drag-and-drops a file with non-canonical name `product-photo-1.png` and supplies a per-file assignment hint: `product_catalog_product_reference = S005`, `media_role = Main`, `display_order = 1`.
2. PR-A Workflow 3 runs:
   - Media Upload Job J4 with `job_type = manual_drag_drop` is created.
   - PR-A Workflow 5 parse disposition is `unparseable` (filename does not match canonical pattern), but the assignment hint provides product reference, role, and display order.
   - SKU-Based Media Assignment Rule: hint SKU = S005, in scope. `media_matching_confidence = clean`.
   - PR-A Workflows 8, 9, 10 run; Product Media Assignment Evidence A4 is created with `sku_reference = S005`, `assignment_source = manual_drag_drop_upload`, `media_usage_disposition = approved_by_default`.
   - `media.assignment-candidate.auto-assigned` is emitted.
3. UPC does NOT appear.

Expected: Manual uploads with hints are auto-assigned when the hint SKU is in scope; UPC is not used.

### Scenario PR-A-8: Image URL Ingestion with successful fetch and CIXCI-managed URL creation

1. Vendor V provides URL `https://vendor.example/img/S006_main.png` within an Image URL Ingestion Media Upload Job (`job_type = image_url`).
2. PR-A Workflow 4 runs:
   - Media Upload Job J5 is created with `source_image_url_reference_collection = ["https://vendor.example/img/S006_main.png"]`.
   - Integration Management is signaled to fetch. The fetch succeeds.
   - Source URL Fetch Result is recorded with `result_discriminator = fetched`, `fetched_content_hash = H1`, `integration_management_transport_reference` set.
   - `media.source-url-fetch-result.recorded` is emitted with `resultDiscriminator = fetched`.
   - PR-A Workflow 8 validates and processes the fetched content; passes.
   - PR-A Workflow 9 creates Media Asset MA6, Media Asset Version MAV6.1 with `cixci_media_asset_url_reference = platform-managed-ref-X`, `source_image_url_reference = "https://vendor.example/img/S006_main.png"`, `source_url_content_hash = H1`, `lifecycle_state = current`.
   - `media.media-asset-version.created` is emitted with `cixciMediaAssetUrlReference = platform-managed-ref-X` and `sourceImageUrlReference = "https://vendor.example/img/S006_main.png"`.
   - PR-A Workflow 5 derives SKU from the URL filename pattern: parsed SKU = S006, role = Main, display order = 1. SKU in scope. Auto-assignment proceeds.
   - PR-A Workflow 10 creates Product Media Assignment Evidence A6 with `sku_reference = S006`, `media_asset_version_reference = MAV6.1`, `media_usage_disposition = approved_by_default`.
3. Product Catalog later consumes Media Readiness Evidence for S006. The buyer export/download surface returns `cixci_media_asset_url_reference = platform-managed-ref-X`, NOT the vendor source URL.
4. UPC does NOT appear.

Expected: Vendor URL is captured as source-only; CIXCI Media Asset URL/Reference is the durable buyer-visible reference; UPC is not used.

### Scenario PR-A-9: Image URL Ingestion with failed fetch

1. Vendor V provides URL `https://vendor.example/img/S007_main.png`. Integration Management's fetch returns an unauthorized response.
2. PR-A Workflow 4 records Source URL Fetch Result with `result_discriminator = unauthorized` and `fetch_failure_reason_text = "401 Unauthorized"`.
3. `media.source-url-fetch-result.recorded` is emitted with `resultDiscriminator = unauthorized`.
4. PR-A Workflow 9 is NOT invoked for this URL; no Media Asset Version is created.
5. Media Upload Job J6 transitions to `completed` (other URLs in the job may have succeeded) or `failed` (if all URLs failed). The coverage summary surfaces the failure count.
6. UPC does NOT appear.

Expected: Failed fetch does not produce a Media Asset Version; the failure is recorded; no Product Media Assignment Evidence is created for the failed URL.

### Scenario PR-A-10: Source URL change detected and fail-safe applied

1. Time T0: vendor V provides URL `https://vendor.example/img/S008_main.png`. Fetch succeeds, content hash = H1. Media Asset Version MAV8.1 is created with `cixci_media_asset_url_reference = platform-ref-Y`, `source_url_content_hash = H1`, `lifecycle_state = current`. Buyer export sees `platform-ref-Y`.
2. Time T1 (later; trigger mechanism is PR-B, but the architectural rule is foundation in PR-A): a subsequent fetch of the same vendor URL returns content with hash H2 (different from H1).
3. PR-A foundation rule applies: Source URL Fetch Result records `result_discriminator = changed_content_detected` with `fetched_content_hash = H2`. `media.source-url-fetch-result.recorded` is emitted.
4. The changed content is held for re-ingestion (the full re-ingestion mechanism is PR-B). When re-ingested:
   - **Sub-case A: new content passes validation.** A new Media Asset Version MAV8.2 is created with `lifecycle_state = created` initially. Under PR-B, MAV8.2 will transition to `current` and MAV8.1 to `superseded`; until PR-B implements the supersession, MAV8.1 remains `current` and buyer-visible (PR-A architectural rule).
   - **Sub-case B: new content fails validation.** MAV8.2 transitions to `lifecycle_state = failed_candidate`. MAV8.1 remains `current` and buyer-visible. **Fail-safe rule applied: existing accepted buyer-visible media remains active when the new candidate fails validation.**
5. Throughout, the prior MAV8.1 is preserved in audit/history; never deleted.
6. UPC does NOT appear.

Expected: Source-URL content changes do not silently overwrite buyer-visible media; the fail-safe rule prevents a failed candidate from displacing the active version.

### Scenario PR-A-11: Buyer-usable-by-default disposition

1. PR-A Workflow 10 creates Product Media Assignment Evidence A7 for SKU S009. PR-A Workflow 12 defaults:
   - `media_usage_disposition = approved_by_default`
   - `buyer_usage_allowed = true`
   - `marketing_download_allowed = true`
2. PR-A Workflow 11 creates Media Readiness Evidence for S009 with the disposition propagated.
3. Product Catalog consumes the readiness evidence. The buyer export/download surface includes the `cixci_media_asset_url_reference` for the assigned Media Asset Version.
4. UPC does NOT appear.

Expected: Vendor-provided media via supported ingestion methods is buyer-usable by default with no per-asset approval required.

### Scenario PR-A-12: Restricted media excluded from buyer exports (foundation)

1. After successful auto-assignment for S010 (Product Media Assignment Evidence A8 with `media_usage_disposition = approved_by_default`), a System Admin issues a Media Restriction Evidence R1 against the underlying Media Asset Version with `restriction_type = restricted`.
2. PR-A Workflow 12 propagates the restriction: A8's `media_usage_disposition` transitions to `restricted`, `buyer_usage_allowed = false`, `marketing_download_allowed = false`.
3. PR-A Workflow 11 supersedes the prior Media Readiness Evidence for S010; the new evidence reflects the restricted disposition.
4. Product Catalog's buyer export/download surface excludes A8's Media Asset Version. The Buyer Media Export Readiness Reference is not satisfied (the disposition is not in the allowed set).
5. UPC does NOT appear.

Expected: Restricted media is excluded from buyer exports and marketing downloads.

### Scenario PR-A-13: UPC is preserved on Product Catalog records but not used in Media matching

1. The Product Catalog product record for SKU S001 carries both `sku = S001` and `upc = 123456789012` as preserved text identifiers (existing Product Catalog content; PR-A does not modify).
2. Within a Media Upload Session targeting that product, all Media-side matching (filename parse, ZIP folder match, manual upload hint match, image URL filename derivation match, Media Assignment Candidate creation, Product Media Assignment Evidence creation, Media Readiness Evidence creation, Media Upload Coverage Summary matching) uses `sku_reference = S001`.
3. UPC `123456789012` is never used as a Media-side matching key. UPC may appear on Product Catalog records that Media references by reference, but Media-side surfaces use SKU only.
4. The Missing Media Report content may include the Product Catalog accessory record's accessory name and SKU; UPC may also appear in the report content (because it appears on the underlying Product Catalog record), but the Media-side matching identifier in the report is SKU.

Expected: UPC is Product-Catalog-side context only; Media-side matching is SKU-only.

### Scenario PR-A-14: Vendor pauses session and returns later (Multi-Part Upload Completion State)

1. Vendor V's Media Upload Session U1 has `multi_part_upload_completion_state = open`. V has uploaded ZIPs covering S001 and S002 but not S003.
2. V signals "Return later". PR-A Workflow 1 (via API surface) transitions U1 to `multi_part_upload_completion_state = paused`. Child Media Upload Jobs to date are preserved.
3. The latest Media Upload Coverage Summary is preserved as the session's `latest_media_upload_coverage_summary_reference`.
4. Time later: V returns and re-enters U1. State is still `paused`. V uploads a new ZIP covering S003. Per PR-A Workflow 1, the session can accept new child jobs when in `open` or `paused` state; V's action implicitly transitions U1 to `open` (or a vendor-explicit "Resume" action does so). New child job is created and processed per PR-A Workflow 2.
5. PR-A Workflow 7 produces an updated Media Upload Coverage Summary.
6. V signals "Continue without uploading more" (or completion). U1 transitions to `multi_part_upload_completion_state = completed`. No further child jobs are accepted.
7. UPC does NOT appear.

Expected: Sessions support pause-resume; auto-close on inactivity is not introduced; vendor signals govern terminal state.

### PR-A verification checklist (across all scenarios above)

- **SKU is the matching identifier across all PR-A test scenarios. UPC does not appear as a matching/identity key in any Media-side step.**
- The `cixci_media_asset_url_reference` is the durable buyer-visible surface; the vendor source URL is captured for audit only and is never the durable reference.
- Folder SKU and filename SKU must agree for auto-assignment in ZIP jobs; disagreement routes to review.
- Missing `Main_1` while `Main_2+` present routes to review; Media Manager does not silently promote `Main_2`.
- Coverage Summary is versioned per child job completion; prior summaries are preserved for audit; the session keeps the latest reference.
- One ZIP is not treated as a complete image package; multiple ZIPs accumulate coverage.
- Source URL change detection produces `result_discriminator = changed_content_detected`; the prior `current` version remains active until PR-B explicitly supersedes; a failed candidate version transitions to `failed_candidate` and never becomes `current` (fail-safe).
- Default disposition for vendor-provided media is `approved_by_default`, `buyer_usage_allowed = true`, `marketing_download_allowed = true`. Restricted, revoked, expired, review-required, or failed dispositions exclude the media from buyer exports.
- The PR-A 10-event inventory is observable in scenarios: `media.upload-session.created`, `media.upload-job.created`, `media.upload-job.completed`, `media.upload-job.failed`, `media.assignment-candidate.created`, `media.assignment-candidate.review-required`, `media.assignment-candidate.auto-assigned`, `media.upload-coverage-summary.created`, `media.media-asset-version.created`, `media.source-url-fetch-result.recorded`.

## PR-B Test Scenarios - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section enumerates acceptance test scenarios for PR-B. Scenarios are architectural; they describe observable Media-side behavior, evidence records, and emitted events. Concrete fixtures, test data, and runtime test code are deferred to the developer.

### Scenario group 1 - Source URL re-ingestion and revalidation

#### Scenario 1.1 - Vendor-triggered re-ingestion, content unchanged

- Given: an existing `current` Media Asset Version backed by a Source Image URL Reference.
- When: a vendor submits a Source URL Re-Ingestion Request scoped to that URL, the request is approved, a Source URL Revalidation Job runs, and the transport returns the body with content hash matching the prior hash.
- Then: a Source URL Change Detection Result is recorded with `change_detection_result_discriminator = hash_unchanged`. No candidate Media Asset Version is created. The prior `current` remains active. The CIXCI Media Asset URL/Reference continues to resolve to the prior `current` version.
- Events emitted: `media.source-url-reingestion-request.created`, `media.source-url-revalidation-job.created`, `media.source-url-change-detection.recorded` (with discriminator `hash_unchanged`).

#### Scenario 1.2 - Vendor-triggered re-ingestion, content changed, candidate promotes successfully

- Given: an existing `current` Media Asset Version backed by a Source Image URL Reference.
- When: a vendor submits a Re-Ingestion Request, the request is approved, the Revalidation Job runs, the transport returns the body with a new content hash, a candidate Media Asset Version is created, and Validation, Processing, Readiness, AND Version Supersession Evidence all succeed.
- Then: the candidate transitions through `candidate` -> `accepted` -> `current`. The prior `current` transitions to `superseded`. Version Supersession Evidence is recorded. A new Product Media Assignment Evidence record is produced; the prior record is preserved unmodified. Media Usage Disposition is recalculated on the new evidence. Media Readiness Evidence is regenerated. The CIXCI Media Asset URL/Reference now resolves to the new `current`.
- Events emitted: `media.source-url-reingestion-request.created`, `media.source-url-revalidation-job.created`, `media.source-url-change-detection.recorded` (discriminator `hash_changed`), `media.media-asset-version.superseded`, `media.media-usage-disposition.recalculated`.

#### Scenario 1.3 - Vendor-triggered re-ingestion, content changed, candidate fails validation (fail-safe preserved)

- Given: an existing `current` Media Asset Version backed by a Source Image URL Reference.
- When: a vendor submits a Re-Ingestion Request, the Revalidation Job runs, the new content hash differs, a candidate is created, and Media Validation fails on the candidate.
- Then: the candidate transitions to `failed_candidate`. The prior `current` remains active. The CIXCI Media Asset URL/Reference continues to resolve to the prior `current`. No Version Supersession Evidence is recorded. The Media Validation Result captures the failure for audit.
- Events emitted: `media.source-url-reingestion-request.created`, `media.source-url-revalidation-job.created`, `media.source-url-change-detection.recorded` (discriminator `hash_changed`). No `media.media-asset-version.superseded`. No `media.media-asset-version.failed-candidate` (the state itself is the observable; no separate event per PR-B event discipline).

#### Scenario 1.4 - Vendor-triggered re-ingestion, fetch returns 404 / DNS failure

- When: the Revalidation Job invokes transport and Integration Management returns a transport-unreachable signal (5xx, DNS failure, timeout, connection refused).
- Then: a Source URL Change Detection Result is recorded with `change_detection_result_discriminator = fetch_unavailable`. No candidate is created. The prior `current` remains active.
- Events emitted: `media.source-url-change-detection.recorded` (discriminator `fetch_unavailable`).

#### Scenario 1.5 - Vendor-triggered re-ingestion, fetch returns 401 / 403

- When: the transport returns an authorization failure.
- Then: Change Detection Result discriminator is `fetch_unauthorized`. No candidate is created. Prior `current` remains active.
- Events emitted: `media.source-url-change-detection.recorded` (discriminator `fetch_unauthorized`).

#### Scenario 1.6 - Vendor-triggered re-ingestion, fetch returns 410 Gone

- When: the transport returns 410 (or transport-policy-equivalent expiry signal).
- Then: Change Detection Result discriminator is `fetch_expired`. No candidate is created. Prior `current` remains active. The Media Asset Version is NOT auto-restricted; restriction is an explicit workflow.
- Events emitted: `media.source-url-change-detection.recorded` (discriminator `fetch_expired`).

#### Scenario 1.7 - Vendor-triggered re-ingestion, redirect materially changes host

- Given: the source URL is `https://vendor-a.example.com/image123.jpg`.
- When: the transport follows a redirect to `https://vendor-x.example.org/image123.jpg` (a materially different host per Integration Management transport policy).
- Then: Change Detection Result discriminator is `fetch_redirected`. No candidate is created. The result routes to System Admin review. Prior `current` remains active. PR-B does NOT auto-accept the changed-host content.
- Events emitted: `media.source-url-change-detection.recorded` (discriminator `fetch_redirected`).

#### Scenario 1.8 - ETag-driven skip is validation_skipped (hint authority deferred to hash)

- Given: the prior fetch captured an ETag.
- When: the Revalidation Job sends an `If-None-Match` header (Integration Management transport behavior) and the transport returns 304 Not Modified.
- Then: Change Detection Result discriminator is `validation_skipped`. No body was fetched. The hint is recorded. No candidate is created. Prior `current` remains active.
- Events emitted: `media.source-url-change-detection.recorded` (discriminator `validation_skipped`).
- Note: a future revalidation pass that DOES fetch the body remains the authoritative comparison; ETag alone never confirms `hash_changed` or `hash_unchanged` at the architectural layer.

#### Scenario 1.9 - System-Admin-triggered re-ingestion for a vendor scope

- When: a System Admin submits a Re-Ingestion Request scoped to a vendor's Source Image URL References.
- Then: the request is auto-approved under System Admin authority, Revalidation Jobs are created per target URL, and each job runs through PR-B Workflow 3.
- Events emitted: `media.source-url-reingestion-request.created` (with `trigger_path = system_admin`), and one `media.source-url-revalidation-job.created` per target URL.

#### Scenario 1.10 - Scheduled revalidation pass

- Given: a System-Admin-configured scheduling policy.
- When: the scheduling policy fires and produces a Re-Ingestion Request with `trigger_path = scheduled`.
- Then: the request is treated as approved under the scheduling policy authority. Revalidation Jobs are created and run.
- Events emitted: `media.source-url-reingestion-request.created` (with `trigger_path = scheduled`).

#### Scenario 1.11 - Revalidation runs on a completed Media Upload Session

- Given: a Media Upload Session is in `lifecycle_state = completed` from PR-A; the `image_url` Media Upload Job inside it is also `completed`.
- When: a vendor or System Admin submits a Re-Ingestion Request targeting a Source Image URL Reference from that session.
- Then: a Revalidation Job is created. The Media Upload Session is NOT reopened. The Media Upload Job is NOT mutated. Revalidation operates on the Media Asset Version surface.
- Events emitted: `media.source-url-revalidation-job.created`.

### Scenario group 2 - Media Asset Version supersession

#### Scenario 2.1 - Promotion requires all four conditions

- Given: a `candidate` Media Asset Version.
- When: Media Validation succeeds, Media Processing succeeds, Media Readiness regenerates, and Version Supersession Evidence is recorded.
- Then: the candidate transitions `candidate` -> `accepted` -> `current`. Prior `current` transitions to `superseded`.

#### Scenario 2.2 - Promotion fails on Validation

- Given: a `candidate` Media Asset Version.
- When: Validation fails.
- Then: the candidate transitions to `failed_candidate`. Prior `current` remains active. No supersession evidence is recorded.

#### Scenario 2.3 - Promotion fails on Processing

- When: Validation succeeds; Processing fails.
- Then: the candidate transitions to `failed_candidate`. Prior `current` remains active.

#### Scenario 2.4 - Promotion fails on Readiness regeneration

- When: Validation and Processing succeed; Readiness regeneration fails (insufficient assignment evidence, missing required media profile).
- Then: the candidate transitions to `failed_candidate`. Prior `current` remains active.

#### Scenario 2.5 - Version Supersession Evidence reflects supersession trigger

- When: Version Supersession Evidence is recorded.
- Then: the `supersession_trigger` field on the evidence is one of `source_url_reingestion`, `vendor_reupload`, `system_admin_restoration`, or `system_admin_correction`. The chained references (Source URL Re-Ingestion Request reference, Revalidation Job reference, Change Detection Result reference) are populated when the trigger is `source_url_reingestion`.

#### Scenario 2.6 - Version lineage chain is traversable

- Given: Media Asset has had three successful supersessions over time (versions V1, V2, V3, V4).
- Then: V4 (`current`) has `supersedes_reference` pointing to V3. V3 (`superseded`) has `superseded_by_reference` pointing to V4. V3's `supersedes_reference` points to V2. V2's `superseded_by_reference` points to V3. The lineage chain is fully traversable.

#### Scenario 2.7 - Explicit rejection vs failed_candidate are distinct

- When: a reviewer explicitly rejects a `candidate` Media Asset Version.
- Then: the version transitions to `rejected`. The event `media.media-asset-version.rejected` is emitted. This is distinct from `failed_candidate`, which is the automatic Validation/Processing/Readiness failure outcome (no separate event).

### Scenario group 3 - Restriction, revocation, expiry

#### Scenario 3.1 - Vendor requests restriction; System Admin applies

- When: a vendor submits a Media Restriction Request with `requested_restriction_type = restricted`. A System Admin reviews and applies via PR-B Workflow 8.
- Then: Media Restriction Evidence is created with `restriction_type = restricted`, `lifecycle_state = active`, and `applied_actor_reference` populated with the System Admin actor. The target Media Asset Version transitions to `restricted`. Media Usage Disposition is recalculated to `restricted`. Media Readiness Evidence is regenerated.
- Events emitted: `media.restriction-request.created`, `media.restriction-evidence.applied`, `media.media-usage-disposition.recalculated`.

#### Scenario 3.2 - Vendor cannot apply restriction directly

- When: a vendor attempts to apply Media Restriction Evidence directly without System Admin intervention.
- Then: Tenant Company `check_access` denies the action. No Media Restriction Evidence is created. The vendor MAY submit a Media Restriction Request; the Request remains in `requested` until a System Admin applies it.

#### Scenario 3.3 - Revocation is modeled as restriction_type = revoked

- When: a System Admin applies Media Restriction Evidence with `restriction_type = revoked`.
- Then: the target Media Asset Version transitions to `revoked` lifecycle state. Media Usage Disposition is recalculated to `revoked`. No separate Revocation Evidence entity is created.
- Events emitted: `media.restriction-evidence.applied` (with `restriction_type = revoked` in payload).

#### Scenario 3.4 - Restriction lift creates new evidence (prior evidence not mutated)

- Given: an active Media Restriction Evidence record on a Media Asset Version.
- When: a System Admin lifts the restriction.
- Then: a NEW Media Restriction Evidence record is created capturing the lift (lift actor, lift reason, lift effective date). The prior evidence transitions to `superseded`. The prior evidence's `superseding_media_restriction_evidence_reference` is populated. **The prior evidence is NOT mutated or deleted.** The target Media Asset Version transitions back to `current` (if it was previously `current` and no other restriction applies). Media Usage Disposition is recalculated. Media Readiness Evidence is regenerated.
- Events emitted: `media.restriction-evidence.superseded` (with `supersession_trigger = restriction_lifted`), `media.media-usage-disposition.recalculated`.

#### Scenario 3.5 - Restriction auto-expires on restriction_expiration_date

- Given: an active Media Restriction Evidence with `restriction_expiration_date` set to a near-future date.
- When: the `restriction_expiration_date` elapses.
- Then: the evidence transitions to `expired_restriction`. The target Media Asset Version transitions appropriately. Media Usage Disposition is recalculated.
- Events emitted: `media.restriction-evidence.superseded` (with `supersession_trigger = restriction_auto_expired`), `media.media-usage-disposition.recalculated`.

#### Scenario 3.6 - Media Asset Version expiration_date elapses

- Given: a `current` Media Asset Version with `expiration_date` set.
- When: the `expiration_date` elapses and Media Expiry Evaluation runs.
- Then: Media Manager creates Media Restriction Evidence with `restriction_type = expired` via PR-B Workflow 8. The Media Asset Version transitions to `expired`. Media Usage Disposition is recalculated to `expired`.
- Events emitted: `media.restriction-evidence.applied` (with `restriction_type = expired`), `media.media-usage-disposition.recalculated`.

#### Scenario 3.7 - Disposition recalculation propagates across all affected assignments

- Given: a Media Asset Version is referenced by multiple Product Media Assignment Evidence records (e.g., the version is assigned to multiple accessory products).
- When: the version is restricted (or revoked, or expired).
- Then: Media Usage Disposition Recalculation runs across all affected Product Media Assignment Evidence records. Each affected record's `media_usage_disposition` is updated. Media Readiness Evidence is regenerated for each.
- Events emitted: `media.media-usage-disposition.recalculated` (per affected record OR as a batched representation per API hardening choice).

#### Scenario 3.8 - Per-version restriction discipline (Phase 1)

- Given: a Media Asset has three Media Asset Versions: V1 (`superseded`), V2 (`current`), V3 (`candidate`).
- When: a System Admin restricts V2.
- Then: only V2 transitions to `restricted`. V1 remains `superseded`. V3 remains `candidate`. Asset-wide restriction is NOT implied.

### Scenario group 4 - SKU alias mapping (review-assist only)

#### Scenario 4.1 - Vendor proposes alias; System Admin approves

- When: a vendor proposes a SKU Alias Mapping with `alias_scope = vendor`. A System Admin reviews and approves.
- Then: the mapping transitions `proposed` -> `approved`. SKU Alias Approval Evidence (field collection) is populated. Subsequent Unmatched Media File evaluations in the vendor scope may resolve through this mapping.
- Events emitted: `media.sku-alias-mapping.proposed`, `media.sku-alias-mapping.approval-recorded` (with `approval_outcome = approved`).

#### Scenario 4.2 - Vendor proposes alias; System Admin rejects

- When: a vendor proposes a mapping. A System Admin reviews and rejects.
- Then: the mapping transitions `proposed` -> `rejected`. Subsequent Unmatched Media File evaluations do NOT use this mapping.
- Events emitted: `media.sku-alias-mapping.proposed`, `media.sku-alias-mapping.approval-recorded` (with `approval_outcome = rejected`).

#### Scenario 4.3 - Alias resolves to canonical SKU; candidate routes to review

- Given: an approved SKU Alias Mapping `OLD-SKU-123` -> canonical SKU reference for `NEW-SKU-456`.
- When: a vendor uploads a file `OLD-SKU-123_Main_1.jpg` (filename SKU `OLD-SKU-123`) inside a folder `OLD-SKU-123/` (folder SKU `OLD-SKU-123`). The PR-A SKU-Based Media Assignment Rule produces an Unmatched Media File (no Product Catalog product has SKU `OLD-SKU-123`).
- Then: PR-B Workflow 13 evaluates the file's parsed SKU against approved alias mappings. The mapping resolves `OLD-SKU-123` to `NEW-SKU-456`. Media Manager creates a Media Assignment Candidate with `media_matching_confidence = review_required`, `media_matching_confidence_sub_reason = alias_resolved_pending_review`, and `sku_alias_mapping_reference` populated. The candidate is NOT `auto_assignable`.
- Events emitted: `media.assignment-candidate.created` (PR-A event), `media.assignment-candidate.review-required` (PR-A event, reused with the new sub-reason).

#### Scenario 4.4 - Alias does NOT override folder/filename SKU disagreement

- Given: an approved SKU Alias Mapping `OLD-SKU-123` -> `NEW-SKU-456`.
- When: a vendor uploads a file `OLD-SKU-123_Main_1.jpg` (filename SKU `OLD-SKU-123`) inside a folder `DIFFERENT-SKU/` (folder SKU disagrees).
- Then: the PR-A folder/filename disagreement rule fires. The candidate routes to review with the PR-A sub-reason for folder/filename disagreement. **Alias resolution does NOT override the disagreement.** The candidate is NOT `auto_assignable`. Alias resolution may be captured as supplementary evidence but the routing reason is the folder/filename disagreement.

#### Scenario 4.5 - Alias-Based Auto Assignment Rule (negative) is enforced

- Given: an approved SKU Alias Mapping.
- Then: under no condition does an alias-resolved candidate have `media_assignment_review_state = auto_assignable`. The negative rule is enforced regardless of confidence signals, vendor history, or repeated alias resolution.

#### Scenario 4.6 - Alias mapping expires

- Given: an approved SKU Alias Mapping with `expiration_date` in the near future.
- When: the `expiration_date` elapses.
- Then: the mapping transitions to `expired`. Subsequent Unmatched Media File evaluations do NOT use the expired mapping. Prior alias-resolved candidates are NOT retroactively affected; their review disposition stands.

#### Scenario 4.7 - Alias scope discipline (global / vendor / import_session)

- When: an approved global-scope alias and a vendor-scope alias both resolve the same `alias_sku_text` to different canonical SKUs (a configuration error).
- Then: PR-B does NOT define automatic conflict resolution between scopes in Phase 1; this scenario is an open question (see `assumptions-open-questions.md`). The architectural surface allows multiple matches; the conflict-resolution rule is deferred.

### Scenario group 5 - Large-file and upload failure recovery

#### Scenario 5.1 - Child job fails; parent session stays open

- Given: a Media Upload Session in `lifecycle_state = open` with two completed child Media Upload Jobs and one in-flight child job.
- When: the in-flight child job transitions to `failed`.
- Then: the parent Media Upload Session remains `open`. The two prior completed child jobs' outputs (Media Asset Versions, Product Media Assignment Evidence, Coverage Summary records, Readiness Evidence) are preserved. The Media Upload Coverage Summary is updated to reflect the failure and offers the retry option via `vendor_options_offered`.
- Events emitted: `media.upload-job.failed` (PR-A event), `media.upload-coverage-summary.created` (PR-A event, new version of the coverage summary).

#### Scenario 5.2 - Retry creates new sibling job

- Given: a child Media Upload Job in `failed` state with `retry_count = 0`.
- When: the vendor initiates a retry via PR-B Workflow 14.
- Then: a new sibling Media Upload Job is created under the same parent session with `retry_count = 1`, `last_retry_at` populated, `retry_reason_reference` populated, and `prior_media_upload_job_reference` pointing back to the original. Upload Failure Recovery Evidence is recorded.
- Events emitted: `media.upload-job.created` (PR-A event, for the new sibling), `media.upload-failure-recovery.recorded`.

#### Scenario 5.3 - Retry re-uploads files already succeeded; duplicates flagged for review

- Given: an original child job that succeeded on 8 of 10 files and failed on 2.
- When: the vendor retries by re-uploading the original 10-file ZIP.
- Then: PR-A's content hash logic detects 8 duplicates. The duplicates are flagged as `review_required` via the PR-A Media Assignment Candidate Review Workflow. They do NOT silently overwrite or duplicate prior Media Asset Versions. The 2 previously-failed files are processed normally and produce new Media Asset Versions.

#### Scenario 5.4 - Original failed job is preserved (not mutated)

- Given: a failed original child job.
- When: a retry produces a successful sibling job.
- Then: the original job remains in `failed` (or `failed_with_partial_successes`) lifecycle state. Its fields at the time of failure are preserved. Its `retry_count` value at the time of failure is preserved.

#### Scenario 5.5 - Partial success sub-discriminator

- When: a child job overall fails (e.g., the ZIP extraction succeeded but mid-batch processing crashed) and 4 of 10 files produced Media Asset Versions before the crash.
- Then: the child job's lifecycle state is `failed` with sub-discriminator `failed_with_partial_successes`. The 4 successful Media Asset Versions and their associated Product Media Assignment Evidence records are preserved. The retry path (PR-B Workflow 14) operates on the remaining 6 files.

#### Scenario 5.6 - Upload Failure Recovery Evidence preserves prior successes by reference

- When: Upload Failure Recovery Evidence is recorded.
- Then: the `preserved_prior_successes_collection` field carries Media Asset Version references for the files that succeeded in the original job before failure. These references are NOT mutated; they remain valid and continue to resolve.

#### Scenario 5.7 - Multiple retries increment retry_count

- Given: an original job. Vendor retries once (sibling 1, `retry_count = 1`); sibling 1 fails. Vendor retries again (sibling 2, `retry_count = 2`); sibling 2 succeeds.
- Then: three Upload Failure Recovery Evidence records exist (one per failure-recovery pair, though the chain may be visualized differently per implementation). The original job, sibling 1, and sibling 2 are all preserved under the same Media Upload Session. The session remains `open` throughout.

### Scenario group 6 - Cross-flow correlation

#### Scenario 6.1 - End-to-end re-ingestion-to-supersession trace via correlation_reference

- When: a vendor-triggered re-ingestion flows successfully through to a Version Supersession and Media Usage Disposition Recalculation.
- Then: the events `media.source-url-reingestion-request.created`, `media.source-url-revalidation-job.created`, `media.source-url-change-detection.recorded`, `media.media-asset-version.superseded`, and `media.media-usage-disposition.recalculated` all share the same `correlation_reference`.

#### Scenario 6.2 - End-to-end restriction-to-recalculation trace via correlation_reference

- When: a vendor submits a restriction request, a System Admin applies it, and Media Usage Disposition recalculates.
- Then: `media.restriction-request.created`, `media.restriction-evidence.applied`, and `media.media-usage-disposition.recalculated` share the same `correlation_reference`.

### Scenario group 7 - Boundary discipline (negative scenarios)

#### Scenario 7.1 - PR-B does NOT generate buyer Media Export Packages

- When: a successful Version Supersession completes.
- Then: PR-B does NOT generate a buyer Media Export Package, buyer Marketing Download Package, or Buyer Media Download Request. PR-B does NOT emit `media.export-eligibility.recalculated` or any buyer-export event. The Media Usage Disposition Recalculation event is Media-owned readiness language only.

#### Scenario 7.2 - PR-B does NOT modify Product Catalog records

- When: any PR-B workflow runs.
- Then: no PR-B workflow writes to Product Catalog records. Product Catalog visibility may consume Media Readiness Evidence per existing PR-A patterns; that consumption is Product-Catalog-side and is not modified by PR-B.

#### Scenario 7.3 - PR-B does NOT introduce new Tenant Company roles or capability flags

- Then: no PR-B workflow requires a new role definition or new capability flag. All authority checks flow through existing `check_access`.

#### Scenario 7.4 - PR-B does NOT introduce new Logs & Audit retention classes

- Then: no PR-B evidence record requires a new retention class. PR-B evidence records reuse existing `audit_reference` patterns.

#### Scenario 7.5 - PR-B does NOT modify `openapi-contracts.md`

- Then: the file `modules/media-image-asset-management/openapi-contracts.md` is unchanged after PR-B application.
