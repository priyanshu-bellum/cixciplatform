# Media / Image Asset Management Data Model

This document defines proposal-level data concepts for Media Manager upload, assignment, required media, and readiness evidence.

## Core Entities

Media Management should model:

- Media Asset
- Media Upload Job
- ZIP Upload Job
- Manual Upload Session
- Image URL Ingestion Job
- Video Upload Placeholder
- Product Media Assignment
- Required Media Profile
- Media Readiness Evidence
- Media Readiness Summary
- Missing Media Report
- Media Readiness Override Evidence
- Media Validation Result
- Media Processing Result

## Media Asset

Proposal-level fields/concepts:

- media asset id
- asset type: image, video placeholder, document placeholder
- source file reference placeholder
- source URL reference placeholder
- uploaded by actor/user reference
- vendor/entity scope reference
- upload method: ZIP, manual upload, image URL, media file upload, video placeholder
- original filename
- content type
- file size
- checksum/hash placeholder
- processing status
- validation status
- assigned product references
- assigned variant references where applicable
- source version/hash
- supersession reference
- audit reference

## Media Upload Job

Proposal-level fields/concepts:

- media upload job id
- upload method
- vendor/entity scope reference
- source accessory import batch reference, where applicable
- submitted by actor/user reference
- upload status
- validation status
- processing status
- applied rows/assets
- failed assets
- warning assets
- correction/reupload reference
- Integration delivery/receipt reference where media is pulled/pushed externally
- Logs & Audit file/upload evidence reference
- audit reference

ZIP upload, manual upload, image URL ingestion, media file upload, and future video upload support are Media Management workflows.

## Product Media Assignment

Product Media Assignment is Media-owned evidence that a specific asset version was assigned to a specific product or variant role. Product Catalog may accept or consume product-media attachment references where appropriate, but Media owns upload, validation, processing, assignment, and readiness workflow evidence.

Proposal-level fields/concepts:

- product media assignment id
- Product Catalog product reference
- variant reference where applicable
- SKU/UPC reference
- media asset reference
- media asset version/hash
- assigned role: Main, Alt, Lifestyle, Packaging, Video placeholder, other
- role priority/order
- assignment source: ZIP upload, manual upload, image URL ingestion, API, admin correction, future placeholder
- assignment source version/hash
- assignment timestamp
- validation result reference
- validation result version/hash
- processing result reference
- processing result version/hash
- assigned by actor/service reference
- applied-vs-ignored state
- assignment disposition
- supersession reference
- review-required state
- audit reference

Superseded, ignored, stale, failed, or conflicting assignments must not continue to satisfy required media readiness. Product Media Assignment does not transfer Product Catalog product ownership into Media Management.

## Required Media Profile

Required Media Profile configures what media is needed from an asset-readiness standpoint.

Proposal-level fields/concepts:

- required media profile id
- source module = Media Management
- category/vendor/buyer-type/Product Type scope
- required Main image flag
- required image count placeholder
- required video placeholder
- category-specific media requirements
- vendor-specific media requirements
- buyer-type-specific media requirements
- temporary exception/override mode reference
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

Default recommendation: missing required Main image should be a hard blocker for buyer visibility and buyer export.

Required Media Profile records consumed by Product Catalog must be versioned and dispositioned. Missing, stale, expired, superseded, ignored, or conflicting profile evidence should block or route buyer visibility/export evaluation to review according to Product Catalog and Media rules.

Required media profile changes should not silently rewrite historical export, visibility, invoice, analytics, or audit evidence. Historical evidence should continue to reference the profile version that was evaluated at the time.

Tenant Company owns user/admin authority to apply overrides. Media Management owns media readiness evaluation and override evidence from an asset standpoint.

## Media Readiness Evidence

Media Readiness Evidence is asset-readiness evidence consumed by Product Catalog, buyer export workflows, notifications, analytics, and AI Agent Services. Summary booleans are not enough for downstream consumption; Product Catalog must be able to prove which Media Asset ID, asset version, assignment version, validation result, and processing result made the accessory media-ready.

Proposal-level fields/concepts:

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
- assigned media role, such as Main, Alt, Lifestyle, Packaging, Video placeholder
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
- supersession reference
- review-required state
- audit reference

Missing, stale, superseded, ignored, failed, or conflicting asset, assignment, validation, processing, profile, or override evidence should block or route Product Catalog buyer visibility/export to review according to Product Catalog and Media rules.

Media Readiness Evidence is asset-readiness evidence only. Product Catalog owns final buyer visibility/export projection and must consume exact Media Asset ID/version and Product Media Assignment/version references where media evidence affects visibility or export.

## Media Readiness Status Values

Proposal-level statuses:

- Media Missing
- Media Incomplete
- Media Processing
- Media Failed Validation
- Media Complete
- Not Retail Ready
- Retail Ready From Media Standpoint
- Review Required
- Override Applied

Media readiness is asset-readiness only. Product Catalog owns product lifecycle, publication, buyer visibility projection, and exportability decisions after consuming this evidence.

## Media Readiness Summary

Media Manager should show vendors a summary of imported accessories missing media.

Proposal-level fields/concepts:

- media readiness summary id
- imported accessory count reference
- accessories with assigned media count
- accessories missing required Main image count
- accessories missing required video count placeholder
- media readiness status summary
- missing media report reference
- vendor/entity scope reference
- source import batch reference
- Product Catalog product references
- audit reference

Example values:

- `50 accessories imported`
- `0 accessories have images`
- `50 accessories missing required Main image`
- `Status: Not Retail Ready`

## Missing Media Report

Proposal-level fields/concepts:

- missing media report id
- vendor/entity scope reference
- source import batch reference
- required media profile reference
- generated by actor/service reference
- generated timestamp
- report content reference
- Logs & Audit report/file/download evidence reference
- audit reference

Missing Media Report content should include:

- SKU
- UPC
- accessory name
- Product Catalog product reference
- variant reference where applicable
- required media type
- current media readiness status
- validation errors
- assignment status

Media Management owns report content/source media readiness state. Logs & Audit owns immutable report/file/download evidence.

## Media Readiness Override Evidence

Media Readiness Override Evidence records an authorized override from an asset-readiness standpoint. Tenant Company owns authority to apply overrides; Media Management owns the override evidence and Product Catalog consumes it without inferring override authority.

Proposal-level fields/concepts:

- override id
- media readiness evidence reference
- required media profile reference
- product/category/vendor/buyer-type/Product Type scope
- product reference where applicable
- vendor/entity scope reference
- override mode: hard blocker lifted, warning-only, temporary exception
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

Overrides must be versioned, permissioned, auditable, and time-bound where appropriate. Expired, superseded, ignored, stale, or conflicting override evidence must not continue to satisfy required media readiness or buyer visibility/export evaluation.

## PR-A Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section introduces or hardens Media / Image Asset Management entities and supporting field/state/reference/contract-rule surfaces for the PR-A hardening pass. All concepts are additive. Existing Media entities (Media Asset, Media Upload Job, ZIP Upload Job, Manual Upload Session, Image URL Ingestion Job, Video Upload Placeholder, Product Media Assignment, Required Media Profile, Media Readiness Evidence, Media Readiness Summary, Missing Media Report, Media Readiness Override Evidence, Media Validation Result, Media Processing Result) are not redefined; this PR layers on top.

### Cross-module boundary discipline reaffirmed

- Media / Image Asset Management owns the new entities and field/state/reference/contract-rule surfaces introduced below.
- Product Catalog owns accessory product canonical records, SKU and UPC as preserved text identifiers, UPC validation, UPC normalization, UPC uniqueness, accessory CSV import and accessory ingestion row-level validation, and buyer catalog visibility/export projection. Product Catalog is not modified by this PR.
- Integration Management owns external transport mechanics for image URL fetch and any future external storage/CDN/provider integration. Integration Management is not modified by this PR.
- Logs & Audit File Tracking owns immutable evidence retention for upload jobs, validation results, processing results, assignment evidence, Media Asset Versions, Missing Media Reports, and restriction evidence. Logs & Audit File Tracking is not modified by this PR.
- Tenant Company owns vendor / buyer / System Admin role definitions and `check_access` for media-related authority decisions. Tenant Company is not modified by this PR.

### SKU-only Media matching (canonical contract correction)

**Media matching is SKU-based only.** UPC must not be used for:

- image import matching
- ZIP image assignment
- manual / drag-and-drop media assignment
- image URL assignment
- Product Media Assignment Evidence matching
- Media Readiness Evidence matching
- Missing Media / Coverage Summary matching
- Buyer Media Export Readiness Reference matching
- Unmatched Media File evaluation

UPC belongs to Product Catalog / Accessory Import. Where existing Media documents reference a "SKU/UPC reference" as a matching or identity key, the canonical interpretation under this PR-A hardening is **SKU reference**. UPC may continue to appear as a Product-Catalog-side identifier text on records that Media references by reference (for example, Product Catalog product records carry SKU and UPC as preserved text), but the Media-side matching, assignment, and readiness key is SKU. Existing Media documents that previously surfaced "SKU/UPC reference" wording on matching/identity fields should be read, under PR-A, as referring to SKU only for matching/identity. New entities and surfaces introduced by PR-A use `SKU reference` exclusively.

### Phase 1 scope guardrails

- All new entities operate on vendor-provided media in CIXCI-supported ingestion methods (ZIP, manual drag-and-drop, image URL, future API).
- All accepted media resolves to a Media Asset Version with a CIXCI-managed media URL/reference. The vendor source URL is never the durable buyer-visible reference.
- Default `media_usage_disposition = approved_by_default` for vendor-provided media; restriction is foundation-only in PR-A.
- Source URL Change Detection Rule is foundation-only in PR-A; the full re-ingestion / versioning lifecycle (vendor-triggered, scheduled, admin-triggered, ETag / Last-Modified evaluation, detailed supersession behavior) is PR-B.
- Multi-Part Upload Completion State permits the vendor to add another ZIP, manual upload, or URL list within the same session; the concrete resumable-upload mechanics are implementation-level and remain deferred.

---

### Media Upload Session (new entity)

The parent session that spans multiple child Media Upload Jobs for the same accessory import / media assignment context. Vendors may upload more than one ZIP file, plus manual files, plus image URLs, all under one session.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `media_upload_session_reference` from Media Upload Job, Media Upload Coverage Summary, Media Assignment Candidate, and Logs & Audit retention records.

