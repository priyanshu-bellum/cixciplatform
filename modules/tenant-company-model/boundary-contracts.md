# Tenant Company Boundary Contracts

This document defines proposal-level Tenant Company boundary contracts. `scope-authority-configuration-evidence.md` is the normative sub-contract for scope, authority, eligibility, configuration placement, Common Authority Evidence Controls, projection generation, and redaction evidence. `capability-flag-registry.md` is the canonical capability flag registry.

## What Tenant Company Owns

Tenant Company owns company records, parent company records, child entity records, standalone company records, invitation-only onboarding state, `activation_evidence_ref`, `child_onboarding_request` lifecycle/state spine, tenant-scoped users, roles, permission sets, role/scope projections, Tenant-owned source records for scope/access/eligibility/relationship/configuration authority, generated Tenant Scope Evidence / Access Projection versions, buyer/vendor relationship evidence, access/redaction authority evidence, account status and eligibility authority evidence, channel eligibility evidence, Product Type enablement evidence, buyer pricing mode configuration placement, commission configuration input placement, PO functionality enablement and approval authority evidence, import/export authority evidence, report/invoice access scope evidence, notification recipient scope evidence, API/integration user authority evidence, AI action authority evidence, capability flag naming/lifecycle, and parent/child inheritance and override evidence.

Tenant Company provides scope/authority evidence for downstream modules. It does not perform the downstream module action.

## Common Evidence Boundary

Every Tenant authority/configuration/scope record consumed by downstream modules should carry Common Authority Evidence Controls: source version/hash, source timestamp, freshness/expiration, effective/end dates, source disposition, applied-vs-ignored state, inherited-vs-overridden state, supersession, review-required state, access/redaction decisions where applicable, approval/override references where applicable, and audit reference.

Downstream modules may consume Tenant Scope Evidence projections or direct authority/configuration records. Direct records must be safe to consume independently and must not rely on the projection wrapper as the only place where evidence controls exist.

Missing, stale, expired, superseded, ignored, or conflicting Tenant evidence should block or route dependent downstream actions to review.

## Onboarding And Activation Boundary

Tenant/Company Foundation controls company creation and final activation. There is no open self-onboarding and no unauthenticated company creation. Auth-provider account creation does not equal CIXCI platform access.

`activation_evidence_ref` provides activation evidence; operational checklist content remains policy/operations-owned and is not hard-coded here. Downstream modules must treat Pending Setup companies as restricted until Tenant evidence shows Active state and required capabilities/scope.

## Child Onboarding Request Boundary

Tenant/Company owns the `child_onboarding_request` lifecycle/state spine, decision state, child company linkage, and audit references. Substantive request content lives in external operational tooling through `external_evidence_ref`.

Approval creates a child Company in Pending Setup, not Active. It does not grant default capabilities and does not bypass bootstrap invitation acceptance or final activation.

## Parent-Child Lifecycle Boundary

Consumers must not infer cascade behavior.

- Parent suspension does not automatically suspend children.
- Parent restoration does not automatically restore children.
- Parent archival does not automatically archive children.
- Parent archival requires child-first validation: all direct children must already be Archived.
- Parent archival validation rejection is audit-only.
- Parent admins lose effective `parent_management.*` authority while parent is Suspended.
- `parent_management.suspend_children` remains a separate explicit per-child capability and does not imply broadcast cascade.
- Re-parenting/child migration and deeper nesting are future ADR-driven extensions.

## Projection Generation Boundary

Tenant Scope Evidence / Access Projection is generated, recalculated, or superseded from Tenant-owned source records. Normal client/admin commands should mutate the appropriate source record, such as buyer/vendor relationship evidence, channel eligibility, Product Type enablement, PO authority, pricing mode configuration, commission input, import/export authority, report access, notification recipient scope, API authority, AI authority, subtype assignment, capability assignment, child onboarding request state, or parent/child override evidence.

Downstream modules should never author Tenant evidence projections. Direct repair/recompute flows for projections must be explicitly controlled, versioned, audited, and restricted to authorized System Admin or platform maintenance flows. Projection supersession must preserve historical evidence used by invoices, orders, exports, reports, analytics, notifications, integrations, AI action decisions, pricing snapshots, catalog visibility, and procurement approvals.

