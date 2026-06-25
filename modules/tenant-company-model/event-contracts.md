# Tenant Company Event Contracts

This document defines proposal-level event contract expectations for Tenant Company events. `scope-authority-configuration-evidence.md` remains the normative sub-contract for detailed evidence fields and Common Authority Evidence Controls. `company-subtype-taxonomy-management.md` defines controlled company subtype taxonomy event expectations. `capability-flag-registry.md` defines capability flag naming and lifecycle semantics.

## Common Envelope

Tenant Company events should include:

- event id
- event type
- event version
- occurred at timestamp
- source module: Tenant Company
- source record reference
- source record version/hash
- source timestamp
- freshness timestamp, where applicable
- expiration timestamp, where applicable
- company reference
- parent company reference, where applicable
- child entity reference, where applicable
- standalone company reference, where applicable
- user reference, where applicable
- role/scope projection reference, where applicable
- tenant scope evidence reference, where applicable
- source disposition
- inherited vs overridden state, where applicable
- applied vs ignored state, where applicable
- supersession reference, where applicable
- review-required state
- audit reference
- idempotency key

Events should describe Tenant-owned evidence changes only. They must not imply product visibility, pricing calculation, invoice generation, PO approval, route selection, fulfillment execution, notification delivery, integration transport, analytics metric generation, Logs & Audit ownership, or AI action execution.

## Event Naming Convention

Event names here must match `events.md` exactly. Event names must not create a second taxonomy. Events carry references and evidence, not full sensitive payloads. Logs & Audit owns immutable event/audit evidence.

## Capability Events

Event:

- `company.capability_changed`

Payload should include:

- company capability assignment reference
- affected company reference
- affected child company reference, where applicable
- user/actor reference
- actor company reference
- capability flag name
- capability namespace
- prior capability state
- new capability state
- effective start and end timestamps
- registry status: registered, provisional, or deprecated
- replacement reference, where applicable
- lifecycle-state resolution input
- `check_access` decision reference, where applicable
- source version/hash
- supersession reference
- review-required state
- audit reference

`company.capability_changed` is the canonical capability-change surface for capability assignment, revocation, effective-range change, deprecation transition, and replacement-reference changes. Downstream consumers must not invent alternate capability event names.

## Child Onboarding Request Events

Events:

- `child_onboarding_request.submitted`
- `child_onboarding_request.approved`
- `child_onboarding_request.rejected`
- `child_onboarding_request.withdrawn`
- `child_onboarding_request.expired`

Common payload should include:

- child onboarding request id
- parent company reference
- requester actor reference
- requester role/scope projection reference
- `parent_management.request_child_onboarding` authority reference
- `check_access` decision reference
- request status
- proposed child company reference, where already materialized
- created child company reference, for approved requests
- bootstrap invitation reference, for approved requests
- `external_evidence_ref`
- decision actor reference, for approved/rejected requests
- decision timestamp, where applicable
- withdrawal actor reference, where applicable
- expiration timestamp, where applicable
- approval atomicity/correlation reference, where applicable
- approval failure reason, where applicable
- source version/hash
- audit reference

Contract rules:

- `submitted` records the CIXCI-owned lifecycle spine and external evidence reference, not the substantive operational-tool payload.
- `approved` records approval and the child Company creation outcome in Pending Setup; it does not imply Active state or default capabilities.
- `rejected`, `withdrawn`, and `expired` close the request lifecycle without child Company activation.
- No `child_onboarding_request.under_review` event exists at v1.
- Approval failure must be observable and atomic: partial child creation or invitation issuance must be represented as review/failure state and audit evidence, not as a silent success.

## Tenant Scope Evidence Events

Events:

- `tenant.scope-evidence-created`
- `tenant.scope-evidence-updated`
- `tenant.scope-evidence-superseded`
- `tenant.scope-evidence-review-required`
- `tenant.scope-evidence-generated`
- `tenant.scope-evidence-recomputed`

Payload should reference company/entity/user/role scope, permission set, buyer/vendor relationship evidence, Product Type scope, channel eligibility, account status, access decision, redaction decision, source version/hash, freshness/expiration, inherited-vs-overridden state, disposition, applied-vs-ignored state, supersession, and audit evidence.

