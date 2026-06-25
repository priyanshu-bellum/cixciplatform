# Assumptions / Open Questions

## Assumptions

- Product Catalog aligns with ADR-0007 and remains accessory-first while supporting controlled Product Type, attribute, variant, and category validation extensibility.
- Accessory vendors are authoritative for vendor-submitted accessory facts where accepted by Product Catalog governance.
- Product Catalog owns the CIXCI platform product record, validation state, lifecycle state, publication/visibility state, buyer relationship state, distribution/export records, compatibility assertions, catalog-carried pricing input records, media/content attachment references, import processing records, and catalog change history.
- Product Catalog owns accessory discovery, selection, export confirmation, per-item export eligibility, export apply disposition, buyer relationship state, and Latest Accessories baseline rules as detailed in `accessory-discovery-selection.md`.
- Product Catalog validates, normalizes, governs, versions, and distributes accepted product data.
- Product Catalog records catalog-carried pricing inputs; Pricing owns commercial interpretation, calculation, buyer-specific prices, exceptions, overrides, snapshots, and pricing audit.
- Product Catalog references Device Catalog-owned Device References and consumes buyer device portfolio / My Devices references where applicable; Device Catalog owns canonical device facts and My Devices source references.
- Product Catalog owns product-media attachment acceptance; Media / Image Asset Management owns asset processing, storage, transformations, renditions, URL generation, access policy, and mapping evidence.
- Product Catalog emits notification-triggering events; Notification Platform Service owns delivery.
- Product Catalog emits integration/export/update signals; Integration Management owns delivery/transport evidence.
- Product Catalog may represent delivery pending/failed by reference to Integration evidence, but it does not own external delivery truth.
- Product Catalog may expose PO action entry points; Procurement owns PO creation and PO lifecycle.
- Launch / Event Management coordinates launch readiness and calendar events; Product Catalog owns product lifecycle, visibility, release date, launch date, and product facts.
- Product Catalog consumes source-owned launch/customer-facing readiness evidence and must not independently decide Pricing readiness, Media readiness, Tenant Company eligibility, channel eligibility, or Launch/Event readiness.
- Product Catalog owns catalog EOL lifecycle state, EOL Date, sell-through policy reference, catalog visibility/downloadability disposition, buyer-product catalog disposition, and EOL policy signals; downstream modules own their own operational disposition.
- Product Catalog owns Buyer Selling Status per buyer-product relationship; Tenant Company owns eligibility, buyer account status, permissions, act-on-behalf authority, and company configuration inputs.
- Product Catalog imports/exports should follow `architecture/standards/import-export-validation-governance.md`.

## Scale Assumptions

These assumptions are placeholders for pressure-testing architecture choices.

### Product And Variant Volume

- Placeholder: expected product master, product, and variant counts per vendor.
- Placeholder: expected variant counts by color, size, material, packaging, model, SKU, UPC, availability, price input, and compatibility differences.
- Placeholder: expected structured color assignment and normalization volume.

### Lifecycle / Availability Volume

- Placeholder: expected lifecycle changes per vendor and per import batch.
- Placeholder: expected availability update volume for In Stock, Low Stock, Out of Stock, Backorder Available, and Temporarily Unavailable states.
- Placeholder: expected availability evidence volume, stale evidence rate, expiration/recheck frequency, and review queue volume.
- Placeholder: expected low-stock threshold count and churn.
- Placeholder: expected EOL policy signal, downstream disposition reference, and archival records per month.

### Release / Launch / EOL Timing

- Placeholder: expected Release Date and Launch Date volume.
- Placeholder: expected launch eligibility evidence volume and source readiness recheck frequency.
- Placeholder: expected conflicts with Launch / Event Management records.
- Placeholder: expected EOL approaching/reached notification and integration fanout.

### Compatibility Volume

- Placeholder: expected compatibility mappings per product and variant.
- Placeholder: expected Add, Replace, and Selective Remove import volume.
- Placeholder: expected buyer device portfolio impact evaluation volume.

### Buyer Relationship And Export Volume

- Placeholder: expected buyer-product relationships.
- Placeholder: expected Buyer Selling Status change volume.
- Placeholder: expected accessory discovery search/filter volume.
- Placeholder: expected accessory selection set and export confirmation volume.
- Placeholder: expected export confirmation line volume and line-level recheck frequency.
- Placeholder: expected product export/download frequency per buyer.
- Placeholder: Latest Accessories query volume, export baseline volume, and baseline advancement/revocation/supersession cardinality.

