# Fulfillment and Returns Events

This document is proposal-level architecture. It defines an event catalog and event modeling guidance for Fulfillment and Returns.

## Event Principles

- Events preserve upstream references rather than copying full source records.
- Events are scoped by tenant, buyer/entity, vendor, parent order, routed suborder, routed suborder line, shipment, return, return line, and import/export workflow where applicable.
- Events must not expose unnecessary pricing, customer, warranty, tracking, vendor, tenant, or return-sensitive details.
- Events may trigger Notification Platform Service workflows but do not own notification delivery.
- Events may provide evidence to Invoice Management but must not create invoice/refund/credit/adjustment behavior.
- Events may provide signals to Analytics and AI Agent Services, but those consumers own reporting definitions and AI recommendations respectively.
- Events should carry source version, source timestamp, received timestamp, idempotency key, redaction class, and audit reference where applicable.
- Events should expose conflict/hold/review state rather than flattening unresolved operational ambiguity.

## Event Families

### Handoff Disposition Events

- `fulfillment.handoff.disposition.recorded`
- `fulfillment.handoff.accepted`
- `fulfillment.handoff.rejected`
- `fulfillment.handoff.ignored`
- `fulfillment.handoff.duplicate-blocked`
- `fulfillment.handoff.review-required`

Purpose: record Fulfillment/Returns disposition for Order Routing handoff requests. A requested handoff is not accepted execution until this disposition exists.

### Vendor Fulfillment Import Events

- `fulfillment.vendor-import.uploaded`
- `fulfillment.vendor-import.header-validation.failed`
- `fulfillment.vendor-import.validated`
- `fulfillment.vendor-import.validation.failed`
- `fulfillment.vendor-import.preview-ready`
- `fulfillment.vendor-import.confirmed`
- `fulfillment.vendor-import.applied`
- `fulfillment.vendor-import.failed`
- `fulfillment.vendor-import.error-report.created`
- `fulfillment.vendor-import.locked-field.blocked`
- `fulfillment.vendor-import.blank-field.blocked`

Purpose: expose vendor fulfillment import lifecycle while preserving source-module validation and Logs & Audit file evidence boundaries.

### Shipment Line Evidence Events

- `fulfillment.shipment-line.evidence.recorded`
- `fulfillment.shipment-line.duplicate-row.blocked`
- `fulfillment.shipment-line.conflict.detected`
- `fulfillment.shipment-line.superseded`
- `fulfillment.partial-shipment.evidence.recorded`

Purpose: expose per-line/package shipment evidence so partial shipments, duplicate import rows, and line-level conflicts do not have to be inferred from summary shipment events.

### Shipment And Tracking Events

- `fulfillment.shipment.created`
- `fulfillment.shipment.evidence.recorded`
- `fulfillment.shipment.status.updated`
- `fulfillment.shipment.partially-shipped`
- `fulfillment.shipment.shipped`
- `fulfillment.shipment.delivered`
- `fulfillment.shipment.exception`
- `fulfillment.shipment.cancelled`
- `fulfillment.tracking.validated`
- `fulfillment.tracking.validation.failed`
- `fulfillment.tracking-url.reference.created`
- `fulfillment.tracking-url.review-required`
- `fulfillment.status.stale-update.detected`
- `fulfillment.status.duplicate-update.detected`
- `fulfillment.status.out-of-order-update.detected`

Purpose: track shipment and delivery operational state while preserving immutable evidence and conflict handling.

### Buyer Shipment Update Events

- `fulfillment.shipment-update.ready-for-buyer-transport`
- `fulfillment.shipment-update.transport-failed-reference.recorded`

Purpose: indicate that shipment evidence is ready for buyer system transport. Integration Management owns actual transport evidence and retries.

### Vendor Return Export Events

- `return.vendor-export.eligibility.created`
- `return.vendor-export.batch.created`
- `return.vendor-export.batch-item.included`
- `return.vendor-export.batch-item.excluded`
- `return.vendor-export.split-reference.created`
- `return.vendor-export.re-export.requested`
- `return.vendor-export.re-export.blocked`
- `return.vendor-export.manual-download-reference.recorded`
- `return.vendor-export.stale-authorization.blocked`
- `return.vendor-export.eligibility.review-required`

