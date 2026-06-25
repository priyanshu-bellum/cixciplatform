# Product Catalog Edge Cases

This document captures proposal-level edge cases for Product Catalog hardening.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery and buyer selection edge cases.

## Vendor Authority And Source Facts

- Vendor submits accessory facts that conflict with Product Catalog-governed identifiers or prior accepted records.
- Vendor attempts to overwrite locked fields or cross-module-owned fields through import.
- Vendor-provided lifecycle, availability, pricing input, media suggestion, or compatibility data lacks source/version evidence.
- Vendor SKU is reused after a prior product was exported, ordered, returned, invoiced, or audited.

## Lifecycle / Availability / Release / Launch

- Product is Active but Out of Stock.
- Product is Inactive but has reached Release Date and should be visible for eligible buyer review.
- Product reaches Launch Date but pricing readiness, media readiness, compatibility, or review state is blocked.
- Launch / Event Management indicates a launch date that conflicts with Product Catalog facts.
- Product is End of Life without EOL Date.
- EOL Date is reached but sell-through policy conflicts with buyer selling state or availability.
- Product is Archived but still referenced by orders, returns, invoices, exports, reports, or audit records.
- Availability input indicates Back in Stock for an Archived or End of Life product.
- Low Stock threshold is missing, stale, vendor-specific, or disputed.

## Color And Variant Handling

- Vendor supplies comma-separated colors that need structured values.
- Vendor Color maps ambiguously to normalized System Color.
- Multi-color product should appear under several buyer filters.
- Color, image, SKU, UPC, price input, availability, material, packaging, model, or compatibility differs and requires variant-level records.
- Variant image mapping evidence from Media conflicts with Product Catalog attachment rules.

## Compatibility

- Compatibility import omits mode and should default to Add.
- Replace mode would remove many existing mappings and requires preview/confirmation.
- Selective Remove references a mapping that does not exist.
- Compatibility import references missing, stale, superseded, ambiguous, or retired Device References.
- Buyer device portfolio changes make an accessory newly visible or no longer relevant.
- Product Catalog compatibility conflicts with vendor assertion, CIXCI review, Device Catalog changes, or buyer-specific constraints.

## Accessory Discovery / Export Confirmation

- Buyer has no active My Devices portfolio entries and must see the empty state.
- Device selected from My Devices is inactive, removed, superseded, or no longer in the buyer's portfolio.
- Device filter pre-selection yields no compatible accessories.
- Buyer removes or expands pre-selected Device filter and combined filters must recalculate without mutating My Devices.
- Search matches SKU/UPC but product is no longer buyer-visible, compatible, or channel-eligible.
- Accessory was already exported by this buyer but not another buyer.
- Accessory was exported by another buyer but not this buyer.
- Accessory becomes EOL, Out of Stock, On Sale, review-required, no longer compatible, no longer channel-eligible, no longer buyer-visible, or no longer buyer-eligible after selection but before confirmation.
- Confirmation line recheck detects stale, missing, conflicting, superseded, or ignored source evidence.
- One selected accessory blocks while other selected accessories remain eligible.
- Buyer cancels confirmation and returns without losing the selection set.
- Product Catalog export applies locally but Integration delivery remains pending or fails.
- Product Catalog export apply fails and buyer relationship state must not advance to Accessory Added / Selling.
- Latest Accessories baseline is missing, failed, partial, revoked, superseded, restricted-scope, or skipped.
- System Admin buyer context view is attempted without act-on-behalf permission for mutating action.

## Buyer Visibility / Buyer Selling Status

- Buyer is eligible by Product Catalog visibility but not by Tenant Company relationship or channel scope.
- Buyer has never exported products, so Latest Accessories filter must be disabled or unavailable.
- Last successful export timestamp is stale, superseded, failed, or not backed by applicable export baseline evidence.
- Buyer selects Stop Selling for an active/in-stock product.
- Buyer Selling Status conflicts with EOL sell-through behavior.
- Buyer Selling Status changes after buyer system integration delivery fails.
- Parent and child entities have different buyer product relationship states.

## Accessory Details Actions

