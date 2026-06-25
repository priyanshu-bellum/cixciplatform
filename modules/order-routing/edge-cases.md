# Order Routing Edge Cases

## Parent Order And Decomposition

- Parent order contains lines that belong to multiple vendors.
- Parent order contains accessories, devices, and future branded merchandise in one mixed cart.
- Parent order line is duplicated or missing a line reference.
- Parent order is changed after routing snapshot creation.
- Parent order is cancelled after some suborders are created.

## Tenant Scope

- Tenant Company scope is missing, stale, denied, suspended, or conflicting.
- Parent company is active but child entity is not ready.
- Product Type enablement exists at parent but not child entity scope.
- Licensed-property scope blocks branded merchandise routing.
- Regional eligibility conflicts with vendor/manufacturer assignment.

## Pricing Snapshot

- Pricing snapshot is missing.
- Pricing snapshot is stale, expired, non-order-bindable, rejected, or superseded.
- Split order would require recalculation, which Order Routing must not perform.
- Price snapshot is valid for parent order but not for a specific child/entity or line.
- Pricing exception is active but Pricing has not produced an order-bindable result.

## Product / Device References

- Product Catalog reference is invalid, inactive, stopped, deactivated, or not routable.
- Product Type is unsupported by routing rules.
- Accessory line requires Device Reference but reference is missing or invalid.
- Device Reference is deprecated, redirected, or unresolved.
- Product Catalog warranty product fact indicates registration required but method is missing.

## Vendor / Manufacturer Assignment

- Vendor is unavailable or relationship eligibility is unresolved.
- Multiple vendors match with no precedence rule.
- Manufacturer suborder placeholder exists but procurement ownership is unresolved.
- Vendor suborder creation succeeds for some lines and fails for others.
- Vendor assignment conflicts with fulfillment capability placeholder.

## Fulfillment Handoff

- Fulfillment target is missing or unavailable.
- Routing creates downstream instruction placeholder but Fulfillment rejects it.
- Route is valid but no carrier/warehouse execution path exists, which Fulfillment owns.
- Replacement shipment is requested from warranty flow but Fulfillment/Returns ownership is unresolved.

## Warranty

- Warranty registration required signal is emitted before trigger timing is finalized.
- Warranty registration required signal exists but vendor integration delivery fails later.
- Buyer initiates warranty claim against a routed order line; Order Routing must not approve claim.
- Warranty claim replacement requires Fulfillment/Returns but routing snapshot only provides evidence.

## Manual Review / Retry

- Retry uses stale upstream references.
- Manual override attempts to bypass missing price snapshot.
- Manual override expands tenant scope without Tenant Company signal.
- Manual override changes vendor assignment but does not create new routing snapshot.
- Retry loop creates duplicate suborders without idempotency controls.

## Events And Consumers

- Events arrive out of order.
- `order.suborder.created` arrives before consumer has seen `order.routing.snapshot.created`.
- Analytics consumes partial routing events as final routing state.
- AI Agent Services recommends override that conflicts with boundary rules.
- Event payload leaks sensitive price, customer, vendor, warranty, or tenant data.

## Vendor Export Schedule and Delivery Evidence Edge Cases (PR-A)

Lightweight edge case references for PR-A's six workflows. These supplement (not replace) Order Routing's existing edge cases for routing decisions, export batch production, and handoff requests.

### Schedule configuration edge cases

- **Schedule timezone changes after Windows have been materialized for the prior timezone.** Edit produces a new Schedule version. Already-materialized Windows complete under their materialization version (their `scheduled_execution_at` is anchored in UTC; timezone change does not retroactively shift the UTC time). New Windows materialize per the new timezone.

- **Schedule edit reduces `daily_send_times` count.** The new version's Window generation skips the removed send times for upcoming Windows. Already-materialized Windows for the removed send time remain in `scheduled` state and either execute as scheduled or are superseded per the Schedule edit's audit context (implementation decision; PR-A does not mandate). Conservative default: leave already-materialized Windows in place; new Windows follow new config.

- **Schedule's `business_calendar_reference` is updated to point to a different calendar mid-flight.** Same as above: already-materialized Windows preserve their materialization-version `business_day_classification`; new Windows materialize per the new calendar.

