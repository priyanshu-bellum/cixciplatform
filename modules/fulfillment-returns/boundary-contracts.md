# Fulfillment and Returns Boundary Contracts

This document is proposal-level architecture. It clarifies Fulfillment and Returns boundaries without finalizing business rules or moving Order Routing, Pricing, Invoice Management, Integration Management, Notification Platform Service, Logs & Audit, Tenant Company, Product Catalog, Device Catalog, Warranty, Procurement, Analytics, AI Agent Services, Media, Launch/Event, or Payment responsibilities into Fulfillment and Returns.

## What Fulfillment and Returns May Answer

- What Fulfillment/Returns disposition exists for an Order Routing handoff request.
- Whether a handoff request was accepted, rejected, ignored, duplicate-blocked, or routed to review.
- What fulfillment execution record exists for a routed suborder.
- What vendor fulfillment import job, validation result, preview, confirmation, row result, correction/reupload reference, or error report placeholder exists.
- Which order fields are locked and which fulfillment fields are editable for vendor fulfillment imports.
- What shipment records, shipment line evidence records, package placeholders, tracking references, tracking URL validation statuses, shipment evidence, and shipment status history exist.
- Which routed suborder line, source import row, package, shipment, and tracking references contributed to a Shipment Line Evidence record.
- Whether shipment line evidence was applied, ignored, superseded, duplicate-blocked, stale, out-of-order, or routed to review.
- Whether partial shipment evidence exists for a routed suborder line or package placeholder.
- Whether shipment evidence is Pending, Processing, Partially Shipped, Shipped, Delivered, Exception, Cancelled, or Review Required.
- What vendor return export eligibility, return export batch, return export batch item, return split reference, re-export request, or manual download workflow reference exists.
- Whether return export eligibility was blocked because authorization/RAN evidence was stale, closed, superseded, unauthorized, mismatched, or review-required.
- What vendor return import job, validation result, preview, confirmation, row result, RAN validation record, return matching validation record, or chronology validation record exists.
- What Return Line Disposition Evidence exists for a RAN, return line, source return request, source export batch item, or import row.
- Whether received, accepted, rejected, and partially accepted quantities reconcile at return-line level.
- What operational return disposition evidence exists: received by vendor, operationally accepted, operationally rejected, partially accepted, closed, exception, or review required.
- What vendor-provided refund/adjustment evidence reference exists, without deciding final financial outcome.
- What return condition evidence, vendor notes evidence, rejected reason, or partial refund reason was provided.
- What shipment or return update is ready for buyer transport.
- What fulfillment/return exception, retry, review, hold, dead-letter placeholder, or AI-ready signal exists.
- What approved replacement shipment execution occurred after an owning workflow provided an approved signal.

## What Fulfillment and Returns Must Not Answer

- Which vendor/manufacturer should receive the order or how the order should be routed.
- What routed suborder, routed suborder line, or routing snapshot truth exists beyond consumed Order Routing references.
- Whether a routed suborder should be exported to a vendor order export batch.
- Whether a handoff request should be created by Order Routing.
- What final price, pricing snapshot, quote, commercial adjustment, or pricing interpretation applies.
- Whether a refund, credit, invoice adjustment, payment, settlement, or final financial outcome should occur.
- Whether an invoice is issued, adjusted, reconciled, closed, paid, or disputed.
- Whether a tenant, buyer, child entity, vendor, user, relationship, region, Product Type, or licensed property is eligible.
- Which product records, device records, media assets, Product Type definitions, category validation rules, pricing inputs, or warranty product facts exist.
- Whether a warranty claim is eligible, approved, denied, or registered with a vendor system.
- Who receives a notification, what template is used, whether delivery succeeds, or how notification retries work.
- Whether an external delivery, API call, webhook, CSV/SFTP transport, carrier callback, or scheduled email was delivered successfully.
- What immutable audit/file/download evidence is retained by Logs & Audit.
- What Analytics reporting definitions, dashboards, rollups, or metrics mean.
- What AI recommendations, confidence scores, action outcomes, or approved action contracts mean.

## Boundary Splits

### Order Routing vs Fulfillment and Returns

- Order Routing owns routing decisions, routed order records, routed suborder line truth, vendor/manufacturer suborders, split-order decisions, routing snapshots, vendor routed-suborder export eligibility, vendor order export batches/items, and fulfillment handoff requests.
- Fulfillment and Returns consumes handoff request references, routed suborder references, routed suborder line references, routing snapshots, and source export batch/item references.
- Fulfillment and Returns records handoff acceptance/rejection/ignored/duplicate/review disposition and operational execution state.
- Shipment Line Evidence must reference Order Routing source objects rather than changing them.
- Fulfillment and Returns must not re-route orders, select alternate vendors/manufacturers, create vendor routed-suborder export eligibility, or silently alter routing output.
- Fulfillment and Returns may request routing review through disposition or exception events, but Order Routing owns any reroute decision and any new routing snapshot.

### Vendor Fulfillment Imports vs Order Routing

- Order Routing owns the vendor routed-suborder export content/instruction and source export batch/item references.
- Fulfillment and Returns owns vendor fulfillment import validation and operational application.
- Fulfillment imports must not alter routing decisions, vendor assignment, order line identifiers, source export batch/item references, quantities, or locked order fields.
- Valid fulfillment imports create shipment line, tracking, shipment status, and package evidence only.
- Duplicate fulfillment import rows must not silently overwrite Shipment Line Evidence; they should be ignored, blocked, superseded by reference, or routed to review according to proposal-level rules.

### Shipment Line Evidence vs Invoice Management

- Fulfillment and Returns owns per-line operational shipment evidence, including expected, shipped, delivered, package, tracking, and source import row references.
- Invoice Management may later consume delivered evidence references, but Fulfillment and Returns does not create invoice state or invoice eligibility.
- Shipment line evidence should preserve applied/ignored/superseded state so downstream consumers can choose source evidence without asking Fulfillment to make financial decisions.

