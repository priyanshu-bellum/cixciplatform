# Order Routing Data Model

This document is proposal-level architecture. It defines initial Order Routing entities without finalizing implementation schema or moving upstream/downstream ownership into Order Routing.

## Entities

### Intake And Decomposition

- Parent Order Intake Reference
- Accepted Buyer Order Reference
- Routeable Order Line
- Order Decomposition Record
- Order Line Group

### Routing Policy

- Routing Policy
- Routing Rule
- Routing Policy Version
- Routing Policy Scope
- Routing Rule Conflict
- Routing Precedence Ladder

### Routing Decisions And Outputs

- Routed Order Record
- Routing Decision Record
- Routing Snapshot
- Vendor Suborder
- Manufacturer Suborder Placeholder
- Split Order Group
- Downstream Fulfillment Instruction Placeholder
- Warranty Registration Required Signal Placeholder

### Vendor Routed-Suborder Export And Handoff

- Vendor Order Export Eligibility Record
- Vendor Order Export Batch
- Vendor Order Export Batch Item
- Buyer / Retailer Split Reference
- Re-Export Request
- Manual Download Reference
- Fulfillment Handoff Request

### Exceptions And Review

- Routing Exception
- Routing Exception Family
- Routing Review Record
- Routing Retry Record
- Manual Routing Override Request
- Routing Supersession Record

### References

- Tenant Scope Reference
- Buyer / Entity Reference
- Product Catalog Reference
- Device Reference
- Product Type Reference
- Pricing Snapshot Reference
- Vendor / Manufacturer Assignment Reference
- Fulfillment Target Reference
- Integration Delivery Reference Placeholder
- Notification Delivery Reference Placeholder
- Logs & Audit Evidence Reference Placeholder
- AI Routing Signal Reference

## Entity Notes

### Parent Order Intake Reference

Represents a boundary reference to an accepted buyer order from buyer-facing order intake or a future Orders context.

- Placeholder: parent order id, source system, buyer/entity scope, order received timestamp, channel, and correlation id.
- Does not make Order Routing owner of checkout UX, payment capture, or full order lifecycle.

### Routeable Order Line

Represents a line from the accepted buyer order that needs routing.

- Placeholder: line id, parent order reference, product reference, Device Reference where relevant, Product Type, quantity, tenant scope, pricing snapshot reference, and routing status.
- Product facts stay in Product Catalog or Device Catalog. Price stays in Pricing.

### Order Decomposition Record

Records how a parent order was decomposed into routeable lines and groups.

- Placeholder: decomposition id, source order reference, decomposition rule version, line count, grouping summary, timestamp, and audit reference.

### Routing Policy

Represents a proposal-level set of routing behavior for an authorized scope.

- Placeholder: policy id, policy name, owning operational team, active state, effective dates, and current Routing Policy Version.
- Routing Policy defines how routing rules are selected and evaluated; it must not define pricing, tenant eligibility, product validation, fulfillment execution, warranty claim approval, procurement approval, or analytics metrics.

### Routing Rule

Represents a proposal-level rule used to evaluate routing decisions.

- Placeholder: rule id, policy version reference, rule type, matching scope, priority, condition summary, action summary, blocking behavior, review behavior, and audit reference.
- Rule actions may select routing targets, require review, block routing, create split groups, create export eligibility review state, or annotate warranty registration requirement signals.
- Rule actions must not recalculate price, create purchase orders, execute fulfillment, deliver integrations, send notifications, or approve warranty claims.

### Routing Policy Version

Represents a versioned routing policy used for audit and replay.

- Placeholder: policy version id, policy id, version number, effective date range, activation timestamp, retired timestamp, approver, change reason, and compatibility notes.
- Routing snapshots and vendor export eligibility records should record the Routing Policy Version or inclusion rule version used for each decision.

### Routing Policy Scope

Represents where a routing policy or rule is allowed to apply.

- Placeholder: tenant, buyer parent, buyer child/entity, vendor/manufacturer target, Product Type, product category, region, channel, timeframe, fulfillment capability, export method, and warranty-registration-required scope.
- Scope references consume Tenant Company, Product Catalog, Device Catalog, Pricing, and Fulfillment signals; Order Routing does not own those source scopes.

### Routing Rule Conflict

Represents incompatible matching rules or inputs that cannot be safely resolved.

- Placeholder: conflict id, conflicting rule references, affected order/line/group/export/handoff, conflict type, severity, blocking behavior, review queue, and resolution reference.
- Conflicts should produce blocking or review-required state rather than relying on hidden ordering.

### Routing Precedence Ladder

Represents the proposal-level order of evaluation when routing inputs conflict.

Precedence guardrails:

