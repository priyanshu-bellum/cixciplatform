# Tenant Company Workflows

This document describes proposal-level Tenant Company workflows. Detailed evidence fields and authority models are defined in `scope-authority-configuration-evidence.md`, `company-subtype-taxonomy-management.md`, and `capability-flag-registry.md`.

## Workflow Principles

- Tenant Company provides scope/authority evidence.
- Every Tenant authority/configuration/scope record consumed by downstream modules carries Common Authority Evidence Controls.
- Source modules consume Tenant evidence and own their own business validation, mutation behavior, records, and execution.
- Missing, stale, superseded, ignored, expired, or conflicting Tenant evidence should block or route dependent workflows to review.
- Tenant changes that affect downstream modules should preserve source version/hash, disposition, inherited-vs-overridden state, supersession references, and audit references.
- Tenant Company uses the event names defined in `events.md` and payload contracts in `event-contracts.md`.

## Invitation-Only Company Onboarding

Tenant/Company Foundation does not support open self-onboarding or unauthenticated company creation. Auth-provider account creation does not equal CIXCI platform access.

Two company creation paths exist:

1. CIXCI System Admin directly creates and approves the Company.
2. A parent Company Admin with effective `parent_management.request_child_onboarding` submits a `child_onboarding_request`; CIXCI System Admin approves the request and creates the child Company.

Both paths create the Company in Pending Setup with no default capabilities. Final activation remains CIXCI-controlled and requires activation evidence review.

## Activation Evidence Workflow

Activation uses a hybrid `activation_evidence_ref` structure rather than hard-coded operational checklist details in the spec.

Proposal-level activation evidence shape:

- activation evidence id/reference
- source module = Tenant Company
- onboarding checklist policy reference
- operational checklist external reference where applicable
- setup flag snapshot reference
- activation integrity marker
- actor/reviewer reference
- source version/hash
- freshness timestamp
- final activation decision
- supersession reference
- audit reference

Setup flags remain provisional where intended. Operational checklist details are policy/ops-owned and should not be hard-coded into the module spec. Final activation is blocked until required activation evidence is present, current, and reviewable.

## Child Onboarding Request Workflow

Parent companies request CIXCI to onboard a child company through `child_onboarding_request`.

1. Parent Company Admin submits request after `check_access` allows `parent_management.request_child_onboarding`.
2. CIXCI stores the request lifecycle/state spine and `external_evidence_ref`; substantive request content lives in external operational tooling.
3. Request enters Submitted.
4. CIXCI System Admin approves or rejects, the parent withdraws, or the request expires.
5. Approval creates the child Company in Pending Setup, issues a bootstrap invitation, and links the new child to the originating request.
6. The child still requires bootstrap invitation acceptance, setup completion, `activation_evidence_ref`, and final CIXCI activation.

Five v1 events are used: `child_onboarding_request.submitted`, `child_onboarding_request.approved`, `child_onboarding_request.rejected`, `child_onboarding_request.withdrawn`, and `child_onboarding_request.expired`. No `under_review` event exists at v1.

Approval failure must be observably atomic. If approval cannot complete child Company creation and bootstrap invitation issuance as a correlated outcome, the request remains in review/failure state with audit evidence instead of silently partially applying.

## Source Record Update To Projection Generation

1. Authorized actor updates a Tenant-owned source record, such as buyer/vendor relationship evidence, role/scope projection, import/export authority, pricing mode configuration, commission input, channel eligibility, Product Type enablement, PO authority, report/invoice access, notification recipient scope, API/integration authority, AI action authority, subtype assignment, or parent/child override evidence.
2. Tenant Company validates the source record and Common Authority Evidence Controls.
3. Tenant Company generates or supersedes affected Tenant Scope Evidence / Access Projection versions.
4. Tenant Company preserves historical projection versions used by invoices, orders, exports, reports, analytics, notifications, integrations, AI action decisions, pricing snapshots, catalog visibility, and procurement approvals.
5. Tenant Company emits the normalized evidence event for the source record and projection change.

