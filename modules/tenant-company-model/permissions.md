# Tenant Company Permissions

This document defines proposal-level Tenant Company permission and authority surfaces. `scope-authority-configuration-evidence.md` is the normative sub-contract for the detailed evidence models. `capability-flag-registry.md` is the canonical naming and lifecycle source for capability flags.

Tenant Company owns authority evidence. Source modules own their own business validation, mutation behavior, delivery, calculations, lifecycle records, and operational execution.

## `check_access` Canonical Internal Authority Gate

`check_access` is the canonical internal service contract for Tenant/Company authority resolution. External APIs do not expose direct `check_access` access and must not allow unrestricted Tenant authority mutation.

Inputs should include:

- actor/user reference
- actor company/entity scope
- target company/entity scope
- requested capability flag or permission action
- source module/action context
- role/scope projection reference
- Tenant Scope Evidence / Access Projection reference
- lifecycle state inputs, including Pending Setup, Active, Suspended, and Archived
- parent/child relationship evidence where applicable
- cross-tenant override indicator
- source version/hash and audit reference

Outputs should include allow/deny/review disposition, reason code, matched authority evidence references, effective capability state, lifecycle-state resolution, redaction/access decision references where applicable, and audit reference.

The Capability Flag Registry never substitutes for `check_access`. Consumers consult the registry for naming and meaning, the consuming module spec for operational rules, and `check_access` for authoritative authority resolution.

## Supported User Types

Tenant Company role/scope projection evidence should support:

- System Admin
- Company Admin
- Operations User
- Read-Only User
- API / Integration User

Roles are scoped to a company, parent company, child entity, standalone company, buyer/vendor relationship, Product Type, channel, or source module scope where applicable. Parent permissions must not imply child access unless inheritance is explicitly represented by versioned scope evidence.

## Capability Flag Governance

The v1 registered `parent_management.*` flags are:

- `parent_management.read_children`
- `parent_management.invite_users_to_children`
- `parent_management.manage_user_roles_in_children`
- `parent_management.manage_contacts_of_children`
- `parent_management.suspend_children`
- `parent_management.request_child_onboarding`

`parent_management.manage_capabilities_of_children` is deferred and is not a v1 registered flag. `setup.*` is provisional, `agent.*` is reserved, and `catalog.*` is anticipated for paired Catalog spec PRs after Tenant/Company repo-completeness is confirmed.

Namespace constraints:

- No `parent_management.*` flag grants archival authority. Archival remains CIXCI System Admin-controlled.
- No `parent_management.*` flag grants automatic suspension cascade authority.
- Parent admin `parent_management.*` flags are held but not effective while the parent Company is Suspended; `check_access` denies with `lifecycle_state_does_not_permit`.
- Authority is restored automatically when the parent returns to Active; no re-grant is required.

## Child Onboarding Request Authority

`parent_management.request_child_onboarding` authorizes a parent Company Admin to submit a `child_onboarding_request` only. It does not authorize direct child company creation, activation, default capability assignment, or final approval.

CIXCI System Admin reviews the request. Approval creates a child Company in Pending Setup and issues a bootstrap invitation. Final activation still requires invitation acceptance, setup completion, and CIXCI-controlled activation evidence review.

## Core Permission Families

Permission sets should support:

- manage parent company records
- manage child entity records
- link a standalone company/entity to a parent
- manage inherited and overridden child settings
- manage tenant-scoped user provisioning and role assignments
- manage buyer/vendor relationship evidence
- manage Product Type enablement
- manage channel eligibility
- manage buyer pricing mode configuration placement
- manage commission configuration input placement
- manage PO functionality and approval authority
- manage import/export authority
- manage report/invoice access scope and redaction inputs
- manage notification recipient scope
- manage API/integration user authority
- manage AI action authority
- grant or revoke act-on-behalf authority
- grant, use, expire, or revoke admin exceptions
- view Tenant evidence history

## Role / Permission Scope Projection

Role/scope projection evidence should include:

- role/scope projection id
- user reference
- company/entity scope
- role reference
- permission set reference
- action authority list
- sensitive access authority
- act-on-behalf authority
- API/integration authority
- import/export authority reference
- report/invoice access authority reference
- AI action authority reference
- redaction decision reference
- source version/hash
- effective date
- expiration date
- audit reference

Downstream modules must consume role/scope projection evidence for sensitive actions and views instead of inferring authority from user, company, or relationship ids alone.

## Import / Export Authority

Import/export authority must align with `architecture/standards/import-export-validation-governance.md`.

Tenant Company should model who may upload, validate, preview, confirm, approve, override validation, perform destructive apply, schedule exports, generate exports, download exports, revoke exports, view exports, re-export, and act on behalf of another company/entity.

Tenant Company owns the authority decision. Source modules own import/export business validation and final mutation behavior. Logs & Audit owns immutable file/import/export/download evidence. Integration Management owns external delivery/receipt evidence. Notification Platform Service owns scheduled email delivery.

## Pricing And Commission Authority Permissions

Tenant Company permissions may grant authority to configure where pricing mode and commission inputs live, including buyer parent company, buyer child/entity, buyer/vendor relationship, channel, Product Type, and contract/exception placeholders.

Tenant Company must not calculate commission, buyer-facing Wholesale Price, pricing snapshots, PO price, adjustment pricing, pricing exceptions, or commercial outcomes. Pricing consumes Tenant-owned configuration evidence and owns interpretation, precedence, calculation, validation, snapshotting, and bindability.

## Channel And Product Type Permissions

Channel eligibility permissions may grant or revoke Tenant authority for Online / Direct-to-Consumer, Bulk Purchase Order, Retail, Retail POS, Marketplace, Buyer Storefront, Owned Channel / Kaseory, Promotional Campaign, Buyer-Specific Contract, and future channel placeholders.

Product Type enablement permissions should align with ADR-0007 and support Non-Branded Accessory, Branded Accessory, Branded Product, Devices placeholder, and future controlled Product Types.

Tenant Company owns company/entity/channel/Product Type eligibility evidence. Product Catalog owns product records and product channel flags where accepted. Pricing owns channel-specific pricing interpretation. Procurement owns PO lifecycle.

## Parent Lifecycle Permission Constraints

Parent suspension does not automatically suspend children. Parent restoration does not automatically restore children. Parent admins lose effective `parent_management.*` authority while the parent is Suspended, but flags are not revoked.

Parent archival is CIXCI System Admin-controlled. Parent Company cannot be archived unless all direct children are already Archived. Parent admins cannot archive children through `parent_management.*`; archival validation rejection is audit-ready and does not emit cascade events.

## PO Functionality And Approval Authority

Permissions should support enable/disable PO functionality for a buyer parent company or child entity, scope PO functionality by Product Type and channel, configure approval-required state, configure approval threshold placeholders, assign approver role/scope projections, and supersede approval authority evidence.

Tenant Company owns PO enablement and approval authority evidence. Procurement owns PO lifecycle, PO approval workflow records, submitted/accepted/received evidence, and PO status.

## Report / Invoice Access And Redaction

Report/invoice permissions should support buyer invoice view, vendor invoice view, system admin invoice view, analytics report view, sensitive export download, pricing-sensitive field access, customer-sensitive field access, accounting-sensitive field access, recheck-before-display, and recheck-before-download.

Invoice Management owns invoice records/exports. Analytics owns reporting read models/exports. Both consume Tenant access/redaction evidence. Logs & Audit owns immutable access/export evidence.

## Notification Recipient Authority

Tenant Company provides eligible recipient scope for event types, source modules, company/entity scope, and role/user scope. Notification Platform Service owns preferences, suppression, fanout, delivery, retries, provider responses, and delivery evidence.

Notification must not infer recipient eligibility from product, order, invoice, integration, or operational records alone.

## API / Integration User Authority

API / Integration User permissions should support service account authority, company/entity scope, allowed integration scope, allowed source modules, external action authority, import/export authority reference, webhook/API action authority, and effective/expiration dates.