1. Exception blockers and required upstream blockers prevent routing before target selection.
2. Tenant Company scope must be explicit and valid before routing uses buyer/entity, relationship, region, Product Type, licensed-property, export permission, or manual download signals.
3. Price snapshot availability must be valid and order-bindable before suborder creation; Order Routing must not recalculate price.
4. Product Type determines applicable routing capability family but does not transfer Product Type definition ownership to Order Routing.
5. Vendor/manufacturer target rules select eligible targets only after tenant, product/device, and price prerequisites are valid.
6. Fulfillment target availability gates downstream instruction placeholders but does not create fulfillment execution state.
7. Vendor export eligibility runs after routed suborders and routing snapshots exist; it must not rewrite routing decisions.
8. Vendor export batch items enforce per-routed-suborder inclusion, exclusion, and duplicate prevention before batch-level export generation.
9. Fulfillment handoff requests are requests only until Fulfillment/Returns records its own disposition.
10. Warranty registration requirement may add a signal or blocker depending on confirmed policy; it must not become warranty claim lifecycle.
11. Manual override may supersede a routing decision only through approved policy and new snapshot/supersession records.
12. Equal-specificity conflicts should produce Routing Rule Conflict or review-required state.

### Routed Order Record

Represents Order Routing's routed view of a parent order.

- Placeholder: routed order id, parent order reference, routing state, routing snapshot references, suborder references, exception summary, vendor export status summary, and downstream handoff status.

### Routing Decision Record

Represents one decision about a routeable line or line group.

- Placeholder: decision id, affected line/group, selected vendor/manufacturer placeholder, selected fulfillment target reference, reason summary, routing policy version, routing rule version, input references, actor/system actor, and timestamp.

### Routing Snapshot

Immutable evidence of routing decision inputs and outputs.

Required/evidence fields should include:

- Snapshot id.
- Source order reference.
- Parent order reference.
- Order line references.
- Tenant scope reference.
- Product Catalog references.
- Device References where relevant.
- Product Type reference.
- Pricing snapshot reference.
- Selected route.
- Vendor/manufacturer assignment references.
- Downstream target references.
- Warranty registration requirement reference where applicable.
- Routing policy version.
- Routing rule version.
- Source input versions.
- `routingInputHash`.
- `manualOverrideFlag`.
- `supersessionReference`.
- Decision timestamp.
- Actor or system actor.
- Decision summary.
- Exception/review state where applicable.

Routing snapshots are immutable. Corrections, re-routing, manual overrides, export corrections, and post-facto changes should create new snapshots, export records, or Routing Supersession Records, not rewrite historical snapshots.

### Vendor Suborder

Represents routed order lines assigned to a vendor.

- Placeholder: vendor suborder id, parent order reference, vendor reference, buyer/entity reference, line references, pricing snapshot references, tenant scope, fulfillment target reference, routing snapshot reference, warranty registration requirement references, dedupe key, and status.
- Does not own vendor fulfillment execution, export delivery, notification delivery, file evidence, or invoice lifecycle.

### Manufacturer Suborder Placeholder

Represents a future placeholder for manufacturer-routed lines.

- Placeholder: manufacturer reference, line references, Device References or product references, routing snapshot reference, dedupe key, and unresolved procurement/fulfillment boundaries.
- Must not become purchase order lifecycle or procurement approval.

### Vendor Order Export Eligibility Record

Represents Order Routing's per-routed-suborder determination of whether a routed suborder may be included in a vendor order export.

Proposal-level fields/concepts:

- Eligibility record id.
- Parent order reference.
- Routed suborder reference.
- Routing snapshot reference.
- Vendor reference.
- Buyer/entity reference.
- Export window.
- Source event/reference.
- Source version.
- Export schema version.
- Export inclusion rule version.
- Idempotency key.
- Eligibility status.
- Eligibility reason.
- Exclusion reason.
- Prior export state.
- Re-export allowed flag.
- Review-required state.
- Supersession/cancellation state.
- Audit reference.

Eligibility record determines whether a routed suborder may be included in a vendor order export. Eligibility does not mean the vendor has received, downloaded, accepted, or acted on the export. Integration Management, Notification Platform Service, and Logs & Audit own delivery, scheduled email, and immutable file/download evidence as applicable.

### Vendor Order Export Batch

Represents an Order Routing-owned grouping of vendor routed-suborder export batch items and export content references.

Proposal-level fields/concepts:

- Export batch id.
- Vendor reference.
- Parent order references where applicable.
- Buyer/retailer split mode.
- Export method reference.
- Export schema version.
- Export window.
- Generated timestamp.
- Generated by actor/service.
- Batch idempotency key.
- Vendor order export content reference.
- File/reference placeholder.
- Delivery reference placeholder.
- Notification delivery reference placeholder.
- Logs & Audit evidence reference placeholder.
- Review-required state.
- Audit reference.

Export batch is a workflow/content reference, not proof of external delivery, vendor acceptance, shipment, tracking, return, refund, invoice, or payment state.

### Vendor Order Export Batch Item

Represents per-routed-suborder membership and disposition inside an export batch or attempted export batch.

