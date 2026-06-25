# Tenant Company Data Model

This document is proposal-level architecture. `scope-authority-configuration-evidence.md` is the normative Tenant Company sub-contract for detailed Tenant Scope Evidence, access projection, authority, eligibility, configuration input, redaction, and common authority evidence controls. `company-subtype-taxonomy-management.md` is the normative Tenant Company sub-contract for controlled company type/subtype taxonomy, subtype configuration evidence, subtype assignment, downstream impact preview, and activation readiness behavior. `capability-flag-registry.md` is the canonical naming/lifecycle source for capability flags.

Tenant Company owns company/entity hierarchy, tenant-scoped user assignments, roles, permission boundaries, invitation-only onboarding state, activation state, relationship eligibility, Product Type enablement scope, channel eligibility, controlled company subtype/taxonomy authority, licensed-property relationship scope placeholders, readiness signals, hierarchy scope, parent/child scope, child override scope, capability flag references, and Tenant-owned authority evidence.

Tenant Company does not own Product Catalog product records, Device Catalog records, Pricing calculations/snapshots, Invoice records, Order Routing decisions, Fulfillment/Returns execution, Procurement lifecycle, Notification delivery, Analytics metrics, Integration transport, Media processing, Launch/Event coordination, Logs & Audit immutable evidence, AI recommendations, Warranty, Accounting ledger, or Payment behavior.

## Entities

### Company And Hierarchy

- Parent Company
- Child Entity
- Standalone Company
- Company Entity
- Parent-Linking Reference
- Historical Standalone Scope Reference
- Child Override Evidence
- Child Operational Configuration
- Child Contact
- `child_onboarding_request`

### Company Type And Subtype Taxonomy

- Company Type Taxonomy Record
- Company Subtype Taxonomy Record
- Company Subtype Configuration Evidence
- Company Subtype Assignment Record
- Company Subtype Downstream Impact Preview

### User / Role / Permission

- User
- Role
- Permission Set
- Role / Permission Scope Projection
- Tenant Scope Evidence / Access Projection
- Access Decision Reference
- Redaction Decision Reference
- Act-On-Behalf Authority Reference
- Capability Assignment Reference

### Onboarding / Readiness / External References

- Onboarding Record
- Activation State
- `activation_evidence_ref`
- Readiness State
- Purchase Order Dependency
- Admin Exception
- LOA Record
- Agreement Record
- QuickBooks Sync Reference
- Brand Voice Profile
- AI Agent Preference

## Company Entity

Company creation is invitation-only and CIXCI-controlled. New Company records created through System Admin creation or approved `child_onboarding_request` enter Pending Setup, not Active, and receive no default capabilities.

Proposal-level fields/concepts:

- company id
- parent company id, where applicable
- child company id / child entity reference, where applicable
- standalone company reference, where applicable
- lifecycle state: Pending Setup, Active, Suspended, Archived
- company type taxonomy reference
- company subtype taxonomy reference
- subtype label, informational/display only
- subtype configuration evidence reference
- activation_evidence_ref
- originating_child_onboarding_request_id, where applicable
- capability assignment references
- tenant scope evidence reference
- source version/hash
- supersession reference
- audit reference

Subtype labels are examples/classification values only. Behavior must not be hard-coded from subtype names. Downstream modules consume subtype configuration evidence and Tenant Scope Evidence.

## `activation_evidence_ref`

`activation_evidence_ref` is the hybrid activation evidence record used before final CIXCI-controlled activation.

Proposal-level fields/concepts:

- activation evidence reference id
- company reference
- onboarding checklist policy reference
- operational checklist external reference, where applicable
- setup flag snapshot reference
- activation integrity marker
- actor/reviewer reference
- activation decision
- source version/hash
- freshness timestamp
- supersession reference
- audit reference

Operational checklist details are not hard-coded into this data model. Setup flags remain provisional where intended. Missing, stale, conflicting, or incomplete activation evidence blocks final activation or routes to review.