### Return Line Disposition vs Financial Outcomes

- Fulfillment and Returns records per-return-line operational disposition and quantity evidence.
- Accepted/rejected/partially accepted return state is operational, not financial approval.
- Return refunded amount is vendor-provided refund/adjustment evidence and may be linked at summary or return-line level.
- Pricing owns pricing snapshot and adjustment pricing evidence.
- Invoice Management owns invoice/refund/credit/adjustment lifecycle and final financial disposition.
- Financial statuses such as Refund Approved, Refund Rejected, Partially Refunded, or Return Refunded should remain external/Invoice/Pricing evidence unless future ADR/module scope assigns Fulfillment ownership.

### Integration Management vs Fulfillment and Returns

- Integration Management owns external delivery/receipt state, API/webhook/CSV/SFTP/manual transport evidence, carrier/provider callback receipt evidence, provider failures/retries, and external references.
- Fulfillment and Returns owns source-module validation and operational disposition after it receives update evidence or transport references.
- Transport failure does not automatically imply fulfillment failure unless Fulfillment accepts that source-module disposition through its own workflow.
- Fulfillment and Returns may store Integration transport references only as workflow references.

### Logs & Audit vs Fulfillment and Returns

- Fulfillment and Returns owns operational records, validation results, workflow references, and source-module state.
- Logs & Audit owns immutable audit evidence, file tracking, row counts, validation outcome evidence, processing outcome evidence, payload/file references, download evidence, and retention.
- Fulfillment and Returns must not mutate Logs & Audit evidence.

### Notification Platform Service vs Fulfillment and Returns

- Fulfillment and Returns emits shipment/return/exception events and buyer-update-ready signals.
- Notification Platform Service owns scheduled email delivery, recipient resolution, templates, preferences, delivery attempts, retries, delivery status, and notification history.
- Fulfillment and Returns should not store notification delivery state beyond references.

### Pricing vs Fulfillment and Returns

- Pricing owns price calculation, pricing snapshots, adjustment pricing evidence, commercial interpretation, pricing exceptions, and pricing audit.
- Fulfillment and Returns consumes pricing snapshot references and may record vendor-provided refund/adjustment evidence references.
- Fulfillment and Returns must not recalculate price, interpret pricing variance, or decide final refund/adjustment values.

### Invoice Management / Payments vs Fulfillment and Returns

- Invoice Management owns invoice lifecycle, refunds, credits, adjustments, reconciliation, settlement, disputes, and accounting behavior.
- Payment remains outside Fulfillment and Returns.
- Fulfillment and Returns provides shipment, delivery, return receipt, operational disposition, and vendor refund/adjustment evidence references.
- Return receipt, operational acceptance, or vendor refunded amount is not final refund approval, credit application, invoice adjustment, or payment execution.

### Tenant Company vs Fulfillment and Returns

- Tenant Company owns tenant scope, parent/child hierarchy, eligibility, user/entity permissions, vendor/buyer/manufacturer scope, activation/readiness, and relationship signals.
- Fulfillment and Returns consumes explicit scope and permission references.
- Missing, stale, or conflicting tenant scope should produce review, hold, or exception state rather than inferred eligibility.

### Product Catalog / Device Catalog / Media vs Fulfillment and Returns

- Product Catalog owns product records, Product Type definitions, compatibility, product lifecycle, catalog availability evidence, visibility, and product-media attachment acceptance.
- Device Catalog owns canonical Device records and Device References.
- Media owns asset processing, media readiness, transformations, URLs, and media evidence.
- Fulfillment and Returns consumes references and safe operational metadata only.

### AI Agent Services vs Fulfillment and Returns

- Fulfillment and Returns emits risk/review/import-pattern signals.
- AI Agent Services owns recommendations, confidence scores, drafts, and action outcomes.
- AI must not mutate fulfillment/return state, confirm imports, apply corrections, or trigger buyer-facing actions without approved action contracts, permissions, and source-module authority.

## Boundary Risks

- Fulfillment could leak into Order Routing if it changes vendor assignment, routed suborder line truth, or routing snapshots after failed handoff or import mismatch.
- Fulfillment could leak into Integration if it treats transport failure or provider callback as accepted operational state without source-module validation.
- Fulfillment could leak into Logs & Audit if it treats file/download evidence as mutable workflow state.
- Fulfillment could leak into Notification if shipment/return events become recipient/template/delivery ownership.
- Returns could leak into Pricing or Invoice Management if vendor refund evidence becomes final refund, credit, or invoice adjustment.
- Fulfillment could leak into Tenant Company if it infers eligibility from import rows or shipment activity.
- Fulfillment could leak into Product Catalog or Device Catalog if import correction changes SKU, UPC, product, or device source records.
- Carrier callback placeholders could become deep carrier integration ownership without Integration Management boundaries.
- Shipment summaries could flatten partial shipment line evidence if package and line-level references are not preserved.
- Return disposition summaries could flatten partial return line outcomes if line-level quantity evidence is not retained.

## Open Questions

- Which fulfillment import errors are hard blockers versus row-level warnings?
- Which return disposition values can be accepted from vendors at launch?
- Which buyer update signals should be transported by API, webhook, CSV, SFTP, manual download/upload, or scheduled email?
- Which vendor refund/adjustment evidence fields are consumed by Pricing versus Invoice Management?
- Which carrier/provider callback receipts are accepted through Integration Management at launch?
- Which routed suborder line identifiers are required in vendor fulfillment imports versus inferred from source export batch item references?
- Which package or shipment line identifiers are required before split shipment rows can be accepted?
- Which return line identifiers are required before partial return disposition rows can be accepted?

