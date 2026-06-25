# Launch / Event Management Data Model

This document is proposal-level architecture. It defines initial entities without finalizing schema, launch numbering, checklist implementation, participant readiness rules, visibility window behavior, notification scheduling, or external calendar integration.

## Entities

### Core Launch

- Launch Event Record.
- Event Calendar Record.
- Launch Status History.
- Launch Type Reference.
- Launch Visibility Window.
- Launch Exception / Review State.
- Launch Supersession Reference.

### Readiness

- Launch Readiness Workflow Placeholder.
- Launch Checklist Placeholder.
- Launch Task / Checklist Item Placeholder.
- Launch Checklist Status Placeholder.
- Participant Readiness State.
- Readiness Evidence Record.
- Readiness Blocker Reference.
- Readiness Signal Reference.
- Readiness Waiver / Override Reference.

### Participants And References

- Launch Participant Reference.
- Buyer Participant Reference.
- Vendor Participant Reference.
- Manufacturer Participant Reference.
- Tenant Company Scope Reference.
- Device Catalog Device Reference.
- Product Catalog Product Reference.
- Product Type Reference.

### Cross-Module Signals

- Media Readiness Signal Placeholder.
- Pricing Readiness Signal Placeholder.
- Product Availability Signal Placeholder.
- Integration Readiness Signal Placeholder.
- Tenant Readiness Signal Placeholder.
- Procurement Readiness / Planning Signal Placeholder.
- Notification Preference / Schedule Placeholder.
- Launch Notification Trigger Reference.
- AI Readiness Recommendation Reference Placeholder.
- Analytics Tracking Reference Placeholder.
- Logs & Audit Reference.

## Launch Event Record

Proposal-level fields:

- Launch event id.
- Launch event name.
- Launch type: Device Launch, Accessory Launch, Product Release, Branded Merchandise Launch, Vendor Launch Event, Manufacturer Launch Event, Buyer Launch Readiness Event, Promotional Campaign Event, Seasonal Campaign Event, Webinar / Training Event placeholder, Operational Readiness Event placeholder.
- Tenant/company/entity scope reference.
- Buyer/vendor/manufacturer participant references.
- Device Reference where applicable.
- Product Catalog product reference where applicable.
- Product Type.
- Launch date placeholder.
- Release date placeholder.
- Visibility window reference.
- Readiness workflow reference.
- Checklist/status reference.
- Readiness evidence references.
- Milestone references.
- Launch status: Draft, Scheduled, Readiness Review, Ready, Blocked, Active, Completed, Cancelled, Superseded, Review Required.
- Status transition guard reference placeholder.
- Notification trigger references.
- AI readiness signal references.
- Analytics signal references.
- Exception/review state reference.
- Supersession reference.
- Created by / created at.
- Updated by / updated at.
- Audit reference.

## Event Calendar Record

Proposal-level fields:

- Calendar record id.
- Launch event id.
- Calendar scope: platform, buyer, vendor, manufacturer, internal, future value.
- Calendar start datetime.
- Calendar end datetime.
- Timezone placeholder.
- Visibility window reference.
- Audience/participant scope reference.
- Calendar status placeholder.
- External calendar reference placeholder.
- Integration Management reference placeholder.
- Audit reference.

Calendar records are launch views and scheduling references. They are not Product Catalog visibility records, Notification schedules, or external calendar source-of-truth records.

## Launch Visibility Window

Proposal-level fields:

- Visibility window id.
- Launch event id.
- Window start.
- Window end.
- Window type: planning, readiness, buyer-visible, vendor-visible, manufacturer-visible, internal, promotional placeholder.
- Audience scope.
- Source visibility reference.
- Source visibility version/hash.
- Source lifecycle reference.
- Source lifecycle version/hash.
- Source launch date reference.
- Source release date reference.
- Conflict reason.
- Stale source state.
- Missing source state.
- Recheck-before-active flag.
- Visibility-window review state.

Launch visibility windows coordinate launch timing. Product Catalog owns product visibility, product lifecycle, product publishing, and product availability. Device Catalog owns device release facts, launch dates, and lifecycle state. Launch Active does not mean Product Active. Launch Active does not mean Device Active. Conflicts between launch timing and source lifecycle dates route to review.

## Source-Owned Readiness Evidence Record

Launch / Event Management coordinates readiness but must not independently decide media readiness, pricing readiness, product availability, integration readiness, tenant readiness, or procurement readiness. Source modules own readiness facts.

Proposal-level fields:

- Readiness evidence id.
- Launch event id.
- Related checklist item reference where applicable.
- Related participant readiness reference where applicable.
- Readiness category: media, pricing, product availability, integration, tenant, procurement, device, product, future value.
- Source readiness signal id.
- Source readiness signal version/hash.
- Authority module.
- Source module reference.
- Source disposition: ready, blocked, missing, stale, not-applicable, review-required placeholder.
- Freshness timestamp.
- Expiration timestamp.
- Stale signal state.
- Missing signal state.
- Waiver/override flag.
- Waiver approver.
- Waiver reason.
- Audit evidence reference.
- Recheck-required flag.

Manual waivers or overrides must be auditable and reviewable. Waivers are launch coordination evidence only; they do not change source-module readiness facts.

## Launch Readiness Workflow Placeholder

Proposal-level fields:

- Readiness workflow id.
- Launch event id.
- Launch type.
- Readiness status.
- Checklist reference.
- Required readiness evidence references.
- Required signal references.
- Media readiness signal placeholder.
- Pricing readiness signal placeholder.
- Product availability signal placeholder.
- Integration readiness signal placeholder.
- Tenant readiness signal placeholder.
- Procurement readiness/planning signal placeholder.
- Participant readiness summary.
- Blocker references.
- Waiver/override references.
- Review owner placeholder.
- Audit reference.

