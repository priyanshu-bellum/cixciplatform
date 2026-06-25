# Media / Image Asset Management Module

Initial architecture draft for the Media / Image Asset Management bounded context.

This module owns Media Manager workflows for image/video upload, validation, processing, assignment evidence, required media profiles, media readiness evidence, media update events, and media audit history.

This module explicitly supports the post-accessory-import Media Manager flow: vendors import accessory product records first through Product Catalog / Accessory Catalog, then upload and manage images/videos through Media Manager. Product Catalog owns accessory product records and consumes Media Readiness Evidence before buyer visibility/export.

## Boundary Summary

- Media Management owns media upload, validation, processing, assignment evidence, required media profiles, media readiness evidence, media-readiness overrides, and media audit history.
- Product Catalog owns accessory product records and final buyer visibility/export projection.
- Product Catalog consumes Media Readiness Evidence with exact Media Asset ID/version, Product Media Assignment/version, validation result/version, processing result/version, Required Media Profile version, and override evidence where applicable.
- Media readiness is asset-readiness, not full product sellability.
- Buyer visibility/export depends on Product Catalog rules consuming Media readiness evidence.
- Tenant Company owns user/admin authority for overrides.
- Integration Management owns external delivery/receipt evidence where media is pulled, pushed, or synced externally.
- Logs & Audit owns immutable file/upload/report/download/audit evidence.

## Evidence Guardrails

- Summary booleans are not sufficient for downstream consumption by themselves.
- Product Catalog must be able to prove which asset, assignment, validation, processing, profile, and override evidence made an accessory media-ready.
- Missing, stale, expired, superseded, ignored, failed, or conflicting Media evidence should block or route buyer visibility/export evaluation to review according to Product Catalog and Media rules.
- Required media profile changes must not silently rewrite historical export, visibility, invoice, analytics, or audit evidence.

## Module Files

- `spec.md`
- `data-model.md`
- `api-contracts.md`
- `openapi-contracts.md`
- `events.md`
- `event-contracts.md`
- `boundary-contracts.md`
- `permissions.md`
- `workflows.md`
- `edge-cases.md`
- `test-scenarios.md`
- `assumptions-open-questions.md`

## PR-A Scope - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This PR hardens how media enters CIXCI, how it is validated, how it is matched to products, how missing/unmatched media is handled, and how accepted media becomes a CIXCI-managed Media Asset. The PR is additive and single-module by file touch (Media / Image Asset Management only).

### What PR-A accomplishes

- **SKU-only Media matching.** Media matching, image import matching, ZIP assignment, manual assignment, image URL assignment, Product Media Assignment Evidence, Media Readiness Evidence, Missing Media Coverage Summary, and Buyer Media Export Readiness Reference are SKU-based only. UPC is not used as a Media-side matching/identity key in any of these surfaces. UPC remains a Product Catalog / Accessory Import concern.
- **Parent Media Upload Session with child jobs.** A single parent Media Upload Session may include multiple child Media Upload Jobs spanning four ingestion types via a `job_type` discriminator: `zip`, `manual_drag_drop`, `image_url`, and `future_api`. ZIP Upload Job, Manual Media Upload Job, and Image URL Ingestion Job are not separate top-level entities under PR-A; they are job-type variants on Media Upload Job.
- **Multi-ZIP / multi-upload support.** One ZIP file is not treated as a complete image package. After each child upload job, Media Manager produces or updates a Media Upload Coverage Summary that compares imported accessory SKUs against media-assigned SKUs and surfaces vendor options (upload another ZIP, manual, URLs, download missing media report, continue, return later).
- **Tolerant upload batching, strict assignment.** Uploads are accepted into a session even when not all match cleanly. Auto-assignment requires clean SKU evidence: folder SKU and filename SKU must agree, and the SKU must be present in the source accessory import batch or Product Catalog product reference set. Mismatches and unmatched SKUs route to review or unmatched state.
- **Canonical filename pattern.** Filename parsing follows `{SKU}_{Role}_{Sequence}.ext` where Role is one of `Main`, `Alt`, `Lifestyle`, `Packaging`. Common separator variations may be normalized. `Main_1` is the primary image; if `Main_1` is missing while `Main_2+` is present, the file routes to review. Media Manager does not silently promote `Main_2` to primary.
- **CIXCI-managed Media Asset URL/reference.** All accepted media, regardless of ingestion method, resolves to a Media Asset Version with a CIXCI-managed media URL/reference. The vendor source URL is never the durable buyer-visible reference.
- **Image URLs are ingestion sources only.** Vendor-provided image URLs are source references; Integration Management owns the external fetch mechanics; Media Manager records the Source URL Fetch Result by reference, validates and processes the fetched content, and stores it as a Media Asset Version with a CIXCI-managed URL/reference. Buyer export receives the CIXCI-managed URL/reference, not the vendor source URL.
- **Buyer-usable-by-default media disposition.** Default values for vendor-provided media through supported ingestion methods are `media_usage_disposition = approved_by_default`, `buyer_usage_allowed = true`, and `marketing_download_allowed = true`. Restricted, revoked, expired, review-required, or failed media is excluded from buyer exports and marketing downloads.
- **URL-source change foundation with fail-safe.** PR-A establishes the architectural rule that if vendor source URL content changes, the changed content must be re-ingested, validated, processed, and versioned before it can supersede the current buyer-usable Media Asset Version. **Fail-safe:** existing accepted buyer-visible media remains active if the new candidate version fails validation.

