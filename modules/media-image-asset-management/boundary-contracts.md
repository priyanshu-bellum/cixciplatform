# Media / Image Asset Management Boundary Contracts

This document defines proposal-level ownership boundaries for Media Manager upload, assignment, required media profiles, readiness evidence, reports, and overrides.

## Media Management Owns

Media Management owns:

- media upload workflows: ZIP, manual upload, image URLs, media file upload, future video placeholder
- media file validation and processing
- Media Asset records and asset versions
- Product Media Assignment evidence
- assigned media role disposition
- Media Validation Result evidence
- Media Processing Result evidence
- Required Media Profile records and profile evidence controls
- Media Readiness Evidence
- Media Readiness Override Evidence from an asset-readiness standpoint
- media readiness status and blocker/warning/override disposition
- missing media summaries and report content
- media update events
- media audit history references

## Media Management Must Not Own

Media Management must not own:

- Product Catalog accessory product records
- Product Catalog lifecycle state, publication state, buyer visibility projection, buyer export execution, or buyer selling status
- Device Catalog canonical devices
- Tenant Company user/admin authority, permissions, buyer eligibility, or override authority
- Integration Management external delivery/receipt evidence
- Logs & Audit immutable file/upload/report/download/audit evidence
- Notification delivery
- Pricing calculations or snapshots
- Invoice records or accounting lifecycle
- Order Routing, Fulfillment/Returns, Procurement, Analytics, AI Agent Services, Launch/Event, Warranty, Accounting, or Payment ownership

## Product Catalog Consumption Boundary

Product Catalog owns accessory product records and final buyer visibility/export projection. Product Catalog consumes Media Readiness Evidence with exact asset/assignment/version/validation/processing/profile references.

Product Catalog should not treat summary booleans alone as sufficient evidence. Product Catalog must be able to prove which Media Asset ID, asset version, Product Media Assignment version, validation result, processing result, Required Media Profile version, and override evidence made an accessory media-ready.

Missing, stale, expired, superseded, ignored, failed, or conflicting asset, assignment, validation, processing, required profile, or override evidence should block or route buyer visibility/export evaluation to review according to Product Catalog and Media rules.

## Product Media Assignment Boundary

Media Management owns Product Media Assignment evidence from the media workflow perspective. Product Catalog may accept or consume product-media attachment references where appropriate, but Media owns upload, validation, processing, assignment, and readiness workflow evidence.

Superseded assignments must not continue to satisfy required media readiness. Product Media Assignment does not authorize Media Management to mutate Product Catalog product records or decide buyer-visible product publication.

## Required Media Profile Boundary

Media Management owns required media profiles and profile evidence controls from an asset-readiness standpoint. Required Media Profile records consumed by Product Catalog must be versioned and dispositioned.

Required media profile changes should not silently rewrite historical export, visibility, invoice, analytics, or audit evidence. Historical records should retain references to the profile version that was evaluated.

## Override Boundary

Tenant Company owns user/admin authority and permission evidence for overrides. Media Management owns media-readiness override evidence from an asset-readiness standpoint. Product Catalog consumes override evidence but does not infer override authority independently.

An authorized override may affect media-readiness disposition. It does not transfer product lifecycle, buyer visibility, buyer export, or buyer selling-state ownership from Product Catalog to Media Management.

## External Evidence Boundaries

- Logs & Audit owns immutable file/upload/report/download/audit evidence.
- Integration Management owns external delivery/receipt evidence where media is pulled, pushed, or synced externally.
- Notification Platform Service owns notification delivery.
- Analytics and AI Agent Services may consume Media readiness signals but must not mutate Media assets or Product Catalog visibility without approved contracts and permissions.

## Boundary Wording

Use:

- `Media Management owns media upload, validation, processing, assignment evidence, media readiness evidence, required media profiles, media-readiness overrides, and media audit history.`
- `Product Catalog owns accessory product records and final buyer visibility/export projection.`
- `Product Catalog consumes Media Readiness Evidence with exact asset/assignment/version/validation references.`
- `Tenant Company owns override authority and admin/user permission evidence.`
- `Logs & Audit owns immutable file/upload/report/download/audit evidence.`
- `Integration Management owns external delivery/receipt evidence.`
- `Media readiness remains asset-readiness only, not full product sellability.`

