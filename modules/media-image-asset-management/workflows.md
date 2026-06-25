# Media / Image Asset Management Workflows

This document defines proposal-level Media Manager workflows for vendor media upload after accessory catalog import.

## Workflow Principles

- Accessory data import and media upload are separate workflows.
- Vendors import accessory product records first through Product Catalog / Accessory Catalog.
- Vendors then manage images and videos through Media Manager.
- Accessory import workflow should not process image/video files.
- Product Catalog owns accessory records and consumes Media readiness evidence before buyer visibility/export.
- Media Management owns upload, validation, processing, assignment, required media profiles, readiness, media update events, and media audit history.

## Post-Accessory-Import Handoff

1. Vendor completes accessory import in Product Catalog / Accessory Catalog.
2. Accessory records are saved without requiring media upload.
3. Platform presents action button: `Upload Images in Media Manager`.
4. Vendor selects the action and is routed to Media Manager.
5. Media Manager loads the source accessory import batch reference and Product Catalog product references.
6. Media Manager creates or refreshes Media Readiness Summary and Media Readiness Evidence.

Missing required media affects readiness and Product Catalog buyer visibility/export rules, but the imported accessory records remain saved, editable, and visible to vendor/System Admin.

## Media Manager Upload Methods

Media Manager supports:

- ZIP upload
- manual upload
- image URLs
- media file upload
- future video upload support where configured

For external media pulls/pushes, Integration Management owns transfer/delivery/receipt evidence. Logs & Audit owns immutable file/upload evidence.

## ZIP Upload Workflow

1. Vendor selects Upload ZIP.
2. Media Management creates ZIP Upload Job.
3. Media Management extracts candidate assets and validates file types, size, naming, image quality, and assignment candidates.
4. Media Management maps assets to Product Catalog product/variant references where possible.
5. Media Management creates Media Asset records and Product Media Assignment records with Media Asset ID/version, assignment version, role, validation result, processing result, disposition, and audit reference.
6. Media Management updates Media Readiness Evidence with exact asset/assignment/validation/processing references.
7. Product Catalog later consumes readiness evidence before buyer visibility/export.

## Manual Upload Workflow

1. Vendor selects Upload Manually.
2. Vendor uploads one or more media files.
3. Media Management validates and processes assets.
4. Vendor or system assigns assets to product/variant references and media roles.
5. Media Management records Product Media Assignment evidence and updates Media Readiness Evidence with exact bindability references.

## Image URL Workflow

1. Vendor selects Add Image URLs.
2. Vendor provides URL-based image references.
3. Media Management creates URL ingestion job.
4. Integration Management owns external transfer/receipt evidence where applicable.
5. Media Management validates fetched media and creates assignment/readiness records with exact asset/assignment/validation references.

## Future Video Workflow

Video upload support is a configured future-capable path. Where enabled, Media Management owns video upload, validation, processing, assignment, readiness state, and media update events. Required video rules remain governed by versioned Required Media Profile configuration.

## Missing Media Summary Workflow

1. Media Manager receives source import batch and product references.
2. Media Management evaluates assigned media against Required Media Profile.
3. Media Manager presents summary, for example:
   - `50 accessories imported`
   - `0 accessories have images`
   - `50 accessories missing required Main image`
   - `Status: Not Retail Ready`
4. Vendor chooses Upload ZIP, Upload Manually, Add Image URLs, Download Missing Media Report, or leaves Media Manager.

## Missing Media Report Workflow

1. Vendor selects Download Missing Media Report.
2. Media Management generates report content from source media readiness state.
3. Report includes SKU, UPC, accessory name, product reference, required media type, readiness status, validation errors, and assignment status.
4. Logs & Audit owns immutable report/file/download evidence.

## Product Media Assignment Bindability Workflow

1. Media Management assigns a Media Asset version to a product/variant role.
2. Assignment records include assignment version/hash, assigned role, role disposition, validation result reference/version, processing result reference/version, applied-vs-ignored state, supersession reference, review state, and audit reference.
3. If assignment is superseded, ignored, stale, failed, or conflicting, Media Readiness Evidence must be superseded or moved to review/blocking state.
4. Superseded assignments must not continue to satisfy Required Media Profile rules.
5. Product Catalog may consume assignment references but does not process media files or own Media readiness workflow.

## Required Media Profile Evaluation

1. Media Management loads a versioned Required Media Profile.
2. Media Management evaluates required Main image, image count placeholder, video placeholder, category/vendor/buyer-type/Product Type requirements, and override/exception mode.
3. Media Management records profile version/hash, source timestamp, freshness, expiration, source disposition, applied-vs-ignored state, supersession, review state, and audit reference.
4. Missing required Main image defaults to hard blocker for buyer visibility/export unless System Admin configuration or authorized override evidence allows otherwise.
5. If Required Media Profile evidence is missing, stale, expired, superseded, ignored, or conflicting, Media Readiness Evidence should block or route Product Catalog consumption to review.
6. Profile changes must not silently rewrite historical visibility, export, invoice, analytics, or audit evidence.

## Required Media Readiness Evaluation

1. Media Management loads Required Media Profile evidence.
2. Media Management evaluates concrete Product Media Assignment and Media Asset evidence.
3. Media Management verifies Main media asset reference/version, assignment reference/version, assigned role disposition, validation result/version, processing result/version, and applied-vs-ignored state.
4. Media Management writes Media Readiness Evidence with exact bindability references and status/disposition.
5. Missing, stale, expired, superseded, ignored, failed, or conflicting asset/assignment/validation/processing/profile evidence blocks readiness or routes it to review.

Summary booleans such as Main image assigned or validated are convenience projections only. Product Catalog consumption must bind to exact asset, assignment, validation, and processing evidence.

## Override Workflow

1. Authorized System Admin requests media readiness override.
2. Tenant Company authority evidence is checked for user/admin authority.
3. Media Management records Media Readiness Override Evidence with scope, reason, mode, effective date, expiration date, source version/hash, freshness timestamp, source disposition, applied-vs-ignored state, supersession reference, review state, and audit reference.
4. Product Catalog consumes override evidence rather than inferring visibility or override authority independently.
5. Expired, superseded, ignored, stale, or conflicting override evidence must not satisfy Product Catalog buyer visibility/export evaluation.

## Vendor Leaves Without Uploading

If vendor leaves Media Manager without uploading images/videos:

- Product records remain saved.
- Records remain editable and visible to vendor and System Admin.
- Records remain blocked from buyer visibility/export when required media is a hard blocker.
- Product Catalog may make products buyer-visible/exportable only after required media is uploaded, validated, assigned, and readiness evidence is updated, unless authorized override evidence allows otherwise.

## Product Catalog Consumption Workflow

1. Product Catalog requests or receives Media Readiness Evidence for product/variant references.
2. Product Catalog validates that evidence includes exact Media Asset ID/version, Product Media Assignment/version, validation result/version, processing result/version, Required Media Profile/version, and override evidence where applicable.
3. Product Catalog blocks or routes buyer visibility/export to review when required media evidence is missing, stale, failed, superseded, ignored, conflicting, or hard-blocked.
4. Product Catalog consumes override evidence where present.
5. Product Catalog owns final buyer visibility/export projection.

Media Management does not own final Product Catalog buyer visibility projection. Media readiness remains asset-readiness only, not full product sellability.

## PR-A Workflows - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section introduces twelve workflows for the PR-A hardening pass. Workflows are additive and reference the entities and field/state/reference/contract-rule surfaces defined in `data-model.md`. Existing Media workflows (Post-Accessory-Import Handoff, the existing ZIP / Manual / Image URL upload workflows, Missing Media Summary Workflow, Missing Media Report Workflow, Product Media Assignment Bindability Workflow, Required Media Profile Evaluation) are not redefined; PR-A layers on top and clarifies where appropriate.

