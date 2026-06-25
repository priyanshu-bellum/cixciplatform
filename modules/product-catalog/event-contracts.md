# Product Catalog Event Contracts

This document is proposal-level architecture. Event names, payloads, and delivery guarantees are placeholders until confirmed.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery, export confirmation, confirmation-line eligibility, export apply disposition, Latest Accessories baseline, and System Admin buyer context event behavior.

## Contract Principles

Product Catalog is the event producer for catalog source-state changes, lifecycle and availability changes, availability evidence, compatibility assertions, launch eligibility evidence, EOL policy signals, buyer product relationship changes, accessory discovery/search/filter activity where evented, accessory selection/export confirmation activity, catalog exports/downloads, export baselines, and catalog update signals.

Notification Platform Service owns notification delivery. Integration Management owns external delivery/transport evidence. Logs & Audit owns immutable audit evidence. AI Agent Services owns recommendations and action outcomes.

Events should prefer references, versions, summaries, redaction classes, and lookup contracts over full sensitive payloads.

## Common Event Fields

- `eventId`: unique event identifier.
- `eventType`: event name.
- `eventVersion`: event schema version.
- `occurredAt`: event timestamp.
- `productId`: Product Catalog product reference where applicable.
- `productMasterId`: Product Catalog master reference where applicable.
- `variantId`: Product Variant reference where applicable.
- `vendorId`: vendor scope reference where applicable.
- `buyerScope`: buyer parent/child/entity scope where applicable.
- `tenantScope`: tenant/company/entity scope.
- `productType`: Product Type.
- `catalogEntityVersion`: Product Catalog entity version.
- `source`: API, CSV, admin, integration, vendor feed, system, or future value.
- `sourceVersion`: source input version/hash where available.
- `auditReference`: Logs & Audit reference or catalog audit reference.
- `redactionClass`: payload redaction class.

## Accessory Discovery And Selection Events

### `product-catalog.accessory-discovery.empty-state-shown`

Purpose: indicate Product Catalog displayed the no-active-My-Devices empty state for a buyer discovery context.

Payload should include buyer/entity scope, Tenant Company scope evidence reference, Device Catalog My Devices portfolio reference, active My Devices requirement state, empty-state reference, and audit reference where access is sensitive.

### `product-catalog.accessory-filter.applied` / `product-catalog.accessory-search.performed`

Purpose: preserve search/filter activity where Product Catalog rules require eventing or audit-ready references.

Payload should include buyer/entity scope, search/filter state reference, selected Device Reference where applicable, all My Devices filter reference where applicable, compatibility evidence reference, visibility/access projection reference, result count summary, redaction class, and audit reference.

### `product-catalog.accessory-selection.updated`

Purpose: indicate buyer accessory selection set changed before export confirmation.

Payload should include selection set reference, buyer/entity scope, actor reference, selected product/variant lookup reference, selected count, current search/filter state reference, and audit reference.

## Accessory Export Confirmation Events

### `product-catalog.accessory-export.confirmation-created`

Purpose: indicate Product Catalog created an export confirmation summary for a selection set.

Payload should include confirmation id, selection set reference, buyer/entity scope, actor reference, selected count, vendor summary, device summary, confirmation line lookup reference, warning summary, blocking line summary, confirmation status, and audit reference.

### `product-catalog.accessory-export.confirmation-line.created`

Purpose: preserve line-level selected accessory eligibility evidence.

Payload should include confirmation line id, export confirmation id, buyer/entity scope, product/variant reference, product source version/hash, product visibility projection reference/version, compatibility evidence reference/version, lifecycle disposition, availability disposition, sales channel eligibility disposition, buyer visibility/access disposition, buyer account status evidence reference, buyer accessory relationship state before export, already exported state, stale/missing/conflicting evidence state, recheck-before-confirm flag, selected state, review-required state, supersession reference, and audit reference.

### `product-catalog.accessory-export.confirmation-line.warning-recorded`

Purpose: record a warning classification for a selected accessory line.

Payload should include confirmation line id, warning classification, warning reason, source evidence references, recheck timestamp where applicable, and audit reference.

### `product-catalog.accessory-export.confirmation-line.blocked`

