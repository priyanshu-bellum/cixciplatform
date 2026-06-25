# Logs And Audit File Tracking Event Contracts

This document is a proposal-level template for documenting event-driven contracts emitted or consumed by Logs & Audit File Tracking.

## Event Name

Placeholder: `audit.record.created`, `file.import.received`, `file.processing.failed`, `api.transmission.completed`, or another event from `events.md`.

## Event Purpose

Describe why the event exists and which consumers need it.

Examples:

- Preserve traceability for a platform action.
- Notify downstream systems that a file was imported or exported.
- Signal repeated processing failures.
- Track API transmission failure and retry behavior.
- Feed AI Agent Services or Analytics with approved audit signals.
- Trigger future Notification workflows.

## Event Producer

Logs & Audit File Tracking.

## Event Consumers

Proposal-level consumers may include:

- Source modules that need audit references.
- AI Agent Services for operational risk signals.
- Analytics for reporting inputs.
- Future Notification platform service.
- Internal operations users.
- Buyer/vendor-facing audit views where authorized.

## Trigger Conditions

Document the condition that emits the event.

Examples:

- Audit record created.
- File export created.
- File import received.
- File validation completed.
- File processing failed.
- API transmission retried.
- Duplicate file detected.
- Retention review required.

## Payload Schema

Common payload shape:

```json
{
  "eventId": "evt_placeholder",
  "eventType": "audit.record.created",
  "eventVersion": "v1",
  "occurredAt": "2026-01-01T00:00:00Z",
  "producer": "logs-audit-file-tracking",
  "sourceModule": "source_module_placeholder",
  "companyEntityScope": "scope_placeholder",
  "auditRecordRef": "audit_placeholder",
  "fileTrackingRef": "file_placeholder",
  "apiTransmissionRef": "api_placeholder",
  "retentionClass": "retention_placeholder",
  "redactionClass": "internal-operations",
  "correlationId": "correlation_placeholder"
}
```

## Required Fields

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `producer`
- `sourceModule`
- `retentionClass`
- `redactionClass`
- `correlationId`

Additional required fields depend on event family:

- Audit events require audit record reference.
- File events require file tracking reference.
- API transmission events require API transmission reference.
- Validation/processing events require validation or processing result reference.

## Optional Fields

- `companyEntityScope`
- `vendorRef`
- `buyerEntityScope`
- `relatedRecordRefs`
- `fileName`
- `fileType`
- `direction`
- `rowCount`
- `failedRowCount`
- `validationStatus`
- `processingStatus`
- `errorSummary`
- `retryCount`
- `payloadRef`
- `maskedPayloadRef`

## Idempotency Rules

- Events must include stable event ids.
- Mutating operations should include idempotency keys.
- Consumers should dedupe by event id and idempotency key.
- Replayed events should preserve original occurrence timestamps and include replay metadata where appropriate.

## Ordering / Sequencing Rules

- File processing events should reference the file tracking record and processing result that produced them.
- Correction/reupload events should reference prior file tracking records.
- API retry events should reference the prior attempt where available.
- Consumers should not assume total ordering across unrelated source modules, tenants, or files.

## Retry / Failure Handling

- Publication failures should be retried within a bounded retry budget.
- Failed event delivery should create operational review or audit gap signal where appropriate.
- Consumers should be idempotent.
- Poison events should not block unrelated audit streams.

## Versioning Strategy

- Event contracts should use explicit event versions.
- Additive fields are preferred.
- Breaking changes require a new version.
- Retention/redaction behavior changes should be versioned and reviewed.

## Security / Access Considerations

- Payloads should use references instead of exposing full source payloads where possible.
- Sensitive customer, pricing, invoice, warranty, tenant, media, licensing, and operational fields should be redacted by consumer class.
- Buyer/vendor consumers should receive only authorized audit views.
- AI Agent Services should receive only approved signals and references.

## Audit / Logging Requirements

Events should preserve:

- Producer.
- Source module.
- Actor or system actor where available.
- Source operation.
- Correlation id.
- Idempotency key.
- Tenant/company/entity scope.
- Timestamp.
- Retention class.
- Redaction class.

## Example Event Payload

```json
{
  "eventId": "evt_123",
  "eventType": "file.processing.failed",
  "eventVersion": "v1",
  "occurredAt": "2026-01-01T12:00:00Z",
  "producer": "logs-audit-file-tracking",
  "sourceModule": "fulfillment-returns",
  "vendorRef": "vendor_123",
  "fileTrackingRef": "file_456",
  "fileType": "vendor_shipping_import",
  "direction": "import",
  "failedRowCount": 12,
  "processingStatus": "failed",
  "errorSummary": "required tracking reference missing",
  "retentionClass": "operations-audit",
  "redactionClass": "internal-operations",
  "correlationId": "corr_789"
}
```

## Open Questions

- Which events require buyer/vendor-visible projections?
- Which events require payload references versus metadata only?
- Which failures should trigger future notifications?
- Which event families require long-term retention?

## Scheduled System Admin Activity Summary Evidence Event Contracts (Cross-Module PR)

This section documents the architecture-level event contract shape for the 2 additive Logs & Audit File Tracking event names introduced by PR-C. The Notification Platform Service and Analytics / Reporting sides of the cross-module event inventory have their own event-contracts.md sections.

### Reference-first payload discipline

PR-C events follow the reference-first payload pattern. Event payloads carry stable identifiers; they do not embed evidence record content, aggregation record content, source-module records, or buyer-or-vendor payloads.

Common payload fields across both Logs & Audit File Tracking PR-C events (proposal-level; aligns with existing Logs & Audit File Tracking event modeling patterns):

- `eventId` - unique event identifier.
- `eventType` - the event name.
- `eventVersion` - `v1` baseline.
- `occurredAt` - the event timestamp.
- `sourceModule` - `logs-audit-file-tracking`.
- `activitySummaryConfigurationReference` - the canonical Notification Platform Service Activity Summary Configuration reference.
- `activitySummaryReportingWindowReference` - the canonical Analytics / Reporting Activity Summary Reporting Window reference.
- `retentionClass` - existing Logs & Audit retention class; PR-C evidence uses existing patterns (no new retention class introduced).
- `redactionClass` - existing Logs & Audit redaction class; PR-C evidence is `internal` scope.
- `accessClass` - existing Logs & Audit access class.
- `auditRecordReference` - the canonical Logs & Audit Audit Record reference created alongside the evidence record (per existing Audit Record entity pattern).
- `correlationId` - existing Logs & Audit correlation identifier.

### Event-specific payload fields (proposal-level)

**`audit.activity-summary-evidence.recorded`:**
- All common fields.
- `activitySummaryGeneratedEvidenceReference` - the canonical new evidence record reference.
- `activitySummaryAggregationRecordReference` - the Analytics / Reporting aggregation record that triggered this evidence (the evidence record retains by reference; does not embed content).
- `generationTimestamp` - matches the aggregation record's `generated_at_timestamp` and the evidence record's `generation_timestamp`.
- `actorReference` - typically a system service identity for scheduled aggregation; resolves through Tenant Company `check_access` patterns.
- `carryForwardWindowReferenceCollection` - optional; mirrors the field on the evidence record. References to prior `delivery_failed` windows whose intervals were subsumed by this aggregation.

**`audit.activity-summary-suppression-evidence.recorded`:**
- All common fields.
- `noActivitySummarySuppressionEvidenceReference` - the canonical new evidence record reference.
- `evaluationTimestamp` - the moment Analytics Workflow 5 detected zero activity.
- `suppressionReason` - Phase 1 value `no_source_facts_in_window`.
- `windowStartTimestamp`, `windowEndTimestamp` - mirror the window's boundaries.
- `sourceFactZeroActivityAssertion` - reference or assertion that the source-fact aggregation produced zero counts across all sections for the effective window interval (the basis for suppression).

The Logs & Audit suppression-evidence-recorded event is emitted **before** Notification Platform Service consumes the suppression outcome and advances its own cursor. Therefore the suppression-evidence event payload **does not** include a cursor-advancement timestamp; that timestamp does not exist at Logs & Audit evidence creation time. Cursor advancement is performed later by Notification Platform Service in NPS Workflow 9 Trigger B path; NPS records its own cursor-advancement audit reference via the existing Audit Record entity pattern (no separate event introduced).

### Event versioning

Both PR-C event names are introduced at `eventVersion = 1` baseline (or the equivalent baseline per existing Logs & Audit File Tracking event modeling convention).

### Idempotency