Purpose: track operational return export workflow/content references without owning file evidence or delivery. Stale, closed, superseded, unauthorized, or mismatched returns should be blocked or routed to review before export.

### Vendor Return Import Events

- `return.vendor-import.uploaded`
- `return.vendor-import.header-validation.failed`
- `return.vendor-import.validated`
- `return.vendor-import.validation.failed`
- `return.vendor-import.preview-ready`
- `return.vendor-import.confirmed`
- `return.vendor-import.applied`
- `return.vendor-import.failed`
- `return.vendor-import.error-report.created`
- `return.vendor-import.locked-field.blocked`
- `return.ran.validation.failed`
- `return.matching.validation.failed`
- `return.chronology.validation.failed`
- `return.status.stale-update.detected`
- `return.status.duplicate-update.detected`
- `return.status.out-of-order-update.detected`

Purpose: expose return import lifecycle and validation failures for RAN, source export batch/item, SKU/UPC, quantity, chronology, and condition handling.

### Return Line Disposition Events

- `return.line-disposition.evidence.recorded`
- `return.line-disposition.duplicate-row.blocked`
- `return.partial-disposition.evidence.recorded`
- `return.quantity-reconciliation.failed`
- `return.line-disposition.superseded`

Purpose: expose per-return-line operational disposition and quantity reconciliation so partial returns are not flattened into summary return status.

### Return Operational Disposition Events

- `return.operational-disposition.recorded`
- `return.received-by-vendor.recorded`
- `return.operationally-accepted`
- `return.operationally-rejected`
- `return.partially-accepted`
- `return.condition.recorded`
- `return.vendor-refund-evidence.recorded`
- `return.disposition.review-required`

Purpose: record operational return disposition without deciding refund, payment, credit, invoice adjustment, or financial finality.

### Buyer Return Update Events

- `return.update.ready-for-buyer-transport`
- `return.update.transport-failed-reference.recorded`

Purpose: indicate that return evidence is ready for buyer system transport. Integration Management owns transport evidence and retries.

### Replacement Events

- `return.replacement.request-received`
- `return.replacement.signal-validated`
- `return.replacement.signal-expired`
- `return.replacement.duplicate-blocked`
- `return.replacement.shipment.created`
- `return.replacement.shipment.updated`
- `return.replacement.delivered`
- `return.replacement.superseded`
- `return.replacement.terminal-state-reached`
- `return.replacement.exception.created`

Purpose: track approved replacement execution without deciding warranty eligibility or claim approval.

### Exception And AI-Ready Signal Events

- `fulfillment.exception.created`
- `fulfillment.exception.review-required`
- `fulfillment.exception.retry-scheduled`
- `fulfillment.exception.resolved`
- `fulfillment.exception.dead-lettered`
- `fulfillment.signal.missing-tracking`
- `fulfillment.signal.repeated-vendor-failure`
- `fulfillment.signal.return-mismatch-risk`
- `fulfillment.signal.manual-review-backlog-risk`
- `fulfillment.signal.import-pattern-risk`

Purpose: expose operational review and AI-ready signals without giving AI mutation authority.

## Required Event Fields

Proposal-level required fields:

- Event id.
- Event type.
- Event version.
- Occurred at timestamp.
- Published at timestamp.
- Producer: Fulfillment and Returns.
- Tenant scope reference.
- Vendor reference where applicable.
- Buyer/entity reference where applicable.
- Parent order reference where applicable.
- Routed suborder reference where applicable.
- Routed suborder line reference where applicable.
- Routing snapshot reference where applicable.
- Handoff request/disposition reference where applicable.
- Fulfillment execution reference where applicable.
- Fulfillment import job reference where applicable.
- Source import row reference where applicable.
- Source export batch/item reference where applicable.
- Shipment reference where applicable.
- Shipment line evidence reference where applicable.
- Tracking reference where applicable.
- Return reference/RAN reference where applicable.
- Return line reference where applicable.
- Return line disposition evidence reference where applicable.
- Return export/import job reference where applicable.
- Product Type reference where applicable.
- Product Catalog or Device Reference where applicable.
- Pricing snapshot reference where applicable.
- Source system.
- Source version.
- Source timestamp.
- Received timestamp.
- Correlation id.
- Idempotency key.
- Redaction class.
- Audit reference.

