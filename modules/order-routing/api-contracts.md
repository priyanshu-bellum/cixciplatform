# Order Routing API Contracts

This document is proposal-level. It captures domain-level interface contract concepts without finalizing OpenAPI paths, schemas, authentication, or implementation details.

## API Purpose

Provide bounded-context interfaces for route evaluation, route execution, routed order lookup, routing snapshot lookup, vendor routed-suborder export eligibility/content, export batch item disposition, re-export requests, manual download references, routing-to-fulfillment handoff requests, Fulfillment/Returns disposition references, routing exception review, routing retry, routing supersession, and safe routing evidence exposure to downstream modules.

Order Routing APIs must consume references and snapshots from owning modules instead of copying or recalculating their source data.

## Service Ownership

- Order Routing owns route evaluation, route execution, routing decision output, suborder structure, routing snapshot lookup, vendor routed-suborder export eligibility records, vendor order export batch/item workflow references, vendor order export content references, buyer/retailer split export references, re-export requests, manual download workflow references, fulfillment handoff requests, Fulfillment/Returns disposition references, routing exception lookup, retry/review actions, supersession records, and routing event publication.
- Pricing owns pricing snapshots and quote-like results.
- Tenant Company owns eligibility/scope signals and manual download/export authority.
- Product Catalog and Device Catalog own product/device references and validation.
- Fulfillment/Returns owns execution APIs after routing handoff, including handoff acceptance/disposition, shipment, tracking, delivered dates, fulfillment imports, returns, and operational fulfillment status.
- Integration Management owns external delivery/receipt and transport evidence.
- Notification Platform Service owns scheduled email delivery.
- Logs & Audit owns immutable export/download/file evidence.

## API Contract Split

### Route Evaluation / Dry-Run

Purpose: evaluate a proposed route without creating routed order, suborder, vendor export, fulfillment handoff, or execution state unless explicitly requested through route execution.

- Input: accepted parent order reference or proposed route request, routeable order lines, tenant scope reference, Product Catalog references, Device References where relevant, Product Type, pricing snapshot references, relationship eligibility references, fulfillment capability placeholder, warranty registration requirement placeholder, and policy version request.
- Output: evaluation result, candidate routes, blockers, warnings, Routing Rule Conflicts, required review state, selected policy/rule references, and whether execution is allowed.
- Guardrail: dry-run must not create vendor suborders, manufacturer suborder placeholders, vendor export batches, routing snapshots that imply execution, downstream fulfillment instruction placeholders, or warranty registration events.

### Route Execution

Purpose: create routed order state, routing decision records, immutable routing snapshot, suborder structure, and downstream handoff placeholders when all required preconditions are satisfied.

- Input: accepted parent order reference, validated routeable order lines, tenant scope reference, Product Catalog references, Device References, Product Type, price snapshot references, selected Routing Policy Version, idempotency key, and optional prior evaluation reference.
- Output: routed order reference, routing snapshot reference, vendor suborder references, manufacturer suborder placeholder references, downstream fulfillment instruction placeholders, warranty registration required signal placeholders, and exceptions/review state.
- Guardrail: execution must not recalculate price, infer tenant eligibility, execute fulfillment, create purchase orders, deliver warranty registration, issue invoices, generate vendor export files, or deliver vendor orders externally unless export generation is explicitly requested through a vendor export contract.

### Vendor Routed-Suborder Export Eligibility

Purpose: determine whether routed suborders are eligible for a vendor order instruction export.

- Input: parent order reference, vendor reference, buyer/entity reference, routed suborder references or export window, tenant scope reference, source event/reference, source version, export schema version, export inclusion rule version, routing snapshot references where known, export mode, and idempotency key.
- Output: vendor order export eligibility records, included routed suborder references, excluded routed suborder references, eligibility status/reason, exclusion reasons, prior export state, re-export allowed flag, supersession/cancellation state, review-required records, export window, inclusion rule version, and audit reference.
- Guardrail: eligibility determines export inclusion only. It must not update fulfillment execution state, shipment status, tracking, returns, refunds, invoices, or external delivery status.

