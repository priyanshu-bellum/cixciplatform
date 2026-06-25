# Device Catalog Boundary Contracts

This document is proposal-level architecture. It clarifies Device Catalog boundaries without finalizing business rules or moving Product Catalog, Pricing, Order Routing, Fulfillment, Procurement, buyer-facing workflow, Media Management, or Tenant Company responsibilities into Device Catalog.

## What Device Catalog May Answer

- What canonical Device Master Records exist.
- What Device Reference identifies a canonical device record for downstream modules.
- What canonical device attributes are recorded, including manufacturer, brand, model, variant, identifier, alias, taxonomy, lifecycle, launch, release, and discontinued metadata.
- What Phase 1 System Admin-only CSV import job, validation, correction, log, or audit record produced a canonical device change.
- What source record, import batch, normalization, merge, split, supersession, or audit trail produced the current canonical device state.
- What Buyer Visibility Status is recorded for a device.
- What Device Image Readiness Reference is recorded for buyer visibility gating.
- What device data is buyer-visible or exportable for an authorized tenant, buyer, parent company, child entity, or relationship scope.
- What Buyer Device Portfolio References exist for an authorized scope.
- What external Device References may be used by future manufacturer purchase order workflows without deciding procurement behavior.

## What Device Catalog Must Not Answer

- Which accessory products exist or which accessory product records are active; Product Catalog owns accessory products.
- Whether an accessory is compatible with a device beyond exposing canonical device identity and attributes; Product Catalog owns accessory compatibility assertions unless a future Compatibility Authority is assigned.
- What compatibility score, ranking, approval, override, or dispute outcome should apply between an accessory product and a device.
- What final buyer-specific price, discount, margin, quote, or pricing override should apply.
- Which vendor, warehouse, route, split, or fulfillment path should be selected for an order.
- Whether a buyer is commercially approved outside Tenant Company eligibility, relationship, and readiness signals.
- Buyer workflow UX/state, task progress, buyer setup workflow, buyer-facing decision state, screen behavior, layout, filters, empty states, or display behavior.
- Device image upload, processing, validation, storage, matching, renditions, media audit, public image URL policy, image storage, transformation, CDN behavior, image rights, or full Media Management responsibilities.
- Manufacturer, distributor, or API ingestion as Phase 1 enabled workflows.
- Manufacturer purchase order workflow, purchase order approval, purchase order submission, purchase order status, invoice, payment, reconciliation, or procurement exception behavior.
- Shipment, return, inventory, or fulfillment execution state.

## Boundary Precedence Rules

These rules are proposal-level guardrails for conflict analysis. They do not finalize business behavior.

### Canonical Device vs Tenant-Scoped Usage

- Placeholder: canonical device identity and attributes should be platform-wide unless a future decision scopes specific fields by tenant.
- Buyer Device Portfolio References, export records, and export eligibility should remain tenant-scoped usage data and must not mutate canonical device identity.
- Placeholder: if tenant-scoped usage data conflicts with canonical device data, downstream consumers should treat the usage data as annotation or scope context, not a canonical correction.

### Phase 1 Import vs Future Import Capabilities

- Phase 1 CSV import is System Admin-only.
- Phase 1 CSV import supports Import New Devices and Update Existing Devices modes.
- Manufacturers, vendors, buyers, and external integrations must not be granted self-service import in Phase 1.
- Placeholder: future manufacturer, distributor, or API ingestion must be separately designed with source authority, approval, validation, and audit boundaries. These are not Phase 1 enabled workflows.

### System Status vs Buyer Visibility

- Phase 1 imported devices may have system status Active while Buyer Visibility Status remains Hidden.
- Future Launch Date devices remain Hidden by default unless System Admin marks them Visible.
- Buyer visibility does not bypass Tenant Company eligibility or buyer-facing module scope rules.

### Device Image Readiness vs Media Management Ownership

- Device Catalog owns the Device Image Readiness Reference used as a dependency for All Devices and My Devices visibility.
- Device Catalog should not own public image URL requirements in Phase 1.
- Media Management owns device image upload, processing, validation, storage, matching, renditions, media audit, public image URL policy, image storage, transformation, CDN behavior, image rights, and approval policy.

### Device Reference vs Compatibility Assertion