## What Tenant Company Must Not Own

Tenant Company must not own Product Catalog product records, Device Catalog canonical records, Pricing calculations/snapshots, Invoice records, Order Routing decisions, Fulfillment/Returns operational evidence, Procurement PO lifecycle, Notification delivery, Analytics metrics/read models, Integration delivery/receipt, Media processing, Launch/Event coordination, Logs & Audit immutable evidence, AI recommendations/actions, accounting ledger, payment, settlement, warranty, legal licensing workflow, or external identity-provider mechanics unless a future ADR assigns them.

## Downstream Consumption Contract

Downstream modules should consume Tenant Scope Evidence / Access Projection, Role / Permission Scope Projection, Buyer / Vendor Relationship Evidence, Channel Eligibility Scope, Product Type Enablement Scope, capability-change events, lifecycle state, child onboarding request events where relevant, and related authority records instead of inferring eligibility from their own operational history.

For every downstream note:

- Tenant/Company provides evidence.
- The consumer composes with its own spec.
- The consumer must not infer cascade behavior.
- Final behavior remains owned by the consuming module spec.

## Product Catalog / Catalog Boundary

Tenant Company provides buyer/vendor relationship scope, account status, channel eligibility, Product Type enablement, permissions, System Admin buyer context authority, act-on-behalf authority, subtype configuration evidence, lifecycle state, and capability-change evidence. Product Catalog owns product records, product lifecycle/availability projections, accessory discovery, product visibility projection, buyer-product relationship state, export selection/confirmation records, Latest Accessories baseline rules, and per-buyer Accessory Added/Selling/Stop Selling state.

Product Catalog must not infer Tenant eligibility from product visibility, prior exports, prior selling state, subtype labels, or catalog interactions alone.

## Pricing Boundary

Tenant Company owns buyer pricing mode configuration placement, commission configuration input placement, subtype pricing/channel input evidence, and lifecycle/capability authority evidence. Pricing owns interpretation, precedence, calculation, validation, snapshots, bindability, channel pricing, buyer-facing Wholesale Price, PO pricing, adjustment pricing, exceptions, overrides, and output visibility-safe pricing.

## Buyer Discovery Boundary

Tenant Company provides buyer account status, buyer/vendor relationship evidence, channel/Product Type/subtype evidence, and access/scope evidence. Buyer Discovery composes those signals with its own discovery/search/export rules and must not infer parent-child cascade, activation, or capability behavior independently.

## Orders Boundary

Tenant Company provides buyer/vendor eligibility, company lifecycle state, relationship scope, and capability evidence. Order modules compose Tenant evidence with their own order acceptance/routing rules and must not treat parent suspension as child suspension unless child state/evidence says so.

## Invoice Reporting Boundary

Tenant Company provides report/invoice access authority and redaction decision inputs. Invoice Management owns invoice records/exports/lifecycle. Analytics owns reporting read models/reports/exports/metrics. Both consume Tenant access/redaction evidence and preserve evidence references.

## Integrations Boundary

Tenant Company owns API/integration user authority and company/entity scope. Integration Management owns integration connection records, credential references, external delivery/receipt evidence, provider state, external ID mappings, retries, failures, and transport reliability.

## AI Agent Services Boundary

Tenant Company provides user/entity/action authority for AI actions. AI Agent Services owns recommendations, drafts, suggestions, and action orchestration rules. AI Agent Services must not define eligibility, bypass Tenant Company authority, or mutate source records without source-module action contracts and permissions.

## Reporting / Analytics Boundary

Tenant Company provides lifecycle, subtype classification evidence, role/scope projection, access/redaction evidence, and capability-change evidence. Analytics owns reporting read models, metrics, projections, and exports, and must preserve Tenant evidence references used in analytics/report visibility.

## Notifications Boundary

Tenant Company provides eligible recipient scope for users, roles, companies, entities, account status, event types, and source modules. Notification Platform Service owns preferences, suppression, fanout, delivery, retries, provider responses, and delivery evidence.

## Import / Export Boundary

