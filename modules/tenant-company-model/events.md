# Tenant Company Events

This document lists proposal-level Tenant Company events. Event payload contracts are summarized in `event-contracts.md`; detailed evidence models are defined in `scope-authority-configuration-evidence.md`, `company-subtype-taxonomy-management.md`, and `capability-flag-registry.md`.

Tenant Company events describe scope, authority, eligibility, access, configuration placement, projection generation/supersession, controlled company subtype taxonomy, subtype assignment, subtype configuration evidence, capability changes, child onboarding requests, lifecycle validation outcomes, and redaction evidence. They do not perform Product Catalog, Pricing, Invoice, Order Routing, Fulfillment/Returns, Procurement, Notification, Integration, Analytics, Logs & Audit, Launch/Event, Media, or AI Agent Services actions.

## Event Naming Convention

Tenant Company uses the committed event names in this file as canonical. Do not introduce a second parallel taxonomy in sub-contracts or PR body text. If a future referenced event family is missing from this inventory, flag that gap in `assumptions-open-questions.md` rather than inventing a name in downstream module specs.

## Published Events

### Lifecycle And Hierarchy

- `tenant.lifecycle-company-created`
- `tenant.lifecycle-company-updated`
- `tenant.lifecycle-child-entity-created`
- `tenant.lifecycle-child-entity-updated`
- `tenant.lifecycle-parent-linking-created`
- `tenant.lifecycle-activation-changed`
- `tenant.child-override-applied`
- `tenant.child-override-superseded`

Lifecycle closures:

- Parent suspension does not emit child `company.suspended` side-effect events at v1.
- Parent restoration does not emit child `company.restored` side-effect events at v1.
- Parent archival rejection because direct children are not Archived is audit-only at v1 and does not create a cascade event family.

### Capability Events

- `company.capability_changed`

`company.capability_changed` is the canonical capability-change event for assignment, revocation, effective-range change, deprecation transition, and replacement-reference updates. Consumers must use this committed name and the payload contract in `event-contracts.md`.

### Child Onboarding Request Events

Five v1 child onboarding request events are committed:

- `child_onboarding_request.submitted`
- `child_onboarding_request.approved`
- `child_onboarding_request.rejected`
- `child_onboarding_request.withdrawn`
- `child_onboarding_request.expired`

No `child_onboarding_request.under_review` event exists at v1. Review state is internal workflow state and audit evidence unless a future focused extension adds a public event.

Approval of `child_onboarding_request.approved` is observably atomic: the request approval, child Company creation in Pending Setup, bootstrap invitation issuance, and linkage back to the request must either complete as one correlated outcome or leave the request in a review/failure state with audit evidence. Approval does not create an Active company and does not assign default capabilities.

### Scope And Access Evidence

- `tenant.scope-evidence-created`
- `tenant.scope-evidence-updated`
- `tenant.scope-evidence-superseded`
- `tenant.scope-evidence-review-required`
- `tenant.scope-evidence-generated`
- `tenant.scope-evidence-recomputed`
- `tenant.access-role-scope-projection-created`
- `tenant.access-role-scope-projection-updated`
- `tenant.access-user-provisioned`
- `tenant.access-role-assignment-changed`
- `tenant.access-redaction-decision-updated`

### Buyer / Vendor Relationship

- `tenant.relationship-buyer-vendor-evidence-created`
- `tenant.relationship-buyer-vendor-evidence-updated`
- `tenant.relationship-buyer-vendor-evidence-suspended`
- `tenant.relationship-visibility-changed`
- `tenant.relationship-geographic-eligibility-changed`

### Company Subtype Taxonomy

- `tenant.company-subtype-created`
- `tenant.company-subtype-configuration-updated`
- `tenant.company-subtype-activation-blocked`
- `tenant.company-subtype-activated`
- `tenant.company-subtype-retired`
- `tenant.company-subtype-superseded`
- `tenant.company-subtype-assigned`
- `tenant.company-subtype-reassigned`
- `tenant.company-subtype-downstream-impact-preview-created`
- `tenant.company-subtype-configuration-evidence-generated`
- `tenant.company-subtype-permission-template-missing`
- `tenant.company-subtype-pricing-channel-configuration-missing`
- `tenant.company-subtype-onboarding-requirement-missing`
- `tenant.company-subtype-analytics-classification-updated`

