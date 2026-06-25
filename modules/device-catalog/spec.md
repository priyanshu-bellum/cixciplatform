# Device Catalog Module Specification

## Purpose

Define the initial Device Catalog module boundary for canonical device records, device identifiers and normalization, manufacturer source data, lifecycle metadata, buyer-visible/exportable device data, and device references used by other modules.

This module aligns with ADR-0004, which makes Device Catalog distinct from Product Catalog, and ADR-0005, where Pricing owns device pricing interpretation and calculation. This draft remains proposal-level until business rules and source authority decisions are confirmed.

## Scope

- Canonical device master records and Device Reference contracts.
- Manufacturer, brand, model, and variant hierarchy placeholders.
- Device identifiers, aliases, normalization, deduplication, and source tracking.
- Device lifecycle status, launch date, release date, discontinued date, and replacement placeholders.
- Device taxonomy such as phone, tablet, smartwatch, and future device categories.
- Buyer-visible and exportable device data for buyer-controlled channels.
- Buyer Device Portfolio References without owning buyer-facing workflow UX, screen behavior, layout, filters, empty states, or display behavior.
- Future-facing manufacturer, distributor, and API ingestion placeholders; these are not Phase 1 enabled workflows.
- Phase 1 System Admin-only CSV import rules for importing new devices and updating existing devices.
- Phase 1 CSV validation for exact headers, row-level data quality, device uniqueness, status, buyer visibility, image-readiness dependency, import jobs, correction, logs, and audit.
- Device export/download interfaces for authorized buyers or buyer-facing modules.
- Device change event modeling and event contracts.
- Device References, taxonomy, and lifecycle attributes used by Product Catalog compatibility mappings, Pricing, Order Routing, Fulfillment, Analytics, and future procurement workflows.

## Business Rules

- Placeholder: define which manufacturer, CIXCI, buyer, admin, or external feed sources can create or update device fields.
- Phase 1 device CSV import is System Admin-only; manufacturers, vendors, buyers, and external integrations do not receive self-service import access in Phase 1.
- Placeholder: define canonical device identity rules across manufacturer, brand, model, variant, carrier, region, and external identifiers.
- Phase 1 device uniqueness is based on Manufacturer + Device Model + Device Type with case-insensitive matching.
- Placeholder: define normalization, merge, split, alias, and deduplication workflows beyond the Phase 1 uniqueness rule.
- Placeholder: define lifecycle status transitions for announced, active, discontinued, replaced, retired, or hidden devices.
- Phase 1 imported devices receive system status Active after successful import, while Buyer Visibility Status remains separate as Hidden or Visible.
- Future Launch Date devices remain Hidden by default unless a System Admin marks them Visible.
- Device image upload, processing, validation, storage, matching, renditions, and media audit are owned by Media Management; Phase 1 CSV import should not require public image URLs.
- Device Catalog owns the Device Image Readiness Reference used for All Devices and My Devices visibility gating.
- A device should not appear on All Devices or My Devices until an image has been uploaded and buyer visibility has been enabled.
- Placeholder: define buyer export/download eligibility and allowed device data fields.
- Placeholder: define how Device References remain stable when canonical records merge, split, or retire.

## Out of Scope

- Accessory product records and accessory product lifecycle, which belong to Product Catalog.
- Accessory-to-device compatibility assertions beyond canonical device identity and attributes, unless a future ADR assigns them here.
- Product-level visibility, product activation, and product download records.
- Media Management ownership of device image upload, processing, validation, storage, matching, renditions, media audit, public image URL policy, image transformation, CDN behavior, or external image hosting policy.
- Device pricing interpretation, effective price calculation, discounts, quotes, pricing exceptions, and pricing overrides, which belong to Pricing per ADR-0005.
- Order routing decisions, vendor selection, warehouse selection, route selection, or vendor suborder creation.
- Fulfillment execution, shipment status, returns, or inventory ownership.
- Manufacturer, distributor, or API ingestion as Phase 1 enabled workflows.
- Manufacturer bulk purchase order workflow, approval, submission, or status; future procurement workflows may reference Device Catalog records only.
- Tenant hierarchy, user provisioning, relationship eligibility, and permission definitions owned by Tenant Company.

