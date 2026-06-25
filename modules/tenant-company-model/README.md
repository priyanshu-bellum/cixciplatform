# Tenant Company Module

Initial architecture draft for the Tenant Company bounded context.

This module aligns with ADR-0003 and covers company/entity hierarchy, tenant boundaries, onboarding, activation, user provisioning, role boundaries, visibility relationships, geographic eligibility, admin exceptions, child operational configuration, capability flag governance, and Tenant-owned scope/authority evidence consumed by downstream modules.

This is proposal-level architecture. It preserves unresolved business rules as open questions and does not finalize pricing, order routing, fulfillment, catalog product ownership, procurement lifecycle, notification delivery, integration transport, analytics behavior, or AI action behavior.

`scope-authority-configuration-evidence.md` is the normative Tenant Company sub-contract for Tenant Scope Evidence / Access Projection, Common Authority Evidence Controls, parent/child override evidence, buyer/vendor relationship evidence, role/scope projection, import/export authority, buyer pricing mode configuration placement, commission configuration input placement, channel eligibility, Product Type enablement, PO functionality/approval authority, report/invoice access/redaction, notification recipient scope, API/integration user authority, AI action authority, projection generation/supersession behavior, and normalized Tenant event names.

`company-subtype-taxonomy-management.md` is the normative Tenant Company sub-contract for controlled company type/subtype taxonomy management, subtype activation readiness, subtype configuration evidence, company subtype assignment, downstream impact previews, taxonomy events/APIs/tests, and boundary wording for modules that consume subtype evidence.

`capability-flag-registry.md` is the canonical naming and lifecycle source for Tenant/Company capability flags. It registers the v1 `parent_management.*` flags, reserves/provisions future namespaces, and confirms `company.capability_changed` as the canonical capability-change event surface. Substantive operational behavior still lives in `permissions.md` and consuming module specs, and authority resolution still goes through `check_access`.

Downstream modules may consume Tenant Scope Evidence projections, direct Tenant authority/configuration records, subtype configuration evidence, or capability flag references. Direct records must carry Common Authority Evidence Controls. Tenant Scope Evidence / Access Projection is generated or superseded from Tenant-owned source records and should not be authored by downstream modules. Company setup uses controlled taxonomy values, not free-text company type fields.

## Source Notes

- `source-updates-company-onboarding-visibility.md`
- `source-updates-buyer-setup-child-operations.md`

## Module File Index

- `README.md`
- `spec.md`
- `data-model.md`
- `workflows.md`
- `events.md`
- `event-contracts.md`
- `api-contracts.md`
- `openapi-contracts.md`
- `permissions.md`
- `boundary-contracts.md`
- `test-scenarios.md`
- `assumptions-open-questions.md`
- `scope-authority-configuration-evidence.md`
- `company-subtype-taxonomy-management.md`
- `capability-flag-registry.md`

## Foundation Hardening Completion

The Tenant/Company Foundation hardening sequence is repository-complete only when the committed module files, not conversation text or PR body text, contain the closure decisions for:

- Flag 3: parent suspension no-cascade.
- Flag 4: parent archival child-first validation.
- Flag 10: invitation-only onboarding and `activation_evidence_ref`.
- Flags 12, 13, and 15: the `child_onboarding_request` hybrid model.
- Capability Flag Registry milestone, including `parent_management.request_child_onboarding`, `check_access`, and `company.capability_changed`.

Catalog drafting remains paused until Codex confirms repo-completeness against these files. Conversation-complete decisions are not treated as repo-complete until committed here.

## Logs & Audit Access Authority Coordination Scope

This section documents the Tenant Company coordination scope for Logs & Audit access roles and capabilities. This is the Tenant Company-side coordination layer required to operate Logs & Audit File Tracking PR-A through PR-E in production. PR-E explicitly closed the planned Logs & Audit A-through-E documentation hardening sequence and deferred approximately 17 authority dependencies to Tenant Company. This coordination section resolves those dependencies on the Tenant Company side; no Logs & Audit file is modified.

### What this coordination delivers