Purpose: record a blocking classification for a selected accessory line.

Payload should include confirmation line id, blocker reason, stale/missing/conflicting evidence state, source evidence references, recheck timestamp where applicable, selected/applied/ignored/blocked state, review-required state, and audit reference. Blocked lines must not advance buyer accessory relationship state.

### `product-catalog.accessory-export.confirmation-evidence.rechecked`

Purpose: show that Product Catalog rechecked required source evidence before export confirmation.

Payload should include confirmation id, confirmation line lookup reference, recheck timestamp, recheck source references, stale/missing/conflicting evidence summary, warning/blocker counts, and audit reference.

### `product-catalog.accessory-export.cancelled` / `product-catalog.accessory-export.confirmed`

Payload should include confirmation id, selection set reference, buyer/entity scope, actor reference, status, cancellation/back reference where relevant, confirmation line lookup reference, and audit reference.

## Accessory Export Apply And Buyer Relationship Events

### `product-catalog.accessory-export.apply-started` / `product-catalog.accessory-export.applied`

Purpose: preserve Product Catalog-owned export apply disposition separately from external delivery.

Payload should include Product Catalog export record reference, export confirmation reference, confirmation line references or secured lookup, export apply disposition, applied/ignored/blocked counts, resulting buyer relationship update references, baseline advancement reference where applicable, Logs & Audit evidence reference where available, and audit reference.

### `product-catalog.accessory-export.delivery-pending` / `product-catalog.accessory-export.delivery-failed-reference-recorded`

Purpose: reference Integration Management delivery state without Product Catalog owning transport truth.

Payload should include Product Catalog export record reference, Integration delivery disposition reference, delivery pending/failed summary, buyer/entity scope, affected confirmation line references or secured lookup, review-required state, and audit reference.

### `product-catalog.buyer-accessory-relationship.advancement-blocked`

Purpose: indicate Product Catalog did not advance Accessory Added / Selling state.

Payload should include buyer accessory relationship reference, export confirmation line reference, export apply disposition, blocker reason, applied vs ignored state, review-required state, and audit reference.

### `product-catalog.buyer-accessory-relationship.state-advanced-after-export`

Purpose: indicate Product Catalog advanced buyer relationship state after applicable export rules were satisfied.

Payload should include buyer accessory relationship reference, prior/new state, Product Catalog export record reference, export confirmation line reference, export apply disposition, baseline advancement reference where applicable, Integration delivery reference where applicable, and audit reference.

### `product-catalog.latest-accessories.baseline-updated` / `product-catalog.latest-accessories.baseline-advancement-skipped`

Purpose: indicate whether Latest Accessories baseline advanced after an applicable export/download.

Payload should include export baseline record reference, export schema version, Product Type scope, buyer/entity scope, visibility/access projection reference, source export reference, applicable-for-Latest-Accessories flag, baseline advanced timestamp where applicable, skipped reason where applicable, and audit reference.

## Lifecycle And Availability Events

### `catalog.lifecycle.changed`

Purpose: notify consumers that Product Lifecycle State changed.

Payload should include prior/new lifecycle state, reason, effective timestamp, EOL Date where relevant, archive reference where relevant, and review state.

Rules:

- Lifecycle changes do not imply sellability, visibility, pricing readiness, routing, fulfillment, or notification delivery.
- Active does not automatically mean sellable.
- Archived does not mean physically deleted.

### `catalog.availability.changed`

Purpose: notify consumers that catalog availability evidence changed.

Payload should include prior/new availability state, availability evidence reference, source, effective date/time, inventory input/threshold reference where safe, reason code, and review state.

Rules:

- Availability is separate from lifecycle.
- Out of Stock is not lifecycle.
- Product Catalog does not own a full Inventory Management context.
- Downstream modules decide their own operational behavior using consumed catalog evidence.

### `catalog.availability.evidence-recorded`

Purpose: preserve the evidence Product Catalog uses for catalog availability display and eligibility signals.

Payload should include availability source, source module/system, source timestamp, received timestamp, freshness timestamp, expiration timestamp, quantity basis, quantity source reference, threshold source reference, source disposition, stale state, missing state, display-only flag, sellability-affecting flag, backorder-eligible flag, advisory-only flag, review-required state, supersession reference, and audit reference.