- **Schedule references a vendor that is deactivated in Tenant Company.** Workflow 1 validation fails at edit time. An active Schedule whose vendor is deactivated after activation is a follow-on concern (likely Schedule auto-pause with audit reference). PR-A does not specify auto-pause behavior; it remains an open question (PR-A OQ C).

- **Two System Admins edit the same Schedule concurrently.** Last-write-wins with audit visibility. Both edits produce version increments; the later edit references the prior version. PR-A does not specify optimistic-locking semantics; implementation detail.

- **Schedule is pause-spam-edited (pause / resume / pause / resume rapidly).** Each pause produces audit; each resume produces audit. Windows in `scheduled` state at each pause are superseded. Window generation horizon may produce duplicated Windows if not de-duplicated by execution-time uniqueness. Implementation-level concurrency concern; PR-A's audit trail captures the thrash.

### Window generation edge cases

- **Schedule's daily send time falls during daylight saving time transition (e.g., 2:30 AM on a DST start date).** Window generation must resolve the local-time anchor through the timezone; if the local time does not exist on that date (DST start), the Window is materialized for the next equivalent valid local time per a documented rule. PR-A does not enumerate the rule; treats as implementation detail. Conservative default: skip the missing local time.

- **Schedule with multiple daily send times producing back-to-back Windows.** Each `daily_send_times` entry produces an independent Window. Two Windows scheduled for `14:00` and `18:00` execute independently; their Delivery Evidences are independent.

- **`business_calendar_reference` resolves to a calendar that itself is in a degraded state (calendar source unavailable at materialization time).** Window materialization falls back to `business_day_classification = unknown_no_calendar`. Workflow 2 may optionally trigger Review-Required state on the Window's Delivery Evidence if anomaly detection is configured.

- **Window's `scheduled_execution_at` arrives but the underlying export generation flow (Export Batch production) is in maintenance / paused.** The Window remains in `executing` state until export generation completes or times out. PR-A does not specify timeout semantics for the existing export generation flow; that is existing Order Routing infrastructure.

- **Zero eligible routed suborders at Window execution time.** Window transitions `executing → failed` (no Export Batches produced). May trigger Review-Required state on a placeholder Delivery Evidence if Schedule anomaly detection is enabled (historical volume non-zero, current volume zero).

- **Window superseded mid-execution.** Once a Window has entered `executing` state, it is not eligible for `superseded` transition. Schedule pause / retirement does not interrupt an in-flight Window; pause / retirement applies to Windows in `scheduled` state only.

### Delivery Evidence edge cases

- **Window produced 10 Export Batches due to buyer/retailer split.** Workflow 3 creates 10 Delivery Evidences in `pending` state. Each is independent and resolves per its own Attempt chain.

- **Delivery Evidence is `pending` but Integration Management never reports outcome (Integration Management itself is down).** Delivery Evidence remains in `pending`. Operational concern: Integration Management's own SLA / monitoring should surface the failure. PR-A does not specify a producer-side timeout for `pending`; treats as Integration Management's reliability concern.

- **Integration Management reports an `attempt_outcome` not in the proposal-level enumeration.** Order Routing rejects the outcome at validation. Integration Management is expected to map its native outcomes to the enumerated set; new outcome values require additive enumeration expansion in a follow-on PR.

- **Delivery Evidence transitions to `confirmed` but `export_delivered_timestamp` is null.** Validation failure; transition rejected. `confirmed` requires `export_delivered_timestamp` to be populated.

- **Delivery Evidence transitions to `confirmed` then a later Attempt reports `recipient_bounce` for a different recipient.** The state has terminal-state discipline: once `confirmed`, the Delivery Evidence is not mutated. The bounce produces a new Attempt on the Delivery Evidence, but the parent state remains `confirmed`. If the multi-recipient case warranted `partial`, the original transition should have been to `partial`, not `confirmed`. PR-A's transition rule: terminal state reflects the aggregated outcome at the moment of transition; later contradicting outcomes produce additional Attempts but do not re-transition.

- **Re-export creates a second Delivery Evidence for the same Export Batch.** Permitted. The two Delivery Evidences coexist; the latest is the operationally relevant one. Existing Order Routing re-export semantics govern which is "current."