**Lifecycle states (proposal-level):**

- `open` - created; vendor may add child upload jobs.
- `paused` - vendor signaled they will return later; child jobs to date are preserved.
- `completed` - vendor signaled completion; no further child jobs are accepted.
- `superseded` - terminal observability state if a later session for the same accessory import batch subsumes this session (Phase 1 architectural state only; concrete supersession workflow is not introduced by PR-A).

**Required fields and references (proposal-level):**

- `media_upload_session_reference` - canonical identifier.
- `vendor_entity_scope_reference` - vendor scope from Tenant Company.
- `source_accessory_import_batch_reference` - reference to the Product Catalog source accessory import batch where applicable.
- `product_catalog_product_reference_collection` - the Product Catalog product references in scope for this session (read-only; from Product Catalog).
- `child_media_upload_job_reference_collection` - references to all child Media Upload Jobs in this session.
- `multi_part_upload_completion_state` - one of `open`, `paused`, `completed`, `superseded`.
- `latest_media_upload_coverage_summary_reference` - reference to the most recent Media Upload Coverage Summary for this session.
- `submitted_by_actor_reference` - the vendor user who initiated the session.
- `lifecycle_state` - matches `multi_part_upload_completion_state`.
- `created_at`, `state_change_timestamp` - record-management timestamps.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- The session does not own accessory record ingestion or UPC validation; those remain Product Catalog territory.
- The session does not mutate Product Catalog product records.
- The session does not own Logs & Audit retention; it references the Logs & Audit audit record via existing patterns.
- Auto-close behavior: Phase 1 does not auto-close sessions on inactivity; the session remains `open` until the vendor signals completion or returns later (which transitions to `paused`). Future operator-surface PR may introduce auto-close.
- Multiple sessions for the same accessory import batch are permitted; the architectural rule is that each session is its own coverage scope. Cross-session aggregation of coverage is not introduced by PR-A.

---

### Media Upload Job (existing entity, hardened with explicit job-type discrimination)

The child upload-job record under a Media Upload Session. PR-A confirms a single Media Upload Job entity with a `job_type` discriminator instead of multiple top-level entities for ZIP, Manual, and URL jobs. ZIP Upload Job, Manual Media Upload Job, and Image URL Ingestion Job are job-type variants on Media Upload Job; they are not separate top-level entities under PR-A's discipline.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `media_upload_job_reference` from ZIP Extracted File Records, Media Filename Parse Results, Media Assignment Candidates, Media Asset Versions, Source URL Fetch Result records, and Logs & Audit retention records.

**Job-type field:** `job_type` discriminates the four supported types:

- `zip` - one ZIP file upload; produces ZIP Extracted File Records and per-file Filename Parse Results.
- `manual_drag_drop` - one or more individually uploaded files (drag-and-drop or file picker); produces per-file Filename Parse Results where filenames match the canonical pattern.
- `image_url` - one or more vendor-provided image URLs; produces Source URL Fetch Result records and Media Asset Versions.
- `future_api` - reserved for future API-based ingestion; not implemented in PR-A.

The legacy entity name "Manual Upload Session" in existing Media data-model documents is read, under PR-A, as a Media Upload Job with `job_type = manual_drag_drop`. The renaming is a cleanup observation; no rewrite of existing sections is required. New PR-A content uses Media Upload Job + `job_type` exclusively.

**Lifecycle states (proposal-level):**

- `received` - created; awaiting validation and processing.
- `validating` - validation in flight (per ZIP Extracted File for ZIP jobs; per file for manual; per URL fetch for image_url).
- `processing` - processing in flight where validation completed.
- `completed` - terminal; all per-file outcomes recorded; Media Asset Versions created for accepted files.
- `failed` - terminal; the job itself failed (for example, ZIP file unreadable, URL list empty, transport unreachable). Per-file partial results may still be recorded under `completed_with_partial_failures` discriminator in Phase 1 implementation; the architectural distinction between job-level failure and file-level failure is preserved.

**Required fields and references (proposal-level):**

- `media_upload_job_reference` - canonical identifier.
- `media_upload_session_reference` - the parent session.
- `job_type` - one of `zip`, `manual_drag_drop`, `image_url`, `future_api`.
- `vendor_entity_scope_reference` - inherited from session.
- `source_accessory_import_batch_reference` - inherited from session where applicable.
- `source_file_reference` - present when `job_type = zip` or `manual_drag_drop`; placeholder reference to the underlying file at the implementation layer.
- `source_image_url_reference_collection` - present when `job_type = image_url`; the list of vendor-provided URLs.
- `integration_management_transport_reference` - present when `job_type = image_url`; reference to the Integration Management transport record where applicable. May be null in Phase 1 if no specific Integration Management hook exists; placeholder reference language applies (consistent with the cross-module pattern established by prior PRs).
- `submitted_by_actor_reference` - the vendor user.
- `lifecycle_state` - one of the states above.
- `validation_result_reference_collection` - per-file or per-URL validation result references.
- `processing_result_reference_collection` - per-file or per-URL processing result references.
- `created_at`, `state_change_timestamp` - record-management timestamps.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- Auto-assignment from the Media Upload Job is permitted only when SKU evidence is clean (see SKU-Based Media Assignment Rule below).
- The job does not mutate Product Catalog product records.
- For `job_type = image_url`, Media Manager does not perform the transport; Integration Management owns external fetch mechanics. Media Manager records the Source URL Fetch Result by reference.
- For `job_type = zip`, ZIP extraction produces ZIP Extracted File Records (field-collection on the Media Upload Job, not a separate top-level entity in PR-A).

---

### ZIP Extracted File Record (field-collection on Media Upload Job, not a separate top-level entity)

Per-extracted-file record within a ZIP-type Media Upload Job. Phase 1 captures filename, content type, file size, content hash, extraction outcome, and references to Filename Parse Result and Validation Result.

**Type:** field-collection on Media Upload Job (`zip_extracted_file_record_collection`).

**Owner:** Media / Image Asset Management.

**Required fields (proposal-level):**

- `zip_extracted_file_record_reference` - per-record identifier within the job.
- `extracted_filename` - the filename as found in the ZIP, including any folder prefix.
- `extracted_folder_reference` - the folder context within the ZIP, if any.
- `content_type` - detected content type.
- `file_size` - size in bytes.
- `content_hash` - hash of the extracted file content.
- `extraction_outcome` - one of `extracted`, `unreadable`, `oversized`, `disallowed_format`, `archive_nested`.
- `filename_parse_result_reference` - reference to the Media Filename Parse Result for this extracted file.
- `validation_result_reference` - reference to the Media Validation Result for this extracted file.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- Records are immutable once created; re-extraction produces a new Media Upload Job rather than mutating ZIP Extracted File Records.
- ZIP bomb / nested-archive scenarios produce `extraction_outcome = archive_nested` and route to validation failure; no recursive extraction is attempted by PR-A architectural rule.

---

### Media Filename Parse Result (field-collection / reference record on ZIP Extracted File or Manual Upload File, not a separate top-level entity)

Outcome of parsing one file's name into canonical components (SKU, role, sequence).

**Type:** field-collection / reference record under Media Upload Job and ZIP Extracted File.

**Owner:** Media / Image Asset Management.

**Required fields (proposal-level):**

- `media_filename_parse_result_reference` - canonical identifier.
- `source_filename_reference` - the original filename including extension.
- `canonical_filename_reference` - the normalized canonical form `{SKU}_{Role}_{Sequence}.ext` where Role is one of `Main`, `Alt`, `Lifestyle`, `Packaging` and Sequence is a positive integer.
- `parsed_sku` - the SKU extracted from the filename.
- `parsed_folder_sku` - the SKU extracted from the folder context (for ZIP jobs); null for manual jobs.
- `media_role` - one of `Main`, `Alt`, `Lifestyle`, `Packaging`, `Video placeholder`, `unparseable`.
- `display_order` - integer derived from the filename sequence number; null if `media_role = unparseable`.
- `parse_disposition` - one of `clean`, `separator_variant_normalized`, `ambiguous`, `unparseable`.
- `separator_variant_reference` - optional; identifies which common separator variation was normalized (for example, hyphen, period, double-underscore).
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- The parse result does not auto-assign on its own; it feeds into Media Assignment Candidate creation.
- An `unparseable` filename routes to Unmatched Media File state (see below) rather than producing an Assignment Candidate.
- A `parse_disposition = ambiguous` parse result routes to Media Assignment Candidate with `media_matching_confidence = review_required`.

---

### Canonical Media Filename (contract rule, not a separate entity)

The canonical filename pattern is `{SKU}_{Role}_{Sequence}.ext`. Phase 1 enumeration:

- `{SKU}_Main_1.png` - the primary image (Main_1).
- `{SKU}_Main_2.png`, `{SKU}_Main_3.png`, etc. - ordered additional Main / gallery images.
- `{SKU}_Alt_1.png`, `{SKU}_Alt_2.png`, etc. - Alt images in sequence order.
- `{SKU}_Lifestyle_1.png`, etc. - Lifestyle images in sequence order.
- `{SKU}_Packaging_1.png`, etc. - Packaging images in sequence order.

Accepted extensions for image media in Phase 1: `.png`, `.jpg`, `.jpeg`. Other extensions route to validation failure.

**Main_1 primacy rule:**

- If Main images exist but `Main_1` is missing, the parse / assignment routes to review.
- Media Manager does not silently promote `Main_2` (or any subsequent Main) to primary unless a documented normalization rule or System Admin review explicitly allows it.

**Separator normalization rule:**

- Media Manager may recognize common separator variations (for example, `-`, `.`, double-underscore `__`) and normalize them into the canonical form internally.
- The parse result preserves the source filename reference; normalization is recorded via `separator_variant_normalized` parse disposition and the optional `separator_variant_reference`.

---

### SKU-Based Media Assignment Rule (contract rule, not a separate entity)

**Canonical PR-A rule:** Media assignment matching uses SKU only.

