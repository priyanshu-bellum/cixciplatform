# Media / Image Asset Management API Contracts

This document defines proposal-level API surfaces for Media Manager upload, missing media summaries, assignment, readiness evidence, reports, and overrides.

Media APIs operate on Media-owned upload, validation, processing, assignment, profile, override, and readiness state. They must not create Product Catalog product records, decide final buyer visibility/export, deliver notifications, own Integration transport, or own Logs & Audit immutable evidence.

## Media Manager Handoff API

### Get Post-Import Media Action

Purpose: allow the platform to present `Upload Images in Media Manager` after successful accessory import.

Inputs:

- source accessory import batch reference
- vendor/entity scope reference
- Product Catalog product references summary

Output:

- action label: `Upload Images in Media Manager`
- Media Manager route/reference
- media readiness summary reference, if available
- missing media count summary
- audit reference

## Missing Media Summary API

### Get Missing Media Summary

Inputs:

- vendor/entity scope reference
- source accessory import batch reference
- Product Catalog product references, optional

Output:

- media readiness summary id
- imported accessory count reference
- accessories with assigned media count
- accessories missing required Main image count
- accessories missing required video count placeholder
- media readiness status summary
- missing media report reference
- Product Catalog product references
- audit reference

## Upload APIs

### Upload ZIP

Inputs:

- vendor/entity scope reference
- source accessory import batch reference, optional
- ZIP file reference placeholder

Output:

- ZIP upload job id
- upload status
- validation status
- processing status
- media asset references
- asset version/hash references
- assignment candidates
- readiness evidence references
- Logs & Audit upload evidence reference placeholder

### Manual Media Upload

Inputs:

- vendor/entity scope reference
- media file references
- product/variant assignment hints, optional

Output:

- media upload job id
- media asset references
- asset version/hash references
- validation results
- processing results
- assignment status
- readiness evidence references

### Add Image URLs

Inputs:

- vendor/entity scope reference
- image URL references
- product/variant assignment hints, optional

Output:

- URL ingestion job id
- Integration transfer/receipt reference placeholder where applicable
- media asset references
- asset version/hash references
- validation results
- processing results
- assignment status
- readiness evidence references

### Future Video Upload

Inputs and outputs should mirror media upload while preserving configured video readiness rules. Video support remains proposal-level where configured.

## Assignment APIs

### Assign Media Asset To Product / Variant

Inputs:

- media asset id
- media asset version/hash
- Product Catalog product reference
- variant reference where applicable
- SKU/UPC reference
- media role: Main image, Alt, Lifestyle, Packaging, video placeholder, other
- role priority/order
- assignment source reference
- actor/user reference

Output:

- Product Media Assignment reference
- Product Media Assignment version/hash
- assigned media role disposition
- assignment status
- validation result reference/version
- processing result reference/version
- applied-vs-ignored state
- supersession reference, if assignment replaces a prior assignment
- review-required state
- audit reference

Superseded or ignored assignments must not continue to satisfy Media Readiness Evidence.

## Required Media Profile APIs

### Get Required Media Profile

Inputs:

- category/vendor/buyer-type/Product Type scope
- product reference, optional
- vendor/entity scope reference, optional

Output:

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

### Update Required Media Profile Placeholder

Required profile update APIs are System Admin/configuration placeholders. They should produce a new version and supersede prior profile evidence without rewriting historical visibility/export, invoice, analytics, or audit references.

## Readiness APIs

### Get Media Readiness Evidence

Inputs:

- Product Catalog product reference
- variant reference where applicable
- SKU/UPC reference, optional
- vendor/entity scope reference

Output:

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
- retail-ready-from-media standpoint flag
- blocker/warning/override disposition
- System Admin override reference
- source version/hash
- source timestamp
- freshness timestamp
- expiration timestamp
- supersession reference
- review-required state
- audit reference

Readiness responses should make summary booleans traceable to exact Media Asset ID/version, Product Media Assignment/version, validation result/version, and processing result/version.

### Apply Authorized Media Readiness Override

Inputs:

- media readiness evidence reference
- required media profile reference
- product/category/vendor/buyer-type/Product Type scope
- product reference, optional
- vendor/entity scope reference
- override mode
- override reason
- Tenant Company authority reference
- effective date
- expiration date

Output:

- override id
- updated media readiness evidence reference
- required media profile reference
- override mode
- source version/hash
- freshness timestamp
- source disposition
- applied-vs-ignored state
- supersession reference
- review-required state
- blocker/warning/override disposition
- audit reference

Tenant Company owns authority for who may apply overrides. Media Management owns override evidence from an asset-readiness standpoint.

## Product Catalog Consumption API Expectations

Product Catalog consumers should receive or query Media Readiness Evidence with exact asset, assignment, profile, validation, processing, and override references. Product Catalog must block or route visibility/export evaluation to review when any required asset/assignment/validation/profile evidence is missing, stale, expired, superseded, ignored, failed, or conflicting.

## Report APIs

### Download Missing Media Report

Inputs:

- vendor/entity scope reference
- source accessory import batch reference, optional
- required media profile reference, optional

Output:

- missing media report id
- report content reference
- SKU/UPC/accessory references
- required media type
- current readiness status
- validation errors
- assignment status
- Logs & Audit report/file/download evidence reference placeholder

Media Management owns report content/source readiness state. Logs & Audit owns immutable report/file/download evidence.

## Error / Review Responses

APIs should support:

- missing Product Catalog product reference
- missing required Main image
- missing required media profile
- stale required media profile
- superseded required media profile
- ignored required media profile
- invalid media file
- media validation failed
- missing validation result
- media processing failed
- missing processing result
- assignment failed
- stale or superseded Product Media Assignment
- readiness blocked by stale assignment
- readiness blocked by missing validation result
- stale media readiness evidence
- superseded media readiness evidence
- ignored media readiness evidence
- override authority missing
- expired or superseded override evidence
- hard blocker active
- review required

## PR-A API Surface Notes - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section captures placeholder-only API surface notes for the PR-A hardening pass. **PR-A does NOT finalize routes, request/response schemas, status codes, authentication, or implementation behavior.** Concrete OpenAPI is intentionally excluded; `openapi-contracts.md` is not modified by this PR.

### API contract principles (PR-A reaffirmation)

- Media APIs expose Media-owned surfaces (sessions, jobs, candidates, asset versions, coverage summaries, validation/processing results, readiness evidence, restriction evidence).
- Media APIs must not mutate Product Catalog accessory product records or decide final buyer visibility/exportability.
- Product Catalog consumes Media Readiness Evidence with exact references; PR-A adds `media_asset_version_reference` and `media_usage_disposition` to that consumption surface.
- Tenant Company owns authority decisions for Media Restriction Evidence and Media Assignment Candidate Review approvals.
- Integration Management owns external HTTP fetch transport for image URL ingestion; Media references the transport record.
- Logs & Audit File Tracking owns immutable retention; Media references audit records.
- **Matching identifier on all Media-side API surfaces is SKU.** UPC is preserved on Product Catalog records but is not a Media-side matching key on any API. Where existing Media-side API documents reference "SKU/UPC reference" as an input or output, the canonical PR-A interpretation is `sku_reference`. Inputs and outputs introduced by PR-A use `sku_reference` exclusively.
- The vendor source URL is captured for audit only; the durable buyer-visible surface is the `cixci_media_asset_url_reference`.

### Placeholder API surfaces introduced by PR-A

The following placeholder API surfaces are described at proposal level. Concrete route paths, request/response schemas, status codes, and pagination semantics are deferred to a later API governance / OpenAPI hardening pass.

#### Media Upload Session APIs (placeholder)

- **Initialize Media Upload Session** - vendor begins a new session in their scope; inputs include vendor scope reference, source accessory import batch reference (optional), Product Catalog product reference collection (optional). Output: Media Upload Session reference, initial `multi_part_upload_completion_state = open`, latest Media Upload Coverage Summary reference (null on initial).
- **Transition Media Upload Session State** - vendor signals `open -> paused` (return later), `open -> completed` (continue without uploading), or `paused -> completed`. Inputs include session reference and target state. Output: updated session record.
- **Get Media Upload Session** - lookup by reference. Output: session record including child Media Upload Job reference collection and latest Media Upload Coverage Summary reference.

#### Media Upload Job APIs (placeholder)

