# Notification Platform Service API Contracts

This document is proposal-level architecture. It defines domain API contract concepts without finalizing endpoints, authorization model, schemas, provider integrations, or implementation behavior.

## API Purpose

Notification APIs should support notification request intake, template management, recipient resolution, preferences, delivery orchestration, status lookup, retry/review workflows, suppression, and notification history.

APIs must preserve ADR-0013 boundaries: Notification Platform Service delivers notifications and tracks delivery history, but source modules remain authoritative for business state and event meaning.

## Service Ownership

Notification Platform Service owns APIs for:

- Creating notification requests from source modules or approved platform services.
- Previewing template rendering with safe dynamic fields.
- Validating source-owned eligibility evidence for notification delivery.
- Managing notification templates and versions.
- Resolving recipients through Tenant Company-provided scope signals.
- Previewing recipient resolution and preference evaluation.
- Reading and updating notification preferences where allowed.
- Looking up delivery attempts and delivery status.
- Looking up digest job and fanout batch status.
- Handling delivery callbacks from providers where applicable.
- Requesting retry, suppression, or review workflows.
- Exposing notification history.

Notification APIs must not provide APIs to mutate Product Catalog, Device Catalog, Pricing, Order Routing, Fulfillment/Returns, Invoice Management, Warranty, Tenant Company, Logs & Audit, AI Agent Services, Analytics, or external provider source records.

## Endpoint Inventory

Proposal-level endpoint groups:

- Notification request intake.
- Notification preview / dry-run.
- Eligibility evidence validation.
- Template management.
- Recipient resolution preview.
- Preference evaluation preview.
- Preference management.
- Delivery status lookup.
- Delivery attempt lookup.
- Delivery callback handling.
- Delivery retry.
- Digest job status.
- Fanout batch status.
- Suppression review.
- Suppression/unsubscribe placeholder.
- Notification history lookup.
- Provider response reference lookup.
- Delivery audit reference lookup.

## Request Methods

Proposal-level methods:

- `POST` for notification requests, preview/dry-run, eligibility validation preview, preference evaluation preview, retries, suppression actions, delivery callbacks, and template version creation.
- `GET` for status, history, templates, preferences, digest jobs, fanout batches, delivery attempts, and provider response references.
- `PATCH` for preference updates, template approval placeholders, suppression review, and review status placeholders where permitted.

## Path Parameters

Possible path parameters:

- `notificationRequestId`.
- `deliveryAttemptId`.
- `templateId`.
- `templateVersionId`.
- `preferenceId`.
- `recipientId`.
- `sourceModule`.
- `sourceEventId`.
- `digestJobId`.
- `fanoutBatchId`.
- `eligibilityEvidenceId`.

## Query Parameters

Possible query parameters:

- `tenantId`.
- `companyId`.
- `entityId`.
- `recipientType`.
- `channel`.
- `eventType`.
- `sourceModule`.
- `status`.
- `dateFrom`.
- `dateTo`.
- `redactionClass`.
- `digestStatus`.
- `fanoutStatus`.
- `page` / `pageSize` placeholder.

## Request Body Schema

Notification request body should include:

- Source module.
- Source event type.
- Source event reference.
- Source record references.
- Tenant scope reference.
- Recipient intent.
- Eligibility evidence references where applicable.
- Template type/reference.
- Channel hints.
- Redaction class.
- Safe dynamic field values or payload reference.
- Source-module policy reference.
- Idempotency key.
- Correlation id.

Eligibility evidence body should include:

- Source module.
- Source event reference.
- Eligibility signal id.
- Eligibility signal version/hash.
- Recipient scope.
- Recipient group reference.
- Expiration timestamp.
- Tenant scope.
- Source-owned eligibility result.
- Re-check-before-delivery flag.

## Response Schemas

Proposal-level responses:

- Notification request accepted / rejected.
- Eligibility evidence validation result.
- Recipient resolution preview.
- Preference evaluation preview.
- Template preview result.
- Delivery status result.
- Delivery attempt list.
- Digest job status result.
- Fanout batch status result.
- Delivery callback result.
- Notification history result.
- Preference result.
- Retry request result.
- Suppression review result.

Responses should use references and redacted summaries by default.

## Error Models

Proposal-level errors:

- Unknown source module.
- Missing source event reference.
- Missing tenant scope.
- Missing eligibility evidence.
- Expired eligibility evidence.
- Stale eligibility evidence.
- Invalid recipient intent.
- Recipient resolution failed.
- Preference precedence conflict.
- Required/system notification policy conflict.
- Template missing or inactive.
- Unsafe dynamic field.
- Redaction policy blocked.
- Preference suppressed.
- Duplicate suppressed.
- Channel unavailable.
- Provider unavailable.
- Provider rate-limited.
- Fanout cap exceeded.
- Retry budget exhausted.
- Unauthorized recipient scope.
- Cross-tenant access denied.

## Authentication / Authorization

Authorization should consider:

- Source module/service identity.
- Tenant scope.
- User or service role.
- Template management permission.
- Preference management permission.
- Suppression review permission.
- Notification history access class.
- Sensitive delivery record access.

Tenant Company remains the authority for users, roles, company/entity scope, permissions, activation, and notification eligibility inputs.

## Idempotency Rules

Notification request intake should require or generate an idempotency key based on source module, source event reference, recipient intent, eligibility evidence reference, channel, template type, and recipient scope where appropriate.

Provider callbacks should include provider callback idempotency fields where available. Duplicate callbacks should collapse into existing delivery attempt history.

Duplicate suppression should prevent repeated sends for the same source event and recipient unless a retry, regeneration, escalation, digest, or supersession rule explicitly allows it.

