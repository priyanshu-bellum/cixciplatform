# Fulfillment and Returns API Contracts

This document is proposal-level architecture. It describes domain API contract concepts without finalizing endpoint design, auth behavior, carrier/vendor integration mechanics, file schemas, or implementation storage.

## API Purpose

Fulfillment and Returns APIs support operational fulfillment and return execution while preserving upstream/downstream boundaries.

APIs may support:

- Fulfillment handoff disposition from Order Routing handoff requests.
- Vendor fulfillment import upload, validation, preview, confirmation, apply, correction, and error report lookup.
- Shipment line evidence creation, lookup, conflict handling, and duplicate row blocking.
- Shipment tracking validation and tracking reference creation.
- Shipment evidence and status update lookup.
- Vendor return export eligibility, export batch/item lookup, and manual download workflow references.
- Vendor return import upload, validation, preview, confirmation, apply, correction, and error report lookup.
- RAN validation, return matching validation, and stale authorization export blockers.
- Return line disposition evidence creation, lookup, quantity reconciliation, and duplicate row blocking.
- Vendor return operational disposition evidence and vendor-provided refund/adjustment evidence references.
- Buyer shipment/return update ready-for-transport signals.
- Exception/review/retry evidence lookup.

## Service Ownership

Fulfillment and Returns owns API contracts for fulfillment handoff disposition, vendor fulfillment import validation/application, per-line shipment evidence, operational shipment state, tracking references, vendor return export/import workflow state, RAN validation, per-line return operational disposition, return receipt/condition evidence, replacement execution, and operational exceptions.

The API must not expose operations that choose routes, recalculate price, issue refunds, apply invoice adjustments, process payments, derive tenant eligibility, edit Product Catalog or Device Catalog source records, deliver notifications, send scheduled emails, own external transport retries, or mutate Logs & Audit evidence.

## Contract Families

### Handoff Disposition APIs

Purpose: record Fulfillment/Returns disposition for Order Routing handoff requests.

Proposal-level operations:

- Receive/inspect handoff request reference.
- Record accepted, rejected, ignored, duplicate-blocked, or review-required disposition.
- Lookup disposition by handoff request, routed suborder, routing snapshot, or vendor.
- Record Fulfillment/Returns disposition source version.

Required references include Order Routing handoff request reference, routed suborder reference, routing snapshot reference, source version, vendor reference, buyer/entity reference, idempotency key, and audit reference.

### Vendor Fulfillment Import APIs

Purpose: validate and apply vendor fulfillment updates through file/manual/API workflows.

Proposal-level operations:

- Create vendor fulfillment import job.
- Upload/import fulfillment file or payload reference.
- Validate headers.
- Validate locked fields and editable fulfillment fields.
- Validate rows and produce preview.
- Confirm import preview.
- Apply confirmed import.
- Lookup import job, row results, counts, correction/reupload references, and downloadable error report placeholder.
- Lookup applied/ignored/rejected/superseded Shipment Line Evidence created from import rows.

These APIs follow `architecture/standards/import-export-validation-governance.md` and must support update-only protection, preview before apply, confirmation before mutation, blank field protection, and text identifier preservation.

### Shipment Line Evidence APIs

Purpose: expose per-routed-suborder-line and per-shipment-line operational evidence.

Proposal-level operations:

- Record shipment line evidence from an accepted import row, API update, manual update, or reviewed correction.
- Lookup shipment line evidence by routed suborder, routed suborder line, shipment, package id, shipment line id, import job, import row, source export batch item, SKU, UPC, or tracking reference.
- Record shipment line duplicate row blocked.
- Record shipment line conflict/review-required state.
- Record partial shipment evidence.
- Supersede shipment line evidence.

Shipment line evidence APIs must preserve expected quantity, shipped quantity, delivered quantity, package membership, source import row reference, duplicate prevention key, applied-vs-ignored state, stale/duplicate/out-of-order state, and supersession reference. They must not alter Order Routing decisions.

### Shipment And Tracking APIs

Purpose: create and update operational shipment evidence after accepted handoff disposition.

Proposal-level operations:

- Create shipment from accepted fulfillment execution.
- Record shipment evidence.
- Validate tracking evidence.
- Create or supersede tracking reference.
- Update shipment status from validated evidence.
- Lookup shipment, shipment line evidence, shipment evidence, tracking reference, shipment status history, package placeholder, and partial shipment state.

