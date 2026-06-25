# Fulfillment and Returns Workflows

This document is proposal-level architecture. It outlines workflows without finalizing implementation behavior, vendor contracts, carrier integrations, return approval policy, refund behavior, or transport ownership.

## Fulfillment Handoff Disposition Workflow

1. Order Routing creates a fulfillment handoff request for a routed suborder or export batch item.
2. Fulfillment and Returns receives the request with routed suborder, routing snapshot, source version, vendor, buyer/entity, and idempotency references.
3. Fulfillment and Returns validates request shape, duplicate blockers, scope references, and source version.
4. Fulfillment and Returns records its own Fulfillment Handoff Disposition: accepted, rejected, ignored, duplicate-blocked, or review-required.
5. Accepted disposition creates or links a Fulfillment Execution Record.
6. Rejected, ignored, duplicate-blocked, or review-required disposition emits operational events and does not imply shipment, delivery, invoice, refund, or route mutation.

Boundary notes:

- Order Routing handoff requested is not proof Fulfillment accepted execution.
- Fulfillment and Returns must not re-route if handoff fails.
- Fulfillment and Returns may request routing review, but Order Routing owns any reroute decision and any new routing snapshot.

## Vendor Fulfillment Import Workflow

1. Vendor uploads, manually submits, or sends fulfillment updates through an approved API/file/manual flow.
2. Fulfillment and Returns creates a Vendor Fulfillment Import Job.
3. Header validation runs before row validation.
4. Locked order fields and required identifiers are validated.
5. Fulfillment business validation checks suborder, routed suborder line, vendor, source export batch/item, SKU/UPC, quantity, package/line structure, eligibility, dates, duplicate rows, and stale/out-of-order updates.
6. Preview is produced with row-level errors, warnings, review-required rows, skipped rows, no-change rows, proposed Shipment Line Evidence, and proposed applied evidence.
7. Confirmation is required before mutation unless an approved automated integration contract allows apply.
8. Apply creates Shipment Line Evidence, shipment/tracking/status evidence, or ignored/rejected/superseded row outcomes only for valid confirmed rows.
9. Rejected rows, warnings, skipped rows, corrections, reuploads, supersessions, and downloadable error report placeholders are recorded.
10. Logs & Audit receives audit/file evidence references where applicable.

Shared governance:

- Follow `architecture/standards/import-export-validation-governance.md`.
- Default behavior is update-only and non-destructive.
- Blank fulfillment fields do not erase existing values by default.
- Locked field changes reject or route row to review.
- UPC, tracking numbers, order numbers, RANs, zip/postal codes, and other identifiers are preserved as text.

## Shipment Import Row-To-Line Application Workflow

1. Each fulfillment import row maps to an expected routed suborder line or to an allowed shipment line/package structure.
2. If split shipments are not explicitly supported for the row structure, duplicate Suborder + SKU/UPC rows are rejected or routed to review.
3. If split shipments are supported, Package ID and/or Shipment Line ID distinguishes each row.
4. Shipped quantity and delivered quantity are compared with expected quantity.
5. Delivered quantity is compared with shipped quantity.
6. A Shipment Line Evidence Record is created for applied evidence or for ignored/rejected/superseded evidence where retention is needed.
7. Duplicate import rows must not silently overwrite existing Shipment Line Evidence.
8. Conflicts create review-required state with supersession/correction references.

Proposal-level guards:

- Shipped quantity and delivered quantity must not exceed expected quantity unless explicitly allowed and reviewed.
- Delivered quantity cannot exceed shipped quantity.
- Applied, ignored, rejected, and superseded row outcomes must be retained.
- Shipment updates must be attributable to a routed suborder line or shipment line.
- Shipment line evidence does not alter Order Routing decisions.
- Invoice Management may consume delivered evidence later, but Fulfillment and Returns does not create invoice state.

## Manual Fulfillment Workflow

1. Vendor or authorized internal user obtains an eligible export/download through Order Routing, Integration, Notification, or manual download flow as applicable.
2. Tenant Company permission/scope is checked by the caller/entry point.
3. Fulfillment and Returns validates and previews the returned fulfillment file or manual edits.
4. User confirms the preview.
5. Fulfillment and Returns records vendor fulfillment updates as operational Shipment Line Evidence and shipment evidence.
6. Integration Management owns external delivery/receipt evidence; Logs & Audit owns file/download/import evidence.

Manual updates must follow the same business validation rules as API updates.

## API Fulfillment Workflow

1. Integration Management receives or transports the external API/webhook/SFTP/manual exchange where applicable.
2. Integration Management records transport/receipt evidence and passes source-module disposition request to Fulfillment and Returns.
3. Fulfillment and Returns validates the update using the same fulfillment import/business validation rules.
4. Valid updates create Shipment Line Evidence, tracking evidence, and shipment/status evidence.
5. Invalid, stale, duplicate, or out-of-order updates append evidence, are ignored, or route to review according to source authority rules.

Integration Management owns receipt and retry evidence. Fulfillment and Returns owns source-module validation and operational disposition.

## Fulfillment Validation Workflow

Validation should verify:

- Suborder exists.
- Routed suborder line or original order line exists where the schema provides it.
- Suborder belongs to importing vendor.
- Source export batch/item matches.
- SKU and UPC match original order line.
- Quantity matches original order line unless split shipment/package model supports otherwise.
- Suborder is eligible for fulfillment update.
- Duplicate row detection by suborder + SKU/UPC unless split shipment/package model supports it.
- Package ID and/or Shipment Line ID distinguishes split shipment rows where supported.
- Shipped quantity and delivered quantity do not exceed expected quantity unless reviewed.
- Delivered quantity does not exceed shipped quantity.
- Shipped date is valid.
- Delivered date is valid and not before shipped date.
- Blank fields do not erase existing values.
- Stale, duplicate, or out-of-order updates append evidence or route to review.

## Shipment Tracking Validation Workflow

1. Fulfillment update supplies carrier/tracking/date evidence.
2. Carrier is validated against USPS, UPS, FedEx, DHL, or Other.
3. Carrier is required when tracking number or shipped date is provided.
4. Tracking number is required when shipped date is provided.
5. Carrier-specific tracking format validation runs where configured.
6. `Other` carrier requires custom tracking URL or tracking instructions.
7. Duplicate tracking number handling checks prior tracking references and Shipment Line Evidence.
8. Tracking URL is validated for format, safety, source, and cross-tenant risks.
9. Unsafe, malformed, duplicate, stale, or conflicting tracking references create review-required state.
10. Valid tracking evidence creates or supersedes a Tracking Reference Record and links to affected shipment line evidence where line/package specific.

Tracking URL is a delivery reference, not source-of-truth shipment state. Customer-facing tracking redirect remains placeholder/future and should not be treated as shipment truth.

## Shipment Status Lifecycle Workflow

Proposal-level statuses:

1. Pending.
2. Processing.
3. Partially Shipped.
4. Shipped.
5. Delivered.
6. Exception.
7. Cancelled.
8. Review Required.

Status update rules:

- Status updates require validated shipment evidence and, where applicable, Shipment Line Evidence.
- Source timestamp, received timestamp, source version, idempotency key, and audit reference should be captured.
- Duplicate updates should be idempotently acknowledged or linked to prior evidence.
- Stale updates should append evidence and be ignored, advisory, or review-required.
- Out-of-order updates should not overwrite current status unless source authority and transition rules allow it.
- Partial shipments preserve per-line/package evidence before summary shipment status changes.
- Delivered evidence may be consumed by Invoice Management, but Fulfillment and Returns does not create invoice state.

## Vendor Return Export Workflow

1. Return operational record becomes eligible for vendor processing according to Fulfillment/Returns return export rules.
2. Fulfillment and Returns validates return authorization/RAN source version, source return request/reference, return lifecycle state, return line references, authorization freshness, stale authorization state, closed state, and superseded state.
3. Vendor Return Export Eligibility Record is created with return line, RAN, vendor, buyer/entity, inclusion rule version, schema version, export window, and export blocked/review-required reason where applicable.
4. Stale, closed, superseded, unauthorized, or mismatched returns are blocked or routed to review before export.
5. Eligible items are grouped into Return Export Batch records.
6. Return Export Batch Items record included/excluded status, prior export membership, duplicate prevention, and review state.
7. Buyer/retailer split references are created where vendor configuration or operational rules require split files.
8. Export content reference is generated.
9. Logs & Audit owns file/export evidence. Integration Management or Notification Platform Service owns delivery depending on transport.

