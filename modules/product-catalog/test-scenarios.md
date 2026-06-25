# Product Catalog Test Scenarios

These are proposal-level architecture test scenarios for Product Catalog behavior.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery and buyer selection tests. This file includes canonical scenario coverage and references that sub-contract for detailed behavior.

## Vendor Authority And Product Record Scenarios

1. Vendor submits accessory facts and Product Catalog accepts, validates, versions, and distributes the governed CIXCI platform product record.
2. Vendor-submitted facts conflict with Product Catalog-governed identifiers and route to review.
3. Product Catalog rejects an attempt to update Pricing-owned calculated values, Media processing state, Device Catalog facts, Notification delivery state, Integration transport state, Procurement PO state, Order Routing state, Fulfillment/Returns state, Invoice Management state, or Inventory ledger state.

## Lifecycle And Availability Scenarios

1. Product Lifecycle State and Product Availability State are stored separately.
2. Product is Active and Out of Stock; buyer-facing status does not show it as simply sellable.
3. Product is Inactive / Hidden before Release Date.
4. Product is released to eligible buyers on Release Date for review where rules allow.
5. Product becomes customer-facing eligible on Launch Date only when lifecycle, availability, buyer eligibility, pricing readiness, media readiness, compatibility, channel eligibility, launch eligibility evidence, and review state allow.
6. Product marked End of Life requires EOL Date.
7. EOL sell-through options produce appropriate Product Catalog behavior and downstream signals without Product Catalog enforcing downstream operational behavior.
8. Archived product remains available for order, return, invoice, reporting, export, and audit traceability.

## Accessory Discovery And Buyer Selection Scenarios

1. Buyer with no My Devices sees the empty state and `Go to My Devices` action.
2. `View Accessories` from My Devices opens Accessories with that device pre-selected.
3. Device filter still shows all My Devices while one device is selected.
4. Buyer can remove or expand selected device filter without leaving the page.
5. Device, Category, Color, Price, Vendor, Availability, Selling Status, On Sale, and Latest Accessories filters combine correctly.
6. Search by accessory name, brand/vendor, SKU, UPC, and keyword respects active filters and compatibility.
7. Accessory results respect buyer visibility, vendor access, lifecycle, availability, channel eligibility, and buyer account status.
8. Export confirmation creates one line-level eligibility record per selected accessory.
9. Confirmation line records product source version/hash, visibility projection, compatibility evidence, lifecycle disposition, availability disposition, channel eligibility disposition, buyer access disposition, and already exported state.
10. Confirmation line records warning versus blocking classification and reason.
11. Confirmation recheck blocks a line when source evidence becomes stale, missing, conflicting, EOL, no longer buyer-visible, no longer compatible, or no longer channel-eligible before confirmation.
12. Blocked confirmation lines do not advance buyer accessory relationship state.
13. Exported / Accessory Added state is per buyer only.
14. Export confirmation shows selected count, vendors, devices, and warnings.
15. Buyer can cancel confirmation and return without losing selection.
16. Export is not executed before confirmation.
17. Product Catalog export apply can succeed while Integration delivery remains pending or failed by reference.
18. Buyer accessory relationship advancement is blocked when export apply fails.
19. Buyer accessory relationship advancement is not treated as proof of Integration delivery success.
20. Latest Accessories baseline advancement is skipped when no successful applicable export baseline exists.
21. Latest Accessories is disabled when buyer has never exported.
22. Latest Accessories uses last successful applicable export baseline rather than an unscoped timestamp.
23. Stop Selling affects only the buyer-product relationship and preserves source accessory facts.
24. Bulk Stop Selling requires appropriate Tenant Company permission evidence.
25. System Admin can view catalog in buyer context.
26. System Admin buyer context is read-only unless explicit act-on-behalf permission exists.
27. Act-on-behalf request records Tenant Company authority evidence and Product Catalog workflow references.

## Launch Eligibility Evidence Scenarios

1. Product Catalog records Launch Eligibility Evidence with source readiness signal id, signal version/hash, authority module, freshness/expiration, and audit reference.
2. Missing Pricing readiness routes customer-facing eligibility to review rather than Product Catalog deciding pricing readiness.
3. Missing Media readiness routes customer-facing eligibility to review rather than Product Catalog deciding media readiness.
4. Missing Tenant Company eligibility or channel scope routes to review or deny-by-default behavior rather than Product Catalog inferring eligibility.
5. Stale or expired Launch/Event readiness evidence blocks or routes Launch Date transition to review.
6. Launch Date alone does not make a product customer-facing sellable.
7. Waiver/override evidence captures approver, reason, review state, and audit reference.

## EOL Downstream Disposition Scenarios

1. Product Catalog records EOL policy signal, sell-through policy reference, affected buyer-product relationship reference, catalog visibility disposition, and catalog downloadability disposition.
2. Product Catalog may block new catalog downloads or buyer-product activation where Product Catalog rules allow.
3. Order Routing records its own routability disposition from consumed catalog evidence.
4. Procurement records its own PO allowance disposition from consumed catalog evidence.
5. Fulfillment/Returns records its own operational disposition from consumed catalog evidence.
6. Invoice Management records its own invoice eligibility disposition from consumed catalog evidence.
7. Integration Management owns buyer update delivery/transport evidence.
8. Conflicting or missing downstream disposition acknowledgement routes to review without moving ownership into Product Catalog.