Tracking APIs should validate USPS, UPS, FedEx, DHL, and Other carrier placeholders, required carrier/tracking rules, unsafe URL review, duplicate tracking handling, and carrier/provider evidence references where available.

### Vendor Return Export APIs

Purpose: generate and inspect operational return export workflow records.

Proposal-level operations:

- Create return export eligibility record.
- Validate return authorization/RAN source version and freshness before export.
- Block stale, closed, superseded, unauthorized, or mismatched return export eligibility.
- Create return export batch.
- Include/exclude return export batch item.
- Create buyer/retailer split reference.
- Request return re-export.
- Record manual download workflow reference.
- Lookup return export status and batch/item disposition.

APIs return workflow/content references only. Logs & Audit owns immutable file/export/download evidence. Integration Management or Notification Platform Service owns delivery depending on transport.

### Vendor Return Import APIs

Purpose: validate and apply vendor return processing updates.

Proposal-level operations:

- Create vendor return import job.
- Upload/import return file or payload reference.
- Validate headers.
- Validate locked return fields and editable return fields.
- Validate RAN and return matching.
- Validate return chronology, condition, and return line quantities.
- Produce preview.
- Confirm import preview.
- Apply confirmed import.
- Lookup row results, RAN validation failures, return quantity reconciliation failures, correction/reupload references, and downloadable error report placeholder.
- Lookup applied/ignored/rejected/superseded Return Line Disposition Evidence created from import rows.

Return imports must not decide refund, credit, invoice adjustment, payment, warranty claim approval, or financial finality.

### Return Line Disposition APIs

Purpose: record and inspect per-return-line operational disposition evidence.

Proposal-level operations:

- Record return line disposition evidence.
- Record partial return disposition evidence.
- Record duplicate return line row blocked.
- Record return quantity reconciliation failed.
- Supersede return line disposition evidence.
- Lookup return line disposition evidence by RAN, return line, source return request, source export batch item, import job, import row, SKU, UPC, or vendor.

Return line disposition APIs must preserve expected, received, accepted, rejected, and partially accepted quantities; vendor operational disposition; reasons; condition; vendor notes; vendor refund/adjustment evidence reference; source timestamps; duplicate prevention key; applied-vs-ignored state; stale/duplicate/out-of-order state; review state; and supersession reference.

### Return Disposition APIs

Purpose: record operational return disposition summaries and vendor-provided refund/adjustment evidence references.

Proposal-level operations:

- Record received-by-vendor evidence.
- Record operationally accepted/rejected/partially accepted evidence.
- Record return condition evidence.
- Record vendor notes evidence.
- Record rejected reason or partial acceptance/refund reason.
- Record vendor-provided refund/adjustment evidence reference.
- Lookup return operational status and financial-adjacent evidence references.

Summary return disposition should reference line-level disposition evidence where quantities differ by SKU/UPC or partial quantity. Return refunded amount is vendor-provided refund/adjustment evidence, not final refund execution.

### Buyer Update Signal APIs

Purpose: expose workflow references that a shipment or return update is ready for buyer transport.

Proposal-level operations:

- Mark shipment update ready for buyer transport.
- Mark return update ready for buyer transport.
- Record shipment update transport failed reference.
- Record return update transport failed reference.
- Lookup buyer-update-ready state by shipment, return, shipment line evidence, return line disposition evidence, buyer/entity, or vendor.

Integration Management owns transport/delivery evidence and retries. Notification Platform Service owns user notification delivery.

### Exception And Review APIs

Purpose: manage operational exception and review state.

Proposal-level operations:

- List fulfillment/return exceptions.
- Record review action.
- Hold execution or import apply.
- Retry validation/apply/status update where retry budget allows.
- Mark exception resolved.
- Escalate exception.
- Dead-letter repeated failure.

## Required Input References

Where applicable, API requests should carry:

- Correlation id.
- Idempotency key.
- Tenant scope reference.
- Vendor reference.
- Buyer/entity reference.
- Parent order reference.
- Routed suborder reference.
- Routed suborder line reference where available.
- Routing snapshot reference.
- Order Routing handoff request reference.
- Source export batch/item reference.
- Return export batch/item reference.
- Order line references.
- Return line references.
- Source return request/reference.
- RAN reference.
- Product Catalog reference.
- Device Reference where relevant.
- Product Type reference.
- Pricing snapshot reference.
- Source system.
- Source event/version.
- Source timestamp.
- Received timestamp.
- Redaction class.
- Audit reference.

