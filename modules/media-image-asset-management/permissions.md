# Media / Image Asset Management Permissions

This document defines proposal-level permission concepts for Media Manager upload, assignment, required media profile configuration, readiness evidence, reports, and overrides.

## Permission Principles

- Tenant Company owns user/admin authority, role scope, act-on-behalf authority, and permission evidence.
- Media Management consumes Tenant Company authority evidence before allowing scoped Media actions.
- Media Management owns Media workflow state and evidence after an authorized action is accepted.
- Logs & Audit owns immutable access/file/upload/report/download/audit evidence.

## Vendor Permissions

Vendor-scoped users may be authorized to:

- view own Media Manager summaries
- upload ZIP files
- upload media manually
- add image URLs
- assign media to their own Product Catalog product/variant references where allowed
- view Media Readiness Evidence for their own products
- download Missing Media Report for their own scope
- correct or reupload failed media where allowed

Vendor-scoped users must not access another vendor's assets, readiness evidence, reports, or assignment records unless explicit Tenant Company authority allows it.

## System Admin Permissions

System Admin permissions may include:

- view Media readiness summaries across vendor/entity scopes
- configure Required Media Profile records where authorized
- supersede Required Media Profile records where authorized
- apply Media Readiness Override Evidence where authorized
- review stale, conflicting, failed, or superseded asset/assignment/profile evidence
- view readiness evidence and audit references for investigation

System Admin override authority must be backed by Tenant Company authority evidence and Logs & Audit evidence references. Media Management records override evidence from an asset-readiness standpoint only.

## Required Media Profile Authority

Required Media Profile configuration should require explicit authority because it can affect Product Catalog buyer visibility/export evaluation.

Authority evidence should include:

- user/role reference
- company/entity or platform scope
- category/vendor/buyer-type/Product Type scope authority
- approval/override reference where applicable
- effective date
- expiration date
- source version/hash
- audit reference

Profile changes create or supersede Required Media Profile evidence. They must not silently rewrite historical export, visibility, invoice, analytics, or audit evidence.

## Override Authority

Media Readiness Override Evidence should require:

- Tenant Company authority reference
- approver/actor reference
- product/category/vendor/buyer-type/Product Type scope
- override mode
- override reason
- effective date
- expiration date
- source version/hash
- freshness timestamp
- source disposition
- applied-vs-ignored state
- supersession reference
- review-required state
- audit reference

Expired, superseded, ignored, stale, or conflicting override evidence should not continue to satisfy readiness or Product Catalog buyer visibility/export evaluation.

## Consumer Access

Product Catalog service identity may be authorized to read Media Readiness Evidence, Product Media Assignment evidence, Required Media Profile evidence, and override evidence needed for buyer visibility/export evaluation.

Notification, Analytics, and AI Agent Services may consume Media signals and evidence according to their own contracts and Tenant Company access scope. They must not mutate Media assets, Product Catalog visibility, or Media readiness without approved action contracts and permissions.

## Explicit Non-Authorities

Media permissions do not grant authority to:

- create or mutate Product Catalog product records
- decide final buyer visibility/export projection
- update buyer selling status
- mutate Tenant Company authority
- deliver notifications
- own Integration delivery/receipt evidence
- own Logs & Audit immutable evidence
- calculate pricing or invoices
- route orders or execute fulfillment/procurement workflows

## PR-A Permissions - Media Upload Session, SKU-Based Assignment, and CIXCI-Managed Media Asset Foundation

This section clarifies which actors may perform PR-A actions. Tenant Company remains the authority for role definitions, scopes, and capability checks. PR-A introduces no new role definitions and no new capability flags on the Tenant Company side; the surfaces below describe how existing Tenant Company authority applies to PR-A actions.

### Vendor scope permissions

Vendors operating under their Tenant Company scope may:

- Initiate a Media Upload Session for accessory import batches in their vendor scope.
- Create child Media Upload Jobs under their own Media Upload Sessions (`job_type` = `zip`, `manual_drag_drop`, `image_url`; `future_api` is reserved and not enabled in Phase 1 for vendor self-service).
- Add additional child Media Upload Jobs to an `open` or `paused` session they own (return-later flow).
- Signal Multi-Part Upload Completion State transitions on their own sessions: `open -> paused`, `open -> completed`, `paused -> completed`.
- View Media Upload Coverage Summary records for their own sessions.
- Download Missing Media Report for products in their own vendor scope.
- View Product Media Assignment Evidence and Media Readiness Evidence for products in their own vendor scope.
- View Media Asset Versions for media they uploaded.
- View Source URL Fetch Results for URL ingestion jobs they created.

