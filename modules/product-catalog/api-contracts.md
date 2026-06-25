# Product Catalog API Contracts

This document is proposal-level architecture. Endpoint names, schemas, and behaviors are placeholders until confirmed.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery, buyer selection, export confirmation, confirmation-line eligibility, export apply disposition, Latest Accessories baseline behavior, Stop Selling, and System Admin buyer context APIs. This file summarizes the API surface and references that sub-contract rather than duplicating every rule.

## Public / Partner-Facing APIs

- Product search/list API for authorized consumers.
- Product detail API for authorized consumers.
- Product compatibility lookup API.
- Product activation/download/export API.
- Accessory discovery/list/search/filter API.
- Accessory selection set API.
- Accessory export confirmation and confirmation-line eligibility API.
- Accessory export apply/disposition lookup API.
- Latest Accessories lookup API.
- Buyer Product Relationship / Buyer Selling Status API.
- Catalog ingestion API for vendor or integration-owned product feeds.
- Compatibility import/update API where direct API updates are allowed.
- Catalog export status API.

## Internal APIs

- Compatibility lookup API for Order Routing and buyer-facing product filtering.
- Catalog pricing input handoff API for Pricing.
- Product lifecycle/availability/visibility lookup API for downstream modules.
- Release/Launch/EOL fact lookup API.
- Launch eligibility evidence lookup API.
- Availability evidence lookup API.
- EOL policy signal and downstream disposition reference lookup API.
- Buyer derived product status lookup API.
- Accessory discovery context and selected device filter state lookup API.
- Accessory export confirmation line recheck/apply disposition lookup API.
- Media attachment reference lookup API.
- Catalog change lookup API.
- Export baseline lookup API.
- Import status, preview, correction, confirmation, and error report APIs.
- Catalog admin oversight APIs.

## Accessory Discovery And Selection APIs

Proposal-level Product Catalog APIs may include:

- `GET /product-catalog/accessories/discovery-context` to resolve buyer device prerequisite, empty-state, My Devices references, and visibility projection references.
- `GET /product-catalog/accessories` to list accessories using combined filters, search, compatibility evidence, and buyer visibility projection.
- `POST /product-catalog/accessories/selection-sets` to create or update buyer accessory selection sets.
- `POST /product-catalog/accessories/export-confirmations` to create an export confirmation record with one line-level selected accessory eligibility record per selected accessory.
- `GET /product-catalog/accessories/export-confirmations/{confirmationId}` to inspect confirmation summary, confirmation lines, warning/blocker state, and apply disposition.
- `POST /product-catalog/accessories/export-confirmations/{confirmationId}/recheck` to recheck required source evidence before confirmation where Product Catalog rules require it.
- `POST /product-catalog/accessories/export-confirmations/{confirmationId}/cancel` to cancel confirmation without discarding the selection set.
- `POST /product-catalog/accessories/export-confirmations/{confirmationId}/confirm` to execute export for eligible lines after confirmation and required rechecks.
- `GET /product-catalog/accessories/exports/{exportId}/disposition` to inspect Product Catalog export apply disposition, Integration delivery references, Logs & Audit evidence references, baseline advancement, and buyer relationship advancement state.
- `POST /product-catalog/buyer-accessory-relationships/{relationshipId}/stop-selling` to apply Stop Selling to one buyer-accessory relationship.
- `POST /product-catalog/buyer-accessory-relationships/bulk-stop-selling` to apply Stop Selling in bulk where permissions allow.
- `GET /product-catalog/admin/buyer-context/accessories` to view Product Catalog projections as a selected buyer.
- `POST /product-catalog/admin/buyer-context/act-on-behalf-requests` to request act-on-behalf workflow references where Tenant Company authority allows.

Accessory discovery APIs should carry Tenant Company scope evidence, Device Catalog My Devices/Device Reference evidence, Product Catalog visibility projection references, export confirmation line references, redaction classes, idempotency keys where mutations occur, and audit references where appropriate.

## Product Summary Response

Proposal-level fields:

- Product id and variant id where applicable.
- Vendor reference.
- Brand.
- Product Type.
- Accessory name.
- SKU and UPC as text identifiers.
- Category/subcategory.
- Vendor color and normalized System Color values.
- Lifecycle state.
- Availability state and availability evidence summary/reference.
- Release Date, Launch Date, EOL Date where applicable.
- Launch eligibility evidence summary/reference where buyer/customer-facing scope is supplied.
- EOL policy signal and catalog disposition summary where applicable.
- Buyer-facing derived status where buyer scope is supplied.
- Buyer Selling Status where buyer scope is supplied.
- Accessory discovery/export disposition summary where buyer scope is supplied.
- Sales channel eligibility summary.
- Compatibility summary reference.
- Media readiness / attachment summary reference.
- Pricing-provided buyer-facing price/snapshot reference where authorized.

## Product Detail Response

Product detail may include structured product/variant attributes, compatibility references, media attachment references, catalog-carried pricing input references, lifecycle/availability history summaries, availability evidence summaries, launch eligibility evidence references, EOL policy signal and downstream disposition references, buyer action availability, export confirmation/disposition references, export baseline references, and audit/change reference summaries according to caller permissions.

Product detail must not expose final buyer-specific price unless Pricing provides an authorized reference or response contract.

## Import APIs

Product Catalog import APIs should follow `architecture/standards/import-export-validation-governance.md`.

Proposal-level capabilities:

- Select import mode.
- Validate only / dry run.
- Header validation and row validation.
- Import preview table.
- Inline correction reference.
- Downloadable error report reference.
- Import draft lookup.
- Import confirmation.
- Destructive action preview/confirmation where allowed.
- Import status lookup.

## Compatibility APIs

Compatibility APIs should support proposal-level Add, Replace, and Selective Remove modes.

Rules:

- Add is default and non-destructive.
- Replace and Selective Remove require explicit mode selection, preview warning, confirmation, and audit evidence.
- Referenced Device References must exist and be valid according to Device Catalog lookup contracts.
- Missing, stale, superseded, ambiguous, or conflicting Device References route to review.

## Availability Evidence APIs

Availability APIs should expose catalog availability state and availability evidence references without creating Inventory Management ownership.

Proposal-level fields:

- Availability source.
- Source module/system.
- Source timestamp and received timestamp.
- Freshness and expiration timestamps.
- Quantity basis and quantity source reference.
- Threshold source reference.
- Source disposition.
- Display-only, sellability-affecting, backorder-eligible, and advisory-only flags.
- Stale, missing, superseded, and review-required states.

## Release / Launch Eligibility APIs

Release/Launch APIs should expose Product Catalog release/launch facts and launch eligibility evidence.

Rules:

- Launch Date alone does not make a product customer-facing sellable.
- Missing, stale, conflicting, or expired readiness evidence routes to review.
- Product Catalog must consume Pricing, Media, Tenant Company, compatibility, availability, and Launch/Event references rather than deciding those readiness facts independently.

## EOL Policy And Disposition APIs

EOL APIs should expose Product Catalog-owned catalog disposition and references to downstream dispositions.

Proposal-level fields:

- EOL policy signal.
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
- Downstream acknowledgement placeholder.
- Review-required state.
- Supersession reference.
- Audit reference.

Product Catalog may block catalog downloads or buyer-product activation where Product Catalog rules allow. Downstream modules decide their own operational disposition.

## Buyer Export / Latest Accessories APIs

Buyer export/download APIs should capture Product Download Record, Buyer Product Export Record, Accessory Export Confirmation Line references, export apply disposition, and Export Baseline Record.

Proposal-level fields:

- Buyer scope.
- Export method.
- Export status.
- Export timestamp.
- Export schema version.
- Export filter scope.
- Product Type scope.
- Visibility/access projection reference.
- Exported product references and versions.
- Confirmation line references with applied/ignored/blocked states.
- Excluded product reason summary.
- Export apply disposition.
- Integration delivery disposition reference where applicable.
- Logs & Audit file/download evidence reference.
- Partial, failed, revoked, or superseded export state.
- Applicable-for-Latest-Accessories flag.
- Baseline advanced timestamp.
- Baseline source export reference.

