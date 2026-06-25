# Capability Flag Registry

> **Source:** Repo cleanup PR `feature/tenant-company-foundation-repo-cleanup`. Approved content from prior conversation-complete PR 2 (`feature/tenant-company-capability-registry-check-access`), updated for PR 5 finalization (capability-change canonical name confirmed).
>
> **Authority:** This file is the canonical naming and lifecycle source for capability flags consumed by Tenant/Company Foundation and downstream modules. Substantive operational behavior gated by capability flags is governed in `permissions.md` and the relevant consuming module specs.

---

## 1. Purpose and scope

This document is the canonical naming and lifecycle source for capability flags consumed by Tenant/Company Foundation and downstream modules. It is governed at the documentation level; flag enforcement happens in consuming modules through `check_access` per `permissions.md`.

The registry's role is bounded:

- The registry records flag names, statuses, behavior summaries, consuming modules, and lifecycle.
- The registry does not encode the substantive operational behavior the flag gates; that lives in the consuming module's spec.
- Specific flags evolve through paired PRs per the land-together discipline (Section 4).
- Flag lifecycle (registered, provisional, deprecated) is governed here.

The registry is the answer to "what does this flag mean and where does it live?" The consuming module is the answer to "what does it do?"

## 2. Registry entry shape

Each registry entry has the following shape:

| Component | Description |
|---|---|
| **Namespace** | The flag's namespace (e.g., `parent_management.*`, `setup.*`, `agent.*`, `catalog.*`). |
| **Flag name** | Fully qualified flag identifier (e.g., `parent_management.suspend_children`). |
| **Status** | One of: registered, provisional, deprecated. See Section 3. |
| **Behavior summary** | Concise description of what the flag authorizes at the registry level. Not the substantive operational rules; cross-references to the consuming module's spec for those. |
| **Consuming modules** | Modules whose spec sections gate behavior on the flag. |
| **Load-bearing rules** | Constraints the flag carries that apply across consuming modules (e.g., lifecycle constraints, no-cascade rules, scope limitations). |
| **Replacement reference** | Populated for deprecated flags only; identifies the successor flag where applicable. |
| **Effective range governance** | Per-flag lifecycle notes; cross-reference to `permissions.md` for substantive authority resolution. |

## 3. Status semantics

Three statuses at v1:

### Registered

Flag is in active operational use. Consuming modules may rely on the flag being present and effective per the registry's contract. Capability assignments referring to the flag are valid; `check_access` outcomes consult registered flags.

### Provisional

Flag namespace or specific flag is reserved but operational behavior is still being developed in a downstream module's drafting. Consuming modules should not depend on provisional flags for production behavior.

The `setup.*` namespace at v1 is the example: the namespace is reserved for setup-scoped flags governing behavior during Pending Setup onboarding, but no specific `setup.*` flags are registered at v1.

Provisional flags do not produce `check_access` allow outcomes; any operation gating on a provisional flag is rejected.

### Deprecated

Flag is on a transition path to removal or replacement. Existing capability assignments referring to the flag retain effective-range until explicitly closed (operational policy decides timing). Replacement references (where applicable) are part of the entry; consuming modules transitioning off the deprecated flag use the replacement reference to guide migration.

Specific deprecation events and their consumption are operational; the registry records the transition state.

## 4. Land-together discipline

Adding a flag requires a paired PR that lands two artifacts in the same review:

1. The consuming module's spec section that gates behavior on the flag (with concrete operational rules).
2. The registry entry for the flag (with the registry-entry shape per Section 2).

Neither lands without the other. A flag that exists in the registry without a consuming module's spec gating on it is not registered; a flag a consuming module's spec depends on without a registry entry has no canonical name and cannot be relied on for `check_access`.

Renaming or moving a flag also follows the paired-PR discipline. The new name's registry entry and the consuming modules' updated spec sections land together; the prior name's registry entry transitions to deprecated with a replacement reference.

## 5. Deprecation discipline

When a flag is deprecated:

- Existing capability assignments retain effective-range. Operational policy decides when to close them; the registry records the transition state.
- Replacement references are recorded in the registry where applicable.
- Consuming modules transitioning off the deprecated flag use the replacement reference for migration; specific migration mechanics are operational.
- Specific deprecation events (notifications to assignees, capability-change events propagating the transition) are governed in the canonical event surface; the canonical capability-change event is `company.capability_changed` (see Section 11).

