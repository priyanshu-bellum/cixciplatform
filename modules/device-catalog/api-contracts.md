# Device Catalog API Contracts

## Public APIs

- Placeholder: device search/list API for authorized buyer, admin, or integration consumers.
- Placeholder: device detail API returning canonical device data and Device Reference metadata.
- Placeholder: buyer device export/download API for authorized buyer scopes.
- Placeholder: buyer device portfolio reference API for linking buyer scope to Device References.
- Placeholder: future manufacturer or integration device import API, not enabled as self-service in Phase 1.

## Internal APIs

- Placeholder: Phase 1 System Admin-only CSV import submission API or internal action.
- Placeholder: Phase 1 CSV header validation and row-level validation result API for operations review.
- Placeholder: Phase 1 import correction API for System Admin or authorized operations correction workflow.
- Placeholder: Phase 1 import job log and audit lookup API.
- Placeholder: Device Reference lookup API for Product Catalog compatibility mappings.
- Placeholder: device normalization and identifier lookup API for internal services.
- Placeholder: device lifecycle lookup API for Product Catalog, Pricing, Order Routing, Fulfillment, Analytics, and future Procurement references.
- Placeholder: import status and failed-record review API for operations.
- Placeholder: export status API for buyer-facing modules.

## Feature Evidence Contracts and Signals - API Contract Placeholders (PR-C)

PR-C introduces architecture-level API contract placeholders for five concerns. These placeholders describe **read-only / lookup-only** surfaces; no PR-C API mutates feature truth. Feature truth mutation surfaces are PR-B workflow territory and are not exposed as standalone APIs in PR-C.

PR-C does **not** introduce:

- OpenAPI schemas.
- Runtime endpoint implementations.
- Concrete URL paths unless already required by existing Device Catalog API style.
- Request / response payload schemas beyond reference-level shape notes.
- Authentication / authorization implementation (referenced via Tenant Company `check_access` per PR-A boundary).
- Rate limiting, pagination, version negotiation (transport-layer / Integration Management concerns).

PR-C placeholders describe **what** the API surfaces are, **who** consumes them, **what redaction class** applies, and **what the response references** - not implementation. Implementation lives in code; PR-C is architecture-level.

Authority and scope evidence for every PR-C API:

- Per-call authority check via Tenant Company `check_access` per PR-A `permissions.md` and `boundary-contracts.md`.
- Scope evidence depends on consumer (CIXCI System Admin internal use; Product Catalog read-only authorized consumer; other downstream modules as authorized).
- API responses respect redaction class per `event-contracts.md` PR-C section (most PR-C APIs are `internal`; placeholders that would surface buyer-scoped content are not in scope for PR-C).

---

### Placeholder 1 - Feature taxonomy lookup

**Concern:** Read-only lookup of the controlled feature taxonomy (Feature Groups, Feature Values, Device Capability Profiles).

**Sub-surfaces (architecture-level):**

#### 1a - Feature Group lookup

- **Purpose:** Retrieve Feature Group records by reference, by key, or by lifecycle state.
- **Consumers:** CIXCI System Admin tooling; Product Catalog (read-only consumer); other authorized internal modules.
- **Response shape (architecture-level):** Feature Group reference, `feature_group_key`, `display_label`, `value_structure_kind`, `lifecycle_state`, `version`, `source_hash`, `superseded_by` (when applicable), audit references.
- **Redaction class:** `internal`.
- **Read-only:** Yes. Mutation via Feature Taxonomy Authority workflows per PR-B; no PR-C API path for mutation.

#### 1b - Feature Value lookup

- **Purpose:** Retrieve Feature Value records within a Feature Group, by reference, by key, or by lifecycle state. May support cross-Feature-Group lookup by canonical Feature Value reference.
- **Consumers:** As 1a.
- **Response shape:** Feature Value reference, parent Feature Group reference, `feature_value_key`, `display_label`, `lifecycle_state`, `version`, `source_hash`, `superseded_by` (when applicable), audit references.
- **Redaction class:** `internal`.
- **Read-only:** Yes.

