# Accessory Discovery & Selection - Buyer Experience Rules

This document is the normative Product Catalog sub-contract for accessory discovery and buyer selection behavior. Canonical module files should reference this document for detailed rules rather than duplicating every discovery, export confirmation, and buyer relationship state rule.

This document remains proposal-level architecture. It does not finalize UI implementation details, export file formats, downstream operational behavior, or unresolved business rules.

Product Catalog owns accessory discovery, product visibility projection, buyer-product relationship state, export selection/confirmation references, per-item export eligibility, export apply disposition, Latest Accessories baseline rules, and per-buyer Accessory Added / Selling / Stop Selling state. Product Catalog must not mutate vendor-owned accessory source facts when a buyer exports, adds, or stops selling an accessory.

## Boundary Summary

Product Catalog owns:

- Accessory discovery and buyer-facing product visibility projection.
- Buyer accessory search/filter state where persisted or auditable.
- Buyer accessory selection sets and export confirmation references.
- Per-item Accessory Export Confirmation Lines / Selected Accessory Eligibility Lines.
- Product Catalog export records and export apply disposition.
- Buyer Product Export Records and export baseline references.
- Per-buyer Accessory Added / Selling / Stop Selling state.
- Product Catalog events/signals related to discovery, selection, export confirmation, export apply disposition, baseline advancement, and buyer accessory state.

Device Catalog owns canonical device records and My Devices portfolio source references. Product Catalog consumes Device Catalog references for compatibility filtering and must not mutate My Devices portfolio state.

Tenant Company owns buyer account status, eligibility, relationship scope, permissions, System Admin buyer context authority, and act-on-behalf authority. Product Catalog consumes Tenant Company evidence and must not infer eligibility independently.

Integration Management owns external export delivery/receipt evidence. Logs & Audit owns immutable export, file, access, and audit evidence. Notification Platform Service owns notification delivery. Order Routing and Fulfillment / Returns may consume buyer selling/export state later, but they do not own accessory discovery or buyer relationship truth.

## Buyer Device Prerequisite

Buyers must have at least one active device in My Devices before accessories are displayed.

If a buyer has no active devices, the Accessory List page must show an empty state message:

> Create your device portfolio to view compatible accessories.

The empty state should include the primary action:

> Go to My Devices.

The empty state is a Product Catalog discovery projection based on Device Catalog-owned My Devices portfolio references and Tenant Company-owned buyer scope evidence.

## My Devices Entry Flow

When a buyer selects `View Accessories` from a device in My Devices, the Accessories page must open with that device pre-selected in the Device filter.

The Device filter must always show all devices in the buyer's My Devices portfolio, even when one device is pre-selected. The buyer must be able to remove or expand the selected device filter without leaving the Accessories page.

Pre-selection changes the filter state only. It must not change the My Devices portfolio, compatibility mappings, buyer eligibility, vendor access, or product lifecycle state.

## Result Eligibility Rules

Accessory results must always respect all applicable source-owned or Product Catalog-owned evidence:

- Device compatibility.
- Buyer visibility rules.
- Vendor access rules.
- Lifecycle status.
- Availability status.
- Sales channel eligibility.
- Buyer account status.

Product Catalog owns the resulting visibility projection for accessory discovery. Device Catalog owns Device References and My Devices source references. Tenant Company owns buyer account status, eligibility, relationship scope, and permissions. Product Catalog should route missing, stale, conflicting, or non-bindable source evidence to review rather than showing accessories by inference.

## Filters

The Accessories page must support proposal-level filters for:

- Device.
- Category.
- Color.
- Price.
- Vendor.
- Availability.
- Selling Status.
- On Sale.
- Latest Accessories.

Filters must be combinable and applied together. Filter application must preserve compatibility, buyer visibility, vendor access, lifecycle, availability, channel eligibility, buyer account status, and Tenant Company scope constraints.

The `Latest Accessories` filter must be disabled or unavailable when the buyer has never completed an applicable successful accessory export/download baseline.

## Search

Accessory search must support:

- Accessory Name.
- Brand / Vendor.
- SKU.
- UPC.
- Keyword search.

Search results must respect active filters, device compatibility rules, buyer visibility rules, vendor access rules, lifecycle/availability state, sales channel eligibility, buyer account status, and Product Catalog redaction or visibility projections.

SKU and UPC matching should preserve identifier text semantics. Import/export identifier preservation expectations should align with `architecture/standards/import-export-validation-governance.md`.

## Selection And Export Confirmation

Buyers must be able to select multiple accessories for export. Export must not execute until the buyer confirms.

Before export, Product Catalog should create an Accessory Export Confirmation Record that shows:

- Selected accessory count.
- Vendors represented in the selection.
- Devices represented by compatibility/filter context.
- Warnings such as already exported, Out of Stock, or On Sale.

The confirmation summary is not enough by itself. Each selected accessory must have its own Accessory Export Confirmation Line / Selected Accessory Eligibility Line so Product Catalog can preserve product/version evidence, source-state disposition, warning/blocker classification, and applied/ignored result for each selected accessory.

