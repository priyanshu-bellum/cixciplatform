# Order Routing Boundary Contracts

This document is proposal-level architecture. It clarifies Order Routing boundaries without finalizing business rules or moving Pricing, Product Catalog, Device Catalog, Tenant Company, Fulfillment, Returns, Invoice Management, Warranty Management, Procurement, Integration Management, Notification Platform Service, Logs & Audit, AI Agent Services, or Analytics responsibilities into Order Routing.

## What Order Routing May Answer

- How an accepted buyer order is decomposed into routeable order lines and suborder groups.
- Which Routing Policy Version and Routing Rules apply to a routing decision, within Order Routing-owned policy scope.
- Which vendor or manufacturer placeholder is assigned to a routed order line.
- Whether one parent order must be split across multiple vendors, manufacturers, Product Types, or fulfillment targets.
- What routed order record, vendor suborder, manufacturer suborder placeholder, routing decision record, or routing snapshot exists.
- What vendor routed-suborder export eligibility record exists.
- Which routed suborders are eligible for a vendor order export batch according to Order Routing-owned export inclusion rules.
- What vendor order export batch, export batch item, export content reference, export schema version, export inclusion rule version, buyer/retailer split reference, re-export request, export status reference, manual download reference, or fulfillment handoff request exists.
- What per-routed-suborder export batch item disposition exists, including included/excluded status, prior export membership, re-export reason, duplicate prevention key, source event/version, and resulting handoff request reference.
- What Fulfillment/Returns disposition reference is recorded against an Order Routing handoff request.
- What routing exception, exception family, retry state, manual review state, or supersession state exists.
- What downstream fulfillment instruction placeholder or routing-to-fulfillment handoff request should be handed off to Fulfillment/Returns.
- Whether a routed order line carries a warranty registration required signal placeholder.
- What routing events, vendor export events, handoff request events, and AI Agent Services routing signals are emitted.

## What Order Routing Must Not Answer

- Whether a tenant, buyer, parent company, child entity, user, relationship, region, Product Type, or licensed property is eligible outside Tenant Company signals.
- Which Product Catalog product records exist, what Product Type validation applies, what category validation applies, or which products are visible/activated/downloaded.
- What canonical Device record exists or how Device References are normalized, merged, split, exported, deprecated, or redirected.
- What final price, quote, discount, commission, margin, pricing exception, or price snapshot should be calculated.
- Whether payment is authorized or captured.
- Whether Fulfillment/Returns has accepted operational execution except as a Fulfillment-owned disposition reference.
- Whether fulfillment has shipped, returned, replaced, delivered, failed, selected a carrier/warehouse execution path, received a tracking number, generated a tracking URL, or accepted a vendor fulfillment import as operational state.
- Whether an external vendor export was delivered, received, retried, quarantined, or acknowledged by a provider or external system.
- Whether a scheduled vendor export email was delivered, bounced, retried, suppressed, or opened.
- What immutable file/export/download evidence, file retention, row counts, or audit evidence exists outside Order Routing-owned export references.
- Whether an invoice is issued, paid, reconciled, disputed, credited, adjusted, or corrected.
- Whether a warranty claim is approved, denied, fulfilled, or registered with a vendor system.
- Whether a purchase order is approved, submitted, received, reconciled, or invoiced.
- What Analytics reporting definitions, rollups, or metrics mean.

## Boundary Splits

### Tenant Company vs Order Routing

- Tenant Company owns tenant scope, parent/child hierarchy, buyer/entity readiness, relationship eligibility, geography eligibility, Product Type enablement, licensed-property scope, user/entity access, admin exceptions, vendor/user export permissions, manual download authority, re-export authority, and schedule authority.
- Order Routing consumes explicit scope and readiness signals but must not derive eligibility if Tenant Company does not provide it.
- Missing, denied, stale, or conflicting Tenant Company scope should produce routing exception, export eligibility exception, manual download exception, re-export exception, or review-required state.

### Product Catalog / Device Catalog vs Order Routing

- Product Catalog owns product records, Product Type definitions, Product Type validation, Category Validation Profile behavior, product-level visibility, activation/download, compatibility assertions, warranty product facts, and stop-sell/deactivation records.
- Device Catalog owns canonical Device records, Device References, device lifecycle, and device identity.
- Order Routing consumes references and routability signals, not full source records.
- Product not routable, unsupported Product Type, invalid Product Catalog reference, invalid Device Reference, or stop-sell state should produce routing exception or review-required state.