### Notification / Integration / Event Volume

- Placeholder: expected fanout for release, launch, EOL, out-of-stock, back-in-stock, low-stock, compatibility, media, pricing input, buyer selling, accessory export confirmation, confirmation-line blocked, export applied, export delivery failure reference, and export events.
- Placeholder: expected integration update signal volume and failure/reference volume.
- Placeholder: expected AI-ready signal volume.

## Open Questions

- Should detailed inventory, allocation, replenishment, warehouse stock, or inventory ledger behavior become a future Inventory Management context?
- Which Product Catalog availability states are vendor-submitted facts, Product Catalog governed status, or downstream projections?
- Which availability evidence fields are required for sellability-affecting versus advisory-only availability changes?
- What exact state transitions are allowed for Inactive, Active, End of Life, Archived, and Review Required?
- What exact state transitions are allowed for availability statuses?
- Should Release Date and Launch Date transitions be automatic, manual, or coordinated with Launch / Event Management?
- Which source-owned readiness evidence is required before customer-facing eligibility by Product Type, channel, and buyer scope?
- Which readiness evidence can be waived, who may approve waivers, and how long waivers remain valid?
- Which buyer actions are allowed before Launch Date?
- Which buyers can export pre-launch products, and what redaction/contract rules apply?
- What exact EOL sell-through options are supported at launch?
- How should EOL sell-through interact with Order Routing, Procurement, Fulfillment/Returns, Invoice Management, buyer integrations, and Buyer Selling Status?
- Which downstream consumer acknowledgements or dispositions are required before Product Catalog considers an EOL policy signal complete?
- What exact buyer-facing derived status vocabulary should be exposed?
- How should Product Catalog combine lifecycle, availability evidence, release/launch, EOL disposition, buyer eligibility, buyer selling status, compatibility, channel eligibility, pricing readiness, media readiness, launch eligibility evidence, export baseline state, and export/sync state?
- Which channel eligibility values should Product Catalog store as product facts?
- Which channel eligibility values belong only to Tenant Company?
- Which Product Catalog fields are vendor authoritative, CIXCI governed, source-module-owned elsewhere, or shared/unresolved?
- What Product Catalog import/export schemas should be updated to reference the shared governance standard?
- Which export schemas, filter scopes, Product Type scopes, and visibility/access projections are applicable for Latest Accessories baseline advancement?
- Which accessory export confirmation-line blocker classifications are fatal versus warning-only by buyer/channel/Product Type?
- Which export delivery failure references should prevent Accessory Added / Selling advancement versus leave delivery pending?
- Which System Admin buyer context views are audit-worthy by default, and which act-on-behalf actions need dual approval?
- What fields are required for Product Catalog release/launch notification-triggering events?
- Which notification-triggering events should be immediate versus digest?
- Which buyer system update signals are required for API, CSV/manual, and headless/storefront integrations?
- What exact Product Catalog System Admin health views are needed?

## Decisions Needed

- Product Catalog lifecycle state model and transition rules.
- Product Catalog availability state model, evidence model, and transition rules.
- Release Date / Launch Date ownership and Launch / Event Management coordination rules.
- Launch eligibility evidence requirements, stale/missing evidence behavior, and waiver rules.
- EOL Date, EOL sell-through, archival, downstream disposition, and downstream signal rules.
- Variant boundary rules for SKU, UPC, availability, image, price input, material, packaging, model, and compatibility.
- Structured color and System Color normalization model.
- Compatibility Add/Replace/Selective Remove import behavior.
- Buyer device portfolio visibility behavior.
- Buyer Product Export Record, Export Baseline Record, and Latest Accessories behavior.
- Accessory discovery, selection set, export confirmation line, export apply disposition, and buyer relationship advancement rules.
- Buyer Selling Status model and Stop Selling behavior.
- Accessory Details action availability and permission rules.
- Retail/sales channel eligibility model.
- Buyer-facing derived status vocabulary and evidence model.
- Catalog notification-triggering event list and payload redaction strategy.
- Integration/update signal contract with Integration Management.
- Product Catalog System Admin oversight model.
- AI-ready catalog signal taxonomy.