Confirmation must recheck required source evidence before export. If an accessory becomes End of Life, Out of Stock, review-required, no longer buyer-visible, no longer compatible, no longer channel-eligible, or no longer buyer-eligible after selection but before confirmation, the confirmation line must block, warn, or route to review according to Product Catalog rules. Blocked lines must not advance buyer accessory relationship state.

The confirmation screen must allow the buyer to cancel or go back and return to the Accessory List without losing the current selection. Export is executed only after confirmation and after required confirmation-line rechecks.

Exports are incremental. Buyers may add more accessories later. If a buyer exported too many accessories, the buyer may use Stop Selling for individual or bulk accessories where permissions and company configuration allow.

## Accessory Export Confirmation Line

Represents per-selected-accessory eligibility and disposition evidence inside an Accessory Export Confirmation Record.

Proposal-level fields/concepts:

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

The line-level model prevents one stale or blocked item from being hidden inside a valid summary. Product Catalog should retain applied, ignored, blocked, warning, and review-required line outcomes so later exports, baseline decisions, buyer state updates, and audit review can explain exactly what happened.

## Per-Buyer Accessory State

Exported / Accessory Added state must be tracked per buyer and must not affect any other buyer.

Export confirmation, Product Catalog export record creation, Logs & Audit file/download evidence, Integration delivery evidence, Latest Accessories baseline advancement, and buyer relationship state advancement are separate steps. A confirmed export does not automatically mean external delivery succeeded.

Accessory Added / Selling state should advance only when Product Catalog export rules consider the export applicable and successfully applied. If Integration delivery fails after Product Catalog export confirmation, buyer relationship state should reflect pending, failed, or review disposition where appropriate rather than silently becoming Selling.

Proposal-level buyer accessory relationship/export disposition states:

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

`Stop Selling` applies only to that buyer-accessory relationship. It must not change the vendor-owned accessory record, product lifecycle state, product availability state, compatibility mapping, media attachment, pricing evidence, or another buyer's state.

Order Routing and Fulfillment / Returns may consume buyer selling/export state later for their own workflows, but they do not own accessory discovery or buyer-product relationship truth.

## Export Apply And Delivery Disposition Controls

Represents how Product Catalog separates local export apply behavior from external delivery, audit evidence, baseline advancement, and buyer relationship advancement.

Proposal-level fields/concepts:

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

Product Catalog owns buyer accessory relationship state and export apply disposition. Integration Management owns external delivery/receipt evidence. Logs & Audit owns immutable export/file/download evidence. Product Catalog must not treat Integration delivery success as Product Catalog-owned transport truth, but it may represent delivery pending/failed state based on Integration evidence references.

Latest Accessories baseline should advance only after a successful applicable export/download baseline, consistent with the Product Catalog export baseline model.

## Latest Accessories Baseline

Product Catalog must track each buyer's last successful accessory export timestamp and the scoped Buyer Product Export Baseline evidence behind that timestamp.

The `Latest Accessories` filter must show accessories added or released after the buyer's last successful applicable export baseline.

A timestamp alone is not enough. The baseline should preserve export schema, product type scope, filter scope, buyer/entity scope, visibility/access projection, included product references, excluded product reason summary, partial export state, revoked/superseded state, delivery failed state, applicability for Latest Accessories, and audit reference as defined by the Product Catalog export baseline model.

Partial, failed, revoked, superseded, or restricted-scope exports should not advance the Latest Accessories baseline unless Product Catalog rules explicitly allow it.

## System Admin Buyer Context

System Admin users must be able to use a Buyer Context dropdown on the Accessories page to view the catalog as a selected buyer where Tenant Company permissions allow.

System Admin buyer context view should show the selected buyer's:

- My Devices portfolio.
- Exported accessories.
- Selling Status.
- Latest Accessories.
- Available compatible accessories.

System Admin buyer context view must be read-only unless the admin has explicit permission to act on behalf of the buyer. Tenant Company owns the act-on-behalf permission, role/scope projection, buyer/entity scope, and access decision evidence. Product Catalog owns the buyer-context catalog projection and any Product Catalog workflow references for act-on-behalf requests.

Sensitive buyer-context access should be audit-ready. Logs & Audit owns immutable audit evidence.

## Proposal-Level Data Concepts

### Buyer Accessory Discovery Context

Represents the Product Catalog-owned discovery session or persisted context used to evaluate accessory discovery for a buyer.

Fields/concepts:

- Discovery context id.
- Buyer/entity scope reference.
- Tenant Company access/scope evidence reference.
- My Devices portfolio reference from Device Catalog.
- Active My Devices requirement state.
- Empty-state shown flag/reference.
- Compatibility projection reference.
- Visibility projection reference.
- Created/updated timestamp.
- Review-required state.
- Audit reference.

### Selected Device Filter State

Represents device filter state, including pre-selection from My Devices.

Fields/concepts:

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