### Import / Export Authority

- `tenant.import-export-authority-granted`
- `tenant.import-export-authority-updated`
- `tenant.import-export-authority-revoked`
- `tenant.import-export-authority-review-required`

### Pricing And Commission Configuration Inputs

- `tenant.pricing-mode-configuration-updated`
- `tenant.commission-configuration-input-updated`
- `tenant.commission-configuration-input-superseded`

### Channel And Product Type Eligibility

- `tenant.channel-eligibility-updated`
- `tenant.channel-eligibility-review-required`
- `tenant.product-type-enablement-updated`
- `tenant.product-type-enablement-review-required`

### Procurement Authority

- `tenant.po-functionality-enabled`
- `tenant.po-functionality-disabled`
- `tenant.po-approval-authority-updated`

### Report, Invoice, Notification, Integration, And AI Authority

- `tenant.report-invoice-access-scope-updated`
- `tenant.notification-recipient-scope-updated`
- `tenant.api-integration-user-authority-updated`
- `tenant.ai-action-authority-updated`

### Readiness And Exceptions

- `tenant.readiness-buyer-setup-changed`
- `tenant.readiness-child-operational-configuration-changed`
- `tenant.exception-admin-exception-changed`

## Consumed Events

Tenant Company may consume source-module events only to update Tenant-owned evidence or review state. Consuming an event must not move source-module ownership into Tenant Company.

Examples:

- Product Catalog events that indicate a Tenant scope reference is missing or stale.
- Pricing events that reference missing pricing mode or commission input evidence.
- Procurement events that reference missing PO approval authority.
- Invoice or Analytics events that reference access/redaction evidence issues.
- Integration events that reference API/integration user authority issues.
- Notification events that reference missing recipient scope evidence.
- AI Agent Services events that reference missing action authority evidence.

## Event Guardrails

- Events should include Common Authority Evidence Controls where relevant.
- Company subtype taxonomy events should include subtype taxonomy reference, subtype configuration evidence reference, assignment reference where applicable, activation readiness status, blocked reason where applicable, source version/hash, supersession reference, review-required state, and audit reference.
- Capability events should include capability flag name, previous state, new state, effective range, actor, target company/user scope, lifecycle-state resolution inputs, replacement reference where applicable, source version/hash, and audit reference.
- Child onboarding request events should include request id, parent company reference, requester actor, target/proposed child company reference where applicable, external_evidence_ref, request status, decision actor where applicable, created child company reference where applicable, bootstrap invitation reference where applicable, atomic approval correlation id where applicable, source version/hash, and audit reference.
- Events should include Tenant source version/hash, source timestamp, source disposition, freshness/expiration, inherited-vs-overridden state, applied-vs-ignored state, supersession reference, and review-required state where relevant.
- Events should reference Logs & Audit evidence where immutable audit/file/access evidence exists, but Logs & Audit owns that evidence.
- Events should not imply external delivery, notification fanout, provider receipt, product visibility, pricing calculation, invoice creation, PO approval, routing, fulfillment, or AI action execution.

## Retry And Idempotency

Tenant Company event publication should support:

- event id
- event type
- event version
- source record reference
- source record version/hash
- occurred at timestamp
- idempotency key
- supersession reference
- replay-safe consumer behavior
- review-required state for repeated failures

## Audit-Ready Events

Audit-ready events include changes to:

- tenant scope evidence generation, update, recompute, or supersession
- role/scope projection
- buyer/vendor relationship evidence
- company subtype taxonomy records, subtype configuration evidence, subtype activation, subtype assignment, subtype reassignment, subtype retirement, and downstream impact preview
- capability assignment, revocation, deprecation, replacement, or effective-range changes
- child onboarding request submission, approval, rejection, withdrawal, expiration, and approval failure
- parent archival validation rejection
- import/export authority
- buyer pricing mode configuration
- commission configuration input
- channel eligibility
- Product Type enablement
- PO functionality and approval authority
- report/invoice access scope
- notification recipient scope
- API/integration user authority
- AI action authority
- child override state
- access/redaction decision state

## Event Inventory Verification Discipline

The event inventory in this file is the committed source for Tenant/Company event names. Reviews should verify the count and payload-contract coverage against this file, not older PR body text. Any missing event-family gap must be recorded in `assumptions-open-questions.md` before downstream specs depend on it.

## Logs & Audit Access Authority Event Discipline

This section documents the event discipline for Logs & Audit access authority coordination. **Zero new Tenant events are introduced.** Six existing Tenant event surfaces are extended via documented discriminator / context extensions to carry audit-coordination semantics. All existing Tenant event surfaces are preserved without modification.

### Core discipline

- **Zero new Tenant events introduced.** This coordination uses existing event surfaces only.
- **Six existing surfaces carry audit-coordination semantics via documented discriminator / context extensions.** Discriminator extensions are documented in `event-contracts.md`.
- **Discriminator-first design** consistent with PR-A through PR-E discipline (PR-A discriminator events, PR-D 6 events with discriminators, PR-E 4 events with discriminators including `audit.evidence-export.recorded` `export_status` discriminator).
- **No event proliferation.** All proposed `tenant.audit-*` / `tenant.raw-access.*` / `tenant.break-glass.*` / `tenant.legal-hold-authority.*` / `tenant.service-identity.audit-capability-*` events are REJECTED.

### Existing Tenant event surfaces extended

The following six existing Tenant event surfaces are extended with documented discriminator / context extensions. Existing payload shape, ordering, retry semantics, idempotency keys, correlation references, schema versioning, and lifecycle are preserved per existing Tenant baseline.

#### Surface 1 - `company.capability_changed`

**Existing surface preserved.** Audit-coordination context extension: payload context includes the `capability_family` discriminator covering one of 8 values: `audit_search`, `audit_view_retrieval`, `audit_review`, `audit_export`, `legal_hold`, `governance`, `service_identity_audit`, `audit_break_glass`.

**Audit-coordination semantics carried:**

- Audit capability grant (new audit capability added to an actor / service identity).
- Audit capability revocation (audit capability removed; triggers Workflow 12 active session / saved search authority recheck).
- Audit capability lifecycle status change (active / deprecated / superseded).
- Audit capability effective date range change.

**Discriminator documentation:** see `event-contracts.md`.

#### Surface 2 - `tenant.access-role-assignment-changed`

**Existing surface preserved.** Audit-coordination context extension: payload context includes the `role_bundle_kind` discriminator covering one of 9 values: `compliance_audit_reviewer`, `raw_evidence_access_authorizer`, `legal_hold_authority`, `break_glass_approver`, `reviewer_investigator`, `audit_export_reviewer`, `evidence_search_user`, `evidence_review_manager`, `system_admin_evidence_supervisor`.

**Audit-coordination semantics carried:**