- Buyer sees Create PO action but Procurement is disabled for that buyer.
- Buyer can view product but lacks permission to view Pricing-provided price/snapshot reference.
- Buyer can view media but Media access policy or URL state blocks download.
- Buyer can export product but integration delivery is disabled or degraded.

## Import / Export

- CSV import has valid product rows but invalid compatibility rows.
- Update-only import row matches zero or multiple products.
- Blank field would clear existing availability, lifecycle, color, or compatibility unless explicit clear mode is selected.
- UPC/SKU is interpreted as a number or scientific notation by a spreadsheet tool.
- Import preview becomes stale because Product Catalog source records changed before confirmation.
- Compatibility Replace import is attempted without destructive action permission.
- Export succeeds but buyer system delivery fails in Integration Management.
- Export confirmation line is blocked and must not appear as exported or advance baseline.

## Notifications / Integration / Audit

- Product Catalog emits notification-triggering event but Notification delivery is suppressed, delayed, or failed.
- Product Catalog emits update/export signal but Integration Management records provider outage or retry exhaustion.
- Logs & Audit records file evidence but Product Catalog apply fails.
- Event replay duplicates buyer export/download, confirmation-line application, baseline advancement, or Buyer Selling Status events if idempotency is missing.

## AI Signals

- AI detects repeated validation errors but lacks permission/action contract to correct product records.
- AI suggests compatibility changes that require Product Catalog review and Device Reference validation.
- AI identifies image quality issue that must be handled by Media and Product Catalog attachment review.
- AI recommends promotion timing but Launch / Event Management and Pricing boundaries must be preserved.

## Buyer Product Export Job Foundation Edge Cases

This section documents edge cases for the Buyer Product Export Job Foundation. All existing Product Catalog edge cases are preserved without modification. Each edge case identifies the risk, the documented mitigation, and any open business decision retained.

### Boundary wording reaffirmed (operationalized in EC-13, EC-14, EC-15)

`Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.`

---

### EC-1 - Large export overloads Product Catalog

**Risk:** A buyer selects all vendor products (thousands) and Product Catalog attempts to push every product synchronously.

**Mitigation:** Job + Batch + Selection Snapshot + named throttle policies (Job Item Limit Policy, Batch Size Policy, System Export Queue Policy). All exports create a Job; exports above threshold are asynchronous; backpressure queues / throttles rather than synchronously fanning out.

### EC-2 - 100 buyers exporting all vendor products simultaneously

**Risk:** Concurrent bulk exports overload Product Catalog, Integration Management, buyer APIs, downstream systems.

**Mitigation:** Buyer Export Concurrency Policy + Tenant / Company Export Concurrency Policy + Vendor Fairness Throttle Policy + System Export Queue Policy + Integration Dispatch Rate Policy. Multiple named policies layer to prevent any single vector of overload.

### EC-3 - Duplicate export jobs

**Risk:** Buyer clicks Add Accessory twice rapidly; system creates two identical Jobs.

**Mitigation:** Duplicate / Idempotency Policy + idempotency_key on Job. Workflow 1 checks idempotency key against in-flight / recently-completed Jobs; on match, returns existing Job reference.

### EC-4 - Buyer exports products they are no longer eligible to see

**Risk:** Eligibility evidence becomes stale between page load and Job creation; buyer's selection includes products that are no longer buyer-visible.

**Mitigation:** Workflow 3 (Export Eligibility Validation) re-evaluates each Item against current eligibility evidence at job-validation time. Items failing checks transition to terminal `ineligible` with reason populated.

### EC-5 - Product eligibility changes mid-export

**Risk:** Product becomes ineligible after Selection Snapshot but before Items finish processing (e.g., product moves to End of Life).

**Mitigation:** Snapshot semantics: post-snapshot changes do NOT mutate the Job unless explicitly regenerated / retried. Items continue with snapshotted `product_source_version_reference`. Re-evaluation occurs only on explicit retry / reprocess (which creates a new Job).

### EC-6 - Export succeeds for some items and fails for others

**Risk:** Partial success creates ambiguity about Job-level outcome and per-Item state.

**Mitigation:** Item-level statuses + Job terminal `completed_with_errors`. Each Item has its own terminal status. Result Summary preserves per-Item counts. Workflow 11 applies per-Item: only `activated` Items drive Accessory Added; failed / ineligible / skipped / canceled Items do not.

