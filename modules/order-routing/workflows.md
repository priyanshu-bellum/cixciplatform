# Order Routing Workflows

This document is proposal-level. It outlines initial Order Routing workflows without finalizing implementation behavior.

## Primary Workflows

### Route Evaluation / Dry-Run

1. Receive route evaluation request with parent order reference, routeable lines, tenant scope, product/device references, Product Type, price snapshot references, and requested Routing Policy Version where applicable.
2. Validate idempotency key, correlation id, routing input hash, and request shape.
3. Evaluate Tenant Company scope signals without deriving eligibility.
4. Evaluate Product Catalog and Device Catalog references without owning product/device source records.
5. Evaluate Pricing snapshot availability without recalculating price.
6. Evaluate Product Type routing capability and Routing Policy Version.
7. Return candidate routes, blockers, warnings, Routing Rule Conflicts, and execution eligibility.
8. Do not create vendor suborders, manufacturer suborder placeholders, execution routing snapshots, vendor export eligibility records, vendor export batches, fulfillment handoff requests, or warranty registration delivery state.

### Parent Order Routing / Route Execution

1. Receive accepted parent order intake reference from buyer-facing order intake or future Orders context.
2. Validate idempotency key, correlation id, and routing input hash.
3. Load authorized Tenant Company scope signals.
4. Load Product Catalog references, Product Type, lifecycle/routability, stop-sell/deactivation, activation, compatibility, and warranty facts where required.
5. Load Device References where relevant.
6. Load Pricing snapshot or quote-like order-bindable result.
7. Select Routing Policy Version and applicable Routing Rules.
8. Decompose parent order into routeable order lines and line groups.
9. Evaluate vendor/manufacturer assignment and split-order rules through the Routing Precedence Ladder.
10. Create routed order record, routing decision records, suborder structures, and immutable routing snapshot.
11. Emit routing and suborder events.
12. Optionally trigger vendor export eligibility and fulfillment handoff request workflows according to proposal-level rules.

### Routing Policy Evaluation

1. Identify candidate Routing Policies by tenant scope, Product Type, vendor/manufacturer target, region/channel, timeframe, warranty requirement, export method, and fulfillment target.
2. Filter policies by active Routing Policy Version.
3. Evaluate Routing Rules in the proposal-level precedence ladder.
4. Detect equal-specificity or incompatible Routing Rule Conflicts.
5. Block or send to review when conflicts cannot be safely resolved.
6. Record policy version and rule version references in decision records and snapshots.

### Order Decomposition

1. Read order lines from parent order intake reference.
2. Group lines by routing-relevant dimensions such as vendor, manufacturer placeholder, Product Type, fulfillment target, tenant scope, warranty registration requirement, and downstream constraints.
3. Preserve parent order and order line references.
4. Record decomposition rule version and audit reference.

### Vendor Suborder Creation

1. Select vendor assignment based on explicit eligibility and route rules.
2. Preserve product references, pricing snapshot references, tenant scope, fulfillment target references, and routed suborder dedupe key.
3. Create vendor suborder record.
4. Emit `order.suborder.created`.
5. Hand off downstream fulfillment instruction placeholder without owning fulfillment execution.

### Vendor Routed-Suborder Export Eligibility

1. Receive vendor export eligibility request from routing execution, schedule, manual action, or approved service workflow.
2. Validate parent order reference, tenant scope, vendor reference, buyer/entity reference, export window, source event/reference, source version, export schema version, export inclusion rule version, routed suborder references, routing snapshot references, and idempotency key.
3. Include only routed suborders assigned to the target vendor.
4. Include only routed suborders eligible for vendor processing.
5. Exclude cancelled or superseded routed suborders.
6. Exclude routed suborders already exported in the same batch unless explicit re-export is requested.
7. Exclude routed suborders assigned to another vendor.
8. Preserve prior export state, re-export allowed flag, supersession/cancellation state, and audit reference.
9. Create vendor order export eligibility records with included/excluded summaries and review-required state where applicable.
10. Emit `order.routing.vendor-export.eligibility-created`.
11. Route ambiguous eligibility to review rather than generating unsafe export content.
12. Do not mutate Fulfillment/Returns execution state or external delivery state.