### What PR-A intentionally does not accomplish

- No final CDN, signed-URL, rendition, or marketing download package implementation (PR-B).
- No detailed Media Asset Version supersession or restoration lifecycle beyond foundation (PR-B).
- No source URL re-ingestion trigger mechanism (vendor-triggered, scheduled, admin-triggered, ETag / Last-Modified evaluation are PR-B).
- No detailed Media Restriction Evidence workflow (initiation, approval routing, propagation, restoration are PR-B).
- No buyer marketing download package generation (PR-B).
- No advanced unmatched media review approval routing (future PR).
- No approved SKU alias mappings (PR-B).
- No per-asset operator display-order override (future PR).
- No Product Catalog file modifications.
- No Integration Management file modifications.
- No Logs & Audit File Tracking file modifications.
- No Tenant Company file modifications.
- No Device Catalog file modifications.
- No Notification, Analytics, Order Routing, Fulfillment / Returns, Invoice Management, or Pricing file modifications.
- No OpenAPI hardening; `modules/media-image-asset-management/openapi-contracts.md` is out of scope.
- No runtime / code / schema / migration / build changes.

### PR-A target files

This PR modifies exactly 12 files in the Media / Image Asset Management module:

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `boundary-contracts.md`
- `permissions.md`
- `api-contracts.md`
- `events.md`
- `event-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` is intentionally excluded.

### Cross-module references

- **Product Catalog** is referenced but not modified. UPC validation, UPC normalization, UPC uniqueness, accessory CSV import, and accessory ingestion remain Product Catalog territory. The existing contract that Product Catalog consumes Media Readiness Evidence by reference is preserved.
- **Integration Management** is referenced but not modified. The external fetch mechanics for image URLs are Integration Management's responsibility; PR-A captures Media-side references to Integration Management transport records.
- **Logs & Audit File Tracking** is referenced but not modified. PR-A uses existing Logs & Audit retention class / Audit Record patterns; no new retention, redaction, or access class is introduced.
- **Tenant Company** is referenced but not modified. Authority for Media Restriction Evidence and System Admin overrides continues to flow through existing Tenant Company patterns.

### Sequencing

This PR is sequencing item 1 in the current hardening track. Planned follow-ups:

1. Media / Image Asset Management PR-A (this PR).
2. Media / Image Asset Management PR-B, if needed for source URL re-ingestion / versioning lifecycle, restriction / revocation / expiry workflows, and buyer media access / renditions / export.
3. Logs & Audit File Tracking hardening.
4. Orders / Fulfillment / Returns cleanup / readiness.
5. API Governance / Postman readiness audit.
6. API Governance Foundation PR.
7. OpenAPI / module API hardening.

## PR-B Scope - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

PR-B layers operational lifecycle rules on top of the PR-A structural foundation. PR-A established what exists (Media Upload Session, Media Upload Job with `job_type` discriminator, Media Assignment Candidate, Media Upload Coverage Summary, Media Asset Version foundation states, CIXCI Media Asset URL/Reference, Source URL Fetch Result with discriminator, Media Usage Disposition enumeration, Media Restriction Evidence foundation). PR-B establishes what happens when those things change over time.

### PR-B includes

