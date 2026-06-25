# Launch / Event Management API Contracts

This document is proposal-level architecture. It defines domain API contract concepts without finalizing endpoint design, authentication implementation, lifecycle transition rules, external calendar behavior, notification scheduling, or schema.

## API Principles

- APIs must enforce Tenant Company scope, roles, permissions, activation/readiness, participant eligibility, Product Type enablement, licensed-property scope, and region scope where applicable.
- Launch APIs expose launch/event workflow records and references only.
- Launch APIs must not mutate Product Catalog source records, Device Catalog canonical records, Pricing rules, Media assets, Procurement POs, Order Routing decisions, Fulfillment/Returns state, Invoice lifecycle, Warranty state, Notification delivery, Analytics metrics, Integration credentials/state, Logs & Audit evidence, or AI recommendations.
- Source module references should be preserved rather than copied as source-of-truth records.
- Source-owned readiness evidence is required where readiness depends on media, pricing, product availability, integration, tenant, procurement, product, or device facts.
- External project/calendar/task references should flow through Integration Management references where applicable.

## Launch Draft APIs

Proposal-level APIs:

- Create launch event draft.
- Update launch event draft.
- Set launch/event type.
- Add Device Reference placeholder.
- Add Product Catalog product reference placeholder.
- Set Product Type.
- Add buyer/vendor/manufacturer participant reference.
- Set launch date / release date / visibility window.
- Attach AI readiness recommendation reference placeholder.
- Validate launch draft.

## Scheduling APIs

Proposal-level APIs:

- Schedule launch event.
- Reschedule launch event placeholder.
- Cancel launch event.
- Supersede launch event.
- Get launch calendar view.
- List launches by date range.
- List launches by participant scope.
- Validate source lifecycle / visibility timing placeholder.

Scheduling APIs coordinate launch calendar records only. Product Catalog and Device Catalog remain authoritative for product/device visibility and lifecycle facts.

## Readiness APIs

Proposal-level APIs:

- Start readiness review.
- Add/update checklist placeholder.
- Add/update launch task/checklist item placeholder.
- Update checklist item status.
- Update participant readiness state.
- Record readiness blocker.
- Link readiness evidence record.
- Link media readiness signal placeholder.
- Link pricing readiness signal placeholder.
- Link product availability signal placeholder.
- Link integration readiness signal placeholder.
- Link tenant readiness signal placeholder.
- Link procurement readiness/planning signal placeholder.
- Apply readiness waiver/override placeholder.
- Mark launch ready placeholder.
- Mark launch blocked placeholder.

Readiness APIs must not process media, calculate pricing, activate products, alter device lifecycle, configure integrations, create POs, or grant tenant eligibility.

## Status APIs

Proposal-level APIs:

- Mark launch ready.
- Mark launch active.
- Mark launch completed.
- Mark launch cancelled.
- Mark launch review required.
- Get launch status history.
- Get launch exception/review state.
- Validate transition guard placeholder.

Allowed transitions and terminal states remain proposal-level. Mark Ready and Mark Active actions require source-owned readiness evidence or approved waiver placeholders.

## Milestone APIs

Proposal-level APIs:

- Create milestone.
- Update milestone.
- Mark milestone completed.
- Mark milestone blocked.
- List milestones by launch event.

## Notification Trigger APIs

Proposal-level APIs:

- Create notification trigger reference.
- Request notification trigger placeholder.
- Request notification fanout placeholder.
- Get notification trigger status placeholder.

Notification Platform Service owns delivery, templates, preferences, recipient resolution, retries, suppression, digest behavior, fanout controls, and delivery history.

## AI Signal APIs

Proposal-level APIs:

- Link AI readiness recommendation reference.
- Record AI readiness signal reference.
- Review AI launch planning task draft placeholder.

AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes. Launch APIs must not let AI change launch status, publish launch events, or trigger buyer-facing actions without approved action contracts and permissions.

## Analytics Signal APIs

Proposal-level APIs:

- Create analytics tracking reference placeholder.
- Emit analytics signal placeholder.
- Get launch analytics signal references.

Analytics owns metric definitions, reporting models, dashboards, and aggregations.

## Integration Reference APIs

Proposal-level APIs:

- Link external project/task reference placeholder.
- Link external calendar reference placeholder.
- Get external reference status placeholder.
- Record external reference conflict placeholder.

Integration Management owns external connection state, credentials, external ID mapping, delivery/receipt evidence, and external action records.

## Lookup APIs

Proposal-level APIs:

- Get launch event by id.
- List launch events by type.
- List launch events by status.
- List launch events by participant.
- List launch events by Product Type.
- List launch events by Device Reference.
- List launch events by Product Catalog product reference.
- List launch exceptions/review states.
- List calendar results with pagination placeholder.

## Error And Review States

Proposal-level errors:

- Invalid tenant/company/entity scope.
- Missing Tenant Company permission/scope.
- Invalid launch/event type.
- Invalid or unsupported status transition.
- Missing required readiness evidence.
- Readiness signal missing or stale.
- Waiver/override evidence missing.
- Device Reference invalid or unavailable.
- Product Catalog product reference invalid or unavailable.
- Product Type not enabled.
- Participant reference invalid or inactive.
- Missing readiness checklist placeholder.
- Media readiness signal missing or blocked.
- Pricing readiness signal missing or blocked.
- Product availability signal missing or blocked.
- Integration readiness signal missing or blocked.
- Tenant readiness signal missing or blocked.
- Procurement readiness/planning conflict.
- Visibility window conflict.
- Source lifecycle conflict.
- Recheck required before active.
- Notification trigger not allowed for status.
- AI action contract missing.
- External project/calendar reference conflict.

## Idempotency, Scale, And Audit

Create, schedule, status-change, readiness-update, participant-readiness, milestone, notification-trigger, AI-signal, and external-reference APIs should use idempotency keys where appropriate. Calendar lookup should support pagination and tenant/date partitioning placeholders. Launch workflow actions should be auditable. Logs & Audit owns audit evidence; Launch / Event Management owns launch workflow state.