## `child_onboarding_request`

`child_onboarding_request` is the CIXCI-owned lifecycle/state spine for parent-requested child onboarding.

Proposal-level fields/concepts:

- child onboarding request id
- parent company reference
- requester actor reference
- requester role/scope projection reference
- required capability: `parent_management.request_child_onboarding`
- `check_access` decision reference
- request status: Submitted, Approved, Rejected, Withdrawn, Expired, Review/Failure
- external_evidence_ref
- proposed child company reference, where applicable
- created child company reference, for approved requests
- bootstrap invitation reference, for approved requests
- approval atomicity/correlation reference
- decision actor reference
- decision timestamp
- expiration timestamp
- source version/hash
- supersession reference
- audit reference

Approval creates the child Company in Pending Setup, not Active. It does not grant default capabilities. The child still requires bootstrap invitation acceptance, setup completion, `activation_evidence_ref`, and final activation.

## Parent / Child Lifecycle Integrity

Parent suspension does not auto-suspend children, and parent restoration does not auto-restore children. Child lifecycle remains independent for suspension/restoration at v1.

Parent archival requires child-first validation. Parent Company cannot be archived unless all direct children are already Archived. No automatic child archival cascade exists at v1. Re-parenting / child migration and deeper nesting are future ADR-driven extensions.

## Common Authority Evidence Controls

Every Tenant authority, configuration, scope, relationship, projection, parent/child override, subtype taxonomy/configuration/assignment, capability assignment, onboarding request, activation evidence, and access/redaction record consumed by downstream modules must include Common Authority Evidence Controls.

Common fields/concepts:

- authority evidence id or record id
- source module = Tenant Company
- source record version/hash
- source timestamp
- freshness timestamp
- expiration timestamp
- effective date
- end date / expiration date
- source disposition
- applied vs ignored state
- inherited vs overridden state
- parent/child override source
- supersession reference
- review-required state
- access decision reference where applicable
- redaction decision reference where applicable
- approval/override reference where applicable
- audit reference

Missing, stale, expired, superseded, ignored, or conflicting direct authority evidence should block or route downstream action to review.

## Tenant Scope Evidence / Access Projection

Tenant Scope Evidence / Access Projection is generated, versioned evidence downstream modules should reference instead of bare ids. Source records include company/entity, parent/child overrides, buyer/vendor relationship evidence, controlled subtype taxonomy/configuration/assignment records, role/permission projections, channel/Product Type/PO/pricing/commission/import-export/report/notification/API/AI authority records, capability assignments, activation evidence, child onboarding request outcomes, access decisions, and redaction decisions.

Projection supersession must preserve historical evidence used by invoices, orders, exports, reports, analytics, notifications, integrations, AI action decisions, pricing snapshots, catalog visibility, and procurement approvals.

## Controlled Company Type / Subtype Taxonomy

Company setup must use active controlled taxonomy values, not free-text company type fields. Legacy labels such as MVNO, Wireless Carrier, Retailer, Reseller, Device Distributor, Device Manufacturer, or other market labels are examples only. Behavior must not be hard-coded from subtype names.

First-class records:

- Company Type Taxonomy Record
- Company Subtype Taxonomy Record
- Company Subtype Configuration Evidence
- Company Subtype Assignment Record
- Company Subtype Downstream Impact Preview

A subtype cannot become assignable until activation readiness validation passes or an authorized controlled override is applied. Controlled overrides must be permissioned, versioned, auditable, and reviewable.

## Relationship And Authority Records

Tenant Company owns and versions the following evidence records, all with Common Authority Evidence Controls:

- Buyer / Vendor Relationship Evidence
- Role / Permission Scope Projection
- Import / Export Authority Scope
- Buyer Pricing Mode Configuration Scope
- Commission Configuration Input Scope
- Channel Eligibility Scope
- Product Type Enablement Scope
- PO Functionality / Approval Authority Scope
- Report / Invoice Access Scope And Redaction
- Notification Recipient Scope
- Integration And API User Scope
- AI Action Authority Scope

