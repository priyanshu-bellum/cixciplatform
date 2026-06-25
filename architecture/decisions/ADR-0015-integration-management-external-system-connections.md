# ADR-0015: Integration Management / External System Connections

## Status

Proposed

## Context

CIXCI must integrate with external systems used by buyers, vendors, device manufacturers, accounting systems, media storage providers, notification providers, project tools, storefronts, shipping/fulfillment partners, warranty systems, and future AI agent workflows.

Existing and future external systems may include:

- Buyer APIs.
- Vendor APIs.
- Device manufacturer APIs.
- QuickBooks / accounting systems.
- AWS/S3-style object storage.
- Email/SMS/push providers.
- Shopify / storefront systems.
- ClickUp or external project/task tools.
- Warranty registration systems.
- Shipping/tracking providers.
- Webhook consumers/providers.
- CSV/SFTP/manual file exchange placeholders.

CIXCI needs a governed integration layer that tracks connection configuration, credentials, external identifiers, connection health, webhook/event delivery, retries, failure states, and approved external actions without letting external tools become the source of truth for CIXCI operational records.

This ADR is proposal-level. It does not finalize supported launch integrations, credential storage implementation, provider selection, webhook transport, retry limits, rate limits, external action approval behavior, or implementation design.

## Decision

Introduce Integration Management / External System Connections as a cross-cutting platform service / bounded context.

Integration Management owns external connection records, integration configuration, integration mode, credential references, external identifiers, connection status, webhook/API configuration, retry policy placeholders, health status, integration test status, external action request/outcome records, integration events, and integration audit references.

Integration Management must not become the source of truth for CIXCI domain records, source-module workflow state, platform audit evidence, notification delivery history, media assets, AI recommendations, analytics definitions, or external project/task tool records.

### Integration Management Owns

- External connection records.
- Integration configuration.
- Integration mode.
- Integration credentials reference placeholder.
- External system identifiers.
- Connection status.
- Webhook registration/configuration placeholder.
- API endpoint configuration.
- Authentication method reference.
- Retry policy placeholders.
- Integration health status.
- Integration test/check status.
- External action request records.
- External action outcome records.
- Integration events.
- Integration audit references.

### Integration Management Does Not Own

- Product Catalog source records.
- Device Catalog source records.
- Pricing calculations or snapshots.
- Order Routing decisions.
- Fulfillment/Returns operational state.
- Invoice Management records.
- Logs & Audit evidence records.
- Notification delivery content/history.
- Media asset source records/renditions.
- Tenant Company eligibility/user permissions.
- AI Agent recommendations.
- Analytics definitions.
- External project/task tool records as CIXCI operational source of truth.

## Core Source-Of-Truth Rule

Agents and platform services may operate across external systems through approved integrations, but external project tools, storefronts, accounting systems, notification providers, storage providers, or other third-party tools must never become the source of truth for CIXCI operational records.

CIXCI source modules remain the authority for CIXCI operational records.

External systems may store synchronized copies, references, tasks, notifications, files, invoices, delivery confirmations, or provider responses, but CIXCI must retain source-of-truth ownership unless a future ADR explicitly assigns otherwise.

## Relationship Boundaries

### Tenant Company

Tenant Company owns company/entity hierarchy, users, roles, permissions, tenant eligibility, activation/readiness, relationship scope, product-type eligibility, licensed-property scope, and tenant-scoped access signals.

Integration Management may track integration configuration by parent company, child entity, vendor, manufacturer, buyer, region, or environment where approved. It must not derive tenant eligibility, grant permissions, provision users, or decide company readiness.

### Product Catalog

Product Catalog owns accessory product records, product type validation, catalog imports/exports, product visibility/activation records, compatibility assertions, catalog-carried pricing inputs, and product media attachment references.

Integration Management may track product catalog API connections, CSV import/export integration settings, external product identifiers, webhook configuration, and transmission health. It must not own product source records or product validation behavior.

### Device Catalog

