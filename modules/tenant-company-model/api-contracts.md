# Tenant Company API Contracts

This document defines proposal-level API surfaces for Tenant Company scope, authority, eligibility, and configuration evidence. Detailed data fields are defined in `scope-authority-configuration-evidence.md`, `company-subtype-taxonomy-management.md`, and `capability-flag-registry.md`.

Tenant Company APIs provide authority evidence. They do not execute Product Catalog, Pricing, Invoice, Order Routing, Fulfillment/Returns, Procurement, Notification, Integration, Analytics, Logs & Audit, Launch/Event, Media, or AI Agent Services behavior.

## API Principles

- Tenant Company owns source records and authority evidence.
- Tenant Company owns invitation-only onboarding, `activation_evidence_ref`, `child_onboarding_request` lifecycle/state spine, and capability flag naming/lifecycle evidence.
- Tenant Company owns company subtype/taxonomy authority.
- Company setup uses controlled taxonomy values, not free-text company type fields.
- Other modules consume Tenant Company subtype configuration evidence.
- Other modules must not define their own company subtype behavior tables.
- Tenant Scope Evidence / Access Projection is generated, recalculated, or superseded from underlying Tenant-owned source records.
- Normal client/admin commands should mutate the appropriate Tenant-owned source record, then produce a new evidence/projection version.
- Downstream modules should never author Tenant evidence projections or subtype configuration evidence.
- External APIs do not expose direct `check_access` access or unrestricted Tenant authority mutation.

## Internal Authority Contract

`check_access` is the canonical internal authority gate. Inputs include actor envelope, target company/entity scope, requested capability/action, role/scope projection, lifecycle state, capability assignment evidence, parent/child relationship evidence, cross-tenant override indicator, and source version/hash. Outputs include allow/deny/review disposition, reason code, matched authority evidence, effective capability state, lifecycle resolution, and audit reference.

The registry never substitutes for `check_access`.

## Evidence Lookup APIs

### Tenant Scope Evidence Lookup

Purpose: return generated, versioned Tenant Scope Evidence / Access Projection for downstream modules.

Inputs include company reference, parent company reference, child entity reference, standalone company reference, company subtype taxonomy/configuration evidence, user reference, role reference, buyer/vendor relationship reference, Product Type scope, channel scope, and action/view intent.

Output should include tenant scope evidence id, role/scope projection, permission set, buyer/vendor relationship evidence, company subtype assignment/configuration evidence where applicable, Product Type scope, channel eligibility, account status, access decision, redaction decision, source version/hash, freshness/expiration, inherited-vs-overridden state, source disposition, applied-vs-ignored state, supersession, review-required state, and audit reference.

### Direct Authority Record Lookup

Applies to buyer/vendor relationship evidence, role/scope projection, company subtype taxonomy records, subtype configuration evidence, subtype assignments, import/export authority, pricing mode configuration, commission input, channel eligibility, Product Type enablement, PO functionality/approval authority, report/invoice access/redaction, notification recipient scope, API/integration authority, AI action authority, capability assignment evidence, `activation_evidence_ref`, and `child_onboarding_request` status evidence.

Every response should include Common Authority Evidence Controls.

## Child Onboarding Request APIs

External/client-facing APIs should expose controlled request surfaces without exposing raw `check_access`.

Proposal-level endpoints:

- submit `child_onboarding_request`
- retrieve `child_onboarding_request`
- approve `child_onboarding_request` as CIXCI System Admin
- reject `child_onboarding_request` as CIXCI System Admin
- withdraw `child_onboarding_request` as requesting parent scope
- expire `child_onboarding_request` through system/ops timeout

Command outputs should include request id, status, parent company reference, requester actor reference, `external_evidence_ref`, `check_access` decision reference where applicable, decision actor/reference where applicable, created child company reference for approved requests, bootstrap invitation reference for approved requests, approval atomicity/correlation reference, source version/hash, and audit reference.

Rules:

- Approval creates child Company in Pending Setup, not Active.
- Approval does not grant default capabilities.
- Child activation still requires bootstrap invitation acceptance, setup completion, `activation_evidence_ref`, and final CIXCI activation.
- No public API emits or depends on `child_onboarding_request.under_review` at v1.

