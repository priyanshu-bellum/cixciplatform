# Device Catalog Event Contracts

Use this draft to document event-driven contracts between Device Catalog and other modules. Event names, payloads, and delivery guarantees are placeholders until confirmed.

## Event Name

Placeholder: `device.reference.changed`

## Event Purpose

Notify authorized consuming modules that a canonical Device Reference, device lifecycle state, identifier mapping, normalization outcome, merge/split outcome, or supersession relationship may have changed.

## Event Producer

Device Catalog module.

## Event Consumers

- Product Catalog, for compatibility mappings that reference Device Catalog records.
- Pricing, for pricing context that depends on device class, lifecycle, or reference integrity.
- Order Routing, for order-time reference validation needs only.
- Fulfillment, for shipment or device metadata reference needs only.
- Analytics, for device reporting read models.
- Buyer-facing modules, for buyer export or portfolio UX/state where applicable.
- Future Procurement / Purchase Orders, for manufacturer purchase order references if introduced.

## Trigger Conditions

- Placeholder: canonical device record created, updated, retired, merged, split, superseded, or reactivated.
- Placeholder: Device Reference target, status, redirect, deprecation state, or unresolved state changed.
- Placeholder: manufacturer, brand, model, variant, identifier, taxonomy, carrier, region, or lifecycle metadata changed.
- Placeholder: import batch completed or failed.
- Placeholder: buyer export completed or failed.
- Placeholder: buyer device portfolio reference changed.

## Payload Schema

- `eventId`: placeholder unique event identifier.
- `eventType`: placeholder event name.
- `eventVersion`: placeholder event schema version.
- `occurredAt`: placeholder event timestamp.
- `deviceId`: placeholder canonical device identifier.
- `deviceReferenceId`: placeholder stable Device Reference identifier.
- `referenceState`: placeholder state such as active, redirected, deprecated, retired, unresolved, or review-required.
- `tenantScope`: placeholder tenant/company/entity scope when the event is tenant-scoped.
- `changedFields`: placeholder list of changed fields.
- `source`: placeholder source such as manufacturer API, CSV, admin, integration, or normalization workflow.
- `predecessorReferences`: placeholder list for merge, split, or supersession scenarios.
- `successorReferences`: placeholder list for merge, split, or supersession scenarios.
- `redactionClass`: placeholder payload audience marker such as global-canonical, tenant-scoped, internal-only, or lookup-required.

## Required Fields

- Placeholder: `eventId`
- Placeholder: `eventType`
- Placeholder: `eventVersion`
- Placeholder: `occurredAt`
- Placeholder: `deviceReferenceId`
- Placeholder: `redactionClass`

## Optional Fields

- Placeholder: `deviceId`
- Placeholder: `referenceState`
- Placeholder: `tenantScope`
- Placeholder: `changedFields`
- Placeholder: source record identifiers.
- Placeholder: taxonomy identifiers.
- Placeholder: predecessor or successor references for merge/split/supersession events.
- Placeholder: export or import batch identifiers.

## Idempotency Rules

- Placeholder: consumers should deduplicate using `eventId` or another confirmed event identity field.
- Placeholder: repeated events should not create duplicate compatibility, pricing, routing, analytics, export, or portfolio records.

## Ordering / Sequencing Rules

- Placeholder: define whether events must be ordered per Device Reference, canonical Device ID, import batch, tenant-scoped export, or stream.
- Placeholder: define behavior when a Product Catalog compatibility event references a Device Reference before the Device Catalog event is processed.
- Placeholder: merge, split, and supersession events need ordering guarantees for predecessor and successor references.
- Placeholder: tenant-scoped export or portfolio events should not block global canonical device event processing.

## Retry / Failure Handling

- Placeholder: failed delivery should use retry handling consistent with platform integration principles.
- Placeholder: repeated consumer failures should route to manual review or dead-letter processing.
- Placeholder: failed export or import events should avoid leaking unauthorized source data in failure payloads.

## Versioning Strategy

- Placeholder: define event schema versioning and compatibility guarantees.
- Placeholder: define when consumers must support multiple versions because Device Reference payloads are long-lived.
- Placeholder: define whether reference lifecycle state changes are additive, breaking, or require a new event version.

## Security / Access Considerations

