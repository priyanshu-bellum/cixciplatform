# Product Catalog Data Model

This document is proposal-level architecture. It hardens the Product Catalog entity model for accessory lifecycle, availability, variants, compatibility, buyer visibility, buyer selling status, exports, notifications, and governance without finalizing unresolved business rules.

Product Catalog owns CIXCI platform product records, validation state, lifecycle state, publication/visibility state, buyer relationship state, distribution/export records, compatibility assertions, catalog-carried pricing input records, product media/content attachment references, import processing records, and catalog change history. Accessory vendors are authoritative for vendor-submitted accessory facts where accepted by Product Catalog governance.

Product Catalog does not own canonical Device Catalog records, Pricing calculation, Media processing/storage/renditions, Tenant Company eligibility/permissions, Notification delivery, Integration delivery evidence, Procurement POs, Launch/Event coordination, Order Routing, Fulfillment/Returns execution, Invoice lifecycle, Warranty decisions, Analytics metrics, Logs & Audit evidence records, AI recommendations, or full Inventory Management.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery, buyer selection, export confirmation, confirmation-line eligibility, export apply disposition, Latest Accessories baseline behavior, Stop Selling, and System Admin buyer context data concepts.

## Entities

### Product Identity

- Accessory Product.
- Product Master Record.
- Product Variant.
- Vendor Product Identity.
- Product Identifier.
- External Product Identifier.
- Identifier Namespace.
- Vendor SKU Mapping.
- Product Type.
- Product Type Profile reference.
- Category Validation Profile reference.

### Product Attributes And Variants

- Product Attribute Set.
- Variant Attribute Set.
- Attribute Definition.
- Attribute Value.
- Vendor Color Value.
- Normalized System Color Value.
- Structured Color Assignment.
- Variant Image Attachment Reference.

### Compatibility References

- Device Reference.
- Compatible Device Reference.
- Compatibility Mapping.
- Compatibility Import Mode.
- Compatibility Change Record.
- Buyer Device Portfolio Compatibility Reference.

### Import Processing

- Catalog Import Batch.
- Catalog Import Row.
- Import Validation Error.
- Import Correction Record.
- Failed Record Review.
- Import Preview Reference.
- Import Confirmation Reference.

### Lifecycle, Availability, Publication, And Visibility

- Product Lifecycle State.
- Product Availability State.
- Availability Evidence Record.
- Product Publication State.
- Catalog Visibility Record.
- Buyer Visibility Scope.
- Release Date Fact.
- Launch Date Fact.
- Launch Eligibility Evidence Record.
- EOL Date Fact.
- EOL Sell-Through Policy Reference.
- EOL Policy Signal.
- EOL Downstream Disposition Reference.
- Stop-Sell / Deactivation Record.
- Buyer-Facing Derived Product Status.

### Buyer Relationship, Activation, And Download

- Product Activation Request.
- Product Activation Approval State.
- Product Download Record.
- Buyer Product Export Record.
- Buyer Product Export Line Reference.
- Export Baseline Record.
- Last Successful Buyer Export Timestamp.
- Activation Revocation Record.
- Activation History.
- Buyer Product Relationship.
- Buyer Selling Status.
- Buyer Selling Status History.

### Accessory Discovery And Selection

- Buyer Accessory Discovery Context.
- Selected Device Filter State.
- Buyer Accessory Search / Filter State.
- Buyer Accessory Selection Set.
- Accessory Export Confirmation Record.
- Accessory Export Confirmation Line / Selected Accessory Eligibility Line.
- Product Catalog Export Apply Disposition.
- Buyer Accessory Export Baseline.
- Per-Buyer Accessory Relationship State.
- Admin Buyer Context View.
- Act-On-Behalf Permission Reference.

### Sales Channel Eligibility

- Sales Channel Eligibility Record.
- Retail Eligibility Flag / Scope.
- Buyer Channel Eligibility Reference.

### Catalog-Carried Pricing Inputs

- Catalog-Carried Pricing Input.
- Pricing Input Source.
- Pricing Input Currency.
- Pricing Input Effective Date Range.
- Pricing Input Version.
- Pricing Handoff Reference.
- Pricing Readiness Reference.

### Media And Content Version References

- Product Media Asset Reference.
- Product Content Asset Reference.
- Media Asset Version Reference.
- Content Version Reference.
- Asset Rendition Reference.
- Product Asset Approval / Source State.
- Media Mapping Evidence Reference.
- Media Readiness Reference.

### Audit And Change History

- Catalog Change Record.
- Catalog Change Actor.
- Catalog Change Source.
- Catalog Change Before / After Summary.
- Catalog Entity Version.
- Catalog Import Batch Reference.
- Tenant Scope Reference.
- Catalog Notification Trigger Reference.
- Catalog Integration Update Signal Reference.
- AI-Ready Catalog Signal Reference.

## Accessory Product

Represents the Product Catalog-owned CIXCI platform product record for an accepted accessory product.

Proposal-level fields:

- Product id, product master id, current lifecycle state, publication state, visibility summary, source vendor scope, Product Type, and version.
- Vendor authority/source reference for accepted vendor-submitted facts.
- Release Date, Launch Date, EOL Date, and archival reference where applicable.
- Current availability state where accepted as catalog availability evidence.
- Current buyer-facing derived status by buyer scope where materialized.

Product Catalog stores the governed platform record. Vendor-submitted facts remain source-attributed and versioned.

## Product Variant

Represents a sellable or distinguishable variation of a product.

Variant-level records are required when color, size, material, model, packaging, SKU, UPC, inventory/availability, image, price input, compatibility, or sellable behavior differs.

Proposal-level fields:

- Variant id and product/master references.
- Variant SKU and UPC identifiers.
- Variant attribute set reference.
- Vendor color and normalized System Color values.
- Variant-specific availability evidence.
- Variant-specific catalog-carried pricing input references.
- Variant-specific compatibility references where applicable.
- Variant-specific media attachment references.
- Variant lifecycle/publication override placeholders where allowed.

## Structured Color Model

Color should be modeled as structured data for filtering, export, reporting, and analytics.

Proposal-level concepts:

- Vendor Color Value preserves the vendor-provided color label.
- Normalized System Color Value supports buyer filtering and reporting.
- Structured Color Assignment supports multi-value colors without relying only on comma-separated text.
- Color normalization records source, confidence, rule/version, review state, and audit reference.

