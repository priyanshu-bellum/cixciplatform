# Integration Management / External System Connections Event Contracts

This document is proposal-level architecture. It defines initial event interface contracts without finalizing schemas, delivery guarantees, broker behavior, or implementation details.

## Event Name

Integration events should use the `integration.*` namespace.

Examples:

- `integration.created`.
- `integration.health-check.failed`.
- `integration.external-id-mapping.conflict`.
- `integration.inbound-webhook.received`.
- `integration.webhook.delivery.failed`.
- `integration.circuit-breaker.state-changed`.
- `integration.external-action.disposition-recorded`.

## Event Purpose

Integration events communicate integration configuration, enablement, credential lifecycle, external ID mapping, inbound webhook receipt, webhook/API delivery, health, provider outage/circuit-breaker state, retry exhaustion, external action, source-module disposition, and review outcomes.

They do not redefine source-module business state, external provider authority, Logs & Audit evidence, Notification delivery history, or AI recommendation state.

## Event Producer

Integration Management produces `integration.*` events.

Source modules produce the business events that Integration Management may deliver externally. Integration Management owns delivery configuration, receipt evidence, and delivery state, not business event meaning.

## Event Consumers

Potential consumers:

- Logs & Audit File Tracking.
- Notification Platform Service.
- AI Agent Services.
- Source modules that need integration execution, receipt, mapping, or disposition references.
- Analytics future placeholder.

## Trigger Conditions

Proposal-level trigger conditions:

- Integration created, updated, enabled, disabled, degraded, or restored.
- Health check completed or failed.
- Credential rotation required.
- External ID mapping created, verified, stale, or conflict detected.
- Inbound webhook received, signature verification failed, or replay/retry requested.
- Webhook delivery created, failed, retried, completed, or exhausted retry budget.
- Dead-letter/quarantine placeholder created.
- Provider outage detected.
- Circuit breaker state changed.
- External action requested, completed, failed, or disposition recorded.
- Source-module disposition recorded.
- Integration review required.

## Payload Schema

Proposal-level fields:

- `eventId`.
- `eventType`.
- `eventVersion`.
- `integrationId`.
- `integrationType`.
- `externalSystemName`.
- `integrationMode`.
- `sourceModule` where applicable.
- `targetModule` where applicable.
- `tenantScopeReference`.
- `companyEntityScopeReference`.
- `environment`.
- `status`.
- `relatedRecordReference` where applicable.
- `inboundWebhookReceiptReference` where applicable.
- `externalIdMappingReference` where applicable.
- `externalActionRequestReference` where applicable.
- `externalActionOutcomeReference` where applicable.
- `externalObjectReference` where applicable.
- `providerEventId` where applicable.
- `sourceModuleDisposition` where applicable.
- `failureReason` where applicable.
- `retryability` where applicable.
- `auditReference`.
- `correlationId`.
- `idempotencyKey`.
- `redactionClass`.
- `accessClass`.
- `occurredAt`.

## Required Fields

Required for most events:

- Event id.
- Event type.
- Event version.
- Integration id.
- Tenant scope reference.
- Environment.
- Status.
- Correlation id.
- Redaction/access class.
- Occurred at.

## Optional Fields

- Integration type.
- External system name.
- Source module.
- Target module.
- Related record reference.
- Inbound webhook receipt reference.
- External ID mapping reference.
- External action request/outcome reference.
- External object reference.
- Provider event id.
- Source-module disposition.
- Failure reason.
- Retryability.
- Audit reference.
- Idempotency key.

## Idempotency Rules

Events should include idempotency keys for integration creation, enable/disable, inbound webhook receipts, webhook delivery, API transmissions, external ID mappings, mapping verification, external actions, retries, replay placeholders, and review outcomes where appropriate. Consumers should tolerate duplicate event delivery.

## Ordering / Sequencing Rules

Proposal-level sequencing:

- Integration creation should precede enablement.
- Enablement should precede delivery attempts unless explicitly backfilled.
- Credential rotation-required events should not expose credential values.
- External ID mapping conflicts or stale mapping events should supersede successful mapping usage until reviewed where source-module policy requires it.
- Inbound webhook receipt events may arrive out of order; consumers should rely on provider timestamp, received timestamp, sequence/cursor placeholder, dedupe key, replay status, and source-module disposition rather than arrival order.
- Webhook retry/completion events should reference the original delivery attempt where possible.
- External action outcome events should reference the source request and approved action contract.
- External action disposition events should identify source-module acceptance/rejection or applied/ignored state.
- Consumers should not rely on global ordering across integrations.

## Retry / Failure Handling

Delivery and external action failures should preserve retry policy reference, retryability, failure reason, provider/consumer response reference, and audit reference.

Retry exhaustion should produce review-required state where appropriate. Integration Management must not mutate source-module business state as a retry side effect unless an owning module explicitly performs that state change.

Inbound webhook replay/retry should preserve original receipt reference and must not rewrite receipt evidence.

## Versioning Strategy

Version integration event schemas separately from API schemas, provider adapters, credential reference schemas, external ID mapping schemas, inbound webhook receipt schemas, webhook delivery contracts, circuit-breaker/provider outage schemas, and source-module action contracts.

## Security / Access Considerations

Events must not expose raw secrets, unrestricted payloads, provider tokens, sensitive customer/order/pricing/invoice/warranty/media/licensing data, or external task details beyond approved references and redacted summaries.

Signature verification failure events should avoid exposing raw payloads or secrets.

## Audit / Logging Requirements

Integration events should include or produce audit references for Logs & Audit. Logs & Audit owns audit evidence; Integration Management owns connection state and integration execution/receipt state.

## Example Event Payload

```json
{
  "eventId": "integration-event-placeholder",
  "eventType": "integration.inbound-webhook.received",
  "eventVersion": "v0-proposal",
  "integrationId": "integration-placeholder",
  "integrationType": "vendor-api",
  "externalSystemName": "vendor-system-placeholder",
  "integrationMode": "webhook",
  "sourceModule": "fulfillment-returns",
  "tenantScopeReference": "tenant-scope-placeholder",
  "environment": "sandbox",
  "status": "received",
  "inboundWebhookReceiptReference": "inbound-receipt-placeholder",
  "providerEventId": "provider-event-placeholder",
  "sourceModuleDisposition": "pending-review-placeholder",
  "auditReference": "audit-reference-placeholder",
  "correlationId": "correlation-placeholder",
  "idempotencyKey": "idempotency-placeholder",
  "redactionClass": "integration-summary",
  "accessClass": "internal-review",
  "occurredAt": "timestamp-placeholder"
}
```

## Open Questions

- Which events require guaranteed delivery?
- Which events can be exposed to tenant admins?
- Which event payloads should include external references versus internal references only?
- Which retry failures should trigger notifications?
- Which source-module dispositions should produce events owned by Integration Management versus source modules?