## Output Contracts

API responses should return references and operational state, not full upstream records.

Responses may include:

- Handoff disposition state.
- Fulfillment execution status.
- Import job status, validation status, preview status, confirmation status, and row counts.
- Row-level validation result and error/warning/review-required summaries.
- Shipment line evidence reference, disposition, quantities, duplicate state, and review state.
- Shipment status, tracking reference, shipment evidence reference, and status history reference.
- Return export eligibility, export batch, export batch item, stale authorization state, and manual download workflow references.
- RAN validation result.
- Return line disposition evidence reference, quantities, duplicate state, reconciliation state, and review state.
- Return operational disposition summary and vendor refund/adjustment evidence reference.
- Buyer update ready-for-transport references.
- Exception family, severity, retryability, priority class, and review state.
- Audit reference.
- Redaction class.

## Idempotency Rules

Idempotency is required for:

- Fulfillment handoff disposition.
- Vendor fulfillment import job creation, validation, confirmation, and apply.
- Fulfillment import row application.
- Shipment line evidence creation/supersession.
- Shipment line duplicate row blocked records.
- Shipment evidence creation.
- Tracking reference creation/supersession.
- Shipment status updates.
- Return export eligibility and batch item inclusion.
- Return import job creation, validation, confirmation, and apply.
- RAN validation result recording.
- Return line disposition evidence creation/supersession.
- Return quantity reconciliation failure records.
- Vendor return disposition evidence recording.
- Vendor refund/adjustment evidence reference recording.
- Buyer update ready-for-transport signal creation.
- Exception retry and dead-letter operations.

Dedupe dimensions should include tenant scope, vendor, buyer/entity, routed suborder, routed suborder line, source export batch/item, return export batch/item, RAN, return line, SKU/UPC, shipment, shipment line, package id, tracking number, source event id/version, operation type, and idempotency key.

## Error Models

Proposal-level error families:

- Invalid handoff request reference.
- Duplicate handoff blocked.
- Handoff source version stale.
- Fulfillment import header invalid.
- Fulfillment import locked field changed.
- Fulfillment import update-only match missing or ambiguous.
- Fulfillment import source export batch/item mismatch.
- Suborder not found or wrong vendor.
- Routed suborder line not found.
- SKU/UPC mismatch.
- Quantity mismatch.
- Shipment line quantity exceeds expected.
- Delivered quantity exceeds shipped quantity.
- Duplicate fulfillment row.
- Shipment line conflict detected.
- Invalid shipped date or delivered date.
- Delivered date before shipped date.
- Carrier required.
- Tracking number required.
- Tracking URL unsafe or malformed.
- Return export eligibility conflict.
- Return export stale authorization blocked.
- Return export closed or superseded return blocked.
- Return import header invalid.
- Return import locked field changed.
- RAN missing, unknown, wrong vendor, stale, closed, superseded, or duplicate.
- Return source export batch/item mismatch.
- Return line not found.
- Return quantity mismatch.
- Return quantity reconciliation failed.
- Duplicate RAN + SKU/UPC row.
- Return received date invalid or before initiation date.
- Vendor refund evidence out of scope for final financial decision.
- Permission denied.
- Retry budget exhausted.

## Consumer-Specific Payload Boundaries

- Order Routing may receive Fulfillment disposition references and rejection/review signals, but not shipment internals that imply rerouting.
- Integration Management may receive buyer-update-ready references and source-module disposition references, but owns transport/delivery evidence.
- Notification Platform Service may receive notification trigger references, but owns recipient/template/delivery behavior.
- Logs & Audit may receive audit/file/import/export evidence references and summaries, but owns immutable evidence.
- Pricing may receive vendor refund/adjustment evidence references for pricing interpretation; Fulfillment does not calculate adjustment pricing.
- Invoice Management may receive shipment line delivered evidence, delivery, return line disposition evidence, and vendor refund/adjustment evidence references; Fulfillment does not apply invoice/refund/credit lifecycle.
- Analytics may consume operational facts without metric ownership.
- AI Agent Services may consume review/risk signals without mutation authority.

## Open Questions