Tenant Scope Evidence / Access Projection events indicate generated or superseded evidence from Tenant-owned source records. They are not downstream authoring commands.

## Role / Permission Scope Events

Events:

- `tenant.access-role-scope-projection-created`
- `tenant.access-role-scope-projection-updated`
- `tenant.access-user-provisioned`
- `tenant.access-role-assignment-changed`
- `tenant.access-redaction-decision-updated`

Payload should reference user, company/entity scope, role, permission set, action authority list, sensitive access authority, act-on-behalf authority, API/integration authority, import/export authority, report/invoice access authority, AI action authority, redaction decision, Common Authority Evidence Controls, and audit reference.

## Buyer / Vendor Relationship Events

Events:

- `tenant.relationship-buyer-vendor-evidence-created`
- `tenant.relationship-buyer-vendor-evidence-updated`
- `tenant.relationship-buyer-vendor-evidence-suspended`
- `tenant.relationship-visibility-changed`
- `tenant.relationship-geographic-eligibility-changed`

Payload should reference buyer company/entity, vendor company/entity, relationship status, approval status, active/inactive/suspended/pending state, visibility scope, Product Type scope, channel scope, sales channel scope, Common Authority Evidence Controls, and audit reference.

## Company Subtype Taxonomy Events

Events:

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

Common payload expectations, where applicable:

- event id
- event name
- event version
- occurred at timestamp
- actor/user reference
- company type taxonomy reference
- company subtype taxonomy reference
- subtype configuration evidence reference
- subtype assignment reference
- company/entity reference
- previous subtype reference
- new subtype reference
- activation readiness validation reference
- activation readiness status
- configuration completeness status
- configuration completeness evidence reference
- blocked reason
- missing configuration references
- downstream impact preview reference
- source version/hash
- effective date
- source disposition
- applied vs ignored state
- supersession reference
- review-required state
- audit reference

Company subtype taxonomy events provide Tenant-owned evidence only. They must not imply Product Catalog visibility mutation, Pricing calculation, Procurement PO lifecycle transition, Invoice generation, Notification delivery, Integration delivery, Analytics metric ownership, AI action execution, or Logs & Audit evidence ownership.

## Import / Export Authority Events

Events:

- `tenant.import-export-authority-granted`
- `tenant.import-export-authority-updated`
- `tenant.import-export-authority-revoked`
- `tenant.import-export-authority-review-required`

Payload should reference user/role, company/entity scope, source module scope, allowed import/export modes, destructive action authority, override authority, schedule authority, download authority, re-export authority, sensitive export authority, approval/override reference, redaction decision reference, Common Authority Evidence Controls, and audit reference.

## Pricing Mode And Commission Input Events

Events:

- `tenant.pricing-mode-configuration-updated`
- `tenant.commission-configuration-input-updated`
- `tenant.commission-configuration-input-superseded`

Payload should reference placement scope and Common Authority Evidence Controls only. Pricing owns interpretation, precedence, calculation, snapshots, bindability, and commercial outcome.

## Channel And Product Type Events

Events:

- `tenant.channel-eligibility-updated`
- `tenant.channel-eligibility-review-required`
- `tenant.product-type-enablement-updated`
- `tenant.product-type-enablement-review-required`

Payload should reference company/entity scope, parent/child scope, buyer/vendor relationship scope, Product Type scope, channel, status, Common Authority Evidence Controls, and audit reference.

## PO Authority Events

Events:

- `tenant.po-functionality-enabled`
- `tenant.po-functionality-disabled`
- `tenant.po-approval-authority-updated`

Payload should reference buyer parent/child/entity scope, enabled/disabled status, Product Type scope, channel scope, approval required flag, approval threshold placeholder, approval authority reference, approver role/scope projection reference, Common Authority Evidence Controls, and audit reference.

## Report, Invoice, Notification, Integration, And AI Events

Events:

- `tenant.report-invoice-access-scope-updated`
- `tenant.notification-recipient-scope-updated`
- `tenant.api-integration-user-authority-updated`
- `tenant.ai-action-authority-updated`

