# Product Catalog Module Specification

This document is proposal-level architecture. It hardens Product Catalog behavior for accessory lifecycle, availability, release/launch timing, variants, buyer visibility, buyer selling status, exports, notifications, and governance without moving neighboring module ownership into Product Catalog.

## Purpose

Product Catalog governs how accessory products are created, maintained, validated, displayed, updated, distributed, and controlled inside the CIXCI platform.

The module owns the CIXCI platform product record and the catalog state needed for buyers to review, export, activate, stop selling, and safely distribute accessory product data. It is more than a product list: it is the governed catalog source for accepted accessory product facts, validation state, lifecycle state, publication/visibility state, buyer relationship state, and distribution history.

Product Catalog aligns with ADR-0007. Product Catalog remains accessory-first while supporting controlled Product Type and variant extensibility.

## Vendor Authority And Product Catalog Ownership

Accessory vendors are authoritative for vendor-submitted accessory facts where those facts are accepted by Product Catalog governance.

Vendor-submitted facts may include accessory name, SKU, UPC, product category, brand, color, variant attributes, product descriptions, catalog-carried pricing inputs, availability/inventory inputs, compatibility assertions, media assignment suggestions, lifecycle signals, availability signals, release date, launch date, and end-of-life date.

Product Catalog owns:

- CIXCI platform product records.
- Product identity, identifier namespace, and vendor SKU mapping governance.
- Validation state and correction/review state.
- Lifecycle state.
- Publication and catalog visibility state.
- Buyer activation/download and buyer-product relationship state.
- Catalog-carried pricing input records and Pricing handoff references.
- Product media/content attachment references, while Media owns asset processing.
- Compatibility assertions to Device Catalog-owned Device References.
- Catalog change history and source state.
- Export/download records for catalog product exports.

Product Catalog validates, normalizes, governs, versions, and distributes accepted product data.

Product Catalog does not own Pricing calculations, Media processing, canonical Device Catalog records, Notification delivery, Integration delivery/transport evidence, Procurement purchase orders, Launch/Event coordination, Order Routing decisions, Fulfillment/Returns execution, Invoice lifecycle, Warranty claim decisions, Tenant Company eligibility/permissions, Analytics metrics, Logs & Audit evidence records, AI recommendations, or full Inventory Management.

## Scope

In scope:

- Accessory catalog ingestion through API-first workflows with CSV fallback.
- Product records, variants, identifiers, vendor identities, taxonomy, Product Type, and structured attributes.
- Lifecycle state, availability state, release/launch facts, EOL facts, archival behavior, and catalog visibility.
- EOL policy signals, catalog sell-through policy references, catalog visibility/downloadability dispositions, buyer selling status dispositions, and downstream disposition references.
- Availability evidence records for catalog display and eligibility signals without inventory ledger ownership.
- Launch/customer-facing eligibility evidence records that consume source-owned readiness signals.
- Buyer product activation/download, buyer export/download timestamps, export baseline records, buyer selling status, Latest Accessories behavior, and buyer-facing derived status.
- Compatibility mappings to Device References, including Add, Replace, and Remove import governance.
- Catalog-carried pricing inputs and Pricing handoff references.
- Product media/content attachment references and Media evidence references.
- Sales channel eligibility, retail eligibility, and buyer filters.
- Catalog notification-triggering events and integration/export/update signals.
- System Admin oversight of catalog health.
- AI-ready catalog events and audit-ready change records.
- Import/export behavior aligned with `architecture/standards/import-export-validation-governance.md`.

Out of scope:

- Final buyer-specific price, discounts, quotes, pricing exceptions, pricing snapshots, or commercial precedence.
- Binary media storage, transformations, renditions, URL generation, CDN/cache, and media rights workflow.
- Canonical Device identity, lifecycle, normalization, and buyer device portfolio source records.
- Notification recipient resolution, templates, preferences, retries, and delivery history.
- External API, CSV, SFTP, webhook, or buyer-system transport evidence.
- PO creation, PO approval, PO submission, PO lifecycle, or receiving.
- Launch readiness orchestration and event calendar ownership.
- Full inventory ledger, warehouse stock ownership, or fulfillment execution.
- Downstream Order Routing, Procurement, Fulfillment/Returns, Invoice Management, or buyer storefront execution decisions.

## Accessory Record Structure

Accessory product records should support structured data sufficient for validation, search, filtering, export, synchronization, analytics, and downstream references.

Proposal-level fields include:

- Vendor reference.
- Brand.
- Product Type.
- Accessory name.
- Product master / product / variant references.
- SKU and UPC as text identifiers.
- Product category and subcategory.
- Vendor color and normalized System Color values.
- Variant attributes such as size, material, packaging, model, connector, or other category attributes.
- Device compatibility references.
- Catalog-carried pricing inputs such as Vendor Wholesale Price, SRP/MSRP, MAP, and Sale Price where applicable.
- Availability/inventory input evidence.
- Lifecycle state and availability state.
- Release Date, Launch Date, EOL Date.
- Media/content attachment references.
- Warranty information reference.
- Return rules reference.
- Shipping eligibility reference or flag.
- Sales channel eligibility including Retail eligibility where configured.
- Created date, last updated date, source version, and audit reference.

## Lifecycle State Model

Lifecycle state describes where the accessory is in its product journey. It is separate from availability, publication, visibility, buyer selling status, and downstream routability.

Proposal-level lifecycle states:

- Inactive.
- Active.
- End of Life.
- Archived.
- Review Required placeholder.

Lifecycle state does not by itself mean buyer-visible, downloadable, sellable, priced, routable, or fulfillable.

Active does not automatically mean sellable. Sellability depends on lifecycle, availability, buyer eligibility, buyer selling status, pricing readiness, compatibility, sales channel eligibility, media readiness, launch/customer-facing eligibility, and integration/export state.

Archived records remain available for order, return, invoice, reporting, and audit traceability. Archived does not mean deleted, and records referenced by orders, returns, invoices, exports, reports, or audit records should not be physically deleted.

## Availability State Model

Availability describes whether the accessory can currently be sold or fulfilled. Availability is separate from lifecycle.

Proposal-level availability states:

- In Stock.
- Low Stock.
- Out of Stock.
- Backorder Available.
- Temporarily Unavailable.