### Vendor Order Export Batch Generation

1. Receive approved vendor export eligibility references.
2. Validate export schema version, export inclusion rule version, vendor reference, tenant scope, export window, split-by-buyer flag, export method reference, batch idempotency key, and generated-by actor/service reference.
3. Create Vendor Order Export Batch.
4. For each routed suborder, create Vendor Order Export Batch Item with eligibility record reference, included/excluded status, included/excluded reason, prior export membership reference, source event/version, duplicate prevention key, and review-required state.
5. Block duplicate export at routed-suborder/batch-item level unless explicit re-export authorization exists.
6. Build vendor order export content reference from included batch items only.
7. Preserve routed suborder references, routing snapshot references, export window, source event reference, file/reference placeholder, delivery reference placeholder, and audit reference.
8. Emit `order.routing.vendor-export.batch-created`, `order.routing.vendor-export.batch-item.included`, `order.routing.vendor-export.batch-item.excluded`, and `order.routing.vendor-export.generated` as applicable.
9. Reference Logs & Audit for file/export evidence rather than owning immutable file evidence.
10. Reference Integration Management or Notification Platform Service only where delivery workflows are later invoked.

### Buyer / Retailer Split Export

1. Determine whether vendor export must be split by buyer or retailer based on authorized configuration or operational rule reference.
2. Preserve split reference id, vendor reference, buyer/entity reference, split rule version, export batch reference, routed suborder references, routing snapshot references, review-required state, and audit reference.
3. Generate buyer/retailer split references.
4. Emit `order.routing.vendor-export.split-reference.created`.
5. Do not alter routing decisions, parent order linkage, vendor assignment, pricing snapshots, or fulfillment ownership.
6. Route conflicts to review if split behavior cannot be reconciled with routing evidence.

### Manual Vendor Order Download

1. Receive manual download request for eligible vendor routed-suborder CSV export.
2. Validate Tenant Company user/vendor/company/entity permission evidence.
3. Validate export batch status, redaction class, export schema version, and manual download eligibility.
4. Record Manual Download Reference with export batch reference, actor/user reference, vendor/company/entity reference, download timestamp, download count, last downloaded by, last downloaded at, permission/scope reference, and audit reference.
5. Emit `order.routing.vendor-export.manual-download-recorded`.
6. Reference Logs & Audit for immutable download/file evidence.
7. Do not deliver scheduled email or external transport inside Order Routing.

### Vendor Order Re-Export

1. Receive explicit re-export request with original export batch reference, original export batch item references, requested routed suborders, re-export reason, requested by actor/service, Tenant Company permission/approval reference, and idempotency key.
2. Preserve duplicate processing risk flag, allowed/blocked state, generated replacement export reference, supersession reference, and audit reference.
3. Validate whether re-export is allowed for the prior batch items and routed suborder state.
4. Re-run inclusion rules with the requested export inclusion rule version.
5. Create re-export request reference.
6. Emit `order.routing.vendor-export.re-export-requested`, `order.routing.vendor-export.re-export-approved`, or `order.routing.vendor-export.re-export-blocked` as applicable.
7. Generate replacement export batch only for explicitly requested and allowed routed suborders.
8. Route conflicting, stale, unauthorized, duplicate-risk, or overly broad re-export requests to review.
9. Do not silently re-send all previously exported suborders, duplicate routed suborders, or rewrite the original routing snapshot.

### Routing-To-Fulfillment Handoff