The registry does not autonomously close deprecated flags; closure is an explicit decision recorded in operational policy.

## 6. Downstream consumption rule

Consumers of capability flags follow this rule:

1. Consult the registry for canonical naming and high-level meaning of the flag.
2. Consult the consuming module's spec for the substantive operational behavior the flag gates.
3. Invoke `check_access` per `permissions.md` for the authoritative authority resolution.

The registry never substitutes for `check_access`. Knowing a flag exists and is registered is not sufficient to perform an authorized operation; `check_access` makes the authoritative decision per the actor envelope, target entity, lifecycle state, capability assignment, and cross-tenant context.

## 7. `parent_management.*` namespace (registered)

The `parent_management.*` namespace authorizes parent companies to perform specific operations against their direct children. Six flags are registered at v1.

### `parent_management.read_children`

| Component | Value |
|---|---|
| Status | Registered |
| Behavior summary | Authorizes the holding parent Company Admin to read direct children's records (Company-level reads scoped to direct children only). |
| Consuming modules | Tenant/Company Foundation. |
| Load-bearing rules | Scope-bounded to direct children only; does not cascade to grandchildren or beyond. Effective only when parent Company is in Active lifecycle state per Flag 3 closure. Held but not effective during parent Suspended; restored automatically when parent returns to Active. |
| Replacement reference | None. |

### `parent_management.invite_users_to_children`

| Component | Value |
|---|---|
| Status | Registered |
| Behavior summary | Authorizes the holding parent Company Admin to issue user invitations scoped to direct children's company contexts. |
| Consuming modules | Tenant/Company Foundation. |
| Load-bearing rules | Scope-bounded to direct children. The invited user, upon acceptance, becomes a member of the child Company, not the parent. Effective only when parent Company is Active; held but not effective during parent Suspended. |
| Replacement reference | None. |

### `parent_management.manage_user_roles_in_children`

| Component | Value |
|---|---|
| Status | Registered |
| Behavior summary | Authorizes the holding parent Company Admin to modify user roles within direct children's company contexts. |
| Consuming modules | Tenant/Company Foundation. |
| Load-bearing rules | Scope-bounded to direct children. Effective only when parent Company is Active; held but not effective during parent Suspended. |
| Replacement reference | None. |

### `parent_management.manage_contacts_of_children`

| Component | Value |
|---|---|
| Status | Registered |
| Behavior summary | Authorizes the holding parent Company Admin to manage contact records (billing contacts, integration contacts, operational contacts, etc.) of direct children. |
| Consuming modules | Tenant/Company Foundation. |
| Load-bearing rules | Scope-bounded to direct children. Effective only when parent Company is Active; held but not effective during parent Suspended. |
| Replacement reference | None. |

### `parent_management.suspend_children`

| Component | Value |
|---|---|
| Status | Registered |
| Behavior summary | Authorizes the holding parent Company Admin to suspend a specific direct child Company explicitly. |
| Consuming modules | Tenant/Company Foundation. |
| Load-bearing rules | The flag permits suspension of a specific direct child only. It **does not** imply or authorize automatic parent-driven suspension cascade across siblings. Each child suspension is an explicit action against an explicit child. The flag does not imply that parent suspension cascades to children (parent suspension never auto-suspends children per Flag 3 closure). Effective only when parent Company is Active; held but not effective during parent Suspended. |
| Replacement reference | None. |

### `parent_management.request_child_onboarding`

| Component | Value |
|---|---|
| Status | Registered |
| Behavior summary | Authorizes the holding parent Company Admin to submit a `child_onboarding_request` to CIXCI System Admin. |
| Consuming modules | Tenant/Company Foundation. |
| Load-bearing rules | Permits submission of a child onboarding request only. CIXCI System Admin still approves or rejects. Approval creates the child Company in Pending Setup, not Active; child still requires bootstrap invitation acceptance and final activation per the standard onboarding flow. The flag does not authorize the parent to create or activate child companies directly. Effective only when parent Company is Active; held but not effective during parent Suspended. |
| Replacement reference | None. |

### Deferred - `parent_management.manage_capabilities_of_children`

Not registered at v1. The capability of parent admins to manage capability flags of direct children is deferred. Operational policy at v1 does not grant this capability through any flag; capability flag changes for child companies remain CIXCI System Admin-controlled.