#### 1c - Device Capability Profile lookup

- **Purpose:** Retrieve Device Capability Profile records by Device Type reference. Returns the per-Feature-Group applicability map (`required`, `optional`, `unsupported`, `review_required`).
- **Consumers:** CIXCI System Admin tooling; Product Catalog (read-only - to determine which Feature Groups are required for a given Device Type for consumer-side filtering logic, though Product Catalog filtering itself is downstream interpretation per PR-A boundary); other authorized internal modules.
- **Response shape:** Device Capability Profile reference, Device Type reference, `version`, `source_hash`, applicability entries (Feature Group reference + applicability class), audit references.
- **Redaction class:** `internal`.
- **Read-only:** Yes. Profile content (the actual required-features-by-Device-Type mapping per PR-A OQ 1 deferral) is read here when populated; absent populated content, the response indicates "no applicable Profile rule" per PR-B workflows.

---

### Placeholder 2 - Device Capability Evidence retrieval

**Concern:** Read-only retrieval of the consumer-facing view of feature evidence per Device.

**Sub-surfaces:**

#### 2a - Retrieve by Device Reference

- **Purpose:** Retrieve current Device Capability Evidence for a single Device by Device Reference.
- **Consumers:** Product Catalog (primary read consumer); other authorized internal modules.
- **Response shape:** Device reference, `canonicalDeviceId`, Device Capability Evidence reference, per-Feature-Group entries (Feature Group reference, applicability, `assignment_status`, current Feature Value references, assignment reference, `freshness_state`), `evidence_generated_at`, evidence source versions (Profile version, Feature Group versions, Feature Value versions), Data Quality Exception references (if affecting evidence), audit references.
- **Redaction class:** `internal`. The endpoint may return evidence for any Device the caller is authorized to read; tenant scope (which Devices a caller may read) is enforced by Tenant Company `check_access`.
- **Read-only:** Yes.

#### 2b - Retrieve by canonical Device ID

- **Purpose:** Same as 2a but by canonical Device ID rather than Device Reference. Both identifiers may be used; PR-C does not specify which is canonical for which consumer.
- **Consumers:** As 2a.
- **Response shape:** As 2a.
- **Redaction class:** `internal`.
- **Read-only:** Yes.

#### 2c - Possible bulk lookup

- **Purpose:** Architecture-level placeholder for bulk Device Capability Evidence retrieval (e.g., Product Catalog requests evidence for a batch of Devices it filters against). PR-C does not specify batch size limits, response shape, pagination, or streaming semantics - those are implementation / Integration Management concerns.
- **Consumers:** Product Catalog (anticipated primary use case); other authorized internal modules.
- **Response shape:** Per-Device evidence entries, plus batch-level metadata (request ID, audit reference). Specific payload shape deferred.
- **Redaction class:** `internal`.
- **Read-only:** Yes.

---

### Placeholder 3 - Device Feature Assignment lookup

**Concern:** Read-only lookup of Device Feature Assignment records.

**Sub-surfaces:**

#### 3a - Internal / admin lookup

- **Purpose:** Retrieve Device Feature Assignment records for administrative review (e.g., System Admin reviewing assignment history for a Device; reviewing assignments produced by a specific import job).
- **Consumers:** CIXCI System Admin tooling; observability / audit consumers.
- **Response shape:** Device Feature Assignment reference, Device reference, Feature Group reference, Feature Value references, `assignment_source`, source reference (CSV import job ID, admin action ID, Compatibility Marker ID), version references, `lifecycle_state` (`active`, `superseded`, `withdrawn`), audit references.
- **Redaction class:** `internal`.
- **Read-only:** Yes.

#### 3b - Authorized downstream read-only use