- Both events are idempotent at the architectural level: re-emission of the same `eventId` is consumer-deduplicated.
- The evidence records themselves are immutable (per the existing Logs & Audit immutability rule); the events are produced once per evidence record creation.
- Amendments to evidence records use the existing Logs & Audit amendment workflow and produce existing-pattern amendment events, not new PR-C event names.

### Replay semantics

- Replay does not re-create the evidence record. The evidence record reference in the payload is canonical.
- Replay does not re-advance the cursor on the Activity Summary Configuration. The cursor advancement (on suppression) is performed by Notification Platform Service in NPS Workflow 9 Trigger B path at original outcome-consumption time; replay is for consumer observability only. Analytics does not perform the cursor mutation in either the original emission or replay.

### Failure handling

- Producer (Logs & Audit Workflow 10) emits events as evidence records are created. Producer-side emission failure is recoverable via replay from the canonical evidence record.
- Consumers handle their own failure modes. Phase 1 anticipated consumers are operator surfaces (search, retention review); future Cross-Module surfaces may consume.

### Consumer responsibilities

- **Operator search surfaces** (existing Logs & Audit search patterns) may consume both events for indexed search.
- **Future operator alert surfaces** (not introduced in PR-C) may consume `audit.activity-summary-suppression-evidence.recorded` for "no activity for N consecutive windows" alerts; PR-C documents the contract shape but does not introduce the alert itself.
- **Analytics / Reporting** does not consume these events; Analytics already has the canonical Reporting Window state.
- **Notification Platform Service** does not consume these events; Notification Platform already has the canonical Activity Summary Configuration state.

### Contract notes that PR-C does not finalize

- Concrete payload field shapes, types, and validation rules.
- OpenAPI / JSON Schema definitions.
- Broker-level guarantees.
- Search index implementation for the new evidence types.
- Storage mechanics, query plans, retention duration.
- Payload reference resolution mechanics.
- Operator alert thresholds for repeated suppression or repeated failures.

These remain deferred to API Governance Foundation, Logs & Audit File Tracking standalone hardening, and operator surface PRs.

## PR-A Event Payload Contracts - Core Evidence Spine

This section defines proposal-level payload contracts for PR-A's 4 additive events. All payloads follow the existing baseline contract discipline (reference-first, minimal necessary data, sensitive content travels by reference not by inline payload, redaction class governs visibility). PR-A introduces NO concrete schema (no JSON Schema, no Avro, no protobuf); the contracts are architectural.

### Common envelope fields (PR-A reaffirms existing baseline)

All PR-A events carry the existing baseline event envelope:

- `event_id` - canonical event identifier (deduplication anchor).
- `event_type` - one of: `audit.record.created`, `audit.evidence.recorded`, `audit.evidence-amendment.recorded`, `audit.evidence-supersession.recorded`.
- `event_version` - schema version of the event itself (distinct from `evidence_schema_version` on Evidence Record).
- `occurred_at` - timestamp at which the underlying action occurred.
- `published_at` - timestamp at which the event was published.
- `producer` - `logs-audit-file-tracking`.
- `correlation_reference` - cross-module correlation id (formalization of existing `correlation id` baseline field).
- `trace_reference` - distributed trace identifier (where applicable).
- `idempotency_key` - for event delivery deduplication (distinct from the Evidence Record's `idempotency_key`, though they may coincide).
- `retention_class` - the retention class of the underlying record.
- `redaction_class` - the redaction class of the underlying record.

### `audit.record.created` payload contract (PR-A clarification)

The existing baseline already defines this event. PR-A clarifies the payload under the formalized reference triad and naming.

**Payload (reference-first):**

- `audit_record_reference` - canonical reference to the Audit Record.
- `source_module_reference` (formalization of baseline `source module`).
- `source_record_reference` (formalization of baseline `related record references`; optional for pure observation events).
- `source_snapshot_reference` (optional).
- `actor_reference` (formalization of baseline `Actor/user/service` for human actors).
- `service_trigger_reference` (formalization for non-human service actors).
- `company_scope_reference` (formalization of baseline `Company/entity scope`).
- `event_action_type` (the baseline `event/action type`).
- `evidence_record_reference` (optional; back-link to attached Evidence Record when one exists).
- `audit_reference` - Logs & Audit retention reference.

**Excluded from payload (governance):**

- Full payload content. Travels as `payload_reference` or `masked_payload_reference` only (existing baseline rule).
- Sensitive content. Subject to redaction_class governance.
- Operational record content. Travels as `source_record_reference` only.

**Subscriber filter recommendations:**

- Filter by `source_module_reference` to scope per-module.
- Filter by `company_scope_reference` for tenant-scoped queries.
- Filter by `event_action_type` to scope per action type.

### `audit.evidence.recorded` payload contract (PR-A new)

**Payload (reference-first):**

- `evidence_record_reference`.
- `audit_record_reference` (parent).
- `evidence_type` (the discriminator).
- `evidence_schema_version`.
- `source_module_reference`.
- `source_record_reference` (when applicable).
- `source_snapshot_reference` (when applicable).
- `source_event_reference` (when applicable).
- `external_evidence_reference` sub-structure (when applicable):
  - `provider_response_reference`
  - `external_id_reference`
  - `external_file_reference`
  - `external_task_project_reference`
  - `external_timestamp`
  - `webhook_receipt_reference`
  - `retry_failure_evidence_reference`
  - `external_evidence_hash`
- `actor_reference` (when applicable).
- `service_trigger_reference` (when applicable).
- `company_scope_reference`.
- `evidence_hash_reference`.
- `evidence_attachment_reference` (when applicable).
- `captured_at`.
- `replay_safe_dedupe_reference` (when applicable).
- `evidence_status` (active at creation).
- `access_class`.
- `restricted_evidence` (boolean flag).
- `legal_hold_reference` (null at PR-A creation; placeholder).
- `audit_reference`.

**Discriminator usage by subscribers:**

- Subscribers wanting only product import evidence filter on `evidence_type` matching PR-C-cataloged product import evidence_type values.
- Subscribers wanting only buyer API product export evidence filter on `evidence_type` matching PR-C-cataloged buyer export evidence_type values.
- Subscribers wanting only vendor email export delivery evidence filter accordingly.
- Subscribers wanting only vendor shipping import evidence filter accordingly.
- Subscribers wanting only Media-related evidence filter on Media-related evidence_type values.
- Subscribers wanting only AI Agent evidence filter on AI Agent evidence_type values (when AI Agent Services is built).

PR-A does NOT define the comprehensive `evidence_type` enumeration values; PR-C catalogs them.

**Excluded from payload (governance):**

- Full source record content (travels as `source_record_reference` only).
- Full source snapshot content (travels as `source_snapshot_reference` only; snapshot itself is minimized per Source Snapshot Minimization Rule).
- Full external system content (travels as `external_evidence_reference` sub-structure only; never inline).
- Raw sensitive evidence (travels as `evidence_attachment_reference` only; access gated by access_class).
- Redacted view content (travels as `redacted_view_reference` only; populated by future PR-D workflows).

**Subscriber filter recommendations:**

- Filter by `evidence_type` (primary).
- Filter by `source_module_reference` to scope per-module.
- Filter by `company_scope_reference` for tenant-scoped queries.
- Filter by `restricted_evidence = false` for non-restricted streams.
- Filter by `access_class` for visibility-band-scoped queries.

### `audit.evidence-amendment.recorded` payload contract (PR-A new)

**Payload (reference-first):**

- `evidence_amendment_record_reference`.
- `target_evidence_record_reference`.
- `target_evidence_record_evidence_type` (denormalized for subscriber filtering convenience; allows subscribers to filter amendments by the type of evidence being amended).
- `amendment_reason_reference`.
- `amendment_actor_reference` (when applicable).
- `amendment_service_trigger_reference` (when applicable).
- `tenant_company_authority_reference`.
- `amendment_payload_reference` (when applicable; reference, NOT inline payload).
- `company_scope_reference`.
- `audit_record_reference` (the Audit Record for the amendment action).
- `audit_reference`.

**Critical:** The target Evidence Record's content is NOT included in this event payload (subscribers resolve via `target_evidence_record_reference`). The amendment payload itself travels as a reference, not inline.

**Subscriber filter recommendations:**

- Filter by `target_evidence_record_evidence_type` to track amendments on specific evidence subtypes.
- Filter by `company_scope_reference` for tenant-scoped queries.

### `audit.evidence-supersession.recorded` payload contract (PR-A new)

**Payload (reference-first):**

- `evidence_supersession_record_reference`.
- `prior_evidence_record_reference` (transitioned to `evidence_status = superseded`).
- `new_evidence_record_reference` (created with `evidence_status = active`).
- `prior_evidence_record_evidence_type`.
- `new_evidence_record_evidence_type` (may differ from prior if the correction changes type semantics).
- `supersession_reason_reference`.
- `supersession_actor_reference` (when applicable).
- `supersession_service_trigger_reference` (when applicable).
- `tenant_company_authority_reference`.
- `source_module_correction_reference` (when applicable; reference to the source-module correction event).
- `company_scope_reference`.
- `audit_record_reference` (the Audit Record for the supersession action).
- `audit_reference`.

**Critical:** Both the prior and new Evidence Records' content is NOT included in this event payload (subscribers resolve via the references). The event records lineage, not record content.

**Subscriber consumption pattern:**

- Subscribers receive both this event and a separate `audit.evidence.recorded` for the new Evidence Record creation.
- Subscribers MAY consume only one or both depending on their interest in lineage vs new evidence content.
- The two events are NOT guaranteed to arrive in strict order across distributed consumers; subscribers should treat them as eventually-consistent for the supersession transition.

**Subscriber filter recommendations:**

- Filter by `prior_evidence_record_evidence_type` and/or `new_evidence_record_evidence_type`.
- Filter by `company_scope_reference` for tenant-scoped queries.
- Filter by `source_module_correction_reference` populated for source-module-correction-driven supersessions.

### Redaction class governance on PR-A events (reaffirms existing baseline)

All PR-A events carry `redaction_class`. The existing baseline redaction classes are preserved verbatim:

- `public_metadata_placeholder`
- `buyer_visible_audit`
- `vendor_visible_audit`
- `internal_operations`
- `customer_sensitive_restricted`
- `pricing_sensitive_restricted`
- `invoice_sensitive_restricted`
- `warranty_sensitive_restricted`
- `tenant_security_restricted`
- `audit_only`

Subscribers must respect the redaction class. Sensitive fields are governed by the redaction class for the subscriber's visibility band. PR-D will define redaction transformations; PR-A leaves the class as a tag only.

### Reference-only payload discipline (PR-A reaffirmation)

The existing baseline rule "Events must use minimal necessary data. Sensitive customer, order, pricing, invoice, warranty, tenant, media-rights, licensing, and commercial values should be represented by references or redacted summaries unless explicitly allowed" is reaffirmed and applied to PR-A's 4 additive events:

- Source records travel as `source_record_reference` only.
- Source snapshots travel as `source_snapshot_reference` only (snapshot itself is minimized).
- External system content travels as `external_evidence_reference` sub-structure only.
- Amendment payloads travel as `amendment_payload_reference` only.
- Tenant Company user data travels as `actor_reference` only.
- Company scope travels as `company_scope_reference` only.
- Raw and redacted evidence travels as `raw_evidence_reference` and `redacted_view_reference` only.

### Idempotency on PR-A events (PR-A clarification)

The Evidence Record carries `idempotency_key` and `replay_safe_dedupe_reference`. Event subscribers should dedupe on `event_id` (envelope-level) AND on the Evidence Record's `idempotency_key` (payload-level) AND on `replay_safe_dedupe_reference` (payload-level) where present.

Retried submissions of the same Evidence Record MUST resolve to the same `audit.evidence.recorded` event with the same Evidence Record reference; the event is published once per Evidence Record creation, not per submission attempt.

### Replay and ordering on PR-A events (reaffirms existing baseline)

- Events should be replayable by source module, audit record, evidence record, correlation reference, tenant/company/entity scope, and date range.
- Consumers should not assume global ordering across unrelated source modules or tenants.
- Corrections (amendments and supersessions) emit new events rather than rewriting historical events.
- The supersession event and the new evidence event are eventually consistent; consumers should handle either arrival order.
- The amendment event does NOT change the target Evidence Record's content; subscribers should re-read the target Evidence Record (via reference resolution) to see amendments alongside.

### Failure handling on PR-A events (reaffirms existing baseline)

- Event publication failures should be retried with idempotency keys.
- Duplicate events should be deduped by event id and idempotency key.
- Poison events should enter review without blocking unrelated audit streams.
- Notification, Analytics, and AI fanout should not block core audit record creation or evidence record creation.

### PR-A event payload contract summary

PR-A defines proposal-level payload contracts for 4 additive events. All payloads are reference-first, sensitive content travels by reference, the `evidence_type` discriminator on `audit.evidence.recorded` subsumes per-evidence-type events, and amendment/supersession events carry denormalized `evidence_type` for subscriber filtering convenience. No concrete schema definitions (JSON Schema, Avro, protobuf) are introduced under PR-A; concrete schemas are deferred to future OpenAPI hardening and broker contract work.
```

# PR-B Append-Block for `modules/logs-audit-file-tracking/event-contracts.md`

> **Target file:** `modules/logs-audit-file-tracking/event-contracts.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-B APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline event contracts or PR-A event contracts).
> - Reference-first; no full payload embedding; minimal necessary data only.
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-B Event Payload Contracts - File Tracking Foundation`

---

## Content to append

```markdown
## PR-B Event Payload Contracts - File Tracking Foundation

