# Fulfillment and Returns Edge Cases

This document is proposal-level architecture. It captures edge cases that should be resolved before implementation or downstream dependency hardening.

## Handoff Disposition Edge Cases

- Order Routing sends handoff request without routing snapshot reference.
- Order Routing sends handoff request without source version.
- Duplicate handoff request is received for the same routed suborder and source export batch item.
- Fulfillment accepted an earlier handoff but a stale handoff arrives later.
- Fulfillment rejects handoff but downstream consumer treats request event as accepted execution.
- Handoff fails and operations attempt to select a new route inside Fulfillment.

Expected guardrail: record Fulfillment-owned disposition; do not re-route or treat request as accepted execution.

## Vendor Fulfillment Import Edge Cases

- Import file has missing, duplicate, deprecated, or out-of-order headers.
- Vendor attempts create-mode behavior through an update-only fulfillment import.
- Vendor changes locked fields such as buyer, suborder, SKU, UPC, quantity, source export batch item, or order line reference.
- Vendor leaves an editable field blank and the blank could erase existing tracking evidence.
- Vendor submits row for suborder owned by another vendor.
- Vendor submits row for cancelled, superseded, or already fulfilled suborder.
- Source export batch/item reference does not match the routed suborder.
- Duplicate row appears for same suborder + SKU/UPC without split shipment support.
- Vendor uploads corrected file after source order/fulfillment state changed.

Expected guardrail: follow shared import/export governance with validation, preview, confirmation, locked field protection, blank field protection, correction/reupload references, and audit references.

## Shipment Line Evidence Edge Cases

- Fulfillment row lacks a routed suborder line reference and multiple source order lines share the same Suborder + SKU/UPC.
- Source export batch item references a routed suborder, but not the line needed to apply the row safely.
- Split shipment rows are submitted without Package ID or Shipment Line ID.
- Package ID is reused across unrelated routed suborder lines.
- Shipment Line ID is reused for a different SKU/UPC or package.
- Shipped quantity exceeds expected quantity.
- Delivered quantity exceeds shipped quantity.
- Delivered quantity exceeds expected quantity.
- Duplicate import row attempts to overwrite an already applied Shipment Line Evidence record.
- Stale import row attempts to supersede current evidence without a supersession reference.
- Carrier/provider callback conflicts with vendor-provided shipment line evidence.
- Partial shipment evidence exists for some lines while the summary shipment status is marked shipped or delivered.

Expected guardrail: every applied row maps to an expected routed suborder line or explicitly supported package/shipment line structure; duplicate, stale, over-quantity, and ambiguous line rows are rejected, ignored, superseded by reference, or routed to review without changing Order Routing truth.

## Shipment Tracking Edge Cases

- Tracking number is provided without carrier.
- Shipped date is provided without tracking number.
- Carrier is `Other` but no custom URL or instructions are provided.
- Carrier-specific tracking format is invalid or ambiguous.
- Tracking URL is unsafe, malformed, redirects unexpectedly, or appears cross-tenant.
- Vendor changes tracking number after buyer update already emitted.
- Same tracking number is reused across unrelated suborders.
- Carrier/provider callback conflicts with vendor-provided tracking evidence.

Expected guardrail: create tracking reference review/supersession state; Integration Management owns provider callback evidence.

## Shipment Status Edge Cases

- Delivered date is before shipped date.
- Vendor marks delivered but tracking is missing.
- Vendor marks delivered but carrier status is exception.
- Carrier marks delivered but buyer reports not received.
- Shipment update arrives out of order after later status was accepted.
- Shipment update replay arrives with same idempotency key.
- Shipment line quantity exceeds routed order line quantity.
- Partial shipment rows are submitted but split shipment/package model is not enabled.

Expected guardrail: append evidence, preserve current state according to transition/source rules, and route conflicts to review.

## Vendor Return Export Edge Cases

- Return export includes return assigned to another vendor.
- Return export item has missing RAN reference.
- Return authorization/RAN source version is stale.
- Return authorization freshness has expired before export generation.
- Return lifecycle state is closed, superseded, unauthorized, or mismatched with the source return request.
- Return export eligibility has no return line references.
- Return export batch includes duplicate return lines.
- Buyer/retailer split creates duplicate item across split batches.
- Re-export request tries to resend all prior returns without explicit item selection.
- Manual download is attempted by unauthorized vendor user.
- Export delivery fails after export content was generated.

Expected guardrail: batch-item disposition, return authorization freshness checks, duplicate prevention, explicit re-export, Tenant Company permission references, Logs & Audit file evidence, and Integration/Notification delivery references.

## Vendor Return Import Edge Cases