- Placeholder: Device Catalog may validate that a Device Reference exists, is active, retired, redirected, deprecated, or unresolved.
- Placeholder: Device Catalog should not decide whether an accessory product is compatible with the referenced device.
- Placeholder: Compatibility Markers can prepare future workflows but should not become final accessory compatibility assertions inside Device Catalog.
- Placeholder: compatibility disputes should remain in Product Catalog or a future Compatibility Authority.

### Device Reference vs Procurement Reference

- Placeholder: Device Catalog may provide stable external Device References for future purchase order line references.
- Placeholder: future Procurement / Purchase Orders owns PO creation, approval, submission, status, fulfillment dependency, invoice, and reconciliation workflows.
- Placeholder: procurement-specific manufacturer availability, quantity, cost, approval, or PO lifecycle state must not be stored as canonical device data.

### Global Events vs Tenant-Scoped Events

- Placeholder: global canonical device events should not carry buyer portfolio, export, relationship, or eligibility state.
- Placeholder: tenant-scoped export or portfolio events should not be consumed as canonical device source-of-truth events.
- Placeholder: consumers should request authorized lookups when event payloads intentionally redact sensitive tenant context.

## Upstream Dependencies

- Manufacturer, external feed, admin, or integration source data for device records.
- Phase 1 Device Import Page source update for System Admin-only CSV import rules.
- Media Management for device image upload, processing, validation, storage, matching, renditions, and media audit before Device Catalog records image readiness for buyer visibility.
- Tenant Company for tenant, company, parent/child entity, relationship eligibility, regional eligibility, role, permission, and buyer scope boundaries.
- Platform integration principles for future-facing manufacturer, distributor, or API ingestion placeholders, retry handling, audit logging, and API versioning outside Phase 1.
- Future Identity Resolution context if cross-domain identity canonicalization becomes broad enough to require a separate owner.
- Media Management for device media, transformations, rights, CDN behavior, matching, renditions, and media audit.

## Downstream Consumers

- Product Catalog may consume Device References, My Devices / Buyer Device Portfolio References, and Compatibility Markers for accessory compatibility filtering and workflow preparation, but owns accessory product records and compatibility assertions unless a future Compatibility Authority is assigned. Product Catalog must not own or mutate the buyer device portfolio.
- Pricing may consume device taxonomy, lifecycle, or Device References as context, but owns pricing interpretation and calculation.
- Order Routing may consume Device References for order-time validation context, but owns routing decisions.
- Fulfillment may consume device metadata references if needed, but owns fulfillment execution state.
- Analytics may consume device events and snapshots, but owns reporting models and rollups.
- Buyer-facing modules may consume buyer-visible/exportable device data, All Devices eligibility, My Devices eligibility, and Buyer Device Portfolio References, but own buyer workflow UX/state, screen behavior, layout, filters, empty states, and display behavior.
- Future Procurement / Purchase Orders may reference Device Catalog records for manufacturer device purchase orders, but owns procurement workflow if introduced.

## Boundary Risks

- Device Catalog could become a hidden Product Catalog if it starts managing accessory products, compatibility assertions, compatibility approvals, or compatibility dispute resolution.
- Device Catalog could leak into Tenant Company if buyer export eligibility becomes tenant hierarchy, relationship approval, or role ownership.
- Device Catalog could leak into buyer-facing modules if Buyer Device Portfolio References become workflow UX, task state, screen behavior, layout, filters, empty states, display behavior, or buyer decision state.
- Device Catalog could leak into Pricing if lifecycle, taxonomy, or manufacturer metadata starts determining final price or discounts.
- Device Catalog could leak into Order Routing if Device References start selecting vendors, warehouses, routes, or fulfillment paths.
- Device Catalog could leak into Procurement if future purchase order references become purchase order approval, submission, status, invoice, fulfillment dependency, or reconciliation workflows.
- Device Catalog could leak into Media Management if Device Image Readiness References become image upload, processing, validation, storage, matching, renditions, media audit, public image URL, transformation, CDN, or rights ownership.
- Canonical device records could leak tenant-specific portfolio or export state if shared platform data is not separated from tenant-scoped usage.

## Open Questions