### EC-7 - Buyer thinks queued equals completed

**Risk:** Buyer sees their selection accepted and assumes activation occurred.

**Mitigation:** Status taxonomy + buyer-facing status discipline. `queued`, `pending`, `processing`, `dispatch_pending`, `exported`, `activation_pending` all carry buyer-facing progress feedback ("Pending", "Adding...", etc.) but do NOT transition the Add Accessory UI to Accessory Added. Only `item.activated` drives Accessory Added.

### EC-8 - Add Accessory becomes Accessory Added too early

**Risk:** UI or workflow logic advances Accessory Added on a non-terminal or non-`activated` Item status.

**Mitigation:** Canonical rule in `accessory-discovery-selection.md`. Only Item status `activated` drives Accessory Added. Workflow 11 strictly enforces this; no other status triggers the transition.

### EC-9 - Bulk job marks all products added even when some items failed

**Risk:** Job `completed_with_errors` is treated as Job `completed`, leading to incorrect blanket Accessory Added.

**Mitigation:** Workflow 12 preserves per-Item terminal differences. Result Summary records per-Item counts by status. Workflow 11 applies per-Item: only `activated` Items drive Accessory Added.

### EC-10 - Gray-out behavior happens too early

**Risk:** UI grays out Add Accessory at Job creation rather than per-Item activation.

**Mitigation:** Canonical rule + Workflow 11. Gray-out is a UI representation of Accessory Added, which only advances on `item.activated`. The canonical rule explicitly lists pending / queued / processing as NOT final activation.

### EC-11 - One buyer's export incorrectly grays out another buyer's Add Accessory button

**Risk:** Cross-buyer state leakage; Buyer 2's Add Accessory UI is incorrectly affected by Buyer 1's export activity.

**Mitigation:** Buyer-scope triad on every activation / catalog mapping record (REQUIRED at data-model level). Cross-buyer reads / mutations are architecturally impossible because the mapping is keyed on the triad. There is no cross-buyer key.

### EC-12 - One buyer's activation incorrectly creates global activation state

**Risk:** Activation logic creates a global activation record instead of a buyer-scoped record.

**Mitigation:** Workflow 10 REQUIRES buyer-scope triad on every activation / catalog mapping record. No code path can create activation without the triad. Selection Snapshot is also buyer-scoped and does NOT create global or cross-buyer activation state.

### EC-13 - Integration Management transport failure confused with Product Catalog eligibility failure

**Risk:** A dispatch failure reference from Integration Management is misinterpreted as an eligibility issue, or vice versa.

**Mitigation:** Buyer Product Export Error sub-structure classifies `error_kind` distinctly: `eligibility` (Product Catalog rules), `dispatch` (Integration Management reference indicates failure; Product Catalog records consequent Item failure), `integration_transport` (transport-level Integration Management failure surfaced via dispatch reference), `item_validation` (Product Catalog validation), `buyer_authority` (Tenant Company denial), `system` (platform-level). **Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.** The two are distinct error classes.

### EC-14 - Product Catalog cannot record failed Item after dispatch failure reference

**Risk:** Boundary wording is misread as preventing Product Catalog from recording an Item failure when Integration Management surfaces a transport failure.

**Mitigation:** The canonical boundary wording explicitly grants Product Catalog the authority: **"Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes."** Product Catalog OWNS the consequent Item-status decision; Integration Management OWNS the transport outcome itself. These are complementary, not conflicting.

### EC-15 - Buyer catalog mapping gets created before successful item export

**Risk:** Mapping record is created at Job creation or earlier rather than after Item terminal `activated`.

**Mitigation:** Workflow 10 (Product Activation / Buyer Catalog Mapping Update) is triggered ONLY on Item terminal `activated`. No other Item status triggers mapping creation. Queued / pending / processing / dispatch_pending / activation_pending Items do NOT create mappings.

### EC-16 - API-only export has no File Tracking artifact but still needs evidence

**Risk:** API-only Jobs lack a file artifact; subscribers expecting `file.generated` may silently misbehave.

