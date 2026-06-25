# Product Catalog Events

This document is proposal-level architecture. Event names, payloads, delivery guarantees, and consumers remain placeholders until implementation contracts are finalized.

Product Catalog emits catalog business events, notification-triggering events, integration/export/update signals, audit-ready change events, and AI-ready catalog signals. Notification Platform Service owns delivery. Integration Management owns external transport evidence. Logs & Audit owns audit evidence. AI Agent Services owns recommendations and action outcomes.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery, buyer selection, export confirmation, confirmation-line eligibility, export apply disposition, and admin buyer context events.

## Published Events

Product record and identity:

- `catalog.product.created`.
- `catalog.product.updated`.
- `catalog.identity.changed`.
- `catalog.identifier.changed`.
- `catalog.variant.changed`.
- `catalog.color-normalization.changed`.

Lifecycle, availability, release, and EOL:

- `catalog.lifecycle.changed`.
- `catalog.product.released-to-buyers`.
- `catalog.product.launched`.
- `catalog.launch-eligibility.evidence-recorded`.
- `catalog.launch-eligibility.review-required`.
- `catalog.product.eol-marked`.
- `catalog.product.eol-approaching`.
- `catalog.product.eol-reached`.
- `catalog.eol-policy.signal-created`.
- `catalog.eol-downstream-disposition.reference-recorded`.
- `catalog.product.archived`.
- `catalog.availability.changed`.
- `catalog.availability.evidence-recorded`.
- `catalog.availability.review-required`.
- `catalog.product.out-of-stock`.
- `catalog.product.back-in-stock`.
- `catalog.product.low-stock`.

Publication, visibility, discovery, and buyer relationship:

- `catalog.publication.changed`.
- `catalog.visibility.changed`.
- `catalog.buyer-derived-status.changed`.
- `catalog.buyer-selling-status.changed`.
- `catalog.stop-sell.changed`.
- `catalog.product.activated`.
- `catalog.activation.changed`.
- `catalog.activation.revoked`.
- `product-catalog.accessory-discovery.empty-state-shown`.
- `product-catalog.accessory-filter.applied`.
- `product-catalog.accessory-search.performed`.
- `product-catalog.accessory-selection.updated`.
- `product-catalog.admin-buyer-context.viewed`.
- `product-catalog.admin-buyer-context.act-on-behalf-requested`.

Compatibility, pricing input, and media attachment:

- `catalog.compatibility.changed`.
- `catalog.compatibility.import-mode.applied`.
- `catalog.pricing-input.changed`.
- `catalog.pricing-evidence.changed`.
- `catalog.media.changed`.
- `catalog.media-attachment.changed`.

Import/export and integration/update:

- `catalog.import.completed`.
- `catalog.import.failed`.
- `catalog.import.correction-required`.
- `catalog.import.review-required`.
- `catalog.product.downloaded`.
- `catalog.product.export.completed`.
- `catalog.product.export.failed`.
- `catalog.export-baseline.advanced`.
- `catalog.export-baseline.not-advanced`.
- `catalog.catalog-update.signal-created`.
- `catalog.catalog-sync.failed-reference`.
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

AI-ready signals:

- `catalog.ai.cleanup-signal.created`.
- `catalog.ai.compatibility-signal.created`.
- `catalog.ai.pricing-validation-signal.created`.
- `catalog.ai.image-quality-signal.created`.
- `catalog.ai.recommendation-signal.created`.
- `catalog.ai.promotion-planning-signal.created`.
- `catalog.ai.buyer-opportunity-signal.created`.
- `catalog.ai.fulfillment-exception-signal.created`.

## Event Contract Principles

Events should default to references, versions, summaries, redaction classes, and lookup contracts rather than unrestricted product, pricing, tenant, or media payloads.

Common proposal-level fields:

- Event id.
- Event type.
- Event version.
- Occurred at.
- Product / product master / variant reference.
- Vendor reference.
- Buyer or entity scope where relevant.
- Tenant scope reference.
- Product Type.
- Source module/source actor.
- Source version/hash.
- Catalog entity version.
- Import/export batch reference where relevant.
- Discovery, filter, selection, export confirmation, confirmation line, export disposition, or buyer relationship reference where relevant.
- Audit reference.
- Redaction class.
- Notification trigger classification where relevant.
- Integration/update signal reference where relevant.
- AI signal family where relevant.

## Lifecycle And Availability Events

Lifecycle and availability events must preserve the separation between lifecycle and availability.

`catalog.lifecycle.changed` should not imply buyer visibility, sellability, price readiness, routing, fulfillment, or notification delivery.