This section defines proposal-level payload contracts for PR-B's 2 additive events and clarifies payload contracts for the 11 existing baseline file events under the PR-A Evidence Record spine and PR-B File Tracking Foundation. All payloads follow the existing baseline contract discipline (reference-first, minimal necessary data, sensitive content travels by reference, redaction class governs visibility). PR-B introduces NO concrete schema (no JSON Schema, no Avro, no protobuf); the contracts are architectural.

### Common envelope fields (PR-B reaffirms existing baseline + PR-A)

All PR-B events carry the existing baseline event envelope (same as PR-A):

- `event_id` - canonical event identifier (deduplication anchor).
- `event_type` - one of: `file.reprocess.requested`, `file.reprocess.completed`, or one of the existing baseline file event names.
- `event_version` - schema version of the event itself.
- `occurred_at` - timestamp at which the underlying action occurred.
- `published_at` - timestamp at which the event was published.
- `producer` - `logs-audit-file-tracking`.
- `correlation_reference` - cross-module correlation id (formalization of existing `correlation id` baseline field).
- `trace_reference` - distributed trace identifier (where applicable).
- `idempotency_key` - for event delivery deduplication (distinct from the record's `idempotency_key`, though they may coincide).
- `retention_class` - the retention class of the underlying record.
- `redaction_class` - the redaction class of the underlying record.

### Existing baseline file event payload contracts (PR-B clarification)

PR-B preserves the existing 11 baseline file events. PR-B clarifies that their payloads should carry the following normalized fields where applicable (architectural; not a schema change):

**Common file-event payload fields (architectural; carried by all 11 baseline file events plus PR-B's 2 additive events):**

- `file_tracking_record_reference` - the canonical File Tracking Record reference.
- `evidence_record_reference` - the parent Evidence Record (PR-A reference).
- `audit_record_reference` - the parent Audit Record (PR-A reference).
- `file_direction` - uploaded / generated / downloaded.
- `file_purpose` - the business meaning value.
- `file_lifecycle_status` - the current state at event emission.
- `source_module_reference` - PR-A reference type.
- `source_record_reference` - PR-A reference type (when applicable).
- `company_scope_reference` - PR-A reference type.
- `actor_reference` or `service_trigger_reference` - PR-A reference type (one populated).
- `file_hash_reference` - file content hash reference.
- `file_storage_reference` - file storage location reference.
- `audit_reference` - Logs & Audit retention reference.

**Event-specific payload additions for existing baseline events:**

- `file.export.created` - existing baseline payload preserved; PR-B common fields apply.
- `file.import.received` - existing baseline payload preserved; PR-B common fields apply.
- `file.downloaded` - existing baseline placeholder preserved; PR-B common fields apply; additional `downloaded_at`, `source_file_tracking_record_reference` (optional) for the download foundation.
- `file.duplicate.detected` - existing baseline payload preserved; additional `duplicate_file_detection_record_reference`, `compared_file_reference`, `checksum_hash_match_indicator`, `file_name_date_range_vendor_match_indicators`.
- `file.correction.received` - existing baseline payload preserved; additional `correction_reupload_history_record_reference`, `original_file_tracking_reference`, `replacement_file_tracking_reference`, optional `evidence_supersession_record_reference`.
- `file.reupload.received` - existing baseline payload preserved; similar additions as `file.correction.received`.
- `file.validation.completed` - existing baseline payload preserved; additional `validation_result_record_reference`, `validation_status`, `row_count`, `accepted_row_count`, `failed_row_count`, `error_summary`.
- `file.processing.started` - existing baseline payload preserved; additional `processing_result_record_reference`, `processing_status`.
- `file.processing.failed` - existing baseline payload preserved; additional `processing_result_record_reference`, `error_code`, `error_message`.
- `file.processing.completed` - existing baseline payload preserved; additional `processing_result_record_reference`, processed counts.
- `file.processing.retry_scheduled` - existing baseline payload preserved.

PR-B does NOT modify existing baseline event payload semantics. The clarifications above are architectural additions consistent with the spine integration.

### `file.reprocess.requested` payload contract (PR-B new event)

**Payload (reference-first):**

- `reprocess_request_record_reference` - canonical reference to the Reprocess / Retry Request Record.
- `related_file_tracking_record_reference` - the File Tracking Record being reprocessed (when applicable; the related-record reference may alternatively point to API Transmission Log, Validation Result Record, or Processing Result Record per existing baseline).
- `source_module_responsible_for_execution` - the source module that will execute the reprocess.
- `requested_by` - the actor / service that submitted the request (also captured as `actor_reference` or `service_trigger_reference`).
- `requested_at` - timestamp of the request submission.
- `request_reason` - reason text or reference for the reprocess.
- `request_status` - existing baseline status.
- `audit_record_reference` - the parent Audit Record.
- Common file-event payload fields (above).

**Subscriber filter recommendations:**

- Filter by `source_module_reference` for module-specific reprocess request streams.
- Filter by `source_module_responsible_for_execution` for service consumers that need to react to incoming reprocess requests.
- Filter by `company_scope_reference` for tenant-scoped queries.

**Excluded from payload (governance):**

- Full file content. Travels as `file_storage_reference` only.
- Full source-module operational record content. Travels as `source_record_reference` only.
- Sensitive content. Subject to redaction_class governance.

### `file.reprocess.completed` payload contract (PR-B new event, terminal-outcome)

**Critical:** This event is terminal-outcome. It records ANY final state of a reprocess attempt. The payload MUST carry `outcome_status`.

**Payload (reference-first):**

- `reprocess_outcome_record_reference` - canonical reference to the Reprocess / Retry Outcome Record.
- `related_reprocess_request_reference` - the parent Reprocess / Retry Request Record.
- `outcome_status` - **REQUIRED.** Enumeration with values:
  - `completed` - reprocess executed and produced expected outcome.
  - `failed` - reprocess executed and failed.
  - `canceled` - reprocess request was canceled before execution or during execution.
  - `blocked` - reprocess was blocked (source module declined to execute, authority denied, prerequisite not met).
  - `no_new_evidence` - reprocess executed but produced no new evidence (idempotent re-run produced the same outcome).
- `new_evidence_record_reference` - optional. Populated when reprocess produced new evidence (paired with PR-A `audit.evidence-supersession.recorded` event for `outcome_status = completed` or `failed` with new evidence).
- `prior_evidence_record_reference` - optional. Populated when supersession lineage applies.
- `new_file_tracking_record_reference` - optional. Populated when reprocess produced a new file artifact.
- `audit_record_reference` - the parent Audit Record for the outcome action.
- Common file-event payload fields (above).

**Reprocess-Terminal-Outcome Rule (reaffirmed in payload contract):**

- The `outcome_status` field is REQUIRED on every emission of this event.
- All five values are terminal; no "in-progress" or "pending" outcome statuses are valid for this event.
- Subscribers MUST handle all five values.
- The event is emitted exactly once per Reprocess / Retry Outcome Record creation.

**Subscriber filter recommendations:**

- Filter by `outcome_status` to scope per outcome type:
  - Subscribers caring about successful reprocesses filter on `outcome_status = completed`.
  - Subscribers caring about failed reprocesses filter on `outcome_status = failed`.
  - Subscribers caring about canceled/blocked reprocesses filter on `outcome_status = canceled` or `blocked`.
  - Subscribers caring about no-progress reprocesses filter on `outcome_status = no_new_evidence`.
- Filter by `source_module_reference` for module-specific outcome streams.
- Filter by `company_scope_reference` for tenant-scoped queries.

**Excluded from payload (governance):**

- Full reprocess outcome detail beyond status and references. Travels via `reprocess_outcome_record_reference`.
- Full new evidence content. Travels as `new_evidence_record_reference` only.
- Full new file artifact content. Travels as `new_file_tracking_record_reference` only.
- Sensitive content. Subject to redaction_class governance.

### Pairing with PR-A `audit.evidence-supersession.recorded` (PR-B clarification)

When `file.reprocess.completed` carries `outcome_status = completed` (or `failed` with new evidence) AND `new_evidence_record_reference` is populated, PR-A's `audit.evidence-supersession.recorded` event is ALSO emitted (per PR-A Workflow 6 invoked from PR-B Workflow 8 step 8).

Subscribers may consume both events or only one. The two events are eventually consistent for the supersession transition; subscribers should handle either arrival order.

When `outcome_status = no_new_evidence`, `canceled`, or `blocked`, no `audit.evidence-supersession.recorded` event is emitted. The `file.reprocess.completed` event is the only outcome event.

### Redaction class governance on PR-B events (reaffirms existing baseline + PR-A)

All PR-B events carry `redaction_class`. The existing baseline redaction classes are preserved verbatim (per PR-A enumeration). Subscribers must respect the redaction class. Sensitive fields are governed by the redaction class for the subscriber's visibility band. PR-D will define redaction transformations; PR-B leaves the class as a tag only.

### Reference-only payload discipline (PR-B reaffirmation)

The existing baseline rule "Events must use minimal necessary data" is reaffirmed and applied to PR-B's 2 additive events and the existing 11 baseline file events:

- Source-module operational records travel as `source_record_reference` only.
- Source snapshots travel as `source_snapshot_reference` only (snapshot itself is minimized per PR-A Source Snapshot Minimization Rule).
- External system content travels as `external_evidence_reference` sub-structure only (inherited from PR-A).
- File content travels as `file_storage_reference` only (with `file_hash_reference` for integrity).
- New evidence content (in reprocess outcomes) travels as `new_evidence_record_reference` only.
- Tenant Company user data travels as `actor_reference` only.
- Company scope travels as `company_scope_reference` only.

### Idempotency on PR-B events (PR-B clarification)

PR-B's records carry `idempotency_key` and `replay_safe_dedupe_reference` (inherited from PR-A). Event subscribers should dedupe on `event_id` (envelope-level) AND on the record's `idempotency_key` (payload-level) AND on `replay_safe_dedupe_reference` (payload-level) where present.

Retried submissions of the same Reprocess / Retry Request Record MUST resolve to the same `file.reprocess.requested` event (not a duplicate event). Retried submissions of the same Reprocess / Retry Outcome Record MUST resolve to the same `file.reprocess.completed` event.

### Replay and ordering on PR-B events (reaffirms existing baseline + PR-A)

- Events should be replayable by source module, audit record, evidence record, file tracking record, reprocess request reference, correlation reference, tenant/company/entity scope, file_purpose, file_direction, outcome_status, and date range.
- Consumers should not assume global ordering across unrelated source modules or tenants.
- The `file.reprocess.requested` and `file.reprocess.completed` events for the same reprocess lifecycle are eventually consistent in the broker; consumers should handle either arrival order.
- Corrections (Correction/Reupload History, Evidence Amendment, Evidence Supersession, Reprocess/Retry Outcome) emit new events rather than rewriting historical events.

### Failure handling on PR-B events (reaffirms existing baseline + PR-A)

- Event publication failures should be retried with idempotency keys.
- Duplicate events should be deduped by event id and idempotency key.
- Poison events should enter review without blocking unrelated audit streams.
- Notification, Analytics, and AI fanout should not block core audit record creation, evidence record creation, or file tracking record creation.

### PR-B event payload contract summary

PR-B defines proposal-level payload contracts for 2 additive events and clarifies payload contracts for 11 existing baseline file events. All payloads are reference-first. The `outcome_status` field on `file.reprocess.completed` is required and is the terminal-outcome discriminator. No concrete schema definitions (JSON Schema, Avro, protobuf) are introduced under PR-B; concrete schemas are deferred to future OpenAPI hardening and broker contract work.
```

# PR-C Append-Block for `modules/logs-audit-file-tracking/event-contracts.md`

> **Target file:** `modules/logs-audit-file-tracking/event-contracts.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-C APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section.
> - Reference-first; no concrete schemas; carry minimum necessary data; reuse existing PR-A and PR-B envelope shape.
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-C Event Payload Contracts - Cross-Module Evidence Catalog`

---

## Content to append

```markdown
## PR-C Event Payload Contracts - Cross-Module Evidence Catalog

This section clarifies the `audit.evidence.recorded` event payload contract under the PR-C Cross-Module Evidence Catalog. PR-C introduces **zero new events**; this section clarifies how the PR-C catalogued `evidence_type` discriminator and related fields appear on PR-A's existing canonical evidence emission event. Payload contracts remain reference-first per the existing baseline reference-first event-contract design.

### `audit.evidence.recorded` payload contract (PR-C clarification)

PR-A established this event as the canonical cross-module evidence emission stream. PR-C clarifies the carried fields without modifying the event shape.

**Payload (architectural; reference-first):**

- `event_id` - canonical event identifier (PR-A envelope).
- `event_type` - constant `audit.evidence.recorded`.
- `evidence_record_reference` - canonical Evidence Record reference.
- `audit_record_reference` - canonical Audit Record reference.
- `evidence_type` - **REQUIRED.** One of the PR-C catalogued starter / placeholder values (currently ~87 values across 13 active families; future PR-C-and-source-module hardening may refine; future promotion PR may upgrade to final). PR-C uses zero final identifiers; subscribers must respect status discipline.
- `evidence_family` - optional / derived. One of 15 catalogued families. Whether this field is a top-level field on Evidence Record or derived view from `evidence_type` is implementation-level. PR-A's Evidence Record schema is NOT modified.
- `evidence_status` - clarifies the status of the carried `evidence_type` identifier (`starter` / `placeholder` / `final`). For PR-C-emitted events, this field carries `starter` or `placeholder`. PR-C uses zero `final` identifiers.
- `evidence_backing_classifications` - optional. Non-exclusive set of backing classifications for the carried evidence_type (subset of `file_backed` / `api_backed` / `notification_backed` / `external_backed` / `ai_backed` / `operational_state` / `decision` / `transport_delivery`). Documented mapping per Evidence Type Catalog.
- `source_module_reference` - canonical source module reference (PR-A).
- `source_record_reference` - canonical source record reference (PR-A). REQUIRED for all PR-C catalogued evidence_type values.
- `source_snapshot_reference` - canonical source snapshot reference (PR-A). REQUIRED / TYPICAL / OPTIONAL per Evidence Type Reference Requirements table; respects PR-A Source Snapshot Minimization Rule.
- `actor_reference` OR `service_trigger_reference` - one populated. REQUIRED for all PR-C catalogued evidence_type values.
- `company_scope_reference` - canonical tenant scope reference. REQUIRED for all PR-C catalogued evidence_type values.
- `external_evidence_reference` - sub-structure (PR-A). REQUIRED for `external_backed` / `api_backed` integration evidence; TYPICAL for transport_delivery + external; NOT-APPLICABLE for pure operational_state / decision business-outcome evidence.
- `evidence_attachment_reference` - reference to evidence attachment (PR-A). OPTIONAL across most evidence_type values; pairs with PR-A `evidence_attachment_reference`.
- File-backed-specific fields (when evidence is file-backed; pairs with PR-B File Tracking Record):
  - `file_tracking_record_reference` - REQUIRED for file-backed evidence types.
  - `file_storage_reference` - inherited via PR-B.
  - `file_hash_reference` - inherited via PR-B.
  - `file_integrity_reference` - inherited via PR-B.
  - `file_direction` - PR-B discriminator (`uploaded` / `generated` / `downloaded`).
  - `file_purpose` - PR-B discriminator (one of PR-B catalogued starter values; aligned with `evidence_type` where applicable).
  - `file_lifecycle_status` - PR-B discriminator (one of PR-B catalogued starter values).
- Class fields (assigned by source module at evidence creation per PR-A At-Creation Classification Rule; PR-C default class guidance is suggestion only):
  - `retention_class` - per PR-A enumeration; PR-D will lock duration matrix.
  - `redaction_class` - per PR-A enumeration; PR-D will lock transformation workflows.
  - `access_class` - per PR-A enumeration; PR-D will lock access matrix.
  - `restricted_evidence` - boolean (PR-A); PR-D will lock gating workflow.
  - `raw_evidence_reference` - PR-A.
  - `redacted_view_reference` - PR-A.
  - `legal_hold_reference` - PR-A placeholder; PR-D defines lifecycle.
- Envelope metadata (PR-A; required):
  - `evidence_schema_version`
  - `captured_at`
  - `source_event_reference`
  - `correlation_reference`
  - `trace_reference`
  - `idempotency_key`
  - `replay_safe_dedupe_reference`

**Reference-first discipline:** PR-A's reference-first payload guidance applies. Payloads carry references and identifiers, not full operational record copies. Full payloads require Full Payload Exception Record per PR-B Workflow 10. Source modules retain canonical record content.

### Subscriber filter contract (PR-C clarification)

Subscribers MAY filter `audit.evidence.recorded` events on (non-exhaustive list):

- `evidence_type` - one of PR-C catalogued starter / placeholder values. Subscribers MUST respect status discipline:
  - `starter` identifiers are usable architecture labels but NOT stable subscriber contracts; subscribers acknowledge potential refinement.
  - `placeholder` identifiers are NOT stable subscriber contracts; subscribers MUST NOT depend on placeholder identifiers.
  - `final` identifiers are stable subscriber contracts; PR-C uses zero final identifiers.
- `evidence_family` - one of 15 catalogued families. Subscribers filtering by family operate at the family-level granularity.
- `evidence_status` - subscribers may scope to starter, placeholder, or final (when future PRs promote identifiers).
- `evidence_backing_classifications` - subscribers may scope to transport_delivery vs business-outcome (operational_state, decision) vs file_backed, etc.
- `source_module_reference` - subscribers may scope to a single source module's evidence emissions.
- `company_scope_reference` - subscribers may scope to a single tenant scope (cross-tenant subscription denied by default per existing baseline).
- `restricted_evidence` - subscribers may scope to or exclude restricted evidence (access gating per PR-D when locked).
- `retention_class` / `redaction_class` / `access_class` - subscribers may scope by class bucket.
- `correlation_reference` - subscribers may correlate events for a single business operation.
- File-backed: `file_purpose`, `file_direction`, `file_lifecycle_status` - PR-B discriminators.

### Subscriber identifier refinement guidance

Because PR-C catalogued identifiers are starter or placeholder (zero final), subscribers should:

- Use mapping / enumeration tables that can be updated when source-module hardening refines identifiers, rather than hardcoded string comparison.
- Tolerate identifier renames during source-module hardening for starter values (existing data referencing the old identifier remains valid; new data uses the refined identifier).
- Tolerate identifier removals during source-module hardening for placeholder values.
- Subscribe to PR-C catalog refinement PR notifications (architectural; future PR governance) to be aware of identifier changes.

### Existing PR-A event payload contracts preserved

`audit.record.created`, `audit.evidence-amendment.recorded`, `audit.evidence-supersession.recorded` payload contracts preserved from PR-A. PR-C does NOT modify their shape. These events also carry the catalogued `evidence_type` discriminator on the embedded Evidence Record references where applicable.

### Existing PR-B event payload contracts preserved

`file.reprocess.requested` and `file.reprocess.completed` payload contracts preserved from PR-B. PR-C does NOT modify their shape. `file.reprocess.completed` remains terminal-outcome with REQUIRED `outcome_status` enum (`completed` / `failed` / `canceled` / `blocked` / `no_new_evidence`) per PR-B Reprocess-Terminal-Outcome Rule.

### Existing baseline event payload contracts preserved

All 11 baseline file events and 3 baseline API transmission events preserve their existing payload contracts. PR-C does NOT modify any baseline event payload.

### Boundary discipline applied to PR-C event payloads

- PR-C event payloads (which are existing PR-A and PR-B event payloads carrying PR-C catalogued discriminator values) MUST respect PR-A's payload guardrails (reference-first; no full operational record copies; Full Payload Exception Record required for full payloads).
- PR-C event payloads carry the `evidence_type` discriminator as a starter / placeholder catalogued value; subscribers respect status discipline.
- PR-C event payloads MUST NOT leak source-module business-decision authority. Logs & Audit observes; source modules decide.
- External evidence content travels as references and identifiers; full external payloads require Full Payload Exception Record.
- Restricted evidence honors PR-A's restricted_evidence flag and PR-D's future gating workflow.
- Tenant scope is enforced via `company_scope_reference`; cross-tenant subscription denied by default.

### Concrete payload schema discipline

PR-C does NOT define concrete payload schemas (JSON Schema / Avro / protobuf). All payload structures are architectural / reference-first. Concrete schemas are deferred to the future API Governance Foundation PR and subsequent Logs-and-Audit-specific OpenAPI / event-contracts hardening PR.

### Versioning discipline

PR-C does NOT version-bump existing baseline, PR-A, or PR-B event payload contracts. PR-A's `evidence_schema_version` continues to carry payload schema versioning semantics. PR-C catalogued `evidence_type` values are unversioned identifiers.

### Payload contract inventory summary (PR-C)

- **PR-C additive event payload contracts:** 0 (PR-C introduces zero new events).
- **PR-C clarifications:** `audit.evidence.recorded` payload carries `evidence_type` from PR-C catalog; optional `evidence_family`, `evidence_status`, `evidence_backing_classifications` documented at architectural level.
- **PR-C concrete schemas:** 0. All payload structures are reference-first / architectural.
- **PR-C event renames:** 0.
- **PR-C event removals:** 0.
```

## PR-D Event Payload Contracts - Retention / Redaction / Legal Hold / Access Governance

This section provides reference-first payload contracts for the 6 PR-D additive events. Payloads carry references and identifiers; concrete schema bindings (JSON Schema, Avro, protobuf, etc.) are deferred to the future API Governance Foundation PR and the future Logs-and-Audit-specific OpenAPI hardening PR. `openapi-contracts.md` is intentionally NOT modified by PR-D.

All PR-D events ride on top of the existing PR-A Audit Record envelope. Each event carries:

- `captured_at` (PR-A envelope field)
- `correlation_reference` (PR-A envelope field)
- `trace_reference` (PR-A envelope field)
- `idempotency_key` (PR-A envelope field)
- `replay_safe_dedupe_reference` (PR-A envelope field)
- `evidence_schema_version` (PR-A envelope field)
- `audit_record_reference` (parent Audit Record per PR-A)
- `company_scope_reference` (per PR-A tenant scope discipline)
- `source_event_reference` (PR-A envelope field; identifies the upstream event that triggered this audit event)

Source-of-truth boundary discipline (PR-A) applies; all events are derived audit / governance events emitted by Logs & Audit, NOT by source modules and NOT by Tenant Company.

### Contract 1 - `audit.retention-review.required`

**Purpose.** Emitted by Retention Review Trigger Workflow (PR-D Workflow 1) when an Evidence Record (or batch) reaches its retention review point.

**Payload (reference-first):**

- PR-A envelope fields (above).
- `evidence_record_reference` - the Evidence Record at review point (or `batch_reference` for batch review).
- `retention_class` - one of 6 retention classes (`transient`, `standard`, `extended`, `regulatory`, `legal_hold`, `audit_critical`).
- `retention_policy_reference` - the named retention policy reference (e.g., `retention_policy_standard`, `retention_policy_financial_long_term`); NOT a concrete duration value.
- `review_trigger_reason` - reason the review fired (policy expiration, scheduled batch, manual trigger, etc.).
- `actor_reference` OR `service_trigger_reference` - one populated (typically service identity for scheduled review; actor for manual trigger).
- `company_scope_reference` - tenant scope.

**Discriminators:** none.

**Subscriber semantics:** signals downstream Retention Policy Evaluation Workflow (PR-D Workflow 2) to evaluate the disposition.

**Boundary:** does NOT carry concrete duration values; does NOT carry payload content; does NOT decide disposition (that is the Retention Policy Evaluation Workflow's responsibility).

### Contract 2 - `audit.retention-disposition.recorded`

**Purpose.** Emitted by Retention Disposition Workflow (PR-D Workflow 3) when a Retention Disposition Record is created.

**Payload (reference-first):**

- PR-A envelope fields.
- `disposition_id` - the Retention Disposition Record identifier.
- `retention_disposition_record_reference` - reference to the full record.
- `evidence_record_reference` (or `batch_reference`).
- `disposition_state` - **discriminator**; one of 6 values: `retain`, `archive`, `purge_eligible`, `purge_blocked_by_hold`, `purged_reference_only`, `preserved`.
- `disposition_reason` - reason text reference.
- `retention_policy_reference` - the named retention policy reference applied.
- `legal_hold_check_result` - boolean.
- `legal_hold_reference` - populated when `legal_hold_check_result = true` (i.e., `disposition_state = purge_blocked_by_hold`).
- `proof_class` - one of `payload_deletion_proof`, `metadata_only_proof`, `both`.
- `proof_reference` - reference to disposition proof (implementation-level shape).
- `actor_reference` OR `service_trigger_reference` - one populated.
- `company_scope_reference`.
- `file_tracking_record_reference` - populated for file-backed evidence (PR-B reference).

**Discriminators:** `disposition_state` (one of 6 values).

**Subscriber semantics:** downstream purge executor consumes `purge_eligible`; archive coordinator consumes `archive`; compliance reviewer consumes `purge_blocked_by_hold`; cached-view invalidator consumes `purged_reference_only`.

**Boundary:** does NOT carry payload content; does NOT carry concrete duration values; does NOT mutate Evidence Record (per Immutable-Evidence-Retention Rule); does NOT bypass legal hold check (per Legal-Hold-Overrides-Purge Rule).

### Contract 3 - `audit.redaction.applied`

**Purpose.** Emitted by Redacted View Creation Workflow (PR-D Workflow 4) when a Redaction Transformation Record is created.

**Payload (reference-first):**

- PR-A envelope fields.
- `transformation_id` - the Redaction Transformation Record identifier.
- `redaction_transformation_record_reference` - reference to the full record.
- `evidence_record_reference` - the parent Evidence Record.
- `raw_evidence_reference` - input reference (PR-A field).
- `redacted_view_reference` - output reference (PR-A field; populated by this transformation).
- `redaction_class` - **discriminator**; one of 9 values (includes preserved `public_metadata_placeholder`): `public_metadata_placeholder`, `buyer_visible_audit`, `vendor_visible_audit`, `customer_sensitive_restricted`, `pricing_sensitive_restricted`, `invoice_sensitive_restricted`, `warranty_sensitive_restricted`, `tenant_security_restricted`, `audit_only`.
- `redaction_audience` - **discriminator**; default values: `buyer`, `vendor`, `internal`, `audit_only` (extensible by future PR).
- `redaction_version` - **discriminator**; integer; incremented on re-redaction.
- `redaction_reason` - reason text reference.
- `actor_reference` OR `service_trigger_reference` - one populated.
- `company_scope_reference`.
- `masked_payload_reference` - populated for file-backed evidence (PR-B field).
- `policy_matrix_reference` - which Redaction Policy Matrix row drove the transformation.

**Discriminators:** `redaction_class`, `redaction_audience`, `redaction_version`.

**Subscriber semantics:** caches consume to invalidate prior redacted views (when `redaction_version` increments); audience-specific distribution services consume per `redaction_audience`; compliance reviewer consumes for sensitivity verification.

**Boundary:** does NOT mutate `raw_evidence_reference` (per Redaction-Never-Overwrites-Raw Rule); does NOT carry payload content (references only); append-only (per Redaction-Transformation-Append-Only Rule).

### Contract 4 - `audit.legal-hold.applied`

**Purpose.** Emitted by Legal Hold Apply Workflow (PR-D Workflow 5) when a Legal Hold Record is created with `status = applied`.

**Payload (reference-first):**

- PR-A envelope fields.
- `hold_id` - the Legal Hold Record identifier.
- `legal_hold_record_reference` - reference to the full record.
- `hold_scope_discriminators` (sub-structure):
  - `evidence_type_scope` - list of evidence_type values (optional).
  - `evidence_family_scope` - list of evidence_family values (optional).
  - `company_scope_reference` - REQUIRED; ONE company.
  - `file_scope` - list of File Tracking Record references (optional).
  - `source_module_scope` - list of source module references (optional).
- `reason` - reference to hold reason (regulatory investigation, court order, internal investigation, etc.).
- `authority` - reference to legal authority (court order ID, regulator reference, Compliance / legal team reference).
- `owner` - reference to hold owner.
- `applied_timestamp` - hold apply timestamp.
- `applied_actor_reference` OR `applied_service_trigger_reference` - one populated.
- `status` - `applied` (PR-D Workflow 5 always emits with this status).

**Discriminators:** none directly; subscribers may filter on `hold_scope_discriminators` for relevant holds.

**Subscriber semantics:** downstream Retention Disposition Workflow re-evaluates pending dispositions; compliance alerting fires; affected Evidence Records under scope are marked for hold (evaluation-time; not mutation per Legal-Hold-Does-Not-Mutate-Evidence Rule).

**Boundary:** Legal Hold scope is multi-dimensional. `company_scope_reference` is REQUIRED single-tenant (cross-tenant holds NOT supported). Does NOT mutate Evidence Records (per Legal-Hold-Does-Not-Mutate-Evidence Rule). Append-only (per Legal-Hold-Apply-Append-Only Rule).

### Contract 5 - `audit.legal-hold.released`

**Purpose.** Emitted by Legal Hold Release Workflow (PR-D Workflow 6) when a Legal Hold Record `status` transitions from `applied` to `released` or `lapsed`.

**Payload (reference-first):**

- PR-A envelope fields.
- `hold_id` - the Legal Hold Record identifier.
- `legal_hold_record_reference` - reference to the full record.
- `hold_scope_discriminators` - same sub-structure as `audit.legal-hold.applied`.
- `released_timestamp` - release timestamp.
- `released_actor_reference` OR `released_service_trigger_reference` - one populated.
- `release_authority` - reference to release authority.
- `release_reason` - reference to release reason (optional).
- `status` - one of `released` or `lapsed`.
- `applied_timestamp` - original apply timestamp (preserved; carried for downstream re-evaluation).

**Discriminators:** `status` (one of `released` or `lapsed`).

**Subscriber semantics:** downstream Retention Disposition Workflow re-evaluates previously blocked dispositions (records with `disposition_state = purge_blocked_by_hold` may now be eligible per policy).

**Boundary:** Append-to-record only (per Legal-Hold-Apply-Append-Only Rule); does NOT delete or rewrite Legal Hold Record fields. Does NOT mutate Evidence Records (per Legal-Hold-Does-Not-Mutate-Evidence Rule).

### Contract 6 - `audit.evidence-access.recorded`

**Purpose.** Emitted by Evidence Access Recording Workflow (PR-D Workflow 8) when a hardened Audit Access Record is created. Single canonical access event covering granted, denied, and attempted-non-terminal access decisions.

**Payload (reference-first):**

- PR-A envelope fields.
- `audit_access_record_id` - identifier of the hardened Audit Access Record.
- `audit_access_record_reference` - reference to the full record.
- `evidence_record_reference` - the Evidence Record subject to the access decision.
- `access_result` - **discriminator**; one of `attempted` (non-terminal), `granted` (terminal), `denied` (terminal).
- `view_type` - **discriminator**; one of `raw`, `redacted`.
- `access_reason_reference` - REQUIRED when `view_type = raw` OR `restricted_evidence_flag = true` OR `break_glass_flag = true`; optional otherwise.
- `denial_reason` - REQUIRED when `access_result = denied`.
- `break_glass_flag` - boolean; default false; flags emergency / exceptional access.
- `access_class_evaluated` - **discriminator**; one of PR-A's 6 access_class values (`public_metadata`, `buyer_visible`, `vendor_visible`, `internal_operations`, `system_admin_only`, `compliance_only`).
- `redaction_class_evaluated` - **discriminator**; one of 9 redaction classes (includes preserved `public_metadata_placeholder`).
- `restricted_evidence_flag` - boolean; the `restricted_evidence` value of the accessed Evidence Record.
- `legal_hold_state_at_access` - one of `none`, `applied`, `released`, `lapsed`.
- `redaction_transformation_reference` - populated when `view_type = redacted`; references the Redaction Transformation Record that produced the served view.
- `actor_reference` OR `service_trigger_reference` - one populated (per PR-A discipline).
- `company_scope_reference` - tenant scope of the requester.
- `tenant_check_access_reference` - reference to the Tenant Company `check_access` evaluation (PR-D documents the expectation; Tenant Company owns).

**Discriminators:** `access_result` (3 values), `view_type` (2 values), `access_class_evaluated` (6 values), `redaction_class_evaluated` (9 values).

**Subscriber semantics:** security reviewers consume `access_result = denied` for denial anomaly detection; raw-access compliance consumes `view_type = raw` for elevated-access audit; break-glass review consumes `break_glass_flag = true`; legal-hold review consumes `legal_hold_state_at_access != none`.

**Boundary:** Every access logged (per All-Access-Logged Rule). Service identity access logged identically to human access (per Service-Identity-Access-Logged Rule). Tenant Company `check_access` is canonical for permission grant (per Tenant-Company-Owns-Authority Rule); PR-D logs the outcome.

**Terminality recap (per Codex cleanup directive 4):**

- `access_result = attempted` is non-terminal. A separate event with `access_result = granted` or `access_result = denied` may follow.
- `access_result = granted` is terminal.
- `access_result = denied` is terminal.

**NO `audit.evidence-access.denied` event.** Per Codex cleanup directive 4 and the single-canonical-event-with-discriminator pattern.

### Reference-first guarantees

PR-D event payloads are reference-first:

- **No raw payload bodies.** Concrete file payloads, full evidence content, customer PII, pricing values, invoice line items, etc., are NOT carried in PR-D event payloads. References (Evidence Record reference, File Tracking Record reference, Redaction Transformation Record reference, Audit Access Record reference, Legal Hold Record reference, Retention Disposition Record reference) carry the lookup; subscribers fetch as needed through governed access (subject to PR-D Workflow 8).
- **No concrete schema bindings.** JSON Schema, Avro, protobuf, etc., are deferred to the future API Governance Foundation PR / future Logs-and-Audit-specific OpenAPI hardening PR.
- **No payload size limits in PR-D.** Existing baseline transport limits and existing PR-A envelope discipline apply.

### Schema versioning

PR-D uses PR-A envelope versioning (`evidence_schema_version`). PR-D does NOT version-bump existing PR-A / PR-B / PR-C events. PR-D events are introduced at the same envelope version as existing events.

PR-D's Redaction Transformation Record carries `redaction_version` (per-transformation versioning for re-redaction lineage); this is NOT API envelope versioning.

### Idempotency

PR-D events use PR-A's `idempotency_key` and `replay_safe_dedupe_reference` discipline. Subscribers SHOULD de-dupe by `idempotency_key`. Replay safety is preserved.

### Subscriber filter discipline (PR-D summary)

Subscribers filter PR-D events by discriminator:

- `audit.retention-disposition.recorded` -> `disposition_state` (6 values).
- `audit.redaction.applied` -> `redaction_class` (9 values), `redaction_audience` (default 4 values), `redaction_version` (integer).
- `audit.legal-hold.applied` / `audit.legal-hold.released` -> kept as distinct events (distinct subscriber semantics).
- `audit.evidence-access.recorded` -> `access_result` (3 values), `view_type` (2 values), `access_class_evaluated` (6 PR-A values), `redaction_class_evaluated` (9 values).

### Concrete schema deferral

The following are explicitly deferred to future API Governance Foundation PR / future Logs-and-Audit-specific OpenAPI hardening PR:

- Concrete JSON Schema bindings for each of the 6 PR-D events.
- Concrete payload size limits per event.
- Concrete topic / channel routing per event.
- Concrete pagination / chunking for batch retention disposition / batch redaction.
- Concrete error-payload schemas for failed event publication.
- Concrete authentication / authorization clauses on event-subscribe endpoints.
- Concrete rate limits on event-subscribe endpoints.
- Concrete dead-letter queue handling per event.

PR-D's payload contracts are architectural; concrete shapes are bound later.

## PR-E Event Payload Contracts - Search / Query / Review / Investigation / Audit Report Export

This section documents the payload contracts for the 4 PR-E additive events at the architectural level. PR-E payloads are REFERENCE-FIRST per PR-A discipline; concrete JSON Schema / Avro / protobuf payloads are deferred to a future API Governance Foundation PR plus a follow-on Logs-and-Audit-specific OpenAPI hardening PR.

### Reference-first contract discipline (carried forward from PR-A / PR-B / PR-C / PR-D)

PR-E event payloads carry:

- **Identifiers** (entity IDs of PR-E entities + parent Audit Record reference).
- **Discriminators** (per-event discriminators documented below).
- **References** (Evidence Record / File Tracking Record / Legal Hold Record / Retention Disposition Record / Redaction Transformation Record / hardened Audit Access Record / Evidence Search Session / Evidence Review Session / Evidence Collection Record / Review Note / Annotation / Audit Report Export Record references where applicable).
- **PR-A envelope metadata** (`captured_at`, `correlation_reference`, `trace_reference`, `idempotency_key`, `evidence_schema_version`).

PR-E event payloads do NOT carry:

- Raw evidence content.
- Restricted evidence detail (PII, pricing values, customer-sensitive content, source snapshot bodies).
- Authoritative permission decisions (Tenant Company `check_access` canonical).
- Full filter set bodies (Evidence Search Session entity carries the full filter set; event payload carries reference + presence flags).
- Full note content bodies (Review Note / Annotation entity carries content reference; event payload carries reference + discriminator).
- Full export manifest bodies (Audit Report Export Record entity carries scope; event payload carries reference + discriminator).

Subscribers fetch detail via the Logs & Audit observe surfaces, with PR-D access governance applied per fetch.

### Payload contract: `audit.search.executed`

**Carried fields (architectural):**

- `search_session_reference` - identifier for the Evidence Search Session entity.
- `audit_record_reference` - parent Audit Record reference (PR-A).
- `actor_reference` OR `service_trigger_reference` - one populated.
- `company_scope_reference` - tenant scope.
- `query_target` - discriminator (`evidence_records` / `file_tracking_records` / `pr_d_governance_records`).
- `sensitive_filter_used` - boolean discriminator.
- `search_initiated_purpose_reference` - present when `sensitive_filter_used = true`; reference only (not content).
- `captured_at`, `correlation_reference`, `trace_reference`, `idempotency_key`, `evidence_schema_version` - PR-A envelope.

**NOT carried:**

- Full Evidence Search Query text body (reference only).
- Full Search Filter Set body (reference only; presence-of-dimension flags MAY appear per future API design).
- Search result candidate set (per-result access events arrive separately via PR-D `audit.evidence-access.recorded`).
- Search result count (subject to Hidden-Denied-Result Rule discipline).

**Subscriber guarantees:**

- A single `audit.search.executed` per Evidence Search Session creation.
- Idempotency via `idempotency_key`; retries deduplicate.

### Payload contract: `audit.review-session.recorded`

**Carried fields (architectural):**

- `review_session_reference` - identifier for the Evidence Review Session entity.
- `audit_record_reference` - parent Audit Record reference (PR-A).
- `actor_reference` - reviewer reference.
- `company_scope_reference` - tenant scope.
- `review_session_status` - discriminator (`open` / `closed` / `suspended`).
- `investigation_case_reference` - placeholder reference; MAY be present.
- `review_disposition` - present when `review_session_status = closed`; one of 6 disposition values.
- `review_session_opened_at` - PR-A `captured_at` discipline.
- `review_session_closed_at` - present when status transitioned to `closed`.
- `evidence_collection_reference` - present when Review Session activity created an Evidence Collection Record (otherwise NULL).
- `captured_at`, `correlation_reference`, `trace_reference`, `evidence_schema_version` - PR-A envelope.

**NOT carried:**

- Full Review Note bodies (per-note events arrive separately via `audit.review-note.recorded`).
- Full Evidence Collection Record membership detail (reference only).
- Evidence content from the records under review.

**Subscriber guarantees:**

- Emitted at session creation AND at each status transition.
- Idempotency via `idempotency_key`.

### Payload contract: `audit.review-note.recorded`

**Carried fields (architectural):**

- `review_note_reference` - identifier for the Review Note / Annotation entity.
- `audit_record_reference` - parent Audit Record reference (PR-A).
- `actor_reference` - reviewer reference.
- `company_scope_reference` - tenant scope.
- `review_note_target_kind` - discriminator (`evidence_record` / `evidence_collection` / `review_session`).
- `review_note_target_reference` - target reference (matches target_kind).
- `prior_review_note_reference` - present for correction chains (per Review-Note-Append-Only Rule); otherwise NULL.
- `review_note_redaction_class` - the redaction class assigned to the note (default `audit_only`; may be elevated).
- `review_disposition` - optional per-note disposition; one of 6 disposition values.
- `review_note_created_at` - PR-A `captured_at` discipline.
- `captured_at`, `correlation_reference`, `trace_reference`, `evidence_schema_version` - PR-A envelope.

**NOT carried:**

- Full note text body (reference only; subscribers MUST fetch via observe surface and MUST respect `review_note_redaction_class` and PR-D Redaction Policy Matrix).

**Subscriber guarantees:**

- One event per note creation (including correction notes).
- Idempotency via `idempotency_key`.

### Payload contract: `audit.evidence-export.recorded`

**Carried fields (architectural):**

- `export_id` - identifier for the Audit Report Export Record entity.
- `audit_record_reference` - parent Audit Record reference (PR-A).
- `actor_reference` OR `service_trigger_reference` - one populated.
- `company_scope_reference` - tenant scope.
- `export_status` - discriminator (`generated` / `failed` / `canceled` / `metadata_only`).
- `export_redaction_audience` - discriminator (default `internal` / `audit_only` / `compliance_only`; extensible).
- `export_purpose_reference` - reason reference.
- `export_scope_reference` - scope reference (Evidence Collection Record / Evidence Search Session / explicit Evidence Record list).
- `export_file_tracking_record_reference` - PR-B File Tracking Record reference; **POPULATED when `export_status = generated`; NULL otherwise** (per Export-File-Tracking-Only-When-Artifact-Exists Rule).
- `export_failure_reason` - present when `export_status = failed`.
- `export_cancel_reason` - present when `export_status = canceled`.
- `export_generated_at` - PR-A `captured_at` discipline; activity timestamp regardless of status.
- `captured_at`, `correlation_reference`, `trace_reference`, `idempotency_key`, `evidence_schema_version` - PR-A envelope.

**NOT carried:**

- Full export manifest body (Audit Report Export Record entity carries scope; subscribers fetch detail via observe surface).
- Generated artifact bytes (subscribers fetch via PR-B File Tracking Record reference when `export_status = generated`; fetch is access-governed per PR-D Workflow 8).

**Subscriber guarantees:**

- One event per Audit Report Export Record creation.
- Idempotency via `idempotency_key`.
- For `export_status = generated`, the PR-B File Tracking Record exists at event emission time with `file_purpose = audit_export`.
- For `export_status IN (failed, canceled, metadata_only)`, `export_file_tracking_record_reference` is NULL; subscribers MUST NOT assume a generated artifact exists.

### Reference-first payload guarantees (carried forward)

PR-E continues PR-A / PR-B / PR-C / PR-D reference-first payload discipline:

- Payloads carry identifiers and discriminators; NOT raw content.
- Subscribers fetch detail via observe surfaces.
- Access governance per fetch (PR-D Workflow 8 -> hardened Audit Access Record).
- Redaction governance per PR-D Redaction Policy Matrix on fetch render.
- Subscribers MUST NOT treat payloads as source of truth.

### Concrete schema deferral (PR-E)

- PR-E does NOT define concrete JSON Schema / Avro / protobuf payload schemas for the 4 PR-E events.
- Concrete schema versioning, schema registry, schema migration mechanics, schema evolution rules - all deferred to future API Governance Foundation PR + future Logs-and-Audit-specific OpenAPI hardening PR.
- PR-A `evidence_schema_version` envelope field discipline applies; concrete version scheme deferred.

### Idempotency and ordering discipline (carried forward)

- Idempotency via `idempotency_key` per PR-A envelope.
- Ordering within a Search Session / Review Session / Export Record is guaranteed by the entity's append-only architecture; cross-session ordering is eventually consistent.
- Per Index-Stale-Acceptable Rule, downstream consumers MUST accept eventual consistency.

### Event payload discriminator inventory (PR-E)

| Event | Discriminators carried |
|---|---|
| `audit.search.executed` | `query_target`, `sensitive_filter_used` |
| `audit.review-session.recorded` | `review_session_status` |
| `audit.review-note.recorded` | `review_note_target_kind` |
| `audit.evidence-export.recorded` | `export_status`, `export_redaction_audience` |

All discriminators reference existing PR-A / PR-B / PR-C / PR-D values where applicable; PR-E introduces NO new filterable fields beyond the discriminators above.

### Cross-PR event payload discipline

- PR-A event payloads preserved (no rename).
- PR-B event payloads preserved (no rename).
- PR-C added 0 events.
- PR-D event payloads preserved (no rename).
- All PR-A / PR-B / PR-D event payloads continue to use their existing reference-first discipline.
- PR-E events follow the same reference-first discipline.
- PR-D `audit.evidence-access.recorded` continues to cover all result access / denial / raw access / redacted access / export download access logging for PR-E workflows (per Search-Defers-To-PR-D-Access-Governance Rule + Export-Access-Logged-Via-PR-D Rule); PR-E does NOT duplicate or shadow this.
