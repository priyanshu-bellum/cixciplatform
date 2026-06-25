# Integration Management / External System Connections Module

This module is a first draft architecture specification for the Integration Management / External System Connections platform service / bounded context.

Integration Management owns external connection records, integration configuration, integration modes, credential references, external identifiers, connection status, webhook/API configuration, retry/rate-limit placeholders, health checks, external action request/outcome records, integration events, and audit references.

All content is proposal-level. It does not finalize supported launch integrations, credential storage implementation, external provider behavior, webhook transport, retry/rate limits, external action approval rules, or implementation behavior.

## Source Guidance

This module should be read with:

- ADR-0015 Integration Management / External System Connections.
- ADR-0014 Media / Image Asset Management.
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
- Notification Platform Service module.
- Media / Image Asset Management module.
- Architecture domain glossary and core entities.
- Platform integration principles.

## Source-Of-Truth Rule

Agents and platform services may operate across external systems through approved integrations, but external project tools, storefronts, accounting systems, notification providers, storage providers, shipping providers, warranty systems, or other third-party tools must never become the source of truth for CIXCI operational records.

CIXCI source modules remain authoritative. External systems may store synchronized copies, references, tasks, notifications, files, invoices, delivery confirmations, or provider statuses, but not CIXCI source-of-truth records unless a future ADR explicitly assigns otherwise.

## Boundary Summary

Integration Management owns connection configuration, integration state, delivery/execution records, health, external identifiers, credential references, and external references.

Integration Management does not own:

- Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, AI Agent Services, Logs & Audit, Notification, Media, Analytics, Procurement, or Vendor Operational Interface source records or workflow state.
- Raw secret values.
- External project/task tool records as CIXCI operational source of truth.
- External provider records as CIXCI source-of-truth records.

## Files

- `spec.md` - module purpose, scope, responsibilities, and out-of-scope rules.
- `data-model.md` - proposal-level integration, credential reference, external ID, webhook, health, action, and audit entities.
- `api-contracts.md` - domain API contract concepts.
- `openapi-contracts.md` - implementation-oriented API specification template and endpoint notes.
- `events.md` - integration event catalog and event modeling notes.
- `event-contracts.md` - event interface contracts between Integration Management and source/consumer modules.
- `boundary-contracts.md` - explicit may answer / must not answer boundaries.
- `permissions.md` - roles, permission concepts, approvals, and access guardrails.
- `workflows.md` - setup, enablement, credential, webhook, health, external action, and review workflows.
- `edge-cases.md` - edge cases and unresolved behavior risks.
- `test-scenarios.md` - proposal-level validation scenarios.
- `assumptions-open-questions.md` - assumptions, scale placeholders, open questions, and decisions needed.