1. Identify routed order, vendor suborder, routing snapshot, and export batch item references where applicable.
2. Validate handoff requested timestamp, handoff source version, handoff idempotency key, and downstream fulfillment instruction placeholder.
3. Block duplicate handoff where the handoff idempotency key, routed suborder, export batch item, or prior Fulfillment/Returns disposition indicates duplicate processing risk.
4. Create Fulfillment Handoff Request with Fulfillment/Returns disposition reference placeholder, Fulfillment/Returns source version placeholder, accepted/rejected/ignored state, applied vs ignored state, duplicate handoff blocker, review-required state, and audit reference.
5. Emit `order.routing.fulfillment-handoff.requested` or `order.routing.fulfillment-handoff.duplicate-blocked`.
6. Record Fulfillment/Returns disposition reference later where Fulfillment/Returns provides accepted, rejected, or ignored disposition evidence.
7. Emit `order.routing.fulfillment-handoff.disposition-reference-recorded` when Order Routing records the Fulfillment/Returns disposition reference.
8. Treat `order.routing.fulfillment-handoff.requested` as a request, not proof that Fulfillment/Returns accepted execution.
9. Fulfillment/Returns records handoff acceptance/rejection and operational execution state.
10. Order Routing does not update shipment status, tracking URL, shipped date, delivered date, return status, refund evidence, or fulfillment execution state.

### Manufacturer Suborder Placeholder

1. Identify manufacturer-routed line placeholder where future rules require it.
2. Preserve manufacturer reference, product/device references, parent order linkage, pricing snapshot reference, routing snapshot reference, and routed suborder dedupe key.
3. Mark procurement ownership unresolved where applicable.
4. Do not create purchase order lifecycle or procurement approval.

### Split-Order Routing

1. Determine whether a parent order must split across vendors, manufacturers, Product Types, regions, or fulfillment targets.
2. Enforce fanout limits and maximum suborder count placeholders before execution.
3. Create Split Order Group and suborder references.
4. Preserve parent order linkage and order line references.
5. Ensure every suborder has price snapshot references and tenant scope references.
6. Emit split-order routing summary with redaction.

### Routing Exception And Review

1. Detect exception such as missing price snapshot, invalid tenant scope, unsupported Product Type, product not routable, missing fulfillment target, routing rule conflict, warranty registration method missing, vendor export eligibility conflict, duplicate export, duplicate handoff, or stale/rejected Fulfillment/Returns disposition.
2. Classify exception family, owner, retryability, blocking behavior, and review queue.
3. Create typed Routing Exception.
4. Mark routed order, export eligibility, export batch, export batch item, re-export request, manual download reference, or handoff request as review-required, failed, blocked, or partially completed as appropriate.
5. Notify authorized review consumers by event/reference only.
6. Record retry eligibility and audit reference.

### Retry Workflow

1. Validate exception is retryable.
2. Check retry budget by tenant, parent order, export batch, export batch item, handoff request, exception family, downstream target, and time window.
3. Schedule retry through async queue where applicable.
4. Re-read current required references or use snapshot-bound inputs according to confirmed rule.
5. Create new routing attempt, export eligibility attempt, export batch, export batch item, handoff request, or snapshot where allowed.
6. Mark retry exhausted if max attempts are reached.
7. Use backoff, jitter, and circuit-breaker placeholders to prevent retry storms.

### Manual Override Workflow

1. Authorized reviewer requests manual routing override with reason and affected scope.
2. Approver reviews proposed route, Routing Policy Version, conflict state, export state, handoff state, and boundary impacts.
3. If approved, create new routing snapshot with manualOverrideFlag and supersessionReference.
4. Emit manual override review event and snapshot supersession event.
5. Do not bypass Pricing, Tenant Company, Product Catalog, Device Catalog, Fulfillment, Warranty, Procurement, Invoice, Integration, Notification, Logs & Audit, or Analytics ownership.

### Warranty Registration Signal Workflow

1. Consume Product Catalog warranty registration requirement signal or product warranty facts where authorized.
2. Preserve warranty registration required reference on routeable order line or suborder.
3. Apply Routing Policy to decide whether missing registration method is blocker, warning, or review-required.
4. Emit or carry `warranty.registration.required` when routing output requires it.
5. Do not deliver vendor registration, approve warranty claim, or own warranty claim lifecycle.