`catalog.availability.changed`, `catalog.product.out-of-stock`, `catalog.product.back-in-stock`, and `catalog.product.low-stock` represent catalog availability evidence. They do not create shipment state, inventory ledger entries, fulfillment execution, or invoice behavior.

`catalog.availability.evidence-recorded` should include availability source, source module/system, source timestamp, received timestamp, freshness/expiration, quantity basis, quantity/threshold references, source disposition, stale/missing state, display-only flag, sellability-affecting flag, backorder-eligible flag, advisory-only flag, review state, supersession reference, and audit reference.

Out of Stock and Back in Stock events may trigger notification and integration/update signals for affected buyers where configured. Downstream modules decide their own operational behavior using consumed catalog evidence.

## Release / Launch / EOL Events

`catalog.product.released-to-buyers` indicates a Product Catalog release condition for eligible buyer review inside CIXCI. It does not guarantee customer-facing display or sale.

`catalog.product.launched` indicates customer-facing eligibility under Product Catalog rules and source-owned readiness evidence. It does not replace Launch / Event Management launch records or readiness coordination, and Launch Date alone does not make a product customer-facing sellable.

`catalog.launch-eligibility.evidence-recorded` should include authority module, source readiness signal id, source readiness signal version/hash, pricing readiness reference, media readiness reference, Tenant Company eligibility/channel scope reference, compatibility readiness reference, availability readiness reference, Product Catalog review state reference, Launch/Event reference where applicable, freshness/expiration, stale/missing state, waiver/override evidence, recheck-before-launch flag, customer-facing eligibility disposition, review state, and audit reference.

`catalog.product.eol-marked`, `catalog.product.eol-approaching`, and `catalog.product.eol-reached` should include EOL Date, sell-through policy reference, replacement product reference placeholder, buyer impact summary, EOL policy signal reference, and downstream disposition references where safe.

`catalog.eol-policy.signal-created` should include sell-through policy reference, affected buyer-product relationship references, catalog visibility disposition, catalog downloadability disposition, buyer selling status disposition, order-routing disposition reference, procurement disposition reference, fulfillment disposition reference, invoice disposition reference, integration update disposition reference, downstream acknowledgement placeholder, review state, supersession reference, and audit reference.

`catalog.product.archived` should preserve historical traceability and should not indicate physical deletion.

## Compatibility Events

`catalog.compatibility.changed` should include product/variant references, Device Reference references, compatibility action family, added/removed summary, source, confidence/status, version, review state, and audit reference.

Replace and Selective Remove actions should reference preview/confirmation evidence.

Compatibility events must not publish canonical Device Catalog source fields as Product Catalog-owned facts.

## Accessory Discovery And Export Confirmation Events

Discovery and selection events should include buyer/entity scope, Tenant Company scope evidence, Device Catalog My Devices or Device Reference where relevant, Product Catalog visibility projection references, search/filter/selection set references, redaction class, and audit reference.

`product-catalog.accessory-export.confirmation-line.created`, `product-catalog.accessory-export.confirmation-line.blocked`, and `product-catalog.accessory-export.confirmation-line.warning-recorded` should include confirmation id, confirmation line id, product/variant reference, product source version/hash, compatibility evidence reference/version, lifecycle disposition, availability disposition, sales channel eligibility disposition, buyer visibility/access disposition, buyer account status evidence reference, already exported state, warning/blocking classification, warning or blocker reason, stale/missing/conflicting evidence state, recheck-before-confirm flag, selected/applied/ignored/blocked state, resulting export line reference, resulting buyer relationship update reference, review state, supersession reference, and audit reference.

`product-catalog.accessory-export.apply-started`, `product-catalog.accessory-export.applied`, `product-catalog.accessory-export.delivery-pending`, and `product-catalog.accessory-export.delivery-failed-reference-recorded` should preserve Product Catalog export apply disposition separately from Integration Management delivery/receipt evidence and Logs & Audit file/download evidence.

`product-catalog.buyer-accessory-relationship.advancement-blocked` and `product-catalog.buyer-accessory-relationship.state-advanced-after-export` should include export confirmation line references, export apply disposition, baseline advancement reference, prior/new buyer relationship state, applied vs ignored state, review-required state, and audit reference.

## Buyer Relationship And Export Events

`catalog.product.downloaded` and `catalog.product.export.completed` should include buyer scope, actor/service, export method, export timestamp, export status, exported product references or secured lookup reference, redaction class, export baseline reference, applicable-for-Latest-Accessories flag, and audit reference.