### Pricing vs Order Routing

- Pricing owns calculation, quote-like results, price snapshots, order-bindable pricing evidence, pricing exceptions, and pricing audit.
- Order Routing consumes pricing snapshots and must not recalculate price, alter price snapshots, or resolve pricing conflicts.
- Missing, stale, rejected, invalid, or non-order-bindable price snapshot should block routing or create review-required state.

### Fulfillment / Returns vs Order Routing

- Order Routing may produce downstream fulfillment instruction placeholders, fulfillment handoff requests, target references, and vendor routed-suborder export records.
- Fulfillment/Returns owns fulfillment handoff acceptance/rejection/disposition, shipment execution, return execution, replacement shipment execution, tracking numbers, tracking URLs, shipped dates, delivered dates, carrier behavior, vendor fulfillment imports, and operational fulfillment exceptions.
- Routing output, vendor export generation, and `order.routing.fulfillment-handoff.requested` are not proof that fulfillment has accepted or executed.
- Order Routing may store Fulfillment/Returns disposition references, source version, accepted/rejected/ignored state, and applied-vs-ignored state for handoff review only.
- Missing, duplicate, stale, rejected, or ignored Fulfillment/Returns disposition should not be treated as fulfilled, shipped, delivered, or accepted.
- Fulfillment/Returns records vendor fulfillment updates. Order Routing must not update shipment status, delivered status, tracking URL, return status, refund evidence, or fulfillment execution state.

### Integration Management vs Order Routing

- Order Routing owns vendor routed-suborder export eligibility, export batch/item workflow references, re-export requests, manual download workflow references, handoff requests, and vendor order export content references.
- Integration Management owns external connection state, delivery/receipt evidence, provider failures, retry state, API/webhook/CSV/SFTP/manual transport evidence, external references, and integration failure tracking.
- Order Routing emits vendor routed-suborder export records; Integration Management transports updates and records delivery/receipt evidence where external delivery is used.
- Provider failure does not automatically mutate Order Routing state unless Order Routing accepts a source-module disposition through its own review/exception workflow.

### Notification Platform Service vs Order Routing

- Order Routing may emit events or references that trigger scheduled vendor export emails.
- Notification Platform Service owns scheduled email delivery, recipient delivery status, notification history, provider response references, suppression, and retry behavior.
- Scheduled email delivery failure is not a routing decision unless Order Routing separately records a review-required export disposition.

### Logs & Audit vs Order Routing

- Order Routing owns routing snapshots, routing decision evidence, vendor export eligibility records, export batch/item workflow references, export content references, manual download workflow references, and handoff request references.
- Logs & Audit owns immutable file/export/download evidence, row counts, file references, validation summaries, processing summaries, audit search, retention, redaction metadata, and compliance review.
- Order Routing should reference Logs & Audit evidence rather than owning centralized file retention.

### Warranty Support vs Order Routing

- Order Routing may carry or emit `warranty.registration.required` when a routed line includes warranty registration requirements.
- Product Catalog owns warranty product facts. Vendor integrations own vendor registration delivery. Buyer-facing modules own customer warranty UX. Fulfillment/Returns owns replacement execution where applicable.
- Order Routing does not own warranty claim lifecycle or vendor warranty systems.

### Procurement vs Order Routing

- Order Routing may preserve manufacturer suborder placeholders or future procurement references.
- Future Procurement / Purchase Orders owns PO approval, lifecycle, submission, receiving, procurement reconciliation, and procurement financial controls.
- Manufacturer assignment in routing must not become procurement workflow ownership.

### Analytics vs Order Routing

- Order Routing owns routing and vendor export events as source events.
- Analytics may consume routing and vendor export events and snapshots but owns reporting definitions and rollups.

## Routing Precedence Boundary

Proposal-level precedence should protect ownership boundaries:

1. Exception blockers stop execution before route target selection.
2. Tenant Company scope must be explicit before Order Routing uses buyer/entity, relationship, region, Product Type, licensed-property context, vendor export permission, or manual download authority.
3. Pricing snapshot availability must be valid before suborder creation; Order Routing must not recalculate price.
4. Product Type may select routing capability, but Product Catalog owns Product Type definitions.
5. Vendor/manufacturer target rules run only after eligibility, product/device references, and price snapshot references are valid.
6. Fulfillment target availability gates handoff placeholders but does not become fulfillment execution.
7. Vendor export eligibility runs after routed suborders and routing snapshots exist and must not rewrite routing decisions.
8. Vendor export batch items enforce per-routed-suborder included/excluded disposition and duplicate prevention before export generation.
9. Re-export requires explicit request, reason, prior membership references, and authorization before replacement export generation.
10. Fulfillment handoff request records remain requests until Fulfillment/Returns disposition references are recorded.
11. Warranty registration requirement may create signal, blocker, or review state per policy, but not warranty claim lifecycle.
12. Manual override may supersede a route only through approved snapshot supersession, never by rewriting prior evidence.

## Boundary Risks

- Order Routing could leak into Pricing if it recalculates price after split decisions or export generation.
- Order Routing could leak into Tenant Company if it infers buyer/entity eligibility, Product Type enablement, licensed-property scope, relationship approval, vendor download authority, or export schedule authority.
- Order Routing could leak into Product Catalog if it decides Product Type validation, product visibility, activation/download, compatibility, or warranty terms.
- Order Routing could leak into Fulfillment if routing output, vendor export generation, handoff request, or Fulfillment disposition reference becomes shipment status, tracking URL, delivered date, vendor fulfillment import state, or warehouse execution state.
- Order Routing could leak into Integration Management if it owns external delivery, receipt, provider retries, or external acknowledgement state.
- Order Routing could leak into Notification if it owns scheduled email delivery status or notification history.
- Order Routing could leak into Logs & Audit if it owns immutable file/download evidence or centralized retention beyond routing/export references.
- Order Routing could leak into Invoice Management if routing snapshots become invoices, credits, adjustments, or reconciliation records.
- Order Routing could leak into Warranty if registration signals become claim approval or vendor warranty system ownership.
- Order Routing could leak into Procurement if manufacturer suborder placeholders become purchase orders.
- Order Routing could leak into Analytics if routing events start defining reporting metrics or rollups.

## Open Questions

- Which module owns the accepted parent order before routing begins?
- Which routing decisions must be synchronous before checkout completion?
- Which routing exceptions are retryable versus manual review only?
- Which Product Type-specific routing rules are fixed versus configurable?
- Which downstream modules require full snapshots versus references and event lookups?
- Which Routing Policy changes require approval and downstream notification?
- Which vendor export schedules, CSV fields, re-export rules, split-by-buyer rules, and manual download permissions are supported at launch?
- Which Fulfillment/Returns disposition references should Order Routing store or emit for handoff review?
- Which delivery failures should Integration Management keep as transport-only evidence versus send back to Order Routing as review-required disposition?

## Vendor Export Schedule and Delivery Evidence Boundaries (PR-A)

This section declares the **Order-Routing side** of ownership and consumption boundaries introduced by PR-A's scheduling and delivery evidence surface. Existing Order Routing boundary declarations (parent order intake, route evaluation, route execution, order decomposition, routing snapshots, routing policies, split orders, vendor suborders, manufacturer placeholders, export batches/items, buyer/retailer split references, CSV vendor exports, manual vendor download, re-export controls, routing-to-Fulfillment handoff requests) remain in force unchanged.

### Vendor Export Schedule — ownership

Order Routing owns Vendor Export Schedule as configuration of when and how routed-suborder exports are produced and delivered for a specific vendor. Schedule lifecycle (`draft`, `active`, `paused`, `retired`), versioning, and audit are Order Routing's responsibility.

Order Routing-side rules:

- Schedule configuration authority is **Export Schedule Authority** per `permissions.md`. Phase 1 routes this to CIXCI System Admin.
- Vendor self-service Schedule editing is not enabled in Phase 1.
- Schedule may reference Tenant-Company-owned recipient scope, business calendar reference, and `check_access`-resolved vendor scope. Order Routing does not validate recipient identity or business calendar content; it references both.
- Schedule may reference Integration-Management-owned delivery method definitions. Order Routing does not validate transport configuration.
- Schedule edits produce new versions; Windows materialized from prior versions are not retroactively rewritten.