Downstream modules should never author Tenant evidence projections.

## Restricted Projection Repair / Recompute Workflow

1. Authorized System Admin or platform maintenance actor requests projection recompute or repair.
2. Tenant Company validates repair authority, target projection, affected source records, recompute reason, source version/hash, and audit reference.
3. Tenant Company creates a new projection version or supersession record.
4. Tenant Company does not overwrite an evidence version already referenced by downstream records.
5. Tenant Company emits `tenant.scope-evidence-recomputed` or `tenant.scope-evidence-superseded`.

## Parent Suspension Workflow

Parent Company suspension does not auto-suspend children.

1. Authorized actor requests parent suspension.
2. Tenant Company validates authority and lifecycle transition rules.
3. Parent lifecycle changes to Suspended.
4. Direct children remain in their current lifecycle states.
5. No child `company.suspended` events are emitted as side effects.
6. Parent admin `parent_management.*` flags remain held but become ineffective through `check_access` while the parent is Suspended.

CIXCI System Admin authority remains available for explicit child actions and is recorded as cross-tenant override where applicable.

## Parent Restoration Workflow

Parent restoration does not restore children.

1. Authorized actor restores parent from Suspended to Active.
2. Parent admin `parent_management.*` effective authority is restored by `check_access` without re-grant.
3. Children independently Suspended remain Suspended.
4. No child `company.restored` events are emitted as side effects.

## Parent Archival Child-First Workflow

Parent archival is CIXCI System Admin-controlled and child-first.

1. CIXCI System Admin requests parent archival.
2. Tenant Company enumerates direct children.
3. If any direct child is Pending Setup, Active, or Suspended, validation rejects parent archival.
4. Rejection is audit-only and includes the parent reference, blocking direct child references and lifecycle states, rejection rationale, actor, and timestamp.
5. If all direct children are Archived, parent archival may proceed.

There is no automatic child archival cascade at v1. Parent admins cannot archive children through `parent_management.*`. Re-parenting/child migration and deeper nesting remain future ADR-driven extensions.

## Buyer / Vendor Relationship Evidence Workflow

Tenant Company creates or updates buyer/vendor relationship evidence with buyer company/entity, vendor company/entity, approval status, active/inactive/suspended/pending state, visibility scope, Product Type scope, channel scope, sales channel scope, and Common Authority Evidence Controls. Product Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Notification, Analytics, Integration Management, Procurement, and AI Agent Services consume this evidence and must not infer eligibility from prior activity alone.

## Authority Configuration Workflows

Tenant Company owns configuration authority workflows for import/export authority, buyer pricing mode placement, commission configuration input placement, channel eligibility, Product Type enablement, PO functionality/approval authority, report/invoice access/redaction, notification recipient scope, API/integration user authority, AI action authority, and controlled subtype assignment.

Pricing owns interpretation and calculation. Product Catalog owns product records and visibility projections. Procurement owns PO lifecycle. Notification owns delivery. Integration owns external transport. Analytics owns reporting read models. AI Agent Services owns recommendations/drafts/orchestration. Logs & Audit owns immutable evidence.

## Failure And Review Flows

Review-required states should preserve source references, source version/hash, blocking reason, applied-vs-ignored state, supersession reference, and audit reference for stale direct authority records, expired channel eligibility, superseded buyer pricing mode, ignored commission input, stale PO authority, expired notification recipient scope, superseded API/integration authority, expired AI action authority, stale Tenant scope evidence, conflicting parent/child override evidence, suspended buyer/vendor relationships, missing import/export authority, unauthorized destructive apply, disabled Product Type enablement, insufficient report/invoice access scope, child onboarding approval failure, activation evidence gaps, and parent archival validation rejection.

## Logs & Audit Access Authority Workflows

This section adds exactly **13 numbered workflows** for Logs & Audit access authority coordination. All existing Tenant Company baseline workflows (including `check_access` baseline) are preserved without modification.