### Vendor Order Export Batch Creation

Purpose: create a vendor routed-suborder export batch, per-suborder batch items, and export content reference when routed suborders are eligible.

- Input: vendor order export eligibility references, vendor reference, buyer/retailer split mode, export method reference, export schema version, export window, split-by-buyer flag, buyer/retailer split request where applicable, re-export reference where applicable, requested delivery mode reference, generated by actor/service, and batch idempotency key.
- Output: routed suborder export batch reference, vendor order export batch item references, included/excluded item dispositions, vendor order export content reference, export status reference, buyer/retailer split references, routed suborder references, routing snapshot references, manual download eligibility, fulfillment handoff request references where applicable, and audit reference.
- Guardrail: Order Routing owns content and workflow references only. Logs & Audit owns file evidence. Integration Management owns external delivery/receipt evidence. Notification Platform Service owns scheduled email delivery.

### Vendor Order Export Batch Item Disposition

Purpose: expose per-routed-suborder inclusion/exclusion and duplicate-prevention evidence for a vendor export batch.

- Input: export batch reference, export batch item reference, tenant scope, vendor reference, routed suborder reference, and authorization.
- Output: export batch item id, routed suborder reference, routing snapshot reference, eligibility record reference, included/excluded status, included/excluded reason, prior export membership reference, re-export reason, duplicate prevention key, source event/version, resulting fulfillment handoff request reference, review-required state, and audit reference.
- Guardrail: duplicate prevention is enforced at routed-suborder/batch-item level. Partial re-exports must not cause duplicate vendor processing unless explicitly authorized.

### Vendor Order Re-Export Request

Purpose: explicitly request a re-export for routed suborders or prior export batch items.

- Input: original export batch reference, original export batch item references, requested routed suborders, re-export reason, requested by actor/service, Tenant Company permission/approval reference, duplicate processing risk acknowledgement where required, export inclusion rule version, export schema version, idempotency key, and actor/service reference.
- Output: re-export request reference, duplicate processing risk flag, allowed/blocked state, supersession reference where applicable, generated replacement export reference where created, export eligibility result, export batch reference where created, review-required state, and audit reference.
- Guardrail: re-export must not silently re-send all previously exported suborders, create duplicate routed suborders, or rewrite original routing snapshots.

### Manual Vendor Order Download

Purpose: record manual download eligibility or completed download for a vendor routed-suborder export.

- Input: export batch reference, vendor/company/entity reference, actor/user reference, manual download authorization reference, redaction class, and idempotency key.
- Output: manual download reference id, export batch reference, actor/user reference, vendor/company/entity reference, download timestamp, download count, last downloaded by, last downloaded at, permission/scope reference, Logs & Audit download evidence reference placeholder, and audit reference.
- Guardrail: Tenant Company owns permission. Logs & Audit owns immutable download evidence. Order Routing does not deliver scheduled email or external transport.

### Routing-To-Fulfillment Handoff

Purpose: create or expose handoff request references after route completion or vendor export generation where appropriate.

- Input: routed order reference, routed suborder reference, export batch item reference, vendor suborder references, routing snapshot references, downstream fulfillment instruction placeholder, handoff source version, and handoff idempotency key.
- Output: fulfillment handoff request id, handoff requested timestamp, handoff source version, fulfillment handoff request reference, duplicate handoff blocker, downstream owner reference, Fulfillment/Returns disposition reference where available, accepted/rejected/ignored state, applied vs ignored state, and review-required state.
- Guardrail: `order.routing.fulfillment-handoff.requested` is a request. Fulfillment/Returns owns handoff acceptance/disposition, shipment, tracking, delivery, return, refund evidence, and operational fulfillment status.

### Fulfillment Disposition Reference Recording

Purpose: record a Fulfillment/Returns-owned disposition reference against an Order Routing handoff request.