- Placeholder: event payloads should not expose buyer-specific portfolio, export, relationship, or eligibility state to unauthorized consumers.
- Placeholder: global canonical events should omit tenant-scoped export and portfolio state.
- Placeholder: tenant-scoped events should include tenant scope only for authorized consumers and should use lookup references when payloads would expose sensitive data.
- Placeholder: canonical device fields included in events should be limited to fields safe for the event audience; sensitive details should require authorized lookup.

## Audit / Logging Requirements

- Placeholder: log event publication for meaningful device changes.
- Placeholder: log delivery failures and replay actions.
- Placeholder: define audit access for manufacturer, buyer, admin, and integration actions.

## Example Event Payload

```json
{
  "eventId": "placeholder-event-id",
  "eventType": "device.reference.changed",
  "eventVersion": "0.0.0",
  "occurredAt": "YYYY-MM-DDTHH:MM:SSZ",
  "deviceReferenceId": "placeholder-device-reference-id",
  "deviceId": "placeholder-device-id",
  "referenceState": "placeholder-reference-state",
  "redactionClass": "global-canonical",
  "changedFields": []
}
```

## Open Questions

- Which Device Catalog events are required by Product Catalog, Pricing, Order Routing, Fulfillment, Analytics, buyer-facing modules, and future Procurement?
- Should events carry complete device snapshots, change summaries, or lookup references?
- Which canonical device fields are safe to publish versus requiring authorized lookup?
- What event ordering is required for merge, split, supersession, and Device Reference lifecycle changes?
- Which consumers may receive tenant-scoped export or portfolio events?

## Feature Evidence Contracts and Signals - Event Contract Shape (PR-C)

PR-C defines the architecture-level event contract shape used by the 20 additive PR-C event names (per `events.md` PR-C section). The shape is **reference-first** - event payloads carry references to authoritative records, not embedded snapshots of those records' content. Consumers wanting full state read it from Device Catalog's API (per `api-contracts.md` PR-C section).

PR-C does **not** define OpenAPI schemas, broker / transport implementation, dead-letter behavior, retry tuning, idempotency-key generation algorithms, or any runtime implementation detail. PR-C defines architecture-level expectations only. Transport-layer behavior is owned by Integration Management.

### Common required fields

Every PR-C event carries, at minimum:

- **`eventId`** - unique identifier for the event instance. Used by consumers for idempotency / dedup. Generation algorithm is implementation; uniqueness across all Device Catalog events is required.
- **`eventType`** - the event name (e.g., `device.feature-group.created`). Identical to the names enumerated in `events.md` PR-C section.
- **`eventVersion`** - proposal-level integer version starting at `1` for all PR-C events. The exact versioning scheme (when to bump, how to handle unknown versions on the consumer side) is platform-standard scope; see PR-C OQ for event-versioning normalization.
- **`occurredAt`** - timestamp of the originating state transition (the underlying entity event), not necessarily the broker emission time. ISO-8601 UTC with timezone offset.
- **`redactionClass`** - one of `internal`, `tenant_scoped`, `buyer_scoped`. See redaction class enumeration below. All PR-C events default to `internal`; PR-C does not introduce `tenant_scoped` or `buyer_scoped` events.
- **`sourceWorkflowReference`** - proposal-level reference to the PR-B workflow that produced the state transition (e.g., the import job ID for events arising from PR-B Workflow 1, the regeneration ID for events from PR-B Workflow 5, the exception ID for events from PR-B Workflow 4). May be null for events with no clear single source workflow (e.g., direct administrative edits).
- **`auditReference`** - reference to the Logs & Audit immutable record produced by the originating action. Consumers may use this for traceability; the immutable content is Logs & Audit's, not Device Catalog's.

### Entity-reference fields (carried by family)

Each event family additionally carries entity references appropriate to its concern. Entity references are platform identifiers, not embedded content.

**Feature Taxonomy Lifecycle events** carry:

