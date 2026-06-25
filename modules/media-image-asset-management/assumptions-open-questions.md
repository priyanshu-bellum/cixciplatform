# Media / Image Asset Management Assumptions / Open Questions

This document captures proposal-level assumptions and unresolved decisions for Media Manager upload and readiness hardening.

## Assumptions

- Accessory data import and media upload are separate workflows.
- Vendors import accessory product records through Product Catalog / Accessory Catalog before managing media in Media Manager.
- Accessory records remain saved even when required media is missing.
- Missing required Main image is the default hard blocker for buyer visibility/export unless authorized configuration or override evidence allows otherwise.
- Product Catalog owns final buyer visibility/export projection and consumes Media Readiness Evidence.
- Tenant Company owns user/admin authority for overrides.
- Logs & Audit owns immutable file/upload/report/download/audit evidence.
- Integration Management owns external delivery/receipt evidence where media is pulled, pushed, or synced externally.

## Evidence Assumptions

- Media Readiness Evidence must bind summary readiness to exact Media Asset ID/version, Product Media Assignment/version, validation result/version, processing result/version, Required Media Profile version, and override evidence where applicable.
- Summary booleans such as Main image assigned or Main image validated are convenience projections only.
- Product Media Assignment evidence must include source/version, assigned role, role disposition, validation and processing references, applied-vs-ignored state, supersession, review, and audit references.
- Required Media Profile records consumed by Product Catalog must be versioned and dispositioned.
- Missing, stale, expired, superseded, ignored, failed, or conflicting asset/assignment/profile/validation/processing/override evidence should block or route Product Catalog buyer visibility/export evaluation to review.
- Required media profile changes should not silently rewrite historical export, visibility, invoice, analytics, or audit evidence.

## Open Questions

- Which media roles beyond Main, Alt, Lifestyle, Packaging, and Video placeholder are needed for accessory launch?
- Which required media profile scopes are configured at launch: category, vendor, buyer type, Product Type, or product-specific exception?
- Which Required Media Profile changes are immediate blockers versus future-effective changes?
- Which validation and processing result versions are sufficient for Product Catalog visibility/export evidence?
- Which Product Media Assignment conflicts should auto-block versus route to review?
- Which override modes require time-bound expiration by policy?
- Which media readiness signals should trigger notification workflows, analytics reporting, or AI recommendations?
- Which APIs are internal-only versus vendor/System Admin-facing?

## Boundary Questions To Preserve

- Media Management should not decide final Product Catalog buyer visibility/export projection.
- Media Management should not mutate Product Catalog accessory product records.
- Media Management should not own Tenant Company override authority.
- Media Management should not own Integration delivery/receipt evidence, Logs & Audit immutable evidence, or Notification delivery.

## PR-A Assumptions and Open Questions - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section records the assumptions made under PR-A and the open questions retained for follow-up. Each open question is classified as one of:

- **EB** estimate-blocker - a decision needed before sizing further work.
- **BP** business / product decision - requires product-side judgment.
- **IM** implementation detail - resolvable at implementation time without changing the architectural surface.
- **FP** future phase - deferred to a named subsequent PR (PR-B or later).
- **CU** cleanup-only - documentation cleanup or minor textual correction.

### PR-A assumptions

The following are working assumptions that PR-A operates under. They are not decisions; they are baseline positions adopted to keep PR-A scope bounded.

- **A-1.** A Media Upload Session may exist with or without a source accessory import batch reference. When no batch reference is provided, the session's `product_catalog_product_reference_collection` may also be empty, and Coverage Summary `coverage_status` will be `none` until media is uploaded against products provided by other means (manual hint, URL filename derivation).
- **A-2.** A Media Upload Session is initiated by the vendor (or System Admin on behalf of the vendor). Auto-initiated sessions (for example, triggered by a Product Catalog event) are not introduced by PR-A.
- **A-3.** The CIXCI Media Asset URL/Reference is platform-managed and opaque in Phase 1. The resolution mechanism (how the platform turns the reference into a buyer-resolvable URL or rendition) is implementation-level and deferred to PR-B or later Integration Management hardening.
- **A-4.** Media Validation Result and Media Processing Result are produced inline within the upload-job workflow (Phase 1). Async / queued validation and processing are implementation-level; the architectural evidence surface is captured the same way regardless of execution mode.
- **A-5.** Session pause-resume is vendor-driven via explicit state transitions. Auto-pause on inactivity is not introduced by PR-A.
- **A-6.** Media Asset Versions are never deleted. Superseded, failed_candidate, and restricted versions are preserved for audit/history.
- **A-7.** The fail-safe rule (existing accepted version remains active when a new candidate fails validation) applies uniformly across re-upload, URL re-ingestion, and any future re-ingestion trigger mechanism.
- **A-8.** Duplicate content hash within a session is treated as warn + flag for review in Phase 1 (`media_matching_confidence = review_required` with sub-reason `duplicate_content_hash`).
- **A-9.** Approved SKU alias mappings do not apply in Phase 1; all folder-vs-filename SKU disagreements route to review.
- **A-10.** Per-asset operator display-order override is not available in Phase 1; display order is derived from the filename sequence number.

