# Logs And Audit File Tracking Events

This document is proposal-level architecture. It defines an initial event catalog and event modeling guidance for Logs & Audit File Tracking.

## Event Principles

- Events should preserve traceability references rather than copying unrestricted source payloads.
- Events should include retention class and redaction class where payload sensitivity matters.
- Events must not imply ownership of the source business record being observed.
- Events may provide signals to AI Agent Services and Analytics, but those consumers own recommendations and reporting definitions respectively.
- Events may trigger future notifications, but Notification owns delivery.

## Event Families

### Audit Record Events

- `audit.record.created`
- `audit.record.redaction_required` placeholder
- `audit.retention.review.required`

Purpose: track creation and governance of audit evidence.

### File Tracking Events

- `file.export.created`
- `file.import.received`
- `file.downloaded` placeholder
- `file.duplicate.detected`
- `file.correction.received`
- `file.reupload.received`

Purpose: track import/export, manual upload/download, duplicate detection, and correction/reupload evidence.

### Validation And Processing Events

- `file.validation.completed`
- `file.processing.started`
- `file.processing.failed`
- `file.processing.completed`
- `file.processing.retry_scheduled`

Purpose: track processing state without owning source-module business state.

### API Transmission Events

- `api.transmission.started`
- `api.transmission.failed`
- `api.transmission.retried`
- `api.transmission.completed`

Purpose: track API attempts, retries, failures, and completions.

### Vendor Operational Flow Events

- `vendor.order_export.created`
- `vendor.return_export.created`
- `vendor.shipping_import.received`
- `vendor.return_outcome_import.received`

Purpose: track manual vendor file flows where APIs are unavailable or not configured.

### AI Signal Events

- `audit.signal.repeated_import_failure`
- `audit.signal.repeated_export_failure`
- `audit.signal.vendor_file_quality_risk`
- `audit.signal.api_reliability_risk`
- `audit.signal.reconciliation_upload_issue`
- `audit.signal.shipping_import_failure`
- `audit.signal.return_import_failure`
- `audit.signal.audit_gap`
- `audit.signal.retention_risk`

Purpose: expose operational risk signals to AI Agent Services without giving AI ownership of audit records or source records.

## Required Event Fields

Proposal-level required fields:

- Event id.
- Event type.
- Event version.
- Occurred at timestamp.
- Published at timestamp.
- Producer: Logs & Audit File Tracking.
- Source module.
- Company/entity scope where applicable.
- Related record references where applicable.
- File tracking reference where applicable.
- API transmission reference where applicable.
- Retention class.
- Redaction class.
- Correlation id.
- Idempotency key where applicable.

## Optional Event Fields

- Vendor reference.
- Buyer/entity scope.
- File name.
- File type.
- Import/export direction.
- Row count.
- Failed row count.
- Validation status.
- Processing status.
- Error summary.
- Retry count.
- Duplicate detection reference.
- Correction/reupload history reference.
- Payload reference or masked payload reference.

## Redaction Classes

Proposal-level redaction classes:

- Public metadata placeholder.
- Buyer-visible audit.
- Vendor-visible audit.
- Internal operations.
- Customer-sensitive restricted.
- Pricing-sensitive restricted.
- Invoice-sensitive restricted.
- Warranty-sensitive restricted.
- Tenant/security restricted.
- Audit-only.

## Replay And Ordering

- Events should be replayable by source module, file tracking record, audit record, API transmission log, tenant/company/entity scope, and date range.
- Consumers should not assume global ordering across unrelated source modules or tenants.
- Corrections and reuploads should emit new events rather than rewriting historical events.

## Failure Handling

- Event publication failures should be retried with idempotency keys.
- Duplicate events should be deduped by event id and idempotency key.
- Poison events should enter review without blocking unrelated audit streams.
- Notification, Analytics, and AI fanout should not block core audit record creation.

## Open Questions

- Which audit events must be emitted synchronously?
- Which events should be visible to buyers or vendors?
- Which events can include payload references versus metadata only?
- What retention window is required for audit events?

## Scheduled System Admin Activity Summary Evidence - Additive Event Names (Cross-Module PR)

PR-C introduces exactly 2 additive event names in the Logs & Audit File Tracking namespace. Per the established Logs & Audit File Tracking naming convention (`audit.<subject>.<verb_past_tense>` per existing events catalog, including for example `audit.record.created`, `audit.retention.review.required`), the PR-C events use `audit.activity-summary-<subject>.<verb_past_tense>` form. The full PR-C event inventory across the three target modules is 9 events: 5 Notification Platform Service + 2 Analytics / Reporting + 2 Logs & Audit File Tracking.

Existing Logs & Audit File Tracking event names are not modified.

Event payload contract shape, redaction class, idempotency, and replay semantics for these events are documented in `event-contracts.md`.

### Activity Summary Generated Evidence (1 event)

- `audit.activity-summary-evidence.recorded` - raised when Logs & Audit Workflow 10 creates an Activity Summary Generated Evidence record in response to Analytics Workflow 5 completing with non-empty aggregation. The event carries references to the configuration, the Reporting Window, the Activity Summary Aggregation Record, and the new evidence record.

### No-Activity Summary Suppression Evidence (1 event)

- `audit.activity-summary-suppression-evidence.recorded` - raised when Logs & Audit Workflow 10 creates a No-Activity Summary Suppression Evidence record in response to Analytics Workflow 6 completing with the no-activity result. The event carries references to the configuration, the Reporting Window, and the new evidence record. **The event is emitted before Notification Platform Service consumes the suppression outcome and advances its own cursor; the payload therefore does NOT include a cursor-advancement timestamp** (the timestamp does not exist at evidence-creation time). Notification Platform Service records the cursor-advancement audit reference separately via the existing Audit Record entity pattern after it performs the cursor mutation in NPS Workflow 9 Trigger B path. The two audit surfaces (this Logs & Audit suppression-evidence record plus the NPS-side cursor-advancement Audit Record) together provide the full audit trail.

### Logs & Audit File Tracking PR-C event summary

Total Logs & Audit File Tracking additive events: 2.

By family:
- Activity Summary Generated Evidence: 1
- No-Activity Summary Suppression Evidence: 1

### Events PR-C explicitly does not introduce on the Logs & Audit File Tracking side

- Per-trigger event names for delivery-side audit retention. The existing Logs & Audit audit-record event patterns (for example `audit.record.created` per the existing baseline catalog) cover delivery-attempt, configuration-lifecycle, and similar trigger retention; PR-C does not introduce separate event names for these. Logs & Audit Workflow 10 produces existing-pattern audit records for triggers (c) through (f) per the workflow specification.
- Per-evidence-amendment event names. The existing Logs & Audit amendment workflow and its events cover amendments to the new evidence types; PR-C does not introduce per-evidence-amendment events.
- Per-retention-review event names for the new evidence types. The existing Logs & Audit retention review workflow and its events cover retention reviews for the new evidence types; PR-C does not introduce per-evidence-type retention review events.
- Per-search event names. The existing Logs & Audit sensitive-search audit pattern covers search-over-new-evidence-types; PR-C does not introduce per-evidence-type search events.
- Cross-module workflow events; Logs & Audit File Tracking emits its own events, and downstream consumers correlate via the canonical references.
- Source-module event modification of any kind.
- Delivery-attempt lifecycle events; those belong to Notification Platform Service (`notification.activity-summary-delivery.attempted` / `.succeeded` / `.failed`). Logs & Audit File Tracking does not duplicate the lifecycle.
- Aggregation lifecycle events; those belong to Analytics / Reporting (`analytics.activity-summary-window.evaluated` and `analytics.activity-summary-aggregation.created`). Logs & Audit File Tracking does not duplicate the aggregation lifecycle.

