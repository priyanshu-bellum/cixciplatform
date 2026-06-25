# Launch / Event Management Workflows

This document is proposal-level architecture. It defines initial launch workflows without finalizing readiness checklists, status transition rules, notification schedules, campaign execution, external calendar integration, or implementation behavior.

## Launch Draft Workflow

1. Authorized actor creates a launch event draft.
2. Launch / Event Management consumes tenant/company/entity scope from Tenant Company.
3. Actor selects launch/event type.
4. Actor references Device Catalog Device Reference and/or Product Catalog product references where applicable.
5. Actor adds buyer, vendor, manufacturer, or internal participant references.
6. Actor sets launch date, release date, and visibility window placeholders.
7. Launch / Event Management stores draft state and audit references.

Launch / Event Management must not alter Product Catalog source records or Device Catalog canonical records.

## Scheduling Workflow

1. Authorized actor schedules the launch event.
2. Launch / Event Management creates or updates event calendar record.
3. Launch / Event Management validates proposal-level visibility window conflicts.
4. Launch / Event Management checks source visibility/lifecycle references where available.
5. Conflicts between launch timing and Product Catalog visibility/lifecycle or Device Catalog release/lifecycle dates route to review.
6. Launch / Event Management emits scheduled event.
7. Notification trigger references may be created where policy allows.

Scheduling a launch does not publish products, activate devices, deliver notifications, or create Procurement POs.

## Visibility Window Review Workflow

1. Launch / Event Management records visibility window start/end, audience scope, and window type.
2. Launch / Event Management stores source visibility reference, source lifecycle reference, source launch date reference, and source release date reference where available.
3. Missing or stale source state creates review state.
4. Conflicting source lifecycle dates create `launch.source-lifecycle.conflict.detected` or `launch.visibility-window.conflict.detected` proposal-level events.
5. Recheck-before-active flag can require source evidence before moving to Active.

Launch Active does not mean Product Active. Launch Active does not mean Device Active.

## Readiness Review Workflow

1. Authorized actor starts readiness review.
2. Launch / Event Management creates readiness workflow placeholder.
3. Launch checklist/task placeholders may be added.
4. Launch / Event Management records source-owned readiness evidence references where available.
5. Readiness evidence should include source readiness signal id, signal version/hash, authority module, source disposition, freshness timestamp, expiration timestamp, stale/missing state, waiver/override flag, waiver approver, waiver reason, audit evidence reference, and recheck-required flag.
6. Missing, stale, expired, blocked, or conflicting source readiness signals create exception/review state.
7. Manual waivers or overrides must be auditable and reviewable.
8. Launch may move to Ready, Blocked, or Review Required based on proposal-level transition guards.

Source modules own source readiness facts. Launch / Event Management records coordination state only and must not independently decide media readiness, pricing readiness, product availability, integration readiness, tenant readiness, or procurement readiness.

## Participant Readiness Workflow

1. Participant or authorized actor updates participant readiness state.
2. Launch / Event Management validates participant scope and permission signals from Tenant Company.
3. Participant readiness state is recorded as not-started, pending, ready, blocked, not-applicable, or review-required placeholder.
4. Blockers, readiness evidence, or waiver placeholders may be recorded.
5. Participant blocked state can emit `launch.participant.readiness.blocked`.
6. Launch / Event Management emits participant readiness update event.

Tenant Company remains authority for participant eligibility and permissions.

## Milestone Workflow

1. Authorized actor creates milestone placeholder.
2. Milestone receives planned date and owner participant reference.
3. Milestone may be marked completed, blocked, missed, waived, or review-required placeholder.
4. Launch / Event Management emits milestone completed event where applicable.

Milestones coordinate launch workflow only and do not mutate source modules.

## Status Transition Guard Workflow

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

Mark Ready and Mark Active actions require source-owned readiness evidence or approved waiver placeholders. Launch status changes do not mutate Product Catalog or Device Catalog state. Conflicting source facts block or route launch status transition to review. Blocked transitions can emit `launch.status-transition.blocked`.

## Status Lifecycle Workflow

Proposal-level status movement:

1. Draft records initial planning state.
2. Scheduled indicates calendar/date intent.
3. Readiness Review indicates checklist and participant readiness review is underway.
4. Ready indicates readiness evidence or approved waivers are sufficient by future policy.
5. Blocked indicates one or more launch blockers exist.
6. Active indicates the launch/event is currently active by launch workflow state after active-state recheck where required.
7. Completed indicates launch/event workflow is closed as complete with completed-state evidence where required.
8. Cancelled indicates launch/event workflow is cancelled with cancellation reason.
9. Superseded indicates another launch record replaces the current record.
10. Review Required indicates manual review is needed.

Allowed transitions, terminal states, and automatic transitions remain unresolved.

## Notification Trigger Workflow

1. Launch / Event Management identifies a notification-triggering launch event.
2. Launch / Event Management creates notification trigger reference with recipient intent placeholder.
3. Notification fanout request can be represented by `launch.notification-fanout.requested`.
4. Notification Platform Service owns recipient resolution, preferences, templates, delivery, retry, suppression, digest handling, fanout controls, and delivery history.
5. Launch / Event Management may record notification trigger status reference where future contracts allow.

## AI Readiness Workflow

1. AI Agent Services identifies launch readiness gaps, timing recommendations, assortment readiness suggestions, or missing media/content/pricing/integration readiness.
2. Launch / Event Management records AI readiness signal reference.
3. Authorized actor may review AI draft planning task placeholder.
4. AI must not change launch status, publish launch events, or trigger buyer-facing actions without approved action contracts and permissions.

## Analytics Signal Workflow

1. Launch / Event Management emits analytics-consumable launch signals.
2. Analytics consumes approved signals for launch performance, readiness delays, buyer adoption, vendor readiness, manufacturer launch coverage, campaign outcomes, and product-type launch trends.
3. Analytics owns reporting models, metrics, dashboards, and exports.

## Integration Reference Workflow

1. Launch / Event Management may link external project/task/calendar references through Integration Management.
2. Integration Management owns external connection state, credentials, external ID mapping, delivery/receipt evidence, and external action records.
3. External tools must not become source of truth for CIXCI launch records.
4. External reference conflicts can emit `launch.external-reference.conflict` and route to review.

## Procurement Planning Signal Workflow

1. Launch / Event Management may emit launch planning signals for bulk purchase planning.
2. Procurement / Purchase Orders may consume those signals where future contracts allow.
3. Procurement owns PO lifecycle and must not treat launch signals as PO creation, approval, submission, receiving, or payment commands.
4. Launch planning signals can be represented by `launch.procurement-planning-signal.created`.

## Exception / Review Workflow

Review states may be created for:

- Missing or invalid tenant/company/entity scope.
- Invalid launch/event type.
- Invalid or unsupported status transition.
- Device Reference invalid or unavailable.
- Product Catalog product reference invalid or unavailable.
- Product Type not enabled.
- Participant reference invalid or inactive.
- Missing readiness checklist placeholder.
- Missing readiness evidence.
- Stale readiness signal.
- Media readiness blocked.
- Pricing readiness blocked.
- Product availability blocked.
- Integration readiness blocked.
- Tenant readiness blocked.
- Procurement readiness/planning conflict.
- Visibility window conflict.
- Source lifecycle conflict.
- Recheck required before active.
- Notification trigger not allowed for status.
- AI action contract missing.
- External project/calendar reference conflict.

Launch / Event Management owns launch exception/review state. Source modules own their source records and decisions.