### Workflow 1 - Audit Capability Registration / Lifecycle Workflow

**Purpose.** Registers new audit capabilities in the existing Tenant capability registry; tracks lifecycle (active / deprecated / superseded). All 34 audit capabilities introduced by this coordination are registered here.

**Steps (architectural):**

1. Receive capability registration / lifecycle change request (effective date range, lifecycle status).
2. Verify capability identifier uniqueness against existing registry.
3. Create / update registry entry (per `capability-flag-registry.md` shape).
4. Emit existing `company.capability_changed` event with `capability_family` discriminator extension covering one of: `audit_search`, `audit_view_retrieval`, `audit_review`, `audit_export`, `legal_hold`, `governance`, `service_identity_audit`, `audit_break_glass`.
5. Capability becomes evaluable by `check_access` per its effective date range and lifecycle status.

**Outputs:** Registry entry; existing `company.capability_changed` event (no new event).

**Boundary:** This workflow does NOT create or modify Logs & Audit records. Tenant decides; Logs records.

### Workflow 2 - Audit Capability Revocation Workflow

**Purpose.** Revokes an audit capability from an actor or service identity. Triggers Workflow 12 (Active Session / Saved Search Authority Recheck).

**Steps (architectural):**

1. Receive capability revocation request (capability identifier, actor / service identity reference, effective time).
2. Verify revocation authority (typically held by Tenant admin per existing baseline; CIXCI System Admin for override scenarios).
3. Update existing capability assignment effective date range.
4. Emit existing `company.capability_changed` event with `capability_family` discriminator extension.
5. Trigger Workflow 12 for active session / saved search re-evaluation at next access.

**Boundary:** Revocation is observable to Logs & Audit only via the next `check_access` call; Tenant does NOT directly invalidate Logs & Audit records.

### Workflow 3 - Audit Role Bundle Composition / Assignment Workflow

**Purpose.** Composes documented role bundles and assigns them to actors. Role bundles are documented composites only; assignment grants the bundle's capability set, which is then evaluated by `check_access` (NEVER the role label).

**Steps (architectural):**

1. Receive bundle composition definition OR bundle assignment request (one of 9 documented bundles).
2. For composition definition: verify bundle composition matches `permissions.md` documented composite; record bundle's capability set.
3. For assignment: verify assignment authority; create role assignment record (existing Tenant baseline).
4. Emit existing `tenant.access-role-assignment-changed` event with `role_bundle_kind` discriminator extension covering one of: `compliance_audit_reviewer`, `raw_evidence_access_authorizer`, `legal_hold_authority`, `break_glass_approver`, `reviewer_investigator`, `audit_export_reviewer`, `evidence_search_user`, `evidence_review_manager`, `system_admin_evidence_supervisor`.
5. Effective capability set is the union of directly-assigned capabilities and bundle-composition capabilities.

**Boundary:** Role bundle labels are documentation only; `check_access` evaluates effective capabilities, not labels. Redefining a bundle's composition propagates through this workflow.

### Workflow 4 - Evidence Access Authority Evaluation Workflow (via `check_access` audit-flow)

**Purpose.** Implements the Access Decision Model. Logs & Audit calls Tenant `check_access`; Tenant evaluates authority; Tenant returns decision; Logs & Audit records outcome.

**Steps (architectural):**

