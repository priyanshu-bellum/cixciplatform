# Procurement / Purchase Orders Permissions

This document is proposal-level architecture. It defines initial permission concepts without finalizing roles, approval thresholds, policy implementation, or identity provider behavior.

## Permission Principles

- Tenant Company owns roles, permissions, company/entity scope, buyer/vendor/manufacturer eligibility, activation/readiness, Product Type enablement, licensed-property scope, and relationship eligibility.
- Procurement consumes Tenant Company scope and permissions; it does not define tenant eligibility.
- Procurement records approval evidence and workflow state.
- Procurement must not infer tenant permission rules independently.
- Buyer users may draft POs based on permissions.
- Buyer approvers may approve POs based on permissions.
- System admins may review/override where allowed.
- Vendors/manufacturers may respond to submitted POs where integration/onboarding allows.
- AI agents must not create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

## Proposal-Level Roles

- Buyer PO Drafter.
- Buyer PO Approver.
- Buyer PO Viewer.
- Buyer Entity PO Manager placeholder.
- System Admin Procurement Reviewer.
- Vendor PO Responder placeholder.
- Manufacturer PO Responder placeholder.
- Procurement Integration Operator placeholder.

Exact role names and mappings remain unresolved.

## Permission Actions

Proposal-level actions:

- Create PO draft.
- Edit PO draft.
- Add/update/remove PO lines.
- Submit PO for approval.
- Approve PO.
- Reject PO.
- Escalate PO approval.
- Override PO approval where allowed.
- Submit approved PO to vendor/manufacturer.
- Cancel PO.
- Revise PO.
- Supersede PO.
- Close PO.
- Record vendor/manufacturer response.
- Manage receiving placeholder.
- View PO.
- View PO document/export reference.
- Review PO exception.
- System admin override placeholder.

## Approval Evidence Model

Approval thresholds remain unresolved and may later depend on:

- Dollar amount.
- Quantity.
- Buyer parent/entity.
- Product Type.
- Seller target.
- Licensed-property scope.
- Region.
- Shipping/receiving destination.
- Risk flag.
- Buyer procurement policy placeholder.

Proposal-level approval evidence concepts:

- Approval policy reference.
- Approval policy version.
- Threshold basis: amount, quantity, Product Type, buyer entity, seller target, risk flag, future value.
- Approver authority snapshot.
- Approver role/entity scope.
- Approval chain.
- Escalation chain.
- Override flag.
- Override reason.
- Rejection reason.
- Approval expiration placeholder.
- Audit reference.

Tenant Company remains the authority for role/permission grants, company/entity scope, activation, and eligibility. Procurement stores approval records, evidence references, approval status, and workflow state only.

## Approval Guardrails

Proposal-level rules:

- A PO cannot be approved without consumed Tenant Company permission/scope evidence.
- Approval evidence should include the policy/version or permission snapshot used at the time of approval.
- System admin overrides require explicit override flag, override reason, role/entity scope evidence, and audit reference.
- Expired or stale approval evidence should block submission or route to review.
- Approval states should remain separate from PO lifecycle status even when a PO status reflects approval progress.

## Vendor / Manufacturer Response Permissions

Vendors/manufacturers may respond to submitted POs where integration/onboarding allows. Response authority may depend on:

- Vendor/manufacturer onboarding state.
- Integration configuration.
- Tenant/vendor/manufacturer relationship eligibility.
- Role or external responder identity.
- Submitted PO target reference.
- External responder identity evidence placeholder.

Procurement records responses. Integration Management owns external connection, external identity mapping, and delivery/receipt evidence.

## System Admin Review

System admins may review/override where allowed by future policy. System admin actions should be auditable and should not bypass Tenant Company scope, Pricing evidence, integration evidence, or Logs & Audit requirements.

## AI Guardrails

AI Agent Services may recommend bulk purchase opportunities, draft PO suggestions, flag demand signals, compare vendor/manufacturer options, or identify inventory gaps.

AI must not create, submit, approve, cancel, or modify POs without approved action contracts and human/role approval where required.

## Audit Expectations

PO creation, approval, submission, revision, cancellation, vendor/manufacturer response, export/import, and status changes should be auditable. Logs & Audit owns audit evidence; Procurement owns PO workflow/state.