- **Purpose:** Allow authorized downstream consumers (notably Product Catalog) to retrieve assignment records when evidence-level retrieval (Placeholder 2) is insufficient and direct assignment-level visibility is required.
- **Consumers:** Product Catalog; other authorized internal modules.
- **Response shape:** As 3a, with redaction of any internal-only fields (e.g., raw Compatibility Marker reference is omitted; only the existence of marker provenance is surfaced - consumers do not read raw markers per PR-A boundary).
- **Redaction class:** `internal`.
- **Read-only:** Yes.

**Compatibility Marker exposure rule:** Device Feature Assignment lookup never returns raw Compatibility Marker content. Markers are Device Catalog-internal ingestion artifacts (per PR-A and PR-B). The response may include a marker reference identifier where applicable (so audit consumers can correlate), but the raw value, source CSV cell content, or unnormalized form is **not** in the response.

---

### Placeholder 4 - Data Quality Exception lookup

**Concern:** Read-only lookup of Data Quality Exception records.

**Sub-surfaces:**

#### 4a - System Admin review

- **Purpose:** Retrieve Data Quality Exceptions for System Admin review - filtered by `exceptionCategory`, by `lifecycle_state`, by affected Device, by source import job, by affected Feature Group / Feature Value.
- **Consumers:** CIXCI System Admin tooling.
- **Response shape:** Data Quality Exception reference, `exceptionCategory`, subject references (Device, Feature Group, Feature Value, Compatibility Marker, Device Feature Assignment, Device Capability Evidence, import job, import row - as applicable), `lifecycle_state`, history (correction action history per PR-B Workflow 4 - appended history entries, not lifecycle states), references to override audit when applicable, audit references.
- **Redaction class:** `internal`.
- **Read-only:** Yes. Lifecycle transitions are PR-B workflow surfaces, not API surfaces; the lookup API returns state but does not transition it.

#### 4b - Downstream read-only references where authorized

- **Purpose:** Allow authorized downstream consumers (notably Product Catalog) to read Data Quality Exception references when evidence-level retrieval (Placeholder 2) indicates exceptions are affecting evidence. Surface is reference-only - the downstream consumer reads the existence and category of the exception, not full history or correction details.
- **Consumers:** Product Catalog (read-only); other authorized internal modules.
- **Response shape:** Data Quality Exception reference, `exceptionCategory`, `lifecycle_state`, affected Device reference. History, override audit details, and correction context are not in the downstream response; they remain System Admin scope.
- **Redaction class:** `internal`.
- **Read-only:** Yes. Product Catalog uses this to decide whether to filter or surface the affected Device differently; Product Catalog does not transition exception state via this API.

---

### Placeholder 5 - Compatibility-impacting review signal read model / acknowledgement

**Concern:** Architecture-level read model for the compatibility-impacting review signal. Acknowledgement is described at architecture level; PR-C does not expose a command-style acknowledgement endpoint.

**Sub-surfaces:**

#### 5a - Signal read model

- **Purpose:** Retrieve historical or current compatibility-impacting review signals that have been raised for a Device or set of Devices. Useful for Product Catalog reconciliation (e.g., "what signals affected this Device in the last 24 hours?") and for observability / audit.
- **Consumers:** Product Catalog (primary); CIXCI System Admin tooling; observability / audit.
- **Response shape:** Per-signal entries with the minimum shape per `event-contracts.md` PR-C section - Device reference, Device Capability Evidence reference, changed Feature Group / Feature Value references, `categoricalDelta`, `changeReasonReference`, Data Quality Exception references (if present), `consumerActionHint`, audit references, `redactionClass`.
- **Redaction class:** `internal`.
- **Read-only:** Yes.

#### 5b - Acknowledgement (architecture-level only)

