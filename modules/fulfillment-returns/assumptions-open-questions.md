# Fulfillment and Returns Assumptions and Open Questions

This document is proposal-level architecture. It captures assumptions, scale placeholders, unresolved decisions, and risks for the Fulfillment and Returns module.

## Assumptions

- Order Routing provides fulfillment handoff request references, routed suborder references, routed suborder line references where available, immutable routing snapshot references, vendor export batch/item references where applicable, and source versions before fulfillment execution begins.
- Fulfillment and Returns records its own handoff disposition; Order Routing handoff requested is not proof of accepted execution.
- Vendor fulfillment imports and vendor return imports follow `architecture/standards/import-export-validation-governance.md`.
- Fulfillment import rows must map to expected routed suborder lines or explicitly supported shipment line/package structures before they can mutate operational shipment evidence.
- Return import rows must map to expected return lines through RAN + SKU/UPC and/or CIXCI Return Line ID where available before they can mutate operational return disposition evidence.
- Pricing provides pricing snapshot and adjustment pricing references; Fulfillment and Returns never recalculates price or interprets final refund amount.
- Invoice Management owns invoice/refund/credit/adjustment lifecycle and financial finality.
- Tenant Company provides tenant scope, buyer/entity references, vendor permission/scope, and user permissions; Fulfillment and Returns never derives eligibility.
- Product Catalog, Device Catalog, and Media provide references; Fulfillment and Returns does not mutate product/device/media source records.
- Integration Management owns external transport, delivery/receipt evidence, provider callback receipt evidence, retries, and external references.
- Notification Platform Service owns scheduled email delivery, notification history, recipient delivery status, and delivery retries.
- Logs & Audit owns immutable file/import/export/download/audit evidence and retention.
- Warranty replacements require an approved signal from an owning warranty-support workflow, buyer-facing module, or future Warranty Management context.
- Fulfillment target failures produce hold, retry, review, rejection, or exception state; they do not permit hidden rerouting.

### PR-A Assumptions

- **PR-A A1.** Order Routing PR #91 is merged on `main`. The Vendor Export Delivery Evidence entity, its `delivery_confirmation_state = confirmed` state, the `export_delivered_timestamp` field, and the 12 Order Routing events are present and stable. PR-A consumes these read-only.

- **PR-A A2.** PR #91's clarification holds: a confirmed Vendor Export Delivery Evidence means only that delivery evidence was successfully confirmed for the configured delivery method. It does not mean the vendor acknowledged, opened, processed, or accepted operational responsibility for the export, and it does not mean fulfillment execution was accepted. PR-A uses confirmed delivery evidence as the SLA clock-start basis per SLA Policy; SLA evaluation is about response timeliness, not acceptance.

- **PR-A A3.** The existing Fulfillment / Returns content per Codex's audit is present on `main`: handoff disposition, vendor fulfillment imports, manual/API fulfillment updates, shipment line evidence, tracking validation, shipment status lifecycle, delivered evidence, vendor return export/import, RAN validation, return line disposition, replacement shipment workflow, buyer update-ready signals, API/OpenAPI placeholders, event families, permissions, test scenarios, edge cases, open questions. PR-A layers SLA evaluation on top; existing content is unchanged.

- **PR-A A4.** The existing Fulfillment Import entity is present on `main`. PR-A adds one field (`fulfillment_import_received_timestamp`) without modifying the rest of the entity's content. The Fulfillment Import entity's existing transport-receipt mechanism is the source of the timestamp.

- **PR-A A5.** The existing Fulfillment / Returns event-naming convention follows `fulfillment-returns.<entity>.<verb-past-tense>`. PR-A's 17 additive events use this convention.

- **PR-A A6.** SLA Policy is a Fulfillment-Returns-internal configuration entity. Tenant Company `check_access` governs SLA Configuration Authority. SLA Policy carries its own cutoff configuration; it does not reference Order Routing Vendor Export Schedule cutoffs.

- **PR-A A7.** The SLA-relevant timestamp is the transport receipt of the fulfillment import payload (per scoping decision 3). It is not the post-validation acceptance timestamp. A malformed on-time file does not silently count as successful fulfillment completion; validation exceptions remain separate.

- **PR-A A8.** Three Exception entities (Late, Missing, Partial) are distinct, not subtypes of a generic Exception (per scoping decision 2). They share the SLA Breach Review State enumeration but have distinct triggers, semantics, and downstream subscription patterns.

- **PR-A A9.** Multiple Exceptions per SLA Evaluation Record (per scoping decision 7) are permitted. Severity priority `Late > Missing > Partial > On Time` is proposal-level for PR-A and may be refined as Fulfillment / Returns severity patterns are aligned in a future PR.

- **PR-A A10.** Late-import-after-Missing-Exception (per scoping decision 6): the Missing Exception is closed (audit-evidenced), a Late Exception is created, the Evaluation Record outcome transitions from `missing` to `late`. Missing is not mutated into Late.

- **PR-A A11.** SLA Override / Excuse Evidence is immutable after creation. Reversal requires a new reversing record. Vendor users cannot create or reverse Override Evidence.

- **PR-A A12.** SLA Override Authority either extends an existing Fulfillment / Returns authority class (preferred if the existing taxonomy supports it) or is introduced as a distinct class. Either way: authority flows through Tenant Company `check_access`, CIXCI System Admin holds it in Phase 1, vendor users are excluded.

- **PR-A A13.** Distinct failure modes `SLA_OVERRIDE_AUTHORITY_REQUIRED` (missing authority) and `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING` (missing audit content) are never mixed. Validation rules and error paths treat them distinctly.