Device Catalog owns canonical Device References, device master records, device identity, device lifecycle, manufacturer source data, buyer device portfolio references, and device export records.

Integration Management may track device manufacturer API connections, external device identifiers, import/export configuration, webhook delivery, and connection health. It must not own canonical device identity or device lifecycle state.

### Pricing

Pricing owns pricing interpretation, calculations, pricing profiles, exceptions, effective price snapshots, audit reconstruction, and pricing events.

Integration Management may track external pricing-related API endpoints or downstream delivery configuration where approved. It must not calculate prices, interpret pricing rules, or own pricing snapshots.

### Order Routing

Order Routing owns routing decisions, suborder structure, routing snapshots, routing exceptions, and routing retry/review workflows.

Integration Management may track external order submission endpoints, webhook delivery configuration, and vendor/manufacturer transmission health. It must not choose routes, create routing decisions, reroute orders, or own suborder state.

### Fulfillment / Returns

Fulfillment and Returns owns fulfillment handoff tracking, shipment status, tracking references, delivery status, return operational state, replacement execution, and fulfillment/return exceptions.

Integration Management may track shipping/tracking provider connections, carrier/vendor API configuration, webhook delivery, status import configuration, and external identifiers. It must not own shipment, delivery, return, or replacement state.

### Invoice Management

Invoice Management owns invoice generation, invoice records, invoice reports, invoice status lifecycle, invoice exports, reconciliation placeholders, and QuickBooks/accounting sync placeholders.

Integration Management may track accounting connector configuration, external invoice ids, sync status, error states, and retry status. Invoice Management remains authority for CIXCI invoice records. Accounting systems do not own CIXCI invoice lifecycle unless a future ADR explicitly assigns payment/accounting ownership.

### Logs & Audit File Tracking

Logs & Audit owns audit records, file tracking evidence, API transmission logs, processing outcomes, validation outcomes, retry/failure history, retention placeholders, and audit search/filtering.

Integration events, credential lifecycle events, webhook delivery attempts, API transmission results, external action requests, failures, retries, and status changes should be auditable. Integration Management owns connection and integration execution state; Logs & Audit owns audit evidence.

### Notification Platform Service

Notification Platform Service owns notification templates, recipient resolution, preferences, delivery orchestration, delivery attempts, provider response references, and notification history.

Integration Management may track external email/SMS/push provider configuration and health where appropriate. Notification Platform Service owns notification delivery history. External providers do not own CIXCI notification history.

### Media / Image Asset Management

Media / Image Asset Management owns Media Asset IDs, asset metadata, storage references, renditions, access policy, URL references, and processing state.

Media may use AWS/S3-style object storage as the current expected pattern. Integration Management may track storage provider connection/configuration references where appropriate. Storage provider paths/objects must not become CIXCI source-of-truth identifiers.

### AI Agent Services

AI Agent Services owns recommendations, drafts, confidence scores, feedback signals, recommendation records, and action outcome records.

AI agents may recommend integration setup steps, draft external task updates, monitor integration failures, or initiate approved external actions through Integration Management. AI agents must not bypass integration permissions, approval, tenant scope, credential policy, redaction rules, or source-module action contracts.

### Warranty Registration / Claims

ADR-0008 defines warranty support as a cross-module capability and does not create a full Warranty Management bounded context yet.

Integration Management may track warranty registration system endpoints, external warranty registration identifiers, delivery configuration, retry status, and connection health. It must not own warranty claim approval, warranty eligibility, replacement execution, or vendor warranty system state as CIXCI source of truth.

### Analytics

Analytics owns reporting models, rollups, dashboards, metrics, analytical read models, and reporting definitions.

Integration Management may emit integration health and delivery outcome signals for Analytics consumption. It must not define analytics reporting models or make operational source records from analytical outputs.

### Future Procurement / Purchase Orders

Future Procurement / Purchase Orders may own bulk PO lifecycle, approvals, receiving, procurement reconciliation, and manufacturer purchase-order workflows.