Tenant Company owns source placement, scope, authority, and configuration evidence. Source modules own their own business validation, final mutation behavior, delivery, calculations, lifecycle, records, and execution.

## Field-Level Ownership

Tenant Company owns Tenant source records and authority evidence. Product Catalog owns product records and visibility projections. Pricing owns calculation and snapshots. Procurement owns PO lifecycle. Invoice owns invoice lifecycle. Notification owns delivery. Integration owns external delivery/receipt. Analytics owns read models. Logs & Audit owns immutable evidence. AI Agent Services owns recommendations, drafts, and orchestration.

## Logs & Audit Access Authority Data Model

This section documents the data model extensions required to support Logs & Audit File Tracking PR-A through PR-E. All existing Tenant baseline entities, projections, and references are preserved without modification. All Logs & Audit PR-A through PR-E entities are referenced only; this section does NOT modify any Logs & Audit entity.

### Scope discipline

- No new top-level Tenant entities introduced.
- Extensions are made to existing Tenant baseline structures: capability registry, Role / Permission Scope Projection, Tenant Scope Evidence / Access Projection, service / API identity records, and existing authority evidence patterns.
- Documented composites (role bundles and service identity profiles) are recorded in `permissions.md`; this section documents their data-model placement.
- All extensions are reference-first per existing Tenant + PR-A discipline.

### Audit Capability Family Registry extension

The existing Tenant capability registry (`capability-flag-registry.md`) is extended with exactly 34 new audit-specific capability entries organized into 8 capability families. Each entry carries the existing registry envelope plus the following audit-coordination context:

- `capability_identifier` (existing registry field).
- `capability_family` (one of 8 values; see below).
- `capability_kind` (one of: `requester`, `approver`, `viewer`, `actor`, `service_identity`).
- `documented_role_bundle_membership` (zero or more references to role bundles that include this capability in their documented composition).
- `requires_separation_of_duties` (boolean; true for capabilities where separation of duties is preferred / default).
- `requires_reason_reference` (boolean; true for capabilities that require `access_reason_reference` per PR-D Raw-Evidence-Access-Exceptional Rule and PR-E Sensitive-Search-Logged Rule).
- `requires_time_bound_grant` (boolean; true for `audit_evidence.view_raw` and break-glass dynamic grants).
- Existing registry envelope: `effective_date_range`, `lifecycle_status`, `audit_record_reference`.

#### `capability_family` enumeration (8 values)

| Value | Capabilities |
|---|---|
| `audit_search` | 5 capabilities (Family 1) |
| `audit_view_retrieval` | 4 capabilities (Family 2) |
| `audit_review` | 6 capabilities (Family 3) |
| `audit_export` | 5 capabilities (Family 4) |
| `legal_hold` | 4 capabilities (Family 5) |
| `governance` | 5 capabilities (Family 6) |
| `service_identity_audit` | 4 capabilities (Family 7) |
| `audit_break_glass` | 1 capability (Family 8) |

#### `capability_kind` enumeration (5 values)

| Value | Meaning |
|---|---|
| `requester` | Holder may initiate a request (e.g., `audit_evidence.request_raw`, `audit_evidence.break_glass`). |
| `approver` | Holder may approve a request (e.g., `audit_evidence.approve_raw`, `audit_export.approve_raw_export`). |
| `viewer` | Holder may view (e.g., `audit_evidence.view_redacted`, `legal_hold.view`). |
| `actor` | Holder may perform a direct action (e.g., `legal_hold.apply`, `audit_review.create_session`). |
| `service_identity` | Service-identity capability (`service_identity.*` family). |

### Audit Role Bundle composite reference structure

Role bundles are documented composites in `permissions.md`. The data-model representation is:

- `role_bundle_identifier` (canonical name; one of 9 documented bundles).
- `role_bundle_composition` (list of capability references that the bundle grants).
- `role_bundle_kind` (one of 9 values; see below).
- `documented_only_marker` (always `true`; locks that role bundles are documented composites only, NOT evaluated by `check_access`).
- `separation_of_duties_marker` (per-bundle marker for separation discipline; e.g., Raw Evidence Access Authorizer carries `separation_of_duties_from_requester_preferred = true`).
- `self_approval_default` (per-bundle marker; e.g., System Admin Evidence Supervisor carries `self_approval_default = no_self_approval_implied`).
- Existing Tenant authority evidence envelope: `effective_date_range`, `lifecycle_status`, `audit_record_reference`.

#### `role_bundle_kind` enumeration (9 values)

| Value | Bundle |
|---|---|
| `compliance_audit_reviewer` | Compliance / Audit Reviewer |
| `raw_evidence_access_authorizer` | Raw Evidence Access Authorizer |
| `legal_hold_authority` | Legal Hold Authority |
| `break_glass_approver` | Break-Glass Approver |
| `reviewer_investigator` | Reviewer / Investigator |
| `audit_export_reviewer` | Audit Export Reviewer |
| `evidence_search_user` | Evidence Search User |
| `evidence_review_manager` | Evidence Review Manager |
| `system_admin_evidence_supervisor` | System Admin Evidence Supervisor (does NOT imply self-approval automatically) |

### Service Identity Audit Capability Profile composite reference structure

Service identity profiles are documented composites in `permissions.md`. The data-model representation is:

- `service_identity_profile_identifier` (canonical name; one of 2 documented profiles).
- `service_identity_profile_composition` (list of capability references that the profile grants).
- `service_identity_profile_kind` (one of 2 values).
- `documented_only_marker` (always `true`).
- `scoped_required_marker` (always `true`; service identities REQUIRE registered scope).
- `expiring_rotatable_marker` (always `true`; service identity credentials expire / rotate).
- Existing Tenant API integration user authority envelope.

#### `service_identity_profile_kind` enumeration (2 values)

| Value | Profile |
|---|---|
| `service_identity_evidence_reader` | Service Identity Evidence Reader |
| `service_identity_evidence_exporter` | Service Identity Evidence Exporter |

### Authority Decision sub-projection (extension of Tenant Scope Evidence / Access Projection)

The existing Tenant Scope Evidence / Access Projection is extended with an Audit Authority Decision sub-projection for `check_access` audit-flow:

- `authority_decision_identifier`.
- `actor_reference` OR `service_trigger_reference` (one populated per PR-A discipline).
- `requested_action_identifier` (e.g., `evidence.view_redacted`, `evidence.view_raw`, `export.create`, `legal_hold.apply`).
- `target_company_scope_reference` (PR-A field; the target evidence's tenant scope).
- Sensitivity inputs (REFERENCED, NOT copied):
  - `evidence_access_class_reference` (PR-A field; one of 6 access_class values).
  - `evidence_redaction_class_reference` (PR-A field; one of 9 redaction class values including preserved `public_metadata_placeholder`).
  - `evidence_restricted_evidence_reference` (PR-A boolean).
  - `evidence_legal_hold_state_reference` (current PR-D Legal Hold scope-match result).
  - `evidence_retention_disposition_state_reference` (current PR-D Retention Disposition state).
  - `requested_view_type` (one of PR-D 2 values: `raw` / `redacted`).
  - `requested_redaction_audience` (one of `buyer` / `vendor` / `internal` / `audit_only`; export adds `compliance_only`).
- `access_reason_reference` (REQUIRED when `requested_view_type = raw` per PR-D Raw-Evidence-Access-Exceptional Rule; REQUIRED for break-glass; REQUIRED for sensitive search per PR-E Sensitive-Search-Logged Rule).
- `break_glass_requested` (boolean).
- `prior_approval_reference` (when prior approval exists; e.g., for view_raw within a granted window).
- `decision` (one of `allow` / `deny` / `review`).
- `reason_code` (structured enumeration; see below).
- `matched_authority_evidence_reference` (reference(s) to the authority evidence record(s) that justified the decision).
- `decision_effective_until` (nullable; for time-bound grants).
- `correlation_reference`, `trace_reference`, `idempotency_key` (PR-A envelope).
- `audit_record_reference` (PR-A; parent Audit Record for this Tenant authority decision).

#### `decision` enumeration (3 values)

| Value | Meaning |
|---|---|
| `allow` | Tenant grants the requested action. Logs & Audit records `access_result = granted`. |
| `deny` | Tenant denies the requested action. Logs & Audit records `access_result = denied` with `denial_reason` populated from `reason_code`. |
| `review` | Tenant defers to approval workflow. Logs & Audit records `access_result = attempted` (non-terminal per PR-D access_result terminality discipline) until approval / denial creates the terminal record. |

#### `reason_code` enumeration (extensible; minimum set)

| Value | Meaning |
|---|---|
| `capability_missing` | Actor / service identity lacks required capability. |
| `scope_mismatch` | Target scope not covered by actor's Role / Permission Scope Projection. |
| `lifecycle_blocked` | Actor or target in non-active lifecycle state. |
| `parent_child_unauthorized` | Parent-child audit scope evidence + capability missing. |
| `service_identity_out_of_scope` | Service identity attempting action outside registered scope. |
| `capability_expired` | Capability assignment effective date range expired. |
| `suspended_actor` | Actor's company suspended. |
| `suspended_target` | Target's company suspended. |
| `approval_required` | Action requires prior approval; approval is being requested (returned with `decision = review`). |
| `approval_missing` | Action requires prior approval; none found. |
| `approval_expired` | Prior approval grant has expired (e.g., raw view grant elapsed). |
| `separation_of_duties_violation` | Actor matches requester / applier in a separation-of-duties-protected action. |
| `sensitivity_mismatch` | Sensitivity inputs not covered by actor's capability set. |
| `cross_tenant_denied` | Cross-tenant action denied by default. |
| `break_glass_required` | Action requires break-glass elevation. |
| `break_glass_grant_expired` | Break-glass grant time-bound window elapsed. |

This enumeration is extensible; future PRs may add `reason_code` values as authority surface expands.

### Parent / Child Audit Scope Evidence extension

The existing Tenant parent / child scope rules are extended with audit-coordination context:

- `parent_child_audit_scope_evidence_identifier`.
- `parent_company_reference`.
- `child_company_reference`.
- `audit_capabilities_in_scope` (subset of the 34 audit capabilities that the parent may exercise over child evidence; default minimum: search and view-redacted capabilities).
- `effective_date_range`.
- `granted_by_reference` (CIXCI System Admin or compliance role granting the scope).
- `reason_reference` (REQUIRED for parent-to-child audit scope grants).
- `audit_record_reference` (PR-A).

### Raw Access Approval evidence (extension of existing Tenant approval evidence pattern)

The existing Tenant authority evidence pattern is extended with raw-access approval context:

- `raw_access_approval_identifier`.
- `requester_actor_reference`.
- `approver_actor_reference` (REQUIRED separate from requester wherever feasible; separation-of-duties default).
- `access_reason_reference` (REQUIRED).
- `target_evidence_reference` (the evidence record under approval).
- `approval_decision` (one of `approved` / `denied`).
- `decision_effective_until` (REQUIRED for `approved`; time-bound grant; concrete default duration is open business decision).
- `audit_record_reference` (PR-A).

### Break-Glass Grant evidence (extension of existing Tenant exception-admin-exception pattern)

The existing `tenant.exception-admin-exception-changed` event surface carries break-glass grant context via discriminator extension (see `events.md` and `event-contracts.md`). The data-model extension is:

- `break_glass_grant_identifier`.
- `requester_actor_reference`.
- `approver_actor_reference` (REQUIRED separate from requester wherever feasible).
- `access_reason_reference` (REQUIRED).
- `target_evidence_reference` OR `target_scope_reference`.
- `grant_decision` (one of `granted` / `denied` / `revoked` / `expired`).
- `grant_effective_until` (REQUIRED for `granted`; **time-bound; exact duration is configurable / business-policy controlled; "1 hour" may be suggested as configurable guidance only, NOT locked policy**).
- `post_hoc_review_status` (one of `pending` / `reviewed_approved` / `reviewed_with_findings`).
- `audit_record_reference` (PR-A).

### Legal Hold Authority Grant evidence

The existing Tenant authority evidence pattern is extended with legal-hold-authority-grant context:

- `legal_hold_authority_grant_identifier`.
- `grantee_actor_reference`.
- `legal_hold_capabilities_in_scope` (subset of `legal_hold.apply` / `release` / `view` / `view_scope`).
- `audience_scope` (default `cixci_compliance_only`; `tenant_scoped` is an open business decision).
- `granted_by_reference`.
- `effective_date_range`.
- `audit_record_reference` (PR-A).

### Audit Export Approval evidence (for raw export items)

The existing Tenant authority evidence pattern is extended with audit-export-approval context:

- `audit_export_approval_identifier`.
- `export_id_reference` (PR-E Audit Report Export Record reference).
- `evidence_item_references` (raw items requiring per-item approval).
- `approver_actor_reference` (REQUIRED separate from `audit_export.create` actor wherever feasible).
- `approval_decision` (`approved` / `denied`).
- `audit_record_reference` (PR-A).

### Service Identity Audit Capability evidence

The existing Tenant API integration user authority pattern is extended with service-identity audit-capability context:

- `service_identity_reference`.
- `service_identity_profile_kind` (one of 2 documented profile values OR `custom_per_identity`).
- `granted_audit_capabilities` (list of audit capabilities held by this service identity).
- `registered_scope_reference` (REQUIRED; no broad tenant-wide default).
- `expiration_reference` (REQUIRED; service identity credentials expire).
- `rotation_history_reference` (existing baseline rotation tracking).
- `audit_record_reference` (PR-A).

### Lifecycle-blocking sub-projection extension

The existing Tenant lifecycle blocking discipline is extended with audit-access-specific behavior:

- For each lifecycle state combination of actor company x target company x actor capability family, `check_access` decision matrix entries documented.
- Suspended parent (audit) entries explicitly documented (lose audit authority over children unless CIXCI System Admin override).
- Pending Setup / inactive entries documented (restricted audit access).
- CIXCI System Admin override evidence record carries `override_reason_reference` (REQUIRED) and is logged via PR-D hardened Audit Access Record with `access_class_evaluated = system_admin_only`.

### What this data-model section intentionally does NOT introduce

- No new top-level Tenant entities. All extensions are to existing baseline structures.
- No new Logs & Audit entities. All Logs & Audit entities (PR-A Evidence Record, PR-B File Tracking Record, PR-D Legal Hold Record / Retention Disposition Record / Redaction Transformation Record / hardened Audit Access Record, PR-E Evidence Search Session / Evidence Review Session / Evidence Collection Record / Review Note / Annotation / Audit Report Export Record) are referenced only.
- No new policy matrices. PR-D's three matrices (Retention, Redaction, Access) plus the Evidence Governance Policy Matrix umbrella remain canonical.
- No new filterable fields beyond what existing PR-A / PR-B / PR-C / PR-D / PR-E + existing Tenant baseline already provide.
- No `legal_hold.override_retention_purge` capability entry.
- No per-evidence-type or per-family capabilities.
- No UI-specific capabilities.
- No AI Agent Services / Warranty Registration audit capabilities.
- No concrete persistence schema for the capability registry or projection extensions. Implementation owns concrete schema.
- No concrete propagation latency for capability changes. Implementation owns.