- Import file changes locked return fields such as RAN, SKU, UPC, return quantity, initiation date, reason, pricing snapshot reference, or source return export batch item.
- RAN does not exist.
- RAN belongs to another vendor.
- RAN is closed, superseded, expired, or not open.
- RAN does not match source return export batch/item.
- Duplicate RAN + SKU/UPC rows appear without partial return line support.
- Return received date is before initiation date.
- Return received date is far future.
- Return condition value is unsupported.
- Vendor provides return refunded amount without operational disposition.

Expected guardrail: validate RAN/matching/chronology/condition before apply; record vendor refund amount as evidence only.

## Return Line Disposition Evidence Edge Cases

- Return import row lacks CIXCI Return Line ID and multiple return lines share the same RAN + SKU/UPC.
- Duplicate RAN + SKU/UPC rows appear without an explicit partial return line or receipt structure.
- Partial return row provides received quantity but no accepted/rejected/partial quantity breakdown.
- Accepted quantity exceeds expected return quantity.
- Rejected quantity exceeds expected return quantity.
- Accepted + rejected + partially accepted quantities do not reconcile to received quantity.
- Vendor provides partial acceptance/refund reason without a partial accepted quantity.
- Vendor provides refund/adjustment evidence at line level but no return line disposition evidence reference.
- Stale return import row attempts to supersede current return line disposition without a supersession reference.
- Summary return disposition says operationally accepted while one or more return lines are rejected or review-required.

Expected guardrail: return disposition is recorded at line level where quantities can differ; ambiguous, duplicate, over-quantity, and non-reconciling rows are rejected, ignored, superseded by reference, or routed to review without creating final financial status.

## Return Disposition And Financial Boundary Edge Cases

- Vendor marks return accepted and includes refunded amount, but Invoice Management has no matching invoice adjustment workflow.
- Vendor marks return rejected but buyer-facing workflow expects refund.
- Vendor partially accepts return without partial refund reason.
- Vendor-provided refund amount conflicts with Pricing snapshot or Pricing adjustment evidence.
- Vendor uses `Return Refunded` status that implies final financial state.
- Return condition suggests warranty claim, but warranty approval signal is missing.

Expected guardrail: record operational disposition and vendor-provided refund/adjustment evidence only; Pricing and Invoice Management own financial interpretation and lifecycle.

## Buyer Update Signal Edge Cases

- Shipment update is ready for buyer transport but Integration transport fails.
- Return update is ready for buyer transport but scheduled email delivery fails.
- Buyer update is sent after buyer lost access or relationship scope changed.
- Buyer system receives duplicate shipment update from re-export/retry.
- Transport failure is mistaken for fulfillment state failure.

Expected guardrail: Fulfillment emits update-ready and transport-failed-reference events; Integration/Notification own delivery evidence and retries.

## Product Type / Tenant / Redaction Edge Cases

- Product Type-specific return fields are missing from import schema.
- Vendor fulfillment update includes customer-sensitive shipping fields not authorized for the actor.
- Buyer/entity scope is stale after handoff but before fulfillment import apply.
- Return event leaks pricing snapshot or vendor refund amount to unauthorized consumer.
- Multi-suborder shipment crosses buyer child entity boundaries.

Expected guardrail: enforce source scope references, redaction class, and review-required state rather than inferring eligibility.

## AI Agent Edge Cases

- AI suggests correction for invalid tracking URL.
- AI flags repeated RAN validation failures.
- AI attempts to confirm import preview or apply correction without approved action contract.
- AI treats vendor refunded amount as final refund approval.

Expected guardrail: AI may recommend or flag; source-module mutation requires approved action contracts, permissions, and audit evidence.

## Open Questions

- Which edge cases are hard blockers versus warnings?
- Which import failures require System Admin review?
- Which carrier/vendor conflicts can be auto-resolved?
- Which return financial-adjacent evidence values should be hidden by default?
- Which edge cases must emit downstream events even if unresolved?
- Which identifiers are mandatory before split shipment rows can be accepted?
- Which identifiers are mandatory before partial return rows can be accepted?

## Vendor Fulfillment Response SLA Edge Cases (PR-A)

PR-A documents proposal-level edge cases for the SLA evaluation surface. These are not exhaustive runtime test cases; they highlight architectural decisions and known boundary scenarios.

### SLA Policy versioning during pending evaluations

- **An active SLA Policy is edited while SLA Evaluation Records computed against the prior version are still in `pending` lifecycle.** The new Policy version becomes active. The pending Evaluation Records continue to reference the prior (now `superseded`) Policy version. Their `expected_fulfillment_response_deadline` was computed against the prior version and is immutable. Subsequent imports for those suborders are evaluated against the prior version's deadline. **No retroactive recomputation.**

- **An active SLA Policy is retired while pending evaluations exist.** The Policy is `retired`. Pending Evaluation Records continue to reference the retired version. New consumptions of Vendor Export Delivery Evidence for the retired vendor/route do not produce Evaluation Records (or produce them with the no-Policy-applies flag — see PR-A OQ); the operational decision routes to review.