- **PR-A A14.** PR-A is proposal-level architecture. It does not modify code, schema, migrations, runtime files, or OpenAPI schemas. PR-A adds architecture-level API contract placeholders to `modules/fulfillment-returns/api-contracts.md`; it does not define finalized API implementations, OpenAPI schemas, concrete URL paths, or runtime endpoint behavior. Broker mechanics and idempotency / replay / retry policy infrastructure are deferred (to Boundary/Handoff PR for cross-module flows, or future Fulfillment / Returns contracts-PR for in-module flows).

- **PR-A A15.** PR-A does not modify any file in Order Routing, Integration Management, Notification Platform Service, Tenant Company, Logs & Audit, Analytics / Reporting, Invoice Management, Pricing, Product Catalog, Device Catalog, or any ADR / platform standard / code / schema / migration / runtime file.

- **PR-A A16.** PR-A's Boundary/Handoff considerations (transport semantics, idempotency, replay, ordering, non-`confirmed` Delivery Evidence behavior) are deferred to the **Boundary/Handoff PR** (next in the audit sequence after PR-A).

- **PR-A A17.** PR-A's Delivery Date / buyer update / customer-visible aggregation considerations are deferred to **Fulfillment / Returns PR-B** (after Boundary/Handoff PR).

- **PR-A A18.** PR-A's scheduled System Admin Activity Summary Emails, summary aggregation, Notification Platform delivery of summary emails, and Analytics summary read model are deferred to the **Cross-Module Summary Email PR** (after Fulfillment / Returns PR-B).

### Boundary/Handoff PR Assumptions

- **Boundary/Handoff PR A1.** Order Routing PR #91 is merged on `main`. The Vendor Export Delivery Evidence entity, its `delivery_confirmation_state` lifecycle, and the 12 PR #91 events (including `order-routing.export-delivery-evidence.confirmed` and `.failed`) are present on `main`. Without PR #91, this PR has no source side to handoff from.
- **Boundary/Handoff PR A2.** Fulfillment / Returns PR #92 is merged on `main`. The SLA Policy entity, SLA Evaluation Record entity, three Exception entities (Late / Missing / Partial), SLA Override / Excuse Evidence entity, SLA Breach Review State, and 17 PR #92 events are present on `main`. Without PR #92, this PR has no consumer side to handoff into.
- **Boundary/Handoff PR A3.** Integration Management provides at-least-once transport delivery semantics for source events. Bounded replay window duration is Integration Management transport policy; this PR does not specify duration but assumes such a window exists.
- **Boundary/Handoff PR A4.** Tenant Company `check_access` patterns are sufficient for vendor-scope evaluation in eligibility condition E3. No new authority class is introduced by this PR.
- **Boundary/Handoff PR A5.** PR #91's invariant - Vendor Export Delivery Evidence is terminal once `confirmed` - holds. Out-of-order observation of `.failed` after `.confirmed` for the same source Delivery Evidence is impossible at the source, regardless of transport reordering.
- **Boundary/Handoff PR A6.** PR #91's clarification - confirmed source delivery is a transport-layer fact, not vendor operational acceptance - is honored. The Handoff Record and bound SLA Evaluation Record do not assert vendor operational acceptance.
- **Boundary/Handoff PR A7.** Phase 1 has one consumer scope (`fulfillment-returns.sla-evaluation`). Additional consumer scopes are anticipated for future PRs (e.g., Analytics consumption, Invoice Management consumption); the Handoff Record's `consumer_scope_reference` field is structured to accommodate them without contract changes.
- **Boundary/Handoff PR A8.** Logs & Audit retains Handoff Record state transitions, eligibility decision rationale, replay acknowledgements, and failure / retry audit references per its own retention policy. This PR produces references; Logs & Audit retains.
- **Boundary/Handoff PR A9.** Replay-time eligibility invariant: the original eligibility decision captured on a Handoff Record is honored across all subsequent replays. SLA Policy edits after consumption do not retroactively re-evaluate eligibility.
- **Boundary/Handoff PR A10.** Phase 1 partial-delivery disposition: source `partial` produces `consumption_held` with no SLA clock start. Future SLA Policy may opt into partial-delivery-starts-clock semantics in a later PR; this PR does not.
- **Boundary/Handoff PR A11.** No new events on either side. The handoff is contracted around existing PR #91 and PR #92 events. Future Cross-Module Summary Email PR or Analytics PR may add handoff-lifecycle events additively if needed; this PR does not.
- **Boundary/Handoff PR A12.** The Cross-Module Handoff Record is observable via direct lookup (future API Governance Foundation PR) and via audit references in Logs & Audit. Phase 1 does not introduce an API surface for handoff observability.
- **Boundary/Handoff PR A13.** Fulfillment / Returns treats Order Routing state as read-only under every path. The boundary is enforced architecturally and reaffirmed by APPLY.md verification (no Order Routing data-model, workflows, events, permissions, or api-contracts file is modified by this PR).

## Scale Assumptions

Placeholder scale assumptions to validate before implementation:

- Handoff requests per tenant/vendor/day.
- Vendor fulfillment import files per vendor/day.
- Rows per fulfillment import.
- Shipment Line Evidence records per fulfillment import.
- Shipment line conflicts per import.
- Partial shipment/package rows per routed suborder.
- Rejected/warning/review-required rows per import.
- Shipment status updates per shipment.
- Tracking URL validations per vendor/carrier/day.
- Duplicate/stale/out-of-order fulfillment update volume.
- Return export batches per vendor/day.
- Return export batch items per batch.
- Return export eligibility records blocked by stale/closed/superseded authorization.
- Re-export requests per vendor/day.
- Manual return export downloads per vendor/day.
- Vendor return import files per vendor/day.
- Rows per return import.
- RAN validation failures per import.
- Return Line Disposition Evidence records per return import.
- Return quantity reconciliation failures per import.
- Vendor return disposition evidence records per return.
- Vendor refund/adjustment evidence records per return and return line.
- Buyer update-ready events per tenant/day.
- Transport-failed-reference events per integration/day.
- Manual review queue volume by exception family.
- Event fanout to Integration Management, Notification, Logs & Audit, Pricing, Invoice Management, Analytics, AI Agent Services, and buyer-facing modules.

