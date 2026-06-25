# Product Catalog Boundary Contracts

This document is proposal-level architecture. It clarifies Product Catalog module boundaries without finalizing business rules or moving neighboring module responsibilities into Product Catalog.

`accessory-discovery-selection.md` is the normative Product Catalog sub-contract for accessory discovery, buyer selection, export confirmation, confirmation-line eligibility, export apply disposition, Latest Accessories baseline rules, Stop Selling, and System Admin buyer context behavior.

## What Product Catalog May Answer

- Which CIXCI platform product records exist for authorized vendor, buyer, tenant, parent, child entity, or system admin scope.
- Which vendor-submitted accessory facts were accepted by Product Catalog governance and what source/version supplied them.
- What Vendor Product Identity, Product Identifier, External Product Identifier, Identifier Namespace, and Vendor SKU Mapping records are attached to a product or variant.
- What Product Type, Product Type Profile reference, category, taxonomy, attributes, structured colors, normalized System Colors, and variant attributes apply.
- What Product Lifecycle State is recorded: Inactive, Active, End of Life, Archived, or Review Required placeholder.
- What Product Availability State is recorded: In Stock, Low Stock, Out of Stock, Backorder Available, or Temporarily Unavailable.
- What Availability Evidence Record supports catalog display or eligibility signals.
- What Release Date, Launch Date, launch eligibility evidence, EOL Date, EOL sell-through policy, archival reference, publication state, catalog visibility state, and buyer visibility scope are recorded.
- What EOL policy signal, catalog visibility disposition, catalog downloadability disposition, buyer selling status disposition, and downstream disposition references exist.
- What compatibility assertions to Device Catalog-owned Device References are recorded.
- What buyer accessory discovery context, selected device filter state, search/filter state, selection set, export confirmation, confirmation line, export apply disposition, export baseline, admin buyer context, and act-on-behalf request references exist.
- What buyer product activation/download/export records, export baseline records, last successful applicable buyer export timestamp, Buyer Product Relationship, and Buyer Selling Status are recorded.
- What product channel eligibility flags or scopes, including Retail eligibility, are accepted by Product Catalog governance.
- What product media/content attachment references and Media evidence references are accepted.
- What catalog-carried pricing inputs and Pricing Handoff References are attached to a product record.
- What Product Catalog events, notification-triggering events, integration/update signals, AI-ready signals, and Catalog Change Records exist.

## What Product Catalog Must Not Answer

- What canonical Device identity, normalization, lifecycle, launch/release facts, My Devices portfolio truth, or buyer-exportable device data is authoritative.
- What final buyer-specific price, discount, quote, exception, override, effective price, or pricing snapshot should apply.
- How media assets are stored, transformed, rendered, delivered, signed, cached, or approved by Media processing.
- Which notification recipients receive messages, which templates are used, or whether delivery succeeded.
- Whether an external buyer API, CSV, SFTP, webhook, headless storefront, or manual transport succeeded.
- Whether a PO is created, approved, submitted, accepted, received, or invoiced.
- Which Launch / Event Management record coordinates launch readiness or calendar state.
- Whether Pricing readiness, Media readiness, Tenant Company eligibility, channel eligibility, buyer account status, act-on-behalf authority, or Launch/Event readiness is true without source-owned evidence.
- Which route, vendor fulfillment path, warehouse, split, or routed suborder should be selected.
- Whether a shipment, return, replacement, invoice, warranty claim, payment, or accounting state changes.
- Whether downstream Order Routing, Procurement, Fulfillment/Returns, Invoice Management, buyer integration transport, or buyer storefront execution should proceed.
- Tenant hierarchy, relationship eligibility, region/channel eligibility, roles, permissions, readiness, or company configuration authority.
- Analytics metrics, dashboards, report definitions, or reporting read models.
- Logs & Audit immutable evidence records.
- AI recommendations, confidence scores, drafts, or action outcomes.
- Full inventory ledger, allocation, replenishment, or warehouse stock ownership unless a future ADR assigns it.

## Upstream Dependencies