- **Source URL re-ingestion and revalidation lifecycle (full).** Vendor-triggered, System-Admin-triggered, and scheduled revalidation paths. Single canonical Source URL Change Detection Result with discriminator (`hash_unchanged`, `hash_changed`, `fetch_unavailable`, `fetch_unauthorized`, `fetch_expired`, `fetch_redirected`, `validation_skipped`). ETag and Last-Modified are hints only; the Source URL Content Hash remains authoritative. Integration Management owns the transport; PR-B references it.
- **Detailed Media Asset Version lifecycle and supersession.** Extends the foundation states (`created`, `current`, `superseded`, `restricted`, `failed_candidate`) with `candidate`, `accepted`, `rejected`, `revoked`, `expired`, `archived`. Adds Version Supersession Evidence. Reaffirms the fail-safe rule: failed candidate goes to `failed_candidate`; the prior `current` remains active. Promotion requires Validation, Processing, Readiness, AND Version Supersession Evidence to succeed.
- **Restriction, revocation, and expiry workflows.** Media Restriction Request (vendor or System Admin intent), Restriction Application (System Admin only), Restriction Lift / Expiry Evaluation (creates new evidence; does not mutate prior). Revocation is `restriction_type = revoked` on Media Restriction Evidence (no separate Revocation Evidence entity). Expiry is `expiration_date` plus a Media Expiry Evaluation contract rule (no separate Expiry Rule entity).
- **SKU alias mapping as review-assisted only.** SKU Alias Mapping is System-Admin-approved, scoped (`global` / `vendor` / `import_session`), and optionally expirable. Alias matching is review-assist only: it never produces `auto_assignable` candidates and never overrides folder SKU / filename SKU disagreement.
- **Large-file and resumable upload architecture rules only.** Upload Failure Recovery Evidence is the audit surface. Resumable Upload Reference is an optional field. Upload Chunk Reference remains implementation-level. The canonical rules are: child job failure does NOT close the parent session, and a retry creates a new sibling Media Upload Job without mutating prior successes.

### PR-B intentionally does NOT include

- Buyer Media Export Package generation. Deferred to **PR-C**.
- Buyer Marketing Download Package generation. Deferred to **PR-C**.
- Buyer Media Download Request and Buyer Media Download Evidence. Deferred to **PR-C**.
- Product Catalog buyer export handoff coordination. Deferred to **PR-C**.
- CDN Provider Reference, Storage Provider Reference. Deferred to **PR-C** / Integration Management.
- Signed URL Reference, Signed URL Expiration Rule, Durable vs Temporary Access URL distinction. Deferred to **PR-C** / Integration Management.
- Rendition Profile, Rendition Processing Result, Rendition Readiness Evidence. Deferred to **PR-C**.
- Cache Invalidation Reference, Revoked URL Handling Rule. Deferred to **PR-C**.
- Stale Export Reference Rule. Deferred to **PR-C**.
- Buyer access rules for active versus superseded versions. Deferred to **PR-C**.
- Concrete chunking protocol, resumable-upload runtime mechanics, numeric thresholds for upload size policy. Implementation-level.
- Notification Platform Service templates and routing. Future PR.
- New Logs & Audit File Tracking retention class. Logs & Audit hardening is the next planned sequence item; PR-B does not preempt.
- New Tenant Company role or capability flag.

### Inherited deferral wording cleanup

Where PR-A documents describe buyer media export, marketing downloads, CDN, signed URLs, or renditions as "PR-B" deferrals, the canonical interpretation under PR-B is that those items are **PR-C** or **future PR**. PR-B does not rewrite PR-A sections; this clarification applies prospectively.

### Files modified by PR-B

PR-B modifies exactly these 12 files in `modules/media-image-asset-management/`:

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `boundary-contracts.md`
- `permissions.md`
- `api-contracts.md`
- `events.md`
- `event-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` remains intentionally not modified.

### Boundary discipline reaffirmed by PR-B

- **Media / Image Asset Management** owns the new entities, fields, references, contract rules, workflows, and events introduced by PR-B.
- **Product Catalog** is reference-only. PR-B does not modify Product Catalog files. Product Catalog continues to own accessory product canonical records, SKU/UPC text identifiers, accessory CSV import, and buyer catalog visibility / export projection.
- **Integration Management** is reference-only. PR-B does not modify Integration Management files. Integration Management continues to own external HTTP fetch transport for image URLs, ETag and Last-Modified header parsing at the transport layer, and redirect resolution at the transport layer.
- **Logs & Audit File Tracking** is reference-only. PR-B does not modify Logs & Audit File Tracking files and does not introduce a new retention class, redaction class, or access class. PR-B evidence records reuse existing `audit_reference` patterns.
- **Tenant Company** is reference-only. PR-B does not modify Tenant Company files and does not introduce a new role or capability flag. PR-B authority-bearing actions (Source URL Re-Ingestion approval, Restriction Application, Alias Mapping Approval, Version Supersession authorization) flow through existing `check_access` patterns.
- **Notification Platform Service** is reference-only mention as a future hook. PR-B does not modify Notification Platform Service files and does not introduce notification templates, routes, or transport behavior.
- **Device Catalog, Order Routing, Fulfillment / Returns, Invoice Management, Pricing, Procurement / Purchase Orders, Launch / Event Management, Analytics / Reporting, AI Agent Services, Warranty Registration** are not touched by PR-B.

### Application discipline

PR-B is additive across the 12 target files. PR-A sections, states, rules, defaults, and events are not renamed, deprecated, or version-bumped by PR-B. See `APPLY.md` in the PR-B bundle for tool-agnostic application instructions and the explicit stop-before-commit rule.
