# Device Catalog Module

Initial architecture draft for the Device Catalog bounded context.

This module aligns with ADR-0004, which splits Device Catalog from Product Catalog, and with ADR-0003 as amended by ADR-0004. It is proposal-level architecture for review, not final implementation design or finalized business rules.

## Focus Areas

- Canonical device master records
- Manufacturer, brand, model, and variant hierarchy
- Device identifiers, aliases, normalization, and deduplication
- Device lifecycle status, launch, release, and discontinued dates
- Device taxonomy such as phone, tablet, smartwatch, and future categories
- Buyer-visible and exportable device data
- Buyer Device Portfolio References owned by Device Catalog
- Device Image Readiness References owned by Device Catalog for visibility gating
- Device import and export workflows
- Phase 1 System Admin-only CSV device import rules
- Future-facing manufacturer, distributor, and API ingestion placeholders outside Phase 1 scope
- Manufacturer source data and enrichment tracking
- Device change events and event contracts
- Boundaries with Product Catalog compatibility references
- Boundaries with Tenant Company eligibility and buyer scope
- Boundaries with buyer-facing UX for screen behavior, layout, filters, empty states, and display behavior
- Boundaries with Media Management for device image upload, processing, validation, storage, matching, renditions, and media audit
- Future manufacturer purchase order references without procurement workflow ownership

- Feature Evidence Foundation (PR-A) - Feature Group, Feature Value, Device Capability Profile, Device Feature Assignment, Device Capability Evidence as Device-Catalog-owned entities; Compatibility Marker as a transitional Phase 1 CSV ingestion artifact; Data Quality Exception as a concept-level evidence category for human resolution; ownership boundaries with Product Catalog, Media Management, Buyer-facing UX, and Tenant Company; two-class permissions model separating taxonomy authority from assignment authority
- Feature Evidence Import and Review Workflow (PR-B) - Phase 1 CSV import preview/correct/confirm/commit discipline; Compatibility Marker normalization workflow (proposed -> approved); controlled Feature Value creation gated on Feature Taxonomy Authority; Data Quality Exception lifecycle (created -> under_review -> resolved/dismissed/unresolved, with corrected as auditable history); Device Capability Evidence regeneration with success/failure/partial_success outcomes; compatibility-impacting review signal raised one-way to Product Catalog; reusable Override Discipline covering five named cases with identical evidence requirements
- Feature Evidence Contracts and Signals (PR-C) - 20 additive event names across five families (Feature Taxonomy Lifecycle, Device Feature Assignment Changes, Device Capability Evidence Regeneration, Data Quality Exception Lifecycle, Compatibility-Impacting Review Signal); reference-first event payloads with internal redaction class; read-only API contract placeholders for taxonomy lookup, capability evidence retrieval, assignment lookup, exception lookup, and review signal read model; consumer responsibilities including idempotency, reference-callback, version handling, and no write-back to Device Catalog; compatibility-impacting review signal is one-way with advisory consumer_action_hint, not a Product Catalog command; acknowledgement is transport-layer only

## Module Files

- `spec.md`
- `data-model.md`
- `api-contracts.md`
- `openapi-contracts.md`
- `events.md`
- `event-contracts.md`
- `boundary-contracts.md`
- `permissions.md`
- `workflows.md`
- `phase-1-csv-import.md`
- `edge-cases.md`
- `test-scenarios.md`
- `assumptions-open-questions.md`

## My Devices Sync Rules Scope

This section documents Device Catalog's role in the coordinated Product Catalog + Device Catalog work that defines how CIXCI determines buyer-scoped accessory compatibility based on the buyer's My Devices portfolio, and how Product Catalog reacts when devices are added, removed, updated, deactivated, superseded, or otherwise changed in My Devices. The Product Catalog side is documented in `modules/product-catalog/README.md`.

### What this Foundation delivers (Device Catalog side)

