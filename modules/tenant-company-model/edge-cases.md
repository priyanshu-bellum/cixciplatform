# Tenant Company Edge Cases

These proposal-level edge cases pressure-test Tenant Company scope, authority, eligibility, projection generation, event naming, and configuration evidence. Detailed field requirements are defined in `scope-authority-configuration-evidence.md`.

## Common Authority Evidence Controls

- Downstream module consumes a direct authority record without freshness/expiration evidence.
- Downstream module consumes a direct authority record without applied-vs-ignored state.
- Direct authority record is superseded but the downstream consumer treats it as current.
- Direct authority record is ignored but still feeds Product Catalog, Pricing, Procurement, Notification, Integration, Analytics, Invoice, or AI behavior.
- Direct authority record has an approval/override reference missing where required.
- Access decision exists but redaction decision is missing for sensitive report/invoice/export access.
- Tenant Scope Evidence is current but a direct nested authority record is expired.

## Tenant Scope Evidence Projection

- Downstream module receives only a bare company id and no Tenant Scope Evidence reference.
- Tenant scope evidence is stale, expired, ignored, superseded, or conflicting.
- Tenant scope evidence has an access decision but no redaction decision.
- Tenant evidence freshness expires between selection and downstream confirmation.
- Tenant evidence source disposition is review-required but a downstream module treats it as allowed.
- Downstream module caches Tenant evidence and misses a supersession event.
- Downstream module attempts to author Tenant Scope Evidence directly.
- Projection repair/recompute is requested by a non-System Admin or non-platform maintenance actor.
- Projection recompute overwrites historical evidence used by invoice, export, analytics, notification, integration, AI, pricing, catalog visibility, or procurement records.

## Event Naming

- Consumer subscribes to old dot-style event name while the canonical docs use the hyphenated taxonomy.
- Sub-contract and event-contracts disagree on event name spelling.
- Event payload refers to `tenant.scope-evidence.updated` while canonical name is `tenant.scope-evidence-updated`.
- A new event family is introduced without updating `scope-authority-configuration-evidence.md`, `events.md`, and `event-contracts.md` together.

## Parent / Child Company

- Parent admin has partial child-entity permissions.
- Child admin attempts to access sibling entity data.
- Child entity override expands beyond parent scope without approval.
- Child entity override narrows parent access but downstream module consumes only parent evidence.
- Parent-level suspension conflicts with active child entity state.
- Standalone company/entity is linked to a parent after invoices, exports, integrations, or catalog relationships already exist.
- Parent/child override source is missing or not auditable.

## Buyer / Vendor Relationship

- One buyer child is approved while sibling is denied.
- Vendor-child to buyer-child relationships differ by region.
- Parent-level approval conflicts with child-level override.
- Buyer/vendor relationship is suspended after Product Catalog export or buyer selling state exists.
- Product Catalog, Pricing, Procurement, Invoice, Analytics, Integration, Notification, or AI attempts to infer eligibility from prior activity instead of Tenant relationship evidence.
- Geographic eligibility allows a region, but buyer/vendor relationship is denied or pending.

## Role / Permission Projection

- User belongs to multiple tenant scopes with conflicting roles.
- System Admin views buyer context without act-on-behalf authority.
- Read-Only User attempts export generation or destructive import apply.
- API / Integration User has parent scope but attempts child-level external action.
- Role/scope projection expires during a multi-step import/export workflow.
- Sensitive access is allowed but redaction evidence is missing.

## Import / Export Authority

- User may upload but may not validate, preview, confirm, or apply an import.
- User may preview an import but lacks confirmation authority.
- Destructive apply is requested without destructive action authority.
- Validation override is requested without override authority.
- Re-export is attempted without re-export authority.
- Scheduled export is configured by a user without schedule authority.
- Sensitive export download lacks sensitive export authority or redaction decision.
- Act-on-behalf export attempts to use the actor's company scope instead of the target company/entity scope.

## Pricing Mode And Commission Inputs

- Buyer pricing mode is defined at parent and child scope with conflicting values.
- Buyer/vendor relationship override supersedes parent pricing mode but Pricing receives only parent evidence.
- Superseded buyer pricing mode configuration is not ignored.
- Commission input exists for vendor-side but not buyer-side where Pricing requires both.
- Commission input is expired but Pricing treats it as current.
- Ignored commission input still feeds Pricing.
- Tenant Company field naming implies commission calculation rather than configuration input placement.
- Product Type-specific commission input conflicts with channel-specific commission input.