- What is the canonical device granularity: model, variant, region/carrier variant, SKU, or another level?
- Which fields are manufacturer-owned, CIXCI-governed, buyer-editable, externally sourced, or shared/unresolved?
- Which buyer device export/download workflows are owned by Device Catalog versus buyer-facing modules?
- What shape, versioning, authorization, and audit evidence should Buyer Device Portfolio References carry now that Device Catalog owns the reference?
- When does compatibility mapping need a separate Compatibility Authority context?
- When does cross-domain canonicalization require a future Identity Resolution context?
- What Device Reference stability guarantees must Product Catalog, Pricing, Order Routing, Fulfillment, Analytics, and future Procurement receive?
- What Device Image Readiness Reference contract is required before devices appear in All Devices or My Devices?

## Feature Evidence Foundation Boundaries (PR-A)

This section declares the **Device-Catalog side** of the ownership and consumption boundaries for the Feature Evidence Foundation introduced by PR-A. Other modules' own constraints are declared in those modules' own boundary or validation files. Product Catalog-side declarations may be maintained separately by Product Catalog work where applicable. The Device-Catalog-side boundary is stated independently. If both sides are declared, the two declarations are symmetric but separately owned; drift between them is a future normalization concern.

### What Device Catalog owns

Device Catalog owns, in the Feature Evidence Foundation scope:

- **Feature Group** - controlled taxonomy of device feature categories. Creation, lifecycle, retirement, supersession, versioning, audit.
- **Feature Value** - controlled values within Feature Groups. Creation, lifecycle, retirement, supersession, versioning, audit.
- **Device Capability Profile** - by-Device-Type applicability of Feature Groups. Creation, lifecycle, versioning, audit. Content (which Feature Groups are required for which Device Types) is a product / business decision deferred per PR-A OQ 1, but ownership of the entity itself is Device Catalog.
- **Device Feature Assignment** - authoritative assertion that a Device has a Feature Value within a Feature Group. Creation, update, correction, supersession, withdrawal, audit.
- **Device Capability Evidence** - derived consumer-facing view of feature evidence per Device. Generation, regeneration, freshness state, audit.
- **Compatibility Marker** - transitional Phase 1 CSV ingestion artifact. Creation (via CSV import), retention, normalization routing, audit. Compatibility Marker is owned by Device Catalog even though it is not authoritative feature evidence. Its ownership prevents other modules from inventing parallel ingestion artifacts.
- **Data Quality Exception** - architecture-level category for feature data requiring human resolution. Creation, retention, and resolution authority are owned by Device Catalog, with lifecycle and resolution workflow defined by the import/review workflow layer.
- **Buyer Device Portfolio Reference** - per PR #86. Carried into PR-A scope for clarity; not modified by PR-A.
- **Device Image Readiness Reference** - per PR #86. Carried into PR-A scope for clarity; not modified by PR-A.

### What Device Catalog does NOT own

Device Catalog does not own, and must not assert authority over:

- **Accessory compatibility assertions** - owned by Product Catalog. Device Catalog provides feature evidence; Product Catalog interprets that evidence into accessory compatibility assertions. Device Catalog must not create, edit, infer, or hard-code accessory compatibility relationships.
- **Device image upload, processing, validation, storage, matching, renditions, media audit** - owned by Media Management per PR #86. Device Catalog references Media Management's media authority via Device Image Readiness Reference; Device Catalog does not duplicate or override media truth.
- **Users, roles, company / entity scope, `check_access`, act-on-behalf authority** - owned by Tenant Company. Device Catalog references `check_access` to determine whether a System Admin actor may perform a Feature Taxonomy Authority or Device Feature Assignment / Correction Authority action; Device Catalog does not duplicate the authority model or implement its own role hierarchy.
- **Buyer-facing UX behavior** - owned by Buyer-facing UX per PR #86. Screen behavior, layout, filters, empty states, display behavior, workflow UX/state for My Devices and other buyer-visible surfaces are not Device Catalog's. Device Catalog provides feature evidence; Buyer-facing UX decides how it is displayed.
- **Audit retention and immutable record** - owned by Logs & Audit. Device Catalog references audit identifiers for taxonomy and assignment changes; the immutable record itself is Logs & Audit's.
- **Pricing, order routing, fulfillment, invoice, payment, accounting** - owned by their respective modules. Device Catalog does not assert authority over any commercial or operational concern.
- **AI behavior, scoring, recommendation, explainability** - owned by AI Agent Services. Phase 1 does not include AI-assisted Device Catalog behavior; if it is added in a later phase, the boundary is the same - AI Agent Services owns AI behavior, Device Catalog owns feature evidence.