## PR-A Event Inventory - Core Evidence Spine

This section defines PR-A's additive event inventory. All existing baseline event language (event field requirements, redaction classes, replay and ordering rules, failure handling, open questions) is preserved without modification. PR-A introduces exactly 4 additive events in the `audit.*` namespace.

### Event naming convention (reaffirmed)

PR-A follows the existing baseline convention: `audit.<subject>.<past-tense>`. New events use kebab-case for multi-word subjects (e.g., `evidence-amendment`).

### PR-A Event 1 - `audit.record.created`

**Trigger:** Audit Record is created.

The existing baseline already lists this event in its events catalog at the `audit.<subject>.<past-tense>` naming pattern. PR-A preserves the event and clarifies its payload contract under the formalized reference triad. See `event-contracts.md` PR-A section for payload contract.

**PR-A clarifications:**

- The event carries the formalized `source_module_reference`, `source_record_reference` (when applicable), `source_snapshot_reference` (when applicable), `actor_reference` and/or `service_trigger_reference`, and `company_scope_reference` rather than the loose baseline field names.
- The event carries `correlation_reference`, `trace_reference` (where applicable), `idempotency_key` (where applicable), and the existing baseline retention_class, redaction_class, access_class, occurred_at, and audit_reference.
- The event may carry an optional `evidence_record_reference` when an Evidence Record was attached at creation.

### PR-A Event 2 - `audit.evidence.recorded`

**Trigger:** Evidence Record is created (attached to an Audit Record).

**Payload carriers (architectural; see `event-contracts.md` PR-A section for full proposal-level contract):**

- `evidence_record_reference`
- `audit_record_reference` (parent)
- `evidence_type` (the discriminator)
- `evidence_schema_version`
- `source_module_reference`
- `source_record_reference` (when applicable)
- `source_snapshot_reference` (when applicable)
- `source_event_reference` (when applicable)
- `external_evidence_reference` sub-structure (when applicable)
- `actor_reference` (when applicable)
- `service_trigger_reference` (when applicable)
- `company_scope_reference`
- `evidence_hash_reference`
- `evidence_attachment_reference` (when applicable)
- `captured_at`
- `occurred_at` (event timestamp, distinct from captured_at)
- `correlation_reference`
- `trace_reference` (when applicable)
- `idempotency_key` (when applicable)
- `replay_safe_dedupe_reference` (when applicable)
- `evidence_status` (active at creation)
- `retention_class`
- `redaction_class`
- `access_class`
- `restricted_evidence` (boolean flag)
- `legal_hold_reference` (placeholder; null at PR-A creation)
- `audit_reference`

**Discriminator usage:**

- Subscribers filter by `evidence_type` to subscribe only to the evidence subtypes they care about.
- PR-A does NOT define the comprehensive `evidence_type` taxonomy; PR-C catalogs it.
- A small proposal-level starter set is documented in `spec.md` and `data-model.md` PR-A sections.

**Critical rule:** PR-A explicitly DOES NOT introduce one event per evidence subtype. Subscribers wanting only `import_evidence` filter by `evidence_type = import_evidence`; subscribers wanting only `export_evidence` filter by `evidence_type = export_evidence`; etc. This applies to all future evidence_type values (product import, buyer API product export, vendor email export, vendor shipping import, media versioning, AI agent action, SLA exception, handoff consumption).

### PR-A Event 3 - `audit.evidence-amendment.recorded`

**Trigger:** Evidence Amendment Record is created on an existing Evidence Record.

**Payload carriers:**

- `evidence_amendment_record_reference`
- `target_evidence_record_reference`
- `target_evidence_record_evidence_type` (denormalized for subscriber filtering convenience)
- `amendment_reason_reference`
- `amendment_actor_reference` (when applicable)
- `amendment_service_trigger_reference` (when applicable)
- `tenant_company_authority_reference`
- `amendment_payload_reference` (when applicable)
- `company_scope_reference`
- `correlation_reference`
- `trace_reference` (when applicable)
- `occurred_at`
- `audit_record_reference` (the Audit Record for the amendment action itself)
- `audit_reference`

**Discriminator usage:**

- Subscribers may filter by `target_evidence_record_evidence_type` to track amendments to specific evidence subtypes.
- Critical: the target Evidence Record is NEVER mutated by this event. The event records the append of an amendment to the target Evidence Record's `amendment_record_reference_collection`.

### PR-A Event 4 - `audit.evidence-supersession.recorded`

**Trigger:** Evidence Supersession Record is created. The prior Evidence Record is superseded; a new Evidence Record is created.

**Payload carriers:**

- `evidence_supersession_record_reference`
- `prior_evidence_record_reference` (now transitioned to `evidence_status = superseded`)
- `new_evidence_record_reference` (created with `evidence_status = active`)
- `prior_evidence_record_evidence_type` (denormalized for subscriber filtering)
- `new_evidence_record_evidence_type` (may differ from prior if the correction changes type semantics)
- `supersession_reason_reference`
- `supersession_actor_reference` (when applicable)
- `supersession_service_trigger_reference` (when applicable)
- `tenant_company_authority_reference`
- `source_module_correction_reference` (when applicable)
- `company_scope_reference`
- `correlation_reference`
- `trace_reference` (when applicable)
- `occurred_at`
- `audit_record_reference` (the Audit Record for the supersession action itself)
- `audit_reference`

**Discriminator usage:**

- Subscribers may filter by `prior_evidence_record_evidence_type` and/or `new_evidence_record_evidence_type`.
- The event accompanies a separate `audit.evidence.recorded` for the new Evidence Record creation; subscribers may consume both or only one.
- Critical: both the prior and new Evidence Records remain in storage and remain queryable. The event records the lineage, not a destructive transition.

### Events NOT introduced by PR-A

PR-A explicitly does NOT introduce the following events. They are documented here for traceability of the design decisions.

**`audit.external-evidence-reference.recorded` (NOT introduced).** The External Evidence Reference is a sub-structure on Evidence Record. It is captured at Evidence Record creation; the `audit.evidence.recorded` event already carries it in the payload. A separate event is redundant and would pollute the event stream.

**`audit.integrity-check.recorded` (NOT introduced).** Integrity check is a future periodic-verification concern. PR-A captures the hash at evidence creation only; the hash is available on the Evidence Record and on the `audit.evidence.recorded` event payload. Periodic re-hash and compare workflows are future phase (likely PR-E or beyond).

