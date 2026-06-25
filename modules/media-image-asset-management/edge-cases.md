# Media / Image Asset Management Edge Cases

This document captures proposal-level edge cases for Media Manager required media readiness and Product Catalog consumption.

## Accessory Import And Media Separation

- Accessory import succeeds but no media is uploaded.
- Vendor leaves Media Manager immediately after import.
- Product records remain saved, editable, and visible to vendor/System Admin when media is missing.
- Product Catalog should block buyer visibility/export when required media is a hard blocker and readiness evidence is missing.

## Asset And Assignment Evidence

- Main image assigned flag is true but Product Media Assignment reference is missing.
- Main image assigned flag is true but Media Asset version/hash is missing.
- Main image validated state is true but validation result reference/version is missing.
- Processing completed status exists but processing result reference/version is missing.
- Assignment is superseded after readiness evidence was created.
- Assignment is ignored or rejected after readiness evidence was created.
- Multiple Main image assignments exist with conflicting role priority/order.
- Main image assignment points to a stale or superseded Media Asset version.
- ZIP upload reprocesses a file and creates a new asset version after prior readiness evidence existed.

Expected handling: Media Readiness Evidence should be blocked, superseded, or routed to review. Product Catalog should not consume summary booleans without exact asset, assignment, validation, and processing evidence.

## Required Media Profile Evidence

- Required Media Profile is missing.
- Required Media Profile is stale or expired.
- Required Media Profile is superseded while buyer visibility/export evaluation is pending.
- Required Media Profile is ignored or has conflicting source disposition.
- Category-specific and vendor-specific media rules conflict.
- Buyer-type-specific rule conflicts with Product Type rule.
- Profile change would make a previously media-ready item no longer ready.

Expected handling: Required Media Profile evidence should include source version/hash, source timestamp, freshness/expiration, source disposition, applied-vs-ignored state, supersession, review state, and audit reference. Profile changes should not silently rewrite historical export, visibility, invoice, analytics, or audit evidence.

## Override Evidence

- Override exists but Tenant Company authority reference is missing.
- Override is expired.
- Override is superseded.
- Override is stale or ignored.
- Override scope does not match product/category/vendor/buyer-type/Product Type.
- Override lifts a hard media blocker but Product Catalog lifecycle, channel, buyer, or publication evidence still blocks visibility/export.

Expected handling: Media owns override evidence from an asset-readiness standpoint only. Product Catalog consumes override evidence but owns final buyer visibility/export projection. Tenant Company owns override authority.

## Product Catalog Consumption

- Product Catalog receives readiness evidence without exact Media Asset ID/version.
- Product Catalog receives readiness evidence without Product Media Assignment/version.
- Product Catalog receives readiness evidence without validation or processing result references.
- Product Catalog receives readiness evidence with stale, expired, superseded, ignored, failed, or conflicting asset/assignment/profile/override evidence.
- Product Catalog receives readiness evidence marked Retail Ready From Media Standpoint but Product Catalog lifecycle or buyer visibility rules block publication.

Expected handling: Product Catalog should block or route buyer visibility/export evaluation to review. Media readiness remains asset-readiness only, not full product sellability.

## External Evidence Boundaries

- Image URL ingestion fails after Media upload job is created.
- External media pull has Integration delivery/receipt failure.
- Missing Media Report is generated but file/download evidence is unavailable from Logs & Audit.
- Notification-triggering event is emitted but notification delivery fails.

Expected handling: Media records Media-owned state and references external evidence. Integration Management owns external delivery/receipt evidence, Logs & Audit owns immutable file/report/download evidence, and Notification owns delivery evidence.

## PR-A Edge Cases - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section captures proposal-level edge cases introduced or sharpened by the PR-A hardening pass. Expected handling references PR-A workflows and entities defined in `workflows.md` and `data-model.md`.

### Session structure edge cases

- **Vendor initiates a new Media Upload Session for an accessory import batch that already has an `open` or `paused` session for the same vendor.** Expected handling: Phase 1 allows multiple sessions per accessory import batch; each session is its own coverage scope. Cross-session aggregation is not introduced by PR-A. Future operator-surface PR may enforce single-active-session rules.
- **Vendor pauses a Media Upload Session and never returns.** Expected handling: the session remains in `paused` state indefinitely in Phase 1. No auto-close on inactivity is introduced by PR-A. Future operator-surface PR may introduce auto-close policies.
- **Vendor signals "Continue without uploading more" on a session with no child upload jobs.** Expected handling: the session transitions from `open` to `completed`. The Media Upload Coverage Summary records `coverage_status = none`. No Product Media Assignment Evidence exists; accessory records remain saved (existing rule preserved); Product Catalog visibility/export rules apply (missing required media is a hard blocker for buyer visibility per existing default).
- **Vendor creates a Media Upload Session for an accessory import batch that does not exist in Product Catalog.** Expected handling: PR-A Workflow 1 validates the source accessory import batch reference; if not present, the session is not created. The vendor receives a Media-side error referencing the missing batch. PR-A does not specify the error API; the architectural rule is that sessions require valid scope.
- **Vendor's Tenant Company access changes mid-session (for example, vendor is paused).** Expected handling: in-flight Media Upload Jobs continue or fail per existing Tenant Company `check_access` patterns; new child jobs are denied. PR-A defers detailed mid-session permission-revocation handling to future operator-surface PR.