### What other modules must consume from Device Catalog rather than infer

To preserve single-source-of-truth discipline, the following data must be **consumed from Device Catalog** rather than inferred, hard-coded, or independently maintained by any other module:

- **Feature Group identity and lifecycle state** - Consuming modules must reference the canonical Feature Group record; they must not maintain parallel lists of feature categories.
- **Feature Value identity, lifecycle state, and parent Feature Group** - Consuming modules must reference the canonical Feature Value record; they must not maintain parallel lists of acceptable values.
- **Device Capability Profile applicability per Device Type** - Consuming modules must read the Profile; they must not encode their own required / optional / unsupported maps.
- **Device Feature Assignment current state** - Consuming modules must read the assignment record (where they consume it); they must not infer feature assignments from other Device fields.
- **Device Capability Evidence freshness and assignment status** - Consuming modules must respect the freshness state and assignment status surfaced by Device Catalog; they must not compute their own freshness or status independently.
- **Data Quality Exception references** - Consuming modules that need to know whether feature evidence is exception-flagged must read the exception reference from Device Catalog; they must not independently classify evidence as exception-worthy.
- **Compatibility Marker state** - Consuming modules must not read Compatibility Marker state as if it were authoritative evidence. Compatibility Marker is a Device-Catalog-internal ingestion artifact. The boundary discipline is: Device Catalog uses Compatibility Marker internally; Device Catalog exposes Device Feature Assignment and Device Capability Evidence externally.
- **Buyer Device Portfolio Reference** - Per PR #86. Consuming modules must reference Device Catalog's authoritative Portfolio; they must not maintain parallel buyer-side device lists.
- **Device Image Readiness Reference** - Per PR #86. Consuming modules must consume Device Catalog's readiness state for visibility gating; they must not infer image readiness from Media Management asset state directly.

### Phase 1 ingestion source restriction

Phase 1 Device Catalog ingestion is restricted to **CIXCI System Admin CSV import**. Other modules and other actors must not write feature evidence to Device Catalog:

- Manufacturer / distributor / API ingestion is future-facing only and is not enabled in Phase 1.
- Buyer-facing surfaces (including My Devices) must not edit feature truth. Buyers may view feature evidence and may select devices into their portfolio; buyers do not assert feature evidence.
- Product Catalog must not create, edit, or mutate Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, or Device Capability Evidence records.
- AI Agent Services (Phase 1 has no AI Device Catalog integration) must not bypass Feature Taxonomy Authority or Device Feature Assignment / Correction Authority.

This restriction is reaffirmed at the spec level in `spec.md` and enforced through the authority classes declared in `permissions.md`.

### Consumption pattern summary

For external (consuming) modules, the consumption pattern is:

- **Read:** Feature Group records, Feature Value records, Device Capability Profile records, Device Feature Assignment records (where appropriate scope applies), Device Capability Evidence records, Data Quality Exception references, Buyer Device Portfolio References, Device Image Readiness References.
- **Do not write:** Any of the above.
- **Do not infer:** Any of the above - consume from Device Catalog rather than reconstruct from other signals.
- **Do not duplicate:** Any of the above - do not maintain parallel state.

API surfaces for consumption (which records are exposed, in what shape, with what redaction class) are covered by the contracts/signals layer.

### Naming reservation

The name "Compatibility Marker" is reserved by Device Catalog as the Phase 1 CSV ingestion artifact term. Other modules must not introduce conflicting use of the term "Compatibility Marker" or use the same name for a different concept. If the name is revisited in a future PR (see PR-A OQ 8), Device Catalog will lead the renaming and consuming modules will follow.

## Feature Evidence Import and Review Workflow Boundaries (PR-B)

This section declares the **Device-Catalog side** of additional ownership and consumption boundaries introduced by PR-B's workflow surfaces. PR-A's boundaries (Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, Device Capability Evidence, Compatibility Marker as ingestion artifact, Data Quality Exception ownership) remain in force unchanged.

### Compatibility-impacting review signal - direction and ownership

The compatibility-impacting review signal is **owned by Device Catalog as a producer** and **consumed by Product Catalog read-only**. PR-B states the Device-Catalog side; Product-Catalog-side consumption discipline is expected to be declared by Product Catalog's own boundary or validation work (accepted / in-flight Product Catalog Section 12 boundary work / PR #85, where present).

Device-Catalog-side rules:

- Device Catalog raises the compatibility-impacting review signal after a successful or partial-success Device Capability Evidence regeneration where the regeneration changed feature evidence in a consumer-safety-affecting way (per `workflows.md` Workflow 6 consumer-safety rule).
- Device Catalog does not consult Product Catalog before raising the signal. Whether Product Catalog acts on a given signal occurrence is Product Catalog's decision; Device Catalog raises every consumer-safety-affecting signal.
- Device Catalog does not maintain a list of "Product-Catalog-filtered Feature Groups." The consumer-safety rule errs on the side of raising the signal when in doubt.
- Device Catalog does not directly mutate Product Catalog state in response to its own evidence changes. Specifically, Device Catalog does not:
  - Rewrite Product Catalog accessory compatibility mappings.
  - Modify Product Catalog buyer-visible accessory lists.
  - Set or clear Product Catalog newly compatible indicators.
  - Change Product Catalog blocked export / readiness states.
  - Mutate any Product Catalog record or state.
- The signal is one-way (Device Catalog -> Product Catalog). Product Catalog does not raise a return signal to Device Catalog. Product Catalog's downstream decisions are recorded in Product Catalog's own state, owned by Product Catalog.
- Where the signal transport fails (Product Catalog unavailable, broker offline, etc.), the transport-layer concern is owned by Integration Management (per PR-A boundary discipline). Device Catalog records the raise-attempt audit reference; reliable delivery is a transport / Integration Management concern, not a Device Catalog feature-truth concern.

### Data Quality Exception - consumption boundary

PR-A established Data Quality Exception as owned by Device Catalog and consumable read-only by Product Catalog. PR-B's full lifecycle (created -> under_review -> resolved | dismissed | unresolved) does not change that boundary:

- Device Catalog owns Data Quality Exception lifecycle. Resolution authority is Device Feature Assignment / Correction Authority (per PR-B `permissions.md` decision; no separate Resolution Authority class in Phase 1).
- Product Catalog may consume Data Quality Exception references as part of Device Capability Evidence consumption to decide whether to filter or surface the affected Device. Product Catalog does not transition Data Quality Exception state.
- Product Catalog does not initiate Data Quality Exception lifecycle actions (no resolve / dismiss / unresolve actions originate from Product Catalog).
- Reopening a Data Quality Exception is a System Admin action within Device Catalog; Product Catalog cannot reopen.

### Suggested Normalization - internal-only

Suggested Normalization is a workflow-supporting entity introduced by PR-B. It is **internal to Device Catalog**:

- Product Catalog does not consume Suggested Normalization. Product Catalog reads Device Feature Assignment and Device Capability Evidence (and may consume Data Quality Exception references), but not Suggested Normalization records.
- Other modules do not consume Suggested Normalization. It is a transient workflow artifact internal to Device Catalog's normalization queue.
- Suggested Normalization is not exposed externally even when produced by `automated_rule_proposal`. Whether an automation is producing suggestions is internal to Device Catalog's workflow; consumers see the result (an approved Device Feature Assignment) only.

### Override Discipline - internal-only

The Override Discipline pattern (per `permissions.md`) is internal to Device Catalog:

- Override audit references are produced by Device Catalog System Admin actions and consumed by Logs & Audit (per PR-A boundary discipline).
- Product Catalog does not consume override audit references. Where an override was applied (e.g., a retired Feature Value was assigned over the standard block), Product Catalog sees the resulting Device Feature Assignment and may see a Data Quality Exception reference; the override audit is internal.
- Other modules do not initiate Device Catalog overrides.

### Phase 1 ingestion source restriction - preserved

Per PR-A, Phase 1 Device Catalog ingestion is CIXCI System Admin CSV import only. PR-B reaffirms:

- Manufacturer / distributor / API ingestion is not enabled in Phase 1. The `assignment_source` values `manufacturer_api` and `distributor_api` (per `data-model.md` PR-A) are reserved and not produced by Phase 1 workflows.
- AI Agent Services does not auto-approve Suggested Normalizations in Phase 1. Where automation produces suggestions (`automated_rule_proposal`), System Admin approval is still required.
- Buyers do not create Compatibility Markers, Suggested Normalizations, Device Feature Assignments, or Data Quality Exceptions through any buyer-facing surface.
- Product Catalog does not create Compatibility Markers, Suggested Normalizations, Device Feature Assignments, Feature Groups, Feature Values, Device Capability Profiles, or Data Quality Exceptions.