## Lifecycle State Model

Lifecycle state is separate from availability, publication, visibility, buyer activation/download, buyer selling status, and routability.

Proposal-level states:

- Inactive.
- Active.
- End of Life.
- Archived.
- Review Required placeholder.

Inactive means the product has not launched or is not yet customer-facing eligible. Inactive products may be hidden, released to eligible buyers, or blocked pending review depending on Release Date, Launch Date, visibility, and readiness rules.

Active means the product has launched or is eligible for customer-facing handling under Product Catalog rules, but it is not automatically sellable.

End of Life requires an EOL Date and should preserve selected sell-through behavior.

Archived remains available for historical order, return, invoice, reporting, and audit traceability and should not be physically deleted when referenced.

## Availability State Model

Availability is separate from lifecycle. Availability is vendor-provided/catalog availability evidence unless future Inventory Management is introduced.

Proposal-level states:

- In Stock.
- Low Stock.
- Out of Stock.
- Backorder Available.
- Temporarily Unavailable.

Proposal-level fields:

- Availability state.
- Vendor availability source reference.
- Inventory input value / quantity placeholder.
- Low-stock threshold reference.
- Effective date/time.
- Reason code.
- Source event/version.
- Review state.
- Audit reference.

Product Catalog may own catalog availability status at proposal level, but does not own a full inventory ledger, allocation, replenishment, warehouse stock, or fulfillment execution.

## Availability Evidence Record

Represents the source-owned or vendor-submitted evidence Product Catalog uses for catalog availability display and eligibility signals.

Proposal-level fields:

- Availability evidence id.
- Product/variant reference.
- Availability state.
- Availability source.
- Source module/system.
- Source timestamp.
- Received timestamp.
- Freshness timestamp.
- Expiration timestamp.
- Quantity basis.
- Quantity source reference.
- Threshold source reference.
- Source disposition.
- Stale state.
- Missing state.
- Display-only flag.
- Sellability-affecting flag.
- Backorder-eligible flag.
- Advisory-only flag.
- Review-required state.
- Supersession reference.
- Audit reference.

Availability evidence may affect Product Catalog display and eligibility signals, but downstream modules decide their own operational behavior. Product Catalog must not treat availability evidence as inventory ledger, allocation, warehouse stock, replenishment, or fulfillment execution.

## Release And Launch Date Facts

Release Date controls when eligible buyers may see/review product data inside CIXCI.

Launch Date controls when the product may become customer-facing/sellable where Product Catalog rules, source-owned readiness evidence, review state, lifecycle, availability, buyer eligibility, pricing readiness, media readiness, compatibility, and channel eligibility allow.

Proposal-level fields:

- Release Date.
- Launch Date.
- Source reference.
- Source version/hash.
- Timezone/date-basis metadata.
- Review state.
- Launch/Event Management reference where coordinated.
- Conflict reason and review-required state.
- Launch eligibility evidence reference.
- Recheck-before-launch flag.

Launch / Event Management coordinates launch readiness and calendar events, but does not own Product Catalog lifecycle facts.

## Launch Eligibility Evidence Record

Represents source-owned readiness evidence consumed before Product Catalog treats a product as customer-facing eligible.

Proposal-level fields:

- Launch eligibility evidence id.
- Product/variant reference.
- Authority module.
- Source readiness signal id.
- Source readiness signal version/hash.
- Pricing readiness reference.
- Media readiness reference.
- Tenant Company eligibility/channel scope reference.
- Compatibility readiness reference.
- Availability readiness reference.
- Product Catalog review state reference.
- Launch/Event reference where applicable.
- Freshness timestamp.
- Expiration timestamp.
- Stale signal state.
- Missing signal state.
- Waiver/override flag.
- Waiver approver.
- Waiver reason.
- Recheck-before-launch flag.
- Customer-facing eligibility disposition.
- Review-required state.
- Audit reference.

Product Catalog may coordinate customer-facing eligibility for catalog purposes, but it must consume source-owned readiness evidence. Product Catalog must not independently decide Pricing readiness, Media readiness, Tenant Company eligibility, channel eligibility, or Launch/Event readiness. Missing, stale, conflicting, or expired readiness evidence routes customer-facing eligibility to review. Launch Date alone does not make a product customer-facing sellable.

## EOL And Archival Model

EOL Date is required when lifecycle state is End of Life.

Proposal-level EOL sell-through options:

- Stop selling on EOL Date.
- Allow sell-through until inventory depleted.
- Stop new downloads but allow existing buyers to continue.
- Stop all buyer ordering on EOL Date.

Proposal-level fields:

- EOL Date.
- Sell-through policy reference.
- Replacement product reference placeholder.
- Buyer impact summary.
- Downstream signal references.
- Archive reason.
- Historical traceability references.

Product Catalog owns catalog lifecycle state, EOL Date, catalog sell-through policy, catalog visibility/downloadability disposition, buyer-product catalog relationship disposition, and Product Catalog EOL events/signals. Product Catalog does not directly enforce Order Routing, Procurement, Fulfillment/Returns, Invoice Management, buyer integration transport, or buyer storefront execution.

## EOL Policy Signal And Downstream Disposition

Represents Product Catalog-owned EOL policy evidence and references to downstream module dispositions.

Proposal-level fields:

- EOL policy signal id.
- Product/variant reference.
- Sell-through policy reference.
- Affected buyer-product relationship reference.
- Catalog visibility disposition.
- Catalog downloadability disposition.
- Buyer selling status disposition.
- Order-routing disposition reference.
- Procurement disposition reference.
- Fulfillment disposition reference.
- Invoice disposition reference.
- Integration update disposition reference.
- Downstream consumer acknowledgement placeholder.
- Review-required state.
- Supersession reference.
- Audit reference.

Product Catalog may block new catalog downloads or buyer-product activation where its rules allow. Order Routing decides whether new customer orders are routable based on its own rules and consumed catalog evidence. Procurement decides whether POs are allowed based on its own rules and consumed catalog evidence. Fulfillment/Returns decides operational execution based on its own rules and consumed catalog evidence. Invoice Management decides invoice eligibility based on its own rules and consumed evidence. Integration Management owns delivery/transport evidence for buyer updates.