## Channel Eligibility

- Online/DTC enabled but Bulk Purchase Order disabled.
- Bulk Purchase Order enabled but PO functionality disabled.
- Retail eligibility enabled at parent scope but disabled at child scope.
- Owned Channel / Kaseory eligibility exists but Pricing lacks an owned-channel pricing exception reference.
- Product Catalog product channel flag exists but Tenant channel eligibility is missing.
- Invoice Management receives Pricing Channel evidence but Tenant channel eligibility is stale.
- Expired channel eligibility still allows downstream action.

## Product Type Enablement

- Buyer attempts access to a Product Type that is not enabled.
- Product Type enablement is active at parent scope but suspended at child/entity scope.
- Branded Product is enabled but licensed-property relationship is pending or expired.
- Product Catalog receives no explicit Tenant Product Type scope signal and must withhold eligibility-driven visibility.
- ADR-0007-controlled Product Type placeholder is introduced without Tenant enablement evidence.

## PO Functionality / Approval Authority

- PO action entry point is visible without Tenant PO functionality evidence.
- PO functionality is enabled but approval authority is missing.
- Approval threshold placeholder is stale or superseded.
- Approver role/scope projection is expired.
- Stale PO authority allows Procurement action.
- Procurement tries to infer PO authority from prior PO history instead of Tenant evidence.

## Report / Invoice Access And Redaction

- User can view invoice summary but not pricing-sensitive line fields.
- Vendor view leaks customer-sensitive buyer data.
- Buyer view leaks vendor-sensitive commission inputs.
- System Admin sensitive report export lacks recheck-before-download.
- Analytics consumes invoice access scope without redaction decision version.
- Logs & Audit evidence exists for download but Tenant access evidence was stale.

## Notification Recipient Scope

- Notification recipient scope is stale after user deprovisioning.
- Notification recipient scope expires but recipient remains eligible.
- Suppression/preference placeholder conflicts with recipient eligibility.
- Notification Platform Service infers recipients from order records instead of Tenant recipient scope.
- Suspended account remains in recipient scope.

## API / Integration User Authority

- Service account has connection access but no source-module API authority.
- External action authority is missing for a webhook-triggered mutation.
- Integration credential remains active after Tenant API authority expiration.
- API user authority is scoped to parent but request mutates child data without inherited child authority.
- Superseded API/integration authority still allows external action.

## AI Action Authority

- AI recommendation is allowed but draft mutation is not.
- AI external action lacks Integration authority.
- AI action approval authority is stale or superseded.
- AI action authority expires but AI action still proceeds.
- AI Agent Services attempts to define eligibility without Tenant authority evidence.
- Source-module action contract is missing for an AI-proposed mutation.

## Data Lifecycle

- Child entity transfers, merges, splits, suspends, or retires.
- User is deprovisioned while retaining audit history.
- Admin exception expires after downstream modules relied on it.
- Buyer/vendor relationship is revoked after buyer product export or invoice creation.
- Channel eligibility is revoked after Pricing snapshot or Invoice export.
- Product Type enablement is suspended after Product Catalog records exist.
- Parent/child profile version changes and inherited defaults must remain auditable.

## Logs & Audit Access Authority Edge Cases

This section documents edge cases for the Logs & Audit access authority coordination. All existing Tenant Company edge cases are preserved without modification. Edge cases here are architectural; concrete handling is implementation. Each edge case identifies the risk, the documented mitigation, and any open business decision retained.

### Edge case EC-1 - Logs & Audit accidentally becomes permission authority