- Input: fulfillment handoff request id, Fulfillment/Returns disposition reference, Fulfillment/Returns source version, accepted/rejected/ignored state, applied vs ignored state, source event/reference, and idempotency key.
- Output: updated fulfillment handoff request reference, disposition reference recorded state, duplicate handoff blocker where applicable, review-required state, and audit reference.
- Guardrail: Order Routing stores references and disposition summaries only. It must not mutate Fulfillment/Returns operational execution state or infer shipped/delivered/fulfilled status from the reference.

### Routing Snapshot Lookup

Purpose: retrieve immutable routing evidence for authorized consumers.

- Input: routing snapshot id and authorized tenant scope.
- Output: immutable evidence including routingInputHash, input references, selected route, routing policy version, routing rule version, source input versions, price snapshot reference, tenant scope reference, product/device references, downstream target references, warranty signal reference, decision timestamp, manualOverrideFlag, supersessionReference, and decision summary.

### Routing Exception Review

Purpose: inspect, classify, assign, and resolve routing exceptions, including vendor export eligibility, export batch item, re-export, manual download, and fulfillment handoff conflicts.

- Input: routing exception id, exception family, routed order id, parent order reference, line reference, export batch reference, export batch item reference, vendor export eligibility reference, fulfillment handoff request reference, or review queue filters.
- Output: exception family, owner, retryability, blocking behavior, review queue, severity, affected references, reason summary, audit reference, and allowed next actions.

### Routing Retry

Purpose: retry routing-specific failures under explicit retry budgets and idempotency controls.

- Input: routing exception reference, retry reason, retry budget reference, idempotency key, actor/service, and optional refreshed input references.
- Output: retry state, attempt count, new routing attempt reference, new routing snapshot reference where applicable, export eligibility retry result, export batch item retry result, handoff request retry result where applicable, or retry-exhausted state.
- Guardrail: retry must not bypass upstream ownership or create duplicate suborders/export batches/export batch items/handoff requests.

### Routing Supersession

Purpose: supersede an immutable routing snapshot with a new approved snapshot when a correction, manual override, or re-route is allowed.

- Input: prior routing snapshot reference, supersession reason, approved manual override reference where applicable, selected route, policy/rule version references, and actor/approver.
- Output: new routing snapshot reference, Routing Supersession Record, affected suborder references, affected export eligibility/batch item references where applicable, and supersession event.
- Guardrail: supersession does not rewrite the original snapshot or prior export/file evidence.

## Request Concepts

- Parent order intake reference.
- Routeable order line references.
- Tenant scope reference.
- Buyer/entity reference.
- Product Catalog reference.
- Device Reference.
- Product Type.
- Routing Policy Version.
- Routing Rule Version.
- Pricing snapshot / quote-like result reference.
- Source event/reference and source version.
- Routing input hash.
- Vendor/manufacturer relationship eligibility reference.
- Fulfillment target/capability placeholder.
- Warranty registration required signal placeholder.
- Vendor order export eligibility reference.
- Routed suborder export batch reference.
- Export batch item reference.
- Vendor order export content reference.
- Export schema version.
- Export window.
- Export inclusion rule version.
- Export split-by-buyer flag.
- Buyer/retailer split reference.
- Re-export request reference.
- Manual download reference.
- Fulfillment handoff request reference.
- Fulfillment/Returns disposition reference.
- Correlation id and idempotency key.

## Response Concepts

- Evaluation id.
- Routed order id.
- Routing state.
- Vendor suborder reference.
- Manufacturer suborder placeholder reference.
- Split order group reference.
- Routing snapshot reference.
- Routing policy/rule references.
- Routing decision summary.
- Routing exception / review-required state.
- Vendor order export eligibility record.
- Routed suborder export batch reference.
- Vendor order export batch item reference.
- Vendor order export content reference.
- Buyer/retailer split reference.
- Export status reference.
- Re-export request reference.
- Manual download reference.
- Downstream fulfillment instruction placeholder.
- Fulfillment handoff request reference.
- Fulfillment/Returns disposition reference.
- Warranty registration required signal placeholder.
- Supersession reference.

## Error Models / Exception Families