**Mitigation:** `product-catalog.buyer-product-export-file.generated` is emitted ONLY when a file artifact exists. Subscribers MUST handle the absence of this event for API-only Jobs. Evidence emission via `service_identity.evidence_emit` is independent of file artifact existence; evidence records are emitted for every Job / Item / Batch transition regardless of `export_method`.

### EC-17 - File export generated but not downloaded

**Risk:** File artifact is generated but the buyer never downloads it; is the export considered activated?

**Mitigation:** Default policy: generated-but-not-downloaded file does NOT automatically equal activation. Open business decision: tenant policy may override when the export mode explicitly defines file generation as successful delivery. Activation flows through Workflow 7 / 9 / 10 per Item; file generation alone is not sufficient.

### EC-18 - Export file contains stale data

**Risk:** File generated at job-completion time contains data that has since changed in the catalog.

**Mitigation:** Snapshot semantics + `product_source_version_reference` on each Item. The file reflects the snapshotted product source versions at job creation, not current catalog state. This is documented behavior; tenant policy may dictate refresh-via-retry / reprocess workflows.

### EC-19 - Export sends global compatibility instead of buyer-scoped compatibility

**Risk:** Compatibility payload is exported with global compatibility data rather than buyer-scoped compatibility.

**Mitigation:** Boundary contracts explicitly forbid global compatibility export by default. Until Buyer-Scoped Compatibility Projection PR locks the projection, compatibility export is bounded by existing Product Catalog / Device Catalog rules and marked deferred / limited. Selection Snapshot reserves `compatibility_projection_reference_at_snapshot` for the future PR.

### EC-20 - Retry sends duplicate products to buyer internal system

**Risk:** Retry Job re-sends Items the buyer's internal system already accepted.

**Mitigation:** Duplicate / Idempotency Policy + Integration Management transport-level idempotency where supported. Retry Jobs reference `prior_job_reference` and typically filter to prior Job's failed Items. Buyer-side idempotency is the buyer-internal-system's concern; Product Catalog supplies idempotency keys and references for de-duplication.

### EC-21 - Throttling blocks urgent small exports behind huge jobs

**Risk:** A small Add Accessory click is queued behind a 10000-item bulk export and never completes in reasonable time.

**Mitigation:** Small-Job Fairness / Queue Priority Policy. Architecturally locked by name in this PR; concrete fairness algorithm is implementation.

### EC-22 - Notification spam during bulk job progress

**Risk:** Per-Item or per-Batch notifications overwhelm the buyer's inbox / channel during bulk processing.

**Mitigation:** Workflow 16 emits notification intent at appropriate lifecycle events; Notification Platform owns delivery + suppression + digest rules. Concrete digest rules are future Notification Platform coordination. Open business decision: notification frequency for bulk job progress.

### EC-23 - Audit / evidence gaps

**Risk:** Job / Item / Batch state transitions occur without corresponding Logs & Audit Evidence Records.

**Mitigation:** Workflow 15 (Export Evidence Recording) emits Evidence Records via `service_identity.evidence_emit` for every Job / Item / Batch transition. Evidence kinds: `buyer_product_export_item`, `buyer_product_export_batch`, `buyer_product_export_baseline`. Logs & Audit indexes per existing PR-A discipline.

### EC-24 - Failed item export incorrectly disables Add Accessory

**Risk:** Failed Item is treated as terminal activation and Accessory Added is incorrectly advanced.

**Mitigation:** Workflow 11 explicitly: ONLY `item.activated` drives Accessory Added. Failed / ineligible / skipped / canceled Items leave Add Accessory actionable / retryable for that buyer.

### EC-25 - Selection Snapshot timing race

**Risk:** Snapshot is created milliseconds after a product becomes ineligible; the Snapshot includes a now-ineligible product.

**Mitigation:** Workflow 3 (Export Eligibility Validation) re-evaluates each Item against current eligibility evidence at validation time. Items failing checks transition to terminal `ineligible` even if snapshotted as eligible. Snapshot captures the eligibility decision basis; validation re-confirms.

### EC-26 - Capability propagation latency mid-Job

**Risk:** A buyer's authority is revoked mid-Job; Items dispatch after revocation.