1. Receive `check_access` audit-flow request from Logs & Audit with: actor / service identity reference, requested action identifier, target `company_scope_reference`, sensitivity inputs (PR-A `access_class`, `redaction_class`, `restricted_evidence`, current PR-D Legal Hold scope-match result, current PR-D Retention Disposition state), `requested_view_type`, `requested_redaction_audience`, optional `access_reason_reference`, optional `break_glass_requested` boolean, optional `prior_approval_reference`, PR-A envelope.
2. Evaluate effective capability assignment for the requested action.
3. Evaluate scope projection coverage of `target_company_scope_reference`.
4. Evaluate lifecycle state (actor company status; target company status).
5. Evaluate parent / child relationship per Workflow 5.
6. Evaluate service identity scope (for service identities) per Workflow 10.
7. Evaluate effective dates.
8. Evaluate suspension / inactive state per Workflow 11.
9. Evaluate approval evidence per Workflow 6 (raw), Workflow 7 (break-glass), Workflow 8 (legal hold actions), Workflow 9 (audit export raw items).
10. Evaluate separation of duties (default: deny when actor matches the protected counterparty for `request_raw` / `approve_raw`, `apply` / `release`, `break_glass` / approver, `create` / `approve_raw_export`).
11. Evaluate sensitivity inputs (does actor's capability set cover the evidence's sensitivity).
12. Compute `decision` (`allow` / `deny` / `review`) + `reason_code` + `matched_authority_evidence_reference` + optional `decision_effective_until` + optional `prior_approval_reference`.
13. Record decision in Audit Authority Decision sub-projection.
14. Return decision to Logs & Audit per Workflow 13 handoff.

**Boundary:** Tenant decides authority. Logs & Audit records the outcome (PR-D Workflow 8 -> hardened Audit Access Record). `review` maps to `access_result = attempted` (non-terminal); terminal outcomes follow subsequent decisions.

### Workflow 5 - Parent / Child Audit Scope Evaluation Workflow

**Purpose.** Evaluates parent / child audit scope authority. Locks the rules documented in `scope-authority-configuration-evidence.md`.

**Steps (architectural):**

1. Determine relationship between actor's tenant and `target_company_scope_reference` (same / parent / child / sibling / unrelated).
2. If same tenant: pass to general evaluation (Workflow 4).
3. If parent (actor in parent tenant; target in child): require explicit Parent / Child Audit Scope Evidence + appropriate capability in scope; otherwise return `decision = deny` with `reason_code = parent_child_unauthorized`.
4. If child (actor in child tenant; target in parent): return `decision = deny` with `reason_code = parent_child_unauthorized` unless CIXCI System Admin override evidence exists.
5. If sibling (actor in one child tenant; target in another child of same parent): return `decision = deny` with `reason_code = parent_child_unauthorized` unless CIXCI System Admin override evidence exists.
6. If unrelated tenants: return `decision = deny` with `reason_code = cross_tenant_denied` unless CIXCI System Admin override evidence exists.
7. If suspended parent: parent loses effective parent-management / audit authority unless CIXCI System Admin override applies (return `decision = deny` with `reason_code = suspended_actor` otherwise).

**Boundary:** Cross-tenant denied by default. Parent / child requires explicit evidence. CIXCI System Admin override is explicit, scoped, reasoned, logged.

### Workflow 6 - Raw Evidence Access Approval Workflow

**Purpose.** Manages the raw evidence access request / approve / view-raw lifecycle.

**Steps (architectural):**

1. Actor holding `audit_evidence.request_raw` initiates request via PR-E Workflow 6 -> PR-D Workflow 9.
2. Tenant `check_access` receives request; validates `access_reason_reference` (REQUIRED); returns `decision = review` (pending approval).
3. Logs & Audit creates PR-D hardened Audit Access Record with `access_result = attempted`.
4. Approver holding `audit_evidence.approve_raw` (typically Raw Evidence Access Authorizer, documented composite only) receives the pending request.
5. Tenant `check_access` evaluates separation of duties: default deny when approver matches requester; tenant policy MAY override; override logged.
6. Approver approves OR denies; Tenant creates Raw Access Approval Evidence record (see `scope-authority-configuration-evidence.md`); emits existing `tenant.exception-admin-exception-changed` event with `exception_kind = raw_access_approval` or `raw_access_denial` discriminator extension.
7. On approve: Tenant returns `decision = allow` with `decision_effective_until` populated; Logs & Audit creates new PR-D hardened Audit Access Record with `access_result = granted`, `view_type = raw`, `prior_approval_reference` populated.
8. On deny: Tenant returns `decision = deny`; Logs & Audit creates PR-D hardened Audit Access Record with `access_result = denied`.
9. Subsequent `view_raw` access within the grant window: Logs & Audit creates PR-D hardened Audit Access Records with `view_type = raw` per access; Tenant `check_access` confirms grant is still within `decision_effective_until`.
10. On grant expiration: next raw access attempt returns `decision = deny` with `reason_code = approval_expired`.