Fields/concepts:

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

Fields/concepts:

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

Fields/concepts:

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

### Accessory Export Confirmation Line

Represents line-level selected accessory evidence and disposition. Detailed fields are defined in the Accessory Export Confirmation Line section above.

### Buyer Accessory Export Baseline

Represents the scoped baseline used by Latest Accessories.

Fields/concepts:

- Export baseline id.
- Buyer/entity scope reference.
- Baseline source export reference.
- Last successful applicable export timestamp.
- Export schema version.
- Product Type scope.
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
- Audit reference.

### Per-Buyer Accessory Relationship State

Represents buyer-specific Accessory Added / Selling / Stop Selling state and export disposition state.

Fields/concepts:

- Buyer accessory relationship id.
- Buyer/entity scope reference.
- Product/variant reference.
- Current state.
- Source export reference.
- Export confirmation reference.
- Export confirmation line reference.
- Export apply disposition.
- Export delivery disposition reference.
- Logs & Audit file/download evidence reference.
- Baseline advancement reference.
- Buyer relationship update disposition.
- Stop Selling source/reference.
- Effective timestamp.
- Actor/source reference.
- Integration update signal reference where configured.
- Audit reference.

### Admin Buyer Context View

Represents System Admin catalog viewing in a selected buyer context.

Fields/concepts:

- Admin buyer context id.
- System Admin actor reference.
- Selected buyer/entity scope reference.
- Tenant Company access decision reference.
- Role/scope projection reference.
- Act-on-behalf permission reference.
- Read-only flag.
- My Devices portfolio projection reference.
- Exported accessories projection reference.
- Selling Status projection reference.
- Latest Accessories baseline reference.
- Compatible accessories projection reference.
- Sensitive access event reference.
- Audit reference.

## API / OpenAPI Contract Placeholders

Proposal-level Product Catalog APIs may include:

- `GET /product-catalog/accessories/discovery-context` to resolve buyer device prerequisite, empty-state, and visibility projection references.
- `GET /product-catalog/accessories` to list accessories using combined filters, search, compatibility evidence, and buyer visibility projection.
- `POST /product-catalog/accessories/selection-sets` to create/update buyer accessory selection sets.
- `POST /product-catalog/accessories/export-confirmations` to create an export confirmation record with line-level selected accessory eligibility records.
- `GET /product-catalog/accessories/export-confirmations/{confirmationId}` to inspect confirmation summary and line-level warning/blocker/apply disposition.
- `POST /product-catalog/accessories/export-confirmations/{confirmationId}/recheck` to recheck required source evidence before confirm where Product Catalog rules require it.
- `POST /product-catalog/accessories/export-confirmations/{confirmationId}/cancel` to cancel confirmation without discarding the selection set.
- `POST /product-catalog/accessories/export-confirmations/{confirmationId}/confirm` to execute export for eligible lines after confirmation and required rechecks.
- `GET /product-catalog/accessories/exports/{exportId}/disposition` to inspect Product Catalog export apply, delivery reference, baseline, and buyer relationship advancement disposition.
- `POST /product-catalog/buyer-accessory-relationships/{relationshipId}/stop-selling` to apply Stop Selling to one buyer-accessory relationship.
- `POST /product-catalog/buyer-accessory-relationships/bulk-stop-selling` to apply Stop Selling in bulk where permissions allow.
- `GET /product-catalog/admin/buyer-context/accessories` to view Product Catalog projections as a selected buyer.
- `POST /product-catalog/admin/buyer-context/act-on-behalf-requests` to request act-on-behalf workflow references where Tenant Company authority allows.

APIs should carry Tenant Company scope evidence, Device Catalog portfolio references, Product Catalog visibility projection references, export confirmation line references, redaction classes, idempotency keys where mutations occur, and audit references where appropriate.

## Events

Product Catalog may publish proposal-level events:

- `product-catalog.accessory-discovery.empty-state-shown`.
- `product-catalog.accessory-filter.applied`.
- `product-catalog.accessory-search.performed`.
- `product-catalog.accessory-selection.updated`.
- `product-catalog.accessory-export.confirmation-created`.
- `product-catalog.accessory-export.confirmation-line.created`.
- `product-catalog.accessory-export.confirmation-line.blocked`.
- `product-catalog.accessory-export.confirmation-line.warning-recorded`.
- `product-catalog.accessory-export.confirmation-evidence.rechecked`.
- `product-catalog.accessory-export.cancelled`.
- `product-catalog.accessory-export.confirmed`.
- `product-catalog.accessory-export.apply-started`.
- `product-catalog.accessory-export.applied`.
- `product-catalog.accessory-export.delivery-pending`.
- `product-catalog.accessory-export.delivery-failed-reference-recorded`.
- `product-catalog.buyer-accessory-relationship.advancement-blocked`.
- `product-catalog.buyer-accessory-relationship.state-advanced-after-export`.
- `product-catalog.buyer-accessory-state.updated`.
- `product-catalog.latest-accessories.baseline-updated`.
- `product-catalog.latest-accessories.baseline-advancement-skipped`.
- `product-catalog.admin-buyer-context.viewed`.
- `product-catalog.admin-buyer-context.act-on-behalf-requested`.

