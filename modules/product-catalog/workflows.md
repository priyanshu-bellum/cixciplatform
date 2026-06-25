# Product Catalog Workflows

This document is proposal-level architecture. It outlines Product Catalog workflows without finalizing implementation behavior or moving neighboring module ownership into Product Catalog.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for the No My Devices empty state, View Accessories from My Devices, accessory search/filter, multi-select export confirmation, confirmation-line recheck/apply, Stop Selling, and System Admin buyer context workflows.

## API-First Catalog Ingestion

1. Authorized vendor, admin, or integration submits product catalog records through API.
2. Product Catalog creates or updates import/application records using the selected import mode.
3. Product Catalog validates product identity, identifiers, vendor SKU mappings, Product Type, category validation profile, attributes, variants, colors, compatibility, pricing input fields, media attachment references, lifecycle, availability, release/launch dates, EOL facts, channel eligibility, and tenant scope references.
4. Product Catalog applies accepted product changes to CIXCI platform product records.
5. Product Catalog records Catalog Change Records with actor, source, before/after summary, version, import batch/reference, and tenant scope.
6. Product Catalog emits catalog events and update/export signals for downstream consumers.

Boundary notes:

- Vendors are authoritative for vendor-submitted accessory facts where accepted by Product Catalog governance.
- Product Catalog validates, normalizes, governs, versions, and distributes accepted product data.
- Product Catalog must not calculate final buyer-specific prices, process media, mutate Device Catalog records, deliver notifications, transmit to external systems, create POs, coordinate launch calendars, or enforce downstream operational dispositions.

## CSV Fallback Catalog Ingestion

1. Authorized producer uploads or submits CSV fallback file.
2. Product Catalog creates Catalog Import Batch, Catalog Import Row, preview, and validation records.
3. Product Catalog applies `architecture/standards/import-export-validation-governance.md` for mode selection, create/update separation, update-only protection, blank field protection, required identifiers, header validation, locked fields, preview, errors/warnings, confirmation, destructive controls, UPC/text preservation, date/time governance, and audit evidence.
4. Valid rows become eligible for confirmation/apply.
5. Invalid rows produce Import Validation Errors, Import Correction Records, Failed Record Review, or downloadable error report references.
6. Product Catalog publishes import completed, completed-with-warnings, correction-required, review-required, or failed events.

## Lifecycle / Availability / Visibility Workflow

1. Authorized source proposes lifecycle, availability, publication, visibility, release date, launch date, EOL date, archival, stop-sell, or deactivation change.
2. Product Catalog keeps lifecycle, availability, publication, visibility, buyer activation/download, and Buyer Selling Status as distinct state families.
3. Product Catalog validates source authority, Product Catalog governance, Tenant Company scope signals, pricing readiness reference, media readiness reference, compatibility readiness, availability evidence, launch eligibility evidence, and review state where applicable.
4. Product Catalog records the accepted state change and emits events.
5. Downstream modules consume signals within their own boundaries and record their own dispositions where relevant.

Lifecycle states:

- Inactive.
- Active.
- End of Life.
- Archived.
- Review Required placeholder.

Availability states:

- In Stock.
- Low Stock.
- Out of Stock.
- Backorder Available.
- Temporarily Unavailable.

Active does not automatically mean sellable. Sellability depends on lifecycle, availability, buyer eligibility, buyer selling status, pricing readiness, compatibility, channel eligibility, media readiness, launch eligibility evidence, release/launch rules, and export/sync state.

## Accessory Discovery And Selection Workflow

Accessory discovery workflows are detailed in `accessory-discovery-selection.md` and summarized here for canonical workflow visibility.

1. Buyer opens Accessory List.
2. Product Catalog consumes Device Catalog-owned My Devices portfolio references and Tenant Company buyer scope evidence.
3. If no active My Devices references exist, Product Catalog returns the empty state with `Create your device portfolio to view compatible accessories.` and the `Go to My Devices` primary action.
4. If buyer selects `View Accessories` from My Devices, Product Catalog opens Accessories with that Device Reference pre-selected while still showing all active My Devices references in the Device filter.
5. Buyer may remove or expand the Device filter without leaving the page.
6. Product Catalog applies combined filters and search while preserving compatibility, buyer visibility, vendor access, lifecycle, availability, channel eligibility, buyer account status, and Tenant Company scope constraints.
7. Product Catalog maintains Buyer Accessory Selection Set references for multi-select export.
8. Product Catalog creates an Accessory Export Confirmation Record and one Accessory Export Confirmation Line per selected accessory.
9. Product Catalog rechecks required source evidence before confirmation where Product Catalog rules require it.
10. Blocked confirmation lines remain blocked and do not advance buyer accessory relationship state.
11. Product Catalog applies eligible export lines, records export apply disposition, references Logs & Audit file/download evidence where available, references Integration delivery disposition where external delivery applies, and advances the Latest Accessories baseline only for successful applicable exports.
12. Product Catalog advances Accessory Added / Selling state only when Product Catalog export rules consider the export applicable and successfully applied.

Product Catalog owns discovery, selection, confirmation lines, export apply disposition, buyer relationship state, and Latest Accessories baseline rules. Device Catalog owns My Devices and Device References. Tenant Company owns eligibility, buyer account status, permissions, and act-on-behalf authority. Integration Management owns external delivery/receipt evidence. Logs & Audit owns immutable file/download/audit evidence.

## Release / Launch Workflow

1. Product Catalog records Release Date and Launch Date facts with source, version, timezone/date-basis, and review state.
2. Before Release Date, product may remain Inactive / Hidden for buyers.
3. On or after Release Date, Product Catalog may release the product to eligible buyers for review where Tenant Company eligibility, Product Catalog visibility, compatibility, and review rules allow.
4. Buyers may prepare catalog setup. Pre-launch export is configurable and proposal-level.
5. Before customer-facing eligibility, Product Catalog evaluates a Launch Eligibility Evidence Record with source-owned readiness signals.
6. On or after Launch Date, Product Catalog may transition product lifecycle/publication/customer-facing eligibility only when Product Catalog rules, source-owned readiness evidence, review state, availability evidence, pricing readiness, media readiness, compatibility, and channel eligibility allow.
7. Missing, stale, conflicting, or expired readiness evidence routes to review.
8. Conflicts with Launch / Event Management records or source readiness route to review.

Launch / Event Management coordinates readiness and calendars. Product Catalog owns product lifecycle, visibility, and product facts. Launch Date alone does not make a product customer-facing sellable.

## End Of Life / Archival Workflow

1. Vendor or authorized source proposes End of Life state.
2. Product Catalog requires EOL Date.
3. Product Catalog records proposal-level sell-through policy reference:
   - Stop selling on EOL Date.
   - Allow sell-through until inventory depleted.
   - Stop new downloads but allow existing buyers to continue.
   - Stop all buyer ordering on EOL Date.
4. Product Catalog records an EOL policy signal, affected buyer-product relationship references, catalog visibility disposition, catalog downloadability disposition, buyer selling status disposition, review-required state, supersession reference, and audit reference.
5. Product Catalog may block new catalog downloads or buyer-product activation where Product Catalog rules allow.
6. Product Catalog emits EOL/sell-through signals for downstream consumers.
7. Downstream modules record their own order-routing, procurement, fulfillment, invoice, and integration update dispositions.
8. Archived state preserves historical traceability and does not physically delete referenced records.