Tenant Company owns API/integration user authority and company/entity scope. Integration Management owns integration connection records, credential references, external delivery/receipt evidence, provider state, external ID mappings, and retries.

## AI Action Authority

AI action permissions should support allowed agent/action type, recommendation-only flag, draft-only flag, approval-required flag, approval authority reference, external-action allowed flag, Integration authority reference where external action is involved, and source-module action contract reference placeholder.

AI Agent Services owns recommendations, drafts, suggestions, and action orchestration rules. AI Agent Services must not define eligibility or bypass Tenant Company authority.

## Sensitive Access And Act-On-Behalf

Sensitive access and act-on-behalf authority must be explicit, scoped, versioned, auditable, and revocable. System Admin buyer context, invoice/report access, export download, destructive import apply, AI external action, and API/integration actions should all reference Tenant authority evidence before acting.

## Tenant Boundary Rules

- Parent company permissions must not automatically grant child entity permissions unless inheritance evidence says so.
- Child entity permissions must not leak into sibling entities.
- Buyer/vendor relationship permissions must be scoped by confirmed buyer, vendor, entity, region, Product Type, and channel evidence where applicable.
- Product Type enablement permissions must not become Product Catalog validation.
- Channel permissions must not become Pricing calculation or Procurement lifecycle ownership.
- Import/export permissions must not bypass source-module validation, Logs & Audit evidence, Integration transport evidence, or Notification delivery ownership.
- Admin overrides must declare type, scope, expiration, override mode, affected downstream modules, and audit references.

## Audit Requirements

Tenant Company permission and authority changes should be audit-ready for company/entity hierarchy changes, parent/child linking and override changes, role/scope projection changes, buyer/vendor relationship evidence changes, capability changes, child onboarding requests, parent archival validation rejection, import/export authority grants or revocations, buyer pricing mode configuration changes, commission configuration input changes, channel eligibility changes, Product Type enablement changes, PO functionality and approval authority changes, report/invoice access scope changes, notification recipient scope changes, API/integration user authority changes, AI action authority changes, access/redaction decision updates, and sensitive access and act-on-behalf usage.

## Logs & Audit Access Authority Role Bundles

This section documents the role bundles and service identity capability profiles required to coordinate Tenant Company authority with Logs & Audit File Tracking PR-A through PR-E. **Role bundles are documented composites only; they are NOT source-of-truth labels for `check_access`.** `check_access` evaluates effective capabilities + scope + lifecycle state + service identity authority + approval evidence + separation of duties + sensitivity inputs; `check_access` does NOT evaluate role labels.

### Core discipline reaffirmed

- **Capabilities are the source of truth.** They live in `capability-flag-registry.md`.
- **Role bundles are documented composites only.** They label capability sets for convenience.
- **Service identity capability profiles are documented composites only.** They label service identity capability sets for convenience.
- **`check_access` evaluates capabilities, not role labels.** Redefining a bundle's composition propagates through existing Tenant capability-change events; removing or renaming a bundle does NOT change `check_access` behavior.
- **System Admin Evidence Supervisor does NOT imply self-approval automatically.** Separation of duties is evaluated independently of bundle membership.
- **Separation of duties is preferred wherever feasible.** Raw Evidence Access Authorizer should be separate from the requester; Legal Hold Authority should separate `apply` and `release`; Break-Glass Approver should be separate from the requester.

### 9 Audit Role Bundles (documented composites only)

#### Bundle 1 - Compliance / Audit Reviewer (documented composite only)

**Purpose.** Read-side audit reviewer; conducts compliance review, investigation, audit reporting. Holds broad read / search / review / export-create capabilities; does NOT hold raw access, break-glass, legal hold apply / release, or approve_raw_export.

**Capability composition:**