Proposal-level fields/concepts:

- Export batch item id.
- Export batch reference.
- Parent order reference.
- Routed suborder reference.
- Routing snapshot reference.
- Vendor reference.
- Buyer/entity reference.
- Eligibility record reference.
- Included/excluded status.
- Included/excluded reason.
- Prior export membership reference.
- Re-export reason.
- Duplicate prevention key.
- Source event/version.
- Resulting fulfillment handoff request reference.
- Review-required state.
- Supersession/cancellation state.
- Audit reference.

Duplicate prevention must be enforced at routed-suborder/batch-item level, not only at export batch level. Partial re-exports must not cause duplicate vendor processing unless explicitly authorized and recorded with prior export membership and re-export reason.

### Buyer / Retailer Split Reference

Represents export grouping evidence when a vendor export is split by buyer or retailer.

Proposal-level fields/concepts:

- Split reference id.
- Vendor reference.
- Buyer/entity reference.
- Split rule version.
- Export batch reference.
- Routed suborder references.
- Routing snapshot references.
- Export schema version.
- Export inclusion rule version.
- Review-required state.
- Audit reference.

Split behavior changes export grouping only. Split behavior must not change routing decisions, vendor ownership, parent order linkage, pricing snapshots, or fulfillment ownership.

### Re-Export Request

Represents an explicit, permissioned request to re-export one or more previously exported routed suborders.

Proposal-level fields/concepts:

- Re-export request id.
- Original export batch reference.
- Original export batch item references.
- Requested routed suborders.
- Re-export reason.
- Requested by actor/service.
- Tenant Company permission/approval reference placeholder.
- Duplicate processing risk flag.
- Allowed/blocked state.
- Generated replacement export reference.
- Supersession reference.
- Audit reference.

Re-export must be explicit and auditable. Re-export should preserve prior export membership and reason. Re-export must not silently re-send all previously exported suborders or create duplicate routed suborders.

### Manual Download Reference

Represents Order Routing's workflow reference for manual vendor download of an eligible export batch.

Proposal-level fields/concepts:

- Manual download reference id.
- Export batch reference.
- Actor/user reference.
- Vendor/company/entity reference.
- Download timestamp.
- Download count.
- Last downloaded by.
- Last downloaded at.
- Permission/scope reference.
- Audit reference.

Tenant Company owns user/vendor permission and scope. Logs & Audit owns immutable download/file evidence. Order Routing may keep workflow references to manual download status only where needed for export/re-export eligibility.

### Fulfillment Handoff Request

Represents Order Routing's request that Fulfillment/Returns consider a routed suborder or export batch item for fulfillment handling.

Proposal-level fields/concepts:

- Fulfillment handoff request id.
- Parent order reference.
- Routed suborder reference.
- Export batch item reference.
- Routing snapshot reference.
- Vendor reference.
- Buyer/entity reference.
- Handoff requested timestamp.
- Handoff source version.
- Handoff idempotency key.
- Fulfillment/Returns disposition reference.
- Fulfillment/Returns source version.
- Accepted/rejected/ignored state.
- Applied vs ignored state.
- Duplicate handoff blocker.
- Review-required state.
- Audit reference.

`order.routing.fulfillment-handoff.requested` is a request, not proof that Fulfillment/Returns accepted execution. Fulfillment/Returns owns acceptance, rejection, disposition, shipment, delivery, tracking, return, refund evidence, and operational execution state. Missing, duplicate, stale, ignored, or rejected Fulfillment/Returns disposition should not be treated as fulfilled, shipped, delivered, or accepted.

### Routing Exception

Typed exception raised when routing cannot safely proceed.

- Placeholder: exception type, exception family, affected parent order, line/group/export/handoff, tenant scope, product/device reference, route attempt, owner, severity, retryability, blocking behavior, review queue, reason, and audit reference.

### Routing Exception Family

Proposal-level families:

- Data exceptions: owner is usually the source input owner or Order Routing for malformed route request shape; retry after correction; blocking when required references are missing or invalid; queue to data review.
- Eligibility/scope exceptions: owner is Tenant Company for scope signal resolution; retry after new eligibility signal; blocking when scope is denied/missing/conflicting; queue to tenant/relationship review.
- Pricing snapshot exceptions: owner is Pricing for snapshot generation/validity; retry after valid order-bindable snapshot; blocking when missing/stale/rejected/non-bindable; queue to pricing review.
- Target availability exceptions: owner is Order Routing for target selection and future Fulfillment for capability/execution details; retryable when target outage is temporary; blocking when no eligible target exists; queue to routing operations.
- Vendor export eligibility exceptions: owner is Order Routing for export eligibility records; retryable after corrected export window, snapshot, vendor assignment, or re-export authority; queue to export review.
- Vendor export batch item exceptions: owner is Order Routing for per-suborder inclusion, exclusion, duplicate prevention, and re-export disposition; queue to export review.
- Fulfillment handoff exceptions: owner is Order Routing for handoff request integrity and Fulfillment/Returns for disposition/acceptance; duplicate, stale, missing, rejected, or ignored disposition should route to review where required.
- Unsupported Product Type exceptions: owner is Product Catalog for Product Type definitions and Order Routing for supported routing capability; usually blocking until policy exists; queue to routing policy review.
- Warranty registration exceptions: owner depends on Product Catalog warranty facts or vendor integration delivery owner; retryable when delivery method metadata is corrected; blocking only where policy says warranty registration is required before routing; queue to warranty/integration review.
- Downstream handoff exceptions: owner is Order Routing for handoff placeholders and downstream owner for execution acceptance; retryable where downstream target recovers; queue to fulfillment/integration review.
- Manual review exceptions: owner is routing operations; retryability depends on review outcome; blocking until approved/rejected; queue to manual routing review.