## Dependencies

- ADR-0004 Device Catalog bounded context split.
- ADR-0005 Pricing bounded context for device pricing interpretation and calculation boundaries.
- ADR-0003 bounded contexts as amended by ADR-0004 and ADR-0005.
- Platform integration principles for future-facing manufacturer, distributor, or API ingestion placeholders. Phase 1 remains CIXCI System Admin CSV import only.
- Tenant Company for tenant, company, parent/child entity, role, permission, relationship eligibility, and buyer scope signals.
- Product Catalog for accessory product records and compatibility mappings that reference Device Catalog records through Device Reference or Compatible Device Reference.
- Pricing for commercial interpretation of Device References, taxonomy, lifecycle, and safe canonical device attributes.
- Buyer-facing modules for All Devices, My Devices, buyer export UX, portfolio workflow state, screen behavior, layout, filters, empty states, display behavior, or buyer-controlled channel behavior where applicable.
- Media Management for device image upload, processing, validation, storage, matching, renditions, and media audit.
- Future Procurement / Purchase Orders context for manufacturer bulk device purchase orders, if introduced.

## Feature Evidence Foundation (PR-A)

This section is the spec-level overview of the Device Catalog Feature Evidence Foundation introduced by PR-A. Entity-level definitions live in `modules/device-catalog/data-model.md`; ownership boundaries live in `modules/device-catalog/boundary-contracts.md`; authority classes live in `modules/device-catalog/permissions.md`. Open questions, assumptions, and risks are in `modules/device-catalog/assumptions-open-questions.md`.

This is proposal-level architecture. PR-A is the conceptual foundation: what feature evidence is, who owns it, and how it relates to the rest of the platform. Validation behavior and workflow definitions live in the import/review workflow layer; API contracts and event surfaces live in the contracts/signals layer.

### Phase 1 scope reaffirmation

Per PR #86 and reaffirmed by PR-A:

- CIXCI System Admin CSV import is the only authoritative ingestion source for Device Catalog feature data in Phase 1.
- Manufacturer / distributor / API ingestion is future-facing only and is not enabled by PR-A.
- The Phase 1 CSV import does not become the final feature schema. The CSV is a transitional ingestion shape; the authoritative feature shape is defined by Feature Group, Feature Value, Device Capability Profile, and Device Feature Assignment per `data-model.md`.

### Concepts introduced

PR-A introduces five entity-level concepts and two concept-only declarations. All are owned by Device Catalog.

**Entity-level (full definitions in `data-model.md`):**

- **Feature Group** - A controlled category of device feature truth. Lifecycle-managed taxonomy entity. Examples: Connectivity, Charger Type, Storage Variant.
- **Feature Value** - A controlled value within a Feature Group. Lifecycle-managed taxonomy entity. Examples: USB-C, MagSafe, Bluetooth 5.3.
- **Device Capability Profile** - Per Device Type, the set of required, optional, unsupported, and review-required Feature Groups. Mirrors the Product Type Capability Profile pattern from Product Catalog PR #77.
- **Device Feature Assignment** - The authoritative assertion that a specific Device has a specific Feature Value within a specific Feature Group.
- **Device Capability Evidence** - The consolidated, consumer-facing view of feature evidence for a device. Derived from Device Feature Assignments and Device Capability Profile. Consumed by Product Catalog for compatibility filtering.

**Concepts later expanded by the import/review workflow layer:**

- **Compatibility Marker** - A transitional Phase 1 CSV ingestion artifact. Normalized into controlled feature evidence where possible; routed to Data Quality Exception where it cannot.
- **Data Quality Exception** - An architecture-level evidence category for feature data that requires human resolution (missing, stale, conflicting, incomplete, or unmappable).