- **Purpose:** Acknowledgement is **transport-layer** behavior owned by Integration Management. PR-C describes the architecture-level expectations only.
- **Architecture-level rules:**
  - Device Catalog **does not expose a command-style acknowledgement endpoint** in its API surface. There is no PR-C `api-contracts.md` placeholder for "Product Catalog tells Device Catalog it has consumed the signal."
  - Acknowledgement, if implemented at the broker / Integration Management layer, is consumed by the broker - not by Device Catalog. The broker uses acknowledgement to remove the message from the consumer's queue.
  - Product Catalog acknowledgement does **not** tell Device Catalog what Product Catalog will do downstream. Product Catalog's downstream decisions are Product Catalog's internal state, not Device Catalog's.
  - Acknowledgement does **not command Device Catalog behavior**. Device Catalog does not branch logic on whether a consumer has acknowledged a signal.
- **No PR-C API:** This placeholder records the architecture-level rule; it does not contract a Device-Catalog-side acknowledgement API. If a future PR introduces broker-level acknowledgement mechanics, that is Integration Management's territory.

---

## Cross-references

- Event names referenced from API descriptions: see `events.md` PR-C section.
- Event contract shape (required fields, reference-first discipline, redaction class enumeration, idempotency / replay / failure handling, consumer responsibilities): see `event-contracts.md` PR-C section.
- Compatibility-impacting review signal concept, trigger rules, consumer-safety determination: see `workflows.md` (PR-B) Workflow 6 and `boundary-contracts.md` (PR-B).
- Authority for entity mutation (not exposed as PR-C APIs): see `permissions.md` (PR-A and PR-B) Feature Taxonomy Authority and Device Feature Assignment / Correction Authority.

## What PR-C `api-contracts.md` does NOT do

- Does not introduce OpenAPI schemas. `modules/device-catalog/openapi-contracts.md` is not modified by PR-C.
- Does not specify URL paths unless already required by existing Device Catalog API style elsewhere in this file.
- Does not specify request payload shapes, query parameter syntax, response envelope structure, error model error code names, or HTTP status code conventions.
- Does not contract authentication mechanism (delegated to platform standard).
- Does not contract authorization beyond noting that every API surface consults Tenant Company `check_access`.
- Does not contract rate limiting, pagination semantics, batch size limits, streaming behavior, or version negotiation.
- Does not contract API versioning scheme (delegated to platform standard).
- Does not contract acknowledgement endpoint or mechanism (intentionally; see Placeholder 5b).
- Does not enable Product Catalog mutation of Device Catalog state via any PR-C API.
- Does not expose raw Compatibility Marker content via any PR-C API.
- Does not expose buyer-portfolio data via any PR-C API (PR-C APIs are `internal` redaction class; buyer-scoped surfaces are not in PR-C scope).
- Does not expose tenant-specific eligibility content beyond what `check_access` enforces at the call boundary.

## Request/Response Models

- Device summary response placeholder.
- Device detail response placeholder.
- Device Reference response placeholder.
- Device identifier and alias response placeholder.
- Device lifecycle response placeholder.
- Buyer export request/response placeholder.
- Buyer device portfolio reference request/response placeholder.
- Device import request/response placeholder.
- Phase 1 CSV import job request/response placeholder.
- Phase 1 CSV validation error response placeholder.
- Phase 1 import correction request/response placeholder.

## Phase 1 CSV Import Contract Notes

- Only System Admin actors can submit Phase 1 CSV imports.
- Import mode must be either Import New Devices or Update Existing Devices.
- CSV headers must exactly match the expected field names and order: Manufacturer, Device Model, Device Type, Launch Date, Storage Variants, Connectivity, Charger Type, Feature Group, Compatibility Markers.
- Header validation should reject missing fields, extra fields, duplicate fields, misspelled fields, and incorrectly ordered fields before row processing.
- Row validation should reject missing required values, unrecognized manufacturer, uncontrolled Device Type, invalid Launch Date, duplicate device in new mode, missing device in update mode, ambiguous match, and missing compatibility-preparation fields.
- Device uniqueness matching uses Manufacturer + Device Model + Device Type with case-insensitive matching.
- Phase 1 import contracts must not require public image URL fields.
- Import responses should return job id, mode, actor reference, validation status, row counts, created/updated/rejected counts, correction-required counts, log reference, and audit reference.

