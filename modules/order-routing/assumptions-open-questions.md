# Order Routing Assumptions / Open Questions

## Assumptions

- Order Routing aligns with ADR-0009.
- Order Routing sits between Pricing and Fulfillment.
- Order Routing owns routing decisions, order decomposition, suborder structure, split-order decisions, routing policies, routing rules, routing snapshots, routing exceptions, retry/review workflows, vendor routed-suborder export eligibility/content references, routing-to-fulfillment handoff references, and routing events.
- Order Routing consumes pricing snapshots or quote-like order-bindable results from Pricing and must not recalculate price.
- Order Routing consumes Tenant Company eligibility, scope, relationship, readiness, geography, Product Type enablement, licensed-property signals, export/manual download authority, and must not derive eligibility.
- Order Routing consumes Product Catalog references, Product Type, product lifecycle/routability, stop-sell/deactivation, activation, compatibility, and warranty product facts where authorized.
- Order Routing consumes Device Catalog Device References where relevant and must not own canonical device data.
- Order Routing may carry or emit warranty registration required signals but must not own warranty claim lifecycle or vendor warranty systems.
- Order Routing may create manufacturer suborder placeholders but must not own Procurement / Purchase Orders.
- Product Type influences routing policy selection, but Order Routing does not own Product Type definitions.
- Routing snapshots are immutable and superseded, not rewritten.
- Route evaluation / dry-run does not create execution state unless route execution is explicitly requested.
- Vendor routed-suborder export eligibility determines export inclusion only and does not determine fulfillment execution.
- Fulfillment/Returns owns execution state after routing handoff, including shipment, tracking, delivery, fulfillment import validation, returns, and refund evidence where applicable.
- Integration Management owns external delivery/receipt evidence and transport retries for vendor exports delivered through integrations.
- Notification Platform Service owns scheduled email delivery for vendor exports sent by email.
- Logs & Audit owns immutable file/export/download evidence.
- Invoice Management owns invoice lifecycle and reconciliation.
- Analytics owns reporting definitions and rollups.
- AI Agent Services may consume routing and vendor export signals and recommend review actions but must not override routing decisions without approved action contracts.

### PR-A Assumptions (Order Routing Vendor Export Schedule and Delivery Evidence)

PR-A introduces the scheduling and delivery evidence layer on top of Order Routing's existing routing decision, suborder, export batch, and handoff content. The following assumptions are made by PR-A and should be flagged for confirmation during review:

- **PR-A A1.** Order Routing baseline content per Codex's readiness review exists on main: parent order intake reference, route evaluation / dry-run, route execution, order decomposition, routing policies, routing snapshots, split orders, vendor suborders, manufacturer placeholders, vendor routed-suborder export eligibility, export batches / items, buyer/retailer split references, CSV-only vendor exports, manual vendor download, re-export controls, routing-to-Fulfillment handoff requests, API/OpenAPI placeholders, event families, permissions (with export schedule authority mentioned but not operationally modeled), test scenarios, and `vendor-export-fulfillment-handoff-governance.md`. PR-A layers on top; APPLY.md pre-flight verifies key baseline markers.

- **PR-A A2.** The existing `vendor-export-fulfillment-handoff-governance.md` is the strongest hardening artifact in Order Routing per Codex's readiness review. PR-A treats this file as authoritative for the existing export-to-handoff governance and does not rewrite, restructure, or change its ownership boundaries. PR-A adds at most a light cross-reference (≤10 lines) pointing to the new Vendor Export Delivery Evidence as the future SLA-evaluation source.

- **PR-A A3.** Tenant Company `check_access` is the authority resolution mechanism for Order Routing. PR-A's Export Schedule Authority class resolves through `check_access` per the existing Order Routing pattern.

- **PR-A A4.** Logs & Audit owns immutable audit retention. PR-A produces audit references for every Schedule lifecycle transition, Window state transition, Delivery Evidence state transition, Delivery Attempt creation, and Review-Required state transition; Logs & Audit retains.