## Company Subtype Taxonomy APIs

Detailed fields and rules are defined in `company-subtype-taxonomy-management.md`.

Proposal-level command APIs include create/update subtype taxonomy record, generate subtype configuration evidence, validate activation readiness, block activation when required configuration is missing, activate subtype, retire subtype, supersede subtype, assign subtype to company/entity, reassign subtype with downstream impact preview, and preview downstream impact.

Lookup APIs include retrieve subtype configuration evidence, retrieve active subtype configuration evidence, retrieve subtype assignment history, retrieve subtype activation readiness status, and retrieve subtype downstream impact preview.

## Configuration Authority APIs

Tenant Company provides lookup and command placeholders for buyer/vendor relationship evidence, role/scope projection, import/export authority, buyer pricing mode configuration, commission configuration input, channel eligibility, Product Type enablement, PO functionality/approval authority, report/invoice access/redaction, notification recipient scope, API/integration user authority, AI action authority, capability assignment evidence, activation evidence, and subtype configuration evidence.

Commands should create versioned source evidence, emit normalized Tenant events, and produce or supersede affected Tenant Scope Evidence / Access Projection versions. They must not mutate downstream module records.

## Restricted Projection Repair / Recompute APIs

Tenant Company may define restricted placeholders for projection repair/recompute:

- `POST /tenant/scope-evidence/{evidenceId}/recompute`
- `POST /tenant/scope-evidence/recompute-by-source-record`
- `POST /tenant/scope-evidence/{evidenceId}/supersede`

Rules:

- Restricted to authorized System Admin or platform maintenance flows.
- Must preserve immutable historical evidence references.
- Must create a new projection version rather than overwriting an evidence version used by downstream records.
- Must record recompute reason, source records, actor/service, source version/hash, supersession reference, and audit reference.
- Downstream modules must not author Tenant evidence projections.

## Logs & Audit Access Authority API Surface Notes

This section documents architecture-level API surface notes for Logs & Audit access authority coordination. **No concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, or error code catalogs are introduced.** `openapi-contracts.md` is NOT modified by this PR. All concrete API contract work is deferred to future API Governance Foundation PR and Tenant-specific OpenAPI hardening PR.

### Discipline

- **No concrete API.** This section documents architectural shape only.
- **`openapi-contracts.md` NOT modified.** Per PR-A through PR-E deferral discipline.
- **No concrete `check_access` response schema.** Architectural inputs / outputs documented; concrete schema is future API.
- **No HTTP routes, payloads, pagination cursors, authentication headers, error code catalogs.** Future API.
- **Reference-first per PR-A discipline.** All inputs and outputs are described as references to existing fields / records.

### `check_access` audit-flow architectural surface

The `check_access` audit-flow extends the existing Tenant `check_access` surface. Architectural inputs and outputs are documented in `spec.md` (Access Decision Model section) and `workflows.md` Workflow 4. This section summarizes the API surface at the architectural level only.

**Architectural inputs (reference-first):**

- `actor_reference` OR `service_trigger_reference` (one populated per PR-A discipline).
- `requested_action_identifier` (e.g., `evidence.view_redacted`, `evidence.view_raw`, `export.create`, `legal_hold.apply`, `break_glass.request`).
- `target_company_scope_reference`.
- `evidence_access_class_reference` (PR-A; one of 6 PR-D access_class values).
- `evidence_redaction_class_reference` (PR-A; one of 9 PR-D redaction class values).
- `evidence_restricted_evidence_reference` (PR-A boolean).
- `evidence_legal_hold_state_reference` (current PR-D Legal Hold scope-match result).
- `evidence_retention_disposition_state_reference` (current PR-D Retention Disposition state).
- `requested_view_type` (one of PR-D 2 values: `raw` / `redacted`).
- `requested_redaction_audience` (one of `buyer` / `vendor` / `internal` / `audit_only` / `compliance_only` per PR-D and PR-E audience catalogs).
- `access_reason_reference` (REQUIRED for raw access, break-glass, sensitive search).
- `break_glass_requested` (boolean).
- `prior_approval_reference` (when prior approval exists).
- PR-A envelope: `correlation_reference`, `trace_reference`, `idempotency_key`.

