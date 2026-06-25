# Integration Management / External System Connections Specification

This document is proposal-level architecture. It defines initial Integration Management scope without finalizing implementation behavior, supported launch systems, credential storage, provider-specific contracts, retry limits, rate limits, circuit-breaker thresholds, or external action approval behavior.

## Purpose

Provide a governed platform service for configuring, monitoring, and executing approved integrations with external systems while preserving CIXCI source-module ownership of operational records.

## Scope

Integration Management owns:

- External connection records.
- Integration configuration.
- Integration mode.
- Integration credentials reference placeholder.
- External system identifiers.
- External ID mappings.
- External ID mapping verification/staleness evidence.
- Connection status.
- Integration enablement/disablement.
- Webhook registration/configuration placeholder.
- Inbound webhook placeholders.
- Inbound webhook receipt/callback evidence.
- Outbound webhook delivery.
- API endpoint configuration.
- Authentication method reference.
- Retry policy placeholders.
- Rate limit placeholders.
- Provider outage state placeholder.
- Circuit breaker open/closed/half-open placeholder.
- Integration health status.
- Integration degraded/restored state.
- Integration test/check status.
- External action request records.
- External action outcome records.
- Source-module disposition references.
- Integration events.
- Integration audit references.

## Source-Of-Truth Rule

Agents and platform services may operate across external systems through approved integrations.

External project tools, storefronts, accounting systems, notification providers, storage providers, shipping providers, warranty systems, or other third-party tools must never become the source of truth for CIXCI operational records.

CIXCI source modules remain authoritative. External systems may store synchronized copies, references, tasks, notifications, files, invoices, delivery confirmations, or provider statuses, but not CIXCI source-of-truth records unless a future ADR explicitly assigns otherwise.

Inbound webhook receipts and provider callbacks are evidence/control-plane state only. Source modules decide whether webhook data changes business records. Integration Management must not treat provider callbacks as final CIXCI business truth.

External action outcomes do not mutate CIXCI business state unless accepted by the owning source module.

## Integration Modes

Proposal-level modes:

- API.
- Webhook.
- CSV export.
- CSV import.
- Manual upload/download.
- SFTP placeholder.
- External provider SDK placeholder.
- External project/task tool connector placeholder.
- Accounting connector placeholder.
- Media storage connector placeholder.
- Notification provider connector placeholder.
- Hybrid integration mode.

## Integration Types

Proposal-level examples:

- Buyer API integration.
- Vendor API integration.
- Device manufacturer API integration.
- Accounting / QuickBooks connector.
- Media storage connector.
- Notification provider connector.
- Storefront connector placeholder.
- Shipping/tracking provider connector.
- Warranty registration connector.
- External project/task tool connector.
- CSV/SFTP/manual exchange placeholder.

## Relationship Boundaries

### Tenant Company

Tenant Company owns company/entity hierarchy, users, roles, permissions, tenant eligibility, activation/readiness, relationship scope, product-type eligibility, licensed-property scope, and tenant-scoped access signals.

Integration Management may scope integration configuration to a parent company, child entity, vendor, manufacturer, buyer, region, or environment where approved. It must not derive tenant eligibility or grant user permissions.

### Product Catalog

Product Catalog owns product records, product validation, product imports/exports, product visibility/activation, compatibility assertions, catalog-carried pricing inputs, and product media references.

Integration Management may track product catalog connection configuration, external product identifiers, CSV/API exchange configuration, webhook configuration, and connection health.

### Device Catalog

Device Catalog owns canonical Device References, device identity, lifecycle, manufacturer source data, buyer device portfolio references, and device exports.

Integration Management may track device manufacturer API connections, external device identifiers, import/export configuration, webhook delivery, and health.

### Pricing

Pricing owns pricing interpretation, calculations, pricing profiles, exceptions, effective price snapshots, and pricing events.

Integration Management may track approved external delivery configuration but must not calculate prices, interpret pricing rules, or own pricing snapshots.

### Order Routing