- `featureGroupReference` - for `device.feature-group.*` events.
- `featureValueReference` and `featureGroupReference` - for `device.feature-value.*` events (the value's parent Feature Group is included for consumer convenience).
- `version` - the new version number of the entity (Feature Group or Feature Value) post-transition.
- `sourceHash` - the new source hash post-transition.
- `priorState` and `currentState` - the lifecycle states before and after the transition.

**Device Feature Assignment Changes events** carry:

- `deviceFeatureAssignmentReference` - the assignment.
- `deviceReference` and `canonicalDeviceId` - both included for consumer convenience.
- `featureGroupReference` - the Feature Group this assignment is within.
- `featureValueReferences` - the Feature Value reference(s); cardinality per Feature Group's `value_structure_kind`.
- `assignmentSource` - per PR-A enumeration (`csv_import`, `system_admin_direct_edit`, `compatibility_marker_normalization`).
- `priorAssignmentReference` - for `superseded` events, the prior assignment reference.

**Device Capability Evidence Regeneration events** carry:

- `deviceReference` and `canonicalDeviceId`.
- `deviceCapabilityEvidenceReference` - the new evidence record (for `regenerated`).
- `deviceCapabilityEvidenceRegenerationReference` - the regeneration audit record.
- `outcome` - `success`, `partial_success`, or (for `regeneration-failed`) `failure`.
- `changedFeatureGroupReferences` - categorical list of Feature Groups whose `assignment_status` or `current_feature_value_references` changed. Categorical, not detailed.
- For `stale` events: `staleReason` - categorical reason (e.g., `upstream_taxonomy_version_advanced`, `regeneration_failure_persisted`). Categorical, not narrative.

**Data Quality Exception Lifecycle events** carry:

- `dataQualityExceptionReference` - the exception.
- `exceptionCategory` - per PR-B enumeration.
- `deviceReference` and `canonicalDeviceId` - when device-scoped.
- `priorState` and `currentState` - the lifecycle states.
- For `unresolved` events: `overrideAuditReference` - the Override Discipline Case 3 audit reference.
- For `resolved` events: `resolutionActionReference` - the audit reference to the correction(s) that resolved the underlying issue.
- For `reopened` events: `reopenReasonReference` - the audit reference to the reopen reason.

**Compatibility-Impacting Review Signal event** carries the minimum shape defined below.

### Compatibility-impacting review signal - minimum shape

The single event `device.compatibility-impacting-review-signal.raised` carries the minimum-shape payload below. This is the architecture-level contract; payload-granularity decisions beyond this minimum are reserved for future contract evolution (see PR-B OQ 8 in `assumptions-open-questions.md`).

- All Common Required Fields (above).
- **`deviceReference`** and **`canonicalDeviceId`** - the Device whose evidence changed.
- **`deviceCapabilityEvidenceReference`** - the post-regeneration evidence record.
- **`changedFeatureGroupReferences`** - references to Feature Groups whose state changed in this regeneration. References, not embedded content.
- **`changedFeatureValueReferences`** - references to Feature Values added, removed, or changed. References, not embedded content.
- **`categoricalDelta`** - categorical summary of what changed. Examples (controlled value space; not narrative):
  - `feature_assignment_added`
  - `feature_assignment_removed`
  - `feature_assignment_changed`
  - `assignment_status_transitioned`
  - `freshness_state_transitioned`
  - `data_quality_exception_introduced`
  - `data_quality_exception_resolved_affecting_evidence`
  - `partial_regeneration_with_per_feature_group_failure`
  - `regeneration_failure_continuation_override_applied`
- **`changeReasonReference`** - proposal-level reference to a controlled-value reason summary. Distinct from `categoricalDelta` (which is the *what*); `changeReasonReference` is the *why*. Categorical reason space is open per PR-C OQ on reason-reference normalization.
- **`dataQualityExceptionReferences`** - array of any Data Quality Exception references currently affecting the Device's feature evidence. Read-only references; consumers must not transition exception state via this event.
- **`consumerActionHint`** - advisory hint, one of:
  - `no_action_expected`
  - `review_recommended`
  - `review_required_for_consumer_safety`
- **`auditReference`** and **`signalRaisedAuditReference`** - Logs & Audit references for both the originating regeneration and the signal-raise action.

The signal **does not** carry:

- Embedded Device Capability Evidence content (only the reference). Full evidence is retrieved via the API per `api-contracts.md`.
- Raw Compatibility Markers - those are Device Catalog-internal ingestion artifacts per PR-A and PR-B; the signal payload does not surface them.
- Product Catalog state, accessory compatibility mappings, buyer-visible accessory lists, newly-compatible indicators, or blocked export / readiness flags - those are Product-Catalog-owned per PR-B boundary discipline. The signal is **not** a Product Catalog command.
- Tenant-specific eligibility or buyer portfolio state. The signal is `internal` redaction class; it is consumed by Product Catalog's catalog-level state, not by buyer-scoped surfaces.

### `consumerActionHint` discipline (architecture-level)

The `consumerActionHint` field is **advisory only**. It exists because the signal-raising side (Device Catalog) sometimes knows context the consumer does not (e.g., whether a regeneration failure continuation override per PR-B Case 5 was applied, which the consumer would otherwise have to infer). The hint helps consumers prioritize their own queues. The hint **does not command** consumer behavior.

The discipline:

- **Product Catalog is not commanded.** Product Catalog may use `consumerActionHint` to prioritize its review queue. Product Catalog may also ignore the hint entirely. Product Catalog's decisions about accessory compatibility mappings, buyer-visible accessory lists, newly compatible indicators, and blocked export / readiness states are Product Catalog's own - Device Catalog does not dictate them through any field, including this one.
- **Hint values are advisory.** `review_required_for_consumer_safety` does not legally require Product Catalog to review; it indicates Device Catalog's strongest expectation of consumer-safety impact, which Product Catalog may verify or disregard per its own logic.
- **Hint absence is acceptable.** A signal may carry no hint or `no_action_expected`; consumers may still elect to act.
- **Device Catalog does not consume hint acknowledgements.** Whether Product Catalog acts on a hint is Product Catalog's internal state, not Device Catalog's.

### Redaction class enumeration

PR-C introduces a proposal-level enumeration:

- **`internal`** - broadcast across CIXCI infrastructure; no buyer or tenant-eligibility content; safe for any authorized internal consumer. **All PR-C events are `internal`.**
- **`tenant_scoped`** - content contains tenant-specific identifiers or state requiring tenant-scope enforcement at delivery. **PR-C does not introduce `tenant_scoped` events.**
- **`buyer_scoped`** - content contains buyer-portfolio or buyer-specific data. **PR-C does not introduce `buyer_scoped` events** (PR-B established that Buyer Device Portfolio Reference is Device Catalog-owned but consuming-module surfaces are buyer-facing; PR-C events do not carry buyer-scoped payloads).

If a future event needs to carry buyer-portfolio references, it must be `buyer_scoped` and accompanied by explicit downstream scope enforcement. PR-C does not enable buyer-scoped event payloads.

Redaction-class normalization across CIXCI platform events is a candidate for a platform standard. See PR-C OQ on redaction-class normalization.

### Reference-first payload discipline

PR-C event payloads **carry references**, not embedded content. The rule:

- **Carry references** to Device, Feature Group, Feature Value, Device Feature Assignment, Device Capability Evidence, Data Quality Exception, audit records, source workflows.
- **Do not embed** entity content (display labels, descriptions, lifecycle metadata, assignment histories, evidence snapshots, exception narratives). Consumers wanting content read it via the API (per `api-contracts.md` PR-C section).
- **Carry categorical metadata** (lifecycle states, outcomes, change categories, redaction class, consumer action hints) - these are short, controlled, and necessary for triage without callback.
- **Do not carry** raw input artifacts (Compatibility Markers), tenant-specific or buyer-specific identifiers in `internal`-class events, or any Product Catalog state.

The discipline serves three purposes:

1. **Payload size and broker pressure** - references are small; snapshots are unbounded.
2. **Redaction surface** - embedded content multiplies redaction concerns per event; references push redaction enforcement to the API layer where authority and scope evidence are evaluated per consumer.
3. **Source-of-truth integrity** - references point at the authoritative record; snapshots can drift from authoritative state between emission and consumption. Reference-first preserves single-source-of-truth discipline established by PR-A.

### Idempotency expectations (architecture-level)

Consumers **must** handle redelivery of any PR-C event. PR-C expects:

- **`eventId` is the consumer-side dedup key.** Consumers receiving an event whose `eventId` they have already processed should treat the redelivery as a no-op (idempotent acknowledgement).
- **PR-C does not contract producer-side dedup.** Producers may emit duplicate events under transport-failure or retry conditions; consumers absorb redelivery.
- **State transitions are not commutative.** Consumers processing events out of order (e.g., a `device.feature-group.deprecated` event arriving before its preceding `device.feature-group.updated`) should use `eventVersion`, `occurredAt`, and the entity's own `version` field to reorder or accept eventual consistency. PR-C does not contract strict-ordering delivery; ordering guarantees are Integration Management / transport concerns.
- **No `consumerActionHint` re-emission discipline.** The hint reflects Device Catalog's state at signal-raise time; redelivery preserves the original hint. Producers do not re-evaluate hint values on redelivery.

### Replay expectations (architecture-level)

- **Replay is a transport-layer concern.** Integration Management owns replay machinery; PR-C describes only what consumers should expect when replay occurs.
- **Replayed events carry their original `eventId`, `eventVersion`, `occurredAt`, and `redactionClass`.** Replay does not produce a fresh `eventId`; it re-emits the original.
- **Consumers must not assume replay reflects current state.** A replayed `device.compatibility-impacting-review-signal.raised` event from an earlier time may carry references to a Device Capability Evidence record that has since been superseded. Consumers reading entity state should call the API for current state; the replayed event is a record of past signal, not a current trigger.
- **PR-C does not contract replay windows, retention, or replay-on-demand authorization.** Those are Integration Management / platform standard concerns.

### Failure handling (architecture-level)

- **Transport failure is Integration Management's concern.** Dead-letter, retry tuning, broker-side acknowledgement are transport-layer; PR-C does not contract them.
- **Consumer-side failure is consumer's concern.** A consumer failing to process an event must not return a failure signal that commands Device Catalog. Device Catalog does not consume consumer-side failure outcomes.
- **Producer-side failure during emission.** If Device Catalog fails to emit a PR-C event after a state transition committed, the state transition is **not** rolled back. The transition is recorded in Logs & Audit per Device Catalog's normal audit discipline; the emission failure is logged via observability. Consumers may detect missing events via their own audit or via Device Capability Evidence freshness state.

### Consumer responsibilities (architecture-level)

Consumers of PR-C events (notably Product Catalog) are responsible for:

- **Idempotency.** Handle redelivery without duplicating downstream effects.
- **Scope enforcement.** Respect `redactionClass`. Do not consume events whose redaction class is not authorized for the consumer.
- **Version handling.** Respect `eventVersion`. If a consumer receives an event whose `eventVersion` it does not recognize, the consumer should log and skip rather than partially process. Version-skip rules are platform-standard scope.
- **Reference-callback.** Where the event payload carries references and the consumer needs content, call the Device Catalog API per `api-contracts.md`. Do not infer content from the event payload alone.
- **Downstream decisions.** Consumers (notably Product Catalog) decide their own downstream behavior. PR-C events inform; they do not command. The `consumerActionHint` is advisory only.
- **No write-back to Device Catalog.** Consumers do not mutate Device Catalog state in response to PR-C events. Product Catalog does not write to Device Catalog's feature taxonomy, assignments, evidence, or exceptions. PR-B boundary discipline is preserved.

### Acknowledgement (architecture-level)

Acknowledgement is **transport-layer / Integration Management** behavior. PR-C describes architecture-level expectations:

- Device Catalog does not expose a command-style acknowledgement endpoint in its API surface. The PR-C `api-contracts.md` placeholders are read-only / lookup-only; none accept a "Product Catalog acknowledges your signal" command.
- Product Catalog acknowledgement, if implemented via the message broker, is consumed by the broker - not by Device Catalog. The broker uses acknowledgement to remove the message from Product Catalog's queue. Device Catalog does not consume the acknowledgement.
- Product Catalog acknowledgement does not tell Device Catalog what Product Catalog will do downstream. Product Catalog's downstream decisions are Product Catalog's internal state.
- No PR-C event family includes an "acknowledgement-required" field, "expected-consumer-response" field, or similar command-style metadata.

### Cross-reference to API contract placeholders

PR-C events are observation surfaces. Consumers wanting to read entity content use the read-only API placeholders defined in `api-contracts.md` PR-C section:

- Feature taxonomy lookup (Feature Groups, Feature Values, Device Capability Profiles).
- Device Capability Evidence retrieval.
- Device Feature Assignment lookup.
- Data Quality Exception lookup.
- Compatibility-impacting review signal read model.

PR-C API placeholders are read-only; no PR-C API mutates feature truth. Mutation surfaces are PR-B workflow territory.

## My Devices Portfolio Event Contracts

This section documents the payload contract for the 1 new Device Catalog event introduced under the Buyer-Scoped Compatibility Projection and My Devices Sync Foundation. The Product Catalog side (5 new events) is documented in `modules/product-catalog/event-contracts.md`. All payload extensions are reference-first per existing PR-A discipline. No concrete schema is locked; concrete payload schema is future API Governance Foundation PR work.

### Contract discipline

- The 1 new event payload extension is reference-first per existing Device Catalog + PR-A discipline.
- No concrete schema is locked.
- The discriminator value catalog (`change_type`) is documented below.
- Subscribers MUST handle unknown discriminator values gracefully (forward-compatibility).
- All existing payload envelope fields (`correlation_reference`, `trace_reference`, `idempotency_key`, `audit_record_reference`, schema version) are preserved per existing baseline.

---

### Event - `device-catalog.my-devices.portfolio-changed`

**Purpose:** indicate Buyer Device Portfolio Change Record creation.

**Discriminator:** `change_type` (string-enum; 8 values).

**Discriminator value catalog (8 values):**

| Value | Meaning |
|---|---|
| `device_added` | Buyer added a device to the portfolio. |
| `device_removed` | Buyer removed a device. |
| `device_updated` | Existing device entry updated; compatibility-relevance determined by Device Catalog. |
| `device_deactivated` | Device deactivated; equivalent to remove for Product Catalog projection. |
| `device_superseded` | Device replaced by a successor. |
| `device_reference_corrected` | Device reference corrected. |
| `bulk_portfolio_import` | Many devices changed at once; one Change Record covers the batch. |
| `admin_on_behalf_change` | Any of the above initiated by admin per Tenant Company act-on-behalf authority. |

**Payload context (reference-first):**

- `buyer_device_portfolio_change_record_id`.
- `buyer_reference`, `company_scope_reference`, `buyer_entity_reference` (buyer-scope triad).
- `change_type` (the discriminator value).
- `change_timestamp`.
- `prior_portfolio_snapshot_reference` (nullable for first-time / empty-prior cases).
- `new_portfolio_snapshot_reference` (REQUIRED).
- `affected_device_references` (the devices changed in this Change Record).
- `change_reason_reference` (nullable; optional structured reason).
- `actor_reference` (populated for buyer / admin / system actors).
- `service_trigger_reference` (populated for service-initiated changes; mutually exclusive with `actor_reference`).
- `change_source` (one of: `buyer_action`, `admin_on_behalf`, `service_identity_sync`, `system_correction`).
- Existing baseline envelope: `correlation_reference`, `trace_reference`, `audit_record_reference`.

### Discriminator extension discipline

- Discriminator values are case-sensitive lowercase identifiers per existing baseline.
- Discriminator values are stable across schema versions (additions are additive; removals require explicit deprecation per baseline).
- Subscribers MUST handle unknown discriminator values gracefully.
- Discriminator extensions do NOT change event ordering, retry, or idempotency semantics.

### Reference-first context discipline

Per PR-A reference-first discipline:

- No concrete payload field shape is locked.
- All payload context references are to existing entity / record identifiers.
- Implementation owns concrete payload schema.
- Future API Governance Foundation PR locks concrete payload schema.

### What this event-contracts section intentionally does NOT lock

- Concrete payload field schema. Future API Governance Foundation PR.
- Concrete subscriber routing / filtering implementation. Implementation.
- Concrete event delivery transport. Existing Integration Management baseline + future Integration coordination.
- Concrete schema versioning policy beyond existing Device Catalog baseline.
- Concrete subscriber rate limiting / backpressure. Implementation.
- Future discriminator value additions beyond the catalog documented here.
- Concrete event ordering guarantees beyond existing baseline.

### Existing Device Catalog event contracts preserved (no edits)

All existing Device Catalog event contracts are preserved without modification. (Refer to existing `event-contracts.md` baseline for the canonical inventory.)