Report/invoice access payload should include view type, allowed report types, allowed invoice views, sensitive field access, redaction decision, recheck flags, Common Authority Evidence Controls, and audit reference.

Notification recipient payload should include company/entity scope, user/role references, event type scope, source module scope, recipient eligibility status, account status, preference/suppression placeholders, Common Authority Evidence Controls, and audit reference.

API/integration payload should include service account, company/entity scope, allowed integration scope, allowed source modules, external action authority, import/export authority reference, webhook/API action authority, Common Authority Evidence Controls, and audit reference.

AI action payload should include user/role scope, allowed agent/action type, recommendation-only flag, draft-only flag, approval-required flag, approval authority, external-action allowed flag, Integration authority reference, source-module action contract placeholder, Common Authority Evidence Controls, and audit reference.

## Lifecycle, Readiness, And Exception Events

Events:

- `tenant.lifecycle-company-created`
- `tenant.lifecycle-company-updated`
- `tenant.lifecycle-child-entity-created`
- `tenant.lifecycle-child-entity-updated`
- `tenant.lifecycle-parent-linking-created`
- `tenant.lifecycle-activation-changed`
- `tenant.child-override-applied`
- `tenant.child-override-superseded`
- `tenant.readiness-buyer-setup-changed`
- `tenant.readiness-child-operational-configuration-changed`
- `tenant.exception-admin-exception-changed`

Payload should preserve historical source state, Common Authority Evidence Controls where applicable, and supersession references. Parent-linking and child override events must not silently rewrite prior operational records.

## Consumer Rules

Consumers should treat Tenant events as evidence updates, not direct commands. Consumers are responsible for their own module-specific review, bindability, visibility, delivery, calculation, mutation, or execution rules.

## Logs & Audit Access Authority Event Discriminator Extensions

This section documents the discriminator / context extensions on six existing Tenant event surfaces required for Logs & Audit access authority coordination. **Zero new Tenant events are introduced.** All existing Tenant event contracts are preserved without modification.

### Contract discipline

- All payload extensions are reference-first per existing Tenant + PR-A discipline.
- No concrete schema is locked here; concrete payload schema is future API Governance Foundation PR work.
- Discriminator value catalogs are documented per surface below.
- Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility).
- All existing payload envelope fields (`correlation_reference`, `trace_reference`, `idempotency_key`, `audit_record_reference`, schema version) are preserved per existing baseline.

### Surface 1 - `company.capability_changed` extension

#### Discriminator: `capability_family`

**Discriminator type:** string-enum (extensible).

**Discriminator value catalog (8 values):**

| Value | Capabilities in this family |
|---|---|
| `audit_search` | `audit_evidence.search`, `audit_evidence.search_sensitive`, `audit_evidence.view_visible_denied_metadata`, `audit_evidence.view_legal_hold_flags`, `audit_evidence.view_restricted_flags` |
| `audit_view_retrieval` | `audit_evidence.view_redacted`, `audit_evidence.request_raw`, `audit_evidence.approve_raw`, `audit_evidence.view_raw` |
| `audit_review` | `audit_review.create_session`, `audit_review.manage_session`, `audit_review.create_note`, `audit_review.create_collection`, `audit_review.view_chain_of_custody`, `audit_review.close_session` |
| `audit_export` | `audit_export.create`, `audit_export.view`, `audit_export.download`, `audit_export.approve_raw_export`, `audit_export.view_export_history` |
| `legal_hold` | `legal_hold.apply`, `legal_hold.release`, `legal_hold.view`, `legal_hold.view_scope` |
| `governance` | `retention_disposition.view`, `retention_disposition.approve`, `redaction_transform.view`, `redaction_transform.create`, `redaction_transform.approve` |
| `service_identity_audit` | `service_identity.audit_search`, `service_identity.audit_export`, `service_identity.audit_access_record`, `service_identity.evidence_emit` |
| `audit_break_glass` | `audit_evidence.break_glass` |

**Payload context reference fields (reference-first):**