Avoid wording that implies Media Management decides final buyer-visible status, exportability, product lifecycle, product publication, Product Catalog record truth, or buyer selling state.

## PR-A Boundary Contracts - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section clarifies ownership boundaries for the PR-A hardening pass. Existing Media boundary contracts are preserved; PR-A adds explicit ownership for new surfaces and reaffirms reference-only relationships to Product Catalog, Integration Management, Logs & Audit File Tracking, and Tenant Company.

### Media / Image Asset Management additionally owns

- **Media Upload Session** lifecycle, Multi-Part Upload Completion State (`open`, `paused`, `completed`, `superseded`), parent-child relationship with child Media Upload Jobs.
- **Media Upload Job** `job_type` discrimination (`zip`, `manual_drag_drop`, `image_url`, `future_api`) and per-job lifecycle (`received`, `validating`, `processing`, `completed`, `failed`).
- **ZIP Extracted File Records** as field-collection on Media Upload Job (Media Manager extracts; no recursive extraction; archive-nested case produces a flagged extraction outcome).
- **Media Filename Parse Result** records (source filename reference, canonical filename, parsed SKU, parsed folder SKU, media role, display order, parse disposition).
- **Canonical Media Filename** pattern enforcement (`{SKU}_{Role}_{Sequence}.ext` with separator normalization).
- **SKU-Based Media Assignment Rule** evaluation (SKU is the matching key; UPC is NOT used for any Media matching).
- **Media Assignment Candidate** lifecycle (`pending`, `auto_assignable`, `review_required`, `approved`, `rejected`, `superseded`).
- **Media Matching Confidence** enumeration (`clean`, `review_required`) and **Media Matching Confidence Sub-Reason** enumeration.
- **Media Assignment Review State** as the lifecycle field on candidates and as the terminal `approved` state on Product Media Assignment Evidence.
- **Unmatched Media File** records as field-collection on Media Upload Job.
- **Missing Required Media Result** records as field-collection on Media Upload Coverage Summary.
- **Media Upload Coverage Summary** records (versioned per child job completion; session keeps the latest reference).
- **Media Asset Version** entity with `current`, `created`, `superseded`, `restricted`, `failed_candidate` lifecycle states.
- **CIXCI Media Asset URL/Reference** field (platform-managed durable reference; opaque in Phase 1; NEVER the vendor source URL).
- **Source Image URL Reference** field on Media Upload Job and Media Asset Version (source-only; captured for audit and source-URL change detection).
- **Source URL Fetch Result** as a reference / evidence surface (not a large entity); discriminator-bearing.
- **Source URL Content Hash** field on Media Asset Version and Source URL Fetch Result.
- **Source URL Change Detection Rule** (canonical PR-A rule: changed content requires re-ingestion, validation, and versioning; fail-safe preserves prior version on candidate validation failure).
- **Media Usage Disposition** field on Product Media Assignment Evidence with defaulting rules and propagation rules.
- **Media Restriction Evidence** entity (foundation only; PR-A captures the record shape and propagation hook).
- **Buyer Media Export Readiness Reference** (foundation only; PR-A defines the satisfaction conditions; concrete buyer export package is PR-B).
- **The PR-A canonical interpretation of "SKU/UPC reference" on existing Media-side entities** as `sku_reference` for matching/identity. UPC is preserved on Product Catalog records but is not a Media-side matching key.

### Media / Image Asset Management must not own