- For ZIP-job uploads: the folder SKU and the filename SKU must agree, and the SKU must be present in the source accessory import batch or the Product Catalog product reference set in scope for the session, in order to be auto-assign eligible.
- For manual / drag-and-drop uploads: the filename SKU must be present in the source accessory import batch or the Product Catalog product reference set in scope for the session, in order to be auto-assign eligible.
- For image URL uploads: the assignment hint (if provided) or the parsed SKU (from filename derived from the URL path, where the URL filename matches the canonical pattern) must be present in scope.

**Folder SKU vs filename SKU disagreement:**

- If folder SKU and filename SKU disagree, do not auto-assign. Route to Media Assignment Candidate with `media_matching_confidence = review_required` and a sub-reason indicating `folder_filename_sku_mismatch`.
- Approved SKU alias mappings are deferred to PR-B; under PR-A, no alias rules apply and all disagreements route to review.

**Unmatched SKU:**

- If the parsed SKU does not exist in the source accessory import batch or the Product Catalog product reference set in scope for the session, the file routes to Unmatched Media File state rather than producing an Assignment Candidate.

**UPC exclusion:**

- The rule does not consult UPC at any step. UPC is preserved on Product Catalog records but is not a Media-side matching key.

---

### Media Assignment Candidate (new entity)

A pending match between a Media Asset Version (or candidate asset prior to promotion) and a Product Catalog product reference at a specific role and display order, awaiting evaluation / promotion to Product Media Assignment Evidence.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `media_assignment_candidate_reference` from Product Media Assignment Evidence (on promotion), Media Assignment Review records, and Logs & Audit retention records.

**Lifecycle states (proposal-level):**

- `pending` - created; not yet evaluated.
- `auto_assignable` - SKU evidence is clean; the candidate is eligible for auto-assignment promotion.
- `review_required` - SKU evidence is not clean; the candidate awaits System Admin or vendor review.
- `approved` - terminal; promoted to Product Media Assignment Evidence.
- `rejected` - terminal; the candidate is rejected and does not produce a Product Media Assignment Evidence.
- `superseded` - terminal observability state if a later candidate for the same product / role / display order supersedes this one.

**Required fields and references (proposal-level):**

- `media_assignment_candidate_reference` - canonical identifier.
- `media_upload_session_reference` - the originating session.
- `media_upload_job_reference` - the originating child job.
- `media_filename_parse_result_reference` - the parse result that produced this candidate (where applicable).
- `media_asset_version_reference` - the candidate Media Asset Version (created during validation/processing; see Media Asset Version below).
- `product_catalog_product_reference` - the Product Catalog product reference this candidate is matched to.
- `variant_reference` - optional; the variant within the product where applicable.
- `sku_reference` - the SKU matched (Media-side matching key; never UPC).
- `media_role` - one of `Main`, `Alt`, `Lifestyle`, `Packaging`, `Video placeholder`.
- `display_order` - integer from the filename sequence number.
- `media_matching_confidence` - one of `clean`, `review_required`.
- `media_matching_confidence_sub_reason` - free-text-bounded enumeration for review reasons; Phase 1 values include `folder_filename_sku_mismatch`, `main_one_missing_with_main_two_plus_present`, `duplicate_filename`, `duplicate_content_hash`, `ambiguous_parse`, `assignment_hint_disagreement` (for URL/manual hints). Future PR-B may extend.
- `media_assignment_review_state` - one of `pending`, `auto_assignable`, `review_required`, `approved`, `rejected`, `superseded`.
- `reviewing_actor_reference` - System Admin or authorized vendor actor; populated when the candidate is approved or rejected.
- `lifecycle_state` - matches `media_assignment_review_state`.
- `created_at`, `state_change_timestamp` - record-management timestamps.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- A Media Assignment Candidate does not satisfy Media Readiness Evidence directly; only the promoted Product Media Assignment Evidence does.
- A candidate's `media_matching_confidence` and `media_matching_confidence_sub_reason` are read-only after creation; new evaluation produces a new candidate.
- Promotion to Product Media Assignment Evidence requires the candidate's `media_assignment_review_state` to be `approved` or `auto_assignable` and the underlying Media Asset Version to have passed validation and processing.
- A candidate's Media Asset Version is created during validation / processing of the upload (see Media Asset Version below); the candidate itself is not the durable asset.

---

### Media Matching Confidence (field on Media Assignment Candidate, not a separate entity)

Enumeration tag indicating whether the candidate is auto-assign eligible. Phase 1 values: `clean`, `review_required`. Numerical scoring is not introduced by PR-A.

---

### Media Assignment Review State (state field on Media Assignment Candidate and on Product Media Assignment Evidence)

State transitions are defined on Media Assignment Candidate (above). Product Media Assignment Evidence inherits the terminal `approved` state at promotion time.

---

### Unmatched Media File (state on Media Upload Job, with associated field-collection record)

A file extracted from a ZIP or uploaded manually whose SKU is not present in the source accessory import batch or Product Catalog product reference set in scope for the session.

**Type:** field-collection on Media Upload Job (`unmatched_media_file_collection`) with state semantics.

**Owner:** Media / Image Asset Management.

**Required fields (proposal-level):**

- `unmatched_media_file_reference` - per-record identifier.
- `source_filename_reference` - the original filename.
- `parsed_sku` - the SKU extracted (may be present even though it does not match any product reference in scope).
- `unmatched_reason` - one of `sku_not_in_import_batch`, `sku_not_in_product_catalog_reference_set`, `unparseable_filename`.
- `created_at` - record-management timestamp.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- Unmatched media files are not silently discarded. The Coverage Summary surfaces the count, and operators may later review them via future operator-surface PR.
- Unmatched media files are not silently auto-assigned to other SKUs even if a near-match exists.
- Unmatched media files are not promoted to Media Asset Versions in Phase 1; the file remains on the Media Upload Job side as record evidence until reviewed.

---

### Missing Required Media Result (field-collection on Media Upload Coverage Summary, not a separate entity)

Per-product evaluation of which required media roles are missing for one product in the session.

**Type:** field-collection on Media Upload Coverage Summary.

**Owner:** Media / Image Asset Management.

**Required fields (proposal-level):**

- `missing_required_media_result_reference` - per-record identifier.
- `product_catalog_product_reference` - the product evaluated.
- `sku_reference` - the SKU (Media-side matching key; never UPC).
- `required_media_role_collection` - the required roles from Required Media Profile.
- `missing_required_media_role_collection` - the subset of required roles that have no Product Media Assignment Evidence yet.
- `assignment_status_summary` - one of `not_started`, `partial`, `complete`, `review_required`.

**Boundary discipline:**

- A Missing Required Media Result does not block accessory record save; accessory records remain saved per existing Media handoff rules.
- Phase 1 default: missing `Main_1` is a hard blocker for buyer visibility/export per existing Media-side default.

---

### Media Upload Coverage Summary (new entity)

After each child Media Upload Job completes, a Media Upload Coverage Summary is produced (or updated) that compares imported accessory SKUs against media-assigned SKUs in the session.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `media_upload_coverage_summary_reference` from Media Upload Session (the `latest_media_upload_coverage_summary_reference` field), Missing Media Reports, and Logs & Audit retention records.

**Lifecycle:** versioned per child job completion. The session keeps the latest summary reference; earlier summaries are preserved for audit.

**Required fields and references (proposal-level):**

- `media_upload_coverage_summary_reference` - canonical identifier.
- `media_upload_session_reference` - the session.
- `evaluated_after_media_upload_job_reference` - the child job whose completion triggered this evaluation.
- `imported_accessory_sku_collection` - the SKUs in the source accessory import batch / Product Catalog product reference set in scope (Media-side matching identifier; SKU only).
- `media_assigned_sku_collection` - the SKUs that have at least one promoted Product Media Assignment Evidence in this session so far.
- `unmatched_media_file_count` - count of Unmatched Media File records across all child jobs in the session.
- `missing_required_media_result_collection` - per-product missing-required-media results.
- `coverage_status` - one of `complete`, `partial`, `none`. `complete` means every imported accessory SKU has at least the required `Main_1` and all other required roles per Required Media Profile.
- `vendor_options_offered` - enumeration collection: `upload_another_zip`, `upload_manually_drag_drop`, `add_image_urls`, `download_missing_media_report`, `continue_without_uploading`, `return_later`.
- `created_at` - record-management timestamp.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- The Coverage Summary is a session-scoped read-model snapshot. It is not Media's final authority on buyer visibility/export; Product Catalog still owns that decision via its consumption of Media Readiness Evidence.
- A new Coverage Summary is produced (versioned) after each child job completion; the earlier summary is preserved for audit. The session's `latest_media_upload_coverage_summary_reference` is updated to point to the new summary.
- The summary is computed in-session; cross-session aggregation is not introduced by PR-A.
- The matching identifier is SKU. UPC is never used as a matching key in the Coverage Summary.
- Vendor selection of an option from `vendor_options_offered` may produce a new child Media Upload Job (for upload options), produce a Missing Media Report (for download), or transition the session to `paused` (return later) or `completed` (continue without uploading).

---

### Media Asset (existing entity, hardened)

PR-A clarifies and adds the following on the existing Media Asset entity:

- **CIXCI Media Asset URL / Reference** (new field): the platform-managed durable reference to the accepted media content. Phase 1: opaque reference; concrete CDN/signed-URL/rendition mechanics are PR-B. **The vendor source URL is never the value of this field.**
- **Current Media Asset Version Reference** (new field): reference to the currently active Media Asset Version.
- **SKU reference is the Media-side matching key.** UPC remains a Product-Catalog-side identifier on referenced product records; UPC is not stored on Media Asset as a matching/identity key. Existing Media Asset documents that reference "SKU/UPC reference" are read, under PR-A, as `sku_reference` for matching/identity purposes.
- **Media Asset records must not be created from media that failed validation.** Validation failure produces a Media Validation Result with failure status; no Media Asset Version is created.

The other existing Media Asset fields (asset type, source file reference placeholder, source URL reference placeholder, uploaded-by actor, vendor scope, upload method, original filename, content type, file size, checksum/hash placeholder, processing status, validation status, assigned product references, assigned variant references, source version/hash, supersession reference, audit reference) continue to apply.

---

### Media Asset Version (new entity)

Per-version snapshot of a Media Asset's content. Required for every accepted media regardless of ingestion method. Foundation for URL-sourced re-ingestion / versioning behavior.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `media_asset_version_reference` from Media Asset (the current version), Product Media Assignment Evidence, Buyer Media Export Readiness Reference, Logs & Audit retention records, and Media Restriction Evidence (where applicable).