Integration Management may track procurement-related external connections or external action delivery where approved. It must not own procurement approval or PO lifecycle.

### Future Vendor Operational Interface

Future Vendor Operational Interface may own vendor-facing operational UX or workflow orchestration if introduced.

Integration Management may provide connection configuration, health, external identifiers, and delivery execution records. It must not become the vendor workflow owner.

### External Systems / Providers

External systems/providers may store synchronized copies, external references, files, notifications, tasks, invoices, provider delivery IDs, or status responses.

External systems/providers are not source-of-truth authorities for CIXCI operational records unless a future ADR explicitly assigns that responsibility.

## Integration Modes

Proposal-level integration modes:

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

## Integration Configuration Model

Proposal-level fields:

- Integration id.
- Owning company/entity.
- Integration type.
- External system name.
- Integration mode.
- Source module.
- Target module.
- Direction: inbound, outbound, or bidirectional.
- Endpoint reference.
- Credential reference.
- Authentication method placeholder.
- External account id.
- External system object references.
- Status.
- Environment: sandbox or production.
- Region.
- Enabled/disabled state.
- Effective dates.
- Last health check.
- Last successful transmission.
- Last failure.
- Retry policy reference.
- Rate limit placeholder.
- Audit reference.

## Credential And Secret Boundary

Integration Management may store credential references and configuration metadata.

Actual secrets should be stored in a secure secrets manager or approved secure storage.

Secrets must not be exposed in logs, events, notification payloads, exports, AI prompts, analytics data, or external task descriptions.

Credential rotation, expiration, revocation, and permission scope should be tracked.

Logs & Audit may record credential lifecycle events without storing secret values.

## External ID Mapping

Integration Management may store external ID mappings and references.

Source modules remain the authority for internal CIXCI records.

External IDs should map to internal record references without replacing them.

External ID conflicts should produce review-required state.

Mappings should be scoped by tenant, company/entity, integration, environment, and external system.

## Webhook And Event Delivery

Integration Management may manage outbound webhook configuration and inbound webhook registration placeholders.

Webhook delivery should include:

- Idempotency key.
- Retry policy.
- Event type.
- Payload redaction class.
- Delivery status.
- Provider/consumer response reference.
- Source module reference.
- Tenant scope reference.

Source modules own the business event meaning. Logs & Audit owns audit evidence. Integration Management owns delivery configuration and integration state.

## External Project / Task Tools

External project tools such as ClickUp may be used for onboarding task coordination, implementation project management, or support task creation.

AI agents may create or update external tasks only through approved integrations and approved action contracts.

External project/task tools must not become the source of truth for CIXCI operational records, onboarding state, tenant readiness, product records, order status, fulfillment state, invoice state, warranty state, or audit evidence.

CIXCI should store external task references only as integration references.

CIXCI source modules remain authoritative.

## QuickBooks / Accounting Integration

QuickBooks/accounting systems may receive invoice data or references from Invoice Management.

Accounting connectors may support sync status, external invoice ids, error states, and retry status.

Invoice Management remains authority for CIXCI invoice records.

Accounting systems do not own CIXCI invoice lifecycle unless a future ADR explicitly assigns payment/accounting ownership.

## AWS/S3 / Media Storage Integration

Media / Image Asset Management may use AWS/S3-style object storage as the current expected pattern.

Integration Management may track storage provider connection/configuration references where appropriate.

Media remains authority for Media Asset IDs, asset metadata, renditions, access policy, and processing state.

Storage provider paths/objects must not become CIXCI source-of-truth identifiers.

## Notification Provider Integration

Notification Platform Service may use external email/SMS/push providers.

Integration Management may track provider configuration and health where appropriate.

Notification Platform Service owns notification delivery history.

External providers do not own CIXCI notification history.

## Vendor And Buyer Integrations

Vendor integrations may support order exports, return exports, shipping imports, return outcome imports, inventory updates, warranty registration, catalog updates, and API/webhook exchange.