Export eligibility and batch membership do not prove the vendor received, processed, accepted, rejected, or refunded the return. RAN validation is needed both before export and during import.

## Manual Return Workflow

1. Vendor manually downloads or receives eligible return export content where allowed.
2. Tenant Company owns user/vendor permission and company/entity scope.
3. Vendor submits return processing file or manual update.
4. Fulfillment and Returns creates a Vendor Return Import Job.
5. Header, locked fields, RAN, matching, chronology, condition, duplicate rows, source export batch/item references, and return line quantities are validated.
6. Preview is generated and confirmed before apply unless an approved automated contract applies.
7. Applied rows create Return Line Disposition Evidence, summary operational return disposition evidence, and vendor-provided refund/adjustment evidence references where present.
8. Logs & Audit owns immutable file/import evidence.

Manual updates must follow the same business validation rules as API return updates.

## API Return Workflow

1. Integration Management receives or transports an external return update where applicable.
2. Integration Management records delivery/receipt/provider evidence.
3. Fulfillment and Returns validates RAN, source export batch/item, return line, SKU/UPC, quantities, chronology, and duplicate/out-of-order state.
4. Valid updates create Return Line Disposition Evidence and summary operational return disposition evidence.
5. Invalid updates create review-required, rejected, skipped, warning, or error states.

## Return Import Row-To-Line Application Workflow

1. Each return import row maps to an expected return line through RAN + SKU/UPC and/or CIXCI Return Line ID where available.
2. Duplicate RAN + SKU/UPC rows are rejected or routed to review unless partial return line structure explicitly supports them.
3. If partial return lines are supported, CIXCI Return Line ID and/or package/receipt reference distinguishes rows.
4. Received quantity, accepted quantity, rejected quantity, and partially accepted quantity are compared with expected return quantity.
5. Accepted + rejected + partially accepted quantities reconcile to received quantity where applicable.
6. Applied, ignored, rejected, and superseded row outcomes are retained.
7. A Return Line Disposition Evidence Record is created for line-level accepted/rejected/partial operational evidence or for ignored/rejected/superseded evidence where retention is needed.

Boundary notes:

- Return disposition is operational evidence, not final financial approval.
- Accepted/rejected/partial outcomes are recorded at return-line level where quantities can differ by SKU/UPC or partial quantity.
- Fulfillment and Returns does not decide refund execution, credit, payment, or invoice adjustment.

## Return Import Validation Workflow

Validation should verify:

- RAN exists.
- RAN belongs to importing vendor.
- RAN matches an open return record.
- RAN matches the source return export batch/item.
- Return authorization is fresh and not stale, closed, or superseded.
- Suborder matches the return record.
- SKU and UPC match original return line.
- Return quantity is valid and unchanged unless return line structure supports variance.
- Duplicate RAN + SKU/UPC rows are rejected or routed to review unless partial return line model supports them.
- Received, accepted, rejected, and partially accepted quantities do not exceed expected return quantity.
- Accepted + rejected + partially accepted quantities reconcile to received quantity where applicable.
- UPC/text identifiers are preserved.
- Return initiation date is valid.
- Return received date is valid, not before initiation date, and not far future unless allowed.
- Stale, duplicate, or out-of-order updates append evidence or route to review.

## Return Operational Disposition Workflow

1. Vendor provides return disposition evidence through file/manual/API flow.
2. Fulfillment and Returns records Return Line Disposition Evidence for each affected return line.
3. Fulfillment and Returns derives or links summary disposition evidence from line-level received-by-vendor, operationally accepted, operationally rejected, partially accepted, exception, or review-required evidence.
4. Return condition evidence, rejected reason, partial acceptance/refund reason, and vendor notes are captured where provided and allowed.
5. Return refunded amount is stored only as vendor-provided refund/adjustment evidence and may be linked to return-line evidence where line-specific.
6. Pricing may consume pricing snapshot/adjustment evidence references. Invoice Management may consume invoice/refund/credit/adjustment references.
7. Fulfillment and Returns emits return update ready-for-transport events where buyer systems should be updated.

Boundary notes:

- Fulfillment and Returns records operational return disposition instead of approving/rejecting refunds.
- Fulfillment and Returns does not decide refund execution, payment, credit, invoice adjustment, or final financial settlement.
- Financial statuses such as Refund Approved, Partially Refunded, or Return Refunded remain external/Invoice/Pricing evidence unless future ADR assigns Fulfillment ownership.

## Buyer Shipment And Return Update Workflow

1. Valid shipment or return state changes emit buyer-update-ready events.
2. Integration Management transports buyer system updates where configured.
3. Notification Platform Service delivers user notifications where configured.
4. Logs & Audit tracks evidence.
5. Transport failure references may be linked back to Fulfillment records for review without making Fulfillment owner of transport retries.

Fulfillment and Returns does not own external delivery, scheduled email delivery, notification delivery, or transport retries.

## Replacement Shipment Workflow

1. Approved replacement signal reference is received from owning warranty-support workflow, buyer-facing module, or future Warranty Management context.
2. Fulfillment and Returns validates signal scope, expiration, duplicate-prevention key, original shipment reference, and replacement attempt count.
3. Replacement Chain Record is created or updated.
4. Replacement Execution Record is created.
5. Replacement Shipment Record is created.
6. Replacement shipment follows normal shipment lifecycle.
7. Replacement exception is created for blocked, expired, duplicate, loop-risk, or failed execution.

Fulfillment and Returns executes replacement movement; it does not approve warranty claim eligibility.

## Exception And Review Workflow

1. Exception is detected from handoff disposition, import validation, shipment line evidence conflict, shipment tracking validation, status conflict, return export/import validation, RAN mismatch, return quantity reconciliation failure, return chronology mismatch, vendor disposition conflict, replacement execution, or downstream handoff failure.
2. Fulfillment Exception or Return Exception is created with owner, severity, retryability, priority class, review queue, source version, idempotency key, and audit reference.
3. Exception may be retried, reviewed, escalated, held, dead-lettered, resolved, or remain blocked.
4. Events and AI-ready signals may be emitted.

## Open Questions

- Which vendor fulfillment import headers are supported at launch?
- Which return export/import schemas are supported at launch?
- Which carriers get format validation at launch?
- Which return condition values are supported?
- Which partial shipment/package structures allow multiple fulfillment rows for one suborder + SKU/UPC?
- Which return line structures allow multiple rows for one RAN + SKU/UPC?
- Which buyer update events should become notifications versus integration updates?

## Vendor Fulfillment Response SLA Workflows (PR-A)

PR-A introduces ten architecture-level workflows for vendor fulfillment response SLA evaluation. These workflows operate on entities defined in `data-model.md` (PR-A: SLA Policy, SLA Evaluation Record, Late / Missing / Partial Exceptions, SLA Override / Excuse Evidence; baseline: Fulfillment Import). They consume Order Routing's Vendor Export Delivery Evidence read-only.

**Boundary discipline preserved across all ten workflows:**

