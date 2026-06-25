# Tenant Company Test Scenarios

These proposal-level scenarios validate Tenant Company scope, authority, eligibility, projection generation, event naming, configuration evidence, controlled company subtype taxonomy, invitation-only onboarding, activation evidence, capability registry behavior, child onboarding requests, parent lifecycle closures, and final consolidation readiness.

## Scenario Inventory

Scenario families:

- INV: invitation-only onboarding.
- AE: activation evidence.
- CA: capability access / `check_access`.
- CO: `child_onboarding_request`.
- PS: parent suspension.
- PA: parent archival.
- PE: parent/entity intersection edge cases.
- ST: subtype taxonomy.
- FC: final consolidation / repo-completeness.

## Boundary Integrity

- Tenant Company provides scope/authority evidence and does not mutate Product Catalog, Device Catalog, Pricing, Invoice Management, Order Routing, Fulfillment/Returns, Procurement, Notification, Integration, Analytics, Media, Launch/Event, Logs & Audit, AI Agent Services, Warranty, Accounting, or Payment records.
- Product Catalog consumes Tenant buyer/vendor/channel/Product Type/subtype/capability evidence instead of inferring eligibility from prior exports, subtype labels, or buyer selling state.
- Pricing consumes pricing mode, commission configuration inputs, and subtype pricing/channel input evidence and does not infer buyer pricing mode independently.
- Invoice Management and Analytics consume Tenant access/redaction/subtype classification evidence and do not grant access independently.
- Notification Platform Service consumes recipient scope and does not infer eligible recipients from product/order/invoice records.
- Integration Management consumes API/integration user authority and owns external delivery/receipt evidence.
- AI Agent Services consumes Tenant AI action authority and cannot bypass Tenant approvals.

## INV - Invitation-Only Onboarding

- INV-01: unauthenticated company creation is unavailable.
- INV-02: open self-onboarding does not create a CIXCI Company.
- INV-03: auth-provider account creation does not grant CIXCI platform access.
- INV-04: CIXCI System Admin creates Company in Pending Setup, not Active.
- INV-05: Company creation grants no default capabilities.
- INV-06: private invitation is required for user bootstrap.
- INV-07: final activation remains CIXCI-controlled.

## AE - Activation Evidence

- AE-01: Company cannot become Active without `activation_evidence_ref`.
- AE-02: `activation_evidence_ref` includes policy reference, operational checklist external reference where applicable, setup flag snapshot, integrity marker, reviewer, version/hash, freshness, decision, supersession, and audit reference.
- AE-03: setup flags remain provisional where intended.
- AE-04: operational checklist details are not hard-coded into the spec.
- AE-05: stale, missing, or conflicting activation evidence blocks final activation or routes to review.

## CA - Capability Access / `check_access`

- CA-01: `capability-flag-registry.md` exists and is included in the module index.
- CA-02: `parent_management.*` has six registered v1 flags.
- CA-03: `parent_management.manage_capabilities_of_children` is deferred and not v1.
- CA-04: `setup.*` is provisional.
- CA-05: `agent.*` is reserved.
- CA-06: `catalog.*` is anticipated but not registered.
- CA-07: `check_access` is the canonical internal authority gate.
- CA-08: external APIs do not expose direct `check_access` access.
- CA-09: `company.capability_changed` is emitted for capability assignment, revocation, effective-range, and deprecation changes.
- CA-10: parent `parent_management.*` flags are held but ineffective while parent is Suspended.

## CO - Child Onboarding Request

- CO-01: parent Company Admin with effective `parent_management.request_child_onboarding` can submit `child_onboarding_request`.
- CO-02: request stores CIXCI-owned lifecycle/state spine and `external_evidence_ref` for substantive external operational content.
- CO-03: CIXCI System Admin approval creates child Company in Pending Setup, not Active.
- CO-04: approval issues bootstrap invitation and links child to originating request.
- CO-05: child still requires invitation acceptance, setup, `activation_evidence_ref`, and final activation.
- CO-06: five v1 events exist: submitted, approved, rejected, withdrawn, expired.
- CO-07: no `child_onboarding_request.under_review` event exists at v1.
- CO-08: approval failure is observably atomic and audit-ready.