### `catalog.product.out-of-stock`, `catalog.product.back-in-stock`, `catalog.product.low-stock`

Purpose: provide specific AI-ready, notification-triggering, and integration-update-friendly availability signals.

Payload should include product/variant reference, availability evidence reference, affected buyer scope summary or secured lookup reference, source, effective timestamp, and integration/update signal reference where created.

## Release / Launch / EOL Events

### `catalog.product.released-to-buyers`

Purpose: indicate that Product Catalog released a product for eligible buyer review inside CIXCI.

Payload should include Release Date, eligible scope reference or secured lookup reference, compatibility summary reference, and review state.

This event does not imply customer-facing display or sale.

### `catalog.product.launched`

Purpose: indicate customer-facing eligibility under Product Catalog rules and source-owned readiness evidence.

Payload should include Launch Date, lifecycle/publication state, launch eligibility evidence reference, readiness references, recheck-before-launch flag, and review state.

This event does not replace Launch / Event Management coordination records. Launch Date alone does not make a product customer-facing sellable.

### `catalog.launch-eligibility.evidence-recorded`

Purpose: preserve source-owned readiness evidence before Product Catalog treats a product as customer-facing eligible.

Payload should include authority module, source readiness signal id, source readiness signal version/hash, pricing readiness reference, media readiness reference, Tenant Company eligibility/channel scope reference, compatibility readiness reference, availability readiness reference, Product Catalog review state reference, Launch/Event reference where applicable, freshness timestamp, expiration timestamp, stale signal state, missing signal state, waiver/override flag, waiver approver, waiver reason, recheck-before-launch flag, customer-facing eligibility disposition, review-required state, and audit reference.

### `catalog.product.eol-marked`, `catalog.product.eol-approaching`, `catalog.product.eol-reached`

Payload should include EOL Date, sell-through policy reference, replacement product placeholder, buyer impact summary reference, EOL policy signal reference, and downstream disposition references.

### `catalog.eol-policy.signal-created`

Purpose: preserve Product Catalog-owned EOL policy evidence while keeping downstream execution owners separate.

Payload should include sell-through policy reference, affected buyer-product relationship reference, catalog visibility disposition, catalog downloadability disposition, buyer selling status disposition, order-routing disposition reference, procurement disposition reference, fulfillment disposition reference, invoice disposition reference, integration update disposition reference, downstream consumer acknowledgement placeholder, review-required state, supersession reference, and audit reference.

Rules:

- Product Catalog may block new catalog downloads or buyer-product activation where Product Catalog rules allow.
- Order Routing owns order routability disposition.
- Procurement owns PO allowance disposition.
- Fulfillment/Returns owns operational execution disposition.
- Invoice Management owns invoice eligibility disposition.
- Integration Management owns buyer update transport evidence.

### `catalog.product.archived`

Payload should include archive reason, historical traceability summary, and audit reference.

## Compatibility Events

### `catalog.compatibility.changed`

Purpose: indicate Product Catalog compatibility assertions changed.

Payload should include product/variant reference, Device Reference references or secured lookup reference, compatibility mode, added/removed summary, mapping version, source, confidence/status, preview/confirmation reference for destructive modes, and audit reference.

Compatibility events must not publish canonical Device Catalog source fields as Product Catalog-owned facts.

### `catalog.compatibility.import-mode.applied`

Purpose: identify Add, Replace, or Selective Remove import behavior.

Rules:

- Add mode is default and non-destructive.
- Replace and Selective Remove require explicit selection, preview warning, confirmation, and audit evidence.

## Buyer Relationship And Export Events

### `catalog.product.downloaded`

Purpose: record buyer product download or export activity.

Payload should include buyer scope, actor/service, export method, export timestamp, export status, redaction class, exported product lookup reference, export baseline reference, applicable-for-Latest-Accessories flag, and audit reference.

### `catalog.product.export.completed` / `catalog.product.export.failed`

Purpose: support buyer export history, Latest Accessories, Logs & Audit, Integration Management, and Analytics.

Payload should include export id, buyer scope, export method, generated timestamp, status, file/export reference, delivery reference where applicable, baseline advancement reference where applicable, and failure summary where safe.

