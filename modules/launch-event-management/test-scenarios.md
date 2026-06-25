# Launch / Event Management Test Scenarios

These are proposal-level architecture test scenarios. They do not define implementation test automation yet.

## Draft And Validation

1. Authorized actor creates launch draft.
2. Actor without launch draft permission is denied.
3. Device Launch references Device Catalog Device Reference.
4. Accessory Launch references Product Catalog product reference.
5. Branded Merchandise Launch requires Product Type enablement and licensed-property scope where applicable.
6. Invalid Device Reference routes launch to review.
7. Invalid Product Catalog product reference routes launch to review.
8. Invalid launch/event type routes launch to review.

## Scheduling And Calendar

1. Scheduled launch creates event calendar record.
2. Launch calendar view lists launch by date range.
3. Visibility window start after end routes to review.
4. Conflicting visibility windows route to review.
5. Cancelled launch does not remain active in calendar view.
6. Superseded launch preserves supersession reference.
7. Calendar lookup uses pagination placeholder.
8. Calendar filtering uses tenant/date partition placeholder.

## Visibility And Source Lifecycle

1. Launch visibility window preserves source visibility reference.
2. Launch visibility window preserves source lifecycle reference.
3. Missing source visibility state routes launch to review.
4. Stale source lifecycle evidence routes launch to review.
5. Product lifecycle conflict blocks or routes launch activation to review.
6. Device release date conflict blocks or routes launch activation to review.
7. Launch Active does not change Product Catalog product active state.
8. Launch Active does not change Device Catalog device active state.

## Readiness Evidence

1. Readiness review creates readiness workflow placeholder.
2. Checklist item can be added with owner participant reference.
3. Checklist item references source-owned readiness evidence.
4. Missing media readiness signal creates blocker placeholder.
5. Missing pricing readiness signal creates blocker placeholder.
6. Missing product availability signal creates blocker placeholder.
7. Missing integration readiness signal creates blocker placeholder.
8. Missing tenant readiness signal creates blocker placeholder.
9. Stale readiness signal creates review-required state.
10. Manual readiness waiver requires waiver approver, waiver reason, and audit evidence reference.
11. Launch cannot be marked ready when required blockers remain unresolved unless approved waiver placeholder exists.

## Participant Readiness

1. Buyer participant readiness can be updated by authorized actor.
2. Vendor participant readiness can be updated by authorized actor.
3. Manufacturer participant readiness can be updated by authorized actor.
4. Participant from inactive company routes readiness update to review.
5. Unauthorized participant readiness update is denied.
6. Blocked participant readiness emits participant readiness blocked event placeholder.

## Status Lifecycle

1. Draft launch moves to Scheduled.
2. Scheduled launch moves to Readiness Review.
3. Readiness Review moves to Ready when proposal-level source-owned readiness evidence exists.
4. Readiness Review moves to Blocked when blocker exists.
5. Mark Ready without evidence or approved waiver is blocked.
6. Ready launch moves to Active only after active-state recheck where required.
7. Active launch moves to Completed with completed-state evidence placeholder.
8. Cancelled launch requires status reason and audit reference.
9. Unsupported status transition routes to review.
10. Conflicting source facts block transition and emit status-transition blocked event placeholder.

## Boundary Tests

1. Launch cannot mutate Product Catalog source records.
2. Launch cannot mutate Device Catalog canonical records.
3. Launch cannot calculate pricing or create discounts.
4. Launch cannot send notifications directly.
5. Launch cannot create Analytics metrics or reports.
6. Launch cannot approve or transform media assets.
7. Launch cannot configure integrations or store credentials.
8. Launch cannot create Procurement POs.
9. Launch cannot route customer orders.
10. Launch cannot execute fulfillment or returns.
11. Launch cannot generate invoices or process payments.
12. Launch cannot approve warranty claims.
13. Launch cannot grant tenant permissions or eligibility.

## Notification / Analytics / AI

1. Launch scheduled emits notification trigger reference event.
2. Notification fanout request is represented as a handoff to Notification Platform Service.
3. Launch active emits analytics-consumable signal.
4. AI readiness signal can be linked to launch event.
5. AI cannot mark launch ready or active without approved action contract and human/role approval.

## Integration / External Tools

1. External project task reference can be linked through Integration Management reference.
2. External calendar reference can be linked through Integration Management reference.
3. External tool status does not override CIXCI launch status.
4. External reference conflict routes launch to review.

## Procurement Planning

1. Launch planning signal can be emitted for Procurement context.
2. Procurement signal does not create PO.
3. Launch date change after procurement planning creates review signal placeholder.

## Scale Controls

1. Recurring event placeholder does not automatically expand without future policy.
2. Participant count over future cap routes to review.
3. Checklist item count over future cap routes to review.
4. Readiness queue priority can be assigned.
5. Stale-read warning can be shown for calendar view placeholder.
6. External task/reference volume over future cap routes to review.