## Compatibility Mapping

Product Catalog owns accessory-to-Device Reference compatibility assertions. Device Catalog owns canonical Device References and device facts.

Proposal-level fields:

- Product/variant reference.
- Compatible Device Reference / Device Reference.
- Compatibility type.
- Compatibility source.
- Confidence/status.
- Effective dates.
- Mapping version.
- Import mode: Add, Replace, Selective Remove.
- Devices added/removed summary.
- Preview/confirmation reference for destructive modes.
- Audit reference.
- Review state for missing, stale, superseded, ambiguous, or conflicting Device References.

Default compatibility import mode is Add. Replace and Selective Remove require explicit selection, preview warning, confirmation, and audit evidence aligned with `architecture/standards/import-export-validation-governance.md`.

## Buyer Device Portfolio Compatibility Reference

Represents Product Catalog's consumption of buyer device portfolio references for catalog visibility/filtering behavior.

Proposal-level fields:

- Buyer scope reference.
- Device portfolio reference from Device Catalog or owning buyer-device source.
- Matched Product Catalog compatibility reference.
- Tenant Company eligibility reference.
- Source version/freshness.
- Review state.

Product Catalog must not infer Tenant Company eligibility or mutate Device Catalog buyer device portfolio records.

## Accessory Discovery And Selection Model

Detailed rules live in `accessory-discovery-selection.md`. This canonical summary makes the discovery sub-contract visible from the Product Catalog data model.

### Buyer Accessory Discovery Context

Represents the Product Catalog-owned discovery session or persisted context used to evaluate accessory discovery for a buyer.

Proposal-level fields:

- Discovery context id.
- Buyer/entity scope reference.
- Tenant Company access/scope evidence reference.
- Device Catalog My Devices portfolio reference.
- Active My Devices requirement state.
- Empty-state shown flag/reference.
- Compatibility projection reference.
- Visibility projection reference.
- Created/updated timestamp.
- Review-required state.
- Audit reference.

### Selected Device Filter State

Represents device filter state, including pre-selection from My Devices.

Proposal-level fields:

- Filter state id.
- Buyer/entity scope reference.
- Device Catalog My Devices portfolio reference.
- Pre-selected Device Reference.
- All available My Devices references shown in the filter.
- Filter removal/expansion state.
- Source action reference, such as `View Accessories`.
- Source version/freshness reference.
- Audit reference.

### Buyer Accessory Search / Filter State

Represents persisted, cached, or auditable search/filter state where needed.

Proposal-level fields:

- Search/filter state id.
- Buyer/entity scope reference.
- Device, Category, Color, Price, Vendor, Availability, Selling Status, On Sale, and Latest Accessories filters.
- Search query and search fields used.
- Compatibility evidence reference.
- Visibility/access projection reference.
- Result count summary.
- Redaction class.
- Audit reference where search/access is sensitive.

### Buyer Accessory Selection Set

Represents accessories selected for export before confirmation.

Proposal-level fields:

- Selection set id.
- Buyer/entity scope reference.
- Actor/user reference.
- Selected product/variant references.
- Selected count.
- Vendor summary.
- Device compatibility summary.
- Warning summary.
- Current search/filter state reference.
- Expires at / abandoned state placeholder.
- Audit reference.

### Accessory Export Confirmation Record

Represents the pre-export confirmation step.

Proposal-level fields:

- Confirmation id.
- Selection set reference.
- Buyer/entity scope reference.
- Actor/user reference.
- Selected count.
- Vendor summary.
- Device summary.
- Accessory Export Confirmation Line references.
- Warning references for already exported, Out of Stock, On Sale, stale evidence, missing eligibility, or review-required items.
- Blocking line summary.
- Confirmation status: Created, Cancelled, Confirmed, Expired, Review Required, Partially Blocked.
- Cancel/back reference preserving selection.
- Resulting Buyer Product Export Record reference when confirmed.
- Export apply disposition reference.
- Audit reference.

### Accessory Export Confirmation Line / Selected Accessory Eligibility Line

Represents per-selected-accessory eligibility and disposition evidence inside an Accessory Export Confirmation Record.

Proposal-level fields:

- Confirmation line id.
- Export confirmation id.
- Buyer/entity scope reference.
- Product/variant reference.
- Product source version/hash.
- Product visibility projection reference/version.
- Compatibility evidence reference/version.
- Lifecycle disposition.
- Availability disposition.
- Sales channel eligibility disposition.
- Buyer visibility/access disposition.
- Buyer account status evidence reference.
- Buyer accessory relationship state before export.
- Already exported state.
- Warning vs blocking classification.
- Warning reason.
- Blocker reason.
- Stale/missing/conflicting evidence state.
- Recheck-before-confirm flag.
- Recheck timestamp.
- Selected/applied/ignored/blocked state.
- Resulting export line reference.
- Resulting buyer relationship update reference.
- Review-required state.
- Supersession reference.
- Audit reference.

The export confirmation summary is not enough; each selected accessory must be evaluated line-by-line. Blocked lines must not advance buyer accessory relationship state.

### Product Catalog Export Apply Disposition

Represents Product Catalog-owned local export apply behavior separately from Integration delivery and Logs & Audit file evidence.

Proposal-level fields:

- Product Catalog export record reference.
- Export confirmation reference.
- Export confirmation line references.
- Export apply disposition.
- Export delivery disposition reference from Integration Management where applicable.
- Logs & Audit file/download evidence reference.
- Baseline advancement reference.
- Buyer relationship update disposition.
- Applied vs ignored state.
- Failed export reason.
- Review-required state.
- Audit reference.

Product Catalog owns export apply disposition. Integration Management owns external delivery/receipt evidence. Logs & Audit owns immutable export/file/download evidence.

## Buyer Product Export Record

Represents a buyer product export/download action.

Proposal-level fields:

- Export/download id.
- Buyer, parent, and child entity scope.
- Actor or service identity.
- Export timestamp.
- Last successful export timestamp.
- Export method.
- Export status.
- Product/variant references exported.
- Product source version references.
- Accessory Export Confirmation Record reference where applicable.
- Accessory Export Confirmation Line references where applicable.
- Export apply disposition reference.
- Redaction class.
- Logs & Audit file/export reference.
- Integration delivery reference where transmitted externally.
- Export baseline reference where applicable.