The flag namespace position is held for future operationalization through a focused scoped extension; not a v1 commitment.

### `parent_management.*` namespace constraints (load-bearing across all flags)

Two namespace-level constraints apply to all current and future `parent_management.*` flags:

1. **No parent-management flag grants parent archival authority.** Archival remains CIXCI System Admin-controlled per Flag 4 closure.
2. **No parent-management flag grants automatic suspension cascade authority.** Per Flag 3 closure, parent suspension does not auto-suspend children. `parent_management.suspend_children` permits explicit suspension of specific direct children when granted; it does not imply or authorize a parent-side broadcast suspension across all children.

These constraints apply uniformly. Future `parent_management.*` flag additions cannot relax these constraints without explicit ADR-level review.

## 8. `setup.*` namespace (provisional)

The `setup.*` namespace is reserved for setup-scoped flags governing behavior during Pending Setup onboarding. At v1 no specific `setup.*` flags are registered; the namespace is held for future operationalization.

Consuming modules should not depend on `setup.*` flags for production behavior at v1. Any operation that would gate on a provisional `setup.*` flag is rejected via `check_access` per the provisional-status rule (Section 3).

Future operationalization of `setup.*` flags follows the land-together discipline (Section 4): the consuming module's spec section gating on a specific `setup.*` flag and the corresponding registry entry land together, transitioning the namespace from provisional to populated-with-registered-flags.

## 9. `agent.*` namespace (reserved, not active at v1)

The `agent.*` namespace is reserved for AI-agent-specific capability flags per the platform-wide AI Agent Services boundary discipline. At v1 no `agent.*` flags are registered.

Agent authority at v1 is a strict subset of on-behalf-of human authority per the existing platform pattern; agents do not have separately granted capability flags. The reserved namespace prevents collision if future agent-specific governance requires distinct flags.

Reservation does not create operational behavior. Treat `agent.*` references as not-yet-applicable until specific agent governance is registered.

## 10. `catalog.*` namespace (anticipated)

The `catalog.*` namespace is anticipated. Specific flags (e.g., `catalog.publish`, `catalog.import`, `catalog.buyer_export`, `catalog.manage_compatibility`) are registered through paired Catalog spec PRs when Catalog drafting resumes after the Tenant/Company Foundation hardening sequence completes and Codex confirms repo-completeness.

This file does not register any `catalog.*` flags. Catalog drafting is paused; resumption follows Codex confirmation of Tenant/Company Foundation repo-completeness.

## 11. Capability change event surface

The canonical capability-change event surface is `company.capability_changed`. Capability assignments, revocations, and effective-range changes emit this event.

Downstream consumers consult this event surface (per `events.md` canonical inventory and `event-contracts.md` payload contract) for capability-change consumption. Specific consumer behavior for capability-change consumption is owned by each consuming module's spec; the registry references the event surface and the canonical name only.

## 12. Cross-references

- `permissions.md` - substantive authority resolution, `check_access` contract, per-flag authority mapping.
- `spec.md` Section 6 - Permissions / Authority Model summary referencing this registry.
- `events.md` - canonical event inventory; `company.capability_changed` entry.
- `event-contracts.md` - capability-change payload contract.
- `workflows.md` - parent-management workflows that consume `parent_management.*` flags; child onboarding workflow that consumes `parent_management.request_child_onboarding`.
- `boundary-contracts.md` - downstream consumer notes covering capability-change consumption.

## Logs & Audit Access Authority Capability Registry

This section registers exactly 34 audit-specific capabilities organized into 8 capability families. Capabilities are the source of truth for `check_access` evaluation; role bundles in `permissions.md` are documented composites only. Existing capability registry entries are preserved without modification.

### Registry entry shape (audit coordination)

Each audit capability entry carries the existing Tenant capability registry envelope plus the following audit-coordination context:

- `capability_identifier`.
- `capability_family` (one of 8 values: `audit_search`, `audit_view_retrieval`, `audit_review`, `audit_export`, `legal_hold`, `governance`, `service_identity_audit`, `audit_break_glass`).
- `capability_kind` (one of 5 values: `requester`, `approver`, `viewer`, `actor`, `service_identity`).
- `documented_role_bundle_membership` (references to role bundles in `permissions.md` whose documented composition includes this capability).
- `requires_separation_of_duties` (boolean).
- `requires_reason_reference` (boolean).
- `requires_time_bound_grant` (boolean).
- `consumer_logs_audit_workflow_reference` (the PR-D / PR-E workflow that consumes this capability via `check_access`; reference only).
- Existing registry envelope: `effective_date_range`, `lifecycle_status`, `audit_record_reference`.

