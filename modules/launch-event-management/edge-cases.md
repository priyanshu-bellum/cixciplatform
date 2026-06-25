# Launch / Event Management Edge Cases

This document captures proposal-level edge cases and architecture risks. It does not finalize business rules or implementation behavior.

## Tenant And Permission Edge Cases

- Actor can view a launch but lacks launch edit permission.
- Buyer/vendor/manufacturer participant belongs to a different entity scope.
- Participant company is inactive or not ready.
- Product Type is not enabled for the buyer/entity.
- Licensed-property scope is missing for branded merchandise launch placeholder.
- System admin override lacks reason or audit reference.
- Readiness waiver/override lacks approver, reason, or audit evidence reference.

## Device Launch Edge Cases

- Launch references invalid Device Reference.
- Device Reference is deprecated or superseded.
- Device Catalog launch date changes after launch event is scheduled.
- Launch event attempts to alter Device Catalog release date or lifecycle state.
- Manufacturer readiness is blocked while buyer readiness is ready.
- Launch Active is mistaken for Device Active.
- Source lifecycle version/hash is stale or missing.

Device Catalog owns canonical device facts, release dates, launch dates, and lifecycle state. Launch / Event Management coordinates readiness only.

## Product / Accessory Launch Edge Cases

- Launch references inactive or unavailable Product Catalog product.
- Product availability signal is missing.
- Product launch references product before Product Type support is enabled.
- Launch visibility window conflicts with Product Catalog visibility.
- Product media readiness is blocked.
- Launch event attempts to activate, deactivate, publish, or modify product record.
- Launch Active is mistaken for Product Active.
- Source visibility reference is stale or missing.

Product Catalog owns product lifecycle, availability, visibility, publishing, compatibility, and media attachment references.

## Promotion / Campaign Edge Cases

- Promotional event exists but Pricing readiness is blocked.
- Promotional timing is recommended by AI without approved action contract.
- Campaign window overlaps another launch window.
- Campaign execution is requested even though Marketing/Campaign Management does not exist.
- Discount or effective price is requested from Launch.

Launch / Event Management must not become Pricing, Marketing Automation, or Campaign Execution.

## Readiness Edge Cases

- Required checklist placeholder is missing.
- Checklist item owner is inactive.
- Readiness evidence is missing.
- Readiness signal is stale, expired, or superseded.
- Source disposition conflicts with checklist status.
- One participant is ready while another is blocked.
- Readiness blocker remains open when launch is marked ready.
- Waiver placeholder is used without audit evidence reference.
- Launch is active without readiness evidence.
- Recheck-required flag exists before Mark Active.

## Visibility Window Edge Cases

- Visibility window start is after end.
- Visibility window overlaps conflicting launch window.
- Buyer-visible window starts before product/source visibility is allowed.
- Launch is completed before visibility window ends.
- Superseded launch has active visibility window.
- Source lifecycle date conflicts with launch date.
- Source visibility/lifecycle evidence is missing or stale.

Launch visibility windows coordinate launch timing only. Source modules own product/device visibility and lifecycle.

## Status Transition Edge Cases

- Mark Ready attempted without required readiness evidence.
- Mark Active attempted without active-state recheck.
- Completed state lacks completed-state evidence.
- Cancellation lacks cancellation reason.
- Supersession chain conflicts with active visibility window.
- Terminal state is reopened without future policy.
- Conflicting source facts exist during transition.

## Notification Edge Cases

- Notification trigger is requested for cancelled launch.
- Readiness blocked notification repeats too often.
- Participant notification preference suppresses optional notification.
- Required/system launch notification behavior is unresolved.
- Notification delivery fails.
- Notification fanout would exceed expected participant volume.

Notification Platform Service owns delivery, preferences, suppression, retries, digest, fanout, and delivery history.

## Integration Edge Cases

- External task reference conflicts with another launch.
- External calendar entry is deleted externally.
- ClickUp/project tool status differs from CIXCI launch status.
- External integration credentials expire.
- External action attempts to change launch status without Launch acceptance.
- External reference volume exceeds future caps.

External tools must not become source of truth for CIXCI launch records. Integration Management owns external connection/action references.

## Procurement Edge Cases

- Procurement planning signal is interpreted as PO creation command.
- Launch date changes after a PO was drafted.
- Bulk purchase planning uses stale readiness signals.
- Event inventory planning requests payment or receiving behavior from Launch.

Procurement owns PO lifecycle. Launch / Event Management owns launch coordination only.

## AI Edge Cases

- AI recommends launch timing based on stale product/device data.
- AI flags missing media but Media source state has changed.
- AI drafts launch task with unauthorized participant scope.
- AI attempts to mark launch ready or active.
- AI triggers buyer-facing action without approved action contract.
- AI readiness signal volume exceeds future caps.

## Scale Edge Cases

- Calendar query returns too many launches without pagination.
- Recurring/seasonal event expands into too many launch records.
- Participant count exceeds future cap.
- Checklist item count exceeds future cap.
- Readiness queue becomes overloaded.
- Stale-read warning is needed for calendar views.
- Retention window for old launches is exceeded.

## Boundary Risks

- Launch starts modifying product or device source records.
- Launch becomes campaign execution or promotional pricing owner.
- Launch sends notifications directly.
- Launch approves or processes media assets.
- Launch configures external integrations or treats external tools as source of truth.
- Launch creates POs, routes customer orders, executes fulfillment, generates invoices, or decides warranty claims.
- Launch grants tenant permissions or infers eligibility.

## Proposal-Level Mitigations

- Preserve source references and source versions where available.
- Route missing/stale source signals to review.
- Keep launch readiness placeholders separate from source-module readiness facts.
- Require auditable waivers/overrides for manual readiness bypasses.
- Keep notification trigger references separate from delivery.
- Keep external references separate from Integration Management state.
- Require human/role approval for AI-driven launch actions.
- Add scale controls before implementation for calendars, participants, checklists, notification fanout, AI signals, and external references.