- Accessory product canonical records, SKU and UPC text identifier preservation, UPC validation, UPC normalization, UPC uniqueness checks, accessory CSV import, or accessory ingestion row-level validation. These remain Product Catalog territory.
- External HTTP fetch mechanics for image URLs. These remain Integration Management territory.
- External storage / CDN / provider integration mechanics, signed URL issuance, or rendition production. These are PR-B Media architecture or future Integration Management hardening areas.
- Immutable evidence storage retention duration, search index optimization, or retention/redaction/access class configuration for Media Asset Versions, Missing Media Reports, Source URL Fetch Results, Product Media Assignment Evidence, or Media Restriction Evidence. These remain Logs & Audit File Tracking territory.
- Tenant authority decisions for Media Restriction Evidence, Media Assignment Candidate Review approvals, or System Admin overrides. These remain Tenant Company territory.
- Buyer catalog visibility, buyer export projection, buyer-selling-status decisions, or buyer-facing rendition / marketing download package generation. These remain Product Catalog territory (with PR-B Media foundations referenced by Product Catalog).
- Notification delivery for Media events. Notification Platform Service owns delivery.
- Order Routing, Fulfillment / Returns, Invoice Management, Pricing, Procurement, Launch / Event Management, Warranty, Accounting, Payment, AI Agent Services, or Analytics / Reporting ownership.

### Product Catalog consumption boundary (reaffirmed under PR-A)

Product Catalog owns accessory product records and final buyer catalog visibility / export projection. Product Catalog consumes:

- Media Readiness Evidence with exact `media_asset_reference`, `media_asset_version_reference`, `product_media_assignment_reference`, `media_validation_result_reference`, `media_processing_result_reference`, `required_media_profile_reference`, `media_usage_disposition`, and supersession/disposition fields.
- (Foundation, PR-A) Buyer Media Export Readiness Reference for products whose Media Readiness Evidence is satisfied and whose Media Usage Disposition is in the allowed set (`approved_by_default`).

Product Catalog must not:

- Use UPC as a Media-side matching key. UPC is preserved on Product Catalog accessory records but is not the matching key Media uses to bind assignments to products.
- Treat summary booleans (such as `required_media_complete_flag`) as sufficient evidence alone; exact reference evidence per existing Media-side rules is required.
- Process media files, perform validation, perform processing, or own Media Asset Versions. All media-side workflow remains in Media.

### Integration Management reference boundary (reaffirmed under PR-A)

Integration Management owns the external HTTP fetch transport for image URL ingestion. Media Manager references Integration Management transport records via:

- `integration_management_transport_reference` on Media Upload Job (when `job_type = image_url`).
- `integration_management_transport_reference` on Source URL Fetch Result.

Integration Management is NOT modified by PR-A. Where the specific Integration Management hook for image URL fetch is not yet hardened, Media uses placeholder reference language consistent with existing Media patterns. Integration Management hardening for this specific hook (if needed) is a separate Integration Management area.

Integration Management must not:

- Validate media content (validation is Media-owned).
- Process media content (processing is Media-owned).
- Create Media Asset Versions (Media-owned).
- Decide whether a Source URL Fetch Result's discriminator is `fetched`, `failed`, `blocked`, `unauthorized`, `unsupported`, or `changed_content_detected` at the Media-side disposition level. Integration Management reports the transport outcome; Media records the disposition by reference and assigns the discriminator value.

### Logs & Audit File Tracking reference boundary (reaffirmed under PR-A)

Logs & Audit File Tracking owns immutable evidence retention. Media references Logs & Audit retention via `audit_reference` on every PR-A entity and via existing Audit Record Creation Workflow patterns. Logs & Audit File Tracking is NOT modified by PR-A.

PR-A does not introduce:

- New retention classes.
- New redaction classes.
- New access classes.
- Specific retention durations.
- Specific search index requirements.

These remain Logs & Audit File Tracking concerns. Media references Logs & Audit by reference only.

### Tenant Company reference boundary (reaffirmed under PR-A)

Tenant Company owns vendor / buyer / System Admin role definitions and authority decisions. Media references Tenant Company authority via:

- `vendor_entity_scope_reference` on Media Upload Session and Media Upload Job.
- `tenant_company_authority_reference` on Media Restriction Evidence.
- Authority checks for Media Assignment Candidate Review approval (via existing Tenant Company `check_access` patterns).

Tenant Company is NOT modified by PR-A. No new role definition, no new permission/capability is introduced by PR-A on the Tenant Company side.