Order Routing, Fulfillment/Returns, Procurement, Invoice Management, buyer integrations, and buyer-facing modules consume EOL/archival signals within their own boundaries. Product Catalog does not directly enforce customer order routing, PO allowance, fulfillment execution, invoice eligibility, buyer integration transport, or buyer storefront execution.

## Availability Update Workflow

1. Vendor, admin, or integration supplies availability/inventory input evidence.
2. Product Catalog validates product/variant identifiers, source authority, effective date/time, source timestamp, freshness/expiration, quantity basis, and availability state.
3. Product Catalog records Availability Evidence Record and accepted catalog availability status/version.
4. Stale, missing, expired, or conflicting availability evidence routes to review where Product Catalog rules require it.
5. Out of Stock emits catalog availability events and integration/update signals where affected buyers are currently selling or eligible.
6. Back in Stock emits downstream events/signals where relevant.
7. Low Stock compares vendor/platform threshold references and emits risk signals where configured.

Product Catalog does not own a full inventory ledger, allocation, replenishment, warehouse stock, or fulfillment execution. Availability evidence may affect catalog display and eligibility signals, but downstream modules decide their own operational behavior.

## Variant And Color Workflow

1. Vendor submits product/variant facts, color values, attributes, SKU, UPC, pricing inputs, availability, media suggestions, and compatibility data.
2. Product Catalog validates whether variant-level records are required because SKU, UPC, availability, image, price input, material, packaging, model, or compatibility differs.
3. Vendor Color values are preserved.
4. Normalized System Color values are assigned for filtering and reporting.
5. Structured multi-value color assignments are stored where applicable.
6. Variant-specific image mapping consumes Media evidence and records Product Catalog attachment acceptance/rejection.

## Compatibility Import Workflow

1. Vendor/admin/integration submits compatibility data.
2. Product Catalog applies shared import governance and requires explicit compatibility mode.
3. Add mode is default and preserves existing mappings.
4. Replace mode requires explicit selection, preview warning, confirmation, and audit evidence.
5. Selective Remove mode requires explicit selection, preview warning, confirmation, and audit evidence.
6. Product Catalog validates Device References with Device Catalog lookup contracts.
7. Missing, stale, superseded, ambiguous, or conflicting Device References route to review.
8. Product Catalog records Compatibility Change Records and emits compatibility events.

Product Catalog must not mutate canonical Device Catalog records.

## Buyer Visibility And Device Portfolio Workflow

1. Product Catalog receives or looks up buyer scope and eligibility references from Tenant Company.
2. Product Catalog consumes buyer device portfolio references from Device Catalog or the owning buyer-device source where available.
3. Product Catalog evaluates catalog visibility/filtering behavior using product visibility, buyer eligibility evidence, compatibility mappings, buyer device portfolio fit, region/channel rules, release/launch facts, availability evidence, launch eligibility evidence, lifecycle, and review state.
4. Product Catalog records visibility evidence or derived projection references.
5. Missing or stale Tenant Company or Device Catalog evidence routes to review or denies visibility by default.

Product Catalog must not infer Tenant Company eligibility.

## Buyer Product Activation / Download / Export Workflow

1. Buyer or buyer-facing module requests activation, download, or export for an eligible product.
2. Product Catalog validates catalog visibility, buyer scope, permissions/configuration references, Product Catalog rules, and source evidence.
3. Product Catalog records Product Activation Request, Product Activation Approval State, Product Download Record, Buyer Product Export Record, or Activation History as applicable.
4. Product Catalog records an Export Baseline Record when an export/download qualifies for Latest Accessories baseline advancement.
5. Latest Accessories filter uses the buyer's successful applicable export baseline, not a timestamp alone.
6. Partial, failed, revoked, superseded, or restricted-scope exports do not advance the baseline unless Product Catalog rules explicitly allow it.
7. Product Catalog emits export/download events and integration/update signals where configured.

Logs & Audit tracks export evidence; Integration Management owns external delivery/transport evidence.

## Buyer Selling Status Workflow

1. Buyer, buyer-facing module, admin, or authorized service requests buyer-product selling status change.
2. Product Catalog validates Tenant Company permissions and company configuration inputs.
3. Product Catalog records Buyer Product Relationship and Buyer Selling Status / export disposition state.
4. Stop Selling applies only to that buyer-product relationship.
5. Product Catalog preserves order history, return history, reporting history, invoice traceability, and audit references.
6. Product Catalog emits update/export signals for Integration Management where configured.

Buyer Selling Status does not overwrite vendor lifecycle or availability state.

## Accessory Details Buyer Action Workflow

1. Product Catalog determines available action entry points from buyer scope, company configuration, permissions, Product Catalog state, and source-module references.
2. Possible actions include export/download product, add to selling catalog, stop selling, create purchase order, add to existing purchase order, view compatibility, view media, view Pricing-provided price/snapshot reference, view availability, and view lifecycle.
3. Product Catalog exposes PO action entry points only where configuration and permissions allow.
4. Procurement owns PO creation and PO lifecycle.

## Catalog-Carried Pricing Input Handoff

1. Product Catalog receives or updates vendor wholesale, SRP/MSRP, MAP, sale, or other catalog-carried pricing input values.
2. Product Catalog records source, currency, effective dates, version, access classification, and Pricing Handoff Reference.
3. Product Catalog emits pricing-input/evidence-changed events or exposes authorized lookup references.
4. Pricing owns interpretation, calculation, effective prices, discounts, quotes, pricing exceptions, overrides, snapshots, and commercial precedence.

## Media And Content Reference Workflow

1. Authorized source proposes Product Media Asset Reference, Product Content Asset Reference, Media Asset Version Reference, Asset Rendition Reference, or Product Asset Approval / Source State.
2. Product Catalog validates attachment authority and consumes Media mapping evidence where applicable.
3. Product Catalog accepts or rejects product-media attachment references.
4. Product Catalog emits media attachment changed events.

Media owns binary storage, transformations, renditions, URL generation, asset access policy, and processing state.

## Notification And Integration Signal Workflow

1. Product Catalog state change occurs.
2. Product Catalog emits notification-triggering event and/or integration/export/update signal.
3. Notification Platform Service owns delivery.
4. Integration Management owns buyer-system delivery/transport evidence and integration update disposition references.
5. Logs & Audit owns audit/file evidence.

Product Catalog should not store notification delivery state, external transport state, or buyer storefront execution state beyond references.

## Failure Flows

