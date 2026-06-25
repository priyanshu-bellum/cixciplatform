# Tenant Company Assumptions / Open Questions

This document captures proposal-level assumptions, resolved closure log entries, and unresolved decisions for Tenant Company scope, authority, eligibility, projection generation, event naming, and configuration evidence. `scope-authority-configuration-evidence.md` is the normative sub-contract for detailed evidence concepts.

## Closure Log

### Flag 3: Parent Suspension No-Cascade

Resolved for v1: parent suspension does not automatically suspend children, parent restoration does not automatically restore children, child lifecycle remains independent, no child `company.suspended` / `company.restored` side-effect events are emitted, and no suspension cascade audit chain is created. Parent admins lose effective `parent_management.*` authority while the parent is Suspended, while CIXCI System Admin authority remains available.

### Flag 4: Parent Archival Child-First Validation

Resolved for v1: parent archival is CIXCI System Admin-controlled and cannot proceed unless all direct children are already Archived. There is no automatic child archival cascade and no re-parenting / child migration at v1. Parent admins cannot archive children through `parent_management.*`. Validation rejection is audit-only.

### Flag 10: Invitation-Only Onboarding And Activation Evidence

Resolved for v1: no open self-onboarding, no unauthenticated company creation, no default capabilities on creation, and final activation remains CIXCI-controlled. `activation_evidence_ref` uses a hybrid reference structure and activation checklist details remain policy/ops-owned rather than hard-coded in this spec. Activation evidence is required before final activation.

### Flags 12, 13, And 15: `child_onboarding_request`

Resolved for v1: `child_onboarding_request` uses the hybrid lifecycle/state spine model. CIXCI owns request lifecycle, state, decision, child company linkage, and audit. Substantive content lives in external operational tooling through `external_evidence_ref`. `parent_management.request_child_onboarding` is registered. Approval creates child Company in Pending Setup, not Active, and still requires bootstrap invitation acceptance and final activation. Five v1 events are committed; no `under_review` event is introduced at v1.

### Capability Flag Registry Milestone

Resolved for v1: `capability-flag-registry.md` is committed as the canonical flag naming/lifecycle source. `parent_management.*` has six registered v1 flags. `parent_management.manage_capabilities_of_children` is deferred. `setup.*` is provisional, `agent.*` is reserved, `catalog.*` is anticipated, and `company.capability_changed` is the canonical capability-change event.

### Hardening Sequence Completion

The repo is complete only when these closure decisions are present in committed module files. Conversation-complete or PR-body-only decisions are not repo-complete.

## Assumptions

- Tenant Company aligns with ADR-0003's Tenant Company bounded context.
- Tenant Company aligns with ADR-0007 by owning company/entity Product Type enablement evidence while Product Catalog owns Product Type product modeling and validation.
- Tenant Company owns company, parent company, child entity, standalone company, user, role, permission, scope, eligibility, relationship, access, configuration authority, channel eligibility, Product Type enablement, capability flag naming/lifecycle, and authority evidence.
- Every Tenant authority/configuration/scope record consumed by downstream modules carries Common Authority Evidence Controls.
- Downstream modules may consume Tenant Scope Evidence projections or direct authority/configuration records, but direct records must be safe to consume independently.
- Tenant Scope Evidence / Access Projection is generated, recalculated, or superseded from underlying Tenant-owned source records.
- Downstream modules should consume Tenant evidence rather than infer eligibility from bare company/entity/user ids, subtype labels, prior exports, orders, invoices, integrations, analytics, AI recommendations, or operational history.
- Downstream modules should never author Tenant evidence projections.
- Missing, stale, expired, ignored, superseded, or conflicting Tenant evidence blocks or routes downstream action to review.
- Child entities may inherit or override parent settings only where inheritance/override evidence exists.
- Linking a standalone company/entity to a parent preserves historical evidence and does not silently rewrite prior operational records.
- Tenant Company uses the event inventory in `events.md`; missing event-family gaps should be flagged here rather than invented by consumers.
- Tenant Company does not own product records, device records, pricing calculations, invoices, routing, fulfillment execution, procurement lifecycle, notification delivery, analytics metrics, integration transport, media processing, launch readiness coordination, audit evidence ownership, AI recommendations, warranty, accounting ledger, payment, or settlement.

## Forward-Compatible Dependencies