Vendors may NOT:

- Auto-approve a `review_required` Media Assignment Candidate (review authority resides with System Admin or authorized vendor reviewer per Tenant Company authority configuration).
- Mutate Product Catalog product records.
- Mutate Required Media Profile records.
- Mutate Media Restriction Evidence records (Phase 1 foundation: restriction issuance is System Admin authority; the full vendor-initiated restriction request workflow is PR-B).
- Mutate the CIXCI Media Asset URL/Reference value (platform-managed; never vendor-mutable).
- Mutate Logs & Audit retention records.

### System Admin permissions

System Admin users (per existing Tenant Company authority) may:

- All vendor scope actions, across all vendor scopes per Tenant Company access rules.
- Approve or reject Media Assignment Candidates with `media_matching_confidence = review_required`.
- Issue Media Restriction Evidence (foundation; the full restriction workflow is PR-B).
- Apply existing Media Readiness Override Evidence (existing capability; PR-A does not modify).
- Initiate System Admin manual reprocess of source URL re-ingestion (foundation only; the full re-ingestion lifecycle is PR-B).

System Admin may NOT:

- Mutate immutable Media Asset Versions in place. Amendments produce new Media Asset Versions.
- Delete Media Asset Versions. Superseded versions are preserved for audit/history.
- Bypass Tenant Company authority. Even System Admin actions flow through existing `check_access` patterns.

### Service identity permissions (cross-module)

- **Product Catalog service identity** may continue to read Media Readiness Evidence and reference Product Media Assignment Evidence per existing patterns. PR-A adds the Media Usage Disposition field on Product Media Assignment Evidence; Product Catalog reads this field by reference to determine buyer-export eligibility.
- **Integration Management service identity** may write to Source URL Fetch Result on the Integration Management transport side (the transport record itself); Media references that record. Integration Management does NOT write Media-side Source URL Fetch Result records, does NOT create Media Asset Versions, and does NOT determine the Media-side `result_discriminator` value.
- **Logs & Audit File Tracking service identity** receives audit references and creates retention records per existing patterns. PR-A does not change Logs & Audit-side permissions.
- **Notification, Analytics, and AI Agent Services** are NOT invoked by PR-A. They may consume Media events in future PR-B / PR-C work.

### Authority-bearing fields introduced by PR-A

The following fields capture authority for new PR-A actions:

- **`reviewing_actor_reference`** on Media Assignment Candidate - the System Admin or authorized vendor actor who approved or rejected the candidate. Populated at terminal `approved` or `rejected` state.
- **`tenant_company_authority_reference`** on Media Restriction Evidence (foundation) - the Tenant Company authority that authorized the restriction.
- **`restricting_actor_reference`** on Media Restriction Evidence (foundation) - the System Admin or authorized actor who recorded the restriction.
- **`submitted_by_actor_reference`** on Media Upload Session and Media Upload Job - the vendor user who initiated the session or job.

All authority-bearing fields flow through existing Tenant Company `check_access` patterns; PR-A does not introduce parallel authority checks.

### Explicit non-authorities (PR-A reaffirmation)

Media permissions do NOT grant authority to:

- Create or mutate Product Catalog accessory product records.
- Validate, normalize, or check uniqueness of UPC values (these remain Product Catalog territory).
- Perform external HTTP fetches for image URLs (Integration Management territory).
- Create immutable Logs & Audit retention records (Logs & Audit territory; Media references audit records via existing patterns).
- Decide final buyer visibility/export projection (Product Catalog territory).
- Update buyer selling status (Product Catalog territory).
- Mutate Tenant Company role definitions or permission/capability flags.
- Deliver notifications (Notification Platform Service territory).
- Calculate pricing or invoices (Pricing and Invoice Management territory).
- Route orders or execute fulfillment / procurement workflows.
- Issue signed URLs, render media, or generate marketing download packages (PR-B; not introduced by PR-A).