### Cross-reference: where PR-B boundaries connect to other-module specs

- **Product Catalog** - PR-B's compatibility-impacting review signal is consumed by Product Catalog. Product-Catalog-side consumption discipline (idempotency on receive; redaction class respect; refusal to mutate Device Catalog state in response) is expected to be declared by Product Catalog's own boundary or validation work (in-flight Product Catalog Section 12 work / PR #85, where applicable). PR-B does not require Product Catalog files to be present on main.
- **Integration Management** - owns the transport for the compatibility-impacting review signal. PR-B does not contract transport semantics; PR-C will.
- **Logs & Audit** - owns the immutable record for all PR-B audit references (CSV import audit, override audit, normalization approval audit, Feature Value creation audit, Data Quality Exception state transition audit, regeneration audit, signal-raised audit). Device Catalog produces references; Logs & Audit owns retention.
- **Tenant Company** - consulted for `check_access` evaluation at every authority-gated action (Feature Taxonomy Authority for Feature Value creation; Device Feature Assignment / Correction Authority for normalization approval and exception transitions and override actions).
- **AI Agent Services** - not consulted in Phase 1 PR-B workflows. Reserved for future-phase enablement (e.g., AI-assisted Suggested Normalization proposal at a higher confidence threshold).

## My Devices Portfolio Boundary Contracts

This section reaffirms boundary discipline for the Device Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Product Catalog side is documented in `modules/product-catalog/boundary-contracts.md`. All existing Device Catalog and Product Catalog boundary contracts are preserved without modification. All adjacent module baselines are preserved by reference; no adjacent module file is modified.

### Core boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

This wording appears verbatim in this section, in `spec.md`, `workflows.md`, and in `modules/product-catalog/boundary-contracts.md`, `modules/product-catalog/spec.md`, `modules/product-catalog/accessory-discovery-selection.md`, `modules/product-catalog/workflows.md`.

### Device Catalog owns (under this Foundation)

- Canonical Device records (preserved).
- Device References (preserved).
- My Devices portfolio source records (canonical).
- Buyer Device Portfolio Reference (existing; hardened in this PR with `active_flag`, `change_source`, `last_change_timestamp`, `current_portfolio_snapshot_reference`).
- Buyer Device Portfolio Snapshot (new).
- Buyer Device Portfolio Change Record (new).
- The 8 `change_type` discriminator values: `device_added`, `device_removed`, `device_updated`, `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`, `admin_on_behalf_change`.
- Device Capability Evidence (preserved).
- Compatibility-impacting review signals (preserved; upstream signal for Product Catalog projection recalculation).
- The single new event `device-catalog.my-devices.portfolio-changed`.
- The 3 workflows in Device Catalog (workflows 1-3: My Devices Device Added; My Devices Device Removed; My Devices Device Updated / Deactivated / Superseded).
- Device Catalog portfolio snapshot / change record evidence references (emitted via existing `service_identity.evidence_emit`; 2 new evidence kinds: `buyer_device_portfolio_snapshot`, `buyer_device_portfolio_change`).
- Existing Device Catalog baseline preserved: canonical Device records, Device References, Device Capability Evidence, existing Buyer Device Portfolio Reference (now hardened additively), existing compatibility-impacting review signals, existing Product Catalog boundary language, `phase-1-csv-import.md` (unchanged; out of scope).

### Device Catalog does NOT own / does NOT decide

- Accessory visibility for any buyer (Product Catalog owns).
- Export eligibility for any buyer (Product Catalog owns).
- Add Accessory / Accessory Added state (Product Catalog owns; PR #104 canonical rule).
- Selling / Stop Selling state (Product Catalog owns).
- Buyer catalog mapping impact (Product Catalog owns).
- Buyer-Scoped Compatibility Projection (Product Catalog owns).
- Buyer Accessory Compatibility Impact Record (Product Catalog owns).
- Whether a buyer should be notified of compatibility impact (Product Catalog emits intent; Notification Platform owns delivery).
- Whether an accessory should be auto-Stop-Sold (locked default: NO; not in either module).
- Vendor-owned accessory compatibility facts (vendor-owned).
- Transport / sync mechanics (Integration Management owns).
- Authority decisions (Tenant Company `check_access` owns).
- Notification recipient resolution, templates, delivery (Notification Platform owns).
- BI / reporting / dashboards (Analytics owns).

### Product Catalog boundary (reciprocal)

Product Catalog owns:

- Buyer-Scoped Compatibility Projection (derived from Buyer Device Portfolio Snapshot).
- Buyer Accessory Compatibility Impact Record (per-accessory consequence assessment).
- Buyer Accessory Visibility Projection (sub-structure).
- Buyer Compatibility Projection Status History (sub-structure).
- The 6 `projection_status` values: `current`, `stale`, `recalculating`, `failed`, `review_required`, `superseded`.
- The 7 `impact_state` values: `unaffected`, `no_longer_compatible`, `compatibility_restored`, `review_required`, `hidden_from_active_addable_list`, `compatibility_narrowed`, `compatibility_expanded`.
- The `compatibility_projection_reference_at_snapshot` binding on PR #104 Buyer Product Export Selection Snapshot.
- The `compatible_device_references_at_snapshot` addition on Selection Snapshot.
- The `compatibility_mismatch` value on PR #104 Buyer Product Export Error `error_kind`.
- 5 new fields on buyer catalog mapping / activation record.
- The 5 new Product Catalog events.
- The 12 Product Catalog workflows (workflows 4-15).

Product Catalog does NOT mutate:

- Device Catalog canonical Device records.
- Device References.
- My Devices source records.
- Buyer Device Portfolio Reference.
- Buyer Device Portfolio Snapshot.
- Buyer Device Portfolio Change Record.
- Vendor-owned accessory compatibility facts.
- Historical Buyer Product Export Records (preserved per PR #104).
- Historical Logs & Audit Evidence Records or File Tracking Records.
- Order Routing, Fulfillment / Returns, Procurement, Invoice Management records.

Product Catalog interaction with Device Catalog (locked):

- Product Catalog REFERENCES Buyer Device Portfolio Snapshot in every Buyer-Scoped Compatibility Projection.
- Product Catalog REFERENCES Buyer Device Portfolio Change Record in every Buyer Accessory Compatibility Impact Record.
- Product Catalog CONSUMES `device-catalog.my-devices.portfolio-changed` to trigger projection recalculation.
- Product Catalog does NOT emit Device Catalog events.

### Tenant Company boundary

Tenant Company owns:

- `check_access` authority surface (existing PR #103 baseline).
- Buyer / company / entity capability registry.
- Audit Capability Family Registry from PR #103 (NOT consumed by this PR; see below).
- Scope / permission decisions for: buyer-initiated portfolio change; admin-on-behalf change; service-identity-initiated change.
- Lifecycle blocking (suspended / pending / inactive).

**Critical boundary lock:** Device Catalog MUST NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for My Devices portfolio actions unless future Tenant / Device capability coordination explicitly says so. My Devices portfolio actions use existing Tenant Company buyer / company / entity capability set; no new capabilities are required for this PR.

Device Catalog interaction with Tenant Company:

- Device Catalog calls `check_access` for buyer / company / entity authority per existing baseline.
- Device Catalog respects lifecycle blocking returns.
- Device Catalog respects parent / child scope rules.
- Device Catalog respects service identity scope / expiration.
- Device Catalog does NOT modify any Tenant Company file in this PR.

### Logs & Audit boundary

Logs & Audit owns:

- Evidence Record (PR-A).
- File Tracking Record (PR-B; not applicable here as portfolio snapshots / change records do NOT produce file artifacts in this PR; CSV bulk imports per `phase-1-csv-import.md` retain their existing file-tracking semantics where applicable).
- 2 new evidence kinds emitted by Device Catalog under this Foundation: `buyer_device_portfolio_snapshot`, `buyer_device_portfolio_change`. (Product Catalog emits an additional 2: `buyer_compatibility_projection`, `buyer_compatibility_impact`; 4 total.)
- File / audit evidence persistence, indexing, access governance (PR-D, PR-E).

Device Catalog interaction with Logs & Audit:

- Device Catalog emits Evidence Record references only via existing `service_identity.evidence_emit` discipline.
- Logs & Audit indexes and governs.
- Device Catalog does NOT modify any Logs & Audit file in this PR.
- Device Catalog does NOT mutate Logs & Audit records.

### Integration Management boundary

Integration Management owns:

- External transport / sync.
- If portfolio changes arrive via external integration (e.g., a tenant pushes My Devices via API integration; vendor-side sync), the PR #104 dispatch reference + transport outcome boundary applies recursively.
- Bulk portfolio imports MAY be delivered via Integration Management or via the CSV path (`phase-1-csv-import.md`); both paths produce the same Buyer Device Portfolio Change Record at `change_type = bulk_portfolio_import`.

Device Catalog interaction with Integration Management:

- Device Catalog records the portfolio change regardless of how it arrived; transport mechanics are Integration Management's responsibility.
- Device Catalog does NOT modify any Integration Management file in this PR.

### Notification Platform boundary

Notification Platform owns:

- Recipient resolution, templates, delivery, retry, suppression, notification history.

Device Catalog interaction with Notification Platform:

- Device Catalog does NOT emit notification intent directly in this PR. Product Catalog emits compatibility-impact notification intent per Product Catalog Workflow 14.
- If future Device Catalog notification surfaces (e.g., portfolio-change-confirmation notifications) are needed: future Notification Platform coordination.
- Device Catalog does NOT modify any Notification Platform file in this PR.

### Analytics / Reporting boundary

Analytics / Reporting owns:

- BI, reporting, dashboards, KPIs.

Device Catalog interaction with Analytics:

- Portfolio change history is operational evidence; Analytics may consume via existing patterns, but this PR does NOT introduce analytics dashboards or BI surfaces.
- Device Catalog does NOT modify any Analytics file in this PR.

### Order Routing / Fulfillment / Returns / Invoice history boundary

These modules CONSUME Buyer Selling Status / Accessory Added state per existing baseline (Product Catalog owns those).

- These modules MUST NOT be mutated by My Devices changes or compatibility changes.
- Orders placed before a portfolio change continue under existing baseline rules.
- Returns, invoices, and audit evidence for those orders are immutable historical records.
- Order Routing / Fulfillment / Returns / Procurement / Invoice Management files NOT modified by this PR.

### Other module boundaries (preserved by reference; no edits)

- **Pricing:** existing boundary preserved.
- **Procurement / Purchase Orders:** no direct interaction; existing boundary preserved.
- **Launch / Event Management:** no direct interaction; existing boundary preserved.

### Forbidden file modifications under this Foundation

- `modules/device-catalog/openapi-contracts.md`.
- `modules/device-catalog/phase-1-csv-import.md`.
- `modules/product-catalog/openapi-contracts.md`.
- All files under `modules/logs-audit-file-tracking/`.
- All files under `modules/tenant-company-model/`.
- All files under `modules/integration-management/`.
- All files under `modules/notification-platform-service/`.
- All files under `modules/pricing/`.
- All files under `modules/analytics-reporting/`.
- All files under `modules/order-routing/`.
- All files under `modules/fulfillment-returns/`.
- All files under `modules/procurement-purchase-orders/`.
- All files under `modules/invoice-management/`.
- All other module files.
- All ADRs, platform standards, runtime / code / schema / migration / build / lockfile.
- `modules/README.md`.

### Critical boundary rules summary

- **Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.**
- Tenant Company decides authority via `check_access`; Device Catalog calls and consumes.
- Logs & Audit records evidence; Device Catalog emits references via existing `service_identity.evidence_emit`.
- Integration Management dispatches transport; Device Catalog records the change regardless of transport.
- Notification Platform owns delivery; Device Catalog does not directly emit notification intent in this PR.
- Analytics owns BI; portfolio change history is NOT a BI dashboard.
- Buyer-specific portfolio / snapshot / change records carry the buyer-scope triad at the data-model level.
- Cross-buyer reads / mutations are architecturally impossible.
- `audit_export.*` is NOT used for portfolio actions.
- Automatic Stop Selling on device removal is FORBIDDEN; impact is flagged for review by Product Catalog (Device Catalog does NOT decide commercial state).
- Canonical Device records are NEVER mutated by My Devices changes or by Product Catalog.
- Existing PR #104 baseline preserved (Product Catalog side).
- Existing pre-PR-#104 Device Catalog and Product Catalog baselines preserved.
- All adjacent module baselines preserved by reference; no adjacent module file is modified.

### Sequence positioning

This PR is the immediate next coordination step after PR #104 (merged at origin/main). The next planned PRs after this one are documented in `modules/product-catalog/boundary-contracts.md` Sequence positioning section.