### PR-A open questions

**PR-A OQ 1.** Should Media Upload Session be tied directly to Accessory Import Job, Product Catalog product reference set, or both? - **BP**. PR-A working assumption: both, by reference. The session captures `source_accessory_import_batch_reference` (optional) and `product_catalog_product_reference_collection`. Confirmation needed before PR-B or operator-surface PR refines this.

**PR-A OQ 2.** Should exact folder SKU + filename SKU agreement be required for ZIP auto-assignment in all cases? - **BP**. PR-A working assumption: yes; disagreement routes to review. Future PR-B may introduce alias mappings to override.

**PR-A OQ 3.** Should the system support approved SKU alias mappings in Phase 1? - **FP**. Decision: deferred to PR-B.

**PR-A OQ 4.** Should filename sequence be the only default display-order source in Phase 1? - **BP**. PR-A working assumption: yes; explicit operator override deferred to future PR.

**PR-A OQ 5.** Should common filename separator variations be normalized? - **CU**. PR-A working assumption: yes; the Media Filename Parse Result captures both source and canonical form with a `separator_variant_normalized` parse disposition.

**PR-A OQ 6.** Should `Main_1` be mandatory for media readiness? - **BP**. PR-A working assumption: yes; missing `Main_1` with `Main_2+` present routes to review and does not auto-assign.

**PR-A OQ 7.** What minimum media roles are required for buyer export readiness? - **BP**. PR-A working assumption: `Main_1` only as the floor; Required Media Profile enumerates additional roles per category / vendor / buyer-type / Product Type scope.

**PR-A OQ 8.** Should vendors be allowed to continue without images? - **BP**. PR-A working assumption: yes; accessory records remain saved per existing rule. Product Catalog visibility / export rules consume Media Readiness Evidence.

**PR-A OQ 9.** Should products with missing required media remain hidden from buyers? - **BP**. PR-A working assumption: yes (existing rule preserved); Product Catalog consumes Media Readiness Evidence and applies its own visibility / export decisions.

**PR-A OQ 10.** Should restricted media be allowed in Phase 1? - **BP / FP**. Decision: restriction foundation (the disposition field and Media Restriction Evidence record shape) is in PR-A; full restriction issuance, approval routing, propagation, and restoration workflows are PR-B.

**PR-A OQ 11.** Should source URL re-ingestion be vendor-triggered, scheduled, manual admin, or all three? - **FP**. Decision: deferred to PR-B. PR-A captures only the architectural rule that changed content requires re-ingestion / validation / versioning with the fail-safe rule.

**PR-A OQ 12.** Should old CIXCI media URLs remain valid after a new version is accepted? - **FP**. Decision: deferred to PR-B. PR-A's foundation does not require old-URL invalidation; concrete CDN/signed-URL semantics are PR-B.

**PR-A OQ 13.** Should duplicate content hash be blocked, warned, or reused? - **BP**. PR-A working assumption: warn + flag for review (`media_matching_confidence = review_required` with sub-reason `duplicate_content_hash`). Full deduplication strategy is PR-B.

**PR-A OQ 14.** Should buyer marketing download behavior be PR-A or PR-B? - **FP**. Decision: PR-B. PR-A establishes only the foundation: Media Usage Disposition defaults and the Buyer Media Export Readiness Reference satisfaction conditions.

**PR-A OQ 15.** Should Device Catalog image readiness be covered now or deferred? - **FP**. Decision: deferred. Device Image Readiness Reference remains a Device Catalog concept; outside Media PR-A.