Latest Accessories should use a successful applicable buyer export/download baseline. If no applicable successful export exists, the filter should be disabled or unavailable. Partial, failed, revoked, superseded, restricted-scope, or unapplied exports may not advance the baseline unless Product Catalog rules explicitly allow it.

## Buyer Selling Status APIs

Buyer Selling Status APIs should support:

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

Stop Selling applies only to the buyer-product relationship and must not change vendor lifecycle or availability state.

Status changes require Tenant Company permission/configuration references and Product Catalog validation. Accessory Added / Selling should advance only when Product Catalog export rules consider the export applicable and successfully applied.

## Accessory Details Actions API

Accessory Details responses may include action availability:

- Export/download product.
- Add to selling catalog.
- Stop selling.
- Create purchase order.
- Add to existing purchase order.
- View compatibility.
- View media.
- View Pricing-provided price/snapshot reference.
- View availability.
- View lifecycle.

Product Catalog exposes PO action entry points only when buyer/company configuration allows. Procurement owns PO creation and lifecycle. Tenant Company owns permissions and configuration inputs.

## Error Handling

Error models should include:

- Validation error.
- Header validation error.
- Identifier conflict.
- Locked field update blocked.
- Blank field blocked.
- Compatibility Device Reference missing/stale/conflicting.
- Unauthorized or forbidden visibility/action.
- Pricing evidence unavailable.
- Media evidence unavailable.
- Availability evidence missing/stale/expired/conflicting.
- Launch eligibility evidence missing/stale/expired/conflicting.
- Accessory export confirmation line blocked.
- Accessory export confirmation line evidence stale/missing/conflicting.
- Buyer accessory relationship advancement blocked.
- Export apply failed.
- Export delivery failed reference recorded.
- Latest Accessories baseline not advanced.
- Launch/release conflict requiring review.
- EOL downstream disposition conflict requiring review.
- Destructive action confirmation required.
- Import partial failure.
- Integration/update signal creation failure reference.

## Boundary Notes

- Pricing calculation behavior must not be embedded in Product Catalog APIs.
- Media processing behavior must not be embedded in Product Catalog APIs.
- Device Catalog canonical record behavior and My Devices mutation behavior must not be embedded in Product Catalog APIs.
- Tenant Company eligibility, buyer account status, act-on-behalf authority, and permission ownership must not be embedded in Product Catalog APIs.
- Notification delivery and Integration transport must not be embedded in Product Catalog APIs.
- Product Catalog may reference Integration delivery state but must not treat transport success as Product Catalog-owned truth.
- Buyer activation/download, accessory discovery, export apply disposition, and Buyer Selling Status endpoints expose Product Catalog state without finalizing Tenant Company eligibility or buyer onboarding rules.
- EOL policy endpoints expose catalog-owned policy and disposition evidence; downstream execution owners decide their own operational behavior.

## Open Questions

- Which endpoints are public, partner-facing, internal, or admin-only?
- Which write operations are available through API versus CSV fallback?
- Which product export schemas are buyer-specific versus platform-standard?
- Which buyer-facing derived statuses should be exposed through API?
- Which confirmation-line blocker classifications are fatal versus warning-only by buyer/channel/Product Type?
- Which export scopes are applicable for Latest Accessories baseline advancement?

## Buyer Product Export Job Foundation API Surface Notes

This section documents architecture-level API surface notes for the Buyer Product Export Job Foundation. **No concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, or error code catalogs are introduced.** `modules/product-catalog/openapi-contracts.md` is NOT modified by this PR. All concrete API contract work is deferred to future API Governance Foundation PR + Product-Catalog-specific OpenAPI hardening PR.

### Discipline

- **No concrete API.** This section documents architectural shape only.
- **`openapi-contracts.md` NOT modified.** Per PR-A through PR-E + PR #103 deferral discipline.
- **No concrete request / response payload schemas, pagination cursors, authentication header specs, error code catalogs.** Future API.
- **Reference-first per PR-A discipline.** All inputs and outputs are described as references to existing fields / records.