### Vendor Export Window — ownership

Order Routing owns Vendor Export Window as the materialized execution instance of a Schedule. Window lifecycle (`scheduled`, `executing`, `succeeded`, `failed`, `superseded`) and audit are Order Routing's responsibility.

Order Routing-side rules:

- A Window is materialized from exactly one Schedule version. The materialization is captured at the Window's creation; Schedule edits do not retroactively rewrite Windows.
- Window execution invokes Order Routing's existing export generation flow (Export Batch production). The export generation flow is not new in PR-A; PR-A's Window is the trigger and audit anchor.
- Window does not directly call Integration Management; Workflow 3 (Delivery Evidence capture) handles the delivery handoff.

### Vendor Export Delivery Evidence — ownership and consumption

Order Routing owns Vendor Export Delivery Evidence as the authoritative record of what was delivered, when, to whom, by what method, with what confirmation. Delivery Evidence lifecycle (`pending`, `confirmed`, `failed`, `partial`, `unconfirmable`) and the `export_review_required_state` lifecycle are Order Routing's responsibility.

Order Routing-side rules:

- Delivery Evidence is created when Order Routing requests delivery via Integration Management. Order Routing does not create Delivery Evidence speculatively (no Delivery Evidence is created during preview or pre-execution flows).
- Delivery Evidence `delivery_confirmation_state` is updated based on Integration Management-reported Attempt outcomes. Order Routing captures outcomes; Integration Management owns transport.
- Once `delivery_confirmation_state` is terminal (`confirmed`, `failed`, `partial`, `unconfirmable`), the Delivery Evidence is not mutated. Re-export produces a new Delivery Evidence per Order Routing's existing re-export controls.
- `export_delivered_timestamp` is populated only when at least one Attempt reaches `success`. PR-A does not synthesize a timestamp from generation time.
- **`delivery_confirmation_state = confirmed` is a transport-layer fact, not an operational-acceptance fact.** A confirmed export delivery state means **only** that delivery evidence was successfully confirmed for the configured Delivery Method. It does **not** mean the vendor acknowledged the export, opened the export, processed the export, accepted operational responsibility, or that fulfillment execution was accepted. Email delivered ≠ email opened. SFTP push confirmed ≠ file consumed. Manual download ≠ operational acceptance. API push confirmed ≠ vendor system processed. Operational fulfillment acceptance is Fulfillment / Returns territory and the Boundary/Handoff PR's join-point contract; PR-A's Delivery Evidence captures only the delivery-evidence-confirmation fact.

**Consumption boundary — Fulfillment / Returns (future):**

- Fulfillment / Returns SLA evaluation (future Fulfillment / Returns PR-A) reads Vendor Export Delivery Evidence read-only.
- Fulfillment / Returns reads `export_delivered_timestamp`, `delivery_confirmation_state`, and the Schedule's cutoff configuration to compute fulfillment response deadlines.
- Fulfillment / Returns does not mutate Vendor Export Delivery Evidence under any path.
- Fulfillment / Returns does not transition `export_review_required_state`.
- The explicit join-point contract ("SLA deadlines are calculated from confirmed Delivery Evidence where `delivery_confirmation_state = confirmed`") is **Boundary/Handoff PR** territory. PR-A states that Delivery Evidence is the record Fulfillment / Returns will consume; PR-A does not contract the SLA calculation rule.

**Consumption boundary — Analytics / Reporting (future):**

- Analytics / Reporting (future Cross-Module Summary Email PR) may consume `export_review_required_state` for summary aggregation.
- Analytics / Reporting does not mutate Vendor Export Delivery Evidence under any path.

### Vendor Export Delivery Attempt — ownership

Order Routing owns Vendor Export Delivery Attempt as the per-attempt audit record under Delivery Evidence. Attempt `attempt_outcome` enumeration and `retry_after_reference` are Order Routing-defined; the transport-layer evidence the Attempt references is Integration Management-owned.

Order Routing-side rules:

- Order Routing creates one Attempt per delivery attempt reported by Integration Management.
- Order Routing does not implement retry logic. Integration Management decides when to retry; Order Routing records that retries occurred and what their outcomes were.
- Each Attempt references an Integration-Management-owned transport evidence record (except for `aborted` Attempts originating from Order Routing).

### Vendor Export Delivery Method Reference — boundary