### Routing Retry Record

Tracks retry attempts for routing-specific failures.

- Placeholder: retry id, exception reference, attempt number, scheduled time, retry budget reference, result, failure reason, and next action.
- Retry must not bypass Pricing, Tenant Company, Product Catalog, Device Catalog, Fulfillment, Warranty, Integration, Notification, Logs & Audit, or Procurement ownership.

### Manual Routing Override Request

Represents a request to override a routing decision or exception.

- Placeholder: request id, requested route, affected scope, requester, approver, reason, approval state, expiration, manual override flag, policy exception reference, and audit reference.
- Approved overrides should create new routing snapshots or supersession records.

## Product Type Routing Capability Matrix

Product Type influences routing policy selection, but Order Routing does not own Product Type definitions.

| Product Type family | Routing capability | Boundary guardrail |
| --- | --- | --- |
| Accessory | May route by Product Catalog product reference, vendor target, Compatible Device Reference where required, warranty registration requirement, vendor export eligibility, and fulfillment target placeholder. | Product Catalog owns product records, compatibility assertions, Product Type validation, and warranty product facts. |
| Device | May route by Device Reference, manufacturer/vendor target placeholder, tenant scope, pricing snapshot, vendor export eligibility where applicable, and fulfillment target placeholder. | Device Catalog owns canonical device data and buyer-exportable device data; Procurement owns future bulk PO lifecycle if introduced. |
| Branded Merchandise | May route by Product Catalog reference, Product Type, licensed-property scope signal, vendor target, vendor export eligibility, and fulfillment target placeholder. | Product Catalog owns product validation and Product Type definitions; Tenant Company owns licensed-property eligibility scope. |
| Future Product Type | Must require explicit Routing Policy Version and capability declaration before execution routing or vendor export. | Unsupported Product Types should block or require review rather than falling into an existing mini-routing engine. |

## Relationships

- Parent Order Intake Reference has many Routeable Order Lines.
- Order Decomposition Record groups Routeable Order Lines into Order Line Groups.
- Routing Policy has one or more Routing Policy Versions.
- Routing Policy Version has one or more Routing Rules.
- Routing Rule Conflicts reference conflicting Routing Rules and affected routing inputs.
- Routed Order Record references one Parent Order Intake Reference and one or more Routing Snapshots.
- Routing Snapshot references the input order, routeable lines, selected route, price snapshot, tenant scope, product/device references, policy/rule versions, input hash, and downstream targets.
- Vendor Suborder and Manufacturer Suborder Placeholder preserve parent order linkage and line references.
- Vendor Order Export Eligibility Record references one routed suborder, vendor, buyer/entity, routing snapshot, export window, source event/version, export schema version, and inclusion rule version.
- Vendor Order Export Batch has many Vendor Order Export Batch Items.
- Vendor Order Export Batch Item references one routed suborder, one eligibility record, routing snapshot, prior export membership where applicable, and resulting fulfillment handoff request where applicable.
- Buyer / Retailer Split Reference groups export batch items by vendor and buyer/entity without changing routing decisions.
- Re-Export Request references original export batch and original export batch items and may produce a replacement export batch reference.
- Manual Download Reference references export batch and Tenant Company permission/scope evidence while Logs & Audit owns immutable download evidence.
- Fulfillment Handoff Request references routed suborder, export batch item, routing snapshot, and Fulfillment/Returns disposition reference when available.
- Routing Exception may reference Parent Order, Routeable Order Line, Routing Decision Record, Routing Snapshot, Vendor Order Export Eligibility Record, Vendor Order Export Batch Item, Fulfillment Handoff Request, or downstream target.
- Routing Retry Record and Routing Review Record reference Routing Exceptions.
- Routing Supersession Record links corrected snapshots or export records to prior snapshots/export records.

## Ownership