- Invalid API payload.
- Malformed CSV fallback file.
- Duplicate product identity or conflicting source record.
- Identifier namespace collision or invalid identifier format.
- Vendor SKU mapping conflict.
- Compatibility mapping references unknown, stale, superseded, ambiguous, or conflicting Device Reference.
- Pricing input is missing source, currency, effective date, version, or Pricing handoff metadata.
- Media/content version reference is unavailable, ambiguous, or not approved.
- Unauthorized activation/download/export request.
- Buyer device portfolio evidence missing or stale.
- Accessory export confirmation line source evidence missing, stale, superseded, conflicting, or blocking.
- Accessory export apply fails or is partially applied.
- Integration delivery fails after Product Catalog export apply.
- Buyer accessory relationship advancement is blocked.
- Availability evidence missing, stale, expired, or conflicting.
- Launch eligibility evidence missing, stale, expired, or conflicting.
- Release/Launch date conflict with Launch / Event Management signal.
- EOL sell-through conflict with buyer selling status or downstream state.
- Export is partial, failed, revoked, superseded, or restricted-scope and cannot advance Latest Accessories baseline.
- Event publication or integration signal creation failure.

## Operational Notes

- Product Catalog should preserve entity versions and change records so downstream modules can reconcile against stable references.
- Lifecycle, availability, visibility, buyer activation/download, export apply disposition, and Buyer Selling Status must remain separate.
- Derived buyer-facing product status must not replace source states.
- Retry and audit handling should follow platform integration and import/export governance standards.

## Buyer Product Export Job Foundation Workflows

This section adds exactly **16 numbered workflows** for the Buyer Product Export Job Foundation. All existing Product Catalog baseline workflows (including the existing Buyer Product Activation / Download / Export Workflow, Buyer Selling Status Workflow, Accessory Details Buyer Action Workflow, Catalog-Carried Pricing Input Handoff, all other baseline) are preserved without modification. The 16 new workflows operate inside or alongside the existing Buyer Product Activation / Download / Export Workflow without rewriting it.

### Core boundary wording (locked verbatim where workflow-relevant)

`Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.`

This wording is operationalized in Workflow 7 (Integration Dispatch Handoff), Workflow 9 (Item-Level Export Outcome Recording), and Workflow 10 (Product Activation / Buyer Catalog Mapping Update).

---

### Workflow 1 - Buyer Product Export Job Creation

**Purpose:** create a Buyer Product Export Job for every export action, including individual Add Accessory clicks.

**Steps (architectural):**

1. Receive export request from buyer-facing module, admin (with Tenant Company act-on-behalf authority), or service identity (scheduled / retry / reprocess).
2. Validate authority via Tenant Company `check_access` (buyer / company / entity capability; lifecycle blocking; service identity scope for service-initiated Jobs). **Do NOT use `audit_export.*` capabilities; those govern compliance audit report exports per PR #103.**
3. Determine `trigger_kind` (one of 11 values).
4. Apply Duplicate / Idempotency Policy: check `idempotency_key` against in-flight / recently-completed Jobs; on match, return existing Job reference (idempotent response).
5. Create Buyer Product Export Job at `job_status = requested` with buyer-scope triad (`buyer_reference`, `company_scope_reference`, `buyer_entity_reference`).
6. Emit `product-catalog.buyer-product-export-job.requested`.
7. Transition Job to `queued` (or `throttled` per Workflow 5).
8. Emit `product-catalog.buyer-product-export-job.status-changed` with `job_status = queued` (or `throttled`).

**Outputs:** `buyer_product_export_job_id`; initial Job status; PR-A audit record reference.

**Boundary:** Tenant Company decides authority. Product Catalog owns Job creation.

### Workflow 2 - Export Selection Snapshot

**Purpose:** freeze buyer-scoped eligible product IDs at job creation. Post-snapshot product changes do NOT mutate the Job unless explicitly regenerated / retried.

**Steps (architectural):**

1. Transition Job to `snapshotting`.
2. Emit `job.status-changed` with `job_status = snapshotting`.
3. For `single_add_accessory` / `multi_select`: snapshot the explicit selection set.
4. For `select_all_visible`: snapshot all visible products at snapshot time.
5. For `select_all_filtered`: snapshot the filter result set; do NOT capture a dynamic future query.
6. For `select_all_eligible_for_devices`: snapshot products compatible with the buyer's My Devices at snapshot time; compatibility export is bounded by existing Product Catalog / Device Catalog rules and clearly marked as deferred / limited until Buyer-Scoped Compatibility Projection PR.
7. For `recommended_set`: snapshot the recommended set as of snapshot time.
8. For `on_sale_set`: snapshot accessories on sale at snapshot time per Pricing input.
9. Create Buyer Product Export Selection Snapshot with buyer-scope triad and reserved `compatibility_projection_reference_at_snapshot` field.
10. Populate Snapshot's `eligible_product_references` and `excluded_product_reason_summary`.
11. Transition Job to `validating`.
12. Emit `job.status-changed` with `job_status = validating`.

**Outputs:** Selection Snapshot reference; eligible product ID set frozen.

**Boundary:** Selection Snapshot does NOT create global or cross-buyer activation state.

### Workflow 3 - Export Eligibility Validation

**Purpose:** validate each product in the Selection Snapshot against eligibility rules and create Item records.

**Steps (architectural):**

1. For each eligible product in the Selection Snapshot, create a Buyer Product Export Item at `item_status = pending`, inheriting buyer-scope triad from parent Job.
2. Transition each Item to `validating`.
3. Emit `item.status-changed` with `item_status = validating`.
4. Apply eligibility checks per existing Product Catalog baseline: catalog visibility, buyer scope, vendor / buyer relationship, region / country visibility, sales-channel eligibility, lifecycle / availability per existing rules, media completeness if currently documented, price / MAP / wholesale rules if currently documented, Tenant Company export authority where applicable.
5. For Items passing all checks: transition to `eligible`.
6. For Items failing checks: transition to `ineligible`; populate `ineligibility_reason_reference`; terminal status.
7. Emit `item.status-changed` for each transition with appropriate `item_status` discriminator.

**Outputs:** Items at `eligible` (ready for queueing) or terminal `ineligible`.

**Boundary:** Product Catalog owns eligibility decisions per existing baseline + visibility evidence.

### Workflow 4 - Export Batching / Queueing

**Purpose:** batch large Jobs and queue Items for processing under Batch Size Policy.

**Steps (architectural):**

1. Determine if Job qualifies for batching per Job Item Limit Policy and Batch Size Policy.
2. If batching applies: transition Job to `batching`; create one or more Buyer Product Export Batches grouping `eligible` Items; emit `job.status-changed` with `job_status = batching`.
3. For each Batch: emit `batch.status-changed` with `batch_status = pending`.
4. Transition Items to `queued`; emit `item.status-changed` with `item_status = queued`.
5. Transition Job to `queued` if not previously transitioned, or directly to `processing` if no batching needed.

**Outputs:** Items at `queued`; Batches at `pending`; Job at `queued` / `processing`.

**Boundary:** Batches are sub-structure, NOT operational source of truth. Item records remain canonical.

### Workflow 5 - Export Throttling / Backpressure

**Purpose:** apply named throttling policies; queue or throttle rather than synchronously fanning out.

**Steps (architectural):**

1. At Job creation, dispatch initiation, or batch advance time: evaluate applicable named policies:
   - Buyer Export Concurrency Policy.
   - Tenant / Company Export Concurrency Policy.
   - Vendor Fairness Throttle Policy.
   - System Export Queue Policy.
   - Job Item Limit Policy.
   - Batch Size Policy.
   - Integration Dispatch Rate Policy.
   - Retry Budget Policy.
   - Duplicate / Idempotency Policy.
   - Small-Job Fairness / Queue Priority Policy.
