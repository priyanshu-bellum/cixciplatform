# Product Catalog Module

Initial architecture draft for the Product Catalog module.

This module aligns with ADR-0003 as amended by ADR-0004 and ADR-0005. It is an initial proposal for review, not final implementation design or finalized business rules.

Product Catalog owns accessory product records and catalog-carried pricing inputs only. Pricing owns commercial interpretation, calculation, effective pricing, discounts, quotes, and overrides.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery, buyer selection, export confirmation, per-item export eligibility, export apply disposition, Latest Accessories baseline handling, Stop Selling, and System Admin buyer context behavior. Canonical module files summarize or link to that sub-contract rather than duplicating every rule.

## Focus Areas

- Accessory catalog ingestion with API first and CSV fallback
- Source-of-truth accessory product records
- Vendor product identity, identifier namespace, external identifier, and vendor SKU mapping records
- Product variant, category, taxonomy assignment, and search/merchandising metadata placeholders
- Product compatibility mappings to Device Catalog-owned Device References
- Catalog import batches, import rows, validation errors, correction records, and failed record review
- Product lifecycle, publication, visibility, stop-sell/deactivation, activation, download, and revocation records
- Catalog-carried pricing inputs such as vendor wholesale, SRP, MAP, and sale values with Pricing handoff references
- Media/content asset references, version references, rendition references, and approval/source state
- Buyer accessory discovery, search/filter, selection, export confirmation, per-item export eligibility, Latest Accessories, and per-buyer selling state rules
- Catalog change events, audit history, actor/source metadata, before/after summaries, versions, import batch references, and tenant scope
- Catalog API boundaries with Device Catalog, Pricing, Order Routing, and buyer-facing modules

## Template Files

- `spec.md`
- `data-model.md`
- `api-contracts.md`
- `openapi-contracts.md`
- `events.md`
- `event-contracts.md`
- `permissions.md`
- `workflows.md`
- `edge-cases.md`
- `test-scenarios.md`
- `assumptions-open-questions.md`
- `accessory-discovery-selection.md`

## Buyer Product Export Job Foundation Scope

This section documents Product Catalog's controlled job / batch / item / throttle foundation for buyer product exports. The foundation sits ABOVE the existing Buyer Product Export Record (which remains the per-buyer-per-product completed export / activation record) and orchestrates exports of all sizes, from individual Add Accessory clicks to bulk vendor-wide selections, against named throttling policies and buyer-scoped activation discipline.

### What this foundation delivers

- **3 primary entities:** Buyer Product Export Job (orchestration parent), Buyer Product Export Item (per-product success / failure), Buyer Product Export Selection Snapshot (frozen eligible product IDs at job creation, buyer-scoped).
- **4 sub-structures:** Buyer Product Export Batch (optional for large jobs), Buyer Product Export Job Status History (append-only), Buyer Product Export Result Summary (per-Job rollup), Buyer Product Export Error (classifier; not standalone).
- **Workflow / policy behavior only, NOT standalone records:** throttle, retry, reprocess, cancellation.
- **10 named, configurable throttling policies** with NO numeric limits in this PR.
- **11 trigger kinds** on the Job entity.
- **14 Job statuses** and **14 Item statuses**; only `item.activated` drives buyer-specific Accessory Added.
- **6 new Product Catalog events**, discriminator-based, additive to the existing event surface.
- **16 new numbered workflows** as architectural sequences.

### Add Accessory / Accessory Added rule (brief summary; canonical location in `accessory-discovery-selection.md`)

Add Accessory changes to Accessory Added and becomes disabled only after that specific accessory has a successful item-level export / activation outcome for that buyer. Selection, job request, queued state, processing state, bulk job inclusion, or another buyer's export is NOT final activation. Failed items remain actionable or retryable for that buyer. Bulk export updates must be item-level: successful items become Accessory Added for that buyer only; failed items do not. Buyer catalog mapping / activation is scoped by buyer / company / entity and drives final Accessory Added state.