Latest Accessories uses an applicable successful export baseline rather than a timestamp alone. If no successful applicable export exists, the Latest Accessories filter should be disabled or unavailable.

## Export Baseline Record

Represents the scoped baseline used to determine Latest Accessories and catalog update deltas.

Proposal-level fields:

- Export baseline id.
- Buyer/entity scope.
- Product Type scope.
- Export schema version.
- Export filter scope.
- Visibility/access projection reference.
- Included product references.
- Excluded product reason summary.
- Partial export state.
- Delivery failed state.
- Revoked export state.
- Superseded export state.
- Applicable-for-Latest-Accessories flag.
- Baseline advanced timestamp.
- Baseline source export reference.
- Audit reference.

Partial, failed, revoked, superseded, or restricted-scope exports may not advance the Latest Accessories baseline unless Product Catalog rules explicitly allow it. Product Catalog should preserve export scope/evidence so downstream consumers can understand what the baseline means.

## Buyer Product Relationship And Selling Status

Represents buyer-specific catalog relationship state.

Proposal-level Buyer Selling Status / export disposition states:

- Not Selling.
- Selection Pending.
- Export Confirmation Created.
- Export Confirmed.
- Export Applying.
- Export Applied.
- Export Delivery Pending.
- Export Delivery Failed.
- Export Failed.
- Baseline Advanced.
- Accessory Added.
- Selling.
- Stop Selling.
- Review Required.

Fields:

- Buyer scope.
- Product/variant reference.
- Current buyer selling/export disposition status.
- Status reason.
- Source export reference.
- Export confirmation reference.
- Export confirmation line reference.
- Export apply disposition.
- Export delivery disposition reference where applicable.
- Logs & Audit file/download evidence reference where applicable.
- Baseline advancement reference.
- Buyer relationship update disposition.
- Actor/source.
- Effective date/time.
- History reference.
- Integration update signal reference.
- Audit reference.

Buyer Selling Status does not overwrite vendor-submitted lifecycle or availability facts. Stop Selling affects only the buyer-product relationship and preserves order, return, reporting, invoice, and audit history. Accessory Added / Selling should advance only when Product Catalog export rules consider the export applicable and successfully applied.

## Sales Channel Eligibility

Represents product-level sales channel flags/scopes accepted by Product Catalog governance.

Fields:

- Product/variant reference.
- Sales channel type, such as retail, online, internal, or future channel placeholder.
- Vendor source reference.
- Effective dates.
- Review state.
- Buyer channel eligibility reference from Tenant Company where needed.

Tenant Company owns buyer channel eligibility. Product Catalog owns accepted product channel flags.

## Buyer-Facing Derived Product Status

Derived status is a projection, not a source status.

It may consider:

- Lifecycle state.
- Availability state.
- Release Date / Launch Date.
- EOL Date and sell-through policy.
- EOL policy signal and downstream disposition references.
- Buyer eligibility and permissions.
- Buyer Selling Status / export disposition state.
- Device compatibility and buyer device portfolio fit.
- Accessory discovery context and selection/export disposition where relevant.
- Sales channel eligibility.
- Pricing readiness.
- Media readiness.
- Launch eligibility evidence.
- Availability evidence.
- Export/sync state and export baseline applicability.
- Review/exception state.

Derived status should include evidence references and should not replace the underlying source states.

## Catalog Change Record

Catalog changes should be audit-ready.

Change records should cover identity, identifiers, attributes, variants, lifecycle, availability, availability evidence, release/launch dates, launch eligibility evidence, EOL, EOL downstream dispositions, compatibility, pricing inputs, media attachment references, buyer visibility, accessory discovery context where sensitive, buyer selection, export confirmation, confirmation-line recheck/apply, buyer selling status, activation/download, exports, export baselines, import corrections, and stop-sell/deactivation changes.

Logs & Audit owns immutable audit evidence. Product Catalog owns catalog change history and source state.

## Relationships

- Accessory Product may have one or more Product Variants.
- Product or variant may have many identifiers scoped by Identifier Namespace.
- Product or variant may have many structured color assignments and attribute values.
- Product or variant may have many Compatibility Mappings to Device Catalog-owned Device References.
- Product or variant may have lifecycle, availability, publication, visibility, release/launch, EOL, and archival records.
- Product or variant may have one or more Availability Evidence Records and Launch Eligibility Evidence Records.
- Product or variant may have one or more EOL Policy Signals with downstream disposition references.
- Product or variant may have many Product Media Asset References and Media Mapping Evidence References.
- Buyer Accessory Discovery Context consumes Device Catalog My Devices references and Tenant Company scope evidence.
- Buyer Accessory Selection Set has one Accessory Export Confirmation Record when export is requested.
- Accessory Export Confirmation Record has one or more Accessory Export Confirmation Lines.
- Accessory Export Confirmation Line may result in Buyer Product Export Line Reference and buyer relationship update reference when applied.
- Buyer Product Relationship links buyer scope to product or variant and owns Buyer Selling Status / export disposition state.
- Buyer Product Export Record contains one or more Buyer Product Export Line References and may advance one Export Baseline Record.
- Catalog Change Record references changed entity, actor/source, prior/new summary, entity version, import batch, and tenant scope.

## Retention

Proposal-level retention should preserve:

- Archived and EOL products referenced by orders, returns, invoices, reports, exports, buyer relationships, or audit records.
- Compatibility history and destructive import previews/confirmations.
- Buyer accessory discovery context history where sensitive or audit-worthy.
- Buyer selection set, export confirmation, confirmation-line recheck/apply, and export apply disposition history.
- Buyer export/download history, export baseline history, and last successful applicable export timestamp.
- Buyer Selling Status history.
- Availability evidence and EOL policy/disposition history used by downstream modules.
- Launch eligibility evidence and waiver/override references.
- Catalog change records and import correction evidence.

## Tenant Isolation Notes

- Buyer visibility, buyer selling status, export history, export confirmation lines, export baseline state, discovery context, search/filter state, selection set, admin buyer context, and derived status must be scoped to buyer, parent, child entity, role, relationship, and channel boundaries.
- Cross-tenant product, export, pricing input, compatibility, media, discovery, selection, and buyer relationship data must not leak.
- Product Catalog consumes Tenant Company scope and permission signals but does not own or infer them.