- **Delivery Evidence references a Recipient that is deactivated in Tenant Company between Schedule materialization and Window execution.** Validation at delivery request time may reject the recipient. Workflow 5 records an `attempt_outcome` indicating recipient invalidity (closest enumeration: `recipient_bounce`). Delivery Evidence may transition to `partial` (if other recipients succeed) or `failed` (if all recipients deactivated).

### Manual Download edge cases

- **Vendor downloads the export but the Integration-Management-owned download-evidence record fails to write.** Operational concern: the download occurred but Attempt creation cannot reference transport evidence. PR-A's `transport_evidence_reference` is required for non-aborted outcomes; the Attempt creation may need to be retried or recorded with a degraded-evidence audit reference. Implementation detail.

- **Vendor downloads the export multiple times before the canonical confirmation Attempt is created.** Race condition. Each download produces an Attempt; the first to be recorded transitions the Delivery Evidence to `confirmed`. Subsequent downloads produce additional Attempts that do not transition. Audit captures all downloads.

- **Manual Download window elapses with the Delivery Evidence in `pending` state, but the Schedule's `manual_download_expiration_window` was recently edited.** Edits to the Schedule do not retroactively rewrite the Delivery Evidence's expiration window. The Delivery Evidence's expiration is anchored to its Window's materialization version Schedule config. Conservative default to prevent edge-case loophole exploitation.

- **System Admin downloads the export on behalf of the vendor (e.g., vendor cannot access portal).** Treated as a Manual Download pickup; produces an Attempt with `attempt_outcome = success` and audit reference indicating the System Admin actor. The Delivery Evidence's `delivery_confirmation_state` reaches `confirmed`. Per existing Order Routing Manual Download authority semantics, the actor type is recorded.

### Retry / failure edge cases

- **Integration Management performs many retries (e.g., 10+ attempts).** Each produces a Delivery Attempt. The parent Delivery Evidence's `attempt_sequence` field on the latest Attempt may reach high integers. No PR-A-defined maximum; Integration Management retry policy bounds it.

- **Retry exhaustion signal arrives but no prior Attempts exist (Integration Management reports exhaustion on first attempt).** Unusual but permitted. The single Attempt is recorded with the final outcome; Delivery Evidence transitions to `failed`.