Accessory Added is buyer-specific and must be driven by that buyer's item-level successful export / activation record. One buyer's export must never gray out, disable, activate, or otherwise change the Add Accessory state for another buyer.

See `accessory-discovery-selection.md` for the canonical rule and full sub-rule set.

### Boundary discipline reaffirmed

- **Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.**
- Product Catalog owns export Job / Item / Snapshot / Batch / Status History / Result Summary / Error, eligibility, item status, activation decisions, buyer-specific activation / catalog mapping, Add Accessory / Accessory Added state, and Product Catalog export evidence references.
- Integration Management owns buyer API dispatch, transport failures, transport retry, delivery receipts, provider failures, dead-letter / quarantine, transport evidence, and transport outcomes.
- Logs & Audit owns Evidence Record, File Tracking Record, file / audit evidence and access governance. Product Catalog emits evidence references only.
- Tenant Company owns `check_access`, buyer / company authority, scope / permission decisions, and lifecycle blocking. Product Catalog must NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for normal buyer product exports.
- Device Catalog owns My Devices source records and Device References. Product Catalog owns the buyer-scoped compatibility projection derived from My Devices. Product Catalog must NOT export global compatibility by default.
- Notification Platform owns delivery; Product Catalog emits notification intent only.
- Analytics owns BI / reporting / dashboards / KPIs; Product Catalog export history must NOT become an analytics dashboard.

### What this foundation intentionally does NOT do