## Risks

- Product Catalog could absorb Pricing if catalog-carried pricing inputs or buyer-facing price references are treated as calculated buyer prices.
- Product Catalog could absorb Inventory if availability input evidence becomes stock ledger, allocation, replenishment, or warehouse ownership.
- Product Catalog could absorb Device Catalog if compatibility stores canonical device facts or My Devices state instead of Device References / portfolio references.
- Product Catalog could absorb Media if attachment references become asset processing, URL, transformation, or rendition ownership.
- Product Catalog could absorb Notification if it owns recipient resolution or delivery status.
- Product Catalog could absorb Integration if it owns buyer-system transport evidence.
- Product Catalog could absorb Procurement if Accessory Details PO entry points create or manage POs.
- Product Catalog could absorb Launch / Event Management if Release Date / Launch Date facts become launch readiness/calendar coordination or if customer-facing eligibility is set without source-owned readiness evidence.
- Product Catalog could absorb Tenant Company if buyer visibility, Buyer Selling Status, admin buyer context, act-on-behalf behavior, or channel behavior infer eligibility or permissions.
- Product Catalog could absorb Order Routing, Fulfillment/Returns, Invoice Management, buyer integration transport, or storefront execution if EOL sell-through policy or buyer selling/export state is treated as direct operational enforcement instead of catalog evidence and signals.
- Buyer-facing derived status could obscure source states unless evidence references remain clear.
- Latest Accessories could become misleading if based on timestamp alone instead of scoped export baseline evidence.
- Accessory Added / Selling could become misleading if advanced from confirmation alone rather than successful applicable Product Catalog export apply disposition.
- EOL and archival behavior could break order, return, invoice, reporting, or audit traceability if records are deleted or overwritten.
- Events could leak pricing, tenant, buyer, import, discovery, search/filter, or visibility-sensitive data without redaction and lookup contracts.

## Buyer Product Export Job Foundation Assumptions and Open Questions

This section documents working assumptions, open questions, and locked PR decisions for the Buyer Product Export Job Foundation. **Zero estimate-blockers;** PR is unblocked for application after Codex review.

### Working assumptions

