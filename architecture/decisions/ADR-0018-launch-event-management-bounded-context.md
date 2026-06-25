# ADR-0018: Launch / Event Management Bounded Context

## Status

Proposed

## Context

CIXCI needs a structured way to track upcoming and active launches, events, and time-based commercial moments across devices, accessories, branded merchandise, buyer readiness, vendor readiness, manufacturer readiness, and promotional planning.

Launch / Event Management may support:

- Device launches.
- Accessory launches.
- Branded merchandise launches.
- Product release windows.
- Vendor launch readiness.
- Manufacturer launch readiness.
- Buyer launch readiness.
- Promotional events.
- Seasonal campaigns.
- Webinar/event placeholders.
- Launch calendars.
- Notification triggers.
- AI launch readiness signals.
- Analytics/reporting signals.

This is different from Product Catalog or Device Catalog source-of-truth ownership. Product Catalog owns product records. Device Catalog owns canonical device records and lifecycle facts. Launch / Event Management should coordinate launch/event readiness and calendar-oriented workflow without becoming the source of product/device truth.

This ADR is proposal-level. It does not finalize launch/event types, readiness checklist implementation, notification schedules, campaign execution, webinar ownership, external calendar integration, or implementation behavior.

## Decision

Introduce Launch / Event Management as a distinct bounded context.

Launch / Event Management owns launch event records, event calendar records, launch readiness workflow placeholders, launch task/checklist placeholders, launch participant references, launch status lifecycle, launch milestone tracking, event visibility windows, notification trigger references, launch-related AI signal references, launch analytics signal references, promotional/event placeholders, launch exception/review states, and launch events.

Launch / Event Management must not become Product Catalog, Device Catalog, Pricing, Marketing Automation, Campaign Execution, Notification delivery, Analytics, AI Agent Services, Integration Management, or Tenant Company authority.

### Launch / Event Management Owns

- Launch event records.
- Event calendar records.
- Launch readiness workflow placeholders.
- Launch task/checklist placeholders.
- Launch participant references.
- Launch status lifecycle.
- Launch milestone tracking.
- Event visibility windows.
- Launch notification trigger references.
- Launch-related AI signal references.
- Launch analytics signal references.
- Promotional/event placeholders.
- Launch exception/review states.
- Launch events.

### Launch / Event Management Does Not Own

- Product Catalog source records.
- Device Catalog canonical records.
- Pricing calculations.
- Order Routing decisions.
- Fulfillment/Returns execution.
- Invoice Management lifecycle.
- Procurement / Purchase Orders lifecycle.
- Media asset ownership.
- Tenant Company eligibility/user permissions.
- Notification delivery.
- Analytics metric definitions.
- AI Agent recommendations.
- Legal/licensing workflow.
- External integration configuration.

## Relationship Boundaries

### Device Catalog

Device Catalog owns canonical device lifecycle facts such as Device Reference, release date, launch date, device identity, manufacturer ownership, and lifecycle state.

Launch / Event Management may coordinate readiness and visibility timing around device launches. Launch / Event Management may reference Device Catalog launch/release data but does not own it.

Launch / Event Management must not alter canonical Device Records, Device References, manufacturer source data, device identity, or device lifecycle state.

### Product Catalog

Product Catalog owns product source records, product lifecycle, product availability, compatibility, product media references, category validation, Product Type validation, and product visibility/activation/download state.

Launch / Event Management may coordinate launch readiness around accessories, branded merchandise, or product release windows. Product launch events may reference Product Catalog products but do not own product lifecycle.

Launch / Event Management must not create, modify, activate, deactivate, or publish product source records.

### Tenant Company

Tenant Company owns company/entity hierarchy, buyer/vendor/manufacturer references, users, roles, permissions, activation/readiness, product-type eligibility, licensed-property scope, region scope, and relationship eligibility.

Launch / Event Management may consume buyer, vendor, manufacturer, company/entity, participant, and readiness signals from Tenant Company. It must not grant permissions, infer eligibility, activate tenants, or decide buyer/vendor/manufacturer scope.

### Pricing