---

### Family 1 - Search / Query (5 capabilities)

#### `audit_evidence.search`

- `capability_family`: `audit_search`.
- `capability_kind`: `viewer`.
- Documented role bundles holding this: Evidence Search User, Reviewer / Investigator, Evidence Review Manager, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- `requires_separation_of_duties`: false.
- `requires_reason_reference`: false.
- `requires_time_bound_grant`: false.
- Consumes: PR-E Workflow 1 (Evidence Search Session Creation), PR-E Workflow 2 (Evidence Search Query Evaluation).
- Purpose: Baseline search authority over PR-A Evidence Records with non-sensitive filters.

#### `audit_evidence.search_sensitive`

- `capability_family`: `audit_search`.
- `capability_kind`: `viewer`.
- Documented role bundles: Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- `requires_separation_of_duties`: false.
- `requires_reason_reference`: true (per PR-E Sensitive-Search-Logged Rule; `search_initiated_purpose_reference` REQUIRED).
- `requires_time_bound_grant`: false.
- Consumes: PR-E Workflow 1, PR-E Workflow 2 with `sensitive_filter_used = true`.
- Purpose: Required to construct Evidence Search Session with sensitive filter dimensions.

#### `audit_evidence.view_visible_denied_metadata`

- `capability_family`: `audit_search`.
- `capability_kind`: `viewer`.
- Documented role bundles: Compliance / Audit Reviewer.
- `requires_separation_of_duties`: false.
- `requires_reason_reference`: false.
- `requires_time_bound_grant`: false.
- Consumes: PR-E Workflow 4 (Search Result Access Evaluation), per PR-E Hidden-Denied-Result Rule and Visible-Denied-Metadata-Minimized Rule.
- Purpose: Required to see visible-denied minimized metadata; not held by default; reviewer-only.

#### `audit_evidence.view_legal_hold_flags`

- `capability_family`: `audit_search`.
- `capability_kind`: `viewer`.
- Documented role bundles: Legal Hold Authority, Compliance / Audit Reviewer.
- `requires_separation_of_duties`: false.
- `requires_reason_reference`: false.
- `requires_time_bound_grant`: false.
- Consumes: PR-E Workflow 8 (Legal Hold Search Behavior), per PR-E Legal-Hold-Flag-Visibility-Scoped Rule.
- Purpose: Required to see legal hold flags on search results; audience-scoped per PR-E.

#### `audit_evidence.view_restricted_flags`

- `capability_family`: `audit_search`.
- `capability_kind`: `viewer`.
- Documented role bundles: Compliance / Audit Reviewer.
- `requires_separation_of_duties`: false.
- `requires_reason_reference`: false.
- `requires_time_bound_grant`: false.
- Consumes: PR-E Workflow 5 (Redacted Search Result Rendering), per PR-E Restricted-Flag-Visibility-Scoped Rule.
- Purpose: Required to see `restricted_evidence` flags on search results.

---

### Family 2 - View / Retrieval (4 capabilities)

#### `audit_evidence.view_redacted`

- `capability_family`: `audit_view_retrieval`.
- `capability_kind`: `viewer`.
- Documented role bundles: Evidence Search User, Reviewer / Investigator, Evidence Review Manager, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- `requires_separation_of_duties`: false.
- `requires_reason_reference`: false.
- `requires_time_bound_grant`: false.
- Consumes: PR-E Workflow 5 (Redacted Search Result Rendering), per PR-E Search-Result-Redacted-By-Default Rule.
- Purpose: Default view authority; redacted-by-default per audience-appropriate Redaction Transformation Record.

#### `audit_evidence.request_raw`

- `capability_family`: `audit_view_retrieval`.
- `capability_kind`: `requester`.
- Documented role bundles: Reviewer / Investigator (within investigation), Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- `requires_separation_of_duties`: true (request and approve preferred to be separate actors).
- `requires_reason_reference`: true (`access_reason_reference` REQUIRED per PR-D Raw-Evidence-Access-Exceptional Rule).
- `requires_time_bound_grant`: false.
- Consumes: PR-E Workflow 6 (Raw Evidence Retrieval Request) -> PR-D Workflow 9 (Raw Evidence Access).
- Purpose: Allows raw access request initiation; approval is held by separate capability.