### `catalog.export-baseline.advanced` / `catalog.export-baseline.not-advanced`

Purpose: indicate whether a product catalog export/download advanced the Latest Accessories baseline.

Payload should include export baseline record reference, export schema version, export filter scope, Product Type scope, buyer/entity scope, visibility/access projection reference, included product references or secured lookup reference, excluded product reason summary, partial export state, delivery failed state, revoked export state, superseded export state, applicable-for-Latest-Accessories flag, baseline advanced timestamp where applicable, baseline source export reference, and audit reference.

### `catalog.buyer-selling-status.changed`

Payload should include buyer scope, product/variant reference, prior/new Buyer Selling Status, reason, actor/source, effective timestamp, integration/update signal reference, and audit reference.

Buyer Selling Status must not overwrite vendor lifecycle or availability state.

## Pricing And Media Events

### `catalog.pricing-input.changed` / `catalog.pricing-evidence.changed`

Payload should include Pricing Handoff Reference, pricing input version, source summary, redaction class, and audit reference. Sensitive commercial values should require authorized lookup.

Pricing owns interpretation, calculation, effective prices, buyer-specific price, exceptions, overrides, and snapshots.

### `catalog.media-attachment.changed`

Payload should include Product Catalog media attachment reference, Media Asset ID, media mapping evidence reference, acceptance/rejection state, source version, and audit reference.

Media owns storage, validation, transformation, renditions, URL generation, and access policy.

## Notification And Integration Signals

Notification-triggering events may include product released, product launched, launch eligibility evidence missing/stale/review-required, EOL marked/approaching/reached, EOL downstream disposition review-required, out of stock, back in stock, low stock, availability evidence missing/stale/review-required, accessory export confirmation line blocked/review-required, buyer relationship advancement blocked, compatibility updated, pricing input changed, media attachment changed, buyer selling status changed, buyer export/download completed, Latest Accessories baseline not advanced, and catalog sync/update failed reference.

Product Catalog emits events. Notification Platform Service owns delivery.

Product Catalog may emit update/export signals. Integration Management owns buyer-system transport evidence, provider failures/retries, and integration update disposition references.

## Idempotency And Ordering

- Consumers should deduplicate with `eventId` and event-specific idempotency keys.
- Product/variant events should include entity version for ordering.
- Import/export events should include batch/export/baseline references.
- Accessory confirmation-line events should include confirmation line id, product/variant reference, source version/hash, and selected/applied/ignored/blocked state.
- Replayed events should not create duplicate activation, export, confirmation-line application, compatibility, buyer selling, EOL disposition, baseline, or analytics records.

## Security And Redaction

- Events must respect tenant, buyer, vendor, entity, channel, and role scope.
- Sensitive pricing, tenant, buyer visibility, import row, discovery context, search/filter, and commercial values should use lookup references where possible.
- Event payloads should not become hidden exports.

## Example Event Payload

```json
{
  "eventId": "placeholder-event-id",
  "eventType": "product-catalog.accessory-export.confirmation-line.blocked",
  "eventVersion": "0.1.0",
  "occurredAt": "YYYY-MM-DDTHH:MM:SSZ",
  "productId": "placeholder-product-id",
  "variantId": "placeholder-variant-id",
  "tenantScope": "placeholder-tenant-scope",
  "buyerScope": "placeholder-buyer-scope",
  "confirmationLineId": "placeholder-confirmation-line-id",
  "selectedAppliedIgnoredBlockedState": "blocked",
  "catalogEntityVersion": "placeholder-version",
  "redactionClass": "placeholder-redaction-class",
  "auditReference": "placeholder-audit-reference"
}
```

## Open Questions

- Which catalog events require snapshot payloads versus lookup references?
- Which availability events should trigger immediate notifications versus digest behavior?
- Which integration-update signals must be synchronous versus asynchronous?
- Which AI-ready signals should be emitted directly by Product Catalog versus derived by Analytics or AI Agent Services?
- Which export classes are applicable for Latest Accessories baseline advancement?
- Which confirmation-line blocker classifications are fatal versus warning-only by buyer/channel/Product Type?

## Buyer Product Export Job Foundation Event Contracts