## PS - Parent Suspension

- PS-01: parent suspension does not automatically suspend children.
- PS-02: parent restoration does not automatically restore children.
- PS-03: child lifecycle remains independent.
- PS-04: no child `company.suspended` or `company.restored` side-effect events are emitted.
- PS-05: no suspension cascade audit chain is created.
- PS-06: `parent_management.suspend_children` permits explicit specific direct-child suspension only.
- PS-07: CIXCI System Admin can act on children during parent Suspended with audit evidence.

## PA - Parent Archival

- PA-01: parent archival is blocked unless all direct children are Archived.
- PA-02: parent archival does not automatically archive children.
- PA-03: parent admins cannot archive children through `parent_management.*`.
- PA-04: archival validation rejection is audit-only and includes blocking child references/states.
- PA-05: re-parenting / child migration remains future ADR-driven.
- PA-06: deeper nesting remains future ADR-driven.

## PE - Parent / Entity Intersection Edge Cases

- PE-01: linking standalone company/entity to parent preserves historical evidence.
- PE-02: child override does not leak to siblings.
- PE-03: conflicting parent/child scope creates review-required evidence.
- PE-04: Pending Setup child restrictions remain even when parent is Active.
- PE-05: personal email exception evidence, where applicable, does not bypass role/scope authority.

## ST - Controlled Company Subtype Taxonomy

- ST-01: hard-coded subtype label does not grant behavior.
- ST-02: company setup rejects free-text company type/subtype values when no active controlled taxonomy record exists.
- ST-03: Super Admin creates Buyer subtype Reseller as inactive/draft.
- ST-04: Reseller subtype cannot activate until required configuration is complete.
- ST-05: activation blocks when permission template, pricing/channel configuration, or onboarding requirement is missing.
- ST-06: activation blocked event has a matching event contract.
- ST-07: subtype configuration evidence generated event has a matching event contract.
- ST-08: subtype assignment preserves historical evidence.
- ST-09: subtype reassignment produces downstream impact preview.
- ST-10: retired subtype cannot be assigned.
- ST-11: downstream module consumes subtype configuration evidence, not subtype label.

## FC - Final Consolidation / Repo-Completeness

- FC-01: README lists all canonical module files including `capability-flag-registry.md`.
- FC-02: event inventory contains committed event names and matching event-contract coverage.
- FC-03: downstream notes exist for Catalog, Pricing, Buyer Discovery, Orders, Invoice Reporting, Integrations, AI Agent Services, Reporting / Analytics, and Notifications.
- FC-04: closure log contains Flags 3, 4, 10, 12, 13, and 15.
- FC-05: subtype config evidence is aligned between `company-subtype-taxonomy-management.md`, `data-model.md`, and `spec.md`.
- FC-06: cross-references resolve inside the Tenant/Company module.
- FC-07: conversation-complete vs repo-complete distinction is documented.
- FC-08: Catalog remains paused until Codex confirms repo-completeness.

## Existing Authority Scenarios

- Direct authority records carry Common Authority Evidence Controls.
- Downstream action is blocked or routed to review when direct authority evidence is stale, expired, superseded, ignored, or conflicting.
- Tenant Scope Evidence is generated from source record updates and superseded without rewriting historical records.
- Buyer/vendor relationship evidence blocks downstream eligibility when suspended or stale.
- Import/export authority blocks upload, preview, confirm, destructive apply, schedule, download, revoke, re-export, and act-on-behalf actions without correct scope.
- Pricing mode and commission input evidence is consumed by Pricing but never calculated by Tenant Company.
- Channel/Product Type/PO authority evidence remains Tenant-owned while Product Catalog, Pricing, and Procurement retain their own boundaries.
- Report/invoice, notification, integration, and AI authority evidence is consumed by owning modules without moving execution ownership into Tenant Company.

## Logs & Audit Access Authority Test Scenarios