**PR-A OQ 16.** Should Media PR-A touch Product Catalog, or should Product Catalog consumption be a later boundary PR? - **BP**. Decision: do not touch Product Catalog in PR-A. If a later coordination PR is needed to refresh Product Catalog's Media Readiness Evidence consumption documentation to reflect SKU-only matching language, that is a small standalone coordination PR after PR-A merges.

**PR-A OQ 17.** Should large-file / multi-ZIP resumable upload behavior be architecture-only or detailed now? - **IM / FP**. Decision: architecture-only in PR-A. The Multi-Part Upload Completion State on Media Upload Session captures pause-resume at the architectural surface; concrete resumable-upload mechanics (chunking, retries, in-flight reconstruction) are implementation-level and may be revisited in PR-B if needed.

**PR-A OQ A.** Should `media.source-url-change.detected` exist as a forward-compatible standalone event in PR-A even though the workflow that fully consumes it is deferred to PR-B? - **CU / FP**. Decision: NOT introduced in PR-A. The `changed_content_detected` discriminator value on `media.source-url-fetch-result.recorded` is the foundation signal. If PR-B identifies a strong consumer reason, a dedicated event may be added additively then.

**PR-A OQ B.** Should the legacy entity name "Manual Upload Session" be renamed to "Manual Media Upload Job" to align with the parent Media Upload Session model? - **CU**. PR-A working assumption: the canonical reading under PR-A is "Manual Upload Session" = Media Upload Job with `job_type = manual_drag_drop`. Existing content is not rewritten; new PR-A content uses Media Upload Job + `job_type` exclusively. A future cleanup PR may rewrite the legacy entity name in the original sections.

**PR-A OQ C.** Are Media Assignment Candidate and Product Media Assignment Evidence two entities, or one entity with two lifecycle states? - **IM**. Decision: PR-A models them as two entities. The Media Assignment Candidate is the pre-promotion record with `media_matching_confidence` and `media_assignment_review_state`; on promotion, a Product Media Assignment Evidence record is created with a back-pointer to the candidate. This is implementation-level and could be re-modeled as a single entity with two states in a future cleanup PR if Codex review prefers.

**PR-A OQ D.** Should `media_usage_disposition` live on Media Asset (per-asset) or Product Media Assignment Evidence (per-assignment) or both? - **BP / IM**. PR-A working assumption: per-assignment (on Product Media Assignment Evidence). This allows the same Media Asset Version to be assigned to multiple products with potentially different dispositions later. Per-asset propagation (one disposition shared across all assignments of a Media Asset Version) is PR-B if needed.

**PR-A OQ E.** How should the Coverage Summary handle SKUs present in the Product Catalog product reference set but not in the source accessory import batch? - **BP**. PR-A working assumption: include such SKUs in the matched set; the Coverage Summary scope is "imported accessory SKUs and Product Catalog product reference SKUs in scope vs. media-assigned SKUs in this session." Do not flag such SKUs as unmatched solely because they did not appear in the source accessory import batch.

**PR-A OQ F.** Should the Coverage Summary be recreated (new record per child job completion) or versioned (one record updated in place)? - **IM**. Decision: PR-A models Coverage Summaries as versioned per child job completion - each child job completion produces a new Coverage Summary record; prior summaries are preserved for audit; the session's `latest_media_upload_coverage_summary_reference` points to the most recent. This is recorded explicitly to clarify the architectural surface; the implementation may choose either pattern provided audit history is preserved.

**PR-A OQ G.** What are the exact session close/reopen semantics? - **BP / IM**. PR-A working assumption: `open <-> paused` is bidirectional; `open -> completed` and `paused -> completed` are terminal transitions; vendor controls all three transitions. Re-opening a `completed` session is not introduced by PR-A; if needed, the vendor initiates a new session for the same accessory import batch. Refinement is open for PR-B.

**PR-A OQ H.** Should there be a configurable per-vendor or per-buyer-type override of the Media Usage Disposition defaults? - **BP / FP**. Decision: NOT introduced in PR-A. Phase 1 defaults are global: `approved_by_default`, `buyer_usage_allowed = true`, `marketing_download_allowed = true` for vendor-provided media via supported ingestion methods. Per-vendor or per-buyer-type override is a PR-B candidate if a business case emerges.