- Baseline governance docs such as broader ADR scaffolding, DECISION_LOG, or root repo governance may remain external dependencies if absent from this repo branch.
- Re-parenting / child migration remains future ADR-driven.
- Deeper parent/child nesting remains future ADR-driven.
- Catalog drafting remains paused until Codex confirms Tenant/Company Foundation repo-completeness in committed files.
- `catalog.*` capability flags are anticipated but not registered here; paired Catalog PRs must register concrete flags when Catalog drafting resumes.

## Event Inventory Verification Discipline

Reviews must verify event count and names against committed `events.md`, not old PR body text. Every catalogued event should have matching payload expectations in `event-contracts.md`. Missing event-family gaps should be added here before downstream specs depend on them.

Deferred / not committed v1 event families: The final Tenant/Company event inventory intentionally does not invent or commit event names for user membership/invitation lifecycle, sales channel selection lifecycle, or personal email exception lifecycle unless those names already exist in committed Tenant/Company event files. These families are treated as deferred / not committed in v1 until a focused Tenant event PR defines canonical event names and payload contracts. Downstream consumers must not assume those event surfaces exist until committed.

## Open Questions

### Common Authority Evidence Controls

- Which Tenant authority/configuration records may be consumed directly by each downstream module?
- Which direct authority/configuration records require hard expiration versus advisory freshness?
- Which records require access decision references, redaction decision references, approval/override references, or all three?
- Which source dispositions are hard blockers versus review-required states?
- How should direct authority record staleness interact with a still-current Tenant Scope Evidence projection?

### Tenant Scope Evidence Projection

- Which Tenant evidence lookups are synchronous versus event-driven?
- What freshness/expiration thresholds apply to scope evidence for product visibility, pricing, invoice, procurement, notification, integration, analytics, and AI actions?
- Which downstream actions are hard-blocked versus review-required when Tenant evidence is stale or missing?
- Which projection recompute/repair flows are allowed for System Admin or platform maintenance actors?

### Parent / Child Model

- Which settings inherit from parent to child by default?
- Which settings may be overridden at child scope?
- Which child overrides require parent approval, System Admin approval, or both?
- How should historical evidence be preserved after standalone-to-parent linking?

### Future Parent / Child Extensions

- Can a child entity transfer, split, merge, or be shared across parents?
- What ADR is required before re-parenting / child migration becomes available?
- What ADR is required before deeper nesting changes direct-child validation behavior?

### Buyer / Vendor Relationships

- Which relationship scopes are required at launch: parent, child/entity, Product Type, channel, region, sales channel, or licensed-property?
- Which relationship status transitions require approval?
- How should consumers handle suspended relationship evidence?

### Import / Export Authority

- Which import/export actions require System Admin approval?
- Which source modules allow destructive apply at all?
- Which exports are sensitive and require additional redaction authority?
- Which re-export actions require approval or act-on-behalf authority?

### Pricing Mode And Commission Configuration

- Which buyer pricing modes are supported at launch?
- Which scope has precedence when buyer pricing mode is configured at parent, child, relationship, channel, Product Type, and contract/exception placeholder scopes?
- Which commission input changes require approval?

### Channel, Product Type, And PO Authority

- Which channels are launch-ready?
- Which controlled Product Types are supported at launch beyond accessories?
- Which buyers are eligible for PO functionality at launch?
- Which approver role/scope projections are allowed?

### Report / Invoice, Notification, Integration, And AI Authority

- Which invoice/report fields are customer-sensitive, pricing-sensitive, accounting-sensitive, tenant-sensitive, or system-admin-only?
- Which event types require Tenant recipient scope?
- Which external actions require explicit external-action authority?
- Which AI actions are recommendation-only, draft-only, approval-required, or external-action-capable?

## Risks

- Direct authority/configuration records could remain too weak for downstream modules to prove what authority state was used.
- Tenant Scope Evidence projections could be treated as mutable records instead of generated/superseded evidence versions.
- Tenant Company could absorb downstream ownership if configuration evidence is described as downstream execution.
- Parent/child inheritance could grant unintended cross-entity access without explicit inherited-vs-overridden evidence.
- Import/export governance could be bypassed if authority actions are not modeled granularly.
- Event naming could drift if sub-contract, events, and event-contracts are not updated together.
- Downstream modules could infer eligibility inconsistently if Tenant evidence is not canonical, versioned, and auditable.