Pricing owns pricing rules, discounts, quotes, effective prices, price snapshots, pricing calculations, pricing exceptions, and commercial interpretation.

Launch / Event Management may consume pricing readiness signals or references for launch planning. It must not calculate prices, apply discounts, decide promotional pricing, or interpret Pricing conflicts.

### Media / Image Asset Management

Media / Image Asset Management owns image/media readiness, asset validation, transformations, URLs, downloadable assets, asset metadata, access controls, and processing state.

Launch / Event Management may consume media readiness signals and reference media readiness gaps. It must not process, approve, reject, transform, publish, or own media assets unless a future ADR assigns that behavior.

### Notification Platform Service

Launch / Event Management may emit events that trigger notifications. Notification Platform Service owns delivery, recipient resolution, templates, preferences, suppression, retries, and delivery history.

Possible triggers include launch scheduled, readiness blocked, launch ready, launch active, launch completed, launch cancelled, buyer readiness required, vendor readiness required, and manufacturer readiness required.

### Analytics / Reporting

Analytics may consume launch/event signals for launch performance, readiness delays, buyer adoption, vendor readiness, manufacturer launch coverage, campaign outcomes, product-type launch trends, and operational risk.

Analytics owns reporting models, metric definitions, dashboards, exports, and aggregations. Launch / Event Management owns launch records and status lifecycle.

### AI Agent Services

AI agents may identify launch readiness gaps, recommend buyer assortment readiness, suggest launch timing, flag missing media/content/pricing/integration readiness, and draft launch planning tasks.

AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes. Launch / Event Management owns approved launch records and launch readiness workflow state.

AI agents must not change launch status, publish launch events, trigger buyer-facing actions, override readiness blockers, or bypass permissions without approved action contracts and proper permissions.

### Integration Management

Integration Management may track external launch-related tasks, ClickUp/project-tool references, calendar integrations, webhook/API notifications, or launch readiness external actions where approved.

External tools must not become source of truth for CIXCI launch records. Launch / Event Management owns CIXCI launch record/status. Integration Management owns external connection/action references, external ID mappings, credentials references, delivery/receipt evidence, and integration state.

### Logs & Audit File Tracking

Launch creation, readiness updates, status changes, exceptions, participant readiness, notification trigger references, external task references, and AI-assisted launch actions should be auditable.

Logs & Audit owns audit evidence. Launch / Event Management owns launch workflow state.

### Procurement / Purchase Orders

Procurement / Purchase Orders may consume launch signals for bulk purchase planning, device launch buying, accessory launch buying, branded merchandise launch buying where enabled, or event inventory planning.

Procurement owns PO lifecycle. Launch / Event Management does not own PO creation, approval, submission, receiving, invoice eligibility, or payment.

### Order Routing

Order Routing owns normal buyer customer order routing, routed suborders, routing snapshots, split-order decisions, routing exceptions, and routing retry/review workflows.

Launch / Event Management may provide launch/event context or readiness signals, but it must not route customer orders, create routed suborders, or alter routing decisions.

### Fulfillment / Returns

Fulfillment / Returns owns fulfillment execution, shipment status, delivery status, return operational state, replacement execution, and fulfillment/return exceptions.

Launch / Event Management may track readiness or event timing that depends on fulfillment readiness, but it must not execute fulfillment, process returns, or decide replacement workflows.

### Invoice Management

Invoice Management owns invoice lifecycle, invoice records, invoice reports, invoice exports, invoice status, invoice history, and reconciliation placeholders.

Launch / Event Management may provide launch/event references for future reporting context, but it must not generate invoices, determine invoice eligibility, or process payments.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability and does not create a full Warranty Management bounded context yet.

Launch / Event Management may reference warranty readiness or support signals where relevant to launch planning, but it must not own warranty registration delivery, warranty claim eligibility, warranty claim approval, or replacement execution.

## Launch Types

Proposal-level launch/event types include:

- Device Launch.
- Accessory Launch.
- Product Release.
- Branded Merchandise Launch.
- Vendor Launch Event.
- Manufacturer Launch Event.
- Buyer Launch Readiness Event.
- Promotional Campaign Event.
- Seasonal Campaign Event.
- Webinar / Training Event placeholder.
- Operational Readiness Event placeholder.

## Launch Inputs

Proposal-level launch inputs include:

- Device Reference from Device Catalog.
- Product Catalog product reference.
- Product Type.
- Vendor/manufacturer/buyer references from Tenant Company.
- Launch date / release date / visibility window.
- Readiness checklist placeholder.
- Media readiness signal placeholder.
- Pricing readiness signal placeholder.
- Product availability signal placeholder.
- Integration readiness signal placeholder.
- Notification preference/schedule placeholder.
- AI readiness recommendation reference placeholder.
- Analytics tracking reference placeholder.

Inputs are consumed for launch/event workflow only. They do not transfer source-of-truth ownership into Launch / Event Management.

## Launch Outputs

Proposal-level launch outputs include:

- Launch event record.
- Launch status.
- Launch milestone record.
- Launch checklist/status placeholder.
- Participant readiness state.
- Launch calendar view.
- Notification trigger reference.
- Analytics signal.
- AI launch readiness signal.
- Exception/review state.
- Launch event events.

## Launch Status Lifecycle

Proposal-level statuses:

- Draft.
- Scheduled.
- Readiness Review.
- Ready.
- Blocked.
- Active.
- Completed.
- Cancelled.
- Superseded.
- Review Required.

Status definitions remain proposal-level. Future module work should define allowed transitions, terminal states, supersession behavior, visibility window behavior, readiness blocker behavior, and participant-level readiness behavior.

## Device Launch Relationship

Device Catalog owns canonical device lifecycle facts such as Device Reference, release date, launch date, device identity, manufacturer ownership, and lifecycle state.

Launch / Event Management may coordinate readiness and visibility timing around device launches.

Launch / Event Management must not alter canonical Device Records or Device References.

Launch events may reference Device Catalog launch/release data but do not own it.

## Product / Accessory Launch Relationship

Product Catalog owns product source records, product lifecycle, product availability, compatibility, and product media references.

Launch / Event Management may coordinate launch readiness around accessories or branded products.

Launch / Event Management must not create or modify product source records.

Product launch events may reference Product Catalog products but do not own product lifecycle.

## Promotion / Campaign Boundary

Launch / Event Management may track promotional/campaign event windows and readiness placeholders.

Pricing owns pricing rules, discounts, quotes, effective prices, and pricing interpretation.

Notification Platform Service owns delivery.

Analytics owns reporting outcomes.

AI Agent Services may recommend promotional timing or planning.

Launch / Event Management must not become Pricing, Marketing Automation, or Campaign Execution unless a future ADR assigns that scope.

## Notification Hooks

Launch / Event Management may emit events that trigger notifications.

Notification Platform Service owns delivery.

Possible notification triggers include:

- Launch scheduled.
- Readiness blocked.
- Launch ready.
- Launch active.
- Launch completed.
- Launch cancelled.
- Buyer readiness required.
- Vendor readiness required.
- Manufacturer readiness required.

## AI Agent Services Relationship

AI agents may identify launch readiness gaps, recommend buyer assortment readiness, suggest launch timing, flag missing media/content/pricing/integration readiness, and draft launch planning tasks.

AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes.

Launch / Event Management owns approved launch records and launch readiness workflow state.

AI agents must not change launch status, publish launch events, or trigger buyer-facing actions without approved action contracts and proper permissions.

## Analytics Relationship

Analytics may consume launch/event signals for launch performance, readiness delays, buyer adoption, vendor readiness, manufacturer launch coverage, campaign outcomes, and product-type launch trends.

Analytics owns reporting models and metrics.

Launch / Event Management owns launch records and status lifecycle.

## Media Relationship

Media / Image Asset Management owns image/media readiness, asset validation, transformations, URLs, downloadable assets, and asset metadata.

Launch / Event Management may consume media readiness signals but must not process or approve media assets unless future ADR assigns that behavior.

## Integration Relationship