### Cross-module workflow choreography reaffirmed

- Media / Image Asset Management initiates and owns all twelve workflows below.
- Product Catalog is consulted by reference (source accessory import batch, Product Catalog product reference set) and consumes Media Readiness Evidence downstream. Product Catalog is not mutated by these workflows.
- Integration Management owns external HTTP fetch mechanics for image URL jobs. Media Manager records the Source URL Fetch Result by reference.
- Logs & Audit File Tracking owns immutable evidence retention via existing Audit Record patterns. Each workflow below triggers Logs & Audit retention by reference where applicable.
- Tenant Company owns authority decisions for Media Assignment Candidate Review approvals and Media Restriction Evidence (foundation). Authority checks flow through existing Tenant Company patterns.

---

### PR-A Workflow 1 - Media Upload Session Initialization

- **Trigger:** Vendor enters Media Manager from the Post-Accessory-Import Handoff action button, or directly. Vendor signals intent to begin a new upload session for a specific accessory import batch / Product Catalog product reference set.
- **Steps:**
  1. Identify vendor scope from Tenant Company.
  2. Identify the source accessory import batch reference from Product Catalog (if available) and the Product Catalog product reference set in scope.
  3. Create a Media Upload Session with `multi_part_upload_completion_state = open`, `vendor_entity_scope_reference`, `source_accessory_import_batch_reference`, `product_catalog_product_reference_collection`, and `submitted_by_actor_reference`.
  4. Initialize an empty `child_media_upload_job_reference_collection`.
  5. Emit `media.upload-session.created`.
  6. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - The session is the parent of all subsequent child Media Upload Jobs for this accessory import context.
  - Multiple sessions for the same accessory import batch are permitted; each session is its own coverage scope. Cross-session aggregation is not introduced by PR-A.
  - The session does not own accessory record ingestion or UPC validation; those remain Product Catalog territory.
  - The session is not auto-closed on inactivity; vendor signals govern state transitions.

---

### PR-A Workflow 2 - ZIP Upload Job Processing

- **Trigger:** Vendor selects "Upload ZIP" within an `open` Media Upload Session and provides a ZIP file.
- **Steps:**
  1. Create a child Media Upload Job with `job_type = zip`, `media_upload_session_reference`, `source_file_reference`, `submitted_by_actor_reference`, and `lifecycle_state = received`.
  2. Emit `media.upload-job.created`.
  3. Extract candidate files from the ZIP. For each extracted file, create a ZIP Extracted File Record (as field-collection on the job) capturing `extracted_filename`, `extracted_folder_reference`, `content_type`, `file_size`, `content_hash`, and `extraction_outcome`.
  4. Transition `lifecycle_state` to `validating`.
  5. For each ZIP Extracted File Record with `extraction_outcome = extracted`, invoke PR-A Workflow 5 (Filename Parsing and SKU Matching) to produce a Media Filename Parse Result.
  6. For each ZIP Extracted File Record (regardless of `extraction_outcome`), invoke PR-A Workflow 8 (Media Validation and Processing) to produce a Media Validation Result and (for accepted files) a Media Processing Result.
  7. For each accepted file (validation passed and processing complete), invoke PR-A Workflow 9 (Media Asset Version Creation) to create a Media Asset and Media Asset Version with CIXCI Media Asset URL/Reference.
  8. For each accepted file, invoke PR-A Workflow 5 (continued) to produce a Media Assignment Candidate via SKU-Based Media Assignment Rule evaluation.
  9. For each Media Assignment Candidate with `media_matching_confidence = clean`, invoke PR-A Workflow 10 (Product Media Assignment Evidence Creation) for auto-assignment promotion.
  10. For each Media Assignment Candidate with `media_matching_confidence = review_required`, invoke PR-A Workflow 6 (Media Assignment Candidate Review).
  11. For each parsed file whose SKU is not in scope, record an Unmatched Media File entry (as field-collection on the job).
  12. Transition `lifecycle_state` to `completed` (or `failed` if the ZIP itself was unreadable / oversized / archive-nested at the job level).
  13. Emit `media.upload-job.completed` (or `media.upload-job.failed`).
  14. Invoke PR-A Workflow 7 (Missing Media Coverage Evaluation) to produce or update the Media Upload Coverage Summary.
  15. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - One ZIP is not a complete image package. The coverage summary in step 14 determines what the vendor sees next.
  - ZIP bomb / nested-archive scenarios produce `extraction_outcome = archive_nested` for the affected record; no recursive extraction is attempted.
  - Auto-assignment requires clean SKU evidence per the SKU-Based Media Assignment Rule. Folder-vs-filename SKU disagreement routes to review (not auto-assign).
  - UPC is not used in any step of this workflow.

---

### PR-A Workflow 3 - Manual / Drag-and-Drop Upload Processing

- **Trigger:** Vendor selects "Upload Manually" or drag-and-drops one or more files within an `open` Media Upload Session.
- **Steps:**
  1. Create a child Media Upload Job with `job_type = manual_drag_drop`, `media_upload_session_reference`, `submitted_by_actor_reference`, and `lifecycle_state = received`.
  2. Emit `media.upload-job.created`.
  3. For each uploaded file, capture the per-file source file reference, content type, file size, and content hash on the job's per-file collection.
  4. Transition `lifecycle_state` to `validating`.
  5. For each uploaded file whose filename matches the canonical pattern, invoke PR-A Workflow 5 (Filename Parsing and SKU Matching). For files whose filename does not match the canonical pattern, the parse disposition is `unparseable` and the file routes to Unmatched Media File state unless the vendor provides a per-file assignment hint (product / variant / role / display order).
  6. For each file (parseable or with assignment hint), invoke PR-A Workflow 8 (Media Validation and Processing).
  7. For each accepted file, invoke PR-A Workflow 9 (Media Asset Version Creation).
  8. For each accepted file, invoke PR-A Workflow 5 (continued) or the assignment-hint path to produce a Media Assignment Candidate.
  9. For each Media Assignment Candidate with `media_matching_confidence = clean`, invoke PR-A Workflow 10 (Product Media Assignment Evidence Creation).
  10. For each Media Assignment Candidate with `media_matching_confidence = review_required`, invoke PR-A Workflow 6 (Media Assignment Candidate Review).
  11. Transition `lifecycle_state` to `completed` (or `failed` if all files failed validation at the job level).
  12. Emit `media.upload-job.completed` (or `media.upload-job.failed`).
  13. Invoke PR-A Workflow 7 (Missing Media Coverage Evaluation).
  14. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - Manual uploads with no filename pattern and no assignment hint route to Unmatched Media File state; they are not silently auto-assigned.
  - Vendor-supplied assignment hints must still satisfy the SKU-Based Media Assignment Rule (the hint SKU must be in scope).
  - UPC is not used in any step of this workflow.

---

### PR-A Workflow 4 - Image URL Ingestion Job Processing