- **Create ZIP Media Upload Job** - vendor uploads one ZIP within a session; inputs include session reference and ZIP file reference placeholder. Output: Media Upload Job reference with `job_type = zip`.
- **Create Manual Drag-and-Drop Media Upload Job** - vendor uploads one or more files within a session; inputs include session reference and per-file references plus optional per-file assignment hints. Output: Media Upload Job reference with `job_type = manual_drag_drop`.
- **Create Image URL Ingestion Media Upload Job** - vendor provides one or more image URLs within a session; inputs include session reference and source image URL reference collection plus optional per-URL assignment hints. Output: Media Upload Job reference with `job_type = image_url`; Integration Management transport reference where applicable.
- **Get Media Upload Job** - lookup by reference. Output: job record including lifecycle state, per-file outcomes, validation result reference collection, processing result reference collection, and (for `job_type = image_url`) Source URL Fetch Result reference collection.

#### Media Assignment Candidate APIs (placeholder)

- **List Media Assignment Candidates by Session** - lookup with filters by review state, matching confidence, and SKU. Output: candidate reference collection.
- **Get Media Assignment Candidate** - lookup by reference. Output: candidate record including matching confidence, sub-reason, review state, and references to the Media Asset Version and target Product Catalog product.
- **Approve / Reject Media Assignment Candidate** - System Admin or authorized vendor reviewer transitions a `review_required` candidate to `approved` or `rejected`. Inputs include candidate reference, target state, reviewing actor reference, optional rejection reason. Output: updated candidate record; on `approved`, the promoted Product Media Assignment Evidence reference.

#### Media Asset Version APIs (placeholder)

- **Get Media Asset Version** - lookup by reference. Output: version record including `cixci_media_asset_url_reference` (durable; not the vendor source URL), `source_image_url_reference` (for URL-ingested versions; source-only), `source_url_content_hash`, validation/processing result references, lifecycle state.
- **List Media Asset Versions by Media Asset** - lookup with optional lifecycle-state filter. Output: version reference collection in supersession order.

#### Media Upload Coverage Summary APIs (placeholder)

- **Get Media Upload Coverage Summary** - lookup by reference. Output: coverage record including imported accessory SKU count, media-assigned SKU count, unmatched media file count, missing-required-media product count, coverage status, vendor options offered.
- **List Media Upload Coverage Summaries by Session** - lookup with optional pagination. Output: summary reference collection in creation order; prior summaries preserved for audit.

#### Source URL Fetch Result APIs (placeholder)

- **Get Source URL Fetch Result** - lookup by reference. Output: result record including `result_discriminator` (one of `fetched`, `failed`, `blocked`, `unauthorized`, `unsupported`, `changed_content_detected`), `fetched_content_hash` (where applicable), `fetch_failure_reason_text` (where applicable), and the underlying Integration Management transport reference where applicable.
- **List Source URL Fetch Results by Media Upload Job** - lookup with optional discriminator filter. Output: result reference collection.

#### Media Restriction Evidence APIs (placeholder, foundation-only)

- **Issue Media Restriction Evidence** - System Admin records a restriction against a Media Asset or Media Asset Version. Inputs include target reference, restriction type (`restricted`, `revoked`, `expired`), Tenant Company authority reference, restricting actor reference, restriction reason text, effective date, optional expiration date. Output: Media Restriction Evidence reference. **Foundation only in PR-A; the full vendor-initiated restriction request workflow and restoration workflow are PR-B.**

### Updates to existing API surfaces (canonical text correction)

The following existing Media API surfaces (defined in existing `api-contracts.md` content) have their matching-identifier semantics corrected under PR-A:

- **Assign Media Asset To Product / Variant** - the existing `SKU/UPC reference` input is read under PR-A as `sku_reference`. UPC is not used for Media-side matching.
- **Get Media Readiness Evidence** - the existing `SKU/UPC reference, optional` input is read under PR-A as `sku_reference, optional`. The `SKU/UPC reference` output field is read under PR-A as `sku_reference`. UPC is not part of the Media-side matching key.
- **Get Missing Media Summary / Download Missing Media Report** - the existing `SKU/UPC/accessory references` output is read under PR-A as `SKU/accessory references`. The Missing Media Report content may reference the underlying Product Catalog accessory record (which carries both SKU and UPC as preserved text identifiers), but the Media-side matching key in the report is SKU.

The above corrections are interpretive; PR-A does not rename existing API field names, but the canonical reading of the matching/identity field is SKU-only. New Media-side API surfaces introduced by PR-A use `sku_reference` exclusively.

### CIXCI-managed media asset URL/reference on existing surfaces