**PR-A OQ I.** Should the Source URL Fetch Result `result_discriminator` include an additional value for `partially_fetched` (e.g., a content-range fetch that did not complete)? - **IM**. Decision: NOT introduced in PR-A. Phase 1 enumeration covers `fetched`, `failed`, `blocked`, `unauthorized`, `unsupported`, `changed_content_detected`. If Integration Management surfaces additional outcome categories at the transport layer, PR-B may extend the enumeration.

**PR-A OQ J.** How are session-level concurrency conflicts handled when two vendor users belong to the same vendor scope and both initiate sessions simultaneously? - **IM**. Decision: NOT detailed in PR-A. Phase 1 allows multiple sessions per accessory import batch per A-1; concurrency at the user level is implementation-level. Future operator-surface PR may introduce single-active-session policy.

### Open questions intentionally NOT introduced by PR-A

The following are explicitly NOT open questions for PR-A; they belong to PR-B or future PRs and are listed here only to make the scope boundary explicit:

- Full source URL re-ingestion trigger taxonomy (vendor-triggered, scheduled, admin-triggered, hybrid) - PR-B.
- ETag / Last-Modified evaluation logic - PR-B.
- Detailed Media Asset Version supersession lifecycle (the moment a new version transitions to `current` and the prior version transitions to `superseded`) - PR-B.
- Restriction issuance approval routing, propagation, and restoration - PR-B.
- Buyer marketing download package generation - PR-B.
- Signed URL issuance and rendition production - PR-B.
- Advanced Media Assignment Candidate Review escalation, multi-step approval, batch approval - future operator-surface PR.
- Per-asset operator display-order override - future PR.
- Cross-session Coverage Summary aggregation - future operator-surface PR.
- Approved SKU alias mapping resolution mechanics - PR-B.
- Resumable / chunked upload protocol details - implementation-level.
- Specific runtime detectors for malicious file signatures, ZIP bombs, virus scanning - implementation-level / runtime security area.
- Device Catalog image readiness extension - separate Device Catalog hardening area.
- Notification, Analytics, or AI Agent Services integrations of Media events - future PR.
- Product Catalog file modifications to align consumption documentation with SKU-only matching language - separate coordination PR if needed.

## PR-B Assumptions and Open Questions - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section records PR-B's assumptions and the open questions retained for later decision. PR-A assumptions and open questions are preserved without modification.

### Classification key

- **EB** - estimate-blocker (decision needed before developer can size implementation).
- **BP** - business-product decision (requires a real-world business decision before code can be written).
- **IM** - implementation detail (left to the developer; flagged only if it affects observable behavior across modules).
- **FP** - future phase (deferred to a later PR; PR-B sets the architectural surface).
- **CU** - cleanup-only (documentation or terminology concern; no behavior change).

### PR-B assumptions (locked for PR-B)

The following PR-B-locked assumptions are NOT open questions; they are documented for traceability.

1. **All three Source URL Revalidation trigger paths are supported.** Vendor-triggered, System-Admin-triggered, and scheduled. The concrete scheduling mechanism is implementation-level. (Resolves the scoping open question "Should Source URL Revalidation be vendor-triggered, admin-triggered, scheduled, or all three?" with: all three.)

2. **Revocation is `restriction_type = revoked` on Media Restriction Evidence.** No separate Revocation Evidence entity is introduced. (Resolves the scoping open question on revocation entity.)

3. **Expiry is `expiration_date` plus Media Expiry Evaluation contract rule.** No separate Media Expiry Rule entity is introduced. (Resolves the scoping open question on expiry entity.)

4. **Vendors cannot apply restriction directly.** Vendors request; System Admins apply. Revocation is the same pattern. (Resolves the scoping open question on vendor vs admin restriction control: both, with request-vs-application separation.)

5. **Media expiry is supported in Phase 1.** `expiration_date` field plus Media Expiry Evaluation contract rule. (Resolves the scoping open question on Phase 1 expiry support.)

6. **Alias-based assignment is never `auto_assignable` in Phase 1.** The Alias-Based Auto Assignment Rule is a negative contract rule. (Resolves the scoping open question on alias auto-assignability.)

7. **Aliases never override folder SKU / filename SKU disagreement.** The PR-A folder/filename disagreement sub-reason is preserved as the routing reason even when alias resolution applies. (Reaffirms PR-A discipline.)