## Buyer Product Export Job Foundation Data Model

This section documents the data-model extensions required for the Buyer Product Export Job Foundation. All existing Product Catalog data-model entries (Accessory Export Confirmation Record, Accessory Export Confirmation Line, Product Catalog Export Apply Disposition, Buyer Product Export Record, Export Baseline Record, Buyer Product Relationship and Buyer Selling Status, Sales Channel Eligibility, Buyer-Facing Derived Product Status, all other baseline) are preserved without modification. Existing Buyer Product Export Record is NOT renamed, deprecated, or replaced; it remains the per-buyer-per-product completed-export record produced by successful Items.

### Architectural placement

- Buyer Product Export Job is the NEW orchestration parent entity.
- Buyer Product Export Job SITS ABOVE the existing Buyer Product Export Record.
- Buyer Product Export Item produces per-product Buyer Product Export Record entries (or equivalent successful-item evidence) on terminal success.
- Buyer Product Export Selection Snapshot freezes eligible product IDs at job creation.
- Existing references from Export Baseline Record, Buyer Product Relationship / Selling Status, Latest Accessories baseline, and Logs & Audit file / download evidence to the existing Buyer Product Export Record remain valid.

### Buyer-scope triad (data-model invariant)

Every entity / sub-structure introduced in this section that represents buyer-specific state carries the buyer-scope triad:

- `buyer_reference` (REQUIRED).
- `company_scope_reference` (REQUIRED).
- `buyer_entity_reference` (REQUIRED; or equivalent buyer-scope key per existing Tenant Company baseline).

This triad architecturally guarantees that one buyer's state cannot be read or mutated under another buyer's scope: every read / write is keyed on the triad. There is no cross-buyer key.

### Boundary wording (locked verbatim where the boundary is data-model-relevant)

`Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.`

---

### Buyer Product Export Job

Represents the parent orchestration entity for a buyer product export action. Created for every export, including individual Add Accessory clicks.

Proposal-level fields (reference-first):

