# Order Routing Event Contracts

This document is proposal-level. It defines reusable event interface contracts for Order Routing without finalizing payload schemas or transport.

## Event Names

Placeholder event names include:

- `order.routing.requested`
- `order.routing.completed`
- `order.routing.failed`
- `order.routing.review_required`
- `order.routing.snapshot.created`
- `order.suborder.created`
- `order.routing.exception.created`
- `order.routing.vendor-export.eligibility-created`
- `order.routing.vendor-export.batch-created`
- `order.routing.vendor-export.batch-item.included`
- `order.routing.vendor-export.batch-item.excluded`
- `order.routing.vendor-export.duplicate-blocked`
- `order.routing.vendor-export.generated`
- `order.routing.vendor-export.split-reference.created`
- `order.routing.vendor-export.re-export-requested`
- `order.routing.vendor-export.re-export-approved`
- `order.routing.vendor-export.re-export-blocked`
- `order.routing.vendor-export.manual-download-recorded`
- `order.routing.vendor-export.review-required`
- `order.routing.vendor-export.eligibility-conflict-detected`
- `order.routing.fulfillment-handoff.requested`
- `order.routing.fulfillment-handoff.duplicate-blocked`
- `order.routing.fulfillment-handoff.disposition-reference-recorded`
- `warranty.registration.required`

## Event Purpose

Order Routing events communicate routing lifecycle, routing decisions, suborder creation, immutable routing evidence, vendor routed-suborder export eligibility, export batch item disposition, export content references, buyer/retailer split references, re-export requests, manual download workflow references, fulfillment handoff requests, Fulfillment/Returns disposition references, exception/review states, retry states, and warranty registration requirement signals to authorized consumers.

Vendor export and handoff events communicate Order Routing-owned references only. They do not communicate external delivery success, scheduled email delivery success, file retention evidence, shipment execution, tracking, delivery, return, refund, invoice, or payment state.

## Event Producer

Order Routing is the producer for routing events, vendor export events, routing-to-fulfillment handoff request events, Fulfillment/Returns disposition reference recorded events, and routing-owned warranty registration required signals.

## Event Consumers

Proposal-level consumers:

- Fulfillment / Returns.
- Invoice Management.
- Warranty registration support / vendor integration workflows.
- Integration Management.
- Notification Platform Service.
- Logs & Audit.
- AI Agent Services.
- Analytics.
- Buyer-facing modules where authorized.

## Trigger Conditions

- Routing request received.
- Routing completed or partially completed.
- Routing failed or enters review-required state.
- Routing snapshot created or superseded.
- Vendor suborder or manufacturer suborder placeholder created.
- Vendor routed-suborder export eligibility created.
- Vendor order export batch created or generated.
- Vendor order export batch item included or excluded.
- Duplicate vendor export blocked.
- Vendor order export split by buyer/retailer.
- Vendor order re-export requested, approved, or blocked.
- Vendor manual download reference recorded.
- Vendor order export eligibility conflict detected.
- Routing-to-Fulfillment handoff requested.
- Duplicate fulfillment handoff blocked.
- Fulfillment/Returns disposition reference recorded.
- Routing exception created.
- Retry scheduled or exhausted.
- Warranty registration required signal identified for routed line.

## Payload Schema

Proposal-level payload groups:

- Event metadata.
- Tenant scope reference.
- Parent order reference.
- Routed order reference.
- Order line references.
- Routing snapshot reference.
- Vendor/manufacturer suborder references.
- Pricing snapshot references.
- Product Catalog references.
- Device References where relevant.
- Product Type.
- Vendor order export eligibility reference.
- Routed suborder export batch reference.
- Vendor order export batch item reference.
- Vendor order export content reference.
- Vendor reference.
- Buyer/entity reference.
- Export schema version.
- Export window.
- Export inclusion rule version.
- Export split-by-buyer flag.
- Buyer/retailer split reference.
- Re-export request reference.
- Export status reference.
- Manual download reference.
- Fulfillment handoff request reference.
- Fulfillment/Returns disposition reference.
- Fulfillment/Returns source version.
- Accepted/rejected/ignored state.
- Applied vs ignored state.
- Duplicate handoff blocker.
- Routing exception summary.
- Warranty registration requirement reference where applicable.
- Redaction class.