### Job creation surface (architectural)

**Architectural inputs (reference-first):**

- `actor_reference` OR `service_trigger_reference` (one populated per existing PR-A pattern).
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad; REQUIRED).
- `trigger_kind` (one of 11 enumerated values).
- `export_method` (api, file, mixed).
- `selection_kind` and selection inputs (selection set reference for `multi_select`; filter scope for `select_all_filtered`; device-compatibility-scope for `select_all_eligible_for_devices`; recommended-set source reference for `recommended_set`; on-sale source reference for `on_sale_set`; etc.).
- `prior_job_reference` (REQUIRED for `trigger_kind = retry` and `trigger_kind = reprocess`).
- `idempotency_key` (per Duplicate / Idempotency Policy).
- PR-A envelope: `correlation_reference`, `trace_reference`, `audit_record_reference`.

**Architectural outputs (reference-first):**

- `buyer_product_export_job_id`.
- Initial `job_status` (typically `requested`; may transition to `queued` / `throttled` / `validating` shortly after creation).
- `selection_snapshot_reference` (populated once Workflow 2 completes).
- PR-A envelope echoed.

**Concrete HTTP route, payload schema, status codes, retry semantics, idempotency cache TTL, pagination: future API.**

### Job status observation surface (architectural)

**Architectural inputs:**

- `buyer_product_export_job_id`.
- Optional filters: `include_items` (boolean), `include_batches` (boolean), `include_status_history` (boolean), `include_result_summary` (boolean), `item_status_filter` (subset of 14 Item statuses).

**Architectural outputs:**

- Job envelope: `job_status`, `terminal_timestamp` (nullable), `applied_throttle_policy_references`, `error_summary_reference` (when applicable), `result_summary_reference` (when terminal).
- Optional Item envelope list: per-Item `item_status`, `eligibility_disposition`, `dispatch_reference`, `activation_reference` (on `activated`), `buyer_product_export_record_reference` (on terminal success), `error_reference` (on failure), `retry_attempt_count`.
- Optional Batch envelope list: per-Batch `batch_status`, item count, terminal timestamp.
- Optional Status History envelope: append-only status transition entries.
- Optional Result Summary envelope: counts by Item status, counts by error kind, file artifact reference if generated, dispatch reference summary.

**Concrete pagination, response shape, streaming semantics: future API.**

### Item status observation surface (architectural)

**Architectural inputs:**

- `buyer_product_export_item_id` OR (`parent_buyer_product_export_job_id` + `product_reference`).

**Architectural outputs:**

- Item envelope including `item_status`, `eligibility_disposition`, `dispatch_reference`, `activation_reference` (on `activated`), `buyer_product_export_record_reference`, `export_baseline_record_reference`, `error_reference` (on failure), `retry_attempt_count`, `retry_budget_remaining`, `item_status_history`.

**Concrete shape: future API.**

### Job cancellation surface (architectural)

**Architectural inputs:**

- `buyer_product_export_job_id`.
- `cancellation_reason_reference`.
- `actor_reference` (buyer or admin per Tenant Company `check_access`).

**Architectural outputs:**

- Updated Job envelope with `job_status = canceled` (if cancellation is accepted) OR a non-terminal status with a deferred-cancellation note (if processing has progressed beyond the cancel-after-processing grace window).

**Open business decision:** cancel-after-processing grace window. Default: YES with bounded window; concrete window is implementation / business decision.

### Job retry / reprocess surface (architectural)

**Architectural inputs:**