## Availability Update Scenarios

1. Out of Stock is represented as availability, not lifecycle.
2. Availability Evidence Record captures source module/system, source timestamp, received timestamp, freshness/expiration, quantity basis, quantity source, threshold source, and source disposition.
3. Stale, missing, expired, or conflicting availability evidence routes to review where rules require it.
4. Out of Stock emits notification-triggering event and integration/update signal where relevant.
5. Back in Stock emits downstream signals where relevant.
6. Low Stock threshold triggers alert/signal behavior without creating full Inventory Management ownership.
7. Temporarily Unavailable blocks new selling eligibility while preserving lifecycle state.
8. Display-only, sellability-affecting, backorder-eligible, and advisory-only flags are preserved so downstream modules can make their own decisions.

## Color And Variant Scenarios

1. Multi-color product uses structured color assignments rather than only comma-separated text.
2. Vendor Color is preserved and normalized System Color supports filtering/reporting.
3. Variant-level record is required when SKU, UPC, inventory/availability, image, price input, material, packaging, model, or compatibility differs.
4. Variant-specific image mapping consumes Media evidence and Product Catalog records attachment acceptance/rejection.

## Compatibility Scenarios

1. Compatibility import defaults to Add and preserves existing mappings.
2. Replace mode requires explicit selection, preview warning, confirmation, and audit evidence.
3. Selective Remove removes only selected mappings and preserves unrelated mappings.
4. Compatibility import validates referenced Device References exist.
5. Missing, stale, superseded, ambiguous, or conflicting Device References route to review.
6. Compatibility changes are audit-ready and do not mutate Device Catalog records.

## Buyer Visibility And Export Scenarios

1. Buyer product visibility consumes Tenant Company eligibility and Device Catalog buyer device portfolio references without inferring eligibility.
2. Buyer product export records capture export timestamp, export method, export status, exported product references, and export baseline reference.
3. Latest Accessories filter is disabled or unavailable when buyer has never successfully completed an applicable export baseline.
4. Latest Accessories returns products released/updated after last successful applicable buyer export baseline.
5. Product export succeeds but Integration Management delivery fails; Product Catalog references the failure without owning transport evidence.
6. Partial, failed, revoked, superseded, or restricted-scope exports do not advance the Latest Accessories baseline unless Product Catalog rules explicitly allow it.
7. Export baseline records preserve schema version, filter scope, Product Type scope, visibility/access projection reference, included products, excluded reason summary, baseline advanced timestamp, and audit reference.

## Buyer Selling Status Scenarios

1. Buyer Selling Status can include Not Selling, export workflow/disposition states, Accessory Added, Selling, Stop Selling, and Review Required.
2. Stop Selling affects only the buyer-product relationship.
3. Stop Selling does not overwrite vendor lifecycle or availability.
4. Stop Selling preserves order, return, reporting, invoice, and audit history.
5. Buyer Selling Status update emits integration/update signal where configured.

## Accessory Details Action Scenarios

1. Buyer sees export/download only with permission and eligible product state.
2. Buyer sees add/stop selling actions only with Tenant Company permission and company configuration.
3. Buyer sees Create PO / Add to PO action only when Procurement configuration allows; Procurement owns PO lifecycle.
4. Buyer can view Pricing-provided price/snapshot reference only where authorized.
5. Buyer can view media only where Product Catalog attachment and Media access rules allow.

## Retail / Sales Channel Scenarios

1. Product has Retail eligibility flag/scope accepted by Product Catalog governance.
2. Buyer filter returns retail-eligible products where buyer/channel eligibility allows.
3. Tenant Company channel eligibility blocks product access even when product has retail eligibility.

## Notification / Integration / Audit / AI Scenarios

1. Product released, launched, EOL, out-of-stock, back-in-stock, low-stock, compatibility, pricing input, media attachment, buyer selling status, accessory export confirmation, confirmation-line blocked, export applied, export delivery failed reference, and export/download changes emit notification-triggering or integration/update-friendly events where configured.
2. Notification Platform Service owns notification delivery status.
3. Integration Management owns buyer system delivery/transport evidence and integration update disposition references.
4. Product Catalog changes produce audit-ready evidence and Logs & Audit owns immutable audit records.
5. AI-ready catalog events support future cleanup, compatibility, pricing validation, image quality, recommendation, promotion planning, buyer opportunity, and fulfillment exception agents.
6. AI recommendation cannot mutate product records without approved action contracts and permissions.

## Regression Scenarios

1. Active does not automatically mean sellable.
2. Availability change does not change lifecycle.
3. Buyer Selling Status does not alter vendor source record.
4. Compatibility Replace does not run without explicit destructive confirmation.
5. Archived does not mean deleted.
6. Accessory export confirmation does not apply blocked lines.
7. Accessory Added / Selling does not advance from confirmation alone when Product Catalog export apply fails or source evidence is stale.
8. Integration delivery success/failure remains Integration Management evidence, not Product Catalog transport truth.
9. Product Catalog does not calculate price, process media, mutate Device Catalog records, deliver notifications, own integration transport, create POs, coordinate launch calendars, enforce downstream order/PO/fulfillment/invoice behavior, or own Inventory ledger behavior.

