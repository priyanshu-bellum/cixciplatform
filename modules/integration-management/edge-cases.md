# Integration Management / External System Connections Edge Cases

This document is proposal-level architecture. It lists edge cases and risks without finalizing behavior.

## Source-Of-Truth Edge Cases

- External system returns status that conflicts with CIXCI source module state.
- Provider callback says an order/shipment/invoice is complete but owning source module has not accepted it.
- External project/task tool task is treated as onboarding or tenant readiness authority.
- Accounting system status conflicts with Invoice Management status.
- Storage provider path/object is treated as Media Asset ID.
- Notification provider delivery status is treated as CIXCI notification history authority.
- Shipping provider status conflicts with Fulfillment/Returns state.
- Warranty system status conflicts with warranty support boundaries.

## Credential Edge Cases

- Credential reference exists but secret storage reference is missing.
- Credential is expired, revoked, or rotated externally.
- Secret value appears in logs, events, notification payload, export, AI prompt, or external task.
- Credential permission scope is broader than integration scope.
- Production credential is used in sandbox or sandbox credential is used in production.

## External ID Mapping Edge Cases

- Same external object id maps to multiple internal records.
- Same internal record maps to multiple external object ids unexpectedly.
- External ID conflict crosses tenant/company/entity boundary.
- External ID mapping is stale but still used for delivery.
- External ID mapping is suspended but dependent workflow proceeds.
- External object version changes without mapping verification.
- Source record version changes after mapping verification.
- External ID mapping is corrected after downstream delivery.
- External system reuses an identifier.
- Environment-specific mappings are confused between sandbox and production.

## Inbound Webhook Edge Cases

- Signature verification fails.
- Provider sends duplicate callback with same provider event id.
- Provider sends replayed callback outside replay window.
- Provider sends stale event after newer event was processed.
- Provider sends out-of-order callback without usable sequence/cursor.
- Provider timestamp is missing or unreliable.
- Payload redaction class is missing.
- Receipt cannot be routed to a source module.
- Source module rejects webhook disposition.
- Integration Management treats inbound receipt as business truth instead of evidence.

## Webhook / API Delivery Edge Cases

- Webhook delivery succeeds but consumer response is ambiguous.
- Webhook delivery fails after source module event is already emitted.
- Webhook retry creates duplicate external action.
- Provider returns stale callback or duplicate callback.
- Idempotency key is missing or reused incorrectly.
- Retry budget is exhausted.
- Failed work enters dead-letter/quarantine but source module is not notified.
- Provider rate limit blocks delivery.
- Circuit breaker opens while queue still has pending work.
- Source module event meaning changes after delivery.

## External Action Edge Cases

- AI agent requests external action without approved action contract.
- External action succeeds but source module rejects resulting state change.
- External action fails after external provider partially applies it.
- External action provider-completed status is mistaken for source-module-accepted state.
- External action response contains sensitive payload.
- Compensation/rollback is required but missing.
- Superseded external action is retried accidentally.
- External task update changes external project state but CIXCI source module remains unchanged.
- Reviewer approves action outside tenant scope.

## Provider Outage / Scalability Edge Cases

- Provider outage affects many tenants at once.
- Integration degraded state is not propagated to review queues.
- Circuit breaker half-open probe succeeds for one tenant but fails for another.
- Retry storm overwhelms provider after outage recovery.
- Queue partitioning leaks work across tenant/provider/integration boundaries.
- Bulk status pagination omits failed records.
- Manual review queue priority is missing during widespread outage.
- Replay window expires before source module consumes receipt.

## Vendor / Buyer / Manufacturer Edge Cases

- Vendor API is unavailable during order export.
- Vendor shipping import has malformed external identifiers.
- Buyer product export succeeds but storefront rejects image URLs.
- Device manufacturer import uses duplicate model identifiers.
- Warranty registration system accepts registration but returns no confirmation id.
- Manual CSV/SFTP placeholder produces duplicate file delivery.

## Health / Status Edge Cases

- Health check passes but next delivery fails.
- Health check fails due to provider outage outside CIXCI control.
- Integration disabled while retry queue still has pending deliveries.
- Last successful transmission is stale.
- Last failure is resolved but review state remains open.

## Boundary Edge Cases

- Integration Management starts deciding product validation behavior.
- Integration Management starts rerouting orders after vendor delivery failure.
- Integration Management changes invoice state based on QuickBooks response.
- Integration Management treats media storage paths as durable product references.
- Integration Management becomes the notification provider delivery owner instead of tracking configuration/health only where appropriate.
- Integration Management stores Logs & Audit evidence instead of audit references.
- Integration Management starts acting as Payment, Accounting, Vendor Operational Interface, or Analytics owner.

## Open Questions

- Which edge cases should block integration enablement?
- Which conflicts should route to source modules versus Integration Management review?
- Which provider failures should trigger automatic retry?
- Which failures require notification hooks?
- Which external action outcomes require source-module reconciliation?
- Which stale inbound webhook receipts can be replayed safely?
