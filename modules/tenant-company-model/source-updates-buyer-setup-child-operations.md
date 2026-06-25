# Source Updates: Buyer Setup and Child Operations

These notes preserve source updates for the upcoming Tenant Company module. They are not a full Tenant Company module draft and do not finalize business rules.

## Source Update Scope

Capture source-of-truth notes for Buyer Setup, Child Operational Configuration, Child Contacts Rule, Purchase Order Dependency Rule, acceptance criteria, readiness impact, and downstream Accessory Details dependency.

## Buyer Setup

- Placeholder: capture required buyer setup fields and readiness states.
- Placeholder: define whether buyer setup is owned at parent company level, child entity level, or both.
- Placeholder: define whether buyer setup depends on LOA, agreements, QuickBooks sync, activation, user provisioning, regional mapping, vendor-buyer relationships, or admin exceptions.
- Placeholder: define whether buyer setup creates or updates visibility relationships used by Catalog or Accessory Details.

## Child Operational Configuration

- Placeholder: capture operational configuration required for each child entity.
- Placeholder: define which configuration fields are inherited from parent company and which can be overridden at child level.
- Placeholder: define whether child operational configuration gates activation, ordering, catalog visibility, reporting, or integrations.
- Placeholder: define how configuration changes propagate to downstream modules.

## Child Contacts Rule

- Placeholder: capture required child contact roles, contact ownership, and contact validation rules.
- Placeholder: define whether child contacts inherit from parent contacts or must be explicitly assigned.
- Placeholder: define whether child contacts are required before child activation, buyer setup readiness, or downstream operations.
- Placeholder: define who can create, update, deactivate, or override child contacts.

## Purchase Order Dependency Rule

- Placeholder: capture whether purchase order dependency is required before buyer setup is considered ready.
- Placeholder: define whether PO dependency is parent-level, child-level, buyer-specific, vendor-specific, or relationship-specific.
- Placeholder: define which downstream modules must block, warn, or continue when PO dependency is missing.
- Placeholder: define whether admin exceptions can bypass PO dependency and what audit is required.

## Acceptance Criteria

- Placeholder: buyer setup cannot be marked ready until required buyer setup fields are captured.
- Placeholder: child operational configuration readiness must be explicitly evaluated.
- Placeholder: child contacts rule must be evaluated before readiness is complete.
- Placeholder: purchase order dependency rule must be evaluated before readiness is complete.
- Placeholder: readiness state should expose unresolved blockers and admin exceptions.
- Placeholder: downstream Accessory Details dependency should be visible before dependent workflows proceed.

## Readiness Impact

- Placeholder: define readiness states such as not started, incomplete, blocked, exception granted, ready, active, suspended, or retired.
- Placeholder: define which readiness blockers affect Catalog visibility, Product Activation, Accessory Details, Pricing, Order Routing, reporting, or user provisioning.
- Placeholder: define whether readiness is computed, manually set, or hybrid.
- Placeholder: define whether parent readiness can override child readiness or whether child readiness is independently enforced.

## Downstream Accessory Details Dependency

- Placeholder: capture which Accessory Details fields or workflows depend on buyer setup readiness.
- Placeholder: define whether Accessory Details can be viewed, edited, activated, downloaded, or routed before buyer setup is ready.
- Placeholder: define what Accessory Details should do when child operational configuration, child contacts, or PO dependency is incomplete.
- Placeholder: define whether Accessory Details dependency belongs to Catalog, Buyer Setup, or another module boundary.

## Conflicts / Gaps / Open Questions

- Buyer Setup may overlap with Tenant Company, Catalog visibility, Product Activation, and buyer-facing modules; module ownership is not yet defined.
- Child Operational Configuration may partially inherit from parent company, but inheritance and override rules are not yet defined.
- Child Contacts Rule may affect user provisioning and readiness, but required contact roles and validation rules are not yet defined.
- Purchase Order Dependency Rule may affect Order Routing or downstream operations, but ownership and blocking behavior are not yet defined.
- Readiness impact needs explicit event or state-change boundaries so downstream modules do not infer readiness inconsistently.
- Accessory Details dependency is identified but its owning module and exact required fields are not yet defined.
- Acceptance criteria are captured as placeholders and need source-confirmed pass/fail conditions before implementation.