## Buyer Product Export Job Foundation Test Scenarios

This section documents acceptance test scenarios for the Buyer Product Export Job Foundation. All scenarios are acceptance-level and reference-first; no concrete test fixtures, payloads, or implementation are specified. Existing Product Catalog test scenarios are preserved without modification.

### Cleanup wording reaffirmed (operationally tested in scenarios IT-1 through IT-5)

`Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.`

---

### Job creation scenarios

#### JC-1 - Single Add Accessory creates a Job

Given a buyer clicks Add Accessory on a single product, when Product Catalog processes the request, then a Buyer Product Export Job is created at `job_status = requested` with `trigger_kind = single_add_accessory`, buyer-scope triad populated, and a corresponding Selection Snapshot with one eligible product reference. The Job model is invoked even though the export feels synchronous to the buyer.

#### JC-2 - Multi-select creates a Job with multiple Items

Given a buyer selects multiple products and confirms export, when Product Catalog creates the Job at `trigger_kind = multi_select`, then one Buyer Product Export Item is created per selected product, all inheriting the buyer-scope triad from the parent Job.

#### JC-3 - Select all visible snapshots eligible IDs

Given a buyer selects all visible products from a vendor, when Product Catalog creates the Job at `trigger_kind = select_all_visible`, then the Selection Snapshot captures the eligible product IDs at job creation time; later product additions / removals do NOT mutate the Job.

#### JC-4 - Select all filtered snapshots result set

Given a buyer selects all products from filtered results, when Product Catalog creates the Job at `trigger_kind = select_all_filtered`, then the Selection Snapshot captures the filter result set at job creation; the Job does NOT execute the filter as a dynamic future query.

#### JC-5 - Idempotent Job creation

Given a buyer initiates an export with idempotency key K, when an in-flight or recently-completed Job exists with idempotency key K, then Product Catalog returns the existing Job reference without creating a new Job (per Duplicate / Idempotency Policy).

#### JC-6 - Admin on-behalf requires Tenant Company authority

Given an admin initiates `trigger_kind = admin_on_behalf` for a buyer without Tenant Company act-on-behalf authority evidence, when Product Catalog calls `check_access`, then Tenant Company returns `decision = deny` and Product Catalog refuses Job creation.

### Selection Snapshot scenarios

#### SS-1 - Snapshot is buyer-scoped

Given a Job is created for Buyer 1, when the Selection Snapshot is created, then the snapshot carries Buyer 1's buyer-scope triad and is NOT visible or referenceable under Buyer 2's scope.

#### SS-2 - Post-snapshot product changes do not mutate Job

Given a Selection Snapshot captures eligible products P1, P2, P3 at snapshot time, when product P2 becomes ineligible after snapshot but before Job completion, then the Job's Items are NOT mutated; Items continue to reference P2 at the snapshotted product source version. (Re-evaluation occurs only on explicit retry / reprocess.)

#### SS-3 - Populated compatibility projection field

Given a Selection Snapshot is created after the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation, when the `compatibility_projection_reference_at_snapshot` field is inspected, then the field is populated with the buyer-scoped projection bound at Job creation; `compatible_device_references_at_snapshot` may also be present.

### Eligibility validation scenarios

#### EV-1 - Eligible product transitions through validation

Given an Item is created for a product that passes all eligibility checks (visibility, vendor / buyer relationship, region, sales channel, lifecycle, availability per existing rules), when Workflow 3 validates, then the Item transitions `pending` -> `validating` -> `eligible`.

#### EV-2 - Ineligible product terminates with reason

Given an Item is created for a product that fails eligibility (e.g., product no longer buyer-visible), when Workflow 3 validates, then the Item transitions to terminal `ineligible` with `ineligibility_reason_reference` populated. No activation occurs.

### Throttling scenarios

#### TH-1 - Throttled Job records applied policy references

Given the Tenant / Company Export Concurrency Policy applies during Job creation, when Workflow 5 throttles the Job, then the Job transitions to `throttled` and `applied_throttle_policy_references` is populated with `tenant_company_export_concurrency_policy` reference.

#### TH-2 - Small-Job Fairness prevents starvation

Given a small urgent Job is queued behind a large bulk Job, when Small-Job Fairness / Queue Priority Policy applies, then the small Job is prioritized for dispatch ahead of the large Job's remaining Batches (architectural intent; concrete fairness algorithm is implementation).

#### TH-3 - No numeric limits in this PR

Given a verification check for numeric throttle limits, when this PR's scope is inspected, then no numeric limit values are introduced; all throttling is governed by 10 named, configurable policies.

### Integration dispatch boundary scenarios

#### IT-1 - Dispatch success drives Item to activated

Given an Item is at `dispatch_pending`, when Integration Management records a dispatch success reference, then Product Catalog transitions the Item through `exported` -> `activation_pending` -> `activated`; populates `dispatch_reference` and `activation_reference`; creates buyer-scoped activation / catalog mapping; emits `item.status-changed` with `item_status = activated`.

#### IT-2 - Dispatch failure drives Item to failed