## Logs & Audit Access Authority Assumptions and Open Questions

This section documents working assumptions, open questions, and locked PR decisions for the Logs & Audit access authority coordination. **Zero estimate-blockers**; PR is unblocked for application after Codex review.

### Working assumptions

| # | Assumption | Source |
|---|---|---|
| WA-1 | Logs & Audit PR-A Core Evidence Spine is merged at origin/main `fc1219b`; all PR-A entities, events, workflows, canonical rules, and reference patterns are preserved verbatim. | PR #98 merged |
| WA-2 | Logs & Audit PR-B File Tracking Foundation is merged; all PR-B file lifecycle entities, events, workflows preserved. | PR #99 merged |
| WA-3 | Logs & Audit PR-C Cross-Module Evidence Catalog is merged; all PR-C catalog identifiers, family definitions, source-module bindings preserved. AI Agent Services and Warranty Registration reserved family slots remain reserved (modules do not exist). | PR #100 merged |
| WA-4 | Logs & Audit PR-D Retention / Redaction / Legal Hold / Access is merged; 3 policy matrices preserved; 6 access_class values preserved; 4 access_policy_tier values preserved; Legal Hold Record + 3 statuses preserved; Retention Disposition Record + 6 states preserved; Redaction Transformation Record + 9 redaction class values (including `public_metadata_placeholder`) preserved; hardened Audit Access Record with 11 fields preserved; 6 PR-D events preserved; 13 PR-D workflows preserved; 19 PR-D canonical rules preserved; 6 named retention policy references preserved (durations deferred to CPA / legal / DevOps). | PR #101 merged |
| WA-5 | Logs & Audit PR-E Search / Query / Review is merged; 5 new entities preserved (Evidence Search Session, Evidence Review Session, Evidence Collection Record, Review Note / Annotation, Audit Report Export Record); 4 PR-E events preserved; 13 PR-E workflows preserved; 25 PR-E canonical rules preserved; filter dimension catalog preserved; OQ-SR-1 locked guidance (saved searches re-evaluate authority at execution time) preserved. | PR #102 merged |
| WA-6 | Tenant Company module exists at `modules/tenant-company-model/` with 18 baseline files; existing baseline concepts preserved without modification: `check_access`, Tenant Scope Evidence / Access Projection, Role / Permission Scope Projection, capability registry, `company.capability_changed`, parent / child scope rules, service / API user authority, report / invoice access / redaction, import / export authority, Common Authority Evidence Controls, lifecycle blocking, audit-ready authority evidence. | Codex confirmed |
| WA-7 | This PR does NOT modify `openapi-contracts.md`, `company-subtype-taxonomy-management.md`, `source-updates-buyer-setup-child-operations.md`, `source-updates-company-onboarding-visibility.md`, or any Logs & Audit file, or any other module file, ADR, platform standard, runtime / schema / migration / build / lockfile, or `modules/README.md`. | PR scope locked |
| WA-8 | All authority decisions flow through Tenant `check_access`. Logs & Audit does NOT make permission decisions. PR-D Tenant-Company-Owns-Authority Rule + PR-E Search-Defers-To-PR-D-Access-Governance Rule applies. | PR-D / PR-E |
| WA-9 | Capabilities are the source of truth; role bundles are documented composites only. `check_access` evaluates effective capabilities + scope + lifecycle state + service identity authority + approval evidence + separation of duties + sensitivity inputs; NEVER role labels. | Cleanup directive 2 |
| WA-10 | Capability count for audit-coordination is exactly 34 organized into 8 capability families. Pure ASCII output discipline; final newlines; no BOM; LF line endings only. | Cleanup directive 1 + operational discipline |
| WA-11 | Break-glass time-bound grant is REQUIRED; the exact duration is configurable / business-policy controlled. "1 hour" is suggested guidance only, NOT locked policy. | Cleanup directive 3 |
| WA-12 | Existing 6 Tenant event surfaces carry audit-coordination semantics via documented discriminator / context extensions. Zero new Tenant events introduced. | Approved scope |
| WA-13 | This PR adds exactly 13 numbered workflows; existing Tenant baseline workflows preserved without modification. | Approved scope |

### Open questions (classification)

