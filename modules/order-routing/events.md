# Order Routing Events

This document is proposal-level. It defines the initial event catalog and event modeling notes for Order Routing.

## Event Families

### Routing Evaluation Events

- `order.routing.evaluation.requested`
- `order.routing.evaluation.completed`
- `order.routing.evaluation.blocked`

Evaluation events describe dry-run results and must not imply route execution, suborder creation, fulfillment handoff, vendor export generation, or warranty registration delivery.

### Routing Lifecycle Events

- `order.routing.execution.requested`
- `order.routing.completed`
- `order.routing.partially_completed`
- `order.routing.failed`
- `order.routing.cancelled_placeholder`

### Policy / Rule Events

- `order.routing.policy.version.activated`
- `order.routing.policy.version.retired`
- `order.routing.rule.conflict.created`

These events describe Order Routing-owned policy metadata only. They must not change Product Type definitions, Pricing rules, Tenant Company eligibility, Fulfillment behavior, or vendor export delivery behavior.

### Snapshot Events

- `order.routing.snapshot.created`
- `order.routing.snapshot.superseded`

### Suborder Events

- `order.suborder.created`
- `order.suborder.updated`
- `order.suborder.review_required`

### Vendor Routed-Suborder Export Events

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

Vendor export events describe Order Routing-owned export eligibility, batch references, batch item dispositions, content references, split references, re-export requests, manual download workflow references, duplicate prevention, and review states. They must not be interpreted as external delivery, scheduled email delivery, file retention evidence, shipment, tracking, delivery, return, refund, invoice, or payment state.

### Fulfillment Handoff Events

- `order.routing.fulfillment-handoff.requested`
- `order.routing.fulfillment-handoff.duplicate-blocked`
- `order.routing.fulfillment-handoff.disposition-reference-recorded`

Fulfillment handoff events describe Order Routing-owned handoff requests and Fulfillment/Returns disposition references. `order.routing.fulfillment-handoff.requested` is not proof that Fulfillment/Returns accepted execution. Fulfillment/Returns owns handoff acceptance/disposition, shipment, tracking, delivery, return, refund evidence, and operational fulfillment status.

### Exception / Review Events

- `order.routing.exception.created`
- `order.routing.review_required`
- `order.routing.retry_scheduled`
- `order.routing.retry_exhausted`
- `order.routing.manual_override_requested`
- `order.routing.manual_override.approved_placeholder`
- `order.routing.manual_override.rejected_placeholder`

### Warranty Signal Events

- `warranty.registration.required`

Order Routing may emit or carry this signal only as a registration requirement signal for routed order lines. It must not own warranty claim lifecycle, vendor warranty registration delivery, or vendor warranty systems.

### AI Agent Services Signals

- Routing failure signal.
- Split-order complexity signal.
- Vendor routing exception signal.
- Vendor export eligibility conflict signal.
- Vendor export duplicate risk signal.
- Vendor export re-export review signal.
- Fulfillment handoff duplicate risk signal.
- Fulfillment disposition rejected/ignored signal.
- Warranty registration risk signal.
- Manual review signal.
- Routing policy conflict signal.
- Downstream target unavailable signal.
- Fulfillment handoff risk signal.
- Repeated retry failure signal.

## Required Event Fields

Proposal-level common fields:

- Event id.
- Event type.
- Event version.
- Occurred at.
- Producer: Order Routing.
- Tenant scope reference.
- Parent order reference.
- Routed order reference where available.
- Order line references where applicable.
- Vendor suborder references where applicable.
- Routing snapshot reference where applicable.
- Routing policy version where applicable.
- Routing rule version where applicable.
- Routing input hash where applicable.
- Routing exception family where applicable.
- Routing exception reference where applicable.
- Supersession reference where applicable.
- Manual override flag where applicable.
- Correlation id.
- Causation id.
- Redaction class.

## Snapshot Event Required Fields

`order.routing.snapshot.created` and `order.routing.snapshot.superseded` should include or reference:

- Routing snapshot reference.
- Routing input hash.
- Routing Policy Version.
- Routing Rule Version.
- Source input versions.
- Price snapshot reference.
- Tenant scope reference.
- Product/device references.
- Selected route.
- Decision timestamp.
- Manual override flag.
- Supersession reference where applicable.
- Downstream target references.

## Vendor Export Event Required Fields

Vendor export events should include or reference:

- Vendor order export eligibility record where applicable.
- Routed suborder export batch reference where applicable.
- Vendor order export batch item reference where applicable.
- Vendor order export content reference where applicable.
- Vendor reference.
- Buyer/retailer reference where split-by-buyer applies.
- Export schema version.
- Export window.
- Export inclusion rule version.
- Export split-by-buyer flag.
- Buyer/retailer split reference.
- Re-export request reference where applicable.
- Export status reference.
- Manual download reference where applicable.
- Fulfillment handoff request reference where applicable.
- Fulfillment/Returns disposition reference where applicable.
- Included/excluded status where applicable.
- Included/excluded reason where applicable.
- Prior export membership reference where applicable.
- Duplicate prevention key where applicable.
- Source event/version where applicable.
- Routing snapshot references.
- Audit reference.