Given an Item is at `dispatch_pending`, when Integration Management records a dispatch failure reference (transport retry exhausted, dead-letter, provider failure), then Product Catalog transitions the Item to terminal `failed`; populates `error_reference` with `error_kind = dispatch` or `integration_transport`; emits `item.status-changed` with `item_status = failed`. **Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.**

#### IT-3 - Transient dispatch failure with retry budget

Given an Item is at `dispatch_pending` and transient dispatch failure occurs with retry budget remaining, when Workflow 13 applies, then Product Catalog transitions the Item to `retry_scheduled`; increments `retry_attempt_count`; decrements `retry_budget_remaining`.

#### IT-4 - Dispatch reference boundary event

Given Workflow 7 records an Integration Management dispatch reference, when `product-catalog.buyer-product-export-dispatch.reference-recorded` is emitted, then the event payload carries `integration_dispatch_reference` but does NOT carry transport outcome. Integration Management owns the transport outcome.

#### IT-5 - Product Catalog records failed Item after dispatch failure reference

Given Product Catalog receives a dispatch failure reference from Integration Management, when Product Catalog processes the reference, then Product Catalog has the authority to record the consequent Item failure status. **Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.**

### Item status driving Accessory Added scenarios

#### IS-1 - Only activated drives Accessory Added

Given an Item is at terminal `activated`, when Workflow 11 evaluates, then the Add Accessory UI for that buyer transitions to Accessory Added. Given the Item is at any other terminal status (`failed`, `ineligible`, `skipped`, `canceled`) OR any non-terminal status, the Add Accessory UI does NOT transition.

#### IS-2 - Exported does not drive Accessory Added

Given an Item is at `exported` (non-terminal), when Workflow 11 evaluates, then Accessory Added does NOT advance. The Item must reach terminal `activated`.

#### IS-3 - Dispatch_pending does not drive Accessory Added

Given an Item is at `dispatch_pending`, when Workflow 11 evaluates, then Accessory Added does NOT advance.

#### IS-4 - Activation_pending does not drive Accessory Added

Given an Item is at `activation_pending`, when Workflow 11 evaluates, then Accessory Added does NOT advance.

#### IS-5 - Queued / Processing do not drive Accessory Added

Given an Item is at `queued` or `processing`, then Accessory Added does NOT advance for that Item.

### Cross-buyer non-interference scenarios

#### CB-1 - Buyer 1 activation does not affect Buyer 2 state

Given Buyer 1 successfully exports accessory A (Item terminal `activated` for Buyer 1), when Workflow 10 / 11 execute, then the activation / catalog mapping record is keyed on Buyer 1's buyer-scope triad. Buyer 2's view of accessory A is unaffected; Buyer 2's Add Accessory button for accessory A remains actionable.

#### CB-2 - Same accessory: Add Accessory for Buyer 2 / Accessory Added for Buyer 1

Given accessory A is Accessory Added for Buyer 1 (terminal `activated`), when Buyer 2 views accessory A, then Buyer 2's view shows Add Accessory (actionable). The same accessory CAN be Accessory Added for Buyer 1 while Add Accessory for Buyer 2; this is the expected buyer-specific behavior.

#### CB-3 - Buyer 1 failed Item does not disable Buyer 2 Add Accessory

Given Buyer 1's Item for accessory A reaches terminal `failed`, when Buyer 2 views accessory A, then Buyer 2's Add Accessory remains actionable. One buyer's failed Item does NOT disable another buyer's Add Accessory.

#### CB-4 - Buyer 1 in-flight Job does not affect Buyer 2 state

Given Buyer 1 has an in-flight Job containing accessory A at `processing`, when Buyer 2 views accessory A, then Buyer 2's Add Accessory remains actionable. In-flight Jobs for one buyer do NOT affect another buyer's UI state.

#### CB-5 - Buyer-scope triad enforced on every activation record

Given a buyer-scoped activation / catalog mapping record is created, when inspected, then `buyer_reference`, `company_scope_reference`, and `buyer_entity_reference` (or equivalent buyer-scope key) are populated. Cross-buyer reads are architecturally impossible because the record is keyed on the triad.

### Job completion scenarios

#### CO-1 - All Items activated -> Job completed

Given a Job has 100 Items, all reaching terminal `activated`, when Workflow 12 evaluates, then the Job transitions to `completed`; Result Summary records `count_succeeded = 100`, all other counts = 0.

#### CO-2 - Mixed outcomes -> completed_with_errors

Given a Job has 100 Items: 95 reach `activated`, 3 reach `failed`, 2 reach `ineligible`, when Workflow 12 evaluates, then the Job transitions to `completed_with_errors`; Result Summary preserves per-Item terminal differences (`count_succeeded = 95`, `count_failed = 3`, `count_ineligible = 2`).

#### CO-3 - completed_with_errors preserves per-Item state

Given a Job is at `completed_with_errors`, when Buyer Selling Status / Add Accessory state is evaluated, then only the 95 Items at `activated` drive Accessory Added; the 3 `failed` Items remain actionable / retryable; the 2 `ineligible` Items show their ineligibility reason.

### Cancellation / Expiration scenarios

#### CE-1 - Buyer cancels before processing