8. **Source URL Revalidation Job may run on Media Asset Versions whose source `image_url` Media Upload Job's parent Media Upload Session is `completed`.** Revalidation operates on the Media Asset Version surface, not on the Media Upload Session. (Resolves the scoping open question.)

9. **Restriction propagation is per Media Asset Version in Phase 1.** Asset-wide restriction is an open question (see below). (Resolves the scoping open question with: per-version.)

10. **Large-file resumable upload is architecture-only in PR-B.** Numeric thresholds, chunking protocols, and runtime mechanics are implementation-level. (Resolves the scoping open question.)

11. **Source URL Re-Ingestion does NOT introduce a separate Source URL Re-Ingestion Evidence entity.** Re-ingestion evidence is captured on the Source URL Re-Ingestion Request, Source URL Revalidation Job, and Source URL Change Detection Result records' fields and audit references. (Resolves the Codex tightening directive against overbuilt evidence entities.)

12. **SKU Alias Approval Evidence is a field collection on SKU Alias Mapping.** No separate SKU Alias Approval Evidence entity is introduced. (Resolves the scoping open question.)

13. **No Tenant Company role or capability flag is introduced.** PR-B authority flows through existing `check_access` patterns.

14. **No Logs & Audit retention class is introduced.** PR-B evidence records reuse existing `audit_reference` patterns. Logs & Audit hardening is the next planned sequence item; PR-B does not preempt.

15. **`media.export-eligibility.recalculated` is NOT used.** PR-B uses `media.media-usage-disposition.recalculated` (Media-owned readiness language) to avoid PR-C buyer-export naming conflict.

16. **`media.restriction-evidence.removed` is NOT used.** PR-B uses `media.restriction-evidence.superseded` (lift creates new evidence; prior evidence is superseded). Prior evidence is never mutated or deleted.

### PR-B open questions (retained for later decision)

#### OQ-PRB-1 - Should old CIXCI-managed URLs remain valid after Version Supersession?

- **Classification:** FP (deferred to PR-C).
- **PR-B default:** yes, old CIXCI-managed URLs may resolve. PR-B does not introduce stale-export-reference rules.
- **Decision needed by:** PR-C (buyer media export package generation).
- **Owners:** Media architecture lead, buyer-experience stakeholder.

#### OQ-PRB-2 - Should superseded versions remain downloadable by buyers who previously exported them?

- **Classification:** FP (deferred to PR-C).
- **PR-B default:** silent on buyer-side download behavior; Media-side Media Readiness Evidence excludes superseded versions from buyer-visible.
- **Decision needed by:** PR-C (buyer Media Download Request, Buyer Media Download Evidence).
- **Owners:** Media architecture lead, buyer-experience stakeholder, legal review (for download retention).

#### OQ-PRB-3 - Should revocation invalidate old buyer export references?

- **Classification:** FP (deferred to PR-C).
- **PR-B default:** silent on buyer-export reference invalidation; Media-side Media Readiness Evidence excludes revoked versions.
- **Decision needed by:** PR-C.
- **Owners:** Media architecture lead, legal review.

#### OQ-PRB-4 - Should restriction / revocation / expiry trigger buyer-facing notification?

- **Classification:** FP (future Notification Platform work).
- **PR-B default:** notification is reference-only mention; no concrete notification work.
- **Decision needed by:** future Notification Platform Service PR.
- **Owners:** Notification architecture lead, buyer-experience stakeholder.

#### OQ-PRB-5 - Should buyer export eligibility be owned entirely by Media, or jointly by Media and Product Catalog?

- **Classification:** BP (PR-C joint coordination concern).
- **PR-B default:** Media owns the readiness recalculation surface (Media Usage Disposition Recalculation). Whether Product Catalog buyer-export projection rules consume that surface alone or also apply Product-Catalog-side gating is a PR-C joint concern.
- **Decision needed by:** PR-C, possibly with a small Product Catalog coordination PR.
- **Owners:** Media architecture lead, Product Catalog architecture lead.

#### OQ-PRB-6 - Should buyer download evidence be Media-owned or Logs & Audit-owned?

- **Classification:** FP (deferred to PR-C).
- **PR-B default:** PR-B does not introduce Buyer Media Download Evidence.
- **Decision needed by:** PR-C.
- **Owners:** Media architecture lead, Logs & Audit architecture lead.

#### OQ-PRB-7 - What is the default `expiration_date` duration for SKU Alias Mapping?

