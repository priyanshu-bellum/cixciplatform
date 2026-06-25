# Media / Image Asset Management Specification

This document defines proposal-level Media Manager responsibilities for vendor media upload after accessory catalog import.

## Purpose

Media / Image Asset Management is the bounded context for Media Manager workflows: upload, validation, processing, assignment evidence, required media profiles, readiness evidence, media-readiness override evidence, missing media summaries/reports, media update events, and media audit history references.

Accessory data import and media upload are separate workflows. Vendors import accessory product records first through Product Catalog / Accessory Catalog, then upload and manage images/videos through Media Manager.

## Ownership Scope

Media Management owns:

- media upload methods: ZIP, manual upload, image URLs, media file upload, future video upload support where configured
- media validation and processing
- Media Asset records and asset versions
- Product Media Assignment evidence
- assigned media role disposition
- validation result and processing result evidence
- Required Media Profile records and profile evidence controls
- Media Readiness Evidence with exact asset/assignment/version/validation/processing references
- Media Readiness Override Evidence from an asset-readiness standpoint
- missing media summaries and reports
- media readiness status and media update events
- media audit history references

Media Management does not own:

- Product Catalog accessory product records
- Product Catalog lifecycle, publication, buyer visibility projection, buyer export execution, or buyer selling status
- Device Catalog canonical devices
- Tenant Company user/admin authority, permissions, buyer eligibility, or override authority
- Integration Management external delivery/receipt evidence
- Logs & Audit immutable file/upload/report/download/audit evidence
- Notification delivery
- Pricing, Invoice, Order Routing, Fulfillment/Returns, Procurement, Analytics, AI Agent Services, Launch/Event, Warranty, Accounting, or Payment ownership

## Post-Accessory-Import Handoff

After a successful accessory import, the platform should provide a clear action button: `Upload Images in Media Manager`.

Clarifications:

- Accessory records remain saved after successful accessory import.
- Media upload is not required to save the accessory record.
- Accessory import workflow should not become responsible for image/video upload processing.
- Missing required media affects media readiness, retail-readiness-from-media standpoint, buyer visibility, and exportability according to Product Catalog rules that consume Media readiness evidence.

## Required Media And Readiness

Required media should include, at minimum, a validated Main image unless System Admin configures otherwise.

Default recommendation: missing required Main image should be a hard blocker for buyer visibility and buyer export.

Media readiness statuses include:

- Media Missing
- Media Incomplete
- Media Processing
- Media Failed Validation
- Media Complete
- Not Retail Ready
- Retail Ready From Media Standpoint
- Review Required
- Override Applied

Retail Ready From Media Standpoint is asset-readiness only. It is not full product sellability, Product Catalog publication, buyer visibility, or buyer exportability by itself.

## Asset-Level Bindability Requirement

Media Readiness Evidence must carry enough evidence for Product Catalog to safely consume exact asset and assignment state. Summary booleans are not enough for downstream consumption.

Media Readiness Evidence should include:

- required media profile reference and version/hash
- Main media asset reference and version/hash
- Product Media Assignment reference and version/hash
- assigned media role and assigned media role disposition
- media asset validation result reference and version/hash
- media processing result reference and version/hash
- Main image assigned state and Main image validated state
- assigned and validated applied-vs-ignored state
- freshness/expiration, supersession, review, and audit references

Product Catalog must be able to prove which Media Asset ID, asset version, assignment version, validation result, and processing result made the accessory media-ready.

Missing, stale, expired, superseded, ignored, failed, or conflicting asset, assignment, validation, processing, profile, or override evidence should block or route Product Catalog buyer visibility/export evaluation to review according to Product Catalog and Media rules.

## Required Media Profile Evidence Controls

Required Media Profile records consumed by Product Catalog must be versioned and dispositioned. Profile evidence should include source module, scope, required media rules, blocker/warning mode, effective/end dates, source record version/hash, source timestamp, freshness/expiration timestamps, source disposition, applied-vs-ignored state, supersession, review, and audit references.

Required media profile changes should not silently rewrite historical export, visibility, invoice, analytics, or audit evidence.

## Override Evidence

System Admin can configure whether missing required media is a hard blocker, warning only, or allowed for specific categories, vendors, buyer types, Product Types, or temporary exceptions where authorized.

Tenant Company owns user/admin authority to apply overrides. Media Management owns media-readiness override evidence from an asset-readiness standpoint. Product Catalog consumes override evidence but does not infer override authority or treat override evidence as full product sellability.

Overrides must be versioned, permissioned, auditable, and time-bound where appropriate.