Vendor export events should use references and redacted summaries by default. Logs & Audit owns immutable file/download evidence. Integration Management owns external delivery/receipt evidence. Notification Platform Service owns scheduled email delivery.

## Handoff Event Required Fields

Fulfillment handoff events should include or reference:

- Fulfillment handoff request id.
- Routed suborder reference.
- Export batch item reference.
- Routing snapshot reference.
- Handoff requested timestamp.
- Handoff source version.
- Handoff idempotency key.
- Fulfillment/Returns disposition reference where applicable.
- Fulfillment/Returns source version where applicable.
- Accepted/rejected/ignored state where applicable.
- Applied vs ignored state where applicable.
- Duplicate handoff blocker where applicable.
- Review-required state.
- Audit reference.

## Exception Family Event Notes

- Data exception events should identify malformed or missing source references without copying full source data.
- Eligibility/scope exception events should reference Tenant Company scope signals and review queues.
- Pricing snapshot exception events should reference Pricing snapshot state without exposing full price details.
- Target availability exception events should identify unavailable vendor/manufacturer/fulfillment target references.
- Vendor export eligibility exception events should identify ambiguous eligibility, duplicate batch membership, stale supersession state, missing routing snapshot, or conflicting vendor assignment.
- Vendor export batch item exception events should identify duplicate prevention conflicts, partial re-export conflicts, stale source event/version, or prior export membership issues.
- Fulfillment handoff exception events should identify duplicate handoff blockers, missing/stale disposition references, rejected/ignored disposition, or applied-vs-ignored conflicts.
- Unsupported Product Type exception events should identify Product Type reference and policy gap.
- Warranty registration exception events should identify missing/invalid registration requirement references without owning claim lifecycle.
- Downstream handoff exception events should identify handoff placeholder and downstream target reference.
- Manual review exception events should identify review queue, priority, and approval requirement.

## Consumer Notes

- Fulfillment/Returns may consume routed order, suborder, vendor export, and handoff events but owns execution state, handoff disposition, and vendor fulfillment updates.
- Invoice Management may consume routing snapshots and suborder references as evidence but owns invoice lifecycle.
- Warranty support consumers may consume warranty registration required signals but own delivery or claim behavior elsewhere.
- Logs & Audit may consume routing and vendor export events for centralized audit, file/export/download evidence, or retention.
- Integration Management may consume vendor export references for external delivery/receipt evidence and transport retries.
- Notification Platform Service may consume vendor export references for scheduled email delivery, but owns delivery history.
- AI Agent Services may consume failure, export eligibility conflict, duplicate risk, handoff disposition, complexity, exception, warranty risk, policy conflict, and manual review signals.
- Analytics may consume routing and vendor export events but owns reporting definitions and rollups.

## Redaction Classes

- Public reference only.
- Tenant-scoped operational summary.
- Pricing-sensitive reference only.
- Vendor-sensitive routing summary.
- Vendor export reference only.
- Fulfillment handoff reference only.
- Customer-sensitive redacted.
- Warranty-sensitive redacted.
- Policy-sensitive redacted.
- Audit-only full reference set.

## Replay / Ordering Notes

- Routing snapshot events should be replayable without mutating historical snapshots.
- Supersession events should point to prior and new snapshot references.
- Suborder created events should preserve parent order linkage and routed suborder dedupe key.
- Vendor export events should be idempotent by eligibility record, export batch reference, export batch item reference, re-export request reference, or manual download reference where applicable.
- Handoff events should be idempotent by fulfillment handoff request id and handoff idempotency key.
- Retry and review events may arrive after initial routing failure and must not be interpreted as fulfillment state.
- Consumers should use routing snapshot, export batch item, and handoff request references for reconstruction rather than assuming event payloads contain complete state.
- Replay windows should be explicit by consumer class to prevent accidental reprocessing of stale routing decisions, stale export instructions, or duplicate handoff requests.

## Open Questions

- Which routing events are required by Fulfillment, Invoice Management, Warranty support, Logs & Audit, Analytics, Integration Management, Notification Platform Service, and AI Agent Services?
- Which vendor export events should trigger Notification delivery versus Integration delivery versus audit-only retention?
- Which Fulfillment/Returns disposition references should be emitted back to Order Routing consumers?
- Which events require exactly-once consumer behavior versus idempotent replay?
- Which redaction class applies to each consumer?
- Should routing failure events block downstream workflows or only trigger review queues?
- Which policy/rule events are internal-only?

## Vendor Export Schedule and Delivery Evidence — Additive Event Names (PR-A)