## Scalability Controls

These controls are proposal-level and should be refined before implementation.

### Import Queue And Row Processing Controls

- Large fulfillment and return imports should use async validation/apply queues where synchronous handling would create coupling.
- Import jobs should expose paginated row results and summary counts.
- Row-level processing should be partitioned by tenant, vendor, import job, source export batch/item, and operation family where useful.
- Shipment Line Evidence should be partitionable by tenant, vendor, routed suborder, routed suborder line, package/shipment line placeholder, and import job.
- Return Line Disposition Evidence should be partitionable by tenant, vendor, RAN, return line, source return request, and import job.
- Validation preview should be versioned; confirmation should block or require revalidation when source state changes after preview.
- Correction/reupload should reference the prior import job and preserve original values.

### Shipment Line Evidence Controls

- Shipment line evidence should use per-line duplicate prevention keys, not only import-job-level idempotency.
- Split shipment acceptance should require Package ID, Shipment Line ID, or another approved line/package distinguisher.
- Partial shipment rows should have row and quantity caps until explicit implementation rules are defined.
- Shipment summaries should derive from line/package evidence without erasing line-level conflicts.
- Bulk shipment line status lookup should be paginated by tenant, vendor, routed suborder, shipment, package, and import job.

### Return Export Controls

- Return export batches should have batch and item idempotency keys.
- Export batch items should enforce duplicate prevention at return-line/RAN level.
- Return export eligibility should recheck return authorization/RAN source version, freshness, lifecycle state, and return line references before export generation.
- Stale, closed, superseded, unauthorized, or mismatched returns should be blocked or routed to review.
- Re-export should be explicit, item-scoped, permissioned, and auditable.
- Manual download workflow references should track actor, permission/scope reference, download count, and last downloaded timestamp.
- Bulk status lookups should be paginated by tenant/vendor/buyer/entity/export window.

### Return Line Evidence Controls

- Return line disposition evidence should use per-line duplicate prevention keys, not only import-job-level idempotency.
- Partial return acceptance should require CIXCI Return Line ID, package/receipt reference, or another approved distinguisher when RAN + SKU/UPC is not unique enough.
- Received, accepted, rejected, and partially accepted quantities should be checked against expected return quantity and retained with applied/ignored/superseded state.
- Quantity reconciliation failures should create review-required state and should not silently collapse into a summary return disposition.
- Bulk return line status lookup should be paginated by tenant, vendor, RAN, return line, source return request, and import job.

### Tracking And Status Controls

- Tracking validations should be queued or rate-limited by tenant, vendor, carrier, and operation family.
- Unsafe/malformed tracking URL reviews should not block unrelated shipment updates.
- Shipment status updates should use per-shipment and per-line idempotency keys, source versions, source timestamps, received timestamps, and stale/out-of-order handling.
- Partial shipment/package placeholders should have row and quantity caps until explicit implementation rules are defined.

### Buyer Update Controls

- Buyer update-ready events should be partitioned by tenant, buyer/entity, vendor, operation type, and source record.
- Integration transport failures and Notification delivery failures should be linked as references without blocking core Fulfillment state transitions.
- Duplicate buyer-update-ready events should dedupe by shipment/return/source version and operation family.

### Retry Budgets

- Retry budgets should be scoped by tenant, vendor/manufacturer target, carrier placeholder, integration reference, operation type, source system, and exception family.
- Retry budgets should distinguish transient transport failures from data conflicts, validation blockers, and ownership boundary failures.
- Retry exhaustion should create review-required or dead-letter state rather than infinite retry.

### Dead-Letter And Quarantine Handling

- Dead-letter records should preserve source payload reference, import job/batch reference, row identity where applicable, error summary, retry count, source system, tenant scope, affected record, and review queue.
- Quarantine placeholders should be available for suspicious tracking URLs, malformed files, repeated RAN mismatches, non-reconciling return quantities, duplicate shipment line rows, and provider callback conflicts.
- Dead-letter and quarantine handling should not delete source events or bypass audit retention.

### Manual Review SLAs And Priority Classes

- Manual review queues should include priority class, owner, target SLA placeholder, escalation behavior, and audit trail.
- Priority classes should distinguish customer-impacting shipment delays, invalid tracking URLs, missing tracking, shipment line conflicts, RAN validation failures, return chronology conflicts, return quantity reconciliation failures, vendor refund evidence conflicts, repeated import failures, and integration outages.
- SLA timers should create operational signals, not Analytics metric definitions.

### Fanout Limits

- Event fanout should be bounded by consumer class and operation family.
- Non-critical consumers such as Analytics, AI Agent Services, or Notification should not block core operational state transitions.
- Consumer-specific payload boundaries and redaction classes should be enforced before fanout.

## Open Questions

### Fulfillment Handoff

- Which handoff dispositions should be synchronous versus event-driven?
- Which handoff failures require Order Routing review versus Fulfillment review?
- Can a handoff disposition be superseded, and what evidence is required?
- Which duplicate handoff blockers are hard blockers versus idempotent acknowledgements?

### Vendor Fulfillment Imports

- Which fulfillment import schema and exact CSV headers are supported at launch?
- Which vendor fulfillment imports are manual CSV, API, webhook, SFTP, or scheduled email workflows?
- Which locked field changes are hard errors versus review-required?
- Which blank field behaviors are ever allowed to clear existing values?
- Which split shipment/package structures allow multiple rows for one suborder + SKU/UPC?
- Which routed suborder line identifier, shipment line identifier, or package identifier is required to accept split shipment rows?
- Can shipped/delivered quantities ever exceed expected quantity, and what review authority is required?