This section documents test scenarios covering the Logs & Audit access authority coordination. All scenarios are acceptance-level and reference-first; no concrete test fixtures, payloads, or implementation are specified. Existing Tenant Company test scenarios are preserved without modification.

### Scope coverage

Scenarios cover: 8 capability families, 9 role bundles (documented composites only), 2 service identity profiles, `check_access` audit-flow, parent / child scope, raw access, break-glass, legal hold authority, audit export authority, service identity audit authority, lifecycle blocking, capability revocation recheck, authority decision handoff to Logs & Audit, separation of duties, self-approval defaults.

### Capability family scenarios

#### Scenario CF-1 - Search/Query family capability evaluation

Given an actor holding `audit_evidence.search` and `audit_evidence.view_redacted`, when the actor invokes `check_access` for `evidence.view_redacted` with non-sensitive filter, then Tenant returns `decision = allow`. When the actor invokes with sensitive filter without holding `audit_evidence.search_sensitive`, Tenant returns `decision = deny` with `reason_code = capability_missing`.

#### Scenario CF-2 - View/Retrieval family default redacted view

Given an actor holding only `audit_evidence.view_redacted`, when actor invokes `check_access` for `evidence.view_redacted` with `requested_view_type = redacted`, Tenant returns `decision = allow`. When actor invokes with `requested_view_type = raw`, Tenant returns `decision = deny` with `reason_code = capability_missing`.

#### Scenario CF-3 - Review family create_session vs manage_session

Given an actor holding `audit_review.create_session` but NOT `audit_review.manage_session`, when actor creates a session, Tenant returns `decision = allow`. When actor attempts to transition session status, Tenant returns `decision = deny` with `reason_code = capability_missing`.

#### Scenario CF-4 - Export family create vs download separation

Given an actor holding `audit_export.create` but NOT `audit_export.download`, when actor creates an Audit Report Export Record, Tenant returns `decision = allow`. When actor attempts to download the generated artifact, Tenant returns `decision = deny` with `reason_code = capability_missing`. (Audit Export Reviewer holds download separate from create.)

#### Scenario CF-5 - Legal Hold family apply vs view distinction

Given an actor holding `legal_hold.view` but NOT `legal_hold.apply`, when actor invokes `legal_hold.apply`, Tenant returns `decision = deny` with `reason_code = capability_missing`. When actor invokes `legal_hold.view`, Tenant returns `decision = allow`.

#### Scenario CF-6 - Governance family create vs approve separation

Given an actor holding `redaction_transform.create` but NOT `redaction_transform.approve`, when actor creates a new Redaction Transformation Record, Tenant returns `decision = allow` for creation. When actor approves the record for production, Tenant returns `decision = deny` with `reason_code = capability_missing`.

#### Scenario CF-7 - Service Identity family scoped access

Given a service identity holding Service Identity Evidence Reader profile (documented composite only), when service identity invokes `evidence.search` within registered scope, Tenant returns `decision = allow`. When service identity invokes outside registered scope, Tenant returns `decision = deny` with `reason_code = service_identity_out_of_scope`.

#### Scenario CF-8 - Break-Glass family distinct from raw access

Given an actor holding `audit_evidence.request_raw` but NOT `audit_evidence.break_glass`, when actor invokes break-glass, Tenant returns `decision = deny` with `reason_code = capability_missing`. The two are distinct capabilities.

### Role bundle composition scenarios (documented composites only)

#### Scenario RB-1 - Compliance / Audit Reviewer composition

Given an actor assigned the Compliance / Audit Reviewer bundle (documented composite only), when `check_access` evaluates `evidence.search_sensitive`, Tenant returns `decision = allow`. When `check_access` evaluates `evidence.view_raw` (without separate approval), Tenant returns `decision = deny` with `reason_code = capability_missing`. The bundle does NOT include raw view, raw approval, or break-glass.

#### Scenario RB-2 - Raw Evidence Access Authorizer composition