- `capability_identifier_reference` (which capability changed).
- `capability_family` (the discriminator value).
- `capability_kind` (one of `requester`, `approver`, `viewer`, `actor`, `service_identity`).
- `subject_reference` (actor or service identity whose capability changed).
- `change_kind_reference` (grant / revocation / lifecycle status change).
- `effective_date_range_reference`.
- Existing baseline envelope preserved.

### Surface 2 - `tenant.access-role-assignment-changed` extension

#### Discriminator: `role_bundle_kind`

**Discriminator type:** string-enum (extensible).

**Discriminator value catalog (9 values):**

| Value | Bundle (documented composite only) |
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

**Payload context reference fields (reference-first):**

- `role_bundle_identifier_reference`.
- `role_bundle_kind` (the discriminator value).
- `subject_reference` (actor whose bundle assignment changed).
- `change_kind_reference` (assignment / removal / composition update / lifecycle change).
- `effective_date_range_reference`.
- Existing baseline envelope preserved.

**Critical:** This event is observability only. `check_access` does NOT evaluate role labels; it evaluates the effective capability set.

### Surface 3 - `tenant.access-role-scope-projection-created` extension

#### Discriminator: `projection_kind`

**Discriminator type:** string-enum (extensible).

**Discriminator value catalog (1 audit-coordination value):**

| Value | Projection scope |
|---|---|
| `audit_capability_projection` | Audit Authority Decision sub-projection materialization (extension of Tenant Scope Evidence / Access Projection); Parent / Child Audit Scope Evidence projection creation. |

**Payload context reference fields (reference-first):**

- `projection_identifier_reference`.
- `projection_kind` (the discriminator value).
- `subject_reference` (actor or service identity whose projection is materialized).
- `target_company_scope_reference`.
- `projection_creation_reason_reference`.
- Existing baseline envelope preserved.

### Surface 4 - `tenant.access-role-scope-projection-updated` extension

#### Discriminator: `projection_kind`

**Discriminator type:** string-enum (extensible).

**Discriminator value catalog (1 audit-coordination value):**

| Value | Projection scope |
|---|---|
| `audit_capability_projection` | Audit Authority Decision sub-projection refresh; Parent / Child Audit Scope Evidence projection update; capability propagation reflected in projection. |

**Payload context reference fields (reference-first):**

- `projection_identifier_reference`.
- `projection_kind` (the discriminator value).
- `subject_reference`.
- `target_company_scope_reference`.
- `update_reason_reference` (capability_revocation / capability_grant / lifecycle_change / parent_child_scope_change).
- Existing baseline envelope preserved.

### Surface 5 - `tenant.api-integration-user-authority-updated` extension

#### Discriminator: `service_identity_capability_profile`

**Discriminator type:** string-enum (extensible).

**Discriminator value catalog (3 values):**

| Value | Profile (documented composite only) |
|---|---|
| `service_identity_evidence_reader` | Service Identity Evidence Reader (holds `service_identity.audit_search`, `service_identity.audit_access_record`). |
| `service_identity_evidence_exporter` | Service Identity Evidence Exporter (holds `service_identity.audit_export`, `service_identity.audit_access_record`). |
| `custom_per_identity` | Service identity with per-identity capability list (no documented profile). |

**Payload context reference fields (reference-first):**

- `service_identity_reference`.
- `service_identity_capability_profile` (the discriminator value).
- `granted_audit_capabilities_reference` (list of audit capability identifiers).
- `registered_scope_reference` (REQUIRED).
- `expiration_reference` (REQUIRED).
- `change_kind_reference` (grant / revocation / rotation / lifecycle change).
- Existing baseline envelope preserved.

### Surface 6 - `tenant.exception-admin-exception-changed` extension

#### Discriminator: `exception_kind`

**Discriminator type:** string-enum (extensible).

**Discriminator value catalog (8 audit-coordination values; extensible):**

