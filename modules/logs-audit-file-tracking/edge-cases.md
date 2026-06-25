# Logs And Audit File Tracking Edge Cases

This document is proposal-level architecture. It captures edge cases that should be resolved before implementation or downstream dependency hardening.

## Payload And Privacy Edge Cases

- Full payload includes customer-sensitive data.
- Full payload includes pricing-sensitive or invoice-sensitive values.
- File is too large for full backup.
- Contract prohibits retaining full payload.
- Payload reference points to expired or unavailable storage.
- Masked payload is insufficient for troubleshooting.

Expected guardrail: use redaction classes, retention classes, masked payload references, and minimal evidence storage.

## File Tracking Edge Cases

- File name is missing.
- File type is unknown.
- Direction is missing or incorrect.
- Checksum/hash is missing where required.
- Same file is uploaded twice.
- Same content has different file names.
- File version conflicts with prior correction/reupload history.
- Date range overlaps a prior vendor export.

Expected guardrail: create validation or duplicate detection records; do not mutate source records silently.

## Vendor Operational Flow Edge Cases

- Vendor shipping import has missing tracking numbers.
- Vendor shipping import includes unknown order lines.
- Vendor return outcome import conflicts with existing return state.
- Manual order export includes wrong buyer/entity scope.
- Manual return export is generated for the wrong date range.
- Vendor reuploads corrected file after partial processing.

Expected guardrail: Logs & Audit tracks file evidence, validation errors, correction/reupload history, and processing results. Fulfillment/Returns and Order Routing own operational decisions.

## API Transmission Edge Cases

- API transmission fails after source module action succeeds.
- Retry succeeds after earlier failed attempts.
- Response payload is sensitive and cannot be stored.
- Duplicate API transmission is logged with same idempotency key.
- Correlation id is missing.
- Target system returns partial success.

Expected guardrail: record retry/failure history and masked references; source modules own business recovery decisions.

## Search And Access Edge Cases

- User can see file metadata but not payload reference.
- Buyer user requests unrelated buyer/entity audit records.
- Vendor user requests another vendor's file history.
- Internal user searches restricted redaction classes without approval.
- Search result includes mixed retention classes.

Expected guardrail: enforce tenant, entity, role, redaction class, and retention class filters.

## Retention Edge Cases

- Retention review is required but unresolved.
- Source module asks to delete evidence before retention period ends.
- AI recommendation suggests deleting logs.
- Legal or contract hold conflicts with standard retention.
- Backup reference retention differs from audit metadata retention.

Expected guardrail: do not bypass retention rules; create review state.

## Boundary Edge Cases

- Operator tries to correct product data from audit record.
- Operator tries to mark shipment delivered from shipping import log.
- Operator tries to finalize invoice from reconciliation upload record.
- Operator treats audit record as source-of-truth business state.
- Analytics asks for metric ownership inside Logs & Audit.

Expected guardrail: Logs & Audit remains evidence only and routes action to source module workflow.

## Open Questions

- Which edge cases are hard blockers versus warning-only states?
- Which duplicate detection scenarios require source-module review?
- Which payload classes require security review before storage?
- Which audit gaps should trigger future notifications?

## Scheduled System Admin Activity Summary Evidence Edge Cases (Cross-Module PR)

This section catalogs edge cases for the Logs & Audit File Tracking side of the cross-module summary email hardening pass.

### Edge Case PR-C-LA-EC-1: Evidence trigger arrives but referenced canonical record is missing