Integration Management may track external launch-related tasks, ClickUp/project-tool references, calendar integrations, webhook/API notifications, or launch readiness external actions where approved.

External tools must not become source of truth for CIXCI launch records.

Launch / Event Management owns CIXCI launch record/status.

Integration Management owns external connection/action references.

## Logs & Audit Relationship

Launch creation, readiness updates, status changes, exceptions, participant readiness, notification trigger references, external task references, and AI-assisted launch actions should be auditable.

Logs & Audit owns audit evidence.

Launch / Event Management owns launch workflow state.

## Procurement Relationship

Procurement / Purchase Orders may consume launch signals for bulk purchase planning, device launch buying, accessory launch buying, or event inventory planning.

Procurement owns PO lifecycle.

Launch / Event Management does not own PO creation, approval, submission, receiving, or payment.

## Events

Proposal-level events:

- `launch.event.created`.
- `launch.event.updated`.
- `launch.event.scheduled`.
- `launch.event.readiness-review.started`.
- `launch.event.ready`.
- `launch.event.blocked`.
- `launch.event.active`.
- `launch.event.completed`.
- `launch.event.cancelled`.
- `launch.event.superseded`.
- `launch.event.review-required`.
- `launch.participant.readiness.updated`.
- `launch.milestone.completed`.
- `launch.notification-trigger.requested`.
- `launch.ai-readiness-signal.created`.

Event payloads should use references, tenant/entity scope, launch type, launch status, participant references, readiness state, milestone references, visibility window references, redaction class, and audit references where applicable. Events should not expose unrestricted product, device, pricing, tenant, media, integration, licensing, or commercial details.

## Open Questions

- Which launch/event types are supported at launch?
- Should launch records be created automatically from Device Catalog launch dates or manually by admins?
- Should accessory launches be vendor-managed, admin-managed, or system-generated from Product Catalog data?
- Who can mark launch readiness complete?
- What readiness checklist items are required by launch type?
- How do launch visibility windows interact with Product Catalog visibility?
- What notifications should be immediate versus digest?
- Should Launch / Event Management manage webinars/training events or should that stay separate?
- Should campaign/promotion execution become a future Marketing/Campaign Management context?
- How are external project tools used without becoming source of truth?
- Which launch events should Analytics track?
- Which launch readiness signals may AI agents consume?
- How do launches support device/accessory bulk procurement planning?

## Impacts

Future Launch / Event Management module drafting should define:

- Launch event record and event calendar model.
- Launch type model.
- Launch status lifecycle and transition rules.
- Readiness checklist placeholder model.
- Participant readiness state model.
- Milestone tracking model.
- Event visibility window model.
- Notification trigger reference model.
- AI readiness signal reference model.
- Analytics signal contract.
- Integration reference model for external project/calendar/tool references.
- Logs & Audit references for launch workflow and status changes.
- Boundaries with Product Catalog, Device Catalog, Pricing, Tenant Company, Media, Notification, Analytics, Integration, Procurement, Order Routing, Fulfillment/Returns, Invoice Management, Warranty support, and AI Agent Services.

Future Product Catalog, Device Catalog, Pricing, Tenant Company, Media, Notification, Analytics, Integration Management, Procurement, Order Routing, Fulfillment/Returns, Invoice Management, Logs & Audit, Warranty support, and AI Agent Services refinements should preserve Launch / Event Management as the owner of launch/event coordination without moving source-of-truth responsibilities into it.

## Consequences

- Launch / Event Management becomes the bounded context for launch records, calendar views, readiness placeholders, participant readiness, launch status lifecycle, milestones, launch event windows, exceptions, and launch signals.
- Product Catalog and Device Catalog remain source-of-truth for product and device records.
- Pricing remains owner of pricing interpretation and commercial calculation.
- Tenant Company remains owner of participant scope, permissions, and eligibility.
- Notification Platform Service, Analytics, AI Agent Services, Integration Management, Logs & Audit, Procurement, Fulfillment/Returns, Invoice Management, Media, and Warranty support can participate through references/signals without owning launch workflow state.
- Future module work should happen after this bounded-context boundary is accepted.