Availability is vendor-provided or catalog availability evidence unless a future Inventory Management context is introduced. Product Catalog may own catalog availability status at proposal level, but it does not own a full inventory ledger, warehouse stock, allocation, fulfillment execution, or replenishment ownership.

Product Catalog should preserve an availability evidence record with source module/system, source timestamp, received timestamp, freshness/expiration timestamps, quantity basis, quantity source reference, threshold source reference, source disposition, stale or missing state, display-only flag, sellability-affecting flag, backorder-eligible flag, advisory-only flag, review-required state, supersession reference, and audit reference.

Availability evidence may affect catalog display and Product Catalog eligibility signals. Downstream modules decide their own operational behavior using consumed catalog evidence and their own module rules.

Out of Stock is not a lifecycle state. Back in Stock and Low Stock should emit downstream events/signals where relevant.

## Release Date Versus Launch Date

Product Catalog should store product-level Release Date and Launch Date facts where supplied and accepted by Product Catalog governance.

Release Date controls when eligible buyers may see and review product data inside CIXCI. On or after Release Date, Product Catalog may make the product visible to eligible buyers where Tenant Company eligibility, Product Catalog visibility, compatibility, channel, and review rules allow.

Launch Date controls when the product may become customer-facing or sellable where Product Catalog rules, source-owned readiness evidence, buyer eligibility, availability, pricing readiness, media readiness, channel eligibility, and review state allow.

Product Catalog should preserve launch/customer-facing eligibility evidence before treating a product as customer-facing eligible. Proposal-level evidence includes authority module, source readiness signal id, source readiness signal version/hash, pricing readiness reference, media readiness reference, Tenant Company eligibility/channel scope reference, compatibility readiness reference, availability readiness reference, Product Catalog review state reference, Launch/Event reference where applicable, freshness timestamp, expiration timestamp, stale signal state, missing signal state, waiver/override flag, waiver approver, waiver reason, recheck-before-launch flag, customer-facing eligibility disposition, review-required state, and audit reference.

Product Catalog may coordinate customer-facing eligibility for product catalog purposes, but it must consume source-owned readiness evidence. Product Catalog must not independently decide Pricing readiness, Media readiness, Tenant Company eligibility, channel eligibility, or Launch/Event readiness. Missing, stale, conflicting, or expired readiness evidence routes launch/customer-facing eligibility to review.

Launch / Event Management coordinates launch readiness and calendar events but does not own Product Catalog product lifecycle, product visibility, product publishing, or product availability facts. Launch Date alone does not make a product customer-facing sellable. Launch Date may trigger lifecycle/publication transitions only when Product Catalog rules, source-owned readiness evidence, and review state allow. Conflicts between Launch/Event records and Product Catalog facts should route to review.

## Inactive Accessory Flow

Proposal-level flow:

1. Inactive / Hidden.
2. Released to eligible buyers.
3. Active / customer-facing eligible.

Before Release Date, the product may exist for vendor and System Admin review but remain hidden from buyers and blocked from export.

On Release Date, eligible buyers may review product data inside CIXCI where rules allow. Buyers may prepare catalog setup. Export before launch is configurable and proposal-level.

On Launch Date, customer-facing display and selling may become eligible where lifecycle, availability, buyer eligibility, buyer selling status, pricing readiness, compatibility, media readiness, sales channel eligibility, launch eligibility evidence, and integration/export state allow.

## End Of Life And Archival Behavior

End of Life requires an EOL Date.

Proposal-level EOL sell-through options:

- Stop selling on EOL Date.
- Allow sell-through until inventory is depleted.
- Stop new downloads but allow existing buyers to continue selling.
- Stop all buyer ordering on EOL Date.

Product Catalog owns catalog lifecycle state, EOL Date, catalog sell-through policy reference, affected buyer-product relationship references, catalog visibility disposition, catalog downloadability disposition, buyer selling status disposition, Product Catalog events/signals, review-required state, supersession reference, and audit-ready catalog change history.

Product Catalog does not directly enforce Order Routing, Procurement, Fulfillment/Returns, Invoice Management, buyer integration transport, or buyer storefront execution. Product Catalog may block new catalog downloads or buyer-product activation where Product Catalog rules allow, and it may emit EOL policy signals for downstream consumers.

Downstream modules consume Product Catalog EOL/sell-through signals and record their own module-specific disposition. Proposal-level downstream references include order-routing disposition reference, procurement disposition reference, fulfillment disposition reference, invoice disposition reference, integration update disposition reference, downstream consumer acknowledgement placeholder, review-required state, supersession reference, and audit reference.

Order Routing decides whether new customer orders are routable based on its own rules and consumed catalog evidence. Procurement decides whether POs are allowed based on its own rules and consumed catalog evidence. Fulfillment/Returns decides operational execution based on its own rules and consumed catalog evidence. Invoice Management decides invoice eligibility based on its own rules and consumed evidence. Integration Management owns delivery/transport evidence for buyer updates.

Archived products should be removed from new buyer discovery and selling workflows where Product Catalog rules require it, but remain available for order history, return history, invoice reports, audit, vendor historical catalog, buyer historical selling records, and analytics.

## Color And Variant Handling

Colors and other buyer filters should be structured, not stored only as comma-separated text.

Product Catalog should support:

- Vendor Color values.
- Normalized System Color values for filtering and reporting.
- Structured multi-value colors where a product legitimately has multiple colors.
- Product and variant attribute sets aligned with ADR-0007.

Variant-level records are required where SKU, UPC, inventory/availability, image, price input, material, packaging, model, compatibility, or sellable behavior differs.

Variant-specific images should map to the correct variant SKU or variant id. Media / Image Asset Management may provide mapping evidence; Product Catalog owns final product-media attachment acceptance.

## Device Compatibility Governance

Product Catalog owns accessory-to-Device Reference compatibility assertions. Device Catalog owns canonical Device References and device facts.

Compatibility imports should align with `architecture/standards/import-export-validation-governance.md`.

Proposal-level compatibility modes:

- Add mode is default and non-destructive.
- Replace mode requires explicit selection, preview warning, confirmation, and audit evidence.
- Selective Remove mode requires explicit selection, preview warning, confirmation, and audit evidence.