**Risk:** Logs & Audit code paths begin making access decisions independent of Tenant `check_access` (e.g., caching previous decisions without re-evaluation, applying heuristics on top of Tenant's decision).

**Mitigation:** PR-D Tenant-Company-Owns-Authority Rule + PR-E Search-Defers-To-PR-D-Access-Governance Rule + this PR's Workflow 13 (Authority Decision Handoff). Logs & Audit makes NO permission decisions. All access decisions flow through `check_access`.

### Edge case EC-2 - Role labels become hardcoded in check_access

**Risk:** Implementation begins switching on role label (`if actor.role == 'compliance_audit_reviewer' then allow`) instead of evaluating effective capability set.

**Mitigation:** Capability-first discipline. `check_access` evaluates capabilities + scope + lifecycle + service identity authority + approval evidence + separation of duties + sensitivity inputs; NEVER role labels. Role bundles are documented composites only.

### Edge case EC-3 - Parent admin overreach into child evidence

**Risk:** Parent admin holding `audit_evidence.search` accesses child evidence without explicit Parent / Child Audit Scope Evidence.

**Mitigation:** Workflow 5 requires explicit Parent / Child Audit Scope Evidence + appropriate capability for parent-to-child audit access. Holding `audit_evidence.search` alone is insufficient. Tenant returns `decision = deny` with `reason_code = parent_child_unauthorized`.

### Edge case EC-4 - Child admin views parent or sibling evidence

**Risk:** Child admin attempts to access parent or sibling tenant evidence.

**Mitigation:** Child to parent / sibling denied by default. CIXCI System Admin override required (explicit, scoped, reasoned, logged).

### Edge case EC-5 - Service identity broad access without scope

**Risk:** Service identity granted broad tenant-wide audit access without registered scope.

**Mitigation:** Service identity audit capability profiles REQUIRE `registered_scope_reference`. No broad tenant-wide default. Workflow 10 evaluates registered scope at every `check_access` call.

### Edge case EC-6 - Raw evidence access becomes normal workflow

**Risk:** Raw access is requested frequently and becomes part of routine operations rather than exceptional access.

**Mitigation:** Purpose-bound (`access_reason_reference` REQUIRED) + separate approver capability + time-bound grants + all access logged via PR-D hardened Audit Access Record with `view_type = raw`. Frequency anomaly detection is a future implementation concern.

### Edge case EC-7 - Break-glass becomes routine workaround

**Risk:** Break-glass is invoked frequently to bypass normal access controls.

**Mitigation:** Reason REQUIRED + separate approver capability + time-bound grant required (configurable duration) + post-hoc compliance review REQUIRED + anomaly detection on frequency (future). Each break-glass access carries `break_glass_flag = true` in PR-D hardened Audit Access Record; subscribers via existing `tenant.exception-admin-exception-changed` events.

### Edge case EC-8 - Legal hold authority too broad

**Risk:** Legal Hold Authority bundle is granted to too many actors, weakening hold discipline.

**Mitigation:** Default authority audience CIXCI / compliance-only. Tenant-scoped authority is open business decision; default NO. Separation between `apply` and `release` preferred; default ON for high-sensitivity holds. `legal_hold.override_retention_purge` is REJECTED and NOT introduced (no override capability).

### Edge case EC-9 - Audit export authority too broad

**Risk:** Audit export create / approve_raw_export held by too many actors, enabling unauthorized exports.

**Mitigation:** Separation between `create`, `view`, `download`, `approve_raw_export`. Company-scoped by default. Cross-tenant export denied. Raw export requires per-item PR-D Workflow 9 escalation.

### Edge case EC-10 - Visible-denied metadata leaks restricted evidence

**Risk:** Visible-denied minimized metadata reveals existence of restricted evidence to unauthorized actors.

**Mitigation:** `audit_evidence.view_visible_denied_metadata` held by Compliance / Audit Reviewer (documented composite only); not in default Reviewer / Investigator or Evidence Search User bundles. Per PR-E Visible-Denied-Metadata-Minimized Rule. Reviewer-only by default.

### Edge case EC-11 - Suspended companies retain audit access

**Risk:** Lifecycle state change to suspended does not affect in-flight audit operations.

**Mitigation:** Workflow 11 evaluates lifecycle state at every `check_access` call. Suspended actor or target returns `decision = deny` with appropriate `reason_code`. In-flight saved searches / sessions re-evaluate at next access per Workflow 12.

### Edge case EC-12 - Capability revocation does not affect active sessions

**Risk:** Revoking a capability does not invalidate active Evidence Search Sessions, Evidence Review Sessions, in-flight Audit Report Export operations.

**Mitigation:** Workflow 12 ensures active sessions and saved searches re-evaluate authority at next access via `check_access`. Per PR-E OQ-SR-1 locked guidance: re-evaluate at execution time. Implementations MAY proactively invalidate.

### Edge case EC-13 - Audit access decisions are not logged

**Risk:** An access decision is made without creating a PR-D hardened Audit Access Record.

**Mitigation:** PR-D All-Access-Logged Rule + Workflow 13 handoff. Every `check_access` audit-flow call results in a PR-D hardened Audit Access Record creation by Logs & Audit. Tenant CANNOT short-circuit logging. If Logs & Audit cannot record (e.g., transient outage), implementations apply existing PR-D Workflow 8 retry / fallback patterns; this PR does NOT change PR-D behavior.

### Edge case EC-14 - Tenant role / capability changes not evidenced in Logs & Audit

**Risk:** Tenant capability changes (grant / revocation) are not visible in Logs & Audit's Evidence Record spine.

**Mitigation:** Tenant emits existing `company.capability_changed` and other 5 extended event surfaces with audit-coordination discriminators. Source-module evidence-emission hardening for Tenant Company (future PR) will connect Tenant authority changes into PR-A Evidence Records via `source_module_reference = tenant_company`. Out of scope this PR; the discriminator extensions documented here are sufficient for subscriber observability.

### Edge case EC-15 - Self-approval attempts (System Admin)

**Risk:** System Admin Evidence Supervisor approves own raw access or break-glass request.

**Mitigation:** Workflow 6 / 7 separation of duties evaluation defaults to deny when approver matches requester. System Admin Evidence Supervisor does NOT include `approve_raw` in default composition. Tenant policy MAY override; override is logged via existing `tenant.exception-admin-exception-changed` event with appropriate `exception_kind`.

### Edge case EC-16 - Cross-tenant filter manipulation

**Risk:** Filter dimension manipulation in Evidence Search Session attempts to traverse cross-tenant evidence.

**Mitigation:** PR-E Sensitive-Search-Filter-Audit-Logged Rule (filter dimensions are audit-logged on Evidence Search Session) + this PR Workflow 5 (cross-tenant denied by default at `check_access`) + PR-D Workflow 13 (Tenant / Parent / Child Evidence Access Evaluation). Filter manipulation does not bypass `check_access` evaluation.

### Edge case EC-17 - Re-parenting during in-flight audit operations (deferred)

**Risk:** Child company re-parented from Parent A to Parent B during in-flight Audit Report Export / Evidence Search Session / Evidence Review Session referencing child evidence.

**Mitigation (architectural):** In-flight exports inherit scope as of generation start (snapshot semantics). Active sessions and saved searches re-evaluate authority at next access per Workflow 12 + PR-E OQ-SR-1. Re-parenting effects on long-lived references are an open business decision (OQ-PC-2; future phase). Deferred per Section 7 deferrals; not handled in detail by this PR.

### Edge case EC-18 - Deeper nesting attempt (deferred)

**Risk:** Audit access traversal across 3+ levels of parent / child nesting.

**Mitigation (architectural):** Current scope locks parent-to-child (1 level). Deeper nesting is deferred (OQ-PC-1; future phase). `check_access` returns `decision = deny` with `reason_code = parent_child_unauthorized` for grandchild access attempts unless explicit per-level evidence + capability exists. Future PR may unlock deeper nesting.

### Edge case EC-19 - Concurrent capability changes

**Risk:** Two near-simultaneous capability changes for the same actor produce inconsistent observability.

**Mitigation:** Existing `company.capability_changed` event semantics + idempotency keys + correlation references per Tenant baseline. `check_access` reads current effective capability assignment at evaluation time; eventual consistency between event emission and projection update is implementation-level.

### Edge case EC-20 - Saved-search authority staleness (deferred via PR-E OQ-SR-1)

**Risk:** A saved search created with a particular capability set is executed after the user's capabilities have changed.

**Mitigation:** PR-E OQ-SR-1 locked guidance: saved searches re-evaluate authority at execution time. Workflow 12 (Capability Revocation Active Session / Saved Search Authority Recheck) extends this discipline to all audit capabilities. Implementations MAY proactively invalidate stale saved searches; not required.

### Edge case EC-21 - Service identity audit export without profile

**Risk:** Service identity creates audit exports without Service Identity Evidence Exporter profile.

**Mitigation:** Workflow 9 requires Service Identity Evidence Exporter profile (or equivalent per-identity capability list) for service identity audit export. Default NO. Without profile, Tenant returns `decision = deny` with `reason_code = capability_missing`.

### Edge case EC-22 - Time-bound grant evaluated at decision time vs use time

**Risk:** Raw access or break-glass grant evaluated at decision time but used after expiry.

**Mitigation:** `decision_effective_until` carried in decision response; Logs & Audit MUST validate against current time at each use. `view_raw` access after `decision_effective_until` returns `decision = deny` with `reason_code = approval_expired`.

### Edge case EC-23 - Discriminator value drift between Tenant and consumers

**Risk:** Discriminator values added to extended event surfaces are not consumed by subscribers.

**Mitigation:** Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility per existing baseline). Discriminator catalogs in `event-contracts.md` are extensible per existing schema-version discipline.

