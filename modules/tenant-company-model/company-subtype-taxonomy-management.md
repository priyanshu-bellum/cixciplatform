# Company Subtype Taxonomy Management

This document is proposal-level architecture for controlled company taxonomy management in the Tenant Company bounded context.

Tenant Company owns company subtype/taxonomy authority. Other modules consume Tenant Company subtype configuration evidence. Company setup uses controlled taxonomy values, not free-text company type fields. Subtype labels do not create behavior by name; behavior comes from versioned Tenant-owned configuration evidence.

This sub-contract preserves the Tenant Company boundary. It does not move Product Catalog, Device Catalog, Pricing, Invoice Management, Order Routing, Fulfillment/Returns, Procurement, Notification, Analytics, Integration Management, Media, Launch/Event, Logs & Audit, AI Agent Services, Warranty, Accounting, or Payment ownership into Tenant Company.

## Foundation Cleanup Alignment

This sub-contract aligns with the Tenant/Company Foundation cleanup sequence:

- subtype labels remain informational examples only
- `subtype_configuration_evidence_ref` is authoritative for behavior
- subtype behavior must compose with `activation_evidence_ref`, Tenant Scope Evidence, and capability evidence where applicable
- subtype assignment must preserve historical evidence used by invoices, orders, exports, reports, pricing snapshots, integrations, notifications, AI actions, and audit history
- downstream modules consume subtype evidence and their own specs decide final behavior

## Purpose

Tenant Company must support controlled company taxonomy management so CIXCI can introduce new company types and subtypes as the platform enters new markets.

Platform Owner / Super Admin users may create new company subtypes, including new Buyer Types such as Reseller, through governed taxonomy records. Company type and subtype setup must use approved taxonomy values only. Other modules must not create their own definitions of buyer, vendor, manufacturer, distributor, reseller, or future company types.

New subtype creation, activation, retirement, assignment, and override behavior must be permissioned, versioned, auditable, and governed. Logs & Audit owns immutable audit evidence.

## Controlled Company Taxonomy Management

Rules:

- Company setup uses controlled taxonomy values, not free-text company type fields.
- Tenant Company owns company subtype/taxonomy authority.
- Other modules consume Tenant Company subtype configuration evidence.
- Subtype labels do not create behavior by name.
- A subtype label such as Reseller must not automatically imply Pricing, Product Catalog, Procurement, Invoice, Analytics, Notification, Integration, or AI behavior unless configured through Tenant-owned evidence.
- New subtype creation is restricted to Platform Owner / Super Admin or equivalent authorized governance roles.
- New subtype activation validates required configuration completeness before assignment.
- Downstream modules reference subtype taxonomy evidence and subtype configuration evidence instead of hard-coding company type names.

## Company Type / Subtype Taxonomy Model

### Company Type Taxonomy Record

Proposal-level fields/concepts:

- company type taxonomy record id
- type name
- type description
- type category, such as Buyer, Vendor, Device Manufacturer, Device Distributor, System Admin, Platform Owner, or future type
- active/inactive/retired status
- market/use-case reference
- configuration completeness status
- activation readiness status
- created by actor reference
- approved by actor reference
- activated by actor reference
- retired by actor reference
- effective date
- expiration/retirement date
- source version/hash
- supersession reference
- review-required state
- audit reference

### Company Subtype Taxonomy Record

Proposal-level fields/concepts:

- company subtype taxonomy record id
- parent company type taxonomy reference
- subtype name
- subtype description
- subtype category
- market/use-case reference
- active/inactive/draft/retired status
- configuration completeness status
- activation readiness status
- created by actor reference
- approved by actor reference
- activated by actor reference
- retired by actor reference
- effective date
- expiration/retirement date
- source version/hash
- supersession reference
- review-required state
- audit reference

Subtype records should use Common Authority Evidence Controls from `scope-authority-configuration-evidence.md`, including source timestamp, freshness/expiration, source disposition, applied-vs-ignored state, approval/override references where applicable, and audit reference.

## Inactive Until Required Configuration Is Complete

A new company subtype may be created as Draft or Inactive before it is available for assignment. A subtype cannot be assigned to companies until it is active unless a controlled System Admin override allows testing/review.

Required configuration should include permission templates, onboarding requirements, required company/profile fields, required contacts, agreement/contract rules, pricing channel access, commission defaults, vendor visibility eligibility, device portfolio requirement, PO functionality default, import/export authority, report/invoice visibility, notification recipient rules, AI action authority, and analytics/reporting classification.