### Shipment And Tracking

- Which carriers get format validation at launch?
- Which carrier/provider callbacks are accepted through Integration Management?
- Which tracking URL redirect behavior is allowed for customer-facing experiences?
- Which source is authoritative when vendor, carrier, buyer, and internal statuses conflict?
- When does CIXCI consider an order operationally fulfilled: shipped, delivered, vendor-confirmed, carrier-confirmed, buyer-confirmed, or line/package complete?

### Vendor Return Export / Import

- Which returns are eligible for vendor export at launch?
- Which return export schema and exact CSV headers are supported?
- Which return export files are split by buyer/retailer?
- Which manual download permissions and schedule rules are required?
- Which re-export scenarios are allowed and what approval is required?
- Which return import schema and exact CSV headers are supported?
- Which RAN states are accepted, blocked, or review-required?
- Which return authorization freshness window is required before vendor export?
- Which partial return line structures allow duplicate RAN + SKU/UPC rows?
- Which CIXCI Return Line ID, receipt/package reference, or other distinguisher is required for partial return disposition rows?
- How should accepted, rejected, and partially accepted quantities reconcile when a vendor provides incomplete quantity evidence?

### Return Disposition / Financial Boundary

- Which operational return dispositions are supported at launch?
- Which return condition taxonomy is supported?
- Which vendor refunded amount fields are accepted as evidence?
- Which vendor refund evidence values are consumed by Pricing versus Invoice Management?
- Which financial statuses must be hidden or redacted in Fulfillment-facing views?
- What happens when vendor disposition conflicts with buyer-facing return expectations?

### Buyer Updates / Notifications / Integration

- Which shipment and return updates should trigger buyer transport?
- Which buyer updates are API, webhook, CSV, SFTP, manual download/upload, or scheduled email flows?
- Which buyer updates should also become user notifications?
- How should Integration transport failures be linked back to Fulfillment records?
- How should lost access or stale Tenant Company scope be rechecked before buyer update transport?

### AI Agent Services

- Which import validation failures should AI summarize first?
- Which correction suggestions are allowed for tracking URLs, carriers, dates, RANs, and condition values?
- What approved action contracts are needed before AI can help apply corrections or confirm imports?

### PR-A Open Questions

Classified per project discipline (estimate blocker / business/product decision / implementation detail / future phase / cleanup-only).

- **PR-A OQ 1 — Tenant Company business calendar dependency.**
  - Classification: **Defer with owner; not an apply blocker.**
  - Rationale: SLA Policy references `business_calendar_reference`. If the Tenant-Company-owned calendar (or future-platform-owned calendar) is not yet available on `main`, PR-A's fallback is calendar-day semantics with audit-visible note. The fallback is proposal-level and not final implementation behavior.
  - Destination: Tenant Company future PR or future platform calendar standard.

- **PR-A OQ 2 — Fulfillment Import Received Timestamp: transport receipt vs. post-validation acceptance.**
  - Classification: **Resolved by PR-A: transport receipt.**
  - Rationale: Per scoping decision 3, the SLA-relevant timestamp is the transport receipt time. Post-validation acceptance failures remain operational concerns surfaced through existing validation exceptions. A malformed on-time file does not silently count as successful fulfillment completion.

- **PR-A OQ 3 — First-row vs first-transport-receipt timing for the SLA-relevant timestamp.**
  - Classification: **Resolved by PR-A: first transport receipt.**
  - Rationale: Per scoping decision 4, the SLA-relevant timestamp is the first transport receipt of the import payload. Row-level validity is evaluated separately by Fulfillment / Returns validation workflows.

- **PR-A OQ 4 — SLA Policy cutoff configuration: own vs. reference Order Routing's Schedule cutoffs.**
  - Classification: **Resolved by PR-A: SLA Policy carries its own cutoffs.**
  - Rationale: Per scoping decision 5, the two configurations are conceptually distinct (export delivery cutoff vs. vendor response deadline). Operators must be able to set them independently.

- **PR-A OQ 5 — Three Exception entities vs. one with discriminator.**
  - Classification: **Resolved by PR-A: three distinct entities.**
  - Rationale: Per scoping decision 2, the three Exception types have distinct triggers, review semantics, and downstream subscription patterns.

- **PR-A OQ 6 — Late-import-after-Missing-Exception handling.**
  - Classification: **Resolved by PR-A: close Missing + open Late.**
  - Rationale: Per scoping decision 6, Missing and Late are distinct facts at distinct moments; the audit trail preserves both.

- **PR-A OQ 7 — Multiple Exceptions per suborder.**
  - Classification: **Resolved by PR-A: permitted.**
  - Rationale: Per scoping decision 7, multiple Exceptions per SLA Evaluation Record are permitted when warranted (e.g., Partial + Late on the same suborder).

- **PR-A OQ 8 — SLA Override Authority: distinct class vs. extension of existing taxonomy.**
  - Classification: **Cleanup-only.**
  - Rationale: Per scoping decision 9, the bundle reviewer determines from current `permissions.md` content whether extension or distinct-class is the right approach. Both approaches satisfy PR-A's discipline requirements.
  - Destination: confirm during bundle drafting from current permissions.md content.

- **PR-A OQ 9 — Time-driven Missing Exception detection cadence.**
  - Classification: **Implementation detail.**
  - Rationale: PR-A defines the architectural behavior (time-driven scan creates Missing Exception when deadline elapses with no import). Scan frequency, idempotency, and concurrency are implementation territory.
  - Destination: implementation.