### Where feature evidence lives

Feature evidence in Device Catalog is layered:

- **Taxonomy layer** - Feature Group and Feature Value define the controlled vocabulary. Lifecycle-managed by Feature Taxonomy Authority (CIXCI System Admin in Phase 1).
- **Profile layer** - Device Capability Profile declares applicability of Feature Groups per Device Type. Lifecycle-managed by Feature Taxonomy Authority.
- **Assignment layer** - Device Feature Assignment records the authoritative feature evidence for each Device. Managed by Device Feature Assignment / Correction Authority (CIXCI System Admin in Phase 1).
- **Consumption layer** - Device Capability Evidence is the derived read model exposed to consuming modules. Not independently editable.
- **Ingestion artifact layer** - Compatibility Marker is the transitional ingestion shape used by Phase 1 CSV import. Not feature truth; not consumed by Product Catalog as authoritative evidence.
- **Exception layer** - Data Quality Exception captures cases where the platform cannot produce or maintain authoritative feature evidence without human resolution.

The layering matters for boundary discipline: consuming modules read from the Consumption layer, not the Ingestion artifact layer; they consume Data Quality Exception references but do not own resolution.

### Relationship to consuming modules

**Product Catalog** consumes Device Capability Evidence and Device Feature Assignment evidence for accessory compatibility filtering. Product Catalog also consumes Buyer Device Portfolio References (per PR #86). The Device-Catalog side of this boundary is declared in `modules/device-catalog/boundary-contracts.md`. Product Catalog-side declarations may be maintained separately by Product Catalog work where applicable. Stated Device-Catalog-side independently: Product Catalog owns accessory compatibility assertions; Device Catalog owns device feature truth; Product Catalog consumes Device Catalog feature evidence and must not create, mutate, infer, or hard-code Device Catalog feature truth.

**Media Management** owns device image upload, processing, validation, storage, matching, renditions, and media audit (per PR #86). Device Catalog owns Device Image Readiness Reference (per PR #86) and does not duplicate or override Media Management asset authority.

**Buyer-facing UX** owns screen behavior, layout, filters, empty states, display behavior, and workflow UX/state for My Devices and any other buyer-visible surfaces (per PR #86). Device Catalog provides the feature evidence; Buyer-facing UX decides how it is displayed.

**Tenant Company** owns users, roles, `check_access`, and act-on-behalf authority. Device Catalog references Tenant Company `check_access` for authority decisions; it does not duplicate the authority model.

### What the foundation layer does NOT do

- Does not itself introduce validation behavior. "Unknown Feature Group rejected," "deprecated Feature Value used in active evidence routes to Data Quality Exception," and other validation rules are handled by the import/review workflow layer.
- Does not itself define Phase 1 CSV import behavior. CSV mapping, normalization workflow, pre-commit / post-commit discipline, header validation, and locked field protection are handled by the import/review workflow layer and by `modules/device-catalog/phase-1-csv-import.md`.
- Does not itself define API surfaces. Feature evidence lookup, capability evidence retrieval, taxonomy lookup, and data quality exception lookup are covered by the contracts/signals layer.
- Does not itself define event surfaces. Feature taxonomy events, device feature assignment change events, capability evidence update signals, and data-quality exception signals are covered by the contracts/signals layer.
- Does not modify Product Catalog files, Tenant Company files, downstream module specs, ADRs, platform standards, or runtime / schema / code / migration files.
- Does not define exact required Feature Groups per Device Type. PR-A defines the shape (Device Capability Profile); the content (which Feature Groups are required for phones, tablets, laptops, wearables, etc.) is a product / business decision deferred per PR-A OQ 1.

### Sequence within Device Catalog hardening

The merged Device Catalog hardening sequence is organized as three layers:

- **PR-A - Device Catalog - Feature Evidence Foundation.** Concepts, entities, ownership boundaries, permissions, open questions.
- **PR-B - Device Catalog - Feature Evidence Import and Review Workflow.** Phase 1 CSV feature-related import behavior, Compatibility Marker normalization workflow, Data Quality Exception lifecycle and resolution workflow, validation rules, test scenarios, edge cases.
- **PR-C - Device Catalog - Feature Evidence Contracts and Signals.** API contract placeholders, event names and event-contract notes, Product Catalog consumption references, compatibility-impacting device change signals.

The layers remain useful as documentation labels, but Device Catalog hardening is now represented as merged module documentation rather than pending PR work.

## Feature Evidence Import and Review Workflow (PR-B)

This section is the spec-level narrative for the Device Catalog Feature Evidence Import and Review Workflow introduced by PR-B. Entity-level definitions live in `modules/device-catalog/data-model.md`; workflow step sequences live in `modules/device-catalog/workflows.md`; CSV-specific column mapping rules live in `modules/device-catalog/phase-1-csv-import.md`; permissions live in `modules/device-catalog/permissions.md`; boundary discipline lives in `modules/device-catalog/boundary-contracts.md`. Open questions and risks are in `modules/device-catalog/assumptions-open-questions.md`. Lightweight review scenarios are in `modules/device-catalog/test-scenarios.md`; edge cases are in `modules/device-catalog/edge-cases.md`.

This is proposal-level architecture. PR-B does not introduce API contracts, OpenAPI schemas, event names, event payload contracts, transport semantics, idempotency / replay / retry behavior, or any runtime / database / migration / code changes. PR-B does not modify any Product Catalog file.

### What PR-B adds

PR-B is the workflow layer on top of PR-A. PR-A established what Device Catalog feature evidence is (entities, ownership boundaries, permissions); PR-B establishes how Phase 1 System Admin CSV import and review produces it.

Six interlocking workflows:

1. **Phase 1 CSV Import** - preview, validate, correct, confirm, commit. Captures raw Compatibility Markers from CSV cells; produces Suggested Normalizations during preview; commits only after explicit System Admin confirmation. Pre-commit events do not trigger downstream consumers per PR #78 / PR #81 discipline.
2. **Compatibility Marker normalization** - the bridge from raw ingestion artifact to feature truth. Suggested Normalizations are proposals; approval by a System Admin holding Device Feature Assignment / Correction Authority is what produces or updates Device Feature Assignment.
3. **Feature Value creation through import / review** - when an imported value has no matching Feature Value, the explicit System Admin action (gated on Feature Taxonomy Authority) for creating a new controlled Feature Value. New Feature Groups are exceptional and not part of this flow.
4. **Data Quality Exception lifecycle** - `created -> under_review -> (resolved | dismissed | unresolved)`, with `corrected` as auditable history rather than persistent lifecycle state.
5. **Device Capability Evidence regeneration** - post-commit derivation of the consumer-facing view from underlying assignments and Profile applicability. Failures route to Data Quality Exception; partial-success regenerations update what succeeded and flag what didn't.
6. **Compatibility-impacting review signal** - Device Catalog raises after Device Capability Evidence changes in a consumer-safety-affecting way; Product Catalog consumes read-only. Signal is one-way; Device Catalog does not mutate Product Catalog state.

PR-B also promotes two PR-A concept-only entities (Compatibility Marker, Data Quality Exception) to full entity definitions with shape and lifecycle, and introduces one new workflow-supporting entity (Suggested Normalization). One additional audit-grade record (Device Capability Evidence Regeneration) tracks regeneration attempts.

### The non-collapsible state chain

PR-B's core architecture rule, preserved from PR-A: the chain from raw CSV row through to Product Catalog accessory compatibility is architecturally non-collapsible. Each state is distinct:

- **Raw CSV row** - input.
- **Compatibility Marker** - Device Catalog ingestion artifact. Not feature truth. Not consumed by Product Catalog as compatibility evidence.
- **Suggested Normalization** - Device Catalog workflow proposal. Not feature truth. Not consumed by Product Catalog.
- **Device Feature Assignment** - Device Catalog feature truth. The first state in the chain that is feature truth.
- **Device Capability Evidence** - Device Catalog derived consumer-facing view of feature truth. Consumed by Product Catalog.
- **Product Catalog accessory compatibility assertion** - Product Catalog feature truth (independent of Device Catalog). Downstream interpretation; Device Catalog does not own or mutate.

These states are not interchangeable. A Suggested Normalization is not feature truth even if a marker has been proposed and the proposal is highly confident. Only an approved System Admin action transitions a Suggested Normalization to feature-truth-producing. PR-B's workflow definitions enforce this discipline at every gate.

### Where the workflows operate

PR-B's workflows operate within Device Catalog. They do not:

- Mutate Product Catalog state.
- Mutate Tenant Company state (Tenant Company `check_access` is consulted, not modified).
- Mutate Media Management state.
- Mutate Logs & Audit state (audit references are produced; the immutable record is Logs & Audit's).
- Create runtime code, database schema, or migration content.

PR-B's workflows do:

- Capture Compatibility Markers from CSV rows.
- Produce Suggested Normalizations.
- Promote approved Suggested Normalizations to Device Feature Assignments.
- Trigger Device Capability Evidence regeneration.
- Manage Data Quality Exception lifecycle.
- Raise the compatibility-impacting review signal at conceptual level (PR-C contracts the signal as an event).

### Phase 1 scope reaffirmation (preserved from PR-A)

- CIXCI System Admin CSV import remains the only authoritative ingestion source in Phase 1.
- Manufacturer / distributor / API ingestion remains future-facing only.
- AI-driven auto-approval of Suggested Normalizations is not enabled in Phase 1.
- Buyers cannot edit feature truth through any surface.
- Product Catalog cannot create / mutate Device Catalog feature taxonomy or assignments.

### Override Discipline

PR-B introduces a reusable Override Discipline (defined in `permissions.md`) for five cases where standard validation would block but a System Admin determines the action should proceed:

- Retired Feature Value override.
- Device Capability Profile mismatch override (assigning a Feature Value in an `unsupported` Feature Group for the Device's Device Type).
- Unresolved acceptance override (closing a Data Quality Exception as `unresolved`).
- Force-commit with warnings override (committing a CSV import despite warnings).
- Regeneration failure continuation override (continuing downstream signal evaluation despite a regeneration failure).

All override actions require: actor, reason, timestamp, affected entity / reference, before / after where applicable, audit reference. Validation fails when override evidence is missing - the override is rejected, not silently applied.

### Device Capability Profile applicability - conditional activation

PR-A established Device Capability Profile as a Device-Catalog-owned entity for declaring per-Device-Type applicability of Feature Groups (required / optional / unsupported / review-required). PR-A explicitly deferred *content* - the actual mapping of which Feature Groups are required for phones, tablets, wearables, etc. - to a product / business decision (PR-A OQ 1).

PR-B's applicability-driven validation rules (e.g., "Feature Value not valid for Device Capability Profile," "missing required Feature Group") are well-defined at the workflow / validation level but **activate only when Device Capability Profile content has been populated.** When Profile content does not exist for a Device Type, the applicability check returns "no applicable Profile rule" and the workflow proceeds without applicability gating. This is intentional: PR-B is not the right place to invent business content.

### What the import/review workflow layer does NOT do

- Does not itself introduce API contracts. Feature evidence lookup, taxonomy lookup, capability evidence retrieval, and data quality exception lookup are covered by the contracts/signals layer.
- Does not itself introduce event names. Feature taxonomy events, device feature assignment change events, capability evidence update signals, data-quality exception signals, and compatibility-impacting review signal events are covered by the contracts/signals layer.
- Does not itself introduce event payload contracts, transport semantics, broker decisions, idempotency / replay / retry behavior. Those are covered by the contracts/signals layer and Integration Management boundaries.
- Does not modify Product Catalog files. The Product-Catalog-side boundary (Product Catalog consumes feature evidence; does not mutate Device Catalog feature truth; owns accessory compatibility assertions) is stated in Device Catalog `boundary-contracts.md` independently and is expected to be declared symmetrically by Product Catalog's own boundary or validation work (in-flight Product Catalog Section 12 work / PR #85, where applicable).
- Does not modify any Tenant Company, Media Management, Logs & Audit, downstream module spec, ADR, platform standard, or runtime / code / schema / migration file.
- Does not invent Device Capability Profile content (PR-A OQ 1).
- Does not name "corrected" as a persistent Data Quality Exception lifecycle state. Corrections are recorded as auditable history during `under_review`.
- Does not enable AI-driven feature truth assertions. Suggested Normalizations may be produced by automated rules but require System Admin approval.

### Sequence within Device Catalog hardening

- **PR-A - Feature Evidence Foundation** (merged). Entities, ownership boundaries, permissions, open questions.
- **PR-B - Feature Evidence Import and Review Workflow** (merged). CSV import, normalization, Feature Value creation, exception lifecycle, evidence regeneration, compatibility-impacting review signal.
- **PR-C - Feature Evidence Contracts and Signals** (merged). API contract placeholders, event names and contract notes, Product Catalog consumption references, transport semantics for the compatibility-impacting review signal.

The contracts/signals layer references the foundation and import/review workflow layers.

## My Devices Portfolio Snapshot and Change Record Specification

This section specifies the Device Catalog side of the coordinated Product Catalog + Device Catalog Foundation that defines buyer-scoped accessory compatibility based on the buyer's My Devices portfolio. The Product Catalog side is specified in `modules/product-catalog/spec.md`. All existing Device Catalog baseline concepts (canonical Device records, Device References, Device Capability Evidence, existing Buyer Device Portfolio Reference, existing compatibility-impacting review signals, existing Product Catalog boundary language) are preserved without modification.

### Boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Hardened existing entity (1)

#### Buyer Device Portfolio Reference (HARDENED)

The existing Buyer Device Portfolio Reference entity is preserved by reference and HARDENED with explicit fields. Existing references continue to work; the new fields are additive.

Hardening additions:

- `active_flag` (REQUIRED; boolean; whether the buyer-device association is currently active).
- `change_source` (REQUIRED; one of: `buyer_action`, `admin_on_behalf`, `service_identity_sync`, `system_correction`; documents the origin of the most recent change).
- `last_change_timestamp` (REQUIRED).
- `current_portfolio_snapshot_reference` (REQUIRED; reference to the most recent Buyer Device Portfolio Snapshot for this buyer).

Existing fields (preserved): buyer-scope triad (`buyer_reference`, `company_scope_reference`, `buyer_entity_reference`); device_reference; existing audit / lifecycle fields per Device Catalog baseline.

### New primary entities (2)

#### Buyer Device Portfolio Snapshot

Frozen portfolio at a point in time. Referenced by Product Catalog projections (every Buyer-Scoped Compatibility Projection references one snapshot) and PR #104 Buyer Product Export Selection Snapshots (every Selection Snapshot references one snapshot via the projection).

Required scope: buyer-scope triad on every snapshot.

Carries:

- `buyer_device_portfolio_snapshot_id`.
- Buyer-scope triad: `buyer_reference`, `company_scope_reference`, `buyer_entity_reference`.
- `snapshot_timestamp`.
- `active_device_references` (the set of devices `active_flag = true` for this buyer at snapshot time).
- `inactive_device_references` (the set of devices `active_flag = false` at snapshot time; preserved for completeness / evidence).
- `superseded_device_references` (devices that have been superseded by successors; preserved for evidence).
- `excluded_device_reason_summary` (counts by exclusion reason).
- `prior_snapshot_reference` (nullable; preserves evidence chain).
- `snapshot_evidence_reference` (Logs & Audit Evidence Record reference; evidence kind: `buyer_device_portfolio_snapshot`).
- `audit_record_reference` (PR-A).

#### Buyer Device Portfolio Change Record

Append-only history of portfolio changes. One Change Record is produced per portfolio-affecting event; bulk imports produce ONE record per import.

Required scope: buyer-scope triad on every change record.

Carries:

- `buyer_device_portfolio_change_record_id`.
- Buyer-scope triad.
- `change_timestamp`.
- `change_type` (one of 8 values; the discriminator on the corresponding event payload).
- `prior_portfolio_snapshot_reference` (nullable for first-time / empty-prior cases).
- `new_portfolio_snapshot_reference` (REQUIRED).
- `affected_device_references` (the set of devices that changed in this record).
- `change_reason_reference` (optional structured reason).
- `actor_reference` OR `service_trigger_reference` (one populated; service-initiated changes use service_trigger_reference).
- `change_evidence_reference` (Logs & Audit Evidence Record reference; evidence kind: `buyer_device_portfolio_change`).
- `correlation_reference`, `trace_reference`.
- `audit_record_reference` (PR-A).

### `change_type` values (8)

| Value | Meaning |
|---|---|
| `device_added` | Buyer added a device to the portfolio. |
| `device_removed` | Buyer (or admin / service) removed a device from the portfolio. |
| `device_updated` | Existing device entry updated; compatibility-relevance determined by Device Catalog. |
| `device_deactivated` | Device entry deactivated; `active_flag = false`. Equivalent to remove for Product Catalog projection purposes. |
| `device_superseded` | Device replaced by a successor; both old and new referenced for evidence. |
| `device_reference_corrected` | Device reference corrected (e.g., wrong device variant assigned originally); both prior and corrected references recorded. |
| `bulk_portfolio_import` | Many devices changed at once; one Change Record covers the batch with referenced affected devices. |
| `admin_on_behalf_change` | Any of the above initiated by admin per Tenant Company act-on-behalf authority; `actor_reference` recorded. |

### Workflow / policy behavior only, NOT standalone records

- Device Catalog ingestion mechanics for bulk imports (existing baseline + `phase-1-csv-import.md` for CSV path; NOT modified here).
- Recalculation queue records, throttle records, retry records (Product Catalog workflow behaviors; not Device Catalog).
- Transport / sync retry records (Integration Management owns).
- Automatic Stop Selling record from device removal (NOT introduced; locked default; Product Catalog does not auto-transition Selling).

### My Devices add behavior (Device Catalog side)

When a buyer (or admin on-behalf, or service identity per Tenant Company authority) adds a device:

1. Device Catalog validates the device reference per existing baseline.
2. Device Catalog creates a Buyer Device Portfolio Change Record with `change_type = device_added` (or `admin_on_behalf_change` if admin-initiated and the additional discriminator approach is used; both records carry `actor_reference`).
3. Device Catalog creates a new Buyer Device Portfolio Snapshot reflecting the updated portfolio.
4. Buyer Device Portfolio Reference's `active_flag` set to true; `change_source` recorded; `last_change_timestamp` updated; `current_portfolio_snapshot_reference` updated.
5. Device Catalog emits `device-catalog.my-devices.portfolio-changed` with `change_type = device_added` discriminator and references to the prior + new snapshots.
6. Evidence Record emitted with evidence kind `buyer_device_portfolio_change` and `buyer_device_portfolio_snapshot`.
7. Product Catalog consumes the event and triggers projection recalculation per Workflow 4 of `modules/product-catalog/workflows.md`.

### My Devices remove behavior (Device Catalog side)

When a buyer (or admin on-behalf, or service identity per Tenant Company authority) removes a device:

1. Device Catalog validates the operation per existing baseline.
2. Device Catalog creates a Buyer Device Portfolio Change Record with `change_type = device_removed`.
3. Device Catalog creates a new Buyer Device Portfolio Snapshot reflecting the updated portfolio.
4. Buyer Device Portfolio Reference's `active_flag` set to false; `change_source` recorded; `last_change_timestamp` updated; `current_portfolio_snapshot_reference` updated.
5. Device Catalog emits `device-catalog.my-devices.portfolio-changed` with `change_type = device_removed` discriminator.
6. Evidence Records emitted.
7. Product Catalog consumes the event and triggers projection recalculation.
8. **Device Catalog does NOT decide commercial state.** Buyer Selling Status / Accessory Added preservation is governed by Product Catalog per existing PR #104 baseline.

### My Devices update / deactivate / supersede behavior (Device Catalog side)

When a buyer (or admin on-behalf, or service identity) updates / deactivates / supersedes a device, or when a device reference is corrected, or when many devices change at once:

1. Device Catalog validates per existing baseline.
2. Device Catalog creates a Buyer Device Portfolio Change Record with the appropriate `change_type` (`device_updated`, `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`).
3. Device Catalog creates a new Buyer Device Portfolio Snapshot.
4. Buyer Device Portfolio Reference updated.
5. For `device_updated`: Device Catalog determines whether the change is compatibility-relevant; the event is emitted regardless of compatibility-relevance, but Product Catalog may decide not to recalculate per Workflow 4 if the update is not compatibility-relevant.
6. Device Catalog emits `device-catalog.my-devices.portfolio-changed` with appropriate `change_type` discriminator.
7. Evidence Records emitted.
8. Product Catalog consumes the event and recalculates or routes to `projection_status = review_required` per Workflow 4.

### Empty My Devices state (Device Catalog side)

A buyer with no active devices has a VALID Buyer Device Portfolio Snapshot with empty `active_device_references` (possibly containing inactive / superseded references from prior portfolio state for evidence). The snapshot itself exists; Product Catalog produces a valid empty-portfolio projection per Workflow 11.

### Canonical Device record preservation

Canonical Device records and Device References remain Device-Catalog-owned and are NOT modified by this PR or by My Devices changes. The portfolio entities REFERENCE devices; they do NOT mutate device canonical data.

### Cross-buyer non-interference (Device Catalog side)

- Every Buyer Device Portfolio Snapshot, Buyer Device Portfolio Change Record, and Buyer Device Portfolio Reference carries the buyer-scope triad.
- Cross-buyer reads / mutations are architecturally impossible.
- Buyer 1's portfolio changes do NOT affect Buyer 2's portfolio.

### Compatibility-impacting review signals (existing baseline; preserved)

Device Catalog's existing compatibility-impacting review signals (vendor / device-side signals that may prompt downstream review) are preserved by reference. Such signals may trigger compatibility mapping changes in Product Catalog; Product Catalog handles those via its own existing event surface plus the new projection recalculation per Workflow 4.

### What this specification intentionally does NOT prescribe

- Concrete HTTP routes, request / response payload schemas, pagination cursors, authentication headers, error code catalogs.
- Concrete numeric portfolio snapshot retention / archival policy beyond existing PR-D evidence retention.
- Concrete UI / UX surfaces for portfolio change history.
- Concrete notification surface for portfolio changes (Notification Platform delivery; this PR emits intent via Product Catalog Workflow 14).
- Concrete admin-on-behalf consent requirement (open business decision; default per PR #103).
- Concrete bulk-import batching numerics.
- Concrete propagation latency for portfolio change events to Product Catalog (existing baseline; implementation).
- Accessory-to-accessory compatibility (future phase).
- Rename, removal, or rewrite of any existing Device Catalog or Product Catalog baseline content.
- Modifications to `modules/device-catalog/phase-1-csv-import.md` (out of scope).
- Modifications to `modules/device-catalog/openapi-contracts.md` (forbidden).
- Mutation of canonical Device records by Product Catalog.
- Decisions about accessory visibility, export eligibility, Add Accessory / Accessory Added state, Selling state, or compatibility projection (Product Catalog owns).