- **Two SLA Policy versions briefly both appear active during edit.** Architecture-level: at most one `active` Policy version exists per `(vendor_reference, route_reference)` at any time. Implementation-level concurrency is deferred to implementation; PR-A's invariant is enforced at the data-model level.

### Business calendar dependency edge cases

- **Business calendar is not yet available on `main`.** PR-A's fallback: SLA Evaluation Record's deadline computation uses calendar-day semantics (no weekend/holiday adjustment). The Evaluation Record carries an audit-visible note indicating fallback. The fallback is proposal-level (per PR-A OQ 1).

- **Business calendar is partially populated (some holidays known, others unknown).** PR-A treats unresolved calendar entries as business days (i.e., assumes the calendar is authoritative for what it covers and silent for what it does not). This is proposal-level; future calendar implementation may revisit.

- **A delivery is confirmed at exactly the `same_day_cutoff_time` (e.g., `14:00:00.000`).** PR-A's rule: delivery at or before the cutoff is same-day. A delivery at `14:00:00.001` is after-hours. Proposal-level; boundary precision is implementation territory.

- **Timezone change for a vendor between SLA Policy versions.** Editing the Policy timezone produces a new version per Workflow 1. Pending Evaluation Records use the prior version's timezone. Subsequent evaluations use the new version's timezone. **No retroactive translation.**

### Race conditions in late-after-missing detection

- **A late fulfillment import arrives at the same moment Workflow 7's time-driven Missing detection fires.** Architecturally, there is at most one Exception per (SLA Evaluation Record, Exception kind) for Late and Missing. Implementation must ensure idempotency at the (Evaluation Record, Exception kind) level. PR-A flags this as an implementation concurrency concern (PR-A OQ 9).

- **The time-driven scan runs at hourly cadence (implementation choice).** Detection latency for Missing Exceptions is bounded by the scan interval. PR-A does not specify scan cadence; lower latency requires more frequent scans, with operational cost tradeoffs.

- **A duplicate `order-routing.export-delivery-evidence.confirmed` event is consumed.** Architecture-level: at most one SLA Evaluation Record exists per `(suborder_reference, vendor_export_delivery_evidence_reference)`. Implementation idempotency mechanics are deferred to Boundary/Handoff PR.

### Partial response combinatorics

- **Multiple partial responses arrive in sequence, all before Expected Deadline.** Workflow 5 evaluates each. The first partial creates a Partial Exception. Subsequent partials append to `partial_fulfillment_import_references` on the existing Partial Exception (if Partial Exception remains `open`). If the cumulative response becomes complete before deadline, the Partial Exception transitions to `resolved`.

- **Multiple partial responses, some before deadline and some after.** Partial Exceptions arrive before deadline; Late Exception is created after deadline. Multiple Exceptions co-exist. SLA Evaluation Record outcome reflects severity: `late` once a late import arrives.

- **A "complete" response arrives in two separate import payloads, both on time.** The first payload triggers a Partial Exception. The second payload completes the response. Workflow 5 resolves the Partial Exception and transitions the Evaluation Record to `on_time`.

- **A response arrives on time but covers more lines than the suborder contains (extra rows).** Existing Fulfillment / Returns import validation handles extra-row anomalies. PR-A's SLA evaluation treats the response as complete if all suborder lines are covered (regardless of extra rows). The validation anomaly is separately captured.

- **A response arrives on time but covers fewer than half the suborder lines.** Partial Exception is created. Operational review per Workflow 9.

### Time-driven Missing detection latency

- **Missing detection runs after Expected Deadline has elapsed by some implementation-defined delay (the scan interval).** The Missing Exception's `detected_at` field captures the detection moment, distinct from `expected_deadline_at_creation`. Downstream consumers reading both fields can distinguish "deadline elapsed N minutes ago, Exception just created" from "deadline elapsed N hours ago, late detection."

- **Detection fires for a deadline that has been overridden via an Override Evidence record while the scan was in progress.** Architecture-level: detection checks the Evaluation Record's lifecycle. If the lifecycle is `evaluation_excused`, no Exception is created. Implementation handles this as an idempotency / consistency concern.

- **Detection fires after the SLA Policy has been retired.** The Evaluation Record still references the retired Policy version. Missing Exception is created normally; review proceeds per Workflow 9.

### Override reversal edge cases

- **An override is reversed before any other change has occurred.** Reversal creates a new Override Evidence record. The affected Exception returns to `under_review`. The SLA Evaluation Record lifecycle returns to `evaluated` (from `evaluation_excused`). Both Override Evidence records (original and reversing) are preserved immutably.