Given a Job is at `queued` (not yet `processing`), when buyer requests cancellation, then Workflow 14 transitions the Job to `canceled`; in-flight Items (none in this case) transition to `canceled`.

#### CE-2 - Cancellation grace window after processing

Given a Job is at `processing` and the cancel-after-processing grace window is open, when buyer requests cancellation, then Workflow 14 transitions the Job to `canceled`; in-flight Items at `processing` / `dispatch_pending` transition to `canceled`; Items already at `activated` remain terminal. (Open business decision: grace window timing.)

#### CE-3 - Expiration after timeout

Given a Job is at `queued` or `throttled` and System Export Queue Policy expiration window elapses, when the expiration trigger fires, then Workflow 14 transitions the Job to `expired`; in-flight Items transition to `canceled` or `skipped` per implementation.

### Retry / Reprocess scenarios

#### RR-1 - Item retry within Job

Given an Item fails transiently with retry budget remaining, when Workflow 13 schedules retry, then the Item transitions to `retry_scheduled`; `retry_attempt_count` increments; on retry, the Item re-enters Workflow 6 / 7.

#### RR-2 - Retry budget exhausted

Given an Item fails after retry budget is exhausted, when Workflow 13 evaluates, then the Item transitions to terminal `failed`; `error_reference.retryable_flag = false`.

#### RR-3 - Job reprocess creates new Job

Given a prior Job reached terminal `completed_with_errors`, when buyer or admin initiates reprocess, then Workflow 1 creates a NEW Job with `trigger_kind = reprocess` and `prior_job_reference` populated. The prior Job is NOT mutated.

#### RR-4 - Retry Job creates new Job filtered to failed Items

Given a prior Job reached terminal `completed_with_errors` with some Items at `failed`, when buyer or admin initiates retry, then Workflow 1 creates a NEW Job with `trigger_kind = retry`, `prior_job_reference` populated, and `item_filter` referencing the prior Job's failed Items.

### File generation scenarios

#### FG-1 - File export emits file.generated event

Given a Job has `export_method = file`, when Workflow 8 generates the file artifact, then `product-catalog.buyer-product-export-file.generated` is emitted with Logs & Audit File Tracking reference.

#### FG-2 - API-only export does not emit file.generated event

Given a Job has `export_method = api`, when the Job processes Items through dispatch, then `product-catalog.buyer-product-export-file.generated` is NOT emitted (no file artifact exists).

#### FG-3 - File generated but not downloaded does not auto-equal activation by default

Given a file artifact is generated for a Job, when Workflow 10 evaluates whether activation should occur, then by default the file generation alone does NOT trigger activation; activation occurs via per-Item Workflow 7 / 9 / 10. (Open business decision: tenant policy may override when export mode explicitly defines file generation as successful delivery.)

### Event discipline scenarios

#### ED-1 - Six events introduced

Given verification of the new Product Catalog events under this Foundation, when the event inventory is inspected, then exactly 6 events are introduced: `job.requested`, `job.status-changed`, `batch.status-changed`, `item.status-changed`, `file.generated`, `dispatch.reference-recorded`.

#### ED-2 - No per-item completed / failed events

Given verification of the event inventory, when Item terminal outcomes are observed, then they are emitted via `item.status-changed` with `item_status` discriminator; no separate `item.completed` or `item.failed` event exists.

#### ED-3 - No throttled / cancellation / retry events

Given verification of the event inventory, when throttle / cancellation / retry transitions occur, then they are emitted via `job.status-changed` / `item.status-changed` with appropriate status discriminator; no per-concern event exists.

#### ED-4 - Activation completion via item.status-changed only

Given an Item reaches terminal `activated`, when events are emitted, then `item.status-changed` is emitted with `item_status = activated` carrying `activation_reference`; no separate `item.activated` event is emitted.

#### ED-5 - dispatch.reference-recorded is boundary event

Given Workflow 7 records an Integration Management dispatch reference, when `dispatch.reference-recorded` is emitted, then the event carries the reference but NOT the transport outcome. Integration Management owns transport outcome.

### Boundary discipline scenarios

#### BD-1 - audit_export.* non-use