## Vendor Fulfillment Response SLA Boundaries (PR-A)

This section declares the **Fulfillment-Returns side** of additional ownership and consumption boundaries introduced by PR-A's SLA evaluation surface. Existing Fulfillment / Returns boundaries (handoff disposition, fulfillment imports, shipment lines, tracking, returns, replacement shipment, buyer update-ready signals, Integration Management transport, Logs & Audit evidence) remain in force unchanged.

### Vendor Fulfillment Response SLA Policy — ownership

Fulfillment / Returns owns the SLA Policy entity. The Policy is a Fulfillment-Returns-internal configuration object.

Fulfillment-Returns-side rules:

- SLA Policy carries its own cutoff and deadline configuration (`same_day_cutoff_time`, `same_day_response_deadline_time`, `next_business_day_response_deadline_time`).
- SLA Policy **does not reference** Order Routing's Vendor Export Schedule cutoff configuration. The two are conceptually distinct: Order Routing controls when export delivery happens; Fulfillment / Returns controls when vendor response is expected.
- SLA Policy is not vendor-self-service-editable in Phase 1.
- Edits to active Policies produce new versions; SLA Evaluation Records computed against prior versions are not retroactively recomputed.
- Policy retirement is terminal; new evaluations against the retired vendor/route stop.

### SLA Evaluation Record — ownership and consumption

Fulfillment / Returns owns the SLA Evaluation Record entity.

Fulfillment-Returns-side rules:

- An SLA Evaluation Record is created when a confirmed Vendor Export Delivery Evidence is consumed read-only from Order Routing.
- The Evaluation Record references the source Vendor Export Delivery Evidence by reference; it does not embed Order Routing content beyond `delivery_confirmation_timestamp` (which is copied for immutable record).
- Lifecycle (`pending`, `evaluated`, `evaluation_excused`) is Fulfillment-Returns-internal.
- Outcome enumeration (`pending`, `on_time`, `late`, `missing`, `partial`) is Fulfillment-Returns-defined.
- Severity priority (`Late > Missing > Partial > On Time`) is proposal-level; future alignment with existing Fulfillment / Returns severity patterns may refine.

**Consumption boundary — Analytics / Reporting (future):**

- Analytics / Reporting (future Cross-Module Summary Email PR) reads SLA Evaluation Records read-only via the `sla_reporting_reference` field.
- Analytics / Reporting does not mutate SLA Evaluation Records.
- PR-A produces SLA facts; aggregation and dashboard surfaces are not PR-A concerns.

### Late / Missing / Partial Exceptions — ownership

Fulfillment / Returns owns all three Exception entities. They are distinct entities with distinct lifecycles, triggers, and review semantics — not subtypes of a generic Exception entity.

Fulfillment-Returns-side rules:

- Late, Missing, and Partial Exceptions share the same SLA Breach Review State enumeration (`open`, `under_review`, `resolved`, `overridden`, `closed`).
- Late and Partial Exceptions are created by Workflow 5 (On-Time Evaluation) at import receipt time.
- Missing Exceptions are created by Workflow 7 (Missing Detection) by time-driven scan.
- Late-import-after-Missing-Exception causes the Missing Exception to close (state `closed` with audit) and a Late Exception to be created in its place. Missing is not mutated into Late.
- Multiple Exceptions per SLA Evaluation Record are permitted when warranted (Partial + Late on the same suborder, for example).
- Exception state transitions do not mutate Order Routing state.

### SLA Override / Excuse Evidence — ownership

Fulfillment / Returns owns the SLA Override / Excuse Evidence entity. It is immutable after creation.

Fulfillment-Returns-side rules:

- Override / Excuse Evidence is created only by actors holding SLA Override Authority (per `permissions.md`).
- Vendor users cannot create Override / Excuse Evidence.
- Reversal requires a new reversing Override Evidence record. The original is preserved.
- Missing authority (`SLA_OVERRIDE_AUTHORITY_REQUIRED`) and missing audit evidence (`SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING`) are distinct failure modes; they are not mixed.
- Override / Excuse Evidence does not mutate Order Routing state, Integration Management state, Notification Platform state, or any external module's state.

### SLA Breach Signal — direction and ownership

Fulfillment / Returns is the **producer** of the SLA Breach Signal; downstream consumers are read-only.

Fulfillment-Returns-side rules:

- The signal is raised at architecture level when an Exception (Late, Missing, or Partial) is created (Workflows 6, 7, 8).
- The signal is one-way (Fulfillment / Returns → consumers). Consumers do not return signals to Fulfillment / Returns.
- The signal's transport semantics, idempotency, replay, and ordering are deferred to the Boundary/Handoff PR. PR-A names the signal (`fulfillment-returns.sla-breach.signaled`) and describes the contract shape at architecture level only.
- Fulfillment / Returns does not specify notification routing for the signal. Notification Platform Service routing is owned by Notification Platform and is a future Cross-Module Summary Email PR concern.
- Fulfillment / Returns does not specify summary email delivery. Cross-Module Summary Email PR territory.

### Boundary with Order Routing (PR #91)

The most critical boundary in PR-A.

Fulfillment-Returns-side rules:

- Fulfillment / Returns consumes Order Routing's **Vendor Export Delivery Evidence** read-only. Specifically, the `delivery_confirmation_state = confirmed` records and their `export_delivered_timestamp` and `vendor_reference` / `export_batch_reference` / suborder references.
- Fulfillment / Returns does **not** modify, mutate, transition, or create Order Routing records under any path.
- Fulfillment / Returns does **not** produce events that Order Routing subscribes to or consumes.
- Fulfillment / Returns does **not** transition Order Routing's `export_review_required_state`.
- Fulfillment / Returns does **not** transition Order Routing's `delivery_confirmation_state` under any circumstance.
- Fulfillment / Returns does **not** modify `modules/order-routing/vendor-export-fulfillment-handoff-governance.md`. Order Routing PR #91 added a cross-reference from its side; PR-A does not modify Order Routing files for any reason.
- Fulfillment / Returns does **not** redefine, restate, or extend Order Routing PR #91 concepts (Vendor Export Schedule, Window, Delivery Evidence, Delivery Attempt, Operational Review-Required state). Those are referenced read-only.
- PR #91's clarification holds: a confirmed Vendor Export Delivery Evidence means only that delivery evidence was successfully confirmed for the configured delivery method. It does not mean the vendor acknowledged, opened, processed, or accepted operational responsibility for the export. PR-A uses confirmed delivery evidence as the SLA clock-start basis only because the SLA Policy says so; SLA evaluation is about whether the vendor's fulfillment import arrived on time.
- Non-`confirmed` Vendor Export Delivery Evidence states (`pending`, `failed`, `partial`, `unconfirmable`) are not consumed by PR-A. Behavior for those states is the **Boundary/Handoff PR**'s territory.

### Boundary with Integration Management

Fulfillment-Returns-side rules:

- Integration Management owns transport for vendor fulfillment imports.
- Fulfillment / Returns reads Integration-Management-reported transport receipt timestamps via the existing Fulfillment Import entity's transport-receipt field (PR-A adds `fulfillment_import_received_timestamp` as a field on the existing entity).
- Fulfillment / Returns does not modify Integration Management retry policy, transport mechanics, or import receipt event semantics.
- Integration Management is the source of truth for transport receipt; Fulfillment / Returns captures the timestamp without modification.

### Boundary with Notification Platform Service

Fulfillment-Returns-side rules:

- Notification Platform Service owns notification delivery and escalation delivery.
- PR-A raises the SLA Breach Signal at architecture level; PR-A does **not** specify how the signal becomes an email, Slack message, page, or other notification.
- PR-A does not specify recipient resolution, channel preference, or notification suppression. Those are Notification Platform / Tenant Company recipient-scope concerns.
- PR-A does not modify Notification Platform Service files.

### Boundary with Tenant Company

Fulfillment-Returns-side rules:

- Tenant Company owns `check_access` for authority resolution (SLA Override Authority, SLA Configuration Authority).
- Tenant Company owns vendor scope. SLA Policy `vendor_reference` resolves through Tenant Company.
- Tenant Company owns (or future platform standard owns) the business calendar. SLA Policy carries `business_calendar_reference` as a reference field only.
- PR-A does not modify Tenant Company files.
- PR-A does not validate vendor identity inside Fulfillment / Returns; that is Tenant Company territory.

### Boundary with Logs & Audit

Fulfillment-Returns-side rules:

- Every SLA Policy creation, edit, supersession, retirement produces a Logs & Audit reference.
- Every SLA Evaluation Record creation and state / outcome transition produces a Logs & Audit reference.
- Every Exception creation, state transition, and resolution produces a Logs & Audit reference.
- Every SLA Override / Excuse Evidence creation and reversal produces a Logs & Audit reference.
- Logs & Audit owns immutable retention; PR-A produces references.
- Retention period for SLA artifacts is deferred to Logs & Audit retention policy (PR-A OQ 10).

### Boundary with Analytics / Reporting

Fulfillment-Returns-side rules:

- Analytics / Reporting will eventually consume SLA Evaluation Records and Exceptions read-only via `sla_reporting_reference` for summary aggregation, dashboards, and vendor performance views.
- PR-A does not introduce analytics queries, aggregation logic, or reporting surfaces.
- Cross-Module Summary Email PR is the formal join between SLA facts and aggregation.
- Analytics / Reporting does not mutate Fulfillment / Returns SLA records under any path.
- PR-A does not modify Analytics / Reporting files.

### Boundary with Invoice Management (future)

Fulfillment-Returns-side rules:

- Future Invoice Management may consume SLA breach state for vendor commission or performance calculations.
- PR-A explicitly **does not enable** this linkage. SLA breach state is produced as a fact; how (or whether) it feeds into commissions is a future PR's concern requiring careful coordination.
- PR-A does not modify Invoice Management files.
- PR-A does not produce invoice-related events or signals.

### Boundary with Pricing (future)

Fulfillment-Returns-side rules:

- Same as Invoice Management — possible future linkage; PR-A does not enable.
- PR-A does not modify Pricing files.

### What PR-A does NOT touch

- Order Routing files (any file under `modules/order-routing/`).
- Integration Management files.
- Notification Platform Service files.
- Tenant Company files.
- Logs & Audit files.
- Analytics / Reporting files.
- Invoice Management files.
- Pricing files.
- Product Catalog and Device Catalog files.
- ADRs.
- Platform standards.
- Runtime / code / schema / migration files.
- `modules/fulfillment-returns/openapi-contracts.md`.

### Cross-reference: where PR-A boundaries connect to other-module specs