## Rate Limits / Throttling

Proposal-level controls:

- Source-module request rate limits.
- Recipient/channel fanout limits.
- Role-expansion limits.
- Customer-facing notification volume placeholder.
- Provider-specific throttling placeholders.
- Bulk notification job limits.
- Digest generation limits.
- Fanout batch limits.
- Retry budget limits.
- High-volume catalog notification throttling.

## Pagination Standards

History, delivery attempts, templates, preferences, digest jobs, fanout batches, provider response references, and recipient expansion previews should support pagination or streaming where volumes require it.

## Versioning Strategy

APIs should version:

- Notification request schema.
- Eligibility evidence schema.
- Template schema.
- Dynamic field schema.
- Recipient resolution schema.
- Preference evaluation schema.
- Delivery status schema.
- Digest job schema.
- Fanout batch schema.
- Event contracts.

## Webhook Dependencies

Webhook/external notification delivery is a placeholder. If introduced, webhook subscriptions, credentials, endpoint validation, transforms, schedules, and delivery mechanics may require a separate integration boundary.

## Audit / Logging Requirements

Notification Platform Service may send delivery audit references to Logs & Audit. Logs & Audit owns platform audit evidence, while Notification owns delivery history.

Sensitive notification history access should be auditable.

## Example Domain Request

```json
{
  "sourceModule": "Product Catalog",
  "sourceEventType": "product.catalog.update.requires_buyer_review",
  "sourceEventReference": "event-placeholder",
  "tenantScopeReference": "tenant-scope-placeholder",
  "recipientIntent": "eligibleBuyerCatalogAdmins",
  "eligibilityEvidenceReferences": ["eligibility-evidence-placeholder"],
  "templateType": "catalog-review-required",
  "channelHints": ["email", "in-app"],
  "redactionClass": "catalog-summary",
  "safeDynamicFields": {
    "vendorName": "Vendor Reference Display Name",
    "productCount": 42
  },
  "idempotencyKey": "source-event-recipient-template-placeholder"
}
```

## Open Questions

- Which source modules may call notification request APIs directly?
- Which notification requests are synchronous versus queued?
- Which channels are enabled at launch?
- Which APIs are internal-only versus buyer/vendor/admin-facing?
- Which notification history fields may be exposed to buyers, vendors, or external recipients?
- Which delivery callback endpoints are provider-specific versus normalized?
- Which eligibility evidence validation APIs are internal-only?

## Scheduled System Admin Activity Summary Email API Contracts (Cross-Module PR)

This section adds architecture-level placeholder API contract concepts for the Notification Platform Service side of the cross-module summary email hardening pass. **No OpenAPI schemas, concrete HTTP routes, finalized request / response payloads, or runtime endpoint behavior are introduced.** API governance hardening occurs in later sequencing items.

### Placeholder API surfaces

The following lookup surfaces are anticipated; concrete API design is deferred:

- **Activity Summary Configuration lookup** - read access to configurations by reference or by search filter (state, owner, last-cursor-advancement-timestamp). Architecture-level only. CIXCI System Admin scope.
- **Activity Summary Delivery Attempt history / status lookup** - read access to delivery attempts by reference, by configuration reference, by Reporting Window reference, or by search filter (state, time range, failure reason). Architecture-level only. CIXCI System Admin scope.

### API contract principles (proposal-level)

- All PR-C lookup surfaces enforce CIXCI System Admin scope via Tenant Company `check_access`.
- Vendor users and buyer users are excluded.
- Cross-tenant access is denied by default; Phase 1 is platform-wide CIXCI-internal-only.
- Read-only surfaces; no PR-C lookup surface mutates state.
- Lookups return references and lifecycle-state content; they do not embed source-module records or aggregation record content beyond what the canonical entities carry.

### Surfaces PR-C does not introduce

- OpenAPI schema definitions.
- Concrete endpoint paths, HTTP methods, query parameters, path parameters, request bodies, response bodies, error envelopes, or pagination schemes.
- Mutation surfaces for Activity Summary Configuration (lifecycle transitions happen via NPS Workflow 1; the API surface for triggering them is deferred to API Governance Foundation).
- Mutation surfaces for Activity Summary Delivery Attempt. Records are created by NPS Workflow 7 and transitioned by NPS Workflows 8 / 9.
- Manual retry trigger surfaces.
- Manual cursor reset surfaces.
- Dashboard URL generation surfaces.
- Template management surfaces specific to summary emails.
- Read-receipt or end-recipient confirmation surfaces.

### Boundary discipline reaffirmed

- The Notification Platform Service api-contracts.md PR-C section does not introduce APIs for Activity Summary Reporting Window or Activity Summary Aggregation Record access; those surfaces belong to Analytics / Reporting.
- The Notification Platform Service api-contracts.md PR-C section does not introduce APIs for Activity Summary Generated Evidence or No-Activity Summary Suppression Evidence access; those surfaces belong to Logs & Audit File Tracking.
- No source-module API mutation surfaces (PR #91, PR #92, PR #93, PR #94 entities all read-only via Analytics aggregation, not via direct API call from Notification Platform Service).
- Existing Notification Platform Service api-contracts.md endpoint groups (notification request intake, template management, recipient resolution preview, preference management, delivery status lookup, retry / review workflows, suppression, notification history) are not modified.

### Deferral note

Concrete OpenAPI design, route paths, payload schemas, validation rules, error envelopes, rate limiting, authentication, idempotency keys, pagination, and runtime behavior for these surfaces are deferred to the API Governance Foundation PR and the OpenAPI / module API hardening PRs that follow Media / Image Asset Management and Logs & Audit File Tracking hardening.