- `audit_evidence.search`
- `audit_evidence.search_sensitive`
- `audit_evidence.view_redacted`
- `audit_evidence.view_visible_denied_metadata`
- `audit_evidence.view_legal_hold_flags`
- `audit_evidence.view_restricted_flags`
- `audit_review.create_session`
- `audit_review.create_note`
- `audit_review.create_collection`
- `audit_review.view_chain_of_custody`
- `audit_export.create`
- `audit_export.view`
- `audit_export.download`
- `audit_export.view_export_history`
- `retention_disposition.view`
- `redaction_transform.view`
- `legal_hold.view`

**Capabilities NOT included** (separation of duties / role discipline):

- `audit_evidence.view_raw`
- `audit_evidence.approve_raw`
- `audit_evidence.break_glass`
- `audit_export.approve_raw_export`
- `audit_review.manage_session`
- `audit_review.close_session`
- `legal_hold.apply`
- `legal_hold.release`
- `legal_hold.view_scope`
- `retention_disposition.approve`
- `redaction_transform.create`
- `redaction_transform.approve`

#### Bundle 2 - Raw Evidence Access Authorizer (documented composite only)

**Purpose.** Approves raw evidence access requests and raw export requests. **Should be separate from the requester wherever feasible.** Approving one's own request is prevented by separation-of-duties evaluation in `check_access` (default: deny when actor matches requester).

**Capability composition:**

- `audit_evidence.approve_raw`
- `audit_export.approve_raw_export`

**Capabilities NOT included:**

- `audit_evidence.request_raw` (separation of duties)
- All other audit capabilities (focused authorizer role)

#### Bundle 3 - Legal Hold Authority (documented composite only)

**Purpose.** Applies, releases, and views Legal Holds. **Apply / release separation of duties preferred** (default: deny when actor matches applier for high-sensitivity holds; configurable per tenant policy).

**Capability composition:**

- `legal_hold.apply`
- `legal_hold.release`
- `legal_hold.view`
- `legal_hold.view_scope`
- `audit_evidence.view_legal_hold_flags`

**Capabilities NOT included:**

- Raw / break-glass capabilities.
- Export create / download capabilities (separate role).
- Review / collection / note capabilities.

**Default authority audience:** CIXCI / compliance-only. Tenant-scoped Legal Hold Authority is an open business decision; default NO; future regulatory review may extend.

#### Bundle 4 - Break-Glass Approver (documented composite only)

**Purpose.** Approves break-glass requests. **Should be separate from the requester wherever feasible.** Approval-side authority is held at the bundle level. `check_access` evaluates separation of duties (default: deny when actor matches requester).

**Capability composition:**

- Documented approval authority for `audit_evidence.break_glass` requests at the bundle level. The bundle's composition explicitly grants the right to approve break-glass requests. This is a documented composite pattern in keeping with the capability-first model: the approval right is observable through bundle membership, and `check_access` evaluates the bundle's capability set (including the documented approval composite) when processing break-glass approval requests.

**Capabilities NOT included:**

- `audit_evidence.break_glass` (the requester capability; held by other bundles for emergency-response actors).
- Other audit capabilities (focused approver role).

**Time-bound discipline.** Approved break-glass grants are time-bound. **The exact duration is configurable and business-policy controlled.** "1 hour" may be suggested as configurable guidance, NOT as locked policy. Tenant policy sets the concrete duration within compliance constraints.

**Post-hoc review.** Every break-glass grant triggers post-hoc compliance review (concrete review SLA / workflow is future implementation).

#### Bundle 5 - Reviewer / Investigator (documented composite only)

**Purpose.** Conducts evidence review and investigation. Holds search and review / collection / note capabilities; does NOT hold sensitive search, raw, break-glass, export, or governance capabilities.

**Capability composition:**

- `audit_evidence.search`
- `audit_evidence.view_redacted`
- `audit_review.create_session`
- `audit_review.create_note`
- `audit_review.create_collection`
- `audit_review.view_chain_of_custody`

**Capabilities NOT included:**

- `audit_evidence.search_sensitive`
- `audit_evidence.view_visible_denied_metadata`
- `audit_evidence.view_legal_hold_flags`
- `audit_evidence.view_restricted_flags`
- `audit_review.manage_session`
- `audit_review.close_session`
- `audit_evidence.request_raw`
- `audit_evidence.approve_raw`
- `audit_evidence.break_glass`
- All export, legal hold, governance capabilities.