Integration Management owns delivery method definitions. Order Routing carries `delivery_method_reference` on Schedule and Delivery Evidence as a reference field.

Order Routing-side rules:

- Order Routing does not enumerate transport protocol details (SMTP, SFTP, API auth, manual download URL semantics) inside Order Routing files.
- Order Routing does not own retry semantics tied to a method.
- Order Routing does not own delivery method lifecycle (addition, deprecation, retirement of methods is Integration Management's).
- For email-based methods (Scheduled Email with CSV attachment, Scheduled Email with file reference), Integration Management may delegate to Notification Platform Service for transport. From Order Routing's view, the method is owned by Integration Management; whether Integration Management further delegates is transport detail.

### Vendor Export Recipient Reference — boundary

Tenant Company owns recipient identity, validation, role-mapping, and scope. Order Routing carries `recipient_references` on Schedule and Delivery Evidence as reference fields.

Order Routing-side rules:

- Order Routing does not validate recipient identity inside the module.
- Order Routing does not carry recipient PII directly; references resolve through Tenant Company.
- Recipient lifecycle (added, deactivated, role changed) is Tenant Company's responsibility. Schedule recipient references may reflect stale recipient state until reconciled by Schedule edit.
- Authority for which recipients a Schedule may target is `check_access`-evaluated through Tenant Company.

### Business calendar reference — boundary

Business calendar (which days are business days, which are holidays, which are weekends) is **not Order-Routing-owned**.

Order Routing-side rules:

- Order Routing carries `business_calendar_reference` on Vendor Export Schedule as a reference field.
- The calendar itself is Tenant-Company-owned operational configuration or a future platform-owned calendar standard. See PR-A OQ 1.
- Order Routing does not define a Vendor Business Calendar entity. Attempts to introduce one are a boundary violation.
- When `business_calendar_reference` resolves to nothing (no calendar exists yet or reference is stale), Schedule falls back to `holiday_weekend_behavior = deliver_anyway` per `data-model.md` defaults. Workflow 2 (Window generation) does not require a calendar to produce Windows.

### Cutoff and after-hours handling references — boundary

`same_day_cutoff_reference` and `after_hours_handling_reference` are configuration references on Vendor Export Schedule. PR-A carries them; PR-A does not use them for SLA logic.

Order Routing-side rules:

- The cutoff and after-hours references are captured at Window materialization time (in `cutoff_context` on the Window).
- Order Routing does not enforce or evaluate these cutoffs. They exist on Schedule so that Fulfillment / Returns SLA evaluation (future PR) can read them.

### Transport boundary — Integration Management

Integration Management owns transport mechanics for every delivery method.

Order Routing-side rules:

- Order Routing requests delivery; Integration Management performs delivery. The transport boundary is clean: Order Routing produces an Export Batch reference and Delivery Method Reference; Integration Management handles wire-level transport and reports outcome.
- Retry policy (delays, backoff, max-retries, escalation) is Integration Management's. Order Routing captures outcomes, not policy.
- Where transport reliability is degraded (provider outage, persistent recipient bounces), Integration Management determines retry exhaustion. Order Routing transitions Delivery Evidence to `failed` on Integration Management's exhaustion signal.
- Transport-level audit records (SMTP delivery receipts, SFTP transfer logs, API webhook acknowledgements) are owned by Integration Management. Order Routing references these via `transport_evidence_reference` on Attempt.

### Notification Platform Service — boundary

Notification Platform Service owns scheduled email delivery, recipient delivery tracking, and notification retry behavior for notifications.

Order Routing-side rules (clarification, not new ownership):

- For vendor export delivery via Scheduled Email methods, Integration Management is Order Routing's primary boundary. Integration Management may internally delegate to Notification Platform Service for SMTP transport; this delegation is transport detail.
- For unrelated notifications (System Admin Activity Summary Emails — the Cross-Module PR — or buyer notifications), Notification Platform Service is consumed directly by the relevant module. PR-A does not introduce direct Order-Routing-to-Notification-Platform integration.
- PR-A does not introduce a System Admin alert for `export_review_required_state`. That is the Cross-Module Summary Email PR's responsibility.

### Logs & Audit — boundary

Logs & Audit owns immutable export/import/download evidence, audit retention, and delivery history evidence.

Order Routing-side rules:

- Order Routing produces audit references for every Schedule lifecycle transition, Window state transition, Delivery Evidence state transition, Delivery Attempt creation, and Review-Required state transition.
- Logs & Audit stores the immutable record. Order Routing references; Logs & Audit retains.
- Manual download events produce audit references that Order Routing records on Delivery Attempt; the underlying download-evidence record is Integration Management-owned or Logs & Audit-owned per existing Order Routing patterns.
- Retention policy for Schedule versions, Windows in terminal states, Delivery Evidences in terminal states, and Delivery Attempts is deferred to Logs & Audit retention policy. See PR-A OQ 5.

### Tenant Company — boundary

Tenant Company owns schedule authority, vendor scope, recipient scope, and operational configuration authority.

Order Routing-side rules:

- Order Routing consults Tenant Company `check_access` at every authority-gated action (Schedule create / edit / pause / retire; recipient reference validation; vendor reference validation).
- Order Routing does not modify Tenant Company state. Tenant Company is read-only from Order Routing's perspective.
- Schedule configuration authority (Export Schedule Authority) resolves through Tenant Company `check_access` per `permissions.md`.

### Analytics / Reporting — boundary

Analytics / Reporting will eventually consume `export_review_required_state` (and related Delivery Evidence rollups) for summary aggregation. PR-A does not introduce that consumption.

Order Routing-side rules:

- Analytics / Reporting does not mutate Order Routing state.
- Analytics / Reporting reads via Order Routing's read-only API surface (per `api-contracts.md` PR-A placeholders) or via event subscription (per `events.md` PR-A event family). PR-A does not introduce analytics queries or aggregation logic.

### Cross-reference: where PR-A boundaries connect to other-module specs

- **Fulfillment / Returns** — Fulfillment / Returns PR-A (next PR in the audit sequence) will consume Vendor Export Delivery Evidence read-only for SLA evaluation. Fulfillment / Returns owns SLA logic, late/missing import exceptions, shipment/tracking/delivery-of-physical-goods state, return state, and buyer update-ready signals. PR-A does not modify any Fulfillment / Returns file.
- **Integration Management** — owns transport for all Delivery Methods, retry policy, and transport evidence retention. PR-A does not modify any Integration Management file.
- **Notification Platform Service** — owns scheduled email delivery and notification retry. PR-A does not modify any Notification Platform Service file. (Integration Management may internally delegate email transport to Notification Platform Service; this is transport detail.)
- **Tenant Company** — owns recipient scope, vendor scope, business calendar (where calendar exists), and `check_access`-resolved schedule authority. PR-A does not modify any Tenant Company file.
- **Logs & Audit** — owns immutable retention. PR-A does not modify any Logs & Audit file.
- **Analytics / Reporting** — future consumer via Cross-Module Summary Email PR. PR-A does not modify any Analytics / Reporting file.
- **Product Catalog** — unrelated to PR-A. PR-A does not modify any Product Catalog file.
- **Device Catalog** — unrelated to PR-A (despite shared PR-A-style hardening pattern). PR-A does not modify any Device Catalog file.

## Cross-Module Handoff Publication Contract (Boundary/Handoff PR)

This section documents the **producer-side** commitments Order Routing makes for the Vendor Export Delivery Evidence -> Fulfillment / Returns SLA evaluation handoff. The consumer-side contract (eligibility evaluation, idempotency, replay handling, non-confirmed handling) lives in `modules/fulfillment-returns/boundary-contracts.md`. Together the two sides specify the seam without duplicating its description.

This section introduces **zero new Order Routing entities, workflows, events, permissions, or API contracts.** It documents commitments Order Routing already makes through PR #91 and clarifies what consumers may rely on.

### Producer-side commitments

For every Vendor Export Delivery Evidence whose `delivery_confirmation_state` reaches `confirmed`, Order Routing commits to:

- **C1. At-least-once publication of `order-routing.export-delivery-evidence.confirmed`.** The event is published when the source record transitions to `confirmed`. Transport-layer delivery semantics (which determine whether duplicates may occur) are Integration Management's. From Order Routing's perspective the publish is at-least-once; consumers must be idempotent.
- **C2. At-least-once publication of `order-routing.export-delivery-evidence.failed`.** Same commitment for the `failed` terminal state.
- **C3. No retroactive mutation of `confirmed` source state.** PR #91's invariant: Vendor Export Delivery Evidence is terminal once `confirmed`. Subsequent corrections to delivery facts go through PR #91's existing re-export controls, which produce a **new** Vendor Export Delivery Evidence (with a new `vendor_export_delivery_evidence_reference`), not a mutation of the prior record.
- **C4. No retroactive mutation of `failed` source state.** Same invariant.
- **C5. Payload reference stability post-emission.** Once an event has been published, the references it carries are stable for the lifetime of the source record:
  - `vendor_export_delivery_evidence_reference` - stable identifier of the source record.
  - `vendor_reference` - stable.
  - `vendor_export_window_reference` - stable.
  - `export_delivered_timestamp` - stable on `confirmed` events; on `failed` events, the latest Attempt timestamp is stable.
  - `delivery_method_reference` - stable.
  - `eventVersion` - `v1` baseline; no version bump in this PR.
- **C6. Source state machine ordering.** Within a single Vendor Export Delivery Evidence's lifecycle, the event sequence is naturally ordered by PR #91's state machine (`created -> confirmed` or `created -> failed`). Transport may reorder events across different source records; ordering within a single source record's lifecycle is preserved at the source.
- **C7. No producer-side consumer state.** Order Routing does not track whether any consumer has observed any published event. Consumer-side handoff state (the Cross-Module Handoff Record introduced by this PR on the Fulfillment / Returns side) is consumer-owned. Order Routing reads no Fulfillment / Returns state.
- **C8. Re-export produces a new source record.** Per PR #91, authorized re-export (via existing re-export controls) produces a new Vendor Export Window and a new Vendor Export Delivery Evidence. The new record has its own `vendor_export_delivery_evidence_reference` and produces its own publish stream. The prior record's terminal state is preserved.

### What Order Routing does NOT do for this handoff

- **Does not own any consumer state.** The Cross-Module Handoff Record is Fulfillment / Returns-owned. Order Routing does not know whether consumption succeeded.
- **Does not own SLA evaluation logic.** PR #92 owns SLA evaluation. PR #91 carries timing references (`same_day_cutoff_reference`, `after_hours_handling_reference`); PR #91 does not enforce SLA deadlines and this PR does not change that.
- **Does not subscribe to Fulfillment / Returns events.** The handoff is one-way producer -> consumer.
- **Does not introduce new producer events.** PR #91's 12 events are unchanged.
- **Does not introduce eligibility evaluation logic.** Eligibility is consumer-side. Order Routing publishes for every `confirmed` and `failed` source record; consumer skip decisions are not visible to Order Routing.
- **Does not assert vendor operational acceptance via `confirmed` state.** PR #91's clarification is reaffirmed: `delivery_confirmation_state = confirmed` is a transport-layer fact only. Email delivered != email opened. SFTP push confirmed != file consumed. Manual download != operational acceptance. API push confirmed != vendor system processed.
- **Does not modify `vendor-export-fulfillment-handoff-governance.md` substantively.** That file receives a light cross-reference (<=15 lines, 0 deletions) added by this PR pointing to the new Cross-Module Handoff Record concept; no restructuring, no ownership changes, no SLA logic.

### What this PR does NOT add to Order Routing

This section is documentation-only on the Order Routing side. The Boundary/Handoff PR adds nothing else to Order Routing beyond:

- This contract subsection in `boundary-contracts.md`.
- Contract notes on existing events in `event-contracts.md`.
- A light cross-reference (<=15 lines, 0 deletions) in `vendor-export-fulfillment-handoff-governance.md`.
- A small assumptions/scenarios/edge-cases sub-block.
- A Focus Areas bullet in `README.md`.

**No Order Routing data-model entity is added or modified.**
**No Order Routing workflow is added or modified.**
**No Order Routing event is added or modified.**
**No Order Routing permission or authority class is added or modified.**
**No Order Routing API contract is added or modified.**

### Cross-reference

The producer-side contract here pairs with the consumer-side contract in `modules/fulfillment-returns/boundary-contracts.md` (Cross-Module Handoff Boundaries section). Together they specify the seam. Readers reviewing the handoff should consult both sides.

<!-- BOUNDARY/HANDOFF PR APPEND ANCHOR -->