- Order Routing owns routing policy records, routing rule records, routing decision records, routed order records, vendor/manufacturer suborder structure, split-order groupings, routing snapshots, vendor export eligibility records, vendor export batch/item workflow references, buyer/retailer split references, re-export requests, manual download workflow references, fulfillment handoff requests, routing exceptions, retry/review records, and routing events.
- Tenant Company owns tenant scope, eligibility, readiness, relationship signals, user/vendor permissions, company/entity scope, and manual download/re-export authority.
- Product Catalog owns product records, product validation, compatibility assertions, stop-sell/deactivation, activation/download, Product Type definitions, and warranty product facts.
- Device Catalog owns Device References and canonical device data.
- Pricing owns price calculation, quote-like results, pricing snapshots, and pricing audit.
- Fulfillment/Returns owns fulfillment handoff acceptance/disposition, shipment, tracking, delivery, return, replacement, refund evidence, fulfillment import validation, and operational execution state.
- Integration Management owns external delivery/receipt state, transport evidence, provider failures/retries, and external references.
- Notification Platform Service owns scheduled email delivery and notification history.
- Logs & Audit owns immutable export/download/file/audit evidence, row counts, file references, and retention.
- Invoice Management owns invoice lifecycle and reconciliation.

## Retention

- Placeholder: define retention for routing policies, policy versions, routing rules, routing snapshots, routed order records, vendor suborders, vendor export eligibility records, export batches, export batch items, split references, re-export requests, manual download references, fulfillment handoff requests, exception records, retry records, manual override requests, and supersession records.
- Placeholder: define snapshot/export/handoff retention needs for Fulfillment/Returns, Invoice Management, warranty registration, dispute review, audit, Integration Management, Notification Platform Service, and Analytics.

## Tenant Isolation Notes

- Routing and export records must be scoped by tenant, buyer parent, child entity, vendor, region/channel where applicable, and relationship references.
- Suborders and export batch items must not expose sibling child entity data, unrelated buyer/vendor relationships, or unrelated vendor suborders.
- Manual download references must not expose unauthorized vendors, buyers, customer details, or unrelated export batches.
- Events should redact sensitive price, customer, vendor, warranty, export, and tenant details by consumer class.

## Vendor Export Schedule and Delivery Evidence Entities (PR-A)

PR-A introduces the scheduling and delivery evidence layer for vendor order exports. These entities sit on top of Order Routing's existing routing decision, suborder, export batch, and handoff entities — they do not replace or restructure them. The existing export model (Suborder, Export Batch, Export Item, Routing Snapshot, Handoff Request) is preserved unchanged.

The entities defined below are:

- **Vendor Export Schedule** — per-vendor configuration of when and how routed-suborder exports are produced and delivered. Reusable. Owned by Order Routing.
- **Vendor Export Window** — the materialized execution instance derived from a Schedule. One Schedule produces many Windows over time. Owned by Order Routing.
- **Vendor Export Delivery Evidence** — the authoritative record of what was delivered, when, to whom, by what method, with what confirmation. Owned by Order Routing. **This is the record Fulfillment / Returns SLA evaluation will read from (future Fulfillment / Returns PR-A).**
- **Vendor Export Delivery Attempt** — per-attempt audit record under Delivery Evidence. Captures Integration-Management-reported outcome of each delivery attempt. Owned by Order Routing.

Two reference fields carried by Order Routing but referencing externally-owned identity:

- **Vendor Export Delivery Method Reference** — references Integration-Management-owned delivery method definitions (Scheduled Email with CSV attachment, Scheduled Email with file reference, SFTP push, API push, Manual Download). Order Routing does not own delivery method protocol details.
- **Vendor Export Recipient Reference** — references Tenant-Company-owned recipient scope. Order Routing does not own recipient identity, validation, or role-mapping.

One state on Delivery Evidence:

- **Export Operational Review-Required State** — flag on Vendor Export Delivery Evidence indicating that human or system review is needed. Owned by Order Routing. PR-A defines the state and its lifecycle; downstream consumption (notification routing, summary aggregation) is deferred to the future Cross-Module Summary Email PR.

The chain of states from Schedule to consumed evidence is:

```
Vendor Export Schedule (configuration)
    └─ materializes ─> Vendor Export Window (concrete execution instance)
        └─ produces ─> Export Batch (existing Order Routing entity)
            └─ produces ─> Vendor Export Delivery Evidence (delivery record)
                └─ records ─> Vendor Export Delivery Attempt (per-attempt audit)
                └─ may set ─> Export Operational Review-Required State
                └─ consumed by ─> Fulfillment / Returns SLA evaluation (future)
                └─ consumed by ─> System Admin Activity Summary Emails (future Cross-Module PR)
```

Phase 1 reaffirmation: vendor self-service schedule editing is not enabled. CIXCI System Admin (holding Export Schedule Authority per `permissions.md`) is the only actor permitted to create or edit Schedules.

---

### Vendor Export Schedule

**Owning module:** Order Routing.

**Purpose:** Per-vendor configuration of when and how routed-suborder exports are produced and delivered. Reusable configuration; a single Schedule generates many Windows over time.