## Failure Flows

- Missing parent order reference.
- Missing or invalid tenant scope signal.
- Missing, stale, rejected, or non-order-bindable pricing snapshot.
- Product not routable or stopped from selling.
- Unsupported Product Type.
- Routing Policy Version missing or inactive.
- Routing Rule Conflict.
- Invalid Product Catalog reference.
- Invalid Device Reference.
- Vendor/manufacturer unavailable.
- Missing fulfillment target.
- Warranty registration required but delivery method missing.
- Split-order fanout limit exceeded.
- Vendor export eligibility conflict.
- Vendor export batch duplicate.
- Export batch item duplicate prevention conflict.
- Routed suborder already exported without explicit re-export.
- Routed suborder vendor mismatch.
- Routed suborder cancelled or superseded before export.
- Buyer/retailer split conflict.
- Manual download not authorized by Tenant Company evidence.
- Re-export review required.
- Re-export blocked due to duplicate processing risk.
- Fulfillment handoff review required.
- Fulfillment handoff duplicate blocked.
- Fulfillment/Returns disposition missing, stale, rejected, or ignored.
- Retry budget exhausted.
- Retry storm circuit breaker open.
- Manual override rejected.

## Scalability Controls

- Fanout limits should cap suborders per parent order, downstream target calls per routing attempt, vendor export rows per batch, buyer/retailer split count, handoff requests per batch, and event fanout per routing/export/handoff decision.
- Retry budgets should be scoped by tenant, parent order, export batch, export batch item, handoff request, exception family, downstream target, and time window.
- Idempotency scope should include parent order, tenant, routing input hash, execution mode, routed suborder dedupe keys, export window, export inclusion rule version, export schema version, export batch item duplicate prevention key, split behavior, re-export reference, manual download record, handoff idempotency key, and Fulfillment/Returns disposition reference where available.
- Async queues should isolate high-latency downstream lookups, export generation, handoff requests, disposition-reference recording, retries, review queues, and event publication where possible.
- Replay windows should define how long routing/export/handoff events can be replayed and how consumers distinguish replay from new execution.
- Manual review queues should define SLA, priority, owner, and escalation policy by exception family.
- Audit retention volume should account for immutable snapshots, supersession records, retries, overrides, export eligibility records, export batches, export batch items, re-export requests, manual downloads, handoff requests, disposition references, and replayable events.
- Retry storm prevention should include backoff, jitter, circuit breakers, dead-letter handling, and manual review thresholds.

## Operational Notes

- Routing should remain loosely coupled and reference-driven.
- Routing snapshots should be immutable.
- Re-routing should create new snapshots or supersession records.
- Vendor export batches should preserve routing snapshot references and should not rewrite routing decisions.
- Vendor export batch items should preserve per-routed-suborder disposition and duplicate prevention evidence.
- Fulfillment handoff requests should preserve Fulfillment/Returns disposition references without owning execution state.
- Routing and vendor export events should be redacted by consumer class.
- Fulfillment starts after handoff acceptance by Fulfillment/Returns and remains outside Order Routing ownership.
- External delivery remains outside Order Routing ownership.
- Scheduled email delivery remains outside Order Routing ownership.
- Immutable file/export/download evidence remains outside Order Routing ownership.

## Vendor Export Schedule and Delivery Evidence Workflows (PR-A)

PR-A introduces six interlocking workflows governing how Vendor Export Schedules materialize into Windows, how Windows produce Delivery Evidence, how Delivery Attempts capture transport outcomes, and how Operational Review-Required state is managed. These workflows operate on entities defined in `data-model.md` (PR-A: Vendor Export Schedule, Vendor Export Window, Vendor Export Delivery Evidence, Vendor Export Delivery Attempt; plus the concept-only Delivery Method Reference and Recipient Reference).