- No modifications to any Logs & Audit file (PR-A through PR-E baselines preserved by reference).
- No modifications to any Tenant Company file (PR #103 baseline preserved by reference; `audit_export.*` is for compliance audit report exports, NOT buyer product exports).
- No modifications to Integration Management, Device Catalog, Notification Platform, Pricing, Analytics, Order Routing, Procurement, Fulfillment, Invoice, or Launch module files.
- No modifications to `modules/product-catalog/openapi-contracts.md`.
- No rename, deprecation, or replacement of the existing Buyer Product Export Record (which remains the per-buyer-per-product completed-export record produced by successful Items).
- No rename or removal of any existing Product Catalog entity, event, workflow, or rule.
- No new standalone Throttle Record / Retry Record / Cancellation Record / Integration Dispatch Record entities.
- No event explosion: throttle / retry / cancellation / dispatch outcomes are observable via Job / Item status discriminators on the 6 new events.
- No concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, or error code catalogs.
- No concrete UI / UX design.
- No numeric throttling / batch size / concurrency / retry budget / queue depth limits.
- PR #104 did not define buyer-scoped compatibility projection or My Devices add / remove sync rules; this PR resolves that deferral through the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation.
- No use of `audit_export.*` capabilities.

### Files modified by this foundation (exactly 13)

All in `modules/product-catalog/`:

- `README.md`
- `accessory-discovery-selection.md`
- `spec.md`
- `data-model.md`
- `permissions.md`
- `api-contracts.md`
- `boundary-contracts.md`
- `events.md`
- `event-contracts.md`
- `workflows.md`
- `test-scenarios.md`
- `edge-cases.md`
- `assumptions-open-questions.md`

`openapi-contracts.md` intentionally remains unmodified.

### Sequence positioning

This PR follows PR #103 (Tenant Company Logs & Audit Access Roles / Capabilities, merged) and is the immediate next hardening step that puts a production hot-path (buyer product exports) under controlled job / batch / item / throttle discipline before buyer-scoped compatibility projection and My Devices sync rules are layered on top. The next planned PRs after this one are Buyer-Scoped Compatibility Projection (Product Catalog or Device Catalog coordination) and My Devices Add / Remove Sync Rules (Device Catalog).

### Application discipline

This coordination is additive documentation-and-architecture across the 13 target Product Catalog files. Existing Product Catalog baseline content, Tenant Company PR #103 content, and Logs & Audit PR-A through PR-E content are preserved by reference without modification. See `APPLY.md` in the PR bundle for tool-agnostic application instructions, the explicit STOP-before-commit rule, and prohibitive-only references to destructive commands.

## Buyer-Scoped Compatibility Projection and My Devices Sync Scope

This section documents Product Catalog's role in the coordinated Product Catalog + Device Catalog work that defines how CIXCI determines buyer-scoped accessory compatibility based on the buyer's My Devices portfolio, and how Product Catalog reacts when devices are added, removed, updated, deactivated, superseded, or otherwise changed in My Devices. The PR populates the `compatibility_projection_reference_at_snapshot` field reserved by PR #104 on Buyer Product Export Selection Snapshot.

### What this Foundation delivers (Product Catalog side)

- **2 primary entities:** Buyer-Scoped Compatibility Projection (canonical buyer-scoped projection derived from Device Catalog portfolio + Product Catalog compatibility mappings + visibility rules); Buyer Accessory Compatibility Impact Record (per-accessory record of how a portfolio change affects accessories the buyer has already activated).
- **2 sub-structures:** Buyer Accessory Visibility Projection; Buyer Compatibility Projection Status History (append-only).
- **6 projection_status values:** `current`, `stale`, `recalculating`, `failed`, `review_required`, `superseded`.
- **7 impact_state values:** `unaffected`, `no_longer_compatible`, `compatibility_restored`, `review_required`, `hidden_from_active_addable_list`, `compatibility_narrowed`, `compatibility_expanded`.
- **5 new Product Catalog events** (discriminator-based, additive).
- **12 of the 15 new numbered workflows** sit in Product Catalog (workflows 4-15); the other 3 (workflows 1-3) sit in Device Catalog for the My Devices source-of-truth side.
- **`compatibility_projection_reference_at_snapshot` populated** on PR #104 Buyer Product Export Selection Snapshot.
- **`compatible_device_references_at_snapshot` added** on Selection Snapshot.
- **5 new fields** on buyer catalog mapping / activation record (see Buyer Catalog Mapping section in `data-model.md`).
- **`compatibility_mismatch` added as new `error_kind`** on PR #104 Buyer Product Export Error.

### Core boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Core compatibility projection rule (locked verbatim; canonical location in `accessory-discovery-selection.md`)

`A buyer may see and export only accessories compatible with active devices in that buyer's My Devices portfolio, subject to Product Catalog visibility / eligibility and Tenant scope.`

### Boundary discipline reaffirmed

- **Device Catalog owns** canonical Device records, Device References, Buyer Device Portfolio Reference, Buyer Device Portfolio Snapshot, Buyer Device Portfolio Change Record, Device Capability Evidence, the single `device-catalog.my-devices.portfolio-changed` event.
- **Device Catalog does NOT decide** accessory visibility, export eligibility, Add Accessory / Accessory Added state, Selling / Stop Selling state, buyer catalog mapping impact, or the compatibility projection itself.
- **Product Catalog owns** Buyer-Scoped Compatibility Projection, Buyer Accessory Compatibility Impact Record, Buyer Accessory Visibility Projection (sub-structure), Buyer Compatibility Projection Status History (sub-structure), the `compatibility_projection_reference_at_snapshot` binding on PR #104 Selection Snapshot, buyer accessory visibility / eligibility decisions, buyer catalog mapping compatibility impact recording, Add Accessory display impact (NOT the canonical rule, which remains preserved from PR #104), Selling / Stop Selling compatibility-impact REVIEW state (NOT auto-transition), the 5 new Product Catalog events.
- **Product Catalog does NOT mutate** Device Catalog canonical Device records, Device References, My Devices source records, vendor-owned accessory source facts, historical Buyer Product Export Records, historical Logs & Audit Evidence Records or File Tracking Records, Order Routing / Fulfillment / Returns / Procurement / Invoice Management records.
- **Tenant Company owns** `check_access`, authority, lifecycle blocking (existing PR #103 baseline). NO new tenant capabilities; `audit_export.*` NOT used.
- **Logs & Audit owns** Evidence Record, File Tracking Record, evidence governance. 4 new evidence kinds (`buyer_compatibility_projection`, `buyer_compatibility_impact`, `buyer_device_portfolio_snapshot`, `buyer_device_portfolio_change`) emitted via existing `service_identity.evidence_emit`. No Logs & Audit file modified.
- **Integration Management** owns external transport / sync. If portfolio changes arrive via external integration, PR #104 dispatch + transport boundary applies recursively.
- **Notification Platform** owns delivery. Product Catalog emits notification intent only (Workflow 14).
- **Analytics** owns BI / reporting. Compatibility-impact history is NOT a BI dashboard.
- **Order Routing / Fulfillment / Returns / Invoice history** consume Buyer Selling Status / Accessory Added state per existing baseline; MUST NOT be mutated by compatibility changes.

### What this Foundation intentionally does NOT do

- No modifications to `modules/product-catalog/openapi-contracts.md`.
- No modifications to `modules/device-catalog/openapi-contracts.md` or `modules/device-catalog/phase-1-csv-import.md`.
- No modifications to any Logs & Audit, Tenant Company, Integration Management, Notification Platform, Pricing, Analytics, Order Routing, Fulfillment / Returns, Procurement, or Invoice Management file.
- No rename, deprecation, or replacement of any existing Product Catalog or Device Catalog entity, event, workflow, or rule.
- No global compatibility projection record (projection is buyer-scoped only).
- No Product Catalog-owned canonical Device records or My Devices source records.
- **No automatic Stop Selling on device removal.** Compatibility impact is flagged via Buyer Accessory Compatibility Impact Record; commercial state remains governed by existing rules.
- No standalone Buyer Compatibility Recalculation Job / Item / Throttle / Retry / Cancellation records (workflow / policy behaviors only).
- No transport / sync retry records (Integration Management owns).
- No new Tenant Company capabilities, role bundles, or service identity profiles.
- No new Logs & Audit entities.
- No concrete HTTP routes, request / response payload schemas, pagination, authentication headers, or error code catalogs.
- No concrete UI / UX design.
- No numeric stale-projection tolerance values, recalculation throttling values, batch dedupe windows, or notification frequency values.
- No accessory-to-accessory compatibility (deferred future phase).
- No event explosion: portfolio change types and projection / visibility / impact transitions are observable via discriminators on the 6 new events.
- No Latest Accessories advancement change (visibility-only framing; advancement remains governed by existing baseline rules).

### Sequence positioning

This PR follows PR #104 (Buyer Product Export Job / Bulk Export Throttling Foundation, merged at origin/main) and is the immediate next hardening step. It populates the `compatibility_projection_reference_at_snapshot` field that PR #104 reserved, and locks the projection / impact / sync surfaces. The next planned PRs after this one are:

1. CPA / legal / DevOps retention duration review for the 4 new evidence kinds + the 6 existing PR-D retention policies (parallel; not blocking).
2. Source-module evidence-emission hardening PRs.
3. API Governance Foundation PR.
4. Product-Catalog-specific OpenAPI hardening PR.
5. Device-Catalog-specific OpenAPI hardening PR.
6. Logs & Audit-specific OpenAPI hardening PR.
7. Future UX / UI work for empty My Devices state, compatibility impact review, portfolio change history, projection recalculating / stale / failed indicators (in addition to PR #104 surfaces).
8. Future Notification Platform coordination for compatibility-impact notifications.
9. Investigation Case Management module (if needed).
10. AI Agent Services module + AI-initiated My Devices change coordination (future PR).
11. Warranty Registration module (future PR).

### Application discipline

This coordination is additive documentation-and-architecture across 25 target files (13 Product Catalog + 12 Device Catalog). Existing Product Catalog baseline, existing Device Catalog baseline, PR #103 content, PR #104 content, and Logs & Audit PR-A through PR-E content are preserved by reference without modification. See `APPLY.md` in the PR bundle for tool-agnostic application instructions, the explicit STOP-before-`git add` / staging / commit / push / PR rule, and prohibitive-only references to destructive commands.