**Identity:**

- `vendor_export_schedule_id` — canonical platform-assigned identifier. Stable.
- `vendor_reference` — the vendor this Schedule applies to. Required; not editable after creation. Schedules do not move between vendors.
- `schedule_version` — monotonically increasing version number. Incremented on any field change. Edits to an active Schedule produce a new version; Windows materialized from the prior version are not retroactively rewritten.

**Timing configuration:**

- `timezone` — IANA timezone string (e.g., `America/New_York`). Required.
- `daily_send_times` — one or more local-time anchors per day (e.g., `["14:00", "18:00"]`). Required; at least one.
- `business_calendar_reference` — reference to a business calendar (Tenant Company-owned or future platform-owned). See PR-A OQ 1. Required for Schedules that elect non-default holiday / weekend behavior; otherwise optional with fallback to timezone-only behavior.
- `holiday_weekend_behavior` — one of (proposal-level): `skip_to_next_business_day`, `deliver_anyway`, `pause`. Default: `skip_to_next_business_day` when `business_calendar_reference` is present; `deliver_anyway` when absent.
- `same_day_cutoff_reference` — reference to a same-day cutoff time (used downstream by Fulfillment / Returns SLA evaluation; PR-A carries the reference without using it for SLA logic).
- `after_hours_handling_reference` — reference to after-hours cutoff behavior (used downstream by Fulfillment / Returns SLA evaluation; PR-A carries the reference without using it for SLA logic).

**Recipient and delivery configuration:**

- `recipient_references` — one or more Vendor Export Recipient References. Each reference resolves through Tenant Company.
- `delivery_method_reference` — Vendor Export Delivery Method Reference. References an Integration-Management-owned delivery method.
- `buyer_retailer_split_behavior` — one of (proposal-level): `no_split`, `split_by_buyer`, `split_by_retailer`. Default: `no_split`. The split, when enabled, produces multiple Export Batches per Window per the existing Order Routing split model.
- `manual_download_expiration_window` — applicable only when `delivery_method_reference` resolves to Manual Download. Number of business days the export remains available for download before the Delivery Evidence transitions to `unconfirmable`. Default deferred to platform configuration (PR-A OQ 7).

**Lifecycle states (proposal-level for PR-A):**

- `draft` — created by Export Schedule Authority; not yet active. No Windows are generated from a `draft` Schedule.
- `active` — in active use. Windows are generated per `daily_send_times` over a rolling horizon.
- `paused` — Window generation halted. Windows already in `scheduled` state at pause time are `superseded`. The Schedule may be resumed back to `active`.
- `retired` — terminal. No new Windows. Existing in-flight Windows complete their lifecycle but are not extended.

**Audit:**

- `created_at`, `created_by` — Export Schedule Authority actor.
- `updated_at`, `updated_by` (per version increment).
- `paused_at`, `paused_by`, `pause_reason_reference`.
- `retired_at`, `retired_by`, `retirement_reason_reference`.

**Relationships:**

- A Vendor Export Schedule belongs to exactly one vendor.
- A Vendor Export Schedule produces zero or more Vendor Export Windows over time.
- A Vendor Export Schedule references zero or more Vendor Export Recipient References.
- A Vendor Export Schedule references exactly one Vendor Export Delivery Method Reference at a time (delivery method may change across versions).

---

### Vendor Export Window

**Owning module:** Order Routing.

**Purpose:** The materialized execution instance derived from a Schedule. A Window represents a single concrete export run — one scheduled execution time, timezone-anchored, business-day-classified. Multiple Windows derive from one Schedule (e.g., a Schedule with two daily send times produces two Windows per business day).

**Identity:**

- `vendor_export_window_id` — canonical platform-assigned identifier. Stable.
- `vendor_export_schedule_reference` — the Schedule this Window was materialized from. Required; not editable.
- `vendor_export_schedule_version` — the Schedule version at materialization time. Required; immutable. Used to detect when a Window was materialized from a now-superseded Schedule version.

**Execution context:**