**Boundary:** Purpose-bound, time-bound, separation of duties default. CIXCI System Admin self-approval and buyer / vendor raw access are open business decisions; default NO; tenant policy override is logged.

### Workflow 7 - Break-Glass Approval / Expiry / Review Workflow

**Purpose.** Manages the break-glass request / approve / grant / expiry / post-hoc-review lifecycle.

**Steps (architectural):**

1. Actor holding `audit_evidence.break_glass` initiates emergency request with `access_reason_reference` (REQUIRED).
2. Tenant `check_access` evaluates separation of duties (default deny when approver matches requester); returns `decision = review` pending Break-Glass Approver.
3. Logs & Audit creates PR-D hardened Audit Access Record with `access_result = attempted`, `break_glass_flag = true`.
4. Break-Glass Approver (documented composite bundle) receives pending request.
5. Approver approves OR denies; Tenant creates Break-Glass Grant Evidence record; emits existing `tenant.exception-admin-exception-changed` event with `exception_kind = break_glass_grant` (on approve) or `break_glass_revocation` (on deny / revocation) discriminator extension.
6. On approve: `grant_effective_until` is REQUIRED; **the exact duration is configurable / business-policy controlled; "1 hour" is suggested guidance only, NOT locked policy**.
7. Tenant returns `decision = allow` with `decision_effective_until = grant_effective_until`.
8. Subsequent break-glass-flagged access within grant window: each access creates PR-D hardened Audit Access Record with `break_glass_flag = true`.
9. On grant expiration: emit `tenant.exception-admin-exception-changed` with `exception_kind = break_glass_expiry`.
10. Post-hoc compliance review: triggered for every break-glass grant; concrete review SLA / workflow is future implementation. Review records carry `post_hoc_review_status` per `scope-authority-configuration-evidence.md`.

**Boundary:** Break-glass is NOT a normal access path. Frequency is monitored as anomaly (future implementation). All break-glass access logged. Notification intent deferred to Notification Platform.

### Workflow 8 - Legal Hold Authority Evaluation Workflow

**Purpose.** Evaluates authority for legal hold actions (`apply`, `release`, `view`, `view_scope`).

**Steps (architectural):**

1. Actor invokes legal hold action via existing PR-D Workflows 6 (apply) / 7 (release) / view operations.
2. Tenant `check_access` evaluates capability assignment (one of `legal_hold.apply` / `release` / `view` / `view_scope`).
3. Evaluate audience scope (default authority audience: `cixci_compliance_only`; tenant-scoped authority is open business decision; default NO).
4. For `release`: evaluate separation of duties from `apply` (default: deny when actor matches applier for high-sensitivity holds; configurable per tenant policy).
5. For `apply` and `release`: require `reason_reference` (REQUIRED per existing PR-D Legal Hold discipline).
6. Create Legal Hold Authority Grant Evidence record if granting; otherwise return decision.
7. Tenant returns decision to Logs & Audit per Workflow 13.
8. Logs & Audit records outcome per PR-D Workflow 8 -> hardened Audit Access Record; PR-D continues to emit `audit.legal-hold.applied` / `audit.legal-hold.released` events on action (this PR does NOT modify PR-D events).

**Boundary:** No `legal_hold.override_retention_purge` capability. Legal hold BLOCKS purge; release is the canonical lift mechanism.

### Workflow 9 - Audit Export Authority Evaluation Workflow