Given an actor assigned the Raw Evidence Access Authorizer bundle (documented composite only), when `check_access` evaluates `approve_raw` for a request from a different actor, Tenant returns `decision = allow`. When `check_access` evaluates `request_raw`, Tenant returns `decision = deny` with `reason_code = capability_missing`. The bundle is approver-only; requester capability is held separately.

#### Scenario RB-3 - Legal Hold Authority composition

Given an actor assigned the Legal Hold Authority bundle (documented composite only), when `check_access` evaluates `legal_hold.apply`, Tenant returns `decision = allow`. When the same actor attempts `legal_hold.release` for a hold the actor applied on a high-sensitivity matter, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation` per default policy (configurable; default ON for high-sensitivity holds).

#### Scenario RB-4 - Break-Glass Approver composition

Given an actor assigned the Break-Glass Approver bundle (documented composite only), when `check_access` evaluates a break-glass approval for a request from a different actor, Tenant returns `decision = allow`. When the approver attempts to approve their own break-glass request, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation`.

#### Scenario RB-5 - Reviewer / Investigator composition

Given an actor assigned the Reviewer / Investigator bundle (documented composite only), when `check_access` evaluates `audit_review.create_session`, Tenant returns `decision = allow`. When the actor attempts `audit_review.manage_session`, Tenant returns `decision = deny` with `reason_code = capability_missing` (managed by Evidence Review Manager).

#### Scenario RB-6 - Audit Export Reviewer composition

Given an actor assigned the Audit Export Reviewer bundle (documented composite only), when `check_access` evaluates `audit_export.download`, Tenant returns `decision = allow`. When the actor attempts `audit_export.create`, Tenant returns `decision = deny` with `reason_code = capability_missing` (separation of duties from create).

#### Scenario RB-7 - Evidence Search User composition

Given an actor assigned the Evidence Search User bundle (documented composite only), when `check_access` evaluates `audit_evidence.search` with non-sensitive filter, Tenant returns `decision = allow`. When the actor attempts `audit_review.create_session`, Tenant returns `decision = deny` with `reason_code = capability_missing`.

#### Scenario RB-8 - Evidence Review Manager composition

Given an actor assigned the Evidence Review Manager bundle (documented composite only), when `check_access` evaluates `audit_review.close_session`, Tenant returns `decision = allow`. The bundle includes both Reviewer / Investigator capabilities and `manage_session` / `close_session`.

#### Scenario RB-9 - System Admin Evidence Supervisor non-self-approval

