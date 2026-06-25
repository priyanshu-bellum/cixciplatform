# Notification Platform Service Module

This module is a first draft architecture specification for the Notification Platform Service cross-cutting platform service.

Notification Platform Service owns notification request intake, templates, recipient resolution, preferences, channel selection, delivery orchestration, delivery attempts, delivery status tracking, retry/failure handling, suppression rules, unsubscribe/preference placeholders, notification history, provider response references, delivery audit references, idempotency, and duplicate suppression.

All content is proposal-level. It does not finalize launch channels, external provider selection, template approval workflow, recipient resolution implementation, preference precedence, retention periods, customer-facing notification ownership, or implementation behavior.

## Source Guidance

This module should be read with:

- ADR-0013 Notification Platform Service.
- ADR-0012 Logs & Audit File Tracking.
- ADR-0011 Invoice Management bounded context.
- ADR-0010 Fulfillment and Returns bounded context.
- ADR-0009 Order Routing bounded context.
- ADR-0008 Warranty Registration and Claim Support.
- ADR-0007 Category-Extensible Product Catalog.
- ADR-0006 AI Agent Services.
- ADR-0005 Pricing.
- ADR-0004 Device Catalog.
- Tenant Company module.
- Product Catalog module.
- Device Catalog module.
- Pricing module.
- Order Routing module.
- Fulfillment and Returns module.
- Invoice Management module.
- Logs & Audit File Tracking module.
- Architecture domain glossary and core entities.
- Platform integration principles once finalized.

## Boundary Summary

Notification Platform Service consumes eligible notification-triggering events and source-module signals, resolves authorized recipients, applies preferences and suppression rules, selects delivery channels, orchestrates delivery attempts, tracks delivery status, and preserves notification delivery history.

Notification Platform Service does not own or determine:

- Tenant eligibility, users, roles, permissions, buyer/vendor relationship eligibility, product-type eligibility, licensed-property scope, or readiness signals.
- Product records, product visibility, product compatibility, product activation, or product download state.
- Canonical Device References, device visibility, or buyer device portfolio ownership.
- Pricing decisions, price snapshots, pricing exceptions, or pricing-sensitive outcomes.
- Routing decisions, routed suborders, fulfillment state, return state, invoice state, warranty claim state, Logs & Audit evidence, AI recommendation state, or Analytics reporting definitions.

## Files

- `spec.md` - module purpose, scope, responsibilities, and out-of-scope rules.
- `data-model.md` - proposal-level notification request, template, recipient, preference, delivery, and provider entities.
- `api-contracts.md` - domain API contract concepts.
- `openapi-contracts.md` - implementation-oriented API specification template and endpoint notes.
- `events.md` - notification event catalog and event modeling notes.
- `event-contracts.md` - event interface contracts between Notification and source/consumer modules.
- `boundary-contracts.md` - explicit may answer / must not answer boundaries.
- `permissions.md` - roles, permission concepts, approvals, and access guardrails.
- `workflows.md` - notification intake, recipient resolution, preference, template, delivery, retry, audit, and suppression workflows.
- `edge-cases.md` - edge cases and unresolved behavior risks.
- `test-scenarios.md` - proposal-level validation scenarios.
- `assumptions-open-questions.md` - scale assumptions, open questions, and decisions needed.

## Cross-Module Pull Request Surfaces (additive)

The Cross-Module Scheduled System Admin Activity Summary Email PR (PR-C) adds an architecture-level surface to this module for scheduled summary email delivery. The surface is distinct from the existing per-event notification orchestration scope and co-exists without modification of existing entities, workflows, or events.

PR-C surfaces added to Notification Platform Service:

- Activity Summary Configuration entity (`draft`, `active`, `paused`, `retired` lifecycle; scheduling fields; recipient scope; cursor reference).
- Activity Summary Delivery Attempt entity (`pending`, `dispatched`, `acknowledged`, `failed` lifecycle).
- Six PR-C workflows (Configuration Lifecycle; Scheduled Window Evaluation Trigger; Recipient Scope Resolution; Summary Delivery Attempt; Delivery Failure / Carry-Forward; Delivery Success / Cursor Advancement).
- Five PR-C events (`notification.activity-summary-configuration.created`, `notification.activity-summary-configuration.updated`, `notification.activity-summary-delivery.attempted`, `notification.activity-summary-delivery.succeeded`, `notification.activity-summary-delivery.failed`).
- Permissions and boundary contracts for the new entities.

Cross-module partners for this surface:

- Analytics / Reporting owns Activity Summary Reporting Window, Activity Summary Aggregation Record, section / metric structure, source fact reference collection, carry-forward aggregation logic, and dashboard reference. See `modules/analytics-reporting/`.
- Logs & Audit File Tracking owns Activity Summary Generated Evidence, No-Activity Summary Suppression Evidence, and reference-pattern retention for delivery attempts and configuration lifecycle. See `modules/logs-audit-file-tracking/`.

PR-C does not modify Order Routing (PR #91), Fulfillment / Returns (PR #92, PR #94), Cross-Module Handoff Record territory (PR #93), Tenant Company, Integration Management, Invoice Management, Pricing, Product Catalog, Device Catalog, Media / Image Asset Management, or AI Agent Services.