### Authority evidence per PR-A action (proposal-level)

| PR-A action | Required authority |
|---|---|
| Initiate Media Upload Session | Vendor scope per Tenant Company. |
| Create child Media Upload Job under a session | Session owner (vendor) or System Admin. |
| Transition Multi-Part Upload Completion State (`open` -> `paused` / `completed`) | Session owner (vendor) or System Admin. |
| Auto-assign a Media Assignment Candidate (`clean` confidence) | Automated; no explicit actor (Media-side rule evaluation). Audit record records the automated decision. |
| Approve / reject a Media Assignment Candidate (`review_required` confidence) | System Admin or authorized vendor reviewer per Tenant Company authority. |
| Promote a Media Assignment Candidate to Product Media Assignment Evidence | Automated for auto-assignment; reviewer-driven for review-approved path. |
| Create Media Asset Version | Automated; produced by Media Validation and Processing on accepted media. |
| Set / read `cixci_media_asset_url_reference` | Platform-managed; never vendor-mutable. |
| Issue Media Restriction Evidence (foundation) | System Admin per Tenant Company authority. Full vendor-initiated restriction request workflow is PR-B. |
| Apply Media Readiness Override Evidence | Existing System Admin authority (preserved). |
| Read Media Readiness Evidence / Product Media Assignment Evidence (cross-module) | Product Catalog service identity per existing patterns. |
| Read Source URL Fetch Result (cross-module) | Integration Management service identity per existing patterns; Tenant-scoped vendors may read for their own jobs. |

### Phase 1 deliberate non-behaviors (Media permissions side)

- No new Tenant Company role definition.
- No new capability flag on the Tenant Company side.
- No vendor-initiated restriction request workflow (PR-B).
- No advanced reviewer escalation, multi-step approval, or batch approval (future operator-surface PR).
- No buyer-side authority for direct download of Media Asset Versions (PR-B handles buyer marketing download authority).
- No external (third-party) authority for any PR-A action.

## PR-B Permissions - Media Asset Version Lifecycle, Source URL Re-Ingestion, Restrictions, SKU Alias Review, and Upload Recovery

This section describes authority surfaces for PR-B. All PR-A permission patterns are preserved.

### Tenant Company authority discipline (PR-B reaffirmation)

PR-B authority-bearing actions are evaluated through existing Tenant Company `check_access` patterns. **PR-B introduces NO new Tenant Company role definition, NO new capability flag, and NO new scope.** Authority for each PR-B action is expressed in terms of existing roles and scopes:

- Vendor scope.
- Parent vendor scope (where parent/child relationships apply).
- System Admin scope.
- Scheduled-policy actor scope (a System-Admin-configured scheduling actor; itself derived from existing System Admin authority).

### Source URL Re-Ingestion authority

| Action | Vendor | System Admin | Scheduled |
|--------|--------|--------------|-----------|
| Submit a Source URL Re-Ingestion Request for vendor-scoped Source Image URL References | yes | yes | n/a |
| Submit a Source URL Re-Ingestion Request for any scope | no | yes | n/a |
| Initiate a scheduled Source URL Revalidation pass | no | configures the policy | invokes the policy |
| Approve a Source URL Re-Ingestion Request | n/a | yes | n/a |
| Reject a Source URL Re-Ingestion Request | n/a | yes | n/a |

A vendor MAY submit a request for vendor-scoped Source Image URL References. A System Admin MAY submit a request for any scope. Scheduled requests carry a scheduling policy reference; the scheduling policy is System-Admin-configured.

### Media Asset Version supersession authority

| Action | Vendor | System Admin |
|--------|--------|--------------|
| Trigger candidate creation via Source URL Re-Ingestion (vendor scope) | yes (via request) | yes |
| Trigger candidate creation via vendor re-upload | yes | yes |
| Authorize Version Supersession Evidence (vendor scope, vendor-triggered candidate) | yes (implicitly via the request) | yes |
| Authorize Version Supersession Evidence (System Admin restoration or correction) | no | yes |
| Reject a candidate explicitly (move to `rejected`) | review-disposition only | yes |

