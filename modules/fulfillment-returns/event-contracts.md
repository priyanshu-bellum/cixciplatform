# Fulfillment and Returns Event Contracts

This document is a reusable, proposal-level template for event-driven contracts emitted or consumed by Fulfillment and Returns.

## Event Name

Placeholder examples:

- `fulfillment.shipment-line.evidence.recorded`
- `fulfillment.shipment-line.duplicate-row.blocked`
- `fulfillment.partial-shipment.evidence.recorded`
- `return.line-disposition.evidence.recorded`
- `return.line-disposition.duplicate-row.blocked`
- `return.partial-disposition.evidence.recorded`
- `return.quantity-reconciliation.failed`
- `return.vendor-export.stale-authorization.blocked`
- `return.vendor-export.eligibility.review-required`

## Event Purpose

Describe why the event exists and which downstream consumers need it.

Examples:

- Preserve per-line shipment evidence from a vendor fulfillment import row.
- Block duplicate shipment rows without silently overwriting prior line evidence.
- Preserve partial shipment package/line evidence.
- Preserve per-line return operational disposition and quantity reconciliation.
- Block stale/closed/superseded return authorization before vendor export.
- Provide invoice/reporting/AI consumers with line-level operational evidence without giving Fulfillment financial authority.

## Event Producer

Fulfillment and Returns.

## Event Consumers

Proposal-level consumers may include:

- Order Routing for handoff disposition visibility only.
- Integration Management for buyer update transport references and external receipt/delivery correlation.
- Notification Platform Service for notification-triggering references.
- Logs & Audit for immutable audit/file/import/export evidence.
- Pricing for vendor refund/adjustment evidence references.
- Invoice Management for shipment line delivered evidence, return line disposition evidence, and financial-adjacent evidence references.
- Analytics for reporting inputs.
- AI Agent Services for risk, review, and correction signals.
- Warranty support workflows for replacement or return execution evidence.

## Trigger Conditions

Document the condition that emits the event.

Examples:

- Shipment Line Evidence is recorded from an applied import/API/manual row.
- Duplicate fulfillment row is blocked for Suborder + SKU/UPC without split shipment support.
- Partial shipment evidence is recorded with package/shipment line distinction.
- Return Line Disposition Evidence is recorded from an applied return import/API/manual row.
- Duplicate RAN + SKU/UPC return row is blocked.
- Partial return disposition evidence is recorded.
- Return quantity reconciliation fails.
- Stale, closed, superseded, unauthorized, or mismatched return authorization blocks export eligibility.

## Common Payload Schema

```json
{
  "eventId": "evt_placeholder",
  "eventType": "fulfillment.shipment-line.evidence.recorded",
  "eventVersion": "v1",
  "occurredAt": "2026-01-01T00:00:00Z",
  "publishedAt": "2026-01-01T00:00:05Z",
  "producer": "fulfillment-returns",
  "tenantScopeRef": "tenant_scope_placeholder",
  "vendorRef": "vendor_placeholder",
  "buyerEntityRef": "buyer_entity_placeholder",
  "parentOrderRef": "parent_order_placeholder",
  "routedSuborderRef": "routed_suborder_placeholder",
  "routedSuborderLineRef": "routed_suborder_line_placeholder",
  "routingSnapshotRef": "routing_snapshot_placeholder",
  "correlationId": "correlation_placeholder",
  "idempotencyKey": "idempotency_placeholder",
  "redactionClass": "tenant-scoped-operational",
  "auditRef": "audit_placeholder"
}
```

## Family-Specific Payload Fields

### Shipment Line Evidence

```json
{
  "shipmentLineEvidenceRef": "shipment_line_evidence_placeholder",
  "fulfillmentHandoffDispositionRef": "handoff_disposition_placeholder",
  "fulfillmentImportJobRef": "import_job_placeholder",
  "sourceImportRowRef": "row_placeholder",
  "sourceExportBatchItemRef": "order_routing_export_item_placeholder",
  "shipmentRef": "shipment_placeholder",
  "packageId": "package_placeholder",
  "shipmentLineId": "shipment_line_placeholder",
  "skuText": "SKU-001",
  "upcText": "000123456789",
  "expectedQuantity": 2,
  "shippedQuantity": 2,
  "deliveredQuantity": 0,
  "trackingRef": "tracking_placeholder",
  "duplicatePreventionKey": "dedupe_placeholder",
  "appliedVsIgnoredState": "applied",
  "lineLevelDisposition": "applied",
  "conflictReviewState": null,
  "supersessionRef": null
}
```