**Lifecycle states (proposal-level):**

- `created` - the version was created from accepted media that passed validation and processing.
- `current` - the version is the currently active version for the Media Asset; buyer-visible (subject to Media Usage Disposition).
- `superseded` - terminal observability state when a later version becomes `current`. Old versions are preserved for audit/history; never deleted.
- `restricted` - non-terminal disposition driven by Media Restriction Evidence (foundation only in PR-A).
- `failed_candidate` - terminal observability state if a candidate version (typically from URL re-ingestion or a re-upload) was created but did not pass validation; the prior `current` version remains active (fail-safe rule).

**Required fields and references (proposal-level):**

- `media_asset_version_reference` - canonical identifier.
- `media_asset_reference` - the parent Media Asset.
- `media_upload_job_reference` - the Media Upload Job that produced this version.
- `cixci_media_asset_url_reference` - the CIXCI-managed media URL/reference for this version. **The vendor source URL is never the value of this field.**
- `source_image_url_reference` - present when the version was produced from an `image_url` job; the vendor-provided URL captured for audit. Source-only; not durable.
- `source_url_content_hash` - present when the version was produced from an `image_url` job; hash of the fetched content at the moment of acceptance. Used for change detection.
- `content_hash` - hash of the accepted media content.
- `media_role` - inherited or assigned at promotion time.
- `display_order` - inherited from filename sequence.
- `media_validation_result_reference` - the validation result that accepted this version.
- `media_processing_result_reference` - the processing result for this version.
- `lifecycle_state` - one of the states above.
- `superseded_by_reference` - present when `lifecycle_state = superseded`; references the version that superseded this one.
- `failed_candidate_reason` - present when `lifecycle_state = failed_candidate`; references the validation failure.
- `created_at`, `state_change_timestamp` - record-management timestamps.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- The current Media Asset Version is the buyer-visible content. The `cixci_media_asset_url_reference` is the durable surface; the vendor's source URL is never the buyer-visible URL.
- Re-upload, URL re-ingestion, or content-change re-fetch produces a new Media Asset Version. The prior version becomes `superseded` only if the new version passes validation AND becomes `current`.
- If the new version fails validation, it transitions to `failed_candidate`; the prior `current` version remains active. **This is the canonical fail-safe rule.**
- Media Asset Versions are immutable; amendments use a new version, not in-place mutation.
- Media Asset Versions are never deleted; superseded versions are preserved for audit/history.

---

### CIXCI Media Asset URL / Reference (field, not a separate entity)

The platform-managed durable reference to the accepted media content. Phase 1: opaque reference; concrete CDN/signed-URL/rendition mechanics are PR-B.

**Where it lives:** field on Media Asset and on Media Asset Version.

**Boundary discipline:**

- The CIXCI Media Asset URL/Reference is never the vendor's source URL.
- Buyer product export, buyer marketing download (future PR-B), and storefront display must reference this surface, not the vendor's source URL.
- Phase 1 architectural rule: the reference is opaque; implementations may resolve it through Integration Management's external storage/CDN provider where applicable, but PR-A does not specify the resolution mechanism.

---

### Source Image URL Reference (field on Media Upload Job and Media Asset Version, not a separate entity)

The vendor-provided image URL. Source-only; not durable; never sent to buyers as the durable media reference.

**Where it lives:** on Media Upload Job (`source_image_url_reference_collection` for `job_type = image_url`) and on Media Asset Version (`source_image_url_reference` for versions produced from URL ingestion).

**Boundary discipline:**

- The vendor source URL is captured for audit and for source URL change detection.
- The vendor source URL is never the value of `cixci_media_asset_url_reference`.

---

### Source URL Fetch Result (reference / evidence surface, not a separate top-level entity)

Outcome of an Integration Management fetch attempt for an image URL.

**Type:** reference / evidence surface on Media Upload Job and Media Asset Version. The actual transport-layer record is owned by Integration Management; Media references it.

**Owner:** Media / Image Asset Management (for the Media-side reference and disposition); Integration Management (for the transport-layer record).

**Required fields (proposal-level):**

- `source_url_fetch_result_reference` - canonical identifier on the Media side.
- `integration_management_transport_reference` - reference to the Integration Management transport-layer record where applicable. May be null in Phase 1 if no specific hook exists; placeholder reference language applies.
- `source_image_url_reference` - the vendor URL fetched.
- `result_discriminator` - one of `fetched`, `failed`, `blocked`, `unauthorized`, `unsupported`, `changed_content_detected`. `changed_content_detected` is the foundation-only signal that a later fetch returned content whose hash differs from the prior accepted version's hash; the full re-ingestion lifecycle is PR-B.
- `fetched_content_hash` - present when `result_discriminator = fetched` or `changed_content_detected`; the hash of the fetched content.
- `fetch_failure_reason_text` - present when `result_discriminator = failed`, `blocked`, `unauthorized`, or `unsupported`; free-text reason where Integration Management transport-record content is unavailable in Phase 1.
- `created_at` - record-management timestamp.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- The transport itself (the HTTP fetch) is Integration Management's responsibility. Media records the result.
- `result_discriminator = fetched` produces validation/processing in the normal flow.
- `result_discriminator = failed`, `blocked`, `unauthorized`, or `unsupported` does NOT produce a Media Asset Version; the upload-job-level outcome records the failure.
- `result_discriminator = changed_content_detected` is the foundation signal for URL re-ingestion. PR-A captures only the architectural rule; the full re-ingestion lifecycle (vendor-triggered, scheduled, admin-triggered, ETag / Last-Modified evaluation) is PR-B.

---

### Source URL Content Hash (field on Media Asset Version and Source URL Fetch Result, not a separate entity)

Hash of the fetched content at the moment of acceptance. Used for change detection on subsequent fetches of the same vendor URL.

**Where it lives:** `source_url_content_hash` on Media Asset Version; `fetched_content_hash` on Source URL Fetch Result.

**Boundary discipline:**

- Phase 1 architectural rule: if a subsequent fetch of the same vendor URL returns content whose hash differs from the prior accepted version's hash, the fetch result records `changed_content_detected` and the change is held for re-ingestion.
- PR-A does not specify when subsequent fetches happen (scheduled, vendor-triggered, admin-triggered); the trigger mechanism is PR-B.

---

### Source URL Change Detection Rule (contract rule, not a separate entity)

**Canonical PR-A rule:** If the source URL's content hash differs from the prior accepted version's hash on a subsequent fetch:

1. The changed content must be re-ingested (a new Media Upload Job with `job_type = image_url` or an equivalent re-fetch workflow; full mechanism is PR-B).
2. The changed content must be validated and processed.
3. A new Media Asset Version must be created with the new content hash and a new CIXCI Media Asset URL/Reference.
4. Assignment and readiness update only if validation passes.
5. The prior Media Asset Version is preserved in audit/history (never deleted).
6. **Fail-safe rule:** If the new version fails validation, the new candidate transitions to `failed_candidate`, and the prior `current` version remains active and buyer-visible.

PR-A captures the architectural rule above; the full re-ingestion lifecycle, scheduling, ETag/Last-Modified evaluation, and detailed supersession workflow are PR-B.

---

### Product Media Assignment Evidence (existing entity, hardened)

PR-A clarifies on the existing Product Media Assignment Evidence entity:

- **SKU reference is the Media-side matching key.** Where existing documents reference "SKU/UPC reference" on Product Media Assignment Evidence, the canonical PR-A interpretation is SKU only. UPC is not a Media-side matching/identity key on this entity.
- **Media Asset Version reference** (new field): the version that was assigned, not just the Media Asset. Existing `media asset version/hash` is preserved.
- **Media Assignment Candidate reference** (new field): reference to the candidate that was promoted to this evidence record.
- **Media Usage Disposition** (new field): defaults to `approved_by_default`; see Media Usage Disposition section below.

Existing fields (assignment id, product reference, variant reference, assigned role, role priority/order, assignment source, assignment source version/hash, assignment timestamp, validation result reference/version, processing result reference/version, applied-vs-ignored state, assignment disposition, supersession reference, review-required state, audit reference) continue to apply.

**Boundary discipline:**

- Superseded, ignored, stale, failed, or conflicting Product Media Assignment Evidence must not satisfy Media Readiness Evidence (existing rule preserved).
- Product Media Assignment Evidence does not transfer Product Catalog product ownership into Media Management (existing rule preserved).
- UPC is not used for assignment matching/identity (PR-A canonical correction).

---

### Media Readiness Evidence (existing entity, hardened)

PR-A clarifies on the existing Media Readiness Evidence entity:

- **SKU reference is the Media-side matching key.** Where existing documents reference "SKU/UPC reference" on Media Readiness Evidence, the canonical PR-A interpretation is SKU only.
- **Media Asset Version reference** (new field for the Main asset): the Media Asset Version reference for the Main asset; supplements the existing Main media asset reference/version.
- **Media Usage Disposition propagation rule** (new contract rule): Media Readiness Evidence is only satisfied when the underlying Product Media Assignment Evidence has `media_usage_disposition` in an allowed value set. Restricted/revoked/expired/review_required/failed dispositions do not satisfy readiness.

Existing fields and behavior preserved. UPC is not used for readiness matching/identity (PR-A canonical correction).

---

### Media Usage Disposition (new field on Product Media Assignment Evidence, with associated default)

Enumeration on Product Media Assignment Evidence governing whether the assigned media is buyer-usable.

**Where it lives:** field on Product Media Assignment Evidence. May be propagated to Media Readiness Evidence and Buyer Media Export Readiness Reference via existing supersession patterns.

**Phase 1 enumeration values:**

- `approved_by_default` - default for vendor-provided media through CIXCI-supported ingestion methods.
- `restricted` - explicit restriction recorded via Media Restriction Evidence; buyer use not allowed.
- `revoked` - explicit revocation; buyer use not allowed.
- `expired` - the underlying usage permission expired; buyer use not allowed.
- `review_required` - human review required before buyer use.
- `failed` - validation or processing failed; the media must not be made buyer-visible.

**Buyer-usable-by-default defaults (Phase 1):**

- `media_usage_disposition = approved_by_default`
- `buyer_usage_allowed = true`
- `marketing_download_allowed = true`