The Promotion Rule (Validation, Processing, Readiness, Version Supersession Evidence) applies uniformly. The supersession actor reference is recorded on Version Supersession Evidence per the trigger.

### Media Restriction authority

| Action | Vendor | System Admin |
|--------|--------|--------------|
| Submit a Media Restriction Request for vendor-scoped Media Asset Versions | yes | yes |
| Submit a Media Restriction Request for any scope | no | yes |
| Apply Media Restriction Evidence (`restriction_type = restricted`) | **no** | yes |
| Apply Media Restriction Evidence (`restriction_type = revoked`) | **no** | yes |
| Apply Media Restriction Evidence (`restriction_type = expired`) via Media Expiry Evaluation | n/a | system-triggered with System Admin scheduling authority |
| Lift Media Restriction Evidence | **no** | yes |
| Reject a Media Restriction Request | n/a | yes |

**Vendors cannot apply restriction, revocation, or expiry directly.** A vendor MAY submit a Media Restriction Request for vendor-scoped Media Asset Versions, but only a System Admin may create Media Restriction Evidence via Workflow 8 (Media Restriction Evidence Application). Revocation is `restriction_type = revoked` and follows the same System-Admin-only application rule.

Media Expiry Evaluation (Workflow 9, expiration path) is system-triggered when `expiration_date` elapses. The trigger mechanism is implementation-level; the authority to schedule and run Media Expiry Evaluation is System Admin scope.

### SKU Alias Mapping authority

| Action | Vendor | System Admin |
|--------|--------|--------------|
| Propose a SKU Alias Mapping with `alias_scope = vendor` for the vendor's own scope | yes | yes |
| Propose a SKU Alias Mapping with `alias_scope = import_session` for vendor-scoped sessions | yes | yes |
| Propose a SKU Alias Mapping with `alias_scope = global` | no | yes |
| Approve a SKU Alias Mapping | **no** | yes |
| Reject a SKU Alias Mapping | **no** | yes |

**Vendor proposals do NOT activate.** A SKU Alias Mapping remains in `lifecycle_state = proposed` until a System Admin approves it via Workflow 12. Only an `approved` mapping resolves alias matching in Workflow 13.

### Media Assignment Candidate review authority (PR-A reaffirmation)

Alias-resolved Media Assignment Candidates use the existing PR-A Media Assignment Candidate Review Workflow. The PR-A authority for that workflow is preserved; alias resolution does not change who may review.

### Upload Failure Recovery authority

| Action | Vendor | System Admin |
|--------|--------|--------------|
| Initiate a retry of a failed vendor-scoped Media Upload Job | yes | yes |
| Initiate a retry on any scope | no | yes |
| Authorize a retry that re-uploads files matching prior content hashes | yes (with duplicates flagged for review per PR-A) | yes (same) |

The retry creates a new sibling Media Upload Job. The Upload Failure Recovery Evidence is captured with the recovery actor reference.

### Per-version restriction discipline (PR-B Phase 1)

Restriction propagation is per Media Asset Version in Phase 1. Asset-wide restriction (restricting one version restricts all versions of the same Media Asset) is an open question and is NOT introduced by PR-B. The authority surfaces above apply per Media Asset Version.

### Notification Platform Service authority (PR-B reference-only)

Future notification of buyers or vendors about restriction, revocation, or expiry is reference-only in PR-B. PR-B introduces no authority for notification delivery, no notification template authority, and no notification routing authority. Concrete notification authority is future PR work.

### Forbidden authority modifications under PR-B

PR-B must NOT introduce:

- Any new Tenant Company role definition.
- Any new Tenant Company capability flag.
- Any new Tenant Company scope.
- Any new permission contract that does not flow through existing `check_access` patterns.
- Any modification to PR-A authority surfaces.

### Authority observability

Each PR-B authority-bearing action records:

- The actor reference (vendor user, System Admin user, scheduled-policy actor).
- The Tenant Company authority reference (existing `check_access` evidence reference).
- The audit reference.

These three references travel together on the evidence records produced by PR-B workflows (Source URL Re-Ingestion Request approval evidence, Version Supersession Evidence, Media Restriction Evidence application/lift, SKU Alias Mapping approval evidence field collection, Upload Failure Recovery Evidence).
