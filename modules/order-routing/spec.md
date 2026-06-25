# Order Routing Module Specification

## Purpose

Define the initial Order Routing module boundary for accepted buyer order decomposition, order line routing, vendor/manufacturer suborder creation, split-order decisions, routing policy, routing snapshots, routing exceptions, manual review/retry workflows, vendor routed-suborder export governance, routing events, and downstream fulfillment instruction placeholders.

This module aligns with ADR-0009. It also consumes proposal-level constraints from ADR-0008 warranty support, ADR-0007 category-extensible Product Catalog, ADR-0006 AI Agent Services, ADR-0005 Pricing, ADR-0004 Device Catalog, and the shared `architecture/standards/import-export-validation-governance.md` standard. This draft remains proposal-level until order lifecycle, payment timing, routing rules, fulfillment contracts, vendor export schedules, and warranty trigger behavior are confirmed.

## Scope

- Parent order intake reference for buyer-facing order intake output.
- Order decomposition into routeable order lines and suborder groups.
- Order line routing across vendor, manufacturer, Product Type, tenant scope, fulfillment target, and downstream constraints.
- Routing Policy, Routing Rule, Routing Policy Version, Routing Policy Scope, Routing Rule Conflict, and Routing Precedence Ladder placeholders.
- Vendor suborder creation for routed lines assigned to vendors.
- Manufacturer suborder placeholder for future manufacturer-routed order lines without creating Procurement ownership.
- Split-order decisions while preserving parent order linkage.
- Routing decision records and immutable routing snapshots.
- Routing snapshot hardening with routing input hash, manual override flag, supersession reference, routing policy/rule versions, source input versions, price snapshot reference, tenant scope reference, product/device references, selected route, decision timestamp, and downstream target references.
- Vendor routed-suborder export eligibility for routed suborders assigned to a vendor.
- Vendor order export content references when the export is the vendor order instruction.
- Vendor order export batch references, vendor order export batch item records, export schema version, export window, export inclusion rule version, buyer/retailer split references, re-export requests, export status references, manual download references, fulfillment handoff request references, Fulfillment/Returns disposition references, and audit references.
- Per-routed-suborder export batch item disposition, including included/excluded status, included/excluded reason, prior export membership, re-export reason, duplicate prevention key, source event/version, resulting fulfillment handoff request reference, and review-required state.
- CSV-only vendor order export governance where configured, with shared field/header behavior governed by the Import / Export / Validation Governance standard and Order Routing export contracts.
- Buyer/retailer split export support where vendor configuration or operational rules require it, without altering routing decisions.
- Manual vendor routed-suborder CSV download workflow references where Tenant Company scope and Order Routing export eligibility allow it.
- Routing-to-Fulfillment handoff request records, including handoff source version, idempotency key, Fulfillment/Returns disposition reference, accepted/rejected/ignored state, applied-vs-ignored state, duplicate handoff blocker, and review-required state.
- Routing exceptions, retry state, manual review state, and correction/supersession placeholders.
- Exception taxonomy families for data, eligibility/scope, pricing snapshot, target availability, unsupported Product Type, warranty registration, downstream handoff, vendor export eligibility, export batch item duplicate prevention, Fulfillment disposition evidence, and manual review exceptions.
- Product Type-aware routing capability matrix for accessories, devices, branded merchandise, and future Product Types.
- Pricing snapshot or quote-like result consumption from Pricing.
- Tenant Company scope, readiness, relationship, product-type, geography, and licensed-property signal consumption.
- Product Catalog references for products, Product Type, lifecycle/routability, stop-sell/deactivation, activation, compatibility, and warranty product facts where authorized.
- Device Catalog references for Device References and safe device attributes where relevant.
- Warranty registration required signal placeholder per ADR-0008.
- Downstream fulfillment instruction placeholder and routing-to-fulfillment handoff request references for Fulfillment/Returns.
- Routing events, vendor export events, handoff request events, event contracts, redaction rules, and AI Agent Services signals.
- Scalability guardrails for fanout limits, retry budgets, idempotency scope, routed suborder dedupe keys, vendor export batch dedupe, export batch item duplicate prevention, handoff duplicate prevention, async queues, replay windows, manual review SLA/priority, audit retention volume, and retry storm prevention.