- **PR-A OQ 10 — SLA Policy / Evaluation Record / Exception / Override Evidence retention.**
  - Classification: **Implementation detail (Logs & Audit retention policy).**
  - Rationale: How long are SLA-related records retained? Owned by Logs & Audit retention policy.
  - Destination: Logs & Audit.

Lettered open questions (secondary):

- **PR-A OQ A — SLA Override / Excuse Evidence `reason_category` enumeration.**
  - Classification: **Business / product decision.**
  - Rationale: PR-A proposes `vendor_confirmed_outage`, `cixci_infrastructure_outage`, `force_majeure`, `dispute_pending`, `other_evidenced`, `override_reversal`. The final enumeration may require business input.
  - Destination: business / product decision; not blocking PR-A.

- **PR-A OQ B — SLA Breach Signal payload granularity.**
  - Classification: **Defer to Boundary/Handoff PR or future contracts-PR.**
  - Rationale: PR-A defines the signal at architecture level with reference-first shape. Finer payload contracting is deferred.

- **PR-A OQ C — SLA evaluation when Order Routing Delivery Evidence is `unconfirmable`, `failed`, or `partial`.**
  - Classification: **Defer to Boundary/Handoff PR.**
  - Rationale: PR-A consumes `confirmed` only. The behavior for non-`confirmed` states is explicit Boundary/Handoff PR territory.

- **PR-A OQ D — Override Evidence granularity: Exception-level vs. per-line.**
  - Classification: **Business / product decision.**
  - Rationale: A Partial Exception may have some lines that should be overridden and others that should remain a breach. PR-A models Override Evidence at Exception-level only; per-line granularity is a future refinement.
  - Destination: future Fulfillment / Returns refinement PR.

- **PR-A OQ E — Vendor visibility into their own SLA Evaluation Records and Exceptions.**
  - Classification: **Future phase / business / product decision.**
  - Rationale: Should vendors see their SLA history? Out of PR-A scope. Phase 1 has no vendor-facing SLA surface.
  - Destination: future PR.

- **PR-A OQ F — SLA Policy with `override_allowed = false`: operational implications.**
  - Classification: **Business / product decision.**
  - Rationale: When `override_allowed = false`, a breach can be `resolved` or `closed` but not `overridden`. The operational consequence for vendors is that breaches are not excusable. PR-A enables the configuration; operational policy is business decision.

- **PR-A OQ G — Severity priority refinement.**
  - Classification: **Cleanup-only / future alignment.**
  - Rationale: PR-A proposes `Late > Missing > Partial > On Time`. Existing Fulfillment / Returns severity patterns may exist that should be aligned in a future PR.
  - Destination: future cleanup PR.

- **PR-A OQ H — Behavior when no `active` SLA Policy exists for a suborder's vendor / route.**
  - Classification: **Business / product decision.**
  - Rationale: PR-A's fallback: Evaluation Record is created with a flag indicating no Policy applied; outcome cannot be determined; routes to operational review. The business decision is whether this should be a hard failure (no Evaluation Record created), a default-Policy fallback (apply a platform-default Policy), or the proposed Evaluation-Record-with-flag.
  - Destination: confirm with business stakeholders.

### Boundary/Handoff PR Open Questions

Classification legend:
- **Estimate blocker** - must be answered before developer estimate is meaningful.
- **Business / product decision** - operational policy or product configuration; not a code blocker.
- **Implementation detail** - developer / DevOps choice within the architecture envelope.
- **Future phase** - anticipated future work; intentionally not scoped here.
- **Cleanup-only** - minor naming / wording resolution.

#### Resolutions from prior PRs

- **PR #92 OQ C resolved by this PR.** PR #92's Open Question C ("SLA evaluation when Order Routing Delivery Evidence is `unconfirmable`, `failed`, or `partial`") is resolved by the Boundary/Handoff PR's Non-Confirmed Delivery Evidence Handling contract rule. The Phase 1 disposition is:
  - Source `failed` -> Handoff Record in `consumption_skipped`; no SLA Evaluation Record.
  - Source `unconfirmable` -> Handoff Record in `consumption_skipped`; no SLA Evaluation Record.
  - Source `partial` -> Handoff Record in `consumption_held`; no SLA Evaluation Record; no SLA clock start.
  See `modules/fulfillment-returns/boundary-contracts.md` Non-Confirmed Delivery Evidence Handling section and `modules/fulfillment-returns/workflows.md` Workflow B.

#### New open questions

- **Boundary/Handoff PR OQ 1 - Handoff Record visibility to vendors.**
  - Classification: Future phase / business decision.
  - Detail: Phase 1 keeps Handoff Records internal. Whether vendors should later see their own Handoff Record state (especially `consumption_skipped` rationale) is a future business decision.
  - Destination: Future Fulfillment / Returns hardening PR.

- **Boundary/Handoff PR OQ 2 - Multi-consumer Handoff Records.**
  - Classification: Future phase.
  - Detail: Phase 1 has one consumer scope (`fulfillment-returns.sla-evaluation`). Future Analytics / Invoice Management consumption would introduce additional consumer scopes. The `consumer_scope_reference` field is forward-compatible; no contract change anticipated.
  - Destination: Future PR.

- **Boundary/Handoff PR OQ 3 - Operator UI for handoff failures and held records.**
  - Classification: Future phase / API governance.
  - Detail: Phase 1 has no operator-visible surface for `consumption_failed`, `consumption_held`, or `consumption_skipped` records beyond audit references. Future API Governance Foundation PR will add lookup surfaces.
  - Destination: API Governance Foundation PR.

- **Boundary/Handoff PR OQ 4 - Bounded replay window duration.**
  - Classification: Implementation detail / Integration Management transport policy.
  - Detail: How far back in time replays are accepted is Integration Management transport policy. The architectural contract is that consumers must be idempotent under arbitrary replay; duration is not specified here.
  - Destination: Integration Management transport policy decision.