2. If a policy applies and blocks progression: transition Job to `throttled` (or hold Batch / Items at `queued`); record applied policy references in `applied_throttle_policy_references` on Job and Status History.
3. Emit `job.status-changed` with `job_status = throttled` + `applied_throttle_policy_references` in payload.
4. Apply Small-Job Fairness / Queue Priority Policy to prevent small urgent Jobs from being starved behind large bulk Jobs.
5. When backpressure releases: transition Job back to `queued` -> `processing`; emit `job.status-changed`.

**Outputs:** Job status reflecting throttle state; applied policy references recorded.

**Boundary:** **No numeric limits in this PR.** Concrete numeric values are implementation / DevOps / business decisions.

### Workflow 6 - Export Processing

**Purpose:** advance Items through the Item state machine toward dispatch and activation.

**Steps (architectural):**

1. Transition Job to `processing`; emit `job.status-changed` with `job_status = processing`.
2. For each Item in `queued`: transition to `processing`; emit `item.status-changed` with `item_status = processing`.
3. Apply Integration Dispatch Rate Policy.
4. For each Item ready for dispatch: transition to `dispatch_pending`; emit `item.status-changed`.
5. Hand off to Workflow 7 (Integration Dispatch Handoff).

**Outputs:** Items at `dispatch_pending` and forward.

**Boundary:** Product Catalog owns Item state machine; Integration Management owns transport.

### Workflow 7 - Integration Dispatch Handoff

**Purpose:** record Integration Management dispatch reference per Item or Batch; consume Integration Management dispatch outcome to drive Item status decision.

**Steps (architectural):**

1. For each Item at `dispatch_pending` (or each Batch where Integration Dispatch Rate Policy batches at the Batch level): initiate dispatch via Integration Management per existing baseline.
2. Record `integration_dispatch_reference` on Item or Batch.
3. Emit `product-catalog.buyer-product-export-dispatch.reference-recorded` (boundary event; does NOT mean Product Catalog owns transport outcome).
4. Integration Management performs transport (HTTPS, webhook, file drop, etc.) and records transport outcome (success, transport retry, dead-letter, provider failure).
5. Product Catalog consumes the dispatch reference outcome from Integration Management evidence.
6. **Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.** Specifically:
   - Dispatch success reference -> Product Catalog transitions Item to `exported` -> `activation_pending`; emits `item.status-changed`.
   - Dispatch failure reference -> Product Catalog transitions Item to `failed` (or `retry_scheduled` if retry budget remains per Retry Budget Policy); records `error_reference` with `error_kind = dispatch` or `integration_transport`; emits `item.status-changed`.
   - Dispatch transient failure with retry available -> Product Catalog transitions Item to `retry_scheduled`; increments `retry_attempt_count`; emits `item.status-changed`.

**Outputs:** Item status reflecting dispatch outcome; dispatch reference recorded; Item status decision owned by Product Catalog.

**Boundary:** Product Catalog owns Item status decision; Integration Management owns transport outcome.

### Workflow 8 - Export File Generation

**Purpose:** generate file artifact when export mode is file or mixed.

**Steps (architectural):**

1. If `export_method` is `file` or `mixed`: at appropriate stage (typically before or after dispatch per implementation), generate file artifact per existing Product Catalog baseline file generation rules.
2. Record file artifact via Logs & Audit File Tracking per existing PR-B discipline.
3. Populate Job's `buyer_product_export_file_reference`.
4. Emit `product-catalog.buyer-product-export-file.generated` with Logs & Audit File Tracking reference.
5. For API-only Jobs (`export_method = api`): skip this workflow; no file artifact, no `file.generated` event.

**Outputs:** File artifact (when applicable); Logs & Audit File Tracking reference.

**Boundary:** Logs & Audit owns file artifact persistence; Product Catalog stores reference and emits event.

### Workflow 9 - Item-Level Export Outcome Recording

**Purpose:** record per-Item terminal outcomes via Item status transitions and existing Product Catalog evidence records.

**Steps (architectural):**

1. For Items reaching terminal `activated`: record `activation_reference` (the buyer-scoped activation / catalog mapping reference created in Workflow 10); record `buyer_product_export_record_reference` (the existing baseline per-buyer-per-product completed-export record).
2. For Items reaching terminal `failed`: record `error_reference` with appropriate `error_kind`.
3. For Items reaching terminal `ineligible`: record `ineligibility_reason_reference`.
4. For Items reaching terminal `skipped` / `canceled`: record reason references.
5. Emit `item.status-changed` for each terminal transition with `item_terminal_flag = true`.
6. Emit Logs & Audit Evidence Records via existing `service_identity.evidence_emit` discipline with evidence kinds `buyer_product_export_item`, `buyer_product_export_baseline` (where applicable), `buyer_product_export_batch` (where applicable).

**Outputs:** Item terminal status; existing baseline records produced where applicable; evidence emitted to Logs & Audit.

**Boundary:** Product Catalog owns item status decisions based on Integration Management dispatch references; Integration Management owns transport outcomes. Logs & Audit owns Evidence Record persistence.

### Workflow 10 - Product Activation / Buyer Catalog Mapping Update

**Purpose:** create or update buyer-scoped activation / catalog mapping on Item terminal `activated`.

**Steps (architectural):**

1. Triggered ONLY on Item terminal `activated`. No other Item status triggers this workflow.
2. Create or update buyer-scoped activation / catalog mapping record with REQUIRED buyer-scope triad (`buyer_reference`, `company_scope_reference`, `buyer_entity_reference`).
3. Populate `source_buyer_product_export_item_reference` and `source_buyer_product_export_record_reference` (existing baseline).
4. Populate `prior_state_reference` and `new_state_reference` (typically Accessory Added).
5. Hand off to Workflow 11 (Add Accessory / Accessory Added State Transition).
6. **Architectural guarantee:** cross-buyer reads / mutations are impossible because the mapping is keyed on the buyer-scope triad. There is no cross-buyer key.

**Outputs:** Buyer-scoped activation / catalog mapping record.

**Boundary:** Product Catalog owns activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.

### Workflow 11 - Add Accessory / Accessory Added State Transition

**Purpose:** operationalize the canonical Add Accessory / Accessory Added rule.

**Canonical rule (verbatim):** Add Accessory changes to Accessory Added and becomes disabled only after that specific accessory has a successful item-level export / activation outcome for that buyer. Selection, job request, queued state, processing state, bulk job inclusion, or another buyer's export is not final activation. Failed items remain actionable or retryable for that buyer. Bulk export updates must be item-level: successful items become Accessory Added for that buyer only; failed items do not. Buyer catalog mapping / activation is scoped by buyer / company / entity and drives final Accessory Added state.

**Buyer-specific rule (verbatim):** Accessory Added is buyer-specific and must be driven by that buyer's item-level successful export / activation record. One buyer's export must never gray out, disable, activate, or otherwise change the Add Accessory state for another buyer.

**Steps (architectural):**