The workflows preserve Order Routing's existing routing decision, export batch, and handoff flows. PR-A's workflows layer on top of the existing export generation flow — they do not replace it.

The six workflows are:

1. **Vendor Export Schedule configuration** — create, edit, pause, retire.
2. **Vendor Export Window generation** — materialize Schedules into concrete Windows.
3. **Vendor Export Delivery Evidence capture** — record delivery via Integration Management.
4. **Manual Download evidence** — for Delivery Method = Manual Download.
5. **Retry / failure evidence** — capture retry outcomes without specifying retry policy.
6. **Operational Review-Required workflow** — manage review-required state lifecycle.

PR-A defers downstream concerns:

- SLA evaluation (fulfillment response deadlines, same-day cutoffs, late/missing fulfillment exceptions) is **Fulfillment / Returns PR-A** territory.
- The export-delivery-to-fulfillment-SLA join point is the **Boundary/Handoff PR** territory.
- Notification routing of Review-Required state to System Admin is the **Cross-Module Summary Email PR** territory.
- Delivery date and buyer-update hardening is **Fulfillment / Returns PR-B** territory.

---

### Workflow 1 — Vendor Export Schedule configuration

**Purpose:** Lifecycle management of Vendor Export Schedules.

**Authority:** Export Schedule Authority per `permissions.md`. Phase 1 routes this to CIXCI System Admin.

**Steps:**

1. **Create.** An actor holding Export Schedule Authority creates a Schedule in `draft` state. Required configuration: `vendor_reference`, `timezone`, `daily_send_times`, `recipient_references`, `delivery_method_reference`, `buyer_retailer_split_behavior`. Optional: `business_calendar_reference` (recommended; if absent, `holiday_weekend_behavior` defaults to `deliver_anyway` and a Schedule is flagged for review by future Cross-Module PR).

2. **Validate.** Pre-activation validation checks:
   - `timezone` is a valid IANA timezone.
   - At least one `daily_send_times` entry.
   - `recipient_references` resolve through Tenant Company.
   - `delivery_method_reference` resolves through Integration Management.
   - `vendor_reference` is a valid vendor and the actor's `check_access` permits Schedule configuration for that vendor.

3. **Activate.** Validated `draft` → `active`. Workflow 2 begins generating Windows over the configured horizon.

4. **Edit.** Edits to an `active` Schedule produce a new `schedule_version`. Windows materialized from the prior version are not retroactively rewritten. Workflow 2 generates new Windows from the new version going forward; in-flight Windows complete under their materialization version.

5. **Pause.** `active` → `paused`. Workflow 2 halts Window generation. Windows in `scheduled` state at pause time transition to `superseded`. Windows already in `executing` state complete; their Delivery Evidences resolve normally.

6. **Resume.** `paused` → `active`. Workflow 2 resumes Window generation from the current time forward (no backfill).

7. **Retire.** `paused` or `active` → `retired`. Terminal. No new Windows. In-flight Windows complete; the Schedule cannot be edited.

**Audit:** Every transition produces an audit reference. Version increments are recorded with full before/after.

**Boundary:**

- Recipient identity validation routes through Tenant Company `check_access`; Order Routing does not validate identity itself.
- Delivery method validity routes through Integration Management; Order Routing does not validate transport configuration.

---

### Workflow 2 — Vendor Export Window generation

**Purpose:** Materialize Schedules into concrete Windows over a rolling time horizon.

**Trigger:**

- Schedule activation, version creation, or resumption from pause.
- Scheduled-time horizon advance (the system materializes Windows over a configurable look-ahead horizon; PR-A does not specify the horizon — implementation detail).

**Steps:**

1. **Compute next execution times.** For each `daily_send_times` entry in the Schedule, resolve the next concrete UTC timestamp using `timezone`. Apply `holiday_weekend_behavior` and `business_calendar_reference`:
   - `skip_to_next_business_day` — if the next execution falls on a non-business day per calendar, advance to the next business day's send time.
   - `deliver_anyway` — execute regardless of calendar classification.
   - `pause` — generate the Window in `superseded` state with a paused-by-calendar audit reference. Future Cross-Module PR may surface this state.