| ID | Question | Class | Default / disposition |
|---|---|---|---|
| OQ-CAP-1 | Exact default role bundles versus pure capabilities (should some role bundles be optional / disabled by default per tenant?) | BP | This PR documents 9 bundles; tenant policy may restrict. |
| OQ-CAP-2 | Whether CIXCI System Admin can self-approve raw access | BP | Default NO; tenant policy MAY override; override is logged. |
| OQ-CAP-3 | Whether CIXCI System Admin can self-approve break-glass | BP | Default NO; tenant policy MAY override; override is logged. |
| OQ-CAP-4 | Whether buyers / vendors can ever request raw evidence | BP | Default NO; per-tenant regulatory situations may extend. |
| OQ-LH-1 | Whether Legal Hold Authority is CIXCI-only or tenant-scoped | BP | Default CIXCI / compliance-only; tenant policy and future regulatory review may extend. |
| OQ-LH-2 | Whether parent admins can view child legal hold flags | BP | Default NO unless explicit Parent / Child Audit Scope Evidence + `audit_evidence.view_legal_hold_flags`. |
| OQ-LH-3 | Whether legal hold release requires separation of duties enforced (vs preferred) | BP | Default ON for high-sensitivity holds; configurable. |
| OQ-SI-1 | Whether service identities can create audit exports by default | BP | Default NO; service identities require Service Identity Evidence Exporter profile (documented composite only) explicitly granted. |
| OQ-BG-1 | How long break-glass access lasts (default duration) | BP | **Configurable; "1 hour" is suggested guidance only, NOT locked policy.** Tenant policy may set shorter or longer durations within compliance constraints. |
| OQ-RAW-1 | Whether raw access requires two-person approval (request + approve + view by third) | BP | Default two-person (request + approve, view by requester); three-person is open. |
| OQ-NOT-1 | Whether capability changes should notify company admins | BP | Future Notification Platform coordination. |
| OQ-LC-1 | Whether suspended companies retain limited audit access (e.g., read-only for audit-only role) | BP | Default NO; tenant policy may permit. |
| OQ-CAP-5 | Whether saved searches should be invalidated on capability revocation (proactive vs lazy) | BP | Per PR-E OQ-SR-1: re-evaluate at execution. Implementation may also proactively invalidate. |
| OQ-IMPL-1 | Capability propagation latency (how quickly does a revocation take effect through the projection) | IM | Implementation. |
| OQ-API-1 | Exact `check_access` response shape (concrete schema) | IM / FP | Future API Governance Foundation PR. |
| OQ-SOD-1 | Whether `legal_hold.apply` and `legal_hold.release` enforce different-user separation of duties or just prefer it | BP | Default different-user for high-sensitivity holds; configurable per tenant policy. |
| OQ-EXP-1 | Whether `audit_export.download` requires re-authorization per download (vs grant once) | BP | Default per-download check via PR-D Workflow 8; each download creates a separate PR-D hardened Audit Access Record. |
| OQ-PC-1 | Whether parent rollup audit visibility extends to 2+ levels of nesting | FP | Deferred. Current scope is 1 level only. |
| OQ-PC-2 | Whether re-parenting effects invalidate child evidence searches in progress | BP | Per PR-E OQ-SR-1: saved-search re-evaluation; in-flight searches re-evaluate on next access. |
| OQ-EV-1 | Whether discriminator catalog needs versioning (when discriminator values are added) | IM | Implementation per existing schema-version discipline. |
| OQ-NEX-1 | Whether AI Agent Services and Warranty Registration audit capabilities need pre-registered slot identifiers (similar to PR-C reserved family slots) | FP | Deferred. Future PR when modules exist. |

### Classification summary

- **EB (estimate-blocker):** 0.
- **BP (business-product):** 17.
- **IM (implementation):** 3.
- **FP (future phase):** 2.
- **CU (cleanup-only):** 0.

Total open questions retained: **22**. Zero estimate-blockers; PR is unblocked.

### Locked PR decisions (documented for traceability)