### Edge case EC-24 - Bundle composition drift

**Risk:** Role bundle composition changes silently grant unintended capabilities.

**Mitigation:** Bundle composition changes emit `tenant.access-role-assignment-changed` event (with `role_bundle_kind` discriminator and `change_kind_reference = composition_update`). Admin UI (future) surfaces composition changes for review. `check_access` always evaluates effective capability set, so composition changes propagate predictably.

### Edge case EC-25 - Two-person vs three-person approval policy

**Risk:** Default two-person approval (requester + approver) may be insufficient for certain regulatory regimes requiring three-person approval (requester + approver + observer).

**Mitigation:** Two-person is the default; three-person is an open business decision (OQ-RAW-1). Future tenant policy may extend to three-person without changing this PR's data model.

### Edge case EC-26 - Audit export download without re-authorization

**Risk:** Once an audit export is created, subsequent downloads bypass `check_access` re-authorization.

**Mitigation:** Each download is a separate `check_access` call per PR-E Export-Access-Logged-Via-PR-D Rule. Workflow 9 requires `audit_export.download` capability at each download attempt; downloads create separate PR-D hardened Audit Access Records.

### Edge case EC-27 - Legal hold authority audience expansion

**Risk:** Legal Hold Authority is expanded from default CIXCI / compliance-only to tenant-scoped without proper governance.