Given an actor assigned the System Admin Evidence Supervisor bundle (documented composite only) holding `audit_evidence.request_raw`, when the same actor attempts `audit_evidence.approve_raw` for their own request, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation`. **System Admin Evidence Supervisor does NOT imply self-approval automatically.** Tenant policy MAY override; override is logged.

### Service identity profile scenarios

#### Scenario SI-1 - Service Identity Evidence Reader profile

Given a service identity granted the Service Identity Evidence Reader profile (documented composite only) with registered scope `company_X` and `expiration_reference` 30 days from now, when service identity invokes `evidence.search` within `company_X`, Tenant returns `decision = allow`. When service identity invokes outside `company_X`, Tenant returns `decision = deny` with `reason_code = service_identity_out_of_scope`. When credential is expired, Tenant returns `decision = deny` with `reason_code = capability_expired`.

#### Scenario SI-2 - Service Identity Evidence Exporter profile

Given a service identity granted the Service Identity Evidence Exporter profile (documented composite only), when service identity invokes `audit_export.create` within scope, Tenant returns `decision = allow`. Without the profile explicitly granted, default is `decision = deny` with `reason_code = capability_missing`.

### check_access audit-flow scenarios

#### Scenario CA-1 - Allow path with redacted view

Given an actor holding `audit_evidence.view_redacted` with appropriate scope, when Logs & Audit calls `check_access` with target evidence in actor's tenant, `requested_view_type = redacted`, `requested_redaction_audience = internal`, Tenant returns `decision = allow` + `reason_code` (success-side identifier) + `matched_authority_evidence_reference` to the capability assignment. Logs & Audit creates PR-D hardened Audit Access Record with `access_result = granted`, `view_type = redacted`, `redaction_class_evaluated` populated, `redaction_transformation_reference` populated.

#### Scenario CA-2 - Deny path with missing capability

Given an actor holding no audit capabilities, when Logs & Audit calls `check_access` for `evidence.search`, Tenant returns `decision = deny` + `reason_code = capability_missing`. Logs & Audit creates PR-D hardened Audit Access Record with `access_result = denied`, `denial_reason = capability_missing`.

#### Scenario CA-3 - Review (non-terminal) path

Given an actor holding `audit_evidence.request_raw` requesting raw view, when Logs & Audit calls `check_access`, Tenant returns `decision = review` + `reason_code = approval_required`. Logs & Audit creates PR-D hardened Audit Access Record with `access_result = attempted` (non-terminal). On subsequent approval / denial, terminal records follow.

#### Scenario CA-4 - Sensitivity input evaluation

Given an actor holding `audit_evidence.search` and `audit_evidence.view_redacted` but NOT `audit_evidence.view_restricted_flags`, when target evidence has `restricted_evidence = true`, Tenant returns `decision = deny` with `reason_code = sensitivity_mismatch` for visibility into the restricted flag (PR-E Restricted-Flag-Visibility-Scoped Rule).

#### Scenario CA-5 - Tenant decides; Logs records handoff

Given Tenant returns `decision = allow` + `decision_effective_until` populated for a time-bound grant, Logs & Audit creates PR-D hardened Audit Access Record with `access_result = granted`, populates all PR-D evaluated fields, populates `prior_approval_reference`, populates `view_type` per request. Tenant does NOT create the Audit Access Record. Logs & Audit does NOT make the access decision.

### Parent / child scope scenarios

#### Scenario PC-1 - Cross-tenant denied by default

Given an actor in tenant A invokes `check_access` for evidence in unrelated tenant B (B is not a child of A), Tenant returns `decision = deny` with `reason_code = cross_tenant_denied`. CIXCI System Admin override would be required for access.

#### Scenario PC-2 - Parent to child requires explicit scope evidence

Given an actor in parent tenant A holds `audit_evidence.search` but NOT Parent / Child Audit Scope Evidence for child tenant B, when actor invokes `check_access` for evidence in child B, Tenant returns `decision = deny` with `reason_code = parent_child_unauthorized`. With explicit Parent / Child Audit Scope Evidence + appropriate capability, Tenant returns `decision = allow`.

#### Scenario PC-3 - Child to parent denied by default

Given an actor in child tenant B invokes `check_access` for evidence in parent tenant A, Tenant returns `decision = deny` with `reason_code = parent_child_unauthorized`. CIXCI System Admin override would be required for access.

#### Scenario PC-4 - Child to sibling denied by default

Given an actor in child tenant B invokes `check_access` for evidence in sibling child tenant C, Tenant returns `decision = deny` with `reason_code = parent_child_unauthorized`. CIXCI System Admin override would be required for access.

#### Scenario PC-5 - Suspended parent loses audit authority

Given parent tenant A is suspended, when actor in A (admin) invokes `check_access` for evidence in child tenant B with Parent / Child Audit Scope Evidence, Tenant returns `decision = deny` with `reason_code = suspended_actor`. CIXCI System Admin override would be required.

### Raw access scenarios

#### Scenario RA-1 - Raw access request with required reason

Given an actor holding `audit_evidence.request_raw` invokes `check_access` for raw view, when `access_reason_reference` is provided, Tenant returns `decision = review` with `reason_code = approval_required`. When `access_reason_reference` is missing, Tenant returns `decision = deny` with `reason_code = capability_missing` (reason requirement is enforced).

#### Scenario RA-2 - Separation of duties default

Given the same actor holds both `request_raw` and `approve_raw` and attempts self-approval, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation`. Tenant policy MAY override; override is logged.

#### Scenario RA-3 - Time-bound grant