- **Trigger:** Vendor selects "Add Image URLs" within an `open` Media Upload Session and provides one or more image URLs.
- **Steps:**
  1. Create a child Media Upload Job with `job_type = image_url`, `media_upload_session_reference`, `source_image_url_reference_collection`, `submitted_by_actor_reference`, and `lifecycle_state = received`.
  2. Emit `media.upload-job.created`.
  3. For each vendor URL, signal Integration Management to fetch the image content. Integration Management owns the external HTTP transport mechanics; Media Manager does not perform the transport.
  4. For each fetched URL, record a Source URL Fetch Result (reference / evidence surface) with `integration_management_transport_reference` (where applicable; placeholder reference language applies if no specific hook exists in Phase 1), `source_image_url_reference`, `result_discriminator`, `fetched_content_hash` (where applicable), and `fetch_failure_reason_text` (where applicable).
  5. Emit `media.source-url-fetch-result.recorded` carrying the `result_discriminator` value (`fetched`, `failed`, `blocked`, `unauthorized`, `unsupported`, or `changed_content_detected`).
  6. For each Source URL Fetch Result with `result_discriminator = fetched`, invoke PR-A Workflow 8 (Media Validation and Processing) on the fetched content.
  7. For each fetched URL whose content passed validation and processing, invoke PR-A Workflow 9 (Media Asset Version Creation). The Media Asset Version carries `source_image_url_reference` (for audit) and `source_url_content_hash`. The `cixci_media_asset_url_reference` is set to the platform-managed durable reference; the vendor source URL is NOT the value of this field.
  8. For each accepted URL, invoke PR-A Workflow 5 (filename derivation from URL path where the URL filename matches the canonical pattern) OR the vendor assignment hint path to produce a Media Assignment Candidate.
  9. For each Media Assignment Candidate, route to auto-assignment (Workflow 10) or review (Workflow 6) per `media_matching_confidence`.
  10. For each Source URL Fetch Result with `result_discriminator = failed`, `blocked`, `unauthorized`, or `unsupported`, do NOT create a Media Asset Version; the failure is recorded on the Source URL Fetch Result and surfaces in the coverage summary.
  11. For each Source URL Fetch Result with `result_discriminator = changed_content_detected`, hold for re-ingestion (the full re-ingestion lifecycle is PR-B; PR-A records the signal only).
  12. Transition `lifecycle_state` to `completed` (or `failed` if all URL fetches failed at the job level).
  13. Emit `media.upload-job.completed` (or `media.upload-job.failed`).
  14. Invoke PR-A Workflow 7 (Missing Media Coverage Evaluation).
  15. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - Vendor source URLs are source-only. They are captured for audit and source-URL change detection. They are never the value of the CIXCI Media Asset URL/Reference and are never sent to buyers as the durable media URL.
  - Integration Management owns the external fetch transport. Media Manager records the Source URL Fetch Result by reference.
  - UPC is not used in any step of this workflow.

---

### PR-A Workflow 5 - Filename Parsing and SKU Matching

- **Trigger:** A file (ZIP extracted, manual upload, or URL-derived filename) is presented for parsing within an `open` Media Upload Session.
- **Steps:**
  1. Apply Canonical Media Filename pattern recognition: `{SKU}_{Role}_{Sequence}.ext`. Recognize common separator variations and normalize internally where possible.
  2. Produce a Media Filename Parse Result with `source_filename_reference`, `canonical_filename_reference`, `parsed_sku`, `parsed_folder_sku` (for ZIP jobs), `media_role`, `display_order`, `parse_disposition` (one of `clean`, `separator_variant_normalized`, `ambiguous`, `unparseable`), and `separator_variant_reference` (where applicable).
  3. Evaluate the SKU-Based Media Assignment Rule:
     - For ZIP jobs: folder SKU and filename SKU must agree, and the SKU must be present in the source accessory import batch or Product Catalog product reference set in scope.
     - For manual jobs: filename SKU must be present in scope (or assignment hint).
     - For image URL jobs: filename-derived SKU or assignment hint must be present in scope.
  4. If the parse disposition is `clean` or `separator_variant_normalized` AND the SKU-Based Media Assignment Rule passes cleanly, set `media_matching_confidence = clean` on the candidate.
  5. If the parse disposition is `ambiguous`, OR the folder SKU and filename SKU disagree, OR `Main_1` is missing while `Main_2+` is present, OR a duplicate filename / duplicate content hash condition is detected, set `media_matching_confidence = review_required` with the appropriate `media_matching_confidence_sub_reason` (one of `folder_filename_sku_mismatch`, `main_one_missing_with_main_two_plus_present`, `duplicate_filename`, `duplicate_content_hash`, `ambiguous_parse`, `assignment_hint_disagreement`).
  6. If the parse disposition is `unparseable` OR the parsed SKU is not present in scope, route to Unmatched Media File state (do not create a Media Assignment Candidate).
  7. For files routed to candidate creation, create a Media Assignment Candidate with `media_assignment_candidate_reference`, `media_upload_session_reference`, `media_upload_job_reference`, `media_filename_parse_result_reference`, `product_catalog_product_reference`, `sku_reference`, `media_role`, `display_order`, `media_matching_confidence`, and `media_assignment_review_state = pending`.
  8. Emit `media.assignment-candidate.created`.
  9. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - `Main_1` is the primary image. If Main images exist but `Main_1` is missing, route to review; do not silently promote `Main_2` to primary.
  - The matching key is SKU. UPC is not consulted at any step.
  - Approved SKU alias mappings are deferred to PR-B; under PR-A, no alias rules apply.

---

### PR-A Workflow 6 - Media Assignment Candidate Review

- **Trigger:** A Media Assignment Candidate is created with `media_matching_confidence = review_required` and `media_assignment_review_state = pending`.
- **Steps:**
  1. Transition `media_assignment_review_state` to `review_required` on the candidate.
  2. Emit `media.assignment-candidate.review-required`.
  3. Surface the candidate to a reviewer (System Admin or authorized vendor actor per Tenant Company authority) via a Media Manager review queue (queue surface is implementation-level; PR-A captures the workflow).
  4. The reviewer evaluates the candidate and either approves or rejects:
     - **Approve:** transition `media_assignment_review_state` to `approved`. Invoke PR-A Workflow 10 (Product Media Assignment Evidence Creation) to promote the candidate.
     - **Reject:** transition `media_assignment_review_state` to `rejected`. No Product Media Assignment Evidence is created. The file remains on the job side as Unmatched Media File-equivalent record evidence (depending on the rejection reason).
  5. Capture `reviewing_actor_reference` on the candidate.
  6. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - Approval requires explicit actor reference. Auto-approval of `review_required` candidates is not permitted.
  - Advanced review approval routing (escalation, multi-step approval, batch approval) is deferred to a future operator-surface PR.
  - Rejection does not delete the underlying Media Asset Version (if one was created); the version is preserved in audit/history. Rejection prevents Product Media Assignment Evidence creation only.

---

### PR-A Workflow 7 - Missing Media Coverage Evaluation

- **Trigger:** A child Media Upload Job (any `job_type`) transitions to `completed` or `failed`.
- **Steps:**
  1. Identify the Media Upload Session (`media_upload_session_reference` on the child job).
  2. Identify the in-scope imported accessory SKU collection (`imported_accessory_sku_collection`) from the source accessory import batch / Product Catalog product reference set on the session.
  3. Identify the media-assigned SKU collection (`media_assigned_sku_collection`): the SKUs that have at least one promoted Product Media Assignment Evidence in this session so far.
  4. Identify the unmatched media file count across all child jobs in the session.
  5. For each imported accessory SKU, evaluate the per-product Missing Required Media Result (`required_media_role_collection`, `missing_required_media_role_collection`, `assignment_status_summary`) by consulting the Required Media Profile and the current Product Media Assignment Evidence set.
  6. Determine `coverage_status`: `complete` (every imported accessory SKU has at least the required Main_1 and all other required roles per profile), `partial` (some have media but not all required roles), or `none` (no imported accessory SKU has any media).
  7. Create a new Media Upload Coverage Summary record with the data above, `evaluated_after_media_upload_job_reference`, and `vendor_options_offered` (one or more of: `upload_another_zip`, `upload_manually_drag_drop`, `add_image_urls`, `download_missing_media_report`, `continue_without_uploading`, `return_later`).
  8. Update the session's `latest_media_upload_coverage_summary_reference` to point to the new summary. Prior summaries are preserved for audit (not deleted).
  9. Emit `media.upload-coverage-summary.created`.
  10. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - The Coverage Summary is session-scoped. Cross-session aggregation is not introduced by PR-A.
  - The matching identifier is SKU. UPC is not used in any step.
  - The Coverage Summary is read-model evidence; Product Catalog still owns final buyer visibility/export decisions via its consumption of Media Readiness Evidence.

