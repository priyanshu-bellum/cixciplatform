# Integration Management / External System Connections Boundary Contracts

This document is proposal-level architecture. It clarifies Integration Management boundaries without moving Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, AI Agent Services, Logs & Audit, Notification, Media, Analytics, Procurement, Payment, Accounting, or Vendor Operational Interface ownership into Integration Management.

## What Integration Management May Answer

- Which external connection record exists.
- Which integration configuration, mode, direction, environment, endpoint reference, or status applies.
- Which credential reference, authentication method reference, rotation/expiration/revocation status, or permission scope applies.
- Which external ID mapping exists and whether it has a conflict, stale, suspended, expired, superseded, or review-required state.
- Which inbound webhook receipt exists, including signature verification, replay/stale/out-of-order/duplicate status, source-module routing reference, and source-module disposition.
- Which webhook/API delivery attempt exists and what its delivery status is.
- Which retry policy, retry budget, retry exhaustion, rate-limit state, health check, test/check status, circuit-breaker state, provider outage state, or last failure applies.
- Which dead-letter queue / quarantine placeholder record exists.
- Which external action request, outcome, or source-module disposition record exists.
- Which integration events and audit references were emitted.

## What Integration Management Must Not Answer

- Which CIXCI source record is true when a source module owns it.
- Whether a provider callback is final CIXCI business truth.
- Whether a product, device, price, route, fulfillment state, invoice state, tenant eligibility, warranty claim, notification, media asset, AI recommendation, analytics metric, procurement order, payment/accounting outcome, or vendor operational workflow is correct.
- Whether an external project/task tool task is the authoritative onboarding, readiness, order, invoice, warranty, or audit state.
- What raw credential or secret value is.
- Which source-module business state should be mutated without an approved source-module action contract and source-module acceptance.

## Source-Of-Truth Boundary

Agents and platform services may operate across external systems through approved integrations. External project tools, storefronts, accounting systems, notification providers, storage providers, shipping providers, warranty systems, or other third-party tools must never become the source of truth for CIXCI operational records.

External systems may store synchronized copies, references, tasks, notifications, files, invoices, delivery confirmations, or provider statuses. CIXCI source modules remain authoritative unless a future ADR explicitly assigns otherwise.

Inbound webhook receipts and provider callbacks are evidence/control-plane state only. Source modules decide whether webhook data changes business records. Integration Management must not treat provider callbacks as final CIXCI business truth.

External action outcomes do not mutate CIXCI business state unless accepted by the owning source module.

## Boundary Splits

### Source Modules vs Integration Management

Source modules own business event meaning, source records, workflow state, source-module disposition, business-state acceptance/mutation, and allowed action contracts.

Integration Management owns connection configuration, delivery/receipt evidence, external action execution records, external references, source-module disposition references, and integration health evidence.

### Logs & Audit vs Integration Management

Logs & Audit owns audit evidence, file tracking, API transmission logs where assigned, retention, and audit search.

Integration Management owns integration state and emits audit references for credential lifecycle, inbound webhook receipts, signature verification failures, webhook delivery, API transmission, external action, source-module disposition, health, retry, provider outage, circuit breaker, dead-letter/quarantine, and review events.

### Notification vs Integration Management

Notification Platform Service owns notification delivery content/history, templates, preferences, recipients, and provider delivery attempts where assigned.

Integration Management may track notification provider connection configuration and health. External providers do not own CIXCI notification history.

### Media vs Integration Management

Media / Image Asset Management owns Media Asset IDs, asset metadata, renditions, access policies, storage path metadata, and processing state.

Integration Management may track AWS/S3-style storage provider connection/configuration references. Storage paths/objects must not become CIXCI source-of-truth identifiers.

### AI Agent Services vs Integration Management

AI Agent Services owns recommendations, drafts, confidence scores, and action outcome records.

Integration Management owns approved integration execution records and external system references. AI agents must not bypass permissions, approvals, tenant scope, credential policy, redaction rules, or source-module action contracts. Business-state impact requires source-module acceptance.

### External Project / Task Tools vs CIXCI

External project/task tools such as ClickUp may support onboarding task coordination, implementation project management, support task creation, or approved AI-generated external tasks.

External project/task tools must not become source of truth for CIXCI operational records, onboarding state, tenant readiness, product records, order status, fulfillment state, invoice state, warranty state, or audit evidence. CIXCI should store external task references only as integration references.

### Accounting Providers vs Invoice Management

QuickBooks/accounting systems may receive invoice data or references. Invoice Management remains authority for CIXCI invoice records. Accounting systems do not own CIXCI invoice lifecycle unless a future ADR explicitly assigns payment/accounting ownership.

## Credential Boundary

Integration Management may store credential references and configuration metadata. Actual secrets should be stored in a secure secrets manager or approved secure storage.

Secrets must not be exposed in logs, events, notification payloads, exports, AI prompts, analytics data, or external task descriptions.

## Boundary Risks

- Integration Management could become a shadow source of truth if external IDs or provider responses are treated as internal record authority.
- Integration Management could become a secret store if raw secrets are stored directly.
- Integration Management could bypass domain ownership if external actions mutate business state without source-module contracts and source-module acceptance.
- Integration Management could become Logs & Audit if integration history is treated as platform audit evidence rather than audit references.
- Integration Management could become Vendor Operational Interface if connection configuration grows into vendor workflow UX ownership.
- Integration Management could become Fulfillment/Returns, Invoice Management, Notification, Media, Payment, or Accounting if provider callbacks are applied directly instead of routed to source-module disposition.

## Open Questions

- Which external actions require source-module approval versus System Admin approval?
- Which external ID conflicts block source-module workflows?
- Which stale external ID mappings block dependent workflows?
- Which inbound webhook dispositions are source-module-owned versus Integration Management-owned evidence?
- Which circuit-breaker states should source modules consume synchronously?
- Which provider configuration belongs in Integration Management versus source modules or future Vendor Operational Interface?