### Return Line Disposition Evidence

```json
{
  "returnLineDispositionEvidenceRef": "return_line_disposition_placeholder",
  "returnRef": "return_placeholder",
  "sourceReturnRequestRef": "return_request_placeholder",
  "sourceReturnExportBatchItemRef": "return_export_item_placeholder",
  "returnImportJobRef": "return_import_job_placeholder",
  "sourceImportRowRef": "row_placeholder",
  "ranRef": "ran_placeholder",
  "returnLineRef": "return_line_placeholder",
  "skuText": "SKU-001",
  "upcText": "000123456789",
  "expectedReturnQuantity": 2,
  "receivedQuantity": 2,
  "acceptedQuantity": 1,
  "rejectedQuantity": 1,
  "partiallyAcceptedQuantity": 0,
  "vendorOperationalDisposition": "partially-accepted",
  "quantityReconciliationStatus": "balanced",
  "vendorRefundAdjustmentEvidenceRef": "vendor_refund_evidence_placeholder",
  "appliedVsIgnoredState": "applied",
  "conflictReviewState": null,
  "supersessionRef": null
}
```

### Return Export Eligibility Evidence

```json
{
  "returnExportEligibilityRef": "return_export_eligibility_placeholder",
  "sourceReturnRequestRef": "return_request_placeholder",
  "returnLifecycleState": "Return Requested",
  "returnLineRefs": ["return_line_placeholder"],
  "ranRef": "ran_placeholder",
  "returnAuthorizationRanSourceVersion": "ran_v1",
  "returnAuthorizationFreshness": "fresh",
  "staleAuthorizationState": false,
  "closedReturnState": false,
  "supersededReturnState": false,
  "exportBlockedReviewReason": null
}
```

## Required Fields

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `publishedAt`
- `producer`
- `tenantScopeRef`
- `correlationId`
- `idempotencyKey`
- `redactionClass`
- `auditRef`

Additional required fields depend on event family:

- Shipment line events require shipment line evidence, routed suborder, routed suborder line, import row or source evidence, SKU/UPC, quantity, and disposition references.
- Return line disposition events require RAN, return line, source return request, source import row or source evidence, SKU/UPC, quantity, and disposition references.
- Return export eligibility events require source return request, RAN/version/freshness, return lifecycle state, and export blocked/review reason where applicable.
- Buyer update-ready events require shipment or return references plus target buyer/entity scope.

## Optional Fields

- `sourceExportBatchRef`
- `sourceExportBatchItemRef`
- `returnExportBatchRef`
- `returnExportBatchItemRef`
- `fulfillmentImportJobRef`
- `returnImportJobRef`
- `sourceImportRowRef`
- `orderLineRefs`
- `returnLineRefs`
- `productCatalogRefs`
- `deviceRefs`
- `pricingSnapshotRef`
- `trackingRef`
- `trackingUrlValidationStatus`
- `shipmentStatus`
- `returnStatus`
- `returnConditionEvidenceRef`
- `vendorRefundAdjustmentEvidenceRef`
- `integrationTransportRef`
- `notificationDeliveryRef`
- `logsAuditEvidenceRef`
- `exceptionFamily`
- `reviewQueue`
- `supersessionRef`

## Idempotency Rules

- Events must include stable event ids.
- Mutating operations should include idempotency keys.
- Consumers should dedupe by event id and idempotency key.
- Shipment line evidence should dedupe by tenant, vendor, routed suborder line, source export batch item, import row, package/shipment line id, SKU/UPC, and duplicate prevention key.
- Return line disposition evidence should dedupe by tenant, vendor, RAN, return line, source export batch item, import row, SKU/UPC, and duplicate prevention key.
- Replayed events should preserve original occurrence timestamps and include replay metadata where appropriate.

## Ordering / Sequencing Rules

- Shipment line evidence events should include source timestamp, received timestamp, source version, and sequence metadata where available.
- Return line disposition events should include source timestamp, received timestamp, source version, and sequence metadata where available.
- Consumers should not assume total ordering across unrelated shipments, returns, imports, exports, or tenants.
- Correction events should supersede or amend prior events by reference rather than rewriting history.

## Security / Access Considerations