- **Audit Capability Family Registry.** Adds exactly 34 audit-specific capabilities organized into 8 capability families to the existing Tenant capability registry: Search / Query, View / Retrieval, Review, Export, Legal Hold, Governance, Service Identity, Break-Glass.
- **Audit Role Bundle compositions (documented composites only; not source of truth).** 9 role bundles: Compliance / Audit Reviewer, Raw Evidence Access Authorizer, Legal Hold Authority, Break-Glass Approver, Reviewer / Investigator, Audit Export Reviewer, Evidence Search User, Evidence Review Manager, System Admin Evidence Supervisor.
- **Service Identity Audit Capability Profiles (documented composites only).** 2 profiles: Service Identity Evidence Reader, Service Identity Evidence Exporter.
- **Access Decision Model.** The architectural shape of the `check_access` audit-flow: Tenant decides authority; Logs & Audit records outcome in the PR-D hardened Audit Access Record.
- **Parent / Child Audit Scope Governance.** Cross-tenant denied by default; parent to child requires explicit parent / child audit scope evidence + capability; child to parent or sibling denied by default; lifecycle-aware blocking; CIXCI System Admin override explicit / scoped / reasoned / logged.
- **Raw Evidence Access Authority.** Purpose-bound, time-bound, separation of duties preferred.
- **Break-Glass Governance.** Distinct requester capability; separate approver bundle; reason required; time-bound (exact duration is configurable and business-policy controlled; "1 hour" is suggested guidance only, not locked policy); post-hoc compliance review; logged via PR-D hardened Audit Access Record with `break_glass_flag = true`.
- **Legal Hold Authority.** Explicit `apply` / `release` / `view` / `view_scope` capabilities; release separation of duties preferred. **`legal_hold.override_retention_purge` REJECTED and NOT introduced**: legal hold BLOCKS purge; release is the canonical lift mechanism. No override path is permitted.
- **Audit Export Authority.** Separate `create` / `view` / `download` / `approve_raw_export` / `view_export_history` capabilities; company-scoped; raw export requires PR-D raw access authority; service identity export requires Service Identity Evidence Exporter profile.
- **Service Identity Audit Authority.** Scoped, expiring / rotatable, logged like human access; no broad tenant-wide defaults.
- **Capability Revocation Active Session / Saved Search Authority Recheck.** Per PR-E OQ-SR-1 locked guidance, active sessions and saved searches re-evaluate authority at next access.
- **Zero new Tenant events.** Six existing Tenant event surfaces extended via documented discriminator / context extensions.
- **13 new numbered workflows.**

### Core discipline: capability-first authorization

Capabilities are the source of truth. Role bundles are documented composites only. `check_access` evaluates effective capabilities, scope, lifecycle state, service identity authority, approval evidence, separation of duties, and sensitivity inputs - `check_access` does NOT evaluate role labels. Role bundles in `permissions.md` are convenient labels for capability sets; redefining a bundle's composition changes which capabilities its members hold and propagates through existing Tenant capability-change events. Removing or renaming a bundle does NOT change `check_access` behavior.

System Admin Evidence Supervisor does NOT imply self-approval automatically; separation of duties is preferred wherever feasible. Self-approval cases (System Admin self-approving raw access or break-glass; buyer / vendor raw access; break-glass duration; tenant-scoped legal hold authority) are retained as open business decisions with documented defaults.

### What this coordination intentionally does NOT do

- No modifications to any Logs & Audit file (`modules/logs-audit-file-tracking/*` unchanged).
- No modifications to `openapi-contracts.md`.
- No modifications to `company-subtype-taxonomy-management.md`.
- No modifications to `source-updates-buyer-setup-child-operations.md`.
- No modifications to `source-updates-company-onboarding-visibility.md`.
- No modifications to any other module or platform file.
- No new Tenant events introduced.
- No `legal_hold.override_retention_purge` capability (REJECTED and NOT introduced).
- No per-evidence-type, per-family, UI-specific, AI-specific, or Warranty-specific audit capabilities.
- No concrete HTTP routes, request / response payloads, pagination contracts, authentication header specs, or error code catalogs.
- No concrete `check_access` response schema.
- No UI / UX design.
- No source-module behavior changes.
- No rename or removal of any existing Tenant Company baseline content.
- No rename or removal of any Logs & Audit PR-A through PR-E content.

### Files modified by this coordination (exactly 14)

All in `modules/tenant-company-model/`:

- `README.md`
- `spec.md`
- `data-model.md`
- `permissions.md`
- `capability-flag-registry.md`
- `scope-authority-configuration-evidence.md`
- `boundary-contracts.md`
- `workflows.md`
- `events.md`
- `event-contracts.md`
- `api-contracts.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md`, `company-subtype-taxonomy-management.md`, `source-updates-buyer-setup-child-operations.md`, and `source-updates-company-onboarding-visibility.md` intentionally remain unmodified.

### Required cleanups applied

1. **Capability count cleanup.** APPLY.md and verification sections use exact final count `34 capabilities`, not "approximately". Prose may use the round figure for readability; technical sections use exact.
2. **Role bundle wording cleanup.** Every reference to "role bundle" is paired with "documented composite only". Role bundles are never described as "roles" without that clarification. `check_access` evaluates effective capabilities + scope + lifecycle state + service identity authority + approval evidence + separation of duties + sensitivity inputs; NEVER role labels.
3. **Break-glass duration cleanup.** Time-bound grant is REQUIRED. "1 hour" appears only as suggested configurable guidance, never as locked policy. Exact duration remains tenant-policy controlled.

### Boundary discipline reaffirmed

- **Tenant Company decides authority.** Logs & Audit records outcome. Tenant does NOT mutate Logs & Audit records. Logs & Audit does NOT become permission authority.
- **Source modules own** operational records and business decisions.
- **Analytics owns** BI / reporting / dashboards / metrics / trends.
- **Notification owns** delivery. Tenant may identify eligible recipients.
- **Integration owns** transport. Tenant owns service / API identity authority.
- **CPA / legal / DevOps own** concrete retention duration values (per PR-D named retention policy references).
- **Compliance / legal own** legal hold authority decisions.

### Application discipline

This coordination is additive documentation-and-architecture across the 14 target Tenant files. Existing Tenant baseline content and Logs & Audit PR-A through PR-E content are preserved by reference without modification. See `APPLY.md` in the PR bundle for tool-agnostic application instructions, the explicit stop-before-commit rule, and prohibitive-only references to destructive commands.