## Optional Event Fields

- Return authorization/RAN source version.
- Return authorization freshness.
- Return lifecycle state.
- Expected quantity.
- Shipped quantity.
- Delivered quantity.
- Expected return quantity.
- Received quantity.
- Accepted quantity.
- Rejected quantity.
- Partially accepted quantity.
- Quantity reconciliation status.
- Import schema version.
- Export schema version.
- Row count summary.
- Applied/rejected/skipped/warning counts.
- Error report reference.
- Carrier reference placeholder.
- Tracking URL validation status.
- Return condition.
- Vendor refund/adjustment evidence reference.
- Integration transport reference placeholder.
- Notification delivery reference placeholder.
- Logs & Audit evidence reference placeholder.
- Exception family.
- Review queue.
- Stale/duplicate/out-of-order handling result.
- Supersession reference.

## Consumer-Specific Payload Boundaries

- Order Routing should receive Fulfillment disposition and rejection/review references, not shipment internals that imply rerouting.
- Integration Management should receive buyer-update-ready and source-module disposition references, not source-record mutation authority.
- Notification Platform Service should receive trigger references and redaction class, not source-module export content ownership.
- Logs & Audit should receive audit/file/import/export evidence references and summaries, not source-record mutation authority.
- Pricing should receive vendor refund/adjustment evidence references where authorized, not return execution authority.
- Invoice Management should receive shipment line delivered evidence, return line disposition evidence, and refund/adjustment evidence references, not Fulfillment-owned invoice decisions.
- Analytics should receive operational facts and timestamps, not metric definitions.
- AI Agent Services should receive risk/review signals, not state-change authority.

## Replay And Ordering

- Events should be replayable by tenant, vendor, parent order, routed suborder, shipment, shipment line evidence, return, return line, import job, and export batch where applicable.
- Shipment and return status events should preserve source timestamp, received timestamp, source version, and idempotency key.
- Consumers should not assume global ordering across unrelated shipments, returns, imports, or tenants.
- Corrections should emit new events or correction references rather than rewriting historical events.
- Stale, duplicate, and out-of-order source updates should be emitted as explicit handling events where they affect current state, review, or audit.

## Failure Handling

- Event publication failures should be retried with idempotent keys.
- Duplicate events should be deduped by event id and idempotency key.
- Poison events should enter review and Logs & Audit tracking once that platform service is applied.
- Fanout to non-critical consumers should not block core operational state changes.

## Open Questions

- Which events are required by Order Routing, Integration Management, Notification, Logs & Audit, Pricing, Invoice Management, Analytics, AI Agent Services, and warranty support?
- Which events are notification triggers versus integration transport triggers?
- Which events require full payloads versus reference-only payloads?
- What event retention window is needed for invoice, dispute, return, warranty, and audit evidence?

## Vendor Fulfillment Response SLA — Additive Event Names (PR-A)

PR-A introduces seventeen additive event names across six families. All names follow the existing Fulfillment / Returns convention `fulfillment-returns.<entity>.<verb-past-tense>`. All events are additive; no existing event name is renamed, retired, or otherwise affected. Per-event payload contracts are described at architecture level in `event-contracts.md`.

These events emit on Fulfillment / Returns-internal state transitions. **No PR-A event is consumed by Order Routing.** Order Routing's PR #91 events (Schedule lifecycle, Window lifecycle, Delivery Evidence, Operational Review) are unchanged; PR-A consumes `order-routing.export-delivery-evidence.confirmed` read-only as documented in `workflows.md` Workflow 2 and `boundary-contracts.md`.

### SLA Policy lifecycle (4 events)

- `fulfillment-returns.sla-policy.created`
- `fulfillment-returns.sla-policy.updated`
- `fulfillment-returns.sla-policy.superseded`
- `fulfillment-returns.sla-policy.retired`