Buyer integrations may support product export, image URL export, order intake, warranty claim initiation, invoice delivery, and status updates.

Integration Management owns connection, configuration, external identifiers, health, delivery status, and retry state.

Owning business modules own the business record and workflow state.

## AI Agent Services Boundaries

AI agents may recommend integration setup steps, draft external task updates, monitor integration failures, or initiate approved external actions through Integration Management.

AI Agent Services owns recommendations, drafts, confidence scores, and action outcome records.

Integration Management owns approved integration execution records and external system references.

Source modules remain the source of truth.

AI agents must not bypass integration permissions, approval, tenant scope, credential policy, redaction rules, or source-module action contracts.

## Logs & Audit Relationship

Integration events, credential lifecycle events, webhook delivery attempts, API transmission results, external action requests, failures, retries, and status changes should be auditable.

Logs & Audit owns audit evidence.

Integration Management owns connection state and integration execution state.

Sensitive payloads and credentials must be redacted or referenced.

## Events

Proposal-level events:

- `integration.created`.
- `integration.updated`.
- `integration.enabled`.
- `integration.disabled`.
- `integration.health-check.completed`.
- `integration.health-check.failed`.
- `integration.credential.rotation.required`.
- `integration.external-id-mapping.created`.
- `integration.external-id-mapping.conflict`.
- `integration.webhook.delivery.created`.
- `integration.webhook.delivery.failed`.
- `integration.webhook.delivery.retried`.
- `integration.webhook.delivery.completed`.
- `integration.external-action.requested`.
- `integration.external-action.completed`.
- `integration.external-action.failed`.
- `integration.review.required`.

## Notification Hooks

Integration Management may emit events that later trigger notifications.

Notification Platform Service owns delivery.

Possible notification triggers include:

- Integration failure.
- Credential expiration.
- Webhook retry exhausted.
- External ID conflict.
- Health check failure.
- Integration review required.

## AI Agent Services Signals

Possible AI Agent Services signals:

- Integration failure signal.
- Repeated webhook failure signal.
- Credential expiration risk.
- External ID conflict signal.
- API reliability risk.
- Vendor integration readiness signal.
- Buyer integration readiness signal.
- External action failure signal.
- Integration setup recommendation signal.

AI agents may recommend review actions or approved external actions but must not bypass source-module ownership, approval, credential, redaction, tenant-scope, or integration permission controls.

## Open Questions

- Which external systems are supported at launch?
- Which integrations are configured at parent company versus child entity level?
- Which integration credentials are tenant-managed versus CIXCI-managed?
- What secrets manager or secure storage pattern is used?
- Which integration events are synchronous versus asynchronous?
- What retry limits and rate limits apply by integration type?
- Which external actions require human approval?
- How are external IDs reconciled when conflicts occur?
- Which systems support webhooks versus polling versus CSV/manual exchange?
- What environments are required: sandbox, staging, production?
- Which integrations are eligible for AI agent actions?
- What retention applies to integration payload references and external action outcomes?

## Impacts

Future Integration Management module drafting should define:

- External connection record model.
- Integration configuration model.
- Credential reference and secret boundary model.
- External ID mapping model.
- Webhook delivery and inbound registration placeholders.
- External action request/outcome model.
- Integration health check model.
- Retry, rate-limit, and failure state model.
- Logs & Audit references.
- Notification hooks.
- AI Agent Services integration signals and action boundaries.

Future source modules should define the specific external actions and source-module contracts they allow. Integration Management should coordinate connection execution and evidence without taking ownership of the source records or workflow state.

## Consequences

- External connections become governed through a shared platform service instead of being recreated inside each module.
- Source modules retain ownership of CIXCI operational records and business state.
- External project tools, storefronts, accounting systems, storage providers, notification providers, and other third-party tools are explicitly prevented from becoming accidental sources of truth.
- Credential references, external IDs, webhooks, health checks, retries, failures, and external action outcomes can be modeled consistently.
- Future Integration Management module work should happen after this bounded platform-service boundary is accepted.