### Child Media Upload Job edge cases

- **ZIP file is unreadable.** Expected handling: PR-A Workflow 2 sets `lifecycle_state = failed` with `jobLevelFailureReason = zip_unreadable`. No ZIP Extracted File Records are produced. `media.upload-job.failed` is emitted. The session can still accept new child jobs.
- **ZIP file is oversized.** Expected handling: PR-A Workflow 2 sets `lifecycle_state = failed` with `jobLevelFailureReason = zip_oversized` (specific size limits are implementation-level; PR-A captures the failure surface).
- **ZIP file contains a nested archive.** Expected handling: ZIP Extracted File Records carry `extraction_outcome = archive_nested` for the nested-archive entry. No recursive extraction is attempted. The nested archive is not validated or processed; it routes to Unmatched Media File state or validation failure (per discriminator).
- **ZIP contains files with extensions outside accepted formats (GIF, HEIC, TIFF).** Expected handling: per-file validation fails with `unsupported_format`. No Media Asset Version is created. The file's ZIP Extracted File Record is preserved for audit; the file's validation result records the failure reason.
- **Manual drag-and-drop job has files with no filename pattern and no assignment hint.** Expected handling: PR-A Workflow 3 routes each such file to Unmatched Media File state. No Media Assignment Candidate is created.
- **Image URL Ingestion Job has an empty URL list.** Expected handling: job transitions to `failed` with `jobLevelFailureReason = job_aborted_by_actor` or equivalent. No Source URL Fetch Result is produced.
- **Image URL Ingestion Job has all URLs fail (mix of failed, blocked, unauthorized, unsupported).** Expected handling: per-URL Source URL Fetch Results are recorded with appropriate `result_discriminator`. Job transitions to `failed` with `jobLevelFailureReason = all_url_fetches_failed`. No Media Asset Versions are created. The coverage summary surfaces the failure.

### Filename parsing edge cases

- **Filename uses an unsupported separator that Media cannot normalize.** Expected handling: PR-A Workflow 5 sets `parse_disposition = ambiguous`; `media_matching_confidence = review_required` with sub-reason `ambiguous_parse`. Routes to review.
- **Filename has a valid SKU but no role or sequence.** Expected handling: `media_role = unparseable` or `parse_disposition = unparseable`; file routes to Unmatched Media File state unless a vendor assignment hint resolves it (manual jobs only).
- **Filename has a SKU that matches partially (substring match) but not exactly.** Expected handling: SKU-Based Media Assignment Rule requires exact SKU match against the in-scope set. Partial match does NOT auto-assign; the file routes to Unmatched Media File state. Approved SKU alias mappings are deferred to PR-B; no fuzzy matching in Phase 1.
- **Filename has a sequence number with leading zeros (e.g., `S001_Main_01.png`).** Expected handling: Phase 1 default is to normalize numeric sequence values; the canonical filename's `display_order` is the integer value (1, not 01). Implementation-level detail; PR-A captures the normalization expectation only.
- **Two files in the same job parse to the same SKU/role/display order combination (duplicate filename or near-duplicate).** Expected handling: PR-A Workflow 5 detects the duplicate; `media_matching_confidence = review_required` with sub-reason `duplicate_filename`. Both candidates route to review; auto-assignment is suppressed.

### SKU-Based Media Assignment Rule edge cases