These three defaults apply to vendor-provided media via CIXCI-supported ingestion methods (ZIP, manual drag-and-drop, image URL, future API) unless explicitly restricted. Per-item buyer-use approval is not required for the default path.

**Restriction propagation rule:**

- Restricted, revoked, expired, review_required, or failed media must not be included in buyer exports, buyer marketing downloads, storefront display, or buyer-facing rendition production.
- Product Media Assignment Evidence with a non-default `media_usage_disposition` does not satisfy Media Readiness Evidence.

---

### Media Restriction Evidence (foundation-only entity)

Records explicit restriction, revocation, or expiry against a Media Asset or Media Asset Version. Foundation only in PR-A; full restriction/revocation/expiry workflows (vendor-triggered, admin-triggered, scheduled expiry, automatic propagation) are PR-B.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `media_restriction_evidence_reference` from Media Asset Version, Product Media Assignment Evidence (where applicable), Media Usage Disposition propagation, and Logs & Audit retention records.

**Required fields (proposal-level):**

- `media_restriction_evidence_reference` - canonical identifier.
- `media_asset_reference` or `media_asset_version_reference` - the asset or version restricted.
- `restriction_type` - one of `restricted`, `revoked`, `expired`. Future PR-B may extend.
- `restriction_reason_text` - operator-supplied reason.
- `tenant_company_authority_reference` - the Tenant Company authority that authorized the restriction.
- `restricting_actor_reference` - the System Admin or authorized actor.
- `effective_date` - when the restriction takes effect.
- `expiration_date` - optional; when the restriction itself expires (for restorable restrictions).
- `lifecycle_state` - one of `active`, `superseded`, `expired_restriction`.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- PR-A foundation only. The detailed restriction/revocation/expiry workflow (initiation, approval routing, propagation to existing Product Media Assignment Evidence and Buyer Media Export Readiness Reference, restoration) is PR-B.
- Restriction Evidence does not directly mutate Product Media Assignment Evidence; it produces a Media Usage Disposition update via supersession in the future PR-B workflow.

---

### Buyer Media Export Readiness Reference (foundation-only reference, not a separate top-level entity)

Foundation reference indicating that a Media Asset Version / Product Media Assignment Evidence pair is buyer-export-ready.

**Type:** reference field on Product Media Assignment Evidence (or, equivalently, derived from Media Readiness Evidence). Phase 1 foundation only; the concrete buyer export package, signed URLs, marketing downloads, and rendition handoff are PR-B.

**Required conditions for buyer-export-ready (PR-A architectural rule):**

- Media Validation Result status = passed.
- Media Processing Result status = completed.
- Media Asset Version state = `current`.
- Product Media Assignment Evidence applied-vs-ignored state = applied.
- Media Usage Disposition in the allowed set: `approved_by_default`.
- Underlying Media Readiness Evidence is not stale, expired, superseded, ignored, or in review.

**Boundary discipline:**

- The reference is foundation-only in PR-A. Concrete buyer export package generation is PR-B.
- Restricted/revoked/expired/review_required/failed media is excluded.
- The buyer-visible URL surface is the CIXCI Media Asset URL/Reference, not the vendor source URL.

---

### Field additions to existing Media entities (summary of where new fields land)

PR-A adds the following fields to existing entities:

- **Media Asset:** `cixci_media_asset_url_reference`, `current_media_asset_version_reference`.
- **Media Upload Job:** `job_type`, `source_image_url_reference_collection` (for `job_type = image_url`), `integration_management_transport_reference` (for `job_type = image_url`).
- **Product Media Assignment Evidence:** `media_asset_version_reference`, `media_assignment_candidate_reference`, `media_usage_disposition`, `buyer_media_export_readiness_reference`.
- **Media Readiness Evidence:** `media_asset_version_reference` (for the Main asset).

Existing fields and behavior on existing entities are not removed. The PR-A canonical interpretation of "SKU/UPC reference" on existing entities is `sku_reference` (Media-side matching key); UPC is preserved on Product Catalog records but is not a Media-side matching/identity key.

---

### Phase 1 deliberate non-behaviors (Media data-model side)

- No full Media Asset Version lifecycle beyond foundation (supersession, restoration, archive policy details are PR-B).
- No vendor-triggered, scheduled, or admin-triggered URL re-ingestion mechanism (PR-B).
- No detailed Media Restriction Evidence workflow (PR-B).
- No buyer marketing download package definition (PR-B).
- No CDN, signed URL, or rendition lifecycle (PR-B).
- No advanced unmatched media review approval routing (future PR).
- No approved SKU alias mappings (PR-B).
- No per-asset operator display-order override (future PR).
- No numerical Media Matching Confidence score (Phase 1 is enumeration only).
- No Device Catalog image readiness extension (separate Device Catalog hardening area).
- No Product Catalog file modifications, no Integration Management file modifications, no Logs & Audit File Tracking file modifications.
- No OpenAPI hardening.

## PR-B Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section introduces or hardens Media / Image Asset Management entities and supporting field/state/reference/contract-rule surfaces for the PR-B lifecycle hardening pass. All concepts are additive. PR-A entities, states, rules, and defaults are preserved without rename or deprecation.

### Cross-module boundary discipline reaffirmed (PR-B)

- Media / Image Asset Management owns the new entities and field/state/reference/contract-rule surfaces introduced below.
- Product Catalog owns accessory product canonical records, SKU and UPC as preserved text identifiers, UPC validation/normalization/uniqueness, accessory CSV import, and buyer catalog visibility / export projection. Product Catalog is not modified by PR-B.
- Integration Management owns external HTTP fetch transport, ETag and Last-Modified header parsing at the transport layer, and redirect resolution at the transport layer. Signed URL generation mechanics, CDN, and rendition transport remain Integration-Management-owned but are out of PR-B scope. Integration Management is not modified by PR-B.
- Logs & Audit File Tracking owns immutable evidence retention via existing `audit_reference` patterns. PR-B introduces no new retention class, redaction class, or access class. Logs & Audit File Tracking is not modified by PR-B.
- Tenant Company owns vendor / buyer / System Admin role definitions and `check_access` for PR-B authority decisions (Source URL Re-Ingestion approval, Restriction Application, Alias Mapping Approval, Version Supersession authorization). PR-B introduces no new Tenant Company role or capability flag. Tenant Company is not modified by PR-B.
- Notification Platform Service is referenced only as a future hook. PR-B introduces no notification templates, routes, or transport behavior.

### SKU-only Media matching preserved (PR-A invariant)

Media matching remains SKU-based only. PR-B's SKU Alias Mapping is a **review-assist** input that resolves a non-canonical SKU text into a canonical Product Catalog SKU reference for the purpose of routing a previously Unmatched Media File to review. **Alias resolution never produces an `auto_assignable` candidate** and never overrides folder SKU / filename SKU disagreement. UPC remains a Product Catalog identifier and is NOT used as a Media-side matching key by PR-B.

### Phase 1 scope guardrails (PR-B)

- All PR-B entities operate on the PR-A foundation. PR-A states `created`, `current`, `superseded`, `restricted`, `failed_candidate` on Media Asset Version are preserved.
- All accepted media (post-promotion) continues to resolve to a Media Asset Version with a CIXCI-managed media URL/reference. The vendor source URL is never the durable buyer-visible reference.
- Restriction, revocation, and expiry exclusion rules treat the affected Media Asset Version as not buyer-visible. PR-B treats this as a single canonical Media-owned exclusion rule; buyer-side export concerns are PR-C.
- Source URL Re-Ingestion is supported via three trigger paths (vendor-triggered, System-Admin-triggered, scheduled) as architectural surfaces. The concrete scheduling mechanism is implementation-level.
- Large-file and resumable upload mechanics are architecture-level only. Numeric thresholds, chunking protocols, and runtime retry tuning are implementation-level.

---

### Source URL Re-Ingestion Request (new entity)

A Source URL Re-Ingestion Request captures the intent to re-fetch one or more Source Image URL References. Distinct from Source URL Revalidation Job; Request is the vendor or System Admin intent, and Job is the resulting work record.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `source_url_reingestion_request_reference` from Source URL Revalidation Job, audit records, and Media Asset Version history view.

**Lifecycle states (proposal-level):**

- `requested` - request submitted; authority not yet evaluated.
- `approved` - request approved; Source URL Revalidation Job has been or will be created.
- `rejected` - request rejected by authority check or by System Admin action.
- `superseded` - request superseded by a later request for the same target Source Image URL Reference.

**Required fields and references (proposal-level):**

- `source_url_reingestion_request_reference` - canonical identifier.
- `vendor_entity_scope_reference` - vendor scope from Tenant Company.
- `requesting_actor_reference` - the actor that submitted the request.
- `tenant_company_authority_reference` - existing `check_access` reference.
- `target_source_image_url_reference_collection` - one or more Source Image URL References targeted by this request.
- `target_media_asset_version_reference_collection` - optional; scopes the request to specific Media Asset Versions where applicable.
- `trigger_path` - enumeration: `vendor`, `system_admin`, `scheduled`.
- `scheduling_policy_reference` - optional; populated when `trigger_path = scheduled`.
- `request_reason_reference` - optional; reference to vendor or System Admin reason text.
- `request_lifecycle_state` - enumeration above.
- `approval_actor_reference` - populated on `approved` or `rejected`.
- `approval_evidence_reference` - audit-grade reference to the approval action.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- A vendor may submit a request for vendor-scoped Source Image URL References. A System Admin may submit a request for any scope. The scheduled path is initiated by a Media-owned scheduling policy that is itself System-Admin-configured.
- Authority is evaluated through Tenant Company `check_access`; no new role or capability flag is introduced.
- A Source URL Re-Ingestion Request does NOT directly fetch the URL or create a Media Asset Version. It produces a Source URL Revalidation Job, which performs the work.

---

### Source URL Revalidation Job (new entity)

The work record for a single revalidation pass against one or more Source Image URL References.

**Ownership:** Media / Image Asset Management. The HTTP transport is Integration-Management-owned.

**Identity:** referenced via `source_url_revalidation_job_reference` from Source URL Change Detection Result, Media Asset Version (when a candidate is created), and audit records.

**Lifecycle states (proposal-level):**

