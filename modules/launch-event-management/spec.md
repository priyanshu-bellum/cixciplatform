# Launch / Event Management Specification

This document is proposal-level architecture. It defines initial Launch / Event Management scope without finalizing launch/event types, readiness checklist implementation, campaign execution, webinar ownership, notification schedules, external calendar integration, or implementation behavior.

## Purpose

Provide a bounded context for coordinating launch and event readiness across devices, accessories, branded merchandise, buyers, vendors, manufacturers, promotional windows, and time-based commercial moments without turning Launch / Event Management into Product Catalog, Device Catalog, Pricing, Marketing Automation, Notification, Analytics, AI Agent Services, Media, Integration Management, Procurement, or operational execution ownership.

## Scope

Launch / Event Management owns:

- Launch event records.
- Event calendar records.
- Launch readiness workflow placeholders.
- Launch checklist placeholders.
- Launch task/checklist placeholders.
- Source-owned readiness evidence references.
- Launch participant references.
- Launch participant readiness state.
- Launch milestone tracking.
- Launch status lifecycle.
- Status transition guard placeholders.
- Event visibility windows.
- Launch notification trigger references.
- Launch-related AI signal references.
- Launch analytics signal references.
- Promotional/event placeholders.
- Launch exception/review states.
- Launch events.

## Out Of Scope

Launch / Event Management does not own:

- Product Catalog source records, product facts, product lifecycle, product visibility, product publishing, compatibility, availability, activation, or product media references.
- Device Catalog canonical records, device facts, Device References, identity, release dates, launch dates, manufacturer ownership, or lifecycle state.
- Pricing calculations, pricing readiness facts, pricing rules, discounts, quotes, effective prices, price snapshots, or commercial interpretation.
- Marketing Automation or Campaign Execution.
- Notification delivery, templates, preferences, recipient resolution, retries, suppression, digest behavior, fanout controls, or delivery history.
- Analytics metric definitions, dashboards, reports, read models, exports, or aggregation.
- AI Agent recommendations, confidence scores, drafts, or action outcomes.
- Media asset readiness facts, processing, validation, transformation, approval, URL generation, storage, or access policy.
- Integration connection state, credentials, external ID mapping, delivery/receipt evidence, or external action execution records.
- Logs & Audit evidence records.
- Procurement / Purchase Orders lifecycle.
- Order Routing decisions or routed suborders.
- Fulfillment/Returns execution.
- Invoice Management lifecycle or payment processing.
- Warranty registration delivery, claim eligibility, claim approval, or replacement execution.
- Tenant Company eligibility, roles, permissions, activation, or relationship authority.
- Legal/licensing workflow.

## Launch / Event Types

Proposal-level launch/event types:

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

Proposal-level inputs:

- Device Reference from Device Catalog.
- Product Catalog product reference.
- Product Type.
- Vendor/manufacturer/buyer references from Tenant Company.
- Launch date / release date / visibility window.
- Readiness checklist placeholder.
- Source-owned readiness evidence references.
- Media readiness signal placeholder.
- Pricing readiness signal placeholder.
- Product availability signal placeholder.
- Integration readiness signal placeholder.
- Tenant readiness signal placeholder.
- Procurement readiness/planning signal placeholder.
- Notification preference/schedule placeholder.
- AI readiness recommendation reference placeholder.
- Analytics tracking reference placeholder.

Inputs are consumed for launch/event workflow only and do not transfer source-of-truth ownership into Launch / Event Management.

## Launch Outputs

Proposal-level outputs:

- Launch event record.
- Launch status.
- Launch milestone record.
- Launch checklist/status placeholder.
- Participant readiness state.
- Launch calendar view.
- Notification trigger reference.
- Analytics signal.
- AI launch readiness signal.
- Procurement planning signal placeholder.
- Exception/review state.
- Launch event events.

## Source-Owned Readiness Evidence

Launch / Event Management coordinates readiness but must not independently decide media readiness, pricing readiness, product availability, integration readiness, tenant readiness, or procurement readiness.

Source readiness evidence should include source readiness signal id, signal version/hash, authority module, source module reference, source disposition, freshness timestamp, expiration timestamp, stale/missing signal state, waiver/override flag, waiver approver, waiver reason, audit evidence reference, and recheck-required flag.

Source modules own readiness facts. Manual waivers/overrides must be auditable and reviewable.

## Visibility And Source Lifecycle Evidence

Launch visibility windows coordinate launch timing only.

Visibility window evidence should include source visibility reference, source visibility version/hash, source lifecycle reference, source lifecycle version/hash, source launch date reference, source release date reference, conflict reason, stale source state, missing source state, recheck-before-active flag, and visibility-window review state.

Launch Active does not mean Product Active. Launch Active does not mean Device Active. Product Catalog owns product visibility, product lifecycle, and product publishing. Device Catalog owns device lifecycle, release dates, and launch dates. Conflicts between launch timing and source lifecycle dates route to review.

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

Status definitions and allowed transitions remain proposal-level. Future hardening should define terminal states, supersession behavior, visibility window behavior, readiness blocker behavior, participant-level readiness behavior, and status-change permission rules.