`catalog.export-baseline.advanced` and `catalog.export-baseline.not-advanced` should include export baseline record reference, export schema version, export filter scope, Product Type scope, buyer/entity scope, visibility/access projection reference, included product references or secured lookup, excluded product reason summary, partial export state, delivery failed state, revoked export state, superseded export state, baseline advanced timestamp where applicable, baseline source export reference, and audit reference.

`catalog.buyer-selling-status.changed` should include buyer scope, product/variant reference, prior/new Buyer Selling Status, reason, actor/source, effective timestamp, integration/update signal reference, and audit reference.

Buyer Selling Status events must not mutate vendor lifecycle or availability state.

## Pricing And Media Events

`catalog.pricing-input.changed` and `catalog.pricing-evidence.changed` should expose Pricing Handoff References, source/version metadata, and redaction class. Sensitive commercial values should require authorized lookup. Pricing owns interpretation and calculation.

`catalog.media-attachment.changed` should expose Product Catalog attachment references and Media evidence references. Media owns asset processing, storage, renditions, URL generation, and access policy.

## Notification-Triggering Event Examples

Product Catalog may emit notification-triggering events for:

- Product released to buyers.
- Product launched / active eligible.
- Launch eligibility evidence missing, stale, expired, or review-required.
- Product marked End of Life.
- EOL approaching or reached.
- EOL downstream disposition review required.
- Out of Stock.
- Back in Stock.
- Low Stock.
- Availability evidence missing, stale, expired, or review-required.
- Accessory export confirmation line blocked or review-required.
- Buyer accessory relationship advancement blocked.
- Compatibility updated.
- Pricing input changed / pricing evidence changed.
- Media attachment changed.
- Buyer selling status changed.
- Buyer export/download completed.
- Latest Accessories baseline not advanced.
- Catalog sync/update failed reference.

Notification Platform Service owns recipient resolution, preferences, templates, delivery, retries, and delivery status.

## Integration / Export Signal Events

Product Catalog may emit update/export signals for buyer systems where configured.

Integration Management owns external delivery/receipt state, API/webhook/CSV/SFTP/manual transport evidence, provider failures/retries, external system references, and integration update disposition references.

## Consumed Events

Product Catalog may consume:

- Device Catalog events for Device Reference lifecycle, identity, merge/split/supersession, or buyer device portfolio changes that affect compatibility and visibility.
- Tenant Company events for company/entity, relationship eligibility, region/channel, Product Type, readiness, role, permission, or configuration changes.
- Pricing events for pricing handoff acknowledgement, snapshot readiness, or pricing evidence state.
- Media events for asset readiness, mapping evidence, approval/rejection, URL/rendition readiness, or media quality state.
- Launch / Event Management events for launch readiness/calendar conflicts, while preserving Product Catalog lifecycle ownership.
- Integration Management events for catalog update delivery failures, integration update dispositions, or external system references.
- Logs & Audit events/references for import/export evidence.

## Retry / Failure / Idempotency

- Event publication should use idempotency keys and event ids.
- Replayed events must not duplicate downstream records.
- Failed event publication should create retry/dead-letter/review evidence according to platform principles.
- Integration delivery failure should be tracked by Integration Management and referenced by Product Catalog where catalog sync status is needed.
- Confirmation-line events should be idempotent by confirmation line id, product/variant reference, source version, and action.

## Audit And AI

Catalog changes should produce audit-ready evidence. Logs & Audit owns audit records and file tracking. Product Catalog owns catalog change history.

AI-ready events may support Catalog Cleanup Agent, Compatibility Agent, Pricing Validation Agent, Image Quality Agent, Recommendation Agent, Promotion Planning Agent, Buyer Opportunity Agent, and Fulfillment Exception Agent.

AI Agent Services may recommend actions but must not mutate product records without approved action contracts and permissions.

## Buyer Product Export Job Foundation Event Discipline

This section documents the event discipline for the Buyer Product Export Job Foundation. **Exactly 6 new Product Catalog events** are introduced, all discriminator-based and additive to the existing Product Catalog event surface. All existing Product Catalog events are preserved without modification.

### Core discipline

- **Exactly 6 new events introduced.** No more, no less.
- **Discriminator-first design** consistent with PR-D, PR-E, and PR #103 discipline. Job, Batch, and Item status changes are observable via `status-changed` events with status discriminators rather than per-status events.
- **No event explosion.** Throttle, retry, cancellation, and dispatch outcomes are observable via Job / Item status discriminators on the 6 new events. Per-concern events (e.g., `tenant.audit-capability.granted`) are rejected as a pattern across the platform.
- **Boundary discipline:** `file.generated` only emits when a file artifact exists; `dispatch.reference-recorded` is a boundary event and does NOT mean Product Catalog owns transport outcome.
- **Existing Product Catalog events preserved.** No existing event is renamed or removed.