This section documents the payload contracts for the 6 new Buyer Product Export Job Foundation events. All payload extensions are reference-first per existing PR-A discipline. No concrete schema is locked here; concrete payload schema is future API Governance Foundation PR work.

### Contract discipline

- All payload extensions are reference-first per existing Product Catalog + PR-A discipline.
- No concrete schema is locked; concrete payload schema is future API.
- Discriminator value catalogs are documented per event below.
- Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility).
- All existing payload envelope fields (`correlation_reference`, `trace_reference`, `idempotency_key`, `audit_record_reference`, schema version) are preserved per existing baseline.

---

### Event 1 - `product-catalog.buyer-product-export-job.requested`

**Purpose:** indicate Buyer Product Export Job has been created at initial `job_status = requested`.

**Payload context (reference-first):**

- `buyer_product_export_job_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad).
- `actor_reference` OR `service_trigger_reference`.
- `export_method` (api, file, mixed).
- `trigger_kind` (one of 11 values: `single_add_accessory`, `multi_select`, `select_all_visible`, `select_all_filtered`, `select_all_eligible_for_devices`, `recommended_set`, `on_sale_set`, `admin_on_behalf`, `scheduled`, `retry`, `reprocess`).
- `prior_job_reference` (populated for retry / reprocess; nullable otherwise).
- `requested_timestamp`.
- `selection_snapshot_reference` (populated once snapshot is created).
- `accessory_export_confirmation_reference` (when present).
- `idempotency_key`.
- Existing baseline envelope: `correlation_reference`, `trace_reference`, `audit_record_reference`.

### Event 2 - `product-catalog.buyer-product-export-job.status-changed`

**Purpose:** indicate Buyer Product Export Job status transition.

**Discriminator:** `job_status` (string-enum; 14 values).

**Discriminator value catalog (14 values):**

| Value | Terminal? | Internal-only? |
|---|---|---|
| `requested` | No | No |
| `queued` | No | No |
| `validating` | No | Yes |
| `snapshotting` | No | Yes |
| `batching` | No | Yes |
| `throttled` | No | No |
| `processing` | No | No |
| `retry_scheduled` | No | No |
| `completed` | Yes | No |
| `completed_with_errors` | Yes | No |
| `failed` | Yes | No |
| `canceled` | Yes | No |
| `expired` | Yes | No |
| `blocked` | Conditional | No |

**Payload context (reference-first):**

- `buyer_product_export_job_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `prior_job_status`.
- `new_job_status` (the discriminator value).
- `terminal_flag` (boolean; true for terminal statuses).
- `transition_timestamp`.
- `reason_reference`.
- `applied_throttle_policy_references` (list; populated when throttling triggered the transition).
- `result_summary_reference` (populated on terminal status).
- `error_summary_reference` (populated when applicable).
- Existing baseline envelope.

### Event 3 - `product-catalog.buyer-product-export-batch.status-changed`

**Purpose:** indicate Buyer Product Export Batch status transition (when Job is batched).

**Discriminator:** `batch_status` (string-enum; 7 values).

**Discriminator value catalog (7 values):**

| Value | Terminal? |
|---|---|
| `pending` | No |
| `dispatch_pending` | No |
| `processing` | No |
| `completed` | Yes |
| `completed_with_errors` | Yes |
| `failed` | Yes |
| `throttled` | No |

**Payload context (reference-first):**

- `buyer_product_export_batch_id`.
- `parent_buyer_product_export_job_id`.
- `batch_sequence` (within the Job).
- `prior_batch_status`.
- `new_batch_status` (the discriminator value).
- `batch_terminal_flag` (boolean).
- `transition_timestamp`.
- `dispatch_window_reference` (when Integration Dispatch Rate Policy applied).
- `applied_throttle_policy_references` (when applicable).
- Existing baseline envelope.

### Event 4 - `product-catalog.buyer-product-export-item.status-changed`

**Purpose:** indicate Buyer Product Export Item status transition.

**Discriminator:** `item_status` (string-enum; 14 values).

**Discriminator value catalog (14 values):**

