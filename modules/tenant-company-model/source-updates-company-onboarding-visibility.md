# Source Updates: Company Onboarding and Visibility

These notes preserve source updates for the upcoming Tenant Company module. They are not a full Tenant Company module draft and do not finalize business rules.

## Source Update Scope

Capture source-of-truth notes for company, user, onboarding, LOA, agreement, QuickBooks sync, activation, user provisioning, AI agent preference, Brand Voice onboarding, regional visibility, geographic mapping, vendor-buyer relationships, admin exceptions, and activation rules.

## Company And User Onboarding

- Placeholder: capture company onboarding flow, required company attributes, and approval checkpoints.
- Placeholder: capture user onboarding flow, required user attributes, and relationship to company or child entity scope.
- Placeholder: define whether onboarding differs for parent companies, child entities, vendors, buyers, and admins.
- Placeholder: define whether onboarding status is owned by Tenant Company or coordinated with another module.

## LOA And Agreement Capture

- Placeholder: capture LOA requirements and ownership.
- Placeholder: capture agreement requirements and ownership.
- Placeholder: define whether LOA/agreement state gates company activation, buyer setup, catalog visibility, or downstream operations.
- Placeholder: define audit and retention requirements for LOA and agreement changes.

## QuickBooks Sync

- Placeholder: capture QuickBooks sync scope and which company or child entity fields participate.
- Placeholder: define whether QuickBooks sync is parent-level, child-level, buyer-specific, vendor-specific, or mixed.
- Placeholder: define sync failure handling, retry behavior, and admin review needs.
- Placeholder: define whether QuickBooks identifiers are source-of-truth, external references, or derived integration metadata.

## Activation And User Provisioning

- Placeholder: capture company activation states and activation rules.
- Placeholder: capture child entity activation states and whether child activation can differ from parent activation.
- Placeholder: capture user provisioning rules for parent admins, child admins, buyer users, vendor users, and system admins.
- Placeholder: define whether activation automatically provisions users or whether provisioning is a separate workflow.

## AI Agent Preference

- Placeholder: capture whether AI agent preference is company-level, child-entity-level, user-level, or buyer/vendor relationship-level.
- Placeholder: define whether AI agent preference affects onboarding, product content, support workflows, Brand Voice, or other modules.
- Placeholder: define who can view or change AI agent preference and what audit is required.

## Brand Voice Onboarding

- Placeholder: capture Brand Voice onboarding scope and whether it is stored at parent company, child entity, or another level.
- Placeholder: capture whether Brand Voice onboarding is required before activation or optional after activation.
- Placeholder: define downstream consumers of Brand Voice settings.
- Placeholder: define who can approve, edit, or override Brand Voice settings.

## Regional Visibility And Geographic Mapping

- Placeholder: capture regional visibility rules for parent companies, child entities, buyers, and vendors.
- Placeholder: capture geographic mapping fields and whether they are company-level, child-level, relationship-level, or product/catalog-level.
- Placeholder: define whether geographic mapping gates catalog visibility, buyer setup, vendor-buyer relationships, pricing, order routing, or reporting.
- Placeholder: define what happens when region or geography changes after relationships or activations already exist.

## Vendor-Buyer Relationships

- Placeholder: capture vendor-buyer relationship states and ownership.
- Placeholder: define whether relationships are parent-level, child-level, regional, product/category-specific, or mixed.
- Placeholder: define how relationship state interacts with product activation/download and catalog visibility.
- Placeholder: define whether approval conflicts are resolved by parent rules, child rules, admin exceptions, or another process.

## Admin Exceptions

- Placeholder: capture admin exception types for onboarding, activation, visibility, regional mapping, relationship approval, and user provisioning.
- Placeholder: define who can grant exceptions and what approval trail is required.
- Placeholder: define whether exceptions expire, require review, or cascade to child entities.
- Placeholder: define audit logging and visibility for exception usage.

## Activation Rules

- Placeholder: capture activation prerequisites for company, child entity, buyer setup, vendor-buyer relationship, catalog visibility, and user provisioning.
- Placeholder: define whether activation is reversible, suspendable, or stage-based.
- Placeholder: define whether activation state can differ between parent and child entities.
- Placeholder: define downstream modules that must consume activation changes.

## Conflicts / Gaps / Open Questions

- The current `spec.md` says a child belongs to one parent; it remains open whether that is permanent or whether child entities can transfer between parents.
- Integrations may exist at parent or child level, but QuickBooks sync ownership and conflict handling are not yet defined.
- Brand Voice is currently described as child-entity-level in `spec.md`; source updates may need to confirm whether parent-level or relationship-level Brand Voice also exists.
- Vendor-buyer relationships may overlap with Catalog visibility and Product Activation; Tenant Company should define relationship authority without absorbing Catalog product ownership.
- Activation rules may affect Buyer, Catalog, Pricing, Order Routing, and user provisioning; ownership and event boundaries are not yet defined.
- Admin exceptions are referenced but not classified by type, scope, duration, or audit requirements.
- Regional visibility and geographic mapping may conflict with existing relationship approvals; conflict resolution is not yet defined.