1. Triggered ONLY on Item terminal `activated` for a specific buyer-scope triad.
2. Transition the Add Accessory button state for THAT buyer's view of THAT product to Accessory Added.
3. Buyer Selling Status / export disposition advances per existing baseline rules (typically advances to Accessory Added via Export Applied -> Baseline Advanced -> Accessory Added per existing 13-status taxonomy).
4. Emit `catalog.buyer-selling-status.changed` (existing event preserved) and `product-catalog.buyer-accessory-relationship.state-advanced-after-export` (existing event preserved).
5. **Architectural guarantee:** Buyer 1's Add Accessory state transition does NOT affect Buyer 2's view. The transition is scoped to the buyer-scope triad. Buyer 2 sees Add Accessory remain available; the same accessory can be Add Accessory for Buyer 2 while Accessory Added for Buyer 1.
6. For non-`activated` Item terminal statuses (`failed`, `ineligible`, `skipped`, `canceled`): Add Accessory remains actionable / retryable for that buyer. NO state transition occurs.
7. For non-terminal Item statuses (`pending`, `validating`, `eligible`, `queued`, `processing`, `dispatch_pending`, `exported`, `activation_pending`, `retry_scheduled`): UI may show progress feedback ("Adding...", "Pending...", "Queued...") but Add Accessory does NOT transition to Accessory Added.

**Outputs:** Add Accessory state transition for the specific buyer scope; existing baseline events emitted.

**Boundary:** Buyer-specific activation is enforced at the data-model level via REQUIRED buyer-scope triad.

### Workflow 12 - Export Completion / Partial Completion

**Purpose:** finalize Job status as terminal based on aggregate Item terminal outcomes.

**Steps (architectural):**

1. When all Items reach terminal status: aggregate outcomes.
2. If all Items terminal `activated`: transition Job to `completed`; populate Result Summary.
3. If some Items terminal `activated` and others terminal `failed` / `ineligible` / `skipped` / `canceled`: transition Job to `completed_with_errors`; populate Result Summary with item-level differences preserved.
4. If no Items terminal `activated` AND at least one Item terminal `failed`: transition Job to `failed` (or `completed_with_errors` if some Items are `ineligible` / `skipped` without `failed`; implementation discretion per Product Catalog rules).
5. Emit `job.status-changed` with `terminal_flag = true` and appropriate `job_status`.
6. Populate Job's `result_summary_reference`.
7. `completed_with_errors` PRESERVES item-level success / failure differences; the Job is terminal but each Item remains independently terminal with its own status.

**Outputs:** Job terminal status; Result Summary populated.

**Boundary:** Job-level success means all Items succeeded. `completed_with_errors` preserves item-level differences.

### Workflow 13 - Export Failure / Retry / Reprocess

**Purpose:** handle Item-level failures via Retry Budget Policy; handle Job-level reprocess as new Job.

**Steps (architectural):**

1. On Item failure: evaluate Retry Budget Policy.
2. If retry budget remains: transition Item to `retry_scheduled`; increment `retry_attempt_count`; decrement `retry_budget_remaining`; schedule retry per implementation.
3. If retry budget exhausted: transition Item to terminal `failed`; record `error_reference` with `retryable_flag = false`.
4. On scheduled retry: transition Item back to `queued` or `processing`; re-enter Workflow 6 / 7.
5. For Job-level reprocess: buyer or admin initiates new Job with `trigger_kind = reprocess` referencing prior Job; Workflow 1 creates new Job; new Job's `prior_job_reference` populated.
6. For Item-level retry as a NEW Job (rather than in-Job retry): buyer or admin initiates new Job with `trigger_kind = retry` referencing prior Job and filtering to prior Job's failed Items.

**Outputs:** Retry-scheduled Items; new reprocess / retry Jobs (where applicable).

**Boundary:** retry is workflow / policy behavior; NOT a standalone Retry Record entity. Reprocess creates a NEW Job; NOT a mutation of the prior Job.

### Workflow 14 - Export Cancellation / Expiration

**Purpose:** handle Job cancellation and expiration.

**Steps (architectural):**

1. Cancellation request from buyer or admin: validate authority via Tenant Company `check_access`; evaluate cancel-after-processing grace window (open business decision; default YES with bounded window).
2. If cancellation accepted: transition Job to `canceled`; transition in-flight Items to `canceled` per implementation; record `cancellation_reason_reference` in Status History.
3. If cancellation declined (processing has progressed beyond grace window): record decline reason; Job continues to terminal naturally.
4. Expiration: Job not reaching terminal within System Export Queue Policy expiration window transitions to `expired`; transition in-flight Items to `canceled` or `skipped` per implementation.
5. Emit `job.status-changed` with appropriate terminal status.

**Outputs:** Job terminal `canceled` or `expired`.

**Boundary:** cancellation is workflow / policy behavior; NOT a standalone Cancellation Record entity.

### Workflow 15 - Export Evidence Recording

**Purpose:** emit Logs & Audit Evidence Records for Job, Batch, and Item lifecycle events.

**Steps (architectural):**

1. For every Job / Batch / Item status transition: emit Evidence Record via existing `service_identity.evidence_emit` discipline.
2. Evidence kinds: `buyer_product_export_item`, `buyer_product_export_batch`, `buyer_product_export_baseline`.
3. Logs & Audit indexes Evidence Records per existing PR-A discipline.
4. Logs & Audit applies retention, redaction, legal hold per existing PR-D discipline.
5. Audit access to evidence is logged per existing PR-D hardened Audit Access Record discipline.

**Outputs:** Evidence Records emitted; Logs & Audit indexed.

**Boundary:** Product Catalog emits evidence references only; Logs & Audit owns persistence and governance. **No Logs & Audit file is modified by this PR.**

### Workflow 16 - Buyer Notification Intent Triggering

**Purpose:** emit notification intent at appropriate Job / Item lifecycle events; defer delivery to Notification Platform.

**Steps (architectural):**

1. On terminal Job status (`completed`, `completed_with_errors`, `failed`, `canceled`, `expired`, permanent `blocked`): emit notification intent for buyer (and admin for `admin_on_behalf` Jobs).
2. On throttled or queued Job (for large bulk Jobs): emit progress notification intent per business policy.
3. On file generation: emit file-ready notification intent for buyer.
4. On retry-available failed Item: emit retry-available notification intent for buyer per business policy.
5. Notification Platform consumes the intent; Notification Platform owns recipient resolution, templates, delivery, retry, suppression, history.
6. Concrete notification surfaces are future Notification Platform coordination.

**Outputs:** Notification intent emitted.

**Boundary:** Product Catalog emits notification intent only; Notification Platform owns delivery. **No Notification Platform file is modified by this PR.**

---

### Workflow inventory summary

- Existing Product Catalog baseline workflows: preserved (including Buyer Product Activation / Download / Export Workflow, Buyer Selling Status Workflow, Accessory Details Buyer Action Workflow, Catalog-Carried Pricing Input Handoff, all other baseline).
- **PR additive numbered workflows: 16** (Workflows 1 through 16 above).

### Workflows intentionally NOT introduced