2. **Materialize Window.** Create a Vendor Export Window in `scheduled` state with: `vendor_export_schedule_reference`, `vendor_export_schedule_version` (the current Schedule version), `scheduled_execution_at` (UTC), `business_day_classification`, and `cutoff_context` (snapshot of `same_day_cutoff_reference` and `after_hours_handling_reference` at materialization time).

3. **Await execution time.** Window remains in `scheduled` state until `scheduled_execution_at` arrives or the Window is superseded.

4. **Execute.** At `scheduled_execution_at`, Window transitions `scheduled → executing`. Existing Order Routing export generation flow produces zero or more Export Batches (applying `buyer_retailer_split_behavior` per the Schedule).

5. **Outcome.**
   - `executing → succeeded` when one or more Export Batches are produced. Workflow 3 begins for each Export Batch.
   - `executing → failed` when no Export Batches are produced (no eligible routed suborders, content generation error). The Window's `failed` state may trigger Workflow 6 (Review-Required) per anomaly detection rules.

**Supersession:**

- Schedule pause, retirement, or version change between materialization and execution may invalidate a `scheduled` Window. Such Windows transition to `superseded` with audit reference.

**Boundary:**

- Window does not own Export Batch production logic — that is Order Routing's existing export generation flow.
- Window does not call Integration Management directly — Workflow 3 handles delivery handoff.

---

### Workflow 3 — Vendor Export Delivery Evidence capture

**Purpose:** Record the delivery of each Export Batch to recipients via Integration Management.

**Trigger:** Window transitions to `succeeded` with one or more Export Batches.

**Steps:**