**Purpose.** Evaluates authority for audit export actions (`create`, `view`, `download`, `approve_raw_export`, `view_export_history`).

**Steps (architectural):**

1. Actor invokes audit export action via PR-E Workflow 13 (Audit Report / Evidence Export Recording) or download.
2. Tenant `check_access` evaluates capability assignment.
3. For `create`: evaluate `target_company_scope_reference` (company-scoped by default; cross-tenant denied; parent-to-child requires Parent / Child Audit Scope Evidence + capability).
4. For raw items in the export: per-item PR-D Workflow 9 escalation required; without per-item approval, raw items are rendered redacted per PR-E Export-Default-Redacted Rule.
5. For `approve_raw_export`: evaluate separation of duties from `audit_export.create` (default deny when actor matches creator).
6. For `download`: each download triggers separate evaluation; download access logged via PR-D Workflow 8 -> hardened Audit Access Record per PR-E Export-Access-Logged-Via-PR-D Rule.
7. For service identity export: require Service Identity Evidence Exporter profile (documented composite only) explicitly granted; default NO.
8. Return decision to Logs & Audit per Workflow 13.

**Boundary:** Audit exports are NOT BI / Analytics per PR-E Audit-Export-Not-Analytics Rule.

### Workflow 10 - Service Identity Audit Authority Evaluation Workflow

**Purpose.** Evaluates authority for service identity audit actions.

**Steps (architectural):**

1. Service identity invokes audit action.
2. Tenant `check_access` retrieves service identity capability profile and registered scope.
3. Evaluate that requested action is within the profile's documented composition (Service Identity Evidence Reader / Exporter) OR within per-identity capability list.
4. Evaluate that target scope is within registered scope.
5. Evaluate expiration (REQUIRED service identity credentials expire).
6. Evaluate effective dates.
7. Return decision to Logs & Audit per Workflow 13.
8. Logs & Audit creates PR-D hardened Audit Access Record with `service_trigger_reference` populated per PR-D Service-Identity-Access-Logged Rule.

**Boundary:** Service identities are scoped, expiring / rotatable, logged. No broad tenant-wide default. Service identity audit export requires Service Identity Evidence Exporter profile explicitly granted; default NO.

### Workflow 11 - Suspended / Pending / Inactive Company Access Blocking Workflow

**Purpose.** Implements lifecycle-aware audit access blocking.

**Steps (architectural):**

1. At `check_access` audit-flow evaluation (Workflow 4 step 8), check actor's company status and target's company status.
2. If actor's company is `suspended` or `pending_setup` or `inactive`: return `decision = deny` with `reason_code = suspended_actor` (or appropriate variant).
3. If target's company is `suspended`: actor's audit access blocked unless CIXCI System Admin override evidence applies; otherwise return `decision = deny` with `reason_code = suspended_target`.
4. If target's company is `inactive`: actor MAY access historical evidence per existing baseline lifecycle blocking rules.
5. If suspended parent attempts parent-to-child audit access: parent loses effective parent-management / audit authority unless CIXCI System Admin override applies.
6. CIXCI System Admin override evidence record is created if override is exercised (see `scope-authority-configuration-evidence.md`); override produces PR-D hardened Audit Access Record with `access_class_evaluated = system_admin_only`.

**Boundary:** Lifecycle blocking is canonical per existing Tenant baseline; this workflow extends the discipline to audit capabilities.

### Workflow 12 - Capability Revocation Active Session / Saved Search Authority Recheck Workflow

**Purpose.** Per PR-E OQ-SR-1 locked guidance, ensures that active sessions and saved searches re-evaluate authority at next access. Triggered by Workflow 2 (Audit Capability Revocation).

**Steps (architectural):**