- Concrete approval UI / queue UI / progress UI workflows. Future UX / UI.
- Concrete API endpoint workflows. Future API Governance Foundation PR + Product-Catalog-specific OpenAPI hardening PR.
- Concrete queue technology / persistence / fairness algorithm. Implementation.
- Concrete notification template / recipient resolution. Future Notification Platform coordination.
- Concrete buyer-scoped compatibility projection workflow. Next PR.
- Concrete My Devices add / remove sync workflow. Next PR.
- Concrete capability propagation latency. Implementation; existing PR #103 Workflow 12 discipline applies as architectural pattern.
- Concrete anomaly detection for throttle / retry / cancel patterns. Future implementation.
- Concrete cancel-after-processing grace window timing. Open business decision.
- Concrete admin-on-behalf consent UI / approval queue. Future UI.

### Workflow boundary discipline (this Foundation)

- All 16 workflows are owned by Product Catalog.
- All 16 workflows respect Tenant Company `check_access` as the canonical authority surface.
- All 16 workflows respect Integration Management as the owner of transport outcomes.
- All 16 workflows respect Logs & Audit as the owner of evidence persistence.
- All 16 workflows respect Device Catalog as the owner of My Devices source records and Device References, and Product Catalog as the owner of the buyer-scoped compatibility projection derived from My Devices. The Buyer-Scoped Compatibility Projection and My Devices Sync Foundation populates `compatibility_projection_reference_at_snapshot`; in-flight Jobs continue against the bound projection, and retry / reprocess creates a new Job / Snapshot with the then-current projection. Runtime recalculation implementation remains deferred.
- All 16 workflows respect Notification Platform as the owner of delivery.
- All 16 workflows respect Analytics as the owner of BI / reporting; export history is NOT a BI dashboard.
- No workflow mutates Logs & Audit, Tenant Company, Integration Management, Device Catalog, or Notification Platform records.
- No workflow uses `audit_export.*` capabilities (which govern compliance audit report exports per PR #103, NOT buyer product exports).
- No workflow assumes global compatibility should be exported by default.
- No workflow creates cross-buyer activation state.

### Cleanup wording reaffirmed

`Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.`

This wording is operationalized in Workflows 7 (Integration Dispatch Handoff), 9 (Item-Level Export Outcome Recording), and 10 (Product Activation / Buyer Catalog Mapping Update). Product Catalog's authority to record a failed Item status after receiving a dispatch failure reference is explicit and locked.

## Buyer-Scoped Compatibility Projection Workflows

This section adds **12 numbered workflows** (Workflows 4 through 15) for the Product Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. Workflows 1-3 (My Devices Device Added / Removed / Updated-Deactivated-Superseded) live in `modules/device-catalog/workflows.md`. Total architectural workflows for this Foundation: 15. All existing Product Catalog baseline workflows (including PR #104's 16 numbered workflows and earlier baseline) are preserved without modification.

### Core boundary wording (locked verbatim where workflow-relevant)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

This wording is operationalized in Workflows 4 (Buyer-Scoped Compatibility Projection Recalculation), 9 (Export Selection Snapshot Compatibility Binding), 10 (In-Flight Export Job Compatibility Handling), and 12 (System Admin Buyer Context Compatibility Projection).

---

### Workflow 4 - Buyer-Scoped Compatibility Projection Recalculation

**Purpose:** compute a new Buyer-Scoped Compatibility Projection in response to a Device Catalog portfolio change, a vendor-side compatibility mapping change, or an explicit refresh request.

**Steps (architectural):**

1. Receive trigger:
   - Device Catalog event `device-catalog.my-devices.portfolio-changed` (any `change_type`).
   - Vendor-side compatibility mapping change (existing Product Catalog event surface).
   - Explicit refresh request from buyer / admin / service identity (subject to Tenant Company `check_access`).
2. Validate authority via Tenant Company `check_access` for explicit requests. **Do NOT use `audit_export.*` capabilities.**
3. Emit `product-catalog.buyer-compatibility-projection.recalculation-requested` with `triggering_*` references.
4. Apply duplicate / idempotency policy: if a recalculation is already `recalculating` for the same buyer-scope triad and triggering reference, return the existing recalculation (idempotent).
5. Mark the prior `current` projection (if any) as `superseded` via status transition.
6. Create a new Buyer-Scoped Compatibility Projection at `projection_status = recalculating` with buyer-scope triad inherited from the trigger.
7. Emit `product-catalog.buyer-compatibility-projection.status-changed` with `projection_status = recalculating`.
8. Fetch:
   - Buyer Device Portfolio Snapshot via `buyer_device_portfolio_snapshot_reference` from Device Catalog.
   - Vendor-owned compatibility mapping version (current).
   - Visibility projection per Tenant / Product Catalog visibility rules.
9. Compute the new `compatible_accessory_references`:
   - For each accessory in the catalog visible to this buyer per Tenant / Product Catalog rules: include if compatible with at least one active device in the portfolio snapshot.
   - Populate `excluded_accessory_reason_summary` with counts by exclusion reason (`not_compatible_with_any_active_device`, `lifecycle_blocked`, `visibility_denied`, `sales_channel_excluded`).
10. On success: transition projection to `current`. Populate `prior_projection_reference` to chain evidence.
11. On failure: transition projection to `failed`. Record failure reason; consumers see `review_required` impact on previously-Selling accessories per Workflow 15.
12. If portfolio change confidence is uncertain (e.g., bulk admin-on-behalf change): transition to `review_required` instead of `current`.
13. Emit `projection.status-changed` with `projection_status = current` / `failed` / `review_required`.
14. Hand off to Workflow 5 (Buyer Accessory Visibility Refresh), Workflow 6 (Buyer Catalog Mapping Compatibility Impact Evaluation), and Workflow 13 (Projection Evidence Recording).

**Outputs:** new Buyer-Scoped Compatibility Projection at terminal-equivalent status; `prior_projection_reference` chain preserved.

**Boundary:** **Product Catalog owns projection recalculation; Device Catalog owns the portfolio snapshot the recalculation consumes.**

### Workflow 5 - Buyer Accessory Visibility Refresh

**Purpose:** refresh the per-accessory visibility set derived from the new projection.

**Steps (architectural):**

1. Triggered after Workflow 4 transitions projection to `current` (or `review_required`).
2. For each accessory the buyer was previously visible-for: compare prior vs current `compatible_accessory_references`.
3. Determine per-accessory `visibility_status` (one of 5 values: `now_visible`, `no_longer_visible`, `still_visible_compatibility_narrowed`, `still_visible_compatibility_expanded`, `still_visible_unchanged`).
4. Update Buyer Accessory Visibility Projection sub-structure with the four reference sets (active addable; accessory added; selling with warning; hidden from active addable).
5. Emit `product-catalog.buyer-accessory-visibility.changed` per accessory with appropriate `visibility_status` discriminator (subject to implementation batching; high-volume changes may be emitted as a batch event sequence).
6. Hand off to Workflow 7 (Add Accessory Eligibility After My Devices Change) and Workflow 6 (Catalog Mapping Impact).

**Outputs:** updated Buyer Accessory Visibility Projection; per-accessory visibility events.

**Boundary:** Product Catalog owns visibility decisions per buyer-scope triad.

### Workflow 6 - Buyer Catalog Mapping Compatibility Impact Evaluation

**Purpose:** produce Buyer Accessory Compatibility Impact Records for accessories the buyer has ALREADY activated (Accessory Added, Selling, or with a Buyer Product Export Record) that are affected by the projection change.

**Steps (architectural):**

1. Triggered after Workflow 4 completes recalculation.
2. For each buyer catalog mapping / activation record with buyer-scope triad matching the projection:
   a. Compute `active_compatible_device_count` against the new projection.
   b. Determine `impact_state` (one of 7 values).
   c. If `impact_state != unaffected`: create a Buyer Accessory Compatibility Impact Record with the triggering portfolio change record reference, prior + current projection references, `impact_state`, `affected_buyer_relationship_state`, `recommended_buyer_action`.
3. Update the buyer catalog mapping / activation record's `current_compatibility_impact_state` and `latest_buyer_accessory_compatibility_impact_record_reference`.
4. Emit `product-catalog.buyer-accessory-compatibility-impact.recorded` per impact record with appropriate `impact_state` discriminator.
5. **Do NOT auto-transition Selling state to Stop Selling.** Compatibility impact is flagged via the impact record; commercial state remains governed by existing Buyer Selling Status rules.
6. Hand off to Workflow 8 (Accessory Added / Selling Compatibility Impact Review) and Workflow 14 (Notification Intent for Compatibility Impact).

**Outputs:** Buyer Accessory Compatibility Impact Records; updated buyer catalog mapping fields.

**Boundary:** Product Catalog owns impact decisions; Device Catalog owns the portfolio change that triggered the impact.

### Workflow 7 - Add Accessory Eligibility After My Devices Change

**Purpose:** apply the projection's `compatible_accessory_references` as the compatibility-eligibility gate AHEAD of the PR #104 canonical Add Accessory / Accessory Added rule.

**Steps (architectural):**

1. Triggered when Add Accessory eligibility is evaluated for any accessory (UI surface, Selection Snapshot creation, etc.).
2. Check whether the accessory's `product_reference` is in the buyer's CURRENT projection `compatible_accessory_references`.
3. If YES: Add Accessory is offered; PR #104 canonical rule continues to govern terminal `activated`-driven Accessory Added transition.
4. If NO: Add Accessory is NOT offered for that accessory in the active addable list. The accessory may still appear in the buyer's portfolio / review view if previously activated (Workflow 8 governs).

**Outputs:** per-accessory Add Accessory eligibility decision.

**Boundary:** PR #104 canonical Add Accessory / Accessory Added rule preserved verbatim; this workflow adds a compatibility-eligibility gate ahead of it.

### Workflow 8 - Accessory Added / Selling Compatibility Impact Review

**Purpose:** surface Buyer Accessory Compatibility Impact Records to buyer / admin for review and acknowledgment.

**Steps (architectural):**

1. Buyer / admin views the impact review surface (data-level signal: `current_compatibility_impact_state` on activation / catalog mapping; `latest_buyer_accessory_compatibility_impact_record_reference`).
2. For impact records at `impact_state in (no_longer_compatible, review_required, hidden_from_active_addable_list, compatibility_narrowed)`: buyer / admin may take recommended action (`review`, `stop_selling_recommended`, `acknowledge`, `manual_remap_required`).
3. If buyer chooses Stop Selling: existing Buyer Selling Status workflow governs the Stop Selling transition (NOT triggered automatically by this PR).
4. If buyer acknowledges without action: update impact record `acknowledged_flag = true`, `acknowledged_timestamp`, `acknowledged_actor_reference`.
5. Admin acknowledgment per Tenant Company act-on-behalf authority. **Open business decision:** explicit buyer consent for admin acknowledgment (default per PR #103: act-on-behalf sufficient).
6. **Existing PR #104 Add Accessory / Accessory Added rule preserved:** Accessory Added history is NOT erased; Selling state is NOT auto-transitioned.

**Outputs:** acknowledged impact records; buyer / admin actions logged.

**Boundary:** existing Buyer Selling Status rules continue to govern commercial state transitions.

### Workflow 9 - Export Selection Snapshot Compatibility Binding

**Purpose:** extend PR #104 Workflow 2 (Export Selection Snapshot) to populate `compatibility_projection_reference_at_snapshot` at Job creation.

**Steps (architectural):**

1. Triggered during PR #104 Workflow 2 (Export Selection Snapshot).
2. Resolve the buyer's CURRENT Buyer-Scoped Compatibility Projection (where `projection_status = current` for the buyer-scope triad). If no `current` projection exists, recalculate via Workflow 4 first, then proceed.
3. Populate `compatibility_projection_reference_at_snapshot` on the Selection Snapshot (REQUIRED).
4. Populate `compatible_device_references_at_snapshot` from the projection's bound Buyer Device Portfolio Snapshot's `active_device_references`.
5. Emit `product-catalog.buyer-export-selection.compatibility-snapshot-recorded`.
6. PR #104 Workflow 2 continues with eligible product ID freezing per existing rules.
7. Subsequent PR #104 Workflow 3 (Export Eligibility Validation) consumes the bound projection: Items whose `product_reference` is not in `compatible_accessory_references` of the bound projection terminate at `ineligible` with `error_kind = compatibility_mismatch` (the new error_kind added by this PR; distinct from `eligibility`, `dispatch`, `integration_transport`, `item_validation`, `buyer_authority`, `system`).

**Outputs:** Selection Snapshot with compatibility projection bound; `compatible_device_references_at_snapshot` populated; downstream Items that fail compatibility carry `error_kind = compatibility_mismatch`.

**Boundary:** **Product Catalog owns the binding; Device Catalog owns the portfolio snapshot the binding references.** Boundary wording: `Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Workflow 10 - In-Flight Export Job Compatibility Handling

**Purpose:** document and lock the in-flight Job's immutability with respect to My Devices changes after Job creation. PR #104 snapshot semantics central enough to require explicit workflow treatment.

**Steps (architectural):**

1. A PR #104 Buyer Product Export Job is at non-terminal status (`queued`, `validating`, `snapshotting`, `batching`, `throttled`, `processing`, `retry_scheduled`).
2. A My Devices portfolio change occurs for the same buyer-scope triad (Workflow 1, 2, or 3 in Device Catalog).
3. Product Catalog recalculates projection per Workflow 4.
4. **The in-flight Job continues using the `compatibility_projection_reference_at_snapshot` bound at Job creation.** The Job's Selection Snapshot is IMMUTABLE.
5. The Job's Items are evaluated against the bound projection, NOT the new projection.
6. Items already at terminal status remain terminal.
7. Items in flight continue per their existing Item status.
8. UI MAY surface an informational warning that My Devices changed after Job creation (future UX); the Job itself is NOT mutated.
9. To use the new projection: buyer / admin / service identity must initiate retry / reprocess per PR #104 trigger kinds; this creates a NEW Job with a NEW Selection Snapshot binding the new projection.

**Outputs:** in-flight Job continues on bound snapshot; new Jobs use updated projection.

**Boundary:** **PR #104 snapshot semantics preserved.** `Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.` In-flight immutability is locked.

### Workflow 11 - No Active My Devices Empty State

**Purpose:** document the empty-portfolio state behavior.

**Steps (architectural):**

1. Buyer has zero active devices in their portfolio (e.g., new buyer; buyer removed all devices).
2. Projection recalculation per Workflow 4 produces a VALID projection at `projection_status = current` with empty `compatible_accessory_references`.
3. Buyer Accessory Visibility Projection's `active_addable_accessory_references` is empty.
4. Accessory List shows empty state (data-level signal; UI surface is future UX).
5. PR #104 export Job creation MAY proceed; Selection Snapshot binds the empty projection; Items are zero (PR #104 supports zero-Item Jobs).
6. The buyer has not encountered an error condition; the projection accurately reflects the empty portfolio.

**Outputs:** valid empty projection; empty visibility set.

**Boundary:** empty portfolio is a normal state, not an error.

### Workflow 12 - System Admin Buyer Context Compatibility Projection

**Purpose:** document that admin impersonation via System Admin Buyer Context sees the SELECTED BUYER's projection, not a global view.

**Steps (architectural):**

1. Admin selects a buyer context via existing System Admin Buyer Context surface (existing pre-PR-#104 baseline).
2. Admin views projection / impact / visibility surfaces.
3. **Product Catalog presents the SELECTED BUYER's projection** (keyed on the selected buyer's buyer-scope triad), NOT a global view.
4. Admin actions performed in the context are logged via existing Logs & Audit Audit Access Record discipline with the admin actor reference AND the selected buyer's scope.
5. Admin MUST NOT see another buyer's projection by virtue of being in admin role; the buyer-scope triad still gates the view.

**Outputs:** admin sees the selected buyer's projection; access logged.

**Boundary:** **No global projection view exists.** `Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Workflow 13 - Projection Evidence Recording

**Purpose:** emit Logs & Audit Evidence Records for projection / impact / visibility lifecycle events.

**Steps (architectural):**

1. For every Buyer-Scoped Compatibility Projection creation, status transition, and supersession: emit Evidence Record via existing `service_identity.evidence_emit` discipline.
2. For every Buyer Accessory Compatibility Impact Record creation and acknowledgment: emit Evidence Record.
3. For every Buyer Accessory Visibility Projection refresh: emit Evidence Record (where implementation discipline requires; high-volume refreshes may be summarized per implementation).
4. Evidence kinds: `buyer_compatibility_projection`, `buyer_compatibility_impact` (Device Catalog side emits `buyer_device_portfolio_snapshot` and `buyer_device_portfolio_change` via its own evidence-emit; see Device Catalog workflows).
5. Logs & Audit indexes Evidence Records per existing PR-A discipline.
6. Logs & Audit applies retention, redaction, legal hold per existing PR-D discipline.
7. Audit access to evidence is logged per existing PR-D hardened Audit Access Record discipline.

**Outputs:** Evidence Records emitted; Logs & Audit indexed.

**Boundary:** Product Catalog emits evidence references only; Logs & Audit owns persistence and governance. **No Logs & Audit file is modified by this PR.**

### Workflow 14 - Notification Intent for Compatibility Impact

**Purpose:** emit notification intent at appropriate compatibility-impact lifecycle events; defer delivery to Notification Platform.

**Steps (architectural):**

1. On Buyer Accessory Compatibility Impact Record creation with `impact_state in (no_longer_compatible, review_required, hidden_from_active_addable_list)`: emit notification intent for buyer.
2. On projection `failed` status: emit notification intent for buyer (or admin per business policy).
3. On projection `review_required` status from admin-on-behalf change: emit notification intent for buyer per business policy.
4. Notification Platform consumes the intent; Notification Platform owns recipient resolution, templates, delivery, retry, suppression, history.
5. Concrete notification surfaces (impact-acknowledgment-required, projection-failed, recalculation-completed, etc.) are future Notification Platform coordination.

**Outputs:** notification intent emitted.

**Boundary:** Product Catalog emits notification intent only; Notification Platform owns delivery. **No Notification Platform file is modified by this PR.**

### Workflow 15 - Projection Failure / Review Required

**Purpose:** govern projection failure and review-required handling.

**Steps (architectural):**

1. Projection recalculation fails (Workflow 4 step 11) or routes to `review_required` (step 12).
2. Projection transitions to `failed` or `review_required`; emit `projection.status-changed` with appropriate discriminator.
3. The prior `current` projection remains valid for consumers as a fallback (existing baseline; consumers may use stale projection with a `stale` indicator).
4. For previously-Selling accessories: Buyer Accessory Compatibility Impact Records are produced with `impact_state = review_required` to surface the unresolved state.
5. Notification intent emitted per Workflow 14.
6. Recovery: on next valid recalculation trigger (per Workflow 4), projection transitions back to `current` (or `failed` again if recovery fails).
7. Implementation owns retry / backoff strategy (consistent with PR #104 named-policy pattern; concrete numerics not locked here).

**Outputs:** projection state surfaced; consumers handle defensively; recovery available on next trigger.

**Boundary:** Product Catalog owns projection state; Tenant policy may dictate stale-projection tolerance for consumers (open business decision).

---

### Workflow inventory summary (Product Catalog side)

- Existing Product Catalog baseline workflows: preserved (including PR #104's 16 workflows and earlier baseline).
- **PR additive numbered workflows: 12** (Workflows 4 through 15 above).
- Device Catalog side adds Workflows 1-3 (documented in `modules/device-catalog/workflows.md`).
- **Total architectural workflows for this Foundation: 15.**

### Workflows intentionally NOT introduced (Product Catalog side)

- Concrete recalculation queue / fairness / dedupe / batching algorithm. Implementation.
- Concrete projection-stale tolerance behavior. Implementation + open business decision.
- Concrete idempotency / retry behavior for failed recalculations. Implementation.
- Concrete admin / buyer impact-review UI workflow. Future UX.
- Concrete notification template / delivery surface workflow. Future Notification Platform coordination.
- Concrete System Admin Buyer Context projection-view UI workflow. Future UX.
- Concrete API endpoint workflows for projection retrieval / refresh / impact acknowledgment. Future API.
- Automatic Stop Selling on device removal workflow. NOT introduced; locked default.
- Accessory-to-accessory compatibility workflow. Future phase.
- AI-Agent-initiated My Devices change workflow. Future PR when module exists.

### Workflow boundary discipline (this Foundation; Product Catalog side)

- All 12 Product Catalog workflows are owned by Product Catalog.
- All 12 workflows respect Tenant Company `check_access` as the canonical authority surface.
- All 12 workflows respect Device Catalog as the owner of canonical Device records, Device References, and My Devices source / portfolio change records.
- All 12 workflows respect Logs & Audit as the owner of evidence persistence.
- All 12 workflows respect Notification Platform as the owner of delivery.
- All 12 workflows respect Analytics as the owner of BI / reporting; projection / impact history is NOT a BI dashboard.
- No workflow mutates Device Catalog, Logs & Audit, Tenant Company, Integration Management, Notification Platform records.
- No workflow uses `audit_export.*` capabilities.
- No workflow creates cross-buyer projection or impact state.
- No workflow auto-transitions Selling state to Stop Selling.
- No workflow mutates historical Buyer Product Export Records, orders, returns, invoices, audit evidence.

### Cleanup wording reaffirmed

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`