| ID | Decision | Source |
|---|---|---|
| LD-1 | 8 audit capability families introduced (`audit_search`, `audit_view_retrieval`, `audit_review`, `audit_export`, `legal_hold`, `governance`, `service_identity_audit`, `audit_break_glass`). | Approved scope |
| LD-2 | Exactly 34 audit capabilities introduced; capability registry source-of-truth in `capability-flag-registry.md`. | Approved scope |
| LD-3 | `legal_hold.override_retention_purge` REJECTED. Legal hold BLOCKS purge; release is the canonical lift mechanism. | Approved scope |
| LD-4 | 9 role bundles documented as composites only (not source of truth for `check_access`); 2 service identity capability profiles documented as composites only. | Approved scope |
| LD-5 | Zero new Tenant events introduced; 6 existing Tenant event surfaces extended via documented discriminator / context extensions. | Approved scope |
| LD-6 | Exactly 13 numbered workflows introduced. | Approved scope |
| LD-7 | Cross-tenant audit access denied by default; CIXCI System Admin override required (explicit, scoped, reasoned, logged). | Approved scope |
| LD-8 | Parent-to-child audit access requires explicit Parent / Child Audit Scope Evidence + capability. | Approved scope |
| LD-9 | Child-to-parent / sibling audit access denied by default; CIXCI System Admin override required. | Approved scope |
| LD-10 | Suspended / Pending Setup / inactive lifecycle blocking applied to audit capabilities. | Approved scope |
| LD-11 | Raw access purpose-bound (`access_reason_reference` REQUIRED) + time-bound + separation of duties preferred. | Approved scope |
| LD-12 | Break-glass time-bound grant REQUIRED; **exact duration configurable / business-policy controlled; "1 hour" is suggested guidance only, NOT locked policy**. | Cleanup directive 3 |
| LD-13 | System Admin Evidence Supervisor does NOT imply self-approval automatically. | Approved scope |
| LD-14 | Capabilities are the source of truth; `check_access` evaluates capabilities + scope + lifecycle state + service identity authority + approval evidence + separation of duties + sensitivity inputs; NEVER role labels. | Cleanup directive 2 |
| LD-15 | `openapi-contracts.md` NOT modified; `api-contracts.md` gets architecture notes only. | Approved scope |
| LD-16 | `company-subtype-taxonomy-management.md` NOT modified. | Approved scope |
| LD-17 | Tenant source-update docs NOT modified. | Approved scope |
| LD-18 | All Logs & Audit files NOT modified. PR-A through PR-E content preserved by reference. | Approved scope |
| LD-19 | All other modules NOT modified. No ADR / platform standard / runtime / schema / migration / build / lockfile changes. `modules/README.md` NOT modified. | Approved scope |
| LD-20 | Existing Tenant Company baseline content (check_access, Tenant Scope Evidence / Access Projection, Role / Permission Scope Projection, capability registry, parent / child scope rules, service / API user authority, lifecycle blocking, Common Authority Evidence Controls, audit-ready authority evidence) preserved without modification. | Approved scope |

### Sequence positioning

This PR follows the Logs & Audit A-through-E documentation hardening sequence (PR #98 through PR #102 merged at origin/main `fc1219b`) and resolves Tenant authority dependencies that PR-D and PR-E deferred to Tenant Company. The next planned PR in the broader sequence after this PR is Product Catalog Buyer Product Export Job / Bulk Export Throttling Foundation, which depends on this PR's audit / export authority surface.

### Open questions deferred to other modules / future PRs

- Concrete retention duration values (CPA / legal / DevOps; per PR-D 6 named retention policy references).
- Concrete check_access response schema (future API Governance Foundation PR).
- Concrete notification delivery for audit-coordination events (future Notification Platform coordination).
- AI Agent Services audit capabilities (future PR when module exists).
- Warranty Registration audit capabilities (future PR when module exists).
- Investigation Case Management module (future PR if needed; PR-E Investigation Case Reference may graduate).
- Concrete UI / UX for capability assignment, raw access approval, break-glass approval, legal hold authority assignment, service identity capability management, denied access messaging, parent / child scope visibility, capability audit history (future UX / UI work).
- Source-module evidence-emission hardening (future PRs per source module).
- Tenant-specific OpenAPI hardening (future PR).
- Logs-and-Audit-specific OpenAPI hardening (future PR).
- Concrete anomaly detection on break-glass / raw access frequency (future implementation).
- Concrete propagation latency / eventual-consistency policy beyond existing Tenant baseline (implementation).

### Estimate-blocker check

No question in this section is an estimate blocker. All BP questions have documented defaults; all IM questions are implementation details that do not block scoping or merging; all FP questions are explicitly deferred to future phases. The PR is unblocked for application after Codex review.