- Data exceptions: missing or invalid parent order reference, malformed order line, duplicate idempotency key with conflicting payload, invalid product/device reference.
- Eligibility/scope exceptions: invalid tenant scope, missing relationship eligibility, denied Product Type scope, missing licensed-property scope, missing manual download permission.
- Pricing snapshot exceptions: missing, stale, rejected, expired, or non-order-bindable pricing snapshot.
- Target availability exceptions: vendor/manufacturer unavailable, no eligible target, target conflict.
- Vendor export eligibility exceptions: conflicting vendor assignment, routed suborder already exported in same batch, stale supersession state, missing routing snapshot, cancelled/superseded suborder, ambiguous export window, buyer/retailer split conflict.
- Vendor export batch item exceptions: duplicate prevention key conflict, invalid prior export membership, partial re-export not authorized, included/excluded disposition conflict, stale source event/version.
- Re-export exceptions: duplicate processing risk not approved, original export batch item missing, requested scope too broad, re-export blocked, supersession conflict.
- Fulfillment handoff exceptions: duplicate handoff blocked, missing handoff source version, missing/stale/rejected/ignored Fulfillment/Returns disposition, applied-vs-ignored conflict.
- Unsupported Product Type exceptions: no Routing Policy Version for Product Type, unsupported Product Type capability.
- Warranty registration exceptions: registration required but method missing, warranty signal malformed, warranty trigger unresolved.
- Downstream handoff exceptions: missing fulfillment target, downstream handoff rejected, target unavailable after execution.
- Manual review exceptions: override required, equal-specificity rule conflict, policy conflict, retry exhausted.

## Idempotency Rules

- Route evaluation idempotency should be scoped by request payload hash, parent order, tenant, and evaluation mode.
- Route execution should require idempotency keys scoped by parent order, tenant, and routing input hash.
- Vendor suborders and manufacturer suborder placeholders should have dedupe keys per routed suborder.
- Vendor export eligibility should be idempotent by vendor, tenant scope, export window, inclusion rule version, routed suborder references, source event reference, source version, and idempotency key.
- Vendor export batch creation should be idempotent by vendor, export window, eligibility record set, split-by-buyer behavior, re-export request reference, schema version, and batch idempotency key.
- Vendor export batch items should enforce duplicate prevention by routed suborder, export batch, prior export membership, re-export reason, source event/version, and duplicate prevention key.
- Manual download and re-export actions should require idempotency keys.
- Fulfillment handoff requests should require idempotency by routed suborder, export batch item, routing snapshot, handoff source version, and handoff idempotency key.
- Fulfillment disposition reference recording should be idempotent by handoff request, Fulfillment/Returns disposition reference, Fulfillment/Returns source version, and idempotency key.
- Retry and review actions should require idempotency keys.
- Conflicting payloads for the same key should return an idempotency conflict rather than route, export, hand off, record disposition, or download twice.

## Versioning Strategy

- Routing APIs should version route request schema, route evaluation schema, route execution schema, routing snapshot schema, vendor export schema, export batch item schema, vendor export inclusion rules, fulfillment handoff schema, exception types, and event payloads.
- Routing snapshots should preserve Routing Policy Version, Routing Rule Version, source input versions, and schema version references for audit reconstruction.
- Vendor export batches and batch items should preserve export schema version, export inclusion rule version, export window, source event/version, routing snapshot references, and prior export membership references.
- Fulfillment handoff requests should preserve handoff source version and Fulfillment/Returns source version where available.

## Audit / Logging Requirements

- Record caller, tenant scope, parent order reference, idempotency key, routing input hash, input references, routing policy/rule versions, routing result, exception state, supersession reference, export eligibility records, export batch references, export batch item references, re-export requests, manual download records, fulfillment handoff requests, Fulfillment/Returns disposition references, and correlation id.
- Do not log full sensitive price, customer, vendor, warranty, or tenant data when references and redacted summaries are sufficient.
- Logs & Audit owns immutable file/export/download evidence, while Order Routing owns routing and export content references.

## Open Questions

