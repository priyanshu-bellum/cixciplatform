# Integration Management / External System Connections Workflows

This document is proposal-level architecture. It defines initial workflows without finalizing provider behavior, implementation design, retry limits, rate limits, circuit-breaker thresholds, credential storage, or external action approval rules.

## Integration Setup

1. Authorized actor selects integration type, external system, mode, direction, source module, target module, environment, and scope.
2. Integration Management creates integration configuration record.
3. Credential reference is associated without exposing raw secret values.
4. Endpoint, webhook, retry, rate-limit, circuit-breaker, and external ID mapping placeholders are configured where applicable.
5. Health/test check is performed where available.
6. Integration is enabled, disabled, degraded, or routed to review.
7. Audit reference is emitted to Logs & Audit.

## Enable / Disable Workflow

1. Authorized actor requests enablement or disablement.
2. Integration Management validates scope, credential reference state, environment, provider outage state, and source-module constraints.
3. Enablement/disablement record is created.
4. Status change event is emitted.
5. Critical disablement may trigger review or notification.

## Credential Reference Lifecycle

1. Credential reference is created with secure storage reference placeholder.
2. Raw secret value is stored outside Integration Management in approved secure storage.
3. Rotation, expiration, revocation, and permission scope are tracked.
4. Rotation-required events may be emitted.
5. Logs & Audit receives credential lifecycle audit references without secret values.

## External ID Mapping Workflow

1. Source module or integration process proposes external ID mapping.
2. Integration Management records internal record reference, source record version, external system id, external object id, external object version, tenant/company/entity scope, integration id, environment, mapping authority/source, and mapping confidence placeholder.
3. Mapping verification records last verified timestamp, effective dates, expiration, stale status, suspended status, and source-module disposition.
4. Conflicts, stale mappings, suspended mappings, or expired mappings produce review-required state or block dependent workflows according to source-module policy.
5. Correction or supersession records preserve history.
6. Source module remains authority for internal CIXCI records.

## Outbound Webhook Delivery

1. Source module emits a business event or approved delivery request.
2. Integration Management resolves outbound webhook configuration.
3. Delivery attempt is created with idempotency key, retry policy, event type, redaction class, and payload/reference boundary.
4. Provider/consumer response reference is recorded.
5. Delivery completes, fails, retries, exhausts retry budget, enters dead-letter/quarantine placeholder, or routes to review.
6. Logs & Audit receives audit reference.

## Inbound Webhook Receipt / Callback

1. External provider sends inbound webhook or callback.
2. Integration Management creates inbound webhook receipt record with provider event id, provider event type, received timestamp, provider timestamp, payload reference or masked payload reference, payload redaction class, idempotency key, dedupe key, and sequence/cursor placeholder.
3. Signature verification result and failure reason are recorded.
4. Replay status, stale event status, out-of-order event status, and duplicate event status are evaluated as proposal-level control-plane evidence.
5. Source-module routing reference is recorded.
6. Owning source module decides business interpretation and records source-module disposition.
7. Review-required state is created for failed verification, duplicate/replayed events, stale/out-of-order events where policy requires review, or unrouteable receipts.
8. Integration Management must not mutate source-module business state independently or treat provider callbacks as final CIXCI business truth.

## API Transmission Workflow

1. Source module or approved action requests external API transmission.
2. Integration Management validates integration status, credential reference, endpoint reference, retry policy, rate-limit state, circuit-breaker state, and approved action contract where needed.
3. API transmission record is created.
4. Provider response reference and status are recorded.
5. Retry/review behavior follows proposal-level policy.
6. Source module decides business outcome using its own contracts.

## Provider Outage / Circuit-Breaker Workflow