## Vendor Routed-Suborder Export Governance

Order Routing owns vendor routed-suborder export eligibility and export content references when the export represents the vendor order instruction created from routing output. Order Routing emits vendor routed-suborder export records rather than directly sending vendor orders.

Proposal-level export concepts include:

- Vendor order export eligibility record.
- Vendor order export batch.
- Vendor order export batch item.
- Vendor order export content reference.
- Export schema version.
- Export window.
- Export inclusion rule version.
- Export split-by-buyer flag.
- Buyer/retailer split reference.
- Re-export request.
- Export status reference.
- Manual download reference.
- Fulfillment handoff request.
- Fulfillment/Returns disposition reference.
- Audit reference.

Order Routing export content should follow the shared Import / Export / Validation Governance standard for export status vocabulary, CSV-only vendor order export governance, UPC/text identifier preservation, date/time governance, audit evidence expectations, scheduled email export boundaries, and integration failure tracking.

## Vendor Order Export Inclusion Rules

Proposal-level inclusion rules:

- Include only routed suborders assigned to the vendor receiving the export.
- Include only routed suborders eligible for vendor processing according to Order Routing-owned routing state and export eligibility rules.
- Exclude cancelled or superseded routed suborders.
- Exclude routed suborders already exported in the same batch unless explicit re-export is requested and authorized.
- Exclude routed suborders assigned to another vendor.
- Preserve export window and source event/version references.
- Enforce duplicate prevention at routed-suborder/export-batch-item level, not only at export batch level.
- Route ambiguous eligibility, conflicting vendor assignment, missing routing snapshot, stale supersession state, duplicate batch membership, duplicate prevention conflict, stale source event/version, or stale Fulfillment disposition to review.

Inclusion rules determine export eligibility only. Fulfillment/Returns determines fulfillment execution state after handoff.

## Buyer / Retailer Split Support

Vendor order exports may be split by buyer or retailer where vendor configuration or operational rules require it. Split-by-buyer behavior must preserve vendor suborder references, buyer reference, export batch reference, export batch item references, routing snapshot references, export schema version, and export inclusion rule version.

Split behavior must not alter routing decisions, vendor assignment, parent order linkage, pricing snapshot references, or fulfillment ownership. If split behavior conflicts with routing snapshots or vendor grouping, Order Routing should create review-required state.

## CSV-Only Vendor Order Export References

Vendor order exports may be CSV-only where configured. CSV-only exports do not require Excel worksheet tab naming. Buyer name, export date, export batch id, vendor reference, and schema version should be represented in file name metadata or export metadata.

Exact field and header rules should reference the shared Import / Export / Validation Governance standard and the source-module export contract. Order Routing owns routed-suborder export content and export batch/item workflow references. Logs & Audit owns file tracking. Integration Management or Notification Platform Service owns delivery evidence depending on transport.

## Manual Vendor Order Download

Vendors may manually download eligible routed-suborder CSV exports where Tenant Company permissions and Order Routing eligibility allow it. Tenant Company owns user/vendor permission and company/entity scope. Order Routing owns export eligibility and manual download workflow references. Logs & Audit owns download evidence. Integration Management and Notification Platform Service are used only where external delivery, manual exchange tracking, or email delivery occurs.

Manual download must not bypass export eligibility, tenant scope, redaction, re-export controls, or audit/file evidence.

## Routing-To-Fulfillment Handoff

Order Routing emits fulfillment handoff request signals or references after vendor suborder export or route completion where appropriate. `order.routing.fulfillment-handoff.requested` is a request, not proof that Fulfillment/Returns accepted execution. Fulfillment/Returns owns handoff acceptance/disposition, shipment, tracking, shipped/delivered dates, fulfillment import validation, and operational fulfillment status.

Order Routing may store Fulfillment/Returns disposition references, source version, accepted/rejected/ignored state, and applied-vs-ignored state for handoff review. Missing, duplicate, stale, rejected, or ignored Fulfillment/Returns disposition should not be treated as fulfilled, shipped, delivered, or accepted.

Order Routing must not update shipment status, delivered status, tracking URL, return status, refund evidence, fulfillment execution state, or customer tracking experience.

## Business Rules