Given a Raw Access Approval Evidence record has `decision_effective_until` 4 hours from approval, when actor invokes `view_raw` within the window, Tenant returns `decision = allow`. After expiry, Tenant returns `decision = deny` with `reason_code = approval_expired`.

#### Scenario RA-4 - CIXCI System Admin self-approval default

Given a System Admin Evidence Supervisor actor attempts to self-approve raw access, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation` per default policy. Tenant policy MAY override (open business decision); override is logged.

#### Scenario RA-5 - Buyer / vendor raw view default

Given a buyer admin actor attempts to request raw access, by default the buyer bundle does NOT include `audit_evidence.request_raw`; Tenant returns `decision = deny` with `reason_code = capability_missing`. Tenant policy MAY override (open business decision).

### Break-glass scenarios

#### Scenario BG-1 - Break-glass reason required

Given an actor holding `audit_evidence.break_glass` initiates break-glass without `access_reason_reference`, Tenant returns `decision = deny` with `reason_code = capability_missing` (reason requirement).

#### Scenario BG-2 - Break-glass time-bound grant (configurable duration)

Given Break-Glass Approver approves a break-glass request with `grant_effective_until` set per tenant policy, when actor invokes break-glass-flagged access within window, Tenant returns `decision = allow`. After expiry, Tenant returns `decision = deny` with `reason_code = break_glass_grant_expired`. **The exact duration is configurable / business-policy controlled; tenant policy controls; "1 hour" is suggested guidance only, NOT locked policy.**

#### Scenario BG-3 - Break-glass separation from requester

Given the same actor holds both `audit_evidence.break_glass` (requester) and Break-Glass Approver bundle, when actor attempts self-approval, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation`.

#### Scenario BG-4 - Break-glass logged with flag

Given Break-Glass Approver approves a break-glass request, when actor invokes break-glass-flagged access, Logs & Audit creates PR-D hardened Audit Access Record with `break_glass_flag = true`, `view_type` per request, full sensitivity inputs populated.

#### Scenario BG-5 - Post-hoc compliance review triggered

Given a break-glass grant is created, the Break-Glass Grant Evidence record is created with `post_hoc_review_status = pending`. The post-hoc review (concrete review workflow is future implementation) updates the status to `reviewed_approved` or `reviewed_with_findings`.

### Legal hold scenarios

#### Scenario LH-1 - Legal Hold Authority apply

Given an actor assigned the Legal Hold Authority bundle (documented composite only), when actor invokes `legal_hold.apply` with `reason_reference` populated, Tenant returns `decision = allow`. Without `reason_reference`, Tenant returns `decision = deny` with `reason_code = capability_missing` (reason requirement).

#### Scenario LH-2 - Apply / release separation preferred