1. Provider failures, rate-limit responses, health check failures, webhook failures, or repeated API failures are observed.
2. Integration Management records provider outage state, integration degraded state, provider status reference, retry budget, retry exhaustion, backpressure state, and queue partition key by tenant/provider/integration.
3. Circuit breaker state may become open, closed, or half-open placeholder.
4. Failed work may route to retry queue, dead-letter queue / quarantine placeholder, replay window, or manual review queue priority.
5. Circuit breaker state changed, provider outage detected, retry exhausted, dead-letter/quarantine created, integration degraded, or integration restored events may be emitted.
6. Source modules retain business-state ownership and decide whether integration degradation blocks dependent workflows.

## Health Check Workflow

1. Health check is scheduled or requested.
2. Integration Management checks endpoint, credential reference state, provider availability placeholder, last transmission state, rate-limit state, and circuit-breaker state where applicable.
3. Health status becomes healthy, degraded, failed, unknown, or review-required.
4. Health check completed/failed event is emitted.
5. Notification hook may be emitted for failures or restoration.

## External Action Lifecycle

1. Source module, System Admin, or AI agent proposes external action through approved integration.
2. Integration Management validates permissions, tenant scope, credential reference, redaction rules, and approved action contract.
3. External action request lifecycle may move through requested, approved, sent, provider-accepted, provider-failed, provider-completed, source-module-accepted, source-module-rejected, ignored, compensated, superseded, expired, or review-required.
4. Provider response reference and external object reference are recorded.
5. Owning source module records source-module disposition and determines whether the result is applied or ignored.
6. Compensation / rollback reference and supersession reference are captured where applicable.
7. External action outcome does not mutate CIXCI business state unless accepted by the owning source module.

## External Project / Task Tool Workflow

1. Source module, System Admin, or AI agent proposes external task creation/update through an approved integration.
2. Integration Management validates approved action contract, tenant scope, credential reference, and redaction rules.
3. External action request is created.
4. External project/task tool response reference is recorded.
5. CIXCI stores external task reference only as integration reference.
6. External project/task tool does not become source of truth for CIXCI operational records.

## QuickBooks / Accounting Sync Placeholder

1. Invoice Management provides invoice data/reference according to its boundary.
2. Integration Management executes or tracks accounting connector delivery where approved.
3. External invoice id, sync status, error state, retry status, provider response, and source-module disposition are recorded.
4. Invoice Management remains authority for CIXCI invoice records.

## Media Storage Provider Placeholder

1. Media / Image Asset Management provides storage provider configuration need where appropriate.
2. Integration Management may track storage provider connection/configuration reference.
3. Media remains authority for Media Asset IDs, asset metadata, renditions, access policy, and processing state.
4. Storage provider paths/objects must not become source-of-truth identifiers.

## Notification Provider Placeholder

1. Notification Platform Service provides provider configuration need where appropriate.
2. Integration Management may track provider configuration and health.
3. Notification Platform Service owns notification delivery history.
4. External providers do not own CIXCI notification history.

## AI Agent Services Workflow

1. AI agent recommends integration setup, health review, external task update, or approved external action.
2. Integration Management validates permissions, approved action contracts, tenant scope, credential policy, and redaction rules.
3. External action request/outcome record is created.
4. AI Agent Services owns recommendation/draft/confidence; Integration Management owns execution evidence; source modules remain authoritative.
5. Business-state impact requires approved action contracts and source-module acceptance.

## Review Workflow

1. Integration failure, credential issue, webhook retry exhaustion, external ID conflict, stale mapping, health failure, provider outage, circuit-breaker open state, dead-letter/quarantine item, or external action failure creates review-required state.
2. Authorized reviewer evaluates issue.
3. Reviewer may correct configuration metadata, request credential rotation, retry delivery, replay inbound receipt where allowed, supersede external ID mapping, disable integration, route to source module, or create compensation/rollback reference.
4. Review outcome is audited.

## Open Questions

- Which workflows are synchronous versus asynchronous?
- Which integrations require pre-production sandbox validation?
- Which external actions require human approval?
- Which retry failures are auto-retried versus review-required?
- Which provider responses can be stored directly versus referenced/redacted?
- Which circuit-breaker states block outbound delivery or source-module workflows?
