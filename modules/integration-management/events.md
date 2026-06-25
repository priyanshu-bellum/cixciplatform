# Integration Management / External System Connections Events

This document is proposal-level architecture. It defines the initial integration event catalog and event modeling notes without finalizing payload schemas, delivery guarantees, broker behavior, or implementation behavior.

## Event Catalog

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
- `integration.external-id-mapping.stale-detected`.
- `integration.external-id-mapping.verified`.
- `integration.inbound-webhook.received`.
- `integration.inbound-webhook.signature-verification-failed`.
- `integration.inbound-webhook.replay-requested`.
- `integration.webhook.delivery.created`.
- `integration.webhook.delivery.failed`.
- `integration.webhook.delivery.retried`.
- `integration.webhook.delivery.completed`.
- `integration.retry.exhausted`.
- `integration.dead-letter.created`.
- `integration.circuit-breaker.state-changed`.
- `integration.provider-outage.detected`.
- `integration.degraded`.
- `integration.restored`.
- `integration.external-action.requested`.
- `integration.external-action.completed`.
- `integration.external-action.failed`.
- `integration.external-action.disposition-recorded`.
- `integration.source-module.disposition-recorded`.
- `integration.review.required`.

## Event Families

### Configuration

- `integration.created`.
- `integration.updated`.
- `integration.enabled`.
- `integration.disabled`.

### Health Credentials And Provider State

- `integration.health-check.completed`.
- `integration.health-check.failed`.
- `integration.credential.rotation.required`.
- `integration.circuit-breaker.state-changed`.
- `integration.provider-outage.detected`.
- `integration.degraded`.
- `integration.restored`.

### External IDs

- `integration.external-id-mapping.created`.
- `integration.external-id-mapping.conflict`.
- `integration.external-id-mapping.stale-detected`.
- `integration.external-id-mapping.verified`.

### Inbound Webhooks

- `integration.inbound-webhook.received`.
- `integration.inbound-webhook.signature-verification-failed`.
- `integration.inbound-webhook.replay-requested`.
- `integration.source-module.disposition-recorded`.

### Webhook And API Delivery

- `integration.webhook.delivery.created`.
- `integration.webhook.delivery.failed`.
- `integration.webhook.delivery.retried`.
- `integration.webhook.delivery.completed`.
- `integration.retry.exhausted`.
- `integration.dead-letter.created`.

### External Actions

- `integration.external-action.requested`.
- `integration.external-action.completed`.
- `integration.external-action.failed`.
- `integration.external-action.disposition-recorded`.

### Review

- `integration.review.required`.

## Required Event Fields

Proposal-level fields:

- Event id.
- Event type.
- Event version.
- Integration id.
- Integration type.
- External system name.
- Integration mode.
- Source module where applicable.
- Target module where applicable.
- Tenant/company/entity scope.
- Environment.
- Status.
- Related record reference where applicable.
- External object reference where applicable.
- Provider event id where applicable.
- Source-module disposition where applicable.
- Failure reason where applicable.
- Retryability where applicable.
- Redaction class.
- Access class.
- Audit reference.
- Correlation id.
- Idempotency key where applicable.
- Occurred at.

## Payload Boundaries

Events should carry references and redacted summaries. Events must not expose raw secrets, unrestricted payloads, sensitive customer/order/pricing/invoice/warranty/media/licensing data, or provider-specific secrets.

External systems are not source-of-truth authorities for CIXCI operational records. Integration events communicate connection state, delivery/receipt evidence, mapping state, health, provider outage/circuit-breaker state, source-module disposition, and external action evidence only.

## Consumers

Potential consumers:

- Logs & Audit for audit evidence references.
- Notification Platform Service for integration failure and review notifications.
- AI Agent Services for integration health, setup, and failure signals.
- Source modules for integration delivery, receipt, mapping, or action outcome references.
- Analytics future placeholder for integration operational metrics.

## Notification Hooks

Possible notification-triggering events:

- Integration failure.
- Credential expiration or rotation required.
- Webhook retry exhausted.
- Inbound webhook signature verification failure.
- External ID conflict.
- Stale external ID mapping detected.
- Health check failure.
- Provider outage detected.
- Circuit breaker opened.
- Dead-letter/quarantine created.
- Integration degraded/restored.
- Integration review required.

Notification Platform Service owns notification delivery.

## AI Agent Services Signals

Possible signals:

- Integration failure signal.
- Repeated webhook failure signal.
- Credential expiration risk.
- External ID conflict signal.
- Stale external ID mapping signal.
- API reliability risk.
- Provider outage signal.
- Circuit breaker signal.
- Vendor integration readiness signal.
- Buyer integration readiness signal.
- External action failure signal.
- Source-module rejection signal.
- Integration setup recommendation signal.

AI agents may recommend review actions or approved external actions but must not bypass source-module ownership, approval, credential, redaction, tenant-scope, or integration permission controls.

## Open Questions

- Which events are required at launch?
- Which events are internal-only versus tenant-visible?
- Which events require notification hooks?
- Which integration events need replay guarantees?
- Which events should source modules consume synchronously versus asynchronously?