### Device Catalog reference boundary

Device Image Readiness Reference remains a Device Catalog concept. PR-A does not extend or reference Device Image Readiness Reference. Device Catalog is NOT modified by PR-A.

### Other modules (no PR-A interaction)

The following modules are NOT referenced or modified by PR-A: Notification Platform Service, Analytics / Reporting, Order Routing, Fulfillment / Returns, Invoice Management, Pricing, Procurement, Launch / Event Management, Warranty Registration, Accounting, Payment, AI Agent Services. Future PR-B may introduce Notification, Analytics, and Buyer-Export references; PR-A does not.

### Boundary discipline summary

- **Media-owned.** Sessions, jobs, extracted-file records, filename parse results, assignment candidates, assignment evidence, asset versions, validation/processing results, readiness evidence, coverage summaries, restriction evidence, usage disposition.
- **Reference-only.** Product Catalog product / accessory records, Integration Management transport records, Logs & Audit retention records, Tenant Company authority decisions.
- **UPC.** Preserved on Product Catalog records; NEVER used as a Media-side matching/identity key. Where existing Media documents reference "SKU/UPC reference", PR-A's canonical interpretation is `sku_reference`.
- **Vendor source URL.** Source-only on Media Upload Job and Media Asset Version (for audit and change detection); NEVER the durable buyer-visible CIXCI Media Asset URL/Reference.
- **CIXCI Media Asset URL/Reference.** Platform-managed; opaque in Phase 1; the durable buyer-visible surface.
- **Failed candidate version.** Never becomes `current`; the prior `current` version remains active and buyer-visible (fail-safe rule).
- **Restricted / revoked / expired / review-required / failed disposition.** Excludes the media from buyer exports and marketing downloads.

## PR-B Boundary Contracts - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section reaffirms cross-module boundary discipline for PR-B. All PR-A boundary contracts are preserved without modification.

### Media / Image Asset Management ownership (additional under PR-B)

Media / Image Asset Management owns:

- Source URL Re-Ingestion Request lifecycle (request, approval, rejection, supersession).
- Source URL Revalidation Job lifecycle (received, validating, processing, completed, failed) and its discriminator-based outcome surface via Source URL Change Detection Result.
- Source URL Change Detection Result (the canonical evidence record for fetch outcomes in a revalidation context, with discriminator).
- Source URL Content Hash as authoritative change-detection signal.
- Source URL ETag Reference and Source URL Last-Modified Reference as supplemental hint fields only.
- Source URL Redirect Handling Rule (architectural disposition; transport-level redirect resolution is Integration Management territory).
- Media Asset Version extended lifecycle states (`candidate`, `accepted`, `rejected`, `revoked`, `expired`, `archived`); PR-A foundation states (`created`, `current`, `superseded`, `restricted`, `failed_candidate`) preserved.
- Version Supersession Evidence as the explicit record of version-pair transitions.
- The Active Version Preservation contract rule.
- The four-condition Promotion Rule (Validation, Processing, Readiness, Version Supersession Evidence) for `candidate` to `current` promotion.
- Media Restriction Request lifecycle (vendor-initiated or System-Admin-initiated intent).
- Media Restriction Evidence application, lift, and expiry behavior (System Admin-applied only).
- Revocation as `restriction_type = revoked` on Media Restriction Evidence (no separate Revocation Evidence entity).
- Media Expiry Evaluation contract rule and per-asset `expiration_date` fields.
- Media Usage Disposition Recalculation as a Media-owned readiness recalculation surface (NOT a buyer-export rule).
- The single canonical Restricted / Revoked / Expired / Review Required / Failed exclusion rule (Media Usage Disposition values excluding the affected Media Asset Version from buyer-visible Media Readiness Evidence).
- SKU Alias Mapping (System-Admin-approved, scoped, optionally expirable, review-assist only).
- SKU Alias Approval Evidence as a field collection on SKU Alias Mapping.
- SKU Alias Matching Rule (review-assist only; never `auto_assignable`; never overrides folder/filename SKU disagreement).
- Alias-Based Auto Assignment negative contract rule.
- Resumable Upload Reference as an optional field on Media Upload Job.
- Upload Continuation State as additive sub-discriminators on Media Upload Job terminal states (`completed_with_partial_failures`, `failed_with_partial_successes`).
- Upload Retry State fields on Media Upload Job (`retry_count`, `last_retry_at`, `retry_reason_reference`).
- Upload Session Size Policy as a contract rule (architectural threshold surfaces; numeric thresholds remain implementation-level).
- Child Job Failure Handling Rule (canonical: child job failure does NOT close the parent session).
- Prior Successful Upload Preservation Rule (canonical: retry creates a new sibling job; prior successes are preserved).
- Upload Failure Recovery Evidence as the audit record for retries.
- The CIXCI Media Asset URL/Reference Resolution Boundary contract rule: the CIXCI Media Asset URL/Reference may resolve through Integration Management transport mechanics (signed URLs, CDN, renditions) in PR-C; PR-B does not specify the resolution mechanism beyond the durable-reference architectural surface.

