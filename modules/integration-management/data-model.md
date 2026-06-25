# Integration Management / External System Connections Data Model

This document is proposal-level architecture. It defines initial entities without finalizing schema, provider implementation, credential storage, retry behavior, circuit-breaker thresholds, or external action execution behavior.

## Entities

### Core Integration

- Integration.
- External Connection Record.
- Integration Configuration.
- Integration Mode.
- Integration Type.
- Integration Status History.
- Integration Enablement Record.
- Integration Disablement Record.
- Integration Environment.
- Integration Scope.

### Credentials And Authentication

- Credential Reference.
- Authentication Method Reference.
- Credential Lifecycle Record.
- Credential Rotation Requirement.
- Credential Expiration Record.
- Credential Revocation Record.
- Permission Scope Reference.

### External Identifiers

- External ID Mapping Record.
- External System Identifier.
- External Object Reference.
- External Account Reference.
- External Task Reference.
- External Invoice Reference.
- External Provider Response Reference.
- External ID Conflict Record.
- External ID Mapping Verification Record.
- Stale External ID Mapping Record.

### Delivery And Webhooks

- API Endpoint Configuration.
- Inbound Webhook Registration Placeholder.
- Inbound Webhook Receipt Record.
- Outbound Webhook Configuration.
- Webhook Delivery Attempt.
- Webhook Delivery Status.
- API Transmission Record.
- Retry Policy Reference.
- Rate Limit Placeholder.
- Payload Redaction Class.
- Provider / Consumer Response Reference.
- Dead-Letter / Quarantine Record Placeholder.

### Health And Testing

- Integration Health Status.
- Integration Health Check Record.
- Integration Test / Check Status.
- Provider Outage State.
- Integration Degraded State.
- Circuit Breaker State Placeholder.
- Last Successful Transmission Reference.
- Last Failure Reference.
- Review Required Record.

### External Actions

- External Action Request Record.
- External Action Outcome Record.
- External Action Disposition Record.
- Approved Action Contract Reference.
- External Action Approval Reference.
- External Action Failure Record.
- Compensation / Rollback Reference.

### Audit And Signals

- Integration Event Record.
- Integration Audit Reference.
- Logs & Audit Reference.
- Notification Hook Reference.
- AI Integration Signal Reference.

## Integration Configuration

Proposal-level fields:

- Integration id.
- Owning company/entity.
- Parent/child entity scope.
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
- Provider outage state reference.
- Circuit breaker state reference.
- Audit reference.

## Integration Scope

Proposal-level fields:

- Tenant scope reference.
- Parent company reference.
- Child entity reference placeholder.
- Vendor reference placeholder.
- Buyer reference placeholder.
- Device manufacturer reference placeholder.
- Region.
- Product type scope placeholder.
- Source module permission reference.

Tenant Company remains authority for tenant/company/entity/user scope and permissions.

## Credential Reference

Proposal-level fields:

- Credential reference id.
- Integration id.
- Credential type placeholder: API key, OAuth, basic auth, token, certificate, future value.
- Authentication method reference.
- Secret storage reference placeholder.
- Permission scope.
- Rotation status.
- Expiration status.
- Revocation status.
- Created by / created at.
- Last rotated at.
- Audit reference.

Actual secrets should be stored in a secure secrets manager or approved secure storage. Raw secrets must not be exposed in logs, events, notification payloads, exports, AI prompts, analytics data, or external task descriptions.

## External ID Mapping Record

Proposal-level fields:

- External ID mapping id.
- Integration id.
- Internal record reference.
- Internal source record version.
- Source module.
- External system id.
- External object id.
- External object type.
- External object version.
- Mapping authority/source.
- Mapping confidence placeholder.
- Tenant/company/entity scope.
- Environment.
- Effective dates.
- Expiration.
- Last verified timestamp.
- Mapping status.
- Conflict status.
- Stale status.
- Suspended status.
- Review-required state.
- Source-module disposition.
- Supersession / correction reference.
- Created by / created at.
- Audit reference.

Source modules remain authority for internal CIXCI records. External IDs map to internal records without replacing them. Stale or conflicting mappings should block or route dependent workflows to review according to source-module policy.

## Inbound Webhook Receipt Record

Proposal-level fields:

- Inbound webhook receipt id.
- Integration id.
- Inbound webhook registration reference.
- Provider event id.
- Provider event type.
- Received timestamp.
- Provider timestamp.
- Signature verification result.
- Signature verification failure reason.
- Payload reference or masked payload reference.
- Payload redaction class.
- Idempotency key.
- Dedupe key.
- Sequence number / cursor placeholder.
- Replay status.
- Stale event status.
- Out-of-order event status.
- Duplicate event status.
- Source-module routing reference.
- Source-module disposition.
- Review-required state.
- Audit reference.