- Which APIs are internal-only versus vendor/buyer-facing?
- Which vendor fulfillment and return schemas are supported at launch?
- Which external API/webhook updates arrive through Integration Management versus direct internal service calls?
- Which response fields require stronger redaction for tracking, customer, pricing, return, and tenant-sensitive data?

## Vendor Fulfillment Response SLA — API Contract Placeholders (PR-A)

PR-A introduces architecture-level **read-only API contract placeholders** for the SLA evaluation surface. These are placeholder sections — they declare *what* read surfaces will exist and *what* they will return at architecture level, **without** finalized API implementations, OpenAPI schemas, concrete URL paths, or runtime endpoint behavior.

Finalized API implementations and OpenAPI schemas are deferred to a future Fulfillment / Returns contracts-PR or to module-specific implementation work. No mutating endpoints are introduced by PR-A.

### Section A — SLA Policy Lookup

**Purpose:** Read Vendor Fulfillment Response SLA Policy configuration for a given vendor / route, including the currently active Policy version and (optionally) the version history.

**Read surface shape (architecture-level):**

- Lookup by `(vendor_reference, route_reference)` returns the currently `active` Policy version with all configuration fields (`timezone_reference`, `same_day_cutoff_time`, `same_day_response_deadline_time`, `next_business_day_response_deadline_time`, `business_calendar_reference`, `sla_clock_start_basis`, `complete_response_definition`, `override_allowed`).
- Lookup by `sla_policy_id` returns the canonical Policy and optionally lists all versions (active, superseded, retired).
- Lookup by `sla_policy_id + sla_policy_version` returns a specific version.

**Consumer scope:**

- CIXCI System Admin (SLA Configuration Authority): full read.
- Vendor users: **not granted** in Phase 1.
- Future consumers (Analytics / Reporting, dashboards): scoped by tenant.

**Boundary discipline:**

- This is a **read-only** surface. SLA Policy creation, edit, and retirement are not exposed via PR-A APIs; they are Workflow 1 actions invoked through Fulfillment / Returns admin tooling per existing Fulfillment / Returns admin surfaces.

### Section B — SLA Evaluation Record Lookup

**Purpose:** Read SLA Evaluation Records for SLA evaluation, audit, operational review, and downstream analytics aggregation. **This is the primary read surface that future Cross-Module Summary Email PR aggregation and future Analytics / Reporting consumption will use.**

**Read surface shape (architecture-level):**

- Lookup by `sla_evaluation_id` returns the canonical record (suborder reference, source Vendor Export Delivery Evidence reference, Policy version reference, `delivery_confirmation_timestamp`, `expected_fulfillment_response_deadline`, `outcome`, `outcome_history`, Exception references, `sla_reporting_reference`).
- Lookup by `suborder_reference` returns all SLA Evaluation Records for the suborder (typically one per confirmed Vendor Export Delivery Evidence consumed).
- Possible bulk lookup by `vendor_reference + time range` for analytics aggregation backfill.
- Possible lookup by `sla_reporting_reference` for downstream consumer identification.

**Consumer scope:**

- CIXCI System Admin: full read.
- Vendor users: **not granted** in Phase 1.
- Future Analytics / Reporting: read access subject to `tenant_scoped` consumer scope.
- Future Cross-Module Summary Email PR consumer: read access subject to `tenant_scoped` consumer scope.

**Boundary discipline:**

- Read-only.
- Consumers must not infer that "no SLA Evaluation Record exists for this suborder" means "no SLA applies." Some suborders may legitimately have no Evaluation Record (e.g., the source Vendor Export Delivery Evidence is in non-`confirmed` state and Boundary/Handoff PR has not yet contracted the consumption rule).

### Section C — Late Fulfillment Import Exception Lookup

**Purpose:** Read Late Fulfillment Import Exception records for operational review, analytics, and audit.

**Read surface shape (architecture-level):**

- Lookup by `late_fulfillment_import_exception_id` returns the canonical record (parent SLA Evaluation reference, suborder reference, late Fulfillment Import reference, `expected_deadline_at_creation`, `received_at_creation`, `delay_duration`, current SLA Breach Review State, state transition history, audit references).
- Lookup by `sla_evaluation_reference` returns all Late Exceptions for the Evaluation Record.
- Lookup by `suborder_reference` returns all Late Exceptions for the suborder.
- Filter / search by Review State for operational dashboards.

**Consumer scope:** same as SLA Evaluation Record Lookup.

**Boundary discipline:** read-only.