- **An override is reversed after the SLA Evaluation Record has been consumed by downstream Analytics or Cross-Module Summary Email PR.** PR-A produces the events `fulfillment-returns.late-fulfillment-import-exception.overridden` at override time and (in a future Cross-Module PR) a corresponding reversal event. Downstream consumers must reconcile the reversal. PR-A does not specify a separate "reversal" event in PR-A scope (the original override's reversal is captured in audit; a future PR may add explicit reversal-event semantics).

- **An override is created on an Exception in `closed` state (non-overridden terminal).** PR-A rejects override on `closed` state; only `open` and `under_review` states accept override (`under_review` is the typical state for override since review precedes override). Reopening (`closed → under_review`) is permitted by Workflow 9.

### Transport receipt vs validation timing edge cases

- **An import payload's transport receipt is captured at `15:59:59` but validation begins at `16:00:01` and completes at `16:00:10`.** The SLA-relevant timestamp is `15:59:59` (transport receipt). If Expected Deadline is `16:00`, the SLA outcome is `on_time`.

- **An import payload's transport receipt is captured at `16:00:01` and validation completes at `16:00:30`.** The SLA-relevant timestamp is `16:00:01` (transport receipt). If Expected Deadline is `16:00`, the SLA outcome is `late`.

- **An import payload is received in multiple chunks (streaming or multi-part upload).** PR-A's rule: the **first transport receipt** of the import payload is the SLA-relevant timestamp. Subsequent chunks arriving later do not extend the SLA timestamp.

- **An import payload's transport receipt occurs but the payload is empty or unparseable.** The SLA-relevant timestamp is captured (the vendor did submit *something* on time). Existing Fulfillment / Returns import validation handles the parse failure as a separate validation exception. The SLA evaluation considers the response "received" for SLA purposes; the operational consequence is that the validation exception is reviewed separately. **A malformed on-time file does not silently count as successful fulfillment completion** — but it is on-time for SLA.

- **The transport-receipt timestamp Integration Management reports is in the future (clock skew).** PR-A captures Integration Management's reported timestamp without modification. Clock skew is an operational issue surfaced through audit; PR-A does not normalize or clip timestamps.

### Multiple-Exceptions-per-suborder edge cases

- **A suborder accrues Partial + Late + Override on the Late, with the Partial unresolved.** SLA Evaluation Record outcome = `late` (severity priority). Lifecycle remains `evaluated`. The `evaluation_excused` lifecycle is not reached because the Partial Exception is not yet in `overridden` state.

- **A suborder has Partial + Late, both subsequently overridden.** All Exceptions in `overridden` state. SLA Evaluation Record lifecycle transitions to `evaluation_excused`.

- **A suborder has Partial + Late, the Late is overridden but the Partial is `resolved`.** Both terminal but only one is `overridden`. SLA Evaluation Record lifecycle: PR-A's rule is that `evaluation_excused` requires all Exceptions to be `overridden`. With one `resolved` and one `overridden`, the lifecycle stays at `evaluated`. The breach is operationally acknowledged.

### Edge cases NOT addressed by PR-A

- **Behavior when Order Routing Vendor Export Delivery Evidence is `unconfirmable`, `failed`, or `partial`.** Boundary/Handoff PR territory. PR-A consumes `confirmed` only.

- **Cross-module event idempotency, replay, ordering for `order-routing.export-delivery-evidence.confirmed` consumption.** Boundary/Handoff PR.

- **SLA evaluation when the source Vendor Export Delivery Evidence is later determined to be invalid (post-confirmation issue).** PR #91 makes Delivery Evidence terminal once confirmed. PR-A treats confirmed evidence as authoritative input. If Order Routing later identifies a problem, that is an Order Routing concern; PR-A does not consume Order Routing reversal events in scope.

- **SLA evaluation for suborders that have been cancelled after Delivery Evidence was confirmed.** The Evaluation Record exists; subsequent cancellation may resolve via Workflow 9 (`closed` with operational reason). PR-A does not introduce special-case logic for cancellation.

- **Multi-vendor / multi-suborder coordination on a single export.** Existing Order Routing buyer/retailer split and suborder modeling handles this. SLA evaluation runs per-suborder; cross-suborder coordination is not modeled in PR-A.

- **SLA evaluation for return imports (RAN-validated, etc.).** Out of PR-A scope. PR-A targets vendor fulfillment response (shipment/tracking) only.

- **Vendor performance / commission impact from SLA breach.** Invoice Management future-PR territory.

- **Buyer-facing SLA visibility.** Fulfillment / Returns PR-B and Cross-Module Summary Email PR territory.

- **Notification Platform Service delivery edge cases (recipient bounce, channel failure).** Notification Platform Service territory; consumed via SLA Breach Signal in a future PR.

- **Analytics aggregation edge cases (period boundaries, vendor rollup, dashboard refresh).** Cross-Module Summary Email PR / future Analytics PR.

## Cross-Module Handoff Edge Cases (Boundary/Handoff PR)

Edge cases the consumer side may encounter and how the contract resolves them. Each edge case identifies the trigger, the expected resolution per Workflow A or Workflow B, and what should be observable via audit reference.

### Source event arrival before SLA Policy is active

- **Trigger:** A source `order-routing.export-delivery-evidence.confirmed` event arrives for a vendor whose SLA Policy is still in `draft` state at consumption time.
- **Resolution:** Eligibility condition E2 (active SLA Policy) fails. Handoff Record transitions to `consumption_skipped` with audit reason `no_active_sla_policy`. **No SLA Evaluation Record created.**
- **Operator concern:** If a vendor's SLA Policy is mistakenly left in `draft`, all their confirmed source events skip. The skip rate is audit-observable; future Cross-Module Summary Email PR may surface skip rates by vendor.
- **Recovery:** Activating the SLA Policy does not retroactively re-evaluate skipped Handoff Records (replay-time invariant). Future source events post-activation are evaluated normally.

### Source event arrival after SLA Policy retired

- **Trigger:** A source `order-routing.export-delivery-evidence.confirmed` event arrives for a vendor whose SLA Policy was recently `retired`.
- **Resolution:** Eligibility condition E2 fails (no active SLA Policy at consumption time). Handoff Record transitions to `consumption_skipped` with audit reason `no_active_sla_policy`.
- **Operator concern:** SLA Policy retirement intentionally stops new SLA evaluations. The skip is correct.

### Replay arrives after SLA Policy is edited

- **Trigger:** A replay of a previously-`consumed` source event arrives. Between original consumption and replay, the SLA Policy has been edited and a new version is active.
- **Resolution:** Replay-time eligibility invariant. The existing Handoff Record's `consumed` state and its bound SLA Evaluation Record (which captured the original SLA Policy version per PR #92's versioning) remain authoritative. Replay produces `replay_acknowledged` audit reference. **No re-evaluation. No new SLA Evaluation Record.**
- **Operator concern:** Vendor disputes claiming "the Policy was different when this was evaluated" must be addressed through SLA Override / Excuse Evidence (PR #92), not through replay re-evaluation.

### Duplicate confirmed events arriving concurrently

- **Trigger:** Two `order-routing.export-delivery-evidence.confirmed` events for the same source Delivery Evidence arrive concurrently from at-least-once transport.
- **Resolution:** Idempotency lookup at Workflow A Step 2. Uniqueness invariant on (`handoff_idempotency_key`, `consumer_scope_reference`) ensures exactly one Handoff Record is created. The losing creation path resolves to the existing record per Steps 2-5. The losing path's source event reference is appended to the existing record's audit trail.
- **Resilience:** Implementation must be safe under concurrent creation attempts; architecturally the contract is satisfied by uniqueness.

### Out-of-order source events

- **Trigger:** A `confirmed` event and a (hypothetical, anomalous) `failed` event for the same source Delivery Evidence arrive at the consumer with reordered transport timing. PR #91's source state machine doesn't allow `confirmed -> failed`, so this sequence is anomalous.
- **Resolution:** Whichever event arrives first creates the Handoff Record. The second event's idempotency lookup finds the existing record. If the existing record is `consumed` and the second event is `failed`, Workflow B Step 3 audits the anomaly without transitioning state. Canonical state remains `consumed`.
- **Operator concern:** Such anomalies are audit-observable. Their presence indicates either transport-layer bug or unexpected upstream behavior; investigation is operator territory.

### Source event with stale reference

- **Trigger:** A source event references a Vendor Export Delivery Evidence that has been transitioned (impossible under PR #91, but consider the case of a malformed event payload).
- **Resolution:** Eligibility evaluation reads source Delivery Evidence by reference. If the reference is invalid (lookup fails), Handoff Record transitions to `consumption_failed` with audit reason describing the lookup failure. Retry permitted per Workflow A Step 5.
- **Architecture concern:** PR #91 guarantees source references are stable; this edge case captures malformed-event resilience.

### Eligibility check race with SLA Policy edit

- **Trigger:** Eligibility evaluation (Workflow A Step 7) reads SLA Policy. Between read and Handoff Record state transition, the SLA Policy is edited.
- **Resolution:** PR #92's SLA Policy versioning means the version read at eligibility check is captured on `handoff_eligibility_decision_reference`. Subsequent SLA Policy edits do not retroactively change the captured decision. SLA Evaluation Record (if created) carries the captured Policy version.
- **Operator concern:** Operators must not assume Handoff Records reflect current Policy. They reflect Policy at consumption time.

### Bounded replay window exceeded

- **Trigger:** Integration Management's bounded replay window (duration unspecified by this PR) elapses, after which replays of source events are not delivered.
- **Resolution:** Architecturally, missing replays mean missing Handoff Records. Reconciliation against Order Routing source state (PR #91 records exist on the source side) is possible via operator-initiated lookup. This PR does not introduce automated reconciliation; future PR may.
- **Implementation note:** Integration Management owns transport policy; window duration is their call.

### `consumption_failed` record stuck without retry

- **Trigger:** A Handoff Record reaches `consumption_failed` and no subsequent source event observation triggers retry per Workflow A Step 5.
- **Resolution:** Phase 1 records the failed state. Operator intervention via re-emission (which Integration Management transport would handle, not Order Routing producer behavior) or manual retry triggers Workflow A Step 5's transition `consumption_failed -> pending`.
- **Future:** Boundary/Handoff PR OQ 6 (retry policy tuning) is implementation territory.

### `consumption_held` record never resolves

- **Trigger:** A source Delivery Evidence is `partial` and remains `partial`; the Handoff Record stays in `consumption_held` indefinitely.
- **Resolution:** Phase 1 records the held state. No automatic resolution. A re-export per PR #91 produces a new source Delivery Evidence; the new Delivery Evidence produces a new Handoff Record via Workflow A. The prior held record remains held.
- **Future:** Boundary/Handoff PR OQ 5 (age-based alerting) is future-phase.

### Source event arrival for retired vendor

- **Trigger:** A source `order-routing.export-delivery-evidence.confirmed` event arrives for a vendor whose tenant relationship has been retired or whose vendor scope no longer includes SLA evaluation.
- **Resolution:** Eligibility condition E3 (vendor in Tenant Company scope) fails. Handoff Record transitions to `consumption_skipped` with audit reason `vendor_out_of_scope`.
- **Operator concern:** Skipped Handoff Records for retired vendors are expected; they should be filterable in future operator UI by audit reason.

### Source event arrival for tenant whose `check_access` returns deny

- **Trigger:** A source event references a tenant that fails `check_access` evaluation at consumption time.
- **Resolution:** Eligibility fails. Handoff Record transitions to `consumption_skipped`. Tenant Company `check_access` decision rationale is captured in the audit reference.

### Idempotency key collision risk

- **Trigger:** Two different source Delivery Evidences hash to the same idempotency key (cryptographic collision).
- **Resolution:** The idempotency key derivation specified by this PR (`vendor_export_delivery_evidence_reference` + `consumer_scope_reference`) uses the source's stable identifier directly. Collision risk reduces to the source identifier's uniqueness, which PR #91 guarantees. No additional collision risk introduced.
- **Implementation note:** If implementation uses a hashed key, hash collision is an implementation concern; the architecture uses the identifier itself.

### Future consumer scope introduction

- **Trigger:** A future PR introduces a second consumer scope (for example, a hypothetical analytics-reporting consumer scope for handoff aggregation).
- **Resolution:** The Handoff Record's `consumer_scope_reference` field accommodates the new scope. A second Handoff Record exists per (idempotency key, consumer scope) pair. Phase 1 contract is unaffected for the Fulfillment / Returns SLA consumer scope.
- **Architecture:** Multi-consumer is anticipated; no contract change required.

### Tenant Company business calendar unavailable during eligibility check

- **Trigger:** Eligibility evaluation needs to consult tenant business calendar; the calendar is unavailable (future Tenant Company dependency per PR #92 OQ 1).
- **Resolution:** Eligibility does not depend on business calendar; calendar is an SLA Policy concern (PR #92), and Policy-version capture happens at eligibility time. If the SLA Policy's downstream deadline computation needs the calendar, PR #92 Workflow 3 handles the fallback. The Handoff Record itself does not depend on the calendar.
- **Boundary clarity:** Calendar dependency is PR #92's, not this PR's.

### Cross-module clock skew

- **Trigger:** Order Routing's `export_delivered_timestamp` and Fulfillment / Returns' consumption-time clock differ by a few seconds.
- **Resolution:** Eligibility evaluation does not perform deadline computation; it only checks Policy activation status. Deadline computation per PR #92 Workflow 3 uses the source `export_delivered_timestamp` (read by reference), not the consumer's clock. Clock skew does not affect eligibility.

### `replay_acknowledged` audit reference accumulation

- **Trigger:** Repeated replay of the same source event over time produces many `replay_acknowledged` audit references on the same Handoff Record.
- **Resolution:** Audit trail grows but canonical state is unaffected. Logs & Audit retention policy governs trim.
- **Operator concern:** Replay storm visibility is a future-phase concern (Boundary/Handoff PR OQ 5 / Cross-Module Summary Email PR).
## Delivery Date and Buyer Update Edge Cases (PR-B)

The edge cases below name conditions that are within scope for PR-B but require explicit operator-walkthrough or architecture-review discussion. Each names the trigger, the documented resolution, and the boundary discipline preserved.

### Tracking evidence not yet arrived

- **Trigger:** vendor submits a Delivery Date for a Shipment Line that does not yet have any tracking-evidence timestamp recorded.
- **Resolution:** the not-before-tracking-evidence rule is conditionally skipped when tracking evidence does not exist. The remaining validation rules (format, not-before-shipped, not-before-order-creation, not-stale, not-duplicate, not-regression) still apply.
- **Discipline:** absence of tracking evidence is not itself a rejection reason. The rule applies only where tracking evidence exists.

### Concurrent vendor imports

- **Trigger:** two or more Fulfillment Imports affecting the same Shipment Line arrive within a short window.
- **Resolution:** Workflow 1 creates one Delivery Date Evidence per import row. Workflow 2 processes them; implementation-level concurrency control determines ordering. Whichever is processed first establishes the accepted Delivery Date Evidence; subsequent submissions apply the stale, duplicate, or regression rule.
- **Discipline:** implementation-level concurrency tuning is deferred. PR-B's architectural expectation is that one Delivery Date Evidence per Shipment Line will become canonical; conflicts are auditable.

### Vendor disputes a rejection outcome

- **Trigger:** vendor disagrees with a `rejected_*` Delivery Date Evidence outcome.
- **Resolution:** the dispute path is out-of-band (operator ticket, vendor support communication). If the dispute is upheld, a CIXCI System Admin may submit a Delivery Date Correction Evidence via Workflow 6 path 6b. The correction is authority-gated and audit-bearing.
- **Discipline:** vendor self-service correction is excluded in Phase 1. The dispute resolution path is explicit and authority-gated.

### Race between buyer integration unpause and new vendor activity

- **Trigger:** a buyer with a Tenant Company-level pause flag has accumulated `held_buyer_integration_paused` Buyer Update-Ready Signals. The pause is cleared while a new vendor import is also being processed for the same buyer.
- **Resolution:** Workflow 11 (Re-Evaluation) processes the held signals when the pause clears. Concurrent new vendor activity creates new Delivery Date Evidence and potentially new Buyer Update-Ready Signals via Workflow 7 or Workflow 8. Both paths proceed; implementation-level concurrency control determines order of Workflow 10 handoffs to Integration Management.
- **Discipline:** the burst of unpause-triggered dispatches is observable; Integration Management's rate limiting (if any) is its own concern. PR-B does not rate-limit at the signal level.

### Paused buyer unpause burst

- **Trigger:** a buyer that has been paused for a long period unpause, releasing many Buyer Update-Ready Signal records simultaneously.
- **Resolution:** Workflow 11 re-evaluates each held signal; each transitions to `eligible` independently. Workflow 10 hands off each to Integration Management. Integration Management's transport-level rate limiting is the relief valve.
- **Discipline:** PR-B does not constrain the size of the unpause burst. Integration Management's transport policy is the boundary.

### Multi-tracking-number split shipments

- **Trigger:** a vendor splits one suborder across multiple tracking numbers, each producing its own Shipment Line.
- **Resolution:** each Shipment Line has its own Delivery Date Evidence chain. The Multi-Vendor / Multi-Suborder Buyer Update Rule applies across all Shipment Lines for the parent order. "All Shipment Lines delivered" means every Shipment Line under every vendor suborder for the parent order is in Delivered state.
- **Discipline:** the all-vendors aggregation rule operates at Shipment Line granularity. Split-shipment scenarios are first-class.

### Mixed-state parent orders

- **Trigger:** a parent order has Shipment Lines in a mix of states: some shipped, some delivered, some not yet shipped, some with rejected Delivery Date Evidence.
- **Resolution:** the Buyer Update-Ready Signal aggregation determines hold reason from the lowest-progress Shipment Line. If any Shipment Line is not yet shipped, the shipment-kind signal holds awaiting-all-vendors-shipped. If all are shipped but some not yet delivered, the delivery-kind signal holds awaiting-all-vendors-delivered. Rejected Delivery Date Evidence does not advance a Shipment Line past shipped state.
- **Discipline:** mixed-state visibility is provided via held signals and their hold reasons; no silent omission.

### Vendor delivery-date earlier than carrier evidence (Phase 1)

- **Trigger:** Phase 1 has no carrier-evidence integration, so the not-before-tracking-evidence rule applies only to the existing baseline's tracking-evidence timestamp. If the baseline does not capture carrier-confirmed delivery, this rule does not fire on carrier-evidence grounds in Phase 1.
- **Resolution:** future carrier integration PR will introduce carrier-confirmed delivery as an alternate Delivery Date Evidence source. Conflict resolution between vendor-submitted and carrier-confirmed delivery is a future decision (PR-B OQ 6).
- **Discipline:** Phase 1 trusts vendor submission. Source-agnostic naming of Delivery Date Evidence anticipates the future addition without committing to specific conflict-resolution semantics now.

### Correction storm

- **Trigger:** a single vendor systematically submits Delivery Dates that require correction (e.g., reporting a placeholder date and then correcting weeks later).
- **Resolution:** each correction goes through Workflow 6 path 6b authority-gated submission. Audit volume rises. Per-vendor correction-rate alerting is not in PR-B; future operator-surface PR may introduce it.
- **Discipline:** PR-B captures the audit material. Alerting and rate-limiting are deferred.

### Out-of-order Shipped Date arrives after Delivered

- **Trigger:** a delayed Shipped Date update for a Shipment Line already in Delivered state.
- **Resolution:** the Out-of-Order Shipment Update Handling Rule applies. The update is recorded for audit but does not regress Delivered state. No Buyer Update-Ready Signal is produced for the regression attempt.
- **Discipline:** Delivered is terminal for the existing Shipment Status lifecycle's progression; PR-B does not introduce regression paths.

### Buyer Update-Ready Signal stuck in held state

- **Trigger:** a Buyer Update-Ready Signal has been in a `held_*` state for an extended period (e.g., one vendor never ships, never reports).
- **Resolution:** the signal remains held. PR #92's missing-fulfillment-import handling produces its own SLA-side exception independently. PR-B does not introduce a timeout or escalation for held buyer-update signals; that surface is anticipated by the Cross-Module Summary Email PR and by future operator-surface work.
- **Discipline:** PR-B captures the held state and audits transitions. Long-running held signals are operator-visible via the future API placeholders; resolution is operator-driven or follows from vendor activity.

### Correction during dispatch

- **Trigger:** a Delivery Date Correction Evidence is submitted for a Shipment Line whose Buyer Delivery Update-Ready Signal is currently in `dispatched` state (Integration Management is mid-transport).
- **Resolution:** Workflow 6 step 5-6 applies the correction. Workflow 6 step 7 treats the dispatched state as buyer-already-updated path: a new correction-kind Buyer Update-Ready Signal is created. The original dispatched signal is preserved; it continues toward `acknowledged` or `failed` per Integration Management's own retry policy. The correction-kind signal proceeds independently.
- **Discipline:** the in-flight dispatch is not interrupted by the correction. Buyer system may receive the original update and the correction as separate events; that is the intentional design.

### Authority-missing vs audit-evidence-missing distinction

- **Trigger:** Workflow 6 must distinguish between authority being absent (the actor lacks Delivery Date Override / Correction Authority) and authority being present but supporting evidence reference being absent.
- **Resolution:** failure codes `DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED` and `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING` are distinct. Each rejection records the specific code; the codes are never mixed.
- **Discipline:** an audit record carrying one of these codes is unambiguous about which gate failed.

### Buyer integration profile reference missing

- **Trigger:** a Buyer Update-Ready Signal is being created (Workflow 7 or Workflow 8) for a parent order whose Tenant Company / buyer scope has no resolvable `buyer_integration_profile_reference`.
- **Resolution:** the signal is still created (the lack of profile reference does not prevent creation) but Workflow 9 evaluation treats it as a configuration absence. Phase 1 disposition: the signal transitions to `held_buyer_integration_paused` as a conservative default; operator review is required to configure the profile or to determine that the buyer has no integration. (Alternative disposition: a distinct hold reason. PR-B uses `held_buyer_integration_paused` for the Phase 1 mapping; future PRs may refine.)
- **Discipline:** absence of profile is not silently dropped. The held state is observable.

### Tenant Company scope re-activation with pending held signals

- **Trigger:** a Tenant Company scope was marked inactive, accumulating `held_tenant_scope_inactive` signals. The scope is later re-activated.
- **Resolution:** Workflow 11 re-evaluates each held signal. Each transitions based on current conditions; any signal whose other conditions also pass transitions to `eligible`.
- **Discipline:** scope re-activation is an unpause-burst equivalent; Integration Management's transport-level rate limiting (if any) applies.

### Delivery Date Evidence reference orphaning

- **Trigger:** a Shipment Line is somehow disassociated from its parent order (out-of-band data correction).
- **Resolution:** PR-B does not prevent this; data integrity at the Shipment Line / parent order linkage level is owned by the existing baseline. If orphaning occurs, downstream PR-B workflows operate on the visible references and may produce held signals that cannot resolve. Operator escalation handles such cases.
- **Discipline:** PR-B trusts the existing baseline Shipment Line / parent order linkage. PR-B does not introduce data-integrity checks for this linkage.

### Same vendor submits accepted Delivery Date and then submits a different value within the same import

- **Trigger:** a Fulfillment Import contains two rows targeting the same Shipment Line, both with Delivery Date values but different.
- **Resolution:** the existing baseline row-validation pattern handles row-level conflicts within a single import (this is not new in PR-B). PR-B's per-row Delivery Date Evidence path applies to whichever rows are accepted by the baseline; if both rows are accepted, the second triggers Workflow 2's stale or duplicate rule.
- **Discipline:** intra-import conflicts are existing-baseline scope. PR-B adds Delivery Date validation on top of baseline row-validation; it does not redefine baseline row-validation.