- **Order Routing** — Vendor Export Delivery Evidence (Order Routing-owned per PR #91) is read-only consumed by Fulfillment / Returns Workflow 2. The explicit transport semantics of consumption (event payload, idempotency, replay, ordering, behavior for non-`confirmed` states) is the **Boundary/Handoff PR** scope.
- **Integration Management** — transport-receipt timestamp source; PR-A reads via existing Fulfillment Import entity.
- **Notification Platform Service** — consumes SLA Breach Signal in a future Cross-Module Summary Email PR; PR-A produces the signal only at architecture level.
- **Logs & Audit** — owns retention for all PR-A audit references.
- **Tenant Company** — owns authority resolution (`check_access`), vendor scope, business calendar reference.
- **Analytics / Reporting** — future consumer via `sla_reporting_reference`.
- **Invoice Management** — future-only boundary; PR-A does not enable.
- **Pricing** — same.

## Cross-Module Handoff Boundaries (Boundary/Handoff PR)

This section codifies the **consumer-side** boundary contract for the Order Routing -> Fulfillment / Returns handoff. It complements the producer-side contract documented in `modules/order-routing/boundary-contracts.md`. Together the two sides specify the seam without duplicating its description.

The handoff is read-only. Fulfillment / Returns consumes Order Routing's Vendor Export Delivery Evidence via reference and produces a Fulfillment / Returns-owned Cross-Module Handoff Record. No Order Routing state is mutated. No new events are introduced on either side; the handoff is contracted around the existing PR #91 and PR #92 events.

### Vendor Export Delivery Evidence - consumption contract

Fulfillment / Returns reads Order Routing's Vendor Export Delivery Evidence read-only. The consumption contract:

- **Read-only.** Fulfillment / Returns does not modify any Order Routing field under any path, including the source `delivery_confirmation_state`, `export_review_required_state`, or any Delivery Attempt outcome.
- **Reference-only.** The Handoff Record carries a `source_evidence_snapshot_reference` that identifies *which* version / state of the source Delivery Evidence was consumed. The reference is identity-only; the source's content is not embedded or copied. Reading source content requires reading Order Routing's record by reference.
- **Idempotent.** Duplicate observation of the same source event for the same consumer scope resolves to the existing Cross-Module Handoff Record. No duplicate SLA Evaluation Record is produced.
- **Replay-safe.** Replayed source events are acknowledged as audit references on existing Handoff Records. Canonical state (notably `consumed`) is not replaced by replay.
- **Eligibility-checked.** Confirmed source Delivery Evidence does not automatically produce an SLA Evaluation Record. The Fulfillment SLA Handoff Eligibility contract rule below governs whether a `consumed` Handoff Record is produced or whether the record terminates in `consumption_skipped`.
- **No-acceptance-implication.** Confirmed source Delivery Evidence asserts only transport-layer confirmation per PR #91. The consumer side does not interpret confirmed source evidence as vendor operational acceptance.

### Fulfillment SLA Handoff Eligibility - contract rule

A confirmed source Vendor Export Delivery Evidence produces a `consumed` Cross-Module Handoff Record only when **all** of the following eligibility conditions are satisfied at consumption time:

- **E1. Source confirmation.** Source `delivery_confirmation_state` is `confirmed` at observation time. Source state `failed`, `unconfirmable`, or `partial` is handled by the Non-Confirmed Delivery Evidence Handling rule below and does not produce a `consumed` record.
- **E2. Active SLA Policy.** A Vendor Fulfillment Response SLA Policy (PR #92) is in `active` state for the suborder's vendor at the consumption time. PR #92's SLA Policy versioning means the active version at consumption time is the version captured on the SLA Evaluation Record; subsequent SLA Policy edits do not retroactively re-evaluate existing Handoff Records (replay-time eligibility invariant).
- **E3. Vendor-in-scope.** The source Delivery Evidence's vendor is within the Tenant Company scope authorized for SLA evaluation. Out-of-scope vendor produces `consumption_skipped`.
- **E4. Route/suborder SLA-evaluatable.** The suborder context is included in the Phase 1 SLA-evaluation inclusion list. Routes / suborder types excluded from Phase 1 SLA evaluation produce `consumption_skipped`.
- **E5. Phase 1 consumer scope.** The Handoff Record is created with `consumer_scope_reference = fulfillment-returns.sla-evaluation`. Phase 1 supports only this consumer scope; the field's structure permits future consumer scopes without contract changes.

If any eligibility condition fails:

- A Handoff Record is created in `consumption_skipped` state.
- The eligibility-failure reason category is captured in `handoff_eligibility_decision_reference` (e.g., `no_active_sla_policy`, `vendor_out_of_scope`, `route_not_sla_evaluatable`, `consumer_scope_unknown`).
- **No SLA Evaluation Record is produced.**
- **The source event is not silently dropped** - every observed confirmed source event produces an observable Handoff Record. The skip rationale is audit-visible.

Eligibility evaluation is performed once, at the moment the Handoff Record is created. Replay-time eligibility invariant: subsequent SLA Policy edits do not re-evaluate eligibility on existing Handoff Records. The original decision is honored.

### Non-Confirmed Delivery Evidence Handling - contract rule

Phase 1 disposition for source Delivery Evidence in non-`confirmed` states:

- **Source state `pending`:** No Handoff Record created. Fulfillment / Returns waits for `confirmed` or non-`confirmed` terminal observation. This is the default state before any source event is published.
- **Source state `confirmed`:** Workflow A (Handoff Receipt) runs. Eligibility evaluation determines `consumed` vs. `consumption_skipped`.
- **Source state `partial`:** Workflow B (Non-Confirmed Delivery Evidence Handling) runs. Handoff Record transitions to `consumption_held`. **No SLA Evaluation Record is created.** **No SLA clock starts.** **No SLA Exception is created solely from partial source delivery.** Future SLA Policy may opt into partial-delivery-starts-clock semantics in a later PR; Phase 1 does not.
- **Source state `failed`:** Workflow B runs. Handoff Record transitions to `consumption_skipped` with audit reason `source_failed`. No SLA Evaluation Record.
- **Source state `unconfirmable`:** Workflow B runs. Handoff Record transitions to `consumption_skipped` with audit reason `source_unconfirmable`. No SLA Evaluation Record.

This rule resolves Fulfillment / Returns PR #92 Open Question C (PR-A OQ C: "SLA evaluation when Order Routing Delivery Evidence is `unconfirmable`, `failed`, or `partial`"). The Phase 1 disposition is conservative; no SLA clock starts from non-`confirmed` source evidence.

### Handoff Ordering - contract rule

- **At-least-once.** Source events are delivered at least once. Duplicate delivery is expected; consumers must be idempotent.
- **In-order-best-effort.** Order Routing publishes events in their natural source-state-machine order (`created -> confirmed` or `created -> failed`). Transport (Integration Management) may reorder across different source Delivery Evidences; ordering within a single source Delivery Evidence's lifecycle is naturally preserved by PR #91's source state machine.
- **Stale event arrival is safe.** A Handoff Record in `consumed` state remains `consumed` regardless of subsequent observation of stale source events for the same idempotency key. PR #91's terminal-once-confirmed invariant means stale `failed` after `confirmed` for the same source Delivery Evidence is impossible at the source; the contract is nevertheless safe under arbitrary transport reordering.
- **Out-of-order observation does not punish consumers.** Workflow A and Workflow B's idempotency lookup and state-transition discipline handle arbitrary ordering at the transport layer.

The four bullets above together constitute the **Handoff Ordering Rule** (contract rule per scoping decision #1). It is not an entity, field, or state; it is the codified architecture-level commitment that consumers must remain correct under at-least-once delivery, best-effort source ordering, and arbitrary transport reordering across distinct source Delivery Evidences.

### Boundary declarations

#### Order Routing - producer of source evidence

- Order Routing **owns** the source Vendor Export Delivery Evidence, its `delivery_confirmation_state` lifecycle, and the publication of `order-routing.export-delivery-evidence.created` / `.confirmed` / `.failed` events (PR #91).
- Order Routing **does not own** the Cross-Module Handoff Record, the consumption state machine, the SLA Evaluation Record, or any SLA evaluation logic.
- Order Routing **does not mutate** Fulfillment / Returns state.
- Order Routing **does not consume** Fulfillment / Returns events. The handoff is one-way producer -> consumer.
- Order Routing's publication contract: at-least-once delivery, in-order-best-effort, payload reference stability post-emission. The contract is reaffirmed on the Order Routing side in `modules/order-routing/boundary-contracts.md` and `modules/order-routing/event-contracts.md`.

#### Fulfillment / Returns - consumer

- Fulfillment / Returns **owns** the Cross-Module Handoff Record, its consumption state machine, eligibility evaluation, non-confirmed handling, replay acknowledgement, and SLA Evaluation Record creation upon `consumed` state.
- Fulfillment / Returns **reads** Order Routing's Vendor Export Delivery Evidence read-only.
- Fulfillment / Returns **does not mutate** Order Routing state under any path.
- Fulfillment / Returns **does not produce** events Order Routing consumes.
- Fulfillment / Returns is the consumption-truth source for SLA evaluation. The Handoff Record in `consumed` state is authoritative; the SLA Evaluation Record bound to it is authoritative.

#### Integration Management - transport

- Integration Management **owns** transport mechanics for source event delivery from Order Routing to Fulfillment / Returns, including broker / queue mechanics, retry policy, dead-letter handling, and replay machinery.
- Integration Management **owns** at-least-once delivery semantics. Bounded replay window duration is Integration Management transport policy; this PR does not specify duration.
- Integration Management **does not own** consumer-side idempotency, eligibility evaluation, or Handoff Record state. Those are Fulfillment / Returns concerns.
- This PR does not modify Integration Management files.

#### Logs & Audit - retention

- Logs & Audit **owns** immutable retention of Handoff Record state transitions, eligibility decision rationale, failure / retry audit references, and the audit-trail join between source event ID and Handoff Record.
- Fulfillment / Returns produces audit references; Logs & Audit retains.
- Retention policy duration is Logs & Audit territory; this PR does not specify duration.
- This PR does not modify Logs & Audit files.

#### Tenant Company - scope

- Tenant Company **owns** tenant / vendor scope used in Eligibility condition E3 (vendor-in-scope), `check_access` patterns (no new authority classes introduced by this PR; existing patterns apply), and recipient / role scope used elsewhere.
- This PR does not modify Tenant Company files.

#### Notification Platform Service - out of scope for this PR

- Notification Platform Service **does not own** this handoff.
- Future Cross-Module Summary Email PR may consume Handoff Record state (specifically `consumption_failed` rate, `consumption_held` count, `replay_acknowledged` rate) for summary email surfaces. That consumption is one-way Fulfillment / Returns -> Notification Platform; this PR does not contract it.
- This PR does not modify Notification Platform Service files. This PR does not produce notification deliveries.

#### Analytics / Reporting - out of scope for this PR

- Analytics / Reporting **does not own** this handoff. It may consume Handoff Record state in a future Cross-Module Summary Email PR or a future Analytics aggregation PR.
- This PR does not modify Analytics / Reporting files. This PR does not produce analytics aggregations.

#### Invoice Management - no linkage in this PR

- This PR does not introduce linkage between Handoff Records / SLA Evaluation Records and Invoice Management state. Future PRs may use SLA outcomes (PR #92) for commission calculations; the Handoff Record is the seam those future PRs would consult.
- This PR does not modify Invoice Management files.

#### Pricing - no linkage in this PR

- Same as Invoice Management. No linkage in this PR.
- This PR does not modify Pricing files.

### What this PR does NOT do - boundary affirmations

- Does not introduce new events on either side.
- Does not modify Order Routing data model.
- Does not modify Order Routing workflows.
- Does not modify Order Routing events.
- Does not modify Order Routing permissions.
- Does not modify Order Routing API contracts.
- Does not modify Fulfillment / Returns events.
- Does not modify Fulfillment / Returns permissions.
- Does not modify Fulfillment / Returns API contracts.
- Does not modify Fulfillment / Returns spec.md.
- Does not introduce buyer-facing Delivery Date behavior. Fulfillment / Returns PR-B.
- Does not introduce shipment / tracking validation behavior.
- Does not introduce return operational behavior.
- Does not introduce invoice / refund / payment state.
- Does not introduce pricing behavior.
- Does not introduce scheduled System Admin Activity Summary Emails. Cross-Module PR.
- Does not introduce notification delivery workflow.
- Does not introduce Analytics dashboards.
- Does not introduce runtime code, database migrations, finalized OpenAPI schemas, or broker/queue mechanics.

<!-- BOUNDARY/HANDOFF PR APPEND ANCHOR -->
## Delivery Date and Buyer Update Boundaries (PR-B)

This section declares the Fulfillment / Returns side of the boundary surface for the delivery-date and buyer-update hardening pass. Boundary partners (Integration Management, Logs & Audit, Tenant Company, Notification Platform Service, Analytics / Reporting, Order Routing, Invoice Management, Pricing) are not modified by this PR; their content remains owned by their respective modules.

### Fulfillment / Returns owns (PR-B additions)

- Delivery Date Evidence entity, lifecycle, validation outcomes, source-agnostic naming.
- Delivered Shipment Evidence as field extensions on existing Shipment Line (`delivered_shipment_evidence_reference`, `delivered_at_timestamp`).
- Delivery Date Correction Evidence entity, lifecycle, immutability, authority-gating.
- Buyer Update-Ready Signal entity, lifecycle, `update_kind` discriminator (shipment, delivery, correction), suppression / hold state, dispatch / acknowledgement / failure references.
- Multi-Vendor / Multi-Suborder Buyer Update Rule with Phase 1 default of all-vendors aggregation.
- Buyer Update Eligibility contract rule, Hold / Suppression state, and re-evaluation workflow.
- Stale Delivery Update Rejection Rule, Duplicate Delivery Update Handling Rule, Out-of-Order Shipment Update Handling Rule.
- Delivery Date Override / Correction Authority (extended or new, per permissions.md).
- All workflow logic described in workflows.md PR-B section.

### Fulfillment / Returns does not own (PR-B reaffirmations)

- Buyer-update transport mechanics, retry policy, broker / queue mechanics, dead-letter handling, replay machinery. Integration Management owns these.
- Buyer integration profile configuration (endpoint URL, authentication, transport protocol, per-buyer payload format). Integration Management owns the profile; Fulfillment / Returns carries `buyer_integration_profile_reference` only.
- Buyer-system credentials, TLS, retry tuning.
- Notification delivery for buyer-update outcomes or summaries. Notification Platform Service is not in scope for PR-B.
- Analytics aggregation of buyer-update lifecycle facts. Analytics / Reporting is a future consumer.
- Logs & Audit retention policy. Fulfillment / Returns produces audit references; Logs & Audit owns retention duration and storage.
- Tenant Company scope, vendor scope, buyer scope, `check_access` patterns. Fulfillment / Returns reads these by reference and never mutates Tenant Company state.
- Carrier-originated tracking and delivery evidence. Phase 1 source is vendor-submitted only; future carrier integration is anticipated by source-agnostic naming but not implemented.
- Order Routing records, events, schedule, window, delivery evidence. PR #91 records are not accessed by PR-B; the cross-module handoff from PR #93 is separate from PR-B's flow.
- SLA Policy, SLA Evaluation Record, Late / Missing / Partial Exception, SLA Override / Excuse Evidence, SLA Breach Signal. PR #92 owns these; PR-B does not modify them.
- Invoice Management, Pricing, Product Catalog, Device Catalog state. No linkage in this PR.

### PR #92 SLA-semantics preservation (critical invariant)

PR-B preserves PR #92's SLA semantics unconditionally. The following invariants are restated here for boundary-contract clarity:

- **Fulfillment Import Received Timestamp is the SLA-relevant timestamp.** This timestamp is captured at transport receipt by Integration Management and recorded on the existing Fulfillment Import entity. PR #92 reads this timestamp for SLA Evaluation Record outcome determination.
- **PR-B's Delivery Date validation outcomes do not retroactively change PR #92's SLA outcome.** A Fulfillment Import that arrives on time (per the Expected Fulfillment Response Deadline) but whose Delivery Date field fails PR-B's validation rules remains on-time for SLA purposes. The SLA Evaluation Record outcome (`on_time`, `late`, `missing`, `partial`) reflects timing of the response, not content validity.
- **PR-B's Delivery Date validation outcomes do not silently become valid shipment or delivery evidence.** A rejected Delivery Date Evidence does not produce Delivered Shipment Evidence, does not transition Shipment Status, and does not produce a Buyer Delivery Update-Ready Signal. The content side of the response is rejected even when the timing side is on-time.
- **PR-B does not produce, modify, or transition any PR #92 entity, event, or contract.** The SLA Policy lifecycle, SLA Evaluation Record lifecycle, three Exception types, SLA Override / Excuse Evidence, SLA Breach Review State, and SLA Breach Signal are unmodified.

### Integration Management boundary (buyer-update transport)

Fulfillment / Returns hands off Buyer Update-Ready Signal records in `eligible` state to Integration Management for transport to the buyer's internal system. The boundary is:

- **Fulfillment / Returns produces:** the Buyer Update-Ready Signal record reference, the `buyer_integration_profile_reference`, and (implicitly via the signal record) the references to source Shipment Lines, parent order, Tenant Company / buyer scope, and any triggering Delivery Date Evidence or Delivery Date Correction Evidence.
- **Integration Management consumes:** the signal reference. Integration Management is responsible for resolving the buyer integration profile, formatting the payload per buyer profile rules, transporting the payload via the configured method (HTTP, SFTP, webhook, scheduled email, manual download, or other), retrying per its own retry policy, and dead-lettering on exhaustion.
- **Integration Management produces (back to Fulfillment / Returns by reference):** a dispatch attempt record (referenced via `buyer_update_dispatch_reference`), an acknowledgement record on success (referenced via `buyer_update_acknowledgement_reference`), or a failure record on exhaustion (referenced via `buyer_update_failure_reference`).
- **The references are reference-only.** Fulfillment / Returns does not embed Integration Management record content; it stores the reference and reads through it for audit and operator visibility.
- **The transport mechanism is not specified by PR-B.** PR-B does not constrain whether dispatch is in-process, message-broker-backed, polling-based, or anything else. PR-B's contract is at the architectural reference level.

**Buyer Update-Ready does not equal buyer update delivered.** The signal lifecycle states `pending`, `held`, `eligible`, `dispatched`, `acknowledged`, `failed` are independently observable. `eligible` indicates Fulfillment / Returns has marked the update ready for transport; `dispatched` indicates Integration Management has accepted the request; `acknowledged` indicates the buyer system confirmed receipt. Only `acknowledged` constitutes evidence of buyer delivery. PR-B does not collapse these states.

### Logs & Audit boundary

- Logs & Audit owns immutable retention of: Delivery Date Evidence lifecycle transitions; validation outcomes; Delivered Shipment Evidence reference updates on Shipment Lines; Delivery Date Correction Evidence lifecycle transitions; Buyer Update-Ready Signal lifecycle transitions; hold-state transitions; dispatch / acknowledgement / failure reference captures; correction supersession references.
- PR-B produces `audit_reference` fields on every new entity. Logs & Audit retains the underlying records.
- Retention duration, audit storage location, and audit query semantics are Logs & Audit concerns; PR-B does not specify them.

### Tenant Company boundary

- Tenant Company owns buyer scope, vendor scope, and `check_access` patterns.
- Tenant Company owns the buyer-level pause flag consumed by Buyer Update Eligibility's `held_buyer_integration_paused` hold reason.
- Tenant Company `check_access` resolves Delivery Date Override / Correction Authority for Workflow 6 (Delivery Date Correction Evidence).
- A parent order belongs to exactly one Tenant Company / buyer scope. Buyer Update-Ready Signal aggregation never crosses tenant boundaries.
- PR-B does not modify Tenant Company files. References to buyer scope and `check_access` are read-only.

### Notification Platform Service boundary

- Notification Platform Service is not in scope for buyer-update transport in PR-B. Buyer updates are transported by Integration Management per the buyer integration profile.
- A future PR (Cross-Module Summary Email PR or a future buyer-side notification PR) may configure Notification Platform delivery for buyer-side summary or per-buyer notification of buyer-update outcomes. PR-B does not introduce or enable this.
- PR-B does not modify Notification Platform Service files.

### Analytics / Reporting boundary

- Analytics / Reporting is a future consumer of Buyer Update-Ready Signal lifecycle facts, Delivery Date Evidence validation outcomes, and correction-evidence facts.
- The Cross-Module Summary Email PR is the planned aggregation point for held-state counts by reason, correction rates by vendor, dispatch / acknowledgement / failure rates by buyer.
- PR-B does not introduce Analytics aggregation, dashboards, or read models. PR-B produces the facts; future PRs aggregate them.
- PR-B does not modify Analytics / Reporting files.

### Order Routing boundary

- PR-B does not access Order Routing records or events. PR-B operates on vendor Fulfillment Imports (inbound to Fulfillment / Returns from vendors), which are distinct from Order Routing's outbound Vendor Export Delivery Evidence flow established by PR #91.
- The cross-module handoff established by PR #93 (Cross-Module Handoff Record consuming Order Routing's `order-routing.export-delivery-evidence.confirmed`) is unrelated to PR-B's delivery-date and buyer-update flow.
- PR-B does not modify any Order Routing file.

### Invoice Management and Pricing boundary

- No linkage in PR-B. Late or failed buyer updates do not feed into commission calculations, pricing decisions, or invoice state via this PR. Future PRs may introduce such linkages with explicit scope.
- PR-B does not modify Invoice Management or Pricing files.

### Product Catalog and Device Catalog boundary

- No linkage in PR-B.
- PR-B does not modify Product Catalog or Device Catalog files.

---

### Files this PR does NOT touch

For boundary clarity, the following files are explicitly outside PR-B scope:

- Any file under `modules/order-routing/` (including `vendor-export-fulfillment-handoff-governance.md`).
- Any file under `modules/integration-management/` or equivalent.
- Any file under `modules/notification-platform-service/` or equivalent.
- Any file under `modules/tenant-company-model/` or equivalent.
- Any file under `modules/logs-audit-file-tracking/` or equivalent.
- Any file under `modules/analytics-reporting/` or equivalent.
- Any file under Invoice Management, Pricing, Product Catalog, Device Catalog, or AI Agent Services modules.
- `modules/fulfillment-returns/openapi-contracts.md`.
- `modules/README.md`.
- Any ADR under `architecture/decisions/`.
- Any platform standard under `architecture/standards/`.
- Any code, schema, migration, or runtime file.

---

### Phase 1 conservative defaults summary

- Delivery Date Evidence source = vendor-submitted only (Fulfillment Imports). Carrier evidence anticipated by source-agnostic naming; not implemented.
- Multi-Vendor / Multi-Suborder Buyer Update Rule default = all-vendors aggregation. Per-buyer configurability anticipated by `buyer_integration_profile_reference`; not implemented.
- Vendor self-service correction after Delivered state = excluded.
- Manual buyer-update hold = authority-gated; vendor users excluded.
- SLA semantics from PR #92 = unchanged by PR-B content validation.
- Notification Platform delivery of buyer updates or summaries = out of scope; future PR.
- Analytics aggregation = out of scope; future PR.
- Carrier-vs-vendor conflict resolution = out of scope; future PR.

These defaults are conservative and matched to the architectural decisions confirmed during PR-B scoping. Future PRs may relax them with explicit scope.