| Value | Terminal? | Drives Accessory Added? |
|---|---|---|
| `pending` | No | No |
| `validating` | No | No |
| `eligible` | No | No |
| `ineligible` | Yes | No |
| `queued` | No | No |
| `processing` | No | No |
| `dispatch_pending` | No | No |
| `exported` | No | No |
| `activation_pending` | No | No |
| `activated` | **Yes** | **Yes (canonical trigger)** |
| `failed` | Yes | No |
| `retry_scheduled` | No | No |
| `skipped` | Yes | No |
| `canceled` | Yes | No |

**Payload context (reference-first):**

- `buyer_product_export_item_id`.
- `parent_buyer_product_export_job_id`.
- `parent_buyer_product_export_batch_id` (nullable; populated when batched).
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `product_reference`, `variant_reference` (where applicable).
- `prior_item_status`.
- `new_item_status` (the discriminator value).
- `item_terminal_flag` (boolean; true for terminal Item statuses).
- `eligibility_disposition` (when transition is to / from `eligible` / `ineligible`).
- `ineligibility_reason_reference` (when `new_item_status = ineligible`).
- `dispatch_reference` (when transition is dispatch-related).
- `activation_reference` (REQUIRED when `new_item_status = activated`; the buyer-scoped activation / catalog mapping reference).
- `buyer_product_export_record_reference` (populated on terminal success; references the existing baseline Buyer Product Export Record).
- `export_baseline_record_reference` (when this Item contributes to a baseline advance).
- `error_reference` (populated on failure transitions).
- `retry_attempt_count`.
- `retry_budget_remaining`.
- `transition_timestamp`.
- Existing baseline envelope.

### Event 5 - `product-catalog.buyer-product-export-file.generated`

**Purpose:** indicate that a buyer product export file artifact has been generated.

**Emission discipline:** emitted ONLY when a file artifact exists. API-only exports do not emit this event.

**Payload context (reference-first):**