- Payloads should use references instead of exposing full source records.
- Customer, tracking, pricing, refund-adjacent, return, tenant, vendor, and warranty-sensitive fields should be redacted by consumer class.
- Price values and refund amounts should not be included unless a future consumer contract explicitly authorizes them.
- Tenant isolation must be enforced for all event consumers.

## Audit / Logging Requirements

Events should preserve:

- Producer.
- Actor or system actor.
- Source operation.
- Import/export job reference where applicable.
- Row count summary where applicable.
- Correlation id.
- Idempotency key.
- Tenant scope.
- Timestamp.
- Audit reference.

Logs & Audit owns immutable audit/file evidence. Fulfillment and Returns owns operational event emission and workflow references.

## Open Questions

- Which events require full tracking references versus redacted tracking references?
- Which events are notification triggers versus integration transport triggers?
- Which events must be retained for invoice/reconciliation, warranty, return, dispute, or audit review?
- Which consumers require synchronous event handling?

## Vendor Fulfillment Response SLA — Event Contract Shape (PR-A)

PR-A introduces architecture-level event contracts for the 17 SLA-related events listed in `events.md`. These contracts describe the **shape** of event payloads, the **redaction discipline**, the **idempotency / replay / failure-handling expectations at architecture level**, and the **consumer responsibilities**. PR-A does not finalize OpenAPI schemas, broker mechanics, or runtime transport semantics; those are deferred to the Boundary/Handoff PR for cross-module events and to a future Fulfillment / Returns contracts-PR (analogous to Device Catalog PR-C) for intra-module events.

### Reference-first payload discipline

Per the established convention (Device Catalog PR-C, Order Routing PR-A), all PR-A event payloads are **reference-first**. Events carry references to the affected entities — not embedded snapshots of entity content. Consumers resolve references at read time as needed.

Required payload fields (every PR-A event):

- `eventId` — unique platform-assigned identifier for the event. Stable.
- `eventType` — canonical event name (e.g., `fulfillment-returns.sla-evaluation.evaluated`).
- `eventVersion` — schema version of the payload. PR-A baseline is `v1`. Future schema changes increment versioning at architecture level; runtime versioning behavior is implementation territory.
- `occurredAt` — wall-clock timestamp at which the underlying state transition occurred.
- `redaction_class` — one of `internal`, `tenant_scoped`, `buyer_scoped` (see below).
- `audit_reference` — Logs & Audit reference produced at the state transition.

Per-family entity references vary; the complete set follows below by family.

### Redaction class enumeration

PR-A's events carry data of varying sensitivity. Each event declares its `redaction_class`:

- `internal` — visible to CIXCI-internal consumers only. Used for events whose payloads carry CIXCI-platform metadata without tenant- or buyer-specific data.
- `tenant_scoped` — visible to tenant-scoped consumers (vendor-tenant context). Most PR-A events are `tenant_scoped` because they reference vendor-specific suborders and Exceptions.
- `buyer_scoped` — visible to buyer-scoped consumers. **No PR-A event is `buyer_scoped`**, because PR-A does not introduce buyer-portfolio data.

**Per-family redaction class:**

| Family | Default redaction class |
|---|---|
| SLA Policy lifecycle (4 events) | `tenant_scoped` |
| SLA Evaluation lifecycle (3 events) | `tenant_scoped` |
| Late Exception lifecycle (3 events) | `tenant_scoped` |
| Missing Exception lifecycle (3 events) | `tenant_scoped` |
| Partial Exception lifecycle (3 events) | `tenant_scoped` |
| SLA Breach Signal (1 event) | `tenant_scoped` |

SLA Policy lifecycle events may, depending on implementation, carry CIXCI-internal Policy management metadata that is not tenant-specific. Where that is the case, individual emissions may downgrade to `internal`. The default is `tenant_scoped` because the Policy is per-vendor and the lifecycle is operationally relevant to tenant-scoped consumers.

### Per-family payload reference shape

#### SLA Policy lifecycle

```
{
  eventId, eventType, eventVersion, occurredAt, redaction_class, audit_reference,
  sla_policy_reference (sla_policy_id + sla_policy_version),
  vendor_reference,
  route_reference (optional),
  prior_state, new_state
}
```

The `updated`, `superseded`, and `retired` events carry `prior_state` and `new_state` of the Policy lifecycle. The `created` event carries `new_state = draft` or `new_state = active` depending on the creation mode.

