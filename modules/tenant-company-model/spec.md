# Tenant Company Module Specification

## Purpose

Define the Tenant Company bounded context for CIXCI's multi-tenant company/entity hierarchy, user provisioning, role boundaries, access scope, invitation-only onboarding, activation state, buyer/vendor relationship eligibility, geographic eligibility mapping, Product Type eligibility scope, licensed-property relationship scope placeholders, admin exceptions, child operational configuration, channel eligibility, configuration authority, capability flag governance, and Tenant-owned authority evidence.

This module aligns with ADR-0003 and supports ADR-0007 by supplying tenant eligibility and scope signals for category-extensible Product Catalog behavior. It is proposal-level architecture, not final implementation design or finalized business rules.

`scope-authority-configuration-evidence.md` is the normative Tenant Company sub-contract for Tenant Scope Evidence / Access Projection and authority evidence controls. `company-subtype-taxonomy-management.md` is the normative sub-contract for controlled subtype taxonomy. `capability-flag-registry.md` is the canonical naming and lifecycle source for Tenant/Company capability flags.

## Ownership Scope

Tenant Company owns company, parent company, child entity, standalone company, user, role, permission, scope, eligibility, relationship, access, configuration authority, channel eligibility, Product Type enablement, capability flag naming/lifecycle, and authority evidence.

Tenant Company does not own Product Catalog records, Device Catalog records, Pricing calculations/snapshots, Invoice records, Order Routing decisions, Fulfillment/Returns operational evidence, Procurement lifecycle, Notification delivery, Analytics metrics/read models, Integration transport, Media processing, Launch/Event coordination, Logs & Audit immutable evidence, AI recommendations/actions, Warranty, Accounting ledger, or Payment behavior.

Other modules consume Tenant Company evidence instead of inferring eligibility, permission, authority, cascade behavior, or redaction independently.

## Invitation-Only Onboarding

Tenant/Company Foundation operates under an invitation-only onboarding constraint. There is no open self-onboarding and no unauthenticated company creation. Auth-provider account creation does not equal CIXCI platform access.

Two creation paths exist:

1. CIXCI System Admin directly creates and approves the Company.
2. A parent Company Admin holding `parent_management.request_child_onboarding` submits a `child_onboarding_request`; CIXCI System Admin approves the request and creates the child Company.

Both paths produce a Company in Pending Setup state with no default capabilities. Final activation remains CIXCI-controlled and requires `activation_evidence_ref`. No path bypasses CIXCI System Admin authority for Company creation or activation.

## Activation Evidence

Flag 10 is closed through a policy/spec split. Operational onboarding checklist details are not hard-coded into this spec. Tenant/Company records the hybrid `activation_evidence_ref` needed for final activation.

`activation_evidence_ref` should include onboarding checklist policy reference, operational checklist external reference where applicable, setup flag snapshot reference, activation integrity marker, reviewer/actor reference, source version/hash, freshness timestamp, final activation decision, supersession reference, and audit reference.

Setup flags remain provisional where intended. Activation evidence is required before final activation.

## Lifecycle

### Parent-child suspension behavior

Parent Company suspension does not auto-suspend children. Parent Company restoration does not auto-restore children. Child lifecycle is independent of parent lifecycle for suspension/restoration at v1.

Specific commitments:

- No automatic cascade on suspension.
- No automatic cascade on restoration.
- No suspension cascade audit chain.
- Parent Company Admins retain `parent_management.*` flag holdings while the parent is Suspended, but the flags are not effective through `check_access` and operations deny with `lifecycle_state_does_not_permit`.
- Effective authority restores automatically when the parent returns to Active.
- `parent_management.suspend_children` permits explicit suspension of a specific direct child only and does not imply broadcast suspension.
- CIXCI System Admin authority remains available and audit-scoped.

### Parent-child archival behavior

Parent Company cannot transition to Archived unless all direct children are already Archived. Pre-archival validation enforces this child-first gate.

Specific commitments:

- Parent archival validation enumerates direct children and rejects archival if any direct child is Pending Setup, Active, or Suspended.
- Parent archival does not automatically archive children at v1.
- Direct children only are considered at v1; deeper nesting is future ADR-driven.
- Re-parenting / child migration is not a v1 operational path and remains future ADR-driven.
- No `parent_management.*` flag grants archival authority.
- Archival validation rejection is audit-ready and audit-only; no cascade event family is introduced.

## Child Onboarding Request

Parent companies request CIXCI to onboard a child company through `child_onboarding_request`.

The hybrid lifecycle/state spine model is:

- CIXCI owns request lifecycle, state, decision, child company linkage, and audit.
- Substantive request content lives in external operational tooling through `external_evidence_ref`.
- Parent submission requires effective `parent_management.request_child_onboarding` through `check_access`.
- Approval creates the child Company in Pending Setup, not Active.
- Child still requires bootstrap invitation acceptance, setup completion, `activation_evidence_ref`, and final activation.
- Five v1 events are used: `child_onboarding_request.submitted`, `child_onboarding_request.approved`, `child_onboarding_request.rejected`, `child_onboarding_request.withdrawn`, and `child_onboarding_request.expired`.
- No `child_onboarding_request.under_review` event exists at v1.
- Approval failure is observably atomic and audit-ready.

## Capability Flag Registry And `check_access`

`capability-flag-registry.md` is the canonical Capability Flag Registry for flag naming, status, behavior summary, consuming modules, constraints, and replacement references.

At v1:

- `parent_management.*` has six registered flags.
- `parent_management.manage_capabilities_of_children` is deferred and not v1.
- `setup.*` is provisional.
- `agent.*` is reserved.
- `catalog.*` is anticipated after Tenant/Company repo-completeness is confirmed.

`check_access` is the canonical internal authority gate. The registry never substitutes for `check_access`; external APIs do not expose direct `check_access` access.

## Controlled Subtype Taxonomy

Company setup uses controlled taxonomy values, not free-text company type fields. Subtype labels such as MVNO, Wireless Carrier, Retailer, Reseller, Device Distributor, or Device Manufacturer are examples/classification labels only and do not create behavior by name.

Behavior must come from versioned Tenant-owned Company Subtype Configuration Evidence and Tenant Scope Evidence. Downstream modules must not define their own subtype behavior tables.

## Downstream Readiness

Downstream modules may consume Tenant lifecycle state, Tenant Scope Evidence, `company.capability_changed`, child onboarding request events, parent/child relationship evidence, Pending Setup restrictions, personal email exception evidence where applicable, subtype configuration evidence, and access/redaction evidence.

Tenant-side framing for all downstream notes:

- Tenant/Company provides evidence.
- The consumer composes that evidence with its own spec.
- Consumers must not infer cascade behavior.
- Final behavior remains owned by the consuming module spec.

Catalog remains paused until Codex confirms Tenant/Company Foundation repo-completeness in committed files.

## Out of Scope

Tenant Company does not own product records, device records, pricing outputs, invoice lifecycle, routing decisions, fulfillment/return execution, Procurement PO lifecycle, notification delivery, integration delivery/receipt, analytics metrics/read models, media processing, Logs & Audit immutable evidence, AI recommendations/actions, warranty decisions, accounting ledger, or payment behavior.

## Dependencies

- ADR-0003 bounded contexts.
- ADR-0007 category-extensible Product Catalog.
- `scope-authority-configuration-evidence.md`.
- `company-subtype-taxonomy-management.md`.
- `capability-flag-registry.md`.
- `permissions.md` for `check_access` and authority resolution.
- `events.md` and `event-contracts.md` for committed event names and payloads.

## Logs & Audit Access Authority Specification

This section specifies the Tenant Company authority surface that supports Logs & Audit File Tracking PR-A through PR-E. All Tenant baseline concepts (check_access, Tenant Scope Evidence / Access Projection, Role / Permission Scope Projection, capability registry, parent / child scope rules, service / API user authority, lifecycle blocking, Common Authority Evidence Controls, audit-ready authority evidence) are preserved without modification. All Logs & Audit PR-A through PR-E content is preserved by reference without modification.

