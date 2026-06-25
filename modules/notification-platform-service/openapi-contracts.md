# Notification Platform Service OpenAPI Contracts

This document is an implementation-oriented template for future OpenAPI specification work. It is proposal-level and does not finalize endpoint paths, schemas, providers, authentication, or implementation behavior.

## API Purpose

Define APIs for notification request intake, template management, recipient resolution preview, preference management, delivery status lookup, retry/review workflows, suppression, and notification history.

## Service Ownership

Notification Platform Service owns notification delivery APIs and delivery history APIs. Source modules own the source events, business state, and business decisions that trigger notification requests.

## Endpoint Inventory

Proposal-level endpoint groups:

- `POST /notification-requests` - create a notification request.
- `POST /notification-requests/preview` - dry-run template and recipient policy without creating delivery state.
- `GET /notification-requests/{notificationRequestId}` - lookup request status.
- `GET /notification-requests/{notificationRequestId}/deliveries` - list delivery attempts.
- `POST /notification-requests/{notificationRequestId}/retry` - request retry where allowed.
- `GET /notification-history` - search notification history.
- `GET /templates` - list templates.
- `POST /templates` - create template placeholder.
- `POST /templates/{templateId}/versions` - create template version placeholder.
- `PATCH /templates/{templateId}/versions/{templateVersionId}` - approve/retire placeholder.
- `POST /recipient-resolution/preview` - preview recipients from source signals.
- `GET /preferences` - lookup preferences.
- `PATCH /preferences/{preferenceId}` - update preference where allowed.
- `POST /suppression-records` - create suppression/unsubscribe placeholder.

## Request Methods

- `POST` for request creation, preview, retries, template versioning, and suppression.
- `GET` for lookup/search.
- `PATCH` for controlled preference and template status changes.

## Path Parameters

- `notificationRequestId`.
- `deliveryAttemptId`.
- `templateId`.
- `templateVersionId`.
- `preferenceId`.

## Query Parameters

- `tenantId`.
- `companyId`.
- `entityId`.
- `sourceModule`.
- `eventType`.
- `channel`.
- `recipientType`.
- `status`.
- `dateFrom`.
- `dateTo`.
- `page`.
- `pageSize`.

## Request Body Schema

Future schemas should include:

- Source module and source event reference.
- Tenant scope reference.
- Recipient intent or recipient hints.
- Template type/reference.
- Channel hints.
- Redaction class.
- Safe dynamic fields or payload reference.
- Source-module policy reference.
- Idempotency key.
- Correlation id.

## Response Schemas

Future responses should include:

- Request id.
- Request status.
- Recipient resolution summary.
- Delivery plan summary.
- Delivery attempt references.
- Suppression decisions.
- Template version reference.
- Provider response references where permitted.
- Delivery audit references.

## Error Models

- `400` invalid source event, template, recipient intent, or dynamic field.
- `401` unauthenticated.
- `403` unauthorized source module, recipient scope, or cross-tenant access.
- `404` request/template/preference not found.
- `409` duplicate suppressed or idempotency conflict.
- `422` redaction, preference, or template policy blocked delivery.
- `429` rate limit or fanout throttle.
- `503` provider/channel unavailable placeholder.

## Authentication / Authorization

Authentication and authorization should support service-to-service source module requests, internal operator actions, and future buyer/vendor/admin reads where permitted.

Tenant Company remains authority for users, roles, permissions, company/entity scope, activation state, and notification eligibility inputs.

## Idempotency Rules

`POST /notification-requests` should require an idempotency key for source-event-driven notifications. Retries should use retry-specific idempotency keys while preserving the original request reference.

## Rate Limits / Throttling

Future OpenAPI specs should document request rate limits, provider fanout limits, retry budget limits, digest job limits, and bulk export/search limits.

## Pagination Standards

History, delivery attempts, templates, and preferences should support pagination. Large history exports should be throttled and may require async jobs.

## Versioning Strategy

Version API schemas separately from template versions, dynamic field schemas, event contracts, and provider response formats.

## Webhook Dependencies

Webhook/external notification delivery remains a placeholder. Provider credentials, webhook subscriptions, endpoint validation, transforms, and delivery mechanics should not be placed in source modules.

## Audit / Logging Requirements

- Delivery audit references may be sent to Logs & Audit.
- Sensitive notification history access should be auditable.
- Notification history should store delivery evidence, not unrestricted source payloads.

## Example OpenAPI Snippet

```yaml
paths:
  /notification-requests:
    post:
      summary: Create a notification request
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - sourceModule
                - sourceEventType
                - sourceEventReference
                - tenantScopeReference
                - recipientIntent
                - templateType
                - redactionClass
                - idempotencyKey
              properties:
                sourceModule:
                  type: string
                sourceEventType:
                  type: string
                sourceEventReference:
                  type: string
                tenantScopeReference:
                  type: string
                recipientIntent:
                  type: string
                templateType:
                  type: string
                channelHints:
                  type: array
                  items:
                    type: string
                redactionClass:
                  type: string
                safeDynamicFields:
                  type: object
                  additionalProperties: true
                idempotencyKey:
                  type: string
      responses:
        '202':
          description: Notification request accepted
        '409':
          description: Duplicate suppressed or idempotency conflict
        '422':
          description: Template, redaction, preference, or recipient policy blocked request
```

## Open Questions

- Which OpenAPI endpoints are needed at launch?
- Which endpoints are internal-only?
- Which schemas can be safely exposed to buyers or vendors?
- Which provider response fields can be retained or exposed?