---

### PR-A Workflow 8 - Media Validation and Processing

- **Trigger:** A file (ZIP extracted, manual upload, or URL-fetched content) is presented for validation within an `open` Media Upload Session.
- **Steps:**
  1. Validate the file against the Phase 1 evidence surfaces: accepted format (`.png`, `.jpg`, `.jpeg`); rejected formats (GIF, HEIC, TIFF); corrupt-file detection; MIME/extension match; duplicate filename within the session; duplicate content hash within the session; malicious file signature heuristics (runtime mechanism is implementation-level; PR-A captures the evidence surface); oversized files; ZIP bomb / nested archive flag (carried from ZIP extraction); MIME / declared content type mismatch.
  2. Produce a Media Validation Result with the per-file outcome.
  3. If validation passes, invoke processing (Phase 1 processing mechanism is implementation-level; PR-A captures the evidence surface). Produce a Media Processing Result.
  4. If validation fails, do NOT proceed to processing. The Media Validation Result captures the failure reason; no Media Asset Version is created (see PR-A Workflow 9).
  5. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - Validation produces evidence; runtime mechanisms (specific signature databases, virus scanning, image-processing libraries) are implementation-level and out of scope for PR-A.
  - Duplicate content hash within the session: Phase 1 default is warn + flag for review (a new candidate is created with `media_matching_confidence = review_required` and `media_matching_confidence_sub_reason = duplicate_content_hash`).
  - Failed validation produces no Media Asset Version. The file's source record (ZIP Extracted File Record, manual file record, or Source URL Fetch Result) is preserved for audit.

---

### PR-A Workflow 9 - Media Asset Version Creation

