# Launch / Event Management Permissions

This document is proposal-level architecture. It defines initial permission concepts without finalizing roles, approval thresholds, readiness authority, identity provider behavior, or launch status transition rules.

## Permission Principles

- Tenant Company owns roles, permissions, company/entity scope, buyer/vendor/manufacturer eligibility, activation/readiness, Product Type enablement, licensed-property scope, region scope, and relationship eligibility.
- Launch / Event Management consumes Tenant Company scope and permissions; it does not define tenant eligibility.
- Launch / Event Management records launch workflow actions, status changes, readiness updates, participant readiness updates, milestones, waivers/overrides, and review states.
- System admins may manage or review launch events where allowed.
- Buyers, vendors, and manufacturers may participate in launch readiness where permissions and scope allow.
- AI agents must not create, modify, publish, cancel, or change launch status without approved action contracts and human/role approval where required.

## Proposal-Level Roles

- Launch Manager placeholder.
- Launch Viewer placeholder.
- Launch Readiness Contributor placeholder.
- Launch Approver placeholder.
- Buyer Launch Participant placeholder.
- Vendor Launch Participant placeholder.
- Manufacturer Launch Participant placeholder.
- System Admin Launch Reviewer placeholder.
- External Integration Operator placeholder.

Exact role names and mappings remain unresolved.

## Permission Actions

Proposal-level actions:

- Create launch draft.
- Edit launch draft.
- Schedule launch.
- Reschedule launch placeholder.
- Cancel launch.
- Supersede launch.
- Start readiness review.
- Update checklist/task placeholder.
- Link source-owned readiness evidence.
- Apply readiness waiver/override placeholder.
- Update participant readiness.
- Mark milestone complete.
- Mark launch ready.
- Mark launch blocked.
- Mark launch active.
- Mark launch completed.
- Link notification trigger reference.
- Link AI readiness signal reference.
- Link analytics tracking reference.
- Link external project/calendar reference.
- Review launch exception.
- View launch calendar.

## Status Change Guardrails

Proposal-level rules:

- Status changes should require explicit actor, role/scope evidence, status reason where applicable, and audit reference.
- Status transitions should check allowed transition placeholders, required readiness evidence by launch type, blocker rules, source-signal freshness requirements, waiver rules, override evidence, role authority reference, review-required behavior, terminal states, supersession handling, cancellation reason, active-state recheck, and completed-state evidence.
- Marking launch ready should require source-owned readiness evidence or documented waiver placeholders.
- Marking launch active should require source-owned readiness evidence or approved waiver placeholders plus active-state recheck where required.
- Launch status changes must not mutate Product Catalog product lifecycle or Device Catalog device lifecycle.
- Marking launch active must not publish product records, alter device records, trigger notification delivery directly, create POs, route orders, or execute fulfillment.
- Conflicting source facts block or route launch status transition to review.
- Cancelled, completed, and superseded behavior remains proposal-level.

## Readiness Waiver / Override Permissions

Manual waivers and overrides are proposal-level placeholders and should include:

- Waiver/override flag.
- Waiver approver.
- Waiver reason.
- Source readiness signal reference where applicable.
- Source disposition.
- Role authority reference.
- Audit evidence reference.
- Recheck-required flag where applicable.

Manual waivers or overrides must be auditable and reviewable. Waivers do not change source-module readiness facts.

## Participant Readiness Permissions

Participant readiness updates may depend on:

- Company/entity scope.
- Participant type: buyer, vendor, manufacturer, system admin, internal, future value.
- Readiness checklist item ownership.
- Tenant Company role/permission evidence.
- Launch/event type.
- Product Type, licensed-property scope, or region where applicable.

Launch / Event Management records readiness state. Tenant Company owns participant eligibility and role/permission authority.

## External Reference Permissions

External project/task/calendar references may be linked where allowed by policy and Integration Management configuration.

Integration Management owns external connection state, credentials, external ID mapping, external action records, and delivery/receipt evidence. Launch / Event Management stores external launch references only.

## AI Guardrails

AI Agent Services may identify readiness gaps, recommend timing, draft planning tasks, or flag missing media/content/pricing/integration readiness.

AI must not create, modify, publish, cancel, mark ready, mark active, or trigger buyer-facing actions without approved action contracts and human/role approval where required.

## Audit Expectations

Launch creation, scheduling, readiness updates, waivers/overrides, status changes, participant readiness updates, milestone completion, exception review, notification trigger references, external references, and AI-assisted actions should be auditable. Logs & Audit owns audit evidence; Launch / Event Management owns launch workflow state.