### Section D — Missing Fulfillment Import Exception Lookup

**Purpose:** Read Missing Fulfillment Import Exception records.

**Read surface shape (architecture-level):**

- Lookup by `missing_fulfillment_import_exception_id` returns the canonical record (parent SLA Evaluation reference, suborder reference, `expected_deadline_at_creation`, `detected_at`, current Review State, state transition history, audit references).
- Lookup by `sla_evaluation_reference` returns at most one Missing Exception per Evaluation Record (a Missing closed because a late import arrived remains retrievable for audit but is `closed`).
- Lookup by `suborder_reference` returns all Missing Exceptions for the suborder.
- Filter / search by Review State.

**Consumer scope:** same.

**Boundary discipline:** read-only.

### Section E — Partial Fulfillment Response Exception Lookup

**Purpose:** Read Partial Fulfillment Response Exception records.

**Read surface shape (architecture-level):**

- Lookup by `partial_fulfillment_response_exception_id` returns the canonical record (parent SLA Evaluation reference, suborder reference, partial Fulfillment Import references, `expected_deadline_at_creation`, `received_at_creation`, `lines_covered_at_creation`, `lines_missing_at_creation`, current Review State, state transition history, audit references).
- Lookup by `sla_evaluation_reference` returns all Partial Exceptions for the Evaluation Record (multiple permitted).
- Lookup by `suborder_reference`.
- Filter / search by Review State.

**Consumer scope:** same.

**Boundary discipline:** read-only.

### Section F — SLA Override / Excuse Evidence Lookup

**Purpose:** Read SLA Override / Excuse Evidence records for audit and operational review.

**Read surface shape (architecture-level):**

- Lookup by `sla_override_excuse_evidence_id` returns the canonical record (affected Exception reference, actor reference, timestamp, reason category, reason text, supporting evidence reference, audit reference). **Immutable**; no edit endpoint exists.
- Lookup by `affected_exception_reference` returns all Override Evidence records for the Exception (including any reversing records).
- Lookup by `actor_reference` returns all Override Evidence records produced by the actor (for audit and review).
- Lookup may surface the chain of original + reversing records as a list with ordering by `created_at`.

**Consumer scope:**

- CIXCI System Admin: full read.
- Vendor users: **not granted.**
- Future Analytics / Reporting / Cross-Module: read for audit context.

**Boundary discipline:**

- Read-only.
- No edit endpoint. Reversal is performed by Workflow 10 (Override Evidence) creating a new reversing record, not by editing an existing record.

### Section G — SLA Breach Signal — no API surface

The SLA Breach Signal (event `fulfillment-returns.sla-breach.signaled`) is an event-level concept, not an API surface. PR-A does not expose a "signal lookup" endpoint. Consumers subscribe to the event family per `event-contracts.md`. The Exception entities themselves (Sections C, D, E above) are the persistent records.

### What PR-A does NOT introduce in api-contracts.md

- **No mutating endpoints.** PR-A's API surface is read-only.
- **No OpenAPI schemas.** PR-A does not contract API at OpenAPI level. `modules/fulfillment-returns/openapi-contracts.md` is not modified.
- **No concrete URL paths or HTTP methods.** Architecture-level only.
- **No webhook / outbound integration endpoints.** Notification routing, summary email delivery, analytics consumption are not API surfaces in PR-A.
- **No vendor-facing API endpoints.** Vendors do not access SLA evaluation surfaces in Phase 1.
- **No buyer-facing API endpoints.** Buyer update hardening is Fulfillment / Returns PR-B.
- **No bulk write or import endpoints.** SLA Policy, Evaluation Record, Exception, and Override Evidence creation are governed by Workflows 1, 2, 5–10, not by bulk-import APIs.
- **No acknowledgement endpoint.** Per Order Routing PR-A precedent: PR-A does not introduce an "ack" endpoint that consumers call to mark an event as processed. Consumer-side idempotency is the consumer's concern.
- **No rate-limit, pagination, or filter contract specifics.** Architecture-level only; specifics are implementation territory.
## Delivery Date and Buyer Update API Placeholders (PR-B)

PR-B introduces architecture-level read-only lookup placeholders for the new entities and states. These placeholders are not finalized HTTP endpoints; they are scope markers indicating where future API Governance Foundation work will introduce concrete endpoint definitions. OpenAPI schemas, route paths, request / response payload shapes, authentication mechanics, pagination, and filter semantics are deferred to that future PR.