**Architectural outputs (reference-first):**

- `decision` (one of `allow` / `deny` / `review`).
- `reason_code` (structured enumeration; see `data-model.md` for documented minimum value set; extensible).
- `matched_authority_evidence_reference` (reference(s) to the authority evidence record(s) that justified the decision; capability assignment, role bundle assignment, approval record, parent / child scope evidence, CIXCI System Admin override evidence).
- `decision_effective_until` (nullable; for time-bound grants such as raw view, break-glass).
- `prior_approval_reference` (when a prior approval is consumed).
- PR-A envelope echoed: `correlation_reference`, `trace_reference`, `idempotency_key`.

**Concrete payload schema, error code catalog, status codes, retry semantics, idempotency policy beyond existing Tenant baseline, pagination, response envelope versioning: future API.**

### Capability registration / lifecycle surfaces (architectural)

Capability registration, lifecycle status change, and assignment surfaces extend existing Tenant capability registry API patterns. Architectural inputs / outputs:

**Capability registration:**

- Input: capability identifier, capability family, capability kind, lifecycle status, effective date range.
- Output: registry entry reference.

**Capability assignment:**

- Input: capability identifier, actor / service identity reference, effective date range, assignment authority evidence reference.
- Output: assignment record reference; emission of existing `company.capability_changed` event with `capability_family` discriminator.

**Capability revocation:**

- Input: capability identifier, actor / service identity reference, effective time, revocation authority evidence reference.
- Output: revocation acknowledgment; emission of existing `company.capability_changed` event; downstream Workflow 12 (Active Session / Saved Search Authority Recheck).

**Concrete API surfaces deferred.**

### Role bundle assignment surfaces (architectural)

Role bundle assignment surfaces extend existing Tenant role assignment API patterns. Role bundles are documented composites only; the API surface grants the bundle's documented composition as effective capabilities.

**Architectural inputs:**

- Bundle identifier (one of 9 documented bundles).
- Actor reference.
- Assignment authority evidence reference.
- Effective date range.

**Architectural outputs:**

- Assignment record reference; emission of existing `tenant.access-role-assignment-changed` event with `role_bundle_kind` discriminator.

**Concrete API surfaces deferred.**

### Raw access request / approval surfaces (architectural)

Raw evidence access request / approval surfaces are new architectural surfaces; concrete API is future.

**Raw access request:**

- Input: target evidence reference, `access_reason_reference` (REQUIRED), requested view type, requested time bound (optional; subject to tenant policy).
- Output: pending request reference; Tenant `check_access` returns `decision = review`; Logs & Audit creates PR-D hardened Audit Access Record with `access_result = attempted`.

**Raw access approve / deny:**

- Input: pending request reference, approval decision, `decision_effective_until` (REQUIRED for approve; time-bound grant).
- Output: Raw Access Approval Evidence record reference; emission of existing `tenant.exception-admin-exception-changed` event with `exception_kind = raw_access_approval` / `raw_access_denial`.

**Concrete API surfaces deferred.**

### Break-glass surfaces (architectural)

Break-glass request, approve, expire, revoke surfaces are new architectural surfaces; concrete API is future.

**Break-glass request:**

- Input: target evidence reference OR target scope reference, `access_reason_reference` (REQUIRED), requested duration (subject to tenant policy).
- Output: pending request reference; Tenant `check_access` returns `decision = review`; Logs & Audit creates PR-D hardened Audit Access Record with `access_result = attempted`, `break_glass_flag = true`.

**Break-glass approve / deny:**

- Input: pending request reference, approval decision, `grant_effective_until` (REQUIRED for approve).
- Output: Break-Glass Grant Evidence record reference; emission of existing `tenant.exception-admin-exception-changed` event with `exception_kind = break_glass_grant` / `break_glass_revocation`.

**Break-glass expiry:**

- Automatic when `grant_effective_until` elapses.
- Output: emission of existing `tenant.exception-admin-exception-changed` event with `exception_kind = break_glass_expiry`; subsequent break-glass access attempts return `decision = deny` with `reason_code = break_glass_grant_expired`.

