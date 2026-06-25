# Integration Management / External System Connections OpenAPI Contracts

This document is proposal-level architecture. It captures implementation-oriented API specification notes without finalizing endpoint paths, schemas, OpenAPI version, transport, provider-specific behavior, or security implementation.

## API Purpose

Provide implementation-ready API documentation placeholders for managing external integrations, credential references, external ID mappings, webhook/API delivery records, health checks, external action requests, outcomes, and review states.

## Service Ownership

Integration Management APIs expose configuration and execution evidence for external connections. They must not become direct mutation APIs for Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, AI Agent Services, Logs & Audit, Notification, Media, Analytics, Procurement, or Vendor Operational Interface business records.

## Endpoint Inventory

Proposal-level endpoint groups:

- `/integrations` for integration configuration.
- `/integrations/{integrationId}` for integration lookup/update placeholder.
- `/integrations/{integrationId}/enable` and `/disable` placeholders.
- `/integrations/{integrationId}/credentials` for credential reference metadata.
- `/integrations/{integrationId}/external-id-mappings` for mapping records.
- `/integrations/{integrationId}/webhooks` for outbound/inbound webhook placeholders.
- `/integrations/{integrationId}/deliveries` for webhook/API delivery records.
- `/integrations/{integrationId}/health-checks` for health check requests/results.
- `/integrations/{integrationId}/tests` for integration test/check placeholders.
- `/integrations/{integrationId}/external-actions` for approved external action requests.
- `/integrations/{integrationId}/review-required` for review queues.

## Request Methods

- `POST` create configuration, run health checks/tests, request external actions, retry deliveries, and submit review decisions.
- `GET` list and retrieve configuration, mappings, deliveries, health checks, outcomes, and review items.
- `PATCH` update configuration metadata, enable/disable state, credential reference metadata, and review status where permitted.

## Path Parameters

- `integrationId`.
- `credentialReferenceId`.
- `externalIdMappingId`.
- `deliveryId`.
- `healthCheckId`.
- `externalActionRequestId`.
- `reviewRequiredId`.

## Query Parameters

- `tenantId`.
- `companyId`.
- `entityId`.
- `integrationType`.
- `externalSystemName`.
- `integrationMode`.
- `sourceModule`.
- `targetModule`.
- `direction`.
- `environment`.
- `status`.
- `healthStatus`.
- `enabled`.
- `dateFrom`.
- `dateTo`.
- `cursor` / `pageSize` placeholder.

## Request Body Schema

Proposal-level schemas:

- `IntegrationConfigurationRequest`.
- `IntegrationEnablementRequest`.
- `CredentialReferenceRequest`.
- `ExternalIdMappingRequest`.
- `WebhookConfigurationRequest`.
- `WebhookRetryRequest`.
- `HealthCheckRequest`.
- `ExternalActionRequest`.
- `ReviewDecisionRequest`.

All schemas should use references for secrets and sensitive payloads. Raw secret values should not appear in API request examples.

## Response Schemas

Proposal-level schemas:

- `IntegrationConfigurationResponse`.
- `IntegrationStatusResponse`.
- `CredentialReferenceStatusResponse`.
- `ExternalIdMappingResponse`.
- `WebhookDeliveryResponse`.
- `ApiTransmissionResponse`.
- `HealthCheckResponse`.
- `ExternalActionOutcomeResponse`.
- `ReviewRequiredResponse`.
- `AuditReferenceResponse`.

## Error Models

Error responses should include:

- Error code.
- Error message.
- Integration id where applicable.
- Source module where applicable.
- Retryability.
- Review-required flag.
- Audit reference.
- Redaction class.

Example error codes:

- `INTEGRATION_DISABLED`.
- `CREDENTIAL_REFERENCE_MISSING`.
- `RAW_SECRET_REJECTED`.
- `EXTERNAL_ID_CONFLICT`.
- `ACTION_CONTRACT_REQUIRED`.
- `WEBHOOK_DELIVERY_FAILED`.
- `RETRY_BUDGET_EXHAUSTED`.
- `RATE_LIMIT_EXCEEDED`.
- `SOURCE_MODULE_AUTHORITY_REQUIRED`.

## Authentication / Authorization

OpenAPI security schemes remain placeholders. Future specs should model:

- Internal service identity.
- System Admin role.
- Tenant/company/entity admin integration permission.
- Source-module action authorization.
- AI approved action contract authorization.

## Idempotency Rules

Mutation endpoints should accept idempotency keys. External action requests, webhook retries, API transmissions, external ID corrections, and enable/disable operations should be idempotent where possible.

## Rate Limits / Throttling

Future OpenAPI docs should expose rate-limit headers or response metadata where appropriate, without finalizing provider behavior.

## Pagination Standards

List endpoints should use cursor or page/pageSize placeholders. Delivery attempts, API transmissions, mappings, health checks, external actions, and audit references may be high-volume.

## Versioning Strategy

Version endpoint groups, schema versions, provider-specific adapters, event payloads, and external action contracts independently.

## Webhook Dependencies

Webhook endpoints should include idempotency key, event type, source module reference, payload redaction class, delivery status, retry policy reference, and provider/consumer response reference.

## Audit / Logging Requirements

Every configuration change, credential lifecycle event, webhook/API delivery, external action request/outcome, health check, retry, failure, and review decision should produce an audit reference for Logs & Audit.

## Example OpenAPI Snippet

```yaml
paths:
  /integrations/{integrationId}/health-checks:
    post:
      summary: Request proposal-level integration health check
      parameters:
        - name: integrationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '202':
          description: Health check accepted
```

## Open Questions

- Which endpoints are internal-only?
- Which endpoints can be exposed to tenant admins?
- Which OpenAPI security schemes are needed?
- Which provider-specific extensions are acceptable without leaking provider ownership into source modules?