Each SLA Policy lifecycle event signals a transition in Vendor Fulfillment Response SLA Policy state per `data-model.md` and Workflow 1 in `workflows.md`. Payload shape is reference-first per `event-contracts.md`. An edit to an active Policy raises `fulfillment-returns.sla-policy.updated` for the new version and `fulfillment-returns.sla-policy.superseded` for the prior version.

### SLA Evaluation lifecycle (3 events)

- `fulfillment-returns.sla-evaluation.created`
- `fulfillment-returns.sla-evaluation.evaluated`
- `fulfillment-returns.sla-evaluation.excused`

`fulfillment-returns.sla-evaluation.created` raises when Workflow 2 produces a new SLA Evaluation Record on consumption of a confirmed Vendor Export Delivery Evidence. `fulfillment-returns.sla-evaluation.evaluated` raises when the Evaluation Record reaches its terminal outcome (`on_time`, `late`, `missing`). `fulfillment-returns.sla-evaluation.excused` raises when the Evaluation Record lifecycle transitions to `evaluation_excused` (all Exceptions overridden).

The interim `partial` outcome does not raise a separate Evaluation lifecycle event; the Partial Exception lifecycle event (below) signals the partial-response fact.

### Late Fulfillment Import Exception lifecycle (3 events)

- `fulfillment-returns.late-fulfillment-import-exception.created`
- `fulfillment-returns.late-fulfillment-import-exception.resolved`
- `fulfillment-returns.late-fulfillment-import-exception.overridden`

Raised on Workflow 6 (Exception creation), Workflow 9 (terminal `resolved` state), and Workflow 10 (terminal `overridden` state). Transition to `closed` (operational closure without resolution or override) does not raise a separate event in PR-A; the audit trail captures the closure. Transitions between non-terminal states (`open → under_review`) do not raise dedicated PR-A events.

### Missing Fulfillment Import Exception lifecycle (3 events)

- `fulfillment-returns.missing-fulfillment-import-exception.created`
- `fulfillment-returns.missing-fulfillment-import-exception.resolved`
- `fulfillment-returns.missing-fulfillment-import-exception.overridden`