Compatibility must validate referenced Device References exist and should route missing, stale, superseded, ambiguous, or conflicting Device References to review. Compatibility changes must be audit-ready and should not mutate Device Catalog records.

## Buyer Device Portfolio Impact

Buyer product visibility may consider buyer device portfolio compatibility.

Tenant Company owns buyer eligibility, relationship scope, permissions, region, Product Type enablement, licensed-property scope, and readiness signals. Device Catalog owns buyer device portfolio references where applicable. Product Catalog consumes those references for catalog visibility, filtering, and buyer-facing readiness behavior.

Product Catalog must not infer Tenant Company eligibility.

## Buyer Product Download / Export Tracking

Product Catalog should track buyer product download/export activity for catalog exports.

Proposal-level fields:

- Buyer reference.
- Parent/child entity scope.
- User or service actor.
- Export/download timestamp.
- Last successful export timestamp.
- Export method.
- Exported product references and source versions.
- Export status.
- Redaction class and audit reference.

Latest Accessories filter behavior should use an export baseline record, not only a timestamp. Proposal-level baseline evidence includes export schema version, export filter scope, Product Type scope, buyer/entity scope, visibility/access projection reference, included product references, excluded product reason summary, partial export state, delivery failed state, revoked export state, superseded export state, applicable-for-Latest-Accessories flag, baseline advanced timestamp, baseline source export reference, and audit reference.

Latest Accessories should advance only after a successful, applicable product catalog export/download baseline. Partial, failed, revoked, superseded, or restricted-scope exports may not advance the baseline unless Product Catalog rules explicitly allow it. If a buyer has never had an applicable successful export, Latest Accessories should be disabled or unavailable.

## Buyer Selling Status

Buyer Selling Status is tracked per buyer-product relationship and does not overwrite vendor-submitted lifecycle or availability facts.

Proposal-level states:

- Not Selling.
- Selling.
- Stop Selling.

Stop Selling applies only to the buyer-product relationship. It preserves order history, return history, reporting history, and audit traceability. Product Catalog may emit update/export signals for buyer systems where configured; Integration Management owns delivery/transport evidence.

## Accessory Details Buyer Actions

Accessory Details actions should be permission-based and company-configuration-based.

Proposal-level actions:

- Export/download product.
- Add to selling catalog.
- Stop selling.
- Create purchase order.
- Add to existing purchase order.
- View compatibility.
- View media.
- View Pricing-provided buyer-facing price/snapshot reference where authorized.
- View availability.
- View lifecycle.

Procurement owns PO creation and PO lifecycle. Product Catalog may expose PO action entry points only when buyer/company configuration allows. Tenant Company owns permissions and company configuration inputs.

## Retail / Sales Channel Eligibility

Product Catalog should support sales channel eligibility fields or scopes, including Retail eligibility where configured by the vendor and accepted by Product Catalog governance.

Tenant Company owns buyer channel eligibility. Product Catalog owns product channel flags where accepted. Buyer filters may include retail-eligible products where relevant.

## Buyer-Facing Derived Status

Buyer-facing accessory/product status is a derived/projection status, not a source status.

It should consider lifecycle, availability, release/launch dates, EOL, buyer eligibility, buyer selling status, device compatibility, sales channel eligibility, pricing readiness, media readiness, export/sync state, launch eligibility evidence, availability evidence, EOL disposition, and export baseline state.

Derived buyer-facing status should prevent a product from appearing simply as Active when it is out of stock, not launched for customer-facing display, not approved for the buyer/channel, missing pricing evidence, missing media readiness, missing or stale readiness evidence, or blocked by review.

## Catalog Notifications And Integration Updates

Product Catalog emits Product Catalog events/signals and notification-triggering events. Notification Platform Service owns delivery.

Product Catalog emits integration/export/update signals. Integration Management owns buyer system delivery/transport evidence and update disposition references.

Product Catalog should not own notification delivery, recipient resolution, retry, delivery status, external API delivery, CSV/SFTP/manual transport, provider failures, external system references, or buyer storefront execution.

## System Admin Oversight

Product Catalog should expose System Admin oversight concepts for:

- Lifecycle health.
- Availability health and stale/missing availability evidence.
- Released but not launched products.
- Launch eligibility evidence gaps.
- EOL and archived products.
- EOL downstream disposition gaps.
- Missing compatibility.
- Missing media.
- Invalid pricing input/evidence.
- Buyer visibility issues.
- Vendor import issues.
- Catalog sync failures.
- Buyer export/download history and Latest Accessories baseline state.

## Audit And AI-Ready Events

Product Catalog changes must produce audit-ready evidence. Logs & Audit owns audit evidence and file tracking. Product Catalog owns catalog change history and source state.

AI-ready catalog events should support future Catalog Cleanup Agent, Compatibility Agent, Pricing Validation Agent, Image Quality Agent, Recommendation Agent, Promotion Planning Agent, Buyer Opportunity Agent, and Fulfillment Exception Agent.

AI Agent Services may recommend or flag issues but must not mutate product records without approved action contracts and permissions.

## Import / Export / Validation Governance

Product Catalog imports and exports should follow `architecture/standards/import-export-validation-governance.md` for mode selection, create/update separation, update-only protection, blank field protection, required identifiers, header validation, locked fields, preview, errors/warnings, inline correction, downloadable error reports, import drafts, confirmation, non-destructive defaults, destructive controls, compatibility import governance, UPC/text preservation, date/time governance, audit evidence, user-facing summaries, and standard statuses.

## Boundary Clarification

- Product Catalog emits Product Catalog events/signals.
- Notification Platform Service delivers notifications.
- Integration Management transports updates and tracks delivery/receipt evidence.
- Logs & Audit owns immutable audit evidence.
- Pricing owns pricing readiness and pricing snapshots.
- Media / Image Asset Management owns media readiness.
- Tenant Company owns eligibility, permissions, and channel scope.
- Device Catalog owns Device References and buyer device portfolio source records where applicable.
- Launch / Event Management owns launch readiness coordination.
- Order Routing, Procurement, Fulfillment/Returns, and Invoice Management own their own downstream operational disposition.

## Open Decision Areas