## Versioning

- APIs should be versioned where needed, consistent with platform integration principles.
- Placeholder: define compatibility guarantees for Device Reference lookup APIs because downstream modules may store references.
- Placeholder: define when canonical device field changes require a new API version or event schema version.
- Placeholder: define buyer export contract versioning for buyer-controlled channels.
- Placeholder: define CSV template versioning for Phase 1 and future import phases.

## Error Handling

- Placeholder: validation error model for malformed device records.
- Placeholder: header validation error model for exact field, exact order, missing field, extra field, duplicate field, and template version failures.
- Placeholder: row validation error model for required field, recognized manufacturer, controlled Device Type, valid Launch Date, uniqueness/matching, and compatibility-preparation failures.
- Placeholder: duplicate, merge, split, alias, or identifier conflict error model.
- Placeholder: unauthorized or forbidden tenant/buyer export error model.
- Placeholder: unauthorized import actor error model for non-System Admin Phase 1 import attempts.
- Placeholder: unknown, retired, merged, or unavailable Device Reference error model.
- Placeholder: import retry, partial failure, correction, or manual review error model.
- Placeholder: downstream dependency unavailable error model.

## Boundary Notes

- Device Catalog APIs may provide canonical Device References to Product Catalog but must not own accessory compatibility decisions unless a future ADR assigns that responsibility.
- Phase 1 Compatibility Markers prepare for future compatibility-driven accessory workflows but do not make Device Catalog the owner of accessory compatibility assertions.
- Device Catalog APIs may expose buyer-exportable device data, but buyer-facing modules own buyer workflow UX/state where applicable.
- Device Catalog APIs may provide device references for future purchase orders, but must not own procurement workflow, approval, submission, or status.
- Device Catalog APIs may expose image readiness as a gating signal but must not create public image URL requirements or absorb full image management ownership.
- Pricing, Order Routing, and Fulfillment decisions should not be embedded in Device Catalog APIs.

## My Devices Portfolio API Surface Notes

This section documents architecture-level API surface notes for the Device Catalog side of the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. **No concrete HTTP routes, request / response payload schemas, pagination contracts, authentication header specs, or error code catalogs are introduced.** `modules/device-catalog/openapi-contracts.md` is NOT modified. `modules/device-catalog/phase-1-csv-import.md` is NOT modified. All concrete API contract work is deferred to future API Governance Foundation PR + Device-Catalog-specific OpenAPI hardening PR.

### Discipline

- **No concrete API.** Architectural shape only.
- **`openapi-contracts.md` NOT modified.** Per PR-A through PR-E + PR #103 + PR #104 deferral discipline.
- **`phase-1-csv-import.md` NOT modified.** Out of scope.
- **No concrete request / response payload schemas, pagination cursors, authentication header specs, error code catalogs.**
- **Reference-first per PR-A discipline.** All inputs and outputs described as references to existing fields / records.

### Buyer Device Portfolio - add device surface (architectural)

**Architectural inputs (reference-first):**

- `actor_reference` OR `service_trigger_reference`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad).
- `device_reference`.
- Optional `change_reason_reference`.

**Architectural outputs (reference-first):**

- `buyer_device_portfolio_change_record_id` of the produced Change Record.
- `new_portfolio_snapshot_reference`.
- PR-A envelope echoed.

**Concrete HTTP route, payload schema, status codes: future API.**

### Buyer Device Portfolio - remove device surface (architectural)

**Architectural inputs:**

- `actor_reference` OR `service_trigger_reference`.
- Buyer-scope triad.
- `device_reference` (or `buyer_device_portfolio_reference_id` to identify the specific portfolio entry).
- Optional `change_reason_reference`.

**Architectural outputs:**

- `buyer_device_portfolio_change_record_id`.
- `new_portfolio_snapshot_reference`.