Common event fields should include event id, event version, occurred at, buyer/entity scope reference, actor/source reference, Tenant Company access/scope evidence reference, Device Catalog My Devices or Device Reference where relevant, Product Catalog product/variant references where relevant, discovery/search/filter/selection/export/confirmation-line/relationship references where relevant, export apply disposition, redaction class, audit reference, and Integration/Notification trigger references where applicable.

These events do not imply Notification delivery, Integration transport, Logs & Audit ownership, Device Catalog mutation, Tenant Company permission mutation, Order Routing state, Fulfillment/Returns state, or buyer storefront execution.

## Permission Concepts

Tenant Company owns permission authority. Product Catalog may consume permission evidence for:

- Viewing accessory discovery results.
- Viewing accessories in a selected buyer/entity scope.
- Exporting selected accessories.
- Creating, rechecking, cancelling, or confirming export confirmations.
- Applying eligible export confirmation lines.
- Applying Stop Selling to individual accessories.
- Applying bulk Stop Selling.
- Viewing System Admin buyer context.
- Requesting or executing act-on-behalf actions.
- Downloading/exporting catalog files where allowed.

Product Catalog should preserve permission/scope evidence references on export confirmation records, confirmation lines, buyer relationship state changes, and admin buyer context views. Missing, stale, or conflicting permission evidence should block the action or route it to review.

## Workflows

### No My Devices Empty State

1. Buyer opens Accessory List.
2. Product Catalog requests/consumes My Devices portfolio references and Tenant Company buyer scope evidence.
3. If no active My Devices references exist, Product Catalog returns the empty state with `Create your device portfolio to view compatible accessories.` and the `Go to My Devices` primary action.
4. Product Catalog may emit `product-catalog.accessory-discovery.empty-state-shown`.

### View Accessories From My Devices

1. Buyer selects `View Accessories` from a Device Catalog-owned My Devices entry.
2. Product Catalog opens Accessories with that Device Reference pre-selected.
3. Device filter still lists all active My Devices references.
4. Buyer may remove or expand the Device filter without leaving the page.
5. Results are recalculated using combined filter/search/visibility rules.

### Multi-Select Export

1. Buyer filters/searches accessories and selects one or more eligible products/variants.
2. Product Catalog maintains a Buyer Accessory Selection Set.
3. Buyer requests export.
4. Product Catalog creates an Accessory Export Confirmation Record with selected count, vendors, devices, warnings, and scope evidence.
5. Product Catalog creates one Accessory Export Confirmation Line per selected accessory.
6. Product Catalog rechecks required source evidence before confirm where rules require it.
7. Blocked lines remain blocked and do not advance buyer accessory relationship state.
8. Buyer may cancel/back out and return to the Accessory List with selection preserved.
9. Export executes only after confirmation and only for eligible/applied lines.
10. Product Catalog creates or references Buyer Product Export Records and export apply disposition.
11. Product Catalog advances Accessory Added / Selling state only when Product Catalog export rules consider the line applicable and successfully applied.
12. Integration Management owns external delivery evidence where export is transmitted externally. Logs & Audit owns immutable file/download evidence.

### Stop Selling

1. Buyer selects Stop Selling for individual or bulk accessories where permissions allow.
2. Product Catalog validates buyer/entity scope, relationship state, and permission evidence.
3. Product Catalog updates only that buyer-accessory relationship state.
4. Product Catalog emits `product-catalog.buyer-accessory-state.updated`.
5. Vendor-owned accessory facts, other buyer states, order history, return history, invoice history, reporting history, and audit evidence are preserved.

### System Admin Buyer Context

1. System Admin selects a buyer in Buyer Context.
2. Product Catalog consumes Tenant Company access decision and role/scope projection evidence.
3. Product Catalog renders the selected buyer's My Devices, exported accessories, Selling Status, Latest Accessories, and available compatible accessories.
4. View is read-only unless Tenant Company evidence grants explicit act-on-behalf authority.
5. Sensitive access should be audit-ready.

## Edge Cases

- Buyer has no active devices, stale Device Catalog portfolio evidence, or inaccessible My Devices references.
- Device selected from My Devices is inactive, removed, superseded, or no longer in the buyer's portfolio.
- Device filter pre-selection yields no compatible accessories.
- Filters combine to zero results.
- Search matches SKU/UPC but the product is not buyer-visible or not compatible.
- Accessory was already exported by this buyer.
- Accessory was exported by another buyer but not this buyer.
- Accessory becomes Out of Stock, On Sale, EOL, no longer compatible, no longer channel-eligible, or review-required while selected but before confirmation.
- Confirmation line recheck detects stale, missing, superseded, ignored, or conflicting source evidence.
- One selected accessory is blocked while other selected accessories remain eligible.
- Product Catalog export applies locally but Integration delivery is pending or failed.
- Latest Accessories baseline is missing, failed, partial, revoked, superseded, restricted-scope, or skipped because no applied export lines qualify.
- Export confirmation expires or source evidence changes before confirmation.
- Stop Selling is requested for an accessory with active order/return/invoice history.
- System Admin lacks act-on-behalf permission but attempts a mutating buyer-context action.
- Integration delivery fails after Product Catalog export confirmation succeeds.
- Logs & Audit file/download evidence is missing or delayed.