## Status Transition Guards

Proposal-level transition controls:

- Allowed transition placeholders.
- Required readiness evidence by launch type.
- Blocker rules.
- Source-signal freshness requirements.
- Waiver rules.
- Override evidence.
- Role authority reference.
- Review-required behavior.
- Terminal states.
- Supersession handling.
- Cancellation reason.
- Active-state recheck.
- Completed-state evidence.

Mark Ready and Mark Active actions require source-owned readiness evidence or approved waiver placeholders. Launch status changes do not mutate Product Catalog or Device Catalog state. Conflicting source facts block or route launch status transition to review.

## Device Launch Relationship

Device Catalog owns canonical device lifecycle facts such as Device Reference, release date, launch date, device identity, manufacturer ownership, and lifecycle state.

Launch / Event Management may coordinate readiness and visibility timing around device launches. Launch events may reference Device Catalog launch/release data but do not own it.

Launch / Event Management must not alter canonical Device Records, Device References, manufacturer source data, device identity, release dates, launch dates, or device lifecycle state.

## Product / Accessory Launch Relationship

Product Catalog owns product source records, product lifecycle, product availability, product visibility, product publishing, compatibility, and product media references.

Launch / Event Management may coordinate launch readiness around accessories, product releases, or branded products. Product launch events may reference Product Catalog products but do not own product lifecycle.

Launch / Event Management must not create, modify, activate, deactivate, publish, or infer product source records.

## Promotion / Campaign Boundary

Launch / Event Management may track promotional/campaign event windows and readiness placeholders.

Pricing owns pricing rules, discounts, quotes, effective prices, and pricing interpretation. Notification Platform Service owns delivery. Analytics owns reporting outcomes. AI Agent Services may recommend promotional timing or planning.

Launch / Event Management must not become Pricing, Marketing Automation, or Campaign Execution unless a future ADR assigns that scope.

## Notification Hooks

Launch / Event Management may emit events that trigger notifications. Notification Platform Service owns delivery.

Possible triggers:

- Launch scheduled.
- Readiness blocked.
- Launch ready.
- Launch active.
- Launch completed.
- Launch cancelled.
- Buyer readiness required.
- Vendor readiness required.
- Manufacturer readiness required.
- Notification fanout requested placeholder.

## AI Agent Services Relationship

AI agents may identify launch readiness gaps, recommend buyer assortment readiness, suggest launch timing, flag missing media/content/pricing/integration readiness, and draft launch planning tasks.

AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes. Launch / Event Management owns approved launch records and launch readiness workflow state.

AI agents must not change launch status, publish launch events, override readiness blockers, or trigger buyer-facing actions without approved action contracts and proper permissions.

## Analytics Relationship

Analytics may consume launch/event signals for launch performance, readiness delays, buyer adoption, vendor readiness, manufacturer launch coverage, campaign outcomes, and product-type launch trends.

Analytics owns reporting models and metrics. Launch / Event Management owns launch records and status lifecycle.

## Media Relationship

Media / Image Asset Management owns image/media readiness, asset validation, transformations, URLs, downloadable assets, and asset metadata.

Launch / Event Management may consume media readiness signals and reference media readiness gaps but must not process or approve media assets unless a future ADR assigns that behavior.

## Integration Relationship

Integration Management may track external launch-related tasks, ClickUp/project-tool references, calendar integrations, webhook/API notifications, or launch readiness external actions where approved.

External tools must not become source of truth for CIXCI launch records. Launch / Event Management owns CIXCI launch record/status. Integration Management owns external connection/action references.

## Logs & Audit Relationship

Launch creation, readiness updates, waivers/overrides, status changes, exceptions, participant readiness, notification trigger references, external task references, and AI-assisted launch actions should be auditable.

Logs & Audit owns audit evidence. Launch / Event Management owns launch workflow state.

## Procurement Relationship

Procurement / Purchase Orders may consume launch signals for bulk purchase planning, device launch buying, accessory launch buying, or event inventory planning.

Procurement owns PO lifecycle. Launch / Event Management does not own PO creation, approval, submission, receiving, invoice eligibility, or payment.

## Scale Controls

Proposal-level controls should include tenant/date partitioning, calendar pagination, calendar filter indexing placeholders, recurring event placeholder, seasonal event placeholder, participant count caps/placeholders, checklist item caps/placeholders, readiness queue priority, notification fanout controls, digest handoff to Notification, stale-read warnings, retention window placeholders, external task/reference volume controls, and AI readiness signal volume controls.

## Proposal-Level Constraints

- Preserve ADR-0018 boundaries.
- Keep unresolved launch/event behavior proposal-level.
- Do not alter canonical Device Records or Product Catalog source records.
- Do not decide pricing, promotional pricing, product visibility, product publishing, media readiness, tenant eligibility, notification delivery, analytics metrics, procurement POs, routing decisions, fulfillment state, invoice lifecycle, warranty state, or external integration state.
- Do not create Marketing/Campaign Management, Licensing, Payment, or Vendor Operational Interface modules.