- Scenario: Logs & Audit Workflow 10 is signaled to record Activity Summary Generated Evidence for an Aggregation Record reference that does not resolve at evidence creation time.
- Expected guardrail: Workflow 10 records the evidence with the supplied reference even if resolution fails (the reference is opaque from Logs & Audit's perspective). If the canonical record is later available, the reference resolves; if not, the evidence remains as a record of the trigger event. Implementation may log an exception for unresolved references; PR-C does not specify the exception path.

### Edge Case PR-C-LA-EC-2: Duplicate trigger for the same evidence

- Scenario: Analytics Workflow 5 signals Workflow 10 twice for the same Aggregation Record (due to retry at the implementation layer).
- Expected guardrail: implementation should deduplicate. Architectural rule: if Workflow 10 receives a duplicate trigger, it does not create a second Activity Summary Generated Evidence record for the same `activity_summary_aggregation_record_reference`. (The Aggregation Record reference is the natural deduplication key.) The duplicate trigger is silently absorbed; an audit may capture the duplicate-trigger event.

### Edge Case PR-C-LA-EC-3: Evidence search across long retention horizon

- Scenario: CIXCI System Admin searches for all Activity Summary Generated Evidence records over a 12-month period.
- Expected guardrail: existing Logs & Audit search patterns (with cursor pagination, rate limits, and index-cardinality controls) apply. Phase 1 accepts that long-horizon searches may be slower; future Logs & Audit hardening may introduce optimizations.

### Edge Case PR-C-LA-EC-4: Amendment of evidence after carry-forward subsumption

- Scenario: Activity Summary Generated Evidence E1 was created for Reporting Window W1; W1 was later subsumed and transitioned to `superseded` by Reporting Window W3; E1's `carry_forward_window_reference_collection` mirrors W1's (which is empty if W1 was the subsuming window, but W1 was the subsumed window so this field on E1 is empty). The amendment request is to add a Late Source Fact Reference to E1.
- Expected guardrail: existing Logs & Audit Audit Amendment Workflow creates an amendment record; E1 remains immutable. The amendment record references E1 and contains the late fact reference. Operators searching for the carry-forward audit trail can find both E1 and its amendment.

### Edge Case PR-C-LA-EC-5: Retention review for No-Activity Summary Suppression Evidence

- Scenario: After several months, retention policy review may consider whether suppression evidence with no business activity warrants the same retention as aggregation evidence.
- Expected guardrail: existing Retention Review Workflow handles this. PR-C does not specify retention duration; the suppression evidence uses the existing retention class pattern. If retention policy changes, it propagates through existing policy patterns.

### Edge Case PR-C-LA-EC-6: Cross-module signal for retired configuration

- Scenario: Analytics Workflow 5 signals Logs & Audit Workflow 10 to record Activity Summary Generated Evidence for a configuration that was just retired (configuration's lifecycle state is `retired`).
- Expected guardrail: Workflow 10 records the evidence normally. The configuration's lifecycle state at the moment of evidence creation is not a guardrail for Logs & Audit; the evidence captures what happened. Operators may correlate the retired-configuration audit record with the evidence to understand the timing.

### Edge Case PR-C-LA-EC-7: Reference to a Reporting Window that was subsumed

- Scenario: An Activity Summary Generated Evidence record references a Reporting Window that has since transitioned to `superseded`.
- Expected guardrail: the reference remains valid; Reporting Window records are preserved through state transitions. The Reporting Window's current state (`superseded`) is queryable; the evidence record's reference does not change.

### Edge Case PR-C-LA-EC-8: Source-module-related search query attempts

- Scenario: CIXCI System Admin attempts to search summary evidence by source-module facts (e.g., "show me Activity Summary Generated Evidence records where the underlying aggregation included `fulfillment-returns.buyer-update-ready.held` events").
- Expected guardrail: this requires a join from Logs & Audit evidence to Analytics aggregation records to source fact references. PR-C does not specify the join implementation. Phase 1 architectural expectation: the join is feasible because the references are stable; operators may need multiple queries. Future operator-surface PR may introduce join-friendly indexed surfaces.

### Edge Case PR-C-LA-EC-9: Repeated suppression across many consecutive windows

- Scenario: A configuration with relatively rare activity produces a No-Activity Summary Suppression Evidence record at every scheduled time for an extended period (for example, all weekend deliveries when no weekend operations are active).
- Expected guardrail: Phase 1 accepts the volume of suppression evidence records. No alert is generated by PR-C; future operator-surface PR may introduce "N consecutive suppressions" alerts; PR-C documents the contract shape (`audit.activity-summary-suppression-evidence.recorded` events are consumable by such an alert pipeline).

### Edge Case PR-C-LA-EC-10: Logs & Audit retention class change for new evidence types

- Scenario: An ADR or policy change later specifies a different retention class for Activity Summary Generated Evidence or No-Activity Summary Suppression Evidence.
- Expected guardrail: PR-C uses existing retention class patterns at application time. If retention policy changes later, the existing Logs & Audit retention review and retention class migration patterns apply. PR-C does not introduce a new retention class; it does not preempt future policy.

## PR-A Edge Cases - Core Evidence Spine

This section documents architectural edge cases for PR-A. Each edge case identifies the situation, the expected behavior, and the boundary discipline. All edge cases preserve PR-A's canonical rules (Source-of-Truth Boundary, External-Tool-Not-Source-of-Truth, Immutable Evidence, Source Snapshot Minimization, Evidence-Per-Lifecycle-Step, Audit-Record-and-Evidence-Record Separation, Amendment vs Supersession Distinction, Promotion-of-Naming, At-Creation Classification).

### EC-1: Missing source_module_reference at evidence creation

**Situation:** A source-module service attempts to submit an Audit Record or Evidence Record without `source_module_reference`.

**Expected behavior:** The submission is rejected. No Audit Record or Evidence Record is created. Concrete error semantics are implementation-level; architectural rule is that source_module_reference is required on every Audit Record and every Evidence Record.

**Boundary discipline:** Logs & Audit cannot identify the originating module without source_module_reference; the reference is non-optional.

### EC-2: Missing source_record_reference at evidence creation for evidence-bearing audits

**Situation:** A source module submits an Evidence Record (an artifact, not a pure observation) without `source_record_reference`.

**Expected behavior:** The submission is rejected for evidence-bearing audits. Pure observation events (e.g., read-access events) MAY have null source_record_reference at the Audit Record level; an Evidence Record attached to such an Audit Record SHOULD have source_record_reference (because the evidence itself relates to something operational).

**Boundary discipline:** Source modules decide whether the event is evidence-bearing; the source_record_reference distinguishes evidence-bearing audits from pure observations.

### EC-3: Conflicting actor_reference and service_trigger_reference

**Situation:** An Audit Record or Evidence Record carries both `actor_reference` (e.g., System Admin user) and `service_trigger_reference` (e.g., scheduled-export service) but the two references represent conflicting scopes (e.g., the actor's scope and the service's scope differ).

**Expected behavior:** Logs & Audit records both references as submitted. The `company_scope_reference` is the canonical scope on the record (REQUIRED). If the actor's effective scope differs from the company_scope_reference, that is a source-module concern; Logs & Audit observes.

**Boundary discipline:** Logs & Audit does NOT validate cross-reference consistency. Source modules own the choice of actor_reference and service_trigger_reference at evidence creation.

### EC-4: redaction_class mismatch with restricted_evidence flag

**Situation:** An Evidence Record is submitted with `redaction_class = public_metadata_placeholder` AND `restricted_evidence = true`.

**Expected behavior:** Logs & Audit records both values as submitted. The mismatch is a source-module classification concern, not a Logs & Audit error. Future PR-D review workflows MAY flag the mismatch for clarification via Evidence Amendment Record. PR-A does NOT enforce consistency between the two fields at creation.

**Boundary discipline:** Source modules own the at-creation classification. Misassignment is a source-module bug; PR-D provides the review surface.

### EC-5: restricted_evidence true with access_class public_metadata

**Situation:** An Evidence Record is submitted with `restricted_evidence = true` AND `access_class = public_metadata`.

**Expected behavior:** Logs & Audit records both values as submitted. The two semantics are not strictly contradictory (`restricted_evidence` is an override flag; `access_class` is a band-level classification) but the combination is unusual. PR-D review workflows MAY flag for clarification.

**Boundary discipline:** Source modules own the at-creation classification. PR-A does not enforce additional invariants.

### EC-6: legal_hold_reference set while restricted_evidence is false

**Situation:** An Evidence Record is submitted with `legal_hold_reference` populated AND `restricted_evidence = false`.

**Expected behavior:** Logs & Audit records both values as submitted. The legal_hold_reference is a placeholder field in PR-A; the Legal Hold entity, lifecycle, and application workflow are PR-D. Until PR-D, `legal_hold_reference` is opaque to Logs & Audit and travels as a reference only. PR-D will define the relationship between legal_hold_reference and restricted_evidence and evidence_status.

**Boundary discipline:** PR-A introduces only the placeholder field. PR-D defines the workflow.

### EC-7: Supersession of an already-superseded Evidence Record

**Situation:** Evidence Record E1 was superseded by E2 (E1 is `superseded`). Now the source module performs a second correction and submits a supersession of E2 by E3.

**Expected behavior:** Logs & Audit creates E3 with `evidence_status = active` and a new Evidence Supersession Record S2 linking E2 (prior) to E3 (new). E2's `evidence_status` transitions from `active` to `superseded`. The full chain E1 -> E2 -> E3 is queryable via supersession_reference chains. PR-A does NOT limit chain depth.

**Boundary discipline:** Supersession is append-only and chainable. Logs & Audit records lineage; chain depth is operational.

### EC-8: Amendment submitted against a superseded Evidence Record

**Situation:** Evidence Record E1 is `superseded` (E2 is now the active current). An authorized actor submits an Evidence Amendment against E1.

**Expected behavior:** Logs & Audit creates the Evidence Amendment Record against E1. The amendment is recorded in E1's `amendment_record_reference_collection`. E1's `evidence_status` remains `superseded` (the amendment does NOT revert the superseded status). The amendment is retained for historical / investigative purposes (e.g., clarifying actor disambiguation on a historical record).

**Boundary discipline:** Amendments are append-only and may attach to evidence in any lifecycle state (active, superseded, amended_with_amendments, legal_hold). Logs & Audit does NOT reject amendments against superseded evidence; investigators may need to clarify historical evidence even after supersession.

### EC-9: External evidence hash mismatch on retry

**Situation:** Integration Management retries an external system call and receives a different `external_evidence_hash` value than the original attempt (e.g., the external system's response payload changed between attempts).

**Expected behavior:** Logs & Audit creates a new Evidence Record (per Evidence-Per-Lifecycle-Step Rule) for the retry attempt. The two Evidence Records carry different `external_evidence_hash` values. Source modules and investigators may flag the mismatch via Evidence Amendment Record (clarifying that the retry produced different external state) or via Evidence Supersession Record (if the retry constitutes a correction).

**Boundary discipline:** Logs & Audit does NOT enforce external_evidence_hash consistency across retries. External systems may have their own state mutation rules; CIXCI observes.

### EC-10: Source snapshot exceeds minimization budget

**Situation:** A source module attempts to attach a source snapshot that is larger than acceptable under the Source Snapshot Minimization Rule (e.g., a full operational record copy is submitted as a snapshot).

**Expected behavior:** PR-A does NOT enforce minimization at write time (enforcement is implementation-level and outside PR-A scope). The submission is accepted as evidence. Future PR-D review workflows or operational tooling MAY flag oversized snapshots. If the source module knowingly needs a full payload copy, it should use the existing baseline Full Payload Exception Record workflow (which requires approval, reason, retention class, redaction class, access class, payload size checks); without exception approval, large snapshots are a source-module bug.

**Boundary discipline:** Source modules own minimization at evidence emission. PR-A documents the architecture; PR-D / operational tooling enforces.

### EC-11: Audit Record without attached Evidence Record (pure observation)

**Situation:** A source module emits a pure observation event (read access, permission check, status query) that does NOT need an attached Evidence Record.

**Expected behavior:** Logs & Audit creates the Audit Record successfully. The Audit Record's `evidence_record_reference` is null. No Evidence Record is created. `audit.record.created` is emitted; NO `audit.evidence.recorded` is emitted for this Audit Record.

**Boundary discipline:** Audit Record CAN exist without Evidence Record. Evidence Record ALWAYS references its parent Audit Record. The two-entity model preserves this asymmetry.

### EC-12: Evidence Record without source_snapshot_reference (snapshot not applicable)

**Situation:** A source module emits evidence (e.g., a configuration-change observation) that does NOT have an operational record snapshot to attach.

**Expected behavior:** Logs & Audit creates the Evidence Record with `source_snapshot_reference = null`. The Evidence Record carries `source_module_reference`, `source_record_reference` (when applicable), other PR-A fields, and proceeds normally.

**Boundary discipline:** `source_snapshot_reference` is optional. The Source Snapshot Minimization Rule applies only when a snapshot is attached.

### EC-13: Idempotency key collision across evidence types

**Situation:** Two different source modules submit Evidence Records with the same `idempotency_key` value (e.g., both modules use the same external correlation id as their idempotency key by coincidence).

**Expected behavior:** Logs & Audit's idempotency key is scoped per source module (architectural rule; concrete scope is implementation-level). The collision across source modules does NOT cause dedup; the two submissions create two separate Evidence Records.

**Boundary discipline:** Idempotency key scope is per source module. Cross-module idempotency is via `replay_safe_dedupe_reference` or `correlation_reference`.

### EC-14: replay_safe_dedupe_reference collision

**Situation:** A source module submits an Evidence Record with `replay_safe_dedupe_reference = R1`. Later, the same source module submits a different Evidence Record with the same `replay_safe_dedupe_reference = R1` but different `idempotency_key` and different evidence content.

**Expected behavior:** Logs & Audit recognizes the replay-safe dedupe match and returns the previously created Evidence Record. The new submission is rejected as a duplicate. Concrete error semantics are implementation-level. The `replay_safe_dedupe_reference` is the structured business-key dedup anchor; collisions on this key are treated as the same logical evidence.

**Boundary discipline:** `replay_safe_dedupe_reference` is the strongest dedup anchor (stronger than `idempotency_key`); use it sparingly and intentionally.

### EC-15: External Evidence Reference sub-structure with only partial fields

**Situation:** An Evidence Record submits `external_evidence_reference` sub-structure with only `external_id_reference` populated (no provider_response_reference, no external_timestamp, no webhook_receipt_reference, etc.).

**Expected behavior:** Logs & Audit records the sub-structure with only the populated field. The other sub-structure fields are null. The Evidence Record is created normally. `audit.evidence.recorded` carries the sub-structure with the populated field.

**Boundary discipline:** Sub-structure fields are individually optional. At least one sub-structure field SHOULD be populated when the sub-structure is present, but PR-A does NOT enforce minimum-fields-required at the sub-structure level (concrete enforcement is implementation-level).

### EC-16: Evidence Amendment where the amendment_payload_reference itself is sensitive

**Situation:** An Evidence Amendment carries an `amendment_payload_reference` that points to sensitive content (e.g., a clarified customer identifier).

**Expected behavior:** The Evidence Amendment Record records the reference. The reference's content is subject to redaction class governance via the amendment's own metadata. PR-A does NOT introduce new redaction class semantics for amendments; PR-D may.

**Boundary discipline:** Amendments inherit the same payload reference discipline as Evidence Records: sensitive content travels by reference, NOT inline.

### EC-17: Evidence Supersession across source modules

**Situation:** An Evidence Record E1 was created by Product Catalog source module. Later, an Order Routing source module attempts to supersede E1 with E2.

**Expected behavior:** Logs & Audit rejects the cross-source-module supersession at the source module's call site (per the existing baseline rule "Must not create misleading records for another source module without an approved system contract"). Cross-source-module supersession is allowed ONLY via System Admin authority OR via an approved system contract between modules.

**Boundary discipline:** Source modules own evidence for their own activity. Cross-source-module evidence operations require explicit authority.

### EC-18: Evidence Record created without correlation_reference

**Situation:** A source module submits an Evidence Record without `correlation_reference`.

**Expected behavior:** PR-A architecturally requires `correlation_reference` on Evidence Record. Submissions without it should be rejected at the source module's call site (concrete error semantics are implementation-level). However, isolated operations without cross-module correlation MAY use the Evidence Record's own `evidence_record_id` as the correlation_reference (architectural fallback).

**Boundary discipline:** `correlation_reference` is for cross-module tracing; absence is recoverable via the evidence record's own identity.

### EC-19: Evidence_schema_version mismatch

**Situation:** A source module submits an Evidence Record with an `evidence_schema_version` value that does not match any current Logs & Audit known version.

**Expected behavior:** Concrete handling is implementation-level. Architecturally, future Logs & Audit may support schema-version-based migrations; PR-A documents the field but does NOT enforce specific version handling at write time.

**Boundary discipline:** `evidence_schema_version` is for future schema migration support; PR-A introduces the field but leaves version-specific handling for implementation.

### EC-20: Race between Evidence Amendment and Evidence Supersession

**Situation:** Concurrent submission of an Evidence Amendment and an Evidence Supersession against the same Evidence Record E1.

**Expected behavior:** Logs & Audit processes both. If the supersession completes first, E1 becomes `superseded`; the subsequent amendment attaches to E1 (which is now superseded; EC-8 applies). If the amendment completes first, E1's `evidence_status` transitions to `amended_with_amendments`; the subsequent supersession transitions E1 to `superseded` (amendment_record_reference_collection is preserved). Both orders are valid; the final state preserves both amendment and supersession lineage.

**Boundary discipline:** Concurrency handling is implementation-level. Append-only discipline ensures no destructive race.

### EC-21: Captured_at after created_at

**Situation:** A source module submits an Evidence Record with `captured_at` later than `created_at` (e.g., clock skew between source module and Logs & Audit).

**Expected behavior:** Logs & Audit records both timestamps as submitted. Clock skew handling is implementation-level. Future review tooling MAY flag the inconsistency.

**Boundary discipline:** PR-A documents the field semantics (captured_at is source-module observed time; created_at is Logs & Audit recorded time). Clock skew is operational.

### EC-22: Source_event_reference points to a non-existent or replayed event

**Situation:** An Evidence Record's `source_event_reference` points to a broker event that has been replayed multiple times or has been removed from the broker's retention window.

**Expected behavior:** Logs & Audit records the reference as submitted. The reference is opaque to Logs & Audit; resolution is the responsibility of consumers (and may fail if the broker event is no longer available). PR-A does NOT validate broker event existence at evidence creation.

**Boundary discipline:** `source_event_reference` is a coordination reference; resolution is implementation-level.

### EC-23: Multiple amendments arriving out of order

**Situation:** Two Evidence Amendments are submitted against the same Evidence Record E1 with slightly different `created_at` timestamps, but they arrive at Logs & Audit out of order.

**Expected behavior:** Logs & Audit appends both amendments to E1's `amendment_record_reference_collection`. The collection ordering may follow arrival order or created_at order; concrete ordering is implementation-level. Subscribers MAY sort amendments by `created_at` for display.

**Boundary discipline:** Append-only; amendments are immutable; out-of-order arrival is operational.

### EC-24: Supersession Record references a non-existent prior Evidence Record

**Situation:** A source module submits an Evidence Supersession with `prior_evidence_record_reference` pointing to an Evidence Record that does not exist or has been purged (under future PR-D retention workflows).

**Expected behavior:** Logs & Audit rejects the supersession at submission time if the prior reference cannot be resolved at creation. Concrete error semantics are implementation-level. The architectural rule is that supersession lineage requires a resolvable prior reference.

**Boundary discipline:** Supersession lineage is queryable; broken lineage chains undermine integrity.

### EC-25: External tool response references a CIXCI internal record

**Situation:** An external system (via Integration Management) returns a `provider_response_reference` that, when resolved externally, references back to a CIXCI internal record (e.g., a vendor portal's response references the original CIXCI export ID).

**Expected behavior:** Logs & Audit records the External Evidence Reference sub-structure as received. The circular reference is not a Logs & Audit concern. The External-Tool-Not-Source-of-Truth Rule applies: the external system's reference to CIXCI does NOT make the external system source of truth.

**Boundary discipline:** External evidence references are coordination/proof; circular references are operational artifacts, not source-of-truth violations.

### EC-26: Audit Access Record activity during PR-A application

**Situation:** Audit Access Record entries are created during normal operations while PR-A is being applied (i.e., concurrent operational activity).

**Expected behavior:** PR-A is additive and does NOT modify the Audit Access Record entity, lifecycle, or workflows. Concurrent Audit Access Record creation continues normally. PR-A does not interfere with Audit Access Record operations.

**Boundary discipline:** Audit Access Record is referenced as existing baseline only in PR-A; PR-D / PR-E will harden access workflows.

### EC-27: Evidence Record with all optional fields null

**Situation:** A source module submits an Evidence Record with the minimum required fields only (evidence_record_id, evidence_schema_version, evidence_type, audit_record_reference, source_module_reference, company_scope_reference, evidence_hash_reference, captured_at, created_at, created_by_*_reference, correlation_reference, evidence_status, retention_class, redaction_class, access_class, audit_reference) and all optional fields null (no source_record_reference, no source_snapshot_reference, no source_event_reference, no external_evidence_reference, no evidence_attachment_reference, etc.).

**Expected behavior:** Logs & Audit creates the Evidence Record successfully. The minimal record is valid for pure-action evidence (where the source module records that something happened without attaching an artifact).

**Boundary discipline:** Optional fields are individually optional; required fields are required.

### EC-28: Source module attempts to set evidence_status directly

**Situation:** A source module attempts to set `evidence_status = superseded` at Evidence Record creation (rather than allowing the supersession workflow to transition it).

**Expected behavior:** Logs & Audit rejects the submission. `evidence_status` is set to `active` at PR-A Workflow 1 creation; transitions to `superseded`, `amended_with_amendments`, or `legal_hold` happen ONLY via PR-A Workflow 5 (Amendment), PR-A Workflow 6 (Supersession), or future PR-D legal hold workflows.

**Boundary discipline:** evidence_status transitions follow workflows, not direct submission.

### EC-29: Restricted evidence created during cross-module evidence emission

**Situation:** A source module emits restricted evidence (`restricted_evidence = true`, `access_class = system_admin_only`) for an action that crosses multiple modules (e.g., a buyer API product export touching pricing-sensitive content).

**Expected behavior:** Logs & Audit creates the Evidence Record with the restricted flags. `audit.evidence.recorded` is emitted with the restricted flags in payload. Downstream subscribers respect the flags per their own access enforcement. PR-D defines the full gating matrix; PR-A captures the at-creation classification only.

**Boundary discipline:** Restricted classification is set at creation; downstream enforcement is per-subscriber and per-PR-D.

### EC-30: Evidence Record with conflicting source_module_reference and audit_record_reference

**Situation:** An Evidence Record is submitted with `source_module_reference` pointing to one source module but `audit_record_reference` pointing to an Audit Record from a different source module.

**Expected behavior:** Logs & Audit rejects the submission. The Evidence Record's `source_module_reference` MUST match the Audit Record's `source_module_reference` (architectural rule). Cross-source-module references between Audit Record and Evidence Record are not permitted.

**Boundary discipline:** Audit Record and Evidence Record share source module; cross-module attachments require System Admin authority or approved system contract.
```

# PR-B Append-Block for `modules/logs-audit-file-tracking/edge-cases.md`

> **Target file:** `modules/logs-audit-file-tracking/edge-cases.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-B APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section (including existing baseline edge cases or PR-A edge cases).
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-B Edge Cases - File Tracking Foundation`

---

## Content to append

```markdown
## PR-B Edge Cases - File Tracking Foundation

This section documents architectural edge cases for PR-B. Each edge case identifies the situation, the expected behavior, and the boundary discipline. All edge cases preserve PR-B's canonical rules (File-Level vs Evidence-Level Lineage, File-Tracking-Tenant-Scope, Duplicate-Detection-Cost-Control, Duplicate-Detection-Records-Evidence, Reupload-Creates-New-File-Tracking-Record, Retry-Creates-New-Evidence, File-Lifecycle-Status-At-Creation, Legacy-File-Direction-Preservation, Reprocess-Terminal-Outcome) and all PR-A canonical rules.

### EC-1: Missing required spine integration reference at File Tracking Record creation

**Situation:** A source-module service attempts to submit a File Tracking Record without `evidence_record_reference`, `audit_record_reference`, `source_module_reference`, or `company_scope_reference`.

**Expected behavior:** The submission is rejected. PR-B Workflow 1 invokes PR-A Workflow 1 first to create the Audit Record and Evidence Record; if PR-A Workflow 1 fails (e.g., missing source_module_reference at the spine layer), the file tracking submission is rejected at the source module's call site. Concrete error semantics are implementation-level.

**Boundary discipline:** All spine integration references are populated together at PR-B Workflow 1; partial population is not permitted.

### EC-2: Missing source_record_reference for evidence-bearing file

**Situation:** A source module submits a File Tracking Record for an evidence-bearing file (e.g., vendor shipping import file) without `source_record_reference`.

**Expected behavior:** For evidence-bearing files, `source_record_reference` is required. The submission is rejected. Concrete error semantics are implementation-level.

**Boundary discipline:** Source modules know whether their file activity is evidence-bearing; missing source_record_reference is a source-module bug.

### EC-3: File created with `file_purpose = unknown_other`

**Situation:** A source module submits a File Tracking Record with `file_purpose = unknown_other` (the fallback value).

**Expected behavior:** The submission is accepted. PR-B's `unknown_other` value is the explicit fallback for purposes not yet cataloged. Future PR-C cataloging may consolidate `unknown_other` files into specific values via Evidence Amendment Record (PR-A) per source-module review.

**Boundary discipline:** Catch-all values are permitted as foundation; PR-C catalogs comprehensively.

### EC-4: Legacy baseline file_direction value coexists with normalized file_direction

**Situation:** An existing baseline File Tracking Record has `file_direction = import` (legacy data-flow direction). A new File Tracking Record is created post-PR-B with normalized `file_direction = uploaded`.

**Expected behavior:** Both records are valid. Legacy baseline language is preserved per Legacy-File-Direction-Preservation Rule. Implementation-level naming reconciliation (e.g., adding a new normalized field separately from the existing baseline field, or carrying both semantics in one field via mapping) is deferred.

**Boundary discipline:** PR-B does NOT force a premature rename. Concrete schema-level handling is implementation-level.

### EC-5: file_direction = downloaded creates a new File Tracking Record (NOT a lifecycle transition)

**Situation:** A buyer downloads a previously stored file. The source file's File Tracking Record exists with `file_lifecycle_status = stored`.

**Expected behavior:** PR-B Workflow 4 creates a NEW File Tracking Record with `file_direction = downloaded`. The source file's `file_lifecycle_status` remains `stored` (NOT transitioned to `downloaded`). The new download File Tracking Record may reference the source via optional `source_file_tracking_record_reference`.

**Boundary discipline:** Download is treated as an audit-worthy action producing new evidence, not as a lifecycle state of the source file.

### EC-6: Duplicate File Tracking Record submission with same idempotency_key returns existing record

**Situation:** A source module submits a File Tracking Record creation request with `idempotency_key = K1`. The submission succeeds. The source module retries with the same `idempotency_key = K1`.

**Expected behavior:** PR-B's idempotency semantics (inherited from PR-A) ensure the retried submission returns the existing File Tracking Record. No duplicate creation. No duplicate event emission.

**Boundary discipline:** Idempotency is per source module per existing baseline.

### EC-7: Duplicate detection within same tenant but different source modules

**Situation:** Tenant scope C has File Tracking Records in source module M1 with `checksum_hash = H` AND a new File Tracking Record in source module M2 with `checksum_hash = H`.

**Expected behavior:** Cross-module duplicate comparison is NOT in PR-B scope. Duplicate detection (PR-B Workflow 6) is restricted to the same `source_module_reference`. No Duplicate File Detection Record is created across source modules. PR-C may revisit cross-module duplicate detection.

**Boundary discipline:** Cost control restricts comparison to same source module within tenant scope.

### EC-8: Cross-tenant duplicate detection attempt

**Situation:** Tenant scope C1 has a File Tracking Record. A new File Tracking Record is created in tenant scope C2 with identical comparison fields.

**Expected behavior:** Cross-tenant duplicate comparison is denied by default (File-Tracking-Tenant-Scope Rule). No Duplicate File Detection Record is created across the boundary.

**Boundary discipline:** Tenant scope is enforced; cross-tenant operations are denied per existing baseline.

### EC-9: Duplicate detected but source module decides to ignore

**Situation:** PR-B Workflow 6 creates a Duplicate File Detection Record. The source module reviews and decides to ignore (accept the new file despite the duplicate detection).

**Expected behavior:** The Duplicate File Detection Record is retained as evidence. The new File Tracking Record proceeds through subsequent lifecycle steps. The source module's ignore decision is captured via the source module's own audit-worthy actions (e.g., Processing Result Record on the new file proceeds normally).

**Boundary discipline:** Logs & Audit creates evidence; source modules decide outcome. The decision itself is observable through subsequent source-module audit records.

### EC-10: Reupload-of-already-replaced File Tracking Record

**Situation:** File Tracking Record FT1 was replaced by FT2 (FT1 is `file_lifecycle_status = replaced`). A new reupload is submitted targeting FT1.

**Expected behavior:** The reupload should target the CURRENT File Tracking Record (FT2), not the prior replaced one (FT1). If the source module mistakenly targets FT1, the source module is responsible for correctly identifying the current record. PR-B does NOT auto-route the reupload to the current record. If the reupload is submitted against FT1, the Correction / Reupload History Record may indicate the chain (FT1 -> FT2 was prior; new FT3 replaces FT2). Source modules decide.

**Boundary discipline:** Source modules own the correct prior-record identification.

### EC-11: Reupload chain (FT1 -> FT2 -> FT3) with multiple replacements

**Situation:** FT1 was replaced by FT2; FT2 is now replaced by FT3.

**Expected behavior:** Each reupload creates a new File Tracking Record. FT1 and FT2 both have `file_lifecycle_status = replaced`. FT3 is the current `stored` record. Two Correction / Reupload History Records link the chain (CRH1 links FT1 to FT2; CRH2 links FT2 to FT3). All three File Tracking Records remain in storage (append-only).

**Boundary discipline:** Reupload chains are queryable via Correction / Reupload History Record references.

### EC-12: Reupload without source-record correction (no Evidence Supersession)

**Situation:** A reupload corrects a file-format issue (wrong delimiter, wrong character encoding) but the underlying business state is unchanged.

**Expected behavior:** PR-B Workflow 7 creates a Correction / Reupload History Record (file-level lineage). NO Evidence Supersession Record is created. The original Evidence Record remains `evidence_status = active`.

**Boundary discipline:** Source modules decide whether the reupload corrects an operational record. When it does NOT, only file-level lineage is created.

### EC-13: Reupload with source-record correction (both lineages)

**Situation:** A reupload corrects a business state issue (wrong quantities in the original import; the corrected import represents a different operational record state).

**Expected behavior:** PR-B Workflow 7 creates a Correction / Reupload History Record (file-level). The source module ALSO invokes PR-A Workflow 6 (Evidence Supersession). An Evidence Supersession Record is created. The Correction / Reupload History Record's `evidence_supersession_record_reference` is populated. The original Evidence Record transitions to `evidence_status = superseded`; the new file's Evidence Record is `active`.

**Boundary discipline:** Both lineages may coexist; source modules decide.

### EC-14: Reprocess produces new evidence (Evidence Supersession applies)

**Situation:** A reprocess executes successfully and produces a new file artifact (new validation result, new processing result).

**Expected behavior:** PR-B Workflow 8 creates a Reprocess / Retry Outcome Record with `outcome_status = completed`, `new_evidence_record_reference` populated, `prior_evidence_record_reference` populated, `new_file_tracking_record_reference` populated. PR-A Workflow 6 (Evidence Supersession) is invoked. PR-A's `audit.evidence-supersession.recorded` is emitted. PR-B's `file.reprocess.completed` is emitted with `outcome_status = completed`.

**Boundary discipline:** Both events are emitted; subscribers may consume one or both.

### EC-15: Reprocess produces no new evidence (no Evidence Supersession)

**Situation:** A reprocess executes but produces the same outcome as the original (e.g., re-running the same import produces the same accepted/rejected row counts).

**Expected behavior:** PR-B Workflow 8 creates a Reprocess / Retry Outcome Record with `outcome_status = no_new_evidence`. NO Evidence Supersession Record is created. The original Evidence Record remains `evidence_status = active`. PR-B's `file.reprocess.completed` is emitted with `outcome_status = no_new_evidence`. PR-A's `audit.evidence-supersession.recorded` is NOT emitted.

**Boundary discipline:** Logs & Audit records the outcome; the prior Evidence Record's lifecycle is unchanged.

### EC-16: Reprocess canceled before execution

**Situation:** A Reprocess / Retry Request Record was created (`file.reprocess.requested` emitted), but the request is canceled before execution.

**Expected behavior:** PR-B Workflow 8 still creates a Reprocess / Retry Outcome Record with `outcome_status = canceled`. PR-B's `file.reprocess.completed` is emitted with `outcome_status = canceled`. NO new evidence, NO new File Tracking Record, NO Evidence Supersession Record.

**Boundary discipline:** Cancellation is a terminal state; the event is emitted.

### EC-17: Reprocess blocked (source module declines to execute)

**Situation:** A Reprocess / Retry Request Record was created. The source module declines to execute (authority denied, prerequisite not met, or other blocking condition).

**Expected behavior:** PR-B Workflow 8 creates a Reprocess / Retry Outcome Record with `outcome_status = blocked`. PR-B's `file.reprocess.completed` is emitted with `outcome_status = blocked`. NO new evidence, NO new File Tracking Record, NO Evidence Supersession Record.

**Boundary discipline:** Blocking is a terminal state; the event is emitted.

### EC-18: Reprocess fails with new failure evidence

**Situation:** A reprocess executes but fails, producing a new failure evidence (e.g., new processing failure with new error details).

**Expected behavior:** PR-B Workflow 8 creates a Reprocess / Retry Outcome Record with `outcome_status = failed`, `new_evidence_record_reference` populated (with the failure evidence). PR-A Workflow 6 may apply (source module decides whether the failure constitutes new evidence that supersedes the prior); if it applies, Evidence Supersession Record is created. PR-B's `file.reprocess.completed` is emitted with `outcome_status = failed`.

**Boundary discipline:** Failed outcomes that produce new evidence are still terminal; the `outcome_status` field carries the failure semantic.

### EC-19: file.reprocess.completed event subscribers must handle all five outcome_status values

**Situation:** A subscriber to `file.reprocess.completed` only handles `outcome_status = completed` and ignores other values.

**Expected behavior:** This is a subscriber bug. PR-B's Reprocess-Terminal-Outcome Rule requires subscribers to handle all five `outcome_status` values. Subscribers wanting only successful reprocesses MUST filter explicitly on `outcome_status = completed`; otherwise they receive events for all outcomes.

**Boundary discipline:** Subscribers filter; PR-B does NOT introduce per-outcome event streams.

### EC-20: File Tracking Record with file_direction = downloaded but no source_file_tracking_record_reference

**Situation:** A download File Tracking Record is created with `file_direction = downloaded` but `source_file_tracking_record_reference` is null (no prior File Tracking Record to reference).

**Expected behavior:** Acceptable. PR-B's `source_file_tracking_record_reference` is optional. Some download events may not have a prior File Tracking Record (e.g., on-the-fly export generation followed by immediate download where the export is not separately stored).

**Boundary discipline:** Optional reference; source modules decide whether to populate.

### EC-21: File hash mismatch at retrieval

**Situation:** A File Tracking Record has `file_hash_reference = H1`. At later retrieval, the stored file's hash is found to be H2 (mismatch).

**Expected behavior:** PR-B does NOT define hash-mismatch handling at retrieval. Concrete handling is implementation-level (storage layer enforces). Periodic re-hash and compare is future phase. Source modules / investigators may flag the mismatch via Evidence Amendment Record (PR-A).

**Boundary discipline:** PR-B captures the hash at creation; periodic verification is future.

### EC-22: File integrity reference null at creation

**Situation:** A File Tracking Record is created without `file_integrity_reference`.

**Expected behavior:** Acceptable. PR-B's `file_integrity_reference` is optional. Periodic integrity check workflows are future phase; absent reference is the default.

**Boundary discipline:** Optional reference; integrity check workflow is future.

### EC-23: Restricted file evidence (restricted_evidence = true)

**Situation:** A File Tracking Record's parent Evidence Record has `restricted_evidence = true` (operationally sensitive file content).

**Expected behavior:** PR-A's restricted_evidence flag governs visibility. PR-B does NOT introduce a separate gating mechanism. PR-D will define the full gating matrix. Subscribers to file events check the `restricted_evidence` flag on the parent Evidence Record (carried in event payloads) and respect their own access enforcement.

**Boundary discipline:** Restricted evidence is gated at consumption per PR-D; PR-B captures the flag.

### EC-24: Full payload exceeds default size limit without exception approval

**Situation:** A source-module service attempts to store a full file payload without Full Payload Exception Record approval.

**Expected behavior:** Per PR-B Workflow 10, only `masked_payload_reference` may be stored. Full payload submission without approval is rejected per existing baseline error codes.

**Boundary discipline:** Masked payload is default; full payload is exception-only.

### EC-25: Partial processing transitions File Tracking Record to partially_processed

**Situation:** A vendor import file has 100 rows; 80 are accepted, 20 are rejected.

**Expected behavior:** The source module produces a Partial File Processing Record (existing baseline). The File Tracking Record's `file_lifecycle_status` transitions to `partially_processed`. PR-B Workflow 9 documents the linkage.

**Boundary discipline:** Source modules own validation; Logs & Audit records.

### EC-26: External Evidence Reference sub-structure with retry_failure_evidence

**Situation:** A generated vendor email export file is attempted for delivery; delivery fails; the source module records the failure via External Evidence Reference sub-structure `retry_failure_evidence_reference`.

**Expected behavior:** The File Tracking Record carries the External Evidence Reference sub-structure. The failure is captured as part of the file's evidence. Subsequent retry attempts may create new File Tracking Records (per Evidence-Per-Lifecycle-Step Rule from PR-A) with their own External Evidence Reference sub-structures.

**Boundary discipline:** External transport failures are recorded as evidence; CIXCI source-of-truth remains unaffected.

### EC-27: Concurrent reupload and reprocess on the same File Tracking Record

**Situation:** A user submits a reupload of FT1 while a reprocess of FT1 is in progress.

**Expected behavior:** Concurrency handling is implementation-level. Architecturally, the reupload creates FT2 (replacing FT1); the in-flight reprocess on FT1 may complete with `outcome_status = canceled` or `blocked` (the source module decides whether to continue or abandon). PR-B does NOT enforce a specific concurrency model.

**Boundary discipline:** Concurrency is implementation-level; append-only discipline ensures no destructive race.

### EC-28: File Tracking Record creation with `file_purpose` value not in PR-B starter set

**Situation:** A source module submits a File Tracking Record with `file_purpose = ai_agent_generated_report` (a value not in PR-B's 12-value starter set).

**Expected behavior:** PR-B's starter set is foundation; PR-C catalogs comprehensively. PR-B does NOT enforce a closed enumeration on `file_purpose`. The submission is accepted with the new value. PR-C may catalog the value officially (or recommend `unknown_other` until cataloged).

**Boundary discipline:** Foundation values are starter; PR-C catalogs comprehensively.

### EC-29: file_lifecycle_status transition to expired during retention review

**Situation:** A File Tracking Record reaches retention expiry per future PR-D retention review workflow.

**Expected behavior:** PR-B does NOT define retention review or expiration handling. PR-D will. When PR-D applies, the File Tracking Record's `file_lifecycle_status` may transition to `expired` (or `archived`) via PR-D workflows. PR-B's foundation supports the state values.

**Boundary discipline:** Retention review is PR-D; PR-B supports the state foundation only.

### EC-30: Existing baseline File Tracking Record without PR-B spine integration references

**Situation:** Existing baseline File Tracking Records (created before PR-B was applied) do not carry the new spine integration references (`evidence_record_reference`, `audit_record_reference`, `file_storage_reference`, `file_hash_reference`, etc.).

**Expected behavior:** Migration of historical records is implementation-level and outside PR-B scope. PR-B documents the architectural surface; concrete migration strategy (backfill, lazy-population, deferred-evaluation) is implementation-level. New File Tracking Records created post-PR-B carry the new references; historical records may carry them via backfill or remain in their original form.

**Boundary discipline:** PR-B is forward-looking architecture; historical record migration is implementation-level.

### EC-31: Audit Access Record concurrent activity during PR-B application

**Situation:** Audit Access Record entries are created during normal operations while PR-B is being applied.

**Expected behavior:** PR-B is additive and does NOT modify the Audit Access Record entity, lifecycle, or workflows. Concurrent Audit Access Record creation continues normally. PR-B does not interfere.

**Boundary discipline:** Audit Access Record is referenced as existing baseline only in PR-B; PR-D / PR-E will harden access workflows.

### EC-32: File Tracking Record creation for a file purpose that crosses source modules

**Situation:** A file with content spanning multiple source modules (e.g., a combined report that aggregates data from Product Catalog AND Order Routing) is generated.

**Expected behavior:** PR-B's `source_module_reference` on File Tracking Record identifies a single source module. Multi-source files are owned by the source module that generated the file (typically Analytics / Reporting for combined reports). The `file_purpose` may be `report_export`. Investigators tracing to original source modules use the source-module-specific records that the report aggregates (the aggregation logic is owned by the generating source module).

**Boundary discipline:** Each File Tracking Record has one source module; aggregation is a source-module concern.

### EC-33: Race between Correction / Reupload Lineage and Evidence Supersession

**Situation:** A reupload is submitted (PR-B Workflow 7) and concurrently the source module invokes PR-A Workflow 6 (Evidence Supersession) on the related Evidence Record.

**Expected behavior:** Both workflows produce their respective records. If PR-B Workflow 7 completes first, the Correction / Reupload History Record is created with `evidence_supersession_record_reference` initially null; later, the Evidence Supersession Record is created and the source module may emit an Evidence Amendment Record (PR-A Workflow 5) to populate the back-reference. If PR-A Workflow 6 completes first, the Correction / Reupload History Record carries the Evidence Supersession Record reference at creation. Both orders are valid; final state preserves both lineages.

**Boundary discipline:** Concurrency handling is implementation-level. Both lineages remain append-only.
```

# PR-C Append-Block for `modules/logs-audit-file-tracking/edge-cases.md`

> **Target file:** `modules/logs-audit-file-tracking/edge-cases.md`
>
> **Application mode:** Append. Add the section below at the end of the file. If an anchor `<!-- PR-C APPEND ANCHOR -->` exists, insert immediately before it.
>
> **Rules:**
> - Additive only.
> - Do not reorder, modify, or remove any existing section.
> - **Duplicate detection (hard stop):** Stop if the file already contains:
>   - `## PR-C Edge Cases - Cross-Module Evidence Catalog`

---

## Content to append

```markdown
## PR-C Edge Cases - Cross-Module Evidence Catalog

### Subscribers depending on placeholder identifiers

- Subscribers consuming `audit.evidence.recorded` events MUST NOT depend on placeholder identifiers as stable subscriber contracts. Examples of placeholder identifiers in PR-C: `buyer_product_export_batch`, `export_eligibility_preview`, `buyer_product_activation`, `stop_selling`, `product_compatibility_sync`, all `device_catalog` family values, `vendor_export_review`, `buyer_update_ready_signal`, `circuit_breaker_trip`, `rate_limit_throttle`, all `invoice_management` family values, all `pricing` family values, all `analytics_reporting` family values, all `procurement_purchase_orders` family values, all `launch_event_management` family values.
- A subscriber that hardcodes a placeholder identifier and the identifier is later renamed / consolidated / removed during source-module hardening will break. The break is a subscriber bug; PR-C documentation flags placeholder as not-stable.
- Mitigation: subscribers should use mapping tables that can be updated, or subscribe at the family-level granularity, or wait for promotion to final.

### Starter values being refined during source-module hardening

- Starter identifiers are usable architecture labels but NOT stable subscriber contracts. During source-module hardening, starter identifiers MAY be refined (renamed for clarity, decomposed into multiple specific values, or merged with related values).
- For example, `vendor_shipping_import` (starter) might be refined during Fulfillment / Returns source-module hardening into `vendor_shipping_import_full` / `vendor_shipping_import_delta` / `vendor_shipping_import_correction` with `import_type` discriminator semantics; the refinement is a future PR.
- Subscribers should accommodate identifier refinement by:
  - Using enumeration mapping rather than hardcoded string comparison where possible.
  - Subscribing at family-level granularity where the family is stable but identifier-level granularity is not.
  - Awaiting promotion to final for identifiers requiring strict subscriber contract stability.

### Identifier collision with PR-B `file_purpose` values

- PR-C `evidence_type` values and PR-B `file_purpose` values are independent dimensions on different entities (`evidence_type` on Evidence Record per PR-A; `file_purpose` on File Tracking Record per PR-B). They MAY share string identifiers where applicable.
- For example, `evidence_type = vendor_shipping_import` paired with `file_purpose = vendor_shipping_import` is the canonical aligned pattern.
- Subscribers reading both dimensions get consistent semantics.
- Mitigation: PR-C recommends aligning identifiers where applicable; concrete schema-level naming is implementation-level. If identifiers diverge (e.g., PR-C catalogues a refined `evidence_type` value that doesn't map 1:1 to a PR-B `file_purpose`), the two dimensions remain independent.

### Transport-evidence vs business-outcome-evidence separation

- Transport evidence (e.g., `vendor_export_delivery`, `vendor_export_failure`, `api_transmission`, `api_response`) is distinct from business-outcome evidence (e.g., `routing_decision`, `import_commit`, `return_disposition`).
- Subscribers conflating the two will draw incorrect conclusions. For example, a vendor email transport SUCCESS (transport_delivery) does NOT imply the vendor took business action on the export.
- Mitigation: subscribers distinguish via backing classification (`transport_delivery` vs `operational_state` / `decision`).

### External provider responses are NOT CIXCI source of truth

- PR-A's External-Tool-Not-Source-of-Truth Rule applies to all `external_backed` evidence_type values.
- Examples: `api_response`, `webhook_receipt`, `provider_response`, `accounting_sync`, `vendor_export_delivery` (when delivered via external email provider).
- Subscribers treating external provider responses as authoritative for CIXCI operational state will draw incorrect conclusions.
- Mitigation: source modules retain canonical authority; external provider responses are coordination evidence only.

### Missing required `source_record_reference`

- Per Evidence Type Reference Requirements table, `source_record_reference` is REQUIRED for every catalogued evidence_type.
- Source modules attempting to emit evidence without a populated `source_record_reference` are rejected at evidence emission per existing baseline error semantics.
- Mitigation: source-module evidence-emission tooling validates required references at the call site.

### Missing required `source_snapshot_reference` for snapshot-anchored evidence

- For evidence types where `source_snapshot_reference` is REQUIRED (e.g., `routing_decision`, `handoff_source_snapshot`, `export_payload_snapshot`, `pricing_snapshot`, `invoice_generation`), source modules MUST populate it with a minimized snapshot per PR-A Source Snapshot Minimization Rule.
- Source modules attempting to emit snapshot-anchored evidence without snapshot are rejected per existing baseline error semantics.
- Source modules attempting to emit a full operational record copy instead of a minimized snapshot require Full Payload Exception Record per PR-B Workflow 10.

### Missing required `file_tracking_record_reference` for file-backed evidence

- For file-backed evidence types (e.g., `product_import_received`, `media_upload_session`, `vendor_shipping_import`, `vendor_order_export_batch`, `analytics_export`, `invoice_generation` when generating an export file), source modules MUST populate `file_tracking_record_reference` per the Evidence Type Reference Requirements table.
- Source modules attempting to emit file-backed evidence without `file_tracking_record_reference` are rejected per existing baseline error semantics.

### Missing required `external_evidence_reference` for external_backed / api_backed / transport_delivery evidence

- For evidence types where `external_evidence_reference` is REQUIRED (e.g., `api_transmission`, `api_response`, `webhook_receipt`, `provider_response`, `retry_attempt`, `retry_exhausted`, `idempotency_dedupe`, `circuit_breaker_trip`, `rate_limit_throttle`, `accounting_sync`), source modules MUST populate the External Evidence Reference sub-structure (PR-A) with external IDs / provider responses / external timestamps.

### Cross-family identifier reuse attempts

- PR-C uses distinct identifiers across families where possible. Two families MUST NOT share an identifier string with conflicting semantics.
- If a future PR proposes adding an identifier already used in another family with different semantics, the proposal must rename or namespace.

### Status promotion: starter -> final

- Promotion of a starter identifier to final requires explicit future PR.
- The future PR documents:
  - The source-module hardening that confirms identifier semantics.
  - The subscriber-notification of stability change.
  - The promotion in the Evidence Type Catalog.
- PR-C standalone does NOT promote any identifier to final.

### Status retirement: placeholder -> removed

- Placeholder identifiers MAY be retired during source-module hardening.
- Retirement requires explicit future PR.
- Subscribers consuming retired placeholder identifiers were warned (PR-C documentation flags placeholder as not-stable).

### AI / Warranty enumeration attempts before module exists

- Source modules / future PRs attempting to enumerate evidence_type values in `ai_agent_services_placeholder` or `warranty_registration_placeholder` family slots BEFORE the corresponding module exists on origin/main are rejected.
- The reserved family slots have zero enumerated values; enumeration requires the module to exist first.
- Mitigation: future PRs check for module existence (`modules/ai-agent-services/` or `modules/warranty-registration/` present on main) before enumerating.

### Default class guidance vs source-module at-creation classification conflict

- PR-A's At-Creation Classification Rule states that source modules assign retention_class / redaction_class / access_class at evidence creation per their own sensitivity assessment.
- PR-C default class guidance is suggestion-only.
- If a source module's per-evidence at-creation classification differs from PR-C's default guidance (e.g., source module classifies a specific `pricing_validation` evidence as `restricted_pii` rather than PR-C's suggested `restricted`), the source-module classification wins.
- Mitigation: PR-C default class guidance is documented as suggestion; subscribers should NOT assume PR-C default class guidance values are present on every evidence emission of a given evidence_type. PR-D will lock policy.

### Subscribers attempting to filter by `evidence_family` when not exposed as field

- Whether `evidence_family` is a top-level field on Evidence Record or derived from `evidence_type` mapping is implementation-level. PR-C documents the mapping; concrete schema is implementation-level.
- Subscribers depending on a top-level `evidence_family` field assume it exists; the assumption is implementation-level.
- Mitigation: subscribers should use the documented family mapping table to derive family from evidence_type if the field is not exposed.

### Subscribers attempting to filter by `evidence_status` when not exposed as field

- Whether `evidence_status` is a top-level field on Evidence Record or carried elsewhere is implementation-level. PR-C documents the mapping; concrete schema is implementation-level.
- Subscribers depending on a top-level `evidence_status` field assume it exists.
- Mitigation: subscribers should use the documented Evidence Type Catalog to look up status for a given evidence_type.

### Activity summary evidence dual representation

- `activity_summary_generated` and `no_activity_summary_suppressed` exist BOTH as existing Logs & Audit baseline entities AND as PR-C catalogued evidence_type values.
- The existing baseline entity language is preserved verbatim; the generic taxonomy values are added.
- Subscribers may observe both representations: the existing baseline Activity Summary Generated / No-Activity Summary Suppressed records AND the new Evidence Record with the catalogued `evidence_type` value.
- Mitigation: PR-C documents the coexistence as by-design; subscribers should not assume one representation supersedes the other.

### Media supersession evidence vs PR-A Evidence Supersession Record

- PR-C catalogues `media_version_supersession` as a Media-specific business decision evidence_type value.
- PR-A's Evidence Supersession Record is a generic spine-level lineage record.
- The two are distinct: `media_version_supersession` captures the Media business decision; PR-A's Evidence Supersession Record captures the spine-level lineage when the supersession produces a new Evidence Record replacing a prior one.
- Subscribers should distinguish: the `media_version_supersession` evidence_type populates the discriminator on a NEW Evidence Record; PR-A's Evidence Supersession Record links the new Evidence Record to the prior one.
- Mitigation: PR-C uses the clearer name `media_version_supersession` (per Codex cleanup directive 6) to avoid ambiguity with PR-A's generic Evidence Supersession Record.

### Vendor email delivery ownership ambiguity (Logs-vs-Notification)

- PR-C catalogues `vendor_export_delivery` and `vendor_export_failure` under the `order_routing` family, but the underlying transport is owned by Notification Platform Service / Integration Management.
- Two ownership patterns are supported via PR-A's External Evidence Reference sub-structure:
  - Pattern A: Notification Platform Service emits the evidence with the catalogued `evidence_type` value, populating `source_module_reference` to Notification Platform Service. Order Routing owns the business outcome separately.
  - Pattern B: Order Routing emits the evidence, populating `external_evidence_reference` with the Notification Platform Service / Integration Management transport detail.
- PR-C does NOT lock the ownership pattern. Final ownership decision is deferred to future Notification Platform Service source-module hardening PR.

### Compatibility evidence appearing Logs-owned

- PR-C catalogues `product_compatibility_sync` (placeholder) and `compatibility_impacting_review_signal` (placeholder) but Compatibility logic is owned by Product Catalog / Device Catalog source modules.
- Subscribers MUST NOT interpret PR-C's catalog as making Logs & Audit the canonical authority for compatibility decisions.
- Mitigation: PR-C documentation explicitly flags placeholder status; Product / Device source-module hardening will refine.

### Source modules attempting cross-family evidence emission

- Source modules emit evidence for their OWN family per the catalog. A source module attempting to emit evidence with an `evidence_type` value from another family's slot (e.g., Product Catalog emitting `vendor_shipping_import`) is rejected per existing baseline `SOURCE_BOUNDARY_VIOLATION` error.
- Mitigation: source-module evidence-emission tooling validates family ownership at the call site.

### Identifier collision with existing baseline entity names

- Existing baseline entities (Vendor Manual Order Export Record, Vendor Shipping Import Record, etc.) remain preserved verbatim.
- PR-C uses distinct (but related) evidence_type values (`vendor_order_export_batch`, `vendor_shipping_import`).
- The existing baseline entity name and the PR-C evidence_type value MAY co-occur in the same conversation. The two are distinct concepts: existing baseline entity describes the source-module operational record; PR-C evidence_type describes the discriminator value on PR-A's Evidence Record.
- Mitigation: PR-C documentation distinguishes the two; no rename / consolidation / deprecation of existing baseline entities.

### Subscribers requiring stable contracts during PR-C window

- PR-C uses zero final identifiers. Subscribers requiring stable contracts during the PR-C window have no PR-C catalogued identifiers that meet the bar.
- Mitigation: subscribers may wait for source-module hardening to promote identifiers to final via future PRs, OR may consume the canonical `audit.evidence.recorded` event stream at the family-level granularity (which is stable at PR-C-scope per the Evidence Family Closed-Set Rule), OR may consume PR-A's spine events (`audit.record.created`, `audit.evidence-amendment.recorded`, `audit.evidence-supersession.recorded`) which are stable contracts.

### Tenant scope on PR-C evidence

- All PR-C catalogued evidence_type values REQUIRE `company_scope_reference`. Tenant scope governance applies universally.
- Cross-tenant subscription / search is denied by default per existing baseline.
- Mitigation: subscribers MUST scope to authorized tenants; cross-tenant access requires explicit authorization per existing baseline rules.

### Restricted evidence on PR-C sensitive families

- PR-C default class guidance suggests `restricted_evidence = true_likely` for: `invoice_generation`, `invoice_adjustment`, `accounting_sync`, `pricing_snapshot`, `commission_revshare_snapshot`, `capability_assignment`, `role_permission_change`.
- The guidance is suggestion-only; PR-D will lock policy.
- Subscribers consuming sensitive families MUST respect PR-A's `restricted_evidence` flag (set by source modules at evidence creation per At-Creation Classification Rule) and PR-D's future gating workflow.

### Full Payload Exception Record for PR-C snapshot-anchored evidence

- PR-C's Source Snapshot Minimization Rule (inherited from PR-A) applies to snapshot-anchored evidence_type values.
- Source modules requiring full operational payload (rather than minimized snapshot) MUST use Full Payload Exception Record per PR-B Workflow 10.
- Mitigation: source-module evidence-emission tooling enforces the minimization rule; full-payload exceptions are explicit and audited.

### PR-C catalog refinement PRs

- During source-module hardening, evidence_type identifiers MAY be refined. The refinement is a future PR with the same bundle shape as PR-C (single-module documentation-only).
- Refinement PR types: identifier rename, identifier decomposition, identifier consolidation, identifier promotion (starter -> final), identifier retirement (placeholder -> removed).
- Subscribers should subscribe to PR-C catalog refinement PR notifications (architectural; future governance) to be aware of identifier changes.

### PR-D / PR-E / future PR scope conflicts

- If PR-D introduces a retention duration value that conflicts with PR-C's default guidance suggestion (e.g., PR-C suggests `longer` for invoice; PR-D locks an explicit shorter duration), PR-D wins. PR-C guidance is suggestion-only.
- If PR-E search workflows reveal that a placeholder identifier requires promotion to final for search-result stability, a future PR-C catalog refinement PR runs in parallel.
- If future API Governance Foundation PR introduces concrete OpenAPI schemas that reveal naming inconsistencies, a future PR-C catalog refinement PR runs in parallel.
```

## PR-D Edge Cases - Retention / Redaction / Legal Hold / Access Governance

This section documents architectural edge cases for PR-D governance. All cases preserve existing baseline, PR-A, PR-B, and PR-C edge case discipline.

### Race condition: legal hold apply vs purge execution

**Case.** Retention Disposition Workflow proposes `purge_eligible` and signals downstream purge executor; concurrently, Compliance / legal authority applies Legal Hold Record scoped to the same Evidence Record.

**Discipline.** Legal-Hold-Overrides-Purge Rule is enforced at the Legal Hold Blocks Purge Workflow (PR-D Workflow 7) check. If the legal hold apply lands BEFORE the purge executor reads the disposition, the disposition is forced to `purge_blocked_by_hold`. If the purge executor has already read the `purge_eligible` disposition, the executor MUST re-check Legal Hold state immediately before payload deletion; if the check now returns blocked = true, the executor MUST abort and record a new Retention Disposition Record with `disposition_state = purge_blocked_by_hold` (per Retention-Disposition-Append-Only Rule). The prior `purge_eligible` Retention Disposition Record remains in place; the new record supersedes operationally.

**Caveat.** Concrete race-window resolution is implementation-level (DevOps); PR-D documents the governance rule that the hold check MUST be performed at execution time, not only at disposition recommendation time.

### Redaction transformation versioning when policy changes

**Case.** Redaction Policy Matrix is updated (governance documentation change); previously redacted Evidence Records now have a different recommended redaction class or audience.

**Discipline.** Per Redaction-Transformation-Append-Only Rule, prior Redaction Transformation Record(s) remain. Re-redaction creates a NEW Redaction Transformation Record with incremented `redaction_version` for the same `(evidence_record_reference, redaction_audience)`. The prior `redacted_view_reference` may still be served if subscribers have not yet caught up; access governance MAY (implementation-level) prefer the most recent version. Subscribers consume `audit.redaction.applied` events filtered by `redaction_version` to invalidate caches.

**Caveat.** Concrete cache-invalidation strategy is implementation-level. PR-D documents the append-only versioning discipline.

### Broken access logging fallback

**Case.** Hardened Audit Access Record creation fails (e.g., transport failure, persistence failure); access decision must be made without successful logging.

**Discipline.** Per All-Access-Logged Rule, every access attempt MUST be logged. If logging fails, access governance MUST default to denial (`access_result = denied`) and surface the failure to operational alerting. Granting access without successful logging is a violation of the All-Access-Logged Rule. The denial is recorded via a fallback path (e.g., retry queue, dead-letter log); the fallback is implementation-level.

**Caveat.** The fallback path itself MUST be reliable enough to capture the denial; double-fault handling is implementation-level.

### File-backed tombstones after payload purge

**Case.** File-backed Evidence Record's payload is purged; subsequent access request references the file_storage_reference.

**Discipline.** Per File-Metadata-Outlives-Payload Rule, File Tracking Record metadata + `file_hash_reference` preserved; `file_storage_reference` is tombstone (state preserved; payload deleted). Access governance returns metadata-only view with explicit `disposition_state = purged_reference_only` indication. Hashes remain available for integrity verification. Hardened Audit Access Record is created normally with `view_type = redacted` (the metadata-only view) or `access_result = denied` if no redacted view available.

**Caveat.** Subscribers MUST NOT assume payload availability based on File Tracking Record metadata presence; they MUST check disposition state.

### External evidence reference becoming inaccessible

**Case.** External Evidence Reference (PR-A sub-structure) points to external system; external system removes its record OR the external reference URL becomes inaccessible.

**Discipline.** Per PR-A External-Tool-Not-Source-of-Truth Rule, CIXCI Evidence Record retains its own evidence. External system removal does NOT trigger CIXCI retention disposition. Access governance for the external reference may return external_unavailable indication; CIXCI evidence (the source snapshot / minimal evidence captured at creation time) remains canonical.

**Caveat.** External reference validation is deferred to PR-E or future; PR-D does NOT validate external references.

### Restricted_evidence access without elevated authority

**Case.** Buyer admin attempts to access Evidence Record with `restricted_evidence = true` and `access_class = compliance_only`.

**Discipline.** Tenant Company `check_access` denies (buyer admin does not have `compliance_only` authority); Logs & Audit Access Policy Matrix also denies; hardened Audit Access Record created with `access_result = denied`, `denial_reason` = insufficient authority, `restricted_evidence_flag = true`, `access_class_evaluated = compliance_only`. NO data leaked. `audit.evidence-access.recorded` event emitted with `access_result = denied`.

**Caveat.** Subscribers may flag denials of restricted evidence by non-elevated actors for anomaly review.

### Source-module deletion vs evidence retention independence

**Case.** Source module deletes its own operational record; Evidence Records emitted prior to deletion still exist in Logs & Audit; queries for the source-module record return not-found.

**Discipline.** Per Source-Module-Deletion-Independence Rule, source-module deletion does NOT auto-delete evidence. The prior Evidence Records remain subject to PR-D retention governance. Source modules MAY emit new Evidence Records recording the deletion decision (e.g., `import_canceled` evidence_type). Evidence Records are the immutable audit trail; source-module deletion does not erase audit history.

**Caveat.** Subscribers must NOT assume source-module record availability based on Evidence Record presence; Evidence Records may reference deleted source records via `source_record_reference` that no longer resolves; that is by design.

### Concurrent legal hold scope conflicts

**Case.** Two Legal Hold Records apply concurrently with overlapping but non-identical scopes (e.g., Hold A: `evidence_family_scope = [pricing]`; Hold B: `evidence_type_scope = [pricing_snapshot]`); an Evidence Record matches both scopes.

**Discipline.** Multiple Legal Hold Records may coexist. Evidence Record is considered under hold if ANY active Legal Hold Record scope matches. Release of Hold A does NOT release Hold B; the Evidence Record remains under hold until both are released (or all matching active holds are released / lapsed). Retention Disposition Record's `legal_hold_reference` field may carry the first matching hold (implementation-level choice; documentation indicates ANY match blocks).

**Caveat.** Concrete multi-hold reference shape is implementation-level. PR-D documents the matching discipline.

### Service identity access vs human access logging parity

**Case.** Source-module service identity performs bulk read of Evidence Records (e.g., integration sync) without explicit user authorship.

**Discipline.** Per Service-Identity-Access-Logged Rule, service identity access is logged identically to human access via hardened Audit Access Record. `service_trigger_reference` is populated (instead of `actor_reference`). Each access decision (or each batch read decision; implementation-level granularity) is logged.

**Caveat.** Bulk service reads may produce high event volume; aggregation strategies are implementation-level optimization that MUST preserve per-access semantic logging discipline.

### Cross-tenant Legal Hold attempts

**Case.** Compliance / legal authority attempts to create a single Legal Hold Record spanning multiple `company_scope_reference` values.

**Discipline.** Per PR-D scope discipline, each Legal Hold Record is scoped to ONE `company_scope_reference`. Cross-tenant holds require separate Legal Hold Record per tenant. Multi-tenant scope attempt is rejected at apply time.

**Caveat.** Cross-tenant coordination workflows (e.g., regulatory holds spanning multiple buyers) require multiple separate Legal Hold Record applications; future Tenant Company coordination PR may formalize cross-tenant orchestration if needed.

### Full Payload Exception default to masked view

**Case.** Full Payload Exception Record (PR-B Workflow 10) holds raw operational payload; non-elevated actor requests view.

**Discipline.** Per Full Payload Exception Redaction Requirement (PR-D Workflow 11), broad access defaults to masked / redacted view via PR-B `masked_payload_reference` AND PR-D Redaction Transformation Record. Raw full-payload access requires escalation through PR-D Workflow 9 (Raw Evidence Access) with `access_reason_reference` and elevated authority.

**Caveat.** Full Payload Exception SHOULD be exceptional per PR-B discipline (minimized source snapshots are PR-A default); overuse is itself a governance concern.

### PR-A access_class values appearing in incorrect contexts

**Case.** Documentation or implementation references uses `standard` / `restricted` / `audit_only` / `system_internal` as access_class.

**Discipline.** Per Codex cleanup directive 1, those four values are NOT access_class. They are `access_policy_tier` (with `_tier` suffix: `standard_tier`, `restricted_tier`, `audit_only_tier`, `system_internal_tier`) and used ONLY within Access Policy Matrix. Any appearance as access_class is a violation of PR-D's preservation of PR-A access_class values verbatim and MUST be corrected.

**Caveat.** APPLY.md verification includes a check for unintended use of these values as access_class; see APPLY.md for hard-stop verification.

### access_policy_tier being mistakenly used as access_class

**Case.** A field, record, or matrix attempts to carry `access_policy_tier` value (`standard_tier`, etc.) where an `access_class` value is expected (e.g., Evidence Record `access_class` field).

**Discipline.** Evidence Record `access_class` MUST carry one of PR-A's 6 values; `access_policy_tier` is NOT a valid Evidence Record access_class value. The two concepts coexist but are NOT interchangeable. `access_policy_tier` is a Access Policy Matrix concept only.

**Caveat.** Implementation-level type checking is implementation-level; PR-D documents the discipline.

### Retention disposition reversal limitations

**Case.** A `purge_eligible` Retention Disposition Record needs to be reversed (e.g., evidence is determined to be preserved-eligible after all).

**Discipline.** Per Retention-Disposition-Append-Only Rule, reversal is achieved by creating a NEW Retention Disposition Record with `disposition_state = retain` (or `preserved`) for the same Evidence Record. The prior `purge_eligible` record remains. If the purge has NOT yet been executed, the new disposition supersedes operationally (executor reads latest).

If the purge HAS been executed (Evidence Record reached `purged_reference_only`), reversal is IMPOSSIBLE: the payload is deleted; only metadata + hash + tombstone remain. The Evidence Record cannot be restored.

**Caveat.** Implementation MUST ensure executors check for newer disposition records before deletion; concrete check window is implementation-level.

### Redacted view request for evidence under legal hold

**Case.** Compliance / Audit Reviewer requests redacted view of Evidence Record currently under active Legal Hold Record.

**Discipline.** Legal hold blocks purge, NOT access. Redacted view access proceeds normally per access governance; hardened Audit Access Record records `legal_hold_state_at_access = applied`; subscribers may flag for elevated review (implementation-level); no special access denial occurs by virtue of legal hold alone.

**Caveat.** If the specific Legal Hold Record carries an additional review-restriction directive (e.g., from legal authority), Compliance / Audit Reviewer SHOULD honor it; PR-D documents the structural hold lifecycle but does NOT define authority-specific access restrictions beyond standard access governance.

### Redaction transformation for evidence with no raw payload

**Case.** Evidence Record exists with raw_evidence_reference NULL or evidence content that is metadata-only.

**Discipline.** Redacted View Creation Workflow (PR-D Workflow 4) may emit a Redaction Transformation Record only if there is content to transform. For metadata-only evidence, redaction may be trivial (metadata projection per audience); the Redaction Transformation Record may still be created with `redaction_class = audit_only` or `redaction_class = public_metadata_placeholder` (baseline-preserved) for traceability.

**Caveat.** Whether to emit a Redaction Transformation Record for trivial cases is implementation-level; documentation guidance is to emit for consistency.

### Re-redaction conflict during in-flight access

**Case.** Subscriber retrieved `redacted_view_reference` version 1; while subscriber is consuming, re-redaction creates version 2; subscriber's cached view is stale.

**Discipline.** Subscribers SHOULD honor `redaction_version` discriminator on `audit.redaction.applied` events to invalidate caches. PR-D documents the versioning discipline; in-flight cache coherence is implementation-level.

**Caveat.** Stale view serving is not a PR-D rule violation per se; subscriber cache strategy determines staleness tolerance.

### Legal Hold Record release without authority match

**Case.** Actor attempts to release a Legal Hold Record without authority matching the original `applied_actor_reference` / `applied_service_trigger_reference`.

**Discipline.** Tenant Company `check_access` evaluates release authority. Different actors MAY release a hold if Tenant Company permission allows (e.g., team-level authority). Legal Hold Record's `release_authority` field is populated with the release authority; concrete role match is Tenant Company-owned. PR-D documents the structural lifecycle; specific release-authority requirements are deferred to future Tenant Company coordination.

**Caveat.** Audit trail (Legal Hold Record `applied_actor_reference` and `released_actor_reference` may differ) is preserved.

### High-volume transient evidence retention review

**Case.** Integration Management family emits high volume of `transient` retention class evidence (api_transmission, api_response, idempotency_dedupe); periodic retention review fires millions of `audit.retention-review.required` events.

**Discipline.** Retention Review Trigger Workflow (PR-D Workflow 1) SHOULD support batch review (one event per batch instead of one event per Evidence Record); per PR-D documentation, the `evidence_record_reference` field may be replaced with `batch_reference` for batch events. Concrete batch sizing is implementation-level.

**Caveat.** Subscribers MUST handle both per-Evidence-Record and batch events.

### Audit Access Record creation during high-volume bulk access

**Case.** Service identity performs scan of 10,000 Evidence Records; per All-Access-Logged Rule, every access is logged.

**Discipline.** Each access MUST produce a logged decision via hardened Audit Access Record (semantic logging discipline). Implementation MAY batch storage / aggregate logging optimizations as long as semantic logging is preserved (one logical access decision = one logical Audit Access Record). Concrete batching is implementation-level.

**Caveat.** Aggregation MUST NOT lose audit-trail integrity per All-Access-Logged Rule.

### Source-module reprocess after retention purge

**Case.** Source module attempts reprocess (PR-B Workflow 8) of Evidence Record whose underlying payload has reached `purged_reference_only`.

**Discipline.** Reprocess Request Record (PR-B) is created normally per PR-B discipline; PR-D's File-Metadata-Outlives-Payload Rule ensures hash is preserved; reprocess outcome MAY be `failed` if payload required and unavailable. Reprocess outcome Record (PR-B) records the outcome via `outcome_status` discriminator (per PR-B). PR-D does NOT block reprocess attempts; reprocess SUCCESS depends on file payload availability.

**Caveat.** Reprocess outcomes carrying `failed` due to purged payload are recorded; subscribers can detect via PR-B `file.reprocess.completed` event with appropriate outcome.

### Tenant Company coordination unavailable at access time

**Case.** Tenant Company `check_access` is unavailable (service outage); access decision must be made.

**Discipline.** Per Tenant-Company-Owns-Authority Rule, Tenant Company is canonical authority; without authority evaluation, access governance SHOULD default to denial (per All-Access-Logged Rule fallback discipline above). Hardened Audit Access Record records `access_result = denied` with `denial_reason` = authority service unavailable. NO data leaked.

**Caveat.** Service availability resilience is implementation-level. PR-D documents the discipline that access is denied without authority evaluation.

### Evidence Governance Policy Matrix umbrella misinterpretation

**Case.** Documentation or downstream consumer attempts to query "Evidence Governance Policy Matrix" as a separate matrix with its own rows / fields.

**Discipline.** Per Codex cleanup directive 5, Evidence Governance Policy Matrix is umbrella view / reference concept only; NOT a fourth matrix; NO separate row / field structure exists. Queries SHOULD be against Retention Policy Matrix, Redaction Policy Matrix, or Access Policy Matrix specifically.

**Caveat.** Documentation MAY reference "Evidence Governance Policy Matrix" as shorthand for coordinated governance; concrete data MUST come from one of the 3 canonical matrices.

### Concurrent retention disposition for same Evidence Record

**Case.** Two Retention Disposition Workflow instances run concurrently for the same Evidence Record (e.g., scheduled review + manual review).

**Discipline.** Per Retention-Disposition-Append-Only Rule, both Workflows MAY append Retention Disposition Records; both records persist. Executors should read the latest disposition; if they conflict (e.g., one `purge_eligible`, one `preserved`), the latest one supersedes operationally (implementation-level). Audit trail preserves both decisions.

**Caveat.** Concurrent disposition is typically idempotent (both arrive at same disposition_state); when they differ, the latest wins; concrete tie-breaking is implementation-level.

### Source module emits evidence with retention_class mismatching PR-D mapping

**Case.** Source module emits Evidence Record with `retention_class = transient` for an `evidence_type` whose PR-D default mapping is `extended`.

**Discipline.** Per PR-A At-Creation Classification Rule, source modules MAY override default classifications when their own sensitivity assessment requires. PR-D's mapping is default guidance. The Evidence Record is accepted with the source-module-set retention_class; downstream retention governance applies per the actual class on the Evidence Record. Subscribers may flag the mismatch for review (anomaly detection); PR-D does not reject the emission.

**Caveat.** Source modules SHOULD justify class overrides; future source-module hardening PRs may codify per-evidence override discipline.

## PR-E Edge Cases - Search / Query / Review / Investigation / Audit Report Export

This section enumerates PR-E edge cases. PR-E is documentation-and-architecture; the edge cases below establish boundary expectations and risk mitigations.

### Section A - Search and result safety edge cases

#### A1 - Stale index returning outdated results

- **Edge:** The Search Index Projection lags behind canonical records; a reviewer sees an Evidence Record in the result set that has since been retention-disposition-state-transitioned to `purged_reference_only`.
- **Disposition:** Per Index-Stale-Acceptable Rule, eventually consistent index is acceptable. Per Index-Is-Not-Source-of-Truth Rule, canonical records are source of truth. The result-access step (PR-D Workflow 8 -> hardened Audit Access Record) re-evaluates against canonical records at access time; the returned view respects current `retention_disposition_state` per Retention-Aware Search Result Handling Workflow. Reviewer SHOULD see freshness indicator (implementation-level).

#### A2 - Search bypass attempt via filter manipulation

- **Edge:** A reviewer crafts a Search Filter Set to attempt extraction of restricted_evidence metadata via brute-force pattern testing.
- **Disposition:** Per Search-Defers-To-PR-D-Access-Governance Rule, every result access flows through PR-D Workflow 8; restricted_evidence remains denied. Per Hidden-Denied-Result Rule, denied results hidden including counts; no leakage via count differential. Per Sensitive-Search-Logged Rule, sensitive filter usage logged and flagged for anomaly detection.

#### A3 - Cross-tenant filter manipulation

- **Edge:** A reviewer crafts `company_scope_reference` filters that attempt to span tenant boundaries.
- **Disposition:** Per Search-Defers-To-PR-D-Access-Governance Rule + PR-D Workflow 13 (Tenant / Parent / Child Evidence Access Evaluation), cross-tenant scope denied unless authorized via Tenant Company `check_access`. Cross-tenant search remains denied by default; future Tenant Company coordination may enable specific cross-tenant patterns.

#### A4 - Saved-search authority staleness (deferred risk)

- **Edge:** A future Saved Search runs at time T2 with authority based on time T1 capability assignment; the actor's role has since been revoked.
- **Disposition:** Saved Search Record is NOT introduced in PR-E. Per OQ-SR-1 PR-E locked guidance, future Saved Search implementation MUST re-evaluate authority at execution time, NOT at definition time. PR-E documents the deferred risk; no PR-E saved-search behavior to defend against.

#### A5 - Denied count leakage prevention

- **Edge:** A search returns 20 visible results; the filter set theoretically matches 30 records; the reviewer might infer 10 denied results exist via pagination / count metadata.
- **Disposition:** Per Hidden-Denied-Result Rule, denied results hidden by default INCLUDING counts and pagination indicators. The reviewer sees 20 results with a count of 20; no inference of denied existence; per cleanup directive 4 (visible-denied metadata clarification).

#### A6 - Visible-denied request from unauthorized actor

- **Edge:** A non-audit reviewer attempts to request visible-denied metadata.
- **Disposition:** Per Visible-Denied-Metadata-Minimized Rule, visible-denied metadata allowed ONLY for authorized audit / compliance reviewers per PR-D Access Policy Matrix. Unauthorized request itself is logged via PR-D Workflow 8 -> hardened Audit Access Record with `access_result = denied`.

#### A7 - Redacted view audience mismatch

- **Edge:** Multiple Redaction Transformation Records exist per Evidence Record (per PR-D Redacted-Views-Per-Audience Rule); the rendering layer selects the wrong audience by accident.
- **Disposition:** Per Per-Audience-Result-Selection Rule, audience determination MUST flow through PR-D Workflow 13 evaluation. Audience selection is deterministic from `check_access` + redaction_audience matching. Test coverage (Scenario B4) validates the selection.

#### A8 - Archived retrieval latency

- **Edge:** A result Evidence Record has `retention_disposition_state = archive`; reviewer clicks expecting immediate retrieval.
- **Disposition:** Per Archived-Result-Availability-State Rule, result rendering indicates archive state. Concrete archive retrieval mechanism is implementation-level (e.g., archive storage tier with hydration delay).

#### A9 - Source snapshot full body in search preview

- **Edge:** A result's source snapshot is large; preview might inadvertently render the full body.
- **Disposition:** Per Source-Snapshot-Minimization-In-Preview Rule + PR-A Source Snapshot Minimization Rule, preview MUST render minimized content only. Full snapshot requires explicit raw retrieval.

#### A10 - Full Payload Exception in search result

- **Edge:** A result Evidence Record has a PR-B Full Payload Exception Record; preview might inadvertently include raw full-payload content.
- **Disposition:** Per Full-Payload-Exception-No-Raw-Preview Rule + PR-D Full Payload Exception Access Review Workflow (PR-D Workflow 11), preview MUST default to masked. Raw full-payload access requires escalation.

### Section B - Indexing edge cases

#### B1 - Raw payload indexing attempt

- **Edge:** An implementation might attempt to optimize search relevance by indexing raw evidence content.
- **Disposition:** Per No-Raw-Payload-Indexing Rule, raw payloads, file payloads, raw_evidence_reference content, source snapshot bodies, Full Payload Exception content are NEVER indexed. Per Index-Default-Redacted Rule, indexed content defaults to redacted. Implementation must follow these rules.

#### B2 - Index versus canonical-record drift

- **Edge:** A bug in index maintenance causes index to reflect stale data while canonical records have moved on.
- **Disposition:** Per Index-Is-Not-Source-of-Truth Rule, canonical records win. Per Index-Stale-Acceptable Rule, eventual consistency acceptable with disclosure. PR-D Workflow 8 re-evaluates at access time; stale index does NOT grant stale access.

#### B3 - Index rebuild during high-volume search load

- **Edge:** An index rebuild triggers during heavy reviewer usage; search results become temporarily unavailable.
- **Disposition:** Concrete rebuild mechanics are implementation-level (deferred). Per Index-Stale-Acceptable Rule, eventual consistency expected. Implementation MAY use index versioning to serve old index during rebuild.

#### B4 - Cross-tenant index leakage

- **Edge:** A bug in tenant-scoping logic in the index might leak evidence across tenants.
- **Disposition:** Per Search-Defers-To-PR-D-Access-Governance Rule, every result access goes through PR-D Workflow 8 which evaluates `company_scope_reference` against requester's tenant. PR-D Workflow 13 evaluates parent / child scope. Index-level scoping is implementation-level defense in depth; PR-D access governance is the canonical gate.

### Section C - Review and Collection edge cases

#### C1 - Concurrent Collection membership changes

- **Edge:** Two reviewers concurrently add Evidence Records to the same Evidence Collection Record.
- **Disposition:** Each addition creates a new `collection_version` per architectural pattern. Concrete concurrency mechanics (last-write-wins, optimistic locking, merge) are implementation-level. The append-only architecture preserves history; lost updates are recoverable.

#### C2 - Review Note correction chain depth

- **Edge:** A reviewer creates correction chains many levels deep (note A -> correction B -> correction C -> correction D ...).
- **Disposition:** Per Review-Note-Append-Only Rule, each correction creates a new note referencing the prior via `prior_review_note_reference`. Concrete depth limits are implementation-level; PR-E does NOT lock a maximum depth.

#### C3 - Review Note targets a deleted Evidence Record

- **Edge:** A Review Note targets an Evidence Record that has since transitioned to `retention_disposition_state = purged_reference_only`.
- **Disposition:** Per PR-D File-Metadata-Outlives-Payload Rule, the Evidence Record (metadata) still exists; the payload is purged. The Review Note remains valid (targets the Evidence Record metadata, not the payload). Per Purged-Reference-Only-Metadata-View Rule, rendering the target shows metadata / hash / tombstone view.

#### C4 - Review Note targets a record under legal hold

- **Edge:** A Review Note targets an Evidence Record under active Legal Hold.
- **Disposition:** Per PR-D Legal-Hold-Does-Not-Mutate-Evidence Rule + Append-Only-During-Hold Rule, the note can be appended (the underlying Evidence Record is NOT mutated). Legal hold blocks purge, NOT note creation. The note is itself subject to PR-D Redaction Policy Matrix.

#### C5 - Collection with mixed tenant evidence

- **Edge:** A reviewer attempts to add Evidence Records from different tenants to the same Collection.
- **Disposition:** Per single-tenant discipline (`company_scope_reference` REQUIRED), a Collection is single-tenant. Cross-tenant evidence cannot be combined; per PR-D Workflow 13 evaluation.

#### C6 - Review Session with no closing reviewer

- **Edge:** A Review Session is opened; the reviewer departs the organization before closing the session.
- **Disposition:** Per OQ-RV-1 PR-E open question, session may be transitioned to `suspended` by authorized actor; future Tenant Company coordination may define auto-close mechanisms. PR-E does NOT lock auto-close behavior.

#### C7 - Nested Evidence Collection Records

- **Edge:** A reviewer wants to group multiple Evidence Collection Records into a super-collection.
- **Disposition:** Per OQ-RV-2 PR-E open question, nested collections are NOT supported in PR-E. Future PR may add if needed. PR-E `evidence_record_references` is a flat list; PR-E does NOT include `evidence_collection_references` field on a collection.

### Section D - Export edge cases

#### D1 - Failed export with partial generation

- **Edge:** An export workflow generates part of the package, then fails (e.g., disk full mid-write).
- **Disposition:** Per Export-File-Tracking-Only-When-Artifact-Exists Rule, only successfully generated artifacts create a PR-B File Tracking Record. A partially-generated artifact MUST either be promoted to `generated` (if the partial is the final deliverable per implementation discretion) or treated as `failed` with `export_failure_reason` populated; partial artifacts MUST NOT be referenced from `export_file_tracking_record_reference` unless they meet "generated" criteria. Implementation defines the boundary.

#### D2 - Export under legal hold

- **Edge:** An evidence item in the export scope is under active Legal Hold.
- **Disposition:** Per OQ-EX-5 PR-E locked decision, export proceeds if requester has authority; Audit Report Export Record captures hold state at export time. Per PR-D Workflow 7, hold scope-match logic evaluates which evidence is held. Hold does NOT block export (it blocks purge).

#### D3 - Metadata-only preview drift toward File Tracking

- **Edge:** Implementation might over-eagerly create a PR-B File Tracking Record for metadata-only previews (e.g., for caching the preview output).
- **Disposition:** Per Export-File-Tracking-Only-When-Artifact-Exists Rule, metadata-only previews do NOT generate File Tracking Records. Implementation MUST distinguish "preview output (transient; no artifact)" from "generated export (persistent; artifact tracked)". Preview caching at the implementation layer does NOT create a PR-B File Tracking Record.

#### D4 - Export package size growth

- **Edge:** Export packages grow to very large sizes (millions of evidence items).
- **Disposition:** Concrete size limits / chunking / streaming mechanics are implementation-level. PR-E does NOT lock package format or size; future UI / API may.

#### D5 - Export download by un-authorized actor

- **Edge:** A reviewer with permission to create an Audit Report Export attempts to download a generated package that has been re-scoped.
- **Disposition:** Per Export-Access-Logged-Via-PR-D Rule, download access flows through PR-D Workflow 8 -> hardened Audit Access Record. Authority is re-evaluated at download time; if revoked, `access_result = denied`.

#### D6 - Export of evidence under retention purge transition

- **Edge:** An evidence item in the export scope transitions to `purged_reference_only` between export creation and download.
- **Disposition:** Per Export-File-Tracking-Only-When-Artifact-Exists Rule, the generated artifact's content was fixed at generation time; the artifact remains unchanged. The Audit Report Export Record records the export time; the underlying Evidence Record's later purge transition does NOT alter the export artifact. Per PR-D File-Metadata-Outlives-Payload Rule, the Evidence Record metadata still exists; the export artifact remains valid.

#### D7 - Export creates "export of export" loop

- **Edge:** A reviewer exports an Evidence Collection Record that includes Audit Report Export Records as evidence items.
- **Disposition:** Per Evidence-Collection-References-Only Rule, collections reference records; references can include any Evidence Record. Audit Report Export Records ARE Evidence Records (per PR-A Audit Record envelope discipline) - so they can appear in a Collection. A nested export inherits PR-D governance per item; per Audit-Export-Not-Analytics Rule, this is NOT BI surface.

### Section E - Boundary drift edge cases

#### E1 - Source-module reporting drift

- **Edge:** A source module team requests that Logs & Audit search return "current state" queries instead of the source module's own operational queries.
- **Disposition:** Per Search-Not-Source-of-Truth Rule, Logs & Audit search returns Evidence Records (audit trail); source modules retain operational source-of-truth. Reviewer is expected to query source modules for operational state.

#### E2 - BI / analytics dashboard drift

- **Edge:** A stakeholder requests that Audit Report Export Record produce BI dashboard outputs (KPIs, charts, trends).
- **Disposition:** Per Audit-Export-Not-Analytics Rule, audit exports are compliance / investigation / regulatory artifacts; NOT BI dashboards. Analytics module owns BI surface. If BI of evidence is needed, Analytics operates over its own evidence-emission Evidence Records via PR-D access governance.

#### E3 - Tenant Company permission authority drift

- **Edge:** An implementer proposes that Logs & Audit search make permission decisions (e.g., search returning "allowed" without `check_access` consultation).
- **Disposition:** Per PR-D Tenant-Company-Owns-Authority Rule + Search-Defers-To-PR-D-Access-Governance Rule, Tenant Company `check_access` is canonical; PR-E does NOT introduce a permission decision surface. Search workflows MUST flow through PR-D Workflow 8.

#### E4 - Full-payload preview drift

- **Edge:** UI implementation might "helpfully" render the full payload of search result previews to improve reviewer convenience.
- **Disposition:** Per Search-Result-Redacted-By-Default Rule + Source-Snapshot-Minimization-In-Preview Rule + Full-Payload-Exception-No-Raw-Preview Rule, previews default to redacted / minimized. UI MUST NOT bypass these rules for convenience.

#### E5 - Investigation Case Reference without case management module

- **Edge:** A reviewer populates `investigation_case_reference` on a Review Session with a free-text case identifier; the case management module does not yet exist.
- **Disposition:** Per OQ-RV-5 PR-E open question and the Investigation Case Reference placeholder discipline, the field accepts free-text / structured reference until the future Investigation Case Management module exists. PR-E does NOT validate the reference against a non-existent entity.

#### E6 - AI Agent Services / Warranty Registration search dimensions

- **Edge:** A reviewer attempts to filter on AI Agent Services or Warranty Registration evidence; these family slots have zero enumerated values.
- **Disposition:** Per OQ-CT-1 PR-E open question, AI Agent Services and Warranty Registration are reserved family slots (PR-C). Filtering on these families returns zero results until the modules exist and emit evidence. PR-E does NOT introduce evidence_type values; future PR populates.

### Section F - Service identity and bulk operation edge cases

#### F1 - Service identity bulk search volume

- **Edge:** A source-module service identity performs bulk searches as part of an operational workflow; Audit Access Record volume becomes enormous.
- **Disposition:** Per PR-D Service-Identity-Access-Logged Rule, service identity access IS logged. Bulk volume is expected; implementation MAY use semantic-per-search aggregation strategies (deferred per OQ-SR-7). PR-E semantic-per-search expectation is documented; implementation chooses concrete aggregation mechanism.

#### F2 - Service identity access without actor reference

- **Edge:** A service identity performs an Evidence Search Session; `actor_reference` is NULL.
- **Disposition:** Per PR-A discipline, either `actor_reference` OR `service_trigger_reference` MUST be populated. Service-only searches populate `service_trigger_reference`; this is normal.

#### F3 - Search rate-limit abuse

- **Edge:** A reviewer attempts to extract restricted metadata via rapid repeated searches with sensitive filters.
- **Disposition:** Per Sensitive-Search-Logged Rule, sensitive filter usage flagged via `sensitive_filter_used = true` discriminator on `audit.search.executed`. Anomaly detection subscribers consume; concrete rate-limit policy is implementation-level (deferred).

### Section G - Catalog and refinement edge cases

#### G1 - PR-C catalog refinement during PR-E lifetime

- **Edge:** PR-C catalog refinement PR could land while PR-E is being applied; PR-E references stale evidence_type values.
- **Disposition:** Per Catalog Additive-Only Rule (PR-C), catalog changes are additive. PR-E references catalog identifiers; refinement does NOT invalidate filter dimensions. New evidence_type values become filterable without PR-E modification.

#### G2 - PR-D class enumeration extension

- **Edge:** A future PR extends PR-D enumerations (e.g., adds a new retention class value).
- **Disposition:** PR-E filter dimension catalog references existing PR-D fields by name; new enumeration values become filterable without PR-E modification. PR-E does NOT lock specific enumeration values in filter dimensions; PR-E references the field, not the value set.

#### G3 - Audit Access Record schema evolution

- **Edge:** A future PR adds new fields to PR-D hardened Audit Access Record.
- **Disposition:** Per PR-A `evidence_schema_version` envelope discipline, schema evolution is supported. PR-E references the hardened Audit Access Record; new fields become available to PR-E search dimensions without PR-E modification.

### Section H - Sequence boundary edge cases

#### H1 - PR-E sequence completion claim challenge

- **Edge:** A future PR proposes a "PR-F" that adds search / review / export entities.
- **Disposition:** PR-E explicitly closes the planned Logs & Audit File Tracking A-through-E documentation hardening sequence. Future search / review / export work operates on consumer side (source-module evidence-emission), API side (concrete OpenAPI hardening), implementation side (index storage, query engines), or UI side (download UX, queue UI). Truly new search / review / export documentation work would require justifying a new sequence; per the existing Codex-recommended forward plan, no such work is anticipated.

#### H2 - Cross-PR coordination during PR-E review

- **Edge:** A source-module evidence-emission hardening PR is in progress concurrently with PR-E.
- **Disposition:** PR-E is documentation-and-architecture; source-module hardening operates on consumer side. The two are independent. PR-E does NOT modify source modules; source-module PRs do NOT modify Logs & Audit documentation.

#### H3 - Tenant Company role hardening during PR-E review

- **Edge:** A Tenant Company role hardening PR is in progress concurrently with PR-E.
- **Disposition:** Per No-New-Tenant-Roles-In-PR-D Rule extended, PR-E does NOT introduce roles. Tenant Company hardening PR introduces roles; PR-E references existing `check_access` patterns. The two are independent.