| Value | Exception lifecycle event |
|---|---|
| `break_glass_grant` | Break-Glass Approver granted a break-glass request. |
| `break_glass_expiry` | Break-glass grant elapsed its `grant_effective_until` window. |
| `break_glass_revocation` | Break-glass grant explicitly revoked before expiry. |
| `cixci_system_admin_override` | CIXCI System Admin override exercised (cross-tenant, suspended-target, child-to-parent, child-to-sibling scenarios). |
| `raw_access_approval` | Raw Evidence Access Authorizer approved a raw access request. |
| `raw_access_denial` | Raw Evidence Access Authorizer denied a raw access request. |
| `legal_hold_authority_grant` | Legal Hold Authority capability set granted to an actor. |
| `legal_hold_authority_revocation` | Legal Hold Authority capability set revoked from an actor. |

**Payload context reference fields (reference-first):**

- `exception_identifier_reference`.
- `exception_kind` (the discriminator value).
- `subject_reference` (requester actor for break-glass / raw access; grantee for legal hold authority; overriding actor for CIXCI System Admin override).
- `counterparty_reference` (approver actor for break-glass / raw access approvals; granted-by actor for authority grants).
- `target_reference` (target evidence reference OR target scope reference OR target action identifier).
- `reason_reference` (REQUIRED for break-glass, raw access, CIXCI System Admin override; existing baseline preserves reason discipline).
- `effective_until_reference` (REQUIRED for break-glass grants and time-bound raw access approvals; `null` for non-time-bound entries).
- Existing baseline envelope preserved.

**Time-bound discipline:** For `break_glass_grant` entries, `effective_until_reference` is REQUIRED. **The exact duration is configurable / business-policy controlled; "1 hour" is suggested guidance only, NOT locked policy.**

**Distinction from Logs & Audit events:** This event surface carries Tenant-side AUTHORITY GRANT / EXCEPTION lifecycle. Logs & Audit continues to emit `audit.legal-hold.applied` / `audit.legal-hold.released` for legal hold ACTIONS themselves; this PR does NOT modify those events.

### Common discriminator extension discipline

For all six extended surfaces:

- Discriminator values are case-sensitive lowercase identifiers per existing Tenant baseline.
- Discriminator values are stable across schema versions (additions are additive; removals require explicit deprecation per baseline).
- Subscribers MUST handle unknown discriminator values gracefully.
- Subscribers MUST NOT route on absence of discriminator; surfaces without explicit discriminator default to existing baseline semantics.
- Discriminator extensions do NOT change event ordering, retry, or idempotency semantics.

### Reference-first context discipline

Per PR-A reference-first discipline:

- No concrete payload field is locked.
- All payload context references are to existing entity / projection identifiers.
- Implementation owns concrete payload schema.
- Future API Governance Foundation PR locks concrete payload schema.

### Subscriber composition guidance

For audit-coordination subscribers:

- Subscribe to `company.capability_changed` with `capability_family` filter for audit-capability-change observability.
- Subscribe to `tenant.access-role-assignment-changed` with `role_bundle_kind` filter for audit-role-bundle-change observability.
- Subscribe to `tenant.access-role-scope-projection-created` / `updated` with `projection_kind = audit_capability_projection` for projection-materialization observability.
- Subscribe to `tenant.api-integration-user-authority-updated` with `service_identity_capability_profile` filter for service-identity-audit-capability observability.
- Subscribe to `tenant.exception-admin-exception-changed` with `exception_kind` filter for audit-coordination exception lifecycle observability (break-glass, raw access, legal hold authority grant, CIXCI System Admin override).

Subscribers MUST NOT route on role bundle labels alone; effective capability set is the authoritative observability surface. Role bundle observability is for human / admin UI consumption; programmatic access decisions consume capability changes.

### Discriminator extension boundary

- Extensions are documented at the Tenant Company event-contracts level only.
- Subscribers in other modules consume the documented discriminator catalog.
- No discriminator value is removed from an existing catalog (extensions are additive only).
- Discriminator catalog versioning follows existing Tenant baseline schema-version discipline.

### What this event-contracts section intentionally does NOT lock

- Concrete payload field schema. Future API Governance Foundation PR.
- Concrete subscriber routing / filtering implementation. Future implementation.
- Concrete event delivery transport. Existing Integration Management baseline + future Integration coordination.
- Concrete schema versioning policy beyond existing Tenant baseline.
- Concrete subscriber rate limiting / backpressure. Implementation.
- Future discriminator value additions beyond the catalogs documented here.