- `buyer_product_export_job_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `export_method` (typically file or mixed; never api for this event).
- `generation_timestamp`.
- `file_tracking_record_reference` (REQUIRED; references Logs & Audit File Tracking Record per PR-B).
- `file_artifact_reference` (per existing Product Catalog baseline file evidence patterns).
- `applicable_for_latest_accessories_flag` (preserves existing Export Baseline Record semantics).
- Existing baseline envelope.

### Event 6 - `product-catalog.buyer-product-export-dispatch.reference-recorded`

**Purpose:** boundary event indicating that an Integration Management dispatch reference has been recorded for an Item or Batch.

**Boundary semantics:** Product Catalog records that a dispatch reference exists. Product Catalog does NOT own the transport outcome. Integration Management owns transport outcome.

**Payload context (reference-first):**

- `buyer_product_export_job_id`.
- `buyer_product_export_item_id` (when the dispatch reference is per-Item; mutually exclusive with batch reference).
- `buyer_product_export_batch_id` (when the dispatch reference is per-Batch; mutually exclusive with item reference).
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `integration_dispatch_reference` (the reference to Integration Management delivery / receipt evidence).
- `dispatch_recording_timestamp`.
- Existing baseline envelope.

**Critical:** this event does NOT carry transport outcome (success / failure). Transport outcome is owned by Integration Management and is observed by Product Catalog via the dispatch reference, which then drives the consequent `item.status-changed` event.

---

### Discriminator extension discipline

For all four `status-changed` events (job, batch, item) plus the two boundary events (file.generated, dispatch.reference-recorded):

- Discriminator values are case-sensitive lowercase identifiers per existing Product Catalog + Tenant Company baseline.
- Discriminator values are stable across schema versions (additions are additive; removals require explicit deprecation per baseline).
- Subscribers MUST handle unknown discriminator values gracefully.
- Subscribers MUST NOT route on absence of discriminator; surfaces without explicit discriminator default to existing baseline semantics.
- Discriminator extensions do NOT change event ordering, retry, or idempotency semantics.

### Reference-first context discipline

Per PR-A reference-first discipline:

- No concrete payload field shape is locked.
- All payload context references are to existing entity / projection identifiers.
- Implementation owns concrete payload schema.
- Future API Governance Foundation PR locks concrete payload schema.

### What this event-contracts section intentionally does NOT lock

- Concrete payload field schema. Future API Governance Foundation PR.
- Concrete subscriber routing / filtering implementation. Future implementation.
- Concrete event delivery transport. Existing Integration Management baseline + future Integration coordination.
- Concrete schema versioning policy beyond existing Product Catalog baseline.
- Concrete subscriber rate limiting / backpressure. Implementation.
- Future discriminator value additions beyond the catalogs documented here.
- Concrete event ordering guarantees beyond existing baseline.

### Existing Product Catalog event contracts preserved (no edits)

All existing Product Catalog event contracts (product record events, lifecycle / availability / release / EOL events, publication / visibility / buyer relationship events, compatibility / pricing-input / media-attachment events, import / export / integration / update events, accessory discovery and export confirmation events, buyer relationship and export events, latest-accessories baseline events, notification-triggering events) are preserved without modification.

## Buyer-Scoped Compatibility Projection Event Contracts

This section documents the payload contracts for the 5 new Product Catalog Buyer-Scoped Compatibility Projection events. The Device Catalog side (1 new event) is documented in `modules/device-catalog/event-contracts.md`. All payload extensions are reference-first per existing PR-A discipline. No concrete schema is locked; concrete payload schema is future API Governance Foundation PR work.

### Contract discipline

- All payload extensions are reference-first per existing Product Catalog + PR-A discipline.
- No concrete schema is locked.
- Discriminator value catalogs are documented per event below.
- Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility).
- All existing payload envelope fields (`correlation_reference`, `trace_reference`, `idempotency_key`, `audit_record_reference`, schema version) are preserved per existing baseline.

---

### Event 1 - `product-catalog.buyer-compatibility-projection.recalculation-requested`

**Purpose:** indicate that projection recalculation has been triggered.

**Payload context (reference-first):**

- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad).
- `prior_buyer_scoped_compatibility_projection_reference` (the projection being superseded; nullable for first-time projection creation).
- `triggering_buyer_device_portfolio_change_record_reference` (nullable; populated when triggered by portfolio change).
- `triggering_compatibility_mapping_change_reference` (nullable; populated when triggered by vendor-side compatibility mapping change).
- `triggering_explicit_request_actor_reference` (nullable; populated when triggered by explicit buyer / admin refresh request).
- `recalculation_request_timestamp`.
- `recalculation_request_reason_reference`.
- Existing baseline envelope: `correlation_reference`, `trace_reference`, `audit_record_reference`.

### Event 2 - `product-catalog.buyer-compatibility-projection.status-changed`

**Purpose:** indicate Buyer-Scoped Compatibility Projection status transition.

**Discriminator:** `projection_status` (string-enum; 6 values).

**Discriminator value catalog (6 values):**

| Value | Terminal-equivalent? | Meaning |
|---|---|---|
| `current` | Yes (for that projection version) | Up to date with latest source state. |
| `stale` | No | Source state has advanced; consumers should prefer a fresh projection. |
| `recalculating` | No | New projection being computed. |
| `failed` | Yes | Most recent recalculation failed. |
| `review_required` | Conditional | Portfolio change requires explicit acknowledgment. |
| `superseded` | Yes | Replaced by a newer projection version. |

**Payload context (reference-first):**

- `buyer_scoped_compatibility_projection_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `prior_projection_status`.
- `new_projection_status` (the discriminator value).
- `transition_timestamp`.
- `reason_reference`.
- `triggering_buyer_device_portfolio_change_record_reference` (nullable).
- `triggering_compatibility_mapping_change_reference` (nullable).
- `buyer_device_portfolio_snapshot_reference` (the snapshot the projection was computed against).
- `source_compatibility_mapping_version_reference`.
- `prior_projection_reference` (when superseded).
- Existing baseline envelope.

### Event 3 - `product-catalog.buyer-accessory-visibility.changed`

**Purpose:** indicate per-accessory visibility transition.

**Discriminator:** `visibility_status` (string-enum; 5 values).

**Discriminator value catalog (5 values):**

| Value | Meaning |
|---|---|
| `now_visible` | Accessory is newly in active addable list (e.g., from device add). |
| `no_longer_visible` | Accessory is no longer in active addable list (e.g., from device remove with no other compatible device). |
| `still_visible_compatibility_narrowed` | Visible; fewer compatible devices than before. |
| `still_visible_compatibility_expanded` | Visible; more compatible devices than before. |
| `still_visible_unchanged` | No change. |