1. **Create Delivery Evidence.** For each Export Batch produced by the Window, create a Vendor Export Delivery Evidence in `pending` state with: `vendor_export_window_reference`, `export_batch_reference`, `delivery_method_reference` (from Schedule at Window's materialization version), `recipient_references` (from Schedule at Window's materialization version), `export_generated_timestamp` (typically Window's `succeeded` transition timestamp).

2. **Request delivery.** Order Routing requests delivery from Integration Management, passing the Export Batch reference and Delivery Method Reference. The transport mechanics (SMTP, SFTP, API call) are Integration Management's.

3. **Await outcome.** Delivery Evidence remains in `pending` state while Integration Management performs transport (including any internal retries Integration Management performs).

4. **Capture outcome.** Integration Management reports outcome. Workflow 5 creates a Vendor Export Delivery Attempt with the outcome detail. If outcome is `success`:
   - Delivery Evidence transitions `pending → confirmed`.
   - `export_delivered_timestamp` populated to the Attempt's timestamp.
   - If multiple recipients and outcomes mixed, see Workflow 5 partial-success handling.

5. **Failure / partial / unconfirmable handling.** See Workflow 5 (retry / failure) and Workflow 4 (manual download).

**Boundary preservation:**

- Order Routing requests delivery; Integration Management performs delivery. Order Routing captures outcomes; Integration Management owns transport reliability.
- Delivery Evidence does not encode SLA logic. Fulfillment / Returns SLA evaluation in a future PR reads `export_delivered_timestamp` and `delivery_confirmation_state`.
- **Delivery Evidence does not encode operational acceptance.** A `delivery_confirmation_state = confirmed` means only that the Delivery Method produced confirmed delivery evidence — *not* that the vendor acknowledged, opened, processed, or operationally accepted the export. Email delivered ≠ email opened. SFTP push confirmed ≠ file consumed. Manual download ≠ operational acceptance. Operational fulfillment acceptance is Fulfillment / Returns territory.
- Pre-commit / pre-execution events do not raise Delivery Evidence; Delivery Evidence is created only on successful Window execution.

---

### Workflow 4 — Manual Download evidence

**Purpose:** Capture delivery confirmation for Delivery Method = Manual Download, where a vendor logs in (or a System Admin acts on a vendor's behalf) and downloads the export.

**Trigger:** Window produces an Export Batch with Delivery Method Reference = Manual Download. Workflow 3 creates the Delivery Evidence in `pending` state; Workflow 4 governs pickup and expiration.

**Steps:**

1. **Await pickup.** Delivery Evidence remains in `pending` state. The Export Batch is available for download via the existing Order Routing manual download surface.

2. **Pickup.** When an authorized actor downloads the export, Workflow 5 creates a Vendor Export Delivery Attempt with `attempt_outcome = success` and `transport_evidence_reference` pointing to the download-evidence record. Delivery Evidence transitions `pending → confirmed`. `export_delivered_timestamp` is populated to the download timestamp.

3. **Re-download.** Subsequent downloads of the same Export Batch produce additional Attempts (each with `attempt_outcome = success` and its own audit reference) but do not transition the Delivery Evidence out of `confirmed`. The **first successful download is the canonical delivery confirmation** for SLA purposes.

4. **Expiration.** If the `manual_download_expiration_window` (from the Schedule at Window materialization version) elapses without any successful download, Delivery Evidence transitions `pending → unconfirmable`. Workflow 6 sets `export_review_required_state = review_required`.

**Boundary:**

- Manual Download authorization (which actors may download which exports) routes through Tenant Company `check_access`. Order Routing does not validate actor identity inside this workflow.
- The download-evidence record (who downloaded, when) is owned by Integration Management or by Logs & Audit per existing Order Routing patterns; PR-A references the evidence without restructuring it.

---

### Workflow 5 — Retry / failure evidence

**Purpose:** Capture per-attempt outcomes including retries, without specifying retry policy.

**Trigger:** Integration Management reports any outcome for a Delivery Evidence (success or non-success).

**Steps:**

1. **Create Attempt.** A Vendor Export Delivery Attempt is created with: `vendor_export_delivery_evidence_reference` (parent), `attempt_sequence` (next ordinal), `attempt_timestamp`, `attempt_outcome` from Integration Management, `transport_evidence_reference` from Integration Management.

2. **Update parent Delivery Evidence per Attempt outcome:**
   - `success` — Delivery Evidence transitions `pending → confirmed`; `export_delivered_timestamp` populated.
   - `transport_failure`, `recipient_bounce`, `timeout` — Delivery Evidence remains `pending`. Integration Management decides whether to retry per its own retry policy.
   - `aborted` — Delivery Evidence transitions `pending → failed` immediately (no further retries expected).

3. **Retry chain.** If Integration Management performs a retry, the previous Attempt's `retry_after_reference` is populated to point to the new Attempt. The new Attempt is created per step 1 with `attempt_sequence` incremented.

4. **Retry exhaustion.** Integration Management determines when retries are exhausted (per its own policy; PR-A does not specify the count or timing). On exhaustion, Integration Management reports a final `attempt_outcome` (typically `transport_failure` or `timeout`) accompanied by an exhaustion signal. Order Routing transitions the parent Delivery Evidence `pending → failed`. Workflow 6 sets `export_review_required_state = review_required`.

5. **Partial success.** When a Delivery Evidence has multiple `recipient_references` and Attempt outcomes differ per recipient (e.g., one recipient receives, another bounces), Delivery Evidence transitions `pending → partial`. `export_delivered_timestamp` is populated to the first successful Attempt's timestamp. The partial-failure recipient(s) may produce additional Attempts under Integration Management retry policy or may trigger Review-Required state per Workflow 6.

**Boundary preservation:**

- Order Routing captures *outcomes*; Integration Management owns *retry policy*.
- Order Routing does not specify retry delays, backoff curves, or maximum retry counts. These are Integration Management territory.
- Order Routing does not directly retry — it records what Integration Management does.

---

### Workflow 6 — Operational Review-Required workflow

**Purpose:** Manage the `export_review_required_state` lifecycle on Vendor Export Delivery Evidence.

**Triggers (state set to `review_required`):**

- Workflow 5 retry exhaustion (Delivery Evidence transitions to `failed`).
- Workflow 4 expiration (Delivery Evidence transitions to `unconfirmable`).
- Workflow 5 partial-success outcomes when configured anomaly detection flags partial as review-worthy.
- Workflow 2 Window failure (`executing → failed` with anomalous context, e.g., zero suborders when historical volume is non-zero).
- Schedule-level anomalies (e.g., business calendar reference not resolving at materialization time).
- Explicit System Admin action setting `review_required`.

**Lifecycle:**

- `not_required` (default) → `review_required` (on trigger).
- `review_required` → `under_review` (when an actor holding Export Schedule Authority begins review).
- `under_review` → `resolved` (when review concludes).
- `resolved` → `review_required` (reopening; preserves history).

**Resolution paths (during `under_review`):**

- **Re-export via existing re-export controls.** Authorized re-export through Order Routing's existing re-export workflow. PR-A does not introduce re-export logic; it states that `review_required` may lead to authorized re-export. Re-export creates a new Window (or new Export Batch, depending on existing re-export semantics) and produces new Delivery Evidence. The prior Delivery Evidence remains in its terminal `delivery_confirmation_state` and the new evidence supersedes operationally.

- **Audit-evidenced acceptance.** When the Delivery Evidence is in `failed`, `partial`, or `unconfirmable` state and review concludes that re-export is not appropriate (e.g., the vendor confirmed receipt out-of-band, or the export was a known anomaly), `export_review_required_state` transitions to `resolved` with audit evidence. **Acceptance without re-export requires audit reference, actor reference, reason reference, and resolution timestamp.**

- **Other resolution.** Workflow does not enumerate every possible resolution path. Other paths require explicit audit and follow Order Routing's existing operational discipline.

**Resolution discipline:**

- Resolution does not silently generate a replacement export. Re-export must remain explicit, permissioned, and auditable.
- Resolution does not modify the underlying Delivery Evidence's `delivery_confirmation_state`. The `delivery_confirmation_state` reflects what actually happened with delivery; `export_review_required_state` reflects whether human review concluded.
- Reopening (`resolved → review_required`) preserves full history.

**Boundary:**

- Workflow 6 does not connect to Notification Platform Service. PR-A does not notify anyone that review is required. The Cross-Module Summary Email PR (item 5 in the audit sequence) handles notification.
- Workflow 6 does not connect to Analytics / Reporting aggregation. Cross-Module PR handles aggregation.
- Workflow 6 does not connect to Fulfillment / Returns SLA logic. Review-Required is an Order Routing concern; SLA exceptions are Fulfillment / Returns concerns.

---

## Workflow dependency summary

```
Workflow 1 (Schedule configuration)
    └── triggers Workflow 2 on activation / version / resume
Workflow 2 (Window generation)
    └── on Window succeeded, triggers Workflow 3 for each Export Batch
    └── on Window failed with anomaly, may trigger Workflow 6
Workflow 3 (Delivery Evidence capture)
    └── requests Integration Management transport
    └── Integration Management outcomes feed Workflow 5
    └── for Manual Download method, Workflow 4 governs pickup/expiration
Workflow 4 (Manual Download)
    └── pickup creates Attempt via Workflow 5
    └── expiration triggers Workflow 6
Workflow 5 (Retry / failure)
    └── retry-exhausted failure triggers Workflow 6
    └── partial-success may trigger Workflow 6 per anomaly detection
Workflow 6 (Review-Required)
    └── resolution may invoke existing re-export controls (external to PR-A workflow scope)
    └── audit-evidenced acceptance without re-export is permitted
```

Workflows 4, 5, and 6 may be invoked outside the linear chain (e.g., manual System Admin action setting `review_required` directly).