1. Workflow 2 emits existing `company.capability_changed` event with `capability_family` discriminator extension.
2. Logs & Audit subscribers (if any) MAY consume the event for proactive UI invalidation; not required.
3. At next access invoking the revoked capability: `check_access` evaluates current capability assignment effective date range; revoked capability returns `decision = deny` with `reason_code = capability_expired` or `capability_missing`.
4. Saved Searches MUST re-evaluate authority at execution time per PR-E OQ-SR-1; implementations MAY proactively invalidate; not required by this PR.
5. Active Evidence Search Sessions, Evidence Review Sessions, in-flight Audit Report Export operations re-evaluate at next per-result-access decision.

**Boundary:** Concrete propagation latency is implementation-level. The architectural pattern is re-evaluate-at-next-access.

### Workflow 13 - Authority Decision Handoff To Logs & Audit Workflow

**Purpose.** The final handoff workflow. Tenant returns decision; Logs & Audit records outcome.

**Steps (architectural):**

1. Workflow 4 produces `decision` + `reason_code` + `matched_authority_evidence_reference` + optional `decision_effective_until` + optional `prior_approval_reference`.
2. Tenant returns the decision payload to Logs & Audit.
3. Logs & Audit (PR-D Workflow 8) maps the response to PR-D hardened Audit Access Record fields:
   - `decision = allow` -> `access_result = granted`; `view_type` per request; populates all PR-D evaluated fields (`access_class_evaluated`, `redaction_class_evaluated`, `restricted_evidence_flag`, `legal_hold_state_at_access`); populates `redaction_transformation_reference` per PR-D Workflow 5; populates `access_reason_reference`, `prior_approval_reference`, `break_glass_flag`, `search_session_reference` as applicable.
   - `decision = deny` -> `access_result = denied`; `denial_reason = reason_code`.
   - `decision = review` -> `access_result = attempted` (non-terminal per PR-D access_result terminality discipline); upon subsequent approval / denial (Workflows 6 / 7 / 8 / 9), additional Audit Access Records record terminal outcome.
4. Logs & Audit emits PR-D `audit.evidence-access.recorded` event (this PR does NOT modify PR-D events).
5. Tenant records its own decision in the Audit Authority Decision sub-projection (Tenant-side record; complementary to Logs & Audit's record).

**Boundary:** Tenant does NOT mutate Logs & Audit records. Logs & Audit records outcome via PR-D hardened Audit Access Record. Correlation via `correlation_reference`.

---

### Workflow inventory summary

- Existing Tenant baseline workflows: preserved.
- **PR additive numbered workflows: 13** (Workflows 1 through 13 above).

### Workflows intentionally NOT introduced

- Concrete approval UI / queue workflows. Future UX / UI.
- Concrete `check_access` HTTP endpoint workflows. Future API Governance Foundation PR.
- Notification delivery workflows. Future Notification Platform coordination.
- Capability propagation latency workflows. Implementation.
- Concrete audit export download distribution workflows. Future UX / UI.
- Per-tenant policy override UI workflows (for self-approval, buyer / vendor raw access, break-glass duration). Future UI.
- Concrete role bundle assignment UI workflows. Future UI.
- Concrete service identity rotation UI workflows. Existing Tenant baseline plus future UI.
- Concrete anomaly detection workflows for break-glass frequency. Future implementation.
- Investigation Case Management workflows. Future PR if module exists.
- AI Agent Services / Warranty Registration audit capability workflows. Future PR when modules exist.

### Workflow boundary discipline (this coordination)

- All 13 workflows are owned by Tenant Company.
- All 13 workflows defer decision recording to Logs & Audit (PR-D hardened Audit Access Record); Tenant records authority evidence in Tenant-side projections / records.
- No workflow mutates Logs & Audit records.
- No workflow makes business decisions on behalf of source modules.
- No workflow creates BI dashboards or analytics surfaces.
- All workflows respect `check_access` as the canonical authority evaluation surface.
- All workflows respect existing Tenant baseline (capability registry, scope projection, lifecycle blocking, parent / child rules, service / API identity authority).
- All workflows respect Logs & Audit PR-A through PR-E boundaries.