- `received` - job created from an approved Source URL Re-Ingestion Request.
- `validating` - the job is awaiting or evaluating the Source URL Fetch outcome (transport reply, header parsing, body retrieval if applicable).
- `processing` - the job is processing the fetched body for change detection (hash computation, comparison).
- `completed` - the job completed normally; a Source URL Change Detection Result has been recorded.
- `failed` - the job failed before reaching change detection; a Source URL Change Detection Result with a failure discriminator has been recorded.

**Required fields and references (proposal-level):**

- `source_url_revalidation_job_reference` - canonical identifier.
- `source_url_reingestion_request_reference` - the request that produced this job.
- `vendor_entity_scope_reference` - vendor scope from Tenant Company.
- `target_source_image_url_reference` - the Source Image URL Reference being revalidated.
- `target_media_asset_version_reference` - the Media Asset Version currently associated with the target Source Image URL Reference (typically the `current` version).
- `integration_management_transport_reference` - reference to the Integration-Management-owned transport invocation.
- `source_url_etag_reference` - optional; supplemental hint captured at fetch time.
- `source_url_last_modified_reference` - optional; supplemental hint captured at fetch time.
- `source_url_content_hash_reference` - the hash captured for change detection (authoritative).
- `source_url_change_detection_result_reference` - the resulting Change Detection Result.
- `job_lifecycle_state` - enumeration above.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- The Source URL Revalidation Job invokes Integration Management transport by reference; it does not perform the HTTP request itself.
- The Source URL Revalidation Job is independent of the original `image_url` Media Upload Job. The original job remains in its PR-A `completed` state and is not mutated.
- The Source URL Revalidation Job may run on Source Image URL References whose original `image_url` Media Upload Job's parent Media Upload Session is `completed`. Revalidation operates on the Media Asset Version surface, not on the Media Upload Session.

---

### Source URL Change Detection Result (new evidence record)

The single canonical evidence record for a fetch outcome in a revalidation context.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `source_url_change_detection_result_reference` from Source URL Revalidation Job, Media Asset Version (when a candidate is created), and audit records.

**Required fields and references (proposal-level):**

- `source_url_change_detection_result_reference` - canonical identifier.
- `source_url_revalidation_job_reference` - the job that produced this result.
- `target_source_image_url_reference` - the Source Image URL Reference fetched.
- `target_media_asset_version_reference` - the Media Asset Version associated with the URL at the time of fetch.
- `change_detection_result_discriminator` - enumeration:
  - `hash_unchanged` - the new Source URL Content Hash matches the prior hash; no candidate is created.
  - `hash_changed` - the new hash differs; a candidate Media Asset Version is created.
  - `fetch_unavailable` - the transport could not reach the URL (DNS failure, connection refused, timeout, 5xx); no candidate is created.
  - `fetch_unauthorized` - the transport reached the URL but authentication or authorization failed (401, 403); no candidate is created.
  - `fetch_expired` - the transport reached the URL but it returned an "expired" or "gone" signal (410, or transport-policy-equivalent); no candidate is created.
  - `fetch_redirected` - the transport reached the URL but the redirect materially changed host or path per Integration Management transport policy; routes to System Admin review; no candidate is created until review concludes.
  - `validation_skipped` - ETag or Last-Modified hint indicated no change; the body was not fetched; no candidate is created.
- `source_url_etag_reference` - optional supplemental hint captured at fetch time.
- `source_url_last_modified_reference` - optional supplemental hint captured at fetch time.
- `source_url_content_hash_reference` - the authoritative hash captured (when body was fetched).
- `prior_source_url_content_hash_reference` - the hash of the prior Media Asset Version's source content, for comparison.
- `candidate_media_asset_version_reference` - populated when `change_detection_result_discriminator = hash_changed` and a candidate has been created.
- `fetched_at_timestamp` - the fetch attempt timestamp.
- `audit_reference` - Logs & Audit retention reference.

**Hash authority rule:**

ETag and Last-Modified references are supplemental hints. The Source URL Content Hash is the authoritative change-detection signal. ETag or Last-Modified MAY justify a `validation_skipped` outcome (body not fetched); but `hash_changed` MUST be backed by a Source URL Content Hash comparison.

**Redirect handling rule (contract rule):**

Integration Management resolves redirects at the transport layer. If a redirect materially changes the host or path (per Integration Management transport policy), the Source URL Change Detection Result is recorded with `change_detection_result_discriminator = fetch_redirected` and routes to System Admin review. PR-B does not auto-accept changed-host content. The "materially changes" definition is Integration Management transport policy.

**Failure path behavior:**

For `fetch_unavailable`, `fetch_unauthorized`, `fetch_expired`, and `fetch_redirected`, no candidate Media Asset Version is created. The prior `current` Media Asset Version remains active. The Source URL Change Detection Result is recorded with the discriminator and audit reference. Repeated failures do not auto-restrict the Media Asset Version; restriction is an explicit workflow.

---

### Media Asset Version (existing PR-A entity, hardened by PR-B)

PR-A introduced Media Asset Version with foundation states `created`, `current`, `superseded`, `restricted`, `failed_candidate`. PR-B extends the lifecycle and adds supersession lineage fields. The PR-A foundation states are NOT renamed, removed, or version-bumped.

**Extended lifecycle states (PR-B additions):**

- `candidate` - newly created version (typically from re-ingestion via Source URL Revalidation Job or from a new vendor upload) awaiting Validation, Processing, Readiness, and Version Supersession Evidence.
- `accepted` - candidate that passed Validation, Processing, and Readiness but has not yet been promoted to `current`. Intermediate state preserved for audit and rare-case lag tolerance.
- `rejected` - candidate or version that has been explicitly rejected by reviewer action or by System Admin action. Distinct from `failed_candidate` (which is the automatic fail-safe outcome).
- `revoked` - version that was the `current` (or previously `current`) and has been revoked via Media Restriction Evidence with `restriction_type = revoked`.
- `expired` - version whose `expiration_date` has elapsed.
- `archived` - terminal observability state for very-long-retired versions; preserved for audit; not buyer-visible.

**Additional fields and references (PR-B):**

- `expiration_date` - optional expiration timestamp; drives Media Expiry Evaluation.
- `supersedes_reference` - inverse pointer to the prior Media Asset Version (the version this version replaced). The PR-A `superseded_by_reference` (pointing from prior to new) is preserved; `supersedes_reference` is the new inverse for lineage traversal.
- `version_supersession_evidence_reference` - reference to the Version Supersession Evidence record produced at promotion.
- `restriction_evidence_reference_collection` - collection of Media Restriction Evidence references applying to this version. A given version may have multiple historical evidence records (current `active`, prior `superseded`, prior `expired_restriction`); the collection preserves history.
- `source_url_etag_reference` - optional supplemental hint captured at creation or revalidation.
- `source_url_last_modified_reference` - optional supplemental hint captured at creation or revalidation.

**Promotion rule (canonical, PR-B):**

Promotion from `candidate` to `current` requires:

1. Media Validation Result success.
2. Media Processing Result success.
3. Media Readiness Evidence regeneration.
4. Version Supersession Evidence successfully recorded.

If any of (1)-(4) fails, the candidate transitions to `failed_candidate` (PR-A fail-safe state), and the prior `current` Media Asset Version remains active.

**Active Version Preservation Rule (contract rule, PR-B):**

The prior `current` Media Asset Version remains active until all four promotion conditions succeed. There is no intermediate state in which neither the prior `current` nor the new candidate is the authoritative buyer-visible version. The vendor source URL is never the durable buyer-visible reference under any failure path; the CIXCI Media Asset URL/Reference (PR-A) continues to resolve to the prior `current` version.

**Version Lineage Reference (derived view):**

The chain formed by `supersedes_reference` and `superseded_by_reference` constitutes the Version Lineage Reference. PR-B does NOT store the lineage as a separate entity; the chain is the lineage.

**Rejection vs failed_candidate:**

- `rejected` - explicit reviewer or System Admin action; intentional decision.
- `failed_candidate` - automatic fail-safe outcome on Validation/Processing/Readiness failure.

The two are distinct and not interchangeable. PR-B preserves the PR-A `failed_candidate` semantics.

---

### Version Supersession Evidence (new entity)

The explicit record that one Media Asset Version superseded another.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `version_supersession_evidence_reference` from Media Asset Version (new current), Media Asset Version (prior current), and audit records.

**Required fields and references (proposal-level):**

- `version_supersession_evidence_reference` - canonical identifier.
- `media_asset_reference` - the Media Asset whose `current_media_asset_version_reference` is being changed.
- `candidate_media_asset_version_reference` - the candidate that is becoming the new `current`.
- `prior_current_media_asset_version_reference` - the version that is transitioning from `current` to `superseded`.
- `supersession_trigger` - enumeration: `source_url_reingestion`, `vendor_reupload`, `system_admin_restoration`, `system_admin_correction`.
- `source_url_reingestion_request_reference` - populated when `supersession_trigger = source_url_reingestion`.
- `source_url_revalidation_job_reference` - populated when `supersession_trigger = source_url_reingestion`.
- `source_url_change_detection_result_reference` - populated when `supersession_trigger = source_url_reingestion`.
- `media_validation_result_reference` - the Validation Result for the new candidate.
- `media_processing_result_reference` - the Processing Result for the new candidate.
- `media_readiness_evidence_reference` - the regenerated Media Readiness Evidence reference.
- `supersession_actor_reference` - the actor that authorized the supersession (vendor, System Admin, or scheduled-policy actor).
- `tenant_company_authority_reference` - existing `check_access` reference.
- `supersession_timestamp` - when the supersession was applied.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- Version Supersession Evidence is distinct from Media Restriction Evidence. Supersession is the mechanical version-pair transition; Restriction is the dispositional change applied via Media Restriction Evidence.
- Version Supersession Evidence is required for promotion. Without it, a candidate remains `accepted` (or rolls back to `failed_candidate` on Validation/Processing/Readiness failure).

---

### Media Restriction Request (new entity)

Vendor-initiated or System-Admin-initiated request to restrict, revoke, or expire a Media Asset or Media Asset Version.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `media_restriction_request_reference` from Media Restriction Evidence, audit records.

**Lifecycle states (proposal-level):**

- `requested` - request submitted; authority not yet evaluated.
- `approved` - request approved; Media Restriction Evidence has been or will be created.
- `rejected` - request rejected by authority check or by System Admin action.
- `superseded` - request superseded by a later request for the same target.