## Test Scenarios

- Buyer with no My Devices sees the empty state and `Go to My Devices` action.
- `View Accessories` from My Devices opens Accessories with that device pre-selected.
- Device filter still shows all My Devices while one device is selected.
- Buyer can remove or expand selected device filter without leaving the page.
- Device, Category, Color, Price, Vendor, Availability, Selling Status, On Sale, and Latest Accessories filters combine correctly.
- Search by accessory name, brand/vendor, SKU, UPC, and keyword respects active filters and compatibility.
- Accessory results respect buyer visibility, vendor access, lifecycle, availability, channel eligibility, and buyer account status.
- Export confirmation creates one line-level eligibility record per selected accessory.
- Confirmation line records warning versus blocking classification.
- Confirmation recheck blocks a line when source evidence becomes stale, missing, conflicting, EOL, no longer buyer-visible, no longer compatible, or no longer channel-eligible before confirmation.
- Blocked confirmation lines do not advance buyer accessory relationship state.
- Exported / Accessory Added state is per buyer only.
- Export confirmation shows selected count, vendors, devices, and warnings.
- Buyer can cancel confirmation and return without losing selection.
- Export is not executed before confirmation.
- Product Catalog export apply can succeed while Integration delivery remains pending or failed by reference.
- Buyer accessory relationship advancement is blocked when export apply fails.
- Latest Accessories baseline advancement is skipped when no successful applicable export baseline exists.
- Latest Accessories is disabled when buyer has never exported.
- Latest Accessories uses last successful applicable export baseline rather than an unscoped timestamp.
- Stop Selling affects only the buyer-product relationship and preserves source accessory facts.
- Bulk Stop Selling requires appropriate Tenant Company permission evidence.
- System Admin can view catalog in buyer context.
- System Admin buyer context is read-only unless explicit act-on-behalf permission exists.
- Act-on-behalf request records Tenant Company authority evidence and Product Catalog workflow references.

## Cross-References

- Device Portfolio / My Devices: Product Catalog consumes Device Catalog-owned My Devices portfolio references for discovery and compatibility filtering.
- Buyer Visibility / Access Control: Product Catalog consumes Tenant Company eligibility, relationship, account status, role/scope, and permission evidence.
- Import / Export / Validation Governance: accessory export confirmation, file/download references, identifier preservation, and baseline handling should align with `architecture/standards/import-export-validation-governance.md`.
- Logs / Audit / Integration Reliability: Logs & Audit owns immutable file/download/audit evidence; Integration Management owns external export delivery/receipt evidence.
- Order Routing / Fulfillment: downstream modules may consume buyer selling/export state later but do not own accessory discovery or mutate buyer accessory relationship state.

## Open Questions

- Whether Product Catalog should persist every search/filter state or only persist states that produce export confirmations, admin buyer-context access, or audit-worthy access events.
- Whether `Accessory Added` and `Selling` should remain separate statuses for all buyers or collapse in some channels.
- Which restricted-scope export classes are allowed to advance the Latest Accessories baseline.
- Which confirmation-line blocker classifications are always fatal versus warning-only by buyer/channel/product type.
- Whether bulk Stop Selling requires extra confirmation or review when active downstream orders, returns, invoices, or integrations exist.
- Which System Admin act-on-behalf actions require dual approval or time-limited delegation.

## Buyer Product Export Job Item-Level Accessory Added Rule

This section is the canonical normative location for the Add Accessory / Accessory Added item-level rule under the Buyer Product Export Job foundation. The existing Per-Buyer Accessory State section (above) establishes the per-buyer principle; this section operationalizes that principle at the item level for the Job / Item / Selection Snapshot foundation.

### Canonical rule (verbatim)

Add Accessory changes to Accessory Added and becomes disabled only after that specific accessory has a successful item-level export / activation outcome for that buyer. Selection, job request, queued state, processing state, bulk job inclusion, or another buyer's export is not final activation. Failed items remain actionable or retryable for that buyer. Bulk export updates must be item-level: successful items become Accessory Added for that buyer only; failed items do not. Buyer catalog mapping / activation is scoped by buyer / company / entity and drives final Accessory Added state.

### Buyer-specific rule (verbatim)

Accessory Added is buyer-specific and must be driven by that buyer's item-level successful export / activation record. One buyer's export must never gray out, disable, activate, or otherwise change the Add Accessory state for another buyer.

### Sub-rules (locked in this PR)