**Mitigation:** Existing PR #103 Workflow 12 discipline (active session / saved search authority recheck) applies. `check_access` re-evaluates current capability assignment at the next call. Implementations MAY proactively invalidate in-flight Jobs on revocation; not required.

### EC-27 - Service identity expiration mid-Job

**Risk:** A service identity's credentials expire during processing of a Job it initiated.

**Mitigation:** Existing Tenant Company baseline + PR #103 service identity expiration discipline. `check_access` returns `decision = deny` with `reason_code = capability_expired` on subsequent calls. Implementation handles in-flight Items per Retry Budget / cancellation rules.

### EC-28 - Re-parenting effects on in-flight Jobs (deferred)

**Risk:** Buyer entity is re-parented to a different parent tenant during an in-flight Job; downstream evidence references may need updating.

**Mitigation (architectural):** In-flight Jobs inherit scope as of snapshot start (snapshot semantics). Items re-evaluate authority at next access per existing capability propagation discipline. Re-parenting effects on long-lived references are an open business decision per PR #103 OQ-PC-2; deferred / future phase. Concrete handling is implementation.

### EC-29 - Concurrent retry collisions

**Risk:** Two concurrent retry attempts for the same failed Item produce inconsistent state.

**Mitigation:** Idempotency on retry attempts per Duplicate / Idempotency Policy. `retry_attempt_count` is monotonic; concurrent attempts are de-duplicated.

### EC-30 - Cancel-after-processing edge case

**Risk:** Buyer cancels mid-bulk-job after some Items have already reached terminal `activated`; what happens to already-activated Items?

**Mitigation:** Already-activated Items remain terminal; the activation is final per Workflow 11. In-flight Items at non-terminal statuses transition to `canceled`. The Job's terminal status is `canceled`, but Result Summary preserves per-Item terminal differences. Open business decision: whether activated Items should be reversed on cancellation (default NO; tenant policy may define reversal flow as Stop Selling-type operation).

### EC-31 - File reference in non-existent Logs & Audit File Tracking record

**Risk:** Product Catalog records a `buyer_product_export_file_reference` to a Logs & Audit File Tracking record that does not yet exist (or has been purged / redacted).

**Mitigation:** Workflow 8 records the reference only after Logs & Audit File Tracking creation succeeds. Logs & Audit retention / redaction / legal hold rules (per PR-D) govern artifact lifecycle; if the artifact is purged, the reference may become a tombstone reference per existing PR-D discipline.

### EC-32 - Discriminator value drift between Product Catalog and consumers

**Risk:** New discriminator values added to status-changed events are not consumed by subscribers.

**Mitigation:** Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility per existing baseline). Discriminator catalogs in `event-contracts.md` are extensible per existing schema-version discipline.

### EC-33 - admin_on_behalf without explicit buyer consent

**Risk:** Admin initiates `admin_on_behalf` Job for a buyer who has not explicitly consented to admin acting on their behalf.

**Mitigation:** `admin_on_behalf` REQUIRES Tenant Company act-on-behalf authority per existing baseline. Open business decision: whether explicit buyer consent is required IN ADDITION to act-on-behalf authority. Default: tenant policy controlled; default NO additional consent required if act-on-behalf authority exists.

### EC-34 - System Admin self-initiating exports

**Risk:** System Admin initiates exports without explicit buyer consent.

**Mitigation:** Open business decision per PR #103 self-approval discipline. Default NO; tenant policy may override; override is logged via existing PR #103 `tenant.exception-admin-exception-changed` event with `exception_kind = cixci_system_admin_override` discriminator.

### EC-35 - Reused Buyer Product Export Record across Jobs

**Risk:** A buyer re-exports the same accessory; Workflow 9 / 10 creates a new Buyer Product Export Record per existing baseline rules, but the buyer activation / catalog mapping is updated rather than duplicated.

**Mitigation:** Existing Buyer Product Export Record is the per-buyer-per-product completed-export record; per existing baseline, multiple Buyer Product Export Records may exist for the same product per buyer (representing each completed export instance). Buyer-scoped activation / catalog mapping is updated (latest reference); Workflow 10 handles upsert semantics. The existing Latest Accessories baseline rules govern which Buyer Product Export Record drives baseline advancement.