| # | Assumption | Source |
|---|---|---|
| WA-1 | Logs & Audit PR-A through PR-E are merged at origin/main; all entities, events, workflows, canonical rules, and reference patterns are preserved verbatim. | PR #98-#102 merged |
| WA-2 | Tenant Company PR #103 is merged; 34 audit capabilities, 8 capability families, 9 role bundles (documented composites only), 2 service identity profiles, `check_access` audit-flow, capability-first authorization, parent / child audit scope governance, raw evidence access authority, break-glass governance, legal hold authority, audit export authority, service identity audit capability profiles preserved by reference. | PR #103 merged |
| WA-3 | Product Catalog baseline content is preserved without modification: Accessory Export Confirmation Record + Line, Buyer Product Export Record, Export Baseline Record, Buyer Product Relationship and Buyer Selling Status (13 statuses), Product Catalog Export Apply Disposition, Buyer Accessory Selection Set, Latest Accessories baseline, Sales Channel Eligibility, System Admin Buyer Context, existing Product Catalog events and workflows. | Codex confirmed |
| WA-4 | This PR does NOT modify `openapi-contracts.md` or any file outside the 13 target Product Catalog files. | PR scope locked |
| WA-5 | Buyer Product Export Job is the orchestration parent above the existing Buyer Product Export Record. The existing record is preserved as the per-buyer-per-product completed-export record and is produced by successful Items on terminal `activated`. | Approved scope |
| WA-6 | Capabilities used by Product Catalog buyer product exports are the existing Tenant Company buyer / company / entity capability set. `audit_export.*` (compliance audit report export capabilities introduced in PR #103) is NOT used for buyer product exports. | Approved scope |
| WA-7 | Buyer-specific activation is enforced at the data-model level via REQUIRED buyer-scope triad (`buyer_reference`, `company_scope_reference`, `buyer_entity_reference` or equivalent buyer-scope key). | Approved scope |
| WA-8 | Boundary wording: "Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes." This wording is locked verbatim across `boundary-contracts.md`, `spec.md`, `workflows.md`, `edge-cases.md`, and `test-scenarios.md`. | Cleanup directive |
| WA-9 | All exports create a Job, including individual Add Accessory clicks. Small exports may appear synchronous in UX but use the Job model under the hood. | Approved scope |
| WA-10 | Selection Snapshot freezes buyer-scoped eligible product IDs at job creation. Post-snapshot product changes do NOT mutate the Job unless explicitly regenerated / retried (which creates a new Job). | Approved scope |
| WA-11 | Throttling uses 10 named, configurable policies; NO numeric limits in this PR. Concrete numeric values are implementation / DevOps / business decisions. | Approved scope |
| WA-12 | The PR introduces exactly 6 new Product Catalog events, discriminator-based, additive. No event explosion. Existing Product Catalog events preserved. | Approved scope |
| WA-13 | The PR introduces exactly 16 numbered workflows. Existing Product Catalog baseline workflows preserved without modification. | Approved scope |
| WA-14 | Pure ASCII output discipline; final newlines on all files; no BOM; LF line endings only. Hard-stop duplicate-detection markers per append-block. APPLY.md is tool-agnostic with prohibitive-only references to destructive commands and STOP-before-commit rule. | Operational discipline from PR #103 bundle |
| WA-15 | Compatibility export is bounded by existing Product Catalog / Device Catalog rules; global compatibility is forbidden by default. Selection Snapshot reserves `compatibility_projection_reference_at_snapshot` for the future Buyer-Scoped Compatibility Projection PR. | Approved scope |
| WA-16 | Only Item status `activated` drives buyer-specific Accessory Added. All other Item statuses (including `exported`, `dispatch_pending`, `activation_pending`, `queued`, `processing`) are NON-driving for the Add Accessory UI gate. | Approved scope |
| WA-17 | Throttle, retry, reprocess, and cancellation are workflow / policy behaviors only; NOT standalone records. Buyer Product Export Throttle Record, Retry Record, Cancellation Record, Integration Dispatch Record are explicitly NOT introduced as standalone entities. | Approved scope |

### Open questions (classification)

#### Business / Product (BP) - 8 questions

| ID | Question | Default / disposition |
|---|---|---|
| OQ-BP-1 | Whether generated-but-not-downloaded files count as successful activation. | Default NO; tenant policy may override when the export mode explicitly defines file generation as successful delivery. |
| OQ-BP-2 | Whether Accessory Added means export success, buyer API acceptance, or buyer storefront publish confirmation. | Default: Integration Management dispatch reference success drives Item `activated`; deeper acceptance signals (buyer-API acceptance, buyer-storefront publish confirmation) are open. |
| OQ-BP-3 | Whether buyer can cancel after processing begins. | Default YES with bounded grace window; concrete window is open business / implementation decision. |
| OQ-BP-4 | Failed item UX: Add Accessory or Retry Export. | Default: Add Accessory remains actionable; Retry surfaces as a per-item action. |
| OQ-BP-5 | Whether admin can initiate on behalf of buyer. | Default YES with Tenant Company act-on-behalf authority; explicit buyer consent is open BP. |
| OQ-BP-6 | Whether export history is buyer-visible. | Default YES (limited to own buyer scope); System Admin Buyer Context already allows admin view per existing baseline. |
| OQ-BP-7 | Whether System Admin can self-initiate exports without explicit buyer consent. | Default NO; tenant policy may override; override logged via existing PR #103 exception-admin-exception event with appropriate discriminator. |
| OQ-BP-8 | Notification frequency / digest rules for bulk job progress. | Defer to Notification Platform coordination. |

#### Implementation (IM) - 8 questions

| ID | Question | Disposition |
|---|---|---|
| OQ-IM-1 | Exact numeric limits for the 10 named throttling policies. | Implementation / DevOps / business. |
| OQ-IM-2 | Retry budgets (concrete attempt counts and back-off intervals). | Implementation per Retry Budget Policy. |
| OQ-IM-3 | Queue priority and Small-Job Fairness algorithm specifics. | Implementation per Small-Job Fairness / Queue Priority Policy. |
| OQ-IM-4 | Job expiration timing per System Export Queue Policy. | Implementation. |
| OQ-IM-5 | Whether API dispatch and file export share one runtime queue. | Implementation; architecturally both flow through identical Job / Item / Snapshot semantics. |
| OQ-IM-6 | Concrete idempotency cache shape and TTL per Duplicate / Idempotency Policy. | Implementation. |
| OQ-IM-7 | High-volume `item.status-changed` event delivery semantics (subscriber-side throttling, fan-out limits). | Implementation. |
| OQ-IM-8 | Tenant `check_access` propagation latency mid-Job. | Implementation; existing PR #103 Workflow 12 discipline (active session / saved search authority recheck) applies as architectural pattern. |

#### Future Phase (FP) - 7 questions

| ID | Question | Disposition |
|---|---|---|
| OQ-FP-1 | Compatibility data inclusion in export payload. | Next PR (Buyer-Scoped Compatibility Projection). |
| OQ-FP-2 | Pricing snapshot inclusion in export payload. | Future Pricing coordination. |
| OQ-FP-3 | Buyer / company scope field exactness (distinct sub-entity dimensions if needed). | Future Tenant Company coordination. |
| OQ-FP-4 | Buyer-Scoped Compatibility Projection (selection snapshot `compatibility_projection_reference_at_snapshot` field activation). | Next PR. |
| OQ-FP-5 | My Devices add / remove sync rules (Device Catalog). | Next PR. |
| OQ-FP-6 | Product / Tenant export capability coordination (whether to introduce explicit `buyer_product_export.*` capabilities). | Future Tenant + Product coordination. |
| OQ-FP-7 | AI Agent Services initiating exports on behalf of buyer. | Future PR when AI Agent Services module exists (PR-C reserved family slot). |

#### Estimate Blockers (EB) - 0

No question in this section is an estimate blocker.

#### Cleanup Only (CU) - 0

### Classification summary

- **EB (estimate-blocker):** 0.
- **BP (business-product):** 8.
- **IM (implementation):** 8.
- **FP (future phase):** 7.
- **CU (cleanup-only):** 0.

Total open questions retained: **23**. Zero estimate-blockers; PR is unblocked.

### Locked PR decisions (documented for traceability)

| ID | Decision | Source |
|---|---|---|
| LD-1 | 3 primary entities introduced: Buyer Product Export Job, Buyer Product Export Item, Buyer Product Export Selection Snapshot. | Approved scope |
| LD-2 | 4 sub-structures introduced: Buyer Product Export Batch, Buyer Product Export Job Status History, Buyer Product Export Result Summary, Buyer Product Export Error. | Approved scope |
| LD-3 | Throttle, retry, reprocess, cancellation are workflow / policy behaviors only; NOT standalone records. | Approved scope |
| LD-4 | 11 trigger kinds on the Job entity. | Approved scope |
| LD-5 | 10 named throttling policies; NO numeric limits in this PR. | Approved scope |
| LD-6 | 14 Job statuses; 14 Item statuses. | Approved scope |
| LD-7 | Only Item status `activated` drives buyer-specific Accessory Added. | Approved scope |
| LD-8 | Canonical Add Accessory / Accessory Added rule locked verbatim. | Approved scope |
| LD-9 | Buyer-specific rule locked verbatim: one buyer's export must never affect another buyer's state. | Approved scope |
| LD-10 | Buyer-specific activation requires `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (or equivalent buyer-scope key). | Approved scope |
| LD-11 | Buyer Product Export Job is orchestration parent ABOVE existing Buyer Product Export Record; existing record preserved as per-buyer-per-product completed-export record. | Approved scope |
| LD-12 | Existing Product Catalog baseline entities, events, workflows, rules preserved without modification. | Approved scope |
| LD-13 | 6 new Product Catalog events, discriminator-based, additive. | Approved scope |
| LD-14 | No event explosion: per-status / per-concern events rejected; status discriminators on `status-changed` events used instead. | Approved scope |
| LD-15 | 16 numbered workflows introduced. | Approved scope |
| LD-16 | Boundary wording locked: Product Catalog owns item status and activation decisions based on Integration Management dispatch references; Integration Management owns transport outcomes. | Cleanup directive |
| LD-17 | `audit_export.*` (PR #103 compliance audit report export capability family) is NOT used for normal buyer product exports. | Approved scope |
| LD-18 | Global compatibility export forbidden / deferred. Selection Snapshot reserves `compatibility_projection_reference_at_snapshot` for future PR. | Approved scope |
| LD-19 | `openapi-contracts.md` NOT modified. `api-contracts.md` gets architecture notes only. | Approved scope |
| LD-20 | No Logs & Audit / Tenant Company / Integration Management / Device Catalog / Notification Platform / Pricing / Analytics / Order Routing / Procurement file modifications. No ADR / platform standard / runtime / schema / migration / build / lockfile changes. No `modules/README.md` changes. | Approved scope |

### Sequence positioning

This PR follows PR #103 (Tenant Company Logs & Audit Access Roles / Capabilities, merged at origin/main) and is the immediate next hardening step that puts buyer product exports under controlled Job / Batch / Item / throttle discipline before Buyer-Scoped Compatibility Projection and My Devices sync rules. The next planned PRs after this one are:

1. **Buyer-Scoped Compatibility Projection** (Product Catalog or Device Catalog coordination; locks `compatibility_projection_reference_at_snapshot`).
2. **My Devices Add / Remove Sync Rules** (Device Catalog; defines how Device Catalog portfolio changes propagate to in-flight Selection Snapshots and Items).
3. CPA / legal / DevOps retention duration review (concrete durations for Logs & Audit PR-D's 6 named retention policy references; can run in parallel).
4. Source-module evidence-emission hardening PRs (per source module).
5. API Governance Foundation PR.
6. Product-Catalog-specific OpenAPI hardening PR.
7. Logs & Audit-specific OpenAPI hardening PR.
8. Future UX / UI work for Add Accessory / bulk progress / cancel / retry / history surfaces.
9. Future Notification Platform coordination for export-coordination notifications.
10. Investigation Case Management module (if needed; PR-E reserved).
11. AI Agent Services module + evidence PR + AI-initiated export coordination (future PR if module exists).
12. Warranty Registration module + evidence PR (future PR if module exists).

### Open questions deferred to other modules / future PRs

- Concrete retention duration values (CPA / legal / DevOps; per Logs & Audit PR-D 6 named retention policy references).
- Concrete `check_access` response schema (future API Governance Foundation PR).
- Concrete notification delivery for export-coordination events (future Notification Platform coordination).
- Buyer-scoped compatibility projection (next PR; Selection Snapshot reserved field).
- My Devices add / remove sync rules (next PR).
- Pricing snapshot inclusion in export payload (future Pricing coordination).
- Product / Tenant export capability coordination (future Tenant + Product coordination; may introduce explicit `buyer_product_export.*` capabilities).
- AI Agent Services audit capabilities (future PR when module exists).
- Warranty Registration audit capabilities (future PR when module exists).
- Investigation Case Management module (future PR if needed).
- Concrete UI / UX for Add Accessory / bulk progress / queued / throttled messaging / cancel / retry / history / file-ready surfaces (future UX / UI work).
- Concrete anomaly detection on bulk-job patterns (future implementation).
- Concrete propagation latency / eventual-consistency policy beyond existing baseline (implementation).
- Concrete dead-letter / quarantine handling for repeatedly failed Items at the Product Catalog level (Integration Management owns transport dead-letter; Product Catalog's Item failure state machine is sufficient at this level).

### Estimate-blocker check

No question in this section is an estimate blocker. All BP questions have documented defaults; all IM questions are implementation details that do not block scoping or merging; all FP questions are explicitly deferred to future phases. The PR is unblocked for application after Codex review.

## Buyer-Scoped Compatibility Projection Assumptions and Open Questions

This section adds assumptions and open questions for the Product Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Device Catalog side has matching open questions in `modules/device-catalog/assumptions-open-questions.md`. All existing Product Catalog baseline assumptions and open questions (PR #104 and earlier) are preserved without modification.

### Open question classes

- **BP** Business / Product decision
- **IM** Implementation detail
- **FP** Future Phase
- **EB** Estimate Blocker
- **CU** Cleanup-only

This PR retains 20 open questions: 7 BP, 7 IM, 6 FP, 0 EB, 0 CU. **Zero estimate-blockers.** PR is unblocked for review and merge.

---

### Locked assumptions (this PR)

- Projection is buyer-scoped only; no global projection.
- Projection MUST carry the buyer-scope triad on every record.
- Projection MUST reference both the Device Catalog Buyer Device Portfolio Snapshot AND the Product Catalog compatibility mapping version.
- `projection_status` has exactly 6 values: `current`, `stale`, `recalculating`, `failed`, `review_required`, `superseded`.
- `impact_state` has exactly 7 values: `unaffected`, `no_longer_compatible`, `compatibility_restored`, `review_required`, `hidden_from_active_addable_list`, `compatibility_narrowed`, `compatibility_expanded`.
- Device Catalog Buyer Device Portfolio Change Record `change_type` has exactly 8 values: `device_added`, `device_removed`, `device_updated`, `device_deactivated`, `device_superseded`, `device_reference_corrected`, `bulk_portfolio_import`, `admin_on_behalf_change`.
- PR #104 Buyer Product Export Selection Snapshot stores `compatibility_projection_reference_at_snapshot` (REQUIRED; populated by this PR) and `compatible_device_references_at_snapshot` (NEW field).
- PR #104 Buyer Product Export Error `error_kind` is extended with `compatibility_mismatch` (NEW value; additive per discriminator extension discipline).
- Latest Accessories / Recommended Accessories framing is VISIBILITY-ONLY in this PR; advancement remains governed by existing baseline.
- No automatic Stop Selling on device removal; compatibility impact is flagged via impact record.
- In-flight PR #104 Jobs continue against bound snapshot; My Devices changes do not mutate in-flight Jobs.
- Cross-buyer reads / mutations are architecturally impossible (buyer-scope triad enforcement).
- 6 total new events; no event explosion.
- 15 architectural workflows.
- No new Tenant Company capabilities; `audit_export.*` NOT used.
- No new Logs & Audit entities; 4 new evidence kinds emitted via existing `service_identity.evidence_emit`.

---

### Business / Product open questions (BP)

#### OQ-BP-1 - review_required for Selling on no_longer_compatible

Should `no_longer_compatible` Selling items automatically transition to `impact_state = review_required` (active prompt), or remain Selling with a passive flag (passive surface)?

- **Default recommendation:** `review_required` (active prompt; matches "do not let silent state drift" principle).
- **Decision needed:** business / product.
- **Class:** BP.

#### OQ-BP-2 - Stop Selling prompt for incompatible accessories

Should buyers be prompted to Stop Selling incompatible accessories?

- **Default recommendation:** PROMPT TO REVIEW (not prompt to Stop Selling); buyer decides explicitly.
- **Decision needed:** business / product.
- **Class:** BP.

#### OQ-BP-3 - Orders continue for no-longer-compatible Selling items

Should orders continue for no-longer-compatible Selling items?

- **Default recommendation:** YES (orders placed under existing Selling state continue under existing baseline; impact does not retroactively affect order flow).
- **Decision needed:** business / product confirmation.
- **Class:** BP.

#### OQ-BP-4 - Compatibility impact notification cadence

Should compatibility impact notifications be immediate or digested?

- **Default recommendation:** digested per Notification Platform discipline; concrete rules deferred.
- **Decision needed:** business / product + Notification Platform coordination.
- **Class:** BP.

#### OQ-BP-5 - System Admin override of compatibility impact

Should System Admin be able to override compatibility impact (e.g., force an accessory to remain visible despite no compatible device)?

- **Default recommendation:** NO; override capability would be a new Tenant Company capability requiring explicit coordination.
- **Decision needed:** business / product.
- **Class:** BP.

#### OQ-BP-6 - Device removal recommendations when accessory loses compatibility

Should the buyer see device removal recommendations when an accessory loses all compatibility (e.g., "consider re-adding device X")?

- **Default recommendation:** surface impact only; recommendation engine is future.
- **Decision needed:** business / product.
- **Class:** BP.

#### OQ-BP-7 - Admin-on-behalf consent for projection-affecting My Devices changes

Should admin-on-behalf portfolio changes require explicit buyer acknowledgment before projection recalculation completes?

- **Default recommendation per PR #103:** act-on-behalf authority sufficient unless tenant policy requires explicit consent.
- **Decision needed:** business / product per tenant policy.
- **Class:** BP.

---

### Implementation open questions (IM)

#### OQ-IM-1 - Sync vs async recalculation

Should projection recalculation be synchronous (blocking) or asynchronous (event-driven)?

- **Default:** ASYNC (consistent with PR #104 throttling pattern).
- **Class:** IM.

#### OQ-IM-2 - Stale projection tolerance window

How long can a projection be `stale` before consumers refuse it?

- **Default:** implementation per Tenant policy; concrete numeric values out of scope.
- **Class:** IM.

#### OQ-IM-3 - Bulk portfolio import batching numerics

Concrete batching policy for bulk_portfolio_import: dedupe windows, batch size, per-snapshot recalculation cadence.

- **Default:** ONE recalculation per snapshot, not per device.
- **Class:** IM.

#### OQ-IM-4 - Recalculation dedupe / throttling

Named policies similar to PR #104 named-policy pattern; concrete values, dedupe windows, throttle dimensions.

- **Default:** mirror PR #104 named-policy pattern; concrete values implementation.
- **Class:** IM.

#### OQ-IM-5 - Exact buyer/company/entity field implementation

Concrete data-model shape for buyer-scope triad fields (`buyer_reference`, `company_scope_reference`, `buyer_entity_reference`).

- **Default per PR #103 / #104:** existing deferral; field types and indexing implementation.
- **Class:** IM.

#### OQ-IM-6 - compatibility_mismatch as new error_kind vs eligibility sub-kind

Confirmed in scoping: compatibility_mismatch is a NEW `error_kind` on PR #104 Buyer Product Export Error. (Locked.)

- **Decision:** LOCKED in this PR (Codex confirmed in scoping).
- **Remaining implementation detail:** error code catalog (future API).
- **Class:** IM (residual).

#### OQ-IM-7 - check_access propagation latency mid-recalculation

How quickly do Tenant capability revocations propagate to in-flight recalculations?

- **Default:** existing PR #103 Workflow 12 discipline applies (next `check_access` call re-evaluates).
- **Class:** IM.

---

### Future Phase open questions (FP)

#### OQ-FP-1 - Accessory-to-accessory compatibility

Should compatibility extend to accessory-to-accessory relationships (e.g., a case requires a specific charger)?

- **Default:** out of scope; future PR.
- **Class:** FP.

#### OQ-FP-2 - Exact API payloads

Concrete HTTP routes, request / response payload schemas, pagination, error codes for projection / impact / visibility surfaces.

- **Default:** future API Governance Foundation PR + Product-Catalog-specific OpenAPI hardening PR.
- **Class:** FP.

#### OQ-FP-3 - UI / UX surfaces

Concrete UI for: empty My Devices state, compatibility impact review, portfolio change history, projection recalculating / stale / failed indicators, Latest Accessories with projection filter, Recommended Accessories with projection filter, System Admin Buyer Context projection view, in-flight Job warning.

- **Default:** future UX / UI work.
- **Class:** FP.

#### OQ-FP-4 - Analytics / reporting views on portfolio change / impact history

Should portfolio change / impact history be a BI / dashboard surface?

- **Default:** NOT in scope; Analytics owns BI; no dashboards in this PR.
- **Class:** FP.

#### OQ-FP-5 - Re-parented buyer entity effects on long-lived projections / impact records

What happens to a buyer entity's projections / impact records when the entity is re-parented under a different company?

- **Default per PR #103 OQ-PC-2:** existing deferred discipline; not locked here.
- **Class:** FP.

#### OQ-FP-6 - AI-Agent-initiated My Devices changes

How are projection / impact records produced when AI Agent Services initiates a My Devices change on behalf of a buyer?

- **Default:** future PR when AI Agent Services module exists; existing authority discipline applies; `actor_reference` records the AI agent identity.
- **Class:** FP.

---

### Estimate Blocker open questions (EB)

**None.** This PR is unblocked at scoping level. Codex can review and apply the bundle directly after bundle review.

---

### Cleanup-only open questions (CU)

**None.** No cleanup carryover from this PR. Two earlier-PR cleanups (PR #103 evidence-emit terminology; PR #104 "resulting unstaged diff" wording) are honored architecturally without introducing new CU items.

---

### Summary of open question counts

| Class | Count |
|---|---|
| BP (Business / Product decision) | 7 |
| IM (Implementation detail) | 7 |
| FP (Future Phase) | 6 |
| EB (Estimate Blocker) | 0 |
| CU (Cleanup-only) | 0 |
| **Total** | **20** |

**Zero estimate-blockers.** PR can be reviewed and applied directly.