- Placeholder: define whether Order Routing is triggered before or after payment authorization.
- Placeholder: define accepted buyer order state and which buyer-facing module or future Orders context owns order intake.
- Placeholder: define when vendor/manufacturer suborders are created.
- Placeholder: define when vendor routed-suborder export eligibility is created.
- Placeholder: define whether export generation always requests Fulfillment/Returns handoff or whether handoff can be delayed.
- Placeholder: define Routing Policy and Routing Rule precedence for vendor/manufacturer assignment, split orders, Product Type, tenant scope, price snapshot availability, fulfillment target availability, warranty registration requirement, manual override, vendor export eligibility, export batch item duplicate prevention, handoff disposition evidence, and exception blockers.
- Placeholder: define which routing failures are retryable, review-required, or terminal by exception family.
- Placeholder: define whether manual routing overrides can create new routing snapshots, supersede prior snapshots, or only annotate them.
- Placeholder: define when warranty registration required signals are emitted or carried.
- Placeholder: define synchronous versus asynchronous routing paths.
- Placeholder: define how dry-run route evaluation differs from route execution.
- Placeholder: define vendor export schedules, CSV-only vendor export contracts, manual download eligibility, re-export authorization, and buyer/retailer split rules.

## Out of Scope

- Tenant eligibility, hierarchy ownership, relationship approval, geography eligibility, user/entity access, and readiness ownership, which belong to Tenant Company.
- Product/device source-of-truth records, product type validation, category validation, compatibility ownership, and device identity ownership, which belong to Product Catalog and Device Catalog.
- Pricing calculation, pricing conflict resolution, price snapshots, quote lifecycle, commission/margin interpretation, and pricing exceptions, which belong to Pricing.
- Payment capture and payment authorization.
- Fulfillment execution, fulfillment handoff acceptance/disposition, shipment status, shipped dates, delivered dates, tracking numbers, tracking URLs, warehouse execution, carrier behavior, return execution, refund evidence, and replacement shipment execution.
- Vendor fulfillment update imports and fulfillment operational status changes, which belong to Fulfillment/Returns.
- External delivery, receipt, provider retry, webhook/API/CSV/SFTP transport, external ID mapping, and integration failure evidence, which belong to Integration Management.
- Scheduled email delivery, recipient delivery status, notification history, and delivery retry behavior, which belong to Notification Platform Service.
- Immutable file/export/download evidence, file tracking, audit retention, and compliance review, which belong to Logs & Audit.
- Invoice lifecycle, invoice approval, payment/accounting records, reconciliation, credits, adjustments, and disputes.
- Warranty claim approval, customer warranty UX, vendor warranty systems, or warranty registration delivery.
- Procurement approval, purchase order lifecycle, purchase order submission, receiving, procurement reconciliation, or procurement financial controls.
- Analytics reporting definitions and metric ownership.

## Dependencies

- ADR-0009 Order Routing bounded context.
- ADR-0008 Warranty Registration and Claim Support.
- ADR-0007 Category-Extensible Product Catalog.
- ADR-0006 AI Agent Services.
- ADR-0005 Pricing bounded context.
- ADR-0004 Device Catalog bounded context.
- `architecture/standards/import-export-validation-governance.md` for shared import/export/validation expectations.
- Tenant Company for buyer/entity scope, relationship eligibility, readiness, geography, Product Type enablement, licensed-property scope signals, and export/manual download/re-export permissions.
- Product Catalog for product references, Product Type, product lifecycle/routability, compatibility references, stop-sell/deactivation, and warranty product facts.
- Device Catalog for Device References and safe device context where relevant.
- Pricing for quote-like results, price snapshots, and order-bindable price references.
- Fulfillment/Returns for fulfillment handoff acceptance/disposition, shipment/tracking/delivery execution, fulfillment imports, return execution, and operational fulfillment status.
- Integration Management for external delivery/receipt state and transport evidence.
- Notification Platform Service for scheduled email delivery.
- Logs & Audit for export/download/file evidence and immutable audit evidence.
- Platform integration principles: API first, event-driven where possible, retry handling, audit logging, loose coupling, and API versioning.

## Vendor Export Schedule and Delivery Evidence Alignment (PR-A)