- **Trigger:** A file completed PR-A Workflow 8 with validation passed and processing completed.
- **Steps:**
  1. If no Media Asset exists for this file (most common case: a new file), create a Media Asset with `cixci_media_asset_url_reference` (platform-managed; opaque in Phase 1), `vendor_entity_scope_reference`, `upload_method` (one of `zip`, `manual_drag_drop`, `image_url`, `future_api`), `original_filename`, `content_type`, `file_size`, `audit_reference`.
  2. Create a Media Asset Version with `media_asset_version_reference`, `media_asset_reference`, `media_upload_job_reference`, `cixci_media_asset_url_reference` (the version's specific URL reference; PR-A treats this as the durable surface), `source_image_url_reference` (only when `upload_method = image_url`), `source_url_content_hash` (only when `upload_method = image_url`), `content_hash`, `media_validation_result_reference`, `media_processing_result_reference`, and `lifecycle_state = created`.
  3. If this is the first version for the Media Asset, transition the version's `lifecycle_state` to `current`. Set the Media Asset's `current_media_asset_version_reference` to point to this version.
  4. If this is a re-ingestion of a URL-sourced asset (foundation-only flow in PR-A): the new version is created with `lifecycle_state = created` and held; it does NOT automatically transition to `current` (PR-A captures the architectural rule; the full supersession workflow is PR-B). The prior `current` version remains active until PR-B explicitly supersedes it.
  5. **Fail-safe rule applied at this step:** if the new candidate version is from URL re-ingestion AND its validation fails AT ANY STEP, the version transitions to `failed_candidate`; the prior `current` version remains active and buyer-visible. PR-A captures this rule.
  6. Emit `media.media-asset-version.created`.
  7. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - The `cixci_media_asset_url_reference` is never the vendor source URL. Even for URL-ingested media, the durable reference is platform-managed.
  - Media Asset Versions are immutable. Amendments produce new versions.
  - Superseded versions are preserved in audit/history; never deleted.
  - The full version supersession lifecycle (supersession on re-upload, supersession on URL change, restoration after supersession, archive policy) is PR-B. PR-A creates new versions and captures the lifecycle state; it does not detail the full transition mechanism beyond the fail-safe rule.

---

### PR-A Workflow 10 - Product Media Assignment Evidence Creation

- **Trigger:** A Media Assignment Candidate transitions to `auto_assignable` (via PR-A Workflow 5 step 4) or to `approved` (via PR-A Workflow 6 step 4).
- **Steps:**
  1. Verify the underlying Media Asset Version exists with `lifecycle_state = current` (for first-time assignment) or, for re-assignment flows, with the appropriate version reference.
  2. Verify the Media Validation Result is `passed` and the Media Processing Result is `completed`.
  3. Create a Product Media Assignment Evidence record (existing entity, hardened with new fields) with:
     - `product_media_assignment_id` (canonical identifier).
     - `media_assignment_candidate_reference` (back-pointer to the candidate promoted).
     - `media_asset_reference` and `media_asset_version_reference`.
     - `product_catalog_product_reference` and `variant_reference` (where applicable).
     - `sku_reference` (Media-side matching key; never UPC).
     - `assigned_role` (canonical media role).
     - `role_priority_order` and `display_order` (from filename sequence).
     - `assignment_source` (one of `zip_upload`, `manual_drag_drop_upload`, `image_url_ingestion`, `api_upload`, `admin_correction`).
     - `media_validation_result_reference` and `media_processing_result_reference`.
     - `media_usage_disposition` (default `approved_by_default`; see PR-A Workflow 12).
     - `buyer_media_export_readiness_reference` (foundation reference; set per PR-A Workflow 11 readiness rules).
     - `applied_vs_ignored_state` = applied.
     - `audit_reference`.
  4. Transition the Media Assignment Candidate's `media_assignment_review_state` to `approved` (terminal).
  5. If this assignment supersedes a prior Product Media Assignment Evidence for the same product/variant/role/display order, set the prior evidence's supersession reference; the prior assignment no longer satisfies Media Readiness Evidence.
  6. Emit `media.assignment-candidate.auto-assigned` (for auto-assignment from PR-A Workflow 5) OR re-use the existing `media.product-media-assignment-created` event for review-promoted assignments (existing event; PR-A does not introduce a new event for the review-approved path).
  7. Invoke PR-A Workflow 11 (Media Readiness Evidence Creation).
  8. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - Auto-assignment is permitted only when `media_matching_confidence = clean` on the candidate.
  - UPC is not used as a matching/identity key. Where existing Product Media Assignment Evidence content references "SKU/UPC reference", PR-A's canonical interpretation is `sku_reference`.
  - Superseded assignments do not satisfy Media Readiness Evidence (existing rule preserved).

---

### PR-A Workflow 11 - Media Readiness Evidence Creation

- **Trigger:** A Product Media Assignment Evidence record is created or superseded; OR a Required Media Profile change requires re-evaluation; OR a Media Usage Disposition change occurs.
- **Steps:**
  1. Load the relevant Required Media Profile (versioned per existing Media patterns).
  2. Identify the product / variant in scope and the Product Media Assignment Evidence set for that product/variant.
  3. Evaluate, for each required role in the profile, whether a non-superseded, non-ignored, non-stale, non-failed Product Media Assignment Evidence exists with `media_usage_disposition` in the allowed set (`approved_by_default` for Phase 1 default).
  4. Create (or supersede) Media Readiness Evidence (existing entity, hardened) with:
     - `media_readiness_evidence_id`.
     - `product_catalog_product_reference` and `variant_reference`.
     - `sku_reference` (Media-side matching key; never UPC).
     - `vendor_entity_scope_reference`.
     - `source_accessory_import_batch_reference`.
     - `required_media_profile_reference` and version/hash.
     - `main_media_asset_reference` and `main_media_asset_version_reference`.
     - `product_media_assignment_reference` and version/hash.
     - `assigned_media_role` and disposition.
     - `media_validation_result_reference` and version/hash.
     - `media_processing_result_reference` and version/hash.
     - `media_usage_disposition` (propagated from Product Media Assignment Evidence).
     - `required_media_complete_flag`.
     - `media_readiness_status`.
     - `retail_ready_from_media_standpoint_flag`.
     - `blocker_warning_override_disposition`.
     - `supersession_reference` (where applicable).
     - `audit_reference`.
  5. Emit the existing `media.readiness-evidence-created` event (PR-A does not introduce a new readiness event).
  6. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - **Media Usage Disposition propagation rule (canonical PR-A rule):** Media Readiness Evidence is only satisfied when the underlying Product Media Assignment Evidence has `media_usage_disposition = approved_by_default`. Restricted, revoked, expired, review_required, or failed dispositions do not satisfy readiness.
  - UPC is not used as a matching/identity key on Media Readiness Evidence. PR-A's canonical interpretation of "SKU/UPC reference" on existing Media Readiness Evidence content is `sku_reference`.
  - Buyer Media Export Readiness Reference is foundation-only; PR-A records the reference but the concrete buyer export package is PR-B.

---

### PR-A Workflow 12 - Media Usage Disposition Defaulting

- **Trigger:** A Product Media Assignment Evidence record is created (via PR-A Workflow 10) OR a Media Restriction Evidence record is created (foundation-only path) OR a Required Media Profile change requires re-evaluation.
- **Steps:**
  1. On Product Media Assignment Evidence creation, set `media_usage_disposition = approved_by_default` for vendor-provided media via supported ingestion methods (`zip`, `manual_drag_drop`, `image_url`, `future_api`).
  2. Set `buyer_usage_allowed = true` and `marketing_download_allowed = true` on the assignment.
  3. If a Media Restriction Evidence record subsequently exists for the underlying Media Asset Version (foundation only in PR-A; restriction workflow is PR-B), the disposition transitions according to the Restriction Evidence's `restriction_type`:
     - `restricted` -> `media_usage_disposition = restricted`; `buyer_usage_allowed = false`; `marketing_download_allowed = false`.
     - `revoked` -> `media_usage_disposition = revoked`; `buyer_usage_allowed = false`; `marketing_download_allowed = false`.
     - `expired` -> `media_usage_disposition = expired`; `buyer_usage_allowed = false`; `marketing_download_allowed = false`.
  4. If a validation or processing failure has occurred on the underlying Media Asset Version, set `media_usage_disposition = failed`; `buyer_usage_allowed = false`; `marketing_download_allowed = false`.
  5. If human review is required (administrative hold; not introduced by PR-A but the disposition is reserved), set `media_usage_disposition = review_required`; `buyer_usage_allowed = false`; `marketing_download_allowed = false`.
  6. Audit. Trigger Logs & Audit retention via the existing Audit Record pattern.
- **Discipline:**
  - The default for vendor-provided media via supported ingestion methods is `approved_by_default`. Per-asset buyer-use approval is not required for the default path.
  - Restriction, revocation, expiry, review-required, and failed dispositions exclude the media from buyer exports and marketing downloads.
  - The full Media Restriction Evidence workflow (initiation, approval routing, propagation, restoration) is PR-B. PR-A's Workflow 12 captures only the defaulting and propagation rules.

---

### Phase 1 deliberate non-behaviors (Media workflows side)

- No detailed Source URL Re-Ingestion / Versioning workflow (PR-B).
- No detailed Media Restriction / Revocation / Expiry workflow beyond Workflow 12's propagation rule (PR-B).
- No buyer marketing download package generation workflow (PR-B).
- No CDN / signed URL / rendition workflow (PR-B).
- No advanced unmatched media review approval routing (future operator-surface PR).
- No approved SKU alias mapping resolution (PR-B).
- No per-asset operator display-order override (future PR).
- No Product Catalog buyer visibility/export workflow modifications.
- No Integration Management transport workflow modifications.
- No Logs & Audit File Tracking workflow modifications.

## PR-B Workflows - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section defines PR-B workflows layered on the PR-A foundation. PR-A workflows are preserved without rename or reorder. PR-B introduces exactly 15 workflows.

### Active Version Preservation (contract rule, not workflow)

The prior `current` Media Asset Version remains active until Validation, Processing, Readiness, AND Version Supersession Evidence succeed for the candidate. This is a canonical contract rule (see `data-model.md` PR-B section). It is not a separate workflow; it is enforced inside PR-B Workflow 5 (Media Asset Version Supersession). The CIXCI Media Asset URL/Reference continues to resolve to the prior `current` version under any failure path. The vendor source URL remains the source-only audit reference and is never the durable buyer-visible reference.

### PR-B Workflow 1 - Source URL Re-Ingestion Request

**Trigger:** vendor or System Admin submits a Source URL Re-Ingestion Request; or a Media-owned scheduling policy initiates a scheduled request.

1. Media Manager receives the request input (target Source Image URL Reference set, requesting actor, vendor scope, trigger path, optional target Media Asset Version reference, optional scheduling policy reference, request reason).
2. Media Manager creates a Source URL Re-Ingestion Request record in `lifecycle_state = requested` with the input fields and an audit reference.
3. Tenant Company `check_access` is invoked to evaluate authority. Vendors may request for vendor-scoped Source Image URL References; System Admins may request for any scope; scheduled requests carry the scheduling policy reference and are evaluated against System-Admin-configured scheduling authority.
4. If authority is granted, the request transitions to `approved`. The approval actor reference and approval evidence reference are recorded.
5. On `approved`, Media Manager creates one Source URL Revalidation Job per target Source Image URL Reference and invokes PR-B Workflow 2.
6. If authority is denied or the request is explicitly rejected by System Admin, the request transitions to `rejected`. The rejection actor reference is recorded.
7. Media Manager emits `media.source-url-reingestion-request.created` on transition to `requested`.

### PR-B Workflow 2 - Source URL Revalidation Job

**Trigger:** approved Source URL Re-Ingestion Request creates a Source URL Revalidation Job (PR-B Workflow 1, step 5).

1. Media Manager creates the Source URL Revalidation Job with `job_lifecycle_state = received`, capturing the target Source Image URL Reference, target Media Asset Version reference, and the requesting Source URL Re-Ingestion Request reference.
2. Media Manager emits `media.source-url-revalidation-job.created`.
3. Media Manager invokes Integration-Management-owned transport by reference, passing the target Source Image URL Reference, the prior Source URL Content Hash (for transport-level optimization), and any prior ETag or Last-Modified hints.
4. The job transitions to `validating` while awaiting the transport reply (or while evaluating transport-cached hints).
5. Integration Management performs the HTTP fetch (or skips body fetch based on ETag or Last-Modified). The transport returns response code, response headers (including ETag and Last-Modified), and body (when fetched).
6. Media Manager records the Source URL ETag Reference and Source URL Last-Modified Reference (when present in the transport reply) as supplemental hint fields.
7. The job transitions to `processing` and invokes PR-B Workflow 3 (Source URL Change Detection).
8. PR-B Workflow 3 produces a Source URL Change Detection Result. The job transitions to `completed` (or `failed` if a transport-level failure prevented change detection entirely).

### PR-B Workflow 3 - Source URL Change Detection

**Trigger:** PR-B Workflow 2 enters `processing`.

1. Media Manager evaluates the transport reply.
2. **Transport-level success with body fetched:** Media Manager computes the Source URL Content Hash from the fetched body. The new hash is compared against the prior hash captured on the target Media Asset Version.
   - If the new hash equals the prior hash, the Source URL Change Detection Result is recorded with `change_detection_result_discriminator = hash_unchanged`. No candidate is created. The job in PR-B Workflow 2 transitions to `completed`.
   - If the new hash differs, the Source URL Change Detection Result is recorded with `change_detection_result_discriminator = hash_changed`. A candidate Media Asset Version is created with `lifecycle_state = candidate` and `supersedes_reference` pointing to the prior `current` version. PR-B Workflow 4 is invoked.
3. **Transport-level success with body NOT fetched (ETag or Last-Modified hint suggests no change):** Media Manager records the Source URL Change Detection Result with `change_detection_result_discriminator = validation_skipped`. The hint values are recorded as supplemental fields. No candidate is created. The job transitions to `completed`. The hash authority rule still stands: if any doubt exists or the next revalidation pass fetches the body, that pass's hash comparison remains authoritative.
4. **Transport-level failure:** the Source URL Change Detection Result is recorded with the appropriate discriminator:
   - `fetch_unavailable` - DNS failure, connection refused, timeout, 5xx, or transport-policy-equivalent.
   - `fetch_unauthorized` - 401, 403, or transport-policy-equivalent.
   - `fetch_expired` - 410 (Gone), or transport-policy-equivalent.
   - `fetch_redirected` - the redirect materially changed host or path per Integration Management transport policy; the result routes to System Admin review.
   In all failure cases, no candidate is created. The prior `current` Media Asset Version remains active. The job in PR-B Workflow 2 transitions to `completed` (the detection result was successfully recorded) or `failed` (the transport failure prevented even recording the result; this is rare and is itself an audit-worthy event).
5. Media Manager emits `media.source-url-change-detection.recorded` with the discriminator in the payload.

### PR-B Workflow 4 - Candidate Media Asset Version Validation

**Trigger:** PR-B Workflow 3 produces `change_detection_result_discriminator = hash_changed` and creates a candidate Media Asset Version; OR a vendor re-upload (manual, ZIP, or future API) produces a candidate.

1. The candidate Media Asset Version is in `lifecycle_state = candidate`.
2. Media Manager invokes Media Validation against the candidate (file type, size, naming, image quality, content hash, format normalization signals; per existing PR-A Validation behavior). A Media Validation Result is produced.
3. If validation fails, the candidate transitions to `failed_candidate`. PR-B Workflow 6 (Failed Candidate Version Handling) is invoked.
4. If validation succeeds, Media Manager invokes Media Processing against the candidate (format normalization, JPEG-to-PNG where supported, transparent-background PNG where supported, rendition placeholders per existing PR-A Processing behavior). A Media Processing Result is produced.
5. If processing fails, the candidate transitions to `failed_candidate`. PR-B Workflow 6 is invoked.
6. If processing succeeds, Media Manager regenerates Media Readiness Evidence with the new candidate's references.
7. If readiness regeneration fails (insufficient assignment evidence, missing required media profile, or other readiness-block conditions), the candidate transitions to `failed_candidate`. PR-B Workflow 6 is invoked.
8. If readiness regeneration succeeds, the candidate transitions to `accepted`. PR-B Workflow 5 (Media Asset Version Supersession) is invoked.

### PR-B Workflow 5 - Media Asset Version Supersession

**Trigger:** PR-B Workflow 4 produces an `accepted` candidate; OR an explicit restoration of a prior version goes through the same pipeline.

1. The candidate is in `lifecycle_state = accepted`.
2. Media Manager prepares Version Supersession Evidence with: the candidate-version reference, the prior `current` Media Asset Version reference, the supersession trigger (`source_url_reingestion`, `vendor_reupload`, `system_admin_restoration`, `system_admin_correction`), the Validation Result reference, the Processing Result reference, the Media Readiness Evidence reference, and the supersession actor reference.
3. Tenant Company `check_access` is invoked for the supersession actor.
4. If authority is granted, Media Manager records Version Supersession Evidence with audit reference.
5. The candidate transitions to `current`. The prior `current` version transitions to `superseded`. The Media Asset's `current_media_asset_version_reference` is updated to point at the new current. The inverse pointers `superseded_by_reference` (on the prior version) and `supersedes_reference` (on the new current version) are populated.
6. A new Product Media Assignment Evidence record is produced for the new `current` version (preserving PR-A assignment behavior). The prior Product Media Assignment Evidence record is preserved unmodified with `media_asset_version_reference` still pointing at the (now `superseded`) prior version.
7. Media Manager invokes PR-B Workflow 10 (Media Usage Disposition Recalculation) to ensure the Media Usage Disposition surface is up-to-date.
8. Media Manager emits `media.media-asset-version.superseded`.

### PR-B Workflow 6 - Failed Candidate Version Handling

**Trigger:** PR-B Workflow 4 produces a Validation, Processing, or Readiness failure.

1. The candidate transitions to `failed_candidate` (PR-A fail-safe state).
2. The prior `current` Media Asset Version remains active. The Media Asset's `current_media_asset_version_reference` is NOT updated. The CIXCI Media Asset URL/Reference continues to resolve to the prior `current` version.
3. The failure reason reference is recorded on the candidate (validation failure detail, processing failure detail, or readiness block detail).
4. The vendor source URL remains the source-only audit reference and is never promoted as the durable buyer-visible reference.
5. Media Manager does NOT emit a separate `media.media-asset-version.failed-candidate` event; the failure is observable via the Media Validation Result and Media Processing Result records produced in PR-B Workflow 4 and via the Source URL Change Detection Result (when the candidate was produced via re-ingestion).
6. The vendor and System Admin may observe the `failed_candidate` state via the Media Asset Version history view. A subsequent retry path (new Source URL Re-Ingestion Request, new vendor upload) may produce a new candidate; the new candidate enters PR-B Workflow 4 independently.

### PR-B Workflow 7 - Media Restriction Request

**Trigger:** vendor or System Admin submits a Media Restriction Request.

1. Media Manager receives the request input (target Media Asset / Media Asset Version, requesting actor, vendor scope, requested `restriction_type`, requested effective date, optional expiration date, reason text).
2. Media Manager creates a Media Restriction Request record in `lifecycle_state = requested` with the input fields and an audit reference.
3. Tenant Company `check_access` is invoked to evaluate authority. Vendors may request restriction for vendor-scoped Media Asset Versions; System Admins may request for any scope.
4. **Vendor cannot apply restriction directly.** A vendor request, even when authority-granted at the request level, only transitions to `approved` and produces a Media Restriction Evidence record when a System Admin applies it via PR-B Workflow 8.
5. A System Admin may submit a request and immediately apply it; or a System Admin may apply an existing vendor request.
6. If the request is explicitly rejected by System Admin, it transitions to `rejected`. The rejection actor reference is recorded.
7. Media Manager emits `media.restriction-request.created` on transition to `requested`.

### PR-B Workflow 8 - Media Restriction Evidence Application

**Trigger:** an approved Media Restriction Request enters application; OR a System Admin applies restriction directly without a prior vendor request.

1. Tenant Company `check_access` is invoked for the System Admin actor.
2. Media Manager creates a Media Restriction Evidence record with:
   - `lifecycle_state = active`.
   - `restriction_type` per the request (`restricted`, `revoked`, or `expired`). **Revocation is `restriction_type = revoked`; no separate Revocation Evidence entity is introduced.**
   - `media_restriction_request_reference` populated if a Request preceded the application.
   - `applied_actor_reference` populated with the System Admin actor.
   - `restriction_application_workflow_reference` populated with the workflow execution reference.
   - `restriction_effective_date` populated.
   - `restriction_expiration_date` populated if applicable.
   - `restriction_reason_reference` populated.
   - `audit_reference` populated.
3. The target Media Asset Version transitions to `restricted` (or `revoked` if `restriction_type = revoked`, or `expired` if `restriction_type = expired`) as a Media Asset Version lifecycle state.
4. The Media Restriction Request (if applicable) transitions to `approved`.
5. Media Manager invokes PR-B Workflow 10 (Media Usage Disposition Recalculation) for affected Product Media Assignment Evidence records.
6. Media Manager emits `media.restriction-evidence.applied`.

### PR-B Workflow 9 - Media Restriction Lift and Expiry Evaluation

**Trigger:** System Admin lifts a restriction; OR the `restriction_expiration_date` on an active Media Restriction Evidence elapses; OR the `expiration_date` on a Media Asset Version or Product Media Assignment Evidence elapses (Media Expiry Evaluation).

1. **Restriction Lift path (System Admin action):**
   - Tenant Company `check_access` is invoked for the System Admin actor.
   - Media Manager creates a NEW Media Restriction Evidence record capturing the lift (lift actor, lift reason, lift effective date, audit reference). **Prior evidence is not mutated.**
   - The prior active Media Restriction Evidence transitions to `superseded`. The `superseding_media_restriction_evidence_reference` on the prior record is populated.
   - The target Media Asset Version transitions from `restricted` / `revoked` / `expired` back to `current` (if the version was previously `current` and no other restriction applies) or remains in its prior lifecycle state if other restrictions apply.
   - PR-B Workflow 10 is invoked.
   - Media Manager emits `media.restriction-evidence.superseded`.
2. **Restriction Expiration path (`restriction_expiration_date` elapsed):**
   - Media Manager evaluates Media Restriction Evidence records whose `restriction_expiration_date` has elapsed.
   - For each, Media Manager transitions the evidence to `expired_restriction`. The evidence is NOT mutated; the lifecycle state change is the only transition.
   - The target Media Asset Version transitions appropriately (similar to the lift path).
   - PR-B Workflow 10 is invoked.
   - Media Manager emits `media.restriction-evidence.superseded` (the expired_restriction state is a form of supersession for event-payload purposes).
3. **Media Expiry Evaluation path (`expiration_date` on Media Asset Version or Product Media Assignment Evidence elapsed):**
   - Media Manager evaluates Media Asset Versions and Product Media Assignment Evidence records whose `expiration_date` has elapsed.
   - For each, Media Manager creates a Media Restriction Evidence record with `restriction_type = expired` via PR-B Workflow 8 (so the audit trail flows through the standard application workflow).
   - The target Media Asset Version transitions to `expired`.
   - PR-B Workflow 10 is invoked.
4. **Trigger mechanism is implementation-level.** PR-B does not specify whether Media Expiry Evaluation runs on a schedule, on read, or per-asset. The contract rule and workflow surface are documented; the trigger is open.

### PR-B Workflow 10 - Media Usage Disposition Recalculation

**Trigger:** Media Restriction Evidence applied, lifted, or expired; OR Media Asset Version superseded, revoked, or expired; OR Media Expiry Evaluation; OR explicit Media Admin recalculation request.

1. Media Manager identifies all Product Media Assignment Evidence records whose `media_asset_version_reference` points to the affected Media Asset Version.
2. For each affected Product Media Assignment Evidence record, Media Manager evaluates:
   - Active Media Restriction Evidence records (`lifecycle_state = active`) for the Media Asset Version.
   - `expiration_date` on the Media Asset Version (if elapsed, restriction is implied).
   - `expiration_date` on the Product Media Assignment Evidence record (if elapsed, restriction is implied).
   - The Media Asset Version `lifecycle_state` (`current`, `superseded`, `restricted`, `revoked`, `expired`, `failed_candidate`).
3. Media Manager recalculates the `media_usage_disposition` value using the PR-A enumeration:
   - `restricted` - if an active Media Restriction Evidence with `restriction_type = restricted` applies.
   - `revoked` - if an active Media Restriction Evidence with `restriction_type = revoked` applies.
   - `expired` - if an active Media Restriction Evidence with `restriction_type = expired` applies, or if an `expiration_date` has elapsed.
   - `review_required` - if the underlying Media Assignment Candidate has `media_assignment_review_state = review_required` (per PR-A behavior).
   - `failed` - if the underlying Media Asset Version is `failed_candidate` (per PR-A behavior).
   - `approved_by_default` - if none of the above applies (PR-A default).
4. Media Manager updates the Product Media Assignment Evidence record's `media_usage_disposition` and `media_usage_disposition_recalculation_reference`.
5. Media Manager regenerates Media Readiness Evidence reflecting the recalculated disposition.
6. The exclusion rule (canonical): `restricted`, `revoked`, `expired`, `review_required`, `failed` dispositions exclude the affected Media Asset Version from Media Readiness Evidence as buyer-visible. The Buyer Media Export Readiness Reference (PR-A foundation) is recalculated accordingly.
7. Media Manager emits `media.media-usage-disposition.recalculated`.

### PR-B Workflow 11 - SKU Alias Mapping Proposal

**Trigger:** vendor or System Admin proposes a SKU Alias Mapping; OR Media Manager observes a recurring filename SKU pattern that does not match any canonical SKU but resolves consistently to a single canonical SKU candidate (this is a Phase 1 architectural surface; concrete auto-proposal detection is implementation-level).

1. Media Manager receives the proposal input (`alias_sku_text`, `canonical_sku_reference`, proposed `alias_scope`, optional `vendor_entity_scope_reference`, optional `import_session_reference`, optional `expiration_date`, proposal reason).
2. Media Manager creates a SKU Alias Mapping record with `lifecycle_state = proposed` and the input fields and an audit reference.
3. Tenant Company `check_access` is invoked for the proposing actor; vendors may propose vendor-scoped mappings; System Admins may propose any scope.
4. The mapping remains in `proposed` until PR-B Workflow 12 (Approval) decides.
5. Media Manager emits `media.sku-alias-mapping.proposed`.

### PR-B Workflow 12 - SKU Alias Mapping Approval

**Trigger:** System Admin reviews a `proposed` SKU Alias Mapping.

1. Tenant Company `check_access` is invoked for the System Admin actor against existing System Admin scope.
2. The System Admin records an approval outcome: `approved` or `rejected`. The approval evidence field collection on SKU Alias Mapping is populated (approval actor, Tenant Company authority reference, approval reason, approval timestamp, approval outcome).
3. **On `approved`:** the mapping transitions to `lifecycle_state = approved`. Subsequent Unmatched Media File evaluations may resolve through this mapping per PR-B Workflow 13.
4. **On `rejected`:** the mapping transitions to `lifecycle_state = rejected`. Subsequent Unmatched Media File evaluations do NOT use this mapping.
5. Media Manager emits `media.sku-alias-mapping.approval-recorded` with `approval_outcome` discriminator in the payload.

### PR-B Workflow 13 - Alias-Based Assignment Review

**Trigger:** PR-A SKU-Based Media Assignment Rule produces an Unmatched Media File.

1. Media Manager evaluates the Unmatched Media File's parsed SKU against approved SKU Alias Mappings in scope:
   - `global` scope: always applies.
   - `vendor` scope: applies when the mapping's `vendor_entity_scope_reference` matches the current vendor scope.
   - `import_session` scope: applies when the mapping's `import_session_reference` matches the current Media Upload Session or accessory import batch reference.
2. If no approved SKU Alias Mapping resolves the file's parsed SKU, the file remains an Unmatched Media File (per PR-A behavior). Workflow exits.
3. If an approved SKU Alias Mapping resolves the file's parsed SKU to a canonical SKU reference, Media Manager creates a Media Assignment Candidate with:
   - `media_matching_confidence = review_required`.
   - `media_matching_confidence_sub_reason = alias_resolved_pending_review`.
   - `media_assignment_review_state = review_required`.
   - `sku_alias_mapping_reference` populated with the resolving mapping.
4. **Alias-Based Auto Assignment Rule (negative):** the candidate is NOT `auto_assignable`. Aliases never produce `auto_assignable` candidates in Phase 1.
5. **Folder / filename disagreement rule (preserved):** if the file shows folder SKU disagreement with filename SKU, alias resolution does NOT override the disagreement. The candidate still routes to review with the PR-A sub-reason for folder/filename disagreement. Alias resolution may be captured as supplementary evidence on the candidate but does not change the review disposition.
6. The candidate enters the existing PR-A Media Assignment Candidate Review Workflow. The reviewer (vendor or System Admin per Tenant Company `check_access`) approves or rejects the candidate.
7. Media Manager reuses the PR-A event `media.assignment-candidate.review-required` for the alias-resolved candidate. PR-B does NOT introduce a new event for alias-routed review.

### PR-B Workflow 14 - Upload Failure Recovery

**Trigger:** a child Media Upload Job transitions to `failed` or `failed_with_partial_successes`; the vendor (or System Admin) initiates a retry via the Coverage Summary's `vendor_options_offered` or a comparable Media Manager surface.

1. Media Manager presents the failure to the vendor (and System Admin where applicable) via the Media Upload Coverage Summary's `vendor_options_offered`. Prior successful child jobs in the same session are preserved.
2. The vendor (or System Admin) initiates a retry. Tenant Company `check_access` is invoked.
3. Media Manager creates a new sibling Media Upload Job under the same Media Upload Session. The new job's:
   - `media_upload_session_reference` is the same parent session.
   - `job_type` mirrors the original job's `job_type`.
   - `retry_count` is the original job's `retry_count + 1`.
   - `last_retry_at` is the current timestamp.
   - `retry_reason_reference` is populated.
   - `prior_media_upload_job_reference` points back to the original failed job.
4. Media Manager creates an Upload Failure Recovery Evidence record capturing:
   - `media_upload_session_reference`.
   - `original_media_upload_job_reference`.
   - `retry_media_upload_job_reference`.
   - `failure_reason_reference` (the reason captured on the original job).
   - `preserved_prior_successes_collection` (Media Asset Version references for files that succeeded before failure).
   - `recovery_actor_reference`.
   - `tenant_company_authority_reference`.
   - `recovery_timestamp`.
   - `audit_reference`.
5. The new sibling Media Upload Job enters PR-A's existing job-type-specific processing workflow (ZIP, manual / drag-and-drop, image URL, or future API).
6. **Duplicate detection on retry:** when the retry re-uploads files that already succeeded in the original job, PR-A's content hash logic flags duplicates as `review_required` via the existing PR-A Media Assignment Candidate Review Workflow. Duplicates do NOT silently overwrite or duplicate prior Media Asset Versions.
7. The original Media Upload Job is NOT mutated. Its `lifecycle_state` remains `failed` (or `failed_with_partial_successes`). Its `retry_count` value at the time of failure remains as captured.
8. Media Manager emits `media.upload-failure-recovery.recorded`.

### PR-B Workflow 15 - Child Job Failure Without Session Closure

**Trigger:** a child Media Upload Job transitions to `failed`, `failed_with_partial_successes`, or `completed_with_partial_failures`.

1. Media Manager records the child job's terminal lifecycle state per PR-A behavior.
2. **The parent Media Upload Session does NOT auto-close.** Its lifecycle state (`open` or `paused`) is preserved.
3. **Prior Successful Upload Preservation Rule (canonical):** prior successful child jobs' outputs (Media Asset Versions, Product Media Assignment Evidence, Media Upload Coverage Summary records, Media Readiness Evidence records) are NOT destroyed, hidden, or mutated.
4. The Media Upload Coverage Summary is updated to reflect the failed (or partially failed) child job. The Coverage Summary's `vendor_options_offered` field surfaces the retry option (which invokes PR-B Workflow 14) alongside the existing PR-A options (add another ZIP, manual, URLs, continue, return later).
5. The session continues to accept further child jobs. The vendor may retry via PR-B Workflow 14, add a different child job type, or pause and return.
6. PR-B Workflow 15 does NOT emit a separate event; the existing PR-A `media.upload-job.failed` (or appropriate terminal event) is sufficient. The Coverage Summary update is observable via PR-A's `media.upload-coverage-summary.created` (which is emitted on each Coverage Summary version per PR-A behavior).

---

### PR-B Workflow inventory recap

The 15 PR-B workflows above, in order:

1. Source URL Re-Ingestion Request
2. Source URL Revalidation Job
3. Source URL Change Detection
4. Candidate Media Asset Version Validation
5. Media Asset Version Supersession
6. Failed Candidate Version Handling
7. Media Restriction Request
8. Media Restriction Evidence Application
9. Media Restriction Lift and Expiry Evaluation
10. Media Usage Disposition Recalculation
11. SKU Alias Mapping Proposal
12. SKU Alias Mapping Approval
13. Alias-Based Assignment Review
14. Upload Failure Recovery
15. Child Job Failure Without Session Closure

Active Version Preservation is a contract rule enforced inside PR-B Workflow 5; it is not a separate workflow.

### CIXCI-managed media reference reaffirmation (PR-B)

Under every PR-B workflow, the CIXCI Media Asset URL/Reference (PR-A foundation) is the durable buyer-visible reference. The vendor source URL is captured for audit only (Source Image URL Reference, Source URL Fetch Result, Source URL Change Detection Result) and is never the durable buyer-visible reference. PR-B's Media Asset Version Supersession Workflow updates the `current_media_asset_version_reference` to point at the new current version; the CIXCI Media Asset URL/Reference is platform-managed and continues to resolve to the buyer-visible version. Under any failure path (`failed_candidate`, restriction, revocation, expiry, fetch failure), the CIXCI Media Asset URL/Reference continues to resolve to the prior `current` version per the fail-safe and Active Version Preservation rules.

### PR-B workflow boundary discipline (recap)

- Integration Management owns external HTTP fetch transport; PR-B workflows invoke Integration Management by reference.
- Product Catalog is reference-only; PR-B workflows do not write to Product Catalog records.
- Logs & Audit File Tracking is reference-only; PR-B workflows reuse existing `audit_reference` patterns and do not introduce new retention classes.
- Tenant Company is reference-only; PR-B workflows use existing `check_access` patterns and do not introduce new roles or capability flags.
- Notification Platform Service is reference-only (future hook); PR-B workflows do not produce notification artifacts.
- Buyer media export, buyer marketing download, signed URL, CDN, rendition, and cache invalidation workflows are PR-C, not PR-B.