Tenant Company owns who may upload, validate, preview, confirm, approve, override, destructively apply, schedule, generate, download, revoke, view, re-export, or act on behalf for imports/exports. Source modules own business validation, preview semantics, and final mutation behavior. Logs & Audit owns immutable file/import/export/download evidence. Integration Management owns external delivery/receipt evidence.

## Event Boundary

Tenant Company uses the event names defined in `events.md` and payload contracts in `event-contracts.md`. Do not introduce parallel event taxonomies. Missing event-family gaps must be flagged in `assumptions-open-questions.md` before downstream specs depend on them.

## Boundary Risk Controls

- Tenant Company scope evidence and direct authority records must be versioned and dispositioned for downstream consumers.
- Parent/child inheritance and override state must be explicit, auditable, and scoped.
- Buyer/vendor relationship evidence must not be inferred from product visibility, exports, orders, invoices, integrations, analytics, AI recommendations, or subtype labels.
- Pending Setup companies must remain restricted until activation evidence supports final activation.
- Import/export authority must not bypass source-module validation or shared governance.
- Pricing mode and commission inputs must remain configuration authority, not Pricing calculations.
- Channel eligibility must not become Product Catalog product-channel flags or Pricing Channel calculations.
- PO functionality and approval authority must not become Procurement PO lifecycle ownership.
- Report/invoice redaction authority must not become invoice record or analytics read-model ownership.
- Notification recipient scope must not become delivery ownership.
- API/integration authority must not become Integration transport ownership.
- AI action authority must not become AI recommendation or execution ownership.

## Logs & Audit Access Authority Boundary Contracts

This section reaffirms boundary discipline for the Logs & Audit access authority coordination. All existing Tenant boundary contracts are preserved without modification. All Logs & Audit PR-A through PR-E boundary contracts are preserved by reference; no Logs & Audit file is modified.

### Tenant Company ownership (additional under this coordination)

Tenant Company owns:

- The Audit Capability Family Registry (8 families; 34 capabilities).
- The 9 Audit Role Bundles (documented composites only).
- The 2 Service Identity Audit Capability Profiles (documented composites only).
- The `check_access` audit-flow extension.
- The Audit Authority Decision sub-projection.
- Parent / Child Audit Scope Evidence.
- CIXCI System Admin Override Evidence (audit-coordination context).
- Raw Access Approval Evidence.
- Break-Glass Grant Evidence.
- Legal Hold Authority Grant Evidence.
- Audit Export Approval Evidence (raw export items).
- Service Identity Audit Capability Evidence.
- Capability Revocation Active Session / Saved Search Authority Recheck workflow.
- Authority Decision Handoff to Logs & Audit workflow.
- Lifecycle-Aware Audit Access Blocking Configuration.
- The 13 new numbered workflows.
- The discriminator / context extensions on 6 existing Tenant event surfaces.

### Tenant Company does NOT own

- Evidence Records / Audit Records / File Tracking Records / Legal Hold Records / Retention Disposition Records / Redaction Transformation Records / hardened Audit Access Records (Logs & Audit File Tracking).
- Evidence Search Sessions / Evidence Review Sessions / Evidence Collection Records / Review Notes / Annotations / Audit Report Export Records (Logs & Audit File Tracking PR-E).
- Source-module operational records and business decisions (per source module).
- BI / dashboards / metrics / trends / KPIs / business-performance reporting (Analytics / Reporting).
- Notification delivery (Notification Platform; Tenant may identify eligible recipients).
- Integration transport (Integration Management; Tenant owns API / service identity authority only).
- Concrete retention duration values (CPA / legal / DevOps; per PR-D).
- Legal hold authority decisions content (Compliance / legal; per PR-D).

### Tenant Company - Logs & Audit boundary (definitive)

**Tenant decides; Logs records.**

| Concern | Owner |
|---|---|
| Who can perform an audit action | Tenant Company `check_access` |
| Outcome of an audit access decision | Logs & Audit PR-D hardened Audit Access Record |
| Authority evidence (capability assignment, role bundle membership, approval grants, parent / child scope grants, service identity capability profile, lifecycle blocking decisions) | Tenant Company |
| Access logging (the record that an access occurred and its result) | Logs & Audit PR-D hardened Audit Access Record |
| Search Session creation / Review Session creation / Collection / Note / Export Record creation | Logs & Audit (PR-E entities) |
| Capability registry source-of-truth | Tenant Company `capability-flag-registry.md` |
| Role bundle composition | Tenant Company `permissions.md` (documented composites only) |
| Service identity capability profiles | Tenant Company `permissions.md` (documented composites only) |