## Required Fields

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `producer`
- `tenantScopeReference`
- `correlationId`
- `redactionClass`

Routing lifecycle events should also include `parentOrderReference` where available. Vendor export events should include `vendorReference` and one of `vendorOrderExportEligibilityReference`, `routedSuborderExportBatchReference`, `vendorOrderExportBatchItemReference`, `reExportRequestReference`, or `manualDownloadReference` according to event type. Handoff events should include `fulfillmentHandoffRequestReference`.

## Optional Fields

- `parentOrderReference`
- `routedOrderReference`
- `routingSnapshotReference`
- `orderLineReferences`
- `vendorSuborderReferences`
- `manufacturerSuborderReferences`
- `pricingSnapshotReferences`
- `productCatalogReferences`
- `deviceReferences`
- `productType`
- `vendorOrderExportEligibilityReference`
- `routedSuborderExportBatchReference`
- `vendorOrderExportBatchItemReference`
- `vendorOrderExportContentReference`
- `vendorReference`
- `buyerEntityReference`
- `exportSchemaVersion`
- `exportWindow`
- `exportInclusionRuleVersion`
- `includedExcludedStatus`
- `includedExcludedReason`
- `priorExportMembershipReference`
- `duplicatePreventionKey`
- `exportSplitByBuyerFlag`
- `buyerRetailerSplitReference`
- `reExportRequestReference`
- `exportStatusReference`
- `manualDownloadReference`
- `fulfillmentHandoffRequestReference`
- `fulfillmentReturnsDispositionReference`
- `fulfillmentReturnsSourceVersion`
- `acceptedRejectedIgnoredState`
- `appliedVsIgnoredState`
- `duplicateHandoffBlocker`
- `routingExceptionReference`
- `routingExceptionSummary`
- `warrantyRegistrationRequiredReference`
- `decisionSummary`

## Idempotency Rules

- Consumers should treat event id as unique.
- Snapshot-created events should be idempotent by routing snapshot id.
- Suborder-created events should be idempotent by suborder id.
- Vendor export eligibility events should be idempotent by vendor order export eligibility reference.
- Vendor export batch/generated events should be idempotent by routed suborder export batch reference and export schema version.
- Vendor export batch item events should be idempotent by export batch item reference and duplicate prevention key.
- Vendor export re-export events should be idempotent by re-export request reference.
- Vendor manual download events should be idempotent by manual download reference.
- Fulfillment handoff events should be idempotent by fulfillment handoff request reference and handoff idempotency key.
- Fulfillment disposition reference recorded events should be idempotent by handoff request, Fulfillment/Returns disposition reference, and Fulfillment/Returns source version.
- Retry/review events should be idempotent by event id and action id where applicable.

## Ordering / Sequencing Rules

- `order.routing.snapshot.created` should occur after or with routing completion/review state.
- `order.suborder.created` should reference an existing routing snapshot.
- Vendor export eligibility should reference existing vendor suborders and routing snapshots.
- Vendor export batch/generated events should reference eligibility records or routed suborders that were eligible under an export inclusion rule version.
- Vendor export batch item events should reference an export batch and eligibility record.
- Fulfillment handoff events should reference route/suborder/export batch item evidence where available.
- Fulfillment disposition reference events may occur after handoff request events and must not be interpreted as shipment, delivery, or fulfillment completion.
- Retry/review events may occur after failure or review-required events.
- Consumers should not assume all events arrive in order; lookup by reference should be available where state matters.

## Retry / Failure Handling

- Failed event delivery should retry through platform integration mechanisms where available.
- Consumers should handle duplicate events.
- Poison messages should enter dead-letter or manual review handling owned by the integration/event platform, not by downstream business modules.
- External delivery failure for a vendor export is Integration Management evidence unless Order Routing separately records a review-required source-module disposition.
- Scheduled email delivery failure is Notification Platform Service evidence unless Order Routing separately records a review-required source-module disposition.
- Missing, stale, rejected, ignored, or duplicate Fulfillment/Returns disposition references should not be treated as accepted fulfillment execution.

## Versioning Strategy