### Capability-first authorization model

Capabilities are the source of truth. Role bundles are documented composites only; they are convenient labels for capability sets and are NOT evaluated by `check_access`. Service identity capability profiles are documented composites only.

`check_access` evaluates the following inputs at every call:

- Effective capability assignment (the actor's or service identity's currently effective capabilities).
- Scope projection (Tenant Scope Evidence / Access Projection coverage of `target_company_scope_reference`).
- Lifecycle state (actor's company, target company; active / suspended / pending setup / inactive).
- Service identity scope (for service identities, the registered scope and capability profile).
- Effective dates (capability assignment and role bundle assignment effective windows).
- Approval evidence (for raw access, break-glass, approve_raw_export, legal hold actions).
- Separation of duties (where preferred / required).
- Sensitivity inputs (PR-A `access_class`, `redaction_class`, `restricted_evidence`, current Legal Hold scope-match result, current Retention Disposition state, `requested_view_type`, `requested_redaction_audience`).

`check_access` does NOT evaluate role labels. Role bundle membership is observable only through the effective capability assignment that the bundle composition grants.

### 8 audit capability families (34 capabilities total)

**Capabilities are introduced in the existing Tenant capability registry; see `capability-flag-registry.md` for the registry entries.**

| Family | Capabilities | Count |
|---|---|---:|
| 1. Search / Query | `audit_evidence.search`, `audit_evidence.search_sensitive`, `audit_evidence.view_visible_denied_metadata`, `audit_evidence.view_legal_hold_flags`, `audit_evidence.view_restricted_flags` | 5 |
| 2. View / Retrieval | `audit_evidence.view_redacted`, `audit_evidence.request_raw`, `audit_evidence.approve_raw`, `audit_evidence.view_raw` | 4 |
| 3. Review | `audit_review.create_session`, `audit_review.manage_session`, `audit_review.create_note`, `audit_review.create_collection`, `audit_review.view_chain_of_custody`, `audit_review.close_session` | 6 |
| 4. Export | `audit_export.create`, `audit_export.view`, `audit_export.download`, `audit_export.approve_raw_export`, `audit_export.view_export_history` | 5 |
| 5. Legal Hold | `legal_hold.apply`, `legal_hold.release`, `legal_hold.view`, `legal_hold.view_scope` | 4 |
| 6. Governance | `retention_disposition.view`, `retention_disposition.approve`, `redaction_transform.view`, `redaction_transform.create`, `redaction_transform.approve` | 5 |
| 7. Service Identity | `service_identity.audit_search`, `service_identity.audit_export`, `service_identity.audit_access_record`, `service_identity.evidence_emit` | 4 |
| 8. Break-Glass | `audit_evidence.break_glass` | 1 |
| **Total** | | **34** |

### Capabilities explicitly NOT introduced

- `legal_hold.override_retention_purge` - REJECTED. Legal hold BLOCKS purge by design (per PR-D Legal-Hold-Overrides-Purge Rule). Release is the canonical lift mechanism. There is no override path.
- Per-evidence-type capabilities (e.g., `audit_evidence.view_pricing_redacted`) - proliferation rejected. Existing capabilities plus PR-A `redaction_class` plus audience scoping in `check_access` cover this.
- Per-family capabilities (e.g., `audit_evidence.search_pricing_family`) - same rationale; family-level scoping is via filter dimensions, not capabilities.
- UI-specific capabilities (e.g., `audit_ui.access_dashboard`) - too implementation-specific.
- AI Agent Services audit capabilities - module does not exist (PR-C reserved family slot).
- Warranty Registration audit capabilities - module does not exist (PR-C reserved family slot).

### 9 Audit Role Bundles (documented composites only; not source of truth for check_access)

Each bundle is a named composition of capabilities. `check_access` does NOT use role labels; it evaluates the effective capability set.

#### Bundle 1 - Compliance / Audit Reviewer (documented composite only)

Composition: `audit_evidence.search`, `audit_evidence.search_sensitive`, `audit_evidence.view_redacted`, `audit_evidence.view_visible_denied_metadata`, `audit_evidence.view_legal_hold_flags`, `audit_evidence.view_restricted_flags`, `audit_review.create_session`, `audit_review.create_note`, `audit_review.create_collection`, `audit_review.view_chain_of_custody`, `audit_export.create`, `audit_export.view`, `audit_export.download`, `audit_export.view_export_history`, `retention_disposition.view`, `redaction_transform.view`, `legal_hold.view`.

NOT included: `view_raw`, `approve_raw`, `break_glass`, `approve_raw_export`, `apply`, `release`, `view_scope`, `manage_session`, `close_session`. Separation of duties.

#### Bundle 2 - Raw Evidence Access Authorizer (documented composite only)

Composition: `audit_evidence.approve_raw`, `audit_export.approve_raw_export`.

NOT included: `request_raw`. **Raw Evidence Access Authorizer should be separate from the requester wherever feasible.** Approving one's own request is prevented by separation-of-duties evaluation in `check_access` (default: deny when actor matches requester).

#### Bundle 3 - Legal Hold Authority (documented composite only)

Composition: `legal_hold.apply`, `legal_hold.release`, `legal_hold.view`, `legal_hold.view_scope`, `audit_evidence.view_legal_hold_flags`.

**Legal Hold Authority should separate `apply` and `release` wherever feasible.** `check_access` evaluates separation of duties for release (default: deny when actor matches applier for high-sensitivity holds). Default authority audience is CIXCI / compliance only; tenant-scoped authority is an open business decision.

#### Bundle 4 - Break-Glass Approver (documented composite only)

Composition: documented approval authority for `audit_evidence.break_glass` requests. The approval-side authority is held at the bundle level (the bundle's composition explicitly grants approval rights for break-glass requests). **Break-Glass Approver should be separate from the requester wherever feasible.** Approving one's own break-glass request is prevented by separation-of-duties evaluation in `check_access` (default: deny when actor matches requester).

#### Bundle 5 - Reviewer / Investigator (documented composite only)

Composition: `audit_evidence.search`, `audit_evidence.view_redacted`, `audit_review.create_session`, `audit_review.create_note`, `audit_review.create_collection`, `audit_review.view_chain_of_custody`.

NOT included: `search_sensitive`, `view_visible_denied_metadata`, `view_legal_hold_flags`, `view_restricted_flags`, `manage_session`, `close_session`, `request_raw`, `approve_raw`, `break_glass`, any export capability, any legal hold capability, any governance capability.

#### Bundle 6 - Audit Export Reviewer (documented composite only)

Composition: `audit_export.view`, `audit_export.download`, `audit_export.view_export_history`.

NOT included: `audit_export.create`, `audit_export.approve_raw_export`. Separation of duties between create and download.

#### Bundle 7 - Evidence Search User (documented composite only)

Lightweight composition: `audit_evidence.search`, `audit_evidence.view_redacted`.

Minimum capability set for general evidence search.

#### Bundle 8 - Evidence Review Manager (documented composite only)

Composition: Reviewer / Investigator composition PLUS `audit_review.manage_session`, `audit_review.close_session`.

Closes Review Sessions and manages session status transitions.

#### Bundle 9 - System Admin Evidence Supervisor (documented composite only)

Composition: broad supervisory capability set covering most read / search / review / export capabilities AND `legal_hold.view` / `view_scope` AND `retention_disposition.view` AND `redaction_transform.view`.

**CRITICAL: System Admin Evidence Supervisor does NOT imply self-approval automatically.** System Admin holding `audit_evidence.request_raw` does NOT automatically hold `audit_evidence.approve_raw`; separation of duties is evaluated independently of bundle membership. Same applies to legal hold apply / release and audit export create / approve_raw_export. Self-approval is treated as an open business decision; default is NO; tenant policy MAY override; override is logged.

### 2 Service Identity Audit Capability Profiles (documented composites only)

#### Profile 1 - Service Identity Evidence Reader (documented composite only)

Composition: `service_identity.audit_search`, `service_identity.audit_access_record`.

For service identities that perform read-side audit operations (Logs & Audit indexing services, automated investigation triage services). Scoped, expiring / rotatable, logged like human access. No broad tenant-wide defaults.

#### Profile 2 - Service Identity Evidence Exporter (documented composite only)

Composition: `service_identity.audit_export`, `service_identity.audit_access_record`.

For service identities that perform export-side audit operations (scheduled compliance exports, regulatory submission services). Scoped, expiring / rotatable, logged like human access.

### Access Decision Model

`check_access` audit-flow:

1. Logs & Audit sends actor / service identity, requested action, target `company_scope_reference`, evidence sensitivity inputs, and purpose / reason references to Tenant `check_access`.
2. Tenant Company evaluates effective capability assignment + scope projection + lifecycle state + parent / child relationship + service identity scope + effective dates + suspension / inactive state + approval evidence + separation of duties + sensitivity inputs.
3. Tenant Company returns `allow` / `deny` / `review` + `reason_code` + `matched_authority_evidence_reference` + optional `decision_effective_until` + optional `prior_approval_reference`.
4. Logs & Audit records `access_result = attempted` / `granted` / `denied` in the PR-D hardened Audit Access Record. `review` maps to `attempted` (non-terminal) until terminal `granted` / `denied`.
5. Logs & Audit NEVER becomes permission authority.

`reason_code` is a structured enumeration covering at minimum: `capability_missing`, `scope_mismatch`, `lifecycle_blocked`, `parent_child_unauthorized`, `service_identity_out_of_scope`, `capability_expired`, `suspended_actor`, `suspended_target`, `approval_required`, `approval_missing`, `approval_expired`, `separation_of_duties_violation`, `sensitivity_mismatch`, `cross_tenant_denied`, `break_glass_required`, `break_glass_grant_expired`. Concrete enumeration may extend; documented at the architectural level here.

### Sensitivity inputs `check_access` consumes

- `evidence_access_class` (PR-A field; one of PR-D's 6 access_class values: `public_metadata`, `buyer_visible`, `vendor_visible`, `internal_operations`, `system_admin_only`, `compliance_only`).
- `evidence_redaction_class` (PR-A field; one of PR-D's 9 redaction class values including preserved `public_metadata_placeholder`).
- `evidence_restricted_evidence` (PR-A boolean).
- `evidence_legal_hold_state` (current Legal Hold scope-match result per PR-D Workflow 7).
- `evidence_retention_disposition_state` (current Retention Disposition state per PR-D; one of `retain`, `archive`, `purge_eligible`, `purge_blocked_by_hold`, `purged_reference_only`, `preserved`).
- `requested_view_type` (PR-D 2 values: `raw` / `redacted`).
- `requested_redaction_audience` (`buyer`, `vendor`, `internal`, `audit_only`; PR-E export audiences include `internal`, `audit_only`, `compliance_only`).

### Cross-tenant denial by default

Cross-tenant `target_company_scope_reference` (target tenant not the actor's tenant AND not a child of the actor's tenant) returns `decision = deny` with `reason_code = cross_tenant_denied` unless an explicit CIXCI System Admin override evidence exists. CIXCI System Admin override must be explicit, scoped, reasoned, and logged.

### Parent / child audit scope governance (locked decisions)

- Cross-tenant access denied by default.
- Parent to child audit evidence requires explicit parent / child scope evidence + capability. Holding `audit_evidence.search` alone is insufficient.
- Child to parent denied by default. CIXCI System Admin override only.
- Child to sibling denied by default. CIXCI System Admin override only.
- Suspended parent loses effective parent-management / audit authority unless CIXCI System Admin override applies.
- Pending Setup and inactive companies have restricted audit access.
- CIXCI System Admin override must be explicit, scoped, reasoned, and logged.

Deferred:

- Deeper nesting (3+ levels).
- Re-parenting effects on in-flight audit operations.
- Complex regional / legal jurisdiction policy.

### Raw evidence access authority (locked decisions)

- `audit_evidence.request_raw` allows raw access request.
- `audit_evidence.approve_raw` allows raw access approval. Default: held by Raw Evidence Access Authorizer (documented composite only).
- `audit_evidence.view_raw` is granted dynamically after approval; not a statically-held capability.
- `access_reason_reference` is REQUIRED per PR-D Raw-Evidence-Access-Exceptional Rule.
- Raw access is time-bound (concrete default duration is open business decision).
- Separation of duties is preferred / default. Same actor for request and approve is rejected by default; tenant policy MAY override; override logged.
- CIXCI System Admin self-approval is treated as open business decision; default NO; tenant policy MAY override; override logged.
- Buyer / vendor raw view is treated as open business decision; default NO; per-tenant regulatory situations may extend.
- All raw access is logged via PR-D hardened Audit Access Record with `view_type = raw`.

### Break-glass governance (locked decisions)

- `audit_evidence.break_glass` is the requester capability.
- Break-Glass Approver (documented composite only) holds the approver authority.
- Reason is REQUIRED (`access_reason_reference`).
- **Time-bound grant is REQUIRED.** The exact duration is configurable / business-policy controlled; **"1 hour" is suggested guidance only, NOT locked policy.** Tenant policy may set shorter or longer durations within compliance constraints.
- Post-hoc compliance review is REQUIRED. Concrete review SLA is future implementation.
- Notification intent is deferred to Notification Platform coordination (out of scope here).
- All break-glass access is logged via PR-D hardened Audit Access Record with `break_glass_flag = true`.
- Break-glass is NOT a normal access path. Frequency is monitored as an anomaly signal (future implementation).
- Break-Glass Approver should be separate from the requester wherever feasible.

### Legal hold authority (locked decisions)

- `legal_hold.apply` allows applying a Legal Hold (per PR-D Workflow 6).
- `legal_hold.release` allows releasing a Legal Hold (per PR-D Workflow 7).
- `legal_hold.view` allows viewing a Legal Hold Record.
- `legal_hold.view_scope` allows viewing the scope detail of a Legal Hold (which evidence is held). More sensitive than `view`.
- Legal Hold Authority should separate `apply` and `release` wherever feasible. `check_access` evaluates separation of duties for release (default: deny when actor matches applier for high-sensitivity holds; configurable).
- Default authority audience is CIXCI / compliance only. Tenant-scoped Legal Hold Authority is an open business decision; default NO; future regulatory review may extend.
- Parent admins viewing child legal hold flags requires explicit parent / child audit scope evidence + `audit_evidence.view_legal_hold_flags`.
- **`legal_hold.override_retention_purge` is NOT introduced.** Legal hold BLOCKS purge by design. Release is the canonical lift mechanism. There is no override capability.

### Audit export authority (locked decisions)

- `audit_export.create` allows creating an Audit Report Export Record (per PR-E Workflow 13). Held by Compliance / Audit Reviewer and Evidence Review Manager (documented composites only).
- `audit_export.view` allows viewing Audit Report Export Record metadata.
- `audit_export.download` allows downloading the generated artifact (when PR-E `export_status = generated`). Separate from `view` per PR-E Export-Access-Logged-Via-PR-D Rule.
- `audit_export.approve_raw_export` allows approving raw items in an export. Held by Raw Evidence Access Authorizer (documented composite only); separation of duties from `create`.
- `audit_export.view_export_history` allows viewing the history of Audit Report Export Records.
- Create / download / approve_raw_export should be separate and company-scoped. Cross-tenant export denied by default; parent to child export requires explicit parent / child audit scope evidence + capability.
- Raw export requires PR-D raw access authority per item; without per-item approval, raw items are rendered redacted per PR-E Export-Default-Redacted Rule.
- Export / download access is logged via PR-D hardened Audit Access Record per PR-E Export-Access-Logged-Via-PR-D Rule.
- **Audit export is NOT BI / Analytics** per PR-E Audit-Export-Not-Analytics Rule. Analytics module owns BI surface.
- Service identities can create audit exports only with Service Identity Evidence Exporter profile explicitly granted; default NO.

### Service identity audit authority (locked decisions)

- `service_identity.audit_search` for service-driven Evidence Search Sessions.
- `service_identity.audit_export` for service-driven Audit Report Export Records.
- `service_identity.audit_access_record` for service identities that create PR-D hardened Audit Access Records.
- `service_identity.evidence_emit` for source-module service identities that emit Evidence Records.
- Service identities are scoped, expiring / rotatable, and logged like human access.
- No broad tenant-wide default.
- Service identity capability profiles must be explicit (one of the two documented composites or a per-identity capability list).
- All service identity access is logged via PR-D hardened Audit Access Record per PR-D Service-Identity-Access-Logged Rule.

### Capability revocation - active session / saved search authority recheck

Per PR-E OQ-SR-1 locked guidance: Saved Search implementation MUST re-evaluate authority at execution time, NOT at definition time. This PR extends that discipline:

- Capability revocation events propagate through existing Tenant capability-change event surfaces.
- Active sessions and saved searches re-evaluate authority at next access via `check_access`.
- Implementations MAY proactively invalidate stale sessions / saved searches on revocation; not required by this PR.
- Concrete propagation latency is an open implementation question.

### Lifecycle blocking discipline

- Active actor + active target: normal evaluation.
- Suspended actor: cannot exercise audit capabilities.
- Suspended target: actor's audit access to target evidence is blocked unless CIXCI System Admin override applies (override logged).
- Pending Setup actor: cannot exercise audit capabilities.
- Inactive actor: cannot exercise audit capabilities.
- Inactive target: actor MAY access historical evidence per existing baseline lifecycle blocking rules; specific audit access policies inherit from baseline.

### Authority decision handoff to Logs & Audit

The architectural shape of the handoff:

1. Tenant `check_access` returns `decision` + `reason_code` + `matched_authority_evidence_reference` + optional `decision_effective_until` + optional `prior_approval_reference`.
2. Logs & Audit (PR-D Workflow 8) maps the response to PR-D hardened Audit Access Record fields:
   - `decision = allow` -> `access_result = granted`; `view_type` per request; populates all PR-D evaluated fields.
   - `decision = deny` -> `access_result = denied`; `denial_reason = reason_code`.
   - `decision = review` -> `access_result = attempted` (non-terminal); upon subsequent approval / denial, additional Audit Access Records record terminal outcome.
3. Logs & Audit creates the hardened Audit Access Record. Tenant does NOT create Audit Access Records.

### Boundary discipline reaffirmation

- Tenant Company decides authority.
- Logs & Audit records outcome.
- Tenant does NOT mutate Logs & Audit records.
- Logs & Audit does NOT become permission authority.
- Source modules own operational records and business decisions.
- Analytics owns BI / reporting.
- Notification owns delivery.
- Integration owns transport.
- Tenant owns service / API identity authority.
- CPA / legal / DevOps own concrete retention duration values (per PR-D).
- Compliance / legal own legal hold authority decisions.

### What this specification intentionally does NOT prescribe

- Concrete `check_access` HTTP route, request / response payload schema, pagination cursor format. Future API Governance Foundation PR.
- Concrete capability registry persistence schema, propagation latency, query indexing. Implementation.
- Concrete role bundle assignment UI / approval queue UI / break-glass approval UI / legal hold authority assignment UI / service identity capability screen / denied access messaging UI / parent / child scope visibility UI / capability audit history UI. Future UX / UI.
- Concrete notification routing for audit-coordination events. Future Notification Platform coordination.
- Concrete retention duration values. CPA / legal / DevOps (per PR-D).
- AI Agent Services / Warranty Registration audit capabilities. Future PR when modules exist.
- Per-tenant override policy for self-approval, buyer / vendor raw view, break-glass duration, tenant-scoped legal hold authority. Open business decisions; documented defaults.
- New entities beyond the documented composites and registry extensions.
- New events beyond the documented discriminator extensions on the 6 existing Tenant event surfaces.
- New workflows beyond the 13 introduced.
- Rename, removal, or rewrite of any existing Tenant Company baseline or Logs & Audit PR-A through PR-E content.