## Launch Checklist / Task Placeholder

Proposal-level fields:

- Checklist id.
- Launch event id.
- Checklist template reference placeholder.
- Checklist item id.
- Checklist item type.
- Required flag placeholder.
- Owner participant reference.
- Source module reference.
- Readiness evidence reference.
- Source readiness signal id.
- Source readiness signal version/hash.
- Authority module.
- Source disposition.
- Freshness timestamp.
- Expiration timestamp.
- Stale signal state.
- Missing signal state.
- Status: pending, ready, blocked, waived, review-required placeholder.
- Due date placeholder.
- Completion reference.
- Waiver/override flag.
- Waiver approver.
- Waiver reason.
- Blocker reference.
- Audit evidence reference.
- Recheck-required flag.

Checklist items are coordination placeholders and do not mutate Product Catalog, Device Catalog, Pricing, Media, Integration, Notification, Procurement, Tenant Company, or other source records.

## Participant Readiness State

Proposal-level fields:

- Participant readiness id.
- Launch event id.
- Participant type: buyer, vendor, manufacturer, system admin, internal, future value.
- Participant company/entity reference from Tenant Company.
- Participant role/reference placeholder.
- Readiness status: not-started, pending, ready, blocked, not-applicable, review-required placeholder.
- Readiness evidence references.
- Readiness signal references.
- Readiness blocker reference.
- Waiver/override reference placeholder.
- Last updated by / last updated at.
- Audit reference.

Tenant Company owns participant scope, roles, permissions, activation, and eligibility. Launch / Event Management stores readiness workflow state only.

## Launch Milestone Record

Proposal-level fields:

- Milestone id.
- Launch event id.
- Milestone type.
- Milestone name.
- Planned date.
- Actual completion date placeholder.
- Status: pending, completed, blocked, missed, waived, review-required placeholder.
- Owner participant reference.
- Source dependency reference placeholder.
- Readiness evidence reference where applicable.
- Audit reference.

## Status Transition Guard Reference

Proposal-level fields:

- Transition guard id.
- Launch event id.
- From status.
- To status.
- Allowed transition placeholder.
- Required readiness evidence by launch type.
- Blocker rule reference placeholder.
- Source-signal freshness requirement placeholder.
- Waiver rule reference placeholder.
- Override evidence reference.
- Role authority reference.
- Review-required behavior.
- Terminal state flag.
- Supersession handling reference.
- Cancellation reason where applicable.
- Active-state recheck flag.
- Completed-state evidence reference.
- Audit reference.

Mark Ready and Mark Active actions require source-owned readiness evidence or approved waiver placeholders. Conflicting source facts block or route launch status transition to review. Status changes do not mutate Product Catalog or Device Catalog state.

## Launch Notification Trigger Reference

Proposal-level fields:

- Notification trigger reference id.
- Launch event id.
- Trigger type: launch scheduled, readiness blocked, launch ready, launch active, launch completed, launch cancelled, buyer readiness required, vendor readiness required, manufacturer readiness required, notification fanout requested.
- Recipient intent placeholder.
- Notification preference/schedule placeholder.
- Notification Platform Service request reference placeholder.
- Trigger status placeholder.
- Audit reference.

Notification Platform Service owns recipient resolution, preferences, templates, delivery, retries, digest behavior, fanout controls, and delivery history.

## Launch AI Signal Reference

Proposal-level fields:

- AI signal reference id.
- Launch event id.
- AI recommendation reference.
- Signal type: readiness gap, timing recommendation, assortment readiness, missing media/content/pricing/integration, planning task draft, future value.
- Confidence placeholder.
- Action contract reference placeholder.
- Review state.

AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes. AI must not change launch status or trigger buyer-facing actions without approved action contracts and permissions.

## Launch Analytics Signal Reference

Proposal-level fields:

- Analytics signal reference id.
- Launch event id.
- Signal type: launch performance, readiness delay, buyer adoption, vendor readiness, manufacturer launch coverage, campaign outcome, product-type launch trend, future value.
- Analytics tracking reference placeholder.
- Event/source reference.
- Redaction class.

Analytics owns reporting models and metrics.

## Launch Exception / Review State

Proposal-level fields:

- Exception id.
- Launch event id.
- Related participant reference where applicable.
- Related checklist item reference where applicable.
- Exception type.
- Severity.
- Blocking state.
- Owner / reviewer reference placeholder.
- Source module reference placeholder.
- Reason.
- Retryability placeholder.
- Created at.
- Resolved at placeholder.
- Audit reference.

## Ownership

Launch / Event Management owns launch records, event calendar records, readiness workflow placeholders, checklist placeholders, participant readiness state, milestone tracking, launch status lifecycle, visibility windows, notification trigger references, AI/analytics signal references, exception/review states, and launch events.

Launch / Event Management does not own device records, device release facts, product records, product lifecycle, product visibility, product publishing, pricing, media processing, media readiness facts, notification delivery, analytics metrics, integration configuration, external action execution, audit evidence, procurement POs, order routing, fulfillment execution, invoice lifecycle, warranty lifecycle, tenant eligibility, legal/licensing workflow, marketing automation, campaign execution, or AI recommendations.

## Retention Notes

Placeholder: define retention for launch records, calendar records, readiness workflow state, checklist/task placeholders, readiness evidence, waivers/overrides, participant readiness, milestones, visibility windows, notification trigger references, AI/analytics signal references, exceptions, supersession records, and audit references.