### The 6 new events

#### Event 1 - `product-catalog.buyer-product-export-job.requested`

**Emission trigger:** Job creation at initial `job_status = requested`.

**Audit-coordination semantics carried:**

- Job creation, including individual Add Accessory clicks (every export creates a Job).
- Trigger kind captured (one of 11 enumerated trigger kinds).
- Buyer-scope triad on the Job (buyer_reference, company_scope_reference, buyer_entity_reference).
- Selection inputs captured (selection set reference, filter scope, etc.).
- Idempotency key captured.

**Payload context (reference-first):** see `event-contracts.md`.

#### Event 2 - `product-catalog.buyer-product-export-job.status-changed`

**Emission trigger:** every Job status transition.

**Discriminator:** `job_status` (one of 14 Job statuses).

**Audit-coordination semantics carried:**

- All Job status transitions: `requested` -> `queued` -> `validating` -> `snapshotting` -> `batching` -> `throttled` -> `processing` -> `retry_scheduled` -> `completed` / `completed_with_errors` / `failed` / `canceled` / `expired` / `blocked`.
- Terminal Job statuses (`completed`, `completed_with_errors`, `failed`, `canceled`, `expired`, `blocked`-when-permanent) are observable via `terminal_flag` payload context.
- Applied throttling policy references are carried in payload context.
- Reason references are carried in payload context.

**Subsumes (no separate events needed for):**

- Job throttled (use `job_status = throttled` discriminator).
- Job completed (use `job_status = completed` discriminator + `terminal_flag = true`).
- Job failed (use `job_status = failed` discriminator + `terminal_flag = true`).
- Job canceled (use `job_status = canceled` discriminator + `terminal_flag = true`).
- Job expired (use `job_status = expired` discriminator + `terminal_flag = true`).
- Job blocked (use `job_status = blocked` discriminator).
- Job retry scheduled (use `job_status = retry_scheduled` discriminator).

#### Event 3 - `product-catalog.buyer-product-export-batch.status-changed`

**Emission trigger:** every Batch status transition (when the Job is batched).

**Discriminator:** `batch_status` (one of `pending`, `dispatch_pending`, `processing`, `completed`, `completed_with_errors`, `failed`, `throttled`).

**Audit-coordination semantics carried:**

- Batch-level status transitions for large Jobs.
- Dispatch window references (when Integration Dispatch Rate Policy applied).
- Batch terminal timestamps.

**Note:** Batches are sub-structure, NOT operational source of truth. Item records remain canonical for item-level state. Batch events are progress / throttling observability, not Item-state replacement.

#### Event 4 - `product-catalog.buyer-product-export-item.status-changed`

**Emission trigger:** every Item status transition.

**Discriminator:** `item_status` (one of 14 Item statuses).

**Audit-coordination semantics carried:**

- All Item status transitions: `pending` -> `validating` -> `eligible` / `ineligible` -> `queued` -> `processing` -> `dispatch_pending` -> `exported` -> `activation_pending` -> `activated` (terminal success) OR `failed` / `retry_scheduled` / `skipped` / `canceled`.
- **Item terminal `activated` is the canonical trigger for buyer-specific Accessory Added.** Payload carries `activation_reference` populated on `item.activated`.
- Item terminal `failed`, `ineligible`, `skipped`, `canceled` are observable via `item_terminal_flag = true` payload context.
- Error references are carried in payload context on failure transitions.
- Dispatch references are carried in payload context on dispatch-related transitions.

**Subsumes (no separate events needed for):**

- Item completed (use `item_status = activated` discriminator + `item_terminal_flag = true`).
- Item failed (use `item_status = failed` discriminator + `item_terminal_flag = true`).
- Item retry scheduled (use `item_status = retry_scheduled` discriminator).
- Item skipped (use `item_status = skipped` discriminator + `item_terminal_flag = true`).
- Item canceled (use `item_status = canceled` discriminator + `item_terminal_flag = true`).
- Item ineligible (use `item_status = ineligible` discriminator + `item_terminal_flag = true`).
- Item activation completion (use `item_status = activated`; NOT a separate activation event).

**Critical:** Activation completion is observable via Item status `activated`, NOT a separate event.

#### Event 5 - `product-catalog.buyer-product-export-file.generated`

**Emission trigger:** ONLY when a file artifact exists (file exports; not API-only exports).

