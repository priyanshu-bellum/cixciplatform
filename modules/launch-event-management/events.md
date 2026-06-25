# Launch / Event Management Events

This document is proposal-level architecture. It defines initial launch event taxonomy without finalizing payload schema, transport, delivery guarantees, retention, or implementation behavior.

## Event Principles

- Launch events should use references rather than copying full Product Catalog, Device Catalog, Pricing, Tenant Company, Media, Integration, Notification, Analytics, Procurement, or external provider records.
- Event payloads should preserve launch event id, tenant/entity scope, launch type, status, participant references, readiness evidence references, readiness state, milestone references, visibility window references, reason/review state, redaction class, and audit references where applicable.
- Sensitive product, device, pricing, tenant, media, integration, licensing, customer, or commercial details should be scoped and redacted by consumer class.
- Launch events are coordination signals, not Product Catalog publish commands, Device Catalog lifecycle commands, Pricing commands, Notification delivery commands, Procurement PO commands, or Integration execution commands.

## Event Catalog

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
- `launch.participant.readiness.blocked`.
- `launch.milestone.completed`.
- `launch.notification-trigger.requested`.
- `launch.notification-fanout.requested`.
- `launch.ai-readiness-signal.created`.
- `launch.readiness.signal.missing`.
- `launch.readiness.signal.stale`.
- `launch.readiness.waiver.applied`.
- `launch.visibility-window.conflict.detected`.
- `launch.source-lifecycle.conflict.detected`.
- `launch.external-reference.conflict`.
- `launch.recheck.required`.
- `launch.procurement-planning-signal.created`.
- `launch.status-transition.blocked`.

## Event Families

### Lifecycle Events

- Launch event created.
- Launch event updated.
- Launch event scheduled.
- Launch event active.
- Launch event completed.
- Launch event cancelled.
- Launch event superseded.
- Status transition blocked.

### Readiness Events

- Readiness review started.
- Launch ready.
- Launch blocked.
- Participant readiness updated.
- Participant readiness blocked.
- Milestone completed.
- Review required.
- Readiness signal missing.
- Readiness signal stale.
- Readiness waiver applied.
- Recheck required.

### Timing And Visibility Events

- Visibility window conflict detected.
- Source lifecycle conflict detected.

### Cross-Module Signal Events

- Notification trigger requested.
- Notification fanout requested.
- AI readiness signal created.
- Analytics signal placeholder.
- Procurement planning signal created.
- External reference conflict.

## Required Event Fields

Proposal-level fields:

- Event id.
- Event type.
- Occurred at.
- Source: Launch / Event Management.
- Tenant scope.
- Company/entity scope.
- Launch event reference.
- Launch type.
- Launch status.
- Device Reference where applicable.
- Product Catalog product reference where applicable.
- Product Type where applicable.
- Buyer/vendor/manufacturer participant references where applicable.
- Visibility window reference where applicable.
- Source visibility/lifecycle reference where applicable.
- Readiness workflow reference where applicable.
- Readiness evidence reference where applicable.
- Checklist item references where applicable.
- Participant readiness reference where applicable.
- Milestone reference where applicable.
- Notification trigger reference where applicable.
- AI readiness signal reference where applicable.
- Analytics signal reference where applicable.
- Procurement planning signal reference where applicable.
- Exception/review state where applicable.
- Reason / conflict reason / waiver reason where applicable.
- Redaction class.
- Logs & Audit reference where applicable.

## Consumer Notes

- Product Catalog may consume launch context only where future contracts allow; launch events must not create or modify product records.
- Device Catalog may consume launch context only where future contracts allow; launch events must not alter canonical device records.
- Pricing may consume launch planning context only where future contracts allow; launch events must not define pricing rules or discounts.
- Notification Platform Service may consume notification-triggering events and owns delivery, digest, and fanout behavior.
- Analytics may consume launch signals and owns reporting models/metrics.
- AI Agent Services may consume launch signals and owns recommendations/action outcomes.
- Integration Management may consume external-reference intents and owns connection/action references.
- Logs & Audit may consume audit references and owns audit evidence.
- Procurement may consume launch signals for bulk purchase planning and owns PO lifecycle.
- Order Routing must not treat launch events as customer order routing commands.
- Fulfillment/Returns and Invoice Management must not treat launch events as execution or invoice lifecycle commands.

## Redaction Rules

Events should avoid full product records, full device records, raw pricing payloads, unrestricted media metadata, external credential details, customer data, or commercial planning details. Use references and redaction classes.