**`audit.retention-review.required` (NOT introduced).** Retention review workflow is PR-D. PR-A captures only at-creation `retention_class` assignment; the existing baseline retention review workflow remains as-is. PR-D may introduce this event when retention review workflows are hardened.

**`audit.redaction.applied` (NOT introduced).** Redaction workflow is PR-D. PR-A captures only at-creation `redaction_class` assignment. PR-D may introduce this event when redaction transformation workflows are hardened.

**Per-evidence-type events (NOT introduced).** PR-A explicitly does NOT introduce one event per evidence subtype. The following hypothetical events are subsumed under `audit.evidence.recorded` with the `evidence_type` discriminator:

- `audit.product-import-evidence.recorded` (subsumed)
- `audit.api-product-import-evidence.recorded` (subsumed)
- `audit.buyer-api-product-export-evidence.recorded` (subsumed)
- `audit.vendor-order-export-evidence.recorded` (subsumed)
- `audit.vendor-return-export-evidence.recorded` (subsumed)
- `audit.vendor-email-export-evidence.recorded` (subsumed)
- `audit.vendor-shipping-import-evidence.recorded` (subsumed)
- `audit.vendor-delivery-import-evidence.recorded` (subsumed)
- `audit.vendor-return-import-evidence.recorded` (subsumed)
- `audit.media-upload-evidence.recorded` (subsumed)
- `audit.media-version-supersession-evidence.recorded` (subsumed)
- `audit.media-restriction-evidence.recorded` (subsumed)
- `audit.sku-alias-mapping-approval-evidence.recorded` (subsumed)
- `audit.upload-failure-recovery-evidence.recorded` (subsumed)
- `audit.activity-summary-generated-evidence.recorded` (subsumed)
- `audit.no-activity-summary-suppression-evidence.recorded` (subsumed)
- `audit.sla-exception-evidence.recorded` (subsumed)
- `audit.handoff-consumption-evidence.recorded` (subsumed)
- `audit.ai-agent-execution-evidence.recorded` (subsumed; AI Agent Services PR-A future)
- `audit.ai-agent-recommendation-evidence.recorded` (subsumed; AI Agent Services PR-A future)
- `audit.ai-agent-external-action-evidence.recorded` (subsumed; AI Agent Services PR-A future)

Subscribers wanting any of these specific evidence subtypes filter on `evidence_type` in the `audit.evidence.recorded` event payload. PR-C catalogs the comprehensive `evidence_type` taxonomy.

### PR-A event field discipline (additions to existing baseline)

The existing baseline event required and optional fields are preserved. PR-A's additive events follow the same field conventions and add:

**Required on PR-A events:**

- `evidence_schema_version` (on `audit.evidence.recorded` and downstream amendment/supersession events).
- `captured_at` (on `audit.evidence.recorded` for evidence-bearing payloads).
- `correlation_reference` (formalization of existing `correlation id` field naming).

**Optional on PR-A events:**

- `trace_reference` (distributed trace identifier).
- `replay_safe_dedupe_reference` (structured replay deduplication key).
- `source_event_reference` (when triggered by another broker event).
- `external_evidence_reference` sub-structure (on `audit.evidence.recorded` when external coordination evidence is present).
- `restricted_evidence` flag (on `audit.evidence.recorded`).
- `legal_hold_reference` (null at PR-A creation; placeholder).

### Subscriber discipline (PR-A reaffirmation)

The existing baseline rules are reaffirmed and clarified for PR-A's discriminator-based events:

- Consumers should not assume global ordering across unrelated source modules or tenants.
- Events should be replayable by source module, audit record, evidence record, correlation reference, tenant/company/entity scope, and date range.
- Corrections (amendments and supersessions) emit new events rather than rewriting historical events.
- Event publication failures should be retried with idempotency keys.
- Duplicate events should be deduped by event id and idempotency key.
- Poison events should enter review without blocking unrelated audit streams.
- Notification, Analytics, and AI fanout should not block core audit record creation or evidence record creation.
- Subscribers filter `audit.evidence.recorded` by `evidence_type` (and optionally by `source_module_reference`, `company_scope_reference`, `restricted_evidence`, `access_class`) rather than subscribing to per-evidence-type event streams.

### Boundary discipline (PR-A reaffirmation)

- PR-A events are evidence emissions, not commands. Subscribers must NOT treat them as operational state commands.
- External evidence reference content travels in `audit.evidence.recorded` payloads as references and identifiers only. External system content must NEVER be treated as CIXCI operational source of truth by event consumers.
- Source module records remain canonical; consumers requiring operational record content must resolve to source modules, not to evidence payloads.

### PR-A event inventory summary (4 additive events, exactly)

1. `audit.record.created` (existing baseline; PR-A clarifies payload under formalized references).
2. `audit.evidence.recorded` (new in PR-A; carries `evidence_type` discriminator; subsumes all per-evidence-type events).
3. `audit.evidence-amendment.recorded` (new in PR-A).
4. `audit.evidence-supersession.recorded` (new in PR-A).

No events are introduced beyond these four under PR-A. Events deferred to PR-D, PR-E, or future phases are documented above for traceability.
```

# PR-B Append-Block for `modules/logs-audit-file-tracking/events.md`

> **Target file:** `modules/logs-audit-file-tracking/events.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-B APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline event definitions or PR-A event definitions).
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-B Event Inventory - File Tracking Foundation`

---

## Content to append

```markdown
## PR-B Event Inventory - File Tracking Foundation

This section defines PR-B's additive event inventory. All existing baseline event language and PR-A event language is preserved without modification. PR-B introduces exactly 2 additive events; the existing 11 baseline file events are preserved verbatim and clarified for spine integration.

### Event naming convention (reaffirmed)

PR-B follows the existing baseline convention. New events use `file.<subject>.<past-tense>` for file-related events.

### Existing baseline file events preserved (11 events; no rename, no removal)

The following 11 baseline file events are preserved verbatim. PR-B does NOT rename, remove, or change the existing semantics of any of these events. PR-B clarifies the payload contracts under the spine in the `event-contracts.md` PR-B section.