#### Bundle 6 - Audit Export Reviewer (documented composite only)

**Purpose.** Views, downloads, and tracks history of audit exports. Does NOT create exports or approve raw exports (separation of duties from create).

**Capability composition:**

- `audit_export.view`
- `audit_export.download`
- `audit_export.view_export_history`

**Capabilities NOT included:**

- `audit_export.create` (separation of duties)
- `audit_export.approve_raw_export` (separation of duties)
- All other audit capabilities (focused viewer role).

#### Bundle 7 - Evidence Search User (documented composite only)

**Purpose.** Minimum capability set for general evidence search. Lightweight bundle for actors who need read-side search access without elevated capabilities.

**Capability composition:**

- `audit_evidence.search`
- `audit_evidence.view_redacted`

**Capabilities NOT included:**

- All other audit capabilities.

#### Bundle 8 - Evidence Review Manager (documented composite only)

**Purpose.** Manages evidence review sessions. Extends Reviewer / Investigator with session management capabilities.

**Capability composition:**

- All Reviewer / Investigator capabilities (`audit_evidence.search`, `audit_evidence.view_redacted`, `audit_review.create_session`, `audit_review.create_note`, `audit_review.create_collection`, `audit_review.view_chain_of_custody`).
- PLUS `audit_review.manage_session`.
- PLUS `audit_review.close_session`.

**Capabilities NOT included:**

- Sensitive search, raw, break-glass, export, legal hold, governance capabilities.

#### Bundle 9 - System Admin Evidence Supervisor (documented composite only)

**Purpose.** Broad supervisory bundle for system administrators overseeing evidence governance. **Holds broad read / search / review / export capabilities; does NOT imply self-approval automatically.**

**Capability composition:**

- All search / query capabilities (`audit_evidence.search`, `search_sensitive`, `view_visible_denied_metadata`, `view_legal_hold_flags`, `view_restricted_flags`).
- `audit_evidence.view_redacted`.
- `audit_evidence.request_raw` (as requester; NOT self-approval).
- All review capabilities (`audit_review.*` all 6).
- `audit_export.create`, `audit_export.view`, `audit_export.download`, `audit_export.view_export_history`.
- `legal_hold.view`, `legal_hold.view_scope`.
- `retention_disposition.view`.
- `redaction_transform.view`.

**Critical: capabilities NOT included by default** (preserve separation of duties):

- `audit_evidence.approve_raw` - System Admin does NOT automatically hold approval capability. Self-approval is rejected by default; tenant policy MAY override; override logged.
- `audit_evidence.view_raw` - granted dynamically after approval.
- `audit_evidence.break_glass` - held only by emergency-response role definitions (future).
- `audit_export.approve_raw_export` - separation of duties from `audit_export.create`.
- `legal_hold.apply`, `legal_hold.release` - held by Legal Hold Authority.
- `retention_disposition.approve` - separation of duties from `view`.
- `redaction_transform.create`, `redaction_transform.approve` - held by governance roles with separation of duties.

**Self-approval discipline:**

- System Admin holding `request_raw` does NOT automatically hold `approve_raw`.
- System Admin holding `apply` (if granted via tenant policy override) does NOT automatically hold `release`.
- System Admin holding `audit_export.create` does NOT automatically hold `approve_raw_export`.
- Self-approval (same actor for both request and approve) is an open business decision; default NO; tenant policy MAY override; override is logged.
- This avoids the silent-misbehavior trap where a high-privilege role inadvertently bypasses separation of duties.

### 2 Service Identity Audit Capability Profiles (documented composites only)

#### Profile 1 - Service Identity Evidence Reader (documented composite only)

**Purpose.** For service identities that perform read-side audit operations (Logs & Audit indexing services, automated investigation triage services, scheduled review automation).

**Capability composition:**

- `service_identity.audit_search`
- `service_identity.audit_access_record`