- Audit role bundle assignment to an actor (documented composite only; not source of truth).
- Audit role bundle removal from an actor.
- Audit role bundle composition update (when bundle's capability composition changes).
- Audit role bundle lifecycle change (active / deprecated / superseded).

**Critical:** Role bundle assignment events are observability only. `check_access` does NOT evaluate role labels; it evaluates the effective capability set that the assignment grants.

**Discriminator documentation:** see `event-contracts.md`.

#### Surface 3 - `tenant.access-role-scope-projection-created`

**Existing surface preserved.** Audit-coordination context extension: payload context includes the `projection_kind` discriminator covering `audit_capability_projection` value.

**Audit-coordination semantics carried:**

- Audit capability projection materialization (Tenant Scope Evidence / Access Projection extended with Audit Authority Decision sub-projection).
- Parent / Child Audit Scope Evidence projection creation.

**Discriminator documentation:** see `event-contracts.md`.

#### Surface 4 - `tenant.access-role-scope-projection-updated`

**Existing surface preserved.** Audit-coordination context extension: payload context includes the `projection_kind` discriminator covering `audit_capability_projection` value.

**Audit-coordination semantics carried:**

- Audit capability projection refresh / update.
- Parent / Child Audit Scope Evidence projection update.
- Capability propagation (revocations, additions, lifecycle changes) reflected in projection.

**Discriminator documentation:** see `event-contracts.md`.

#### Surface 5 - `tenant.api-integration-user-authority-updated`

**Existing surface preserved.** Audit-coordination context extension: payload context includes the `service_identity_capability_profile` discriminator covering one of 2 values: `service_identity_evidence_reader`, `service_identity_evidence_exporter`. The discriminator may also carry `custom_per_identity` for service identities not following a documented profile.

**Audit-coordination semantics carried:**

- Service identity audit capability profile grant / revocation.
- Per-service-identity audit capability list update.
- Service identity rotation events (existing baseline) extended with audit capability context.
- Service identity expiration changes affecting audit capabilities.

**Discriminator documentation:** see `event-contracts.md`.

#### Surface 6 - `tenant.exception-admin-exception-changed`

**Existing surface preserved.** Audit-coordination context extension: payload context includes the `exception_kind` discriminator. The exception_kind discriminator covers audit-coordination exception lifecycle events including: `break_glass_grant`, `break_glass_expiry`, `break_glass_revocation`, `cixci_system_admin_override`, `raw_access_approval`, `raw_access_denial`, `legal_hold_authority_grant`, `legal_hold_authority_revocation`. The discriminator value set is extensible for future audit-coordination exception categories.

**Audit-coordination semantics carried:**

- Break-glass grant approval (Workflow 7).
- Break-glass grant expiry (Workflow 7).
- Break-glass grant revocation (Workflow 7).
- CIXCI System Admin override exercised (Workflows 5, 11).
- Raw access approval (Workflow 6).
- Raw access denial (Workflow 6).
- Legal Hold Authority Grant (assignment of legal hold capabilities; distinct from legal hold actions themselves).
- Legal Hold Authority Revocation.

**Distinction from PR-D events:** Legal hold ACTIONS (apply / release) continue to emit existing PR-D events `audit.legal-hold.applied` / `audit.legal-hold.released`. This Tenant event surface carries Legal Hold AUTHORITY GRANT lifecycle (who holds the legal hold capabilities), NOT the action of applying / releasing a hold. This PR does NOT modify any PR-D event.

**Discriminator documentation:** see `event-contracts.md`.

### Events explicitly NOT introduced

The following proposed new Tenant events are REJECTED. Each is subsumed by an existing event surface with discriminator extensions as documented above.

| Proposed event | Status | Subsumed by |
|---|---|---|
| `tenant.audit-capability.granted` | REJECTED | `company.capability_changed` + `capability_family` discriminator |
| `tenant.audit-capability.revoked` | REJECTED | `company.capability_changed` + `capability_family` discriminator |
| `tenant.audit-role.assigned` | REJECTED | `tenant.access-role-assignment-changed` + `role_bundle_kind` discriminator |
| `tenant.audit-role.removed` | REJECTED | `tenant.access-role-assignment-changed` + `role_bundle_kind` discriminator |
| `tenant.raw-access.approved` | REJECTED | `tenant.exception-admin-exception-changed` + `exception_kind = raw_access_approval` |
| `tenant.raw-access.denied` | REJECTED | `tenant.exception-admin-exception-changed` + `exception_kind = raw_access_denial` |
| `tenant.break-glass.approved` | REJECTED | `tenant.exception-admin-exception-changed` + `exception_kind = break_glass_grant` |
| `tenant.break-glass.revoked` | REJECTED | `tenant.exception-admin-exception-changed` + `exception_kind = break_glass_revocation` |
| `tenant.legal-hold-authority.granted` | REJECTED | `tenant.exception-admin-exception-changed` + `exception_kind = legal_hold_authority_grant` |
| `tenant.legal-hold-authority.revoked` | REJECTED | `tenant.exception-admin-exception-changed` + `exception_kind = legal_hold_authority_revocation` |
| `tenant.service-identity.audit-capability-granted` | REJECTED | `tenant.api-integration-user-authority-updated` + `service_identity_capability_profile` discriminator |
| `tenant.service-identity.audit-capability-revoked` | REJECTED | `tenant.api-integration-user-authority-updated` + `service_identity_capability_profile` discriminator |

### Rationale for zero new events

The discipline established across PR-A through PR-E prefers single-canonical-event-with-discriminator over event proliferation:

- PR-A introduced discriminator-first event design.
- PR-D introduced 6 events with discriminators rather than dozens of typed events.
- PR-E introduced 4 events with discriminators (notably `audit.evidence-export.recorded` with `export_status` discriminator covering 4 states; explicitly chose this over `audit.evidence-export.generated`).

Tenant Company's existing event surfaces already carry capability change semantics. Extending them with discriminators is the consistent pattern. Adding 10+ new tenant audit-specific events would be a regression from the discriminator-first discipline. Subscribers consume the documented discriminator catalogs in `event-contracts.md` for audit-coordination semantics.

### Discriminator extension discipline

- All discriminator extensions are documented in `event-contracts.md` reference-first per PR-A discipline.
- Concrete payload schema for discriminator values is NOT specified here; future API Governance Foundation PR locks concrete schema.
- Discriminator value catalogs are extensible; future PRs may add discriminator values per existing schema-version discipline.
- Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility per existing baseline).