- `buyer_product_export_job_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED).
- `actor_reference` OR `service_trigger_reference` (one populated per existing PR-A pattern).
- `export_method` (api, file, mixed; consistent with existing baseline export_method semantics).
- `trigger_kind` (one of 11 values: `single_add_accessory`, `multi_select`, `select_all_visible`, `select_all_filtered`, `select_all_eligible_for_devices`, `recommended_set`, `on_sale_set`, `admin_on_behalf`, `scheduled`, `retry`, `reprocess`).
- `prior_job_reference` (populated for `trigger_kind = retry` and `trigger_kind = reprocess`; nullable otherwise).
- `requested_timestamp`.
- `selection_snapshot_reference` (links to Buyer Product Export Selection Snapshot).
- `accessory_export_confirmation_reference` (links to existing Accessory Export Confirmation Record; preserved baseline).
- `accessory_export_confirmation_line_references` (per existing baseline).
- `job_status` (one of 14 Job statuses).
- `terminal_timestamp` (nullable; populated on terminal status).
- `applied_throttle_policy_references` (list of named policies that applied during the Job's lifecycle: Buyer Export Concurrency Policy, Tenant / Company Export Concurrency Policy, Vendor Fairness Throttle Policy, System Export Queue Policy, Job Item Limit Policy, Batch Size Policy, Integration Dispatch Rate Policy, Retry Budget Policy, Duplicate / Idempotency Policy, Small-Job Fairness / Queue Priority Policy).
- `idempotency_key` (per existing Tenant / PR-A discipline).
- `correlation_reference`, `trace_reference`.
- `audit_record_reference` (PR-A).
- `status_history_reference` (links to Buyer Product Export Job Status History).
- `result_summary_reference` (links to Buyer Product Export Result Summary; populated on terminal status).
- `error_summary_reference` (links to Buyer Product Export Error rollup; populated when applicable).
- `batch_references` (list; non-empty for batched Jobs).
- `item_references` (list; per-Item references).
- `buyer_product_export_file_reference` (populated ONLY when a file artifact exists; references Logs & Audit / File Tracking).
- `integration_dispatch_reference` (populated when at least one Item has a recorded dispatch reference; references Integration Management delivery / receipt evidence).
- `evidence_kind_references` (list of Logs & Audit evidence kinds emitted: `buyer_product_export_batch`, `buyer_product_export_item`, `buyer_product_export_baseline`).

### Buyer Product Export Item

Represents item-level child of Buyer Product Export Job. Source of item-level success / failure. REQUIRED for per-accessory Add Accessory / Accessory Added state.

Proposal-level fields:

- `buyer_product_export_item_id`.
- `parent_buyer_product_export_job_id`.
- `parent_buyer_product_export_batch_id` (nullable; populated when batched).
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED; inherited from parent Job).
- `product_reference`.
- `variant_reference` (where applicable).
- `product_source_version_reference` (snapshot at job creation; preserves the product version evidence used at snapshot time).
- `accessory_export_confirmation_line_reference` (links to existing baseline confirmation line).
- `item_status` (one of 14 Item statuses).
- `item_status_history` (per-Item, append-only, light-weight).
- `eligibility_disposition` (`eligible`, `ineligible`, `pending_re_evaluation`).
- `ineligibility_reason_reference` (populated when `eligibility_disposition = ineligible`).
- `dispatch_reference` (Integration Management dispatch reference for this Item; populated when dispatch has occurred).
- `activation_reference` (buyer-scoped activation / catalog mapping reference; populated ONLY on `item.activated`).
- `buyer_product_export_record_reference` (existing baseline; populated on Item terminal success; the existing per-buyer-per-product completed-export record).
- `export_baseline_record_reference` (existing baseline; populated when this Item contributes to an Export Baseline Record advance).
- `retry_attempt_count`.
- `retry_budget_remaining` (per Retry Budget Policy).
- `error_reference` (links to Buyer Product Export Error; populated on failure).
- `terminal_timestamp` (nullable).
- `correlation_reference`, `trace_reference`.
- `audit_record_reference` (PR-A).

**Critical rule:** `item.activated` is the ONLY Item status that drives final Accessory Added.

### Buyer Product Export Selection Snapshot

Freezes buyer-scoped eligible product IDs at job creation. REQUIRED for snapshot semantics.

Proposal-level fields:

- `buyer_product_export_selection_snapshot_id`.
- `parent_buyer_product_export_job_id`.
- `snapshot_timestamp`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED; snapshot is buyer-scoped).
- `selection_kind` (mirrors Job's `trigger_kind` where applicable).
- `selection_set_reference` (links to Buyer Accessory Selection Set when present; preserved baseline).
- `filter_scope_reference` (where applicable; for `select_all_filtered`).
- `visibility_projection_reference_at_snapshot` (Tenant Company / Product Catalog visibility evidence at snapshot time).
- `compatibility_projection_reference_at_snapshot` (RESERVED for future Buyer-Scoped Compatibility Projection PR; not populated until that PR locks the projection).
- `source_evidence_reference` (catalog-state versions covered at snapshot time).
- `eligible_product_references` (the frozen ID set).
- `excluded_product_reason_summary` (per existing Export Baseline Record pattern, applied at snapshot rather than at export-complete).
- `audit_record_reference` (PR-A).

The Selection Snapshot does NOT create global or cross-buyer activation state.

---

### Buyer Product Export Batch (sub-structure)

Optional sub-structure for large Jobs. Groups Items for dispatch / throttle / progress purposes. NOT an operational source of truth: Item records remain canonical for item-level state. Batches are NOT independently retried at the batch level; retry is per-Item per Retry Budget Policy.

Proposal-level fields:

- `buyer_product_export_batch_id`.
- `parent_buyer_product_export_job_id`.
- `batch_sequence` (within the Job).
- `batch_item_references`.
- `batch_status` (one of `pending`, `dispatch_pending`, `processing`, `completed`, `completed_with_errors`, `failed`, `throttled`).
- `dispatch_window_reference` (when Integration Dispatch Rate Policy applied).
- `terminal_timestamp` (nullable).
- `audit_record_reference` (PR-A).

### Buyer Product Export Job Status History (sub-structure)

Append-only Job status transition history. May be event-derived if repo convention prefers.

Per-entry fields:

- `buyer_product_export_job_status_history_entry_id`.
- `parent_buyer_product_export_job_id`.
- `prior_status`.
- `new_status`.
- `transition_timestamp`.
- `reason_reference`.
- `applied_throttle_policy_references` (where applicable).
- `actor_reference` OR `service_trigger_reference` (one populated for explicit transitions; system-initiated transitions use service_trigger_reference).
- `audit_record_reference` (PR-A).

### Buyer Product Export Result Summary (sub-structure)

Per-Job rollup of Item outcomes at Job terminal time. Populated on Job terminal status.

Proposal-level fields:

- `parent_buyer_product_export_job_id`.
- `count_by_item_status` (count of Items in each of 14 Item statuses at terminal).
- `count_by_ineligibility_reason` (where applicable).
- `count_by_error_kind` (eligibility, dispatch, integration_transport, item_validation, buyer_authority, system).
- `count_succeeded` (Items in `activated`).
- `count_failed` (Items in `failed`).
- `count_retried` (Items that went through `retry_scheduled` at least once).
- `count_skipped` (Items in `skipped`).
- `count_canceled` (Items in `canceled`).
- `count_ineligible` (Items in `ineligible`).
- `baseline_applicability_summary` (whether this Job contributed to Export Baseline Record advancement).
- `file_artifact_reference` (where applicable; links to Logs & Audit / File Tracking).
- `dispatch_reference_summary` (rollup of Integration Management dispatch references).
- `terminal_job_status`.
- `audit_record_reference` (PR-A).

### Buyer Product Export Error (sub-structure)

Per-Item or per-Job error envelope.

Proposal-level fields:

- `error_kind` (one of `eligibility`, `dispatch`, `integration_transport`, `item_validation`, `buyer_authority`, `system`).
- `error_reason_reference`.
- `retryable_flag`.
- `retry_attempt_count`.
- `root_cause_reference` (where determined).
- `dispatch_reference` (when `error_kind = dispatch` or `integration_transport`; links to Integration Management evidence).
- `audit_record_reference` (PR-A).

NOT a standalone operational entity; lives inside Item or Job.

---

### Buyer-scoped activation / catalog mapping

Successful item-level export (`item.activated`) creates or updates a buyer-scoped activation / catalog mapping record. The mapping record is keyed on the buyer-scope triad and is the canonical driver for Accessory Added.

Proposal-level fields:

- `buyer_activation_catalog_mapping_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED).
- `product_reference`, `variant_reference` (where applicable).
- `source_buyer_product_export_item_reference` (the Item that drove the activation).
- `source_buyer_product_export_record_reference` (existing baseline; the per-buyer-per-product completed-export record).
- `activation_timestamp`.
- `activation_reason_reference`.
- `prior_state_reference` (the prior buyer relationship state).
- `new_state_reference` (the resulting buyer relationship state, typically Accessory Added).
- `audit_record_reference` (PR-A).

Architectural guarantee: cross-buyer reads / mutations are impossible because the mapping is keyed on the buyer-scope triad. There is no cross-buyer key.

### Add Accessory / Accessory Added rule (data-model level)

Canonical rule (verbatim; see `accessory-discovery-selection.md` for the normative location):

Add Accessory changes to Accessory Added and becomes disabled only after that specific accessory has a successful item-level export / activation outcome for that buyer. Selection, job request, queued state, processing state, bulk job inclusion, or another buyer's export is not final activation. Failed items remain actionable or retryable for that buyer. Bulk export updates must be item-level: successful items become Accessory Added for that buyer only; failed items do not. Buyer catalog mapping / activation is scoped by buyer / company / entity and drives final Accessory Added state.

Buyer-specific rule (verbatim):

Accessory Added is buyer-specific and must be driven by that buyer's item-level successful export / activation record. One buyer's export must never gray out, disable, activate, or otherwise change the Add Accessory state for another buyer.

The data-model lock is:

- Every activation / catalog mapping record REQUIRES the buyer-scope triad.
- Only Item status `activated` triggers activation / catalog mapping record creation or update.
- Failed Item (`failed`), ineligible Item (`ineligible`), skipped Item (`skipped`), canceled Item (`canceled`) do NOT create activation / catalog mapping records.
- Non-terminal Item statuses (`pending`, `validating`, `eligible`, `queued`, `processing`, `dispatch_pending`, `exported`, `activation_pending`, `retry_scheduled`) do NOT create activation / catalog mapping records.

