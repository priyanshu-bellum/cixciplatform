# Tenant Scope Authority And Configuration Evidence

This document is the normative Tenant Company sub-contract for scope, access, authority, relationship, channel, Product Type, import/export, pricing-mode configuration, commission configuration input, PO authority, report/invoice access, notification recipient scope, API/integration user authority, AI action authority, activation evidence, and capability evidence.

This is proposal-level architecture. It does not finalize business rules, approval thresholds, commercial outcomes, legal licensing behavior, identity provider implementation, integration transport, audit storage, or downstream module mutation behavior.

## Ownership Boundary

Tenant Company owns company, parent company, child entity, standalone company, user, role, permission, scope, eligibility, relationship, access, configuration authority, channel eligibility, Product Type enablement, invitation-only onboarding, activation evidence, child onboarding request lifecycle/state spine, capability flag naming/lifecycle, and authority evidence.

Tenant Company does not own product records, device records, pricing calculations, pricing snapshots, invoice records, routing decisions, fulfillment execution, procurement lifecycle, notification delivery, analytics metrics, integration transport, media processing, launch readiness coordination, AI recommendations, accounting ledger, payment, or audit evidence ownership.

Other modules consume Tenant Company evidence instead of inferring eligibility, visibility, access, permissions, channel, role, cascade behavior, or redaction independently.

## Common Authority Evidence Controls

Every Tenant authority, configuration, scope, relationship, projection, activation, capability, child onboarding request, and access/redaction record consumed by downstream modules must carry enough evidence controls to prevent stale, superseded, ignored, expired, or conflicting authority from being treated as current.

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

Common Authority Evidence Controls are required for Tenant Scope Evidence / Access Projection, activation_evidence_ref, child_onboarding_request state evidence, capability assignment evidence, Buyer / Vendor Relationship Evidence, Role / Permission Scope Projection, Import / Export Authority Scope, Buyer Pricing Mode Configuration Scope, Commission Configuration Input Scope, Channel Eligibility Scope, Product Type Enablement Scope, PO Functionality / Approval Authority Scope, Report / Invoice Access Scope and Redaction, Notification Recipient Scope, Integration / API User Scope, AI Action Authority Scope, parent/child override records, and access/redaction decision records.

Missing, stale, expired, superseded, ignored, or conflicting authority evidence must block or route downstream action to review.

## `activation_evidence_ref` Hybrid Shape

`activation_evidence_ref` is a hybrid reference structure for final activation evidence. It avoids hard-coding operational checklist details while preserving enough evidence to prove activation readiness.

Proposal-level fields/concepts:

- activation evidence reference id
- company reference
- checklist_version_id / onboarding checklist policy reference
- external_evidence_ref for operational checklist or external supporting evidence
- setup flag snapshot reference
- integrity_marker
- `integrity_marker_not_supported` sentinel where the external system cannot provide an integrity marker
- activation decision state
- reviewer/actor reference
- source version/hash
- source timestamp
- freshness timestamp
- supersession reference
- review-required state
- audit reference

Activation evidence is required before final activation. Missing, stale, incomplete, conflicting, or unsupported evidence blocks activation or routes to review. Setup flags remain provisional where intended.

## Tenant Scope Evidence / Access Projection

Represents generated, versioned, dispositioned evidence downstream modules can reference instead of relying on bare company/entity/user identifiers.

Tenant Scope Evidence / Access Projection should be generated, recalculated, or superseded from underlying Tenant-owned source records. Normal client/admin commands should mutate the appropriate Tenant-owned source record, then produce a new evidence/projection version.

Source records include company/entity records, parent/child overrides, buyer/vendor relationship evidence, role/permission projections, channel/Product Type/PO/pricing/commission/import-export/report/notification/API/AI authority records, capability assignments, activation evidence, child onboarding request outcomes, access decisions, and redaction decisions.

Direct repair/recompute flows for Tenant Scope Evidence must be explicitly controlled, versioned, audited, and restricted to authorized System Admin or platform maintenance flows. Downstream modules should never author Tenant evidence projections. Projection supersession must preserve historical evidence used by invoices, exports, analytics, notifications, integrations, AI action decisions, pricing snapshots, catalog visibility, and procurement approvals.

## Child Onboarding Request Evidence

`child_onboarding_request` evidence carries the CIXCI-owned lifecycle/state spine for parent-requested child onboarding. Substantive request content remains in external operational tooling through `external_evidence_ref`.

Required evidence includes request id, parent company reference, requester actor reference, `parent_management.request_child_onboarding` authority reference, `check_access` decision reference, request status, external_evidence_ref, decision actor where applicable, created child Company reference where approved, bootstrap invitation reference where approved, approval atomicity/correlation reference, source version/hash, supersession reference, and audit reference.

Approval creates a child Company in Pending Setup, not Active, and does not assign default capabilities.

## Capability Evidence

Capability assignment evidence must reference `capability-flag-registry.md` and the canonical `company.capability_changed` event surface. Consumers must still use `check_access` for authoritative allow/deny/review decisions.