- `scheduled_execution_at` — concrete timestamp (UTC, resolved from Schedule's `timezone` + `daily_send_times` + business calendar reference). Required; immutable after Window enters `executing` state.
- `business_day_classification` — one of: `business_day`, `weekend`, `holiday`, `unknown_no_calendar`. Derived at materialization time from `business_calendar_reference`. Immutable.
- `cutoff_context` — captured cutoff and after-hours references at materialization time (used by future Fulfillment / Returns SLA evaluation; PR-A carries the snapshot without using it).

**Lifecycle states (proposal-level for PR-A):**

- `scheduled` — created, awaiting `scheduled_execution_at`. Default state.
- `executing` — Window is currently producing Export Batches (existing Order Routing flow handles batch production).
- `succeeded` — Window produced at least one Export Batch and completed export generation.
- `failed` — Window did not produce any Export Batch (e.g., no eligible routed suborders, content generation error). May still trigger Review-Required state on a placeholder Delivery Evidence if Schedule's anomaly detection is enabled.
- `superseded` — replaced by a newer Window (e.g., Schedule pause that invalidates an already-scheduled Window). Retained for audit.

**Transitions:**

- `scheduled → executing` — when `scheduled_execution_at` arrives and Schedule is `active`.
- `executing → succeeded` — when export generation completes with at least one Export Batch.
- `executing → failed` — when export generation produces no Export Batches.
- `scheduled → superseded` — when Schedule is paused, retired, or edited in a way that invalidates the Window.

A Window in `executing`, `succeeded`, or `failed` state is not editable. Re-runs require a new Window (typically via the existing re-export controls).

**Audit:**

- `created_at` (Window materialization timestamp).
- `state_transition_history` — append-only record of each transition (timestamp, prior state, new state, audit reference).

**Relationships:**

- A Vendor Export Window belongs to exactly one Vendor Export Schedule (one specific version).
- A Vendor Export Window produces zero or more Export Batches (existing Order Routing entity; relationship is one-to-many).
- A Vendor Export Window may have zero or more Vendor Export Delivery Evidences (one per Export Batch per Delivery Method per recipient batch, per the buyer/retailer split behavior).

---

### Vendor Export Delivery Evidence

**Owning module:** Order Routing.

**Purpose:** Authoritative record of what was delivered, when, to whom, by what method, with what confirmation. **This is the record Fulfillment / Returns SLA evaluation reads from in a future PR.** Delivery Evidence is created when Order Routing requests delivery via Integration Management; outcome is captured via Delivery Attempts.

**Identity:**

- `vendor_export_delivery_evidence_id` — canonical platform-assigned identifier. Stable.
- `vendor_export_window_reference` — the Window that produced the export. Required; not editable.
- `export_batch_reference` — the specific Export Batch this Delivery Evidence covers. Required. (A Window may produce multiple Export Batches if buyer/retailer split is enabled; each Batch produces its own Delivery Evidence.)

**Delivery target:**

- `delivery_method_reference` — Vendor Export Delivery Method Reference at delivery time.
- `recipient_references` — one or more Vendor Export Recipient References this Delivery Evidence is delivered to. May be a subset of the Schedule's recipients if some recipients are invalid at delivery time.

**Timing:**

- `export_generated_timestamp` — when export content was produced (typically aligns with Window `succeeded` transition).
- `export_delivered_timestamp` — when delivery was confirmed. Null while `delivery_confirmation_state = pending` or `failed`. Required for Fulfillment / Returns SLA evaluation.

**State fields:**

- `delivery_confirmation_state` — one of (proposal-level):
  - `pending` — Delivery Evidence created; awaiting outcome. Default.
  - `confirmed` — at least one Delivery Attempt succeeded; `export_delivered_timestamp` populated.
  - `failed` — Integration Management reports retries exhausted; no successful Attempt. `export_delivered_timestamp` null.
  - `partial` — multiple recipients; some succeeded, some failed. `export_delivered_timestamp` populated to the timestamp of the first successful Attempt.
  - `unconfirmable` — Manual Download expiration window elapsed without a download; Delivery Evidence cannot determine delivery state. `export_delivered_timestamp` null.

- `export_review_required_state` — one of (proposal-level):
  - `not_required` — default. No review needed.
  - `review_required` — set when `delivery_confirmation_state` reaches `failed` or `unconfirmable`, when retries are exhausted, when recipient bounces are detected, or when other anomalies are detected per Workflow 6.
  - `under_review` — set by Export Schedule Authority actor when review begins.
  - `resolved` — set by Export Schedule Authority actor when review concludes. Resolution may include explicit re-export via the existing re-export controls, audit-evidenced acceptance without re-export, or other resolution paths per Workflow 6.

**Boundary preservation:**

- Delivery Evidence does not assert fulfillment SLA state. Fulfillment / Returns SLA evaluation reads `export_delivered_timestamp` and `delivery_confirmation_state` to compute deadlines; PR-A does not compute deadlines.
- Delivery Evidence does not assert shipment, tracking, or delivery-of-physical-goods status. Those are Fulfillment / Returns concerns.
- **Delivery Evidence asserts delivery only, not operational acceptance.** A `delivery_confirmation_state = confirmed` means **only** that delivery evidence was successfully confirmed for the configured Delivery Method. It does **not** mean: the vendor acknowledged the export, the vendor opened the export, the vendor processed the export, the vendor accepted operational responsibility, or fulfillment execution was accepted. Concretely:
  - Email delivered does not imply email opened.
  - SFTP push confirmed does not imply file consumption.
  - Manual download does not imply operational acceptance.
  - API push confirmed does not imply vendor system processed the payload.
  Operational acceptance and fulfillment execution acceptance remain Fulfillment / Returns territory and the Boundary/Handoff PR's join-point contract. PR-A's Delivery Evidence captures the transport-layer fact only.
- Delivery Evidence does not embed raw export content; it references the Export Batch.
- Once `delivery_confirmation_state` is terminal (`confirmed`, `failed`, `partial`, `unconfirmable`), the Delivery Evidence is not mutated. Re-export produces a new Delivery Evidence (typically a new Window and a new Export Batch, depending on re-export semantics).

**Audit:**

- `created_at`, `created_by` (system-actor at delivery request time).
- `state_transition_history` — append-only record of `delivery_confirmation_state` and `export_review_required_state` transitions, each with timestamp, prior state, new state, audit reference, and reason reference where applicable.
- `audit_reference` — pointer to immutable Logs & Audit record.

**Relationships:**

- A Vendor Export Delivery Evidence belongs to exactly one Vendor Export Window.
- A Vendor Export Delivery Evidence belongs to exactly one Export Batch.
- A Vendor Export Delivery Evidence has zero or more Vendor Export Delivery Attempts.
- A Vendor Export Delivery Evidence is consumed read-only by Fulfillment / Returns (future PR), Logs & Audit, and Analytics / Reporting (future Cross-Module PR).

---

### Vendor Export Delivery Attempt

**Owning module:** Order Routing.

**Purpose:** Per-attempt audit record under Delivery Evidence. Each Attempt captures one delivery attempt's outcome as reported by Integration Management. Multiple Attempts may exist under one Delivery Evidence if retries occur. The latest Attempt's outcome typically drives the parent Delivery Evidence's `delivery_confirmation_state`.

**Identity:**

- `vendor_export_delivery_attempt_id` — canonical platform-assigned identifier. Stable.
- `vendor_export_delivery_evidence_reference` — the parent Delivery Evidence. Required; not editable.
- `attempt_sequence` — ordinal sequence number within the parent (1, 2, 3, ...). Stable.

**Attempt content:**

- `attempt_timestamp` — when the attempt was initiated.
- `attempt_outcome` — one of (proposal-level):
  - `success` — delivery confirmed by Integration Management.
  - `transport_failure` — transport-layer error (SMTP rejection, SFTP failure, API failure).
  - `recipient_bounce` — recipient address invalid or rejected.
  - `timeout` — no acknowledgement within Integration-Management-defined timeout.
  - `aborted` — attempt cancelled by Order Routing (e.g., Schedule retired mid-attempt).
- `transport_evidence_reference` — reference to Integration-Management-owned transport-layer evidence (delivery receipt, bounce notice, SFTP log entry). Required for non-`aborted` outcomes.
- `retry_after_reference` — optional. When this attempt was followed by a subsequent retry attempt, points to the next attempt. Used to trace retry chains.

**Audit:**

- `created_at` (attempt timestamp).
- `audit_reference` — pointer to immutable Logs & Audit record.

**Relationships:**

- A Vendor Export Delivery Attempt belongs to exactly one Vendor Export Delivery Evidence.
- A Vendor Export Delivery Attempt references exactly one Integration-Management-owned transport evidence record (except for `aborted` outcomes).
- A Vendor Export Delivery Attempt may reference one subsequent Attempt via `retry_after_reference`.

**Boundary preservation:**

- Order Routing captures Attempt *outcomes*. Retry policy (when to retry, how many times, with what delay) is Integration Management's. The existence and timing of retries is recorded as new Attempts; the retry policy itself is not specified by PR-A.
- A `success` Attempt records its `transport_evidence_reference`; Order Routing does not validate the transport evidence content (Integration Management owns transport semantics).

---

### Vendor Export Delivery Method Reference (concept-only)

**Status in PR-A:** Reference field, not an Order-Routing-owned entity.

**Owner referenced:** Integration Management.

**Purpose:** Identifies which delivery method (Scheduled Email with CSV attachment, Scheduled Email with file reference, SFTP push, API push, Manual Download) is used for a Schedule and recorded on each Delivery Evidence. Integration Management owns delivery method definitions; Order Routing carries the reference for context.

**Boundary:**

- Order Routing must not enumerate transport-protocol details in `data-model.md`.
- Order Routing must not own retry semantics tied to the method.
- Order Routing references the method by Integration-Management-owned identifier.

---

### Vendor Export Recipient Reference (concept-only)

**Status in PR-A:** Reference field, not an Order-Routing-owned entity.

**Owner referenced:** Tenant Company.

**Purpose:** Identifies recipients of vendor exports (typically contact/role references within a vendor's tenant scope). Tenant Company owns recipient identity, validation, role-mapping, and scope. Order Routing carries references on Schedules and Delivery Evidences for context.

**Boundary:**

- Order Routing must not validate recipient identity inside the module.
- Order Routing must not carry recipient PII directly; references resolve through Tenant Company.
- Recipient lifecycle (added, deactivated, role changed) is Tenant Company's responsibility; Schedule references may reflect stale recipient state until reconciled by Schedule edit.