Same shape as Late. `fulfillment-returns.missing-fulfillment-import-exception.created` raises on Workflow 7 (time-driven detection of elapsed deadline with no import). If a late import subsequently arrives and the Missing Exception closes with `late_import_arrived` audit, the closure is captured in audit; PR-A does not raise a separate Missing-closure event (the corresponding Late Exception's `.created` event is the signal of the new state).

### Partial Fulfillment Response Exception lifecycle (3 events)

- `fulfillment-returns.partial-fulfillment-response-exception.created`
- `fulfillment-returns.partial-fulfillment-response-exception.resolved`
- `fulfillment-returns.partial-fulfillment-response-exception.overridden`

Same shape. Raised on Workflow 8 (Exception creation), Workflow 9 (terminal `resolved`), and Workflow 10 (terminal `overridden`).

### SLA Breach Signal (1 event)

- `fulfillment-returns.sla-breach.signaled`

Raised when an Exception (Late, Missing, or Partial) is created. The signal is **one-way**; consumers are downstream (future Cross-Module Summary Email PR for aggregation, future Notification Platform Service routing for delivery). PR-A names the signal at architecture level and contracts the shape at architecture level in `event-contracts.md`. PR-A does not specify event transport semantics, idempotency, replay, ordering, or recipient resolution — those are Boundary/Handoff PR and Cross-Module Summary Email PR territory.

A single SLA Breach Signal references its source Exception (Late, Missing, or Partial); consumers determine the kind from the Exception reference.

### Event family totals

- SLA Policy lifecycle: 4
- SLA Evaluation lifecycle: 3
- Late Exception lifecycle: 3
- Missing Exception lifecycle: 3
- Partial Exception lifecycle: 3
- SLA Breach Signal: 1

**Total: 17 additive events.**

### Naming convention preserved

All 17 PR-A event names follow `fulfillment-returns.<entity>.<verb-past-tense>` consistent with existing Fulfillment / Returns event naming. If existing Fulfillment / Returns events use a slightly different separator (e.g., dot vs hyphen within the entity portion), the bundle reviewer should confirm alignment; the proposed names use the family/entity name with hyphens within the entity portion (matching Order Routing PR #91 precedent, e.g., `order-routing.export-delivery-evidence.confirmed`).

### What PR-A does NOT add to events.md

- **Does not introduce SLA-related events that PR-A does not own:** no buyer-update events, no delivery-date events, no invoice/refund/payment events, no pricing events, no notification-delivery events, no analytics-summary events, no event for transitions deferred to future PRs.
- **Does not introduce Order Routing events.** Order Routing PR #91's 12 events remain Order-Routing-owned; PR-A consumes one (`order-routing.export-delivery-evidence.confirmed`) read-only without redefining it.
- **Does not modify, rename, or retire any existing Fulfillment / Returns event.** Existing event family for fulfillment imports, shipment lines, tracking, returns, replacement shipments, buyer update-ready signals is preserved verbatim.
- **Does not introduce a generic SLA-Exception event.** The three Exception types (Late, Missing, Partial) have distinct events per PR-A's three-entity decision.
- **Does not introduce an SLA Policy `activated` / `deactivated` / `paused` event.** The Policy lifecycle in PR-A is `draft → active → superseded → retired` with `updated` capturing edits; Phase 1 does not support `paused`.
- **Does not introduce a separate event for Exception transitions to `under_review` or `closed` (non-terminal or operational closure).** Audit trail captures these; consumers requiring richer Exception-state visibility do so via reads, not by additional event subscriptions in PR-A.
- **Does not introduce a separate event for `partial` interim outcome on SLA Evaluation Record.** The corresponding Partial Exception event signals the partial-response fact.
- **Does not introduce per-line-level events.** Exception entities reference suborder lines via fields; per-line state changes are not separate events in PR-A.
- **Does not introduce vendor-facing or buyer-facing events.** PR-A's events are internal-platform events; vendor / buyer notification routing is Notification Platform Service territory.
## Delivery Date and Buyer Update - Additive Event Names (PR-B)

PR-B introduces exactly 13 additive event names across four event families. All events follow the established naming convention `fulfillment-returns.<entity>.<verb-past-tense>` from PR #92. Existing event names from PR #91 (12 Order Routing events), PR #92 (17 Fulfillment / Returns SLA events), and PR #93 (zero new events) are not modified.

Event payload contract shape, redaction class, idempotency, and replay semantics for these events are documented in `event-contracts.md`.

### Delivery Date Evidence lifecycle (3 events)

- `fulfillment-returns.delivery-date-evidence.created` - raised when Workflow 1 (Vendor Fulfillment Import Delivery Date Intake) creates a Delivery Date Evidence record in `pending` state.
- `fulfillment-returns.delivery-date-evidence.accepted` - raised when Workflow 2 (Delivery Date Validation) transitions a Delivery Date Evidence record to `accepted` terminal state. Triggers Workflow 3 (Shipment Status Evidence Update).
- `fulfillment-returns.delivery-date-evidence.rejected` - raised when Workflow 2 transitions a Delivery Date Evidence record to one of the rejection terminal states (`rejected_invalid_format`, `rejected_before_shipped`, `rejected_before_order_creation`, `rejected_before_tracking_evidence`, `rejected_stale`, `rejected_duplicate`, `rejected_regression_without_authority`). The specific rejection state is carried in the event payload via the `validation_result` field reference; no separate event name per rejection sub-state.

### Delivered Shipment Evidence (1 event)

- `fulfillment-returns.shipment-line.delivered` - raised when Workflow 3 transitions an existing Shipment Line to Delivered state via accepted Delivery Date Evidence. The event marks the atomic transition of `delivered_shipment_evidence_reference` and `delivered_at_timestamp` field population. This event is additive; PR-B introduces it specifically to mark the delivered-state transition tied to the new Delivery Date Evidence chain. Existing baseline Shipment Status transition events (if any) remain owned by the baseline; PR-B does not modify them.

### Delivery Date Correction Evidence lifecycle (3 events)

- `fulfillment-returns.delivery-date-correction.proposed` - raised when Workflow 6 step 1 creates a Delivery Date Correction Evidence record in `proposed` state.
- `fulfillment-returns.delivery-date-correction.applied` - raised when Workflow 6 step 5 transitions a Delivery Date Correction Evidence record to `applied` terminal state. The application produces a new Delivery Date Evidence in `accepted` state and supersedes the prior. May trigger Workflow 8 to produce a correction-kind Buyer Update-Ready Signal.
- `fulfillment-returns.delivery-date-correction.rejected` - raised when Workflow 6 transitions a Delivery Date Correction Evidence record to `rejected` terminal state. The specific failure code (`DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED`, `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING`, or a content-validation failure) is carried in the event payload via the failure-mode field reference; no separate event name per failure mode.

### Buyer Update-Ready Signal lifecycle (6 events)

- `fulfillment-returns.buyer-update-ready.created` - raised when Workflow 7 or Workflow 8 creates a Buyer Update-Ready Signal record in `pending` state. The `update_kind` discriminator (`shipment`, `delivery`, `correction`) is carried in the event payload; no separate event name per kind.
- `fulfillment-returns.buyer-update-ready.held` - raised when Workflow 9 (Buyer Update Eligibility Evaluation) transitions a Buyer Update-Ready Signal record to a `held` state. The specific hold reason (`held_awaiting_all_vendors_shipped`, `held_awaiting_all_vendors_delivered`, `held_buyer_integration_paused`, `held_correction_under_review`, `held_tenant_scope_inactive`, `held_manual`) is carried in the event payload via the suppression / hold state field reference; no separate event name per hold reason.
- `fulfillment-returns.buyer-update-ready.eligible` - raised when Workflow 9 or Workflow 11 transitions a Buyer Update-Ready Signal record to `eligible` state. Triggers Workflow 10 (Integration Management Dispatch Handoff).
- `fulfillment-returns.buyer-update-ready.dispatched` - raised when Workflow 10 captures Integration Management's dispatch attempt reference and transitions the signal to `dispatched` state.
- `fulfillment-returns.buyer-update-ready.acknowledged` - raised when Workflow 12 captures Integration Management's acknowledgement reference and transitions the signal to `acknowledged` terminal state.
- `fulfillment-returns.buyer-update-ready.failed` - raised when Workflow 12 captures Integration Management's failure reference and transitions the signal to `failed` terminal state.

### Event inventory summary

Total PR-B additive events: 13.

By family:
- Delivery Date Evidence lifecycle: 3
- Delivered Shipment Evidence: 1
- Delivery Date Correction Evidence lifecycle: 3
- Buyer Update-Ready Signal lifecycle: 6

### Events PR-B explicitly does not introduce

PR-B is scoped to the four event families above. The following event families are explicitly out of scope and must not be introduced by this PR:

- SLA-related events. The 17 PR #92 events remain unmodified; PR-B does not add or modify any SLA Policy, SLA Evaluation Record, Exception, Override Evidence, or SLA Breach Signal events.
- Order Routing events. The 12 PR #91 events remain unmodified; PR-B does not add or modify any export schedule, export window, export delivery evidence, export delivery attempt, or export review events.
- Cross-Module Handoff events. PR #93 introduced zero new events and contracted around existing PR #91 and PR #92 events; PR-B introduces no handoff lifecycle events.
- Scheduled summary email events. These belong to the future Cross-Module Summary Email PR.
- Analytics aggregation events. These belong to future Analytics / Reporting PRs.
- Notification Platform delivery events. These belong to Notification Platform Service.
- Invoice / refund / payment events. Out of PR-B scope.
- Pricing events. Out of PR-B scope.
- Product Catalog or Device Catalog events. Out of PR-B scope.
- Carrier-tracking events. Out of PR-B scope; future carrier integration PR.
- Per-hold-reason event splits (e.g., separate event names for each `held_*` reason). Hold reasons are payload fields, not event-name fragments.
- Per-rejection-state event splits (e.g., separate event names for each `rejected_*` Delivery Date Evidence state). Rejection states are payload fields, not event-name fragments.
- Per-update-kind event splits for Buyer Update-Ready Signal (e.g., separate event names for shipment-update vs delivery-update vs correction-update). The `update_kind` discriminator is a payload field, not an event-name fragment.