- **Boundary/Handoff PR OQ 5 - `consumption_held` record age alerting.**
  - Classification: Future phase / Cross-Module Summary Email PR.
  - Detail: Long-running `consumption_held` records may indicate systematic Schedule misconfiguration producing partial deliveries. Phase 1 records audit only; future PR may add age-based alerting on held records.
  - Destination: Cross-Module Summary Email PR or future operations PR.

- **Boundary/Handoff PR OQ 6 - Retry policy tuning for `consumption_failed` records.**
  - Classification: Implementation detail.
  - Detail: How many retry attempts, what backoff, what dead-letter trigger - all Integration Management transport policy. Architecture commitment is that `consumption_failed -> pending` retry transitions are supported and audited.
  - Destination: Integration Management.

- **Boundary/Handoff PR OQ 7 - Future partial-delivery-starts-clock SLA Policy opt-in.**
  - Classification: Future phase / business decision.
  - Detail: Phase 1 firmly does not start SLA clock on partial delivery. Future SLA Policy may opt into this behavior, but it requires new transition discipline on `consumption_held` records and likely additional contract notes. Not scoped here.
  - Destination: Future Fulfillment / Returns hardening PR.

- **Boundary/Handoff PR OQ 8 - Handoff Record retention duration.**
  - Classification: Implementation detail / Logs & Audit retention policy.
  - Detail: How long Handoff Records are retained is Logs & Audit retention policy. Not specified here.
  - Destination: Logs & Audit.

- **Boundary/Handoff PR OQ 9 - Optional `cross_module_handoff_record_reference` in `fulfillment-returns.sla-evaluation.created` payload.**
  - Classification: Implementation detail.
  - Detail: Whether to add the back-reference to the event payload or rely on SLA Evaluation Record lookup. Both achieve the observability commitment; choice is implementation-level.
  - Destination: Developer / implementation decision.

- **Boundary/Handoff PR OQ A - Multi-tenant handoff scope.**
  - Classification: Future phase.
  - Detail: Phase 1 uses Tenant Company scope for E3 eligibility. Future multi-tenant complexities (e.g., shared vendors across tenants) are not anticipated as a Phase 1 issue but flagged here.
  - Destination: Future PR.

- **Boundary/Handoff PR OQ B - Eligibility decision rationale enumeration.**
  - Classification: Cleanup-only.
  - Detail: Phase 1 proposes reasons like `no_active_sla_policy`, `vendor_out_of_scope`, `route_not_sla_evaluatable`, `consumer_scope_unknown`. Operations may want the enumeration tightened or extended.
  - Destination: Future operations PR.

- **Boundary/Handoff PR OQ C - Handoff observability metrics for cross-module health.**
  - Classification: Future phase.
  - Detail: Cross-module handoff success rate, skip rate, held-record count are health signals operators may want to monitor. Phase 1 records audit references; aggregation is future.
  - Destination: Cross-Module Summary Email PR or future Analytics PR.

## Risks

- Fulfillment could become a hidden routing engine if it changes fulfillment targets after failed handoff or import mismatch.
- Fulfillment could become a financial engine if return disposition or vendor refunded amount becomes final refund/invoice/payment behavior.
- Fulfillment could become Integration Management if it owns delivery/receipt retries or carrier callback evidence.
- Fulfillment could become Logs & Audit if it owns immutable file/download evidence rather than workflow references.
- Fulfillment could become Notification if buyer-update-ready signals become scheduled email or notification delivery ownership.
- Vendor imports could mutate locked order fields if header/locked-field validation is incomplete.
- Blank fields could erase tracking/return evidence without explicit clear governance.
- Duplicate fulfillment rows or re-exported return rows could cause duplicate vendor processing.
- Shipment summaries could hide line/package conflicts if per-line evidence is not retained.
- Return summary disposition could hide partial return conflicts if per-line quantity evidence is not retained.
- Stale or out-of-order status updates could overwrite accurate current state without immutable evidence and source authority rules.
- Vendor refund evidence could leak to unauthorized consumers without redaction classes and consumer-specific payload boundaries.

### PR-A Risks

- **PR-A R1. Boundary leakage with Order Routing.** PR-A consumes Vendor Export Delivery Evidence read-only. Risk: a workflow accidentally mutates Order Routing state (e.g., transitions `export_review_required_state` when resolving an SLA breach). Mitigation: explicit boundary-contracts.md declarations; APPLY.md verification that no Order Routing file is modified.

- **PR-A R2. SLA Policy / Order Routing Schedule cutoff configuration confusion.** SLA Policy and Order Routing Vendor Export Schedule both carry cutoff times for different purposes. Operators may not understand the distinction. Mitigation: explicit documentation in `data-model.md`, `boundary-contracts.md`, and `spec.md`; the two configurations are not coupled at the entity level.

- **PR-A R3. Fulfillment Import Received Timestamp interpretation.** Transport-receipt vs. post-validation-acceptance has dispute implications. PR-A locks down transport receipt as the SLA-relevant timestamp. Vendor disputes arising from on-time-but-invalid imports route through SLA Override / Excuse Evidence (via Workflow 10) rather than through SLA timestamp arguments.

- **PR-A R4. SLA Override Authority scope.** PR-A's Phase 1 grants SLA Override Authority to CIXCI System Admin only. Risk: future operational needs may require delegation (e.g., vendor success managers, regional operations leads). Mitigation: Phase 1 is conservative; future broadening via additive permissions PR.

- **PR-A R5. Late-import-after-Missing-Exception race condition.** Concurrency between time-driven Missing detection and late import receipt may produce duplicate Exceptions. Mitigation: PR-A's data model requires uniqueness at (SLA Evaluation Record, Exception kind) for Late and Missing; implementation idempotency is flagged.