### What this data-model section intentionally does NOT introduce

- No new top-level Product Catalog entities outside the 3 primary + 4 sub-structure model.
- No standalone Buyer Product Export Throttle Record entity.
- No standalone Buyer Product Export Retry Record entity.
- No standalone Buyer Product Export Cancellation Record entity.
- No standalone Buyer Product Export Integration Dispatch Record entity (Integration Management owns dispatch records; Product Catalog records dispatch references).
- No rename of Buyer Product Export Record. Existing Buyer Product Export Record is preserved as the per-buyer-per-product completed-export record.
- No rename of Export Baseline Record. Existing Export Baseline Record is preserved.
- No rename of Buyer Product Relationship / Selling Status. Existing 13 statuses preserved.
- No rename of Accessory Export Confirmation Record / Line. Existing baseline preserved.
- No concrete persistence schema. Implementation owns persistence.
- No concrete query indexing strategy. Implementation owns.
- No concrete propagation latency. Implementation owns.
- No concrete UI / UX field shapes. Future UX / UI.
- No buyer-scoped compatibility projection field population. Future PR.
- No My Devices add / remove sync field set. Future PR.
- No global compatibility export field set. Bounded by existing rules.
- No `audit_export.*` capability references. PR #103 capability set is for compliance audit report exports, not buyer product exports.
- No new tenant capabilities, role bundles, or service identity profiles. Existing Tenant Company baseline is sufficient.

## Buyer-Scoped Compatibility Projection Data Model

This section documents the Product Catalog data-model extensions for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. All existing Product Catalog data-model entries (PR #104 entities, existing baseline entities) are preserved without modification. The Device Catalog side is documented in `modules/device-catalog/data-model.md`.

### Boundary wording (locked verbatim where data-model-relevant)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Buyer-scope triad (data-model invariant)

Every entity / sub-structure introduced in this section that represents buyer-specific state carries the buyer-scope triad:

- `buyer_reference` (REQUIRED).
- `company_scope_reference` (REQUIRED).
- `buyer_entity_reference` (REQUIRED; or equivalent buyer-scope key per existing Tenant Company baseline).

Cross-buyer reads / mutations are architecturally impossible: every record is keyed on the triad. There is no cross-buyer key.

---

### Buyer-Scoped Compatibility Projection

Canonical buyer-scoped projection. Derived from Device Catalog Buyer Device Portfolio Snapshot + Product Catalog vendor-owned compatibility mappings + Product Catalog / Tenant visibility rules. Buyer-scoped only; no global projection exists.

Proposal-level fields (reference-first):

- `buyer_scoped_compatibility_projection_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED).
- `buyer_device_portfolio_snapshot_reference` (REQUIRED; from Device Catalog).
- `projection_status` (one of 6 values: `current`, `stale`, `recalculating`, `failed`, `review_required`, `superseded`).
- `projection_timestamp`.
- `projection_version`.
- `source_compatibility_mapping_version_reference` (REQUIRED; snapshots the vendor-owned compatibility mapping version used).
- `source_visibility_projection_reference` (REQUIRED; snapshots Tenant / Product Catalog visibility evidence used).
- `compatible_accessory_references` (the projection result; the accessory IDs visible / exportable for this buyer at this projection version).
- `excluded_accessory_reason_summary` (counts by exclusion reason; e.g., `not_compatible_with_any_active_device`, `lifecycle_blocked`, `visibility_denied`, `sales_channel_excluded`).
- `prior_projection_reference` (nullable; populated when this projection supersedes a prior version; preserves evidence chain).
- `projection_evidence_reference` (Logs & Audit Evidence Record reference per existing PR-A pattern; evidence kind: `buyer_compatibility_projection`).
- `correlation_reference`, `trace_reference`.
- `audit_record_reference` (PR-A).
- `status_history_reference` (links to Buyer Compatibility Projection Status History).

### Buyer Accessory Compatibility Impact Record

Per-accessory record of how a portfolio change affects an accessory the buyer has ALREADY activated (Accessory Added, Selling, or with a Buyer Product Export Record). Distinct from projection: projection is forward-looking; impact record is backward-looking per-accessory consequence assessment.

Proposal-level fields:

- `buyer_accessory_compatibility_impact_record_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED).
- `product_reference`, `variant_reference` (where applicable).
- `triggering_buyer_device_portfolio_change_record_reference` (REQUIRED; from Device Catalog).
- `prior_buyer_scoped_compatibility_projection_reference` (the projection before the change).
- `current_buyer_scoped_compatibility_projection_reference` (the projection after the change).
- `impact_state` (one of 7 values: `unaffected`, `no_longer_compatible`, `compatibility_restored`, `review_required`, `hidden_from_active_addable_list`, `compatibility_narrowed`, `compatibility_expanded`).
- `affected_buyer_relationship_state` (snapshot of buyer relationship state at impact time: Accessory Added, Selling, etc.).
- `recommended_buyer_action` (one of: `none`, `review`, `stop_selling_recommended`, `acknowledge`, `manual_remap_required`).
- `acknowledged_flag` (whether buyer or admin has acknowledged the impact).
- `acknowledged_timestamp` (nullable).
- `acknowledged_actor_reference` (nullable).
- `impact_evidence_reference` (Logs & Audit Evidence Record reference; evidence kind: `buyer_compatibility_impact`).
- `correlation_reference`, `trace_reference`.
- `audit_record_reference` (PR-A).

---

### Buyer Accessory Visibility Projection (sub-structure)

Per-buyer visible-accessory set derived from the projection. Sub-structure of Buyer-Scoped Compatibility Projection; not a standalone operational entity.

Proposal-level fields:

- `parent_buyer_scoped_compatibility_projection_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; inherited).
- `active_addable_accessory_references` (accessories visible AND not yet activated; the Add Accessory candidate set).
- `accessory_added_accessory_references` (accessories the buyer has activated; preserved regardless of compatibility changes).
- `selling_with_compatibility_warning_accessory_references` (accessories Selling with `current_compatibility_impact_state` not `unaffected`).
- `hidden_from_active_addable_list_accessory_references` (accessories filtered out of active addable list due to no longer being compatible).
- `visibility_projection_timestamp`.
- `audit_record_reference` (PR-A).

### Buyer Compatibility Projection Status History (sub-structure)

Append-only projection status transition history. Mirrors PR #104 Buyer Product Export Job Status History pattern.

Per-entry fields:

- `buyer_compatibility_projection_status_history_entry_id`.
- `parent_buyer_scoped_compatibility_projection_id`.
- `prior_projection_status`.
- `new_projection_status`.
- `transition_timestamp`.
- `reason_reference`.
- `triggering_buyer_device_portfolio_change_record_reference` (nullable; populated for change-triggered transitions).
- `triggering_compatibility_mapping_change_reference` (nullable; populated for vendor-side change-triggered transitions).
- `actor_reference` OR `service_trigger_reference` (one populated; service-initiated transitions use service_trigger_reference).
- `audit_record_reference` (PR-A).

---

### PR #104 Buyer Product Export Selection Snapshot - fields populated / added by this PR

The PR #104 Selection Snapshot entity is NOT renamed or replaced. Two field-level changes:

- **`compatibility_projection_reference_at_snapshot`** (REQUIRED; was reserved in PR #104; populated here). Type: reference to Buyer-Scoped Compatibility Projection. Captured at PR #104 Workflow 2 (Export Selection Snapshot).
- **`compatible_device_references_at_snapshot`** (NEW field). Documents which buyer devices were active at snapshot time; supports per-Item compatibility ineligibility reason recording.

### PR #104 Buyer Product Export Error - new error_kind value added by this PR

The PR #104 Buyer Product Export Error sub-structure's `error_kind` enumeration is EXTENDED with one new value (additive per PR #104 discriminator extension discipline):

- `compatibility_mismatch` (NEW). Accessory not compatible with any active device in the buyer's My Devices portfolio.

Existing values preserved: `eligibility`, `dispatch`, `integration_transport`, `item_validation`, `buyer_authority`, `system`.

### Buyer-scoped activation / catalog mapping - 5 new fields added by this PR

The PR #104 buyer-scoped activation / catalog mapping record gains 5 new fields:

- `compatibility_projection_reference_at_activation` (the projection in effect when the accessory was activated).
- `active_compatible_device_count_at_activation` (count of compatible active devices at activation).
- `compatible_device_references_at_activation` (the actual device references compatible at activation).
- `current_compatibility_impact_state` (latest impact state from the most recent Buyer Accessory Compatibility Impact Record; default `unaffected`).
- `latest_buyer_accessory_compatibility_impact_record_reference` (nullable; points to the most recent impact assessment).

---

### Buyer-scoped projection / impact - data-model rules

#### Add Accessory / Accessory Added preservation

The PR #104 canonical Add Accessory / Accessory Added rule is preserved verbatim. Compatibility changes do NOT roll back Accessory Added. Specifically:

- A buyer who has activated an accessory via successful export (PR #104 Item terminal `activated`) retains Accessory Added state even if the buyer subsequently removes the compatible device.
- The accessory enters the Buyer Accessory Compatibility Impact Record surface with `impact_state` reflecting the consequence.
- Buyer relationship state is preserved via `current_compatibility_impact_state` on the activation / catalog mapping record.

#### Selling state preservation

- Selling state is PRESERVED. Compatibility changes produce a Buyer Accessory Compatibility Impact Record on currently-Selling accessories.
- Selling is NOT auto-transitioned to Stop Selling.
- The buyer / admin decides Stop Selling explicitly per existing baseline.

#### Empty My Devices state

- A buyer with no active devices has a VALID projection at `projection_status = current` with empty `compatible_accessory_references`.
- Accessory List shows empty state.
- PR #104 export Job creation may proceed; Selection Snapshot binds the empty projection; Items are zero (PR #104 supports zero-Item Jobs).

#### Cross-buyer non-interference (architectural guarantee)

- Every projection, impact record, and activation / catalog mapping record carries the buyer-scope triad.
- There is no cross-buyer key.
- Buyer 1's projection cannot be read or mutated under Buyer 2's scope.
- The same accessory can be in Buyer 2's `compatible_accessory_references` while in Buyer 1's `no_longer_compatible` impact state.

#### Vendor-owned compatibility mapping preservation

- Vendor-owned compatibility mappings (which accessories are compatible with which devices, in the abstract) remain read-only sources for the projection.
- The projection is DERIVED from them, not a replacement.
- Vendor-owned mappings are NEVER mutated by buyer action.

#### Canonical Device Catalog record preservation

- Canonical Device records and Device References remain Device-Catalog-owned.
- Product Catalog REFERENCES them via the projection; never mutates them.

#### Historical evidence preservation

- Historical Buyer Product Export Records are PRESERVED per PR #104; never mutated by compatibility changes.
- Historical Logs & Audit Evidence Records and File Tracking Records are PRESERVED; never mutated.
- Orders, returns, invoices, audit evidence are PRESERVED; never mutated.

### What this data-model section intentionally does NOT introduce

- No global Buyer-Scoped Compatibility Projection (the projection is buyer-scoped only).
- No Product Catalog-owned canonical Device records.
- No Product Catalog-owned My Devices source records.
- No Product Catalog-owned Buyer Device Portfolio Snapshot or Buyer Device Portfolio Change Record (those live in Device Catalog).
- No automatic Stop Selling record from device removal.
- No standalone Buyer Compatibility Recalculation Job entity.
- No standalone Buyer Compatibility Recalculation Item entity.
- No standalone Buyer Compatibility Recalculation Throttle / Retry / Cancellation entities (workflow behaviors only).
- No new tenant capabilities, role bundles, or service identity profiles.
- No new Logs & Audit entities (4 new evidence kinds emitted via existing `service_identity.evidence_emit`).
- No new Notification Platform entities.
- No new Integration Management entities.
- No concrete persistence schema. Implementation owns.
- No concrete query indexing strategy. Implementation owns.
- No concrete propagation latency. Implementation owns.
- No concrete UI / UX field shapes. Future UX / UI.
- No accessory-to-accessory compatibility (deferred future phase).
- No global compatibility export payload (bounded by buyer-scoped projection only).
- No `audit_export.*` capability references (PR #103 family is for compliance audit report exports).
- No rename, deprecation, or replacement of any existing baseline data-model entry.