This section is the spec-level narrative for the Order Routing scheduling and delivery evidence layer introduced by PR-A. Entity-level definitions live in `modules/order-routing/data-model.md`; workflow step sequences live in `modules/order-routing/workflows.md`; boundary discipline lives in `modules/order-routing/boundary-contracts.md`; authority class lives in `modules/order-routing/permissions.md`; event names live in `modules/order-routing/events.md`; event contract shape lives in `modules/order-routing/event-contracts.md`; read-only API placeholders live in `modules/order-routing/api-contracts.md`. Open questions and risks are in `modules/order-routing/assumptions-open-questions.md`. Lightweight review scenarios are in `modules/order-routing/test-scenarios.md`; edge cases are in `modules/order-routing/edge-cases.md`. A light cross-reference is added to `modules/order-routing/vendor-export-fulfillment-handoff-governance.md`.

This is proposal-level architecture. PR-A does not introduce OpenAPI schemas, runtime endpoint implementations, database schemas, broker/queue mechanics, retry-policy tuning, or any code / schema / migration / runtime files. PR-A does not modify any Fulfillment / Returns file, Integration Management file, Notification Platform Service file, Tenant Company file, Logs & Audit file, Analytics / Reporting file, Product Catalog file, Device Catalog file, ADR, or platform standard.

### What PR-A adds

PR-A is the evidence layer for vendor order exports. It introduces the configuration of when and how exports are produced and delivered (Schedule), the materialized execution instances (Window), the authoritative delivery records (Delivery Evidence) and their per-attempt audit (Delivery Attempt), and the operational review-required state (on Delivery Evidence). These entities sit on top of Order Routing's existing routing decision, suborder, export batch, manufacturer placeholder, routing snapshot, and handoff request entities — they do not replace or restructure them.

Six interlocking workflows:

1. **Vendor Export Schedule configuration** — create, edit (versioning), pause, resume, retire. Gated by Export Schedule Authority.
2. **Vendor Export Window generation** — materialize Schedules into concrete execution instances over a rolling horizon, applying timezone, business calendar, and holiday/weekend behavior.
3. **Vendor Export Delivery Evidence capture** — record delivery via Integration Management; capture outcome as Delivery Attempts; transition Delivery Evidence to terminal states (`confirmed`, `failed`, `partial`, `unconfirmable`).
4. **Manual Download evidence** — for Delivery Method = Manual Download; first successful download is the canonical delivery confirmation; expiration triggers Review-Required.
5. **Retry / failure evidence** — Order Routing captures Integration-Management-reported retry outcomes without specifying retry policy.
6. **Operational Review-Required workflow** — `not_required → review_required → under_review → resolved`, with reopening permitted. Resolution via re-export uses existing controls; resolution without re-export requires audit-evidenced acceptance.

PR-A also introduces:

- **Export Schedule Authority** class in `permissions.md` (operationalizing the previously prose-mentioned authority).
- **12 additive event names** across four families (Schedule lifecycle 4, Window lifecycle 3, Delivery Evidence 3, Operational Review 2).
- **Architecture-level event contract shape** (reference-first; tenant-scoped redaction by default; consumer-idempotent; replay-supportive).
- **5 read-only API placeholder sections** (Schedule lookup, Window lookup, Delivery Evidence retrieval, Delivery Attempt lookup, Operational Review state lookup).

### The non-collapsible state chain

PR-A's core architecture rule: the chain from Schedule configuration through to consumed delivery facts is **architecturally non-collapsible**:

```
Vendor Export Schedule (reusable configuration)
    └─ materializes ─> Vendor Export Window (concrete execution instance, immutable post-execution)
        └─ produces ─> Export Batch (existing Order Routing entity, one-to-many under Window per split)
            └─ produces ─> Vendor Export Delivery Evidence (authoritative delivery record)
                └─ records ─> Vendor Export Delivery Attempt (per-attempt audit, one-to-many under Delivery Evidence)
                └─ carries ─> Export Operational Review-Required State (on Delivery Evidence)
                └─ consumed read-only by ─> Fulfillment / Returns SLA evaluation (future Fulfillment / Returns PR-A)
                └─ consumed read-only by ─> Analytics / Reporting summary aggregation (future Cross-Module Summary Email PR)
                └─ retained immutably by ─> Logs & Audit
```

