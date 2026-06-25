# Launch / Event Management OpenAPI Contract Notes

This document is proposal-level architecture for future OpenAPI contracts. It is not an implementation-ready API specification.

## Contract Goals

Future OpenAPI contracts should expose Launch / Event Management capabilities for launch draft creation, launch/event type assignment, scheduling, calendar lookup, visibility window review, source lifecycle evidence, readiness workflow placeholders, source-owned readiness evidence, checklist/task placeholders, participant readiness, milestone tracking, status transition guards, notification trigger references, AI/analytics signal references, external reference linking, and exception review.

## Common Request Fields

Proposal-level request fields:

- `tenantScopeRef`.
- `companyRef`.
- `entityRef`.
- `actorRef`.
- `launchEventId`.
- `launchEventType`.
- `launchStatus`.
- `deviceReference`.
- `productCatalogProductRef`.
- `productType`.
- `buyerRef`.
- `vendorRef`.
- `manufacturerRef`.
- `participantRefs`.
- `launchDate` placeholder.
- `releaseDate` placeholder.
- `visibilityWindowRef`.
- `sourceVisibilityRef` placeholder.
- `sourceVisibilityVersionHash` placeholder.
- `sourceLifecycleRef` placeholder.
- `sourceLifecycleVersionHash` placeholder.
- `sourceLaunchDateRef` placeholder.
- `sourceReleaseDateRef` placeholder.
- `recheckBeforeActive` placeholder.
- `readinessChecklistRef` placeholder.
- `readinessEvidenceRef` placeholder.
- `sourceReadinessSignalId` placeholder.
- `sourceReadinessSignalVersionHash` placeholder.
- `authorityModule` placeholder.
- `sourceDisposition` placeholder.
- `freshnessTimestamp` placeholder.
- `expirationTimestamp` placeholder.
- `waiverOverrideFlag` placeholder.
- `waiverApprover` placeholder.
- `waiverReason` placeholder.
- `mediaReadinessSignalRef` placeholder.
- `pricingReadinessSignalRef` placeholder.
- `productAvailabilitySignalRef` placeholder.
- `integrationReadinessSignalRef` placeholder.
- `tenantReadinessSignalRef` placeholder.
- `procurementPlanningSignalRef` placeholder.
- `notificationPreferenceOrScheduleRef` placeholder.
- `aiReadinessRecommendationRef` placeholder.
- `analyticsTrackingRef` placeholder.
- `externalTaskRef` placeholder.
- `externalCalendarRef` placeholder.
- `idempotencyKey`.

## Common Response Fields

Proposal-level response fields:

- `launchEventId`.
- `launchStatus`.
- `launchEventType`.
- `calendarRecordRef`.
- `visibilityWindowRef`.
- `visibilityWindowReviewState`.
- `readinessWorkflowRef`.
- `readinessEvidenceRefs`.
- `checklistStatusRef`.
- `participantReadinessRefs`.
- `milestoneRefs`.
- `transitionGuardRef` placeholder.
- `notificationTriggerRefs`.
- `aiSignalRefs`.
- `analyticsSignalRefs`.
- `procurementPlanningSignalRefs`.
- `exceptionRef`.
- `auditRef`.
- `createdAt` / `updatedAt`.

## Endpoint Groups

### Launch Events

- `POST /launch-events`
- `GET /launch-events/{launchEventId}`
- `PATCH /launch-events/{launchEventId}`
- `POST /launch-events/{launchEventId}/validate`
- `GET /launch-events`

### Scheduling And Calendar

- `POST /launch-events/{launchEventId}/schedule`
- `POST /launch-events/{launchEventId}/reschedule-placeholder`
- `POST /launch-events/{launchEventId}/cancel`
- `POST /launch-events/{launchEventId}/supersede`
- `GET /launch-events/calendar`
- `GET /launch-events/calendar/{calendarScope}` placeholder.

### Visibility And Source Lifecycle

- `POST /launch-events/{launchEventId}/visibility-window-placeholder`
- `POST /launch-events/{launchEventId}/visibility-window/{visibilityWindowId}/source-lifecycle-evidence-placeholder`
- `POST /launch-events/{launchEventId}/visibility-window/{visibilityWindowId}/recheck-before-active-placeholder`

### Readiness

- `POST /launch-events/{launchEventId}/readiness-review`
- `POST /launch-events/{launchEventId}/readiness-evidence-placeholder`
- `POST /launch-events/{launchEventId}/readiness-waiver-placeholder`
- `POST /launch-events/{launchEventId}/checklist-placeholder`
- `PATCH /launch-events/{launchEventId}/checklist-placeholder/{checklistItemId}`
- `POST /launch-events/{launchEventId}/participant-readiness`
- `PATCH /launch-events/{launchEventId}/participant-readiness/{participantReadinessId}`
- `POST /launch-events/{launchEventId}/readiness-blockers`

### Status

- `POST /launch-events/{launchEventId}/ready`
- `POST /launch-events/{launchEventId}/blocked`
- `POST /launch-events/{launchEventId}/active`
- `POST /launch-events/{launchEventId}/completed`
- `POST /launch-events/{launchEventId}/review-required`
- `POST /launch-events/{launchEventId}/transition-guard/validate-placeholder`
- `GET /launch-events/{launchEventId}/status-history`

### Milestones

- `POST /launch-events/{launchEventId}/milestones`
- `PATCH /launch-events/{launchEventId}/milestones/{milestoneId}`
- `POST /launch-events/{launchEventId}/milestones/{milestoneId}/completed`

### Signals And References

- `POST /launch-events/{launchEventId}/notification-trigger-reference`
- `POST /launch-events/{launchEventId}/notification-fanout-reference-placeholder`
- `POST /launch-events/{launchEventId}/ai-readiness-signal-reference`
- `POST /launch-events/{launchEventId}/analytics-signal-reference`
- `POST /launch-events/{launchEventId}/procurement-planning-signal-placeholder`
- `POST /launch-events/{launchEventId}/external-reference-placeholder`

### Review / Exceptions

- `GET /launch-events/review-required`
- `POST /launch-events/{launchEventId}/exceptions`
- `PATCH /launch-events/{launchEventId}/exceptions/{exceptionId}`

## Security And Boundary Notes

Future contracts should require authorization through Tenant Company scope, roles, permissions, activation/readiness, participant eligibility, Product Type enablement, licensed-property scope, and region scope where applicable.

OpenAPI contracts must not expose mutation endpoints for Product Catalog source records, Device Catalog canonical records, Pricing rules, Media assets, Procurement POs, Order Routing decisions, Fulfillment/Returns execution, Invoice lifecycle, Warranty state, Notification delivery, Analytics metrics, Integration credentials/state, Logs & Audit evidence, or AI recommendations.

## Error Shapes

Proposal-level errors should include error code, message, affected launch/participant/checklist/milestone/readiness-evidence/visibility-window reference, source module reference where applicable, review-required flag, and audit reference placeholder.

Errors should cover missing/stale source readiness signals, missing source lifecycle evidence, visibility-window conflicts, source lifecycle conflicts, missing waiver evidence, blocked status transitions, recheck-before-active blockers, external reference conflicts, and scale-limit review states.