- Pending export state is NOT final activation.
- Queued export state is NOT final activation.
- Processing state is NOT final activation.
- Failed export item does NOT become Accessory Added.
- Partially completed bulk job updates ONLY successful items.
- Item-level success creates disabled / grayed-out Accessory Added state for that buyer only.
- Item-level failure leaves product actionable or retryable for that buyer.
- Job-level success means all items succeeded (terminal Job status `completed`).
- `completed_with_errors` PRESERVES item-level success / failure differences; the Job is terminal but each Item remains independently terminal with its own status.
- Buyer catalog mapping / activation drives final Accessory Added state.
- Accessory Added is buyer-specific.
- One buyer's export must NOT affect any other buyer's Add Accessory / Accessory Added state.
- The same accessory can be Add Accessory for Buyer 2 while Accessory Added for Buyer 1.
- State is buyer-specific and does not affect other buyers.
- Buyer-specific activation requires `buyer_reference`, `company_scope_reference`, and `buyer_entity_reference` or equivalent buyer-scope key on every activation / catalog mapping record.

### Status driver

Only Item status `activated` drives buyer-specific Accessory Added. Every other Item status (including `exported`, `dispatch_pending`, `activation_pending`, `queued`, `processing`, and bulk-inclusion states) is NON-driving for the Add Accessory UI gate.

| Item status | Drives Accessory Added? |
|---|---|
| `pending` | No |
| `validating` | No |
| `eligible` | No |
| `ineligible` | No |
| `queued` | No |
| `processing` | No |
| `dispatch_pending` | No |
| `exported` | No |
| `activation_pending` | No |
| `activated` | **Yes** (canonical trigger) |
| `failed` | No |
| `retry_scheduled` | No |
| `skipped` | No |
| `canceled` | No |

### Buyer-scope enforcement

Buyer-specific activation is enforced at the data-model level via REQUIRED buyer-scope triad on every activation / catalog mapping record:

- `buyer_reference` (REQUIRED).
- `company_scope_reference` (REQUIRED).
- `buyer_entity_reference` (REQUIRED; or equivalent buyer-scope key per existing Tenant Company baseline).

Cross-buyer reads / mutations are architecturally impossible because every activation / catalog mapping record is keyed on the triad. There is no cross-buyer key that could leak state.

### Item-to-Accessory-Added state transition (operational sequence)

1. Buyer or buyer-facing module initiates an export (any of the 11 trigger kinds: `single_add_accessory`, `multi_select`, `select_all_visible`, `select_all_filtered`, `select_all_eligible_for_devices`, `recommended_set`, `on_sale_set`, `admin_on_behalf`, `scheduled`, `retry`, `reprocess`).
2. Product Catalog creates a Buyer Product Export Job with a buyer-scoped Selection Snapshot.
3. Product Catalog creates one Buyer Product Export Item per eligible product in the snapshot.
4. Item transitions through `pending` -> `validating` -> `eligible` / `ineligible` -> `queued` -> `processing` -> `dispatch_pending` -> `exported` -> `activation_pending` -> `activated` (terminal success) OR `failed` / `retry_scheduled` / `skipped` / `canceled`.
5. On Item terminal `activated`, Product Catalog creates or updates a buyer-scoped activation / catalog mapping record (carrying the buyer-scope triad) and records the corresponding Buyer Product Export Record entry (existing baseline preserved) or equivalent successful-item evidence.
6. The Add Accessory UI for that specific accessory transitions to Accessory Added for THAT buyer only.
7. The Add Accessory UI for any other buyer is unaffected.

### Failure behavior

- Item terminal `failed`: no activation, no Accessory Added, Add Accessory remains actionable / retryable for that buyer.
- Item terminal `ineligible`: no activation, no Accessory Added; the product was determined ineligible at snapshot or validation time.
- Item terminal `skipped`: no activation, no Accessory Added; intentional skip (e.g., duplicate detection, idempotency match).
- Item terminal `canceled`: no activation, no Accessory Added; buyer or admin canceled the Item before terminal success.
- Job terminal `completed_with_errors`: preserves per-Item terminal differences; only `activated` Items advance Accessory Added; other Items remain actionable / retryable per their own Item status.

### Cross-buyer non-interference (architectural guarantees)

- Buyer 1's export Job, Items, Selection Snapshot, activation records, catalog mapping, Add Accessory state, and Accessory Added state are ALL keyed on Buyer 1's buyer-scope triad.
- Buyer 2's surface is independently keyed on Buyer 2's buyer-scope triad.
- There is no shared mutable state between buyers' export surfaces.
- The same accessory can be Add Accessory for Buyer 2 while Accessory Added for Buyer 1 simultaneously.
- One buyer's failed Item does NOT disable another buyer's Add Accessory.
- One buyer's successful `activated` Item does NOT advance another buyer's Add Accessory to Accessory Added.

### Integration Management dispatch reference vs activation decision

Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes. This means:

- Product Catalog RECEIVES a dispatch reference from Integration Management (success or failure outcome reference).
- Product Catalog DECIDES the resulting Item status (`activated`, `failed`, `retry_scheduled`, etc.) based on the dispatch reference outcome and Product Catalog rules.
- Product Catalog DECIDES whether to create or update buyer-scoped activation / catalog mapping based on the Item status decision.
- Integration Management OWNS the transport-side outcome (delivery succeeded, transport retry exhausted, dead-letter, provider failure).
- Product Catalog does NOT own the transport outcome itself, but it OWNS the consequent item-status and activation decisions.

This distinction prevents two failure modes: (a) Product Catalog being unable to record a failed Item after receiving a dispatch failure reference, and (b) Integration Management being treated as the authority for buyer-scoped activation.

### Generated-but-not-downloaded files

By default, a generated-but-not-downloaded file does NOT automatically equal activation. The default is locked here for safety; tenant / business policy may override via configuration (open business decision). When the export mode explicitly defines file generation as successful delivery (e.g., scheduled file drop where buyer pulls), tenant policy may treat `file.generated` as the activation trigger; this PR documents the policy hook without locking the default to YES.

### API-only exports vs file exports

API-only exports and file exports SHARE the same Job / Item / Snapshot / activation behavior. The only difference is artifact emission: file exports additionally produce a Buyer Product Export File Reference pointing to Logs & Audit / File Tracking when an artifact exists, and emit `product-catalog.buyer-product-export-file.generated`. API-only exports omit this reference and event. Both modes flow through identical Item status transitions and identical activation logic.

### Where else this rule appears

- `data-model.md` - locks the rule at the data layer (Buyer Product Export Item, activation / catalog mapping records, buyer-scope triad).
- `workflows.md` - Workflow 11 (Add Accessory / Accessory Added State Transition) operationalizes the rule end-to-end.
- `test-scenarios.md` - acceptance scenarios for each sub-rule including cross-buyer non-interference.
- `edge-cases.md` - cross-buyer leakage, premature gray-out, dispatch-failure-reference-as-item-failure cases.
- `assumptions-open-questions.md` - retained open business decisions (file-as-activation default; deeper-success signals; cancel-after-processing).
- `README.md` and `spec.md` - brief summaries pointing here as the normative location.

## Buyer-Scoped Compatibility Projection Visibility Rules

This section is the canonical normative location for the Buyer-Scoped Compatibility Projection rule and its sub-rules. The existing PR #104 Buyer Product Export Job Item-Level Accessory Added Rule (above) establishes the canonical Add Accessory / Accessory Added transition; this section adds the compatibility-eligibility gate that sits AHEAD of that rule for accessory list visibility and export eligibility.

### Core boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Core projection rule (locked verbatim)

`A buyer may see and export only accessories compatible with active devices in that buyer's My Devices portfolio, subject to Product Catalog visibility / eligibility and Tenant scope.`

### Sub-rules (locked in this PR)

- Projection MUST be buyer-scoped (keyed on buyer-scope triad: `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`).
- Projection MUST NOT be global. There is no global projection entity.
- Projection MUST NOT expose compatibility for devices outside the buyer's My Devices portfolio.
- Projection MUST NOT mutate accessory source records (vendor-owned compatibility mappings are read-only sources).
- Projection MUST NOT mutate canonical Device Catalog records.
- Projection MUST preserve source references to BOTH the Device Catalog Buyer Device Portfolio Snapshot AND the Product Catalog compatibility mapping version used (both REQUIRED).
- Projection MUST have timestamp, version, and evidence reference.
- Projection MUST support `current`, `stale`, `recalculating`, `failed`, `review_required`, `superseded` states (exactly 6 projection_status values).
- Projection MUST support empty My Devices state (valid projection with empty `compatible_accessory_references`).
- Projection MUST support admin / system-initiated portfolio changes where Tenant Company authority permits.
- Projection MUST preserve prior versions as evidence where needed (via `prior_projection_reference`).

### What the projection drives (consumers)

- **Accessory List visibility.** Buyer's active addable Accessory List shows only accessories in `compatible_accessory_references` of the current projection (AND visible per Tenant / Product Catalog rules AND lifecycle-allowed AND sales-channel-allowed).
- **Export eligibility.** PR #104 Workflow 3 (Export Eligibility Validation) is extended with a compatibility check; Items for accessories not in `compatible_accessory_references` transition to terminal `ineligible` with `error_kind = compatibility_mismatch`.
- **Selection Snapshot compatibility references.** Selection Snapshot stores `compatibility_projection_reference_at_snapshot` and `compatible_device_references_at_snapshot`.
- **Recommended Accessories behavior.** Recommendation logic continues per existing baseline; projection gates buyer-facing visibility.
- **Latest Accessories eligibility.** Advancement remains governed by existing baseline; projection gates buyer-facing visibility (visibility-only framing; advancement itself is NOT made buyer-scoped in this PR).
- **Add Accessory / Accessory Added display logic.** Add Accessory is offered only for accessories currently in `compatible_accessory_references`. Previously-activated accessories that become incompatible enter the Buyer Accessory Compatibility Impact Record surface; the canonical PR #104 Add Accessory / Accessory Added rule continues to govern terminal-`activated`-driven state transitions; compatibility changes do NOT roll back Accessory Added.