Each state is distinct. A Schedule is reusable configuration; a Window is a single concrete execution instance; an Export Batch is a single content set; a Delivery Evidence is the single delivery record for one Batch via one Delivery Method; an Attempt is one delivery attempt under a Delivery Evidence; Review-Required is an orthogonal state on Delivery Evidence. None is interchangeable with another.

### What PR-A does NOT do

- **Does not evaluate fulfillment SLAs.** No "is this fulfillment response late" logic. SLA evaluation is Fulfillment / Returns PR-A territory.
- **Does not create late/missing fulfillment import exceptions.** Fulfillment / Returns PR-A.
- **Does not own shipment, tracking, or delivery-of-physical-goods status.** Fulfillment / Returns.
- **Does not own return operational state, refund / payment state, or buyer update-ready signals.** Fulfillment / Returns and adjacent modules.
- **Does not assert vendor operational acceptance.** A confirmed `delivery_confirmation_state` is a transport-layer fact: the configured Delivery Method produced delivery evidence. It does **not** mean the vendor acknowledged, opened, processed, or accepted operational responsibility for the export, and it does not mean fulfillment execution was accepted. Email delivered ≠ email opened. SFTP push confirmed ≠ file consumed. Manual download ≠ operational acceptance. Operational fulfillment acceptance is Fulfillment / Returns territory and the Boundary/Handoff PR's join-point contract.
- **Does not define the export-to-fulfillment handoff seam.** The existing `vendor-export-fulfillment-handoff-governance.md` governs the handoff; further hardening is the Boundary/Handoff PR.
- **Does not introduce scheduled System Admin Activity Summary Emails or summary aggregation.** Cross-Module PR.
- **Does not define the business calendar.** Calendar is referenced; ownership is Tenant Company or future platform standard.
- **Does not specify transport mechanics.** Integration Management owns transport.
- **Does not own retry policy.** Integration Management owns retry; Order Routing captures outcomes.
- **Does not own recipient identity.** Tenant Company owns recipient scope.
- **Does not introduce OpenAPI schemas, concrete URL paths, runtime endpoint code, broker mechanics, database schemas, or migrations.** Architecture / spec only.
- **Does not mutate Product Catalog, Fulfillment / Returns, Tenant Company, Integration Management, Notification Platform Service, Logs & Audit, Analytics / Reporting, Device Catalog under any path.**
- **Does not rename any existing Order Routing event name.** PR-A events are additive only.
- **Does not introduce AI Agent Services integration in Phase 1.**
- **Does not enable vendor self-service Schedule editing in Phase 1.**
- **Does not enable manufacturer / distributor / API ingestion** (consistent with Device Catalog PR-A's Phase 1 reaffirmation; PR-A's Delivery Method enumeration includes API push as a delivery method, but vendor-side data ingestion via API is a separate concept and not enabled).

### Phase 1 reaffirmation

- CIXCI System Admin holding Export Schedule Authority is the only actor permitted to mutate Schedules.
- Vendor self-service is not enabled.
- AI-driven Schedule edits / auto-resolution are not enabled.
- Buyer-facing surfaces do not interact with PR-A entities.
- Existing Order Routing actors (routing decision, re-export, manual download, handoff approval) operate within their existing authority classes; PR-A does not modify their permissions.

### Sequence within Order Routing and Fulfillment / Returns hardening

Per the audit sequence:

1. **Order Routing PR-A — Vendor Export Schedule and Delivery Evidence Alignment** (this PR). Evidence layer.
2. **Fulfillment / Returns PR-A — Vendor Fulfillment Response SLA and Late/Missing Import Exceptions** (next). Consumes PR-A's Delivery Evidence.
3. **Boundary/Handoff PR — Export Delivery to Fulfillment SLA Handoff.** Formalizes the join.
4. **Fulfillment / Returns PR-B — Delivery Date and Buyer Update Hardening.**
5. **Cross-Module PR — Scheduled System Admin Activity Summary Emails.** Consumes Review-Required state.

PR-A is the producer; Fulfillment / Returns PR-A is the consumer. The explicit join is the Boundary/Handoff PR's job. PR-A is one PR and does not split.