## Boundary Summary

Use these boundaries consistently:

- Media Management owns media upload, validation, processing, assignment evidence, media readiness evidence, required media profiles, media-readiness overrides, and media audit history.
- Product Catalog owns accessory product records and final buyer visibility/export projection.
- Product Catalog consumes Media Readiness Evidence with exact asset/assignment/version/validation references.
- Tenant Company owns override authority and admin/user permission evidence.
- Logs & Audit owns immutable file/upload/report/download/audit evidence.
- Integration Management owns external delivery/receipt evidence.
- Media readiness remains asset-readiness only, not full product sellability.

## PR-A Specification - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section extends the Media / Image Asset Management specification with PR-A hardening rules for media upload session structure, SKU-based assignment, multi-ZIP / multi-upload coverage, CIXCI-managed Media Asset URL/reference, image URL source-only contract, buyer-usable-by-default media usage disposition, and URL-source change foundation. All content is additive.

### Ownership scope additions

Media / Image Asset Management additionally owns:

- Media Upload Session lifecycle and Multi-Part Upload Completion State.
- Media Upload Job `job_type` discrimination across `zip`, `manual_drag_drop`, `image_url`, and `future_api` variants.
- ZIP extraction record-keeping (as field-collection on Media Upload Job) and per-extracted-file outcomes.
- Media Filename Parse Result, Canonical Media Filename normalization, and SKU-Based Media Assignment Rule evaluation.
- Media Assignment Candidate lifecycle, Media Matching Confidence enumeration, and Media Assignment Review State.
- Unmatched Media File record-keeping (as field-collection on Media Upload Job).
- Missing Required Media Result (as field-collection on Media Upload Coverage Summary).
- Media Upload Coverage Summary.
- Media Asset Version, CIXCI Media Asset URL/Reference, Source URL Fetch Result (as reference/evidence surface), Source URL Content Hash, and the Source URL Change Detection Rule (foundation).
- Media Usage Disposition defaulting and Media Restriction Evidence (foundation).
- Buyer Media Export Readiness Reference (foundation).

Media / Image Asset Management does not additionally own:

- Accessory CSV import or accessory ingestion row-level validation (Product Catalog).
- UPC validation, UPC normalization, UPC uniqueness (Product Catalog).
- The external HTTP fetch mechanics for image URLs (Integration Management).
- External storage / CDN / provider integration mechanics (Integration Management; PR-B reference foundation only in Media's CIXCI Media Asset URL/Reference field).
- Immutable evidence storage for upload jobs, validation results, processing results, assignment evidence, Media Asset Versions, Missing Media Reports, or restriction evidence (Logs & Audit File Tracking).
- Tenant authority decisions for Media Restriction Evidence or System Admin overrides (Tenant Company).
- Buyer catalog visibility, buyer export projection, or final buyer-selling-status decisions (Product Catalog).

### SKU-only Media matching (canonical PR-A rule)

**Media matching is SKU-based only.** UPC must not be used for any of the following:

- image import matching
- ZIP image assignment
- manual / drag-and-drop media assignment
- image URL assignment
- Product Media Assignment Evidence matching
- Media Readiness Evidence matching
- Missing Media Coverage Summary matching
- Buyer Media Export Readiness Reference matching
- Unmatched Media File evaluation

UPC remains a Product-Catalog-side identifier on referenced product records. Where existing Media documents reference "SKU/UPC reference" as a matching/identity key, the canonical PR-A interpretation is `sku_reference`. Media-side wording is corrected to SKU-only on data-model, api-contracts, events, event-contracts, workflows, and test-scenarios surfaces. UPC may continue to appear on Media-side surfaces only when explicitly framed as Product Catalog / Accessory Import context, never as Media-side matching logic.

### Media Upload Session structure

A single parent Media Upload Session may include multiple child Media Upload Jobs spanning four ingestion types via `job_type`:

- `zip` - one ZIP file upload. Produces ZIP Extracted File Records (as field-collection on the job) and per-file Media Filename Parse Results.
- `manual_drag_drop` - one or more individually uploaded files via drag-and-drop or file picker.
- `image_url` - one or more vendor-provided image URLs; references Integration Management for external fetch.
- `future_api` - reserved for future API-based ingestion; not implemented in PR-A.

The session's Multi-Part Upload Completion State governs whether further child jobs are accepted: `open`, `paused`, `completed`, or `superseded`. Vendors may pause and return later; sessions are not auto-closed on inactivity in Phase 1.

The legacy entity name "Manual Upload Session" in existing Media documents is read as a Media Upload Job with `job_type = manual_drag_drop`. The renaming is a documentation cleanup; no existing content is rewritten.

### Multi-ZIP / multi-upload coverage discipline

Media Manager must not assume one ZIP file equals a complete image package. After each child upload job completes, Media Manager produces (or updates) a Media Upload Coverage Summary that compares:

- imported accessory SKUs from the source accessory import batch / Product Catalog product reference set in scope.
- media-assigned SKUs in this session so far (those with at least one promoted Product Media Assignment Evidence).
- unmatched media files across all child jobs in this session.
- per-product missing required media results.

The coverage summary surfaces vendor options: `upload_another_zip`, `upload_manually_drag_drop`, `add_image_urls`, `download_missing_media_report`, `continue_without_uploading`, `return_later`. Coverage summaries are versioned per child job completion; the session keeps the latest reference, and prior summaries are preserved for audit.

### Tolerant upload batching, strict assignment

Uploads are accepted into a session even when not all files match cleanly. Auto-assignment requires clean SKU evidence under the SKU-Based Media Assignment Rule:

- For ZIP jobs: folder SKU and filename SKU must agree, and the SKU must be present in the source accessory import batch or the Product Catalog product reference set in scope.
- For manual / drag-and-drop jobs: filename SKU must be present in scope.
- For image URL jobs: the assignment hint (where provided) or parsed SKU (where the URL filename matches the canonical pattern) must be present in scope.

Folder-vs-filename SKU disagreement routes to Media Assignment Candidate with `media_matching_confidence = review_required` and a sub-reason of `folder_filename_sku_mismatch`. Files whose parsed SKU is not present in scope route to Unmatched Media File state. Approved SKU alias mappings are deferred to PR-B.

### Filename ordering and Main_1 primacy

Canonical filename pattern: `{SKU}_{Role}_{Sequence}.ext` where Role is one of `Main`, `Alt`, `Lifestyle`, `Packaging` and Sequence is a positive integer. Accepted extensions in Phase 1: `.png`, `.jpg`, `.jpeg`.

`Main_1` is the primary image. If Main images exist but `Main_1` is missing, the file routes to review. Media Manager does not silently promote `Main_2` to primary unless a documented normalization rule or System Admin review explicitly allows it.

Common separator variations may be normalized internally (the parse result captures the source filename and the canonical form). Display order is derived from the filename sequence number.

### CIXCI-managed Media Asset URL/reference (canonical PR-A rule)

All accepted media, regardless of ingestion method, must resolve to:

- a Media Asset ID
- a Media Asset Version (state `current` for the active version)
- a CIXCI Media Asset URL/Reference (platform-managed; opaque in Phase 1)
- a media role
- a display order
- a Media Validation Result reference
- a Media Processing Result reference
- an audit reference

**Vendor source URLs must not be sent to buyers as durable media URLs.** Buyer product export, buyer marketing download (future PR-B), and storefront display must reference the CIXCI Media Asset URL/Reference, not the vendor source URL.

### Image URL ingestion is source-only (canonical PR-A rule)

For `job_type = image_url`:

1. Vendor provides one or more image URLs.
2. Media Manager creates a Media Upload Job with `job_type = image_url` and captures the vendor URLs on the Source Image URL Reference collection.
3. Integration Management fetches the image content where applicable; Media Manager records the Source URL Fetch Result by reference. Integration Management owns the external fetch mechanics; Media Manager does not perform the transport.
4. Media Manager validates and processes the fetched content.
5. Media Manager creates a Media Asset and a Media Asset Version with the CIXCI Media Asset URL/Reference, the Source Image URL Reference (for audit), and the Source URL Content Hash.
6. Media Manager creates a Product Media Assignment Evidence record (where assignment evidence is clean) or a Media Assignment Candidate (where review is required).
7. Media Manager creates Media Readiness Evidence with references to the Media Asset Version, Product Media Assignment Evidence, Media Validation Result, Media Processing Result, and Required Media Profile.
8. Product Catalog consumes Media Readiness Evidence; the buyer export/download receives the CIXCI Media Asset URL/Reference, not the vendor source URL.

The Source URL Fetch Result is a reference / evidence surface, not a large Media-owned transport entity.

### Buyer-usable-by-default media disposition (canonical PR-A defaults)

Vendor-provided media through CIXCI-supported ingestion methods is buyer-usable by default unless explicitly restricted. PR-A defaults:

- `media_usage_disposition = approved_by_default`
- `buyer_usage_allowed = true`
- `marketing_download_allowed = true`

These defaults apply at Product Media Assignment Evidence creation. Per-asset buyer-use approval is not required for the default path.

**Restriction propagation rule (canonical PR-A rule):** Restricted, revoked, expired, review-required, or failed media must not be included in buyer exports, buyer marketing downloads, storefront display, or buyer-facing rendition production. Product Media Assignment Evidence with a non-default `media_usage_disposition` does not satisfy Media Readiness Evidence.

### URL-source change foundation with fail-safe (canonical PR-A rule)

If source URL content changes (detected via Source URL Content Hash comparison between a subsequent fetch and the prior accepted version's hash):

1. Media Manager does not silently overwrite buyer-visible media.
2. The changed content must be re-ingested (full re-ingestion mechanism deferred to PR-B).
3. The changed content must be validated and processed.
4. A new Media Asset Version must be created with the new content hash and a new CIXCI Media Asset URL/Reference.
5. Assignment and readiness update only if validation passes.
6. The prior Media Asset Version is preserved in audit/history; superseded versions are never deleted.
7. **Fail-safe:** If the new candidate version fails validation, the new candidate transitions to `failed_candidate`, and the prior `current` version remains active and buyer-visible.

PR-A captures the architectural rule above. The full source URL re-ingestion lifecycle (vendor-triggered, scheduled, admin-triggered, ETag / Last-Modified evaluation, detailed supersession workflow) is PR-B.

### Phase 1 validation evidence surfaces

Media Validation Result captures (without specifying runtime mechanism in PR-A):

- accepted formats: PNG preferred, JPG/JPEG accepted.
- not accepted: GIF, HEIC, TIFF.
- corrupt files.
- unsupported MIME type.
- MIME/extension mismatch.
- duplicate filenames.
- duplicate media content hash (Phase 1: warn + flag for review; full deduplication strategy is PR-B).
- malicious file signatures.
- oversized files.
- ZIP bomb / nested archive risk (extraction outcome `archive_nested`; no recursive extraction).
- unmatched filenames (routes to Unmatched Media File).
- conflicting SKU evidence (folder vs filename disagreement).
- missing primary image (`Main_1` missing while `Main_2+` present).
- missing required image role.
- source URL fetch failed.
- source URL unauthorized.
- source URL expired.
- source URL redirects (Phase 1: implementation-level; PR-A captures the outcome enumeration only).
- source URL content changed (foundation signal for the change detection rule above).

### Phase 1 deliberate non-behaviors

The PR-A specification explicitly does NOT introduce:

- Final CDN, signed-URL, rendition, or marketing download package implementation.
- Full Media Asset Version supersession or restoration lifecycle beyond foundation.
- Source URL re-ingestion trigger mechanism.
- Detailed Media Restriction Evidence workflow.
- Buyer marketing download package generation.
- Advanced unmatched media review approval routing.
- Approved SKU alias mappings.
- Per-asset operator display-order override.
- Numerical Media Matching Confidence score.
- Device Catalog image readiness extension.
- Product Catalog, Integration Management, Logs & Audit File Tracking, Tenant Company, or any other module's file modifications.
- OpenAPI hardening.
- Runtime / code / schema / migration changes.

## PR-B Specification - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section specifies the operational lifecycle rules layered on top of the PR-A foundation. All concepts are additive. PR-A states, rules, events, and defaults are preserved without rename, deprecation, or version bump.

### Scope summary

PR-B addresses five lifecycle areas:

1. Source URL re-ingestion and revalidation lifecycle.
2. Detailed Media Asset Version lifecycle and supersession.
3. Restriction, revocation, and expiry workflows.
4. SKU alias mapping as review-assisted only.
5. Large-file and resumable upload architecture rules.

PR-B does not introduce buyer Media Export Package generation, buyer Marketing Download Package generation, signed URL behavior, CDN behavior, rendition behavior, cache invalidation, stale export reference handling, or Product Catalog buyer export coordination. Those items are PR-C.

### Source URL re-ingestion and revalidation lifecycle

Media / Image Asset Management owns the lifecycle rules below. Integration Management owns the external HTTP fetch transport.

- **Trigger paths.** Three architectural trigger paths are supported: vendor-triggered (vendor explicitly requests re-ingestion of one or more Source Image URL References), System-Admin-triggered (System Admin initiates revalidation for a vendor scope, accessory import batch, or specific Media Asset Version set), and scheduled (configurable scheduled revalidation per vendor scope or per Media Asset Version policy). The concrete scheduling mechanism (interval, cron-style, dynamic, or event-driven) is implementation-level.
- **Source URL Re-Ingestion Request.** A Source URL Re-Ingestion Request captures the intent. Required references include the requesting actor reference, Tenant Company authority reference, target Source Image URL Reference (one or more), target Media Asset Version reference (if scoped to a specific version), trigger path (`vendor`, `system_admin`, `scheduled`), and audit reference. Vendor-initiated requests are evaluated by Media-side authority rules through Tenant Company `check_access` against existing vendor scope; System-Admin-initiated requests are evaluated similarly against existing System Admin scope; scheduled requests carry the scheduling policy reference.
- **Source URL Revalidation Job.** The Revalidation Job is the work record for a single revalidation pass. Independent of the original `image_url` Media Upload Job (which remains immutable in `completed` state per PR-A). The Revalidation Job invokes the Integration-Management-owned transport and records the outcome as a Source URL Change Detection Result.
- **Source URL Change Detection Result.** A single canonical evidence record per fetch outcome. Carries a `change_detection_result_discriminator` enumeration: `hash_unchanged`, `hash_changed`, `fetch_unavailable`, `fetch_unauthorized`, `fetch_expired`, `fetch_redirected`, `validation_skipped`. ETag and Last-Modified references are captured as supplemental hint fields; the Source URL Content Hash is the authoritative change-detection signal. The Source URL Change Detection Result is distinct from PR-A's Source URL Fetch Result, which covers initial ingestion.
- **Hash authority rule.** ETag and Last-Modified references are pre-fetch hints. If the transport-level ETag suggests no change, the Revalidation Job may skip body fetch and record `hash_unchanged` with a `validation_skipped` sub-disposition; but if any doubt exists or the transport returns the body, the hash comparison is the authoritative signal. ETag mismatches do not by themselves constitute `hash_changed`; only a Source URL Content Hash mismatch does.
- **Candidate creation rule.** On `hash_changed`, the Revalidation Job creates a Media Asset Version with `lifecycle_state = candidate`. The candidate is then evaluated by the Candidate Media Asset Version Validation Workflow.
- **Fail-safe rule (PR-A preserved).** A candidate that fails Validation, Processing, or Readiness transitions to `failed_candidate`. The prior `current` Media Asset Version remains active. The vendor source URL remains the source reference for audit; the CIXCI Media Asset URL/Reference continues to resolve to the prior `current` version.
- **Failure path behavior.** On `fetch_unavailable`, `fetch_unauthorized`, or `fetch_expired`, the Source URL Change Detection Result is recorded with the discriminator value and audit reference. No candidate is created. The prior `current` version remains active. The vendor and System Admin observe the failure via the Source URL Change Detection Result. Repeated failures do not auto-restrict the Media Asset Version; restriction is an explicit workflow (see below).
- **Redirect handling rule.** Integration Management resolves redirects at the transport layer. If a redirect materially changes the host or path (per Integration Management transport policy), the Source URL Change Detection Result is recorded with `fetch_redirected` and routes to System Admin review. PR-B does not auto-accept changed-host content. The concrete "materially changes" definition is Integration Management transport policy; PR-B captures only the architectural disposition.
- **Boundary discipline.** The Source URL Re-Ingestion Request, Source URL Revalidation Job, and Source URL Change Detection Result are Media-owned. The HTTP transport (DNS, TLS, redirects, header parsing for ETag and Last-Modified, response code interpretation, body retrieval) is Integration-Management-owned. PR-B references Integration Management only.

### Detailed Media Asset Version lifecycle and supersession

Media / Image Asset Management owns the lifecycle. PR-A foundation states are preserved.

- **Foundation states preserved.** `created`, `current`, `superseded`, `restricted`, `failed_candidate`. These PR-A states are NOT renamed, removed, or version-bumped by PR-B.
- **Extended states.** PR-B adds:
  - `candidate` - newly created version (typically from re-ingestion or re-upload) awaiting Validation, Processing, Readiness, and Version Supersession Evidence.
  - `accepted` - candidate that passed Validation, Processing, and Readiness but has not yet been promoted to `current` (intermediate state preserved for audit and for the rare case where Version Supersession Evidence is delayed).
  - `rejected` - candidate or version that has been explicitly rejected by reviewer action or by System Admin action.
  - `revoked` - version that was the `current` (or previously `current`) and has been revoked via Media Restriction Evidence with `restriction_type = revoked`.
  - `expired` - version whose `expiration_date` has elapsed.
  - `archived` - terminal observability state for very-long-retired versions; preserved for audit; not buyer-visible.
- **Active / Current version reference.** The PR-A field `current_media_asset_version_reference` on Media Asset is preserved as the authoritative reference to the buyer-visible version. The term "Active" is a documentation synonym for `current_media_asset_version_reference`; the field name is unchanged.
- **Candidate version reference.** Optional field on Media Asset pointing to the most recent `candidate`-state version; populated during re-ingestion.
- **Prior version reference.** PR-A's `superseded_by_reference` field on Media Asset Version (pointing from the prior version to the new current version) is preserved. PR-B adds an inverse field `supersedes_reference` on Media Asset Version (pointing from the new current version to the prior version) for lineage traversal.
- **Version lineage reference.** Derived view formed by the chain of `supersedes_reference` and `superseded_by_reference`. Not a stored entity; the chain is the lineage.
- **Version Supersession Evidence.** Explicit record that one Media Asset Version superseded another. Captures the trigger (re-ingestion, re-upload, restoration), the candidate-version reference (new current), the prior-current-version reference, the Validation Result reference for the new version, the Processing Result reference for the new version, the Media Readiness Evidence reference, the supersession actor reference, the Tenant Company authority reference, and the audit reference. Version Supersession Evidence is the authoritative record of a version transition. Promotion from `candidate` to `current` requires Version Supersession Evidence to be successfully recorded; without it the candidate remains `accepted` or rolls back to the relevant failure state.
- **Promotion rule (canonical).** Promotion from `candidate` to `current` requires: (1) Validation Result success, (2) Processing Result success, (3) Media Readiness Evidence regeneration, AND (4) Version Supersession Evidence recorded. If any of (1)-(4) fails, the candidate transitions to `failed_candidate` and the prior `current` remains active.
- **Active Version Preservation Rule (contract rule, not workflow).** The prior `current` Media Asset Version remains active until all four promotion conditions succeed. There is no intermediate state in which neither the prior `current` nor the new candidate is the authoritative buyer-visible version.
- **Rejection rule.** A candidate transitions to `rejected` only on explicit reviewer or System Admin action. `rejected` is distinct from `failed_candidate`: `failed_candidate` is the fail-safe automatic outcome on Validation/Processing/Readiness failure; `rejected` is an explicit decision.
- **Restoration.** If a prior `superseded` or `rejected` version is restored to `current`, the restoration goes through the same promotion pipeline (Validation, Processing, Readiness, Version Supersession Evidence). PR-B does not introduce a separate restoration entity; restoration is a re-promotion path.

### Restriction, revocation, and expiry workflows

Media / Image Asset Management owns the lifecycle.

- **Media Restriction Request.** Vendor-initiated or System-Admin-initiated request to restrict, revoke, or expire a Media Asset or Media Asset Version. Captures requesting actor reference, Tenant Company authority reference, target Media Asset / Media Asset Version reference, requested `restriction_type` (`restricted`, `revoked`, `expired`), requested effective date and expiration date (if applicable), reason text reference, and audit reference. A vendor may submit a request but cannot apply restriction directly.
- **Media Restriction Application.** A System Admin applies a Media Restriction Request by creating Media Restriction Evidence. Vendors cannot apply directly. The `restriction_type` field on the Evidence is `restricted`, `revoked`, or `expired`; **revocation is modeled as Media Restriction Evidence with `restriction_type = revoked`**, not as a separate Media Revocation Evidence entity.
- **Media Restriction Lift (and Expiry Evaluation).** Lifting a restriction creates a new Media Restriction Evidence record with the lift outcome (`superseded` lifecycle state on the prior evidence; the lift evidence captures the lift actor, lift reason, lift effective date, and audit reference). **Existing evidence is never mutated or deleted; lift produces new evidence and the prior evidence transitions to `superseded` or `expired_restriction`.** Expiry Evaluation is the auto-lift case driven by the `expiration_date` field.
- **Expiry modeling (canonical).** Expiry is modeled as:
  - `expiration_date` field on Media Asset Version (optional).
  - `expiration_date` field on Product Media Assignment Evidence (optional).
  - Media Expiry Evaluation contract rule (PR-B Workflow 9).
  - No separate Media Expiry Rule entity in Phase 1.
- **Media Usage Disposition Recalculation.** Whenever restriction, revocation, or expiry applies or lifts, the Media Usage Disposition on the affected Product Media Assignment Evidence is recalculated. The PR-A enumeration is preserved: `approved_by_default`, `restricted`, `revoked`, `expired`, `review_required`, `failed`. Recalculation updates Media Readiness Evidence as a Media-owned readiness surface (not a buyer-export rule; buyer-export concerns are PR-C).
- **Exclusion rule (canonical, single rule).** Restricted, revoked, expired, review-required, and failed Media Usage Disposition values exclude the affected Media Asset Version from Media Readiness Evidence as buyer-visible. The Buyer Media Export Readiness Reference (PR-A foundation) is recalculated accordingly. PR-B treats this as a single canonical Media-owned rule; the buyer-side export behavior remains PR-C.
- **Authority.** Tenant Company `check_access` enforces who may submit Media Restriction Requests (vendors and System Admins for their scope) and who may apply Media Restriction Evidence (System Admins only). PR-B introduces no new role or capability flag.
- **Per-version vs asset-wide.** Restriction propagation is per Media Asset Version in Phase 1. A future asset-wide restriction mode is an open question, not introduced by PR-B.
- **Notification reference-only.** Restriction, revocation, and expiry application or lift events may be consumed by Notification Platform Service in a future PR. PR-B does not introduce notification templates, routes, or transport behavior.

### SKU alias mapping as review-assisted only

Media / Image Asset Management owns the alias surface as a review-assist input. Strict SKU-only matching (PR-A) is preserved for auto-assignment.

- **SKU Alias Mapping.** A mapping from a non-canonical SKU text (vendor SKU, legacy SKU, alternate SKU, filename SKU pattern) to a canonical Product Catalog SKU reference. Required fields include `sku_alias_mapping_reference`, `alias_sku_text`, `canonical_sku_reference` (Product Catalog product reference), `alias_scope`, `vendor_entity_scope_reference` (if scoped), `import_session_reference` (if scoped), `effective_date`, `expiration_date` (optional), `lifecycle_state` (`proposed`, `approved`, `rejected`, `expired`, `superseded`), approval evidence field collection, and audit reference.
- **SKU Alias Approval Evidence as field collection.** Approval evidence (approver actor reference, Tenant Company authority reference, approval reason text reference, approval timestamp) is captured as a field collection on SKU Alias Mapping. PR-B does not introduce a separate SKU Alias Approval Evidence entity.
- **SKU Alias Scope.** Enumeration: `global`, `vendor`, `import_session`. Phase 1 alias scope must be explicit; future scopes are possible.
- **SKU Alias Expiry.** `expiration_date` is an optional field on SKU Alias Mapping. The default duration is open in PR-B; specific defaults are a separate business-product decision.
- **SKU Alias Matching Rule (canonical, review-assist only).** When the SKU-Based Media Assignment Rule (PR-A) produces an Unmatched Media File and the file's parsed SKU resolves through an approved SKU Alias Mapping in scope, Media Manager creates a Media Assignment Candidate with `media_matching_confidence = review_required` and `media_matching_confidence_sub_reason = alias_resolved_pending_review`. The Media Assignment Candidate enters the existing PR-A Media Assignment Candidate Review Workflow.
- **Alias-Based Auto Assignment Rule (negative rule).** Alias-based candidates are NEVER `auto_assignable` in Phase 1. The PR-A `media_assignment_review_state = auto_assignable` value is reserved for clean SKU evidence (folder SKU agrees with filename SKU, and the SKU is present in scope). Aliases do not satisfy the clean-SKU condition.
- **Folder / filename disagreement rule.** When the parsed file shows folder SKU disagreement with filename SKU, alias resolution does NOT override the disagreement. The Media Assignment Candidate still routes to review with the PR-A sub-reason for folder/filename disagreement; alias resolution is recorded as supplementary evidence but does not change the review disposition.
- **Approval authority.** System Admin approval is required for `approved` lifecycle state on SKU Alias Mapping. Vendors may propose; System Admins approve or reject. Tenant Company `check_access` enforces the authority boundary.

### Large-file and resumable upload architecture rules

Media / Image Asset Management owns the architecture surface. Storage internals, chunking protocols, and runtime retry tuning remain implementation-level.

- **Resumable Upload Reference.** Optional field on Media Upload Job (`zip` or `manual_drag_drop` `job_type`) carrying an opaque reference to an underlying resumable-upload session or token at the implementation layer. Placeholder reference only; PR-B does not specify the protocol.
- **Upload Chunk Reference.** Implementation-level. NOT introduced as a Media architecture entity. Chunking is storage and transport concern.
- **Upload Continuation State.** Modeled as additive outcome discriminators on the existing PR-A Media Upload Job terminal states: `completed_with_partial_failures` (the job completed but some files within the job failed) and `failed_with_partial_successes` (the job overall failed but some files within the job succeeded). Both discriminators preserve the partial outputs as Media Asset Versions and Product Media Assignment Evidence records.
- **Upload Retry State.** Modeled as additive fields on Media Upload Job: `retry_count`, `last_retry_at`, `retry_reason_reference`. No new top-level lifecycle state.
- **Upload Session Size Policy (contract rule).** Architectural threshold surfaces: maximum ZIP size, maximum per-file size, maximum total session size, maximum per-session child job count. PR-B documents the surfaces only; numeric thresholds remain implementation-level.
- **Child Job Failure Handling Rule (canonical).** When a child Media Upload Job transitions to `failed` (or `failed_with_partial_successes`), the parent Media Upload Session does NOT auto-close. The session remains in its prior lifecycle state (`open` or `paused`) and accepts further child jobs.
- **Prior Successful Upload Preservation Rule (canonical).** Any failure (large-file, chunk-level, retry, session-level) must not destroy, hide, or mutate prior successful child jobs' outputs. Prior Media Asset Versions, Product Media Assignment Evidence, Media Upload Coverage Summary records, and Media Readiness Evidence records remain valid.
- **Retry creates a new sibling.** A retry following a child job failure creates a new sibling Media Upload Job under the same Media Upload Session. The retry job carries an Upload Failure Recovery Evidence reference back to the original failed job. The retry job is NOT a continuation of the original job; it is a sibling.
- **Upload Failure Recovery Evidence.** Audit record for the retry. Captures `original_media_upload_job_reference`, `retry_media_upload_job_reference`, preserved prior successes (Media Asset Versions created before failure, by reference), failure reason reference, recovery actor reference, Tenant Company authority reference, and audit reference.
- **Duplicate detection on retry.** When the retry re-uploads files that already succeeded in the original job, duplicate detection (per PR-A content hash logic) applies. Duplicates are flagged as `review_required` via the existing PR-A Media Assignment Candidate Review Workflow; they do NOT silently overwrite or duplicate prior Media Asset Versions.

### Cross-module boundary discipline reaffirmed

- **Media / Image Asset Management** owns lifecycle, evidence, recalculation, and surfaces introduced by PR-B.
- **Product Catalog** is reference-only. PR-B does not modify Product Catalog files. Product Catalog continues to own accessory product canonical records, SKU/UPC text identifiers, accessory CSV import, and buyer catalog visibility / export projection.
- **Integration Management** is reference-only. PR-B does not modify Integration Management files. Integration Management owns the external HTTP fetch transport, ETag and Last-Modified header parsing at the transport layer, and redirect resolution at the transport layer. Signed URL generation mechanics, CDN behavior, and rendition transport remain Integration-Management-owned but are out of PR-B scope; those are PR-C / future hardening.
- **Logs & Audit File Tracking** is reference-only. PR-B does not modify Logs & Audit files and does not introduce a new retention class, redaction class, or access class. PR-B evidence records reuse existing `audit_reference` patterns.
- **Tenant Company** is reference-only. PR-B does not modify Tenant Company files and does not introduce a new role or capability flag. PR-B authority-bearing actions flow through existing `check_access` patterns.
- **Notification Platform Service** is reference-only as a future hook. No notification templates, routes, or transport behavior are introduced by PR-B.

### What PR-B intentionally does NOT prescribe

- Buyer Media Export Package generation behavior. PR-C.
- Buyer Marketing Download Package generation behavior. PR-C.
- Buyer Media Download Request and Buyer Media Download Evidence. PR-C.
- Stale Export Reference Rule and previously-exported-media handling after supersession or revocation. PR-C.
- Active Version Export Rule vs Superseded Version Export Rule at the buyer side. PR-C.
- CDN Provider Reference, Storage Provider Reference. PR-C / Integration Management.
- Signed URL Reference, Signed URL Expiration Rule, Durable Media Reference vs Temporary Access URL. PR-C / Integration Management.
- Rendition Profile, Rendition Processing Result, Rendition Readiness Evidence. PR-C.
- Cache Invalidation Reference, Revoked URL Handling Rule. PR-C.
- Concrete chunking protocol, resumable-upload runtime mechanics, numeric upload thresholds. Implementation-level.
- Notification templates and routing for restriction / revocation / expiry. Future PR.
- OpenAPI hardening.
- Runtime / code / schema / migration / build changes.
- Rewrite, rename, or removal of any PR-A foundation state, rule, event, default, or boundary.