- `prior_buyer_product_export_job_id`.
- `trigger_kind` (`retry` or `reprocess`).
- For `retry`: optional `item_filter` (subset of prior Job's failed Items).
- For `reprocess`: typically the full prior Job's Item set.

**Architectural outputs:**

- New `buyer_product_export_job_id` (NOT a mutation of the prior Job).
- New Job's `prior_job_reference` populated.

### File reference surface (architectural)

**Architectural inputs:**

- `buyer_product_export_job_id`.

**Architectural outputs:**

- `buyer_product_export_file_reference` (populated only when a file artifact exists).
- Logs & Audit File Tracking reference for the artifact.
- File access is governed by existing Logs & Audit PR-D access governance + existing Product Catalog file-access patterns.

### Dispatch reference surface (architectural)

**Architectural inputs:**

- `buyer_product_export_item_id` OR `buyer_product_export_batch_id`.

**Architectural outputs:**

- `integration_dispatch_reference` (links to Integration Management delivery / receipt evidence).
- Dispatch outcome is owned by Integration Management; Product Catalog records the reference and consumes the outcome via the reference.

### Capability registration / lifecycle surfaces

NONE. This PR introduces no new tenant capabilities, role bundles, or service identity profiles. Existing Tenant Company PR #103 + baseline capability registry surfaces continue to govern.

### `openapi-contracts.md` discipline

- **NOT modified.** Per PR-A through PR-E + PR #103 deferral discipline.
- All concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, error code catalogs are deferred to future API Governance Foundation PR + future Product-Catalog-specific OpenAPI hardening PR.

### What this api-contracts section intentionally does NOT do

- No concrete HTTP route definitions.
- No concrete request / response payload schemas.
- No pagination cursor specification.
- No authentication / authorization header specification.
- No error code catalog.
- No rate-limit policy values (named policies only via Throttling Policy references in `spec.md`).
- No API versioning scheme beyond existing Product Catalog baseline.
- No concrete idempotency cache shape or TTL.
- No concrete event delivery semantics for `item.status-changed` at high volume.
- No concrete propagation latency or eventual-consistency policy beyond existing baseline.
- No modifications to source-module APIs (Logs & Audit, Tenant Company, Integration Management, Device Catalog, Notification Platform).
- No `openapi-contracts.md` modifications.

### Sequencing note

After this PR merges, the following API hardening PRs become natural next-steps:

1. API Governance Foundation PR (cross-module API contract conventions).
2. Product-Catalog-specific OpenAPI hardening PR (introduces concrete HTTP routes / payloads / pagination / error codes for Job creation, status observation, cancellation, retry / reprocess, file reference, and dispatch reference surfaces).
3. Logs & Audit-specific OpenAPI hardening PR (introduces concrete HTTP routes for the 30 Logs & Audit events plus search / review / export endpoints; out of scope here).

These PRs are out of scope here. This PR documents architectural shape only.

## Buyer-Scoped Compatibility Projection API Surface Notes

This section documents architecture-level API surface notes for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation (Product Catalog side). **No concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, or error code catalogs are introduced.** `modules/product-catalog/openapi-contracts.md` is NOT modified by this PR. All concrete API contract work is deferred to future API Governance Foundation PR + Product-Catalog-specific OpenAPI hardening PR.

### Discipline

- **No concrete API.** Architectural shape only.
- **`openapi-contracts.md` NOT modified.** Per PR-A through PR-E + PR #103 + PR #104 deferral discipline.
- **No concrete request / response payload schemas, pagination cursors, authentication header specs, error code catalogs.**
- **Reference-first per PR-A discipline.** All inputs and outputs described as references to existing fields / records.

### Projection retrieval surface (architectural)

**Architectural inputs (reference-first):**

- `actor_reference` OR `service_trigger_reference`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad).
- Optional `buyer_scoped_compatibility_projection_id` (specific projection) OR latest by buyer-scope (default).
- Optional `include_visibility_projection` (boolean).
- Optional `include_status_history` (boolean).

**Architectural outputs (reference-first):**

- Projection envelope: `buyer_scoped_compatibility_projection_id`, `projection_status`, `projection_timestamp`, `projection_version`, `buyer_device_portfolio_snapshot_reference`, `source_compatibility_mapping_version_reference`, `compatible_accessory_references`, `excluded_accessory_reason_summary`, `prior_projection_reference`.
- Optional Buyer Accessory Visibility Projection envelope.
- Optional status history entries.
- PR-A envelope echoed.

**Concrete HTTP route, payload schema, status codes, pagination: future API.**

### Projection refresh / recalculation request surface (architectural)