### projection_status values (6)

| Value | Meaning |
|---|---|
| `current` | Projection is up to date with the latest portfolio snapshot AND compatibility mapping version. Consumers may use directly. |
| `stale` | Projection's portfolio snapshot or compatibility mapping version is older than the current source state; consumers SHOULD detect and prefer a fresh projection. |
| `recalculating` | A new projection is being computed; consumers MAY use the prior `current` projection until the new one is `current`. |
| `failed` | Most recent recalculation failed; the prior projection remains the last `current` snapshot; consumers see `review_required` impact on previously-Selling accessories per Workflow 15. |
| `review_required` | Projection is computed but a portfolio change requires explicit buyer / admin acknowledgment before being treated as current (e.g., bulk admin-on-behalf change). |
| `superseded` | This projection has been superseded by a newer projection version; consumers should resolve to the latest. |

### impact_state values (7)

| Value | Meaning |
|---|---|
| `unaffected` | Default. Compatibility unchanged for this accessory. |
| `no_longer_compatible` | Zero remaining compatible devices for this accessory in the buyer's portfolio. |
| `compatibility_restored` | A subsequent change restored compatibility. |
| `review_required` | The system flagged the impact; awaiting buyer / admin acknowledgment. |
| `hidden_from_active_addable_list` | Accessory is no longer in the active addable list, but buyer relationship state is preserved. |
| `compatibility_narrowed` | Accessory remains compatible but with fewer active devices. |
| `compatibility_expanded` | Accessory's compatible-device count increased (typically from a device add). |

### Add Accessory / Accessory Added preservation

This PR adds a compatibility-eligibility gate AHEAD of the PR #104 canonical Add Accessory / Accessory Added rule. The PR #104 rule itself is preserved verbatim and continues to govern:

- Only PR #104 Item status `activated` drives buyer-specific Accessory Added.
- One buyer's export must never affect another buyer's Add Accessory state.
- Failed Items leave Add Accessory actionable / retryable.
- Bulk export updates are item-level.

Compatibility changes do NOT roll back Accessory Added. A buyer who has activated an accessory via successful export retains Accessory Added state even if the buyer subsequently removes the compatible device; the accessory enters the Buyer Accessory Compatibility Impact Record surface (data-level signal `current_compatibility_impact_state` on buyer catalog mapping), but commercial Selling state is NOT auto-transitioned to Stop Selling.

### Buyer-scope enforcement

Buyer-specific projection and impact recording are enforced at the data-model level via REQUIRED buyer-scope triad on every projection record, impact record, portfolio snapshot, and portfolio change record. Cross-buyer reads / mutations are architecturally impossible because every record is keyed on the triad. There is no cross-buyer key.

### Cross-buyer non-interference (architectural guarantees)

- Buyer 1's projection, impact records, portfolio snapshots, and portfolio change records are keyed on Buyer 1's buyer-scope triad.
- Buyer 2's surface is independently keyed on Buyer 2's triad.
- The same accessory can be in Buyer 2's `compatible_accessory_references` while in Buyer 1's `no_longer_compatible` impact state.
- Buyer 1's My Devices change does NOT affect Buyer 2's projection or visibility.
- Buyer 1's projection failure does NOT affect Buyer 2's projection.

### Empty My Devices state

A buyer with no active devices in their portfolio has a VALID projection at `projection_status = current` with empty `compatible_accessory_references`. The Accessory List shows empty state (data-level signal; UI surface is future UX). PR #104 export Job creation may proceed; the Selection Snapshot binds an empty projection; Items are zero (PR #104 already supports zero-Item Jobs). The buyer has not encountered an error condition; the projection accurately reflects an empty portfolio.

### Generated-but-not-downloaded export file vs projection version

The PR #104 default (generated file does NOT auto-equal activation) is preserved. The export file's projection reference and version remain in the file artifact for traceability per Workflow 9.

### Where else these rules appear

- `data-model.md` - locks the projection / impact data-model and buyer-scope triad enforcement.
- `workflows.md` - operationalizes the projection rule across Workflows 4-15.
- `test-scenarios.md` - acceptance scenarios for projection states, impact states, cross-buyer non-interference, empty portfolio.
- `edge-cases.md` - projection failure, stale tolerance, bulk import, admin-on-behalf, re-parenting deferred.
- `assumptions-open-questions.md` - retained open business decisions.
- `README.md`, `spec.md`, `boundary-contracts.md` - summaries pointing here as the normative location.
- Cross-module: `modules/device-catalog/spec.md`, `modules/device-catalog/boundary-contracts.md`, `modules/device-catalog/workflows.md` carry the reciprocal Device-Catalog-side boundary wording without claiming projection ownership.