- Whether a future Inventory Management context should own detailed inventory ledger, allocation, replenishment, or warehouse stock.
- Which Product Catalog availability states are vendor-submitted facts, Product Catalog governed status, or downstream projections.
- Exact Product Catalog lifecycle, publication, visibility, activation, and buyer selling status transitions.
- Exact EOL sell-through behavior and downstream consumer disposition contracts.
- Whether Release Date / Launch Date transitions are automated, manual, or coordinated with Launch / Event Management.
- Exact required source-owned readiness evidence for each launch/customer-facing eligibility transition.
- Exact buyer-facing derived status vocabulary.
- Exact retail/channel eligibility data model.
- Exact Latest Accessories export baseline advancement semantics.

## Buyer Product Export Job Foundation Specification

This section specifies the Product Catalog buyer product export job / batch / item / throttle foundation. All existing Product Catalog baseline concepts (Accessory Export Confirmation Record + Line, Buyer Product Export Record, Export Baseline Record, Buyer Product Relationship and Buyer Selling Status, Product Catalog Export Apply Disposition, Buyer Accessory Selection Set, Latest Accessories baseline, Sales Channel Eligibility, System Admin Buyer Context, existing accessory-discovery events, existing buyer-relationship and export events) are preserved without modification. All Logs & Audit PR-A through PR-E content is preserved by reference; no Logs & Audit file is modified. All Tenant Company PR #103 content is preserved by reference; no Tenant Company file is modified.

### Architectural disambiguation (locked)

- Buyer Product Export Job is the NEW orchestration parent entity.
- Buyer Product Export Job SITS ABOVE the existing Buyer Product Export Record.
- The existing Buyer Product Export Record REMAINS the per-buyer-per-product completed export / activation record.
- Buyer Product Export Job does NOT replace Buyer Product Export Record.
- Buyer Product Export Item produces per-product Buyer Product Export Record entries, or equivalent successful-item evidence, on terminal success.
- Existing references from Export Baseline Record, Buyer Product Relationship / Selling Status, Latest Accessories baseline, and Logs & Audit file / download evidence to the existing Buyer Product Export Record remain valid.
- Existing baseline entities are NOT renamed, deprecated, or version-bumped.

### Boundary wording (locked verbatim)

`Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.`

### Primary entities (3)

#### Buyer Product Export Job

The parent orchestration entity. One Job per export action, including individual Add Accessory clicks. Small exports may appear synchronous in UX but use the Job model under the hood; this avoids two code paths and eliminates the bypass failure mode.

Required scope: every Job carries `buyer_reference`, `company_scope_reference`, and `buyer_entity_reference` or equivalent buyer-scope key.

Carries: trigger_kind (one of 11 enumerated values); selection_snapshot_reference; job_status (one of 14); applied throttle policy references; idempotency_key; correlation_reference; trace_reference; audit_record_reference; optional buyer_product_export_file_reference (only when file artifact exists); optional integration_dispatch_reference; status_history_reference; result_summary_reference (populated on terminal); batch_references (populated when batched); error_summary_reference (populated when applicable).

#### Buyer Product Export Item

Item-level child of Buyer Product Export Job. Source of item-level success / failure. REQUIRED for per-accessory Add Accessory / Accessory Added state.

Carries: product_reference; variant_reference where applicable; item_status (one of 14); eligibility_disposition; dispatch_reference; activation_reference (populated only on `item.activated`); buyer_product_export_record_reference (populated on terminal success per existing baseline); error_reference (populated on failure); retry_attempt_count; retry_budget_remaining; evidence_references; correlation_reference; trace_reference; audit_record_reference.

**Critical:** `item.activated` is the ONLY Item status that drives final Accessory Added.

#### Buyer Product Export Selection Snapshot

Freezes buyer-scoped eligible product IDs at job creation. REQUIRED for snapshot semantics: post-snapshot product changes do NOT mutate the Job unless explicitly regenerated / retried.