Given the same actor applied a high-sensitivity legal hold and attempts to release the same hold, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation` per default policy. Tenant policy MAY configure.

#### Scenario LH-3 - No override_retention_purge capability

Given an actor attempts to invoke `legal_hold.override_retention_purge`, Tenant returns `decision = deny` with `reason_code = capability_missing` (capability not introduced). Release via `legal_hold.release` is the canonical lift mechanism.

#### Scenario LH-4 - Parent admin viewing child legal hold flags

Given a parent admin holds `audit_evidence.view_legal_hold_flags` AND Parent / Child Audit Scope Evidence for child tenant, when admin invokes `check_access` for legal hold flag visibility in child, Tenant returns `decision = allow`. Without the audit scope evidence, Tenant returns `decision = deny` with `reason_code = parent_child_unauthorized`.

#### Scenario LH-5 - Default authority audience CIXCI / compliance-only

Given a tenant admin (not CIXCI / compliance) attempts to receive Legal Hold Authority bundle grant, by default the grant is denied (Tenant policy / future regulatory review may extend to tenant-scoped authority; open business decision).

### Audit export scenarios

#### Scenario AE-1 - Export create vs download separation

Given an actor holds `audit_export.create` but NOT `audit_export.download`, when actor creates an Audit Report Export Record, Tenant returns `decision = allow`. When actor attempts to download the artifact, Tenant returns `decision = deny` with `reason_code = capability_missing`.

#### Scenario AE-2 - Audit export company-scoped

Given an actor with `audit_export.create` attempts to create an export targeting an unrelated tenant, Tenant returns `decision = deny` with `reason_code = cross_tenant_denied`.

#### Scenario AE-3 - Raw export per-item escalation

Given an actor with `audit_export.create` attempts an export with raw items without `audit_export.approve_raw_export`, raw items are rendered redacted per PR-E Export-Default-Redacted Rule. With per-item Raw Evidence Access Authorizer approval, raw items are included.

#### Scenario AE-4 - Service identity audit export requires profile

Given a service identity without Service Identity Evidence Exporter profile attempts `audit_export.create`, Tenant returns `decision = deny` with `reason_code = capability_missing`. With the profile explicitly granted, the export proceeds.

#### Scenario AE-5 - Audit export download logged via PR-D

Given a Compliance / Audit Reviewer actor downloads an audit export artifact, Logs & Audit creates PR-D hardened Audit Access Record per Workflow 13 handoff. Each download produces a separate Audit Access Record per PR-E Export-Access-Logged-Via-PR-D Rule.

### Service identity scenarios

#### Scenario SR-1 - Service identity scoped access

Given a service identity has registered scope limited to `tenant_X`, when service identity invokes audit search outside `tenant_X`, Tenant returns `decision = deny` with `reason_code = service_identity_out_of_scope`.

#### Scenario SR-2 - Service identity expiring credentials

Given a service identity credential's `expiration_reference` has elapsed, when service identity invokes any audit capability, Tenant returns `decision = deny` with `reason_code = capability_expired`.

#### Scenario SR-3 - Service identity rotation event preserved

Given a service identity credential is rotated, the existing `tenant.api-integration-user-authority-updated` event is emitted with `service_identity_capability_profile` discriminator. Capability profile is preserved across rotation.

#### Scenario SR-4 - Service identity access logged like human access

Given any service identity invokes any audit capability, Logs & Audit creates PR-D hardened Audit Access Record with `service_trigger_reference` populated per PR-D Service-Identity-Access-Logged Rule. Service identity access is logged identically to human access.

### Lifecycle blocking scenarios

#### Scenario LB-1 - Suspended actor blocked

Given an actor in a suspended company invokes `check_access` for any audit capability, Tenant returns `decision = deny` with `reason_code = suspended_actor`.

#### Scenario LB-2 - Pending Setup actor blocked

Given an actor in a `pending_setup` company invokes any audit capability, Tenant returns `decision = deny` with `reason_code = lifecycle_blocked`.

#### Scenario LB-3 - Inactive actor blocked

Given an actor in an `inactive` company invokes any audit capability, Tenant returns `decision = deny` with `reason_code = lifecycle_blocked`.

#### Scenario LB-4 - Suspended target blocked

Given a valid actor invokes `check_access` for evidence in a suspended target company without CIXCI System Admin override, Tenant returns `decision = deny` with `reason_code = suspended_target`.

#### Scenario LB-5 - Inactive target historical access

Given a valid actor invokes `check_access` for historical evidence in an inactive target company per existing baseline lifecycle blocking rules, Tenant returns `decision = allow`.

### CIXCI System Admin override scenarios

#### Scenario SA-1 - CIXCI System Admin cross-tenant override with reason

Given CIXCI System Admin invokes `check_access` for evidence in an unrelated tenant with explicit `override_reason_reference`, Tenant creates CIXCI System Admin Override Evidence record and returns `decision = allow`. Logs & Audit creates PR-D hardened Audit Access Record with `access_class_evaluated = system_admin_only`.

#### Scenario SA-2 - CIXCI System Admin override without reason denied

Given CIXCI System Admin invokes cross-tenant `check_access` without `override_reason_reference`, Tenant returns `decision = deny` with `reason_code = capability_missing` (reason requirement enforced).

#### Scenario SA-3 - System Admin Evidence Supervisor non-self-approval

Given a System Admin Evidence Supervisor actor (documented composite only) holding `request_raw` attempts to also approve their own raw request, Tenant returns `decision = deny` with `reason_code = separation_of_duties_violation`. System Admin role does NOT imply self-approval automatically.

### Capability revocation recheck scenarios

#### Scenario CR-1 - Capability revoked during active session

Given an actor's `audit_evidence.search_sensitive` is revoked while the actor has an active Evidence Search Session with sensitive filter, when actor invokes the next search operation, Tenant returns `decision = deny` with `reason_code = capability_missing` (re-evaluated at next access per Workflow 12).

#### Scenario CR-2 - Capability revoked affects saved search

Given an actor's `audit_evidence.search` is revoked while the actor has a saved search, when actor next executes the saved search, Tenant returns `decision = deny` with `reason_code = capability_missing` per PR-E OQ-SR-1 locked guidance (re-evaluate at execution time).

#### Scenario CR-3 - Capability revocation emits existing event

Given an audit capability is revoked, existing `company.capability_changed` event is emitted with `capability_family` discriminator. No new event is introduced.

### Tenant decides / Logs records handoff scenarios

#### Scenario HO-1 - Allow with full evidence handoff

Given Tenant returns `decision = allow` + `matched_authority_evidence_reference` + `decision_effective_until` + sensitivity inputs, Logs & Audit creates PR-D hardened Audit Access Record with `access_result = granted`, `view_type` per request, all PR-D evaluated fields populated.

#### Scenario HO-2 - Deny with reason_code handoff

Given Tenant returns `decision = deny` + `reason_code`, Logs & Audit creates PR-D hardened Audit Access Record with `access_result = denied`, `denial_reason = reason_code`.

#### Scenario HO-3 - Review with attempted access_result

Given Tenant returns `decision = review`, Logs & Audit creates PR-D hardened Audit Access Record with `access_result = attempted` (non-terminal). Subsequent terminal decisions create additional records per PR-D access_result terminality discipline.

#### Scenario HO-4 - Tenant does NOT mutate Logs & Audit records

Tenant `check_access` returns a decision but does NOT create or modify any Logs & Audit record. Logs & Audit alone creates PR-D hardened Audit Access Records.

#### Scenario HO-5 - Logs & Audit does NOT make permission decisions

In no scenario does Logs & Audit return an authority decision independent of Tenant `check_access`. PR-D Tenant-Company-Owns-Authority Rule applies.

### Scenario coverage summary

- Capability family scenarios: 8 (CF-1 through CF-8).
- Role bundle composition scenarios: 9 (RB-1 through RB-9).
- Service identity profile scenarios: 2 (SI-1, SI-2).
- check_access audit-flow scenarios: 5 (CA-1 through CA-5).
- Parent / child scope scenarios: 5 (PC-1 through PC-5).
- Raw access scenarios: 5 (RA-1 through RA-5).
- Break-glass scenarios: 5 (BG-1 through BG-5).
- Legal hold scenarios: 5 (LH-1 through LH-5).
- Audit export scenarios: 5 (AE-1 through AE-5).
- Service identity scenarios: 4 (SR-1 through SR-4).
- Lifecycle blocking scenarios: 5 (LB-1 through LB-5).
- CIXCI System Admin override scenarios: 3 (SA-1 through SA-3).
- Capability revocation recheck scenarios: 3 (CR-1 through CR-3).
- Tenant decides / Logs records handoff scenarios: 5 (HO-1 through HO-5).

Total acceptance scenarios in this section: 69.

### Scenarios intentionally NOT included

- Concrete payload schemas. Reference-first.
- Concrete error code mappings. Future API.
- Concrete UI test scenarios. Future UX / UI.
- Concrete propagation latency tests. Implementation.
- Concrete service identity rotation timing tests. Implementation.
- Source-module-specific authority test scenarios. Source-module PRs.
- Logs & Audit-specific test scenarios. Logs & Audit module.
- Cross-PR integration test scenarios. Future integration testing.