**Audit-coordination semantics carried:**

- File artifact creation (when export mode is file or mixed).
- Logs & Audit / File Tracking reference for the artifact.
- Per existing baseline file evidence patterns.

**Not emitted:**

- For API-only exports (no file artifact exists).
- For Jobs that fail before file generation.
- For Items processed without file generation.

#### Event 6 - `product-catalog.buyer-product-export-dispatch.reference-recorded`

**Emission trigger:** when an Integration Management dispatch reference is recorded for an Item or Batch.

**Boundary-event semantics:**

- Product Catalog records that a dispatch reference exists.
- Product Catalog does NOT own the transport outcome.
- Integration Management owns transport outcome.
- Product Catalog will DECIDE the resulting Item status (`activated`, `failed`, `retry_scheduled`, etc.) based on the dispatch reference outcome and Product Catalog rules.

**Boundary wording (locked):** Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.

### Events explicitly NOT introduced

The following proposed events are REJECTED because they would create event explosion. Each is subsumed by an existing or new discriminator-based event.

| Proposed event | Status | Subsumed by |
|---|---|---|
| `product-catalog.buyer-product-export-item.completed` | REJECTED | `item.status-changed` + `item_status = activated` discriminator |
| `product-catalog.buyer-product-export-item.failed` | REJECTED | `item.status-changed` + `item_status = failed` discriminator |
| `product-catalog.buyer-product-export-item.activated` | REJECTED | `item.status-changed` + `item_status = activated` discriminator |
| `product-catalog.buyer-product-export-job.completed` | REJECTED | `job.status-changed` + `job_status = completed` discriminator |
| `product-catalog.buyer-product-export-job.failed` | REJECTED | `job.status-changed` + `job_status = failed` discriminator |
| `product-catalog.buyer-product-export-job.canceled` | REJECTED | `job.status-changed` + `job_status = canceled` discriminator |
| `product-catalog.buyer-product-export-job.expired` | REJECTED | `job.status-changed` + `job_status = expired` discriminator |
| `product-catalog.buyer-product-export-job.blocked` | REJECTED | `job.status-changed` + `job_status = blocked` discriminator |
| `product-catalog.buyer-product-export.throttled` | REJECTED | `job.status-changed` + `job_status = throttled` discriminator + `applied_throttle_policy_references` payload |
| `product-catalog.buyer-product-export.retry-scheduled` | REJECTED | `job.status-changed` / `item.status-changed` + status `retry_scheduled` discriminator |
| `product-catalog.buyer-product-export.cancellation-recorded` | REJECTED | `job.status-changed` + `job_status = canceled` discriminator |
| `product-catalog.buyer-product-export-dispatch.completed` | REJECTED | Integration Management owns dispatch outcome; Product Catalog uses `dispatch.reference-recorded` and consequent `item.status-changed` |
| `product-catalog.buyer-product-export-dispatch.failed` | REJECTED | Integration Management owns dispatch outcome; Product Catalog uses `dispatch.reference-recorded` and consequent `item.status-changed` with `item_status = failed` |

### Item-level outcomes: records + events

Item-level outcomes are BOTH records AND events:

- **Records:** Buyer Product Export Item (with `item_status`) is the source of truth.
- **Events:** `item.status-changed` (with `item_status` discriminator) is the observability surface.

Subscribers consume the event; Logs & Audit indexes the record via existing `service_identity.evidence_emit`; UI reads the record. There is no information loss between record and event; both surfaces are kept synchronized.

### Activation completion as Item status, not separate event

Activation completion is observable via Item status `activated`, NOT a separate event. The `item.status-changed` event with `item_status = activated` carries the `activation_reference` in payload context. This is the canonical trigger for buyer-specific Accessory Added per the Add Accessory / Accessory Added rule in `accessory-discovery-selection.md`.

### File generation only when artifact exists

`buyer-product-export-file.generated` is emitted ONLY when a file artifact exists. API-only exports do not produce this event. This avoids the failure mode where subscribers expect a file-generated signal for every Job and silently misbehave when no file is produced.

### Dispatch reference as boundary event

`buyer-product-export-dispatch.reference-recorded` is a BOUNDARY event. Product Catalog records that Integration Management dispatch has been initiated and a reference exists. Product Catalog does NOT own the dispatch outcome; Integration Management does. Product Catalog will later decide Item status based on the dispatch reference outcome and Product Catalog rules.

### Existing Product Catalog events preserved (no edits)

All existing Product Catalog events are preserved without modification:

- Product record and identity events (`catalog.product.created`, `catalog.product.updated`, `catalog.identity.changed`, `catalog.identifier.changed`, `catalog.variant.changed`, `catalog.color-normalization.changed`).
- Lifecycle, availability, release, and EOL events.
- Publication, visibility, discovery, and buyer relationship events (including `catalog.product.activated`, `catalog.activation.changed`, `catalog.activation.revoked`, `catalog.buyer-derived-status.changed`, `catalog.buyer-selling-status.changed`, `catalog.stop-sell.changed`).
- Compatibility, pricing input, and media attachment events.
- Import / export and integration / update events (including `catalog.product.downloaded`, `catalog.product.export.completed`, `catalog.product.export.failed`, `catalog.export-baseline.advanced`, `catalog.export-baseline.not-advanced`).
- Accessory discovery and export confirmation events (`product-catalog.accessory-export.confirmation-line.created`, `.blocked`, `.warning-recorded`, `product-catalog.accessory-export.apply-started`, `.applied`, `.delivery-pending`, `.delivery-failed-reference-recorded`).
- Buyer relationship events (`product-catalog.buyer-accessory-relationship.advancement-blocked`, `.state-advanced-after-export`, `product-catalog.latest-accessories.baseline-updated`, `.baseline-advancement-skipped`).
- Notification-triggering events, integration / export signal events, AI-ready catalog signals.

### Net event inventory after this PR

- **New Product Catalog events introduced: 6.**
- Existing Product Catalog events: preserved without modification.
- Existing Tenant Company events: preserved by reference; no Tenant Company file modified.
- Existing Logs & Audit events: preserved by reference; no Logs & Audit file modified.
- Existing Integration Management events: preserved by reference; no Integration Management file modified.

### Event boundary discipline

- Product Catalog emits Product Catalog events for Product Catalog state changes.
- Logs & Audit emits Logs & Audit events for Logs & Audit lifecycle.
- Tenant Company emits Tenant Company events for Tenant authority changes.
- Integration Management emits Integration Management events for transport / dispatch outcomes.
- None of these modules emit events on behalf of the others.
- Cross-module correlation via `correlation_reference` per PR-A discipline.
- Subscribers handle discriminator-based filtering per existing event-contract discipline.

### Forbidden event modifications

- No Product Catalog baseline event is renamed, removed, or version-bumped.
- No Logs & Audit event is modified.
- No Tenant Company event is modified.
- No Integration Management event is modified.
- No new top-level event identifier outside the 6 listed above.
- No source-module event surface (other than this Product Catalog surface) is touched.
- No discriminator value is removed from an existing catalog (extensions are additive only).

### Subscriber composition guidance

Subscribers consuming the Buyer Product Export Job Foundation surface:

- Subscribe to `job.status-changed` with `job_status` filter for Job-level lifecycle observability.
- Subscribe to `batch.status-changed` with `batch_status` filter for Batch-level progress observability (large Jobs only).
- Subscribe to `item.status-changed` with `item_status` filter for Item-level outcome observability; filter on `item_status = activated` for Accessory Added drivers.
- Subscribe to `file.generated` for file-mode export artifact observability.
- Subscribe to `dispatch.reference-recorded` for Integration Management boundary observability; consume Integration Management transport events directly for transport outcome.

Subscribers MUST NOT route on Job / Item / Batch identifier ABSENCE; surfaces without explicit discriminator default to existing baseline semantics.

## Buyer-Scoped Compatibility Projection Event Discipline