- **PR-A R6. Partial response combinatorics.** Suborders may receive partial responses combined with completion across deadline boundaries. PR-A documents the resolution rules; implementation complexity is non-trivial.

- **PR-A R7. SLA breach thrash.** A vendor whose imports consistently arrive a few seconds after Expected Deadline produces a stream of Late Exceptions. Operational burden. Mitigation: out of PR-A scope; future grace-period configuration or vendor performance-tuning PR.

- **PR-A R8. Override Evidence reversal complexity.** If overrides are reversed after downstream consumers (Analytics, Cross-Module Summary Email PR) have aggregated the original override, reconciliation may be confusing. Mitigation: PR-A documents reversal as audit-bearing; downstream consumers must reconcile.

- **PR-A R9. Vendor-confirmed outage as override reason.** Risk of silently waiving disputes via override. Mitigation: Override Evidence records `reason_category` and `supporting_evidence_reference`; audit visibility is the discipline.

- **PR-A R10. Cross-module event idempotency for Order Routing consumption.** Duplicate or replayed `order-routing.export-delivery-evidence.confirmed` events could produce duplicate SLA Evaluation Records. Mitigation: PR-A's data model requires uniqueness at `(suborder_reference, vendor_export_delivery_evidence_reference)`; full transport semantics are Boundary/Handoff PR.

- **PR-A R11. Time-driven Missing detection reliability.** A periodic scan that fails to fire or fires inconsistently may produce inconsistent Missing Exception creation. Mitigation: implementation operations concern; PR-A's architecture-level commitment to time-driven detection is the policy.

- **PR-A R12. Business calendar fallback.** Calendar-day fallback (when business calendar is unavailable) is proposal-level. Risk: in production, weekends would not be skipped under the fallback, producing unrealistic Expected Deadlines. Mitigation: PR-A OQ 1 defers the calendar dependency; bundle reviewer should confirm calendar status before relying on the SLA evaluation surface operationally.

- **PR-A R13. Invoice Management linkage (future).** Vendor commission / performance linkage is foreseeable. Risk: future PRs link SLA breach state to commissions; an Override reversal post-invoice could complicate reconciliation. Mitigation: PR-A does not enable the linkage; future PR coordinates carefully.

- **PR-A R14. Notification Platform Service routing.** PR-A produces SLA Breach Signal at architecture level. Risk: the signal is produced but no consumer is routing it until Cross-Module Summary Email PR lands; operators may not be alerted to breaches in the interim. Mitigation: documented as Cross-Module Summary Email PR dependency; interim manual review via Workflow 9 is the discipline.

- **PR-A R15. Severity priority alignment with existing Fulfillment / Returns patterns.** PR-A's `Late > Missing > Partial > On Time` is proposal-level. Existing Fulfillment / Returns severity patterns may use different ordering. Mitigation: future cleanup PR (PR-A OQ G) aligns; PR-A documents the proposal-level nature.

### Boundary/Handoff PR Risks