#### `audit_evidence.approve_raw`

- `capability_family`: `audit_view_retrieval`.
- `capability_kind`: `approver`.
- Documented role bundles: Raw Evidence Access Authorizer (ONLY by default; System Admin Evidence Supervisor does NOT automatically hold).
- `requires_separation_of_duties`: true (default: deny when approver matches requester; tenant policy MAY override; override logged).
- `requires_reason_reference`: false (the reason was provided at request time).
- `requires_time_bound_grant`: false (the approval may grant a time-bound `view_raw`).
- Consumes: PR-D Workflow 9; produces Raw Access Approval evidence; the approval grants dynamic `view_raw` per the grant window.
- Purpose: Allows raw access approval authority.

#### `audit_evidence.view_raw`

- `capability_family`: `audit_view_retrieval`.
- `capability_kind`: `viewer`.
- Documented role bundles: NONE statically. Granted dynamically after `approve_raw` decision.
- `requires_separation_of_duties`: false.
- `requires_reason_reference`: false.
- `requires_time_bound_grant`: true (granted only within the approval's `decision_effective_until` window).
- Consumes: PR-D Workflow 9 -> PR-D hardened Audit Access Record with `view_type = raw`.
- Purpose: Dynamic, time-bound raw view grant.

---

### Family 3 - Review (6 capabilities)

#### `audit_review.create_session`

- `capability_family`: `audit_review`.
- `capability_kind`: `actor`.
- Documented role bundles: Reviewer / Investigator, Evidence Review Manager, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-E Workflow 10 (Evidence Review Session Creation).

#### `audit_review.manage_session`

- `capability_family`: `audit_review`.
- `capability_kind`: `actor`.
- Documented role bundles: Evidence Review Manager, System Admin Evidence Supervisor.
- Consumes: PR-E Workflow 10 (status transitions).

#### `audit_review.create_note`

- `capability_family`: `audit_review`.
- `capability_kind`: `actor`.
- Documented role bundles: Reviewer / Investigator, Evidence Review Manager, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-E Workflow 11 (Review Note / Annotation Recording).
- Note: When the target Evidence Record has `restricted_evidence = true`, the resulting Review Note's `review_note_redaction_class` is elevated per PR-D Redaction Policy Matrix.

#### `audit_review.create_collection`

- `capability_family`: `audit_review`.
- `capability_kind`: `actor`.
- Documented role bundles: Reviewer / Investigator, Evidence Review Manager, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-E Workflow 12 (Evidence Collection Record Creation).
- Note: Per PR-E Evidence-Collection-References-Only Rule, collections reference Evidence Records; never copy content.

#### `audit_review.view_chain_of_custody`

- `capability_family`: `audit_review`.
- `capability_kind`: `viewer`.
- Documented role bundles: Reviewer / Investigator, Evidence Review Manager, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-E Chain-of-Custody View (rendered view; not an entity).

#### `audit_review.close_session`

- `capability_family`: `audit_review`.
- `capability_kind`: `actor`.
- Documented role bundles: Evidence Review Manager, System Admin Evidence Supervisor.
- Consumes: PR-E Workflow 10 (status transition to `closed` with `review_disposition`).

---

### Family 4 - Export (5 capabilities)

#### `audit_export.create`

- `capability_family`: `audit_export`.
- `capability_kind`: `actor`.
- Documented role bundles: Compliance / Audit Reviewer, Evidence Review Manager, System Admin Evidence Supervisor.
- `requires_separation_of_duties`: true (separation from `approve_raw_export` and from `download`).
- Consumes: PR-E Workflow 13 (Audit Report / Evidence Export Recording).
- Note: Company-scoped by default; cross-tenant export denied; parent-to-child export requires explicit parent / child audit scope evidence + capability.

#### `audit_export.view`

- `capability_family`: `audit_export`.
- `capability_kind`: `viewer`.
- Documented role bundles: Audit Export Reviewer, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-E Audit Report Export Record metadata view.

#### `audit_export.download`

- `capability_family`: `audit_export`.
- `capability_kind`: `viewer`.
- Documented role bundles: Audit Export Reviewer, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-E Audit Report Export Record download; each download is logged via PR-D Workflow 8 -> hardened Audit Access Record per PR-E Export-Access-Logged-Via-PR-D Rule.
- Note: Separate from `view`; downloads are individually authorized.

#### `audit_export.approve_raw_export`

- `capability_family`: `audit_export`.
- `capability_kind`: `approver`.
- Documented role bundles: Raw Evidence Access Authorizer.
- `requires_separation_of_duties`: true (separation from `create`).
- Consumes: PR-E Workflow 13 per-item raw approval; raw items in an export require per-item PR-D Workflow 9 escalation.

#### `audit_export.view_export_history`

- `capability_family`: `audit_export`.
- `capability_kind`: `viewer`.
- Documented role bundles: Audit Export Reviewer, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: Audit Report Export Record history view.

---

### Family 5 - Legal Hold (4 capabilities)

#### `legal_hold.apply`

- `capability_family`: `legal_hold`.
- `capability_kind`: `actor`.
- Documented role bundles: Legal Hold Authority.
- `requires_separation_of_duties`: true (preferred separation from `release` for high-sensitivity holds; configurable).
- `requires_reason_reference`: true (per existing PR-D Legal Hold discipline).
- Consumes: PR-D Workflow 6 (Apply Legal Hold).
- Default authority audience: CIXCI / compliance-only.

#### `legal_hold.release`

- `capability_family`: `legal_hold`.
- `capability_kind`: `actor`.
- Documented role bundles: Legal Hold Authority.
- `requires_separation_of_duties`: true.
- `requires_reason_reference`: true.
- Consumes: PR-D Workflow 7 (Release Legal Hold).

#### `legal_hold.view`

- `capability_family`: `legal_hold`.
- `capability_kind`: `viewer`.
- Documented role bundles: Legal Hold Authority, Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-D Legal Hold Record view.

#### `legal_hold.view_scope`

- `capability_family`: `legal_hold`.
- `capability_kind`: `viewer`.
- Documented role bundles: Legal Hold Authority, System Admin Evidence Supervisor.
- Consumes: PR-D Legal Hold Record scope detail view.
- Note: More sensitive than `view`; reveals which evidence is held.

### `legal_hold.override_retention_purge` - REJECTED

**NOT INTRODUCED.** Legal hold BLOCKS purge by design (per PR-D Legal-Hold-Overrides-Purge Rule). Release authority via `legal_hold.release` is the canonical lift mechanism. There is no override path; introducing one would defeat PR-D discipline.

---

### Family 6 - Governance (5 capabilities)

#### `retention_disposition.view`

- `capability_family`: `governance`.
- `capability_kind`: `viewer`.
- Documented role bundles: Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-D Retention Disposition Record view.

#### `retention_disposition.approve`

- `capability_family`: `governance`.
- `capability_kind`: `approver`.
- Documented role bundles: Compliance / Audit Reviewer (with elevated authority); Legal Hold Authority (for hold-related dispositions).
- `requires_separation_of_duties`: true (configurable; default ON for sensitive dispositions).
- Consumes: PR-D Workflow 4 (Retention Disposition Review) approval step.

#### `redaction_transform.view`

- `capability_family`: `governance`.
- `capability_kind`: `viewer`.
- Documented role bundles: Compliance / Audit Reviewer, System Admin Evidence Supervisor.
- Consumes: PR-D Redaction Transformation Record view.

#### `redaction_transform.create`

- `capability_family`: `governance`.
- `capability_kind`: `actor`.
- Documented role bundles: Compliance / Audit Reviewer (with elevated authority).
- `requires_separation_of_duties`: true (separation from `approve` preferred).
- Consumes: PR-D Workflow 5 (Redaction Transformation Creation).

#### `redaction_transform.approve`

- `capability_family`: `governance`.
- `capability_kind`: `approver`.
- Documented role bundles: Compliance / Audit Reviewer (with elevated authority).
- `requires_separation_of_duties`: true.
- Consumes: PR-D Workflow 5 approval step.

---

### Family 7 - Service Identity (4 capabilities)

#### `service_identity.audit_search`

- `capability_family`: `service_identity_audit`.
- `capability_kind`: `service_identity`.
- Documented service identity profiles: Service Identity Evidence Reader.
- Discipline: scoped, expiring / rotatable, logged.
- Consumes: PR-E Workflow 1, 2 (service-driven Evidence Search Sessions).

#### `service_identity.audit_export`

- `capability_family`: `service_identity_audit`.
- `capability_kind`: `service_identity`.
- Documented service identity profiles: Service Identity Evidence Exporter.
- Discipline: scoped, expiring / rotatable, logged.
- Consumes: PR-E Workflow 13 (service-driven audit exports).
- Note: Service identity audit export requires this capability explicitly granted; default NO.

#### `service_identity.audit_access_record`

- `capability_family`: `service_identity_audit`.
- `capability_kind`: `service_identity`.
- Documented service identity profiles: Service Identity Evidence Reader, Service Identity Evidence Exporter.
- Discipline: scoped, expiring / rotatable, logged.
- Consumes: PR-D Workflow 8 (Evidence Access Recording); held by Logs & Audit indexing / access-logging services.

#### `service_identity.evidence_emit`

- `capability_family`: `service_identity_audit`.
- `capability_kind`: `service_identity`.
- Documented service identity profiles: NONE in this PR (per-source-module service identities granted directly).
- Discipline: scoped to source-module evidence emission per existing Tenant API integration user authority.
- Consumes: PR-A `audit.record.created` / `audit.evidence.recorded` events; PR-B file events; per source-module evidence emission patterns.
- Note: Required for source-module service identities that emit Evidence Records.

---

### Family 8 - Break-Glass (1 capability)

#### `audit_evidence.break_glass`

- `capability_family`: `audit_break_glass`.
- `capability_kind`: `requester`.
- Documented role bundles: NONE statically. Granted to designated emergency-response actors per tenant policy (future role definitions may include Incident Responder profile).
- `requires_separation_of_duties`: true (Break-Glass Approver MUST be separate from requester wherever feasible; default: deny when approver matches requester; tenant policy MAY override; override logged).
- `requires_reason_reference`: true (REQUIRED).
- `requires_time_bound_grant`: true (grant window REQUIRED; **exact duration is configurable / business-policy controlled; "1 hour" is suggested guidance only, NOT locked policy**).
- Consumes: PR-D hardened Audit Access Record with `break_glass_flag = true`.
- Purpose: Emergency bypass capability; NOT a normal access path; subject to post-hoc compliance review.

#### Break-Glass Approver (approval-side authority pattern)

Documented at the bundle level in `permissions.md` (Bundle 4). The Break-Glass Approver bundle's documented composition explicitly grants approval authority for `audit_evidence.break_glass` requests. This is consistent with the capability-first model: the approval right is observable through bundle membership, and `check_access` evaluates the bundle's effective capability set when processing break-glass approval requests.

---

### Registry summary

| Family | # | Family identifier | Capability count |
|---|---:|---|---:|
| 1 | 1 | `audit_search` | 5 |
| 2 | 2 | `audit_view_retrieval` | 4 |
| 3 | 3 | `audit_review` | 6 |
| 4 | 4 | `audit_export` | 5 |
| 5 | 5 | `legal_hold` | 4 |
| 6 | 6 | `governance` | 5 |
| 7 | 7 | `service_identity_audit` | 4 |
| 8 | 8 | `audit_break_glass` | 1 |
| **Total** | | | **34** |

### Capabilities explicitly NOT introduced

- `legal_hold.override_retention_purge` - REJECTED. Legal hold BLOCKS purge by design; release is the canonical lift mechanism.
- Per-evidence-type capabilities (e.g., `audit_evidence.view_pricing_redacted`) - proliferation rejected.
- Per-family capabilities (e.g., `audit_evidence.search_pricing_family`) - proliferation rejected.
- UI-specific capabilities (e.g., `audit_ui.access_dashboard`) - implementation-specific.
- AI Agent Services audit capabilities - module does not exist.
- Warranty Registration audit capabilities - module does not exist.
- Standalone break-glass approver capability - held at the Break-Glass Approver bundle level per capability-first model with documented approval composite.

### Registry boundary discipline

- Capabilities are the source of truth.
- Role bundles in `permissions.md` are documented composites only; NOT evaluated by `check_access`.
- Existing Tenant capability registry baseline is preserved; this section adds entries only.
- All audit-coordination capabilities are evaluated by `check_access` per the Access Decision Model in `spec.md`.
- Existing Tenant capability-change events (`company.capability_changed`, `tenant.access-role-assignment-changed`, etc.) carry audit-capability change semantics via discriminator extensions in `events.md` and `event-contracts.md`. **Zero new Tenant events introduced.**