Inbound webhook receipt is evidence/control-plane state only. Source modules decide whether webhook data changes business records. Integration Management must not treat provider callbacks as final CIXCI business truth.

## Webhook Delivery Attempt

Proposal-level fields:

- Webhook delivery attempt id.
- Integration id.
- Outbound webhook configuration reference.
- Source module.
- Source event reference.
- Event type.
- Idempotency key.
- Retry policy reference.
- Attempt number.
- Payload redaction class.
- Delivery status.
- Consumer/provider response reference.
- Last failure reason.
- Next retry at placeholder.
- Retry exhaustion status.
- Dead-letter / quarantine reference placeholder.
- Audit reference.

Source modules own business event meaning. Integration Management owns delivery configuration and integration state. Logs & Audit owns audit evidence.

## API Transmission Record

Proposal-level fields:

- API transmission id.
- Integration id.
- Endpoint reference.
- Direction: inbound or outbound.
- Source module.
- Target module.
- Internal record reference.
- External object reference.
- Idempotency key.
- Retry policy reference.
- Rate limit state placeholder.
- Circuit breaker state placeholder.
- Status.
- Provider/consumer response reference.
- Payload redaction class.
- Failure reason.
- Audit reference.

## Health Check Record

Proposal-level fields:

- Health check id.
- Integration id.
- Health check type.
- Environment.
- Status: healthy, degraded, failed, unknown, review-required.
- Provider outage state.
- Integration degraded state.
- Circuit breaker state: open, closed, half-open placeholder.
- Provider status reference.
- Checked at.
- Last successful transmission reference.
- Last failure reference.
- Error summary.
- Notification hook reference placeholder.
- Audit reference.

## Provider Outage And Circuit-Breaker Record

Proposal-level fields:

- Provider outage state id.
- Integration id.
- External system/provider reference.
- Outage/degraded/restored status.
- Circuit breaker state: open, closed, half-open placeholder.
- Retry budget.
- Retry exhaustion status.
- Backpressure state.
- Queue partition key: tenant/provider/integration.
- Dead-letter queue / quarantine reference placeholder.
- Replay window.
- Rate-limit state.
- Provider status reference.
- Bulk status pagination cursor placeholder.
- Manual review queue priority.
- Started at / resolved at placeholder.
- Audit reference.

## External Action Request Record

Proposal-level fields:

- External action request id.
- Integration id.
- Requested action type.
- Owning source module.
- Source record reference.
- Source record version.
- Approved action contract reference.
- Requested by actor/service/AI agent placeholder.
- Approval reference where required.
- Tenant/company/entity scope.
- Credential reference.
- Payload redaction class.
- Status: requested, approved, sent, provider-accepted, provider-failed, provider-completed, source-module-accepted, source-module-rejected, ignored, compensated, superseded, expired, review-required.
- Idempotency key.
- Created at.
- Audit reference.

## External Action Outcome Record

Proposal-level fields:

- External action outcome id.
- External action request reference.
- Owning source module.
- Source record reference.
- Source record version.
- Approved action contract reference.
- Provider response reference.
- External object reference.
- Status.
- Failure reason.
- Retryability.
- Source-module disposition.
- Applied vs ignored state.
- Compensation / rollback reference.
- Supersession reference.
- Completed at.
- Audit reference.

External action outcome does not mutate CIXCI business state unless accepted by the owning source module. AI agents may request or draft external actions, but approved action contracts and source-module acceptance are required for business-state impact.

## Events And Signals

Integration events should reference records rather than exposing sensitive payloads or raw secrets. Possible signal records include integration failure, repeated webhook failure, credential expiration risk, external ID conflict, stale external ID mapping, API reliability risk, provider outage, circuit-breaker state change, vendor/buyer integration readiness, external action failure, source-module disposition, and integration setup recommendation.

## Ownership

Integration Management owns:

- Connection records, configuration, integration modes, credential references, external identifiers, external ID mappings, inbound receipt evidence, webhook/API delivery records, provider outage/circuit-breaker records, health status, test/check status, external action request/outcome records, integration events, and integration audit references.

Integration Management does not own:

- Source-module business records or business-state acceptance/mutation, raw secret values, Logs & Audit evidence records, Notification delivery history, Media source records/renditions, AI recommendations, Analytics definitions, Payment, Accounting, Procurement, Vendor Operational Interface, external project/task records as operational source of truth, or external provider records as CIXCI source of truth.

## Retention Notes

Placeholder: define retention for integration configurations, credential lifecycle records, external ID mappings, inbound webhook receipts, webhook delivery attempts, API transmission records, health checks, provider outage/circuit-breaker records, external action outcomes, source-module disposition records, payload references, and provider response references.