**Payload context (reference-first):**

- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `product_reference`, `variant_reference` (where applicable).
- `prior_visibility_status`.
- `new_visibility_status` (the discriminator value).
- `triggering_buyer_scoped_compatibility_projection_reference` (the projection that produced the visibility change).
- `triggering_buyer_device_portfolio_change_record_reference` (nullable).
- `reason_reference`.
- `transition_timestamp`.
- Existing baseline envelope.

### Event 4 - `product-catalog.buyer-accessory-compatibility-impact.recorded`

**Purpose:** indicate Buyer Accessory Compatibility Impact Record creation.

**Discriminator:** `impact_state` (string-enum; 7 values).

**Discriminator value catalog (7 values):**

| Value | Meaning |
|---|---|
| `unaffected` | Default; compatibility unchanged. |
| `no_longer_compatible` | Zero remaining compatible devices. |
| `compatibility_restored` | Subsequent change restored compatibility. |
| `review_required` | Flagged; awaiting acknowledgment. |
| `hidden_from_active_addable_list` | Removed from active addable list; buyer relationship state preserved. |
| `compatibility_narrowed` | Fewer compatible devices than before. |
| `compatibility_expanded` | More compatible devices than before. |

**Payload context (reference-first):**

- `buyer_accessory_compatibility_impact_record_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `product_reference`, `variant_reference` (where applicable).
- `triggering_buyer_device_portfolio_change_record_reference` (REQUIRED).
- `prior_buyer_scoped_compatibility_projection_reference`.
- `current_buyer_scoped_compatibility_projection_reference`.
- `impact_state` (the discriminator value).
- `affected_buyer_relationship_state` (snapshot at impact time).
- `recommended_buyer_action` (one of: `none`, `review`, `stop_selling_recommended`, `acknowledge`, `manual_remap_required`).
- `recording_timestamp`.
- Existing baseline envelope.

### Event 5 - `product-catalog.buyer-export-selection.compatibility-snapshot-recorded`

**Purpose:** indicate that PR #104 Buyer Product Export Selection Snapshot has bound `compatibility_projection_reference_at_snapshot` at Job creation.

**Payload context (reference-first):**

- `buyer_product_export_job_id`.
- `buyer_product_export_selection_snapshot_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `compatibility_projection_reference_at_snapshot` (REQUIRED).
- `compatible_device_references_at_snapshot`.
- `binding_timestamp`.
- Existing baseline envelope.

---

### Discriminator extension discipline

- Discriminator values are case-sensitive lowercase identifiers per existing baseline.
- Discriminator values are stable across schema versions (additions are additive; removals require explicit deprecation per baseline).
- Subscribers MUST handle unknown discriminator values gracefully.
- Discriminator extensions do NOT change event ordering, retry, or idempotency semantics.

### Reference-first context discipline

Per PR-A reference-first discipline:

- No concrete payload field shape is locked.
- All payload context references are to existing entity / projection identifiers.
- Implementation owns concrete payload schema.
- Future API Governance Foundation PR locks concrete payload schema.

### What this event-contracts section intentionally does NOT lock

- Concrete payload field schema. Future API Governance Foundation PR.
- Concrete subscriber routing / filtering implementation. Implementation.
- Concrete event delivery transport. Existing Integration Management baseline + future Integration coordination.
- Concrete schema versioning policy beyond existing Product Catalog baseline.
- Concrete subscriber rate limiting / backpressure. Implementation.
- Future discriminator value additions beyond the catalogs documented here.
- Concrete event ordering guarantees beyond existing baseline.

### Existing Product Catalog event contracts preserved (no edits)

All existing Product Catalog event contracts (PR #104 contracts; pre-PR-#104 baseline contracts for product record events, lifecycle / availability / release / EOL events, publication / visibility / buyer relationship events, compatibility / pricing-input / media-attachment events, import / export / integration / update events, accessory discovery and export confirmation events, buyer relationship and export events, latest-accessories baseline events, notification-triggering events) are preserved without modification.