This section documents the Product Catalog event discipline for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. **Exactly 5 new Product Catalog events** are introduced, all discriminator-based and additive to the existing Product Catalog event surface. The Device Catalog side introduces 1 new event (documented in `modules/device-catalog/events.md`). Total new events across both modules: 6. All existing Product Catalog events (including PR #104 6 events and all earlier baseline events) are preserved without modification.

### Core discipline

- **Exactly 5 new Product Catalog events introduced.** No more, no less.
- **Combined with the 1 Device Catalog event, total new events = 6** across this Foundation.
- **Discriminator-first design** consistent with PR-D, PR-E, PR #103, and PR #104 discipline.
- **No event explosion.** Portfolio change types and projection / visibility / impact transitions are observable via discriminators on the 6 new events.
- **Boundary discipline:** `compatibility-snapshot-recorded` is a boundary event indicating PR #104 Selection Snapshot binding; `recalculation-requested` is the boundary event indicating a recalculation has been triggered.
- **Existing Product Catalog events preserved.** No PR #104 event or earlier event is renamed or removed.

### The 5 new Product Catalog events

#### Event 1 - `product-catalog.buyer-compatibility-projection.recalculation-requested`

**Emission trigger:** Product Catalog triggers projection recalculation in response to a Device Catalog portfolio change, a vendor-side compatibility mapping change, or an explicit buyer / admin / service identity refresh request.

**Audit-coordination semantics carried:**

- Recalculation request, including the triggering reason.
- Buyer-scope triad on the projection.
- Prior projection reference (the projection being superseded).
- Triggering reference (portfolio change record OR compatibility mapping change OR explicit request).

**Payload context (reference-first):** see `event-contracts.md`.

#### Event 2 - `product-catalog.buyer-compatibility-projection.status-changed`

**Emission trigger:** every Buyer-Scoped Compatibility Projection status transition.

**Discriminator:** `projection_status` (one of 6 values).

**Audit-coordination semantics carried:**

- All projection status transitions: `recalculating` -> `current` / `failed` / `review_required`; `current` -> `stale` (when source state advances); any -> `superseded` (when a newer projection replaces).
- Terminal-equivalent statuses observable via payload context (`current`, `failed`, `superseded` are typically considered terminal for the projection version; `review_required` is conditional terminal pending acknowledgment).
- Reason references and triggering references carried in payload context.

**Subsumes (no separate events needed for):**

- Projection recalculated (use `projection_status = current` discriminator).
- Projection failed (use `projection_status = failed` discriminator).
- Projection stale detected (use `projection_status = stale` discriminator).
- Projection requires review (use `projection_status = review_required` discriminator).
- Projection superseded (use `projection_status = superseded` discriminator).

#### Event 3 - `product-catalog.buyer-accessory-visibility.changed`

**Emission trigger:** every per-accessory visibility transition resulting from a projection update.

**Discriminator:** `visibility_status` (5 values: `now_visible`, `no_longer_visible`, `still_visible_compatibility_narrowed`, `still_visible_compatibility_expanded`, `still_visible_unchanged`).

**Audit-coordination semantics carried:**

- Per-accessory visibility transitions.
- Reason references (e.g., `device_added`, `device_removed`, `compatibility_mapping_changed`).
- Buyer-scope triad on the visibility change.

**Subsumes (no separate events needed for):**

- Per-accessory `became-visible` event (use `visibility_status = now_visible`).
- Per-accessory `became-invisible` event (use `visibility_status = no_longer_visible`).

#### Event 4 - `product-catalog.buyer-accessory-compatibility-impact.recorded`

**Emission trigger:** every Buyer Accessory Compatibility Impact Record creation.

**Discriminator:** `impact_state` (one of 7 values).

**Audit-coordination semantics carried:**

- Per-accessory impact assessment for previously-activated accessories.
- Buyer-scope triad on the impact record.
- Triggering portfolio change record reference.
- Prior + current projection references.
- Affected buyer relationship state and recommended buyer action.

**Subsumes (no separate events needed for):**

- Per-impact-state event (use `impact_state` discriminator: `unaffected`, `no_longer_compatible`, `compatibility_restored`, `review_required`, `hidden_from_active_addable_list`, `compatibility_narrowed`, `compatibility_expanded`).

#### Event 5 - `product-catalog.buyer-export-selection.compatibility-snapshot-recorded`

**Emission trigger:** PR #104 Selection Snapshot binds `compatibility_projection_reference_at_snapshot` at Job creation (extends PR #104 Workflow 2).

**Audit-coordination semantics carried:**

- Selection Snapshot binding of the compatibility projection in effect at Job creation.
- `compatible_device_references_at_snapshot`.
- Buyer-scope triad on the Selection Snapshot.

**Boundary event:** this event documents the binding moment and supports observability for the in-flight Job's immutability guarantee (Workflow 10).

### Events explicitly NOT introduced

The following proposed events are REJECTED because they would create event explosion. Each is subsumed by an existing or new discriminator-based event.

| Proposed event | Status | Subsumed by |
|---|---|---|
| `product-catalog.buyer-compatibility-projection.recalculated` | REJECTED | `projection.status-changed` + `projection_status = current` discriminator |
| `product-catalog.buyer-compatibility-projection.failed` | REJECTED | `projection.status-changed` + `projection_status = failed` discriminator |
| `product-catalog.buyer-compatibility-projection.stale-detected` | REJECTED | `projection.status-changed` + `projection_status = stale` discriminator |
| `product-catalog.buyer-compatibility-projection.superseded` | REJECTED | `projection.status-changed` + `projection_status = superseded` discriminator |
| `product-catalog.buyer-accessory.became-visible` | REJECTED | `visibility.changed` + `visibility_status = now_visible` discriminator |
| `product-catalog.buyer-accessory.became-invisible` | REJECTED | `visibility.changed` + `visibility_status = no_longer_visible` discriminator |
| `product-catalog.buyer-accessory-impact.no-longer-compatible` | REJECTED | `impact.recorded` + `impact_state = no_longer_compatible` discriminator |
| `product-catalog.buyer-accessory-impact.restored` | REJECTED | `impact.recorded` + `impact_state = compatibility_restored` discriminator |
| `product-catalog.global-compatibility-projection.*` | REJECTED | No global projection entity exists |
| Integration Management compatibility events | REJECTED | Integration Management owns its own event surface |
| Notification Platform compatibility events | REJECTED | Notification Platform owns its own event surface |
| Analytics compatibility events | REJECTED | Analytics owns its own event surface |

### Projection / impact / visibility outcomes: records + events

Projection / impact / visibility outcomes are BOTH records AND events:

- **Records:** Buyer-Scoped Compatibility Projection (with `projection_status`), Buyer Accessory Compatibility Impact Record (with `impact_state`), Buyer Accessory Visibility Projection (sub-structure) are the sources of truth.
- **Events:** `projection.status-changed`, `visibility.changed`, `impact.recorded` are the observability surfaces.

Subscribers consume events; Logs & Audit indexes records via existing `service_identity.evidence_emit`; UI reads records. There is no information loss between record and event; both surfaces are kept synchronized.

### Existing Product Catalog events preserved (no edits)

All existing Product Catalog events are preserved without modification:

- PR #104 events (6): `buyer-product-export-job.requested`, `buyer-product-export-job.status-changed`, `buyer-product-export-batch.status-changed`, `buyer-product-export-item.status-changed`, `buyer-product-export-file.generated`, `buyer-product-export-dispatch.reference-recorded`.
- Pre-PR-#104 events: product record / identity events; lifecycle, availability, release, EOL events; publication, visibility, discovery, buyer relationship events (including `catalog.product.activated`, `catalog.activation.changed`, `catalog.activation.revoked`, `catalog.buyer-derived-status.changed`, `catalog.buyer-selling-status.changed`, `catalog.stop-sell.changed`); compatibility, pricing input, media attachment events; import / export / integration / update events; accessory discovery and export confirmation events; buyer relationship events; notification-triggering events; AI-ready catalog signals.

### Net Product Catalog event inventory after this PR

- **New Product Catalog events: 5.**
- Existing PR #104 Product Catalog events: preserved without modification.
- Existing pre-PR-#104 Product Catalog events: preserved without modification.
- New Device Catalog event: 1 (documented in `modules/device-catalog/events.md`).
- **Total new events across this Foundation: 6.**
- Existing Tenant Company / Logs & Audit / Integration Management / Notification Platform / Analytics events: preserved by reference; no file modified.

### Event boundary discipline

- Product Catalog emits Product Catalog events for Product Catalog state changes.
- Device Catalog emits Device Catalog events for Device Catalog state changes (1 new event: portfolio-changed).
- Logs & Audit emits Logs & Audit events for Logs & Audit lifecycle.
- Tenant Company emits Tenant Company events for Tenant authority changes.
- Integration Management emits Integration Management events for transport / dispatch outcomes.
- None of these modules emit events on behalf of the others.
- Cross-module correlation via `correlation_reference` per PR-A discipline.
- Subscribers handle discriminator-based filtering per existing event-contract discipline.

### Forbidden event modifications

- No Product Catalog baseline event is renamed, removed, or version-bumped.
- No PR #104 event is renamed, removed, or version-bumped.
- No Device Catalog baseline event is renamed, removed, or version-bumped.
- No Logs & Audit, Tenant Company, Integration Management, Notification Platform, or Analytics event is modified.
- No new top-level event identifier outside the 5 Product Catalog + 1 Device Catalog (total 6) listed.
- No discriminator value is removed from an existing catalog (extensions are additive only).

### Subscriber composition guidance

Subscribers consuming the projection / visibility / impact surface:

- Subscribe to `projection.status-changed` with `projection_status` filter for projection-level lifecycle.
- Subscribe to `visibility.changed` with `visibility_status` filter for per-accessory visibility transitions.
- Subscribe to `impact.recorded` with `impact_state` filter for impact recording.
- Subscribe to `recalculation-requested` for recalculation observability.
- Subscribe to `compatibility-snapshot-recorded` for PR #104 Selection Snapshot binding observability.
- For Device Catalog portfolio changes: subscribe to Device Catalog `my-devices.portfolio-changed` with `change_type` filter.

Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility).