- Accessory vendors for vendor-submitted accessory facts where accepted by Product Catalog governance.
- Device Catalog for canonical Device References, device facts, and buyer device portfolio / My Devices references where applicable.
- Tenant Company for buyer/vendor/manufacturer/company/entity scope, eligibility, roles, permissions, channel eligibility, activation/readiness, buyer account status, act-on-behalf authority, and company configuration inputs.
- Pricing for commercial interpretation, price calculation, pricing snapshots, buyer-specific prices, exceptions, overrides, and pricing readiness evidence.
- Media / Image Asset Management for media processing, storage, renditions, URL generation, media readiness, and mapping evidence.
- Launch / Event Management for launch readiness coordination and calendar references, while Product Catalog owns product lifecycle/release/launch facts.
- Integration Management for external delivery/receipt state, integration update disposition references, export delivery references, and catalog sync/update failure references.
- Logs & Audit for file/audit evidence.

## Downstream Consumers

- Pricing may consume catalog-carried pricing input handoff references and product/version metadata.
- Order Routing may consume Product Catalog product, lifecycle, availability, compatibility, EOL policy, stop-sell, buyer selling/export state, and channel eligibility references and records its own routability disposition.
- Fulfillment/Returns may consume product metadata, availability context, buyer selling/export state, and EOL policy signals and records its own operational disposition.
- Invoice Management may consume product references, historical traceability, and EOL policy signals and records its own invoice eligibility disposition.
- Procurement may consume product references and launch/EOL/availability signals for PO entry points and records its own PO allowance disposition.
- Notification Platform Service consumes notification-triggering events and owns delivery.
- Integration Management consumes update/export signals and owns delivery/transport evidence.
- Analytics consumes catalog events/snapshots and owns reporting models.
- AI Agent Services consumes AI-ready signals and owns recommendations.

## Boundary Risks

- Product Catalog could become a hidden Pricing engine if catalog-carried pricing inputs or buyer-facing price references are treated as calculated prices.
- Product Catalog could become a hidden Inventory context if availability input evidence becomes warehouse stock, allocation, replenishment, or inventory ledger ownership.
- Product Catalog could become a hidden Notification service if it owns recipients, templates, retries, or delivery status.
- Product Catalog could become a hidden Integration service if it owns external API, CSV, SFTP, webhook, headless storefront, or buyer system delivery evidence.
- Product Catalog could become a hidden Procurement module if Accessory Details PO entry points create or manage POs.
- Product Catalog could become a hidden Launch module if Release Date / Launch Date facts become calendar/readiness coordination ownership or if Product Catalog decides source readiness without source-owned evidence.
- Product Catalog could become a hidden Device Catalog if compatibility copies canonical device facts or mutates My Devices instead of referencing Device Catalog records.
- Product Catalog could become a hidden Tenant Company service if buyer visibility, buyer account status, buyer selling status, System Admin buyer context, or act-on-behalf behavior infers eligibility or permissions.
- Product Catalog could become a hidden Media platform if media attachment references become asset processing, URL, or rendition ownership.
- Product Catalog could become a hidden Order Routing, Fulfillment/Returns, Invoice, or storefront execution owner if EOL sell-through policy or buyer selling/export state is treated as direct operational enforcement instead of catalog evidence and signals.

## Boundary Rules

- Vendors are authoritative for vendor-submitted accessory facts where accepted by Product Catalog governance; Product Catalog owns the CIXCI platform product record and governance state.
- Product Catalog owns accessory discovery, selection, export confirmation, per-item export eligibility, export apply disposition, buyer relationship state, and Latest Accessories baseline rules.
- Device Catalog owns My Devices and canonical device references.
- Tenant Company owns buyer eligibility, buyer account status, permissions, act-on-behalf authority, and scope evidence.
- Product Catalog emits Product Catalog events/signals; Notification Platform Service owns delivery.
- Product Catalog emits update/export signals; Integration Management owns delivery/transport evidence.
- Product Catalog may reference Integration delivery pending/failed states but must not treat transport success as Product Catalog-owned truth.
- Logs & Audit owns immutable file/download/audit evidence.
- Product Catalog exposes Pricing-provided buyer-facing price/snapshot references where authorized; Pricing owns price interpretation and calculation.
- Product Catalog records availability evidence for catalog display and eligibility; future Inventory Management would own inventory ledger, allocation, warehouse stock, replenishment, or inventory execution if introduced.
- Product Catalog consumes source-owned launch/customer-facing readiness evidence; Pricing, Media, Tenant Company, Device Catalog, and Launch/Event Management own their respective readiness facts.
- Product Catalog owns catalog EOL lifecycle state, EOL Date, sell-through policy reference, catalog visibility/downloadability disposition, buyer-product catalog relationship disposition, and EOL policy signals.
- Product Catalog may block catalog downloads or buyer-product activation where Product Catalog rules allow.
- Order Routing, Procurement, Fulfillment/Returns, and Invoice Management own their own downstream operational dispositions based on consumed catalog evidence.
- Product Catalog owns Buyer Selling Status per buyer-product relationship; it does not overwrite vendor lifecycle or availability.
- Product Catalog owns compatibility assertions; Device Catalog owns Device References.
- Product Catalog owns final product-media attachment acceptance; Media owns processing and mapping evidence.
- Latest Accessories should advance from an applicable successful export baseline, not a timestamp alone.
- Accessory Added / Selling should advance only when Product Catalog export rules consider the export applicable and successfully applied.