### Product Catalog boundary (PR-B reaffirmation)

Product Catalog continues to own (PR-B does NOT modify Product Catalog files):

- Accessory product canonical records.
- SKU and UPC as preserved text identifiers (UPC remains a Product Catalog identifier; UPC is NOT a Media-side matching key under PR-B).
- UPC validation, UPC normalization, UPC uniqueness.
- Accessory CSV import and accessory ingestion row-level validation.
- Buyer catalog visibility and buyer catalog export projection.
- Product publication lifecycle and buyer activation.

PR-B does NOT modify Product Catalog files. PR-B's Media Usage Disposition Recalculation Workflow operates on the Media-side Buyer Media Export Readiness Reference (PR-A foundation). Product Catalog continues to consume Media Readiness Evidence by reference per PR-A patterns. Whether Product Catalog buyer export rules continue to fire on Media supersession or restriction is a Product-Catalog-side concern that the Media-side recalculation enables but does NOT control. Concrete Product Catalog buyer export coordination is deferred to PR-C (and may require a small Product Catalog coordination PR).

### Integration Management boundary (PR-B reaffirmation)

Integration Management continues to own (PR-B does NOT modify Integration Management files):

- External HTTP fetch transport for image URLs (DNS, TLS, connection, request/response, retries at the transport layer).
- Response header parsing (ETag, Last-Modified, Cache-Control, Location for redirects).
- Redirect resolution at the transport layer, including the "materially changes host or path" determination per Integration Management transport policy.
- Response code interpretation at the transport layer (5xx as `fetch_unavailable`, 401/403 as `fetch_unauthorized`, 410 as `fetch_expired`, redirects as `fetch_redirected` when material).
- Body retrieval mechanics (chunked transfer encoding, streaming, large-body handling).

Signed URL generation mechanics, CDN behavior, and rendition transport remain Integration-Management-owned conceptually but are OUT OF PR-B SCOPE. Those are PR-C or future Integration Management hardening.

PR-B's Source URL Revalidation Job invokes Integration Management transport by reference. Media-side records the Source URL ETag Reference and Source URL Last-Modified Reference as supplemental hint fields; the Source URL Content Hash captured by Media-side from the body is the authoritative change-detection signal.

### Logs & Audit File Tracking boundary (PR-B reaffirmation)

Logs & Audit File Tracking continues to own (PR-B does NOT modify Logs & Audit files):

- Immutable evidence retention for Media-side records.
- Audit retention for Source URL Re-Ingestion Request, Source URL Revalidation Job, Source URL Change Detection Result, Version Supersession Evidence, Media Restriction Request, Media Restriction Evidence, SKU Alias Mapping, Upload Failure Recovery Evidence, and all Media Asset Version lifecycle transitions.

PR-B introduces NO new Logs & Audit retention class, redaction class, or access class. PR-B evidence records reuse existing `audit_reference` patterns established by PR-A and earlier hardening work. **Logs & Audit File Tracking hardening is the next planned sequence item; PR-B explicitly does NOT preempt that work.** Specific retention durations, search-index optimization for the new PR-B evidence types, and redaction class for restriction reason text or alias mapping approval reasoning are deferred to Logs & Audit hardening.