Specific boundary rules:

- Tenant does NOT mutate Logs & Audit records.
- Logs & Audit does NOT mutate Tenant capability assignments or role bundle compositions.
- Logs & Audit does NOT become permission authority. PR-D Tenant-Company-Owns-Authority Rule applies.
- Tenant does NOT make access decisions on behalf of Logs & Audit without being called via `check_access`.
- Both modules respect the same `correlation_reference` for cross-record traceability per PR-A discipline.

### Tenant Company - source modules boundary (reaffirmation)

- Source modules own operational records, lifecycle, decisions, validation, generated content, operational reporting.
- Source modules consume Tenant `check_access` for any user-facing authority check.
- Source-module service identities are registered with Tenant and hold appropriate audit capability profiles (typically `service_identity.evidence_emit`, optionally `service_identity.audit_access_record`).
- Source modules do NOT define their own audit capabilities; the 34 audit capabilities are Tenant-owned.
- This PR does NOT modify any source-module file.

### Tenant Company - Analytics / Reporting boundary

- Analytics owns BI / dashboards / metrics / trends / KPIs / business-performance reporting.
- Audit Capability Registry data is NOT a BI surface; this coordinator does NOT expose registry data to Analytics consumers.
- Analytics MAY consume Tenant capability assignments via standard analytics-evidence patterns (PR-C `analytics_reporting` family) per existing baseline; no new Tenant - Analytics integration introduced.
- Audit Report Export Records (PR-E) are compliance / regulatory / investigation artifacts; NOT BI dashboards (per PR-E Audit-Export-Not-Analytics Rule).

### Tenant Company - Notification Platform boundary

- Notification owns delivery (templates, channels, suppression).
- Tenant MAY identify eligible notification recipients (e.g., compliance team for break-glass alerts, Raw Evidence Access Authorizer for raw access requests, Legal Hold Authority for hold-related notifications).
- Concrete notification surfaces (break-glass alert, raw access approval, capability change notification, suspended company audit access lockout) are future Notification Platform coordination; out of scope this PR.
- This PR does NOT modify any Notification Platform file.

### Tenant Company - Integration Management boundary

- Integration Management owns transport (HTTPS, webhook delivery, retry, dead-letter queue handling).
- Tenant owns API / service identity authority; concrete API integration user authority remains in existing Tenant baseline.
- Service identity audit capabilities are evaluated by Tenant `check_access`; Integration Management consumes the authorization outcome.
- This PR does NOT modify any Integration Management file.

### Tenant Company - CPA / legal / DevOps boundary

- CPA / legal / DevOps own concrete retention duration values per PR-D's 6 named retention policy references (`retention_policy_transient_short`, `retention_policy_standard`, `retention_policy_extended`, `retention_policy_financial_long_term`, `retention_policy_audit_critical_indefinite`, `retention_policy_legal_hold_indefinite`).
- This PR does NOT introduce concrete retention duration values.
- This PR references named retention policy references only.

### Tenant Company - Compliance / legal boundary

- Compliance / legal own legal hold authority decisions (per PR-D).
- Default authority audience for Legal Hold Authority is CIXCI / compliance-only.
- Tenant-scoped Legal Hold Authority is an open business decision; default NO; future regulatory review may extend.
- This PR does NOT make the legal-hold-authority audience decision; it documents the discipline and defaults.

### CIXCI System Admin override boundary

- CIXCI System Admin is a Tenant-owned authority concept (existing baseline).
- Override use creates explicit authority evidence record (existing baseline pattern, extended for audit coordination).
- Override is NOT a self-approval bypass; the override itself requires explicit `override_reason_reference` and is logged.
- Override produces PR-D hardened Audit Access Record with `access_class_evaluated = system_admin_only`.

### Cross-tenant boundary discipline