## Other Authority Records

The following direct authority/configuration records retain the Common Authority Evidence Controls defined above: Buyer / Vendor Relationship Evidence, Role / Permission Scope Projection, Import / Export Authority Scope, Buyer Pricing Mode Configuration Scope, Commission Configuration Input Scope, Channel Eligibility Scope, Product Type Enablement Scope, PO Functionality / Approval Authority Scope, Report / Invoice Access Scope and Redaction, Notification Recipient Scope, Integration / API User Scope, and AI Action Authority Scope.

Tenant Company owns evidence and authority placement. Source modules own final business validation, mutation, calculations, delivery, records, and execution.

## Event Naming Convention

Tenant Company uses the event inventory defined in `events.md` and payload contracts in `event-contracts.md`. Missing event-family gaps should be flagged in `assumptions-open-questions.md`, not invented in downstream specs.

## Logs & Audit Access Authority Scope Configuration

This section documents scope configuration extensions for Logs & Audit access authority. All existing Tenant scope evidence patterns are preserved without modification.

### Parent / Child Audit Scope Evidence

Parent-to-child audit evidence access requires explicit Parent / Child Audit Scope Evidence (an extension of existing Tenant parent / child scope discipline applied to audit context):

- `parent_child_audit_scope_evidence_identifier`.
- `parent_company_reference`.
- `child_company_reference`.
- `audit_capabilities_in_scope` (subset of the 34 audit capabilities the parent may exercise over child evidence; minimum default subset documented per tenant policy; not platform-locked).
- `effective_date_range`.
- `granted_by_reference` (CIXCI System Admin or compliance role granting the scope).
- `reason_reference` (REQUIRED for parent-to-child audit scope grants).
- `audit_record_reference` (PR-A).

**Locked rules:**

- Cross-tenant access denied by default.
- Parent to child audit evidence requires explicit Parent / Child Audit Scope Evidence + capability. Holding `audit_evidence.search` alone is insufficient.
- Child to parent denied by default. CIXCI System Admin override only.
- Child to sibling denied by default. CIXCI System Admin override only.
- Suspended parent loses effective parent-management / audit authority unless CIXCI System Admin override applies.
- Pending Setup and inactive companies have restricted audit access.

### CIXCI System Admin Override Evidence

CIXCI System Admin overrides (for cross-tenant, suspended-target, child-to-parent, child-to-sibling scenarios) create explicit override evidence records:

- `override_identifier`.
- `override_actor_reference` (the CIXCI System Admin).
- `override_target_company_scope_reference`.
- `override_action_identifier` (the specific action being authorized).
- `override_reason_reference` (REQUIRED).
- `override_effective_until` (REQUIRED time-bound window).
- `audit_record_reference` (PR-A).

Each override produces a PR-D hardened Audit Access Record with `access_class_evaluated = system_admin_only` per PR-D access governance. Override is logged via existing `tenant.exception-admin-exception-changed` event with `exception_kind = cixci_system_admin_override` discriminator extension (see `events.md` and `event-contracts.md`).

### Raw Access Approval Evidence

Raw access approval evidence records the approval lifecycle for `audit_evidence.request_raw` requests:

- `raw_access_approval_identifier`.
- `requester_actor_reference`.
- `approver_actor_reference` (REQUIRED separate from requester wherever feasible; separation-of-duties default).
- `access_reason_reference` (REQUIRED).
- `target_evidence_reference` (the Evidence Record under approval).
- `approval_decision` (`approved` / `denied`).
- `decision_effective_until` (REQUIRED for `approved`; time-bound grant; concrete default duration is open business decision; tenant policy controls).
- `audit_record_reference` (PR-A).

Each approval / denial is logged via existing `tenant.exception-admin-exception-changed` event with `exception_kind = raw_access_approval` or `raw_access_denial` discriminator extension. The downstream `view_raw` access within the granted window is logged via PR-D hardened Audit Access Record with `view_type = raw` per PR-D Workflow 9.

### Break-Glass Grant Evidence

Break-glass grant evidence records the break-glass request / approval / expiry / revocation lifecycle:

- `break_glass_grant_identifier`.
- `requester_actor_reference`.
- `approver_actor_reference` (REQUIRED separate from requester wherever feasible).
- `access_reason_reference` (REQUIRED).
- `target_evidence_reference` OR `target_scope_reference`.
- `grant_decision` (`granted` / `denied` / `revoked` / `expired`).
- `grant_effective_until` (REQUIRED for `granted`; **time-bound; exact duration is configurable / business-policy controlled; "1 hour" may be suggested as configurable guidance only, NOT locked policy**).
- `post_hoc_review_status` (`pending` / `reviewed_approved` / `reviewed_with_findings`).
- `audit_record_reference` (PR-A).