- **`retry_after_reference` chain is broken (prior Attempt's `retry_after_reference` points to a non-existent Attempt).** Audit anomaly. Workflow 6 may trigger Review-Required if anomaly detection catches the broken chain. PR-A does not specify automatic chain repair.

- **Partial-success Attempt outcomes arrive out of order (later Attempt for a different recipient is recorded first).** Order Routing applies the aggregated outcome at the moment of the latest Attempt: if the aggregate is "at least one success, at least one failure," the parent state is `partial`. Out-of-order Attempt arrival does not re-evaluate the parent state's terminal-ness; once terminal, stays terminal.

### Operational Review-Required edge cases

- **Review-Required state is set on a Delivery Evidence that subsequently transitions its `delivery_confirmation_state` (e.g., a late Attempt success arrives after retry exhaustion was declared).** PR-A's terminal-state discipline: `delivery_confirmation_state` is terminal once reached; the late Attempt is recorded but does not re-transition. `export_review_required_state` is independent of `delivery_confirmation_state`; resolution of Review-Required requires explicit action regardless.

- **Review-Required state bounces (`review_required → resolved → review_required → resolved`...).** Lifecycle thrash. PR-A's reopening preserves full history; thrash is visible in audit. SLA / escalation for thrash is operational policy (PR-A OQ D).

- **System Admin attempts to transition `review_required → resolved` without complete audit evidence.** Validation failure (`REVIEW_RESOLUTION_AUDIT_EVIDENCE_MISSING`). State remains in `review_required` (or `under_review` if already there). The actor's permission to attempt the action is not in question; the issue is incomplete evidence.

- **System Admin transitions Review-Required to `resolved` on the basis that a re-export was performed, but the re-export failed.** Operational concern: the re-export should produce its own Delivery Evidence with its own Review-Required potential. The original Delivery Evidence's `resolved` state is valid (the action of authorizing re-export was the resolution); the re-export's outcome is a separate concern.

- **Two System Admins concurrently transition the same Delivery Evidence's Review-Required state.** Last-write-wins with audit visibility. PR-A does not specify optimistic locking.

### Boundary edge cases

- **Fulfillment / Returns attempts to mutate Vendor Export Delivery Evidence through any path.** Rejected. Fulfillment / Returns has read-only access. PR-A's `api-contracts.md` placeholders are explicitly read-only; no write surface for Fulfillment / Returns.

- **Analytics / Reporting attempts to transition Review-Required state for aggregation purposes.** Rejected. Analytics has read-only access.

- **Integration Management reports an `attempt_outcome` for a Delivery Evidence that does not exist (stale or invalid reference).** Order Routing rejects the outcome. Integration Management is expected to use stable Delivery Evidence references provided at delivery request time.

- **An Order Routing actor attempts to write to Logs & Audit's immutable retention directly.** Rejected. Order Routing produces audit references; Logs & Audit owns retention.

- **A Tenant Company actor attempts to edit a Vendor Export Schedule through Tenant Company's surface.** Tenant Company does not expose Schedule editing. Order Routing's Export Schedule Authority is the only path. The Tenant-Company-side `check_access` is consulted by Order Routing; Tenant Company does not initiate Schedule mutations.

### Event / contract edge cases

- **A consumer receives the same `eventId` twice (replay).** Consumer-side idempotency handles. PR-A's contract specifies consumer-idempotent semantics.

- **A consumer receives a PR-A event with `eventVersion` it does not recognize.** Consumer-side version-handling policy. PR-A does not specify the consumer's behavior; treats as consumer concern. Typical defensive behavior: log and ignore, or log and process with best-effort field tolerance.

- **An event is published but transport fails permanently.** The underlying Order Routing state transition has still occurred; the audit record reflects the transition. Consumers may detect missed events through periodic reconciliation against Order Routing's read-only API surface. PR-A does not specify reconciliation.

- **An event payload includes a `recipient_references` array that resolves to redacted PII for the consuming party (e.g., a consumer without buyer scope).** Consumer-side redaction enforcement. PR-A's `redaction_class = tenant_scoped` is the producer's classification; consumers without scope should not be subscribed to `tenant_scoped` events through Integration Management's broker policy.

### What PR-A does NOT cover

- SLA evaluation edge cases (Fulfillment / Returns PR-A territory).
- Shipment / tracking / delivery-of-physical-goods edge cases (Fulfillment / Returns territory).
- Return state edge cases (Fulfillment / Returns territory).
- Buyer update-ready signal edge cases (Fulfillment / Returns territory).
- Notification Platform email-send edge cases (Notification Platform / Cross-Module PR territory).
- Analytics / Reporting aggregation edge cases (Analytics / Cross-Module PR territory).
- Integration Management transport-protocol edge cases (Integration Management territory).
- Tenant Company recipient identity edge cases (Tenant Company territory).
- Business calendar content edge cases (Tenant Company / future platform standard territory).
- OpenAPI edge cases (deferred).
- Broker / queue infrastructure edge cases (Integration Management / future contracts-PR territory).

## Cross-Module Handoff Publication Edge Cases (Boundary/Handoff PR)

These edge cases concern the producer side of the cross-module handoff from Order Routing's confirmed Vendor Export Delivery Evidence (PR #91) to Fulfillment / Returns' SLA Evaluation Record (PR #92). Consumer-side edge cases are documented in `modules/fulfillment-returns/edge-cases.md`. Producer-side edge cases here focus on publication behavior and the invariants Order Routing commits to under the handoff contract.

### Publication and retention edge cases

- **Publication ordering across distinct source Delivery Evidences.** The publication contract is at-least-once with in-order-best-effort. Within a single source Delivery Evidence's lifecycle, ordering is naturally preserved by PR #91's source state machine (`created -> confirmed` or `created -> failed`; terminal-once-confirmed). Across distinct source Delivery Evidences, transport may reorder. The producer does not buffer or sequence across source records; consumers absorb transport reordering per the Handoff Ordering Rule. Producer-side: no special behavior required.

- **Publication of `.confirmed` for a Delivery Evidence that immediately transitions to `failed` is not possible.** PR #91's source state machine forbids this; Delivery Evidence is terminal once `confirmed`. Producer-side: no edge case to handle; consumer-side replay is the only mechanism by which a stale `failed` could be observed after `confirmed` for the same record, and the Handoff Ordering Rule covers it.

- **Re-export produces a new source Delivery Evidence per PR #91.** A re-exported export does not modify the prior Delivery Evidence; it creates a new one. The new Delivery Evidence has a distinct `vendor_export_delivery_evidence_reference` and therefore a distinct handoff idempotency key. Producer-side: no special publication behavior; the new record's `created -> confirmed` (or `-> failed`) events flow through normal publication.

- **Publication during partial source state.** PR #91 includes `partial` and `unconfirmable` source states. Whether these states produce dedicated `.partial` / `.unconfirmable` events or are observed only via direct record lookup is PR #91's choice. This Boundary/Handoff PR adds no new event names on the Order Routing side. Producer-side: publication behavior unchanged by this PR. Consumer-side mapping of these states to Handoff Record `consumption_held` / `consumption_skipped` is documented in the consumer module.

- **Publication when no consumer is subscribed.** Order Routing publishes at the source; consumer absence does not change producer behavior. Producer-side: no special handling. Transport-layer retention of unconsumed events is Integration Management's policy.

- **Publication when transport is degraded.** Transport mechanics (broker / queue / retry / dead-letter) are Integration Management's. Producer publishes; transport retries or dead-letters per Integration Management policy. Producer-side: no special handling; publication is a single act, and Integration Management transport is responsible for at-least-once delivery semantics.

### Payload reference stability edge cases

- **Stable payload references post-emission.** Order Routing commits to payload reference stability for the consumed fields documented in `event-contracts.md` (specifically: `vendor_export_delivery_evidence_reference`, `vendor_reference`, `vendor_export_window_reference`, `export_delivered_timestamp`, `delivery_method_reference`). Producer-side edge case: if a future PR changes the semantics of any of these references, eventVersion must be bumped (this PR does not bump). Reference stability is the contract.

- **`export_delivered_timestamp` precision.** PR #91 defines this as a timestamp; the contract does not commit to a specific clock source or precision beyond what PR #91 specified. Producer-side: timestamp value is captured at confirmation time and is immutable thereafter. Consumer-side: consumers must read the timestamp as-is and not normalize across records.

- **Reference resolution at consumer-read time.** When the consumer reads the source Delivery Evidence by reference (via Source Evidence Snapshot Reference on the Handoff Record), the consumer reads the current state of the source record. PR #91's terminal-once-confirmed invariant guarantees the relevant fields are stable for `confirmed` records. Producer-side: terminal-state invariant is the existing PR #91 commitment; this PR reaffirms but does not add new invariants.

### Operational acceptance edge cases

- **Confirmed publication does not assert operational acceptance.** PR #91's operational-acceptance non-assertion is preserved by the handoff contract. Producer-side: publishing `order-routing.export-delivery-evidence.confirmed` asserts only that the configured Delivery Method produced confirmed delivery evidence. It does not assert that the vendor acknowledged, opened, processed, or operationally accepted the export. Consumer-side eligibility evaluation reads this transport-layer fact; whether to start an SLA clock is governed by Fulfillment / Returns SLA Policy (PR #92), not by the publication itself.

- **Publication of `.failed` does not assert vendor refusal or non-receipt.** PR #91's `failed` state means transport-layer delivery evidence could not be confirmed for the configured Delivery Method. It does not assert that the vendor refused, that the vendor did not receive, or that any other party-level interpretation applies. Producer-side: publication is the transport-layer fact; consumer-side disposition is consumer choice (Phase 1: `consumption_skipped`).

### What this PR does not change on the producer side

- No new Order Routing entities.
- No new Order Routing workflows.
- No new Order Routing events.
- No new Order Routing authority classes.
- No new Order Routing API contracts.
- No modification of `modules/order-routing/data-model.md`, `workflows.md`, `events.md`, `permissions.md`, `api-contracts.md`, or `openapi-contracts.md`.
- `vendor-export-fulfillment-handoff-governance.md` receives a light cross-reference only (<=15 lines added, 0 deletions, no restructuring, no ownership changes, no SLA logic).