Given verification of authority capabilities used by Product Catalog under this Foundation, when the capability set is inspected, then NO use of `audit_export.*` (the PR #103 compliance audit report export capability family) is found. Buyer product exports use existing Tenant Company buyer / company / entity capabilities.

#### BD-2 - Global compatibility export forbidden

Given verification of compatibility export behavior, when an export Job is created, then the Job does NOT export global compatibility data. Compatibility export is bounded by the buyer-scoped projection referenced by `compatibility_projection_reference_at_snapshot`, and items that fail compatibility terminate with `error_kind = compatibility_mismatch`.

#### BD-3 - Logs & Audit unmodified

Given verification of files changed by this PR, when the Logs & Audit directory is inspected, then no Logs & Audit file is modified. Product Catalog emits evidence references only.

#### BD-4 - Tenant Company unmodified

Given verification of files changed, when the Tenant Company directory is inspected, then no Tenant Company file is modified. Existing PR #103 baseline is preserved by reference.

#### BD-5 - Integration Management unmodified

Given verification of files changed, when the Integration Management directory is inspected, then no Integration Management file is modified.

#### BD-6 - openapi-contracts.md unmodified

Given verification of files changed, when `modules/product-catalog/openapi-contracts.md` is inspected, then no modifications exist.

### Buyer-specific activation enforcement scenarios

#### BS-1 - Activation record requires buyer-scope triad

Given an Item reaches terminal `activated`, when Workflow 10 creates the activation / catalog mapping record, then the record REQUIRES `buyer_reference`, `company_scope_reference`, and `buyer_entity_reference`. A record cannot be created without the triad.

#### BS-2 - Cross-buyer activation architecturally impossible

Given Buyer 1 has an activated Item for accessory A, when any process attempts to apply that activation to Buyer 2's scope, then the operation has no valid path: there is no cross-buyer key, and the buyer-scope triad on the activation record uniquely identifies Buyer 1.

### Scenario coverage summary

- Job creation scenarios: 6 (JC-1 through JC-6).
- Selection Snapshot scenarios: 3 (SS-1 through SS-3).
- Eligibility validation scenarios: 2 (EV-1, EV-2).
- Throttling scenarios: 3 (TH-1 through TH-3).
- Integration dispatch boundary scenarios: 5 (IT-1 through IT-5).
- Item status driving Accessory Added scenarios: 5 (IS-1 through IS-5).
- Cross-buyer non-interference scenarios: 5 (CB-1 through CB-5).
- Job completion scenarios: 3 (CO-1 through CO-3).
- Cancellation / Expiration scenarios: 3 (CE-1 through CE-3).
- Retry / Reprocess scenarios: 4 (RR-1 through RR-4).
- File generation scenarios: 3 (FG-1 through FG-3).
- Event discipline scenarios: 5 (ED-1 through ED-5).
- Boundary discipline scenarios: 6 (BD-1 through BD-6).
- Buyer-specific activation enforcement scenarios: 2 (BS-1, BS-2).

Total acceptance scenarios: 55.

### Scenarios intentionally NOT included

- Concrete payload schemas. Reference-first.
- Concrete error code mappings. Future API.
- Concrete UI test scenarios. Future UX / UI.
- Concrete propagation latency tests. Implementation.
- Concrete throttle algorithm tests. Implementation.
- Source-module-specific authority test scenarios. Source-module PRs.
- Logs & Audit-specific test scenarios. Logs & Audit module.
- Cross-PR integration test scenarios. Future integration testing.
- Buyer-Scoped Compatibility Projection and My Devices Sync scenarios are defined in the section below.

## Buyer-Scoped Compatibility Projection Test Scenarios

This section adds architecture-level acceptance scenarios for the Product Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Device Catalog side has matching scenarios in `modules/device-catalog/test-scenarios.md`. All existing Product Catalog baseline scenarios (PR #104 and earlier) are preserved without modification.

### Scenario format

Each scenario is architectural; concrete request / response shapes, error codes, and timings are out of scope. Scenarios assert observable state transitions, evidence emission, boundary enforcement, and consumer outcomes.

---

### Buyer-Scoped Compatibility Projection lifecycle

- A buyer with two active devices in My Devices and a catalog of compatible accessories receives a projection at `projection_status = current` with `compatible_accessory_references` containing exactly the set of accessories compatible with at least one of those two devices, subject to visibility / sales-channel / lifecycle rules.
- The projection's `buyer_device_portfolio_snapshot_reference` is REQUIRED and resolves to the buyer's Device Catalog snapshot.
- The projection's `source_compatibility_mapping_version_reference` is REQUIRED.
- The projection carries the buyer-scope triad.
- The projection carries `projection_timestamp` and `projection_version`.
- An Evidence Record is emitted with evidence kind `buyer_compatibility_projection`.

### Projection status transitions

- A new projection is created at `recalculating`; on success transitions to `current`; emits `projection.status-changed` twice (to `recalculating` then to `current`).
- On recalculation failure: transitions to `failed`; the prior `current` projection remains the last-known-good projection.
- On source state advance (Device Catalog portfolio snapshot newer than the projection's bound snapshot): transitions to `stale`.
- When a newer projection version supersedes this one: transitions to `superseded`; new projection's `prior_projection_reference` points here.
- On admin-on-behalf change with confidence concerns: transitions to `review_required`.

### Empty My Devices state

- A buyer with zero active devices receives a projection at `projection_status = current` with empty `compatible_accessory_references`.
- Accessory List shows empty state.
- PR #104 Job creation may proceed; Selection Snapshot binds the empty projection; zero Items.
- No error is raised.

### My Devices add

- Buyer adds a device. Device Catalog emits `portfolio-changed` with `change_type = device_added`.
- Product Catalog triggers Workflow 4.
- Prior projection transitions to `superseded`; new projection at `current` after recalculation.
- Accessories newly compatible (compatible with the added device, not previously visible) transition `visibility_status` to `now_visible`.
- Accessories compatible with both old and new devices remain `still_visible_unchanged` or `still_visible_compatibility_expanded`.
- Already Accessory Added / Selling accessories: NOT rewritten.
- Latest Accessories baseline NOT auto-advanced.
- In-flight PR #104 export Jobs keep their bound snapshot.

### My Devices remove (last compatible device)

- Buyer removes the device that was the ONLY compatible device for accessory A.
- Device Catalog emits `portfolio-changed` with `change_type = device_removed`.
- Product Catalog triggers Workflow 4.
- Accessory A: `visibility_status` transitions to `no_longer_visible`; LEAVES active addable list.
- For activated accessories: Buyer Accessory Compatibility Impact Record produced with `impact_state = no_longer_compatible` (or `hidden_from_active_addable_list` if not previously Selling).
- Buyer Selling Status is NOT auto-transitioned to Stop Selling.
- `current_compatibility_impact_state` on activation / catalog mapping updates.
- Historical Buyer Product Export Records: preserved unchanged.

### My Devices remove (other compatible devices remain)

- Buyer removes a device; accessory A is still compatible with at least one other active device.
- `compatible_accessory_references` still contains accessory A; `visibility_status` is `still_visible_compatibility_narrowed` (since `active_compatible_device_count` decreased) OR `still_visible_unchanged` if no relevant change.
- No `no_longer_compatible` impact record is produced for accessory A.

### Cross-buyer non-interference

- Buyer 1 removes a device. Buyer 2's projection remains unchanged.
- Buyer 2's `compatible_accessory_references` are independent of Buyer 1's portfolio.
- The same accessory may be in Buyer 2's `compatible_accessory_references` while in Buyer 1's `no_longer_compatible` impact state.

### Selection Snapshot compatibility binding (PR #104 extension)

- PR #104 Workflow 2 (Export Selection Snapshot) executes Workflow 9 (Export Selection Snapshot Compatibility Binding) inline.
- Selection Snapshot's `compatibility_projection_reference_at_snapshot` is REQUIRED and populated.
- `compatible_device_references_at_snapshot` is populated from the projection's bound portfolio snapshot active devices.
- Event `product-catalog.buyer-export-selection.compatibility-snapshot-recorded` emitted.

### Export Eligibility Validation (PR #104 Workflow 3 extension)

- PR #104 Workflow 3 evaluates each Item; if the Item's `product_reference` is NOT in `compatible_accessory_references` of the bound projection, Item transitions to terminal `ineligible` with `error_kind = compatibility_mismatch`.
- `compatibility_mismatch` is distinct from `eligibility`, `dispatch`, `integration_transport`, `item_validation`, `buyer_authority`, `system`.

### In-flight Job immutability (Workflow 10)

- PR #104 Job at `processing`; buyer removes a device.
- Job continues against the bound `compatibility_projection_reference_at_snapshot`.
- Items in flight evaluate against the bound projection, NOT the new projection.
- Items already at terminal status remain terminal.
- Buyer / admin / service identity may initiate retry / reprocess; NEW Job is created with NEW Selection Snapshot bound to the NEW projection.

### compatibility_mismatch error_kind

- An export Job selects accessories that are no longer compatible with the buyer's portfolio after a My Devices change occurring BEFORE Job creation; affected Items terminate `ineligible` with `error_kind = compatibility_mismatch`.
- An export Job selects accessories that ARE compatible at Job creation but become incompatible after Job creation; Items proceed under the bound snapshot per Workflow 10; NO `compatibility_mismatch` raised.
- Buyer-facing remediation: adjust My Devices portfolio (distinct from generic `eligibility` remediation).

### Add Accessory eligibility (Workflow 7)

- Add Accessory is offered only for accessories in CURRENT projection's `compatible_accessory_references`.
- For previously-Accessory-Added items now no longer compatible: Add Accessory is NOT offered (the buyer has already activated; the item appears in review surface, not active addable list).
- PR #104 canonical Add Accessory / Accessory Added rule preserved: only terminal `activated` drives Accessory Added; failure leaves Add Accessory retryable.

### Accessory Added preservation (Workflow 8 + canonical PR #104 rule)

- Buyer has activated accessory A (Accessory Added) via successful PR #104 export.
- Buyer removes the only compatible device for accessory A.
- Accessory A retains Accessory Added state.
- Impact record produced with `impact_state = no_longer_compatible`.
- `current_compatibility_impact_state` updates.
- Selling state (if applicable) PRESERVED. No auto Stop Selling.

### Selling impact review (Workflow 8)

- For Selling accessory now incompatible: impact record `impact_state = review_required` or `no_longer_compatible`.
- Buyer / admin sees the impact via `latest_buyer_accessory_compatibility_impact_record_reference`.
- Buyer / admin may explicitly Stop Selling (existing baseline workflow).
- Buyer / admin may acknowledge without Stop Selling.
- Acknowledged impact record records `acknowledged_flag = true`, `acknowledged_timestamp`, `acknowledged_actor_reference`.

### Latest Accessories visibility-only framing

- Vendor advances Latest Accessories for product line P (existing baseline event).
- Buyer with no compatible device for P: Latest Accessories advancement OCCURS at the global / catalog level; buyer's view of Latest Accessories does NOT include P.
- Buyer with compatible device for P: buyer's view of Latest Accessories includes P.
- Advancement itself is NOT made buyer-scoped; only the view-side filter.

### Recommended Accessories visibility-only framing

- Recommendation engine produces recommendations per existing baseline.
- Recommendations are filtered against the buyer's projection `compatible_accessory_references`.
- Buyer sees only compatible recommendations.

### System Admin Buyer Context (Workflow 12)

- Admin selects buyer B's context via existing System Admin Buyer Context.
- Admin views projection / impact / visibility surfaces.
- Admin sees BUYER B's projection (keyed on buyer B's buyer-scope triad), NOT a global view.
- Admin access logged via Logs & Audit Audit Access Record.

### Evidence emission (Workflow 13)

- Projection creation, status transition, supersession: Evidence Record emitted with evidence kind `buyer_compatibility_projection`.
- Impact record creation, acknowledgment: Evidence Record emitted with evidence kind `buyer_compatibility_impact`.
- All Evidence Records carry buyer-scope triad and correlation_reference.
- Logs & Audit indexes per PR-A.
- Retention applies per PR-D.

### Notification intent (Workflow 14)

- Impact record at `impact_state in (no_longer_compatible, review_required, hidden_from_active_addable_list)`: notification intent emitted.
- Projection at `failed` status: notification intent emitted.
- Notification Platform owns delivery; concrete recipient resolution, template, suppression NOT exercised here.

### Projection failure recovery (Workflow 15)

- Projection recalculation fails: `projection_status = failed`.
- Prior `current` projection remains as fallback (stale acceptable per implementation).
- Next valid trigger (e.g., subsequent portfolio change): Workflow 4 re-runs; on success, new projection at `current`.

### `audit_export.*` non-use

- Buyer initiates projection refresh: Tenant Company `check_access` evaluated against existing buyer / company / entity capabilities; `audit_export.*` capabilities NOT consulted, NOT consumed.
- Admin acknowledges impact on behalf of buyer: same; existing Tenant Company act-on-behalf authority used; `audit_export.*` NOT consulted.

### Cancel-after-recalculation-start

- Buyer initiates recalculation; recalculation in `recalculating`.
- Buyer requests cancellation: existing baseline cancel discipline applies (PR #104 cancellation pattern as architectural reference); cancellation succeeds if within grace window; projection transitions to `superseded` (prior `current` remains valid).
- Concrete grace window: open business decision.

### Lifecycle blocking

- Suspended buyer: projection refresh request denied via `check_access`.
- Pending Setup buyer: cannot initiate projection-affecting actions.
- Suspended target company in admin-on-behalf scenarios: blocked per existing PR #103 baseline.
- Active actor + active target: normal evaluation.

### Buyer-scope triad enforcement

- Every projection, impact record, activation / catalog mapping carries buyer-scope triad.
- No cross-buyer key exists.
- Cross-buyer reads / mutations are architecturally impossible.

### No global compatibility projection

- No global projection record exists.
- No global compatibility export payload.
- Export payload compatibility is bounded by buyer-scoped projection.
- File and API exports use the same projection rules.

### No auto Stop Selling on device removal

- Buyer removes device; accessory A becomes incompatible; Buyer Selling Status for accessory A remains Selling.
- Impact record produced; `recommended_buyer_action` MAY be `stop_selling_recommended`.
- Buyer / admin must explicitly Stop Selling per existing baseline workflow.

### Generated-but-not-downloaded file

- Generated export file preserves `compatibility_projection_reference_at_snapshot`.
- Buyer downloading the file weeks later: file references the projection version active at Job creation, not the current projection.

### Bulk portfolio import (multiple devices at once)

- Device Catalog records ONE Buyer Device Portfolio Change Record at `change_type = bulk_portfolio_import`.
- Product Catalog Workflow 4 runs ONCE per resulting snapshot (NOT per device).
- Recalculation produces one projection version supersession.
- Per-accessory `visibility.changed` events emitted per affected accessory.

### Admin-on-behalf change

- Admin makes a change on behalf of buyer (per Tenant Company act-on-behalf authority).
- Device Catalog records the change with `change_type = admin_on_behalf_change` (or with the specific add/remove/update type and `actor_reference` set to admin).
- Product Catalog Workflow 4 runs.
- If confidence is uncertain: projection routes to `review_required`.
- Notification intent emitted per Workflow 14 / business policy.

### Recalculation idempotency

- Same triggering portfolio change reference arriving twice: Product Catalog returns the existing recalculation; no duplicate projection created.

### Re-parenting deferred

- A buyer entity re-parenting under a different company (existing PR #103 OQ-PC-2 deferred): projection / impact handling is governed by existing deferred discipline; no concrete behavior locked here.

### What this scenario set intentionally does NOT lock

- Concrete numeric stale-projection tolerance.
- Concrete numeric recalculation throttling / dedupe windows.
- Concrete numeric notification frequency / digest windows.
- Concrete cancel-after-recalculation-start grace window.
- Concrete API request / response shapes.
- Concrete UI surfaces.
- Concrete recalculation queue technology, persistence, fairness algorithm.
- Concrete idempotency cache shape, TTL.
- Concrete propagation latency for `check_access` mid-recalculation.
- AI-Agent-initiated My Devices change scenarios (future PR).
- Re-parented buyer projection scenarios (existing deferred discipline).
- Accessory-to-accessory compatibility scenarios (future phase).
- Concrete error code catalog for `compatibility_mismatch` (future API).