**Break-glass revoke:**

- Input: grant reference, revocation reason.
- Output: revocation record; emission of existing event with `exception_kind = break_glass_revocation`.

**Time-bound discipline:** Time-bound grant is REQUIRED. **The exact duration is configurable / business-policy controlled; "1 hour" is suggested guidance only, NOT locked policy.**

**Concrete API surfaces deferred.**

### Legal hold authority surfaces (architectural)

Legal hold authority grant / revocation surfaces. Legal hold ACTIONS themselves (apply / release / view-scope) continue to use existing PR-D Logs & Audit event surfaces; this PR does NOT modify any PR-D event.

**Legal Hold Authority Grant:**

- Input: grantee reference, legal hold capabilities in scope (subset of `legal_hold.apply` / `release` / `view` / `view_scope`), audience scope (default `cixci_compliance_only`), effective date range.
- Output: Legal Hold Authority Grant Evidence record reference; emission of existing `tenant.exception-admin-exception-changed` event with `exception_kind = legal_hold_authority_grant`.

**Legal Hold Authority Revocation:**

- Input: grant reference.
- Output: revocation record; emission of existing event with `exception_kind = legal_hold_authority_revocation`.

**Concrete API surfaces deferred.**

### Service identity capability profile surfaces (architectural)

Service identity capability profile grant / rotation surfaces extend existing Tenant API integration user authority surface.

**Profile grant:**

- Input: service identity reference, profile kind (one of 2 documented profiles OR `custom_per_identity`), granted audit capabilities reference, registered scope reference (REQUIRED), expiration reference (REQUIRED).
- Output: assignment record; emission of existing `tenant.api-integration-user-authority-updated` event with `service_identity_capability_profile` discriminator.

**Profile rotation:**

- Inherits existing service identity rotation surface per Tenant baseline.

**Concrete API surfaces deferred.**

### Audit export approval surfaces (architectural)

Audit export `create` / `view` / `download` / `approve_raw_export` / `view_export_history` surfaces are architecturally described in PR-E for Audit Report Export Records; this PR adds the Tenant authority side.

**Architectural inputs / outputs follow PR-E Workflow 13 with this PR's authority evaluation discipline.**

**Concrete API surfaces deferred.**

### Capability revocation propagation surface (architectural)

Capability revocation propagation surface is architectural; concrete propagation latency is implementation.

**Inputs:** capability revocation request per existing Tenant capability assignment API.

**Outputs:** emission of `company.capability_changed` event; downstream Workflow 12 ensures active sessions / saved searches re-evaluate at next access via `check_access`.

**Concrete latency policy is implementation-level.**

### `openapi-contracts.md` discipline

- **NOT modified.** Per PR-A through PR-E deferral discipline.
- All concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, error code catalogs are deferred to future API Governance Foundation PR + future Tenant-specific OpenAPI hardening PR.

### What this api-contracts section intentionally does NOT do

- No concrete HTTP route definitions.
- No concrete request / response payload schemas.
- No pagination cursor specification.
- No authentication / authorization header specification.
- No error code catalog.
- No rate-limit policy.
- No API versioning scheme beyond existing Tenant baseline.
- No concrete `check_access` response schema.
- No concrete capability registry persistence schema.
- No concrete propagation latency or eventual-consistency policy beyond existing baseline.
- No source-module API surface modifications.
- No Logs & Audit API surface modifications.
- No `openapi-contracts.md` modifications.

### Sequencing note

After this PR merges, the following API hardening PRs become natural next-steps in the broader sequence:

1. API Governance Foundation PR (cross-module API contract conventions).
2. Tenant-specific OpenAPI hardening PR (introduces concrete HTTP routes / payloads / pagination / error codes for this PR's `check_access` audit-flow and capability registration / assignment / revocation surfaces).
3. Logs & Audit-specific OpenAPI hardening PR (introduces concrete HTTP routes for the 30 net Logs & Audit events plus search / review / export endpoints).

These PRs are out of scope here. This PR documents architectural shape only.