Activation rules:

- Missing required configuration blocks activation or routes the subtype to review.
- Activation readiness is validated before a subtype is made assignable.
- Activation produces versioned subtype configuration evidence consumed by downstream modules.
- Activation readiness evidence is consumed by assignment workflows and downstream modules.
- A subtype cannot become assignable until activation readiness validation passes or an authorized controlled override is applied.
- Controlled overrides are permissioned, versioned, auditable, and reviewable.
- Failed activation attempts are audit logged and include missing configuration reasons.

## Company Subtype Configuration Evidence

Company Subtype Configuration Evidence represents the Tenant-owned configuration bundle downstream modules consume for subtype-specific behavior.

Proposal-level fields/concepts:

- subtype configuration evidence id
- subtype taxonomy reference
- permission template reference
- onboarding requirement reference
- required profile fields reference
- required contacts reference
- agreement/contract rule reference
- pricing channel access reference
- commission default reference
- vendor visibility eligibility reference
- device portfolio requirement reference
- PO functionality default reference
- import/export authority template reference
- report/invoice visibility template reference
- notification recipient rule reference
- AI action authority template reference
- analytics/reporting classification reference
- effective date
- activation readiness validation reference
- activation readiness status
- configuration completeness evidence reference
- created by actor reference
- approved by actor reference
- activated by actor reference
- controlled override reference
- override actor/reference where applicable
- override reason where applicable
- source version/hash
- freshness timestamp
- expiration timestamp
- source disposition
- applied vs ignored state
- supersession reference
- review-required state
- audit reference

Company Subtype Configuration Evidence aligns with Tenant Company Common Authority Evidence Controls. Downstream modules consume subtype configuration evidence rather than hard-coding behavior from subtype names.

## Company Assignment Rules

Once activated, a company subtype may be assigned to new or existing companies according to System Admin permissions.

Proposal-level fields/concepts:

- company subtype assignment record id
- company reference
- parent/child entity reference
- previous subtype reference
- new subtype reference
- subtype configuration evidence reference
- assignment reason
- assigned by actor reference
- approval reference
- effective date
- source version/hash
- downstream impact preview reference
- supersession reference
- review-required state
- audit reference

Assignments and reassignments must not silently rewrite historical operational records. Existing invoices, orders, exports, reports, pricing snapshots, and audit records preserve the subtype/configuration evidence used at the time. Retired subtypes cannot be assigned to new companies.

## Downstream Impact Preview

Proposal-level fields/concepts:

- downstream impact preview id
- company subtype assignment reference
- company/entity scope reference
- previous subtype configuration evidence reference
- proposed subtype configuration evidence reference
- affected permission template references
- affected onboarding requirement references
- affected buyer/vendor visibility references
- affected pricing channel/commission input references
- affected device portfolio requirement reference
- affected PO functionality/approval authority references
- affected import/export authority references
- affected report/invoice visibility references
- affected notification recipient rule references
- affected AI action authority references
- affected analytics/reporting classification references
- blocked impact reasons
- warning-only impact reasons
- review-required state
- generated by actor/service
- generated at timestamp
- source version/hash
- audit reference

The preview is advisory evidence for controlled Tenant changes. Source modules still own their own business validation, final mutation behavior, read models, reports, records, delivery, calculations, and execution.

## Events, APIs, And Tests

Subtype taxonomy uses the event names defined in `events.md` and the payload contracts in `event-contracts.md`. API placeholders are summarized in `api-contracts.md` and `openapi-contracts.md`. Scenario coverage is summarized in `test-scenarios.md` under ST scenarios.

## Boundary Wording

Use these phrases consistently:

- Tenant Company owns company subtype/taxonomy authority.
- Other modules consume Tenant Company subtype configuration evidence.
- Company setup uses controlled taxonomy values, not free-text company type fields.
- Subtype labels do not create behavior by name; behavior comes from versioned Tenant-owned configuration evidence.
- Logs & Audit owns immutable audit evidence.
- Pricing consumes subtype pricing and commission inputs but owns calculation and snapshots.
- Product Catalog consumes subtype visibility/channel evidence but owns product records and visibility projections.
- Procurement consumes subtype PO defaults and approval authority but owns PO lifecycle.
- Analytics consumes subtype classification but owns reporting read models.
- AI Agent Services consumes subtype AI authority but does not define eligibility.