## Open Questions

- Should detailed inventory become a future Inventory Management context?
- Which Release Date / Launch Date transitions are Product Catalog-owned versus Launch / Event Management-coordinated?
- Which source-owned readiness evidence is required by launch/customer-facing eligibility type?
- Which export baseline scopes are applicable for Latest Accessories?
- Which buyer-facing derived status values should be exposed in API/UI?
- Which buyer/product relationship decisions belong in Product Catalog versus a future buyer commerce module?
- Which sales channel flags are vendor-submitted product facts versus Tenant Company eligibility facts?
- Which accessory export confirmation-line blocker classifications are fatal versus warning-only by buyer/channel/Product Type?

## Buyer Product Export Job Foundation Boundary Contracts

This section reaffirms boundary discipline for the Buyer Product Export Job Foundation. All existing Product Catalog boundary contracts are preserved without modification. All adjacent module baselines (Logs & Audit PR-A through PR-E, Tenant Company PR #103, Integration Management, Device Catalog, Notification Platform, Analytics, Pricing, Order Routing, Procurement, Fulfillment, Invoice, Launch) are preserved by reference; no adjacent module file is modified.

### Core boundary wording (locked verbatim)

`Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.`

This wording appears verbatim in this section and in `spec.md`, `workflows.md`, `edge-cases.md`, and `test-scenarios.md`. It preserves Product Catalog's authority to record a failed Item status (or a successful one) AFTER receiving a dispatch reference outcome from Integration Management. Product Catalog does NOT own the transport itself, but it DOES own the consequent Item-status decision and the buyer-scoped activation / Accessory Added state transition.

### Product Catalog owns (under this Foundation)

- Buyer Product Export Job (orchestration parent entity).
- Buyer Product Export Item (item-level success / failure source of truth).
- Buyer Product Export Selection Snapshot (buyer-scoped frozen eligible product IDs at job creation).
- Buyer Product Export Batch (optional sub-structure for large Jobs).
- Buyer Product Export Job Status History (append-only).
- Buyer Product Export Result Summary (per-Job rollup).
- Buyer Product Export Error (per-Item / per-Job classifier; not standalone).
- Eligibility rules and Selection Snapshot semantics.
- Item state machine (14 Item statuses).
- Job state machine (14 Job statuses).
- **Activation decisions based on Integration Management dispatch references.**
- Buyer-specific activation / catalog mapping (buyer-scope triad enforced at data-model level).
- Add Accessory / Accessory Added state transitions.
- Product Catalog export evidence references (emitted via existing `service_identity.evidence_emit` pattern).
- The 6 new events documented in `events.md`.
- The 16 new workflows documented in `workflows.md`.
- Existing baseline preserved: Accessory Export Confirmation Record / Line, Buyer Product Export Record, Export Baseline Record, Buyer Product Relationship and Buyer Selling Status, Product Catalog Export Apply Disposition, Buyer Accessory Selection Set, Latest Accessories baseline, Sales Channel Eligibility, System Admin Buyer Context, all existing Product Catalog events and workflows.

### Product Catalog does NOT own

- Buyer API dispatch transport (Integration Management owns).
- Endpoint / authentication / transport failures (Integration Management owns).
- Transport retry mechanics (Integration Management owns).
- Delivery receipts (Integration Management owns).
- Provider failures (Integration Management owns).
- Dead-letter / quarantine (Integration Management owns).
- Transport evidence (Integration Management owns).
- **Transport outcomes** (Integration Management owns).
- Evidence Record / File Tracking Record persistence (Logs & Audit owns).
- File / audit evidence governance (Logs & Audit owns).
- Authority decisions (Tenant Company `check_access` owns).
- My Devices source records and Device References (Device Catalog owns).
- Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.
- Notification recipient resolution, templates, delivery, retry, suppression, history (Notification Platform owns).
- BI / reporting / dashboards / KPIs (Analytics owns).
- Pricing calculation behavior (Pricing owns).
- Order routing decisions (Order Routing owns).
- Purchase Order creation / lifecycle (Procurement owns).

### Integration Management boundary

Integration Management owns:

- Buyer API dispatch.
- Endpoint / authentication / transport failures.
- Transport retry.
- Delivery receipts.
- Provider failures.
- Dead-letter / quarantine.
- Transport evidence.
- Transport outcomes.

Product Catalog interaction with Integration Management:

- Product Catalog records an Integration dispatch reference per Item (and per Batch where applicable).
- Integration Management performs the dispatch and records the transport outcome.
- Product Catalog receives the dispatch reference outcome and DECIDES the resulting Item status (`activated`, `failed`, `retry_scheduled`, etc.) based on Product Catalog rules.
- Product Catalog emits `product-catalog.buyer-product-export-dispatch.reference-recorded` as a boundary event; this event does NOT mean Product Catalog owns the transport outcome.
- Integration Management does NOT make Item-status or activation decisions; Product Catalog does.
- Product Catalog does NOT modify any Integration Management file in this PR.

**Critical boundary wording:** Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.

### Logs & Audit boundary

Logs & Audit owns:

- Evidence Record (PR-A).
- File Tracking Record (PR-B).
- Evidence kinds emitted by Product Catalog under this Foundation: `buyer_product_export_item`, `buyer_product_export_baseline`, `buyer_product_export_batch`.
- File / audit evidence persistence, indexing, access governance (PR-D, PR-E).

Product Catalog interaction with Logs & Audit:

- Product Catalog emits evidence references only via existing `service_identity.evidence_emit` discipline.
- Logs & Audit indexes and governs.
- Product Catalog does NOT modify any Logs & Audit file in this PR.
- Product Catalog does NOT mutate Logs & Audit records.
- File artifacts (when generated) are referenced via Logs & Audit File Tracking; Product Catalog stores the reference, Logs & Audit owns the artifact.

### Tenant Company boundary

Tenant Company owns:

- `check_access` authority surface.
- Buyer / company / entity capability registry (existing baseline).
- Audit Capability Family Registry from PR #103 (NOT consumed by this PR for buyer product exports; see below).
- Scope / permission decisions.
- Lifecycle blocking (suspended / pending / inactive).

**Critical boundary lock:** Product Catalog must NOT use `audit_export.*` capabilities (the compliance audit report export capability family introduced in PR #103) for normal buyer product exports unless future Tenant / Product capability coordination explicitly says so. Buyer product exports use existing Tenant Company buyer / company / entity capability set; no new capabilities are required for this PR.

Product Catalog interaction with Tenant Company:

- Product Catalog calls `check_access` for buyer / company / entity authority per existing baseline pattern.
- Product Catalog respects lifecycle blocking returns.
- Product Catalog respects parent / child scope rules.
- Product Catalog respects service identity scope / expiration.
- Product Catalog does NOT modify any Tenant Company file in this PR.

### Device Catalog boundary

Device Catalog owns:

- My Devices source truth.
- Device References.
- Canonical Device records.
- Buyer Device Portfolio Reference.
- Buyer Device Portfolio Snapshot.
- Buyer Device Portfolio Change Record.

Product Catalog owns:

- Buyer-Scoped Compatibility Projection.
- Buyer Accessory Compatibility Impact Record.
- Accessory visibility and export eligibility decisions derived from buyer-scoped projection.
- Buyer catalog mapping compatibility impact.
- Add Accessory display impact.
- Selling compatibility impact review.

Product Catalog interaction with Device Catalog (under this Foundation):

- Selection Snapshot populates `compatibility_projection_reference_at_snapshot` through the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation.
- Product Catalog export Job must NOT assume global compatibility should be exported by default.
- Compatibility export is bounded by the buyer-scoped projection active at Job creation.
- My Devices add / remove / update / deactivate / supersede rules are defined by the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation.
- Product Catalog must not mutate Device Catalog canonical records or My Devices source records.
- Device Catalog must not decide accessory visibility or exportability.

### Notification Platform boundary

Notification Platform owns:

- Recipient resolution.
- Templates.
- Delivery.
- Retry.
- Suppression.
- Notification history.

Product Catalog interaction with Notification Platform (under this Foundation):

- Product Catalog emits notification intent ONLY via Workflow 16 (Buyer Notification Intent Triggering).
- Concrete notification surfaces (terminal Job status notification, item-failure notification, queued / throttled notification, file-ready notification, retry-available notification) are future Notification Platform coordination; out of scope this PR.
- Product Catalog does NOT modify any Notification Platform file in this PR.

### Analytics / Reporting boundary

Analytics / Reporting owns:

- BI, reporting, dashboards, KPIs.

Product Catalog interaction with Analytics (under this Foundation):

- Product Catalog export history must NOT become an analytics dashboard.
- Result Summary, Status History, and event stream are operational evidence; Analytics may consume via existing patterns, but this PR does NOT introduce analytics dashboards or BI surfaces.
- Product Catalog does NOT modify any Analytics file in this PR.

### Other module boundaries (preserved by reference; no edits)

- **Pricing:** existing boundary preserved. Pricing snapshot inclusion in export payload is a future open question; not introduced here.
- **Order Routing:** no direct interaction with the export job foundation in this PR; existing boundary preserved.
- **Procurement / Purchase Orders:** no direct interaction; existing boundary preserved.
- **Fulfillment / Returns:** no direct interaction; existing boundary preserved.
- **Invoice Management:** no direct interaction; existing boundary preserved.
- **Launch / Event Management:** no direct interaction; existing boundary preserved.

### Forbidden file modifications under this Foundation

- `modules/product-catalog/openapi-contracts.md`.
- All files under `modules/logs-audit-file-tracking/`.
- All files under `modules/tenant-company-model/`.
- All files under `modules/integration-management/`.
- All files under `modules/device-catalog/`.
- All files under `modules/notification-platform-service/`.
- All files under `modules/pricing/`.
- All files under `modules/analytics-reporting/`.
- All files under `modules/order-routing/`.
- All files under `modules/procurement-purchase-orders/`.
- All other module files.
- All ADRs, platform standards, runtime / code / schema / migration / build / lockfile.
- `modules/README.md`.

Reserved family slot directories `modules/ai-agent-services/` and `modules/warranty-registration/` do not exist on origin/main; do not create them.

### Critical boundary rules summary

- **Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes.**
- Tenant Company decides authority via `check_access`; Product Catalog calls and consumes.
- Logs & Audit records evidence; Product Catalog emits references via existing service_identity.evidence_emit.
- Integration Management dispatches transport and records outcomes; Product Catalog records dispatch references and makes consequent Item-status decisions.
- Device Catalog owns My Devices and (in future PR) buyer-scoped compatibility projection.
- Notification Platform owns delivery; Product Catalog emits notification intent only.
- Analytics owns BI; Product Catalog export history is NOT a BI dashboard.
- Buyer-specific activation is enforced at the data-model level via REQUIRED buyer-scope triad.
- Cross-buyer reads / mutations are architecturally impossible.
- Global compatibility export is FORBIDDEN by default; compatibility export is DEFERRED to the next PR's Buyer-Scoped Compatibility Projection.
- `audit_export.*` (compliance audit report export capabilities from PR #103) is NOT used for normal buyer product exports.
- Existing Buyer Product Export Record is preserved as the per-buyer-per-product completed-export record produced by successful Items.
- All existing Product Catalog baseline content is preserved without modification.
- All adjacent module baselines are preserved by reference; no adjacent module file is modified.

### Sequence positioning

This PR is the immediate next coordination step after PR #103 (Tenant Company Logs & Audit Access Roles / Capabilities, merged at origin/main). The next planned PRs after this one are:

1. **Buyer-Scoped Compatibility Projection** (Product Catalog or Device Catalog coordination; locks the `compatibility_projection_reference_at_snapshot` reserved field).
2. **My Devices Add / Remove Sync Rules** (Device Catalog; defines how Device Catalog portfolio changes propagate to in-flight Selection Snapshots and Items).
3. CPA / legal / DevOps retention duration review (locks concrete durations for Logs & Audit PR-D's 6 named retention policy references; can run in parallel; not blocking).
4. Source-module evidence-emission hardening PRs (per source module; can begin in parallel).
5. API Governance Foundation PR.
6. Product-Catalog-specific OpenAPI hardening PR.
7. Future UX / UI work for Add Accessory / bulk progress / cancel / retry / history surfaces.
8. Future Notification Platform coordination for export-coordination notifications.
9. AI Agent Services module + evidence PR + AI-specific surfaces (when module exists).
10. Warranty Registration module + evidence PR (when module exists).

## Buyer-Scoped Compatibility Projection Boundary Contracts

This section reaffirms boundary discipline for the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation (Product Catalog side). The Device Catalog side is documented in `modules/device-catalog/boundary-contracts.md`. All existing Product Catalog and Device Catalog boundary contracts are preserved without modification. All adjacent module baselines (Logs & Audit PR-A through PR-E, Tenant Company PR #103, Integration Management, Notification Platform, Analytics, Pricing, Order Routing, Fulfillment / Returns, Procurement, Invoice Management) are preserved by reference; no adjacent module file is modified.

### Core boundary wording (locked verbatim)

`Device Catalog owns the buyer's My Devices portfolio source records and portfolio change history; Product Catalog owns the buyer-scoped compatibility projection derived from that portfolio and the resulting accessory visibility, eligibility, and impact decisions.`

This wording appears verbatim in this section and in `spec.md`, `accessory-discovery-selection.md`, `workflows.md`, and in `modules/device-catalog/boundary-contracts.md`, `modules/device-catalog/spec.md`, `modules/device-catalog/workflows.md`.

### Product Catalog owns (under this Foundation)

- Buyer-Scoped Compatibility Projection (canonical buyer-scoped projection entity).
- Buyer Accessory Compatibility Impact Record (per-accessory consequence assessment).
- Buyer Accessory Visibility Projection (sub-structure).
- Buyer Compatibility Projection Status History (sub-structure).
- The 6 `projection_status` values: `current`, `stale`, `recalculating`, `failed`, `review_required`, `superseded`.
- The 7 `impact_state` values: `unaffected`, `no_longer_compatible`, `compatibility_restored`, `review_required`, `hidden_from_active_addable_list`, `compatibility_narrowed`, `compatibility_expanded`.
- The `compatibility_projection_reference_at_snapshot` binding on PR #104 Buyer Product Export Selection Snapshot.
- The `compatible_device_references_at_snapshot` addition on Selection Snapshot.
- The `compatibility_mismatch` value addition on PR #104 Buyer Product Export Error's `error_kind`.
- The 5 new fields on buyer catalog mapping / activation record.
- Buyer accessory visibility decisions.
- Buyer export eligibility decisions.
- Buyer catalog mapping compatibility impact recording.
- Add Accessory display impact (NOT the canonical PR #104 rule, which remains preserved; rather, the compatibility-eligibility gate AHEAD of the rule).
- Selling / Stop Selling compatibility-impact REVIEW state (NOT auto-transition).
- The 5 new Product Catalog events.
- The 12 of 15 numbered workflows that live in Product Catalog (workflows 4-15).
- Product Catalog projection / impact / Selection-Snapshot-binding evidence references (emitted via existing `service_identity.evidence_emit`).
- Existing PR #104 baseline preserved: Buyer Product Export Job, Buyer Product Export Item, Buyer Product Export Selection Snapshot, Buyer Product Export Batch, Job / Item / Batch Status History, Result Summary, Error sub-structure, the 6 PR #104 events, the 16 PR #104 workflows, the canonical Add Accessory / Accessory Added rule.
- Existing pre-PR-#104 baseline preserved: Accessory Export Confirmation Record / Line, Buyer Product Export Record, Export Baseline Record, Buyer Product Relationship and Buyer Selling Status, Latest Accessories baseline, Sales Channel Eligibility, System Admin Buyer Context, all existing events and workflows.

### Product Catalog does NOT own

- Canonical Device records (Device Catalog owns).
- Device References (Device Catalog owns).
- My Devices source records (Device Catalog owns).
- Buyer Device Portfolio Reference (Device Catalog owns; hardened in this PR but ownership remains in Device Catalog).
- Buyer Device Portfolio Snapshot (Device Catalog owns; new in this PR).
- Buyer Device Portfolio Change Record (Device Catalog owns; new in this PR).
- Device Capability Evidence (Device Catalog owns).
- Compatibility-impacting review signals (Device Catalog owns the signal; Product Catalog consumes via projection recalculation).
- The `device-catalog.my-devices.portfolio-changed` event (Device Catalog owns).
- Vendor-owned accessory compatibility facts (vendor-owned; read-only sources for projection).
- Transport / sync mechanics (Integration Management owns).
- Authority decisions (Tenant Company `check_access` owns).
- Notification recipient resolution, templates, delivery, retry, suppression, history (Notification Platform owns).
- BI / reporting / dashboards / KPIs (Analytics owns).

### Device Catalog boundary

Device Catalog owns:

- Canonical Device records.
- Device References.
- My Devices portfolio source records.
- Buyer Device Portfolio Reference (existing; hardened with `active_flag`, `change_source`, `last_change_timestamp`, `current_portfolio_snapshot_reference`).
- Buyer Device Portfolio Snapshot (new).
- Buyer Device Portfolio Change Record (new; with `change_type` discriminator covering 8 values).
- Device Capability Evidence.
- The single `device-catalog.my-devices.portfolio-changed` event.

Device Catalog does NOT decide:

- Accessory visibility for any buyer.
- Export eligibility for any buyer.
- Add Accessory / Accessory Added state.
- Selling / Stop Selling state.
- Buyer catalog mapping impact.
- The compatibility projection itself.
- Whether a buyer should be notified of compatibility impact.
- Whether an accessory should be auto-Stop-Sold (locked default: NO).

Product Catalog interaction with Device Catalog:

- Product Catalog REFERENCES Buyer Device Portfolio Snapshot in every Buyer-Scoped Compatibility Projection.
- Product Catalog REFERENCES Buyer Device Portfolio Change Record in every Buyer Accessory Compatibility Impact Record.
- Product Catalog CONSUMES `device-catalog.my-devices.portfolio-changed` to trigger projection recalculation (Workflow 4).
- Product Catalog does NOT mutate any Device Catalog record.
- Product Catalog does NOT emit Device Catalog events.

### Tenant Company boundary

Tenant Company owns:

- `check_access` authority surface (existing PR #103 baseline).
- Buyer / company / entity capability registry.
- Audit Capability Family Registry from PR #103 (NOT consumed by this PR; see below).
- Scope / permission decisions for: buyer-initiated projection refresh; admin-on-behalf impact acknowledgment; service-identity-initiated recalculation; System Admin Buyer Context projection view.
- Lifecycle blocking (suspended / pending / inactive).

**Critical boundary lock:** Product Catalog MUST NOT use `audit_export.*` (the compliance audit report export capability family introduced in PR #103) for projection / impact / compatibility actions unless future Tenant / Product capability coordination explicitly says so. Compatibility-related buyer-facing actions use existing Tenant Company buyer / company / entity capability set; no new capabilities are required for this PR.

Product Catalog interaction with Tenant Company:

- Product Catalog calls `check_access` for buyer / company / entity authority per existing baseline.
- Product Catalog respects lifecycle blocking returns.
- Product Catalog respects parent / child scope rules.
- Product Catalog respects service identity scope / expiration.
- Product Catalog does NOT modify any Tenant Company file in this PR.

### Logs & Audit boundary

Logs & Audit owns:

- Evidence Record (PR-A).
- File Tracking Record (PR-B; not applicable here as projection / impact do NOT produce file artifacts).
- 4 new evidence kinds emitted by Product Catalog + Device Catalog under this Foundation: `buyer_compatibility_projection`, `buyer_compatibility_impact`, `buyer_device_portfolio_snapshot`, `buyer_device_portfolio_change`.
- File / audit evidence persistence, indexing, access governance (PR-D, PR-E).

Product Catalog interaction with Logs & Audit:

- Product Catalog emits Evidence Record references only via existing `service_identity.evidence_emit` discipline.
- Logs & Audit indexes and governs.
- Product Catalog does NOT modify any Logs & Audit file in this PR.
- Product Catalog does NOT mutate Logs & Audit records.

### Integration Management boundary

Integration Management owns:

- External transport / sync.
- If portfolio changes arrive via external integration (e.g., a tenant pushes My Devices via API), the PR #104 dispatch reference + transport outcome boundary applies recursively.

Product Catalog interaction with Integration Management:

- Product Catalog does NOT directly interact with Integration Management for projection recalculation (recalculation is internal).
- If projection recalculation is initiated by an external trigger (e.g., compatibility mapping refresh from a vendor integration), Integration Management records the transport reference; Product Catalog records the consequent recalculation per Workflow 4.
- Product Catalog does NOT modify any Integration Management file in this PR.

### Notification Platform boundary

Notification Platform owns:

- Recipient resolution, templates, delivery, retry, suppression, notification history.

Product Catalog interaction with Notification Platform:

- Product Catalog emits notification intent ONLY via Workflow 14 (Notification Intent for Compatibility Impact).
- Concrete notification surfaces (impact-acknowledgment-required notification, projection-failed notification, recalculation-completed notification) are future Notification Platform coordination.
- Product Catalog does NOT modify any Notification Platform file in this PR.

### Analytics / Reporting boundary

Analytics / Reporting owns:

- BI, reporting, dashboards, KPIs.

Product Catalog interaction with Analytics:

- Product Catalog compatibility-impact history MUST NOT become an analytics dashboard surface in this PR.
- Result data, status history, and event stream are operational evidence; Analytics may consume via existing patterns, but this PR does NOT introduce analytics dashboards or BI surfaces.
- Product Catalog does NOT modify any Analytics file in this PR.

### Order Routing / Fulfillment / Returns / Invoice history boundary

These modules CONSUME Buyer Selling Status / Accessory Added state per existing baseline.

- These modules MUST NOT be mutated by compatibility changes.
- Orders placed before a portfolio change continue under existing baseline rules.
- Returns, invoices, and audit evidence for those orders are immutable historical records.
- Order Routing / Fulfillment / Returns / Procurement / Invoice Management files NOT modified by this PR.

### Other module boundaries (preserved by reference; no edits)

- **Pricing:** existing boundary preserved. Pricing snapshot inclusion in export payload remains a PR #104 open question; not affected by this PR.
- **Procurement / Purchase Orders:** no direct interaction; existing boundary preserved.
- **Launch / Event Management:** no direct interaction; existing boundary preserved.

### Forbidden file modifications under this Foundation

- `modules/product-catalog/openapi-contracts.md`.
- `modules/device-catalog/openapi-contracts.md`.
- `modules/device-catalog/phase-1-csv-import.md`.
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
- Tenant Company decides authority via `check_access`; Product Catalog calls and consumes.
- Logs & Audit records evidence; Product Catalog emits references via existing `service_identity.evidence_emit`.
- Integration Management dispatches transport; Product Catalog does not directly interact for projection recalculation.
- Notification Platform owns delivery; Product Catalog emits notification intent only.
- Analytics owns BI; projection / impact history is NOT a BI dashboard.
- Buyer-specific projection / impact records carry the buyer-scope triad at the data-model level.
- Cross-buyer reads / mutations are architecturally impossible.
- Global compatibility projection is FORBIDDEN; only buyer-scoped projections exist.
- `audit_export.*` is NOT used for projection / impact / compatibility actions.
- Automatic Stop Selling on device removal is FORBIDDEN; impact is flagged for review.
- Existing PR #104 baseline preserved without modification.
- Existing pre-PR-#104 Product Catalog and Device Catalog baselines preserved without modification.
- All adjacent module baselines preserved by reference; no adjacent module file is modified.

### Sequence positioning

This PR is the immediate next coordination step after PR #104 (merged at origin/main). The next planned PRs after this one are:

1. CPA / legal / DevOps retention duration review (parallel; locks concrete durations for Logs & Audit PR-D's 6 named retention policy references, with the 4 new evidence kinds added to the review).
2. Source-module evidence-emission hardening PRs (per source module).
3. API Governance Foundation PR.
4. Product-Catalog-specific OpenAPI hardening PR.
5. Device-Catalog-specific OpenAPI hardening PR.
6. Logs & Audit-specific OpenAPI hardening PR.
7. Future UX / UI work.
8. Future Notification Platform coordination.
9. Investigation Case Management module (if needed).
10. AI Agent Services module + evidence PR.
11. Warranty Registration module + evidence PR.