- Which consumers require route evaluation versus execution?
- Which routing actions require approval workflows?
- Which downstream modules need full routing snapshots versus references?
- Which errors are recoverable through retry versus manual review?
- Should route evaluation snapshots be retained, and if so, for how long?
- Which vendor order export APIs are internal-only versus vendor-facing?
- Which vendor order export classes are CSV-only, scheduled email, manual download, API/webhook, SFTP placeholder, or hybrid?
- Which Fulfillment/Returns disposition references should be visible to Order Routing and at what redaction level?

## Vendor Export Schedule and Delivery Evidence — API Contract Placeholders (PR-A)

PR-A introduces architecture-level read-only API placeholders for the Vendor Export Schedule, Window, Delivery Evidence, and Delivery Attempt surface. These are **placeholders only**. PR-A does **not** introduce:

- OpenAPI schemas.
- Concrete URL paths beyond what is required by Order Routing's existing API style.
- Runtime endpoint implementation.
- Authentication / authorization wire-level details (those are governed by existing Order Routing API patterns and future Integration Management API gateway concerns).
- Pagination / rate limiting / version negotiation specifics.

All PR-A API placeholders are **read-only**. PR-A does **not** introduce mutating endpoints. Mutations to Vendor Export Schedule, Window, Delivery Evidence, Delivery Attempt, or Review-Required state occur through:

- The internal CIXCI System Admin surface (gated by Export Schedule Authority per `permissions.md`).
- Order Routing's existing workflows (re-export controls, manual download authority, handoff approval).
- System actors at Window execution and Delivery Attempt recording time.

External consumers (Fulfillment / Returns, Analytics / Reporting, Logs & Audit) consume read-only.

### Placeholder 1 — Vendor Export Schedule lookup

**Purpose:** Read Vendor Export Schedule configuration for a specific Schedule, a vendor's active Schedules, or a specific Schedule version.

**Lookup surfaces (architecture-level):**

- Lookup by `vendor_export_schedule_id`.
- Lookup by `vendor_reference` (returns active Schedules for the vendor).
- Lookup of a specific Schedule version by `vendor_export_schedule_id` + `schedule_version`.

**Consumer scope:**

- Internal / admin (Export Schedule Authority holders): full read access.
- Authorized downstream consumers: read access subject to `redaction_class = tenant_scoped` consumer scope evidence per Tenant Company `check_access`.
- Vendor self-service: not enabled in Phase 1.

**Not contracted by PR-A:**

- Concrete URL path.
- OpenAPI schema for response payload.
- Pagination semantics for multi-Schedule responses.
- Response envelope structure.

### Placeholder 2 — Vendor Export Window lookup

**Purpose:** Read Vendor Export Window state and execution context.

**Lookup surfaces (architecture-level):**

- Lookup by `vendor_export_window_id`.
- Lookup by `vendor_export_schedule_reference` (returns Windows materialized from a Schedule, with optional state and time-range filters).
- Lookup of Windows in a specific lifecycle state for operational dashboards (e.g., currently `executing`, or recently `failed`).

**Consumer scope:**

- Internal / admin: full read access.
- Authorized downstream consumers: read access subject to consumer scope evidence.

**Not contracted by PR-A:**

- Concrete URL path.
- OpenAPI schema.
- Time-range filter syntax.
- Sort / pagination.

### Placeholder 3 — Vendor Export Delivery Evidence retrieval

**Purpose:** Read Vendor Export Delivery Evidence for SLA evaluation, audit, operational review, and analytics aggregation. **This is the primary read surface that future Fulfillment / Returns SLA evaluation will consume.**

**Lookup surfaces (architecture-level):**

- Lookup by `vendor_export_delivery_evidence_id`.
- Lookup by `vendor_export_window_reference` (returns all Delivery Evidences for a Window).
- Lookup by `export_batch_reference` (returns Delivery Evidence per Batch — typically one, possibly more for re-export scenarios).
- Lookup by `delivery_confirmation_state` for operational dashboards (e.g., all `pending` Delivery Evidences, all `failed` Delivery Evidences requiring review).
- Possible bulk lookup by `vendor_reference` + time range for SLA evaluation backfill or analytics aggregation.