- **Folder SKU is `S001` and filename SKU is `S001`, but `S001` is not in the source accessory import batch nor in the Product Catalog product reference set in scope.** Expected handling: file routes to Unmatched Media File state. No Media Assignment Candidate is created.
- **Vendor's accessory import batch has been updated mid-session, adding new SKUs.** Expected handling: the Media Upload Session's `product_catalog_product_reference_collection` captures the snapshot at session initialization; later additions are not retroactively in scope unless the session is explicitly refreshed (refresh mechanism is implementation-level; PR-A captures the architectural rule that the session's scope is set at initialization).
- **A file matches a SKU that is in the Product Catalog product reference set but is in a different vendor scope.** Expected handling: SKU-Based Media Assignment Rule scope check fails (the SKU is not in the vendor's scope for the session). File routes to Unmatched Media File state. Cross-vendor matching is not permitted.
- **Vendor provides a manual upload assignment hint with a UPC value instead of a SKU.** Expected handling: PR-A's matching rule is SKU-only. UPC-based hints are rejected at validation; the file routes to Unmatched Media File state. The error surface explicitly indicates SKU is required.

### Media Assignment Candidate Review edge cases

- **A `review_required` candidate is approved after the underlying Product Catalog product has been retired.** Expected handling: PR-A Workflow 10 validates the product reference at promotion time. If the product no longer exists or has been retired, the promotion fails; the candidate transitions to `rejected` with a system-recorded reason. The reviewer's intent to approve is preserved for audit; the actual Product Media Assignment Evidence is not created.
- **A `review_required` candidate is approved by an actor who lacks authority.** Expected handling: Tenant Company `check_access` denies the action; the candidate remains in `review_required` state; no Product Media Assignment Evidence is created.
- **Two reviewers simultaneously approve and reject the same candidate.** Expected handling: implementation-level concurrency; PR-A captures the architectural rule that the terminal review state (`approved` or `rejected`) is set once and is read-only thereafter. Last-write-wins behavior is acceptable in Phase 1 if both actors have authority; the audit trail records both attempts.

### Media Asset Version edge cases

- **Validation fails for a file that previously produced a `current` Media Asset Version (via re-upload of the same SKU/role/display order).** Expected handling: no new Media Asset Version is created; the prior `current` version remains active and buyer-visible. The validation failure is recorded for audit.
- **Two Media Upload Jobs in different sessions produce Media Asset Versions for the same SKU/role/display order combination.** Expected handling: PR-A treats each Media Asset Version independently. Product Media Assignment Evidence supersession (one assignment supersedes another) follows existing Media patterns. The Media Asset Version itself is not auto-deduplicated in Phase 1; the duplicate content hash is detected at validation and surfaces as a `review_required` candidate.
- **The `cixci_media_asset_url_reference` is null at Media Asset Version creation time.** Expected handling: PR-A requires the field on Media Asset Version creation. If the field cannot be set (for example, the implementation-level URL service is unavailable), the Media Asset Version is NOT created; the upload's per-file outcome records the failure for audit. PR-A does not specify the retry mechanism.
- **A Media Asset Version transitions to `failed_candidate` immediately at creation (validation failed before transition to `current`).** Expected handling: the version is preserved for audit with `lifecycle_state = failed_candidate` and `failed_candidate_reason` set to the validation failure reference. The prior `current` version (if any) remains active. **Fail-safe rule applied.**

### Source URL Fetch Result edge cases

- **Source URL returns a redirect chain.** Expected handling: Integration Management handles the redirect transport-level; Media records the Source URL Fetch Result with the final fetched content (where Integration Management surfaces it) or with `result_discriminator = failed` (where the redirect chain cannot be resolved). Detailed redirect handling is implementation-level; PR-A captures the outcome enumeration.
- **Source URL returns content with the same hash as a previously-failed candidate.** Expected handling: the hash equality alone does not imply the prior failure repeats. Media re-validates; if validation passes this time, a new Media Asset Version may be created (assuming the underlying issue was transient).
- **Source URL fetch succeeds but the fetched content's hash is identical to the current `current` Media Asset Version's hash.** Expected handling: `result_discriminator = fetched`; no new Media Asset Version is created (the content is identical to the existing version). The Source URL Fetch Result is recorded for audit. The Media Asset Version's `source_url_content_hash` is unchanged.
- **Source URL is removed (404) after a previously successful fetch.** Expected handling: the next fetch attempt records `result_discriminator = failed` with `fetch_failure_reason_text` indicating the 404. The existing `current` Media Asset Version remains active; fail-safe rule applied (the prior version's `cixci_media_asset_url_reference` continues to resolve via platform-managed storage independent of the vendor URL).

### Coverage Summary edge cases

- **A Media Upload Coverage Summary is produced while a sibling Media Upload Job is still in `validating` state.** Expected handling: the Coverage Summary reflects the assignment state at the moment of evaluation. A later sibling job's completion produces a new Coverage Summary; the prior summary is preserved for audit. Phase 1 does not implement a "waiting room" for in-flight sibling jobs.
- **All accessory SKUs in scope have assignments but some assignments are in `review_required` state.** Expected handling: `coverage_status = partial` (not `complete`) because Coverage Summary considers only promoted Product Media Assignment Evidence (which requires `approved` or `auto_assignable` review state).
- **The Coverage Summary's `imported_accessory_sku_collection` is empty (the session was initialized without a source accessory import batch or product reference set).** Expected handling: `coverage_status = none` and `missing_required_media_product_count = 0`. Vendor options offered are still surfaced; the vendor may add image URLs or manual files for products not in the import-batch scope (subject to vendor scope).

### Media Usage Disposition / Restriction edge cases

- **A Media Restriction Evidence is issued but the underlying Media Asset Version has multiple Product Media Assignment Evidence records (the same version is assigned to multiple products).** Expected handling: PR-A Workflow 12's propagation rule applies to all Product Media Assignment Evidence records that reference the restricted Media Asset Version. All affected assignments transition `media_usage_disposition`. The full propagation workflow is PR-B; PR-A captures only the propagation rule.
- **A Media Restriction Evidence is issued with an `expiration_date` in the past.** Expected handling: the restriction is effectively immediate-expired. Phase 1 treats this as a foundation-only signal; the full restoration workflow (on expiry of restriction) is PR-B.
- **A Product Media Assignment Evidence has `media_usage_disposition = approved_by_default` but the underlying Media Asset Version is in `lifecycle_state = restricted`.** Expected handling: the version's restricted state takes precedence; the disposition propagation rule re-evaluates the assignment to `restricted`. Inconsistent states are reconciled by re-running PR-A Workflow 11.

### Buyer export readiness edge cases

- **Media Readiness Evidence is satisfied but Product Catalog's buyer visibility/export rules block publication for other reasons.** Expected handling: existing rule preserved - Media Readiness Evidence is asset-readiness only; Product Catalog owns final buyer visibility/export. Buyer export does not occur; PR-A does not modify Product Catalog rules.
- **Buyer Media Export Readiness Reference is satisfied at session completion, but a restriction is later issued.** Expected handling: the Buyer Media Export Readiness Reference satisfaction is re-evaluated when Media Readiness Evidence is superseded (via PR-A Workflow 11). Buyer-export-eligible state transitions to ineligible. Concrete buyer export package re-evaluation is PR-B.

### Cross-module / cross-process edge cases

- **Logs & Audit File Tracking retention is unavailable at the moment a PR-A workflow attempts to create an Audit Record.** Expected handling: PR-A workflows reference Logs & Audit retention via the existing Audit Record Creation Workflow; Logs & Audit availability and retry behavior are Logs & Audit territory. PR-A does not specify retry; the Media-side record is still created with `audit_reference = pending` if Logs & Audit retention is deferred (implementation-level; future Logs & Audit hardening area).
- **Integration Management transport reference is unavailable at the moment a Source URL Fetch Result is recorded.** Expected handling: PR-A uses placeholder reference language for the `integration_management_transport_reference` field; Phase 1 allows null where no specific hook exists. The Media-side Source URL Fetch Result is still recorded with `result_discriminator` set per the actual fetch outcome (assuming Integration Management can report it).
- **Product Catalog's source accessory import batch is updated mid-session (an accessory record is corrected or removed).** Expected handling: Phase 1 treats the session's scope as set at initialization. Mid-session Product Catalog updates do not retroactively change the in-scope SKU set. Concrete refresh semantics are deferred to PR-B or future operator-surface PR.
- **Tenant Company authority for a System Admin reviewer is revoked mid-review.** Expected handling: Tenant Company `check_access` denies the in-flight action; the candidate remains in `review_required` state. PR-A does not introduce parallel authority checks; the existing Tenant Company pattern applies.

### Phase 1 deliberate non-resolutions

The following are intentionally left unresolved in PR-A:

- The precise file-size, ZIP-size, ZIP-bomb-detection thresholds and runtime mechanisms (implementation-level).
- The precise malicious-file-signature detection mechanism (implementation-level; runtime security area).
- The precise duplicate-content-hash deduplication policy (Phase 1 default: warn + flag for review; full deduplication strategy is PR-B).
- The trigger mechanism for source URL re-ingestion (vendor-triggered, scheduled, admin-triggered; PR-B).
- ETag / Last-Modified evaluation logic (PR-B).
- The full Media Asset Version supersession workflow (PR-B).
- Auto-close policy for inactive Media Upload Sessions (future operator-surface PR).
- Cross-session aggregation of Media Upload Coverage Summary (future operator-surface PR).
- Detailed Media Restriction Evidence initiation, approval routing, propagation, and restoration workflows (PR-B).
- Buyer marketing download package generation, signed URL issuance, rendition production (PR-B).
- Approved SKU alias mappings (PR-B).
- Advanced Media Assignment Candidate Review escalation, multi-step approval, batch approval (future operator-surface PR).

## PR-B Edge Cases - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section enumerates edge cases for PR-B. Each case describes a non-obvious or boundary situation and the architectural disposition. Concrete implementation handling is deferred.

### Source URL re-ingestion edge cases

#### EC-PRB-1.1 - Hash unchanged but ETag changed

- **Situation:** The transport returns a body with content hash matching the prior hash, but the response ETag differs from the prior ETag.
- **Disposition:** Content Hash is authoritative. `change_detection_result_discriminator = hash_unchanged`. The new ETag is captured as a supplemental hint on the Source URL Change Detection Result; the prior Media Asset Version's `source_url_etag_reference` field is updated for future hint use. No candidate is created. The prior `current` remains active. (ETag drift without content change is common and not architecturally significant beyond updating the hint.)

#### EC-PRB-1.2 - Hash changed but ETag unchanged (transport bug or proxy interference)

- **Situation:** The transport returns a body with content hash differing from the prior hash, but the response ETag matches the prior ETag.
- **Disposition:** Content Hash is authoritative. `change_detection_result_discriminator = hash_changed`. A candidate is created. The ETag mismatch with the body is captured for audit but does NOT block candidate creation. (This case may indicate proxy or origin misbehavior; the candidate then goes through Validation, which catches content quality issues.)

#### EC-PRB-1.3 - Redirect chain longer than transport policy allows

- **Situation:** The transport encounters a redirect chain that exceeds Integration Management's policy limit.
- **Disposition:** Integration Management transport rejects the request at the transport layer. The Source URL Change Detection Result is recorded with `change_detection_result_discriminator = fetch_redirected` (or `fetch_unavailable` per Integration Management transport policy; the discriminator value is determined by Integration Management). PR-B captures the architectural disposition; the concrete chain-limit value is Integration Management territory.

#### EC-PRB-1.4 - Redirect to same-host different path (not "materially different")

- **Situation:** A 301/302 redirect from `https://vendor.example.com/old-path/image.jpg` to `https://vendor.example.com/new-path/image.jpg`. The host is unchanged; the path differs.
- **Disposition:** Integration Management transport policy determines whether the path change is "material". Two outcomes are architecturally allowable:
  1. Transport follows the redirect transparently; Media-side sees only the final body. The Change Detection Result is `hash_unchanged` or `hash_changed` per body comparison.
  2. Transport reports the redirect to Media-side; the Change Detection Result is `fetch_redirected` and routes to System Admin review.
- The choice between (1) and (2) is Integration Management transport policy; PR-B accepts either disposition.

#### EC-PRB-1.5 - Transport returns body smaller than expected (truncation)

- **Situation:** The transport returns a body that is shorter than the prior content (e.g., truncated mid-stream).
- **Disposition:** Content Hash differs from prior. `change_detection_result_discriminator = hash_changed`. A candidate is created. Media Validation evaluates the candidate; truncated images typically fail Validation (e.g., decode error, dimension mismatch), routing the candidate to `failed_candidate`. Prior `current` remains active per the fail-safe rule.

#### EC-PRB-1.6 - Transport returns body of different content type

- **Situation:** The transport returns a body whose Content-Type differs from the prior (e.g., previously `image/jpeg`, now `text/html` because the host now returns an error page with 200 status).
- **Disposition:** Content Hash differs. `change_detection_result_discriminator = hash_changed`. A candidate is created. Media Validation evaluates the candidate against permitted image content types; a non-image content type fails Validation; the candidate transitions to `failed_candidate`. Prior `current` remains active.

#### EC-PRB-1.7 - Concurrent revalidation requests for same URL

- **Situation:** Two Source URL Re-Ingestion Requests for the same Source Image URL Reference are submitted in close succession.
- **Disposition:** Each request produces its own Source URL Revalidation Job. Both jobs run (possibly concurrently or serially per implementation). The second job to complete may detect the same `hash_unchanged` outcome as the first (if no content change occurred in between), or `hash_changed` if a real change occurred between the two fetches. The duplicate-candidate detection is left to PR-A's content hash logic at the Media Asset Version layer; PR-B does not introduce a separate request-deduplication rule. **Open question retained:** whether to deduplicate concurrent requests at the Request layer.

#### EC-PRB-1.8 - Scheduled revalidation runs on a Source URL Reference whose `current` is already `failed_candidate` (from prior re-ingestion)

- **Situation:** A prior re-ingestion produced a `failed_candidate`; the prior `current` version is still active. A new scheduled revalidation runs.
- **Disposition:** The scheduled Revalidation Job operates on the active `current` (per the Active Media Asset Version Reference). The prior `failed_candidate` is not retried; it remains in `failed_candidate` for audit. The new Revalidation Job produces its own Change Detection Result and (potentially) a new candidate.

### Media Asset Version lifecycle edge cases

#### EC-PRB-2.1 - Candidate exists for a Media Asset that has no prior `current` (uncommon path)

- **Situation:** A Media Asset has no `current` version (perhaps because the original ingestion never succeeded, or all prior versions are `superseded` / `rejected` / `failed_candidate`). A new candidate arrives.
- **Disposition:** Promotion proceeds through PR-B Workflow 4 (Candidate Validation) and PR-B Workflow 5 (Supersession). The Version Supersession Evidence's `prior_current_media_asset_version_reference` may be empty (no prior current). The candidate promotes directly to `current`. The fail-safe rule does not apply in the no-prior-current case; there is no prior version to preserve.

#### EC-PRB-2.2 - Two concurrent candidates for same Media Asset

- **Situation:** Two re-ingestion paths produce two candidates concurrently (e.g., a vendor-triggered and a scheduled revalidation both producing a candidate).
- **Disposition:** Both candidates exist. PR-B does NOT define automatic conflict resolution. The first to complete Validation, Processing, Readiness, and Version Supersession Evidence becomes the new `current`. The second candidate (still mid-pipeline when the first completes) needs to be re-evaluated against the new `current`. **Open question retained:** concurrent-candidate conflict resolution policy.

#### EC-PRB-2.3 - Restoration of a `superseded` version to `current`

- **Situation:** A System Admin determines that a prior `superseded` version was actually correct and should be restored.
- **Disposition:** The restoration goes through the same promotion pipeline. A new candidate copy of the superseded version's payload is treated as a candidate (or the superseded version is re-promoted through the pipeline). The candidate completes Validation, Processing, Readiness, and Version Supersession Evidence (with `supersession_trigger = system_admin_restoration`). Upon promotion, the current `current` becomes `superseded` and the restored version becomes `current`. Lineage chain reflects the restoration as a normal supersession edge.

#### EC-PRB-2.4 - Restoration of a `rejected` version

- **Situation:** A System Admin reverses a prior reject decision.
- **Disposition:** Similar to EC-PRB-2.3. The `rejected` version is re-promoted through the pipeline with `supersession_trigger = system_admin_correction`. Upon promotion, the version transitions to `current` (and the prior `current` to `superseded`).

#### EC-PRB-2.5 - Version with both `expiration_date` and active restriction

- **Situation:** A `current` Media Asset Version has `expiration_date` set AND an active Media Restriction Evidence with `restriction_type = restricted`.
- **Disposition:** Both apply. Media Usage Disposition is `restricted` (the explicit restriction wins precedence over implicit expiration). When the `expiration_date` elapses, a Media Restriction Evidence with `restriction_type = expired` may also be applied; the version then has two active restriction evidence records (one `restricted`, one `expired`). Media Usage Disposition resolution under multiple active restrictions follows precedence: `revoked` > `expired` > `restricted` > `review_required` > `failed` > `approved_by_default`. **Open question retained:** explicit precedence rule for multi-restriction.

#### EC-PRB-2.6 - `archived` state usage in Phase 1

- **Situation:** A very old `superseded` version is moved to `archived`.
- **Disposition:** `archived` is a terminal observability state for very-long-retired versions. PR-B introduces the state but does NOT define the automatic transition trigger from `superseded` to `archived` (retention policy is a Logs & Audit hardening concern). In PR-B, `archived` may be applied by explicit System Admin action only; automatic archival is deferred.

### Restriction, revocation, expiry edge cases

#### EC-PRB-3.1 - Restriction request submitted on a `superseded` version

- **Situation:** A vendor submits a Media Restriction Request targeting a Media Asset Version that is already `superseded`.
- **Disposition:** The request is valid (the version may still be referenced by prior Product Media Assignment Evidence records). A System Admin may apply restriction to a `superseded` version. The version's lifecycle state transitions to `restricted` (a `superseded` version may simultaneously be `restricted` per lifecycle composition; the Media Asset Version `lifecycle_state` field reflects the most recent transition). **Architectural note:** the `lifecycle_state` enumeration is single-valued in PR-B; if the restriction logically composes with `superseded`, the implementation may model this as `restricted` overriding `superseded` in the field while preserving the prior `superseded` state in audit history. **Open question retained:** lifecycle state composition for restriction-on-superseded.

#### EC-PRB-3.2 - Restriction request on a `failed_candidate`

- **Situation:** A vendor submits a Media Restriction Request targeting a `failed_candidate` version.
- **Disposition:** A `failed_candidate` is already excluded from buyer-visible Media Readiness Evidence per the PR-A Exclusion Rule (Media Usage Disposition = `failed`). Restriction on a `failed_candidate` is technically valid (it adds explicit restriction evidence) but is operationally redundant. PR-B accepts the request; the System Admin MAY reject it as redundant.

#### EC-PRB-3.3 - Restriction lift on a version that no longer exists (deletion edge case)

- **Situation:** PR-B preserves prior versions; no PR-B workflow deletes a Media Asset Version. Therefore the "lift on non-existent version" case should not occur. If it does occur due to upstream data corruption, the lift action is rejected at the data layer.

#### EC-PRB-3.4 - Expiry on a version whose Product Media Assignment Evidence is already `expired`

- **Situation:** A Product Media Assignment Evidence has `expiration_date` set and elapsed. Media Expiry Evaluation applies restriction. Then the Media Asset Version's own `expiration_date` also elapses.
- **Disposition:** Both expiration events fire. The Product Media Assignment Evidence's `media_usage_disposition` is already `expired` from the first event; the second event re-evaluates and the disposition remains `expired`. Two Media Restriction Evidence records (with `restriction_type = expired`) may exist; both are valid and preserved.

#### EC-PRB-3.5 - Restriction without an active `current` version (asset has only candidates / failed_candidates)

- **Situation:** A Media Asset has no `current` Media Asset Version (the prior `current` was `revoked`, leaving only `candidate` and `superseded` versions).
- **Disposition:** Restriction may still be applied to any specific Media Asset Version (per the per-version Phase 1 discipline). The asset-wide buyer-visibility is already not affected (there is no `current`). The restriction is recorded for audit.

#### EC-PRB-3.6 - Auto-lift via `restriction_expiration_date` but a different active restriction exists

- **Situation:** A Media Asset Version has two active Media Restriction Evidence records: one with `restriction_type = restricted` and `restriction_expiration_date` elapsing, and one with `restriction_type = revoked` (no expiration).
- **Disposition:** The auto-expiring `restricted` record transitions to `expired_restriction` per PR-B Workflow 9. The `revoked` record remains active. Media Usage Disposition is recalculated; it remains `revoked` (per precedence). The Media Asset Version's `lifecycle_state` remains `revoked`.

### SKU alias edge cases

#### EC-PRB-4.1 - Multiple approved alias mappings resolve same `alias_sku_text` differently

- **Situation:** A `global`-scope alias resolves `OLD-SKU-123` to `CANON-A`, and a `vendor`-scope alias for the current vendor resolves `OLD-SKU-123` to `CANON-B`.
- **Disposition:** PR-B does NOT define automatic precedence between scopes in Phase 1. The architectural surface allows both matches. The implementation may:
  1. Surface both candidates to review (multiple `media_assignment_candidates` for the same file).
  2. Apply a fixed precedence (e.g., `vendor` scope wins over `global`).
- **Open question retained:** alias scope precedence rule.

#### EC-PRB-4.2 - Alias mapping points to a canonical SKU that has since been deleted from Product Catalog

- **Situation:** An approved alias mapping references `canonical_sku_reference` that points to a Product Catalog product that has been deleted or deactivated.
- **Disposition:** The alias resolution still produces a candidate. The candidate's review step in PR-A's Media Assignment Candidate Review Workflow will surface the canonical-SKU-invalid condition. Reviewer rejects the candidate. The alias mapping itself MAY be flagged for System Admin attention (open question: alias-mapping cleanup on canonical-SKU deletion).

#### EC-PRB-4.3 - Vendor proposes a global-scope alias

- **Situation:** A vendor's proposal request specifies `alias_scope = global`.
- **Disposition:** The proposal authority check (Tenant Company `check_access`) denies the request at submission time per the permissions matrix (vendor cannot propose global-scope). The Request is not created.

#### EC-PRB-4.4 - Alias-resolved candidate with multiple folder paths

- **Situation:** A file `OLD-SKU-123_Main_1.jpg` is uploaded inside a folder `OLD-SKU-123/` in one ZIP and also inside `LEGACY-OLD-SKU-123/` in a different ZIP within the same Media Upload Session.
- **Disposition:** Two separate Unmatched Media Files are evaluated. If both folder SKUs resolve via alias to the same canonical SKU, two alias-resolved candidates are produced. Both go through review. The reviewer may approve both, approve one and reject the other, or reject both. PR-A's existing duplicate-handling logic applies.

#### EC-PRB-4.5 - Alias resolution would create an `auto_assignable` candidate per signal, but the negative rule prevents it

- **Situation:** A file's folder SKU and filename SKU agree on `OLD-SKU-123`. An approved alias resolves `OLD-SKU-123` to `CANON-456`. In principle the folder/filename agreement signal might suggest `auto_assignable`.
- **Disposition:** **The Alias-Based Auto Assignment Rule (negative) prevents this.** The candidate is `review_required` with sub-reason `alias_resolved_pending_review`. PR-B enforces the negative rule unconditionally.

#### EC-PRB-4.6 - Alias mapping `effective_date` is in the future

- **Situation:** A System Admin approves a SKU Alias Mapping with `effective_date` set 30 days in the future.
- **Disposition:** Until `effective_date` arrives, the mapping is `approved` but does NOT resolve alias matching. Subsequent Unmatched Media File evaluations do NOT use the mapping. After `effective_date` arrives, the mapping resolves matching. **Open question retained:** whether the mapping's `lifecycle_state` should reflect the not-yet-effective condition explicitly.

### Upload failure and recovery edge cases

#### EC-PRB-5.1 - Retry on a child job whose parent session is `completed`

- **Situation:** The vendor pressed "complete" on the Media Upload Session before noticing a child job had failed. The session is now `completed`.
- **Disposition:** The session lifecycle state `completed` per PR-A prevents new child jobs from being added. The retry path requires the session to be `open` or `paused`. **Architectural option:** the System Admin or vendor MAY transition the session back to `open` (PR-A allowable state transition); the retry then proceeds. **Open question retained:** automatic session reopen-on-retry-attempt vs explicit reopen.

#### EC-PRB-5.2 - Retry on a child job whose parent session is `paused`

- **Situation:** Vendor paused the session; the failed child job needs a retry.
- **Disposition:** Retry is allowed. A new sibling Media Upload Job is created. The session remains `paused`. Vendor decides when to resume.

#### EC-PRB-5.3 - Retry initiated while original job is still in `validating` or `processing`

- **Situation:** Vendor mistakenly initiates a retry while the original job is still in-flight (not yet `failed`).
- **Disposition:** PR-B does NOT define this case explicitly. The retry workflow is gated on the original job being in a terminal state (`failed` or `failed_with_partial_successes`, or `completed_with_partial_failures` for partial-failure recovery). If the original is not yet terminal, the retry request is rejected at the workflow gate. **Open question retained:** behavior when retry is requested for an in-flight job.

#### EC-PRB-5.4 - Retry produces a job that itself fails partway

- **Situation:** Sibling retry job 1 fails partway. Vendor retries again, producing sibling 2.
- **Disposition:** Each retry produces its own sibling. `retry_count` increments per pair. Multiple Upload Failure Recovery Evidence records are produced (one per failure-recovery pair). The session remains open through all retries.

#### EC-PRB-5.5 - Content hash collision on retry between different files

- **Situation:** Vendor's retry includes a different file whose content hash happens to collide with an existing Media Asset Version's hash (extremely rare; hash collision implies cryptographic-grade collision).
- **Disposition:** PR-A's content hash duplicate-detection logic surfaces the collision as a duplicate. The new candidate is flagged as `review_required`. The reviewer disambiguates. PR-B does NOT introduce a separate collision-handling rule.

#### EC-PRB-5.6 - Original job failure was caused by transient infrastructure issue; retry succeeds without changes

- **Situation:** The original job's failure reason is a transient infrastructure issue (transport timeout, storage unavailability). Vendor retries; the retry succeeds with the same input.
- **Disposition:** Standard retry path. Upload Failure Recovery Evidence captures the original failure reason. The successful retry produces Media Asset Versions and Product Media Assignment Evidence per PR-A behavior. PR-A's duplicate detection on content hash may flag the retry's uploads as duplicates of partial successes from the original job (if any partial successes existed); duplicates route to review per PR-A.

#### EC-PRB-5.7 - Resumable upload reference becomes invalid (server-side session expiry)

- **Situation:** A Media Upload Job is configured with `resumable_upload_reference`. The vendor pauses; the underlying resumable-upload session expires server-side. Vendor returns and attempts to resume.
- **Disposition:** PR-B does NOT specify resumable-upload session expiry behavior. The architectural disposition: if the implementation cannot resume, the original job transitions to `failed` with a retry-eligible failure reason. The vendor initiates a retry per PR-B Workflow 14. The retry uploads the file payload anew. PR-A's duplicate detection on content hash applies.

### Cross-flow and observability edge cases

#### EC-PRB-6.1 - Recalculation cascades for a Media Asset Version with many assignments

- **Situation:** A Media Asset Version is assigned to 50 Product Media Assignment Evidence records (the version represents a generic accessory image used across many product variants).
- **Disposition:** Media Usage Disposition Recalculation iterates over all 50 records. PR-B does NOT specify batching, parallelization, or rate-limiting; those are implementation-level. The event `media.media-usage-disposition.recalculated` MAY be emitted per record OR as a batched representation; the wire-format choice is deferred to API hardening. **Open question retained:** event emission strategy for large recalculation batches.

#### EC-PRB-6.2 - Correlation reference threading across multi-hop flows

- **Situation:** A vendor's Re-Ingestion Request produces a Revalidation Job; the Revalidation Job's `hash_changed` outcome creates a candidate; the candidate succeeds Validation, Processing, Readiness, and Version Supersession; the supersession triggers Disposition Recalculation across 12 assignment evidence records.
- **Disposition:** All emitted events share the same `correlation_reference`. Subscribers may assemble the full trace.

#### EC-PRB-6.3 - Out-of-order event delivery

- **Situation:** Subscribers receive `media.media-usage-disposition.recalculated` before `media.restriction-evidence.applied`.
- **Disposition:** PR-B event payloads carry sufficient references for subscribers to resolve the actual state by reference even if event ordering is non-deterministic. The architectural surface does NOT require strict event ordering. (Subscriber idempotency handling and out-of-order handling are subscriber-side concerns.)

#### EC-PRB-6.4 - Subscriber consumes a PR-B event but Media Asset Version was further updated before consumption

- **Situation:** Subscriber receives `media.media-asset-version.superseded` minutes after the supersession. By the time of consumption, the version has been further superseded (a new candidate ran through promotion).
- **Disposition:** The event payload references the supersession at the time of emit. Subscribers resolving by reference SHOULD also check the Media Asset's current `current_media_asset_version_reference` to confirm whether the event's "new current" is still the active current.

#### EC-PRB-6.5 - Media Asset Version is restricted, then the Media Asset's `current` is changed via supersession

- **Situation:** A Media Asset Version V3 is `current` and `restricted`. A re-ingestion produces V4, which promotes to `current` (V3 becomes `superseded`). V3's restriction state needs to be reconciled.
- **Disposition:** V3's Media Restriction Evidence remains. V3's lifecycle state composition is `superseded` + `restricted` per EC-PRB-3.1's note. V4 is the new `current` and is NOT restricted (no Restriction Evidence has been applied to V4). Media Usage Disposition for assignments now pointing to V4 (via the new Product Media Assignment Evidence records) is `approved_by_default`. The prior Product Media Assignment Evidence records pointing to V3 retain the `restricted` disposition for audit purposes.

### Cleanup / wording edge cases

#### EC-PRB-7.1 - PR-A document references "PR-B" as buyer-export deferral target

- **Situation:** A PR-A document says "buyer Media Export Package generation is deferred to PR-B".
- **Disposition:** Under PR-B's split, that item is now **PR-C** (or future PR). PR-B does NOT rewrite PR-A sections. PR-B-added language uses "PR-C" or "future PR" directly. Readers of PR-A sections interpret "PR-B" references for buyer export, marketing download, CDN, signed URL, or rendition concerns as "PR-C or future" prospectively.

#### EC-PRB-7.2 - Existing event documentation says `media.export-eligibility.recalculated`

- **Disposition:** PR-B did NOT introduce that event. PR-B introduces `media.media-usage-disposition.recalculated` instead (Media-owned readiness language). If any pre-PR-B document mentions `media.export-eligibility.recalculated` as a planned event, that planning is superseded; PR-B uses the disposition-language event name.

### Items deferred to PR-C (not edge cases for PR-B)

For clarity, the following items are NOT edge cases for PR-B; they are PR-C scope:

- Behavior of buyer-visible export bundles when a Media Asset Version is superseded mid-export.
- Whether buyers who previously downloaded a Media Asset can re-download it after restriction or revocation.
- CDN cache invalidation on Media Asset Version supersession.
- Signed URL expiration interaction with Media Asset Version revocation.
- Rendition staleness when a Media Asset Version is superseded.
- Stale Export Reference Rule.
- Buyer Media Download Evidence retention semantics.

These are noted to bound the PR-B edge-case scope. PR-C will own them.