PR-A introduces 12 additive event names for the Order Routing scheduling and delivery evidence surface. These names cover four event families: Schedule lifecycle, Window lifecycle, Delivery Evidence, and Operational Review.

All names follow the `order-routing.<entity>.<verb-past-tense>` convention, consistent with the existing Order Routing event naming style.

Legacy Order Routing event names are preserved unchanged. PR-A is strictly additive at the event surface — no rename, no replacement, no consolidation.

PR-A does **not** introduce:

- SLA-related events. SLA evaluation is Fulfillment / Returns PR-A territory; SLA-related event names will land there.
- Late/missing fulfillment exception events. Same.
- Shipment, tracking, delivery-of-physical-goods, return, or buyer-visible events.
- Integration Management transport-layer events.
- Notification Platform delivery events.
- Re-export workflow events (existing re-export controls have their own event surface if any; PR-A does not modify it).

### Schedule lifecycle (4 events)

- `order-routing.export-schedule.created`
- `order-routing.export-schedule.updated`
- `order-routing.export-schedule.paused`
- `order-routing.export-schedule.retired`

Each Schedule lifecycle event signals a transition in Vendor Export Schedule state per `data-model.md` and Workflow 1 in `workflows.md`. Payload shape is reference-first per `event-contracts.md`. Resumption from pause is represented by `order-routing.export-schedule.updated` with the relevant state-change context; PR-A does not introduce a separate `.resumed` event in order to keep the event family small.

### Window lifecycle (3 events)

- `order-routing.export-window.generated`
- `order-routing.export-window.executed`
- `order-routing.export-window.failed`

`order-routing.export-window.generated` is raised when a Schedule materializes a Window (Workflow 2 step 2). `order-routing.export-window.executed` is raised when a Window completes successfully with at least one Export Batch produced (Workflow 2 step 5, `succeeded` outcome). `order-routing.export-window.failed` is raised when a Window does not produce any Export Batch (Workflow 2 step 5, `failed` outcome). The `superseded` transition does not have its own event in PR-A; supersession is captured in Schedule edit / pause / retirement events' audit context.

### Delivery Evidence (3 events)

- `order-routing.export-delivery-evidence.created`
- `order-routing.export-delivery-evidence.confirmed`
- `order-routing.export-delivery-evidence.failed`

`order-routing.export-delivery-evidence.created` is raised when Workflow 3 creates a Delivery Evidence in `pending` state. `order-routing.export-delivery-evidence.confirmed` is raised when a Delivery Evidence transitions to `confirmed` (or `partial` with at least one successful Attempt). `order-routing.export-delivery-evidence.failed` is raised when a Delivery Evidence transitions to `failed` or `unconfirmable`. PR-A intentionally does not raise a separate `.partial` event; partial-success transitions raise `.confirmed` with `delivery_confirmation_state = partial` carried in payload context, so consumers subscribing to delivery confirmation get the partial-success case as well.

### Operational Review (2 events)

- `order-routing.export-review.required`
- `order-routing.export-review.resolved`

`order-routing.export-review.required` is raised when `export_review_required_state` transitions to `review_required` per Workflow 6 (including transitions originating from retry exhaustion, expiration, partial-success anomaly detection, Window failure with anomaly, schedule-level anomaly, or explicit System Admin action). `order-routing.export-review.resolved` is raised when `export_review_required_state` transitions to `resolved`. Transitions to `under_review` do not have their own event in PR-A; the `under_review` state is internal to the resolution workflow.

### Event family summary

```
Schedule lifecycle:      4 events
Window lifecycle:        3 events
Delivery Evidence:       3 events
Operational Review:      2 events
Total:                  12 events
```

12 additive events. Future event additions (Window supersession, Review under-review, partial-success explicit, retry exhaustion explicit, manual download pickup, etc.) may be added in additive follow-up PRs without renaming any PR-A event. PR-A's additive-only discipline means no rename pressure for future expansion.

### Legacy preservation

Order Routing has existing event families per Codex's readiness review (routing decision events, suborder lifecycle events, export batch events, handoff events). PR-A's 12 new events are additive only — they do not rename, replace, consolidate, or modify any existing event name or event family.

PR-A also explicitly does not introduce events for:

- Manufacturer placeholder lifecycle (existing or future, unrelated to PR-A scope).
- Routing snapshot lifecycle (existing, unrelated).
- Buyer/retailer split execution (Window execution events cover the parent flow; split-specific events are unnecessary at PR-A scope).
- Manual Download pickup (covered by Delivery Evidence confirmation event; specific pickup event deferred).

### Event-contract reference

Event payload shape, redaction class, idempotency / replay expectations, and consumer responsibilities are defined in `event-contracts.md` PR-A section. Each of the 12 PR-A event names has the same shape: reference-first payload, internal-by-default redaction class, eventVersion v1 baseline.