### Buyer Device Portfolio - update / deactivate / supersede / correct surface (architectural)

**Architectural inputs:**

- `actor_reference` OR `service_trigger_reference`.
- Buyer-scope triad.
- Device identification + intended change (architectural shape).
- Optional `change_reason_reference`.

**Architectural outputs:**

- `buyer_device_portfolio_change_record_id`.
- `new_portfolio_snapshot_reference`.

### Buyer Device Portfolio Snapshot retrieval surface (architectural)

**Architectural inputs:**

- `actor_reference`.
- Buyer-scope triad.
- Optional `buyer_device_portfolio_snapshot_id` (specific snapshot) OR current (default).

**Architectural outputs:**

- Snapshot envelope: `buyer_device_portfolio_snapshot_id`, `snapshot_timestamp`, `active_device_references`, `inactive_device_references`, `superseded_device_references`, `excluded_device_reason_summary`, `prior_snapshot_reference`.

### Buyer Device Portfolio Change Record retrieval surface (architectural)

**Architectural inputs:**

- `actor_reference`.
- Buyer-scope triad.
- Optional `change_type` filter (subset of 8 values).
- Optional time range filter.

**Architectural outputs:**

- List of Change Record envelopes.

### Bulk portfolio import surface (architectural)

**Architectural inputs:**

- `actor_reference` OR `service_trigger_reference`.
- Buyer-scope triad.
- Batch of device references / operations (architectural shape; concrete CSV / JSON payload owned by `phase-1-csv-import.md` and future API).

**Architectural outputs:**

- ONE `buyer_device_portfolio_change_record_id` with `change_type = bulk_portfolio_import`.
- `new_portfolio_snapshot_reference`.

### Capability registration / lifecycle surfaces

NONE. This PR introduces no new tenant capabilities, role bundles, or service identity profiles. Existing Tenant Company PR #103 + baseline capability registry surfaces continue to govern.

### `openapi-contracts.md` discipline

- **NOT modified.** Per PR-A through PR-E + PR #103 + PR #104 deferral discipline.
- All concrete HTTP routes, payload schemas, pagination contracts, authentication header specs, error code catalogs deferred to future API Governance Foundation PR + Device-Catalog-specific OpenAPI hardening PR.

### `phase-1-csv-import.md` discipline

- **NOT modified.** Existing CSV import path preserved by reference.
- This PR's bulk portfolio import architectural shape does NOT change the CSV import mechanism; the CSV import path, when invoked, produces a Buyer Device Portfolio Change Record with `change_type = bulk_portfolio_import` per existing baseline.

### What this api-contracts section intentionally does NOT do

- No concrete HTTP route definitions.
- No concrete request / response payload schemas.
- No pagination cursor specification.
- No authentication / authorization header specification.
- No error code catalog.
- No rate-limit policy values.
- No API versioning scheme beyond existing Device Catalog baseline.
- No concrete idempotency cache shape or TTL.
- No concrete event delivery semantics for `my-devices.portfolio-changed`.
- No concrete propagation latency or eventual-consistency policy beyond existing baseline.
- No modifications to source-module APIs (Logs & Audit, Tenant Company, Integration Management, Product Catalog, Notification Platform).
- No `openapi-contracts.md` modifications.
- No `phase-1-csv-import.md` modifications.
- No modifications to Product Catalog API contracts (Product Catalog side documented in `modules/product-catalog/api-contracts.md`).

### Sequencing note

After this PR merges, the following API hardening PRs become natural next steps:

1. API Governance Foundation PR (cross-module API contract conventions).
2. Device-Catalog-specific OpenAPI hardening PR (concrete HTTP routes / payloads for portfolio add / remove / update / read; integrates with bulk portfolio import path).
3. Product-Catalog-specific OpenAPI hardening PR (projection / impact / Selection Snapshot extensions).
4. Logs & Audit-specific OpenAPI hardening PR.

These PRs are out of scope here. This PR documents architectural shape only.
