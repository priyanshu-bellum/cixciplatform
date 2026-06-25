# Integration Management / External System Connections API Contracts

This document is proposal-level architecture. It defines domain API contract concepts without finalizing endpoint paths, request schemas, authentication implementation, provider behavior, retry limits, circuit-breaker thresholds, or external action behavior.

## API Purpose

Integration APIs should support connection configuration, enablement/disablement, credential references, external ID mappings, inbound webhook receipts, outbound webhook/API delivery records, health checks, provider outage/circuit-breaker state, integration tests, retry/review workflows, external action requests/outcomes/dispositions, and integration audit references.

## Service Ownership

Integration Management owns APIs for:

- Creating and updating integration configuration.
- Enabling and disabling integrations.
- Managing credential references and credential lifecycle metadata.
- Looking up integration health and test/check status.
- Managing external ID mappings, mapping verification, staleness, and conflicts.
- Managing outbound webhook configuration and inbound webhook registration placeholders.
- Recording and looking up inbound webhook receipts.
- Looking up webhook delivery attempts and API transmission records.
- Requesting inbound webhook replay/retry where allowed.
- Requesting approved external actions.
- Looking up external action outcomes and source-module dispositions.
- Looking up provider outage and circuit-breaker state.
- Looking up dead-letter/quarantine placeholders.
- Emitting integration audit references.

Integration APIs must not mutate source-module business records unless an owning source module has explicitly provided an approved action contract and accepts the resulting business-state change. Integration Management still records execution evidence rather than owning the business outcome.

## Endpoint Inventory

Proposal-level endpoint groups:

- Integration configuration create/update/lookup.
- Integration enable/disable.
- Credential reference lifecycle.
- External ID mapping create/update/lookup.
- External ID mapping verification and staleness lookup.
- External ID conflict review.
- Webhook configuration and outbound delivery lookup.
- Inbound webhook registration placeholder.
- Inbound webhook receipt lookup.
- Inbound webhook replay/retry placeholder.
- Webhook signature verification failure lookup.
- API transmission lookup.
- Retry policy lookup.
- Rate-limit status lookup.
- Provider outage/circuit-breaker state lookup.
- Dead-letter/quarantine lookup.
- Health check execution and status lookup.
- Integration test/check execution.
- External action request.
- External action outcome lookup.
- External action disposition lookup.
- Source-module disposition lookup.
- Review-required queue lookup.
- Integration audit reference lookup.

## Request Methods

Proposal-level methods:

- `POST` for creating integration configuration, health checks, integration tests, webhook delivery retries, inbound webhook replay/retry placeholders, external action requests, mapping verification, and review actions.
- `GET` for integration configuration, status, health, mappings, inbound receipts, delivery attempts, API transmissions, circuit-breaker state, dead-letter/quarantine state, and outcomes.
- `PATCH` for enabling/disabling integrations, updating configuration metadata, updating credential reference metadata, marking source-module dispositions, updating mapping disposition, and marking review outcomes where permitted.

## Path Parameters

Possible path parameters:

- `integrationId`.
- `credentialReferenceId`.
- `externalIdMappingId`.
- `inboundWebhookReceiptId`.
- `webhookDeliveryAttemptId`.
- `apiTransmissionId`.
- `healthCheckId`.
- `providerOutageStateId`.
- `circuitBreakerStateId`.
- `deadLetterRecordId`.
- `externalActionRequestId`.
- `externalActionOutcomeId`.
- `reviewRequiredId`.

## Query Parameters

Possible query parameters:

- `tenantId`.
- `companyId`.
- `entityId`.
- `vendorId`.
- `buyerId`.
- `manufacturerId`.
- `integrationType`.
- `externalSystemName`.
- `integrationMode`.
- `sourceModule`.
- `targetModule`.
- `direction`.
- `environment`.
- `region`.
- `status`.
- `enabled`.
- `healthStatus`.
- `providerEventId`.
- `dedupeKey`.
- `staleStatus`.
- `circuitBreakerState`.
- `dateFrom`.
- `dateTo`.
- `page` / `pageSize` placeholder.

## Request Body Schema

Integration configuration requests should include:

- Owning company/entity.
- Parent/child entity scope.
- Integration type.
- External system name.
- Integration mode.
- Source module.
- Target module.
- Direction.
- Endpoint reference.
- Credential reference.
- Authentication method placeholder.
- External account id.
- Environment.
- Region.
- Effective dates.
- Retry policy reference.
- Rate limit placeholder.
- Circuit-breaker policy reference placeholder.
- Idempotency key.

Inbound webhook receipt requests/placeholders should include:

- Integration id.
- Provider event id.
- Provider event type.
- Provider timestamp.
- Payload reference or masked payload reference.
- Payload redaction class.
- Idempotency key.
- Dedupe key.
- Sequence number / cursor placeholder.
- Signature verification metadata placeholder.

External action requests should include:

- Integration id.
- Owning source module.
- Source record reference.
- Source record version.
- Approved action contract reference.
- Requested action type.
- Tenant/company/entity scope.
- Credential reference.
- Payload redaction class.
- Idempotency key.
- Approval reference where required.

## Response Schemas

Proposal-level responses:

- Integration id.
- Integration status.
- Enabled/disabled/degraded state.
- Configuration version placeholder.
- Credential reference status.
- External ID mapping status.
- External ID mapping verification/stale status.
- Inbound webhook receipt status.
- Signature verification result.
- Source-module disposition.
- Webhook/API delivery status.
- Circuit-breaker state.
- Provider outage state.
- Dead-letter/quarantine reference.
- Health check status.
- Last successful transmission.
- Last failure.
- External action request/outcome/disposition status.
- Applied vs ignored state.
- Review-required state.
- Audit reference.

## Error Models

Proposal-level errors:

- Integration not found.
- Integration disabled.
- Integration degraded placeholder.
- Circuit breaker open.
- Provider outage detected.
- Invalid tenant/company/entity scope.
- Credential reference missing.
- Credential expired/revoked placeholder.
- Raw secret value rejected.
- Unsupported integration mode.
- Unsupported external action.
- Missing approved action contract.
- External ID conflict.
- External ID mapping stale.
- Endpoint unavailable.
- Webhook delivery failed.
- Webhook signature verification failed.
- Duplicate webhook receipt.
- Stale webhook receipt.
- Out-of-order webhook receipt.
- Retry budget exhausted.
- Rate limit exceeded.
- Dead-letter/quarantine created.
- Health check failed.
- Payload redaction violation.
- Cross-tenant access denied.
- Source module authority required.
- Source module rejected disposition.

## Authentication / Authorization

Authorization should consider:

- System Admin integration management permissions.
- Tenant/company/entity admin permissions where future policy allows tenant-managed integrations.
- Vendor/buyer/manufacturer integration scopes.
- Source-module service identity.
- AI Agent approved action permissions.
- Logs & Audit service identity for audit references.

Tenant Company remains authority for company/entity/user scope and permissions. Integration Management must not grant access independently.

## Idempotency Rules

Use idempotency keys for integration creation, enable/disable operations, inbound webhook receipts, webhook deliveries, API transmissions, external action requests, retries, replay placeholders, and external ID mapping corrections where appropriate.

## Rate Limits / Throttling

Proposal-level controls:

- Rate limit placeholders by integration type.
- Provider-specific throughput placeholders.
- Retry budgets.
- Retry exhaustion handling.
- Circuit breaker open/closed/half-open placeholder.
- Provider outage/degraded/restored state.
- Backpressure controls.
- Queue partitioning by tenant/provider/integration.
- Dead-letter queue / quarantine placeholder.
- Replay windows.
- Bulk status pagination.
- Manual review queue priority.
- Webhook delivery queue limits.
- External action request throttles.
- Health check frequency limits.
- Manual file exchange volume placeholders.

## Pagination Standards

Integration lists, mapping lists, inbound receipts, delivery attempts, API transmissions, health checks, provider outage records, dead-letter/quarantine records, review queues, external action histories, source-module dispositions, and audit references should support pagination.

## Versioning Strategy

Version:

- Integration configuration schema.
- External ID mapping schema.
- External ID verification schema.
- Inbound webhook receipt contract.
- Webhook delivery contract.
- External action request/outcome/disposition schema.
- Credential reference metadata schema.
- Circuit-breaker/provider outage schema.
- Event contracts.

## Webhook Dependencies

Integration Management may manage outbound webhook configuration, inbound webhook registration placeholders, inbound webhook receipt records, and replay/retry placeholders. Source modules own business event meaning. Logs & Audit owns audit evidence. Integration Management owns delivery/receipt evidence and integration state.

## Audit / Logging Requirements

Integration events, credential lifecycle events, inbound webhook receipts, signature verification failures, webhook delivery attempts, API transmission results, external action requests, source-module dispositions, failures, retries, health checks, circuit-breaker changes, provider outage records, and status changes should emit audit references to Logs & Audit.

Sensitive payloads and credentials must be redacted or referenced.

## Example Domain Request

```json
{
  "owningCompanyEntity": "entity-placeholder",
  "integrationType": "vendor-api",
  "externalSystemName": "vendor-system-placeholder",
  "integrationMode": "api",
  "sourceModule": "order-routing",
  "targetModule": "external-vendor-system",
  "direction": "outbound",
  "endpointReference": "endpoint-placeholder",
  "credentialReference": "credential-reference-placeholder",
  "environment": "sandbox",
  "retryPolicyReference": "retry-policy-placeholder",
  "idempotencyKey": "integration-config-placeholder"
}
```

## Open Questions

- Which APIs are System Admin-only versus tenant-admin-facing?
- Which integrations can be configured by parent company, child entity, vendor, buyer, or manufacturer?
- Which external actions require synchronous source-module validation?
- Which provider response fields can be stored versus redacted?
- Which inbound webhook replay/retry actions require source-module approval?