1. `file.export.created` - existing baseline. Emitted when a file is generated by CIXCI for export. Covers `file_direction = generated` activity.
2. `file.import.received` - existing baseline. Emitted when an uploaded file is received by CIXCI. Covers `file_direction = uploaded` activity.
3. `file.downloaded` - existing baseline placeholder. Preserved as-is. Covers `file_direction = downloaded` activity (foundation-only in PR-B; full download semantics are PR-E).
4. `file.duplicate.detected` - existing baseline. Emitted when PR-B Workflow 6 produces a Duplicate File Detection Record.
5. `file.correction.received` - existing baseline. Emitted as part of PR-B Workflow 7 (Correction / Reupload Lineage).
6. `file.reupload.received` - existing baseline. Emitted as part of PR-B Workflow 7.
7. `file.validation.completed` - existing baseline. Emitted when validation completes (PR-B Workflow 9 documents linkage).
8. `file.processing.started` - existing baseline. Emitted when processing starts.
9. `file.processing.failed` - existing baseline. Emitted on processing failure.
10. `file.processing.completed` - existing baseline. Emitted on processing success.
11. `file.processing.retry_scheduled` - existing baseline. Emitted when a processing retry is scheduled (existing baseline behavior; coexists with PR-B's `file.reprocess.requested` / `file.reprocess.completed` for the explicit reprocess request/outcome lifecycle).

Plus existing API transmission events (`api.transmission.failed`, `api.transmission.retried`, `api.transmission.completed`) and PR-A audit events (`audit.record.created`, `audit.evidence.recorded`, `audit.evidence-amendment.recorded`, `audit.evidence-supersession.recorded`).

### PR-B Event 1 - `file.reprocess.requested`

**Trigger:** PR-B Workflow 8 step 3, when a Reprocess / Retry Request Record is created.

**Payload carriers (architectural; see `event-contracts.md` PR-B section for full proposal-level contract):**

- `reprocess_request_reference`
- `related_file_tracking_record_reference` (or `related_api_transmission_log_reference` / `related_validation_result_record_reference` / `related_processing_result_record_reference` per existing baseline)
- `source_module_responsible_for_execution`
- `requested_by` (the actor / service that submitted the request)
- `requested_at`
- `request_reason`
- `request_status`
- `correlation_reference`
- `trace_reference` (when applicable)
- `idempotency_key` (when applicable)
- `retention_class`
- `redaction_class`
- `access_class`
- `audit_record_reference` (the parent Audit Record for the request action)
- `audit_reference`

**Subscriber filter recommendations:**

- Filter by `source_module_reference` to scope per-module.
- Filter by `company_scope_reference` for tenant-scoped queries.

### PR-B Event 2 - `file.reprocess.completed` (terminal-outcome event)

**Trigger:** PR-B Workflow 8 step 7, when a Reprocess / Retry Outcome Record is created.

**Critical:** This event is **terminal-outcome, NOT success-only.** It records ANY final state of a reprocess attempt. The event is emitted regardless of whether the outcome was successful, failed, canceled, blocked, or produced no new evidence. The required `outcome_status` field distinguishes the outcome type; subscribers filter by `outcome_status` to track specific outcome types.

**Payload carriers (architectural; see `event-contracts.md` PR-B section for full proposal-level contract):**

- `reprocess_outcome_reference`
- `related_reprocess_request_reference`
- `outcome_status` - **REQUIRED.** Enumeration:
  - `completed` - reprocess executed and produced expected outcome.
  - `failed` - reprocess executed and failed.
  - `canceled` - reprocess request was canceled before execution or during execution.
  - `blocked` - reprocess was blocked (source module declined to execute, authority denied, prerequisite not met).
  - `no_new_evidence` - reprocess executed but produced no new evidence (idempotent re-run produced the same outcome).
- `new_evidence_record_reference` - optional. Populated when reprocess produced new evidence.
- `prior_evidence_record_reference` - optional. Populated when supersession lineage applies.
- `new_file_tracking_record_reference` - optional. Populated when reprocess produced a new file artifact.
- `correlation_reference`
- `trace_reference` (when applicable)
- `retention_class`
- `redaction_class`
- `access_class`
- `audit_record_reference` (the parent Audit Record for the outcome action)
- `audit_reference`

**Reprocess-Terminal-Outcome Rule (canonical, new in PR-B; Codex cleanup directive):**

- The `file.reprocess.completed` event records ANY terminal state of a reprocess attempt.
- Subscribers MUST handle all five `outcome_status` values; none are skipped.
- Subscribers filtering for "successful reprocess only" filter on `outcome_status = completed`.
- Subscribers filtering for "failed reprocess only" filter on `outcome_status = failed`.
- Subscribers filtering for "no-progress reprocess" filter on `outcome_status = no_new_evidence`, `canceled`, or `blocked`.

**Subscriber filter recommendations:**

- Filter by `outcome_status` to scope per outcome type.
- Filter by `source_module_reference` to scope per-module.
- Filter by `company_scope_reference` for tenant-scoped queries.
- Pair with `audit.evidence-supersession.recorded` (PR-A) for new-evidence outcomes.

### Events NOT introduced by PR-B

PR-B explicitly does NOT introduce the following events. They are documented here for traceability of the design decisions.

**`file.upload.received` (NOT introduced).** Existing `file.import.received` already covers uploaded files. The naming convention is preserved.

**`file.generated.recorded` (NOT introduced).** Existing `file.export.created` already covers generated files.

**`file.lifecycle_status.changed` (NOT introduced).** Existing events already carry lifecycle transitions: `file.validation.completed` carries validation_passed/validation_failed; `file.processing.*` carries processing transitions; `file.duplicate.detected` carries duplicate_detected; `file.correction.received` and `file.reupload.received` carry replacement transitions; `file.processing.retry_scheduled` and PR-B's `file.reprocess.requested` / `file.reprocess.completed` carry retry transitions. A generic lifecycle event would duplicate them.

**`audit.file-tracking-record.recorded` (NOT introduced).** PR-A's `audit.evidence.recorded` event for `evidence_type = file_evidence` already covers File Tracking Record creation (via PR-A Workflow 1 invoked by PR-B Workflow 1).

**Per-evidence-type or per-file-purpose events (NOT introduced).** PR-A's `audit.evidence.recorded` with `evidence_type` discriminator handles per-evidence-type subscription. Subscribers filter on `evidence_type` and `file_purpose` (where carried in the event payload). The following hypothetical events are subsumed:

- `file.product-import.recorded` (subsumed; subscribers filter on `evidence_type` + `file_purpose = product_import`)
- `file.product-export.recorded` (subsumed)
- `file.vendor-order-export.recorded` (subsumed)
- `file.vendor-return-export.recorded` (subsumed)
- `file.vendor-email-export.recorded` (subsumed)
- `file.vendor-shipping-import.recorded` (subsumed)
- `file.vendor-delivery-import.recorded` (subsumed)
- `file.vendor-return-import.recorded` (subsumed)
- `file.media-upload.recorded` (subsumed)
- `file.invoice-export.recorded` (subsumed)
- `file.report-export.recorded` (subsumed)
- `file.audit-export.recorded` (subsumed)
- `file.ai-agent-generated.recorded` (subsumed; future AI Agent Services PR-A)

PR-C catalogs the comprehensive `evidence_type` and `file_purpose` taxonomy.

**File-specific retention / redaction / legal-hold events (NOT introduced).** PR-D scope.

**File-specific search / query / review events (NOT introduced).** PR-E scope.

### PR-B event field discipline (additions to existing baseline)

PR-B's additive events follow the existing baseline event envelope conventions and add the spine integration references and PR-B-specific fields documented above.

The existing 11 baseline file events should carry the following normalized fields in their payloads where applicable (architectural; not a schema change in PR-B):

- `file_tracking_record_reference` - the canonical reference.
- `evidence_record_reference` - the parent Evidence Record.
- `audit_record_reference` - the parent Audit Record.
- `file_direction` - uploaded / generated / downloaded.
- `file_purpose` - the business meaning value.
- `file_lifecycle_status` - the current state at event emission.
- `source_module_reference`, `source_record_reference` (when applicable).
- `company_scope_reference`.
- `correlation_reference`.
- `retention_class`, `redaction_class`, `access_class`.

PR-B documents the architectural payload shape; concrete payload schema is implementation-level.

### Subscriber discipline (PR-B reaffirms baseline + PR-A)

The existing baseline and PR-A rules are reaffirmed:

- Consumers should not assume global ordering across unrelated source modules or tenants.
- Events should be replayable by source module, audit record, evidence record, file tracking record, correlation reference, tenant/company/entity scope, file_purpose, file_direction, and date range.
- Corrections (Correction/Reupload History, Evidence Amendment, Evidence Supersession, Reprocess/Retry Outcome) emit new events rather than rewriting historical events.
- Subscribers filter by `evidence_type`, `file_direction`, `file_purpose`, `outcome_status`, `source_module_reference`, `company_scope_reference`, `restricted_evidence` rather than subscribing to per-purpose or per-outcome event streams.
- Event publication failures should be retried with idempotency keys.
- Duplicate events should be deduped by event id and idempotency key.
- Poison events should enter review without blocking unrelated audit streams.
- Notification, Analytics, and AI fanout should not block core audit record creation, evidence record creation, or file tracking record creation.

### Boundary discipline (PR-B reaffirmation)

- PR-B events are evidence emissions, not commands. Subscribers must NOT treat them as operational state commands.
- External evidence reference content travels in event payloads as references and identifiers only.
- Source module records remain canonical; consumers requiring operational record content must resolve to source modules, not to file evidence payloads.
- The `file.reprocess.completed` event carries `outcome_status` to indicate the terminal state; subscribers must respect all five values.

### PR-B event inventory summary

**Existing baseline events preserved:** 11 file events + 3 API transmission events + 4 PR-A audit events.

**PR-B additive events: exactly 2.**

1. `file.reprocess.requested`
2. `file.reprocess.completed` (terminal-outcome with required `outcome_status` enum)

**Net event inventory after PR-B:** 13 file events, 3 API transmission events, 4 audit events.

**No per-evidence-type events introduced.** No `audit.file-tracking-record.recorded` event introduced. No `file.upload.received`, `file.generated.recorded`, or `file.lifecycle_status.changed` events introduced. File-specific retention / redaction / legal-hold events deferred to PR-D. File-specific search / query / review events deferred to PR-E.
```

# PR-C Append-Block for `modules/logs-audit-file-tracking/events.md`

> **Target file:** `modules/logs-audit-file-tracking/events.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-C APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section.
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-C Event Inventory - Cross-Module Evidence Catalog`

---

## Content to append

```markdown
## PR-C Event Inventory - Cross-Module Evidence Catalog

This section confirms PR-C's event discipline. **PR-C introduces ZERO additive events.** All cross-module evidence emission flows through PR-A's existing `audit.evidence.recorded` event carrying the `evidence_type` discriminator (populated with PR-C catalogued starter / placeholder values).

### PR-C additive events: ZERO

PR-C introduces NO new events. Specifically:

- **No per-evidence-type events.** Hypothetical events like `audit.evidence.product-import.recorded`, `audit.evidence.vendor-shipping-import.recorded`, `audit.evidence.media-upload.recorded` are subsumed by PR-A's `audit.evidence.recorded` event carrying the `evidence_type` discriminator.
- **No per-family events.** Hypothetical events like `audit.family.product-catalog.evidence.recorded` are NOT introduced.
- **No status-transition events.** Identifier status promotion (starter -> final) is a future-PR documentation change; no event is emitted.
- **No catalog discovery events.** Catalog discovery is an architectural surface, not an event.
- **No backing-classification-specific events.** Subscribers filter on backing classification, not via per-backing events.
- **No identifier refinement events.** Starter identifier refinement (which happens during source-module hardening) is captured via the source-module's own evidence emission discipline, not a separate event.

### Existing baseline file events preserved (no rename, no removal)

All 11 existing baseline file events preserved:

1. `file.export.created`
2. `file.import.received`
3. `file.downloaded`
4. `file.duplicate.detected`
5. `file.correction.received`
6. `file.reupload.received`
7. `file.validation.completed`
8. `file.processing.started`
9. `file.processing.failed`
10. `file.processing.completed`
11. `file.processing.retry_scheduled`

Plus baseline API transmission events: `api.transmission.failed`, `api.transmission.retried`, `api.transmission.completed`.

### Existing PR-A events preserved (no rename, no removal)

All 4 PR-A events preserved:

1. `audit.record.created`
2. `audit.evidence.recorded` - **canonical evidence emission stream; PR-C catalogued `evidence_type` discriminator populated here**
3. `audit.evidence-amendment.recorded`
4. `audit.evidence-supersession.recorded`

### Existing PR-B events preserved (no rename, no removal)

All 2 PR-B events preserved:

1. `file.reprocess.requested`
2. `file.reprocess.completed` - terminal-outcome with required `outcome_status` enum (`completed` / `failed` / `canceled` / `blocked` / `no_new_evidence`)

### Canonical evidence emission stream

PR-A's `audit.evidence.recorded` event is the canonical surface for cross-module evidence emission. PR-C catalogues `evidence_type` values populate the discriminator on this event.

PR-C does NOT split this stream. PR-C does NOT introduce per-evidence-type or per-family streams. Subscribers filter the canonical stream by:

- `evidence_type` (one of ~87 catalogued starter / placeholder values; zero final in PR-C)
- `evidence_family` (one of 15 families; derived or denormalized; implementation-level)
- Backing classification (file_backed / api_backed / notification_backed / external_backed / ai_backed / operational_state / decision / transport_delivery)
- `status` (starter / placeholder; subscribers should not depend on placeholder identifiers)
- `source_module_reference`, `company_scope_reference`, `correlation_reference`, `restricted_evidence`, `retention_class`, `redaction_class`, `access_class`
- File-backed-specific: `file_purpose` (from PR-B), `file_direction` (from PR-B), `file_lifecycle_status` (from PR-B)
- Reprocess-specific: `outcome_status` (from PR-B on Reprocess / Retry Outcome Record)

### Event field discipline (PR-C clarification)

PR-C clarifies that PR-A's `audit.evidence.recorded` event payload should carry:

- `event_id` - canonical event identifier (PR-A envelope field).
- `event_type = audit.evidence.recorded` (unchanged).
- `evidence_record_reference` - canonical Evidence Record reference.
- `evidence_type` - **REQUIRED.** One of the PR-C catalogued starter / placeholder values (or a value cataloged in a future PR after starter -> final promotion).
- `evidence_family` - optional / derived. Documented mapping; concrete schema is implementation-level.
- `evidence_status` - status of the carried evidence_type identifier (starter / placeholder / final). PR-C clarifies the field semantics; concrete schema is implementation-level.
- `evidence_backing_classifications` - optional. Non-exclusive set of backing classifications for the evidence_type. Documented mapping; concrete schema is implementation-level.
- All other PR-A envelope fields: `evidence_schema_version`, `captured_at`, `source_event_reference`, `correlation_reference`, `trace_reference`, `idempotency_key`, `replay_safe_dedupe_reference`, `source_module_reference`, `source_record_reference`, `source_snapshot_reference`, `actor_reference` or `service_trigger_reference`, `company_scope_reference`, `retention_class`, `redaction_class`, `access_class`, `restricted_evidence`, etc.
- For file-backed evidence: `file_tracking_record_reference`, `file_purpose`, `file_direction`, `file_lifecycle_status` (from PR-B).
- For external_backed evidence: `external_evidence_reference` sub-structure (from PR-A).

PR-C documents the architectural payload shape; concrete payload schema is implementation-level.

### Subscriber discipline (PR-C reaffirms baseline + PR-A + PR-B)

The existing baseline, PR-A, and PR-B subscriber discipline applies in full:

- Consumers should not assume global ordering across unrelated source modules or tenants.
- Events should be replayable by source module, audit record, evidence record, file tracking record, correlation reference, tenant / company / entity scope, evidence_type, evidence_family, file_purpose, file_direction, outcome_status, and date range.
- Corrections emit new events rather than rewriting historical events.
- Subscribers filter by `evidence_type`, `evidence_family`, `file_direction`, `file_purpose`, `outcome_status`, `source_module_reference`, `company_scope_reference`, `restricted_evidence` rather than subscribing to per-evidence-type or per-family event streams.
- Event publication failures should be retried with idempotency keys.
- Duplicate events should be deduped by event id and idempotency key.
- Poison events should enter review without blocking unrelated audit streams.
- Notification, Analytics, and AI fanout should not block core audit record creation, evidence record creation, or file tracking record creation.

### Status discipline applied to subscribers

- Subscribers consuming `evidence_type` values must respect status discipline.
- Subscribers may use `starter` identifiers as usable architecture labels but acknowledge that identifiers MAY be refined during source-module hardening. Subscriber code should accommodate identifier refinement (e.g., use enumeration mapping rather than hardcoded string comparison where possible).
- Subscribers MUST NOT depend on `placeholder` identifiers. Placeholder identifiers MAY be renamed, consolidated, or removed during source-module hardening.
- Only `final` identifiers are stable subscriber contracts. PR-C uses ZERO final identifiers; future promotion PR required.
- Subscribers consuming events from `future` family slots (AI Agent Services, Warranty Registration) will receive zero events from those slots until source modules exist and future PRs populate the families.

### Boundary discipline (PR-C reaffirmation)

- PR-C events (which are existing PR-A events carrying PR-C catalogued discriminator values) are evidence emissions, not commands. Subscribers must NOT treat them as operational state commands.
- External evidence reference content travels in event payloads as references and identifiers only.
- Source module records remain canonical; consumers requiring operational record content must resolve to source modules, not to event payloads.
- `audit.evidence.recorded` carries `evidence_type` to indicate the catalogued taxonomic value; subscribers must respect status discipline on the carried value.
- Transport-delivery evidence is distinct from business-outcome evidence; subscribers should distinguish via backing classification, not via event-stream subscription.

### PR-C event inventory summary

- Existing baseline events preserved: 11 file events + 3 API transmission events + 4 PR-A audit events + 2 PR-B file-reprocess events = 20 total events preserved.
- **PR-C additive events: 0.**
- Net event inventory after PR-C: 20 events (unchanged from PR-A + PR-B).

PR-A's `audit.evidence.recorded` is the canonical cross-module evidence emission stream. The `evidence_type` discriminator on this event is populated by PR-C catalogued starter / placeholder values. Subscribers fan out from this canonical stream and filter.
```

## PR-D Event Inventory - Retention / Redaction / Legal Hold / Access Governance

PR-D introduces exactly **6 additive events** on top of the existing baseline file events, baseline API transmission events, PR-A audit events, and PR-B file-reprocess events. PR-D does NOT rename, remove, or modify any existing event. PR-C introduced zero additive events; PR-D is additive on the same canonical surface.

### Existing baseline events preserved (no rename, no removal)

- **11 baseline file events.**
- **3 baseline API transmission events.**

These continue to be the file lifecycle / transport surfaces for downstream consumers.

### PR-A events preserved (no rename, no removal)

- `audit.record.created`
- `audit.evidence.recorded`
- `audit.evidence-amendment.recorded`
- `audit.evidence-supersession.recorded`

### PR-B events preserved (no rename, no removal)

- `file.reprocess.requested`
- `file.reprocess.completed`

### PR-C additive events (zero)

PR-C introduced zero additive events. `audit.evidence.recorded` (PR-A) with `evidence_type` discriminator (PR-C) remains the canonical evidence emission surface.

### PR-D additive events (6)

PR-D introduces exactly 6 additive governance-lifecycle events:

1. **`audit.retention-review.required`** - emitted by Retention Review Trigger Workflow (PR-D Workflow 1) when an Evidence Record (or batch) reaches its retention review point.

2. **`audit.retention-disposition.recorded`** - emitted by Retention Disposition Workflow (PR-D Workflow 3) when a Retention Disposition Record is created. Carries `disposition_state` discriminator (one of 6 values: `retain`, `archive`, `purge_eligible`, `purge_blocked_by_hold`, `purged_reference_only`, `preserved`).

3. **`audit.redaction.applied`** - emitted by Redacted View Creation Workflow (PR-D Workflow 4) when a Redaction Transformation Record is created. Carries `redaction_class` (9 values; includes preserved `public_metadata_placeholder`), `redaction_audience` (default values: `buyer`, `vendor`, `internal`, `audit_only`), and `redaction_version` discriminators.

4. **`audit.legal-hold.applied`** - emitted by Legal Hold Apply Workflow (PR-D Workflow 5) when a Legal Hold Record is created with `status = applied`.

5. **`audit.legal-hold.released`** - emitted by Legal Hold Release Workflow (PR-D Workflow 6) when a Legal Hold Record `status` transitions to `released` or `lapsed`.

6. **`audit.evidence-access.recorded`** - emitted by Evidence Access Recording Workflow (PR-D Workflow 8) when a hardened Audit Access Record is created. Carries `access_result` (3 values: `attempted` non-terminal, `granted` terminal, `denied` terminal) and `view_type` (2 values: `raw`, `redacted`) discriminators. Single canonical access event; covers granted, denied, and attempted-incomplete access decisions.

### Event count summary

- Existing baseline file events: **11 preserved.**
- Existing baseline API transmission events: **3 preserved.**
- PR-A events: **4 preserved.**
- PR-B events: **2 preserved.**
- PR-C additive events: **0.**
- **PR-D additive events: 6.**
- **Net event inventory after PR-D: 26 events.**

### Events NOT introduced by PR-D (intentionally subsumed)

- **No `audit.evidence-access.denied` event.** Per Codex cleanup directive 4 and the single-canonical-event-with-discriminator pattern, denial is recorded via `access_result = denied` on `audit.evidence-access.recorded`.
- **No per-evidence-type events.** Per existing PR-A discipline; `evidence_type` (PR-C) is a discriminator on `audit.evidence.recorded`, not an event-multiplier.
- **No per-family events.** Same discipline; family is a property of `evidence_type`.
- **No `audit.legal-hold.changed`.** Apply and release have distinct subscriber semantics (apply triggers compliance alerting; release triggers purge re-evaluation); kept as two separate events.
- **No `audit.legal-hold.scope-changed`.** Rescoping is release + re-apply, which uses the existing `audit.legal-hold.released` + `audit.legal-hold.applied` events.
- **No `audit.retention.archive-completed`, `audit.retention.purge-executed`, `audit.retention.archive-failed`, `audit.retention.preservation-applied`, etc.** Subsumed by `disposition_state` discriminator on `audit.retention-disposition.recorded`.
- **No `audit.redaction.policy-changed`.** Policy matrix changes are documentation / governance, not runtime events.
- **No `audit.redaction.removed`.** Per Redaction-Transformation-Append-Only Rule, redaction transformations are append-only; re-redaction creates a new record with incremented `redaction_version`.
- **No `audit.evidence-access.raw-served`.** Subsumed by `view_type = raw` on `audit.evidence-access.recorded`.
- **No `audit.evidence-access.break-glass-triggered`.** Subsumed by `break_glass_flag = true` on hardened Audit Access Record (carried in event payload).

### Subscriber discipline (PR-D guidance)

Subscribers SHOULD filter PR-D events by discriminator rather than expecting separate event streams:

- **For retention dispositions:** subscribe to `audit.retention-disposition.recorded` and filter by `disposition_state` (`purge_eligible` triggers downstream purge executor; `archive` triggers archival coordinator; `purge_blocked_by_hold` flags compliance review; `purged_reference_only` updates cached views; etc.).
- **For redaction:** subscribe to `audit.redaction.applied` and filter by `redaction_class` / `redaction_audience` / `redaction_version`.
- **For legal hold:** subscribe to `audit.legal-hold.applied` for compliance alerting; subscribe to `audit.legal-hold.released` for purge re-evaluation; they are distinct subscriber audiences.
- **For evidence access:** subscribe to `audit.evidence-access.recorded` and filter by `access_result` (granted / denied / attempted-non-terminal) and `view_type` (raw / redacted).

### Discriminator-first design (PR-D pattern continuation)

PR-D continues the PR-A / PR-B / PR-C single-canonical-event-with-discriminator pattern:

- PR-A: `audit.evidence.recorded` carries `evidence_type` discriminator (PR-C catalog).
- PR-B: `file.reprocess.completed` carries `outcome_status` discriminator.
- PR-C: zero new events; relies on PR-A `audit.evidence.recorded` + `evidence_type`.
- PR-D: 6 new events; each carries its own discriminators (`disposition_state`, `redaction_class` / `redaction_audience` / `redaction_version`, `access_result` / `view_type`).

This pattern keeps the event inventory tight and the subscriber filter surface explicit.

### Sub-typing discipline

PR-D does NOT introduce event sub-types of the form `audit.retention-disposition.archive`, `audit.retention-disposition.purge`, etc. Each retention disposition (regardless of state) uses the single canonical `audit.retention-disposition.recorded` event with `disposition_state` discriminator. Same for redaction (single canonical `audit.redaction.applied`) and access (single canonical `audit.evidence-access.recorded`).

This is the same discipline PR-A used for `audit.evidence.recorded` (rather than 87 per-evidence_type events) and PR-B used for `file.reprocess.completed` (rather than per-outcome events).

### Event versioning

PR-D events use PR-A envelope versioning (`evidence_schema_version` field carried via the Audit Record envelope). PR-D does NOT version-bump existing events. PR-D events are introduced at the same envelope version as the existing baseline.

### Event payload contracts

See `event-contracts.md` PR-D section for the reference-first payload contract for each of the 6 PR-D events. Payloads are reference-first (carry references and identifiers; not concrete schemas). Concrete schema bindings are deferred to the future API Governance Foundation PR / Logs-and-Audit-specific OpenAPI hardening PR.

### access_result terminality recap (PR-D)

Per Codex cleanup directive 4, restated here for the access event:

- `access_result = attempted` is **non-terminal**. The access decision did not reach a terminal outcome (e.g., evaluation interrupted, authority lookup failed in transit, partial decision). Logged for traceability.
- `access_result = granted` is **terminal**. Access was granted; view served per `view_type`.
- `access_result = denied` is **terminal**. Access was denied; `denial_reason` populated.

A single Evidence Record access flow may produce ONE `audit.evidence-access.recorded` event with the terminal outcome, or in rare cases may produce a non-terminal `attempted` event followed by a separate terminal event when the decision resumes. Subscribers MUST handle both patterns.

### NO `audit.evidence-access.denied` event

PR-D explicitly does NOT introduce `audit.evidence-access.denied` as a separate event. Denials are recorded via `access_result = denied` on `audit.evidence-access.recorded`. This is intentional per Codex strong recommendation.

### Event-emission boundary discipline (PR-D)

- Logs & Audit emits PR-D events; source modules do NOT emit PR-D events.
- Tenant Company does NOT emit PR-D events; Logs & Audit logs Tenant Company `check_access` outcomes via PR-D Workflow 8 -> `audit.evidence-access.recorded`.
- PR-D events flow through the existing PR-A Audit Record envelope.
- All PR-D events carry PR-A envelope fields (`captured_at`, `correlation_reference`, `trace_reference`, `idempotency_key`, `replay_safe_dedupe_reference`, `evidence_schema_version`).

### Event inventory boundary check (PR-D summary)

- New entities introduced by PR-D: 3 (Legal Hold Record, Retention Disposition Record, Redaction Transformation Record).
- New entity hardened: 1 (Audit Access Record).
- New events: 6.
- Events NOT introduced (subsumed): `audit.evidence-access.denied`, per-evidence-type events, per-family events, `audit.legal-hold.changed`, `audit.legal-hold.scope-changed`, `audit.retention.archive-completed`, `audit.retention.purge-executed`, `audit.redaction.policy-changed`, `audit.redaction.removed`, `audit.evidence-access.raw-served`, `audit.evidence-access.break-glass-triggered`.
- Existing event inventory preserved without rename or removal.

## PR-E Event Inventory - Search / Query / Review / Investigation / Audit Report Export

PR-E adds exactly **4 additive events** on top of the existing 26 baseline + PR-A + PR-B + PR-D events (PR-C added 0 events). All existing events are preserved without rename.

### PR-E Event Inventory (4 additive)

#### 1 - `audit.search.executed`

- **Emitted by:** Evidence Search Session Creation Workflow (PR-E Workflow 1).
- **Trigger:** Evidence Search Session entity is created.
- **Discriminators carried:**
  - `query_target` - one of `evidence_records` / `file_tracking_records` / `pr_d_governance_records`.
  - `sensitive_filter_used` - boolean.
- **Subscriber semantics:** Anomaly detection (abusive search), search audit reporting, sensitive-filter compliance review.
- **Notes:** Per-result access events flow through PR-D `audit.evidence-access.recorded`; this event signals the search activity at the session level, NOT per-result.

#### 2 - `audit.review-session.recorded`

- **Emitted by:** Evidence Review Session Creation Workflow (PR-E Workflow 10).
- **Trigger:** Evidence Review Session entity is created OR transitions status (`open` -> `closed` / `suspended`; `suspended` -> `open` / `closed`).
- **Discriminator carried:**
  - `review_session_status` - one of `open` / `closed` / `suspended`.
- **Subscriber semantics:** Investigation lifecycle subscribers (case management, escalation routing).
- **Notes:** Also emitted when an Evidence Collection Record is created within a Review Session context (the collection creation is part of session activity); when collections are created standalone, PR-A `audit.record.created` is emitted instead. NO separate `audit.evidence-collection.recorded` event.

#### 3 - `audit.review-note.recorded`

- **Emitted by:** Review Note / Annotation Recording Workflow (PR-E Workflow 11).
- **Trigger:** Review Note / Annotation entity is created (including correction notes that reference a prior note via `prior_review_note_reference`).
- **Discriminator carried:**
  - `review_note_target_kind` - one of `evidence_record` / `evidence_collection` / `review_session`.
- **Subscriber semantics:** Note-distribution / case-management subscribers; investigation case continuity.
- **Notes:** Subscribers MUST respect `review_note_redaction_class` and PR-D Redaction Policy Matrix when rendering note content.

#### 4 - `audit.evidence-export.recorded`

- **Emitted by:** Audit Report / Evidence Export Recording Workflow (PR-E Workflow 13).
- **Trigger:** Audit Report Export Record entity is created (for ANY `export_status`: `generated` / `failed` / `canceled` / `metadata_only`).
- **Discriminators carried:**
  - `export_status` - one of `generated` / `failed` / `canceled` / `metadata_only`.
  - `export_redaction_audience` - default `internal` / `audit_only` / `compliance_only`; extensible.
- **Subscriber semantics:** Compliance / regulatory distribution, export verification, downstream alerting, failure / cancellation observability.
- **Notes:**
  - Single canonical event covers ALL export-activity outcomes; the `export_status` discriminator differentiates.
  - When `export_status = generated`, downstream subscribers may fetch the generated artifact via the PR-B File Tracking Record reference (`export_file_tracking_record_reference`).
  - When `export_status IN (failed, canceled, metadata_only)`, `export_file_tracking_record_reference` is NULL; subscribers MUST NOT assume a generated artifact exists.
  - NO separate `audit.evidence-export.generated` event is introduced; `audit.evidence-export.recorded` with `export_status = generated` is canonical for successful generation.

### Existing event inventory preserved (no rename, no removal)

#### Baseline file events (11 preserved)

The 11 baseline file events from the original `events.md` baseline are preserved verbatim.

#### Baseline API transmission events (3 preserved)

The 3 baseline API transmission events from the original `events.md` baseline are preserved verbatim.

#### PR-A audit events (4 preserved)

PR-A's 4 events preserved verbatim (`audit.record.created`, `audit.evidence.recorded`, `audit.evidence-amendment.recorded`, `audit.evidence-supersession.recorded`).

#### PR-B file-reprocess events (2 preserved)

PR-B's 2 events preserved verbatim (`file.reprocess.requested`, `file.reprocess.completed`).

#### PR-C additive events (0)

PR-C did NOT introduce events.

#### PR-D audit-governance events (6 preserved)

PR-D's 6 events preserved verbatim (`audit.retention-review.required`, `audit.retention-disposition.recorded`, `audit.redaction.applied`, `audit.legal-hold.applied`, `audit.legal-hold.released`, `audit.evidence-access.recorded`).

### Event count summary

| Event source | Count |
|---|---|
| Baseline file events | 11 |
| Baseline API transmission events | 3 |
| PR-A audit events | 4 |
| PR-B file-reprocess events | 2 |
| PR-C additive events | 0 |
| PR-D audit-governance events | 6 |
| **PR-E additive events** | **4** |
| **Net event inventory after PR-E** | **30** |

### Events NOT introduced by PR-E (intentionally subsumed)

PR-E explicitly does NOT introduce the following events:

- **`audit.evidence-export.generated`** - subsumed by `audit.evidence-export.recorded` with `export_status = generated` discriminator. Single canonical event with discriminator pattern (per PR-A / PR-B / PR-C / PR-D discipline).
- **`audit.search.denied`** - subsumed by PR-D `audit.evidence-access.recorded` with `access_result = denied` per Search-Defers-To-PR-D-Access-Governance Rule.
- **`audit.evidence-export.downloaded`** - subsumed by PR-D `audit.evidence-access.recorded` on download access per Export-Access-Logged-Via-PR-D Rule.
- **`audit.evidence-collection.recorded`** - subsumed by `audit.review-session.recorded` (if collection is created within a session) or PR-A `audit.record.created` (if collection is created standalone).
- **`audit.review-collection.created`** - NOT introduced; same rationale as above.
- **`audit.investigation-case.opened`** - NOT introduced (Investigation Case Reference is placeholder for future module).
- **`audit.search.rate-limit-exceeded`** - NOT introduced; operational concern; future API may surface.
- **Per-evidence-type search / review / export events** - NOT introduced (would proliferate to 87+ events; violates discriminator pattern).
- **Per-family search / review / export events** - NOT introduced (would proliferate to 15+ events; violates discriminator pattern).

### Subscriber discipline (PR-E)

- Subscribers consume events via reference-first payloads (per PR-A reference-first discipline); event payloads carry identifiers and discriminators, NOT raw evidence content.
- Subscribers MUST respect PR-D access governance: receiving a `audit.evidence-export.recorded` event does NOT confer access to the underlying evidence; access still flows through PR-D Workflow 8 -> PR-D hardened Audit Access Record.
- Subscribers SHOULD filter by discriminator (`query_target`, `sensitive_filter_used`, `review_session_status`, `review_note_target_kind`, `export_status`, `export_redaction_audience`) to reduce noise.
- Subscribers MUST NOT treat PR-E event payloads as source of truth; canonical records are the PR-E entities (and underlying PR-A / PR-B / PR-C / PR-D records).
- Subscribers MUST respect PR-D Redaction Policy Matrix when fetching note / evidence detail (per Search-Result-Redacted-By-Default Rule and Per-Audience-Result-Selection Rule).

### Schema discipline (PR-E)

- Event payload schemas remain reference-first at the PR-E architectural level.
- Concrete schemas (JSON Schema / Avro / protobuf) are deferred to future API Governance Foundation PR + future Logs-and-Audit-specific OpenAPI hardening PR.
- Schema versioning per PR-A `evidence_schema_version` envelope discipline applies.
- Idempotency per PR-A `idempotency_key` discipline applies; retried emissions deduplicate via `idempotency_key`.

### Event boundary discipline summary

- All 4 PR-E events are emitted by Logs & Audit File Tracking workflows.
- Source modules do NOT emit PR-E events (per Search-Not-Source-of-Truth Rule and existing baseline + PR-A / PR-B / PR-C / PR-D module ownership).
- Analytics does NOT subscribe to PR-E events for BI / dashboard aggregation (per Audit-Export-Not-Analytics Rule).
- Tenant Company is NOT a subscriber; permission decisions flow through `check_access`, not through subscriber events.
- All event content respects PR-D Redaction Policy Matrix and Access Policy Matrix.