- **Classification:** BP (specific default).
- **PR-B default:** `expiration_date` is optional. No default duration is set in PR-B.
- **Decision needed by:** business-product decision before alias rollout. May be answered by a small follow-up PR or by configuration policy.
- **Owners:** Operations lead, vendor-ops lead.

#### OQ-PRB-8 - Should restriction propagation become asset-wide in a future phase?

- **Classification:** FP.
- **PR-B default:** per-version (Phase 1).
- **Decision needed by:** later restriction lifecycle hardening PR.
- **Owners:** Media architecture lead, legal review.

#### OQ-PRB-9 - Concurrent-candidate conflict resolution policy

- **Classification:** EB / IM borderline.
- **PR-B default:** PR-B does not define automatic conflict resolution between two concurrently-promoting candidates for the same Media Asset. First to complete becomes `current`; the second must be re-evaluated against the new `current`.
- **Decision needed by:** developer review during implementation; surface for architectural review if observable cross-module behavior emerges.
- **Owners:** Media architecture lead.

#### OQ-PRB-10 - Concurrent Source URL Re-Ingestion Requests for the same URL: should they deduplicate?

- **Classification:** IM (with EB exposure if dedup is observable cross-module).
- **PR-B default:** PR-B does not deduplicate at the Request layer. Each Request produces its own Revalidation Job. Duplicate-candidate detection at the Media Asset Version layer applies.
- **Decision needed by:** developer review during implementation; revisit if observability requires architectural rule.
- **Owners:** Media architecture lead.

#### OQ-PRB-11 - Multi-restriction precedence rule for Media Usage Disposition

- **Classification:** BP.
- **PR-B default:** PR-B documents an implicit precedence: `revoked` > `expired` > `restricted` > `review_required` > `failed` > `approved_by_default`. The explicit precedence rule is captured here for review.
- **Decision needed by:** architectural review of the precedence above before implementation.
- **Owners:** Media architecture lead.

#### OQ-PRB-12 - Lifecycle state composition for restriction-on-superseded

- **Classification:** EB.
- **PR-B default:** Media Asset Version `lifecycle_state` field is single-valued. If a `superseded` version is later restricted, the implementation may surface `restricted` in `lifecycle_state` while preserving the prior `superseded` state in audit history; OR it may model composition differently. PR-B accepts either, pending architectural decision.
- **Decision needed by:** developer review; surface for architectural review.
- **Owners:** Media architecture lead.

#### OQ-PRB-13 - Alias scope precedence (global vs vendor vs import_session)

- **Classification:** BP.
- **PR-B default:** PR-B does not define automatic precedence. Multiple matches across scopes are architecturally allowable; the conflict-resolution rule is open.
- **Decision needed by:** business-product decision before alias rollout at scale.
- **Owners:** Operations lead, Media architecture lead.

#### OQ-PRB-14 - Alias mapping cleanup when canonical SKU is deleted from Product Catalog

- **Classification:** BP / FP.
- **PR-B default:** PR-B does not introduce automatic cleanup. The alias mapping remains in `approved` state; the reviewer surfaces the invalid-canonical condition during candidate review.
- **Decision needed by:** a later Product Catalog and Media coordination PR.
- **Owners:** Product Catalog architecture lead, Media architecture lead.

#### OQ-PRB-15 - SKU Alias Mapping with `effective_date` in the future: explicit "not yet effective" lifecycle state?

- **Classification:** BP / CU.
- **PR-B default:** the mapping is `approved` but does NOT resolve until `effective_date`. PR-B does not introduce a separate `not_yet_effective` state.
- **Decision needed by:** later UX decision (whether the System Admin and vendor need an explicit "scheduled" indicator on the mapping).
- **Owners:** Operations lead, UX lead.

#### OQ-PRB-16 - Retry on a child job whose parent session is `completed`: automatic reopen vs explicit reopen?

- **Classification:** BP.
- **PR-B default:** PR-B does NOT define automatic reopen. The vendor or System Admin must explicitly transition the session from `completed` back to `open` (PR-A allowable state transition) before retry.
- **Decision needed by:** UX decision before vendor rollout at scale.
- **Owners:** Vendor-ops lead, UX lead.

#### OQ-PRB-17 - Behavior when retry is requested for an in-flight child job