**Required fields and references (proposal-level):**

- `media_restriction_request_reference` - canonical identifier.
- `vendor_entity_scope_reference` - vendor scope from Tenant Company.
- `requesting_actor_reference` - the actor that submitted the request.
- `tenant_company_authority_reference` - existing `check_access` reference.
- `target_media_asset_reference` - optional; populated when restriction targets a Media Asset asset-wide (Phase 1 default is per-version, so this is rare in Phase 1; reserved for future asset-wide restriction).
- `target_media_asset_version_reference` - the Media Asset Version targeted.
- `requested_restriction_type` - enumeration: `restricted`, `revoked`, `expired`.
- `requested_effective_date` - when the restriction should take effect.
- `requested_expiration_date` - optional; when the restriction should auto-lift (applicable for time-bound restrictions).
- `request_reason_reference` - reference to vendor or System Admin reason text.
- `request_lifecycle_state` - enumeration above.
- `approval_actor_reference` - populated on `approved` or `rejected`.
- `approval_evidence_reference` - audit-grade reference to the approval action.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- A vendor MAY submit a Media Restriction Request for vendor-scoped Media Asset Versions but CANNOT apply restriction directly.
- A System Admin MAY submit a request and apply restriction; application creates Media Restriction Evidence.
- Authority is evaluated through Tenant Company `check_access`; no new role or capability flag is introduced.

---

### Media Restriction Evidence (existing PR-A entity, hardened by PR-B)

PR-A introduced Media Restriction Evidence as a foundation-only record. PR-B wires it into workflows.

**Lifecycle states (PR-B):**

- `active` - the restriction is currently in effect.
- `superseded` - the restriction has been lifted (a new Media Restriction Evidence record with the lift outcome has been created; this prior evidence is superseded by the lift evidence).
- `expired_restriction` - the restriction has auto-lifted because `restriction_expiration_date` elapsed.

**Additional fields and references (PR-B):**

- `media_restriction_request_reference` - the Request that produced this evidence (if applicable; System-Admin-direct-application paths may bypass a Request and create Evidence directly with System Admin authority).
- `restriction_type` - enumeration: `restricted`, `revoked`, `expired`. **Revocation is modeled here as `restriction_type = revoked`**; no separate Revocation Evidence entity is introduced.
- `applied_actor_reference` - the System Admin actor that applied the restriction.
- `restriction_application_workflow_reference` - the workflow execution reference for audit.
- `restriction_effective_date` - when the restriction takes effect.
- `restriction_expiration_date` - optional; when the restriction auto-lifts.
- `restriction_reason_reference` - reference to the restriction reason text.
- `superseding_media_restriction_evidence_reference` - populated on `superseded`; points to the lift evidence that superseded this evidence.
- `audit_reference` - Logs & Audit retention reference.

**Lift behavior (canonical):**

A restriction lift creates a NEW Media Restriction Evidence record (capturing lift actor, lift reason, lift effective date) and transitions the prior evidence to `superseded` or `expired_restriction`. **Prior evidence is never mutated or deleted.** The new lift evidence may also be in `active` lifecycle state if the lift itself is a restriction-with-different-parameters (e.g., narrowing scope); or it may be implicitly a "no-restriction" record marking the lift. The exact semantics depend on Media Restriction Evidence retention conventions; PR-B preserves the principle that prior evidence is immutable.

**Per-version restriction (Phase 1):**

Restriction propagation is per Media Asset Version in Phase 1. Asset-wide restriction (where restricting one version implicitly restricts all versions of the same Media Asset) is an open question, not introduced by PR-B.

---

### Media Expiry Rule (contract rule, not entity)

Media Expiry is modeled as a contract rule plus `expiration_date` fields. PR-B does NOT introduce a Media Expiry Rule entity in Phase 1.

**Rule statement:**

When `expiration_date` is set on a Media Asset Version or on a Product Media Assignment Evidence record and the current time elapses past the `expiration_date`, the Media Expiry Evaluation Workflow (PR-B Workflow 9) creates Media Restriction Evidence with `restriction_type = expired` for the affected version or assignment, and the Media Usage Disposition Recalculation Workflow (PR-B Workflow 10) updates the affected Product Media Assignment Evidence's `media_usage_disposition` to `expired`. The Media Readiness Evidence is regenerated.

**Trigger mechanism:**

Phase 1 PR-B does NOT specify whether Media Expiry Evaluation runs on a schedule, on read, on a per-asset basis, or some combination. The trigger mechanism is implementation-level. PR-B captures the contract rule and the workflow surface; the trigger is open.

---

### Media Usage Disposition Recalculation (contract rule and workflow surface)

Whenever Media Restriction Evidence is applied, lifted, or expires, AND when a Media Asset Version is superseded, revoked, or expired, the Media Usage Disposition of the affected Product Media Assignment Evidence records is recalculated.

**Inputs:**

- Active Media Restriction Evidence records (with `lifecycle_state = active`) for the Media Asset Version.
- `expiration_date` on Media Asset Version and Product Media Assignment Evidence.
- Media Asset Version `lifecycle_state` (`current`, `superseded`, `restricted`, `revoked`, `expired`, `failed_candidate`).

**Output:**

Recalculated `media_usage_disposition` on each affected Product Media Assignment Evidence record, using the PR-A enumeration: `approved_by_default`, `restricted`, `revoked`, `expired`, `review_required`, `failed`.

**Exclusion rule (canonical):**

The values `restricted`, `revoked`, `expired`, `review_required`, and `failed` exclude the Media Asset Version from being buyer-visible in Media Readiness Evidence. The Buyer Media Export Readiness Reference (PR-A foundation) is recalculated accordingly. PR-B treats this as a single canonical Media-owned rule; buyer-side export concerns are PR-C.

**Output event:**

Media Usage Disposition Recalculation emits `media.media-usage-disposition.recalculated`.

---

### Product Media Assignment Evidence (existing entity, hardened by PR-B)

PR-A introduced Product Media Assignment Evidence with `media_asset_version_reference`, `media_assignment_candidate_reference`, `media_usage_disposition`, `buyer_media_export_readiness_reference`.

**Additional fields and references (PR-B):**

- `expiration_date` - optional expiration timestamp for the assignment. When set and elapsed, Media Expiry Evaluation transitions `media_usage_disposition` to `expired`.
- `prior_product_media_assignment_evidence_reference` - back-pointer to the prior Product Media Assignment Evidence record that this record superseded (populated when version supersession also produces a new assignment evidence record).
- `media_usage_disposition_recalculation_reference` - reference to the most recent Media Usage Disposition Recalculation evidence/event.

**Supersession behavior:**

When a Media Asset Version is superseded (Version Supersession Evidence recorded), a new Product Media Assignment Evidence record is produced for the new current version. The prior Product Media Assignment Evidence record is not mutated; its `media_asset_version_reference` continues to point at the (now `superseded`) prior version for audit. The new record's `prior_product_media_assignment_evidence_reference` points back to the prior record.

---

### Media Readiness Evidence (existing entity, hardened by PR-B)

PR-A introduced Media Readiness Evidence with `main_media_asset_version_reference` and Media Usage Disposition propagation foundation.

**Additional behavior (PR-B):**

- Media Readiness Evidence is regenerated as part of the Candidate Media Asset Version Validation Workflow and Media Usage Disposition Recalculation Workflow.
- Regeneration produces a new Media Readiness Evidence record; the prior record is preserved for audit (per PR-A pattern).
- Media Readiness Evidence treats `restricted`, `revoked`, `expired`, `review_required`, and `failed` Media Usage Disposition values as not buyer-visible.

PR-B does NOT introduce a new field; the recalculation behavior is a contract rule that operates on the PR-A foundation fields.

---

### SKU Alias Mapping (PR-B) (new entity)

A System-Admin-approved mapping from a non-canonical SKU text to a canonical Product Catalog SKU reference. Review-assist only; never `auto_assignable`.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `sku_alias_mapping_reference` from Media Assignment Candidate (when alias resolution applies) and audit records.

**Lifecycle states (proposal-level):**

- `proposed` - mapping proposed by vendor or System Admin; awaiting approval.
- `approved` - mapping approved by System Admin; active for review-assist.
- `rejected` - mapping rejected by System Admin.
- `expired` - mapping `expiration_date` has elapsed.
- `superseded` - mapping superseded by a later mapping for the same `alias_sku_text` in scope.

**Required fields and references (proposal-level):**

- `sku_alias_mapping_reference` - canonical identifier.
- `alias_sku_text` - the non-canonical SKU text (vendor SKU, legacy SKU, alternate SKU, filename SKU pattern).
- `canonical_sku_reference` - the canonical Product Catalog SKU reference (by reference; no Product Catalog mutation).
- `alias_scope` - enumeration: `global`, `vendor`, `import_session`.
- `vendor_entity_scope_reference` - populated when `alias_scope = vendor`.
- `import_session_reference` - populated when `alias_scope = import_session` (references a Media Upload Session or accessory import batch).
- `proposing_actor_reference` - the actor that proposed the mapping.
- `proposal_reason_reference` - reference to the proposal reason text (which may be observed-filename-pattern, vendor-direct-request, or System-Admin-direct-creation).
- `effective_date` - when the mapping becomes effective on `approved`.
- `expiration_date` - optional; when the mapping auto-expires. Default duration is open in PR-B.
- `lifecycle_state` - enumeration above.
- **SKU Alias Approval Evidence (field collection on this entity):**
  - `approval_actor_reference` - the System Admin that approved or rejected.
  - `approval_tenant_company_authority_reference` - existing `check_access` reference.
  - `approval_reason_reference` - reference to the approval or rejection reason text.
  - `approval_timestamp`.
  - `approval_outcome` - `approved` or `rejected`.
- `audit_reference` - Logs & Audit retention reference.

**SKU Alias Matching Rule (canonical, review-assist only):**

When the PR-A SKU-Based Media Assignment Rule produces an Unmatched Media File and the file's parsed SKU resolves through an approved SKU Alias Mapping in scope (`global` always applies; `vendor` applies when the mapping's `vendor_entity_scope_reference` matches the current vendor scope; `import_session` applies when the mapping's `import_session_reference` matches the current Media Upload Session or accessory import batch), Media Manager creates a Media Assignment Candidate with `media_matching_confidence = review_required` and `media_matching_confidence_sub_reason = alias_resolved_pending_review`.