### Logs & Audit event inventory after this PR

This PR does NOT modify any Logs & Audit event. The Logs & Audit event inventory after this PR remains unchanged:

- 11 baseline file events.
- 3 baseline API transmission events.
- PR-A: 4 events (`audit.record.created`, `audit.evidence.recorded`, `audit.record.envelope.attached`, `audit.cross-module.evidence-referenced`).
- PR-B: 2 events (`audit.file.tracked`, `audit.file.state-changed`).
- PR-C: 0 additive events.
- PR-D: 6 events (`audit.retention.disposition-evaluated`, `audit.retention.disposition-applied`, `audit.legal-hold.applied`, `audit.legal-hold.released`, `audit.redaction-transformation.recorded`, `audit.evidence-access.recorded`).
- PR-E: 4 events (`audit.search.executed`, `audit.review-session.recorded`, `audit.review-note.recorded`, `audit.evidence-export.recorded`).

Total Logs & Audit events: **30** (preserved by reference; unchanged by this PR).

### Net Tenant event inventory after this PR

- Existing Tenant events: preserved without modification.
- **New Tenant events introduced: 0.**
- Existing Tenant event surfaces extended via documented discriminator / context extensions: **6**.

### Event boundary discipline

- Tenant emits Tenant events for Tenant authority changes (existing baseline + discriminator extensions documented here).
- Logs & Audit emits Logs & Audit events for Logs & Audit lifecycle (existing PR-A through PR-E events; preserved unchanged).
- Neither module emits events on behalf of the other.
- Cross-module correlation via `correlation_reference` per PR-A discipline.
- Subscribers handle discriminator-based filtering per existing event-contract discipline.

### Forbidden event modifications

- No Tenant baseline event is renamed, removed, or version-bumped.
- No Logs & Audit event is modified.
- No new top-level event identifier is introduced.
- No source-module event surface is touched.
- No discriminator value is removed from an existing catalog (extensions are additive only).

### Codex re-evaluation latitude

If during later bundle review or implementation it becomes clear that any of the six existing event surfaces CANNOT semantically express a specific audit-capability change (e.g., approval reference identifiers do not fit the existing payload shape), Codex MAY approve adding one specific new event with appropriate justification. The expected new event count remains **zero**; any addition must be explicitly justified during Codex review. This PR's documented expectation is zero new Tenant events.