**Consumer scope:**

- Fulfillment / Returns (future SLA evaluator): read access subject to `tenant_scoped` consumer scope. Reads `export_delivered_timestamp`, `delivery_confirmation_state`, and Schedule cutoff context to compute fulfillment deadlines. **Read-only; cannot mutate Delivery Evidence.**
- Logs & Audit: read access for retention rollups.
- Analytics / Reporting (future Cross-Module Summary Email PR): read access for review-required state aggregation.
- Internal / admin: full read access.

**Boundary preservation:**

- Consumers cannot transition `delivery_confirmation_state` or `export_review_required_state` through this surface.
- Consumers cannot create or modify Delivery Attempts.
- Consumers cannot request retries (retry policy is Integration Management's).

**Not contracted by PR-A:**

- Concrete URL paths.
- OpenAPI schema.
- Bulk lookup pagination.
- Whether bulk lookup exists at all (it's flagged as "possible"; final decision deferred to a future contracts-PR).

### Placeholder 4 — Vendor Export Delivery Attempt lookup

**Purpose:** Read Vendor Export Delivery Attempt records for audit and retry-chain visualization.

**Lookup surfaces (architecture-level):**

- Lookup by `vendor_export_delivery_attempt_id`.
- Lookup by `vendor_export_delivery_evidence_reference` (returns Attempts in `attempt_sequence` order).
- Retry-chain traversal via `retry_after_reference`.

**Consumer scope:**

- Internal / admin: full read access.
- Authorized downstream consumers: read access subject to consumer scope evidence.

**Boundary preservation:**

- Attempts are immutable once created. Consumers cannot modify Attempts.
- Attempts reference Integration-Management-owned `transport_evidence_reference`; consumers resolve transport evidence through Integration Management, not Order Routing.

### Placeholder 5 — Operational Review state lookup

**Purpose:** Read Vendor Export Delivery Evidence records with `export_review_required_state ≠ not_required`. Used by future Cross-Module Summary Email PR for aggregation.

**Lookup surfaces (architecture-level):**

- Lookup of Delivery Evidences in `review_required` state.
- Lookup of Delivery Evidences in `under_review` state.
- Lookup of Delivery Evidences recently transitioned to `resolved` (time-range filter).
- Per-vendor and per-tenant aggregations.

**Consumer scope:**

- Future Cross-Module Summary Email PR: read access for aggregation.
- Internal / admin: full read access.

**Boundary preservation:**

- Consumers cannot transition `export_review_required_state` through this read-only surface.
- Review state transitions require Export Schedule Authority via internal admin surface.

### Acknowledgement semantics — not in PR-A

PR-A's API surface is read-only. PR-A does **not** introduce an acknowledgement endpoint for events or signals. Consumer acknowledgement of PR-A events is transport-layer / Integration Management territory.

If a future Cross-Module PR introduces consumer acknowledgement for summary email delivery or operational review surfacing, that acknowledgement does not flow through Order Routing's API and does not command Order Routing state changes.

### What PR-A does NOT contract in api-contracts.md

- OpenAPI schemas (all placeholders remain architecture-level).
- Concrete URL paths beyond reference to Order Routing's existing API style.
- HTTP method conventions per endpoint.
- Authentication wire details.
- Authorization wire details (header conventions, token formats).
- Pagination tokens, page sizes, cursor semantics.
- Sort order semantics.
- Filter expression grammar.
- Error response envelope structure.
- Rate limit semantics.
- API version negotiation (URL versioning vs. header versioning).

These are deferred to a future Order Routing contracts-PR or to Integration Management's API gateway concerns.

### Existing api-contracts.md content preserved

Order Routing's existing API / OpenAPI placeholders (per Codex's readiness review) are preserved unchanged by PR-A. PR-A adds the five placeholders above; existing routing decision, route execution, suborder, export batch, handoff request, and other API placeholders remain as written.
