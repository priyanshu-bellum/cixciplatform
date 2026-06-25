# Integration Management / External System Connections Assumptions And Open Questions

This document is proposal-level architecture. It captures assumptions, scale placeholders, unresolved decisions, and next decisions needed.

## Assumptions

- ADR-0015 is the canonical bounded-context guidance for Integration Management / External System Connections.
- CIXCI source modules remain authoritative for operational records.
- External systems may store synchronized copies, references, tasks, notifications, files, invoices, delivery confirmations, or provider statuses, but not CIXCI source-of-truth records unless a future ADR explicitly assigns otherwise.
- Integration Management owns connection configuration, integration state, delivery/receipt evidence, external references, external action execution records, source-module disposition references, and health evidence.
- Source modules own business-state acceptance and mutation.
- Integration Management does not store raw secret values.
- Actual secrets should live in a secure secrets manager or approved secure storage.
- Logs & Audit owns audit evidence.
- Notification Platform Service owns notification delivery history.
- AI Agent Services owns recommendations, drafts, confidence scores, and action outcome records.
- Source modules must define approved external action contracts before Integration Management executes source-affecting external actions.

## Scale Assumptions

Proposal-level placeholders:

- Integrations per tenant: unresolved.
- Integrations per parent company: unresolved.
- Integrations per child entity: unresolved.
- Vendor integrations per vendor: unresolved.
- Buyer integrations per buyer: unresolved.
- Device manufacturer integrations per manufacturer: unresolved.
- Inbound webhook receipts per day: unresolved.
- Webhook deliveries per day: unresolved.
- API transmissions per day: unresolved.
- External ID mappings per integration: unresolved.
- External ID verification frequency: unresolved.
- Health check frequency: unresolved.
- Retry volume: unresolved.
- Retry exhaustion volume: unresolved.
- Dead-letter/quarantine volume: unresolved.
- External action requests per day: unresolved.
- Provider response retention volume: unresolved.
- Payload reference retention volume: unresolved.

## Proposal-Level Scale Controls

Future implementation should consider:

- Provider outage state.
- Integration degraded/restored state.
- Circuit breaker open/closed/half-open placeholder.
- Retry budgets.
- Retry exhaustion handling.
- Backpressure.
- Queue partitioning by tenant/provider/integration.
- Dead-letter queue / quarantine placeholder.
- Replay windows.
- Rate-limit state.
- Provider status reference.
- Bulk status pagination.
- Manual review queue priority.
- Retry storm prevention.
- Provider outage monitoring.
- Tenant isolation for delivery and receipt queues.

## Open Questions

- Which external systems are supported at launch?
- Which integrations are configured at parent company versus child entity level?
- Which integration credentials are tenant-managed versus CIXCI-managed?
- What secrets manager or secure storage pattern is used?
- Which integration events are synchronous versus asynchronous?
- What retry limits and rate limits apply by integration type?
- Which circuit-breaker thresholds apply by provider or integration type?
- Which external actions require human approval?
- How are external IDs reconciled when conflicts occur?
- Which stale mappings should block dependent workflows?
- Which systems support webhooks versus polling versus CSV/manual exchange?
- What environments are required: sandbox, staging, production?
- Which integrations are eligible for AI agent actions?
- What retention applies to integration payload references and external action outcomes?
- Which provider response fields may be stored, redacted, or discarded?
- Which integration health failures should trigger notifications?
- Which integration failures should block source-module workflows?
- Which inbound webhook receipts can be replayed or retried?
- Which vendor/buyer/manufacturer integrations need future Vendor Operational Interface support?

## Boundary Questions

- Which provider configuration belongs in Integration Management versus source modules?
- Which integration workflows should be owned by a future Vendor Operational Interface?
- Which external action outcomes require source-module reconciliation?
- Which external ID conflicts block downstream activity?
- Which inbound webhook dispositions are source-module-owned?
- Which notification provider configuration belongs in Integration Management versus Notification Platform Service?
- Which media storage provider configuration belongs in Integration Management versus Media / Image Asset Management?

## Next Decisions Needed

- Launch integration list.
- Integration ownership and admin permissions.
- Credential storage pattern.
- Credential rotation and revocation policy.
- External ID mapping conflict policy.
- External ID staleness and verification policy.
- Inbound webhook receipt and replay policy.
- Webhook delivery retry policy.
- API transmission retry policy.
- Provider outage and circuit-breaker model.
- Rate-limit strategy.
- Integration health check standards.
- Dead-letter/quarantine handling.
- External action approval matrix.
- Source-module action contract format.
- Source-module disposition contract.
- Payload redaction and retention policy.
- AI agent integration action policy.
- Notification hooks for integration events.