### Tenant Company boundary (PR-B reaffirmation)

Tenant Company continues to own (PR-B does NOT modify Tenant Company files):

- Vendor, buyer, and System Admin role definitions.
- Company scope and parent/child company scope.
- `check_access` for authority decisions.
- Capability flags and capability resolution.

PR-B introduces NO new Tenant Company role or capability flag. PR-B authority-bearing actions flow through existing `check_access` patterns:

- Source URL Re-Ingestion Request submission and approval - existing vendor or System Admin scope.
- Source URL Revalidation Job authorization for scheduled paths - existing System Admin scheduling authority.
- Media Restriction Request submission - existing vendor or System Admin scope.
- Media Restriction Evidence application - existing System Admin scope only.
- SKU Alias Mapping proposal - existing vendor or System Admin scope.
- SKU Alias Mapping approval - existing System Admin scope only.
- Version Supersession authorization - existing vendor or System Admin scope (per the trigger of the supersession).
- Upload Failure Recovery retry initiation - existing vendor or System Admin scope.

### Notification Platform Service boundary (PR-B reference-only)

Notification Platform Service is reference-only under PR-B. PR-B's restriction, revocation, and expiry events (`media.restriction-evidence.applied`, `media.restriction-evidence.superseded`) are candidate signals for buyer-facing or vendor-facing notification in a future PR. PR-B does NOT modify Notification Platform Service files. PR-B does NOT introduce notification templates, routes, transport behavior, or notification delivery contracts.

### Device Catalog boundary (PR-B reference-only, untouched)

Device Catalog is not touched by PR-B. Device Image Readiness Reference and device-specific media concerns remain a Device Catalog area.

### Analytics / Reporting boundary (PR-B reference-only, untouched)

Analytics / Reporting is not touched by PR-B. PR-B-emitted events may be consumed by Analytics in a future PR; PR-B does not introduce Analytics-side consumption.

### Order Routing, Fulfillment / Returns, Invoice Management, Pricing, Procurement / Purchase Orders, Launch / Event Management, AI Agent Services, Warranty Registration (PR-B untouched)

PR-B does NOT touch any file in any of these modules. No interaction is introduced by PR-B.

### Inherited deferral wording cleanup (PR-B boundary clarification)

Where existing PR-A documents say buyer media export, marketing downloads, CDN, signed URLs, or renditions are "PR-B" deferrals, the canonical boundary interpretation under PR-B is that those items are **PR-C** or **future PR**. PR-B does NOT rewrite PR-A sections. PR-B-added language uses "PR-C" or "future PR" directly for those items.

### Forbidden file modifications under PR-B

PR-B must NOT modify any of the following:

- `modules/media-image-asset-management/openapi-contracts.md`
- Any Product Catalog file (`modules/product-catalog/*`)
- Any Integration Management file (`modules/integration-management/*`)
- Any Logs & Audit File Tracking file (`modules/logs-audit-file-tracking/*`)
- Any Tenant Company file (`modules/tenant-company-model/*`)
- Any Device Catalog file (`modules/device-catalog/*`)
- Any Order Routing file (`modules/order-routing/*`)
- Any Fulfillment / Returns file (`modules/fulfillment-returns/*`)
- Any Invoice Management file (`modules/invoice-management/*`)
- Any Pricing file (`modules/pricing/*`)
- Any Procurement / Purchase Orders file (`modules/procurement-purchase-orders/*`)
- Any Launch / Event Management file (`modules/launch-event-management/*`)
- Any Notification Platform Service file (`modules/notification-platform-service/*`)
- Any Analytics / Reporting file (`modules/analytics-reporting/*`)
- Any AI Agent Services file (`modules/ai-agent-services/*`)
- Any Warranty Registration file (`modules/warranty-registration/*`)
- Any ADR (`architecture/decisions/*`)
- Any platform standard (`architecture/standards/*`)
- Any runtime / code / schema / migration / build / lockfile
- `modules/README.md`