**Mitigation:** Tenant-scoped Legal Hold Authority is an open business decision (OQ-LH-1) requiring future regulatory review. Default authority audience locked to CIXCI / compliance-only.

### Edge case EC-28 - Capability propagation latency

**Risk:** Capability grant / revocation does not take effect immediately due to projection materialization latency.

**Mitigation:** Implementation-level concern (OQ-IMPL-1). `check_access` evaluates current projection at call time; projection updates emit `tenant.access-role-scope-projection-updated` with `projection_kind = audit_capability_projection`. Subscribers observe projection materialization; eventual consistency window is implementation-defined.

### Edge case EC-29 - Anomaly-pattern raw access requests

**Risk:** A single actor submits many raw access requests in a short window, attempting to overwhelm the approval queue or normalize raw access.

**Mitigation (architectural):** PR-D hardened Audit Access Record carries each access; subscribers observing `tenant.exception-admin-exception-changed` with `exception_kind = raw_access_approval` / `raw_access_denial` can detect anomaly patterns. Concrete anomaly detection is future implementation.

### Edge case EC-30 - Logs & Audit retry causing duplicate Audit Access Records

**Risk:** Network retry of `check_access` produces duplicate Audit Access Records.

**Mitigation:** Existing PR-A `idempotency_key` discipline + PR-D Workflow 8 idempotency. This PR does NOT change PR-D behavior. Tenant returns the same decision for the same idempotency key per `check_access` baseline.

---

### Edge case summary

This section documents 30 edge cases (EC-1 through EC-30) covering authority drift, scope and overreach, exceptional access, lifecycle, event explosion, discriminator drift, self-approval, cross-tenant filter manipulation, re-parenting, deeper nesting, concurrency, saved search staleness, service identity, time-bound grants, bundle composition drift, two-person / three-person approval, download re-authorization, legal hold audience, capability propagation latency, anomaly patterns, and idempotency.

### Edge case discipline

- All edge cases reference existing PR-A through PR-E mitigations where applicable.
- All edge cases respect Tenant decides / Logs records boundary.
- No edge case introduces new entities, events, workflows, or capabilities beyond those documented in this PR.
- Concrete handling (UI, anomaly detection, propagation latency, idempotency caches, retry policies) is implementation-level.
- Deferred items (deeper nesting, re-parenting effects, regional / jurisdictional policy) are explicitly marked as deferred and tracked in `assumptions-open-questions.md`.