Each placeholder below names the lookup purpose, the entity surface, and the boundary discipline.

### Delivery Date Evidence lookup (read-only placeholder)

- **Purpose:** allow operator / System Admin surfaces to look up Delivery Date Evidence records by Shipment Line, by parent order, by Tenant Company / vendor scope, by validation outcome, or by source Fulfillment Import.
- **Surface:** Delivery Date Evidence entity (PR-B data-model section).
- **Read-only:** placeholder does not introduce write operations. Delivery Date Evidence records are created and transitioned by Workflows 1, 2, and 6; not via API.
- **Out of scope for PR-B:** concrete route, payload shape, pagination strategy, filter parameter set, authentication, OpenAPI definition.

### Buyer Update-Ready Signal lookup (read-only placeholder)

- **Purpose:** allow operator / System Admin surfaces to look up Buyer Update-Ready Signal records by parent order, by Tenant Company / buyer scope, by `update_kind`, by lifecycle state, or by hold reason.
- **Surface:** Buyer Update-Ready Signal entity (PR-B data-model section).
- **Read-only:** placeholder does not introduce write operations. Signal records are created and transitioned by Workflows 7-12; not via API. Manual hold and manual release actions are authority-gated System Admin operations and are not introduced as API endpoints in PR-B (future authority-gated operator surface PR).
- **Out of scope for PR-B:** concrete route, payload shape, pagination, filters, authentication, OpenAPI.

### Delivery Date Correction Evidence lookup (read-only placeholder)

- **Purpose:** allow operator / System Admin surfaces to look up Delivery Date Correction Evidence records by Shipment Line, by parent order, by actor, by lifecycle state (`proposed`, `applied`, `rejected`), or by failure mode.
- **Surface:** Delivery Date Correction Evidence entity (PR-B data-model section).
- **Read-only:** placeholder does not introduce write operations. Correction submission is itself a System Admin authority-gated operation; PR-B does not introduce the submission API endpoint, only the placeholder for the lookup side.
- **Out of scope for PR-B:** correction submission endpoint, concrete lookup route, payload shape, authentication, OpenAPI.

### Buyer Update Hold / Suppression lookup (read-only placeholder)

- **Purpose:** allow operator / System Admin surfaces to look up Buyer Update-Ready Signal records currently in `held` states, filtered by hold reason, by Tenant Company / buyer scope, by parent order, or by age.
- **Surface:** Buyer Update-Ready Signal entity, specifically the suppression / hold state field.
- **Read-only:** placeholder does not introduce write operations.
- **Out of scope for PR-B:** concrete route, payload shape, age filter semantics, hold-state aggregation, authentication, OpenAPI.

### Buyer Update Dispatch / Acknowledgement / Failure Reference lookup (read-only placeholder)

- **Purpose:** allow operator / System Admin surfaces to trace a Buyer Update-Ready Signal through its dispatch attempt, acknowledgement, and failure reference chain. The placeholder is on the Fulfillment / Returns side; the referenced records themselves are Integration Management-owned and Integration Management's own API governance work covers them.
- **Surface:** Buyer Update-Ready Signal entity, specifically the `buyer_update_dispatch_reference`, `buyer_update_acknowledgement_reference`, and `buyer_update_failure_reference` fields.
- **Read-only:** placeholder does not introduce write operations. The references are captured by Workflows 10 and 12; the underlying Integration Management records are not modified by Fulfillment / Returns.
- **Out of scope for PR-B:** concrete route, the structure of the cross-module reference resolution, Integration Management endpoint definitions, authentication, OpenAPI.

---

### Discipline reaffirmed

PR-B explicitly does not introduce in api-contracts.md:

- OpenAPI schemas of any kind.
- Concrete HTTP route paths.
- Finalized request / response payload structures.
- Authentication mechanics.
- Pagination, sorting, or filtering semantics.
- Webhook / callback / push API definitions.
- Vendor-facing API endpoints for Delivery Date submission (the existing Fulfillment Import path remains the vendor-side surface; PR-B does not introduce a new vendor API).
- Buyer-facing API endpoints (buyer-side surface is owned by Integration Management buyer integration profile work, not PR-B).

These remain deferred to the API Governance Foundation PR (planned per the project sequencing reminder), followed by per-module OpenAPI hardening.