Carries: parent_buyer_product_export_job_id; snapshot_timestamp; buyer_reference; company_scope_reference; buyer_entity_reference (buyer-scope triad REQUIRED); selection_kind (mirrors Job's trigger_kind where applicable); selection_set_reference; filter_scope_reference; visibility_projection_reference_at_snapshot; source_evidence_reference; eligible_product_references; excluded_product_reason_summary; audit_record_reference.

**Compatibility projection binding:** `compatibility_projection_reference_at_snapshot` is populated by the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. `compatible_device_references_at_snapshot` may also be captured so export eligibility and payload compatibility are bounded by the buyer-scoped projection active at Job creation.

The Selection Snapshot does NOT create global or cross-buyer activation state.

### Sub-structures (4)

#### Buyer Product Export Batch

Optional sub-structure for large Jobs. Groups Items for dispatch / throttle / progress purposes. NOT an operational source of truth: Item records remain canonical for item-level state. Batches are NOT independently retried at the batch level; retry is per-Item per Retry Budget Policy.

#### Buyer Product Export Job Status History

Append-only Job status transition history. Each entry records the prior status, new status, transition timestamp, reason_reference, and applied_throttle_policy_references where applicable. May be event-derived if repo convention prefers.

#### Buyer Product Export Result Summary

Per-Job rollup of Item outcomes at Job terminal time. Includes counts by Item status, counts by ineligibility reason, count succeeded, count failed, count retried, count skipped, count canceled, baseline applicability summary, file artifact reference if generated, dispatch reference summary. Populated on Job terminal status.

#### Buyer Product Export Error

Per-Item or per-Job error envelope. Classifies error_kind:

- `eligibility` (product no longer eligible per snapshot or validation).
- `dispatch` (Integration Management dispatch reference indicates failure; Product Catalog records Item failure based on the reference).
- `integration_transport` (transport-level failure surfaced by Integration Management; Product Catalog consumes via dispatch reference; Integration Management owns transport outcome).
- `item_validation` (per-Item validation failure during Product Catalog processing).
- `buyer_authority` (Tenant Company `check_access` denied the action).
- `system` (platform-level failure not attributable to a specific dimension).

NOT a standalone operational entity; lives inside Item or Job.

### Workflow / policy behavior only, NOT standalone records

- Throttle: applied at Job or Batch level via applied_throttle_policy_references; observable via Job status `throttled`. NOT a separate Throttle Record entity.
- Retry: applied at Item level via retry_attempt_count + retry_budget_remaining per Retry Budget Policy; observable via Item status `retry_scheduled`. NOT a separate Retry Record entity.
- Reprocess: a new Job with `trigger_kind = reprocess` referencing a prior Job. NOT a separate Reprocess Record entity.
- Cancellation: Job status transition to `canceled`; reason recorded in Status History. NOT a separate Cancellation Record entity.
- Integration Dispatch: Integration Management owns the dispatch outcome; Product Catalog records only the dispatch reference. NOT a separate Product-Catalog-owned Dispatch Record entity.

### Trigger kinds (11)

Job's `trigger_kind` is one of:

1. `single_add_accessory` (buyer clicks Add Accessory on one product).
2. `multi_select` (buyer selects multiple products).
3. `select_all_visible` (buyer selects all visible products from a vendor or page; snapshots eligible IDs at job creation).
4. `select_all_filtered` (buyer selects all products from filtered results; snapshots the result set at job creation; not a dynamic future query).
5. `select_all_eligible_for_devices` (buyer selects all eligible accessories for one or more devices; snapshot is buyer-scoped; compatibility scope is bounded by existing rules until Buyer-Scoped Compatibility Projection PR).
6. `recommended_set` (buyer selects recommended accessories; relevant when AI Agent Services or recommendations surface exists).
7. `on_sale_set` (buyer selects accessories on sale; relevance subject to Pricing / Promotions evolution).
8. `admin_on_behalf` (system or admin initiating export on behalf of buyer where Tenant Company act-on-behalf authority exists).
9. `scheduled` (scheduled jobs; open / future unless existing baseline supports it).
10. `retry` (retry of prior failed Items via new Job referencing the prior Job).
11. `reprocess` (reprocess of a prior completed Job; new Job referencing the prior).

### Trigger rules (locked)

- All exports create a Job, including individual Add Accessory clicks. No bypass.
- Small exports may APPEAR synchronous in UX but still create a Job under the hood.
- Exports above threshold must be asynchronous. Concrete threshold is implementation per Batch Size Policy + Job Item Limit Policy.
- `select_all_visible` snapshots eligible product IDs at job creation.
- `select_all_filtered` snapshots the result set, NOT a dynamic future query.
- Snapshots are buyer-scoped.
- `admin_on_behalf` requires explicit Tenant Company act-on-behalf authority per existing baseline.
- `scheduled` remains open / future unless existing baseline supports it.
- `retry` / `reprocess` reference prior Job and create new Job where appropriate.

### Named throttling policies (10; NO numeric limits in this PR)

Each policy is a Tenant- or platform-configurable named policy reference. Concrete numeric values are CPA / business / DevOps / implementation decisions, NOT locked here.

1. **Buyer Export Concurrency Policy.** Cap on simultaneous in-flight Jobs per buyer.
2. **Tenant / Company Export Concurrency Policy.** Cap on simultaneous in-flight Jobs per tenant / company.
3. **Vendor Fairness Throttle Policy.** Prevents one vendor's catalog from monopolizing dispatch capacity when many buyers export from it concurrently.
4. **System Export Queue Policy.** Platform-wide queue / backpressure policy.
5. **Job Item Limit Policy.** Maximum Items per Job.
6. **Batch Size Policy.** Items per Batch within a Job.
7. **Integration Dispatch Rate Policy.** Rate at which Items are dispatched to Integration Management per unit time.
8. **Retry Budget Policy.** Per-Item retry attempt budget.
9. **Duplicate / Idempotency Policy.** How duplicate Jobs are detected and resolved (idempotency key + selection equivalence). Reuses existing PR-A idempotency-key discipline.
10. **Small-Job Fairness / Queue Priority Policy.** Prevents small urgent Jobs from starving behind large bulk Jobs.

### Throttling rules (locked)

- No numeric limits in this PR.
- Selecting all visible products SNAPSHOTS eligible IDs at job creation.
- Selecting all filtered results SNAPSHOTS the result set.
- Snapshot is buyer-scoped.
- Product changes after snapshot do NOT mutate the Job unless explicitly regenerated / retried.
- Backpressure QUEUES or THROTTLES rather than synchronously fanning out.
- Small-Job Fairness belongs in this PR.
- Avoid starving small urgent exports behind huge jobs.

### Job statuses (14)

`requested`, `queued`, `validating`, `snapshotting`, `batching`, `throttled`, `processing`, `retry_scheduled`, `completed`, `completed_with_errors`, `failed`, `canceled`, `expired`, `blocked`.

Terminal Job statuses: `completed`, `completed_with_errors`, `failed`, `canceled`, `expired`, and `blocked` (when blocked is permanent rather than awaiting unblock).

Internal-only Job statuses (not surfaced to buyer UI by default): `validating`, `snapshotting`, `batching`.

### Item statuses (14)

`pending`, `validating`, `eligible`, `ineligible`, `queued`, `processing`, `dispatch_pending`, `exported`, `activation_pending`, `activated`, `failed`, `retry_scheduled`, `skipped`, `canceled`.

Terminal Item statuses: `ineligible`, `activated`, `failed`, `skipped`, `canceled`.

**Only `item.activated` drives buyer-specific Accessory Added.** Every other Item status (including `exported`, `dispatch_pending`, `activation_pending`, `queued`, `processing`, and bulk-inclusion states) is NON-driving for the Add Accessory UI gate.

### Status rules (locked)

- Only Item status `activated` drives buyer-specific Accessory Added.
- `exported`, `dispatch_pending`, `activation_pending`, `queued`, `processing`, and bulk inclusion are NOT final activation.
- Job `completed` means all Items succeeded.
- Job `completed_with_errors` means Item-level outcomes differ.
- Item statuses drive buyer catalog mapping / activation behavior.
- `validating`, `snapshotting`, `batching` may be internal-only Job statuses.
- Terminal Job statuses: `completed`, `completed_with_errors`, `failed`, `canceled`, `expired`, and possibly `blocked` depending on reason.
- Terminal Item statuses: `ineligible`, `activated`, `failed`, `skipped`, `canceled`.
- Every Job / Item status transition is evidenced through Product Catalog event / evidence discipline.

### Add Accessory / Accessory Added rule

This rule is canonical in `accessory-discovery-selection.md`; brief summary here:

Add Accessory changes to Accessory Added and becomes disabled only after that specific accessory has a successful item-level export / activation outcome for that buyer. Accessory Added is buyer-specific; one buyer's export must never affect another buyer's Add Accessory state. Buyer-specific activation requires `buyer_reference`, `company_scope_reference`, and `buyer_entity_reference` (or equivalent buyer-scope key) on every activation / catalog mapping record.

### Buyer-specific activation / catalog mapping

- Every export creates a Job, including individual Add Accessory.
- Small exports may appear synchronous in UX but use the Job model under the hood.
- Queued / pending / processing does NOT create final activation.
- Successful item-level export creates or updates buyer-scoped activation / catalog mapping.
- Failed item creates item failure state only.
- Buyer mapping MUST include `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (or equivalent buyer-scope key).
- Buyer 1 activation must NEVER update Buyer 2 state.
- Generated-but-not-downloaded file as activation remains an OPEN BUSINESS DECISION. Default: NO; tenant policy may override when the export mode explicitly defines file generation as successful delivery.
- Successful item export creates the existing Buyer Product Export Record or equivalent successful-item evidence.
- Item-level export success updates buyer catalog mapping.
- Partially failed Jobs preserve item-level success / failure states.
- Buyer catalog mapping should occur AFTER successful item outcome based on Integration Management dispatch references.
- API-only exports and file exports SHARE the same Job / Item / activation behavior.
- File exports additionally reference Logs & Audit / File Tracking when an artifact exists.

### Product eligibility / snapshot rules

Eligibility checks at Selection Snapshot creation include:

- Product is visible to the buyer at job creation (Tenant Company + Product Catalog visibility projection).
- Product is allowed by vendor / buyer relationship (Tenant Company).
- Product passes region / country visibility.
- Product passes sales-channel eligibility.
- Product is not blocked by product status (lifecycle, availability per existing rules).
- Product passes media completeness requirements IF currently documented.
- Product passes price / MAP / wholesale rules IF currently documented.
- Product passes Tenant Company export authority where applicable (existing `check_access` baseline).
- Product is in buyer's My Devices compatibility scope ONLY IF compatibility selection mode is part of the export (`trigger_kind = select_all_eligible_for_devices`); otherwise not enforced in this PR.

Snapshot semantics (locked):

- Product set is SNAPSHOTTED at export-job creation.
- Later product changes do NOT mutate an already-created Job unless the Job is explicitly regenerated or retried (which creates a new Job).
- Snapshot is buyer-scoped (carries the buyer-scope triad).
- Snapshot does NOT create global or cross-buyer activation state.

### Integration Management dispatch reference vs Product Catalog item decision

Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.

- Product Catalog RECEIVES a dispatch reference from Integration Management (success or failure outcome reference).
- Product Catalog DECIDES the resulting Item status (`activated`, `failed`, `retry_scheduled`, etc.) based on the dispatch reference outcome and Product Catalog rules.
- Product Catalog DECIDES whether to create or update buyer-scoped activation / catalog mapping based on the Item status decision.
- Integration Management OWNS the transport-side outcome (delivery succeeded, transport retry exhausted, dead-letter, provider failure).
- Product Catalog does NOT own the transport outcome itself, but it OWNS the consequent item-status and activation decisions.

### Tenant Company `audit_export.*` non-use

Product Catalog must NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for normal buyer product exports unless future Tenant / Product capability coordination explicitly says so. Buyer product exports use existing Tenant Company buyer / company / entity capabilities; no new capabilities are required for this PR.

### Compatibility export discipline

- Export Job MAY include compatibility payload references through the Selection Snapshot's populated `compatibility_projection_reference_at_snapshot` and optional `compatible_device_references_at_snapshot`.
- Buyer-Scoped Compatibility Projection is defined by the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation.
- My Devices add / remove / update / deactivate / supersede rules are defined by the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation.
- Product Catalog export Job must NOT assume global compatibility should be exported by default.
- Export payload compatibility is bounded by the buyer-scoped projection active at Job creation; Product Catalog must not export global compatibility payloads by default.

### What this specification intentionally does NOT prescribe

- Concrete HTTP routes, request / response payload schemas, pagination cursors, authentication headers, error code catalogs. Future API Governance Foundation PR + Product-Catalog-specific OpenAPI hardening PR.
- Concrete numeric throttle / batch size / concurrency / retry budget / queue depth values. Implementation / DevOps / business.
- Concrete queue technology, persistence shape, fairness algorithm. Implementation.
- Concrete UI / UX surfaces. Future UX / UI work.
- Concrete idempotency cache shape, TTL, retry queue persistence. Implementation.
- Concrete notification template / recipient resolution / delivery surface. Future Notification Platform coordination.
- Concrete capability propagation latency for `check_access` mid-job. Implementation; existing PR #103 Workflow 12 discipline applies as architectural pattern.
- Concrete buyer-scoped compatibility projection. Future PR.
- Concrete My Devices add / remove sync rules. Future PR.
- Concrete numerics for cancel-after-processing window. Open business decision.
- Concrete admin-on-behalf consent requirements. Open business decision.
- Rename, removal, or rewrite of any existing Product Catalog baseline content.
- Rename or removal of the existing Buyer Product Export Record.

## Buyer-Scoped Compatibility Projection Specification

This section specifies the Product Catalog side of the coordinated Product Catalog + Device Catalog Foundation that defines buyer-scoped accessory compatibility based on the buyer's My Devices portfolio, and how Product Catalog reacts to My Devices changes. The Device Catalog side is specified in `modules/device-catalog/spec.md`. All existing Product Catalog baseline concepts (including PR #104 entities, events, workflows, statuses, and rules) are preserved without modification.

### Boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Core projection rule (canonical location in `accessory-discovery-selection.md`)

`A buyer may see and export only accessories compatible with active devices in that buyer's My Devices portfolio, subject to Product Catalog visibility / eligibility and Tenant scope.`

### Primary entities (2)

#### Buyer-Scoped Compatibility Projection

The canonical buyer-scoped projection. Derived from:

- Device Catalog Buyer Device Portfolio Snapshot (the buyer's active devices at projection time).
- Product Catalog vendor-owned compatibility mappings (which accessories are compatible with which devices, in the abstract).
- Product Catalog / Tenant visibility rules (which products this buyer is allowed to see at all).

Required scope: buyer-scope triad (`buyer_reference`, `company_scope_reference`, `buyer_entity_reference`) REQUIRED on every projection record.

Carries: `projection_status` (one of 6 values), projection_timestamp, projection_version, `buyer_device_portfolio_snapshot_reference` (REQUIRED), source_compatibility_mapping_version_reference, source_visibility_projection_reference, compatible_accessory_references, excluded_accessory_reason_summary, `prior_projection_reference` (nullable; preserves evidence chain), projection_evidence_reference, audit_record_reference.

#### Buyer Accessory Compatibility Impact Record

Per-accessory record of how a portfolio change affects an accessory the buyer has ALREADY activated (Accessory Added, Selling, or with a Buyer Product Export Record). Distinct from the projection: the projection is the forward-looking view; the impact record is the per-accessory consequence assessment.

Carries: buyer-scope triad, product_reference, variant_reference (where applicable), `triggering_buyer_device_portfolio_change_record_reference` (REQUIRED), `prior_buyer_scoped_compatibility_projection_reference`, `current_buyer_scoped_compatibility_projection_reference`, `impact_state` (one of 7 values), `affected_buyer_relationship_state` (snapshot of buyer relationship state at impact time), `recommended_buyer_action` (one of: `none`, `review`, `stop_selling_recommended`, `acknowledge`, `manual_remap_required`), `acknowledged_flag`, `acknowledged_timestamp`, `acknowledged_actor_reference`, impact_evidence_reference, audit_record_reference.

### Sub-structures (2)

#### Buyer Accessory Visibility Projection

Per-buyer visible-accessory set derived from the projection. Carries:

- `active_addable_accessory_references` (accessories visible AND not yet activated; the Add Accessory candidate set).
- `accessory_added_accessory_references` (accessories the buyer has activated; preserved regardless of compatibility changes).
- `selling_with_compatibility_warning_accessory_references` (accessories the buyer is Selling that are flagged for compatibility review; populated from current_compatibility_impact_state).
- `hidden_from_active_addable_list_accessory_references` (accessories filtered out of the active addable list due to no longer being compatible).

NOT a standalone operational entity; a projection of the projection's `compatible_accessory_references` against the buyer's relationship states.

#### Buyer Compatibility Projection Status History

Append-only projection status transition history. Mirrors PR #104 Job Status History pattern. Per-entry fields:

- `buyer_compatibility_projection_status_history_entry_id`.
- `parent_buyer_scoped_compatibility_projection_id`.
- `prior_projection_status`, `new_projection_status`.
- `transition_timestamp`.
- `reason_reference`.
- `actor_reference` OR `service_trigger_reference`.
- `audit_record_reference`.

### Workflow / policy behavior only, NOT standalone records

- Buyer Compatibility Recalculation Job (workflow / policy behavior; observable via projection status transitions `recalculating` -> `current` / `failed`).
- Buyer Compatibility Recalculation Item (per-accessory recalculation behavior).
- Low-level recalculation queue records (implementation).
- Transport / sync retry records (Integration Management owns).
- Automatic Stop Selling on device removal (NOT introduced; locked default).

Explicitly NOT introduced as standalone records: Buyer Compatibility Recalculation Job Record, Buyer Compatibility Recalculation Item Record, Buyer Compatibility Recalculation Throttle Record, Buyer Compatibility Recalculation Retry Record, Buyer Compatibility Recalculation Cancellation Record, automatic Stop Selling record.

### projection_status values (6)

`current`, `stale`, `recalculating`, `failed`, `review_required`, `superseded`. See `accessory-discovery-selection.md` for canonical meaning.

### impact_state values (7)

`unaffected`, `no_longer_compatible`, `compatibility_restored`, `review_required`, `hidden_from_active_addable_list`, `compatibility_narrowed`, `compatibility_expanded`. See `accessory-discovery-selection.md` for canonical meaning.

### Selection Snapshot binding (extends PR #104)

PR #104 reserved `compatibility_projection_reference_at_snapshot` on Buyer Product Export Selection Snapshot. This PR populates it.

- **`compatibility_projection_reference_at_snapshot`** (REQUIRED on Selection Snapshot). Type: reference to Buyer-Scoped Compatibility Projection in effect at snapshot time. Populated at PR #104 Workflow 2 (Export Selection Snapshot).
- **`compatible_device_references_at_snapshot`** (added on Selection Snapshot). Documents which buyer devices were active at snapshot time; supports per-Item compatibility ineligibility reason recording.

### Export Eligibility Validation extension (extends PR #104 Workflow 3)

PR #104 Workflow 3 (Export Eligibility Validation) is extended with a compatibility-eligibility check:

- For each Item in the Job, evaluate whether the Item's `product_reference` is in `compatible_accessory_references` of the bound projection.
- If YES: Item proceeds normally per PR #104.
- If NO: Item transitions to terminal `ineligible` with `error_kind = compatibility_mismatch`.

### compatibility_mismatch as new error_kind (extends PR #104 Buyer Product Export Error)

Added as a new `error_kind` on Buyer Product Export Error, distinct from existing values:

| error_kind | Source |
|---|---|
| `eligibility` | Generic eligibility failure per existing baseline. |
| `dispatch` | Integration Management dispatch reference indicates failure. |
| `integration_transport` | Transport-level Integration Management failure. |
| `item_validation` | Per-Item validation failure during Product Catalog processing. |
| `buyer_authority` | Tenant Company `check_access` denied. |
| `system` | Platform-level failure. |
| `compatibility_mismatch` | **NEW.** Accessory not compatible with any active device in the buyer's My Devices portfolio. |

Buyer-facing remediation differs: the buyer adjusts their My Devices portfolio rather than waiting for vendor / system fixes. Adding the value is additive per PR #104's discriminator extension discipline (forward-compatible; subscribers handle unknown values gracefully).

### Buyer catalog mapping additions (5 new fields)

The PR #104 buyer-scoped activation / catalog mapping record adds:

- `compatibility_projection_reference_at_activation` (the projection in effect when the accessory was activated; preserves historical basis).
- `active_compatible_device_count_at_activation` (count of compatible active devices at activation; baseline for impact assessment).
- `compatible_device_references_at_activation` (the actual device references that were compatible at activation; supports detailed impact assessment).
- `current_compatibility_impact_state` (latest impact state from the most recent Buyer Accessory Compatibility Impact Record; default `unaffected`).
- `latest_buyer_accessory_compatibility_impact_record_reference` (nullable; points to the most recent impact assessment).

### Buyer-specific activation rule (preserved from PR #104; extended)

- Buyer-specific activation requires the buyer-scope triad on every activation / catalog mapping record (PR #104 baseline; preserved).
- This PR adds: activation MUST capture the projection reference and compatible device references at activation time (the 5 new fields above) so subsequent compatibility impact assessment is grounded in historical reality.

### Latest / Recommended Accessories visibility-only framing (locked)

- **Latest Accessories advancement remains governed by existing baseline rules.** Vendor / catalog-side decision about which accessory becomes the "latest" for a product line is NOT changed by this PR.
- **Buyer-scoped projection gates which Latest Accessories the buyer can see.** Set intersection: latest AND in `compatible_accessory_references`.
- **Recommended Accessories logic remains governed by existing recommendation rules.**
- **Buyer-scoped projection gates which recommendations are visible / eligible to the buyer.**
- Latest Accessories advancement itself is NOT made buyer-scoped in this PR.

### My Devices add behavior (Product Catalog side)

When Device Catalog emits `device-catalog.my-devices.portfolio-changed` with `change_type = device_added`:

- Product Catalog triggers projection recalculation (Workflow 4).
- Newly compatible accessories may become visible if all other rules pass.
- Accessories already visible because of other devices REMAIN visible (set semantics: union).
- Accessories already Accessory Added / Selling REMAIN unchanged unless new device expands supported device coverage.
- `active_compatible_device_count` increments where applicable; no state transition is forced.
- Add Accessory state remains buyer-specific per PR #104 canonical rule.
- Latest Accessories baseline does NOT automatically advance solely from device add.
- Export eligibility may change for future exports.
- Completed exports are NOT retroactively rewritten.
- In-flight export Jobs keep their snapshot per Workflow 10.
- Future exports use the updated projection.

### My Devices remove behavior (Product Catalog side)

When Device Catalog emits `device-catalog.my-devices.portfolio-changed` with `change_type = device_removed`:

- Product Catalog triggers projection recalculation.
- Accessories compatible only with the removed device LEAVE the active addable Accessory List for that buyer.
- Accessories compatible with other active devices REMAIN visible.
- Products already Accessory Added / Selling that are now incompatible with ALL remaining My Devices receive a Buyer Accessory Compatibility Impact Record with appropriate `impact_state`.
- **Stop Selling MUST NOT be automatically applied.** Compatibility impact is FLAGGED for review via the impact record.
- Removing a device MUST NOT delete historical Buyer Product Export Records.
- Removing a device MUST NOT erase Logs & Audit evidence.
- Removing a device MUST NOT affect another buyer (buyer-scope triad enforcement).
- Removing a device MUST NOT mutate vendor-owned accessory facts or canonical Device Catalog records.
- Order / return / invoice history remains preserved.
- If an accessory is still compatible with at least one remaining device, no removal impact applies.

### My Devices update / deactivate / supersede behavior (Product Catalog side)

When Device Catalog emits `device-catalog.my-devices.portfolio-changed` with any of `device_updated`, `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`, `admin_on_behalf_change`:

- Product Catalog triggers projection recalculation or routes to `projection_status = review_required` depending on confidence.
- `device_updated` triggers recalculation only if compatibility-relevant fields changed (Device Catalog determines via the event).
- `device_deactivated` is equivalent to remove for projection purposes.
- `device_superseded` recalculates against successor's compatibility profile; impact records produced where profile differs.
- `device_reference_corrected` recalculates if the corrected reference points to a device with a different compatibility profile.
- `bulk_portfolio_import` triggers ONE recalculation per snapshot (not per device); de-duped by snapshot reference.
- `admin_on_behalf_change` is recalculated like buyer-initiated; actor recorded on the impact record.
- Prior projection / portfolio snapshot evidence is preserved.
- Device Catalog canonical records remain Device-owned; Product Catalog never mutates them.

### Empty My Devices state

A buyer with no active devices has a VALID projection at `projection_status = current` with empty `compatible_accessory_references`. Accessory List shows empty state. Export Job creation may proceed; Selection Snapshot binds the empty projection; Items are zero (PR #104 supports zero-Item Jobs). Buyer has not encountered an error condition; projection accurately reflects an empty portfolio.

### What this specification intentionally does NOT prescribe

- **No global Buyer-Scoped Compatibility Projection.** The projection is buyer-scoped only; no global projection record exists; no global compatibility export payload is produced; export payload compatibility is bounded by buyer-scoped projection only.

- Concrete HTTP routes, request / response payload schemas, pagination cursors, authentication headers, error code catalogs.
- Concrete numeric stale-projection tolerance window.
- Concrete recalculation queue technology, persistence shape, fairness algorithm, dedupe window.
- Concrete idempotency cache shape, TTL, retry queue persistence.
- Concrete UI / UX surfaces.
- Concrete notification template / recipient resolution / delivery surface.
- Runtime recalculation engine, concrete stale-projection tolerance, concrete recalculation queue technology, numeric recalculation limits, and accessory-to-accessory compatibility remain deferred.
- Concrete capability propagation latency for `check_access` mid-recalculation (existing PR #103 Workflow 12 discipline applies as architectural pattern).
- Concrete accessory-to-accessory compatibility (future phase).
- Concrete numerics for cancel-after-recalculation-start, admin-on-behalf consent requirements.
- Rename, removal, or rewrite of any existing Product Catalog or Device Catalog baseline content.
- Rename or removal of the existing Buyer Product Export Record (preserved per PR #104).
- Rename or removal of any PR #104 entity, event, workflow, or rule.
- Mutation of vendor-owned accessory compatibility facts.
- Mutation of Device Catalog canonical Device records.
- Mutation of historical Buyer Product Export Records, orders, returns, invoices, audit evidence.