#### SLA Evaluation lifecycle

```
{
  eventId, eventType, eventVersion, occurredAt, redaction_class, audit_reference,
  sla_evaluation_reference,
  suborder_reference,
  vendor_export_delivery_evidence_reference (the source Order Routing record),
  sla_policy_version_reference,
  outcome,
  outcome_history_reference (optional; reference to the appended history entry)
}
```

The `created` event carries `outcome = pending` and `expected_fulfillment_response_deadline` (the deadline is a key downstream consumer datum; carrying it on the `created` event is permitted). The `evaluated` event carries the terminal outcome. The `excused` event carries no new outcome (outcome is preserved from prior evaluation) but indicates the Evaluation Record lifecycle transitioned to `evaluation_excused`.

#### Late / Missing / Partial Exception lifecycles

```
{
  eventId, eventType, eventVersion, occurredAt, redaction_class, audit_reference,
  exception_reference (the Late, Missing, or Partial Exception ID),
  sla_evaluation_reference,
  suborder_reference,
  prior_state, new_state
}
```

The `.created` events carry `new_state = open`. The `.resolved` events carry `new_state = resolved` and `prior_state = under_review`. The `.overridden` events carry `new_state = overridden`, `prior_state = under_review`, and an `sla_override_excuse_evidence_reference` (the Override Evidence record that excused the breach).

#### SLA Breach Signal

```
{
  eventId, eventType, eventVersion, occurredAt, redaction_class, audit_reference,
  exception_reference,
  exception_kind (one of: late_fulfillment_import, missing_fulfillment_import, partial_fulfillment_response),
  sla_evaluation_reference,
  suborder_reference,
  vendor_reference
}
```

The `exception_kind` field allows consumers to filter by kind without resolving the full Exception entity. **The Signal does not duplicate the Exception's content** — it identifies the Exception by reference. Consumers needing detail resolve the Exception entity directly.

### `consumer_action_hint` — not introduced

Per Order Routing PR-A precedent: **PR-A does not introduce a `consumer_action_hint` field on its events.** PR-A's events are state-change events (and one signal event); they are not consumer commands. Consumer responsibilities are described per-family below; consumers determine action based on subscribed events and entity reads, not on per-event action hints.

### Idempotency / replay / failure-handling — architecture-level only

PR-A captures the following architecture-level expectations without specifying transport mechanics:

- **Idempotency at consumption.** Consumers of PR-A events (downstream Cross-Module PR, future Notification Platform Service routing, future Analytics / Reporting) must treat duplicate event deliveries as idempotent at the consumer level. PR-A does not specify the idempotency key construction or storage; consumers may use `eventId` plus subscription state.
- **Replay tolerance.** Consumers should tolerate replay of historical events without producing duplicate operational outcomes (e.g., a replayed Late Exception `.created` event should not produce a duplicate notification). Implementation deferred.
- **Failure handling at consumer.** PR-A does not specify consumer retry or dead-letter mechanics. Those are consumer-side concerns; PR-A produces events with the contract shape above and provides no recovery semantics beyond audit references.
- **Ordering guarantees.** PR-A does not assert ordering guarantees on emitted events. Consumers should not rely on receiving `created` before `evaluated` for the same Evaluation Record without their own ordering logic, although in practice the producer raises in causal order.

These architecture-level expectations remain architecture-level. Concrete idempotency / replay / ordering contracts for cross-module flows are the Boundary/Handoff PR's territory.

### Consumer responsibilities

PR-A consumers (future Cross-Module Summary Email PR, future Notification Platform Service routing, future Analytics / Reporting, any other downstream consumer):

- **Treat all PR-A events as authoritative state-change notifications** of Fulfillment / Returns internal state. PR-A is the producer; consumers do not return signals to Fulfillment / Returns under any path.
- **Do not mutate Fulfillment / Returns state from consumer side.** All consumer state changes (e.g., summary email aggregation, notification delivery, analytics rollup) are consumer-side; they do not call back into Fulfillment / Returns to change SLA state.
- **Resolve references on read.** Reference-first payloads require consumers to read the referenced Fulfillment / Returns entities for full content. PR-A does not embed entity content in events.
- **Handle redaction class.** Consumers must respect the declared `redaction_class` for each event; `internal` events must not be exposed to tenant or buyer surfaces.
- **Reconcile multiple events per suborder.** A suborder may produce multiple Exception events (Late + Partial) and multiple Evaluation lifecycle events; consumers must correlate by `sla_evaluation_reference` and `suborder_reference`.