PR-A introduces the `cixci_media_asset_url_reference` field on Media Asset and Media Asset Version. The following existing surfaces reference this field per PR-A:

- Media Readiness Evidence responses include the `cixci_media_asset_url_reference` for the Main asset (via the new `main_media_asset_version_reference`).
- Buyer-export-eligible Product Media Assignment Evidence responses include the `cixci_media_asset_url_reference` per assigned version.
- **Vendor source URL is never returned as the durable buyer-visible reference.** Where a Source Image URL Reference is included in a response (for example, in audit or source-URL-change contexts), it is clearly labeled as source-only.

### Phase 1 deliberate non-behaviors (Media api-contracts side)

- No OpenAPI schemas, route paths, request/response schemas, status codes, pagination semantics, or authentication details. These are deferred to a later API governance / OpenAPI hardening pass.
- No buyer marketing download API (PR-B).
- No signed URL issuance API (PR-B).
- No rendition lookup API (PR-B).
- No source URL re-ingestion trigger API beyond foundation reference (PR-B).
- No vendor-initiated Media Restriction Evidence request API (PR-B).
- No advanced Media Assignment Candidate Review API (escalation, batch approval, multi-step approval) - future operator-surface PR.
- No new external authority API (PR-A keeps authority within Tenant Company existing patterns).

## PR-B API Surface Notes - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section captures placeholder, reference-oriented API surface notes for PR-B. **PR-B does NOT introduce concrete HTTP routes, finalized payloads, or runtime endpoint behavior. `openapi-contracts.md` is NOT modified.** API surface hardening (paths, methods, request/response schemas, status codes, error model, pagination, idempotency keys, OpenAPI specifications) is deferred to a later API Governance Foundation PR and a subsequent Media-specific OpenAPI hardening PR.

The notes below are intended only to (1) record the architectural surface and request/response intent so that later API design has the necessary contract anchors, and (2) make clear what PR-B explicitly does NOT prescribe at the HTTP layer.

### API surface intent (placeholder, non-binding)

The following operations are PR-B-architecture-aligned. They are listed by name and intent only; HTTP method, path, status codes, and payload schema are deferred.

#### Source URL Re-Ingestion

- Submit Source URL Re-Ingestion Request - vendor or System Admin actor; request payload anchors on `target_source_image_url_reference_collection`, `trigger_path`, optional `target_media_asset_version_reference_collection`, optional `request_reason_reference`; response payload anchors on the created `source_url_reingestion_request_reference` and `request_lifecycle_state`.
- Approve / Reject Source URL Re-Ingestion Request - System Admin actor; payload anchors on `source_url_reingestion_request_reference`, decision outcome, and `approval_evidence_reference`.
- Observe Source URL Revalidation Job - read-only; payload anchors on `source_url_revalidation_job_reference`, `job_lifecycle_state`, and (when present) `source_url_change_detection_result_reference`.
- Observe Source URL Change Detection Result - read-only; payload anchors on `source_url_change_detection_result_reference`, `change_detection_result_discriminator`, and (when present) `candidate_media_asset_version_reference`.

#### Media Asset Version lifecycle and supersession

- Observe Media Asset Version - read-only; payload anchors on `media_asset_version_reference`, `lifecycle_state`, `supersedes_reference`, `superseded_by_reference`, `version_supersession_evidence_reference`, `restriction_evidence_reference_collection`, and `expiration_date`.
- Observe Version Supersession Evidence - read-only; payload anchors on `version_supersession_evidence_reference`, `candidate_media_asset_version_reference`, `prior_current_media_asset_version_reference`, `supersession_trigger`, and the chained Validation / Processing / Readiness references.

#### Restriction, revocation, expiry

- Submit Media Restriction Request - vendor or System Admin actor; payload anchors on target Media Asset Version, requested `restriction_type`, `requested_effective_date`, optional `requested_expiration_date`, and `request_reason_reference`.
- Apply Media Restriction Evidence - System Admin actor only; payload anchors on the Media Restriction Request (if present), `restriction_type`, `restriction_effective_date`, optional `restriction_expiration_date`, and `restriction_reason_reference`.
- Lift Media Restriction Evidence - System Admin actor only; payload anchors on the existing active Media Restriction Evidence, lift reason, and lift effective date. The lift creates a new Media Restriction Evidence record; prior evidence is not mutated.
- Observe Media Restriction Evidence - read-only; payload anchors on `media_restriction_evidence_reference`, `restriction_type`, `lifecycle_state`, `superseding_media_restriction_evidence_reference` (when superseded), and audit reference.
- Observe Media Usage Disposition Recalculation - read-only; payload anchors on `product_media_assignment_evidence_reference`, recalculated `media_usage_disposition`, and `media_usage_disposition_recalculation_reference`.