- **2 new primary entities:** Buyer Device Portfolio Snapshot (frozen portfolio at a point in time; referenced by Product Catalog projections and PR #104 Selection Snapshots); Buyer Device Portfolio Change Record (append-only history of portfolio changes with `change_type` discriminator).
- **1 hardened existing entity:** Buyer Device Portfolio Reference (hardened with `active_flag`, `change_source`, `last_change_timestamp`, `current_portfolio_snapshot_reference`).
- **8 `change_type` discriminator values:** `device_added`, `device_removed`, `device_updated`, `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`, `admin_on_behalf_change`.
- **1 new Device Catalog event:** `device-catalog.my-devices.portfolio-changed` (discriminator: `change_type`).
- **3 of the 15 numbered workflows** sit in Device Catalog (workflows 1-3): My Devices Device Added; My Devices Device Removed; My Devices Device Updated / Deactivated / Superseded. The remaining 12 sit in Product Catalog (workflows 4-15).
- **2 new evidence kinds** emitted by Device Catalog: `buyer_device_portfolio_snapshot`, `buyer_device_portfolio_change` (additional 2 evidence kinds emitted by Product Catalog: `buyer_compatibility_projection`, `buyer_compatibility_impact`; 4 total).

### Core boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

### Boundary discipline reaffirmed

- **Device Catalog owns** canonical Device records (preserved), Device References (preserved), My Devices portfolio source records (canonical), Buyer Device Portfolio Reference (existing; hardened), Buyer Device Portfolio Snapshot (new), Buyer Device Portfolio Change Record (new), Device Capability Evidence (preserved), device / reference changes, compatibility-impacting review signals (the upstream signal that may prompt projection recalculation), the single `device-catalog.my-devices.portfolio-changed` event.
- **Device Catalog does NOT decide** accessory visibility for any buyer; export eligibility for any buyer; Add Accessory / Accessory Added state; Selling / Stop Selling state; buyer catalog mapping impact; the compatibility projection itself; whether a buyer should be notified of compatibility impact; whether an accessory should be auto-Stop-Sold (locked default: NO).
- **Product Catalog owns** Buyer-Scoped Compatibility Projection (consumes Buyer Device Portfolio Snapshot); Buyer Accessory Compatibility Impact Record; the 5 new Product Catalog events; the 12 Product Catalog workflows (4-15).
- **Product Catalog does NOT mutate** Device Catalog canonical Device records, Device References, My Devices source records, vendor-owned accessory source facts, historical Buyer Product Export Records, historical Logs & Audit Evidence Records or File Tracking Records, Order Routing / Fulfillment / Returns / Procurement / Invoice Management records.
- **Tenant Company owns** `check_access`, authority, lifecycle blocking (existing PR #103 baseline). NO new tenant capabilities; `audit_export.*` NOT used.
- **Logs & Audit owns** Evidence Record, File Tracking Record, evidence governance. 4 new evidence kinds emitted via existing `service_identity.evidence_emit`. No Logs & Audit file modified.
- **Integration Management** owns external transport / sync. If portfolio changes arrive via external integration, PR #104 dispatch + transport boundary applies recursively.
- **Notification Platform** owns delivery; Product Catalog emits notification intent only.
- **Analytics** owns BI / reporting; portfolio change / impact history is NOT a BI dashboard.
- **Order Routing / Fulfillment / Returns / Invoice history** MUST NOT be mutated by My Devices or compatibility changes.

### What this Foundation intentionally does NOT do

- No modifications to `modules/device-catalog/openapi-contracts.md`.
- No modifications to `modules/device-catalog/phase-1-csv-import.md`.
- No modifications to `modules/product-catalog/openapi-contracts.md`.
- No modifications to any Logs & Audit, Tenant Company, Integration Management, Notification Platform, Pricing, Analytics, Order Routing, Fulfillment / Returns, Procurement, or Invoice Management file.
- No rename, deprecation, or replacement of any existing Device Catalog or Product Catalog entity, event, workflow, or rule.
- No Device Catalog decision about accessory visibility, export eligibility, Add Accessory / Accessory Added state, Selling state, or compatibility projection.
- **No automatic Stop Selling on device removal.** Locked default; Product Catalog flags impact via Buyer Accessory Compatibility Impact Record.
- No mutation of canonical Device records by Product Catalog.
- No mutation of vendor-owned accessory compatibility facts.
- No mutation of historical Buyer Product Export Records.
- No new Tenant Company capabilities, role bundles, or service identity profiles.
- No new Logs & Audit entities.
- No concrete HTTP routes, request / response payload schemas, pagination, authentication headers, or error code catalogs.
- No concrete UI / UX design.
- No numeric stale-projection tolerance values, recalculation throttling values, batch dedupe windows, or notification frequency values.
- No standalone Buyer Compatibility Recalculation Job / Item / Throttle / Retry / Cancellation records (Product Catalog workflow / policy behaviors).
- No transport / sync retry records (Integration Management owns).
- No event explosion: change types are observable via `change_type` discriminator on the single new Device Catalog event.

### Sequence positioning

This PR is the immediate next coordination step after PR #104 (merged at origin/main). It populates the `compatibility_projection_reference_at_snapshot` field that PR #104 reserved (Product Catalog side) and provides the Buyer Device Portfolio Snapshot reference target that the field requires.

### Application discipline

This coordination is additive documentation-and-architecture across 25 target files (13 Product Catalog + 12 Device Catalog). Existing Device Catalog baseline, existing Product Catalog baseline, PR #103 content, PR #104 content, and Logs & Audit PR-A through PR-E content are preserved by reference without modification. See `APPLY.md` in the PR bundle for tool-agnostic application instructions, the explicit STOP-before-`git add` / staging / commit / push / PR rule, and prohibitive-only references to destructive commands.