**Discipline:**

- Scoped: REQUIRED registered `company_scope_reference` or scope projection.
- Expiring / rotatable: service identity credentials expire and rotate per existing Tenant baseline.
- Logged: every service identity access creates PR-D hardened Audit Access Record with `service_trigger_reference` populated per PR-D Service-Identity-Access-Logged Rule.
- No broad tenant-wide default.

#### Profile 2 - Service Identity Evidence Exporter (documented composite only)

**Purpose.** For service identities that perform export-side audit operations (scheduled compliance exports, regulatory submission services).

**Capability composition:**

- `service_identity.audit_export`
- `service_identity.audit_access_record`

**Discipline:**

- Scoped: REQUIRED registered scope.
- Expiring / rotatable: REQUIRED.
- Logged: per PR-D Service-Identity-Access-Logged Rule.
- No broad tenant-wide default.
- Service identity audit export creation requires this profile explicitly granted; default NO.

### Capability assignment vs role bundle composition

Two assignment paths exist:

1. **Direct capability assignment.** Actor / service identity is granted specific capabilities individually via existing Tenant capability assignment workflow. Granular control; preferred where role bundle does not fit.
2. **Role bundle assignment.** Actor / service identity is granted a role bundle; the bundle's documented composition determines the effective capability set. Convenient for common patterns.

In both cases, the effective capability set is what `check_access` evaluates. Role labels are never evaluated.

### Separation of duties discipline matrix

| Capability pair | Separation of duties policy | Default |
|---|---|---|
| `request_raw` / `approve_raw` | Preferred separate actors | Default: deny when actor matches requester; tenant policy MAY override |
| `audit_evidence.break_glass` (requester) / Break-Glass Approver (approver) | Preferred separate actors | Default: deny when actor matches requester; tenant policy MAY override |
| `legal_hold.apply` / `legal_hold.release` | Preferred separate actors | Default: deny when actor matches applier for high-sensitivity holds; configurable |
| `audit_export.create` / `audit_export.approve_raw_export` | Preferred separate actors | Default: deny when actor matches creator |
| `retention_disposition.view` / `retention_disposition.approve` | Preferred separate actors for sensitive dispositions | Configurable |
| `redaction_transform.create` / `redaction_transform.approve` | Preferred separate actors | Configurable |

### CIXCI System Admin override discipline

- Override use creates an explicit authority evidence record (existing Tenant baseline pattern extended for audit).
- Override is NOT a self-approval bypass; the override itself requires explicit `override_reason_reference` and is logged.
- Override produces a PR-D hardened Audit Access Record with `access_class_evaluated = system_admin_only` per PR-D access governance.

### Lifecycle blocking summary (audit capabilities)

- **Active actor + active target:** normal capability evaluation.
- **Suspended actor:** cannot exercise audit capabilities.
- **Suspended target:** actor's audit access to target evidence blocked unless CIXCI System Admin override applies.
- **Pending Setup actor:** cannot exercise audit capabilities.
- **Inactive actor:** cannot exercise audit capabilities.
- **Inactive target:** actor MAY access historical evidence per existing baseline lifecycle rules.

### What this permissions section intentionally does NOT introduce

- No new Tenant roles outside the 9 documented composites.
- No new service identity profiles outside the 2 documented composites.
- No role-label-driven authorization in `check_access`.
- No self-approval defaults in any bundle (System Admin Evidence Supervisor explicitly).
- No `legal_hold.override_retention_purge` capability.
- No per-evidence-type, per-family, UI-specific, AI-specific, or Warranty-specific capabilities in any bundle.
- No concrete permission UI or admin assignment flow.
- No concrete notification surface for capability changes (future Notification Platform coordination).
- No tenant-scoped Legal Hold Authority default (default CIXCI / compliance-only; open business decision).
- No buyer / vendor raw view default (default NO; open business decision).
- No concrete break-glass duration policy (configurable; "1 hour" is suggested guidance only, not locked).
- No two-person vs three-person approval policy lock (default two-person; open business decision).