- Version event names or payload schemas when required fields, redaction behavior, or semantic meaning changes.
- Preserve routing rule version and snapshot schema version inside snapshot references.
- Preserve export schema version, export inclusion rule version, source event/version, and handoff source version inside vendor export and handoff event payloads or references.

## Security / Access Considerations

- Event payloads should use references and redacted summaries by default.
- Pricing, customer, tenant, vendor, export, fulfillment handoff, and warranty details require consumer-specific redaction.
- Vendor export events must not expose other vendors' suborders or unrelated buyer/retailer split data.
- Cross-tenant event leakage must be treated as a critical failure.

## Audit / Logging Requirements

- Event publication should record producer, event id, tenant scope, parent order reference where available, routing snapshot reference where available, vendor export reference where available, fulfillment handoff request reference where available, redaction class, and delivery status.
- Manual override, review, re-export, manual download, duplicate-blocked, and disposition-reference events require actor/approver and reason references where applicable.
- Logs & Audit owns immutable file/export/download evidence, while Order Routing owns routing/export/handoff references.

## Example Event Payload

```json
{
  "eventId": "evt_placeholder",
  "eventType": "order.routing.vendor-export.batch-item.included",
  "eventVersion": "0.1",
  "occurredAt": "2026-04-29T00:00:00Z",
  "producer": "order-routing",
  "tenantScopeReference": "tenant_scope_placeholder",
  "vendorReference": "vendor_placeholder",
  "routedSuborderExportBatchReference": "export_batch_placeholder",
  "vendorOrderExportBatchItemReference": "export_batch_item_placeholder",
  "exportSchemaVersion": "vendor-order-csv-v0.1",
  "exportInclusionRuleVersion": "export-rules-v0.1",
  "correlationId": "correlation_placeholder",
  "redactionClass": "vendor-export-reference-only"
}
```

## Open Questions

- Which consumers require payload expansion versus lookup-by-reference?
- Which routing, vendor export, batch item, and handoff events must be retained for invoice, warranty, audit, delivery, or dispute reconstruction?
- Which event platform owns delivery retries and dead-letter queues?
- Which vendor export events should trigger Integration Management delivery versus Notification Platform Service delivery versus audit-only retention?
- Which Fulfillment/Returns disposition references should Order Routing publish to downstream consumers?

## Vendor Export Schedule and Delivery Evidence — Event Contract Shape (PR-A)

PR-A defines the architecture-level event contract shape used by the 12 additive PR-A event names (per `events.md` PR-A section). The shape is **reference-first** — event payloads carry references to authoritative records, not embedded snapshots of those records' content. Consumers wanting full state read it from Order Routing's read-only API placeholders (per `api-contracts.md` PR-A section).

PR-A is architecture-level. PR-A does **not** finalize:

- OpenAPI schemas for events or for the read-only API surface.
- Broker / queue / topic specifics.
- Wire-level serialization details.
- Concrete retry / replay / idempotency mechanics beyond architecture-level expectations.

These are deferred to a future Order Routing contracts-PR analogous to Device Catalog PR-C, or to Integration Management's transport implementation, as appropriate.

### Reference-first payload discipline

Every PR-A event payload carries:

- Identity for the event itself (`eventId`, `eventType`, `eventVersion`, `occurredAt`).
- References to authoritative records (entity IDs and pointers to Order Routing entities; not copies of those entities' fields).
- A small set of categorical context fields where the consumer's triage benefits (e.g., `state_transition_category`, `change_reason_reference`).
- An audit reference (pointer to the Logs & Audit record produced by the action that raised the event).
- A redaction class.

Event payloads do **not** carry:

- Full Schedule field-by-field snapshots.
- Full Delivery Evidence state snapshots (only references plus categorical context).
- Recipient PII. Recipient references resolve through Tenant Company; consumers re-read recipient identity if and only if their scope permits.
- Raw export content. Export Batches are referenced; their content is not embedded.
- Tenant-specific eligibility data inside global event payloads.
- Buyer / retailer portfolio data inside global event payloads.

### Required common fields (every PR-A event)

| Field | Purpose |
|---|---|
| `eventId` | Globally unique event identifier. |
| `eventType` | The event name (e.g., `order-routing.export-schedule.created`). |
| `eventVersion` | Version of this event's contract. PR-A events start at `v1` or `1` (depending on platform convention). Future contract changes follow platform event versioning rules (PR-A OQ A). |
| `occurredAt` | UTC timestamp of the underlying action. |
| `redaction_class` | One of `internal`, `tenant_scoped`, `buyer_scoped`. Default for PR-A events: `tenant_scoped` (the schedule belongs to a vendor under a tenant). |
| `audit_reference` | Pointer to the immutable Logs & Audit record. |
| `vendor_reference` | The vendor this event relates to. |

### Per-family additional fields

#### Schedule lifecycle events

`order-routing.export-schedule.created`, `.updated`, `.paused`, `.retired`:

- `vendor_export_schedule_reference` (the Schedule).
- `schedule_version` (the version at the time of the event).
- For `.updated`: `change_category` (categorical, e.g., `timing_changed`, `recipient_changed`, `delivery_method_changed`, `split_behavior_changed`, `calendar_reference_changed`). Categorical only; no field-level diff in payload.
- For `.paused`, `.retired`: `reason_reference` (pointer to the reason record; opaque to consumers).

#### Window lifecycle events

`order-routing.export-window.generated`, `.executed`, `.failed`:

- `vendor_export_window_reference` (the Window).
- `vendor_export_schedule_reference` (parent Schedule).
- `vendor_export_schedule_version` (Schedule version at materialization).
- `scheduled_execution_at` (UTC).
- `business_day_classification` (`business_day`, `weekend`, `holiday`, `unknown_no_calendar`).
- For `.executed`: count of Export Batches produced (categorical only — e.g., `zero`, `one`, `multiple`; not exact count, to avoid payload growth and to honor reference-first discipline).
- For `.failed`: `failure_category` (categorical, e.g., `no_eligible_suborders`, `content_generation_error`, `schedule_anomaly`).

#### Delivery Evidence events

`order-routing.export-delivery-evidence.created`, `.confirmed`, `.failed`:

- `vendor_export_delivery_evidence_reference` (the Delivery Evidence).
- `vendor_export_window_reference` (parent Window).
- `export_batch_reference` (the Export Batch this evidence covers).
- `delivery_method_reference` (Integration Management reference).
- For `.confirmed`: `export_delivered_timestamp` (UTC), `delivery_confirmation_state` (`confirmed` or `partial`).
- For `.failed`: `delivery_confirmation_state` (`failed` or `unconfirmable`), `failure_category` (categorical, e.g., `retry_exhausted`, `expiration`, `aborted`).

#### Operational Review events

`order-routing.export-review.required`, `.resolved`:

- `vendor_export_delivery_evidence_reference` (the Delivery Evidence whose `export_review_required_state` transitioned).
- `vendor_export_window_reference` (parent Window).
- For `.required`: `trigger_category` (categorical, e.g., `retry_exhausted`, `expiration`, `partial_success_anomaly`, `window_failed_anomaly`, `schedule_anomaly`, `explicit_admin_action`).
- For `.resolved`: `resolution_category` (categorical, e.g., `resolved_via_re_export`, `resolved_via_audit_evidenced_acceptance`, `resolved_other`), `resolution_audit_reference` (the audit record produced by the resolution action).

### Redaction class enumeration

PR-A uses the redaction class starter set established by Device Catalog PR-C:

- **`internal`** — broadcast across CIXCI infrastructure; no tenant-specific or buyer-specific content. PR-A events do **not** use this class by default; reserved for events that legitimately have no tenant-specific content.
- **`tenant_scoped`** — content includes tenant-specific data (a Schedule belongs to a vendor under a tenant). **Default for all PR-A events.**
- **`buyer_scoped`** — content includes buyer-portfolio data. PR-A events **do not use** `buyer_scoped` because PR-A events do not carry buyer portfolio content. If a future event needs buyer references, it must be `buyer_scoped` and consumers must enforce buyer scope.

PR-A flags redaction-class normalization as an open question for future platform standardization (PR-A OQ B).

### Idempotency expectations (architecture-level)

PR-A events are **consumer-idempotent**. Consumers receiving the same event twice (e.g., due to transport replay) must produce the same downstream state as receiving it once. Order Routing does **not** guarantee single delivery; consumers handle replay.

PR-A does **not**:

- Specify the producer-side deduplication mechanism.
- Specify a deduplication time window.
- Specify whether the broker/transport layer enforces exactly-once vs. at-least-once delivery.

These are Integration Management territory and deferred.

### Replay expectations (architecture-level)

PR-A events may be replayed from Logs & Audit retention for backfill or recovery scenarios. Replayed events carry the same `eventId` as the original; consumers detect replay by `eventId` and handle idempotently per the rule above.

PR-A does **not** specify replay infrastructure, replay UI, or replay authority (Logs & Audit territory).

### Failure-handling expectations (architecture-level)

When event publication fails at the producer side (Order Routing cannot reach the broker), the underlying state transition has still occurred (Schedule was created, Delivery Evidence was confirmed, etc.). Order Routing's audit record reflects the state transition independent of event publication.

Transport-layer event delivery reliability is Integration Management's concern. PR-A does **not** specify producer retry semantics; the underlying state is in Order Routing regardless of event delivery.

When event consumption fails at the consumer side, the consumer is responsible for retry / dead-letter handling per the consumer's own policy. PR-A does **not** specify consumer-side failure handling.

### Consumer responsibilities

PR-A consumers (Fulfillment / Returns SLA evaluation in a future PR, Analytics / Reporting in a future Cross-Module PR, any other downstream consumer):

- Process events idempotently.
- Read referenced entities from Order Routing's read-only API surface (per `api-contracts.md`) when fuller state is needed.
- Respect `redaction_class`. A consumer without tenant scope must not consume `tenant_scoped` events.
- Treat `eventVersion` discipline per consumer's own contract evolution policy.
- Do **not** mutate Order Routing state in response to events. Consumers that need Order Routing state changes (e.g., re-export) invoke Order Routing's existing actions (re-export controls), not direct state mutation.

### Compatibility-impacting signal — not applicable to PR-A

Device Catalog PR-C introduced a "compatibility-impacting review signal" with a `consumer_action_hint` for hinting Product Catalog action priority. PR-A does **not** introduce an analogous hint field for Order Routing events because PR-A events are state-change events with categorical context, not consumer commands. `consumer_action_hint`-style fields are reserved for cross-module signals where the producer has insight the consumer lacks; PR-A's events are factual.

### Naming convention preservation

All 12 PR-A event names follow `order-routing.<entity>.<verb-past-tense>`. This is consistent with existing Order Routing event names per Codex's readiness review. PR-A does not introduce a new naming style.

### What PR-A does NOT contract

- OpenAPI schemas.
- Broker / topic / queue / partition specifics.
- Wire serialization (JSON, Avro, Protocol Buffers, etc.).
- Exact `eventVersion` bump rules (when to v1 → v2 vs. additive field).
- Consumer-side dead-letter policy.
- Cross-event ordering guarantees.
- Producer-side retry / replay infrastructure.

These are deferred to a future Order Routing contracts-PR or to Integration Management's transport implementation.

## Cross-Module Handoff Event Contract Notes (Boundary/Handoff PR)

This section adds **producer-side contract notes** on existing PR #91 events. It introduces **zero new event names**. The consumer-side notes for these same events live in `modules/fulfillment-returns/event-contracts.md`.

The handoff is contracted around three existing events: `order-routing.export-delivery-evidence.confirmed` (PR #91), `order-routing.export-delivery-evidence.failed` (PR #91), and `fulfillment-returns.sla-evaluation.created` (PR #92). All three remain with their existing PR #91 / PR #92 schemas and `eventVersion = v1`. No version bump. No payload schema change.

### Why zero new events

Adding handoff-specific events would duplicate the seam already expressed by these three existing events. PR #92's `fulfillment-returns.sla-evaluation.created` already signals successful handoff (a Cross-Module Handoff Record reached `consumed` state and an SLA Evaluation Record was bound). Handoff observability for `consumption_skipped` / `consumption_held` / `consumption_failed` states is achieved via direct Handoff Record lookup (future API Governance Foundation PR) and via audit references in Logs & Audit. If a future PR determines dedicated handoff-lifecycle events are needed (for example, for Cross-Module Summary Email aggregation), that PR may add them additively. This PR does not.

### Producer-side commitments - `order-routing.export-delivery-evidence.confirmed`

For every Vendor Export Delivery Evidence transitioning to `confirmed`, Order Routing commits to:

- **eventVersion stability.** The event is published as `eventVersion = v1`. Consumers may rely on the v1 schema. No version bump in this PR.
- **At-least-once publication.** The event is emitted when the source record reaches `confirmed`. Transport-layer delivery semantics (which determine whether duplicates may occur) are Integration Management's. From the producer's perspective, the publish is at-least-once; consumers must be idempotent.
- **Payload reference stability post-emission.** The references the event carries are stable for the lifetime of the source record:
  - `vendor_export_delivery_evidence_reference` - required; stable. Consumers derive their Handoff Idempotency Key from this reference (plus their consumer scope discriminator).
  - `vendor_reference` - required; stable.
  - `vendor_export_window_reference` - required; stable.
  - `export_delivered_timestamp` - required; stable.
  - `delivery_method_reference` - required; stable.
- **Idempotency hint for consumers.** Consumers should derive their idempotency key from `vendor_export_delivery_evidence_reference`. This identifier is stable across all replays per PR #91's terminal-once-confirmed invariant.
- **Redaction class.** `tenant_scoped` per PR #91. Unchanged.
- **No retroactive mutation.** PR #91 invariant: once `confirmed`, the source record is terminal. Order Routing does not edit a `confirmed` Delivery Evidence; corrections go through re-export which produces a new record with a new `vendor_export_delivery_evidence_reference`.

### Producer-side commitments - `order-routing.export-delivery-evidence.failed`

Same commitments as `.confirmed` with adapted semantics:

- **eventVersion stability.** `v1`. No bump.
- **At-least-once publication.** Emitted when source reaches `failed`.
- **Payload reference stability post-emission.** References are stable; `export_delivered_timestamp` on `.failed` events carries the latest Attempt timestamp.
- **Idempotency hint.** Same: `vendor_export_delivery_evidence_reference` is the consumer key basis.
- **Redaction class.** `tenant_scoped`.
- **No retroactive mutation.** Same as `.confirmed`.

### Producer-side commitments - non-confirmed source states `partial` and `unconfirmable`

PR #91 publishes `order-routing.export-delivery-evidence.confirmed` for `confirmed` and `.failed` for `failed`. Source states `partial` and `unconfirmable` may not have dedicated published events; observation in those states is via reference lookup against Order Routing's record by consumers. This PR does not introduce dedicated events for `partial` or `unconfirmable` (zero new events commitment); future PR may, additively.

Consumers handling `partial` and `unconfirmable` observation are governed by Workflow B (Non-Confirmed Delivery Evidence Handling) on the Fulfillment / Returns side; see `modules/fulfillment-returns/workflows.md`.

### Cross-reference - Fulfillment / Returns side

The consumer-side contract notes for the events above (consumer idempotency obligation, replay-safe consumption, eligibility-checked Handoff Record creation, no-acceptance-implication discipline) live in `modules/fulfillment-returns/event-contracts.md` under "Cross-Module Handoff Event Contract Notes (Boundary/Handoff PR)." Readers reviewing the handoff event flow should consult both sides.

### Cross-reference - Fulfillment / Returns emitter contract

PR #92's `fulfillment-returns.sla-evaluation.created` is the consumer's emit-side signal of successful handoff (Cross-Module Handoff Record reached `consumed` and SLA Evaluation Record was bound). The producer side (Order Routing) does not consume this event. The emitter contract notes for `fulfillment-returns.sla-evaluation.created` live on the Fulfillment / Returns side.

### What this PR does NOT change about Order Routing events

- No new event names.
- No `eventVersion` bumps.
- No redaction class changes.
- No payload schema modifications.
- No publish-time semantics changes.
- No retry policy specified (Integration Management transport).
- No bounded replay window duration specified.
- No broker / queue mechanics specified.
- No OpenAPI schemas introduced.

<!-- BOUNDARY/HANDOFF PR APPEND ANCHOR -->