---

### Edge case summary

This section documents 35 edge cases (EC-1 through EC-35) covering overload, concurrency, eligibility drift, partial success, cross-buyer leakage, premature gray-out, Integration Management boundary preservation, file artifact handling, compatibility export, retry / cancellation, audit / evidence emission, capability propagation, re-parenting (deferred), discriminator drift, admin-on-behalf consent, and existing baseline reuse.

### Edge case discipline

- All edge cases reference existing PR-A through PR-E + PR #103 + existing Product Catalog baseline mitigations where applicable.
- All edge cases respect the boundary wording: Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.
- No edge case introduces new entities, events, workflows, or capabilities beyond those documented in this PR.
- Concrete handling (UI, anomaly detection, propagation latency, idempotency caches, retry policies, fairness algorithms) is implementation-level.
- Deferred items (re-parenting effects, deeper compatibility projection, My Devices sync) are explicitly marked as deferred and tracked in `assumptions-open-questions.md`.

## Buyer-Scoped Compatibility Projection Edge Cases

This section documents Product Catalog edge cases for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Device Catalog side has matching edge cases in `modules/device-catalog/edge-cases.md`. All existing Product Catalog baseline edge cases (PR #104 and earlier) are preserved without modification.

### Empty My Devices state

- Buyer with zero active devices: VALID projection at `projection_status = current` with empty `compatible_accessory_references`. Accessory List shows empty state; PR #104 Job creation allowed (zero Items). Not an error.

### Single-device portfolio

- Buyer with exactly one device: projection contains only accessories compatible with that single device. Removing the only device transitions all activated accessories to impact records reflecting the change.

### Bulk portfolio import

- Many devices changed at once: Device Catalog records ONE Buyer Device Portfolio Change Record at `change_type = bulk_portfolio_import`. Product Catalog Workflow 4 runs ONCE per resulting snapshot (NOT per device). Per-accessory `visibility.changed` events emitted per affected accessory; implementation MAY batch.

### Bulk portfolio import with conflicting changes

- Bulk import contains both adds and removes for the same accessory's compatibility surface: net effect computed against the resulting snapshot. Impact records reflect NET state, not intermediate states.

### Concurrent My Devices changes from multiple actors

- Buyer adds a device; admin-on-behalf removes a different device concurrently. Device Catalog applies each change in order (existing baseline concurrency); two Buyer Device Portfolio Change Records produced; Product Catalog Workflow 4 may dedupe to one recalculation per resulting snapshot.

### Projection recalculation overlapping with Job creation

- Job creation initiates Selection Snapshot binding (Workflow 9) while projection is `recalculating`. Implementation policy: either (a) wait for `current`, or (b) bind the prior `current` projection (the last-known-good). Default architectural intent: bind the LATEST `current` projection (the prior version remains valid until superseded). Concrete policy: implementation owns.

### Projection recalculation failure during Job creation

- Workflow 4 transitions to `failed` while a Job is being created. Job creation MAY proceed against the prior `current` projection (last-known-good). If no prior `current` exists (first-time buyer): Job creation MAY be deferred with appropriate UI signal (future UX). Architectural fallback: prefer last-known-good over blocking.

### Stale projection consumed by export

- A `stale` projection is bound to a Selection Snapshot. The Job continues normally per Workflow 10's snapshot-immutability rule. The `stale` flag on the projection version is recorded; consumers (UI) MAY warn the buyer that the projection used was stale at Job creation.

### Compatibility mapping change after Selection Snapshot binding

- Vendor updates compatibility mapping after Job creation. Job continues against the bound projection (which references the OLD mapping version via `source_compatibility_mapping_version_reference`). Mapping change triggers a NEW projection version; new Jobs use the new projection.

### Vendor compatibility mapping correction (revokes prior compatibility)

- Vendor corrects a prior compatibility claim (e.g., accessory A was incorrectly listed as compatible with device D; vendor revokes). Workflow 4 recalculates; buyers with device D and activated accessory A receive impact records at `impact_state = no_longer_compatible` or `review_required`. No auto Stop Selling.

### Vendor compatibility mapping expansion

- Vendor expands compatibility (e.g., accessory A now compatible with device D). Workflow 4 recalculates; buyers with device D may receive `visibility_status = now_visible` events for accessory A; already-Selling buyers with accessory A receive `impact_state = compatibility_expanded` impact records.

### Buyer activates accessory then removes only compatible device

- PR #104 Workflow 4 (Item-Level Activation Application) sets buyer-specific Accessory Added based on terminal `activated` Items. Buyer subsequently removes the only compatible device.
- Accessory Added state PRESERVED (per PR #104 canonical rule).
- Impact record at `impact_state = no_longer_compatible` produced.
- Buyer can still see the accessory in their portfolio / review view (data-level signal); accessory does NOT appear in active addable list.
- Selling state preserved; impact record carries `recommended_buyer_action = stop_selling_recommended` if buyer is Selling.

### Buyer re-adds previously removed compatible device

- Buyer removed device; accessory A had `impact_state = no_longer_compatible`. Buyer re-adds the device. Workflow 4 recalculates; impact record at `impact_state = compatibility_restored` produced; visibility transitions to `now_visible`; Add Accessory becomes available again. Existing Accessory Added / Selling state preserved (if previously activated).

### Selling accessory survives all device removals

- Buyer activates and Sells accessory A; removes all compatible devices. Impact record produced; Selling state preserved; UI surface MAY show warning indicator. Orders / returns / invoices for accessory A continue under existing baseline rules; NOT mutated by compatibility changes.

### Order in-flight when device removed

- Buyer places an order for accessory A; subsequently removes the only compatible device. Order continues under existing baseline rules. Order / return / invoice records NOT mutated by compatibility changes.

### In-flight export Job during My Devices change

- PR #104 Workflow 10 fully covered above: in-flight Job continues against bound snapshot. Items in flight evaluate against the bound projection, not the new projection. Buyer MAY initiate retry / reprocess to create a NEW Job using the new projection.

### Selection Snapshot bound to projection that subsequently transitions to `superseded`

- Job created; projection at `current` at Job creation; later, a portfolio change supersedes the projection. The Job's bound `compatibility_projection_reference_at_snapshot` is NOT updated. The Job's Items evaluate against the bound (now `superseded`) projection. PR #104 snapshot immutability holds.

### Selection Snapshot bound to projection that subsequently transitions to `failed`

- Job created against last-known-good `current` projection; subsequent recalculation fails. Job continues against the bound projection. Failure of the new recalculation does NOT affect the Job's bound projection.

### Recalculation interrupted (process restart)

- Projection at `recalculating`; process restarts. Implementation owns recovery: either (a) resume with idempotency cache, or (b) re-run from scratch. Architectural intent: idempotent retry per existing baseline.

### Idempotency key collision

- Same recalculation request submitted twice with same triggering portfolio change reference: returns existing recalculation; no duplicate projection created.

### Recalculation request after `failed` projection

- Projection at `failed`; new portfolio change arrives. Workflow 4 re-runs. On success: new projection at `current` supersedes the `failed` one (which transitions to `superseded`).

### Many-buyer simultaneous portfolio changes (storm)

- Hundreds of buyers add devices simultaneously (e.g., vendor pushes new device support, integration syncs). Each buyer's recalculation is independent (buyer-scope triad). Implementation owns concurrency / throttling per existing PR #104 named-policy pattern (architectural; concrete numerics not locked).

### High-volume per-accessory visibility events

- Bulk portfolio change for a buyer with thousands of compatible accessories: per-accessory `visibility.changed` events may be batched per implementation. Subscribers MUST handle batched events gracefully.

### High-volume impact record creation

- Bulk portfolio change affecting many activated accessories: per-accessory impact records created. Implementation MAY batch impact-record creation; per-record evidence still emitted per PR-A discipline.

### Admin-on-behalf change with disputed authority

- Admin attempts a portfolio change on behalf of buyer; Tenant Company `check_access` denies (e.g., admin lacks act-on-behalf authority for this buyer). Change does NOT proceed; no Buyer Device Portfolio Change Record created; no projection recalculation; existing baseline failure handling.

### Service identity recalculation lacking scope

- Service identity attempts to trigger recalculation outside its registered scope: `check_access` denies via existing Tenant API integration user authority discipline.

### Expired service identity credentials

- Service identity recalculation attempts to refresh projection after credential expiration: denied per existing baseline; recalculation does not proceed.

### `audit_export.*` capability presence (out of band)

- Even if a buyer or admin has been granted `audit_export.*` capabilities (e.g., for PR-E Audit Report Export Records), this PR's projection / impact / compatibility actions do NOT consult `audit_export.*` and do NOT confer compatibility-related privilege. Boundary preserved per `boundary-contracts.md`.

### System Admin Buyer Context projection view

- Admin in System Admin Buyer Context for buyer B sees buyer B's projection. Admin attempting to view buyer C's projection while in buyer B's context: NOT allowed (buyer-scope triad enforced). Admin must explicitly switch context to buyer C.

### `current_compatibility_impact_state` drift

- Multiple impact records exist for the same accessory (over time, as portfolio changes accumulate). `current_compatibility_impact_state` always reflects the LATEST impact record (via `latest_buyer_accessory_compatibility_impact_record_reference`). Older impact records remain as historical evidence.

### Acknowledged impact record subsequently re-triggered

- Buyer acknowledges impact record at `impact_state = no_longer_compatible`. Subsequent portfolio change restores compatibility. NEW impact record at `impact_state = compatibility_restored` produced; the acknowledged record remains acknowledged (not re-opened); `current_compatibility_impact_state` reflects the new record.

### Empty `compatible_accessory_references` with existing activations

- Buyer with no active devices but with previously activated accessories: projection `current` with empty `compatible_accessory_references`; impact records produced for all previously-Selling / Accessory Added accessories at appropriate `impact_state`.

### Generated export file references superseded projection

- File generated for Job J at time T; projection in effect at T subsequently `superseded`. File still references the original `compatibility_projection_reference_at_snapshot`. File traceability preserved; consumer can reconstruct the projection state used.

### Failed Item retry under new portfolio state

- PR #104 Job at terminal `failed` with some Items at `ineligible` due to `compatibility_mismatch`. Buyer modifies My Devices to add the compatible device. Buyer initiates PR #104 retry / reprocess: new Job created with NEW Selection Snapshot bound to new projection; previously-`ineligible` Items may now succeed in the new Job.

### Concurrent projection recalculation and Selection Snapshot binding

- Recalculation in progress when Selection Snapshot binding evaluates. Implementation MAY wait or bind last-known-good. Default architectural intent: bind LATEST `current`. Concrete policy: implementation.

### Projection garbage collection

- Old `superseded` projections accumulate over time. Implementation MAY retain per Logs & Audit retention; concrete retention policy aligned with `buyer_compatibility_projection` evidence kind retention per PR-D + CPA / legal / DevOps duration review.

### Cross-tenant boundary

- Buyer A in tenant T1 and buyer B in tenant T2 have entirely independent projections; cross-tenant reads / mutations are architecturally impossible (existing Tenant Company baseline).

### Re-parented buyer entity

- Buyer entity re-parented under a different company (existing PR #103 OQ-PC-2 deferred discipline): projection / impact / portfolio handling governed by existing deferred discipline; no concrete behavior locked here.

### AI-Agent-initiated My Devices change

- Future AI Agent Services module initiates My Devices change on behalf of buyer (future PR if module exists): same authority discipline (Tenant Company `check_access`); same workflow surfaces; `actor_reference` records the AI agent identity. Not in scope for this PR.

### What this edge-cases section intentionally does NOT lock

- Concrete numerics for: stale tolerance, throttling, dedupe windows, batching, notification digest windows, cancel grace.
- Concrete API request / response shapes.
- Concrete UI for any edge case.
- Concrete recalculation queue technology, fairness algorithm.
- Concrete propagation latency for `check_access` revocation mid-recalculation.
- Concrete projection garbage collection / archival policy beyond existing PR-D retention discipline.
- Accessory-to-accessory compatibility (future phase).
- Re-parenting concrete projection behavior (existing PR #103 deferred discipline).
- AI-Agent-initiated change concrete behavior (future PR).