- **PR-A A5.** Integration Management owns transport mechanics for all Delivery Methods (Scheduled Email with CSV attachment, Scheduled Email with file reference, SFTP push, API push, Manual Download). PR-A treats delivery method definitions as Integration-Management-owned reference data.

- **PR-A A6.** Notification Platform Service owns scheduled email delivery infrastructure for module-level notifications. For vendor export email delivery, Integration Management is Order Routing's primary boundary; whether Integration Management internally delegates email transport to Notification Platform Service is transport detail.

- **PR-A A7.** Tenant Company owns recipient scope. Recipient identity, validation, role-mapping, and lifecycle are Tenant Company's responsibility. Order Routing references recipients; it does not validate identity.

- **PR-A A8.** A business calendar concept exists as Tenant-Company-owned operational configuration, or is a future platform-owned calendar standard. PR-A treats the calendar as reference-only via `business_calendar_reference` on Schedule. The calendar's actual existence on main is an open question (PR-A OQ 1).

- **PR-A A9.** Fulfillment / Returns will consume Vendor Export Delivery Evidence read-only for SLA evaluation in a future PR. PR-A is the producer side; Fulfillment / Returns PR-A is the consumer side. The explicit join-point contract is the **Boundary/Handoff PR** territory.

- **PR-A A10.** Analytics / Reporting will consume `export_review_required_state` for summary aggregation in a future Cross-Module PR. PR-A produces the state; Cross-Module PR consumes it.

- **PR-A A11.** Vendor self-service Schedule editing is not enabled in Phase 1. CIXCI System Admin holding Export Schedule Authority is the only actor permitted to mutate Schedules. Phase 2 may broaden via additive permissions PR.