### What PR-A does NOT define in event contracts

- **Does not finalize OpenAPI / JSON schema for event payloads.** Architecture-level reference-first shape only.
- **Does not specify broker / queue mechanics, partition keys, retention, or fan-out topology.**
- **Does not specify event transport for cross-module events.** Specifically: the contract for `order-routing.export-delivery-evidence.confirmed` being consumed by Fulfillment / Returns Workflow 2 is **the Boundary/Handoff PR's territory.** PR-A states the consumption boundary; the explicit cross-module event contract — payload, idempotency, replay, ordering, behavior for non-`confirmed` Delivery Evidence — is deferred.
- **Does not introduce a `consumer_action_hint` field** (per Order Routing PR-A precedent).
- **Does not introduce buyer-facing or vendor-facing event payloads.**
- **Does not contract Notification Platform Service event delivery format.**
- **Does not contract Analytics / Reporting aggregation event format.**

## Cross-Module Handoff Event Contract Notes (Boundary/Handoff PR)

This section adds **contract notes** on existing events. It introduces **zero new event names** on either the Order Routing or the Fulfillment / Returns side. The handoff is contracted around:

- `order-routing.export-delivery-evidence.confirmed` (PR #91, producer-emitted, consumer-side notes here)
- `order-routing.export-delivery-evidence.failed` (PR #91, producer-emitted, consumer-side notes here)
- `fulfillment-returns.sla-evaluation.created` (PR #92, consumer-emitted, contract note here)

The producer-side notes for the Order Routing events live in `modules/order-routing/event-contracts.md`. The notes here are the **consumer-side** counterparts.

### Why zero new events

Adding a separate handoff lifecycle event family (such as a hypothetical handoff consumed event, replay-acknowledged event, and so on) would duplicate the seam already expressed by the existing events. PR #92's `fulfillment-returns.sla-evaluation.created` already signals successful handoff (Handoff Record reached `consumed` state and an SLA Evaluation Record was created). Handoff observability for `consumption_skipped` / `consumption_held` / `consumption_failed` states is achieved via direct Handoff Record lookup (future API Governance Foundation PR) and via audit references in Logs & Audit, not via dedicated lifecycle events.

If a future PR determines that handoff-lifecycle events are needed (for example, for Cross-Module Summary Email PR aggregation), that PR may add them additively. This Boundary/Handoff PR does not.

### Consumer-side contract - `order-routing.export-delivery-evidence.confirmed`

When Fulfillment / Returns consumes `order-routing.export-delivery-evidence.confirmed`:

- **Idempotency obligation.** The consumer derives a Handoff Idempotency Key from the event's `vendor_export_delivery_evidence_reference` plus the consumer scope discriminator (`fulfillment-returns.sla-evaluation` in Phase 1) and uses the key to detect duplicate observation. Workflow A (Handoff Receipt) Steps 1-5 specify the exact lookup behavior.

- **At-least-once tolerance.** The consumer tolerates duplicate event delivery. Duplicate observation of the same source event produces at most one Cross-Module Handoff Record and at most one bound SLA Evaluation Record.

- **Replay-safe.** Replayed source events resolve to existing Handoff Records and produce `replay_acknowledged` audit references on the existing record. The canonical state (notably `consumed`) is not replaced by replay. Re-evaluation of eligibility on replay is **not** performed; the original eligibility decision is honored.

- **Eligibility-checked.** The consumer evaluates Fulfillment SLA Handoff Eligibility (`boundary-contracts.md` Eligibility subsection) at the moment of Handoff Record creation. Ineligible source evidence produces a `consumption_skipped` Handoff Record; eligible source evidence produces a `consumed` record and a bound SLA Evaluation Record.

- **Read-only consumption.** The consumer does not mutate Order Routing state. The Handoff Record carries `source_evidence_snapshot_reference` - a reference, not a copy.

- **Acceptance-implication discipline.** The consumer treats `delivery_confirmation_state = confirmed` as a transport-layer fact only, per PR #91. The Handoff Record and downstream SLA Evaluation Record do not assert vendor operational acceptance.

- **Payload field references the consumer relies upon (from PR #91):**
  - `vendor_export_delivery_evidence_reference` - required, stable post-emission, used in idempotency key derivation.
  - `vendor_reference` - required for eligibility condition E3 (vendor-in-scope) evaluation.
  - `vendor_export_window_reference` - required for downstream SLA Evaluation Record context (PR #92).
  - `export_delivered_timestamp` - required for downstream SLA Evaluation Record's Expected Fulfillment Response Deadline computation (PR #92).
  - `delivery_method_reference` - referenced read-only; not used in SLA evaluation directly but recorded on the Handoff Record's audit reference for traceability.
  - `eventVersion` - consumer reads `v1`-shaped events. Stability commitment is on the producer side.

- **What consumption does NOT imply.**
  - Does not imply vendor acknowledged the export.
  - Does not imply vendor opened the export.
  - Does not imply vendor processed the export.
  - Does not imply vendor accepted operational responsibility.
  - Does not imply fulfillment execution was accepted.
  - Email delivered != email opened. SFTP push confirmed != file consumed. Manual download != operational acceptance. API push confirmed != vendor system processed.

### Consumer-side contract - `order-routing.export-delivery-evidence.failed`

When Fulfillment / Returns consumes `order-routing.export-delivery-evidence.failed`:

- The consumer invokes Workflow B (Non-Confirmed Delivery Evidence Handling).
- The resulting Handoff Record transitions to `consumption_skipped` with audit reason `source_failed`.
- **No SLA Evaluation Record is created.**
- The consumer does not treat `failed` source evidence as a vendor SLA breach. SLA evaluation requires source `confirmed` state. PR #92's Missing Fulfillment Import Exception is created from elapsed Expected Deadlines, which require a `consumed` Handoff Record and bound SLA Evaluation Record to exist; without those, no SLA Exception is created from failed source evidence.

### Consumer-side contract - source state `partial` and `unconfirmable`

For source Delivery Evidence in `partial` or `unconfirmable` state (PR #91 may or may not publish dedicated events for these states; observation via reference lookup is also a path):

- **Source `partial`:** Workflow B handles. Handoff Record transitions to `consumption_held`. No SLA Evaluation Record. Phase 1 does not start SLA clocks from partial delivery.
- **Source `unconfirmable`:** Workflow B handles. Handoff Record transitions to `consumption_skipped` with audit reason `source_unconfirmable`. No SLA Evaluation Record.

### Emitter-side contract - `fulfillment-returns.sla-evaluation.created` (PR #92)

When Fulfillment / Returns emits `fulfillment-returns.sla-evaluation.created` (per PR #92):

- The event is emitted only after a Cross-Module Handoff Record reaches `consumed` state. Workflow A Step 10 specifies the transition.
- The event payload carries the existing PR #92 references (SLA Evaluation Record reference, SLA Policy reference, suborder reference, source Vendor Export Delivery Evidence reference). PR #92's payload shape is unchanged.
- **Optional Handoff Record back-reference.** The event payload may carry `cross_module_handoff_record_reference` so that downstream consumers (Cross-Module Summary Email PR, future Analytics) can correlate SLA Evaluation Records to their originating Handoff Records. Whether this reference is added to the event payload, or accessed via lookup from the SLA Evaluation Record's existing references, is implementation detail. The architecture commitment is that the linkage is **observable**, not that it lives in the event payload.
- The event continues to follow PR #92's `eventVersion = v1`. No version bump.
- Redaction class remains `tenant_scoped` per PR #92.

### Order Routing event contract notes (cross-reference)

The producer-side commitments for `order-routing.export-delivery-evidence.confirmed` and `.failed` (eventVersion stability, payload reference stability post-emission, at-least-once delivery semantics from the producer's perspective) are documented in `modules/order-routing/event-contracts.md` under "Cross-Module Handoff Event Contract Notes (Boundary/Handoff PR)." The consumer-side contract here relies on those producer-side commitments.

### What this PR does NOT change

- No new events on either side.
- No `eventVersion` bumps. Existing v1 events remain v1.
- No redaction class changes.
- No payload schema modifications. Optional Handoff Record back-reference on PR #92's `fulfillment-returns.sla-evaluation.created` is described as observable linkage, not a required payload schema change.
- No broker / queue mechanics specified.
- No retry policy tuning specified.
- No bounded replay window duration specified.
- No OpenAPI schemas introduced.

<!-- BOUNDARY/HANDOFF PR APPEND ANCHOR -->
## Delivery Date and Buyer Update Event Contracts (PR-B)

This section documents the architecture-level event contract shape for the 13 additive event names introduced by PR-B. Contract notes are at proposal level; concrete payload schemas, OpenAPI definitions, and broker-level mechanics are deferred to future API Governance Foundation and broker-implementation work.

### Reference-first payload discipline

PR-B events follow the reference-first payload pattern established by PR #91 and PR #92. Event payloads carry stable identifiers to the relevant Fulfillment / Returns entities; they do not embed source content, vendor payloads, buyer payloads, or Integration Management transport data.

Common payload fields across PR-B event families (proposal-level):

- `eventId` - unique event identifier.
- `eventType` - the event name (one of the 13 PR-B event names).
- `eventVersion` - schema version; PR-B introduces all 13 event names at v1 baseline.
- `occurredAt` - the event timestamp.
- `tenant_company_reference` - the Tenant Company / buyer scope context.
- `redaction_class` - one of `internal`, `tenant_scoped`, `buyer_scoped` (see Redaction class section below).
- `audit_reference` - Logs & Audit retention reference for the originating state transition.

Family-specific payload references (in addition to the common fields):

- Delivery Date Evidence events carry `delivery_date_evidence_reference`, `shipment_line_reference`, `source_reference_type`, `source_reference`, and (for `rejected` events) `validation_result` to disambiguate the rejection state.
- Delivered Shipment Evidence event carries `shipment_line_reference`, `delivered_shipment_evidence_reference` (the source Delivery Date Evidence), and `delivered_at_timestamp`.
- Delivery Date Correction Evidence events carry `delivery_date_correction_evidence_reference`, `prior_delivery_date_evidence_reference`, `actor_reference`, `authority_reference`, and (for `rejected` events) the specific failure mode reference.
- Buyer Update-Ready Signal events carry `buyer_update_ready_reference`, `update_kind`, `parent_order_reference`, `buyer_integration_profile_reference`, and (per lifecycle state) the relevant suppression / hold state reference, dispatch reference, acknowledgement reference, or failure reference.

### Redaction class

PR-B uses three redaction classes:

- **`internal`** - CIXCI-internal events with no tenant or buyer payload exposure. PR-B uses this class for events where the payload contains only CIXCI-side state references (e.g., audit timestamps, internal identifiers).
- **`tenant_scoped`** - events that carry tenant-scoped identifiers (vendor-side context, Tenant Company-bound references). Delivery Date Evidence lifecycle events, Delivered Shipment Evidence events, and Delivery Date Correction Evidence lifecycle events are typically `tenant_scoped` because the underlying data is vendor-fulfillment-import-derived.
- **`buyer_scoped`** - events that carry buyer-scoped identifiers (buyer-facing context, buyer integration profile references). Buyer Update-Ready Signal lifecycle events are typically `buyer_scoped` because the signal pertains to buyer-update transport.

The `buyer_scoped` redaction class is introduced by PR-B for the Buyer Update-Ready Signal event family. It is additive to the existing redaction-class enumeration; existing event redaction classes from PR #91, PR #92, and any baseline events are unchanged.

Specific redaction-class assignments per event:

- `fulfillment-returns.delivery-date-evidence.created` - `tenant_scoped`
- `fulfillment-returns.delivery-date-evidence.accepted` - `tenant_scoped`
- `fulfillment-returns.delivery-date-evidence.rejected` - `tenant_scoped`
- `fulfillment-returns.shipment-line.delivered` - `tenant_scoped`
- `fulfillment-returns.delivery-date-correction.proposed` - `tenant_scoped`
- `fulfillment-returns.delivery-date-correction.applied` - `tenant_scoped`
- `fulfillment-returns.delivery-date-correction.rejected` - `tenant_scoped`
- `fulfillment-returns.buyer-update-ready.created` - `buyer_scoped`
- `fulfillment-returns.buyer-update-ready.held` - `buyer_scoped`
- `fulfillment-returns.buyer-update-ready.eligible` - `buyer_scoped`
- `fulfillment-returns.buyer-update-ready.dispatched` - `buyer_scoped`
- `fulfillment-returns.buyer-update-ready.acknowledged` - `buyer_scoped`
- `fulfillment-returns.buyer-update-ready.failed` - `buyer_scoped`

### Event versioning

All 13 PR-B event names are introduced at `eventVersion = 1` (or the equivalent baseline version per existing event-contracts.md convention). Future PRs that materially change event payload shape must increment `eventVersion`; PR-B does not anticipate such changes within its scope.

Additive payload changes (new optional fields) follow the established versioning rule from PR #92: minor payload additions may retain the same version where the existing-contract section explicitly permits; otherwise, version increment is required.

### Idempotency

PR-B events are idempotent at the architectural level:

- Re-emission of an event with the same `eventId` is consumer-deduplicated; the event payload references stable Fulfillment / Returns identifiers, and consumers may safely re-process.
- Delivery Date Evidence in `rejected_duplicate` terminal state is itself an idempotent outcome of a duplicate vendor submission. The `rejected` event is emitted once per Delivery Date Evidence record, even though the underlying source value is a duplicate.
- Buyer Update-Ready Signal transitions are state-machine bound; re-evaluation of a signal in `eligible` state does not re-emit `eligible`. Workflow 9 / Workflow 11 produces an event only when state actually transitions.

Concrete idempotency-key derivation, deduplication windows, and broker-level guarantees are implementation concerns and remain deferred.

### Replay semantics

Replay of PR-B events follows the established Fulfillment / Returns replay convention:

- Events may be replayed to consumers for backfill, recovery, or new consumer onboarding.
- Replay of a Delivery Date Evidence event does not re-run validation; the recorded `validation_result` is the canonical outcome.
- Replay of a Buyer Update-Ready Signal event does not re-trigger Integration Management dispatch; dispatch is bound to the signal's `eligible` transition at original emission time and tracked via `buyer_update_dispatch_reference` thereafter.
- Replay does not modify the originating Fulfillment / Returns entity records. The replay is for consumer observability; the canonical state is in the entity records.

### Failure handling

PR-B contracts at the architectural level; consumer-side failure handling, dead-letter routing, alerting, and operator surfaces are concerns of consuming modules and the broker infrastructure (deferred).

- Producers (Fulfillment / Returns workflows 1-12) emit events as state transitions occur. Producer-side emission failure is recoverable via replay from the canonical entity record.
- Consumers (Integration Management for dispatch handoff; future Cross-Module Summary Email PR for aggregation; future Analytics for read models) handle their own failure modes. PR-B does not specify consumer retry policy.
- The `fulfillment-returns.buyer-update-ready.failed` event specifically marks transport failure (Workflow 12 captures Integration Management's failure reference). It is not a broker-emission-failure event; broker emission failures are infrastructure-level and not modeled as event payloads in PR-B.

### Consumer responsibilities

PR-B identifies two primary downstream consumers at the architectural level. PR-B does not modify these consumers' files; the responsibilities are documented here for boundary clarity:

- **Integration Management** consumes `fulfillment-returns.buyer-update-ready.eligible` to initiate transport. Integration Management produces dispatch / acknowledgement / failure records; Fulfillment / Returns captures references via Workflows 10 and 12. The reverse flow (Integration Management informing Fulfillment / Returns of outcomes) is a contract between the two modules; PR-B documents the Fulfillment / Returns side only.
- **Logs & Audit** consumes all 13 PR-B events for retention. Retention policy is owned by Logs & Audit.

Future consumers anticipated but not implemented in PR-B:

- **Cross-Module Summary Email PR** will consume Buyer Update-Ready Signal lifecycle events and Delivery Date Evidence rejection events for scheduled System Admin Activity Summary Emails. PR-B does not introduce this consumer.
- **Analytics / Reporting** will consume PR-B events for aggregate reporting (held-state counts by reason, correction rates by vendor, dispatch / acknowledgement / failure rates by buyer). PR-B does not introduce Analytics consumers.
- **Notification Platform Service** will consume specific events only if a future PR configures it for buyer-side or operator-side notification delivery. PR-B does not introduce this consumer.

### Contract notes that PR-B does not finalize

- Concrete payload field shapes, types, and validation rules.
- OpenAPI / JSON Schema definitions.
- Broker-level guarantees (at-least-once vs exactly-once, ordering guarantees, partitioning strategy).
- Consumer-side concurrency, idempotency key derivation specifics, deduplication storage.
- Retry tuning, backoff curves, dead-letter routing.
- Operator alert thresholds and dashboards.

These remain deferred to API Governance Foundation, broker implementation, and operator surface PRs.