Order Routing owns routing decisions, suborders, routing snapshots, routing exceptions, and retry/review workflows.

Integration Management may track external order submission endpoints and vendor/manufacturer transmission health but must not choose routes or own suborder state.

### Fulfillment / Returns

Fulfillment and Returns owns fulfillment handoff tracking, shipment status, tracking references, delivery status, return state, replacement execution, and exceptions.

Integration Management may track shipping/tracking provider connections, inbound provider callbacks, status import configuration, webhook delivery, and external identifiers but must not own shipment or return state.

### Invoice Management

Invoice Management owns invoice records, invoice reports, status lifecycle, exports, reconciliation placeholders, and QuickBooks/accounting sync placeholders.

Integration Management may track accounting connector configuration, external invoice ids, sync status, error states, and retry status. Invoice Management remains authority for CIXCI invoice records.

### Logs & Audit

Logs & Audit owns audit evidence. Integration Management owns connection state and integration execution/receipt state. Sensitive payloads and credentials must be redacted or referenced.

### Notification Platform Service

Notification Platform Service owns notification delivery history. Integration Management may track external provider configuration and health where appropriate. External providers do not own CIXCI notification history.

### Media / Image Asset Management

Media owns Media Asset IDs, asset metadata, renditions, access policy, storage path metadata, and processing state. Integration Management may track storage provider connection/configuration references where appropriate. Storage provider paths/objects must not become CIXCI source-of-truth identifiers.

### AI Agent Services

AI agents may recommend integration setup, draft external task updates, monitor integration failures, summarize health issues, or initiate approved external actions through Integration Management. AI must not bypass integration permissions, approval, tenant scope, credential policy, redaction rules, or source-module action contracts. Business-state impact requires source-module acceptance.

## Business Rules

Proposal-level rules:

- Integration Management owns connection configuration, integration state, delivery/receipt evidence, external action execution records, external references, and source-module disposition references only.
- Source modules own business records, workflow state, business-state acceptance, and mutation.
- Credential references may be stored, but raw secrets must not be stored in module docs or exposed in logs/events/exports/AI prompts.
- External ID mappings must not replace internal CIXCI record references.
- Stale or conflicting external ID mappings should block or route dependent workflows to review according to source-module policy.
- Webhook delivery must include idempotency, retry, redaction, delivery status, and response references.
- Inbound webhook receipts must include signature verification, dedupe, replay/stale/out-of-order/duplicate status, and source-module disposition.
- External actions require source-module authorization and approval where applicable.
- External action outcomes do not mutate CIXCI business state unless accepted by the owning source module.
- Provider outage, circuit-breaker state, retry exhaustion, and dead-letter/quarantine placeholders should be explicit control-plane state.
- Integration events should produce audit references for Logs & Audit.

## Out Of Scope

Integration Management does not own:

- Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, AI Agent Services, Logs & Audit, Notification, Media, Analytics, Procurement, Payment, Accounting, or Vendor Operational Interface source records or workflow state.
- Payment processing or full accounting ownership.
- Vendor operational UX ownership.
- Analytics reporting definitions.
- Raw credential storage.
- External project/task tools as CIXCI source of truth.

## Dependencies

Integration Management depends on:

- Tenant Company for tenant/company/entity/user scope and integration permissions.
- Source modules for allowed external actions, source-module disposition, and business event meaning.
- Logs & Audit for audit evidence.
- Notification Platform Service for notification delivery from integration events.
- AI Agent Services for recommendation and approved action workflows.
- Secure secret storage/secrets manager pattern, unresolved.

## Proposal-Level Constraints

- Preserve ADR-0015 boundaries.
- Keep all unresolved behavior proposal-level.
- Do not make external systems authoritative for CIXCI operational records.
- Do not imply raw secret storage.
- Do not finalize provider implementation, credential implementation, retry limits, circuit-breaker thresholds, or source-module business behavior.
- Do not create Analytics, Procurement, Vendor Operational Interface, Payment, or Accounting modules.