**Architectural inputs:**

- `actor_reference` OR `service_trigger_reference`.
- Buyer-scope triad.
- Optional `triggering_reason_reference`.

**Architectural outputs:**

- Acknowledgment with `prior_buyer_scoped_compatibility_projection_reference` and (eventually) `current_buyer_scoped_compatibility_projection_reference`.
- Acknowledgment that recalculation has transitioned through `recalculating` -> `current` / `failed`.

**Concrete API: future.**

### Impact record retrieval surface (architectural)

**Architectural inputs:**

- Buyer-scope triad.
- Optional `product_reference` (filter to specific accessory).
- Optional `impact_state` filter (subset of 7 values).
- Optional `acknowledged_flag` filter.

**Architectural outputs:**

- List of Buyer Accessory Compatibility Impact Record envelopes.

### Impact record acknowledgment surface (architectural)

**Architectural inputs:**

- `actor_reference`.
- `buyer_accessory_compatibility_impact_record_id`.
- Acknowledgment reason / action chosen (`acknowledge`, `stop_selling_initiated`, `manual_remap_initiated`, etc.).

**Architectural outputs:**

- Updated impact record envelope with `acknowledged_flag = true`, `acknowledged_timestamp`, `acknowledged_actor_reference`.

### Buyer Accessory Visibility Projection retrieval surface (architectural)

**Architectural inputs:**

- Buyer-scope triad.
- Optional projection_reference (specific projection version).

**Architectural outputs:**

- Visibility projection envelope: `active_addable_accessory_references`, `accessory_added_accessory_references`, `selling_with_compatibility_warning_accessory_references`, `hidden_from_active_addable_list_accessory_references`.

### Selection Snapshot compatibility binding (extends PR #104)

PR #104 Selection Snapshot retrieval already exists architecturally; this PR notes that the retrieved envelope now includes `compatibility_projection_reference_at_snapshot` (REQUIRED) and `compatible_device_references_at_snapshot` (additional field). No new endpoint surface introduced; existing PR #104 surface is extended in payload context only.

### Capability registration / lifecycle surfaces

NONE. This PR introduces no new tenant capabilities, role bundles, or service identity profiles. Existing Tenant Company PR #103 + baseline capability registry surfaces continue to govern.

### `openapi-contracts.md` discipline

- **NOT modified.** Per PR-A through PR-E + PR #103 + PR #104 deferral discipline.
- All concrete HTTP routes, payload schemas, pagination contracts, authentication header specs, error code catalogs are deferred to future API Governance Foundation PR + future Product-Catalog-specific OpenAPI hardening PR.

### What this api-contracts section intentionally does NOT do

- No concrete HTTP route definitions.
- No concrete request / response payload schemas.
- No pagination cursor specification.
- No authentication / authorization header specification.
- No error code catalog.
- No rate-limit policy values.
- No API versioning scheme beyond existing Product Catalog baseline.
- No concrete idempotency cache shape or TTL.
- No concrete event delivery semantics for high-volume `projection.status-changed` / `visibility.changed` / `impact.recorded` events.
- No concrete propagation latency or eventual-consistency policy beyond existing baseline.
- No modifications to source-module APIs (Logs & Audit, Tenant Company, Integration Management, Device Catalog, Notification Platform).
- No `openapi-contracts.md` modifications.
- No modifications to Device Catalog API contracts (Device Catalog side documented in `modules/device-catalog/api-contracts.md`).

### Sequencing note

After this PR merges, the following API hardening PRs become natural next steps:

1. API Governance Foundation PR (cross-module API contract conventions).
2. Product-Catalog-specific OpenAPI hardening PR (concrete HTTP routes / payloads / pagination / error codes for projection retrieval, recalculation request, impact retrieval, impact acknowledgment, Visibility Projection retrieval; integrates with PR #104 Selection Snapshot extensions).
3. Device-Catalog-specific OpenAPI hardening PR (Buyer Device Portfolio surfaces).
4. Logs & Audit-specific OpenAPI hardening PR.

These PRs are out of scope here. This PR documents architectural shape only.