- No mutation of Order Routing records under any path.
- No production of Order Routing events.
- No assertion of vendor operational acceptance (per PR #91 clarification).
- No specification of transport semantics, event-broker mechanics, or runtime retry tuning (deferred to Boundary/Handoff PR and implementation).
- No notification routing or summary email delivery (deferred to Cross-Module Summary Email PR).
- No analytics aggregation (deferred to Cross-Module Summary Email PR).
- Architecture-level only.

---

### Workflow 1 — SLA Policy Configuration

**Purpose:** Manage the lifecycle of Vendor Fulfillment Response SLA Policy records — creation, edit, supersession, retirement.

**Trigger:** A CIXCI System Admin (holding SLA Configuration Authority per `permissions.md`) creates or edits an SLA Policy.

**Steps:**

1. **Validate input.** Required: `vendor_reference`, `timezone_reference`, `sla_clock_start_basis`, `same_day_cutoff_time`, `same_day_response_deadline_time`, `next_business_day_response_deadline_time`, `complete_response_definition`. Optional: `route_reference`, `business_calendar_reference`, `override_allowed`.
2. **Validate authority** via Tenant Company `check_access`.
3. **Validate uniqueness:** at most one `active` Policy version per `(vendor_reference, route_reference)` pair.
4. **Create Policy** in `draft` state, or **transition to `active`** if the admin's action is publish-on-create.
5. **Edit of an active Policy:** produces a new Policy version with the same `sla_policy_id` and incremented `sla_policy_version`. The prior version transitions to `superseded`. The new version is in `active`.
6. **Pause not supported in PR-A.** Pause as a Policy state may be added in a future PR.
7. **Retire:** explicit System Admin action transitions Policy to `retired`. SLA Evaluation Records computed under retired Policies remain valid; new evaluations against the retired vendor/route stop.
8. **Audit:** every transition produces a Logs & Audit reference.

**Discipline:**

- Policy edits do **not** retroactively recompute existing SLA Evaluation Records. Records reference the Policy version active at consumption.
- Vendor self-service Policy editing is not enabled in Phase 1.
- Policy carries its own cutoffs; it does not reference Order Routing's Vendor Export Schedule cutoffs.

---

### Workflow 2 — Export Delivery Evidence Consumption

**Purpose:** Consume Order Routing's confirmed Vendor Export Delivery Evidence read-only and produce an SLA Evaluation Record per affected suborder.

**Trigger:** Order Routing's `order-routing.export-delivery-evidence.confirmed` event fires (consumption transport semantics deferred to Boundary/Handoff PR).

**Steps:**

1. **Read** the consumed Vendor Export Delivery Evidence reference and its associated Export Batch / Suborder references read-only. **No mutation.**
2. **Verify** `delivery_confirmation_state = confirmed`. Other states (`pending`, `failed`, `partial`, `unconfirmable`) are not consumed by PR-A — those are Boundary/Handoff PR territory.
3. **Identify** the affected suborder(s) and their vendor reference(s).
4. **Resolve** the applicable `active` SLA Policy version per `(vendor_reference, route_reference)`. If no active Policy exists, PR-A's fallback is to create the SLA Evaluation Record in `pending` state with a flag indicating no Policy applied; outcome cannot be determined; this case routes to operational review (PR-A OQ — see assumptions-open-questions.md).
5. **Create** an SLA Evaluation Record per affected suborder, populating: `suborder_reference`, `vendor_export_delivery_evidence_reference`, `sla_policy_version_reference`, `delivery_confirmation_timestamp` (copied from the source), `outcome = pending`, lifecycle `pending`.
6. **Trigger** Workflow 3 (Expected Deadline Calculation) for each new SLA Evaluation Record.
7. **Audit** the consumption event with reference to the source Order Routing record.

**Discipline:**

- Consumption is read-only. Order Routing's Delivery Evidence is not mutated.
- Consumption is idempotent at architecture level (duplicate consumption events must not produce duplicate SLA Evaluation Records). Implementation idempotency mechanics are deferred to Boundary/Handoff PR.
- Consumption does not occur for non-`confirmed` Delivery Evidence in PR-A.

---

### Workflow 3 — Expected Fulfillment Response Deadline Calculation

**Purpose:** Compute the `expected_fulfillment_response_deadline` field on the SLA Evaluation Record.

**Trigger:** SLA Evaluation Record creation (Workflow 2 step 5).

**Steps:**

1. **Read** the SLA Evaluation Record's `delivery_confirmation_timestamp` and resolve the applied SLA Policy version's configuration: `timezone_reference`, `same_day_cutoff_time`, `same_day_response_deadline_time`, `next_business_day_response_deadline_time`, `business_calendar_reference`.
2. **Translate** the `delivery_confirmation_timestamp` to the Policy's timezone.
3. **Determine** business-day classification:
   - If `business_calendar_reference` is resolvable and the timezone-translated date is a business day per the calendar, the delivery is "on a business day."
   - If the calendar resolves the date as a non-business day (weekend, holiday), the next business day is computed per the calendar.
   - If `business_calendar_reference` is absent or unresolvable, fall back to calendar-day semantics (every day is a business day, no weekend or holiday adjustments). The SLA Evaluation Record carries an audit-visible note indicating fallback. **This fallback is proposal-level and not final implementation behavior** (per PR-A OQ 1).
4. **Compute deadline:**
   - If the timezone-translated time is at or before `same_day_cutoff_time`: deadline = same day at `same_day_response_deadline_time` (Policy timezone).
   - If after `same_day_cutoff_time`: deadline = next business day at `next_business_day_response_deadline_time` (Policy timezone).
5. **Persist** `expected_fulfillment_response_deadline` on the SLA Evaluation Record. Immutable after computation.
6. **Audit** the deadline computation with references to the source Policy version, calendar reference (or fallback flag), and the inputs.

**Discipline:**

- The deadline is computed once and is immutable.
- Policy edits after deadline computation do not re-trigger calculation.
- The business calendar is a reference; ownership remains Tenant Company or future platform calendar standard.

---

### Workflow 4 — Fulfillment Import Received Timestamp Capture

**Purpose:** Capture the transport-receipt timestamp of a vendor fulfillment import payload.

**Trigger:** Integration Management reports a fulfillment import transport receipt.

**Steps:**

1. **Receive** the Integration Management transport receipt event (transport semantics owned by Integration Management).
2. **Capture** the transport receipt timestamp on the existing Fulfillment Import entity as `fulfillment_import_received_timestamp`.
3. **Trigger** Workflow 5 (On-Time Evaluation) for the suborder(s) this Fulfillment Import covers.
4. **Audit** the capture with reference to the Integration Management transport receipt.

**Discipline:**

- The captured timestamp is the **transport receipt time**, not the post-validation acceptance time.
- Row-level validity is evaluated separately by existing Fulfillment / Returns validation workflows on the Fulfillment Import entity. PR-A does not change validation behavior.
- If the fulfillment import is received on time but invalid, the SLA response is considered received for SLA purposes; the invalid import still produces or links to existing Fulfillment / Returns import validation exceptions. A malformed on-time file does not silently count as successful fulfillment completion.
- The captured timestamp is the first transport receipt of the import payload. Row-level validity is separate.

---

### Workflow 5 — On-Time Fulfillment Response Evaluation

**Purpose:** Compare Fulfillment Import Received Timestamp to Expected Fulfillment Response Deadline and determine the SLA Evaluation Record's outcome.

**Trigger:** Workflow 4 (capture) for a suborder whose SLA Evaluation Record is in `pending` lifecycle.

**Steps:**

1. **Read** the SLA Evaluation Record for the suborder and its `expected_fulfillment_response_deadline`.
2. **Read** the Fulfillment Import Received Timestamp.
3. **Determine completeness** per the applied SLA Policy version's `complete_response_definition`:
   - `all_suborder_lines_covered` (default): completeness requires every suborder line to have shipment + tracking evidence (per existing Fulfillment / Returns Fulfillment Import entity content).
4. **Determine outcome:**
   - Complete and on time (received ≤ deadline, all lines covered): `outcome = on_time`, lifecycle `evaluated`. No Exception created.
   - Complete and late (received > deadline, all lines covered): `outcome = late`, lifecycle `evaluated`. Trigger Workflow 6 (Late Exception).
   - Incomplete and on time (received ≤ deadline, some lines missing): `outcome = partial` (interim, lifecycle remains `pending`). Trigger Workflow 8 (Partial Exception).
   - Incomplete and late (received > deadline, some lines missing): `outcome = late`, lifecycle `evaluated`. Trigger Workflow 6 (Late Exception). If a prior Partial Exception exists, it remains in place; both Exceptions co-exist per PR-A's multiple-Exceptions-per-suborder rule.
5. **Severity priority** when multiple Exceptions exist: `Late > Missing > Partial > On Time`. The SLA Evaluation Record's `outcome` reflects the most severe; `outcome_history` preserves all transitions.
6. **Append** to `fulfillment_import_references` on the SLA Evaluation Record.
7. **Audit** the evaluation with references to the source imports.

**Discipline:**

- An SLA Evaluation Record transitions to `evaluated` lifecycle only on terminal outcomes (`on_time`, `late`, or `missing`).
- An interim `partial` outcome keeps lifecycle in `pending`; subsequent imports may resolve to terminal `on_time` (only if deadline not yet elapsed) or `late` (if deadline elapsed).
- On-time evaluation does not assert vendor operational acceptance; it asserts only timely transport receipt.

---

### Workflow 6 — Late Fulfillment Import Exception

**Purpose:** Create a Late Fulfillment Import Exception when Workflow 5 determines a late receipt.

**Trigger:** Workflow 5 detects `received > deadline`.

**Steps:**

1. **Create** a Late Fulfillment Import Exception record in `open` state per `data-model.md`.
2. **Capture** `expected_deadline_at_creation`, `received_at_creation`, `late_fulfillment_import_reference`, `sla_evaluation_reference`, `suborder_reference`.
3. **Trigger** SLA Breach Signal (architecture-level signal, raised by event `fulfillment-returns.sla-breach.signaled` per `events.md`; payload contract per `event-contracts.md`).
4. **Audit** the Exception creation with `created_audit_reference` and the signal-raised audit reference.

**Discipline:**

- The Late Exception does not block fulfillment processing of the late import.
- The Exception lifecycle is governed by Workflow 9 (SLA Breach Review).
- Multiple Late Exceptions per SLA Evaluation Record are permitted if multiple distinct late imports occur (rare but architecturally permitted).

---

### Workflow 7 — Missing Fulfillment Import Exception

**Purpose:** Create a Missing Fulfillment Import Exception when the Expected Deadline elapses without any fulfillment import. Handle the late-import-after-Missing-Exception sequence.

**Trigger:** Time-driven detection — an SLA Evaluation Record in `pending` lifecycle whose `expected_fulfillment_response_deadline` has elapsed without a Fulfillment Import Received Timestamp being captured.

**Steps:**

1. **Detect** elapsed-deadline-with-no-import. Time-driven scan frequency is implementation detail (per PR-A OQ 9).
2. **Create** a Missing Fulfillment Import Exception in `open` state per `data-model.md`.
3. **Capture** `expected_deadline_at_creation`, `detected_at`, `sla_evaluation_reference`, `suborder_reference`.
4. **Transition** the SLA Evaluation Record outcome to `missing`, lifecycle `evaluated`.
5. **Trigger** SLA Breach Signal.
6. **Audit** the Exception creation.

**Late-import-after-Missing-Exception (subsequent):**

7. If a Fulfillment Import arrives later (Workflow 4 captures the late receipt; Workflow 5 evaluates):
   - **Close** the Missing Exception with audit evidence indicating `late_import_arrived` reason.
   - **Create** a Late Fulfillment Import Exception per Workflow 6.
   - **Transition** the SLA Evaluation Record outcome from `missing` to `late`; `outcome_history` preserves both.
   - Both Exception histories are preserved.

**Discipline:**

- Missing is not mutated into Late. They are distinct facts at distinct moments.
- A Missing Exception that has been closed because a late import arrived is **not reopened.** Subsequent imports affect the Late Exception, not the Missing one.

---

### Workflow 8 — Partial Fulfillment Response Exception

**Purpose:** Create a Partial Fulfillment Response Exception when an on-time but incomplete response is received.

**Trigger:** Workflow 5 detects incomplete-and-on-time.

**Steps:**

1. **Create** a Partial Fulfillment Response Exception in `open` state per `data-model.md`.
2. **Capture** `expected_deadline_at_creation`, `received_at_creation`, `lines_covered_at_creation`, `lines_missing_at_creation`, `partial_fulfillment_import_references`, `sla_evaluation_reference`, `suborder_reference`.
3. **Trigger** SLA Breach Signal.
4. **Audit** the Exception creation.

**Subsequent imports:**

5. If a subsequent Fulfillment Import arrives and Workflow 5 determines the response is now complete:
   - **If before deadline:** transition the Partial Exception to `resolved` with audit evidence indicating `subsequent_import_completed`. The SLA Evaluation Record outcome may transition from `partial` to `on_time` (lifecycle to `evaluated`).
   - **If after deadline:** the Partial Exception remains in current state; a Late Exception is created per Workflow 6; SLA Evaluation Record outcome transitions to `late` (severity priority).
6. If subsequent imports remain incomplete:
   - The Partial Exception remains; additional Partial Exceptions may be created for distinct partial windows (architecturally permitted, rare in practice).

**Discipline:**

- Partial Exception does not block processing of the partial content. Existing Fulfillment / Returns workflows process what arrived.
- Multiple Exceptions per SLA Evaluation Record are permitted per PR-A.

---

### Workflow 9 — SLA Breach Review

**Purpose:** Manage the SLA Breach Review State on Late, Missing, and Partial Exceptions through human review.

**Trigger:** An Exception is in `open` state and an authorized actor (holding SLA Override Authority or equivalent existing review authority per `permissions.md`) opens it for review.

**Steps:**

1. **Validate authority** via Tenant Company `check_access`. Missing authority is `SLA_OVERRIDE_AUTHORITY_REQUIRED`.
2. **Transition** the Exception from `open` to `under_review`.
3. **Investigation:** the reviewer evaluates the Exception. PR-A does not specify investigation tooling; that is implementation.
4. **Transition** to one of:
   - `resolved` — breach is acknowledged; no override granted; operational outcome recorded. Closure audit reference required.
   - `overridden` — breach is excused via SLA Override / Excuse Evidence (Workflow 10).
   - `closed` — breach is closed without resolution or override (operational reason: duplicate, cancelled suborder, etc.). Closure audit reference required.
5. **Audit** every transition.

**Reopening:** a terminal-state Exception (`resolved`, `overridden`, `closed`) may be reopened to `under_review` via an explicit authorized action. Reopening preserves the full history.

**Effect on SLA Evaluation Record:** when all Exceptions on an SLA Evaluation Record are in terminal states (`resolved`, `overridden`, or `closed`), the Evaluation Record may transition to `evaluation_excused` if all are overridden, or remain `evaluated` otherwise.

---

### Workflow 10 — SLA Override / Excuse Evidence

**Purpose:** Create the immutable SLA Override / Excuse Evidence record that excuses an SLA breach.

**Trigger:** A reviewer in Workflow 9 invokes override on an Exception in `under_review` state.

**Steps:**

1. **Validate authority** via Tenant Company `check_access` — actor must hold SLA Override Authority. Missing authority is `SLA_OVERRIDE_AUTHORITY_REQUIRED`.
2. **Validate Policy permits override:** SLA Policy's `override_allowed = true` must be set. If false, override is rejected.
3. **Validate required audit evidence** is present: actor reference, timestamp, affected exception reference, reason category, reason text, supporting evidence reference (optional but strongly recommended), audit reference. Missing required evidence is `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING`. **This is distinct from `SLA_OVERRIDE_AUTHORITY_REQUIRED`** — authority failure and missing audit evidence are not mixed.
4. **Create** the SLA Override / Excuse Evidence record. Immutable after creation per `data-model.md`.
5. **Transition** the affected Exception to `overridden`. Record the Override Evidence reference in the Exception's `state_transition_history`.
6. **Transition** the SLA Evaluation Record lifecycle to `evaluation_excused` if all Exceptions on the record are in `overridden` state.
7. **Audit** every transition.

**Reversal:**

8. If the override is later determined to be invalid, the reviewer creates a **new reversing SLA Override / Excuse Evidence record** with `reason_category = override_reversal` referencing the prior record.
9. The affected Exception transitions from `overridden` back to `under_review`.
10. The SLA Evaluation Record lifecycle transitions from `evaluation_excused` back to `evaluated`.
11. The prior Override Evidence record remains immutable in audit history.

**Discipline:**

- SLA Override / Excuse Evidence is immutable after creation. No field may be edited.
- Reversal uses a new reversing record. The original is preserved.
- Vendor users cannot create SLA Override / Excuse Evidence.
- The two failure modes (`SLA_OVERRIDE_AUTHORITY_REQUIRED` for missing authority, `SLA_OVERRIDE_AUDIT_EVIDENCE_MISSING` for missing audit evidence) are distinct and not mixed.

---

## Workflow dependency summary

```
Order Routing Vendor Export Delivery Evidence (confirmed)
    └── consumed by Workflow 2 (Export Delivery Evidence Consumption)
            └── creates SLA Evaluation Record (pending) and triggers Workflow 3
                    └── Workflow 3 (Expected Deadline Calculation) computes deadline
                            └── waits for Workflow 4 capture or time-driven detection
                                    ├── Workflow 4 (Capture) -> Workflow 5 (Evaluation)
                                    │       ├── on_time -> evaluated, no exception
                                    │       ├── late -> Workflow 6 (Late Exception) -> SLA Breach Signal
                                    │       ├── partial -> Workflow 8 (Partial Exception) -> SLA Breach Signal
                                    │       └── partial-then-late -> Workflows 8 and 6
                                    └── Time-driven detection (deadline elapsed, no import) -> Workflow 7 (Missing Exception) -> SLA Breach Signal
                                            └── late import later arrives -> Workflow 4 + 5; Missing Exception closed; Late Exception created
                                                    └── Workflow 9 (Review) for any Exception
                                                            └── overridden via Workflow 10 (Override Evidence)
```

Workflow 1 (SLA Policy Configuration) is independent of the consumption / evaluation chain — it manages Policy lifecycle and is consulted by Workflow 2 (Policy resolution) and Workflow 3 (Expected Deadline Calculation).

## Cross-Module Handoff Workflows (Boundary/Handoff PR)

This section adds two architecture-level Fulfillment / Returns workflows that contract how the consumer side of the Order Routing -> Fulfillment / Returns handoff operates. The workflows wrap around PR #92 Workflow 2 (Export Delivery Evidence Consumption) by making the seam explicit:

- **Workflow A - Handoff Receipt** handles `order-routing.export-delivery-evidence.confirmed` and produces a Cross-Module Handoff Record. When the Handoff Record reaches `consumed` state, PR #92 Workflow 2 proceeds as already specified.
- **Workflow B - Non-Confirmed Delivery Evidence Handling** handles `order-routing.export-delivery-evidence.failed` and observation paths for source evidence in `partial` or `unconfirmable` states.

Both workflows are architecture-level. Implementation-level concerns (broker mechanics, retry tuning, persistence layout, concurrency) are explicitly out of scope and remain Integration Management or developer territory.

### Workflow boundary discipline

- Both workflows are Fulfillment / Returns-owned.
- Neither workflow mutates Order Routing state under any path.
- Neither workflow produces events Order Routing consumes.
- Both workflows operate on references to source evidence; neither embeds or copies source payloads.
- Both workflows honor PR #91's invariant that confirmed source delivery is a transport-layer fact and does not assert vendor operational acceptance.
- Workflow A starts the SLA clock (via PR #92 Workflow 2) only where eligibility passes; otherwise the source observation is captured as audit and ends in a terminal Handoff Record state.
- Workflow B never starts the SLA clock. Partial / failed / unconfirmable source evidence does not produce SLA Evaluation Records in Phase 1.

### Workflow A - Handoff Receipt

**Trigger:** Fulfillment / Returns observes the source event `order-routing.export-delivery-evidence.confirmed` via the transport Integration Management provides. The exact transport mechanism (in-process bus, message broker, polling) is implementation detail; the workflow operates at architecture level under at-least-once delivery semantics.

**Steps:**

1. **Compute Handoff Idempotency Key.** Derive the key deterministically from the source event's `vendor_export_delivery_evidence_reference` (PR #91) plus the consumer scope discriminator. Phase 1 consumer scope is `fulfillment-returns.sla-evaluation`.

2. **Idempotency lookup.** Look up an existing Cross-Module Handoff Record by (`handoff_idempotency_key`, `consumer_scope_reference`).

3. **Existing record found, in `consumed` state:** Record a `replay_acknowledged` audit reference on the existing Handoff Record. **Do not transition the canonical state.** **Do not create a new SLA Evaluation Record.** **Do not create a new Handoff Record.** Step exits with audit-only side effects.

4. **Existing record found, in `consumption_skipped` or `consumption_held` state:** Record a `replay_acknowledged` audit reference on the existing record. Do not transition the canonical state. Step exits.

5. **Existing record found, in `consumption_failed` state and retry policy permits:** Transition the existing record from `consumption_failed -> pending` and continue from Step 7. Retry policy itself is Integration Management's; this workflow records that retry occurred and where the failure audit reference points.

6. **No existing record found:** Create a new Cross-Module Handoff Record in `pending` state with the computed idempotency key, consumer scope reference, source evidence snapshot reference (reference-only - no source payload copied), observed source event reference, tenant scope reference, and initial audit reference.

7. **Evaluate Handoff Eligibility.** Apply the Fulfillment SLA Handoff Eligibility contract rule (see `boundary-contracts.md` Eligibility subsection): source Delivery Evidence is `confirmed`; an applicable SLA Policy (PR #92) is `active` for the suborder's vendor at the consumption time; the vendor / suborder / route is within Tenant Company scope for SLA evaluation. Capture the eligibility decision rationale on the Handoff Record's `handoff_eligibility_decision_reference`.

8. **Eligibility fails:** Transition the Handoff Record from `pending -> consumption_skipped`. Record audit reference identifying the eligibility failure reason category (e.g., `no_active_sla_policy`, `vendor_out_of_scope`, `route_not_sla_evaluatable`). Workflow exits without creating an SLA Evaluation Record. Workflow B is not invoked (Workflow B handles non-confirmed source states, not eligibility failures).

9. **Eligibility passes:** Invoke PR #92 Workflow 2 (Export Delivery Evidence Consumption) to create the SLA Evaluation Record. The Workflow 2 invocation receives the Handoff Record reference and the source `vendor_export_delivery_evidence_reference`; PR #92's SLA Evaluation Record creation proceeds per its existing specification.

10. **Bind SLA Evaluation Record to Handoff Record.** On successful PR #92 Workflow 2 completion, populate `bound_sla_evaluation_record_reference` on the Handoff Record. Transition Handoff Record from `pending -> consumed`. Record audit reference.

11. **Workflow 2 invocation fails transiently:** Transition Handoff Record from `pending -> consumption_failed`. Record `handoff_failure_retry_reference`. Retry is permitted per Step 5 on subsequent source event observation (or per Integration Management retry policy if the transport replays).

**Idempotency invariant:** Steps 2 and 3 ensure that duplicate observation of the same source event produces at most one SLA Evaluation Record. Replay-acknowledged audit references record that duplicates were observed without producing additional state.

**Ordering invariant:** Steps 2-5 handle out-of-order arrival of source events safely. Once a Handoff Record reaches `consumed`, subsequent stale source events for the same idempotency key are replay-acknowledged. PR #91's source-state invariant (Delivery Evidence is terminal once `confirmed`) means out-of-order `failed` after `confirmed` for the same Delivery Evidence is impossible at the source; nevertheless, the workflow is safe under arbitrary reordering at the transport layer.

**Replay-time eligibility invariant:** The eligibility decision captured at Step 7 is honored across all subsequent replays. Even if SLA Policy is later edited, the original eligibility decision and the original SLA Evaluation Record binding remain authoritative. Re-evaluation is not performed.

**Workflow A produces no SLA Exception directly.** SLA Exceptions (Late / Missing / Partial per PR #92) are created by PR #92's evaluation workflows, not by Workflow A. Workflow A only produces the Handoff Record and (via PR #92 Workflow 2) the SLA Evaluation Record.

### Workflow B - Non-Confirmed Delivery Evidence Handling

**Trigger:** Fulfillment / Returns observes one of:

- `order-routing.export-delivery-evidence.failed` (source event published by Order Routing per PR #91 when `delivery_confirmation_state` transitions to `failed`).
- Observation of source Delivery Evidence in `partial` state. (PR #91 publishes `.failed` for `failed` and `.confirmed` for `confirmed`; observation of `partial` and `unconfirmable` states happens via reference lookup against Order Routing's record, not via a dedicated source event. The exact observation path is Integration Management transport detail and not specified at this workflow level.)
- Observation of source Delivery Evidence in `unconfirmable` state via the same reference-lookup path as `partial`.

**Steps:**

1. **Compute Handoff Idempotency Key** per Workflow A Step 1.

2. **Idempotency lookup** per Workflow A Step 2.

3. **Existing record found in any terminal state (`consumption_skipped`, `consumption_held`, `consumed`):** Record `replay_acknowledged` audit reference on the existing record. **Do not transition state.** Step exits.

4. **Existing record found in `consumption_failed` or `pending`:** Record audit reference noting the non-confirmed source observation. **Do not transition state.** (A Handoff Record in `consumption_failed` retries via Workflow A on subsequent confirmed-source observation if applicable. Phase 1 does not transition a `consumption_failed` record to a non-confirmed terminal state automatically.) Step exits.

5. **No existing record found:** Create a new Cross-Module Handoff Record in `pending` state with idempotency key, consumer scope reference, source evidence snapshot reference, observed source event reference, tenant scope reference.

6. **State mapping based on source Delivery Evidence state:**
   - Source state `failed` -> Transition Handoff Record from `pending -> consumption_skipped`. Audit reason: `source_failed`.
   - Source state `unconfirmable` -> Transition Handoff Record from `pending -> consumption_skipped`. Audit reason: `source_unconfirmable`.
   - Source state `partial` -> Transition Handoff Record from `pending -> consumption_held`. Audit reason: `source_partial`. **No SLA Evaluation Record is created.** **No SLA clock starts.** Phase 1 disposition: partial source delivery does not start the response window.

7. **Audit reference** is recorded on every transition.

**Phase 1 deliberate non-behavior:**

- Workflow B does not later transition `consumption_held` records to `consumed` if the source Delivery Evidence is somehow later observed in `confirmed` state. PR #91's invariant (Delivery Evidence is terminal once `confirmed`) means that observation isn't possible at the source. If a future PR introduces re-export semantics that produce a different outcome, that path produces a **new** Vendor Export Delivery Evidence per PR #91's re-export discipline; the new Delivery Evidence produces a new Handoff Record via Workflow A. The prior `consumption_held` record remains held.
- Workflow B does not retry from `consumption_skipped` automatically. Operator intervention via existing Order Routing re-export controls produces a new Delivery Evidence and a new Handoff Record.
- Workflow B does not produce SLA exceptions. Late / Missing / Partial SLA Exceptions remain workflow-driven from SLA Evaluation Records per PR #92; without an SLA Evaluation Record, no SLA Exception is created. (A Missing Fulfillment Import Exception in PR #92 fires when the Expected Deadline elapses without import receipt, which requires an SLA Evaluation Record to exist; that, in turn, requires a `consumed` Handoff Record from Workflow A.)
- Workflow B does not retroactively start an SLA clock if SLA Policy is later edited to opt into partial-delivery-starts-clock semantics. Phase 1 records the held state; future PRs that introduce such semantics will need their own transition discipline.

### Workflow A / Workflow B interaction guarantees

- Workflow A and Workflow B do not race for the same Handoff Record. The idempotency key ensures that the same source Delivery Evidence (regardless of which event triggered observation) resolves to the same Handoff Record per consumer scope.
- If Workflow A's Step 6 creates a Handoff Record and Workflow B simultaneously creates a record for the same idempotency key, exactly one record exists by virtue of the uniqueness invariant on (`handoff_idempotency_key`, `consumer_scope_reference`). The losing creator path resolves to the winning record per Workflow A Steps 2-5 / Workflow B Steps 2-4.
- Workflow A operates on `confirmed` source observation; Workflow B operates on non-`confirmed` source observation. Since a source Delivery Evidence has exactly one terminal state at any given time, both workflows for the same idempotency key cannot legitimately produce conflicting Handoff Record states.
- Workflow A is the only workflow that creates an SLA Evaluation Record. Workflow B never does. PR #92's existing evaluation, late/missing/partial detection, breach review, and override evidence workflows operate only against SLA Evaluation Records that Workflow A produced.

### Order Routing-side workflow contract (not a new workflow)

PR #91 Workflow 3 (Vendor Export Delivery Evidence Capture) remains the canonical producer flow. This Boundary/Handoff PR does not introduce a new Order Routing workflow. The contract guarantees the Order Routing publication side commits to (at-least-once delivery of `order-routing.export-delivery-evidence.confirmed` and `.failed`; in-order-best-effort; no retroactive mutation of confirmed source state; payload reference stability post-emission) are documented in `boundary-contracts.md` and `event-contracts.md` on the Order Routing side.

### What these workflows do not do

- They do not create SLA Exceptions directly.
- They do not mutate Order Routing state.
- They do not start SLA clocks from non-`confirmed` source evidence.
- They do not re-evaluate eligibility on replay.
- They do not embed or copy source evidence payloads.
- They do not specify transport / broker / queue mechanics.
- They do not specify retry policy tuning.
- They do not produce buyer-facing state.
- They do not produce notification deliveries (Notification Platform Service is not invoked).
- They do not produce analytics aggregations (Analytics / Reporting is not invoked).
- They do not introduce vendor-self-service surfaces in Phase 1.

<!-- BOUNDARY/HANDOFF PR APPEND ANCHOR -->
## Delivery Date and Buyer Update Workflows (PR-B)

This section adds twelve workflow sections for the delivery-date and buyer-update hardening pass. Workflows are described at proposal level; runtime concurrency, retry tuning, and persistence mechanics are implementation concerns and remain deferred. Existing workflows (handoff disposition, fulfillment import row validation, tracking validation, shipment status updates, returns flows, replacement flows) are not modified by PR-B.

### Workflow 1 - Vendor Fulfillment Import Delivery Date Intake

- **Trigger:** an existing Fulfillment Import row containing a Delivery Date value has passed the existing baseline row-identification step (which binds the row to a specific Shipment Line).
- **Steps:**
  1. Create a Delivery Date Evidence record in `pending` state. Bind `source_reference_type = vendor_fulfillment_import`, `source_reference` to the originating Fulfillment Import, and `shipment_line_reference` to the affected Shipment Line.
  2. Capture `reported_delivery_date` from the import row.
  3. Audit. Hand off to Workflow 2 for validation.
- **Discipline:**
  - Workflow 1 runs after fulfillment-import row identification (existing baseline) and before any shipment-line state transition.
  - Workflow 1 does not perform validation. It captures the reported value and routes it.
  - Workflow 1 does not alter the Fulfillment Import Received Timestamp. PR #92's SLA semantics are preserved unconditionally.

### Workflow 2 - Delivery Date Validation

- **Trigger:** Delivery Date Evidence in `pending` state from Workflow 1.
- **Steps:**
  1. Look up the affected Shipment Line and gather: current Shipped Date, parent order / suborder creation date, earliest tracking-evidence timestamp where present, currently-accepted Delivery Date Evidence reference where present, current Shipment Status.
  2. Apply validation rules in order. First failure produces a specific `rejected_*` terminal outcome and halts validation:
     - Format check: `reported_delivery_date` parseable as a date. Failure produces `rejected_invalid_format`.
     - Not-before-shipped: `reported_delivery_date` is not earlier than Shipped Date. Failure produces `rejected_before_shipped`.
     - Not-before-order-creation: `reported_delivery_date` is not earlier than parent order or suborder creation date. Failure produces `rejected_before_order_creation`.
     - Not-before-tracking-evidence: where tracking evidence exists, `reported_delivery_date` is not earlier than the earliest tracking-evidence timestamp. Where tracking evidence does not exist, this rule is conditionally skipped without producing an outcome. Failure (when tracking evidence exists) produces `rejected_before_tracking_evidence`.
     - Not-stale: `reported_delivery_date` is not earlier than the currently-accepted Delivery Date Evidence's `reported_delivery_date`. Failure produces `rejected_stale`.
     - Not-duplicate: `reported_delivery_date` does not exactly match the currently-accepted Delivery Date Evidence's `reported_delivery_date`. Equality produces `rejected_duplicate` (recorded as idempotent acknowledgement, not as an error).
     - Not-regression-without-authority: the Shipment Line is not in Delivered state. If the Shipment Line is in Delivered state, the update is treated as a correction attempt; Workflow 6 (Delivery Date Correction Evidence) handles it instead and Workflow 2 produces `rejected_regression_without_authority` for the pending Delivery Date Evidence.
  3. All-pass produces `accepted`. Audit.
- **Discipline:**
  - First-failure-halts is intentional. Multiple rules may apply to a single value, but the first failure is the audit-relevant outcome; subsequent rules are not re-evaluated.
  - Workflow 2 does not produce SLA outcomes. PR #92's SLA Evaluation Record remains unaffected by Workflow 2's `accepted` or `rejected_*` outcomes.
  - Workflow 2 does not transition Shipment Status. Workflow 3 is the explicit path when the outcome is `accepted`.
  - `rejected_duplicate` is an idempotent acknowledgement, not an error. No alert is raised; audit records the duplicate observation.

### Workflow 3 - Shipment Status Evidence Update

- **Trigger:** Delivery Date Evidence reaches `accepted` state from Workflow 2.
- **Steps:**
  1. Transition the existing Shipment Status lifecycle to delivered for the affected Shipment Line.
  2. Set `delivered_shipment_evidence_reference` on the Shipment Line to the accepted Delivery Date Evidence.
  3. Set `delivered_at_timestamp` on the Shipment Line to the validated `reported_delivery_date`.
  4. Audit. Trigger Workflow 8 (Buyer Delivery Update-Ready) for delivery-kind signal creation.
- **Discipline:**
  - Workflow 3 is the atomic transition path from accepted Delivery Date Evidence to Delivered state. Skipping any step is a violation.
  - Workflow 3 does not modify Order Routing records or events.
  - Workflow 3 does not re-evaluate other validation rules; the accepted outcome is the precondition.
  - If the Shipment Line is already in Delivered state at trigger time, this is a contradiction (Workflow 2 should have routed to Workflow 6 instead). The contradiction is recorded as an audit anomaly and Workflow 3 does not transition state.

### Workflow 4 - Stale Delivery Update Handling

- **Trigger:** Workflow 2 produces `rejected_stale` outcome.
- **Steps:**
  1. Record the Delivery Date Evidence in `rejected_stale` terminal state.
  2. Audit with `validation_rule_failure_reference` pointing to the stale-rejection rule and a reference to the currently-accepted Delivery Date Evidence.
  3. Do not transition Shipment Status. Do not produce Buyer Update-Ready Signal.
- **Discipline:**
  - Stale outcomes are observable in audit. Operators may review per-vendor stale rates through future Cross-Module Summary Email PR or future Analytics aggregation; PR-B captures the state.

### Workflow 5 - Duplicate Delivery Update Handling

- **Trigger:** Workflow 2 produces `rejected_duplicate` outcome.
- **Steps:**
  1. Record the Delivery Date Evidence in `rejected_duplicate` terminal state.
  2. Audit with `validation_rule_failure_reference` pointing to the duplicate-rejection rule and a reference to the currently-accepted Delivery Date Evidence.
  3. Do not transition Shipment Status. Do not produce a new Buyer Update-Ready Signal.
- **Discipline:**
  - The duplicate outcome is an idempotent acknowledgement of an already-recorded delivery date. The vendor's submission is acknowledged; the platform does not error and does not re-notify the buyer.

### Workflow 6 - Delivery Date Correction Evidence

- **Trigger:**
  - **6a:** Workflow 2 detects a vendor-submitted update where the Shipment Line is already in Delivered state. The pending Delivery Date Evidence transitions to `rejected_regression_without_authority`; no automatic correction is created. The dispute path requires explicit System Admin action (path 6b below).
  - **6b:** A CIXCI System Admin (or other authorized actor) submits a correction via authority-gated path, attaching a `prior_delivery_date_evidence_reference` and a `corrected_delivery_date_value`.
- **Steps for 6b:**
  1. Create Delivery Date Correction Evidence in `proposed` state.
  2. Resolve Delivery Date Override / Correction Authority via Tenant Company `check_access`. If absent, transition to `rejected` with failure mode `DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED`. Audit. End.
  3. Validate `corrected_delivery_date_value` against the same validation rules used by Workflow 2 (not-before-shipped, not-before-order-creation, not-before-tracking-evidence, format), but the stale and regression rules do not apply (correction inherently changes a prior accepted value). If validation fails, transition to `rejected` with the specific validation failure. Audit. End.
  4. If supporting evidence reference is required by Phase 1 policy but absent, transition to `rejected` with failure mode `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING`. Audit. End. Authority-missing and audit-evidence-missing are distinct failure cases; they are never mixed.
  5. Transition the Correction Evidence to `applied`. Create a new Delivery Date Evidence in `accepted` state with `source_reference_type = vendor_fulfillment_import` (or future source as applicable), `source_reference` pointing to the originating import or correction submission. Transition the prior Delivery Date Evidence to `superseded` with `superseded_by_reference` pointing to the new record.
  6. Update the affected Shipment Line: `delivered_shipment_evidence_reference` points to the new Delivery Date Evidence; `delivered_at_timestamp` updates to the corrected value.
  7. If a Buyer Update-Ready Signal for this Shipment Line was previously dispatched, acknowledged, or failed (i.e., the buyer has been or attempted to be updated), trigger Workflow 8 to produce a new Buyer Update-Ready Signal with `update_kind = correction`. If a Buyer Update-Ready Signal for this Shipment Line is still in `pending` or `held` state (not yet dispatched), the existing signal is superseded in place: the existing signal transitions to `superseded`, and a new signal is created with the corrected references.
  8. Audit each transition.
- **Discipline:**
  - Vendor users cannot trigger 6b in Phase 1. The authority gate is Tenant Company `check_access`.
  - Prior Delivery Date Evidence is never edited in place. The correction creates a new record and supersedes the old; both are preserved.
  - Authority absent and audit-evidence absent are distinct failure modes. The error vocabulary uses `DELIVERY_DATE_CORRECTION_AUTHORITY_REQUIRED` and `DELIVERY_DATE_CORRECTION_AUDIT_EVIDENCE_MISSING` (or carefully-extended existing taxonomy where permissions.md indicates).
  - Workflow 6 does not retroactively alter PR #92's SLA Evaluation Record. The correction is a content correction, not an SLA-timing change.
  - Workflow 6 does not modify Order Routing records or events.

### Workflow 7 - Buyer Shipment Update-Ready Signal

- **Trigger:** an existing Shipment Line transitions to a shipped state (per the existing baseline shipped-state transition path, hardened by PR-B by the addition of Buyer Update-Ready creation).
- **Steps:**
  1. Determine the parent order context for the Shipment Line.
  2. If a Buyer Update-Ready Signal with `update_kind = shipment` already exists for the parent order, do not create a duplicate. If the existing signal is in a non-terminal state, this Shipment Line's shipped transition is captured as part of the multi-vendor aggregation evaluation (step 4).
  3. If no signal exists, create a new Buyer Update-Ready Signal in `pending` state with `update_kind = shipment`, `parent_order_reference`, `tenant_company_reference`, `buyer_integration_profile_reference`, and `shipment_line_references` populated with all Shipment Lines required for the parent order (per existing baseline parent-order Shipment Line aggregation).
  4. Run Workflow 9 (Buyer Update Eligibility evaluation) for this signal.
  5. Audit.
- **Discipline:**
  - Workflow 7 does not transmit anything to the buyer. Transmission is Integration Management's responsibility once the signal reaches `eligible` and is handed off via Workflow 10.
  - Workflow 7 does not aggregate across Tenant Company boundaries.
  - The Multi-Vendor / Multi-Suborder Buyer Update Rule's Phase 1 default applies; Workflow 9 will produce `held_awaiting_all_vendors_shipped` if any Shipment Line in the parent order has not yet reached shipped state.

### Workflow 8 - Buyer Delivery Update-Ready Signal

- **Trigger:** Workflow 3 completes (Shipment Line transitions to Delivered state via accepted Delivery Date Evidence), OR Workflow 6 step 7 indicates a buyer correction-kind signal is required.
- **Steps:**
  1. Determine the parent order context.
  2. Determine `update_kind`: `delivery` for the Workflow 3 trigger path; `correction` for the Workflow 6 trigger path.
  3. For `delivery` kind: if a Buyer Update-Ready Signal with `update_kind = delivery` already exists for the parent order, do not create a duplicate; capture this Shipment Line's delivered transition as part of multi-vendor aggregation. If no signal exists, create a new Buyer Update-Ready Signal in `pending` state with the appropriate references including `triggering_delivery_date_evidence_reference`.
  4. For `correction` kind: always create a new Buyer Update-Ready Signal in `pending` state with `update_kind = correction`, `triggering_delivery_date_correction_evidence_reference` set, and `superseded_buyer_update_ready_reference` pointing to the previously-dispatched-or-acknowledged-or-failed delivery-kind signal that the correction supersedes. The prior delivery-kind signal record is not edited; the superseded reference traces the relationship for audit.
  5. Run Workflow 9 (Buyer Update Eligibility evaluation) for this signal.
  6. Audit.
- **Discipline:**
  - Workflow 8 does not transmit anything to the buyer.
  - Correction-kind signals are not subject to the all-vendors-delivered aggregation hold; correction applies to a specific Shipment Line and the buyer-update-ready evaluation reflects that scope.
  - Correction-kind signals do not retroactively alter the historical delivery-kind signal record; the prior record is preserved for audit.

### Workflow 9 - Buyer Update Eligibility Evaluation

- **Trigger:** Workflow 7 step 4 or Workflow 8 step 5; also triggered by Workflow 11 (Hold / Suppression Re-Evaluation) when a held condition changes.
- **Steps:**
  1. For the Buyer Update-Ready Signal under evaluation, check the following conditions in order:
     - Multi-Vendor / Multi-Suborder Buyer Update Rule (Phase 1 default = all-vendors aggregation):
       - For `update_kind = shipment`: all Shipment Lines in `shipment_line_references` must be in shipped state. If any are not, transition to `held_awaiting_all_vendors_shipped`. End.
       - For `update_kind = delivery`: all Shipment Lines must be in Delivered state. If any are not, transition to `held_awaiting_all_vendors_delivered`. End.
       - For `update_kind = correction`: this rule does not apply; correction targets a specific Shipment Line.
     - Tenant Company buyer-level pause flag: if set, transition to `held_buyer_integration_paused`. End.
     - Correction Under Review: if a Delivery Date Correction Evidence in `proposed` state affects any Shipment Line referenced by this signal, transition to `held_correction_under_review`. End.
     - Tenant Scope Active: if the Tenant Company scope is inactive, transition to `held_tenant_scope_inactive`. End.
     - Manual Hold: if a System Admin has manually held this signal, the manual hold remains in effect; `held_manual` state. End.
  2. If all conditions pass, transition the signal to `eligible`. Trigger Workflow 10 (Integration Management Dispatch Handoff).
  3. Audit each transition with the specific hold reason or eligibility result.
- **Discipline:**
  - Eligibility evaluation is deterministic for a given signal and current state. Re-running Workflow 9 on the same signal with unchanged conditions produces the same outcome.
  - Workflow 9 does not silently skip any condition. Each evaluation produces an explicit hold reason or `not_held` result.
  - Workflow 9 does not call out to Integration Management. The handoff is Workflow 10.

### Workflow 10 - Integration Management Dispatch Handoff

- **Trigger:** Buyer Update-Ready Signal transitions to `eligible` (from `pending` via Workflow 9, or from `held` via Workflow 11 Re-Evaluation).
- **Steps:**
  1. Hand off the signal to Integration Management transport via the boundary contract documented in boundary-contracts.md. The handoff carries the signal reference and the `buyer_integration_profile_reference`.
  2. Integration Management creates its own dispatch attempt record and returns a reference. Fulfillment / Returns captures the reference as `buyer_update_dispatch_reference` on the signal.
  3. Transition the signal to `dispatched`.
  4. Audit.
- **Discipline:**
  - Workflow 10 does not perform transport. Transport is Integration Management's responsibility.
  - Workflow 10 does not retry on dispatch failure. Retry is Integration Management's policy. If Integration Management exhausts retries and reports failure, Workflow 12 captures the outcome on Fulfillment / Returns' side via `buyer_update_failure_reference`.
  - Workflow 10 does not transition `dispatched -> eligible` on Integration Management failure. A failed dispatch produces `failed` state via Workflow 12; resolution is a new signal (via correction or controlled supersession) or operator intervention.

### Workflow 11 - Buyer Update Hold / Suppression Re-Evaluation

- **Trigger:** a condition that may release a hold has changed:
  - An additional Shipment Line in the parent order transitions to shipped state (may release `held_awaiting_all_vendors_shipped`).
  - An additional Shipment Line transitions to Delivered state via Workflow 3 (may release `held_awaiting_all_vendors_delivered`).
  - Tenant Company buyer-level pause flag is cleared (may release `held_buyer_integration_paused`).
  - A Delivery Date Correction Evidence resolves (`applied` or `rejected`) (may release `held_correction_under_review`).
  - A Tenant Scope becomes active (may release `held_tenant_scope_inactive`).
  - A System Admin lifts a manual hold (may release `held_manual`).
- **Steps:**
  1. Identify all Buyer Update-Ready Signal records in `held` state where the held condition matches the triggering change.
  2. For each, re-run Workflow 9 (Buyer Update Eligibility Evaluation).
  3. Signals that pass evaluation transition `held -> eligible` and trigger Workflow 10.
  4. Signals that still fail evaluation remain in `held` state with the appropriate hold reason (which may differ from the prior reason).
  5. Audit each transition.
- **Discipline:**
  - Re-evaluation may produce a different hold reason than the original (e.g., a signal that was held awaiting-all-vendors-shipped may become held buyer-integration-paused after the shipped condition is satisfied but a separate pause is set).
  - Workflow 11 does not bypass conditions. A signal cannot be released to `eligible` if any blocking condition is still in effect.

### Workflow 12 - Buyer Update Failure / Acknowledgement Reference Capture

- **Trigger:** Integration Management reports a transport outcome for a Buyer Update-Ready Signal currently in `dispatched` state. The outcome may be acknowledgement (buyer system received and accepted the update) or failure (transport exhausted retries or buyer system rejected).
- **Steps:**
  1. For an acknowledgement outcome: set `buyer_update_acknowledgement_reference` on the signal to the Integration Management acknowledgement record reference. Transition the signal to `acknowledged`. Audit.
  2. For a failure outcome: set `buyer_update_failure_reference` on the signal to the Integration Management failure record reference. Transition the signal to `failed`. Audit.
- **Discipline:**
  - Workflow 12 does not retry. Integration Management owns retry policy.
  - Once a signal reaches `acknowledged` or `failed`, the signal is terminal. Subsequent updates require a new signal (e.g., a correction-kind signal supersedes a prior delivery-kind signal that may be in `failed` state if a corrected delivery date is later submitted).
  - Workflow 12 does not modify Integration Management state. The dispatch, acknowledgement, and failure records are Integration Management-owned; Fulfillment / Returns reads them by reference.

---

### Phase 1 deliberate non-behaviors

The following are explicitly out of scope for PR-B:

- Carrier-originated Delivery Date Evidence. Phase 1 source is vendor-submitted only.
- Per-buyer configurability of the Multi-Vendor / Multi-Suborder Buyer Update Rule. Phase 1 default is all-vendors aggregation; future per-buyer override is anticipated by `buyer_integration_profile_reference` but not implemented.
- Notification Platform delivery of buyer-update outcomes or summaries.
- Analytics aggregation of held-state counts, correction rates, dispatch / acknowledgement / failure rates.
- Buyer-facing payload structure, field selection, format, or per-buyer customization.
- Vendor self-service Delivery Date correction after Delivered state.
- Vendor self-service override of `rejected_*` validation outcomes.
- Order Routing record mutation under any path.
- SLA Evaluation Record mutation under any path. PR #92's SLA semantics are preserved by all PR-B workflows.