- **PR-A A12.** Manufacturer / distributor / API ingestion is not enabled in Phase 1 (consistent with Device Catalog PR-A's Phase 1 reaffirmation). PR-A's `delivery_method_reference` enumeration includes API push as a Delivery Method, but vendor-side data ingestion via API is unrelated and not enabled.

- **PR-A A13.** AI Agent Services is not consulted in Phase 1 PR-A workflows. AI-driven Schedule edits, AI-suggested delivery method changes, and AI auto-resolution of Review-Required state are not enabled.

- **PR-A A14.** Order Routing's existing event naming convention is `order-routing.<entity>.<verb-past-tense>` per Codex's readiness review. PR-A's 12 new event names follow this convention. Legacy event names are preserved.

- **PR-A A15.** Order Routing's existing re-export controls are an established workflow per Codex's readiness review. PR-A's Review-Required state may lead to re-export but does not implement re-export logic; existing re-export controls remain the mechanism.

- **PR-A A16.** Order Routing's existing buyer/retailer split references are an established concept per Codex's readiness review. PR-A's Schedule `buyer_retailer_split_behavior` references the existing split model; PR-A does not redefine split semantics.

- **PR-A A17.** Order Routing's existing Manual Download authority is an established concept per Codex's readiness review. PR-A's Manual Download Delivery Method workflow operates within the existing authority; PR-A does not introduce a new download authority class.

- **PR-A A18.** PR-A does not introduce OpenAPI schemas. The existing `api-contracts.md` may contain OpenAPI placeholders per Codex's grounding; PR-A's additions are architecture-level placeholders only.

### Boundary/Handoff PR Producer-Side Assumptions

- **Boundary/Handoff PR Producer A1.** Order Routing's role in the cross-module handoff is publication-only. Order Routing does not track whether any consumer has observed any published event. Consumer-side handoff state (the Cross-Module Handoff Record) is Fulfillment / Returns-owned per this PR; Order Routing reads no consumer state.
- **Boundary/Handoff PR Producer A2.** PR #91's invariant - Vendor Export Delivery Evidence is terminal once `confirmed` or `failed` - holds. Re-export per existing PR #91 controls produces a **new** source record with a new `vendor_export_delivery_evidence_reference`; the prior record's terminal state is preserved.
- **Boundary/Handoff PR Producer A3.** PR #91's clarification - confirmed source delivery is a transport-layer fact, not vendor operational acceptance - is reaffirmed by this PR. Order Routing does not introduce any assertion of vendor operational acceptance via the `confirmed` state.
- **Boundary/Handoff PR Producer A4.** Order Routing's existing 12 PR #91 events are unchanged by this PR. No new event names, no `eventVersion` bumps, no payload schema changes, no redaction class changes.
- **Boundary/Handoff PR Producer A5.** Integration Management owns transport delivery of source events to Fulfillment / Returns. Producer-side at-least-once publication is committed; transport-layer delivery semantics (whether duplicates may occur, bounded replay window duration) are Integration Management's territory.
- **Boundary/Handoff PR Producer A6.** This PR does not modify `modules/order-routing/data-model.md`, `modules/order-routing/workflows.md`, `modules/order-routing/events.md`, `modules/order-routing/permissions.md`, or `modules/order-routing/api-contracts.md`. The producer-side documentation lives only in `boundary-contracts.md`, `event-contracts.md`, a light cross-reference in `vendor-export-fulfillment-handoff-governance.md`, this sub-block, scenarios, edge cases, and the README Focus Areas bullet.

## Scale Assumptions

These are placeholders for pressure testing and should be replaced with measured or business-approved targets.

### Parent Orders

- Placeholder: expected parent orders per day, peak hour, and peak minute.
- Placeholder: expected order lines per parent order.
- Placeholder: expected percentage of orders that require routing review.
- Placeholder: expected percentage of orders using dry-run evaluation before execution.

### Split Orders

- Placeholder: expected percentage of parent orders split across vendors.
- Placeholder: expected percentage split across manufacturers or future manufacturer placeholders.
- Placeholder: expected maximum suborders per parent order.
- Placeholder: expected impact of mixed accessories, devices, and branded merchandise.
- Placeholder: fanout limit per parent order and per downstream target.

### Vendor Routed-Suborder Exports

- Placeholder: expected vendor export batches per day, peak hour, and peak minute.
- Placeholder: expected routed suborders per export batch.
- Placeholder: expected CSV-only vendor export volume.
- Placeholder: expected manual vendor download volume and repeated-download volume.
- Placeholder: expected scheduled email export volume.
- Placeholder: expected API/webhook/SFTP/manual exchange export volume.
- Placeholder: expected percentage of exports split by buyer/retailer.
- Placeholder: expected re-export request volume and approval/review rate.
- Placeholder: export batch size caps, status lookup pagination, and file/content reference retention needs.
- Placeholder: vendor/export batch idempotency and dedupe key format.
- Placeholder: export replay window and stale export event handling.

### Routing-To-Fulfillment Handoff

- Placeholder: expected handoff requests per day, peak hour, and peak minute.
- Placeholder: expected handoff references per export batch and per routed order.
- Placeholder: expected handoff rejection/review rate from Fulfillment/Returns.
- Placeholder: handoff retry budget, dead-letter handling, and manual review owner.

### Routing Lookups

- Placeholder: Tenant Company lookup volume and latency target.
- Placeholder: Pricing snapshot lookup volume and latency target.
- Placeholder: Product Catalog reference lookup volume and latency target.
- Placeholder: Device Reference lookup volume and latency target.
- Placeholder: fulfillment capability placeholder lookup volume and latency target.
- Placeholder: routing policy/rule lookup volume and latency target.

### Exceptions And Retries

- Placeholder: expected routing exception rate by exception family.
- Placeholder: expected vendor export eligibility exception rate.
- Placeholder: retry attempts per exception family.
- Placeholder: retry budget per tenant, parent order, export batch, downstream target, and time window.
- Placeholder: manual review queue volume, SLA, escalation threshold, and priority model.
- Placeholder: retry blast-radius controls for downstream outages.
- Placeholder: retry storm prevention thresholds, circuit breakers, backoff, jitter, and dead-letter handling.

### Idempotency And Dedupe

- Placeholder: idempotency scope for evaluation, execution, retry, review action, supersession, export eligibility, export batch creation, re-export, manual download, and fulfillment handoff.
- Placeholder: dedupe key format per routed suborder.
- Placeholder: dedupe key format per vendor export batch.
- Placeholder: behavior when same parent order is routed with different routing input hash.
- Placeholder: behavior when replayed route execution collides with superseded snapshot.
- Placeholder: behavior when replayed vendor export request collides with prior export batch or re-export.

### Events And Snapshots

- Placeholder: routing events per parent order.
- Placeholder: vendor export events per export batch.
- Placeholder: routing snapshot retention period.
- Placeholder: vendor export reference retention period.
- Placeholder: routing snapshot size limits.
- Placeholder: vendor export content reference size limits.
- Placeholder: routing policy/rule version retention.
- Placeholder: event replay volume and replay windows.
- Placeholder: audit retention volume for snapshots, overrides, exceptions, retries, supersessions, export batches, manual downloads, and fulfillment handoffs.
- Placeholder: redaction classes by consumer.

## Open Questions

- Is Order Routing triggered before or after payment authorization?
- What lifecycle event triggers vendor/manufacturer suborder creation?
- What lifecycle event triggers vendor routed-suborder export eligibility creation?
- Does vendor order export generation always request Fulfillment/Returns handoff, or can handoff be delayed?
- Which module owns accepted parent order state before routing begins?
- When is warranty registration triggered: order placement, shipment, delivery, return-window close, or another event?
- How are mixed carts handled across accessories, devices, and branded merchandise?
- What routing rules are configurable by CIXCI versus fixed?
- What retry behavior is needed for downstream target failures?
- How are routing snapshots retained?
- How are manual routing overrides approved and audited?
- Which routing decisions must be synchronous versus asynchronous?
- Which downstream target failures require re-routing versus manual review?
- How should routing handle stale or superseded price snapshots?
- Which Product Types require unique routing behavior?
- Which warranty registration required signals are blocking versus informational?
- Which fulfillment capability fields are safe for Order Routing to consume before Fulfillment is drafted?
- What manufacturer suborder placeholder behavior is needed before Procurement / Purchase Orders exists?
- Which routing events are required by Fulfillment, Invoice Management, Warranty support, Logs & Audit, Analytics, and AI Agent Services?
- Which vendor export events are required by Fulfillment/Returns, Integration Management, Notification Platform Service, Logs & Audit, Analytics, and AI Agent Services?
- Which event payloads require pricing, customer, vendor, warranty, export, or tenant redaction?
- What fields belong in `routingInputHash`?
- What fields belong in vendor export batch idempotency keys?
- Which exception families are retryable by default?
- Which manual overrides, re-exports, or manual downloads require dual approval or System Admin approval?
- Which replay windows are safe for Fulfillment, Invoice Management, Warranty support, Logs & Audit, Analytics, Integration Management, Notification Platform Service, and AI Agent Services?
- Which vendor order export fields are required at launch?
- Which vendors require CSV-only exports?
- Which vendors require buyer/retailer split exports?
- Which export classes are scheduled email, manual download, API/webhook, SFTP placeholder, or hybrid?
- Which delivery failures should Integration Management keep as transport-only evidence versus send back to Order Routing as review-required disposition?

### PR-A Open Questions (Order Routing Vendor Export Schedule and Delivery Evidence)

Each PR-A open question is classified per the project's open-question discipline:

- **Estimate blocker** — must be resolved before estimates can be reliable.
- **Business / product decision** — business call required.
- **Implementation detail** — left to developer / implementation phase.
- **Future phase** — known unresolved, expected to be resolved by a later phase.
- **Cleanup-only** — minor cleanup, not blocking.

PR-A's open questions:

- **PR-A OQ 1 — Does a Tenant-Company-owned business calendar entity exist on main?**
  - Classification: **Defer with owner — Business / product decision and future Tenant Company / platform dependency.**
  - Rationale: PR-A treats `business_calendar_reference` as a reference field. If no Tenant-Company-owned calendar exists yet, references are unresolved at runtime. PR-A's fallback (`holiday_weekend_behavior = deliver_anyway` with `business_day_classification = unknown_no_calendar`) ensures Schedules can still materialize Windows. **Not an apply blocker.**
  - Destination: Tenant Company or future platform calendar standard.

- **PR-A OQ 2 — Is "Export Schedule Authority" the right class name, or does Order Routing have an existing authority taxonomy that should be extended?**
  - Classification: **Cleanup-only.**
  - Rationale: Codex's readiness review indicates `permissions.md` mentions schedule authority in prose. PR-A operationalizes the class. If the existing prose uses a different exact phrase ("Schedule Configuration Authority", "Vendor Export Scheduling Authority", etc.), PR-A's class name should align rather than introduce a parallel phrasing.
  - Destination: confirm during bundle drafting / Codex review.

- **PR-A OQ 3 — Retry policy boundary: who decides "retry exhausted"?**
  - Classification: **Implementation detail / Integration Management.**
  - Rationale: PR-A states Integration Management owns retry policy and signals exhaustion to Order Routing. The exact signal Integration Management sends is a contract concern. PR-A treats it as a generic outcome reference; a future Order Routing contracts-PR or Integration Management contract may formalize.
  - Destination: future Order Routing contracts-PR or Integration Management contract.

- **PR-A OQ 4 — Vendor self-service Schedule editing.**
  - Classification: **Business / product decision.**
  - Rationale: Phase 1 is CIXCI-System-Admin-only. Phase 2 may consider vendor self-service Schedule editing (e.g., vendor adjusts their preferred send time within constraints). This is a business decision.
  - Destination: business / product decision; not blocking PR-A.

- **PR-A OQ 5 — Retention policy for Schedule versions, terminal-state Windows, terminal-state Delivery Evidences, and Delivery Attempts.**
  - Classification: **Defer with owner — Logs & Audit retention policy.**
  - Rationale: PR-A produces audit references; specific retention period (90 days, 1 year, indefinite per type) is a Logs & Audit policy concern.
  - Destination: Logs & Audit retention policy.

- **PR-A OQ 6 — Manual Download expiration default.**
  - Classification: **Business / product decision.**
  - Rationale: PR-A's Schedule `manual_download_expiration_window` is configurable; the default value (5 business days, 7 calendar days, 14 calendar days, etc.) is a business decision. May live in a platform standard.
  - Destination: business decision; may feed into platform standard.

- **PR-A OQ 7 — Reason references: structured vs. freeform.**
  - Classification: **Defer with owner — UX / process design.**
  - Rationale: PR-A uses `reason reference` fields in multiple places (pause reason, retirement reason, Review-Required trigger reason, resolution reason). Whether these are structured (controlled values) or freeform is open. Structured supports analytics; freeform supports nuance.
  - Destination: UX / process design decision, possibly feeding a platform standard normalization.

- **PR-A OQ 8 — Relationship between Review-Required state and existing re-export controls.**
  - Classification: **Resolved by PR-A.**
  - Rationale: PR-A explicitly states Review-Required state does NOT auto-trigger re-export. Re-export remains explicit, permissioned, and auditable through existing Order Routing re-export controls. Resolution of Review-Required without re-export requires audit-evidenced acceptance. This question is resolved within PR-A.
  - Destination: Resolved.

- **PR-A OQ 9 — Anomaly detection rules for Window-level and Schedule-level anomalies.**
  - Classification: **Future phase.**
  - Rationale: PR-A's Workflow 6 triggers include "Window failure with anomaly" and "schedule-level anomaly" (e.g., business calendar reference not resolving, historical volume non-zero with current volume zero). The exact anomaly detection rules and thresholds are deferred. Without rules, no anomaly-driven Review-Required triggers; the explicit triggers (retry exhaustion, expiration, partial-success per configured detection, explicit admin action) still operate.
  - Destination: future Order Routing PR or operational policy.

- **PR-A OQ 10 — Order Routing contracts-PR analogous to Device Catalog PR-C.**
  - Classification: **Future phase.**
  - Rationale: PR-A introduces event names and architecture-level contract shapes. A future Order Routing contracts-PR may formalize OpenAPI schemas, broker mechanics, retry/replay infrastructure, and full payload contracts.
  - Destination: future planning.

- **PR-A OQ A — Event versioning bump rules.**
  - Classification: **Future phase / platform standard.**
  - Rationale: PR-A's `eventVersion` starts at `v1`. When to bump (additive field vs. breaking change) is a platform-wide event versioning concern not solved in PR-A.
  - Destination: platform event versioning standard.

- **PR-A OQ B — Redaction class enumeration normalization.**
  - Classification: **Future phase / platform standard.**
  - Rationale: PR-A uses `internal`, `tenant_scoped`, `buyer_scoped`. Whether more granular classes are needed (audit-only, public, integration-only) is a platform-wide concern.
  - Destination: platform redaction standard.

- **PR-A OQ C — Schedule behavior when its target vendor is deactivated.**
  - Classification: **Future phase / business decision.**
  - Rationale: PR-A validates vendor at Schedule edit time but does not specify behavior if a vendor is deactivated after Schedule activation. Auto-pause with audit reference is a reasonable default; explicit policy is deferred.
  - Destination: business / product decision.

- **PR-A OQ D — SLA / escalation behavior for Review-Required state thrash.**
  - Classification: **Future phase / operational policy.**
  - Rationale: If Review-Required state thrashes (`review_required → resolved → review_required` repeatedly), no PR-A-level escalation fires. Audit visibility is the only discipline; SLA / escalation is operational policy.
  - Destination: operational policy.

- **PR-A OQ E — Bulk Delivery Evidence lookup API.**
  - Classification: **Future phase.**
  - Rationale: PR-A flags bulk lookup by `vendor_reference` + time range as "possible" but does not commit. A future Order Routing contracts-PR or Fulfillment / Returns PR-A may require it.
  - Destination: future contracts-PR.

### Boundary/Handoff PR Producer-Side Open Questions

- **Boundary/Handoff PR Producer OQ 1 - Future producer-side handoff events.**
  - Classification: Future phase.
  - Detail: This PR introduces zero new producer events. If a future PR (Cross-Module Summary Email PR or Analytics) determines dedicated handoff-lifecycle events on the producer side are needed, they may be added additively. None anticipated in this PR.
  - Destination: Future PR.

- **Boundary/Handoff PR Producer OQ 2 - Future producer-side observability surfaces.**
  - Classification: Future phase / API governance.
  - Detail: Order Routing does not currently expose consumer-handoff observability (it isn't the owner). Future cross-module dashboards may correlate source events to consumer Handoff Records via the SLA Evaluation Record reference; the producer side provides the references but does not aggregate.
  - Destination: Future PR.

## Decisions Needed

- Accepted parent order source and lifecycle boundary.
- Payment authorization timing relative to routing.
- Routing Policy, Routing Rule, Routing Policy Version, Routing Policy Scope, Routing Rule Conflict, and Routing Precedence Ladder model.
- Routing snapshot schema and immutability/supersession rules.
- Vendor/manufacturer assignment rules.
- Vendor routed-suborder export eligibility model.
- Vendor order export content/reference model.
- CSV-only vendor order export contract.
- Buyer/retailer split export behavior.
- Manual vendor download permission and evidence contract.
- Re-export permission, review, and supersession model.
- Routing-to-Fulfillment handoff contract.
- Product Type-aware routing capability model.
- Split-order grouping and parent linkage rules.
- Routing exception taxonomy by family, owner, retryability, blocking behavior, and review queue.
- Retry, review, manual override, and supersession policy.
- Route evaluation versus route execution API contract.
- Warranty registration required signal trigger and handoff behavior.
- Downstream fulfillment instruction placeholder contract.
- Invoice Management evidence needs.
- Logs & Audit retention and audit contract.
- Integration Management delivery/receipt evidence contract for vendor exports.
- Notification Platform Service scheduled email delivery contract for vendor exports.
- AI Agent Services routing and vendor export signal contract.
- Scalability controls for fanout, export batch size, retry budgets, idempotency, dedupe, queues, replay, review SLA, audit volume, and retry storms.

## Risks

- Order Routing could become a hidden Pricing engine if it recalculates after split decisions.
- Order Routing could become a hidden Tenant Company engine if it derives eligibility or export/download authority from order contents.
- Order Routing could become a hidden Product Catalog or Device Catalog if it owns validation or source records.
- Order Routing could become Fulfillment if downstream instructions, vendor export generation, or handoff references are treated as shipment/tracking/delivery state.
- Order Routing could become Integration Management if it owns external delivery, receipt, retry, provider acknowledgement, or external transport evidence.
- Order Routing could become Notification if it owns scheduled email delivery status or notification history.
- Order Routing could become Logs & Audit if it owns immutable file/export/download evidence or centralized retention.
- Order Routing could become Invoice Management if routing snapshots become invoices, adjustments, or reconciliation facts.
- Order Routing could become Warranty Management if warranty registration signals become claim lifecycle or approval.
- Order Routing could become Procurement if manufacturer suborder placeholders become purchase orders.
- Product Type routing could become multiple hidden mini-routing engines if capability policy is not explicit.
- Routing snapshots could become mutable if manual overrides are not modeled as supersession.
- Vendor export batches could duplicate order instructions if idempotency and re-export controls are weak.
- Routing Policy changes could make audit replay impossible if policy/rule versions are not retained.
- Event payloads could leak sensitive price, customer, vendor, warranty, export, or tenant data without redaction rules.
- High-volume downstream failures could create retry storms without throttling and blast-radius controls.

### PR-A Risks (Order Routing Vendor Export Schedule and Delivery Evidence)

- **PR-A R1. The non-collapsible state chain may be flattened in implementation.** PR-A insists that Schedule, Window, Export Batch, Delivery Evidence, and Delivery Attempt are architecturally distinct. An implementation that collapses two (e.g., treats Window and Delivery Evidence as one record) breaks audit trails and the boundary discipline. Mitigation: PR-A's data-model entities are individually defined; workflows transition between them explicitly; reviewers should reject collapsing implementations.

- **PR-A R2. Boundary leakage with Fulfillment / Returns.** PR-A defines the evidence layer; Fulfillment / Returns PR-A defines the SLA evaluator. Risk: PR-A's `same_day_cutoff_reference` and `after_hours_handling_reference` fields could be misread as PR-A enforcing the cutoffs. PR-A carries them; it does not evaluate. Mitigation: explicit documentation in `data-model.md` and `boundary-contracts.md`; APPLY.md verification checks for SLA evaluation language leakage.

- **PR-A R3. Business calendar boundary leakage.** PR-A treats calendar as reference-only. Risk: implementation introduces a Vendor Business Calendar entity inside Order Routing for convenience. Mitigation: explicit boundary declaration; reviewers should reject any calendar entity definition in Order Routing.

- **PR-A R4. Retry policy boundary leakage.** PR-A states Integration Management owns retry policy. Risk: implementation encodes retry policy inside Order Routing (e.g., a Schedule field `max_retry_count`). Mitigation: explicit boundary; Schedule may carry a *preference* reference, but retry policy is Integration Management's.

- **PR-A R5. Recipient PII leakage.** PR-A states recipient references resolve through Tenant Company; PII is not embedded in Order Routing records or event payloads. Risk: implementation embeds recipient email addresses directly on Delivery Evidence for convenience. Mitigation: explicit reference-only discipline; APPLY.md verification checks for recipient PII fields.

- **PR-A R6. Review-Required state becomes a notification trigger inside PR-A.** PR-A explicitly defers notification routing to the Cross-Module Summary Email PR. Risk: implementation wires Review-Required to Notification Platform Service directly. Mitigation: explicit boundary; reviewers should reject any direct notification integration in PR-A.

- **PR-A R7. Auto-re-export drift.** PR-A states Review-Required does NOT auto-trigger re-export. Risk: implementation silently regenerates a replacement export on Review-Required entry as "convenience." Mitigation: explicit discipline; re-export remains explicit, permissioned, auditable.

- **PR-A R8. Audit-evidenced acceptance becomes routine.** Workflow 6 allows resolution without re-export via audit-evidenced acceptance. Risk: this becomes a default rather than an exception, undermining the audit discipline. Mitigation: audit visibility on resolution_category; post-rollout review should track acceptance-without-re-export frequency.

- **PR-A R9. Event taxonomy may turn out incomplete during consumer integration.** 12 PR-A events cover the families enumerated. Risk: Fulfillment / Returns PR-A or Cross-Module PR discovers it needs additional events (e.g., Manual Download pickup, Window supersession, retry exhaustion explicit). Mitigation: PR-A's additive-only discipline means missing events can be added without rename.

- **PR-A R10. PR-A's bundle is large.** Comparable to Device Catalog PR-B in scope (13 files, 6 workflows, 7 entities/concepts, 12 events, ~3000 lines). Review fatigue may produce missed contradictions. Mitigation: structured append-blocks; explicit duplicate-detection pre-flight; granular reviewer checklist.

- **PR-A R11. Schedule version semantics may be misimplemented.** PR-A says edits produce new versions; already-materialized Windows preserve their materialization version. Risk: implementation retroactively rewrites Windows on Schedule edit. Mitigation: explicit data-model field; reviewers should reject retroactive rewrite implementations.

- **PR-A R12. Operational review-required state semantics may overload existing operational concepts.** Order Routing has existing operational signals (re-export prompts, handoff failures). Risk: Review-Required state is treated as duplicative of an existing signal. Mitigation: PR-A's explicit semantics on `data-model.md` and `workflows.md`; reviewers should verify Review-Required is not aliased to existing concepts.

- **PR-A R13. Phase 1 ingestion / authority restriction relies on permissions discipline.** PR-A states vendor self-service and other actor classes are not permitted. Risk: a workflow inadvertently accepts an unauthorized actor. Mitigation: every authority-gated action consults Tenant Company `check_access`; reviewers verify no workflow path bypasses.

- **PR-A R14. The `vendor-export-fulfillment-handoff-governance.md` light cross-reference may grow into a rewrite.** PR-A's discipline is ≤10 lines, no restructuring. Risk: subsequent edits creep beyond cross-reference. Mitigation: APPLY.md pre-flight enforces minimal change; Boundary/Handoff PR is the right place for further hardening.

- **PR-A R15. Estimate undersizing.** PR-A is materially comparable to Device Catalog PR-B. Risk: developer estimates undersize the workflow complexity (timezone math, business calendar reference, retry/manual-download semantics, Review-Required lifecycle). Mitigation: explicit complexity flagging in `PR_BODY.md`; multi-file scope visible.

### Boundary/Handoff PR Producer-Side Risks

- **Boundary/Handoff PR Producer R1. Consumer-side state confusion.** Future operators may incorrectly assume Order Routing tracks consumer Handoff Record state. Mitigation: producer-side contract subsection in `boundary-contracts.md` explicitly states Order Routing does not own consumer state.
- **Boundary/Handoff PR Producer R2. Misinterpretation of `confirmed` as vendor operational acceptance.** PR #91's clarification is reaffirmed by this PR. Risk is that future downstream consumers reuse `confirmed` semantics for operational-acceptance assertions, which are not supported. Mitigation: contract notes in `event-contracts.md` and `boundary-contracts.md` reiterate the no-acceptance-implication discipline.
- **Boundary/Handoff PR Producer R3. Future event addition pressure.** Future PRs may want producer-side handoff lifecycle events. Risk is event proliferation. Mitigation: this PR's zero-new-events stance and Cross-Module Summary Email PR's anticipated consumption pattern (audit references and SLA Evaluation Records, not handoff events).