- **Classification:** IM.
- **PR-B default:** the retry workflow is gated on a terminal state for the original. In-flight retries are rejected at the workflow gate.
- **Decision needed by:** developer review; surface if observable.
- **Owners:** Media architecture lead.

#### OQ-PRB-18 - Event emission strategy for large Media Usage Disposition Recalculation batches

- **Classification:** IM (with EB exposure if batched-vs-per-record materially differs in subscriber semantics).
- **PR-B default:** the architectural surface accepts either per-record event emission OR a batched representation. The wire-format choice is deferred to API hardening.
- **Decision needed by:** API hardening PR.
- **Owners:** Media architecture lead, API governance lead.

#### OQ-PRB-19 - Automatic transition trigger from `superseded` to `archived`

- **Classification:** FP.
- **PR-B default:** `archived` is applied by explicit System Admin action only in PR-B. Automatic archival is deferred to Logs & Audit hardening.
- **Decision needed by:** Logs & Audit hardening PR (retention policy).
- **Owners:** Logs & Audit architecture lead, Media architecture lead.

#### OQ-PRB-20 - Restriction with both `expiration_date` and an explicit `restriction` type: precedence under multi-active records

- **Classification:** BP.
- **PR-B default:** Media Usage Disposition resolution follows the precedence stated in OQ-PRB-11.
- **Decision needed by:** confirmation of OQ-PRB-11.
- **Owners:** Media architecture lead.

#### OQ-PRB-21 - Notification of buyers / vendors when restriction or revocation applies or lifts

- **Classification:** FP.
- **PR-B default:** PR-B emits Media-side events (`media.restriction-evidence.applied`, `media.restriction-evidence.superseded`) as candidate signals for future notification. PR-B does NOT introduce notification templates, routing, or transport.
- **Decision needed by:** future Notification Platform Service PR.
- **Owners:** Notification architecture lead, buyer-experience stakeholder.

#### OQ-PRB-22 - Source URL Redirect "materially changes host or path" definition

- **Classification:** BP (with IM exposure at the transport layer).
- **PR-B default:** Integration Management transport policy owns the definition. PR-B captures only the architectural disposition (`fetch_redirected` discriminator on the Source URL Change Detection Result; routes to System Admin review).
- **Decision needed by:** Integration Management transport policy decision.
- **Owners:** Integration Management architecture lead.

### Items intentionally NOT open questions in PR-B (deferred entirely to PR-C)

For clarity:

- Whether buyers see active vs superseded versions, and under what export rules.
- Whether revocation invalidates buyer download URLs.
- Whether CDN cache invalidation fires on supersession.
- Whether rendition derivatives are invalidated on supersession.
- Whether marketing download packages are versioned.
- Whether buyer Media Export Packages reference durable CIXCI URLs vs signed URLs.

These are PR-C scope. They are NOT PR-B open questions; they are scoped-out items.

### PR-B classification summary

| Class | Count |
|-------|-------|
| EB (estimate-blocker) | 3 (OQ-9 partial, OQ-12, OQ-18 partial) |
| BP (business-product) | 9 (OQ-5, OQ-7, OQ-11, OQ-13, OQ-14 partial, OQ-15 partial, OQ-16, OQ-20, OQ-22) |
| IM (implementation detail) | 4 (OQ-9 partial, OQ-10, OQ-17, OQ-18 partial) |
| FP (future phase) | 8 (OQ-1, OQ-2, OQ-3, OQ-4, OQ-6, OQ-8, OQ-19, OQ-21, plus OQ-14 partial) |
| CU (cleanup-only) | 1 (OQ-15 partial) |

(Several questions span multiple classes; counts reflect the dominant class with partial overlap noted.)

### Reaffirmation of PR-B boundary discipline

PR-B does NOT pre-empt:

- Logs & Audit hardening (next planned sequence item).
- API Governance Foundation PR (later sequence item).
- OpenAPI hardening (later sequence item).
- Media PR-C (buyer media export, marketing download, CDN, signed URL, rendition, cache invalidation).
- Product Catalog buyer export coordination (likely a small PR-C-adjacent Product Catalog PR).
- Notification Platform Service for restriction / revocation / expiry notification.

PR-B's role is single-module hardening of the Media / Image Asset Management module's lifecycle surfaces. Open questions retained above are explicitly bounded to architecture-level decisions; implementation-level questions are flagged but not blocking.