#### SKU alias mapping (review-assist only)

- Propose SKU Alias Mapping - vendor or System Admin actor; payload anchors on `alias_sku_text`, `canonical_sku_reference`, `alias_scope`, optional scope-specific references, optional `expiration_date`, and `proposal_reason_reference`.
- Approve / Reject SKU Alias Mapping - System Admin actor only; payload anchors on `sku_alias_mapping_reference`, decision outcome, and `approval_reason_reference`.
- Observe SKU Alias Mapping - read-only; payload anchors on `sku_alias_mapping_reference`, `lifecycle_state`, `alias_scope`, and approval evidence field collection.

#### Upload failure recovery

- Initiate Upload Failure Recovery (retry) - vendor or System Admin actor; payload anchors on `media_upload_session_reference`, `original_media_upload_job_reference`, optional retry-job preparation hints (file selection, prior-success exclusion).
- Observe Upload Failure Recovery Evidence - read-only; payload anchors on `upload_failure_recovery_evidence_reference`, original and retry job references, and `preserved_prior_successes_collection`.

### What PR-B intentionally does NOT specify at the API layer

PR-B does NOT specify any of the following at the HTTP / API layer:

- Concrete HTTP methods, paths, or URL structures.
- Concrete request payload schemas (JSON shape, field names at the wire format, required vs optional declarations at the wire format).
- Concrete response payload schemas.
- Concrete status codes, error codes, or error model.
- Concrete pagination scheme for collection endpoints.
- Concrete idempotency-key semantics for submission endpoints.
- Concrete authentication / session model.
- Concrete rate-limiting policy.
- Concrete OpenAPI specification (`openapi-contracts.md` is intentionally NOT modified by PR-B).
- Concrete webhooks, callback URLs, or push-delivery mechanics for PR-B events.
- Concrete buyer-facing API surface (buyer Media Export Package, buyer Marketing Download Package, buyer Media Download Request - all deferred to PR-C).
- Concrete Integration Management API surface (signed URLs, CDN, rendition - deferred to PR-C / Integration Management).
- Concrete API surface for Notification Platform Service consumption of PR-B events - future PR.

### API layering discipline

- API surface hardening for the Media module is the responsibility of a future API Governance Foundation PR and a subsequent Media-specific OpenAPI hardening PR.
- PR-B's role at the API layer is to provide the architectural anchors (entity names, reference field names, lifecycle state enumerations, discriminator enumerations) that later API design will bind to.
- Any change to `openapi-contracts.md`, route prefix, schema component, or authentication contract is OUT OF SCOPE for PR-B.

### Backward compatibility commitment for future API hardening

When future API hardening binds HTTP surfaces to the PR-B architectural anchors:

- PR-B's entity names, reference field names, lifecycle states, and discriminator enumerations are intended to be stable. Changes after PR-B should be additive where possible.
- Reference field names follow the existing PR-A pattern (e.g., `_reference` suffix; explicit reference rather than embedded inline objects in the architectural surface).
- Event names (`media.*` from PR-A and PR-B) are intended to be stable.
- The Promotion Rule, Active Version Preservation Rule, Hash Authority Rule, vendor-cannot-apply-restriction discipline, Alias-Based Auto Assignment negative rule, Child Job Failure Handling Rule, and Prior Successful Upload Preservation Rule are contract surfaces that the API layer must not violate.

### Cross-module API discipline (reaffirmation)

- Product Catalog API is reference-only. PR-B does not introduce any Media-side API operation that writes to Product Catalog.
- Integration Management transport is invoked by reference from Media-side workflows; the Integration Management API surface is NOT modified by PR-B.
- Logs & Audit File Tracking API surface is NOT modified by PR-B. PR-B reuses existing audit reference patterns.
- Tenant Company API surface is NOT modified by PR-B. PR-B uses existing `check_access` patterns.
- Notification Platform Service API surface is NOT modified by PR-B.