**Alias-Based Auto Assignment Rule (negative contract rule):**

Alias-based candidates are NEVER `auto_assignable` in Phase 1. The PR-A `media_assignment_review_state = auto_assignable` value is reserved for clean SKU evidence (folder SKU agrees with filename SKU, and the SKU is present in the source accessory import batch or Product Catalog product reference set in scope). Aliases do not satisfy the clean-SKU condition; they only resolve a previously-unmatched file to a candidate that routes to review.

**Folder / filename disagreement rule (preservation of PR-A discipline):**

When the parsed file shows folder SKU disagreement with filename SKU, alias resolution does NOT override the disagreement. The Media Assignment Candidate still routes to review with the PR-A sub-reason for folder/filename disagreement (the existing PR-A `media_matching_confidence_sub_reason` value for folder-filename-mismatch is preserved and remains the routing reason). Alias resolution may be captured as supplementary evidence on the candidate but does not change the review disposition or the sub-reason.

**Expiry behavior:**

When `expiration_date` elapses, the SKU Alias Mapping's `lifecycle_state` transitions to `expired`. The mapping no longer resolves future alias resolution attempts. Prior alias-resolved candidates are not retroactively affected; their review disposition stands.

---

### Media Assignment Candidate (existing PR-A entity, hardened by PR-B)

PR-A introduced Media Assignment Candidate with `media_matching_confidence` (`clean`, `review_required`) and `media_assignment_review_state` (`pending`, `auto_assignable`, `review_required`, `approved`, `rejected`, `superseded`).

**Additional field (PR-B):**

- `media_matching_confidence_sub_reason` - enumeration extended with `alias_resolved_pending_review`. PR-A sub-reasons are preserved.

**Alias-resolved candidate behavior:**

An alias-resolved candidate has:

- `media_matching_confidence = review_required`.
- `media_matching_confidence_sub_reason = alias_resolved_pending_review`.
- `media_assignment_review_state = review_required`.
- `sku_alias_mapping_reference` - reference to the resolving alias mapping.

Such candidates enter the existing PR-A Media Assignment Candidate Review Workflow.

---

### Upload Failure Recovery Evidence (new entity)

The audit record for a retry following a partial or full child Media Upload Job failure.

**Ownership:** Media / Image Asset Management.

**Identity:** referenced via `upload_failure_recovery_evidence_reference` from the retry Media Upload Job and from audit records.

**Required fields and references (proposal-level):**

- `upload_failure_recovery_evidence_reference` - canonical identifier.
- `media_upload_session_reference` - the parent session.
- `original_media_upload_job_reference` - the failed original job.
- `retry_media_upload_job_reference` - the new sibling retry job.
- `failure_reason_reference` - reference to the failure reason captured on the original job.
- `preserved_prior_successes_collection` - collection of Media Asset Version references for files that succeeded in the original job before the failure (these references are not mutated by the retry).
- `recovery_actor_reference` - the actor that initiated the retry.
- `tenant_company_authority_reference` - existing `check_access` reference.
- `recovery_timestamp`.
- `audit_reference` - Logs & Audit retention reference.

**Boundary discipline:**

- Upload Failure Recovery Evidence is the audit record for the retry; it does not perform the retry. The retry is performed by creating a new sibling Media Upload Job under the same Media Upload Session.
- The original Media Upload Job is NOT mutated. Its `lifecycle_state` remains `failed` (or `failed_with_partial_successes`); the original job retains its `retry_count = 0` view at the time of failure (the retry-count tracking applies on the new sibling).

---

### Media Upload Job (existing PR-A entity, hardened by PR-B)

PR-A introduced Media Upload Job with `job_type` discriminator (`zip`, `manual_drag_drop`, `image_url`, `future_api`) and lifecycle states `received`, `validating`, `processing`, `completed`, `failed`.

**Additional fields and references (PR-B):**

- `resumable_upload_reference` - optional opaque reference to an underlying resumable-upload session or token at the implementation layer. Placeholder reference only.
- `retry_count` - integer; incremented on each retry that produces a new sibling Media Upload Job (the new sibling's `retry_count` is the predecessor's `retry_count + 1`).
- `last_retry_at` - timestamp of the most recent retry initiation.
- `retry_reason_reference` - reference to the reason text for the retry.
- `upload_failure_recovery_evidence_reference` - populated on retry jobs; links to the Upload Failure Recovery Evidence record.
- `prior_media_upload_job_reference` - populated on retry jobs; back-pointer to the original failed job.

**Additional outcome discriminators (PR-B):**

PR-A lifecycle terminal states `completed` and `failed` are preserved. PR-B adds additive sub-discriminators on those terminal states:

- `completed_with_partial_failures` - sub-discriminator on `completed`. The job completed but some files within the job failed validation, processing, or assignment. Partial successes are preserved as Media Asset Versions and Product Media Assignment Evidence records per PR-A behavior.
- `failed_with_partial_successes` - sub-discriminator on `failed`. The job overall failed but some files within the job succeeded. Partial successes are preserved.

The sub-discriminator does not change the top-level lifecycle state; it adds detail.

---

### Media Upload Session (existing PR-A entity, hardened by PR-B)

PR-A introduced Media Upload Session with lifecycle states `open`, `paused`, `completed`, `superseded`.

**Child Job Failure Handling Rule (canonical, PR-B):**

When a child Media Upload Job transitions to `failed` (or `failed_with_partial_successes`), the parent Media Upload Session does NOT auto-close. The session remains in its prior lifecycle state (`open` or `paused`) and accepts further child jobs.

**Prior Successful Upload Preservation Rule (canonical, PR-B):**

Any failure (large-file, chunk-level, retry, session-level) MUST NOT destroy, hide, or mutate prior successful child jobs' outputs. Prior Media Asset Versions, Product Media Assignment Evidence, Media Upload Coverage Summary records, and Media Readiness Evidence records remain valid.

**Retry as new sibling rule:**

A retry following a child job failure creates a new sibling Media Upload Job under the same Media Upload Session. The retry job is NOT a continuation of the original job; it is a sibling. The retry job carries an Upload Failure Recovery Evidence reference back to the original failed job.

---

### Upload Session Size Policy (contract rule)

PR-B captures architectural threshold surfaces:

- Maximum ZIP size.
- Maximum per-file size.
- Maximum total session size (across all child jobs).
- Maximum per-session child job count.

Numeric thresholds for each surface are implementation-level and remain deferred. PR-B documents the surfaces only.

---

### Upload Chunk Reference (implementation-level, not Media entity)

PR-B does NOT introduce Upload Chunk Reference as a Media architecture entity. Chunking is storage and transport concern (Integration Management or implementation runtime). The `resumable_upload_reference` field on Media Upload Job is the only PR-B surface that touches resumable-upload semantics; the chunking detail lives below it.

---

### Inherited deferral wording cleanup (PR-B)

Where existing PR-A documents describe buyer media export, marketing downloads, CDN, signed URLs, or renditions as "PR-B" deferrals, the canonical interpretation under PR-B is that those items are **PR-C** or **future PR**. PR-B does NOT rewrite PR-A sections; this clarification applies prospectively to new readings of the documents.

PR-B-added language uses "PR-C" or "future PR" directly for those items.

---

### Summary of PR-B-added entities, fields, references, and rules

**New entities (7):**

- Source URL Re-Ingestion Request
- Source URL Revalidation Job
- Source URL Change Detection Result
- Version Supersession Evidence
- Media Restriction Request
- SKU Alias Mapping
- Upload Failure Recovery Evidence

**Existing entities hardened (7):**

- Media Asset Version (extended lifecycle states; supersession lineage; expiration_date)
- Media Restriction Evidence (workflow-wired; lifecycle states; lift behavior)
- Media Upload Job (resumable, retry, partial-outcome fields)
- Media Upload Session (child-job-failure rule; preservation rule; retry-as-sibling rule)
- Media Assignment Candidate (alias_resolved_pending_review sub-reason)
- Product Media Assignment Evidence (expiration_date; supersession back-pointer; disposition recalculation reference)
- Media Readiness Evidence (regeneration on disposition recalculation)

**Field / state / reference / contract-rule surfaces (no new entity):**

- Source URL ETag Reference (hint field)
- Source URL Last-Modified Reference (hint field)
- Source URL Unavailable State, Source URL Unauthorized State, Source URL Expired State, Source URL Redirect Handling Rule (discriminator values and contract rules on Source URL Change Detection Result)
- Media Asset Version Lifecycle State (extended enumeration)
- Active Media Asset Version Reference (documentation synonym for `current_media_asset_version_reference`)
- Candidate Media Asset Version Reference (optional field on Media Asset)
- Prior Media Asset Version Reference (preserved as PR-A `superseded_by_reference`; PR-B adds inverse `supersedes_reference`)
- Superseded / Rejected / Archived Media Asset Version Reference (modeled as lifecycle states)
- Version Lineage Reference (derived view)
- Version Validation Reference, Version Processing Reference, Version Readiness Reference (existing fields; documentation clarified)
- Media Expiry Rule (contract rule, not entity)
- Media Expiry Date (`expiration_date` field on Media Asset Version and Product Media Assignment Evidence)
- Media Usage Disposition State (existing PR-A field; enumeration preserved)
- Media Usage Disposition Recalculation (contract rule and workflow)
- Restricted / Revoked / Expired / Review Required / Failed Media Exclusion Rule (single canonical rule)
- SKU Alias Approval Evidence (field collection on SKU Alias Mapping)
- SKU Alias Scope (field)
- SKU Alias Expiry (`expiration_date` field on SKU Alias Mapping)
- SKU Alias Matching Rule (contract rule)
- Alias-Based Assignment Review State (existing field with new sub-reason)
- Alias-Based Auto Assignment Rule (negative contract rule)
- Resumable Upload Reference (optional field on Media Upload Job)
- Upload Chunk Reference (implementation-level, NOT introduced)
- Upload Continuation State (sub-discriminator on Media Upload Job terminal states)
- Upload Retry State (fields on Media Upload Job)
- Upload Session Size Policy (contract rule)
- Child Job Failure Handling Rule (canonical contract rule)
- Prior Successful Upload Preservation Rule (canonical contract rule)