- Cross-tenant access denied by default.
- Cross-tenant audit access requires CIXCI System Admin override evidence + capability.
- Parent-to-child audit access is NOT cross-tenant; it requires Parent / Child Audit Scope Evidence + capability.
- Child-to-parent audit access IS effectively cross-tenant from the child's perspective and is denied by default.
- Child-to-sibling audit access IS cross-tenant and is denied by default.

### Forbidden file modifications under this coordination

- `modules/tenant-company-model/openapi-contracts.md`.
- `modules/tenant-company-model/company-subtype-taxonomy-management.md`.
- `modules/tenant-company-model/source-updates-buyer-setup-child-operations.md`.
- `modules/tenant-company-model/source-updates-company-onboarding-visibility.md`.
- All files under `modules/logs-audit-file-tracking/`.
- All other module files (Product Catalog, Device Catalog, Media, Order Routing, Fulfillment / Returns, Integration Management, Notification Platform, Invoice Management, Pricing, Analytics / Reporting, Procurement / Purchase Orders, Launch / Event Management).
- All ADRs, platform standards, runtime / code / schema / migration / build / lockfile.
- `modules/README.md`.

Reserved family slot directories `modules/ai-agent-services/` and `modules/warranty-registration/` do not exist on origin/main; do not create them.

### Critical boundary rules summary

- Tenant decides authority; Logs & Audit records outcome.
- Capabilities are the source of truth; role bundles are documented composites only.
- `check_access` evaluates capabilities, scope, lifecycle state, service identity authority, approval evidence, separation of duties, and sensitivity inputs; NEVER role labels.
- System Admin Evidence Supervisor does NOT imply self-approval automatically.
- Raw Evidence Access Authorizer separation from requester preferred / default.
- Break-Glass Approver separation from requester preferred / default.
- Legal Hold Authority separation between `apply` and `release` preferred.
- Audit Export `create` / `download` / `approve_raw_export` separated.
- Cross-tenant access denied by default.
- Child to parent / sibling denied by default.
- Suspended / Pending Setup / inactive lifecycle blocking applied.
- CIXCI System Admin override explicit / scoped / reasoned / logged.
- Raw access purpose-bound, time-bound, separation-of-duties default, logged.
- Break-glass reason-bound, time-bound (configurable duration; "1 hour" guidance only), post-hoc reviewed, logged.
- Legal hold: no override capability; release is the canonical lift mechanism.
- Audit exports are NOT BI dashboards.
- Service identities are scoped, expiring / rotatable, logged.
- Capability revocation: active sessions / saved searches re-evaluate at next access.
- All access logged via PR-D hardened Audit Access Record.
- Zero new Tenant events; six existing event surfaces extended via documented discriminators.
- All PR-A through PR-E content preserved by reference; no Logs & Audit file modified.
- All existing Tenant baseline content preserved.

### Sequence positioning

This PR is the immediate next coordination step after the Logs & Audit A-through-E documentation hardening sequence (PR #98 through PR #102, all merged into main at `fc1219b`). This PR resolves the Tenant authority dependencies that PR-D and PR-E deferred.

Following this PR:

1. CPA / legal / DevOps retention duration review (locks concrete duration values for PR-D's 6 named retention policy references; can run in parallel).
2. Product Catalog Buyer Product Export Job / Bulk Export Throttling Foundation (consumes this PR's audit / export authority surface).
3. Source-module evidence-emission hardening PRs (consume PR-A through PR-E + this PR).
4. API Governance Foundation PR.
5. Tenant-specific OpenAPI hardening PR (introduces concrete HTTP routes / payloads for this PR's `check_access` audit-flow and capability registration surfaces).
6. Logs-and-Audit-specific OpenAPI hardening PR.
7. Future UI / UX work for capability assignment, raw access approval, break-glass approval, legal hold authority assignment, service identity capability management, denied access messaging, parent / child scope visibility, capability audit history.
8. Future Notification Platform coordination for audit-coordination notifications.
9. Investigation Case Management module (if needed; PR-E Investigation Case Reference graduates).
10. AI Agent Services module + evidence PR + AI-specific audit capabilities (when module exists).
11. Warranty Registration module + evidence PR + warranty-specific audit capabilities (when module exists).