Each grant / denial / revocation / expiry is logged via existing `tenant.exception-admin-exception-changed` event with `exception_kind = break_glass_grant` / `break_glass_revocation` / `break_glass_expiry` discriminator extension. Each downstream break-glass evidence access is logged via PR-D hardened Audit Access Record with `break_glass_flag = true`.

### Legal Hold Authority Grant Evidence

Legal Hold Authority Grant evidence records the grant lifecycle for Legal Hold capabilities:

- `legal_hold_authority_grant_identifier`.
- `grantee_actor_reference`.
- `legal_hold_capabilities_in_scope` (subset of `legal_hold.apply` / `release` / `view` / `view_scope`).
- `audience_scope` (default `cixci_compliance_only`; `tenant_scoped` is an open business decision; default NO).
- `granted_by_reference`.
- `effective_date_range`.
- `audit_record_reference` (PR-A).

Each grant / revocation is logged via existing `tenant.exception-admin-exception-changed` event with `exception_kind = legal_hold_authority_grant` / `legal_hold_authority_revocation` discriminator extension. Legal hold actions themselves (`apply` / `release`) continue to use PR-D events (`audit.legal-hold.applied`, `audit.legal-hold.released`); this PR does NOT modify Logs & Audit events.

### Audit Export Approval Evidence

Audit export approval evidence records per-item raw export approvals:

- `audit_export_approval_identifier`.
- `export_id_reference` (PR-E Audit Report Export Record reference).
- `evidence_item_references` (raw items requiring per-item approval).
- `approver_actor_reference` (REQUIRED separate from `audit_export.create` actor wherever feasible).
- `approval_decision` (`approved` / `denied`).
- `audit_record_reference` (PR-A).

Audit export creation / download / approval / denial activity is captured via:

- Tenant: existing `tenant.exception-admin-exception-changed` for approval / denial activity with `exception_kind = audit_export_approval_*` (extensible).
- Logs & Audit: PR-E `audit.evidence-export.recorded` event for the Audit Report Export Record itself; PR-D `audit.evidence-access.recorded` for downloads.

### Service Identity Audit Capability Evidence

Service identity audit capability evidence records the grant lifecycle for service identity audit capabilities:

- `service_identity_reference`.
- `service_identity_profile_kind` (one of 2 documented profile values OR `custom_per_identity`).
- `granted_audit_capabilities` (list of audit capabilities held by this service identity).
- `registered_scope_reference` (REQUIRED; no broad tenant-wide default).
- `expiration_reference` (REQUIRED).
- `rotation_history_reference` (existing baseline rotation tracking).
- `audit_record_reference` (PR-A).

Each grant / rotation / revocation is logged via existing `tenant.api-integration-user-authority-updated` event with `service_identity_capability_profile` discriminator extension.

### Audit Authority Decision Sub-Projection

The existing Tenant Scope Evidence / Access Projection is extended with an Audit Authority Decision sub-projection for `check_access` audit-flow outputs (see `data-model.md` for the full field set). The sub-projection enables Tenant to record its own authority decisions for re-traceability without writing to Logs & Audit:

- Tenant records the decision in this sub-projection.
- Logs & Audit records the OUTCOME (granted / denied / attempted) in the PR-D hardened Audit Access Record.
- The two are correlated via `correlation_reference` and `audit_record_reference`.
- This avoids dual-write conflicts and preserves Tenant decides / Logs records boundary.

### Capability Revocation Active Session / Saved Search Recheck

Per PR-E OQ-SR-1 locked guidance, the discipline extends to all audit capabilities:

- Capability revocation events propagate through existing `company.capability_changed` and `tenant.access-role-assignment-changed` event surfaces (with discriminator extensions documented in `events.md`).
- Active sessions and saved searches re-evaluate authority at next access via `check_access`.
- Implementations MAY proactively invalidate stale sessions / saved searches on revocation; this PR documents that path as implementation-level.
- Concrete propagation latency is an open implementation question.

### Lifecycle-Aware Audit Access Blocking Configuration

The existing Tenant lifecycle blocking discipline is extended with audit-access-specific behavior:

- Active actor + active target: normal evaluation.
- Suspended actor: cannot exercise audit capabilities.
- Suspended target: actor's audit access blocked unless CIXCI System Admin override.
- Pending Setup actor: cannot exercise audit capabilities.
- Inactive actor: cannot exercise audit capabilities.
- Inactive target: actor MAY access historical evidence per existing baseline rules.

This configuration is referenced by Workflow 11 (Suspended / Pending / Inactive Company Access Blocking) in `workflows.md`.

### Scope configuration boundary discipline

- All scope configuration extensions are to existing Tenant baseline structures.
- No new top-level scope projections introduced.
- All audit-capability-bearing evidence records reference existing PR-A Audit Record envelope.
- All Tenant scope decisions are recorded for re-traceability; Logs & Audit records outcomes; both are correlated via existing reference patterns.
- `legal_hold.override_retention_purge` configuration is REJECTED and NOT introduced (no override capability is permitted).
- Concrete persistence / projection-materialization mechanics are implementation-level.