- **Boundary/Handoff PR R1. Producer / consumer ownership boundary leakage.** A future PR may inadvertently introduce handoff state on the Order Routing side. Mitigation: this PR codifies producer-side commitments in `modules/order-routing/boundary-contracts.md` explicitly stating Order Routing does not own consumption state; APPLY.md verification rejects any change to Order Routing data-model / workflows / events / permissions / api-contracts.
- **Boundary/Handoff PR R2. Implicit consumer coupling to specific transport.** Consumer implementation may assume specific Integration Management transport mechanics. Mitigation: contract specifies guarantees at architectural level (at-least-once, idempotent consumer); implementation must be safe under arbitrary reordering.
- **Boundary/Handoff PR R3. Eligibility decision opacity.** Operators may not be able to easily see why specific events landed in `consumption_skipped`. Mitigation: audit reference captures rationale; future API Governance Foundation PR adds lookup surfaces.
- **Boundary/Handoff PR R4. PR #91 / PR #92 invariant drift.** A future PR weakening PR #91's terminal-once-confirmed invariant or PR #92's SLA Evaluation Record discipline would break this PR's contract assumptions. Mitigation: this PR's test scenarios and edge cases assert the invariants; future PRs are forced to address the contract.
- **Boundary/Handoff PR R5. Replay storm.** Aggressive transport-layer replay (e.g., after a broker restart) produces many `replay_acknowledged` audit references. Idempotency handles correctness but operator visibility may be poor. Mitigation: audit records the storm; operator-visible metrics deferred.
- **Boundary/Handoff PR R6. `consumption_held` records accumulate without resolution.** Partial source Delivery Evidence produces `consumption_held` records with no resolution path in Phase 1. Long-running held records may indicate systematic operational issues. Mitigation: audit reference; future age-based alerting (Boundary/Handoff PR OQ 5).
- **Boundary/Handoff PR R7. Eligibility check race conditions.** SLA Policy may be edited between source event arrival and eligibility check. Mitigation: PR #92's SLA Policy versioning means eligibility check captures the active version at consumption time; subsequent Policy edits don't retroactively change Handoff Record eligibility (replay-time invariant).
- **Boundary/Handoff PR R8. Idempotency key collisions.** Insufficient key derivation could produce false-duplicate matches. Mitigation: key derivation specifies `vendor_export_delivery_evidence_reference` + `consumer_scope_reference`, both stable and unique.
- **Boundary/Handoff PR R9. Replay across SLA Policy version changes.** A replay arriving after SLA Policy version change could re-evaluate to a different outcome. Mitigation: replay-time eligibility invariant honors the original decision; re-evaluation is not performed.
- **Boundary/Handoff PR R10. Vendor disputes `consumption_skipped` outcomes.** A vendor whose source evidence was `consumption_skipped` may dispute the skip. Mitigation: audit trail records eligibility decision rationale; vendor visibility is future-phase OQ 1.
- **Boundary/Handoff PR R11. Vendor disputes `consumption_held` outcomes.** Partial delivery -> no SLA evaluation. Vendor may argue partial delivery should have started the clock or should not have. Mitigation: Phase 1 conservative posture; future SLA Policy opt-in (OQ 7).
- **Boundary/Handoff PR R12. Cross-module PR review complexity.** Cross-module diffs are harder to audit for boundary leakage. Mitigation: APPLY.md verification checks both directions explicitly; pre-flight verifies PR #91 and PR #92 markers; post-application verifies no forbidden module file is changed.
- **Boundary/Handoff PR R13. Out-of-order arrival anomaly.** A `failed` source event arriving after a `consumed` Handoff Record exists for the same idempotency key is anomalous (PR #91's source state machine doesn't allow it). Mitigation: Workflow B Step 3 audits the anomaly without transitioning state; canonical `consumed` is preserved.
- **Boundary/Handoff PR R14. Future API surface coupling.** Future API Governance Foundation PR will add Handoff Record lookup surfaces; coupling those surfaces to internal Handoff Record fields could constrain refactoring. Mitigation: API surface design is future-PR concern; this PR establishes the data shape.
- **Boundary/Handoff PR R15. Implicit dependency on Integration Management transport behavior.** If transport doesn't actually deliver at-least-once (e.g., events occasionally lost), Handoff Records will be missing rather than duplicated, producing different operational outcomes than this PR's contract anticipates. Mitigation: Integration Management owns the transport contract; this PR's audit references make missing-event detection possible via reconciliation against Order Routing source state.

## Decisions Needed Before Implementation

- Fulfillment handoff disposition contract with Order Routing.
- Vendor fulfillment import schema and locked/editable field list.
- Vendor return export/import schema and locked/editable field list.
- Shipment line/package evidence model and required row identifiers.
- Shipment status and source authority model.
- Carrier/tracking URL validation rules.
- Return RAN lifecycle and validation rules.
- Return line disposition evidence model and required row identifiers.
- Return operational disposition taxonomy.
- Financial evidence handoff contract with Pricing and Invoice Management.
- Integration Management transport/callback handoff contract.
- Notification trigger contract.
- Logs & Audit file/import/export evidence contract.
- Retry budget, queue partitioning, replay window, quarantine, and dead-letter policies.
### PR-B Assumptions

PR-B operates under the following confirmed assumptions established during scoping:

- Phase 1 source for Delivery Date Evidence is vendor-submitted only via existing Fulfillment Imports. Carrier-originated evidence is anticipated by source-agnostic naming but is not implemented in this PR.
- The Multi-Vendor / Multi-Suborder Buyer Update Rule has Phase 1 default of all-vendors aggregation: buyer-facing updates are held until all vendor suborders / Shipment Lines required for the parent order reach the corresponding state. Per-buyer configurability is anticipated by `buyer_integration_profile_reference` but is not implemented.
- Buyer Update-Ready Signal is a single entity with `update_kind` discriminator (`shipment`, `delivery`, `correction`); not split into separate entities per kind.
- Delivered Shipment Evidence is represented as field extensions on the existing Shipment Line entity; not a standalone entity.
- Shipment Status Evidence and Shipment Line Evidence are existing baseline concepts; PR-B does not introduce new entities for them.
- Vendor users are excluded from Delivery Date Correction Evidence creation and from any authority-gated action in Phase 1.
- CIXCI System Admin holds the Delivery Date Override / Correction Authority in Phase 1.
- Authority resolution flows through Tenant Company `check_access` per the established pattern from PR #91 and PR #92.
- PR #92's SLA semantics are preserved unconditionally: PR-B's Delivery Date validation outcomes do not retroactively change PR #92's SLA Evaluation Record outcome.
- Buyer Update-Ready does not equal buyer update delivered. Only the `acknowledged` lifecycle state constitutes evidence of buyer delivery.
- Integration Management owns buyer-update transport mechanics; Fulfillment / Returns produces the Update-Ready signal and reads dispatch / acknowledgement / failure outcomes by reference.
- Notification Platform Service is not in scope for buyer-update transport in PR-B.
- Analytics / Reporting is a future consumer; PR-B does not introduce Analytics aggregation.
- Logs & Audit retains all PR-B audit references with retention policy owned by Logs & Audit.
- Tenant Company owns buyer scope, vendor scope, `check_access`, and the buyer-level pause flag consumed by the `held_buyer_integration_paused` hold reason.
- PR-B is one PR with twelve target files; the four event families totaling 13 events are the complete additive event inventory.
- The thirteen PR-B events are introduced at baseline `eventVersion` (v1 or equivalent per existing convention).
- The redaction class `buyer_scoped` is introduced for Buyer Update-Ready Signal events; existing redaction class assignments for PR #91, PR #92, and baseline events are unchanged.
- Delivery Date Correction Evidence is immutable once created; reversal of a prior correction requires a new Correction Evidence record.
- Prior Delivery Date Evidence is never edited in place during correction; the prior record transitions to `superseded` and is preserved.
- Correction after buyer was previously updated produces a new correction-kind Buyer Update-Ready Signal; the prior delivery-kind signal record is preserved unchanged.
- Correction during pending or held buyer-update produces controlled supersession of the existing signal in place; no silent mutation.
- Authority-missing and audit-evidence-missing are distinct failure cases (`DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED` vs `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING`); manual hold authority is similarly distinct (`BUYER_UPDATE_MANUAL_HOLD_AUTHORITY_REQUIRED`).
- `rejected_duplicate` is an idempotent acknowledgement, not an error.
